import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import axios from 'axios';

export default function SalaryRevision({ employee, revisions }) {
    const { auth } = usePage().props;

    const { data, setData, post, processing, errors } = useForm({
        new_basic_pay: employee.basic_pay || 0,
        new_hra: employee.hra || 0,
        new_conveyance: employee.conveyance || 0,
        new_da: employee.da || 0,
        new_medical_allowance: employee.medical_allowance || 0,
        new_special_allowance: employee.special_allowance || 0,
        new_other_additions: employee.other_additions || 0,
        effective_date: new Date().toISOString().split('T')[0],
        reason_for_revision: 'appraisal',
    });

    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    // Initial preview and debounced subsequent previews
    useEffect(() => {
        const timer = setTimeout(() => {
            calculatePreview();
        }, 500);
        return () => clearTimeout(timer);
    }, [
        data.new_basic_pay, data.new_hra, data.new_conveyance, 
        data.new_da, data.new_medical_allowance, data.new_special_allowance, 
        data.new_other_additions
    ]);

    const calculatePreview = async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        try {
            // We reuse the existing endpoint, just passing the new components 
            // along with existing employee toggles
            const res = await axios.post('/employees/calculate-preview', {
                client_id: employee.client_id,
                basic_pay: data.new_basic_pay,
                hra: data.new_hra,
                conveyance: data.new_conveyance,
                da: data.new_da,
                medical_allowance: data.new_medical_allowance,
                special_allowance: data.new_special_allowance,
                other_additions: data.new_other_additions,
                
                // Keep existing statutory toggles
                pf_applicable: employee.pf_applicable,
                esi_applicable: employee.esi_applicable,
                pt_applicable: employee.pt_applicable,
                lwf_applicable: employee.lwf_applicable,
                pt_deduction_override: employee.pt_deduction_override,
            });
            setPreview(res.data);
        } catch (error) {
            console.error(error);
            setPreviewError("Failed to calculate preview");
        } finally {
            setPreviewLoading(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        post(`/employees/${employee.id}/salary-revision`);
    };

    const handleAction = (revisionId, action, reason = null) => {
        router.post(`/employees/${employee.id}/salary-revision/${revisionId}/approve`, {
            action,
            rejection_reason: reason
        });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
    };

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title={`Salary Revision - ${employee.full_name}`} />
                <div className="main-content">
                    
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Link href={`/employees/${employee.id}`} style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                ← Back to {employee.full_name}'s Profile
                            </Link>
                            <h2 style={{ marginTop: '0.5rem' }}>Process Salary Revision</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Perform monthly CTC increments or corrections for {employee.full_name}.
                            </p>
                        </div>
                    </div>

                    {/* Pending / History Revisions */}
                    {revisions && revisions.length > 0 && (
                        <div className="card" style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Revision History</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Reason</th>
                                            <th>Old CTC</th>
                                            <th>New CTC</th>
                                            <th>Status</th>
                                            <th>Actions/Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {revisions.map(rev => (
                                            <tr key={rev.id}>
                                                <td>{new Date(rev.created_at).toLocaleDateString()}</td>
                                                <td>{rev.reason_for_revision}</td>
                                                <td>{formatCurrency(rev.old_ctc)}</td>
                                                <td>{formatCurrency(rev.new_ctc)}</td>
                                                <td>
                                                    <span className={`badge badge-${rev.status === 'approved' ? 'success' : (rev.status === 'rejected' ? 'danger' : 'warning')}`}>
                                                        {rev.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    {rev.status === 'pending_approval' && auth.user.role === 'admin' ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button 
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => handleAction(rev.id, 'approve')}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => {
                                                                    const reason = prompt("Enter rejection reason:");
                                                                    if (reason) handleAction(rev.id, 'reject', reason);
                                                                }}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            {rev.status === 'rejected' ? `Reason: ${rev.rejection_reason}` : (rev.approved_at ? `Resolved: ${new Date(rev.approved_at).toLocaleDateString()}` : '-')}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="grid-layout">
                        <div className="card">
                            <form onSubmit={submit}>
                                
                                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                                    
                                    {/* Current Salary */}
                                    <div style={{ flex: '1', minWidth: '300px', opacity: '0.85', borderRight: '1px solid var(--border-color)', paddingRight: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary-navy)' }}>
                                            Current Salary structure
                                        </h3>
                                        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>EARNINGS</h4>
                                        <div className="form-group"><label>1. Basic Pay</label><input type="text" className="form-control" value={employee.basic_pay} disabled/></div>
                                        <div className="form-group"><label>2. HRA</label><input type="text" className="form-control" value={employee.hra} disabled/></div>
                                        <div className="form-group"><label>3. Conveyance</label><input type="text" className="form-control" value={employee.conveyance} disabled/></div>
                                        <div className="form-group"><label>4. DA</label><input type="text" className="form-control" value={employee.da} disabled/></div>
                                        <div className="form-group"><label>5. Medical Allowance</label><input type="text" className="form-control" value={employee.medical_allowance} disabled/></div>
                                        <div className="form-group"><label>6. Special Allowance</label><input type="text" className="form-control" value={employee.special_allowance} disabled/></div>
                                        <div className="form-group"><label>7. Other Additions</label><input type="text" className="form-control" value={employee.other_additions} disabled/></div>
                                        
                                        <div style={{ backgroundColor: 'var(--primary-navy)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', color: 'white', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                                            Net Pay: <span style={{ color: 'var(--accent-gold)' }}>{formatCurrency(employee.net_take_home_monthly)}</span>
                                        </div>
                                        <div style={{ backgroundColor: '#F1F5F9', border: '2px dashed var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', color: 'var(--primary-navy)' }}>
                                            CTC: <span style={{ color: 'var(--text-main)' }}>{formatCurrency(employee.ctc_monthly)}</span>
                                        </div>
                                    </div>

                                    {/* Proposed Salary */}
                                    <div style={{ flex: '1', minWidth: '300px' }}>
                                        <h3 style={{ fontSize: '1.1rem', borderBottom: '2px solid var(--primary-navy)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary-navy)' }}>
                                            Proposed New Structure
                                        </h3>
                                        <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-navy)', marginBottom: '1rem' }}>EARNINGS</h4>
                                        <div className="form-group">
                                            <label>1. Basic Pay</label>
                                            <input type="number" step="0.01" className="form-control" value={data.new_basic_pay} onChange={e => setData('new_basic_pay', e.target.value)} required/>
                                            {errors.new_basic_pay && <div className="text-danger">{errors.new_basic_pay}</div>}
                                        </div>
                                        <div className="form-group">
                                            <label>2. HRA</label>
                                            <input type="number" step="0.01" className="form-control" value={data.new_hra} onChange={e => setData('new_hra', e.target.value)} required/>
                                        </div>
                                        <div className="form-group">
                                            <label>3. Conveyance</label>
                                            <input type="number" step="0.01" className="form-control" value={data.new_conveyance} onChange={e => setData('new_conveyance', e.target.value)} required/>
                                        </div>
                                        <div className="form-group">
                                            <label>4. DA</label>
                                            <input type="number" step="0.01" className="form-control" value={data.new_da} onChange={e => setData('new_da', e.target.value)} required/>
                                        </div>
                                        <div className="form-group">
                                            <label>5. Medical Allowance</label>
                                            <input type="number" step="0.01" className="form-control" value={data.new_medical_allowance} onChange={e => setData('new_medical_allowance', e.target.value)} required/>
                                        </div>
                                        <div className="form-group">
                                            <label>6. Special Allowance</label>
                                            <input type="number" step="0.01" className="form-control" value={data.new_special_allowance} onChange={e => setData('new_special_allowance', e.target.value)} required/>
                                        </div>
                                        <div className="form-group">
                                            <label>7. Other Additions</label>
                                            <input type="number" step="0.01" className="form-control" value={data.new_other_additions} onChange={e => setData('new_other_additions', e.target.value)} required/>
                                        </div>

                                        <div style={{ backgroundColor: 'var(--primary-navy)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', color: 'white', marginBottom: '1.5rem', marginTop: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                            Net Pay: <span style={{ color: 'var(--accent-gold)' }}>
                                                {previewLoading ? '...' : (preview ? formatCurrency(preview.net_take_home_monthly) : '-')}
                                            </span>
                                        </div>
                                        <div style={{ backgroundColor: '#F1F5F9', border: '2px dashed var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', color: 'var(--primary-navy)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                            CTC: <span style={{ color: 'var(--text-main)' }}>
                                                {previewLoading ? '...' : (preview ? formatCurrency(preview.ctc_monthly) : '-')}
                                            </span>
                                        </div>
                                        
                                    </div>
                                </div>

                                {/* Comparison Alert */}
                                {preview && (
                                    <div style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid #C8E6C9', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', marginBottom: '2rem' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--status-success)' }}>
                                            📈 Revision Summary (CTC): {formatCurrency(employee.ctc_monthly)} → {formatCurrency(preview.ctc_monthly)}
                                        </span>
                                    </div>
                                )}

                                {/* Parameters */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Effective From Date</label>
                                        <input type="date" className="form-control" value={data.effective_date} onChange={e => setData('effective_date', e.target.value)} required max={new Date().toISOString().split('T')[0]} />
                                        {errors.effective_date && <div className="text-danger">{errors.effective_date}</div>}
                                        <small className="text-muted">Must be today or in the past.</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Reason for Revision</label>
                                        <select className="form-control" value={data.reason_for_revision} onChange={e => setData('reason_for_revision', e.target.value)}>
                                            <option value="appraisal">Annual Performance Appraisal</option>
                                            <option value="promotion">Role Promotion Adjustment</option>
                                            <option value="correction">Statutory Structure Correction</option>
                                            <option value="other">Other / Cost of Living Adjustment</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                    <Link href={`/employees/${employee.id}`} className="btn btn-secondary">Cancel</Link>
                                    <button type="submit" className="btn btn-primary" disabled={processing}>Submit for Approval</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
