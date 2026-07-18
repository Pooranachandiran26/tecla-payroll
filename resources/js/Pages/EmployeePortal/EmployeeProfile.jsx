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

    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [activeDocType, setActiveDocType] = useState('');
    
    const { 
        data: docData, 
        setData: setDocData, 
        post: postDoc, 
        processing: docProcessing, 
        errors: docErrors, 
        reset: docReset, 
        clearErrors: docClearErrors 
    } = useForm({
        document_type: '',
        file: null
    });

    const openDocModal = (docType) => {
        docClearErrors();
        docReset();
        setActiveDocType(docType);
        setDocData('document_type', docType);
        setIsDocModalOpen(true);
    };

    const handleDocUpload = (e) => {
        e.preventDefault();
        postDoc(route('employee.documents.store'), {
            forceFormData: true,
            onSuccess: () => {
                showToast({ type: 'success', title: 'Upload Successful', message: `${activeDocType} uploaded successfully and is pending verification.` });
                setIsDocModalOpen(false);
            },
            onError: (errs) => {
                showToast({ type: 'error', title: 'Upload Failed', message: docErrors.file || 'Failed to upload document.' });
            }
        });
    };

    const requiredDocsList = [
        { type: 'pan_card', name: 'PAN Card (copy)', requirement: 'Always Required' },
        { type: 'aadhaar_card', name: 'Aadhaar Card (copy)', requirement: 'Always Required' },
        { type: 'bank_passbook', name: 'Bank Proof (cancelled cheque / passbook)', requirement: 'Always Required' },
        { type: 'photo', name: 'Photograph', requirement: 'Always Required' },
        { type: 'education_certificate', name: 'Educational Certificates', requirement: 'Optional' },
        { type: 'offer_letter', name: 'Signed Offer Letter / Employment Contract', requirement: 'Optional' }
    ];

    if (employee.prior_employment_flag) {
        requiredDocsList.push(
            { type: 'relieving_letter', name: 'Previous Employer: Relieving Letter', requirement: 'Conditional' },
            { type: 'previous_payslips', name: 'Previous Employer: Last 3 Months Payslips', requirement: 'Conditional' },
            { type: 'form16', name: 'Previous Employer: Form 16', requirement: 'Conditional' }
        );
    }

    const getDocStatus = (type) => {
        if (!employee.documents) return null;
        return employee.documents.find(d => d.document_type === type);
    };

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

    const styles = {
        pageContainer: {
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
            marginBottom: '2rem'
        },
        hero: {
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '2rem',
            flexWrap: 'wrap'
        },
        avatarLg: {
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9',
            color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 'bold'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem 3rem',
            marginBottom: '2.5rem'
        },
        card: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        },
        cardTitle: {
            fontSize: '1rem',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #f8fafc'
        },
        rowLast: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        label: {
            fontSize: '0.85rem',
            color: '#64748b',
            fontWeight: '500'
        },
        value: {
            fontWeight: '600',
            color: '#0f172a',
            textAlign: 'right',
            fontSize: '0.9rem'
        }
    };

    return (
        <RoleGuard allowedRoles={['employee']}>
            <AuthenticatedLayout>
                <Head title="Employee Profile" />
                <div style={styles.pageContainer}>
                    {/* Hero Section */}
                    <div style={styles.hero}>
                        <div style={styles.avatarLg}>{firstInitial}</div>
                        <div>
                            <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.25rem 0', fontWeight: '700', color: '#0f172a' }}>{employee.full_name || 'N/A'}</h2>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', color: '#475569' }}>
                                <span style={{ fontSize: '1.05rem', fontWeight: '500' }}>{employee.designation || 'Employee'}</span>
                                <span style={{ fontSize: '0.85rem', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '600' }}>
                                    Code: {employee.employee_code || 'N/A'}
                                </span>
                                <span style={{ fontSize: '0.85rem', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '600' }}>
                                    {employee.employment_model === 'contract' ? 'Contractor' : 'Full-Time'}
                                </span>
                                <span style={{ backgroundColor: employee.status === 'active' ? '#10B981' : '#F59E0B', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                                    {employee.status === 'active' ? '● Active' : `● ${employee.status}`}
                                </span>
                            </div>
                        </div>
                    </div>

                {/* Info Grid */}
                <div style={styles.grid}>
                    {/* Card A: Personal Info */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>👤 Personal Information</h3>
                        <div>
                            <div style={styles.row}>
                                <span style={styles.label}>Date of Birth</span>
                                <span style={styles.value}>{employee.date_of_birth || 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Gender</span>
                                <span style={styles.value}>{employee.gender ? (employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1)) : 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Blood Group</span>
                                <span style={styles.value}>{employee.blood_group || 'N/A'}</span>
                            </div>
                            <div style={styles.rowLast}>
                                <span style={styles.label}>Marital Status</span>
                                <span style={styles.value}>{employee.marital_status ? (employee.marital_status.charAt(0).toUpperCase() + employee.marital_status.slice(1)) : 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card B: Contact & Address */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📞 Contact & Address</h3>
                        <div>
                            <div style={styles.row}>
                                <span style={styles.label}>Personal Email</span>
                                <span style={styles.value}>{employee.personal_email || 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Phone Number</span>
                                <span style={styles.value}>{employee.phone_number || 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Emergency Contact</span>
                                <span style={styles.value}>
                                    {employee.emergency_contact_name || 'N/A'} <br/>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{employee.emergency_contact_phone || ''}</span>
                                </span>
                            </div>
                            <div style={styles.rowLast}>
                                <span style={styles.label}>Residential Address</span>
                                <span style={{ ...styles.value, maxWidth: '200px', fontSize: '0.85rem' }}>{employee.residential_address || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card C: Employment Details */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>💼 Employment Details</h3>
                        <div>
                            <div style={styles.row}>
                                <span style={styles.label}>Client Partner</span>
                                <span style={styles.value}>{employee.client_name || 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Date of Joining</span>
                                <span style={styles.value}>{employee.date_of_joining || 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Prior Employment</span>
                                <span style={styles.value}>{employee.prior_employment_flag ? 'Yes' : 'No'}</span>
                            </div>
                            <div style={styles.rowLast}>
                                <span style={styles.label}>Branch / Location</span>
                                <span style={styles.value}>{employee.branch_id ? `Branch #${employee.branch_id}` : 'HQ'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card D: Identity & Bank */}
                    <div style={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ ...styles.cardTitle, borderBottom: 'none', paddingBottom: '0' }}>🏦 Identity & Bank</h3>
                            <button className="btn btn-secondary btn-xs" onClick={() => { clearErrors(); setIsModalOpen(true); }} disabled={!!pendingBankRequest}>
                                {pendingBankRequest ? 'Request Pending' : 'Request Change'}
                            </button>
                        </div>
                        {pendingBankRequest && (
                            <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span>⏳</span> <strong>Under Review:</strong> Bank change pending.
                            </div>
                        )}
                        <div>
                            <div style={styles.row}>
                                <span style={styles.label}>PAN Number</span>
                                <span style={{ ...styles.value, fontFamily: 'monospace' }}>{employee.pan_number || 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Aadhaar Number</span>
                                <span style={{ ...styles.value, fontFamily: 'monospace' }}>{employee.aadhaar_number || 'N/A'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Bank Name</span>
                                <span style={styles.value}>{employee.bank_name || 'Not Added'}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Account Number</span>
                                <span style={{ ...styles.value, fontFamily: 'monospace' }}>{employee.bank_account_number || 'N/A'}</span>
                            </div>
                            <div style={styles.rowLast}>
                                <span style={styles.label}>IFSC Code</span>
                                <span style={{ ...styles.value, fontFamily: 'monospace' }}>{employee.bank_ifsc || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card E: Statutory Profile */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>📜 Statutory Profile</h3>
                        <div>
                            <div style={styles.row}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={styles.label}>Provident Fund (PF)</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UAN: {employee.uan_number || 'N/A'}</span>
                                </div>
                                <span className={`badge badge-${employee.pf_applicable ? 'success' : 'neutral'}`}>
                                    {employee.pf_applicable ? 'Active' : 'Not Applicable'}
                                </span>
                            </div>
                            <div style={styles.row}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={styles.label}>ESIC</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IP: {employee.esic_number || 'N/A'}</span>
                                </div>
                                <span className={`badge badge-${employee.esi_applicable ? 'success' : 'neutral'}`}>
                                    {employee.esi_applicable ? 'Active' : 'Not Applicable'}
                                </span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Professional Tax (PT)</span>
                                <span className={`badge badge-${employee.pt_applicable ? 'success' : 'neutral'}`}>
                                    {employee.pt_applicable ? 'Deducted' : 'Not Applicable'}
                                </span>
                            </div>
                            <div style={styles.rowLast}>
                                <span style={styles.label}>Income Tax (TDS)</span>
                                <span className="badge badge-info">{employee.tds_regime === 'new' ? 'New Regime' : 'Old Regime'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KYC Documents Section */}
                <div style={{ marginTop: '3rem', paddingTop: '2.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ ...styles.cardTitle, borderBottom: 'none', paddingBottom: '0', marginBottom: '0' }}>📂 KYC Documents</h3>
                        {employee.status === 'onboarding' && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--status-warning)', fontWeight: '600', backgroundColor: '#FEF3C7', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                                ⚠ Action Required: Pending Verification
                            </div>
                        )}
                    </div>
                    
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                <tr>
                                    <th style={{ padding: '1rem 1.25rem', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Document Name</th>
                                    <th style={{ padding: '1rem 1.25rem', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Requirement</th>
                                    <th style={{ padding: '1rem 1.25rem', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', textAlign: 'center' }}>Verification Status</th>
                                    <th style={{ padding: '1rem 1.25rem', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requiredDocsList.map((doc, idx) => {
                                    const existing = getDocStatus(doc.type);
                                    
                                    let badgeClass = 'badge-neutral';
                                    let statusText = 'Not Uploaded';
                                    if (existing) {
                                        if (existing.status === 'verified') { badgeClass = 'badge-success'; statusText = 'Verified'; }
                                        else if (existing.status === 'rejected') { badgeClass = 'badge-danger'; statusText = 'Rejected'; }
                                        else { badgeClass = 'badge-warning'; statusText = 'Pending'; }
                                    }

                                    return (
                                        <React.Fragment key={idx}>
                                            <tr style={{ borderBottom: idx === requiredDocsList.length - 1 ? 'none' : '1px solid #f1f5f9', backgroundColor: 'white' }}>
                                                <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>📄 {doc.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>PDF, JPG, PNG (Max 5MB)</div>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle', fontSize: '0.85rem', color: '#64748b' }}>
                                                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: '500' }}>{doc.requirement}</span>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span className={`badge ${badgeClass}`}>{statusText}</span>
                                                </td>
                                                <td style={{ padding: '1rem 1.25rem', textAlign: 'right', verticalAlign: 'middle' }}>
                                                    {existing && existing.status !== 'rejected' ? (
                                                        <a 
                                                            href={route('employee.documents.view', { docId: existing.id })} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="btn btn-secondary btn-xs"
                                                            style={{ padding: '0.4rem 0.8rem', fontWeight: '500' }}
                                                        >
                                                            View
                                                        </a>
                                                    ) : (
                                                        <button 
                                                            className="btn btn-navy btn-xs" 
                                                            onClick={() => openDocModal(doc.type)}
                                                            style={{ padding: '0.4rem 0.8rem', fontWeight: '500' }}
                                                        >
                                                            {existing && existing.status === 'rejected' ? 'Re-upload' : 'Upload'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {existing && existing.status === 'rejected' && existing.rejection_reason && (
                                                <tr style={{ backgroundColor: '#fef2f2' }}>
                                                    <td colSpan="4" style={{ padding: '0.75rem 1.25rem', fontSize: '0.85rem', color: '#991b1b', borderBottom: '1px solid #fca5a5' }}>
                                                        <span style={{ fontWeight: '600' }}>⚠ Rejection Reason:</span> {existing.rejection_reason}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
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

                {/* Document Upload Modal */}
                <Modal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} title={`Upload Document`}>
                    <form onSubmit={handleDocUpload} className="p-4 space-y-4">
                        <div style={{ backgroundColor: '#F3F4F6', padding: '1rem', borderRadius: '4px', fontSize: '0.85rem', color: '#4B5563' }}>
                            Please upload a clear, legible copy of your document. 
                            Supported formats: PDF, JPG, PNG. Maximum size: 5MB.
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select File *</label>
                            <input 
                                type="file"
                                className="form-control w-full"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={e => setDocData('file', e.target.files[0])}
                                required
                            />
                            {docErrors.file && <span className="text-red-500 text-xs mt-1 block">{docErrors.file}</span>}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                            <Button variant="secondary" type="button" onClick={() => setIsDocModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={docProcessing || !docData.file}>
                                {docProcessing ? 'Uploading...' : 'Upload Document'}
                            </Button>
                        </div>
                    </form>
                </Modal>

            </AuthenticatedLayout>
        </RoleGuard>
    );
}
