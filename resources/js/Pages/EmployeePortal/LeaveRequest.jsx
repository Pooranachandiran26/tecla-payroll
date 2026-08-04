import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import Pagination from '../../Components/ui/Pagination';
import useToast from '../../Hooks/useToast.jsx';
import { Calendar, CheckCircle2, Info, AlertCircle, Clock } from 'lucide-react';

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
                                    <span className={`text-3xl font-extrabold ${remaining > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {remaining}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-500">
                                        / {allocated + carried} Days Remaining
                                    </span>
                                </div>

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
                        <div className="form-group">
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Leave Type</label>
                            <select 
                                className="form-control" 
                                value={data.leave_type} 
                                onChange={e => setData('leave_type', e.target.value)}
                            >
                                {['casual', 'sick', 'earned', 'unpaid'].map(t => {
                                    const b = getBalanceForType(t);
                                    const rem = b ? parseFloat(b.remaining_days) : (t === 'unpaid' ? 'Unlimited' : 12);
                                    const label = t === 'casual' ? `Casual Leave (CL) — ${rem} days available`
                                        : t === 'sick' ? `Sick Leave (SL) — ${rem} days available`
                                        : t === 'earned' ? `Earned Leave (EL) — ${rem} days available`
                                        : `Loss of Pay (LOP) — Unpaid`;
                                    return <option key={t} value={t}>{label}</option>;
                                })}
                            </select>
                            {errors.leave_type && <span className="error-text">{errors.leave_type}</span>}
                        </div>

                        {selectedBalance && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 col-span-full">
                                <div className="flex items-center space-x-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <span>Available Balance for selected leave type:</span>
                                </div>
                                <strong className="text-emerald-700 font-bold">{selectedBalance.remaining_days} Days</strong>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">From Date</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={data.from_date} 
                                onChange={e => setData('from_date', e.target.value)}
                            />
                            {errors.from_date && <span className="error-text">{errors.from_date}</span>}
                        </div>

                        <div className="form-group">
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">To Date</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={data.to_date} 
                                onChange={e => setData('to_date', e.target.value)}
                            />
                            {errors.to_date && <span className="error-text">{errors.to_date}</span>}
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reason Description</label>
                            <textarea 
                                className="form-control" 
                                rows="3" 
                                placeholder="Describe the reason for leave (min 10 chars)"
                                value={data.reason} 
                                onChange={e => setData('reason', e.target.value)}
                            ></textarea>
                            {errors.reason && <span className="error-text">{errors.reason}</span>}
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
