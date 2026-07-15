import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Modal from '../../Components/ui/Modal';
import Button from '../../Components/ui/Button';
import useToast from '../../Hooks/useToast';
import axios from 'axios';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function EmployeeProfile({ employee: empProp, pendingBankRequest }) {
    const employee = empProp?.data || empProp || {};
    const firstInitial = employee.full_name ? employee.full_name.charAt(0).toUpperCase() : '?';
    const { showToast } = useToast();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [ifscVerifying, setIfscVerifying] = useState(false);
    const [ifscError, setIfscError] = useState('');

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        new_bank_account_number: '',
        new_bank_account_number_confirmation: '',
        new_bank_ifsc: '',
        new_bank_name: '',
        new_bank_branch: '',
        new_account_holder_name: employee.full_name || '',
        reason: ''
    });

    const handleIfscBlur = async () => {
        if (!data.new_bank_ifsc) return;
        const cleanIfsc = data.new_bank_ifsc.toUpperCase().trim();
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
            setIfscError('IFSC must be 4 letters + 0 + 6 alphanumeric characters');
            showToast({ type: 'error', title: 'Invalid IFSC', message: 'IFSC must be 4 letters + 0 + 6 alphanumeric characters.' });
            return;
        }
        setIfscError('');
        setIfscVerifying(true);
        try {
            const res = await axios.get(`https://ifsc.razorpay.com/${cleanIfsc}`);
            if (res.data) {
                setData(prev => ({
                    ...prev,
                    new_bank_name: res.data.BANK || prev.new_bank_name,
                    new_bank_branch: res.data.BRANCH || prev.new_bank_branch
                }));
                showToast({ type: 'success', title: 'IFSC Verified', message: `Bank details auto-filled for ${res.data.BANK}.` });
            }
        } catch (err) {
            setIfscError('Warning: Could not auto-verify IFSC. You may manually fill bank & branch.');
            showToast({ type: 'warning', title: 'IFSC Lookup Failed', message: 'Could not auto-verify IFSC. Please fill manually.' });
        } finally {
            setIfscVerifying(false);
        }
    };

    const handleSubmitBankRequest = (e) => {
        e.preventDefault();
        
        if (!data.new_account_holder_name || !data.new_bank_account_number || !data.new_bank_account_number_confirmation || !data.new_bank_ifsc || !data.reason) {
            showToast({ type: 'error', title: 'Validation Error', message: 'Please fill out all required fields.' });
            return;
        }

        if (data.new_bank_account_number !== data.new_bank_account_number_confirmation) {
            showToast({ type: 'error', title: 'Validation Error', message: 'Account numbers do not match.' });
            return;
        }
        
        if (ifscError || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.new_bank_ifsc.toUpperCase())) {
            showToast({ type: 'error', title: 'Validation Error', message: 'Please provide a valid IFSC code.' });
            return;
        }

        post(route('employee.bank-change-request.store'), {
            onSuccess: () => {
                showToast({ type: 'success', title: 'Request Submitted', message: 'Bank change request submitted successfully.' });
                setIsModalOpen(false);
                reset();
            },
            onError: (errs) => {
                showToast({ type: 'error', title: 'Form Submission Error', message: 'Please correct the highlighted errors.' });
            }
        });
    };

    return (
        <RoleGuard allowedRoles={['employee']}>
            <AuthenticatedLayout>
                <Head title="Employee Profile" />
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2>My Employee Profile</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        View your employment details, statutory information, and manage bank accounts.
                    </p>
                </div>

                <div className="grid-layout">
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>{firstInitial}</div>
                                <div>
                                    <h3 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>{employee.full_name || 'N/A'}</h3>
                                    <span className={`badge badge-${employee.status === 'active' ? 'success' : 'warning'}`}>
                                        {employee.status === 'active' ? 'Active Employee' : employee.status}
                                    </span>
                                </div>
                            </div>
                            
                            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Employment Information</h4>
                            <div className="grid-cols-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Employee Code</div>
                                    <div style={{ fontWeight: '500' }}>{employee.employee_code || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Designation</div>
                                    <div style={{ fontWeight: '500' }}>{employee.designation || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Client Partner</div>
                                    <div style={{ fontWeight: '500' }}>{employee.client_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date of Joining</div>
                                    <div style={{ fontWeight: '500' }}>{employee.date_of_joining || 'N/A'}</div>
                                </div>
                            </div>

                            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Contact Details</h4>
                            <div className="grid-cols-2" style={{ gap: '1rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Personal Email</div>
                                    <div style={{ fontWeight: '500' }}>{employee.personal_email || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phone Number</div>
                                    <div style={{ fontWeight: '500' }}>{employee.phone_number || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="card-title">Bank Details</h3>
                                <button 
                                    className="btn btn-secondary btn-xs" 
                                    onClick={() => {
                                        clearErrors();
                                        setIsModalOpen(true);
                                    }}
                                    disabled={!!pendingBankRequest}
                                >
                                    {pendingBankRequest ? 'Request Pending' : 'Request Change'}
                                </button>
                            </div>

                            {pendingBankRequest && (
                                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    ⏳ <strong>Request Under Review:</strong> Bank detail change request submitted on {new Date(pendingBankRequest.created_at).toLocaleDateString()} is pending admin approval.
                                </div>
                            )}

                            <div style={{ backgroundColor: 'var(--bg-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '1.5rem' }}>🏦</span>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>{employee.bank_name || 'Bank Not Added'}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Salary Account</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                                        {employee.bank_account_number ? `••••••••${employee.bank_account_number.slice(-4)}` : 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>IFSC Code:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{employee.bank_ifsc || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Statutory Profile</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>Provident Fund (PF)</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            UAN: {employee.uan_number ? employee.uan_number : 'Not Available'}
                                        </div>
                                    </div>
                                    <span className={`badge badge-${employee.pf_applicable ? 'success' : 'neutral'}`}>
                                        {employee.pf_applicable ? 'Active' : 'Not Applicable'}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>ESIC</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            IP: {employee.esic_number ? employee.esic_number : 'Not Available'}
                                        </div>
                                    </div>
                                    <span className={`badge badge-${employee.esi_applicable ? 'success' : 'neutral'}`}>
                                        {employee.esi_applicable ? 'Active' : 'Not Applicable'}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: '500' }}>Professional Tax (PT)</div>
                                    <span className={`badge badge-${employee.pt_applicable ? 'success' : 'neutral'}`}>
                                        {employee.pt_applicable ? 'Deducted' : 'Not Applicable'}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: '500' }}>Income Tax (TDS)</div>
                                    <span className="badge badge-info">{employee.tds_regime === 'new' ? 'New Regime' : 'Old Regime'}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bank Change Request Modal */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Request Bank Details Update">
                    <form onSubmit={handleSubmitBankRequest} className="p-4 space-y-4" noValidate>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Account Holder Name *</label>
                            <input 
                                type="text"
                                className="form-control w-full"
                                value={data.new_account_holder_name}
                                onChange={e => setData('new_account_holder_name', e.target.value)}
                                required
                            />
                            {errors.new_account_holder_name && <span className="text-red-500 text-xs">{errors.new_account_holder_name}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">New Account Number *</label>
                                <input 
                                    type="text"
                                    className="form-control w-full"
                                    value={data.new_bank_account_number}
                                    onChange={e => setData('new_bank_account_number', e.target.value)}
                                    placeholder="Enter new account no"
                                    required
                                />
                                {errors.new_bank_account_number && <span className="text-red-500 text-xs">{errors.new_bank_account_number}</span>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Confirm Account Number *</label>
                                <input 
                                    type="text"
                                    className="form-control w-full"
                                    value={data.new_bank_account_number_confirmation}
                                    onChange={e => setData('new_bank_account_number_confirmation', e.target.value)}
                                    placeholder="Re-enter account no"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">IFSC Code *</label>
                            <input 
                                type="text"
                                className="form-control w-full uppercase"
                                value={data.new_bank_ifsc}
                                onChange={e => setData('new_bank_ifsc', e.target.value.toUpperCase())}
                                onBlur={handleIfscBlur}
                                placeholder="e.g. HDFC0000060"
                                required
                            />
                            {ifscVerifying && <span className="text-blue-500 text-xs block">Verifying IFSC...</span>}
                            {ifscError && <span className="text-amber-600 text-xs block">{ifscError}</span>}
                            {errors.new_bank_ifsc && <span className="text-red-500 text-xs">{errors.new_bank_ifsc}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Bank Name</label>
                                <input 
                                    type="text"
                                    className="form-control w-full"
                                    value={data.new_bank_name}
                                    onChange={e => setData('new_bank_name', e.target.value)}
                                    placeholder="Auto-filled or manual"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Branch Name</label>
                                <input 
                                    type="text"
                                    className="form-control w-full"
                                    value={data.new_bank_branch}
                                    onChange={e => setData('new_bank_branch', e.target.value)}
                                    placeholder="Auto-filled or manual"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reason / Remarks for Change *</label>
                            <textarea 
                                className="form-control w-full"
                                rows="3"
                                value={data.reason}
                                onChange={e => setData('reason', e.target.value)}
                                placeholder="Explain why bank details are being changed..."
                                required
                            ></textarea>
                            {errors.reason && <span className="text-red-500 text-xs">{errors.reason}</span>}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={processing || ifscVerifying}>
                                {processing ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </div>
                    </form>
                </Modal>

            </AuthenticatedLayout>
        </RoleGuard>
    );
}
