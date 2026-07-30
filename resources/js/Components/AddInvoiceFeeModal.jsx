import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal/Modal';
import Button from './ui/Button';
import useToast from '../Hooks/useToast';
import axios from 'axios';
import { Plus, Trash2, Tag, Info, AlertTriangle } from 'lucide-react';

export default function AddInvoiceFeeModal({ isOpen, onClose, invoice, onFeeUpdated }) {
    const { showToast } = useToast();
    const [feeType, setFeeType] = useState('sourcing_fee');
    const [feeName, setFeeName] = useState('Sourcing Fee');
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (feeType === 'sourcing_fee') {
            setFeeName('Sourcing Fee');
        } else if (feeType === 'absorption_fee') {
            setFeeName('Absorption Fee');
        } else if (feeType === 'other') {
            setFeeName('Custom Additional Fee');
        }
    }, [feeType]);

    if (!invoice) return null;

    const isDraft = invoice.status === 'draft';
    const feesList = invoice.additional_fees || invoice.additionalFees || [];

    const handleAddFee = (e) => {
        e.preventDefault();
        if (!isDraft) {
            showToast({ type: 'error', title: 'Action Blocked', message: 'Fees can only be added to DRAFT invoices.' });
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            showToast({ type: 'error', title: 'Validation Error', message: 'Please enter a valid positive amount.' });
            return;
        }

        setIsSubmitting(true);
        axios.post(route('invoices.fees.store', invoice.id), {
            fee_type: feeType,
            fee_name: feeName.trim(),
            amount: numAmount,
            remarks: remarks.trim(),
        })
        .then(res => {
            showToast({ type: 'success', title: 'Fee Added', message: 'Additional fee added and invoice grand total recalculated.' });
            setAmount('');
            setRemarks('');
            if (onFeeUpdated) onFeeUpdated(res.data.invoice);
        })
        .catch(err => {
            showToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to add fee.' });
        })
        .finally(() => setIsSubmitting(false));
    };

    const handleDeleteFee = (feeId) => {
        if (!isDraft) {
            showToast({ type: 'error', title: 'Action Blocked', message: 'Fees can only be removed from DRAFT invoices.' });
            return;
        }

        setDeletingId(feeId);
        axios.delete(route('invoices.fees.destroy', { id: invoice.id, feeId: feeId }))
        .then(res => {
            showToast({ type: 'success', title: 'Fee Removed', message: 'Fee removed and invoice grand total recalculated.' });
            if (onFeeUpdated) onFeeUpdated(res.data.invoice);
        })
        .catch(err => {
            showToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to delete fee.' });
        })
        .finally(() => setDeletingId(null));
    };

    const inputStyle = {
        width: '100%',
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
        borderRadius: '6px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        outline: 'none',
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1F3864' }}>
                    <Tag size={18} /> Manage Additional Fees — Invoice #{invoice.invoice_number}
                </span>
            }
            size="lg"
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <Button variant="secondary" onClick={onClose} type="button">Close</Button>
                </div>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {!isDraft && (
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} />
                        <span><strong>Invoice Finalized ({invoice.status.toUpperCase()}):</strong> Additional fees cannot be added or deleted on non-draft invoices.</span>
                    </div>
                )}

                {/* Invoice Context Header */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Client Partner</span>
                        <strong style={{ color: '#1F3864' }}>{invoice.client?.company_name || 'Client'}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Base Pass-Through CTC</span>
                        <strong>₹{parseFloat(invoice.gross_salary_passthrough).toLocaleString()}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Current Grand Total</span>
                        <strong style={{ color: '#059669', fontSize: '1rem' }}>₹{parseFloat(invoice.grand_total).toLocaleString()}</strong>
                    </div>
                </div>

                {/* Add New Fee Form */}
                {isDraft && (
                    <form onSubmit={handleAddFee} style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '1rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#1F3864', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Plus size={16} /> Add Sourcing / Absorption / Custom Fee
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Fee Category</label>
                                <select 
                                    value={feeType} 
                                    onChange={e => setFeeType(e.target.value)} 
                                    style={inputStyle}
                                >
                                    <option value="sourcing_fee">Sourcing Fee</option>
                                    <option value="absorption_fee">Absorption Fee</option>
                                    <option value="other">Custom Fee</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Fee Display Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={feeName} 
                                    onChange={e => setFeeName(e.target.value)} 
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Amount (₹)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0.01" 
                                    required 
                                    placeholder="0.00"
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Remarks / Candidate Details (Optional)</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Sourcing fee for Senior Engineer candidate placement..."
                                value={remarks} 
                                onChange={e => setRemarks(e.target.value)} 
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Info size={14} /> Fee amount will be added to Taxable Service Fees and taxed at 18% GST ({invoice.gst_type === 'cgst_sgst' ? 'CGST 9% + SGST 9%' : 'IGST 18%'}).
                            </span>
                            <Button variant="primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding...' : 'Add Fee & Recalculate'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Additional Fees Table */}
                <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1F3864', marginBottom: '0.5rem' }}>Attached Additional Fees ({feesList.length})</h4>
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <tr>
                                    <th style={{ padding: '0.6rem 0.85rem' }}>Fee Name</th>
                                    <th style={{ padding: '0.6rem 0.85rem' }}>Category</th>
                                    <th style={{ padding: '0.6rem 0.85rem' }}>Remarks</th>
                                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'right' }}>Amount (₹)</th>
                                    {isDraft && <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center', width: '4rem' }}>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {feesList.length > 0 ? (
                                    feesList.map(fee => (
                                        <tr key={fee.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 600, color: '#1E293B' }}>{fee.fee_name}</td>
                                            <td style={{ padding: '0.6rem 0.85rem' }}>
                                                <span style={{ fontSize: '0.72rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                                                    {fee.fee_type === 'sourcing_fee' ? 'Sourcing Fee' : (fee.fee_type === 'absorption_fee' ? 'Absorption Fee' : 'Custom Fee')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.6rem 0.85rem', color: '#64748B', fontSize: '0.78rem' }}>{fee.remarks || '—'}</td>
                                            <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontWeight: 'bold', color: '#2563EB' }}>
                                                ₹{parseFloat(fee.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            {isDraft && (
                                                <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>
                                                    <button 
                                                        type="button" 
                                                        disabled={deletingId === fee.id}
                                                        onClick={() => handleDeleteFee(fee.id)}
                                                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '0.2rem' }}
                                                        title="Delete Fee"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isDraft ? 5 : 4} style={{ padding: '1.25rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
                                            No additional fees attached to this invoice yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </Modal>
    );
}
