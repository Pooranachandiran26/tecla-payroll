import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  X, 
  FileText, 
  Send, 
  Info, 
  Sparkles,
  UserCheck,
  Building2,
  BadgeAlert
} from 'lucide-react';

export default function EmployeeAttendance({ employee, attendanceRecords, correctionRequests = [], holidays = [], leaveRequests = [], daySwaps = [] }) {
    const rawRecords = attendanceRecords?.data || [];
    const { showToast } = useToast();

    // View toggle: 'calendar' or 'corrections'
    const [viewMode, setViewMode] = useState('calendar');

    // Selected month for calendar (defaults to Aug 2026)
    const [currentYear, setCurrentYear] = useState(2026);
    const [currentMonth, setCurrentMonth] = useState(7); // 0-indexed: 7 = August

    // Modal state for day click detail
    const [selectedDayDetail, setSelectedDayDetail] = useState(null);

    // Modal state for correction request form
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [correctionTargetDate, setCorrectionTargetDate] = useState('');

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

    // Map records by YYYY-MM-DD for fast O(1) lookup
    const recordsByDate = useMemo(() => {
        const map = {};
        rawRecords.forEach(r => {
            if (r.attendance_date) {
                const key = r.attendance_date.substring(0, 10);
                map[key] = r;
            }
        });
        return map;
    }, [rawRecords]);

    // Map client holidays by YYYY-MM-DD
    const holidaysByDate = useMemo(() => {
        const map = {};
        (holidays || []).forEach(h => {
            if (h.holiday_date) {
                const key = String(h.holiday_date).substring(0, 10);
                map[key] = h;
            }
        });
        return map;
    }, [holidays]);

    // Map applied leave requests across their date ranges
    const leavesByDate = useMemo(() => {
        const map = {};
        (leaveRequests || []).forEach(req => {
            if (req.from_date && req.to_date) {
                const start = new Date(req.from_date);
                const end = new Date(req.to_date);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(d.getDate()).padStart(2, '0');
                    const key = `${d.getFullYear()}-${monthStr}-${dayStr}`;
                    map[key] = req;
                }
            }
        });
        return map;
    }, [leaveRequests]);

    // Map day swaps (overrides) by YYYY-MM-DD
    const swapsByDate = useMemo(() => {
        const map = {};
        (daySwaps || []).forEach(swap => {
            if (swap.override_date) {
                const key = String(swap.override_date).substring(0, 10);
                map[key] = { ...swap, isOverrideDate: true };
            }
            if (swap.swap_target_date) {
                const key = String(swap.swap_target_date).substring(0, 10);
                map[key] = { ...swap, isTargetDate: true };
            }
        });
        return map;
    }, [daySwaps]);

    const isDayOff = (dateObj) => {
        const day = dateObj.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
        const empData = employee?.data || employee || {};
        const rawPattern = empData.weekly_off_pattern || empData.weeklyOffPattern || 'sat,sun';
        const p = String(rawPattern).toLowerCase();

        const dayMap = {
            0: ['sun', 'sunday'],
            1: ['mon', 'monday'],
            2: ['tue', 'tuesday', 'tues'],
            3: ['wed', 'wednesday'],
            4: ['thu', 'thursday', 'thur', 'thurs'],
            5: ['fri', 'friday'],
            6: ['sat', 'saturday'],
        };

        const currentDayAliases = dayMap[day] || [];
        const tokens = p.split(/[\s,_\+\-]+/).map(t => t.trim()).filter(Boolean);

        return currentDayAliases.some(alias =>
            tokens.some(token => token === alias || alias.startsWith(token) || token.startsWith(alias))
        );
    };

    // Calendar generation for current selected month
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...

        const days = [];

        // Padding days for previous month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ isPadding: true, key: `prev-${i}` });
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const monthStr = String(currentMonth + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
            
            const dateObj = new Date(currentYear, currentMonth, day);
            const naturalIsWeekend = isDayOff(dateObj);
            const swap = swapsByDate[dateStr];
            const leave = leavesByDate[dateStr];
            const holiday = holidaysByDate[dateStr];
            const record = recordsByDate[dateStr];
            
            let isWeekend = naturalIsWeekend;
            let isSwappedDay = false;
            let swapType = null;

            if (swap && swap.status === 'approved') {
                isSwappedDay = true;
                const isOverride = swap.override_date && String(swap.override_date).substring(0, 10) === dateStr;
                const isTarget = swap.swap_target_date && String(swap.swap_target_date).substring(0, 10) === dateStr;

                if (isOverride) {
                    if (swap.attendance_day_type === 'work_day') {
                        isWeekend = false;
                        swapType = 'swapped_in'; // Work Day brought in on a day off
                    } else {
                        isWeekend = true;
                        swapType = 'swapped_out'; // Day off given in place of work
                    }
                } else if (isTarget) {
                    if (swap.attendance_day_type === 'work_day') {
                        isWeekend = true;
                        swapType = 'swapped_out'; // Target counterpart day given off
                    } else {
                        isWeekend = false;
                        swapType = 'swapped_in';
                    }
                }
            }

            let status = 'no_record';
            if (record) {
                status = record.status || 'present';
            } else if (leave) {
                status = 'on_leave';
            } else if (swapType === 'swapped_in') {
                status = 'day_swap_work';
            } else if (holiday) {
                status = 'holiday';
            } else if (isWeekend) {
                status = 'weekend';
            }

            days.push({
                isPadding: false,
                dayNumber: day,
                dateStr,
                dateObj,
                isWeekend,
                naturalIsWeekend,
                isSwappedDay,
                swapType,
                status,
                record,
                holiday,
                leave,
                swap,
            });
        }

        return days;
    }, [currentYear, currentMonth, recordsByDate, holidaysByDate, leavesByDate, swapsByDate, employee]);

    // Month navigation
    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const handleTodayMonth = () => {
        const now = new Date();
        setCurrentYear(now.getFullYear());
        setCurrentMonth(now.getMonth());
    };

    const monthLabel = useMemo(() => {
        return new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [currentYear, currentMonth]);

    const getBadgeStyle = (status) => {
        switch (status) {
            case 'present': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'half_day': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'absent':
            case 'lop': return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'on_leave':
            case 'leave': return 'bg-sky-100 text-sky-800 border-sky-200';
            case 'holiday': return 'bg-purple-100 text-purple-900 border-purple-200';
            case 'weekend': return 'bg-slate-200 text-slate-700 border-slate-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // Stats for current month view
    const monthStats = useMemo(() => {
        let presentCount = 0;
        let lopCount = 0;
        let weekendCount = 0;
        let halfDayCount = 0;
        let holidayCount = 0;

        calendarDays.forEach(d => {
            if (d.isPadding) return;
            if (d.status === 'present') presentCount++;
            else if (d.status === 'absent' || d.status === 'lop') lopCount++;
            else if (d.status === 'half_day') halfDayCount++;
            else if (d.status === 'holiday') holidayCount++;
            else if (d.status === 'weekend') weekendCount++;
        });

        return { presentCount, lopCount, halfDayCount, weekendCount, holidayCount };
    }, [calendarDays]);

    const openCorrectionModal = (dateStr) => {
        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
        if (dateStr > todayStr) {
            showToast({ type: 'warning', title: 'Invalid Action', message: 'Cannot request attendance correction for future dates.' });
            return;
        }

        const isPending = correctionRequests.some(r => r.attendance_date === dateStr && r.status === 'pending');
        if (isPending) {
            showToast({ type: 'warning', title: 'Pending Request', message: 'Correction request already pending for this date.' });
            return;
        }

        setSelectedDayDetail(null);
        setCorrectionTargetDate(dateStr);
        setData({
            attendance_date: dateStr,
            requested_punch_in_time: `${dateStr}T09:00`,
            requested_punch_out_time: `${dateStr}T17:00`,
            reason_category: 'forgot_to_punch_out',
            reason_details: '',
        });
        setShowCorrectionModal(true);
    };

    const submitCorrection = (e) => {
        e.preventDefault();
        post(route('employee.attendance.correction-request.store'), {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.flash?.success) {
                    showToast({ type: 'success', title: 'Request Submitted', message: page.props.flash.success });
                    setShowCorrectionModal(false);
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
                <Head title="My Attendance Calendar" />

                {/* Top Header & View Switcher */}
                <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-extrabold text-[#1F3864]">My Attendance Calendar</h2>
                    </div>

                    {/* Clean View Switcher Controls */}
                    <div className="flex items-center bg-gray-200/70 p-1 rounded-xl shadow-inner text-xs font-bold border border-gray-300/50">
                        <button
                            type="button"
                            onClick={() => setViewMode('calendar')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                viewMode === 'calendar' 
                                    ? 'bg-white text-[#1F3864] shadow-sm font-bold' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Calendar View</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('corrections')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                viewMode === 'corrections' 
                                    ? 'bg-white text-[#1F3864] shadow-sm font-bold' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Correction Requests</span>
                            {correctionRequests.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[0.65rem] font-extrabold ml-0.5">
                                    {correctionRequests.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                {viewMode === 'calendar' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        <div className="bg-white p-2.5 px-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-[0.62rem] font-semibold text-gray-500 uppercase tracking-wider block">Present Days</span>
                                <div className="text-base font-black text-emerald-700">{monthStats.presentCount} Days</div>
                            </div>
                        </div>

                        <div className="bg-white p-2.5 px-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-[0.62rem] font-semibold text-gray-500 uppercase tracking-wider block">Half Days</span>
                                <div className="text-base font-black text-amber-800">{monthStats.halfDayCount} Days</div>
                            </div>
                        </div>

                        <div className="bg-white p-2.5 px-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                                <XCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-[0.62rem] font-semibold text-gray-500 uppercase tracking-wider block">LOP / Absent</span>
                                <div className="text-base font-black text-rose-700">{monthStats.lopCount} Days</div>
                            </div>
                        </div>

                        <div className="bg-white p-2.5 px-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                                <CalendarIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-[0.62rem] font-semibold text-gray-500 uppercase tracking-wider block">Off-Days &amp; Weekends</span>
                                <div className="text-base font-black text-slate-800">{monthStats.weekendCount} Days</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* IMPROVED CALENDAR VIEW DESIGN */}
                {viewMode === 'calendar' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-3">
                        {/* Month Navigation & Legend Bar */}
                        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handlePrevMonth}
                                    className="p-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all shadow-xs"
                                    title="Previous Month"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <h3 className="text-base font-extrabold text-[#1F3864] m-0 px-2 min-w-[140px] text-center">
                                    {monthLabel}
                                </h3>
                                <button
                                    onClick={handleNextMonth}
                                    className="p-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all shadow-xs"
                                    title="Next Month"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={handleTodayMonth}
                                    className="ml-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-all"
                                >
                                    Today
                                </button>
                            </div>

                            {/* Color Legend */}
                            <div className="flex items-center flex-wrap gap-1.5 text-[0.7rem] font-semibold">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Present
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Half Day
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> LOP / Absent
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Day Swap
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Holiday
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Weekend / Off
                                </span>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="p-2 sm:p-3">
                            {/* Days of Week Header */}
                            <div className="grid grid-cols-7 text-center font-extrabold text-[0.7rem] text-gray-500 uppercase tracking-wider mb-1">
                                <div className="py-1 text-rose-600">Sun</div>
                                <div className="py-1">Mon</div>
                                <div className="py-1">Tue</div>
                                <div className="py-1">Wed</div>
                                <div className="py-1">Thu</div>
                                <div className="py-1">Fri</div>
                                <div className="py-1 text-rose-600">Sat</div>
                            </div>

                            {/* Days Cells */}
                            <div className="grid grid-cols-7 gap-1.5">
                                {calendarDays.map((d) => {
                                    if (d.isPadding) {
                                        return <div key={d.key} className="min-h-[58px] sm:min-h-[66px] rounded-xl bg-gray-50/40 border border-transparent"></div>;
                                    }

                                    const hasPendingCorrection = correctionRequests.some(r => r.attendance_date === d.dateStr && r.status === 'pending');
                                    const todayObj = new Date();
                                    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                                    const isToday = d.dateStr === todayStr;

                                    return (
                                        <div
                                            key={d.dateStr}
                                            onClick={() => setSelectedDayDetail(d)}
                                            className={`min-h-[58px] sm:min-h-[66px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:scale-[1.01] relative group ${
                                                isToday ? 'ring-2 ring-indigo-600 border-indigo-400 bg-indigo-50/30' : ''
                                            } ${
                                                d.status === 'present' ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400' :
                                                d.status === 'half_day' ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400' :
                                                d.status === 'absent' || d.status === 'lop' ? 'bg-rose-50/50 border-rose-200 hover:border-rose-400' :
                                                d.swap || d.status === 'day_swap_work' ? 'bg-blue-50/60 border-blue-200 hover:border-blue-400' :
                                                d.status === 'weekend' ? 'bg-slate-50/90 border-slate-200 hover:border-slate-300' :
                                                'bg-[#FAFBFC] border-gray-200 hover:border-indigo-300'
                                            }`}
                                        >
                                            {/* Cell Header: Day Number + Status Badge */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <span className={`font-black text-xs ${
                                                        isToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]' :
                                                        d.isWeekend ? 'text-rose-600' : 'text-gray-900'
                                                    }`}>
                                                        {d.dayNumber}
                                                    </span>
                                                    {isToday && (
                                                        <span className="text-[9px] font-black text-indigo-700 uppercase tracking-tight">Today</span>
                                                    )}
                                                </div>

                                                {hasPendingCorrection && (
                                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="Correction Pending" />
                                                )}
                                            </div>

                                            {/* Status Badge Pill */}
                                            <div className="mt-0.5">
                                                {d.status === 'present' && (
                                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-emerald-100 text-emerald-800 w-full truncate border border-emerald-200">
                                                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                                                        <span className="truncate">Present ({d.record?.hours_worked || 8}h)</span>
                                                    </div>
                                                )}

                                                {d.status === 'half_day' && (
                                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-amber-100 text-amber-800 w-full truncate border border-amber-200">
                                                        <Clock className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                                                        <span className="truncate">Half Day</span>
                                                    </div>
                                                )}

                                                {(d.status === 'absent' || d.status === 'lop') && (
                                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-rose-100 text-rose-800 w-full truncate border border-rose-200">
                                                        <XCircle className="w-2.5 h-2.5 shrink-0 text-rose-600" />
                                                        <span className="truncate">Absent / LOP</span>
                                                    </div>
                                                )}

                                                {(d.status === 'on_leave' || d.status === 'leave') && (
                                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-sky-100 text-sky-800 w-full truncate border border-sky-200">
                                                        <Sparkles className="w-2.5 h-2.5 shrink-0 text-sky-600" />
                                                        <span className="truncate">{d.leave?.leave_type ? `On Leave (${d.leave.leave_type})` : 'On Leave'}</span>
                                                    </div>
                                                )}

                                                {d.swap && !d.record && (
                                                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold w-full truncate border ${
                                                        d.swapType === 'swapped_in' || d.swap.attendance_day_type === 'work_day'
                                                            ? 'bg-blue-100 text-blue-900 border-blue-200'
                                                            : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                                    }`}>
                                                        <Sparkles className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                                                        <span className="truncate">
                                                            {d.swapType === 'swapped_in' || d.swap.attendance_day_type === 'work_day' ? '🔁 Swapped Work (In)' : '🔁 Swapped Off (Out)'}
                                                        </span>
                                                    </div>
                                                )}

                                                {d.status === 'holiday' && !d.swap && (
                                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-purple-100 text-purple-900 w-full truncate border border-purple-200">
                                                        <Sparkles className="w-2.5 h-2.5 shrink-0 text-purple-600" />
                                                        <span className="truncate">🌴 {d.holiday?.name || d.holiday?.holiday_name || 'Holiday'}</span>
                                                    </div>
                                                )}

                                                {d.status === 'weekend' && !d.swap && (
                                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-slate-200/80 text-slate-700 w-full truncate border border-slate-300/60">
                                                        <span>☕ Off-Day</span>
                                                    </div>
                                                )}

                                                {d.status === 'no_record' && !d.isWeekend && !d.swap && (
                                                    <div className="inline-flex items-center gap-1 px-1 py-0.2 rounded text-[0.6rem] font-medium text-gray-400 bg-gray-100/80 w-full truncate">
                                                        <span>—</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* CORRECTION REQUESTS SECTION TAB VIEW */}
                {viewMode === 'corrections' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                        <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-[#1F3864] m-0">My Correction Requests</h3>
                            <span className="text-xs text-gray-500 font-medium">History of submitted time corrections</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-100 font-bold text-gray-700 border-b border-gray-200 uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Requested In</th>
                                        <th className="py-3 px-4">Requested Out</th>
                                        <th className="py-3 px-4">Reason</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {correctionRequests.length > 0 ? (
                                        correctionRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-gray-900">
                                                    {new Date(req.attendance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="py-3.5 px-4 text-gray-700">
                                                    {new Date(req.requested_punch_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3.5 px-4 text-gray-700">
                                                    {new Date(req.requested_punch_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3.5 px-4 text-gray-800 capitalize font-semibold">
                                                    {req.reason_category.replace(/_/g, ' ')}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold ${
                                                        req.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                                                        req.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                                                        'bg-amber-100 text-amber-800 border border-amber-200'
                                                    }`}>
                                                        {req.status === 'pending' ? 'Pending Manager Review' : req.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="py-8 text-center text-gray-400 font-medium">
                                                No correction requests submitted.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ADVANCED DAY DETAIL POP-UP MODAL */}
                {selectedDayDetail && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div 
                            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                            onClick={() => setSelectedDayDetail(null)}
                        />
                        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 animate-scale-up border border-gray-100">
                            {/* Modal Header */}
                            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 to-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#1F3864] text-white flex items-center justify-center font-black text-sm shadow-md">
                                        {selectedDayDetail.dayNumber}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-[#1F3864] m-0">
                                            {selectedDayDetail.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </h3>
                                        <span className="text-xs text-gray-500 font-medium">Daily Attendance Stamp</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedDayDetail(null)}
                                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-5 space-y-4 text-xs">
                                {/* Status Pill */}
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <span className="text-gray-500 font-semibold">Attendance Status:</span>
                                    <span className={`px-3 py-1 rounded-full font-bold border ${getBadgeStyle(selectedDayDetail.status)}`}>
                                        {selectedDayDetail.swap 
                                            ? `DAY SWAP (${selectedDayDetail.swap.attendance_day_type === 'work_day' ? 'WORK DAY' : 'DAY OFF'})`
                                            : (selectedDayDetail.status === 'holiday' 
                                                ? `HOLIDAY: ${selectedDayDetail.holiday?.name || selectedDayDetail.holiday?.holiday_name || 'Paid Holiday'}`
                                                : selectedDayDetail.status.replace('_', ' ').toUpperCase())}
                                    </span>
                                </div>

                                {selectedDayDetail.swap && (
                                    <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 text-blue-950">
                                        <div className="font-extrabold text-xs flex items-center gap-1.5 mb-1">
                                            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                                            <span>Approved Day Swap Request</span>
                                        </div>
                                        <div className="text-[0.7rem] text-blue-800 font-medium space-y-0.5">
                                            <div>Override Date: <strong>{selectedDayDetail.swap.override_date}</strong></div>
                                            {selectedDayDetail.swap.swap_target_date && (
                                                <div>Target Swapped Date: <strong>{selectedDayDetail.swap.swap_target_date}</strong></div>
                                            )}
                                            {selectedDayDetail.swap.reason && (
                                                <div className="mt-1 italic text-blue-900">Reason: "{selectedDayDetail.swap.reason}"</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selectedDayDetail.holiday && (
                                    <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 text-purple-900">
                                        <div className="font-extrabold text-xs flex items-center gap-1.5 mb-0.5">
                                            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                                            <span>{selectedDayDetail.holiday.name || selectedDayDetail.holiday.holiday_name}</span>
                                        </div>
                                        <div className="text-[0.7rem] text-purple-700 font-medium">
                                            Client Paid Holiday ({selectedDayDetail.holiday.is_optional ? 'Optional' : 'Mandatory'})
                                        </div>
                                    </div>
                                )}

                                {selectedDayDetail.leave && (
                                    <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-200 text-sky-900">
                                        <div className="font-extrabold text-xs flex items-center gap-1.5 mb-0.5">
                                            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                                            <span>Leave Request: {selectedDayDetail.leave.leave_type || 'Leave'}</span>
                                        </div>
                                        <div className="text-[0.7rem] text-sky-700 font-medium">
                                            Status: <strong className="capitalize">{selectedDayDetail.leave.status}</strong> ({selectedDayDetail.leave.from_date} to {selectedDayDetail.leave.to_date})
                                        </div>
                                        {selectedDayDetail.leave.reason && (
                                            <div className="text-[0.7rem] text-sky-800 mt-1 italic">
                                                "{selectedDayDetail.leave.reason}"
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Punch Timings Card */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                        <span className="text-[0.65rem] font-bold text-indigo-700 uppercase tracking-wider block mb-1">Clock In Stamp</span>
                                        <div className="text-sm font-black text-[#1F3864]">
                                            {selectedDayDetail.record?.punch_in_time 
                                                ? new Date(selectedDayDetail.record.punch_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                                : '09:00 AM'}
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                        <span className="text-[0.65rem] font-bold text-indigo-700 uppercase tracking-wider block mb-1">Clock Out Stamp</span>
                                        <div className="text-sm font-black text-[#1F3864]">
                                            {selectedDayDetail.record?.punch_out_time 
                                                ? new Date(selectedDayDetail.record.punch_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                                : '05:00 PM'}
                                        </div>
                                    </div>
                                </div>

                                {/* Work Hours & Source Info */}
                                <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 font-medium">Recorded Duration:</span>
                                        <span className="font-extrabold text-[#1F3864] text-sm">
                                            {selectedDayDetail.record?.hours_worked ? `${selectedDayDetail.record.hours_worked} Hours` : '8.0 Hours'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 font-medium">Data Source:</span>
                                        <span className="font-semibold text-gray-700">Live Punch System</span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer / Action Button */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                                <button
                                    onClick={() => setSelectedDayDetail(null)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-2xs"
                                >
                                    Close
                                </button>
                                {(() => {
                                    const todayObj = new Date();
                                    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                                    const isFuture = selectedDayDetail.dateStr > todayStr;
                                    if (isFuture) return null;
                                    return (
                                        <button
                                            onClick={() => openCorrectionModal(selectedDayDetail.dateStr)}
                                            disabled={correctionRequests.some(r => r.attendance_date === selectedDayDetail.dateStr && r.status === 'pending')}
                                            className="px-4 py-2 text-xs font-bold text-white bg-[#1F3864] hover:bg-[#152748] rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <FileText className="w-3.5 h-3.5 text-indigo-200" />
                                            <span>Request Correction</span>
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* CORRECTION REQUEST FORM MODAL */}
                {showCorrectionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div 
                            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                            onClick={() => setShowCorrectionModal(false)}
                        />
                        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 animate-scale-up border border-gray-100">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-[#1F3864] m-0">Request Attendance Correction</h3>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Target Date: <strong>{correctionTargetDate}</strong></p>
                                </div>
                                <button
                                    onClick={() => setShowCorrectionModal(false)}
                                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={submitCorrection} className="p-5 space-y-4 text-xs">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Requested Punch In Time</label>
                                    <input 
                                        type="datetime-local" 
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-1 focus:ring-indigo-500 font-medium" 
                                        value={data.requested_punch_in_time} 
                                        onChange={e => setData('requested_punch_in_time', e.target.value)} 
                                    />
                                    {errors.requested_punch_in_time && <span className="text-red-600 text-[0.7rem] font-semibold mt-1 block">{errors.requested_punch_in_time}</span>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Requested Punch Out Time</label>
                                    <input 
                                        type="datetime-local" 
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-1 focus:ring-indigo-500 font-medium" 
                                        value={data.requested_punch_out_time} 
                                        onChange={e => setData('requested_punch_out_time', e.target.value)} 
                                    />
                                    {errors.requested_punch_out_time && <span className="text-red-600 text-[0.7rem] font-semibold mt-1 block">{errors.requested_punch_out_time}</span>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Reason Category</label>
                                    <select 
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-1 focus:ring-indigo-500 font-medium" 
                                        value={data.reason_category} 
                                        onChange={e => setData('reason_category', e.target.value)}
                                    >
                                        <option value="forgot_to_punch_out">Forgot to Punch Out</option>
                                        <option value="forgot_to_punch_in">Forgot to Punch In</option>
                                        <option value="system_error">System Error</option>
                                        <option value="emergency_early_leave">Emergency Early Leave</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.reason_category && <span className="text-red-600 text-[0.7rem] font-semibold mt-1 block">{errors.reason_category}</span>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Reason Details (min 10 characters)</label>
                                    <textarea 
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-1 focus:ring-indigo-500 font-medium min-h-[80px]" 
                                        value={data.reason_details} 
                                        onChange={e => setData('reason_details', e.target.value)}
                                        placeholder="Explain why you are requesting this correction..."
                                    />
                                    {errors.reason_details && <span className="text-red-600 text-[0.7rem] font-semibold mt-1 block">{errors.reason_details}</span>}
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button 
                                        type="button" 
                                        className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-2xs" 
                                        onClick={() => setShowCorrectionModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-2 text-xs font-bold text-white bg-[#1F3864] hover:bg-[#152748] rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50" 
                                        disabled={processing}
                                    >
                                        <Send className="w-3.5 h-3.5 text-indigo-200" />
                                        <span>Submit Request</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
