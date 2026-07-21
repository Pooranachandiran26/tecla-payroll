import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';

export default function EmployeeDashboard({ employee: empProp, todayAttendance, attendanceStats, leaveStats, documentStats }) {
    const employee = empProp?.data || empProp || {};
    const { post, processing } = useForm();
    const { showToast } = useToast();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPunching, setIsPunching] = useState(false);
    const [location, setLocation] = useState({ latitude: null, longitude: null, placeName: '', loading: false, error: null });

    const fetchLocation = (isRetry = false) => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by your browser.' }));
            return;
        }

        if (isRetry) {
            showToast({
                type: 'info',
                title: 'Retrying Location',
                message: 'Requesting location permission from browser...'
            });
        }

        setLocation(prev => ({ ...prev, loading: true, error: null }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);
                
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
                    .then(res => res.json())
                    .then(data => {
                        const name = data.display_name || `${lat}, ${lon}`;
                        setLocation({
                            latitude: lat,
                            longitude: lon,
                            placeName: name,
                            loading: false,
                            error: null
                        });
                        if (isRetry) {
                            showToast({
                                type: 'success',
                                title: 'Location Retrieved',
                                message: 'Successfully retrieved location details.'
                            });
                        }
                    })
                    .catch(() => {
                        setLocation({
                            latitude: lat,
                            longitude: lon,
                            placeName: `Coordinates: (${lat}, ${lon})`,
                            loading: false,
                            error: null
                        });
                    });
            },
            (error) => {
                let errorMsg = 'Unable to retrieve location.';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = 'Location access was denied. Click the lock/settings icon in the browser address bar, set Location to "Allow", and click Retry.';
                    if (isRetry) {
                        showToast({
                            type: 'warning',
                            title: 'Location Blocked',
                            message: 'Permission denied. Please unblock location access in your browser address bar settings.'
                        });
                    }
                } else {
                    if (isRetry) {
                        showToast({
                            type: 'warning',
                            title: 'Location Error',
                            message: 'Unable to retrieve location: ' + error.message
                        });
                    }
                }
                setLocation(prev => ({ ...prev, loading: false, error: errorMsg }));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!todayAttendance?.punch_in_time) {
            fetchLocation();
        }
    }, [todayAttendance]);

    // Check if PAN card is missing or rejected
    const panCard = employee.documents?.find(d => d.document_type === 'pan_card');
    const showPanAlert = panCard && panCard.status === 'rejected';

    const handlePunchIn = () => {
        setIsPunching(true);
        router.post(route('employee.attendance.punch-in'), {
            latitude: location.latitude,
            longitude: location.longitude,
            place_name: location.placeName
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setIsPunching(false);
                if (page.props.flash?.success) {
                    showToast({ type: 'success', title: 'Punched In', message: page.props.flash.success });
                }
            },
            onError: () => {
                setIsPunching(false);
            }
        });
    };

    const handlePunchOut = () => {
        setIsPunching(true);
        router.post(route('employee.attendance.punch-out'), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                setIsPunching(false);
                if (page.props.flash?.success) {
                    showToast({ type: 'success', title: 'Punched Out', message: page.props.flash.success });
                }
            },
            onError: () => {
                setIsPunching(false);
            }
        });
    };

    const getElapsedTimeString = () => {
        if (!todayAttendance?.punch_in_time || todayAttendance?.punch_out_time) return null;
        const diff = Math.floor((currentTime - new Date(todayAttendance.punch_in_time)) / 1000);
        if (diff < 0) return '00:00:00';
        const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    const elapsedTime = getElapsedTimeString();

    return (
        <RoleGuard allowedRoles={['employee']}>
    <AuthenticatedLayout>
            <Head title="Employee Dashboard" />
            
      {showPanAlert && (
        <div style={{ backgroundColor: '#FFF5F5', border: '1px solid #FEB2B2', borderLeft: '4px solid var(--status-danger)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span style={{ fontSize: '0.9rem', color: '#7F1D1D' }}>
              <strong>Document Verification Alert:</strong> Your PAN Card upload was rejected. Please re-upload.
            </span>
          </div>
          <Link href={route('employee.profile')} className="btn btn-danger btn-xs">View Profile</Link>
        </div>
      )}

      <div className="flex-row-between">
        <div>
          <h2>Employee Self-Service</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back, {employee.full_name?.split(' ')[0] || 'Employee'}. Track your hours, request leave, and download payslips.</p>
        </div>
        <div>
          <span className={`badge badge-${employee.status === 'active' ? 'success' : 'warning'}`}>
            Status: {employee.status === 'active' ? 'Active' : employee.status}
          </span>
        </div>
      </div>

      <div className="grid-layout">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <h3 style={{ marginBottom: '0.25rem', color: 'var(--primary-navy)' }}>Daily Time Tracker</h3>
            <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {currentTime.toLocaleTimeString()}
            </div>
            
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-navy)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
              {todayAttendance && todayAttendance.punch_in_time ? (
                todayAttendance.punch_out_time ? 'Punched Out' : 'Punched In'
              ) : 'Not punched in yet'}
            </div>
            
            {elapsedTime && (
              <div style={{ fontSize: '1.5rem', fontWeight: '500', color: 'var(--status-success)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                {elapsedTime}
              </div>
            )}
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {todayAttendance?.punch_in_time ? `In: ${new Date(todayAttendance.punch_in_time).toLocaleTimeString()}` : 'No punch recorded today'}
              {todayAttendance?.punch_out_time ? ` | Out: ${new Date(todayAttendance.punch_out_time).toLocaleTimeString()}` : ''}
            </p>

            {/* Display punched location if punched in */}
            {todayAttendance?.punch_in_time && todayAttendance?.place_name && (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#F0F9FF', borderRadius: 'var(--radius-sm)', border: '1px solid #BAE6FD', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary-navy)', display: 'block', marginBottom: '0.25rem' }}>📍 Punched In Location:</span>
                <span style={{ color: '#0369A1', fontWeight: '500' }}>{todayAttendance.place_name}</span>
                <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: '0.1rem' }}>({todayAttendance.latitude}, {todayAttendance.longitude})</div>
              </div>
            )}

            {/* Display current location helper if not punched in */}
            {!todayAttendance?.punch_in_time && (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                {location.loading ? (
                  <span style={{ color: 'var(--text-muted)' }}>📍 Fetching current location...</span>
                ) : location.error ? (
                  <div style={{ color: 'var(--status-danger)' }}>
                    <span>⚠️ {location.error}</span>
                    <button className="btn btn-link btn-xs" style={{ marginLeft: '0.5rem', padding: 0, textDecoration: 'underline' }} onClick={() => fetchLocation(true)}>Retry</button>
                  </div>
                ) : location.latitude ? (
                  <div>
                    <span style={{ fontWeight: '600', color: 'var(--primary-navy)', display: 'block', marginBottom: '0.25rem' }}>📍 Current Punch Location:</span>
                    <span style={{ color: 'var(--primary-blue)', fontWeight: '500' }}>{location.placeName}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>({location.latitude}, {location.longitude})</div>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>📍 Location service required to punch in.</span>
                    <button className="btn btn-link btn-xs" style={{ marginLeft: '0.5rem', padding: 0, textDecoration: 'underline' }} onClick={() => fetchLocation(true)}>Get Location</button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              {!todayAttendance?.punch_in_time && (
                <button 
                  className="btn btn-primary" 
                  onClick={handlePunchIn}
                  disabled={isPunching || location.loading}
                  style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                  Punch In
                </button>
              )}
              {todayAttendance?.punch_in_time && !todayAttendance?.punch_out_time && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handlePunchOut}
                  disabled={isPunching}
                  style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
                  Punch Out
                </button>
              )}
            </div>
            {todayAttendance?.punch_out_time && (
              <p style={{ color: 'var(--status-success)', fontWeight: '500', fontSize: '0.9rem', marginTop: '1rem' }}>Punched out — worked {todayAttendance.hours_worked} hours today ✓</p>
            )}
            
            <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              📍 Daily punch is automatically synced.
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 className="card-title">This Month Attendance</h3>
              <Link href={route('employee.attendance')} className="btn btn-link btn-xs">View Log</Link>
            </div>
            <div className="grid-cols-4" style={{ textAlign: 'center', gap: '0.75rem' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-navy)' }}>{attendanceStats?.days_present || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Present</div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-navy)' }}>{attendanceStats?.days_half_day || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Half Day</div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-navy)' }}>{attendanceStats?.days_on_leave || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>On Leave</div>
              </div>
              <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#991B1B' }}>{attendanceStats?.days_absent || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absent</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3 className="card-title">Leave Summary</h3>
              <Link href={route('employee.leave')} className="btn btn-secondary btn-xs">Apply Leave</Link>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: '600' }}>Pending Approvals</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Leave requests awaiting manager review</div>
              </div>
              <span className={`badge badge-${leaveStats?.pending_count > 0 ? 'warning' : 'neutral'}`} style={{ fontSize: '1.1rem' }}>
                {leaveStats?.pending_count || 0}
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Most Recent Request</div>
              {leaveStats?.recent_request ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{leaveStats.recent_request.leave_type} Leave</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(leaveStats.recent_request.from_date).toLocaleDateString()} 
                      {leaveStats.recent_request.from_date !== leaveStats.recent_request.to_date && ` - ${new Date(leaveStats.recent_request.to_date).toLocaleDateString()}`}
                    </div>
                  </div>
                  <span className={`badge badge-${leaveStats.recent_request.status === 'approved' ? 'success' : leaveStats.recent_request.status === 'rejected' ? 'danger' : 'warning'}`}>
                    {leaveStats.recent_request.status}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No leave requests found.</div>
              )}
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Employment Profile</h3>
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Partner:</span>
                <span style={{ fontWeight: '600' }}>{employee.client_name || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Employee Code:</span>
                <span style={{ fontWeight: '600' }}>{employee.employee_code || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>PF UAN Number:</span>
                <span style={{ fontWeight: '600' }}>{employee.uan_number || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ESI IP Number:</span>
                <span style={{ fontWeight: '600' }}>{employee.esic_number || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Docs Verified:</span>
                <span style={{ fontWeight: '600', color: documentStats?.verified === documentStats?.required ? 'var(--status-success)' : 'var(--status-warning)' }}>
                  {documentStats?.verified || 0} / {documentStats?.required || 5}
                </span>
              </div>
            </div>
            <Link href={route('employee.profile')} className="btn btn-secondary btn-xs" style={{ width: '100%', marginTop: '1rem' }}>View Full Profile</Link>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Payslip</h3>
              <Link href={route('employee.payslips')} className="btn btn-link btn-xs">All Payslips</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No payslips generated yet.</span>
            </div>
          </div>

        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
