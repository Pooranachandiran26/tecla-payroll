import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import Modal from './ui/Modal/Modal';
import Button from './ui/Button';
import useToast from '../Hooks/useToast';
import axios from 'axios';

export default function BatchPayrollCorrectionModal({ isOpen, onClose, parentRun, items = [] }) {
    const { showToast } = useToast();
    const fileInputRef = useRef(null);
    const [selectedEmpIds, setSelectedEmpIds] = useState([]);
    const [overrides, setOverrides] = useState({});
    const [defaultReason, setDefaultReason] = useState('Client attendance/payroll correction post-lock');
    const [patternContext, setPatternContext] = useState(null);
    const [workingDaysContext, setWorkingDaysContext] = useState(null);
    const [previewItems, setPreviewItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && items.length > 0) {
            const allIds = items.map(i => i.employee_id);
            setSelectedEmpIds(allIds);
        }
    }, [isOpen, items]);

    // Fetch batch preview & pattern analysis
    useEffect(() => {
        if (!isOpen || !parentRun) return;

        const timer = setTimeout(() => {
            setIsLoading(true);
            axios.post(route('payroll.correction.batch-preview'), {
                parent_run_id: parentRun.id,
                employee_ids: selectedEmpIds,
                days_overrides: overrides,
            })
            .then(res => {
                setPatternContext(res.data.pattern_context);
                setPreviewItems(res.data.items || []);
                if (res.data.items?.[0]?.working_days_context) {
                    setWorkingDaysContext(res.data.items[0].working_days_context);
                }
            })
            .catch(() => showToast({ type: 'error', title: 'Error', message: 'Failed to fetch batch correction preview' }))
            .finally(() => setIsLoading(false));
        }, 300);

        return () => clearTimeout(timer);
    }, [isOpen, parentRun, selectedEmpIds, overrides]);

    if (!isOpen) return null;

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedEmpIds(items.map(i => i.employee_id));
        } else {
            setSelectedEmpIds([]);
        }
    };

    const handleToggleEmp = (id) => {
        if (selectedEmpIds.includes(id)) {
            setSelectedEmpIds(selectedEmpIds.filter(i => i !== id));
        } else {
            setSelectedEmpIds([...selectedEmpIds, id]);
        }
    };

    const handleDaysChange = (empId, field, val) => {
        const num = Math.max(0, parseFloat(val) || 0);
        const totalCalDays = workingDaysContext?.total_calendar_days || 31;

        setOverrides(prev => {
            const currentPaid = prev[empId]?.paid_days ?? 30;
            const currentLop = prev[empId]?.lop_days ?? 0;
            
            const newPaid = field === 'paid_days' ? num : Math.max(0, totalCalDays - num);
            const newLop = field === 'lop_days' ? num : Math.max(0, totalCalDays - num);

            return {
                ...prev,
                [empId]: {
                    paid_days: field === 'paid_days' ? newPaid : newPaid,
                    lop_days: field === 'lop_days' ? newLop : newLop,
                    reason: prev[empId]?.reason ?? '',
                }
            };
        });
    };

    const handleReasonChange = (empId, val) => {
        setOverrides(prev => ({
            ...prev,
            [empId]: {
                paid_days: prev[empId]?.paid_days ?? 30,
                lop_days: prev[empId]?.lop_days ?? 0,
                reason: val,
            }
        }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('parent_run_id', parentRun.id);
        formData.append('file', file);

        setIsUploading(true);
        axios.post(route('payroll.correction.batch-import'), formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .then(res => {
            const imported = res.data.items || [];
            const newOverrides = { ...overrides };
            const newSelected = [...selectedEmpIds];

            imported.forEach(row => {
                const empId = row.employee?.id || row.original?.employee_id;
                if (empId) {
                    if (!newSelected.includes(empId)) newSelected.push(empId);
                    newOverrides[empId] = {
                        paid_days: Math.max(0, row.corrected.paid_days),
                        lop_days: Math.max(0, row.corrected.lop_days),
                        reason: row.reason || '',
                    };
                }
            });

            setSelectedEmpIds(newSelected);
            setOverrides(newOverrides);
            showToast({ type: 'success', title: 'File Imported', message: `Imported ${imported.length} employee correction rows.` });
        })
        .catch(err => {
            showToast({ type: 'error', title: 'Import Failed', message: err.response?.data?.message || 'Failed to parse correction file' });
        })
        .finally(() => {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedEmpIds.length === 0) {
            showToast({ type: 'error', title: 'Validation Error', message: 'Select at least one employee to correct.' });
            return;
        }

        const itemsPayload = selectedEmpIds.map(empId => {
            const itemPreview = previewItems.find(p => p.employee.id === empId);
            const override = overrides[empId];
            return {
                employee_id: empId,
                corrected_paid_days: override ? override.paid_days : (itemPreview ? Math.max(0, itemPreview.corrected.paid_days) : 30),
                corrected_lop_days: override ? override.lop_days : (itemPreview ? Math.max(0, itemPreview.corrected.lop_days) : 0),
                reason: override?.reason || defaultReason,
            };
        });

        setIsSubmitting(true);
        router.post(route('payroll.correction.batch-store'), {
            parent_run_id: parentRun.id,
            reason: defaultReason,
            items: itemsPayload,
        }, {
            onSuccess: () => {
                showToast({ type: 'success', title: 'Success', message: 'Batch corrections added to draft supplementary run.' });
                onClose();
            },
            onError: (errs) => {
                showToast({ type: 'error', title: 'Error', message: errs.error || 'Failed to submit batch corrections.' });
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const modalFooter = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Selected Employees: <strong>{selectedEmpIds.length} of {items.length}</strong>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                <Button variant="primary" disabled={isSubmitting || isLoading || selectedEmpIds.length === 0} onClick={handleSubmit} type="button">
                    {isSubmitting ? 'Submitting Batch...' : `Apply Batch Corrections (${selectedEmpIds.length} Items)`}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="⚡ Batch Payroll Correction"
            size="xl"
            footer={modalFooter}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <a 
                        href={route('payroll.correction.template', { parent_run_id: parentRun.id })} 
                        style={{ fontSize: '0.8rem', color: '#2563EB', textDecoration: 'underline', fontWeight: 500 }}
                    >
                        📥 Download Correction Template
                    </a>
                    <label style={{ cursor: 'pointer', backgroundColor: '#059669', color: '#ffffff', fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: '4px', fontWeight: 500 }}>
                        {isUploading ? '⌛ Importing...' : '📁 Import Correction File (.xlsx/.csv)'}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".xlsx,.xls,.csv" 
                            style={{ display: 'none' }}
                            onChange={handleFileUpload} 
                            disabled={isUploading}
                        />
                    </label>
                </div>

                {/* Target Month & Working Days Context Box */}
                {workingDaysContext && (
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.85rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 'bold', color: '#1F3864', fontSize: '0.85rem' }}>
                                📅 {workingDaysContext.client_name} — Working Days Breakdown ({workingDaysContext.month_label})
                            </span>
                            <span style={{ backgroundColor: '#1F3864', color: '#FFFFFF', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {workingDaysContext.working_days_slots} Working Days Required
                            </span>
                        </div>

                        <div style={{ color: '#475569', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                            {workingDaysContext.formula_explanation}
                        </div>

                        {workingDaysContext.configured_holidays?.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.4rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.4rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Configured Holidays ({workingDaysContext.month_label}):</span>
                                {workingDaysContext.configured_holidays.map((h, idx) => (
                                    <span key={idx} style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                                        🌴 {h.formatted || h.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {patternContext && patternContext.pattern_type !== 'none' && (
                    <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1rem' }}>💡</span>
                        <div>
                            <strong>Systemic Pattern Context:</strong> {patternContext.summary}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Global Default Correction Reason <span style={{ color: '#DC2626' }}>*</span></label>
                        <input 
                            type="text" 
                            required 
                            value={defaultReason} 
                            onChange={e => setDefaultReason(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
                        />
                    </div>

                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', maxHeight: '380px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#F1F5F9', position: 'sticky', top: 0, borderBottom: '1px solid #E2E8F0', zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '0.5rem', width: '2rem' }}>
                                        <input type="checkbox" checked={selectedEmpIds.length === items.length} onChange={handleSelectAll} />
                                    </th>
                                    <th style={{ padding: '0.5rem' }}>Employee</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Original Net</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center', width: '6.5rem' }}>Corrected Paid</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center', width: '6.5rem' }}>Corrected LOP</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>Net Delta Variance</th>
                                    <th style={{ padding: '0.5rem' }}>Item Reason (Optional)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(emp => {
                                    const isSelected = selectedEmpIds.includes(emp.employee_id);
                                    const preview = previewItems.find(p => p.employee.id === emp.employee_id);
                                    const override = overrides[emp.employee_id];

                                    return (
                                        <tr key={emp.employee_id} style={{ backgroundColor: isSelected ? '#F0F9FF' : '#FAFAFA', opacity: isSelected ? 1 : 0.6, borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => handleToggleEmp(emp.employee_id)} 
                                                />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{emp.full_name || emp.employee_code}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{emp.employee_code}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500 }}>₹{parseFloat(emp.net_pay).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input 
                                                    type="number" 
                                                    step="0.5" 
                                                    min="0" 
                                                    max="31"
                                                    value={override ? override.paid_days : (preview ? Math.max(0, preview.corrected.paid_days) : Math.max(0, emp.paid_days))}
                                                    onChange={e => handleDaysChange(emp.employee_id, 'paid_days', e.target.value)}
                                                    className="form-input"
                                                    style={{ width: '100%', padding: '0.2rem', textAlign: 'center', fontSize: '0.8rem' }}
                                                    disabled={!isSelected}
                                                />
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input 
                                                    type="number" 
                                                    step="0.5" 
                                                    min="0" 
                                                    max="31"
                                                    value={override ? override.lop_days : (preview ? Math.max(0, preview.corrected.lop_days) : Math.max(0, emp.lop_days))}
                                                    onChange={e => handleDaysChange(emp.employee_id, 'lop_days', e.target.value)}
                                                    className="form-input"
                                                    style={{ width: '100%', padding: '0.2rem', textAlign: 'center', fontSize: '0.8rem' }}
                                                    disabled={!isSelected}
                                                />
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                {preview ? (
                                                    <span style={{ color: preview.delta.net_pay >= 0 ? '#15803D' : '#DC2626' }}>
                                                        {preview.delta.net_pay >= 0 ? '+' : ''}₹{preview.delta.net_pay.toLocaleString()}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="Override reason..."
                                                    value={override?.reason || ''}
                                                    onChange={e => handleReasonChange(emp.employee_id, e.target.value)}
                                                    className="form-input"
                                                    style={{ width: '100%', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                                    disabled={!isSelected}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
