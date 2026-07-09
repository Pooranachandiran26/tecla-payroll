import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import useToast from '../../Hooks/useToast.jsx';

export default function LeaveRequest({ employee, leaveRequests }) {
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

    const getLeaveBadgeColor = (type) => {
        switch (type) {
            case 'casual': return 'var(--primary)';
            case 'sick': return 'var(--warning)';
            case 'earned': return 'var(--success)';
            case 'unpaid': return 'var(--danger)';
            default: return 'var(--info)';
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'approved': return 'var(--success)';
            case 'rejected': return 'var(--danger)';
            case 'pending': return 'var(--warning)';
            default: return 'var(--secondary)';
        }
    };

    const formatType = (type) => {
        return type.charAt(0).toUpperCase() + type.slice(1) + ' Leave';
    };

    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
            <AuthenticatedLayout>
                <Head title="Leave Request" />
                
                <div className="flex-row-between">
                    <div>
                        <h2>My Leave Requests</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Submit leave applications, track approval states, and review historical logs.</p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}>➕ Apply for Leave</Button>
                </div>

                <div className="card" style={{ marginTop: '2rem' }}>
                    <h3 className="card-title" style={{ marginBottom: '1rem' }}>My Leave Request History</h3>
                    
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
                                        <td colSpan="7" style={{ textAlign: 'center' }}>No leave requests found.</td>
                                    </tr>
                                ) : (
                                    leaveRequests.data.map(req => (
                                        <tr key={req.id}>
                                            <td>#LR-{req.id}</td>
                                            <td>
                                                <span className="badge" style={{ backgroundColor: getLeaveBadgeColor(req.leave_type), color: '#fff' }}>
                                                    {formatType(req.leave_type)}
                                                </span>
                                            </td>
                                            <td>{new Date(req.from_date).toLocaleDateString()}</td>
                                            <td>{new Date(req.to_date).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{req.days_count} Days</td>
                                            <td>{req.reason}</td>
                                            <td>
                                                <span className="badge" style={{ backgroundColor: getStatusBadgeColor(req.status), color: '#fff' }}>
                                                    {req.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply for Leave">
                    <form onSubmit={submitLeave} className="form-grid">
                        <div className="form-group">
                            <label>Leave Type</label>
                            <select 
                                className="form-control" 
                                value={data.leave_type} 
                                onChange={e => setData('leave_type', e.target.value)}
                            >
                                <option value="casual">Casual Leave (CL)</option>
                                <option value="sick">Sick Leave (SL)</option>
                                <option value="earned">Earned Leave (EL)</option>
                                <option value="unpaid">Loss of Pay (LOP)</option>
                            </select>
                            {errors.leave_type && <span className="error-text">{errors.leave_type}</span>}
                        </div>

                        <div className="form-group">
                            <label>From Date</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={data.from_date} 
                                onChange={e => setData('from_date', e.target.value)}
                            />
                            {errors.from_date && <span className="error-text">{errors.from_date}</span>}
                        </div>

                        <div className="form-group">
                            <label>To Date</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={data.to_date} 
                                onChange={e => setData('to_date', e.target.value)}
                            />
                            {errors.to_date && <span className="error-text">{errors.to_date}</span>}
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Reason Description</label>
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
