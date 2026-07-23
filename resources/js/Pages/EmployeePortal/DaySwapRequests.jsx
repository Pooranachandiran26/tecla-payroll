import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import useToast from '../../Hooks/useToast.jsx';

export default function DaySwapRequests({ requests = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { showToast } = useToast();

    const { data, setData, post, processing, errors, reset } = useForm({
        original_date: '',
        new_date: '',
        reason: '',
    });

    const submitSwap = (e) => {
        e.preventDefault();
        post(route('employee.day-swaps.store'), {
            onSuccess: () => {
                showToast({ message: 'Day swap request submitted successfully.', type: 'success' });
                setIsModalOpen(false);
                reset();
            },
            onError: (errs) => {
                const flashError = usePage().props.flash?.error;
                if (flashError) {
                    showToast({ message: flashError, type: 'error' });
                } else if (errs.original_date) {
                    showToast({ message: errs.original_date, type: 'error' });
                } else {
                    showToast({ message: 'Validation failed. Please check form inputs.', type: 'error' });
                }
            }
        });
    };

    const withdrawSwap = (id) => {
        if (!confirm('Are you sure you want to withdraw this day swap request?')) return;
        post(route('employee.day-swaps.withdraw', id), {
            onSuccess: () => {
                showToast({ message: 'Day swap request withdrawn successfully.', type: 'success' });
            },
            onError: (errs) => {
                showToast({ message: 'Failed to withdraw swap request.', type: 'error' });
            }
        });
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            case 'pending': return 'warning';
            case 'withdrawn': return 'neutral';
            default: return 'neutral';
        }
    };

    return (
        <RoleGuard allowedRoles={['employee']}>
            <AuthenticatedLayout>
                <Head title="Attendance Day Swap Requests" />

                <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1F3864]">Attendance Day Swap Requests</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Request to swap a worked off-day with a regular working day. Approved swaps update your attendance resolution automatically.
                        </p>
                    </div>
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        + Request Day Swap
                    </Button>
                </div>

                {/* Swap Requests History Table */}
                <div className="card p-0">
                    <div className="p-4 border-b border-gray-200 font-semibold text-[#1F3864] text-base flex justify-between items-center">
                        <span>My Day Swap History</span>
                        <span className="text-xs text-gray-500 font-normal">Total Requests: {requests.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table w-full">
                            <thead>
                                <tr>
                                    <th>Submitted On</th>
                                    <th>Off-Day Worked (Original)</th>
                                    <th>Work-Day Taken Off (New)</th>
                                    <th>Reason / Details</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-gray-500">
                                            No day swap requests submitted yet. Click "+ Request Day Swap" above to create your first request.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <React.Fragment key={req.id}>
                                            <tr>
                                                <td className="text-gray-500 text-xs">{req.created_at}</td>
                                                <td><strong className="font-mono text-gray-900">{req.originalDate}</strong></td>
                                                <td><strong className="font-mono text-gray-900">{req.newDate}</strong></td>
                                                <td className="text-gray-600 max-w-xs truncate" title={req.reason}>
                                                    {req.reason}
                                                </td>
                                                <td>
                                                    <Badge variant={getStatusBadgeVariant(req.status)}>
                                                        {req.status}
                                                    </Badge>
                                                    {req.status === 'rejected' && req.rejectionReason && (
                                                        <span className="block text-xs text-red-500 mt-1" title={req.rejectionReason}>
                                                            Reason: {req.rejectionReason}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {req.status === 'pending' && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => withdrawSwap(req.id)}
                                                            disabled={processing}
                                                        >
                                                            Withdraw
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                            {req.conflictNote && (
                                                <tr>
                                                    <td colSpan="6" className="bg-amber-50 p-3 border-t border-amber-200">
                                                        <div className="flex items-start gap-2 text-xs text-amber-800 font-medium">
                                                            <span className="text-amber-600 font-bold">⚠️</span>
                                                            <span>{req.conflictNote}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Request Day Swap Modal */}
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    title="Request Attendance Day Swap"
                >
                    <form onSubmit={submitSwap} className="space-y-4 py-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                Off-Day Worked / To Work (Original Date) *
                            </label>
                            <input
                                type="date"
                                value={data.original_date}
                                onChange={(e) => setData('original_date', e.target.value)}
                                className="form-control w-full text-sm"
                                required
                            />
                            {errors.original_date && (
                                <p className="text-xs text-red-500 mt-1">{errors.original_date}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">Select the weekend / weekly off day you worked or plan to work.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                Work-Day Taken Off (New Date) *
                            </label>
                            <input
                                type="date"
                                value={data.new_date}
                                onChange={(e) => setData('new_date', e.target.value)}
                                className="form-control w-full text-sm"
                                required
                            />
                            {errors.new_date && (
                                <p className="text-xs text-red-500 mt-1">{errors.new_date}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">Select the regular working day you want to take off in exchange.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                                Reason for Day Swap *
                            </label>
                            <textarea
                                rows="3"
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                placeholder="Explain why you are requesting this day swap..."
                                className="form-control w-full text-sm"
                                required
                            />
                            {errors.reason && (
                                <p className="text-xs text-red-500 mt-1">{errors.reason}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" size="sm" type="submit" disabled={processing}>
                                {processing ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
