import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import useToast from '../../Hooks/useToast';
import './PayrollApproval.css';

import PayrollCorrectionModal from '../../Components/PayrollCorrectionModal';
import BatchPayrollCorrectionModal from '../../Components/BatchPayrollCorrectionModal';

export default function PayrollApproval({ clients, selectedClientId, selectedMonth, run, items, preflight, cycleInfo, newHires = [], pendingSupplementaryRuns = [] }) {
    const { showToast } = useToast();
    const [clientId, setClientId] = useState(selectedClientId);
    const [month, setMonth] = useState(selectedMonth);
    const existingDraftRun = pendingSupplementaryRuns && pendingSupplementaryRuns.find(r => r.status === 'draft');

    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showDisbursementModal, setShowDisbursementModal] = useState(false);
    const [showSingleCorrectionModal, setShowSingleCorrectionModal] = useState(false);
    const [showBatchCorrectionModal, setShowBatchCorrectionModal] = useState(false);

    const [showSupplementaryModal, setShowSupplementaryModal] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const val = params.get('open_supplementary_modal');
            const hasDraft = pendingSupplementaryRuns && pendingSupplementaryRuns.some(r => r.status === 'draft');
            if (hasDraft) return false;
            return val === 'true' || val === '1';
        }
        return false;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const shouldScroll = params.get('scroll_to_pending') === 'true' || params.get('scroll_to_pending') === '1' || (existingDraftRun && (params.get('open_supplementary_modal') === 'true' || params.get('open_supplementary_modal') === '1'));
            if (shouldScroll) {
                setTimeout(() => {
                    const el = document.getElementById('pending-supplementary-card');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }
    }, []);

    const getMonthOptions = () => {
        const options = [];
        const startDate = new Date(2026, 4, 1); // May 2026 (index 4)
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2); // Current date + 2 months

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const year = currentDate.getFullYear();
            const monthNum = String(currentDate.getMonth() + 1).padStart(2, '0');
            const label = currentDate.toLocaleString('default', { month: 'long' }) + ' ' + year;
            options.push({ value: `${year}-${monthNum}-01`, label });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        return options.reverse();
    };

    const { auth } = usePage().props;
    const role = auth?.user?.role || 'manager';

    const handleClientChange = (newClientId) => {
        setClientId(newClientId);
        router.get(route('payroll.approval'), { client_id: newClientId, payroll_month: month }, { preserveState: false });
    };

    const handleMonthChange = (newMonth) => {
        setMonth(newMonth);
        router.get(route('payroll.approval'), { client_id: clientId, payroll_month: newMonth }, { preserveState: false });
    };

    // Filter items into active and excluded
    const activeItems = items ? items.filter(i => !i.is_excluded) : [];
    const excludedItems = items ? items.filter(i => i.is_excluded) : [];

    // Trigger Approve
    const handleApproveAndLock = () => {
        if (!run) return;
        
        router.post(route('payroll.run.approve', run.id), {}, {
            onSuccess: () => {
                // Once approved, run lock
                router.post(route('payroll.run.lock', run.id), {}, {
                    onSuccess: () => {
                        router.visit(route('invoices.index'));
                    },
                    onError: (errors) => {
                        showToast({
                            type: 'error',
                            title: 'Lock Error',
                            message: errors.error || 'Unknown error locking batch'
                        });
                    }
                });
            },
            onError: (errors) => {
                showToast({
                    type: 'error',
                    title: 'Approval Error',
                    message: errors.error || 'Unknown error approving batch'
                });
            }
        });
    };

    // Trigger Supplementary Run
    const handleCreateSupplementary = () => {
        if (!run) return;
        router.post(route('payroll.run.supplementary', run.id), {}, {
            onSuccess: () => {
                setShowSupplementaryModal(false);
                router.reload();
            },
            onError: (errors) => {
                showToast({
                    type: 'error',
                    title: 'Supplementary Run Error',
                    message: errors.error || 'Unknown error creating supplementary run'
                });
            }
        });
    };

    // Approve & Lock a specific supplementary run (status-aware: skips approve if already approved)
    const handleApproveSupplementary = (supplementaryRunId, currentStatus) => {
        const doLock = () => {
            router.post(route('payroll.run.lock', supplementaryRunId), {}, {
                onSuccess: () => {
                    router.reload();
                },
                onError: (errors) => {
                    showToast({ type: 'error', title: 'Lock Error',
                        message: errors.error || 'Error locking supplementary run. It may now be in Approved state — retry to lock.' });
                    router.reload();
                }
            });
        };

        if (currentStatus === 'approved') {
            // Already approved (e.g. previous attempt's lock failed) — skip approve, go straight to lock
            doLock();
        } else {
            router.post(route('payroll.run.approve', supplementaryRunId), {}, {
                onSuccess: () => doLock(),
                onError: (errors) => {
                    showToast({ type: 'error', title: 'Approval Error',
                        message: errors.error || 'Error approving supplementary run' });
                }
            });
        }
    };

    return (
        <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="payroll">
            <AuthenticatedLayout>
                <Head title="Payroll Approval" />

                <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Approve &amp; Lock Payroll Batch</h2>
                        <p className="text-gray-500 text-[0.9rem]">
                            Review consolidated totals and authorize bank file disbursements.
                        </p>
                    </div>
                    {run && (excludedItems.length > 0 || newHires.length > 0) && (
                        <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FEF3C7", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "#92400E", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                            <strong>Partial Batch: {activeItems.length} of {items.length} employees processed.</strong>
                            <span>{excludedItems.length} excluded + {newHires.length} new hires — click 'Create Supplementary Run' to process them.</span>
                            <button 
                                className="btn btn-secondary btn-xs" 
                                style={{ marginTop: "0.25rem" }} 
                                onClick={() => setShowSupplementaryModal(true)}
                                disabled={role !== 'admin'}
                                title={role !== 'admin' ? 'Only Administrators can trigger a supplementary run' : ''}
                            >
                                Create Supplementary Run for {excludedItems.length} Excluded + {newHires.length} New Hires
                            </button>
                        </div>
                    )}
                </div>

                <div className="card" style={{ padding: "0.85rem 1rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <label style={{ fontWeight: 600, marginBottom: 0, color: "var(--primary-navy)" }}>Select Client Batch:</label>
                            <select className="form-control" style={{ width: "280px" }} value={clientId} onChange={e => handleClientChange(e.target.value)}>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.company_name}</option>
                                ))}
                            </select>
                            <select className="form-control" style={{ width: "150px" }} value={month} onChange={e => handleMonthChange(e.target.value)}>
                                {getMonthOptions().map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Pre-Flight Badge Inline */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                            <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>✈️ Pre-Flight Gates:</span>
                            <span className={`badge ${preflight && preflight.some(f => f.type === 'red') ? 'badge-danger' : 'badge-success'}`}>
                                {preflight && preflight.some(f => f.type === 'red') ? 'Blockers Found' : 'All Clear'}
                            </span>
                        </div>
                    </div>

                    {cycleInfo && (
                        <div className="cycle-info-row" style={{ display: "flex", gap: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.5rem", marginTop: "0.6rem", fontSize: "0.82rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                            <span>📅 Cycle Ends: <strong>{cycleInfo.cycle_end_date}</strong></span>
                            {cycleInfo.target_lock_date && (
                                <span>🔒 Target Lock Date: <strong>{cycleInfo.target_lock_date}</strong></span>
                            )}
                            {cycleInfo.target_salary_credit_date && (
                                <span>💰 Target Salary Credit: <strong>{cycleInfo.target_salary_credit_date}</strong></span>
                            )}
                        </div>
                    )}

                    {/* Pre-Flight Warning Messages compact list */}
                    {preflight && preflight.length > 0 && (
                        <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                            {preflight.map((f, i) => (
                                <div key={i} className={`preflight-item status-${f.type}`} style={{ padding: "0.3rem 0.6rem", margin: "0.2rem 0", fontSize: "0.8rem" }}>
                                    <div className="preflight-icon" style={{ fontSize: "0.85rem" }}>
                                        {f.type === 'red' ? '❌' : f.type === 'info' ? 'ℹ️' : '⚠️'}
                                    </div>
                                    <div className="preflight-content">
                                        <strong>{f.type === 'red' ? 'BLOCKER' : f.type === 'info' ? 'INFO' : 'WARNING'}:</strong> {f.msg}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {run ? (() => {
                    const clientData = run.client || clients.find(c => c.id === clientId) || {};
                    const grossEarnings = parseFloat(run.total_gross_earnings || 0);
                    const employerCost = parseFloat(run.total_employer_statutory_cost || 0);

                    let contractModelText = 'Fixed Per Candidate';
                    let agencyMargin = 0;
                    let invoicedAmount = 0;

                    if (clientData.billing_model === 'percentage_markup') {
                        const rate = parseFloat(clientData.markup_value || 8.5);
                        const isCtc = clientData.markup_applied_on === 'ctc';
                        contractModelText = `${rate}% Markup on ${isCtc ? 'Gross CTC' : 'Gross Salary'}`;
                        const baseForMarkup = isCtc ? (grossEarnings + employerCost) : grossEarnings;
                        agencyMargin = Math.round(baseForMarkup * (rate / 100) * 100) / 100;
                        invoicedAmount = Math.round((grossEarnings + employerCost + agencyMargin) * 100) / 100;
                    } else if (clientData.billing_model === 'fixed_per_month' || clientData.billing_model === 'lumpsum' || clientData.billing_model === 'fixed_monthly_retainer') {
                        const fixedFee = parseFloat(clientData.fixed_fee_amount || 0);
                        contractModelText = `Fixed Retainer (₹${fixedFee.toLocaleString()})`;
                        agencyMargin = fixedFee;
                        invoicedAmount = Math.round((grossEarnings + employerCost + agencyMargin) * 100) / 100;
                    } else {
                        const perCandFee = parseFloat(clientData.fixed_fee_amount || 1600);
                        const activeCount = parseInt(run.total_employees_processed || 0);
                        contractModelText = `Fixed Fee (₹${perCandFee.toLocaleString()} / candidate)`;
                        agencyMargin = perCandFee * activeCount;
                        invoicedAmount = Math.round((grossEarnings + employerCost + agencyMargin) * 100) / 100;
                    }

                    return (
                    <>
                        <div className="grid-cols-4" style={{ marginBottom: "1rem" }}>
                            <div className="card metric-card" style={{ padding: "0.85rem 1rem" }}>
                                <span className="metric-label">Processed Employees</span>
                                <span className="metric-value" style={{ fontSize: "1.4rem" }}>{run.total_employees_processed}</span>
                                <span className="metric-trend text-muted">Active in Roster</span>
                            </div>
                            <div className="card metric-card" style={{ padding: "0.85rem 1rem" }}>
                                <span className="metric-label">Total Gross Earnings</span>
                                <span className="metric-value" style={{ fontSize: "1.4rem" }}>₹{parseFloat(run.total_gross_earnings).toLocaleString()}</span>
                                <span className="metric-trend text-muted">Sum of gross pays</span>
                            </div>
                            <div className="card metric-card" style={{ padding: "0.85rem 1rem" }}>
                                <span className="metric-label">Total Net Disbursement</span>
                                <span className="metric-value" style={{ color: "var(--primary-navy)", fontSize: "1.4rem" }}>₹{parseFloat(run.total_net_disbursement).toLocaleString()}</span>
                                <span className="metric-trend text-muted">Amount sent to bank</span>
                            </div>
                            <div className="card metric-card" style={{ padding: "0.85rem 1rem" }}>
                                <span className="metric-label">Employer Statutory Cost</span>
                                <span className="metric-value" style={{ color: "var(--status-warning)", fontSize: "1.4rem" }}>₹{parseFloat(run.total_employer_statutory_cost).toLocaleString()}</span>
                                <span className="metric-trend text-muted">Er PF + Er ESI + Er LWF</span>
                            </div>
                        </div>

                        <div className="grid-layout">
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                <div className="card">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                                        <h3 className="card-title" style={{ margin: 0 }}>Employee Totals & Full Breakdown</h3>
                                        <button className="btn btn-secondary btn-xs" onClick={() => setShowBreakdown(!showBreakdown)}>Toggle Full Breakdown</button>
                                    </div>

                                    {showBreakdown && (
                                        <div style={{ marginBottom: "1.5rem" }}>
                                            <div className="table-responsive">
                                                <table className="data-table" style={{ fontSize: "0.8rem" }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Emp Code</th>
                                                            <th>Employee Name</th>
                                                            <th>Gross Salary (₹)</th>
                                                            <th>Net Pay (₹)</th>
                                                            <th>Total Deductions (₹)</th>
                                                            <th>Employer Cost (₹)</th>
                                                            <th>Total Line CTC (₹)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((item) => {
                                                            const gross = parseFloat(item.gross_total || 0);
                                                            const net = parseFloat(item.net_pay || 0);
                                                            const deduct = parseFloat(item.employee_pf || 0) + parseFloat(item.employee_esi || 0) + parseFloat(item.professional_tax || 0) + parseFloat(item.tds_deduction || 0);
                                                            const erCost = parseFloat(item.employer_pf || 0) + parseFloat(item.employer_esi || 0) + parseFloat(item.employer_lwf || 0);
                                                            const ctcVal = gross + erCost;

                                                            return (
                                                                <tr key={item.id}>
                                                                    <td className="font-mono text-xs">{item.employee_code || item.employee?.employee_code}</td>
                                                                    <td style={{ fontWeight: 600 }}>{item.employee_name || item.employee?.full_name}</td>
                                                                    <td>₹{gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                    <td style={{ fontWeight: 600, color: '#047857' }}>₹{net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                    <td style={{ color: '#DC2626' }}>₹{deduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                    <td style={{ color: '#D97706' }}>₹{erCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                    <td style={{ fontWeight: 700, color: '#1F3864' }}>₹{ctcVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "var(--text-muted)" }}>Consolidated Gross Earnings:</span>
                                            <span style={{ fontWeight: 600 }}>₹{parseFloat(run.total_gross_earnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "var(--text-muted)" }}>Employer Statutory Costs (PF + ESI + LWF):</span>
                                            <span style={{ fontWeight: 600 }}>₹{parseFloat(run.total_employer_statutory_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#047857", fontWeight: 600 }}>Consolidated Run CTC (Gross + Employer Costs):</span>
                                            <span style={{ color: "#047857", fontWeight: 700 }}>₹{(parseFloat(run.total_gross_earnings) + parseFloat(run.total_employer_statutory_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <hr style={{ border: 0, borderTop: "1px solid var(--border-color)" }} />
                                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1rem" }}>
                                            <span style={{ color: "var(--primary-navy)" }}>Status of Run:</span>
                                            <span style={{ color: "var(--primary-navy)", textTransform: "uppercase" }}>{run.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                {/* Primary Action Card (Authorization Lock & Payslip Release - TOP Priority) */}
                                <div className="card">
                                    <h3 className="card-title" style={{ marginBottom: "0.35rem" }}>Authorization &amp; Release Lock</h3>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                                        Approving and locking this run generates branch invoices, performs reconciliation, and enables official payslips.
                                    </p>
                                    
                                    <div>
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700, backgroundColor: run.status === 'locked' ? '#D97706' : '#1F3864' }} 
                                            onClick={handleApproveAndLock} 
                                            disabled={role !== 'admin' || run.status === 'locked'}
                                        >
                                            {run.status === 'locked' 
                                                ? (pendingSupplementaryRuns.length > 0 
                                                    ? `✓ Parent Locked — ${pendingSupplementaryRuns.length} Supplementary Pending` 
                                                    : '✓ Batch Locked & Finalized') 
                                                : '✓ Approve & Lock Batch'}
                                        </button>

                                        {pendingSupplementaryRuns.length > 0 && (
                                            <div id="pending-supplementary-card" style={{ border: '2px solid #F59E0B', backgroundColor: '#FFFBEB', borderRadius: 'var(--radius-sm)', padding: '0.85rem', marginTop: '1rem' }}>
                                                <h4 style={{ fontSize: '0.9rem', color: '#92400E', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                    ⚠️ {pendingSupplementaryRuns.length} Supplementary Run{pendingSupplementaryRuns.length > 1 ? 's' : ''} Pending
                                                </h4>
                                                <p style={{ fontSize: '0.75rem', color: '#92400E', marginBottom: '0.75rem' }}>
                                                    Approve & lock before finalizing payslips.
                                                </p>
                                                {pendingSupplementaryRuns.map(sr => (
                                                    <div key={sr.id} style={{ borderTop: '1px solid #FEF3C7', paddingTop: '0.65rem', marginTop: '0.65rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                                <strong style={{ fontSize: '0.85rem' }}>Run #{sr.id}</strong>
                                                                <span className="badge" style={{ backgroundColor: sr.run_type === 'correction' ? '#8B5CF6' : '#2563EB', color: '#FFFFFF', fontSize: '0.68rem', padding: '0.15rem 0.35rem' }}>
                                                                    {sr.run_type === 'correction' ? 'Payroll Correction' : 'New Hire Supplementary'}
                                                                </span>
                                                                <span className={`badge ${sr.status === 'draft' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.68rem' }}>
                                                                    {sr.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#78350F', marginBottom: '0.4rem', fontWeight: 600 }}>
                                                            {sr.total_employees_processed} employee{sr.total_employees_processed !== 1 ? 's' : ''} · ₹{parseFloat(sr.total_net_disbursement || 0).toLocaleString()} total net
                                                        </div>

                                                        {sr.processed_employees && sr.processed_employees.length > 0 && (
                                                            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #FCD34D', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.6rem', marginTop: '0.35rem', marginBottom: '0.65rem' }}>
                                                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', marginBottom: '0.3rem', letterSpacing: '0.02em' }}>
                                                                    Included Employee{sr.processed_employees.length > 1 ? 's' : ''} ({sr.processed_employees.length})
                                                                </div>
                                                                {sr.processed_employees.map((emp, idx) => (
                                                                    <div key={emp.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', borderBottom: idx < sr.processed_employees.length - 1 ? '1px dashed #F3F4F6' : 'none', paddingBottom: '0.2rem', marginBottom: '0.2rem' }}>
                                                                        <div>
                                                                            <span style={{ fontWeight: 600, color: '#1F2937' }}>{emp.full_name}</span>
                                                                            <span style={{ color: '#6B7280', marginLeft: '0.25rem', fontSize: '0.7rem' }}>({emp.employee_code})</span>
                                                                            {emp.designation && <span style={{ color: '#9CA3AF', marginLeft: '0.25rem', fontSize: '0.68rem' }}>· {emp.designation}</span>}
                                                                        </div>
                                                                        <div style={{ fontWeight: 600, color: '#059669', fontSize: '0.75rem' }}>
                                                                            ₹{parseFloat(emp.net_pay || 0).toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {sr.total_employees_processed === 0 && (
                                                            <div style={{ fontSize: '0.75rem', color: '#B45309', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                                                                ⚠️ 0 Employees Processed (All candidates skipped due to missing data)
                                                            </div>
                                                        )}
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            style={{ width: '100%', padding: '0.5rem', fontWeight: 600 }}
                                                            onClick={() => handleApproveSupplementary(sr.id, sr.status)}
                                                            disabled={role !== 'admin'}
                                                        >
                                                            {sr.status === 'approved' ? '🔒 Lock Supplementary Run' : '✓ Approve & Lock Supplementary Run'} #{sr.id}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {run.status === 'locked' && (
                                            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                                                <h4 style={{ fontSize: "0.9rem", color: "var(--primary-navy)", marginBottom: "0.5rem", fontWeight: 700 }}>Stage 2: Official Payslips Release</h4>
                                                
                                                {run.payslip_released_at ? (
                                                    <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", padding: "0.75rem", borderRadius: "var(--radius-sm)", marginBottom: "0.75rem" }}>
                                                        <span style={{ fontSize: "0.8rem", color: "#065F46", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                                                            ✅ Official Payslips Released on {new Date(run.payslip_released_at).toLocaleString()}
                                                        </span>
                                                        <span style={{ fontSize: "0.75rem", color: "#047857" }}>
                                                            Released by: {run.released_by_user_name || 'Admin'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                                                        Official PDF payslips have not been released yet. Click below to generate and email official PDF payslips to employees.
                                                    </p>
                                                )}

                                                <button 
                                                    className="btn btn-success" 
                                                    style={{ width: "100%", padding: "0.6rem", backgroundColor: "#059669", borderColor: "#059669", color: "#ffffff", fontWeight: 600 }}
                                                    onClick={() => {
                                                        router.post(route('payroll.run.release-payslips', run.id), {}, {
                                                            onSuccess: () => showToast({ type: 'success', title: 'Success', message: 'Official payslips released and emailed successfully.' }),
                                                            onError: (errs) => showToast({ type: 'error', title: 'Error', message: errs.error || 'Error releasing payslips' })
                                                        });
                                                    }}
                                                >
                                                    {run.payslip_released_at ? '📄 Re-send Official Payslips (All)' : '📄 Release Official PDF Payslips'}
                                                </button>

                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-secondary" 
                                                        style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
                                                        onClick={() => setShowSingleCorrectionModal(true)}
                                                    >
                                                        🔧 Correct Single Employee
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-secondary" 
                                                        style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem", backgroundColor: "#3B82F6", color: "#ffffff", borderColor: "#3B82F6" }}
                                                        onClick={() => setShowBatchCorrectionModal(true)}
                                                    >
                                                        ⚡ Batch Correction
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <Link href={route('payroll.processing', { client_id: clientId, payroll_month: month })} className="btn btn-secondary" style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem", display: "block", textAlign: "center", boxSizing: "border-box", fontSize: "0.85rem" }}>
                                            Return to Calculations
                                        </Link>
                                    </div>
                                    
                                    {role !== 'admin' && (
                                        <div style={{ backgroundColor: "var(--status-danger-bg)", borderRadius: "var(--radius-sm)", padding: "0.75rem", border: "1px solid #FFCDD2", marginTop: "0.5rem" }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--status-danger)" }}>
                                                🔒 Manager: Locking requires Administrator authorization. Stage 2 Payslip Release is allowed if you are assigned to this client.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Agency Profit Margin Card (Below Primary Actions) */}
                                <div className="card">
                                    <h3 className="card-title" style={{ marginBottom: "0.25rem" }}>Agency Profit Margin</h3>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                                        Calculated as Invoiced Amount minus Gross Earnings and True Employer-Side Cost.
                                    </p>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "var(--text-muted)" }}>Contract Model:</span>
                                            <span style={{ fontWeight: 600 }}>{contractModelText}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span>Invoiced to Client:</span>
                                            <span style={{ fontWeight: 600 }}>₹{invoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "var(--status-danger)" }}>Less: Gross Earnings:</span>
                                            <span style={{ fontWeight: 600, color: "var(--status-danger)" }}>-₹{grossEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "var(--status-danger)" }}>Less: Employer Cost:</span>
                                            <span style={{ fontWeight: 600, color: "var(--status-danger)" }}>-₹{employerCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <hr style={{ border: 0, borderTop: "1px solid var(--border-color)" }} />
                                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1.05rem" }}>
                                            <span style={{ color: agencyMargin >= 0 ? "#059669" : "#DC2626" }}>True Agency Margin:</span>
                                            <span style={{ color: agencyMargin >= 0 ? "#059669" : "#DC2626" }}>₹{agencyMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                    );
                })() : (
                    <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No active draft payroll run exists for this month. Go back to <Link href={route('payroll.processing')} style={{ textDecoration: "underline", color: "var(--primary-blue)" }}>Payroll Processing</Link> to generate calculations first.
                    </div>
                )}

                {/* Supplementary Run Modal */}
                {showSupplementaryModal && (() => {
                    const allCandidates = [
                        ...excludedItems.map(item => ({
                            ...item,
                            candidateType: 'Excluded',
                            isEligible: !item.exclusion_reason?.includes('No attendance data') && !item.exclusion_reason?.includes('Incomplete bank details'),
                            statusText: item.exclusion_reason
                        })),
                        ...newHires.map(item => ({
                            ...item,
                            candidateType: 'New Hire',
                            isEligible: item.is_eligible !== false,
                            statusText: item.is_eligible === false 
                                ? `Skipped: ${(item.exclusions || ['No attendance data']).join(', ')}` 
                                : `New Hire (Joined ${item.date_of_joining})`
                        }))
                    ];

                    const eligibleCandidates = allCandidates.filter(c => c.isEligible);
                    const ineligibleCandidates = allCandidates.filter(c => !c.isEligible);
                    const totalCandidateCount = allCandidates.length;
                    const eligibleCount = eligibleCandidates.length;

                    return (
                        <div className="modal-overlay active">
                            <div className="modal-box" style={{ maxWidth: "650px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                    <h3 style={{ color: "var(--primary-navy)", margin: 0 }}>Create Supplementary Payroll Run</h3>
                                    <button className="btn btn-secondary btn-xs" style={{ border: "none", background: "transparent", fontSize: "1.25rem", padding: 0 }} onClick={() => setShowSupplementaryModal(false)}>×</button>
                                </div>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
                                    A supplementary run processes remaining eligible candidate employees separately.
                                </p>
                                
                                <div className="table-responsive" style={{ marginBottom: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                                    <table className="data-table" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Pre-Flight Status & Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allCandidates.map((item, idx) => (
                                                <tr key={item.id ? `cand-${item.id}` : `cand-idx-${idx}`}>
                                                    <td><strong>{item.full_name}</strong> ({item.employee_code})</td>
                                                    <td>
                                                        {item.isEligible ? (
                                                            <span style={{ color: "var(--status-success)", fontWeight: 600 }}>
                                                                🟢 Ready to Process
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "var(--status-danger)", fontWeight: 600 }}>
                                                                🔴 {item.statusText}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Explicit Action Summary Box */}
                                {existingDraftRun ? (
                                    <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            ⚠️ Supplementary Run #{existingDraftRun.id} Already Exists in Draft
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#B45309', margin: '0.35rem 0 0 0', lineHeight: 1.45 }}>
                                            A draft supplementary run (Run #{existingDraftRun.id}) is currently pending approval. Please approve & lock or delete Supplementary Run #{existingDraftRun.id} before creating another one.
                                        </p>
                                    </div>
                                ) : (
                                    totalCandidateCount > 0 && (
                                        <div style={{
                                            backgroundColor: eligibleCount === 0 ? '#FEF2F2' : (ineligibleCandidates.length > 0 ? '#FFFBEB' : '#F0FDF4'),
                                            border: `1px solid ${eligibleCount === 0 ? '#FCA5A5' : (ineligibleCandidates.length > 0 ? '#FCD34D' : '#86EFAC')}`,
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '0.85rem 1rem',
                                            marginBottom: '1.25rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: eligibleCount === 0 ? '#991B1B' : (ineligibleCandidates.length > 0 ? '#92400E' : '#166534'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {eligibleCount === 0 ? '🛑 Cannot Start Supplementary Run' : (ineligibleCandidates.length > 0 ? '⚠️ Supplementary Run Summary' : '🟢 Ready to Process')}
                                            </div>
                                            <p style={{
                                                fontSize: '0.8rem',
                                                color: eligibleCount === 0 ? '#7F1D1D' : (ineligibleCandidates.length > 0 ? '#B45309' : '#15803D'),
                                                margin: '0.35rem 0 0 0',
                                                lineHeight: 1.45
                                            }}>
                                                {eligibleCount === 0 ? (
                                                    <>Blocked: 0 of {totalCandidateCount} candidates can be processed. <strong>{ineligibleCandidates.map(c => c.full_name).join(', ')}</strong> will be SKIPPED due to missing attendance data. Upload attendance before creating a supplementary run.</>
                                                ) : ineligibleCandidates.length > 0 ? (
                                                    <>Summary: <strong>{eligibleCount} of {totalCandidateCount} candidate(s)</strong> will be processed. <strong>{ineligibleCandidates.map(c => c.full_name).join(', ')}</strong> will be SKIPPED due to missing attendance or incomplete data.</>
                                                ) : (
                                                    <>Ready: All {eligibleCount} candidate(s) have valid attendance and will be processed in this supplementary run.</>
                                                )}
                                            </p>
                                        </div>
                                    )
                                )}
                                
                                <div className="modal-footer" style={{ marginTop: 0 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowSupplementaryModal(false)}>Cancel</button>
                                    {existingDraftRun ? (
                                        <button 
                                            type="button" 
                                            className="btn btn-warning"
                                            onClick={() => {
                                                setShowSupplementaryModal(false);
                                                setTimeout(() => {
                                                    const el = document.getElementById('pending-supplementary-card');
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 150);
                                            }}
                                        >
                                            Go to Pending Run #{existingDraftRun.id}
                                        </button>
                                    ) : (
                                        <button 
                                            type="button" 
                                            className="btn btn-primary" 
                                            onClick={handleCreateSupplementary}
                                            disabled={eligibleCount === 0}
                                        >
                                            Confirm & Start Supplementary Run
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                <PayrollCorrectionModal 
                    isOpen={showSingleCorrectionModal} 
                    onClose={() => setShowSingleCorrectionModal(false)} 
                    parentRun={run} 
                    items={items} 
                />

                <BatchPayrollCorrectionModal 
                    isOpen={showBatchCorrectionModal} 
                    onClose={() => setShowBatchCorrectionModal(false)} 
                    parentRun={run} 
                    items={items} 
                />
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
