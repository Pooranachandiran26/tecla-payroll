import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';

export default function EmployeeAttendance({ employee, attendanceRecords, correctionRequests = [] }) {
    const records = attendanceRecords?.data || [];
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const { showToast } = useToast();

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        attendance_date: '',
        requested_punch_in_time: '',
        requested_punch_out_time: '',
        reason_category: 'forgot_to_punch_out',
        reason_details: '',
    });

    transform((data) => ({
        ...data,
        requested_punch_in_time: data.requested_punch_in_time ? new Date(data.requested_punch_in_time).toISOString() : '',
        requested_punch_out_time: data.requested_punch_out_time ? new Date(data.requested_punch_out_time).toISOString() : '',
    }));

    const openModal = (dateStr) => {
        const isPending = correctionRequests.some(r => r.attendance_date === dateStr && r.status === 'pending');
        if (isPending) {
            showToast({ type: 'warning', title: 'Pending Request', message: 'Correction already pending for this date.' });
            return;
        }

        setSelectedDate(dateStr);
        // Default to local 09:00 and 17:00
        setData({
            attendance_date: dateStr,
            requested_punch_in_time: `${dateStr}T09:00`,
            requested_punch_out_time: `${dateStr}T17:00`,
            reason_category: 'forgot_to_punch_out',
            reason_details: '',
        });
        setShowModal(true);
    };

    const submitCorrection = (e) => {
        e.preventDefault();
        post(route('employee.attendance.correction-request.store'), {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.flash?.success) {
                    showToast({ type: 'success', title: 'Request Submitted', message: page.props.flash.success });
                    setShowModal(false);
                    reset();
                } else if (page.props.flash?.error) {
                    showToast({ type: 'error', title: 'Error', message: page.props.flash.error });
                }
            }
        });
    };

    return (
        <RoleGuard allowedRoles={['employee']}>
    <AuthenticatedLayout>
            <Head title="Employee Attendance" />
            
      <div className="flex-row-between">
        <div>
          <h2>My Attendance Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View clock-in logs and track work hour accumulations.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: '0' }}>Daily Punch logs details</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Data source: Live Punch System (synced daily).</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In Stamp</th>
                <th>Clock Out Stamp</th>
                <th>Total Work Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? records.map(record => (
                <tr key={record.id}>
                  <td>{new Date(record.attendance_date).toLocaleDateString()}</td>
                  <td>{record.punch_in_time ? new Date(record.punch_in_time).toLocaleTimeString() : '—'}</td>
                  <td>{record.punch_out_time ? new Date(record.punch_out_time).toLocaleTimeString() : '—'}</td>
                  <td style={{ fontWeight: '600' }}>
                    {record.hours_worked !== null ? `${record.hours_worked}h` : '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      record.status === 'present' ? 'success' : 
                      record.status === 'half_day' ? 'warning' : 
                      record.status === 'absent' ? 'danger' : 'info'
                    }`}>
                      {record.status ? record.status.replace('_', ' ') : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-xs" 
                      onClick={() => openModal(record.attendance_date)}
                      disabled={correctionRequests.some(r => r.attendance_date === record.attendance_date && r.status === 'pending')}
                    >
                      Request Correction
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No attendance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Pagination controls if needed */}
        {attendanceRecords?.links && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
             {attendanceRecords.links.map((link, index) => (
                link.url ? (
                  <Link 
                    key={index} 
                    href={link.url} 
                    className={`btn btn-xs ${link.active ? 'btn-primary' : 'btn-secondary'}`}
                    dangerouslySetInnerHTML={{ __html: link.label }} 
                  />
                ) : (
                  <span
                    key={index}
                    className="btn btn-xs btn-secondary"
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                )
             ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">My Correction Requests</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Requested In</th>
                <th>Requested Out</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {correctionRequests.length > 0 ? correctionRequests.map(req => (
                <tr key={req.id}>
                  <td>{new Date(req.attendance_date).toLocaleDateString()}</td>
                  <td>{new Date(req.requested_punch_in_time).toLocaleTimeString()}</td>
                  <td>{new Date(req.requested_punch_out_time).toLocaleTimeString()}</td>
                  <td>{req.reason_category.replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`badge badge-${
                      req.status === 'approved' ? 'success' : 
                      req.status === 'rejected' ? 'danger' : 'warning'
                    }`}>
                      {req.status === 'pending' ? 'Pending manager review' : req.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No correction requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Request Time Correction for {selectedDate}</h3>
            <form onSubmit={submitCorrection}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Requested Punch In Time</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  style={{ width: '100%' }}
                  value={data.requested_punch_in_time} 
                  onChange={e => setData('requested_punch_in_time', e.target.value)} 
                />
                {errors.requested_punch_in_time && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.requested_punch_in_time}</span>}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Requested Punch Out Time</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  style={{ width: '100%' }}
                  value={data.requested_punch_out_time} 
                  onChange={e => setData('requested_punch_out_time', e.target.value)} 
                />
                {errors.requested_punch_out_time && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.requested_punch_out_time}</span>}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Reason Category</label>
                <select 
                  className="form-control" 
                  style={{ width: '100%' }}
                  value={data.reason_category} 
                  onChange={e => setData('reason_category', e.target.value)}
                >
                  <option value="forgot_to_punch_out">Forgot to Punch Out</option>
                  <option value="forgot_to_punch_in">Forgot to Punch In</option>
                  <option value="system_error">System Error</option>
                  <option value="emergency_early_leave">Emergency Early Leave</option>
                  <option value="other">Other</option>
                </select>
                {errors.reason_category && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.reason_category}</span>}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Reason Details (min 10 chars)</label>
                <textarea 
                  className="form-control" 
                  style={{ width: '100%', minHeight: '80px' }}
                  value={data.reason_details} 
                  onChange={e => setData('reason_details', e.target.value)}
                  placeholder="Explain why you are requesting this correction..."
                />
                {errors.reason_details && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.reason_details}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={processing}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
