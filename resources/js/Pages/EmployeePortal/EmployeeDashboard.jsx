import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Card from '../../Components/ui/Card';
import Badge from '../../Components/ui/Badge';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Calendar, 
  CalendarCheck,
  CalendarOff,
  CalendarX,
  FileText, 
  User, 
  TrendingUp, 
  Building2, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  Umbrella,
  Briefcase,
  Hash,
  BadgeCheck,
  CreditCard,
  Timer,
  LocateFixed,
  Activity,
  Plus,
  ExternalLink,
  CircleDot
} from 'lucide-react';

export default function EmployeeDashboard({ employee: empProp, todayAttendance, attendanceStats, leaveStats, documentStats, todayDayBanner, dayBanner: propDayBanner }) {
  const banner = todayDayBanner || propDayBanner;
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
          errorMsg = 'Location access denied. Click the lock icon in address bar to allow location.';
          if (isRetry) {
            showToast({
              type: 'warning',
              title: 'Location Blocked',
              message: 'Permission denied. Please unblock location access in browser settings.'
            });
          }
        } else if (isRetry) {
          showToast({
            type: 'warning',
            title: 'Location Error',
            message: 'Unable to retrieve location: ' + error.message
          });
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

  const getElapsedSeconds = () => {
    if (!todayAttendance?.punch_in_time || todayAttendance?.punch_out_time) return 0;
    const diff = Math.floor((currentTime - new Date(todayAttendance.punch_in_time)) / 1000);
    return diff > 0 ? diff : 0;
  };

  const elapsedSeconds = getElapsedSeconds();
  const targetWorkSeconds = 8 * 3600; // 8 hours target
  const shiftPct = Math.min(100, Math.round((elapsedSeconds / targetWorkSeconds) * 100));
  const strokeDashoffset = 283 - (283 * shiftPct) / 100;

  const getElapsedTimeString = () => {
    if (!todayAttendance?.punch_in_time || todayAttendance?.punch_out_time) return null;
    const hours = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const elapsedTime = getElapsedTimeString();

  return (
    <RoleGuard allowedRoles={['employee']}>
      <AuthenticatedLayout>
        <Head title="Employee Self-Service Portal" />

        {/* PAN Document Warning Banner */}
        {showPanAlert && (
          <div className="mb-6 bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="text-xs text-red-950 font-semibold">
                <strong>Document Verification Alert:</strong> Your PAN Card upload was rejected. Please re-upload to prevent compliance delays.
              </span>
            </div>
            <Link href={route('employee.profile')} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow transition-all shrink-0">
              Re-upload
            </Link>
          </div>
        )}

        {/* Modern Glassmorphism Employee Hero Banner */}
        <div 
          className="mb-6 rounded-2xl p-6 shadow-sm relative border border-slate-200/80 transition-all duration-300 font-sans z-20 bg-gradient-to-r from-white via-indigo-50/40 to-slate-50/70 backdrop-blur-xl"
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#082d9b] text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                {employee.full_name ? employee.full_name.substring(0, 2).toUpperCase() : 'EM'}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase bg-indigo-100/70 border border-indigo-200 px-2.5 py-0.5 rounded-full mb-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Employee Self-Service Portal</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Welcome back, {employee.full_name?.split(' ')[0] || 'Employee'}</span>
                  <Activity className="w-6 h-6 text-indigo-600" />
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Emp Code: <span className="font-mono font-bold text-slate-900">{employee.employee_code}</span> • Client Partner: <span className="font-bold text-indigo-700">{employee.client_name || 'Tecla Partner'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={employee.status === 'active' ? 'success' : 'warning'}>
                <span className="flex items-center gap-1.5">
                  <CircleDot className="w-3 h-3" />
                  {employee.status === 'active' ? 'Active Staff' : employee.status}
                </span>
              </Badge>
              <Link
                href={route('employee.profile')}
                className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-all shadow-sm"
              >
                My Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Left Column (2 Cols) - Punch & Attendance */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Daily Time Tracker Card with Radial Dial Meter */}
            <div className="card text-center p-6 border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" /> Daily Shift Time Tracker
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>

              {/* Day Swap / Off Banner Alert */}
              {banner && banner.message && (
                <div 
                  className={`mb-4 p-3 rounded-xl text-xs font-semibold text-left flex items-start gap-2.5 border shadow-sm ${
                    banner.type === 'warning' 
                      ? 'bg-amber-50 border-amber-300 text-amber-900' 
                      : (banner.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-blue-50 border-blue-300 text-blue-900')
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{banner.message}</span>
                </div>
              )}

              {/* Punch Status Radial Meter & Ticker */}
              <div className="my-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-around gap-6">
                
                {/* SVG Radial Meter */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      stroke={todayAttendance?.punch_in_time && !todayAttendance?.punch_out_time ? '#10B981' : '#6366F1'} 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="283"
                      strokeDashoffset={todayAttendance?.punch_in_time && !todayAttendance?.punch_out_time ? strokeDashoffset : 283}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-lg font-bold text-slate-900 font-mono">
                      {todayAttendance?.punch_in_time && !todayAttendance?.punch_out_time ? `${shiftPct}%` : '0%'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Shift</span>
                  </div>
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <div className="text-xs font-semibold uppercase text-slate-400">Current Status</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono flex items-center justify-center sm:justify-start gap-2">
                    {todayAttendance?.punch_in_time && !todayAttendance?.punch_out_time && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                    {todayAttendance && todayAttendance.punch_in_time ? (
                      todayAttendance.punch_out_time ? 'Punched Out' : 'Punched In Active'
                    ) : 'Not Punched In Yet'}
                  </div>

                  {elapsedTime && (
                    <div className="text-lg font-bold text-emerald-600 font-mono flex items-center justify-center sm:justify-start gap-1.5">
                      <Timer className="w-4 h-4 text-emerald-500 shrink-0" />
                      {elapsedTime}
                    </div>
                  )}

                  <div className="text-xs text-slate-500 font-medium pt-1">
                    {todayAttendance?.punch_in_time ? `Punched In: ${new Date(todayAttendance.punch_in_time).toLocaleTimeString()}` : 'No punch recorded today'}
                    {todayAttendance?.punch_out_time ? ` | Punched Out: ${new Date(todayAttendance.punch_out_time).toLocaleTimeString()}` : ''}
                  </div>
                </div>

              </div>

              {/* Location Status Card */}
              {todayAttendance?.punch_in_time && todayAttendance?.place_name ? (
                <div className="mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-left">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" /> Punched In Location:
                  </div>
                  <div className="text-indigo-800 font-medium mt-1">{todayAttendance.place_name}</div>
                  <div className="text-[10px] text-indigo-600 font-mono mt-0.5">({todayAttendance.latitude}, {todayAttendance.longitude})</div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left">
                  {location.loading ? (
                    <span className="text-slate-500 font-semibold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Retrieving current location...
                    </span>
                  ) : location.error ? (
                    <div className="text-red-700 font-medium flex items-start justify-between gap-2">
                      <span className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                        {location.error}
                      </span>
                      <button type="button" className="text-xs font-bold text-indigo-700 underline shrink-0" onClick={() => fetchLocation(true)}>
                        Retry
                      </button>
                    </div>
                  ) : location.latitude ? (
                    <div>
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-indigo-600" /> Location Verified for Punch:
                        </span>
                        <button type="button" onClick={() => fetchLocation(true)} className="text-[11px] text-indigo-600 font-semibold hover:underline">
                          Refresh
                        </button>
                      </div>
                      <div className="text-slate-700 font-medium mt-1">{location.placeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">({location.latitude}, {location.longitude})</div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-600 gap-2">
                      <span className="flex items-center gap-1.5">
                        <LocateFixed className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        Geo-location required to record daily punch.
                      </span>
                      <button type="button" className="text-xs font-bold text-indigo-700 underline shrink-0" onClick={() => fetchLocation(true)}>
                        Get Location
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Punch In / Out Actions */}
              <div className="flex justify-center gap-3 mt-2">
                {!todayAttendance?.punch_in_time && (
                  <button 
                    type="button"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]" 
                    onClick={handlePunchIn}
                    disabled={isPunching || location.loading}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Punch In Shift</span>
                  </button>
                )}
                {todayAttendance?.punch_in_time && !todayAttendance?.punch_out_time && (
                  <button 
                    type="button"
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]" 
                    onClick={handlePunchOut}
                    disabled={isPunching}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Punch Out Shift</span>
                  </button>
                )}
              </div>

              {todayAttendance?.punch_out_time && (
                <div className="mt-3 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-4 rounded-lg inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Shift completed — Worked {todayAttendance.hours_worked} hours today
                </div>
              )}
            </div>

            {/* Attendance Monthly Summary Card */}
            <Card 
              title="This Month Attendance Log" 
              headerAction={
                <Link href={route('employee.attendance')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  View Full Attendance <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center gap-1">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  <div className="text-2xl font-bold text-emerald-700">{attendanceStats?.days_present || 0}</div>
                  <div className="text-xs font-semibold text-emerald-900">Days Present</div>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center gap-1">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div className="text-2xl font-bold text-amber-700">{attendanceStats?.days_half_day || 0}</div>
                  <div className="text-xs font-semibold text-amber-900">Half Days</div>
                </div>
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col items-center gap-1">
                  <Umbrella className="w-5 h-5 text-indigo-600" />
                  <div className="text-2xl font-bold text-indigo-700">{attendanceStats?.days_on_leave || 0}</div>
                  <div className="text-xs font-semibold text-indigo-900">On Leave</div>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center gap-1">
                  <CalendarX className="w-5 h-5 text-red-600" />
                  <div className="text-2xl font-bold text-red-700">{attendanceStats?.days_absent || 0}</div>
                  <div className="text-xs font-semibold text-red-900">Days Absent</div>
                </div>
              </div>
            </Card>

            {/* Leave Summary */}
            <Card 
              title="Leave & Time-off Requests" 
              headerAction={
                <Link href={route('employee.leave')} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Apply Leave
                </Link>
              }
            >
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Pending Approvals</div>
                  <div className="text-[11px] text-slate-500 font-medium">Requests awaiting manager review</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${leaveStats?.pending_count > 0 ? 'bg-amber-200 text-amber-950' : 'bg-slate-200 text-slate-700'}`}>
                  {leaveStats?.pending_count || 0} Pending
                </span>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Most Recent Leave Request</div>
                {leaveStats?.recent_request ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 capitalize">{leaveStats.recent_request.leave_type} Leave</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {new Date(leaveStats.recent_request.from_date).toLocaleDateString()} 
                        {leaveStats.recent_request.from_date !== leaveStats.recent_request.to_date && ` - ${new Date(leaveStats.recent_request.to_date).toLocaleDateString()}`}
                      </div>
                    </div>
                    <Badge variant={leaveStats.recent_request.status === 'approved' ? 'success' : leaveStats.recent_request.status === 'rejected' ? 'danger' : 'warning'}>
                      {leaveStats.recent_request.status}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic py-2 text-center">No recent leave requests recorded.</div>
                )}
              </div>
            </Card>

          </div>

          {/* Right Column (1 Col) - Profile & Payslips */}
          <div className="space-y-6">
            
            {/* Profile Overview Card */}
            <Card title="Employment Profile Overview">
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> Client Partner</span>
                  <span className="font-bold text-slate-900">{employee.client_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" /> Employee Code</span>
                  <span className="font-mono font-bold text-slate-900">{employee.employee_code || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> PF UAN Number</span>
                  <span className="font-mono font-bold text-slate-900">{employee.uan_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-slate-400" /> ESI IP Number</span>
                  <span className="font-mono font-bold text-slate-900">{employee.esic_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-slate-400" /> Docs Verification</span>
                  <span className={`font-bold flex items-center gap-1 ${documentStats?.verified === documentStats?.required ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {documentStats?.verified === documentStats?.required 
                      ? <CheckCircle2 className="w-3.5 h-3.5" /> 
                      : <AlertTriangle className="w-3.5 h-3.5" />}
                    {documentStats?.verified || 0} / {documentStats?.required || 5} Verified
                  </span>
                </div>
              </div>

              <Link 
                href={route('employee.profile')} 
                className="mt-4 w-full py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                View Full Profile & Documents
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Card>

            {/* Quick Actions Shortcuts */}
            <Card title="Quick Employee Actions">
              <div className="space-y-2 text-xs font-semibold">
                <Link 
                  href={route('employee.payslips')} 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-indigo-300 flex items-center justify-between transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>My Monthly Payslips</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('employee.attendance')} 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-indigo-300 flex items-center justify-between transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Attendance Log & Swaps</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link 
                  href={route('employee.leave')} 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-amber-300 flex items-center justify-between transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Umbrella className="w-4 h-4 text-amber-600" />
                    <span>Apply Leave Request</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </Card>

          </div>

        </div>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
