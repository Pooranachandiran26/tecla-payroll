import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Pagination from '../../Components/ui/Pagination';
import useToast from '../../Hooks/useToast.jsx';
import { Calendar, CheckCircle2, Info, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

export default function LeaveRequest({ employee, leaveRequests, leaveBalances = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { showToast } = useToast();

    const { data, setData, post, processing, errors, reset } = useForm({
        leave_type: 'casual',
        from_date: '',
        to_date: '',
        reason: '',
    });

    const submitLeave = (e) => {
        e.preventDefault();
        post(route('employee.leave.store'), {
            onSuccess: () => {
                showToast({ message: 'Leave request submitted successfully.', type: 'success' });
                setIsModalOpen(false);
                reset();
            },
            onError: (errs) => {
                if (usePage().props.flash?.error) {
                    showToast({ message: usePage().props.flash.error, type: 'error' });
                } else {
                    showToast({ message: 'Validation failed.', type: 'error' });
                }
            }
        });
    };

    const getLeaveBadgeVariant = (type) => {
        switch (type) {
            case 'casual': return 'info';
            case 'sick': return 'warning';
            case 'earned': return 'success';
            case 'unpaid': return 'danger';
            default: return 'info';
        }
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            case 'pending': return 'warning';
            default: return 'neutral';
        }
    };

    const formatType = (type) => {
        return type.charAt(0).toUpperCase() + type.slice(1) + ' Leave';
    };

    // Helper to get remaining balance for a leave type
    const getBalanceForType = (type) => {
        return leaveBalances.find(b => b.policy?.leave_type === type) || null;
    };

    const selectedBalance = getBalanceForType(data.leave_type);
    const selectedPolicy = selectedBalance?.policy;
    const availableRemaining = selectedBalance ? parseFloat(selectedBalance.remaining_days) : (data.leave_type === 'unpaid' ? 999 : 12);
    const maxDaysPerMonth = selectedPolicy?.max_days_per_month ? parseFloat(selectedPolicy.max_days_per_month) : null;

    // Calculate requested duration in days
    const calculateRequestedDays = () => {
        if (!data.from_date || !data.to_date) return 0;
        const start = new Date(data.from_date);
        const end = new Date(data.to_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const requestedDays = calculateRequestedDays();

    // Effective paid quota is min(availableRemaining, maxDaysPerMonth)
    let effectivePaidQuota = availableRemaining;
    if (maxDaysPerMonth && maxDaysPerMonth > 0) {
        effectivePaidQuota = Math.min(availableRemaining, maxDaysPerMonth);
    }

    const isExceeded = data.leave_type !== 'unpaid' && requestedDays > effectivePaidQuota && requestedDays > 0;
    const paidDaysCount = Math.min(requestedDays, Math.max(0, effectivePaidQuota));
    const lopDaysCount = isExceeded ? requestedDays - paidDaysCount : 0;
    const isLowBalance = data.leave_type !== 'unpaid' && availableRemaining <= 5;

    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
            <AuthenticatedLayout>
                <Head title="Leave Request" />
                
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1F3864]">My Leave Requests</h2>
                        <p className="text-gray-500 text-sm">Submit leave applications, track approval states, and review historical logs.</p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                        ➕ Apply for Leave
                    </Button>
                </div>

                {/* Remaining Leave Balance Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {['casual', 'sick', 'earned'].map((type) => {
                        const bal = getBalanceForType(type);
                        const policy = bal?.policy;
                        const allocated = bal ? parseFloat(bal.allocated_days) : 12;
                        const remaining = bal ? parseFloat(bal.remaining_days) : allocated;
                        const used = bal ? parseFloat(bal.used_days) : 0;
                        const carried = bal ? parseFloat(bal.carried_over_days) : 0;
                        const title = type === 'casual' ? 'Casual Leave (CL)' : type === 'sick' ? 'Sick Leave (SL)' : 'Earned Leave (EL)';
                        const cardBg = type === 'casual' ? 'border-sky-200 bg-sky-50/30' : type === 'sick' ? 'border-amber-200 bg-amber-50/30' : 'border-emerald-200 bg-emerald-50/30';
                        const textAccent = type === 'casual' ? 'text-sky-700' : type === 'sick' ? 'text-amber-700' : 'text-emerald-700';

                        return (
                            <div key={type} className={`bg-white border ${cardBg} rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden`}>
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${textAccent}`}>
                                        {title}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">Year {new Date().getFullYear()}</span>
                                </div>

                                <div className="flex items-baseline space-x-2">
                                    <span className={`text-3xl font-extrabold ${remaining > 5 ? 'text-emerald-600' : remaining > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {remaining}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-500">
                                        / {allocated + carried} Days Remaining
                                    </span>
                                </div>

                                {policy?.max_days_per_month && (
                                    <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit">
                                        Max {policy.max_days_per_month} Paid Day(s) / Month
                                    </div>
                                )}

                                {remaining <= 5 && (
                                    <div className="flex items-center space-x-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Low Balance Warning ({remaining}d left)</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                                    <span>Allocated: <strong className="text-gray-800">{allocated}d</strong></span>
                                    {carried > 0 && <span>Carried: <strong className="text-gray-800">{carried}d</strong></span>}
                                    <span>Used: <strong className="text-amber-700">{used}d</strong></span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* History Table */}
                <div className="card">
                    <h3 className="card-title mb-4">My Leave Request History</h3>
                    
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Request ID</th>
                                    <th>Leave Type</th>
                                    <th>From Date</th>
                                    <th>To Date</th>
                                    <th>Total Days</th>
                                    <th>Reason Description</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.data.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-gray-500">No leave requests found.</td>
                                    </tr>
                                ) : (
                                    leaveRequests.data.map(req => (
                                        <tr key={req.id}>
                                            <td>#LR-{req.id}</td>
                                            <td>
                                                <Badge variant={getLeaveBadgeVariant(req.leave_type)}>
                                                    {formatType(req.leave_type)}
                                                </Badge>
                                            </td>
                                            <td>{new Date(req.from_date).toLocaleDateString()}</td>
                                            <td>{new Date(req.to_date).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{req.days_count} Days</td>
                                            <td>{req.reason}</td>
                                            <td>
                                                <Badge variant={getStatusBadgeVariant(req.status)}>
                                                    {req.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {leaveRequests.total > 0 && (
                        <div className="mt-6">
                            <Pagination 
                                currentPage={leaveRequests.current_page}
                                totalPages={leaveRequests.last_page}
                                totalItems={leaveRequests.total}
                                itemsPerPage={leaveRequests.per_page}
                                onPageChange={(page) => {
                                    router.get(route('employee.leave'), { page }, { preserveState: true, preserveScroll: true });
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Apply Modal */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply for Leave">
                    <form onSubmit={submitLeave} className="form-grid">
                        {/* Server / Validation Error Flash Banner */}
                        {(usePage().props.flash?.error || Object.keys(errors).length > 0) && (
                            <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-start space-x-2 text-xs text-red-900 col-span-full mb-2">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <strong className="block font-bold text-red-800">⚠️ Validation / Submission Error:</strong>
                                    <span>{usePage().props.flash?.error || 'Please correct the highlighted red errors below before submitting.'}</span>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Leave Type</label>
                            <select 
                                className={`form-control ${errors.leave_type ? 'is-invalid border-red-500 text-red-900 bg-red-50/50' : ''}`} 
                                value={data.leave_type} 
                                onChange={e => setData('leave_type', e.target.value)}
                            >
                                {['casual', 'sick', 'earned', 'unpaid'].map(t => {
                                    const b = getBalanceForType(t);
                                    const rem = b ? parseFloat(b.remaining_days) : (t === 'unpaid' ? 'Unlimited' : 12);
                                    const cap = b?.policy?.max_days_per_month ? ` (Max ${b.policy.max_days_per_month}d/mo)` : '';
                                    const label = t === 'casual' ? `Casual Leave (CL) — ${rem} days available${cap}`
                                        : t === 'sick' ? `Sick Leave (SL) — ${rem} days available${cap}`
                                        : t === 'earned' ? `Earned Leave (EL) — ${rem} days available${cap}`
                                        : `Loss of Pay (LOP) — Unpaid`;
                                    return <option key={t} value={t}>{label}</option>;
                                })}
                            </select>
                            {errors.leave_type && (
                                <span className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600 inline" /> {errors.leave_type}
                                </span>
                            )}
                        </div>

                        {selectedBalance && (
                            <div className={`p-3 border rounded-lg flex flex-col space-y-1 text-xs col-span-full ${isLowBalance ? 'bg-red-50 border-red-300 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {isLowBalance ? (
                                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        )}
                                        <span>Available Annual Balance for {formatType(data.leave_type)}:</span>
                                    </div>
                                    <strong className={`font-bold ${isLowBalance ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {selectedBalance.remaining_days} Days
                                    </strong>
                                </div>
                                {selectedPolicy?.max_days_per_month && (
                                    <div className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 p-1.5 rounded border border-indigo-200 mt-1">
                                        📌 Policy Rule: Max {selectedPolicy.max_days_per_month} paid day(s) allowed per month. Taking extra days in the same month will be Loss of Pay (LOP).
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">From Date</label>
                            <input 
                                type="date" 
                                className={`form-control ${errors.from_date ? 'is-invalid border-red-500 text-red-900 bg-red-50/50' : ''}`} 
                                value={data.from_date} 
                                onChange={e => setData('from_date', e.target.value)}
                            />
                            {errors.from_date && (
                                <span className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600 inline" /> {errors.from_date}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">To Date</label>
                            <input 
                                type="date" 
                                className={`form-control ${errors.to_date ? 'is-invalid border-red-500 text-red-900 bg-red-50/50' : ''}`} 
                                value={data.to_date} 
                                onChange={e => setData('to_date', e.target.value)}
                            />
                            {errors.to_date && (
                                <span className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600 inline" /> {errors.to_date}
                                </span>
                            )}
                        </div>

                        {/* Low Balance Warning Banner */}
                        {isLowBalance && !isExceeded && (
                            <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-start space-x-2 text-xs text-red-900 col-span-full">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <strong className="block font-bold text-red-800">⚠️ Low Leave Balance Warning:</strong>
                                    <span>You have only {availableRemaining} day(s) remaining for {formatType(data.leave_type)}. Any requested days beyond {availableRemaining} day(s) will be treated as Loss of Pay (LOP).</span>
                                </div>
                            </div>
                        )}

                        {/* Exceeded Balance or Monthly Cap Warning Banner with LOP Breakdown */}
                        {isExceeded && (
                            <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg col-span-full space-y-2">
                                <div className="flex items-start space-x-2 text-red-950 font-semibold text-xs">
                                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-red-800 font-bold">⚠️ Warning: Requested leave duration ({requestedDays} days) exceeds available paid limit ({effectivePaidQuota} day(s) allowed).</span>
                                        {maxDaysPerMonth && (
                                            <p className="text-[11px] text-indigo-900 font-semibold mt-0.5">
                                                (Policy Cap: Max {maxDaysPerMonth} paid day(s) per month)
                                            </p>
                                        )}
                                        <p className="text-[11px] text-red-800 font-normal mt-0.5">
                                            {paidDaysCount} paid leave day(s) will be covered, and the remaining <strong className="text-red-900">{lopDaysCount} day(s) will be treated as Loss of Pay (LOP)</strong>.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-1 border-t border-red-200 text-xs font-medium">
                                    <span className="text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded border border-emerald-200">
                                        Paid Leave: <strong>{paidDaysCount} day(s)</strong>
                                    </span>
                                    <span className="text-red-900 bg-red-100 px-2.5 py-1 rounded border border-red-300 font-bold">
                                        Loss of Pay (LOP): <strong>{lopDaysCount} day(s)</strong>
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reason Description</label>
                            <textarea 
                                className={`form-control ${errors.reason ? 'is-invalid border-red-500 text-red-900 bg-red-50/50' : ''}`} 
                                rows="3" 
                                placeholder="Describe the reason for leave (min 10 chars)"
                                value={data.reason} 
                                onChange={e => setData('reason', e.target.value)}
                            ></textarea>
                            {errors.reason && (
                                <span className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-600 inline" /> {errors.reason}
                                </span>
                            )}
                        </div>

                        <div className="form-actions" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={processing}>Submit Request</Button>
                        </div>
                    </form>
                </Modal>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
