import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Modal from './ui/Modal/Modal';
import Button from './ui/Button';
import useToast from '../Hooks/useToast';
import axios from 'axios';

export default function PayrollCorrectionModal({ isOpen, onClose, parentRun, items = [] }) {
    const { showToast } = useToast();
    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [correctedPaidDays, setCorrectedPaidDays] = useState(0);
    const [correctedLopDays, setCorrectedLopDays] = useState(0);
    const [reason, setReason] = useState('');
    const [queryId, setQueryId] = useState('');
    const [openQueries, setOpenQueries] = useState([]);
    
    const [previewData, setPreviewData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedItem = items.find(i => String(i.employee_id) === String(selectedEmpId));

    useEffect(() => {
        if (items.length > 0 && !selectedEmpId) {
            setSelectedEmpId(items[0].employee_id);
        }
    }, [items]);

    useEffect(() => {
        if (selectedItem) {
            const rawPaid = parseFloat(selectedItem.paid_days || 0);
            const rawLop = parseFloat(selectedItem.lop_days || 0);
            setCorrectedPaidDays(Math.max(0, rawPaid));
            setCorrectedLopDays(Math.max(0, rawLop));

            // Fetch open queries for selected employee
            axios.get(route('admin.employee-queries.index'), { params: { employee_id: selectedItem.employee_id, status: 'pending' } })
                .then(res => {
                    const data = res.data.queries?.data || res.data.queries || [];
                    setOpenQueries(data);
                })
                .catch(() => setOpenQueries([]));
        }
    }, [selectedEmpId]);

    // Live preview fetch
    useEffect(() => {
        if (!isOpen || !parentRun || !selectedEmpId) return;

        const safePaid = Math.max(0, parseFloat(correctedPaidDays || 0));
        const safeLop = Math.max(0, parseFloat(correctedLopDays || 0));

        const timer = setTimeout(() => {
            setIsLoadingPreview(true);
            axios.post(route('payroll.correction.preview'), {
                parent_run_id: parentRun.id,
                employee_id: selectedEmpId,
                corrected_paid_days: safePaid,
                corrected_lop_days: safeLop,
            })
            .then(res => {
                setPreviewData(res.data);
                // If item had 0 paid days and 0 LOP days originally, auto-initialize from month working days slots
                if (selectedItem && parseFloat(selectedItem.paid_days || 0) === 0 && parseFloat(selectedItem.lop_days || 0) === 0) {
                    if (res.data?.working_days_context?.working_days_slots) {
                        const slots = res.data.working_days_context.working_days_slots;
                        const calDays = res.data.working_days_context.total_calendar_days;
                        setCorrectedPaidDays(slots);
                        setCorrectedLopDays(Math.max(0, calDays - slots));
                    }
                }
            })
            .catch(err => {
                showToast({ type: 'error', title: 'Preview Error', message: err.response?.data?.message || 'Error fetching calculation preview' });
            })
            .finally(() => setIsLoadingPreview(false));
        }, 300);

        return () => clearTimeout(timer);
    }, [isOpen, parentRun, selectedEmpId, correctedPaidDays, correctedLopDays]);

    const handleLopChange = (val) => {
        const numLop = Math.max(0, parseFloat(val) || 0);
        setCorrectedLopDays(numLop);
        const totalCalDays = previewData?.working_days_context?.total_calendar_days || 30;
        setCorrectedPaidDays(Math.max(0, totalCalDays - numLop));
    };

    const handlePaidChange = (val) => {
        const numPaid = Math.max(0, parseFloat(val) || 0);
        setCorrectedPaidDays(numPaid);
        const totalCalDays = previewData?.working_days_context?.total_calendar_days || 30;
        setCorrectedLopDays(Math.max(0, totalCalDays - numPaid));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            showToast({ type: 'error', title: 'Validation Error', message: 'Correction reason is mandatory.' });
            return;
        }

        const safePaid = Math.max(0, parseFloat(correctedPaidDays || 0));
        const safeLop = Math.max(0, parseFloat(correctedLopDays || 0));

        setIsSubmitting(true);
        router.post(route('payroll.correction.store'), {
            parent_run_id: parentRun.id,
            employee_id: selectedEmpId,
            corrected_paid_days: safePaid,
            corrected_lop_days: safeLop,
            reason: reason.trim(),
            employee_query_id: queryId || null,
        }, {
            onSuccess: () => {
                onClose();
            },
            onError: (errs) => {
                showToast({ type: 'error', title: 'Error', message: errs.error || 'Failed to submit correction.' });
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const modalFooter = (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" disabled={isSubmitting || isLoadingPreview} onClick={handleSubmit} type="button">
                {isSubmitting ? 'Saving...' : 'Add Correction to Draft Supplementary Run'}
            </Button>
        </div>
    );

    const context = previewData?.working_days_context;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🔧 Correct Employee Payroll"
            size="lg"
            footer={modalFooter}
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Target Month & Working Days Context Box AT TOP */}
                {context && (
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.85rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 'bold', color: '#1F3864', fontSize: '0.85rem' }}>
                                📅 {context.client_name} — Working Days Breakdown ({context.month_label})
                            </span>
                            <span style={{ backgroundColor: '#1F3864', color: '#FFFFFF', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {context.working_days_slots} Working Days Required
                            </span>
                        </div>

                        <div style={{ color: '#475569', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                            {context.formula_explanation}
                        </div>

                        {context.configured_holidays?.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.4rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.4rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Configured Holidays ({context.month_label}):</span>
                                {context.configured_holidays.map((h, idx) => (
                                    <span key={idx} style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                                        🌴 {h.formatted || h.name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                No client holidays configured in {context.month_label}.
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Select Employee</label>
                    <select 
                        value={selectedEmpId} 
                        onChange={e => setSelectedEmpId(e.target.value)}
                        className="form-select"
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
                    >
                        {items.map(item => (
                            <option key={item.employee_id} value={item.employee_id}>
                                {item.full_name || item.employee_code} ({item.employee_code}) — Net: ₹{parseFloat(item.net_pay).toLocaleString()}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedItem && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.85rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div><span style={{ color: '#64748B', display: 'block' }}>Original Paid Days</span><strong style={{ fontSize: '0.95rem' }}>{selectedItem.paid_days}</strong></div>
                        <div><span style={{ color: '#64748B', display: 'block' }}>Original LOP Days</span><strong style={{ fontSize: '0.95rem', color: '#DC2626' }}>{selectedItem.lop_days}</strong></div>
                        <div><span style={{ color: '#64748B', display: 'block' }}>Original Net Pay</span><strong style={{ fontSize: '0.95rem', color: '#1F3864' }}>₹{parseFloat(selectedItem.net_pay).toLocaleString()}</strong></div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Corrected Paid Days</label>
                        <input 
                            type="number" 
                            step="0.5" 
                            min="0" 
                            max="31" 
                            value={correctedPaidDays} 
                            onChange={e => handlePaidChange(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Corrected LOP Days</label>
                        <input 
                            type="number" 
                            step="0.5" 
                            min="0" 
                            max="31" 
                            value={correctedLopDays} 
                            onChange={e => handleLopChange(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
                        />
                    </div>
                </div>

                {context && (
                    <div style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                        💡 <strong>Helpful Guide:</strong> Target month <strong>{context.month_label}</strong> has <strong>{context.total_calendar_days} Total Calendar Days</strong> ({context.working_days_slots} Working Days Required). Editing LOP or Paid days auto-computes the complementary value.
                    </div>
                )}

                <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Resolves Employee Query (Optional)</label>
                    <select 
                        value={queryId} 
                        onChange={e => setQueryId(e.target.value)}
                        className="form-select"
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
                    >
                        <option value="">-- No query linked --</option>
                        {openQueries.map(q => (
                            <option key={q.id} value={q.id}>
                                #{q.id} - {q.subject} ({q.category})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Correction Reason <span style={{ color: '#DC2626' }}>*</span></label>
                    <textarea 
                        rows="2" 
                        required 
                        placeholder="Reason for attendance/payroll correction..."
                        value={reason} 
                        onChange={e => setReason(e.target.value)}
                        className="form-textarea"
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                    ></textarea>
                </div>

                {/* Live Preview Table */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#F1F5F9', padding: '0.6rem 0.85rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#1F3864', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Live Variance Preview (Side-by-Side)</span>
                        {isLoadingPreview && <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 'normal' }}>Recalculating...</span>}
                    </div>
                    
                    {previewData ? (
                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <tr>
                                    <th style={{ padding: '0.5rem 0.85rem' }}>Component</th>
                                    <th style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>Original</th>
                                    <th style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>Corrected</th>
                                    <th style={{ padding: '0.5rem 0.85rem', textAlign: 'right', fontWeight: 'bold' }}>Delta Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '0.5rem 0.85rem' }}>Gross Earnings</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>₹{parseFloat(previewData.original.gross_total).toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>₹{previewData.corrected.gross_total.toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', fontWeight: 'bold', color: previewData.delta.gross_total >= 0 ? '#15803D' : '#DC2626' }}>
                                        {previewData.delta.gross_total >= 0 ? '+' : ''}₹{previewData.delta.gross_total.toLocaleString()}
                                    </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '0.5rem 0.85rem' }}>Employee PF</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>₹{parseFloat(previewData.original.employee_pf).toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>₹{previewData.corrected.employee_pf.toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', fontWeight: 'bold', color: '#374151' }}>
                                        {previewData.delta.employee_pf >= 0 ? '+' : ''}₹{previewData.delta.employee_pf.toLocaleString()}
                                    </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '0.5rem 0.85rem' }}>Professional Tax (PT)</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>₹{parseFloat(previewData.original.professional_tax).toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right' }}>₹{previewData.corrected.professional_tax.toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', fontWeight: 'bold', color: '#374151' }}>
                                        {previewData.delta.professional_tax >= 0 ? '+' : ''}₹{previewData.delta.professional_tax.toLocaleString()}
                                    </td>
                                </tr>
                                <tr style={{ backgroundColor: '#EFF6FF', fontWeight: 'bold' }}>
                                    <td style={{ padding: '0.5rem 0.85rem', color: '#1E3A8A' }}>Net Disbursement Pay</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#1E3A8A' }}>₹{parseFloat(previewData.original.net_pay).toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: '#1E3A8A' }}>₹{previewData.corrected.net_pay.toLocaleString()}</td>
                                    <td style={{ padding: '0.5rem 0.85rem', textAlign: 'right', color: previewData.delta.net_pay >= 0 ? '#15803D' : '#DC2626' }}>
                                        {previewData.delta.net_pay >= 0 ? '+' : ''}₹{previewData.delta.net_pay.toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>Loading preview calculation...</div>
                    )}
                </div>
            </form>
        </Modal>
    );
}
