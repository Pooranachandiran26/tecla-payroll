import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import useToast from '../../Hooks/useToast';
import './PayrollApproval.css';

export default function PayrollApproval({ clients, selectedClientId, selectedMonth, run, items, preflight, cycleInfo, newHires = [], pendingSupplementaryRuns = [] }) {
    const { showToast } = useToast();
    const [clientId, setClientId] = useState(selectedClientId);
    const [month, setMonth] = useState(selectedMonth);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showDisbursementModal, setShowDisbursementModal] = useState(false);
    const [showSupplementaryModal, setShowSupplementaryModal] = useState(false);

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
                    showToast({ type: 'success', title: 'Supplementary Run Locked',
                        message: 'Supplementary run locked and invoices merged successfully.' });
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
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title="Payroll Approval" />

                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                        <h2 style={{ marginTop: "0.5rem" }}>Approve & Lock Payroll Batch</h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
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

                <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: cycleInfo ? "1rem" : 0 }}>
                        <label style={{ fontWeight: 500, marginBottom: 0 }}>Select Client Batch:</label>
                        <select className="form-control" style={{ width: "300px" }} value={clientId} onChange={e => handleClientChange(e.target.value)}>
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

                    {cycleInfo && (
                        <div className="cycle-info-row" style={{ display: "flex", gap: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                            <span>📅 Cycle Ends: <strong>{cycleInfo.cycle_end_date}</strong></span>
                            {cycleInfo.target_lock_date && (
                                <span>🔒 Target Lock Date: <strong>{cycleInfo.target_lock_date}</strong></span>
                            )}
                            {cycleInfo.target_salary_credit_date && (
                                <span>💰 Target Salary Credit: <strong>{cycleInfo.target_salary_credit_date}</strong></span>
                            )}
                        </div>
                    )}
                </div>

                {/* Pre-Flight Validation Gates (Timing & blocker checks) */}
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <div className="card-header" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--border-color)" }}>
                        <h3 className="card-title" style={{ margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>✈️ Pre-Flight Validation Gates</span>
                            <span className={`badge ${preflight && preflight.some(f => f.type === 'red') ? 'badge-danger' : 'badge-success'}`}>
                                {preflight && preflight.some(f => f.type === 'red') ? 'Blockers Found' : 'All Clear'}
                            </span>
                        </h3>
                    </div>
                    <div style={{ padding: "1rem" }}>
                        {preflight && preflight.length > 0 ? (
                            preflight.map((f, i) => (
                                <div key={i} className={`preflight-item status-${f.type}`}>
                                    <div className="preflight-icon">
                                        {f.type === 'red' ? '❌' : f.type === 'info' ? 'ℹ️' : '⚠️'}
                                    </div>
                                    <div className="preflight-content">
                                        <strong>{f.type === 'red' ? 'BLOCKER' : f.type === 'info' ? 'INFO' : 'WARNING'}:</strong> {f.msg}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="preflight-item status-green">
                                <div className="preflight-icon">✅</div>
                                <div className="preflight-content">
                                    <strong>ALL CLEAR:</strong> No blockers or warnings found for this client and month.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {run ? (
                    <>
                        <div className="grid-cols-4" style={{ marginBottom: "1.5rem" }}>
                            <div className="card metric-card">
                                <span className="metric-label">Processed Employees</span>
                                <span className="metric-value">{run.total_employees_processed}</span>
                                <span className="metric-trend text-muted">Active in Roster</span>
                            </div>
                            <div className="card metric-card">
                                <span className="metric-label">Total Gross Earnings</span>
                                <span className="metric-value">₹{parseFloat(run.total_gross_earnings).toLocaleString()}</span>
                                <span className="metric-trend text-muted">Sum of gross pays</span>
                            </div>
                            <div className="card metric-card">
                                <span className="metric-label">Total Net Disbursement</span>
                                <span className="metric-value" style={{ color: "var(--primary-navy)" }}>₹{parseFloat(run.total_net_disbursement).toLocaleString()}</span>
                                <span className="metric-trend text-muted">Amount sent to bank</span>
                            </div>
                            <div className="card metric-card">
                                <span className="metric-label">Employer Statutory Cost</span>
                                <span className="metric-value" style={{ color: "var(--status-warning)" }}>₹{parseFloat(run.total_employer_statutory_cost).toLocaleString()}</span>
                                <span className="metric-trend text-muted">Er PF + Er ESI + Er LWF</span>
                            </div>
                        </div>

                        <div className="grid-layout">
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                <div className="card">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                                        <h3 className="card-title" style={{ margin: 0 }}>Employee Totals & Full Breakdown</h3>
                                        <button className="btn btn-secondary btn-xs" onClick={() => setShowBreakdown(!showBreakdown)}>Toggle Full Breakdown</button>
                                    </div>

                                    {showBreakdown && (
                                        <div style={{ marginBottom: "1.5rem" }}>
                                            <div className="table-scroll-wrapper">
                                                <table className="data-table extended-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Emp Code</th>
                                                            <th>Employee Name</th>
                                                            <th>Paid Days</th>
                                                            <th>Gross</th>
                                                            <th>Unpaid LOP (Info)</th>
                                                            <th>PF</th>
                                                            <th>ESI</th>
                                                            <th>PT</th>
                                                            <th>TDS</th>
                                                            <th>Loan EMI</th>
                                                            <th>Net Pay</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {activeItems.map(r => (
                                                            <tr key={r.id}>
                                                                <td>{r.employee_code}</td>
                                                                <td><strong>{r.full_name}</strong></td>
                                                                <td>{parseFloat(r.paid_days).toFixed(1)} days</td>
                                                                <td>₹{parseFloat(r.gross_total).toLocaleString()}</td>
                                                                <td style={{ background: "#F8FAFC" }}>₹{parseFloat(r.lop_deduction).toLocaleString()}</td>
                                                                <td>₹{parseFloat(r.employee_pf).toLocaleString()}</td>
                                                                <td>₹{parseFloat(r.employee_esi).toLocaleString()}</td>
                                                                <td>₹{parseFloat(r.professional_tax).toLocaleString()}</td>
                                                                <td>₹{parseFloat(r.tds_deduction).toLocaleString()}</td>
                                                                <td>₹{parseFloat(r.loan_emi_deduction).toLocaleString()}</td>
                                                                <td style={{ color: "var(--primary-navy)" }}><strong>₹{parseFloat(r.net_pay).toLocaleString()}</strong></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "var(--text-muted)" }}>Consolidated Gross Earnings:</span>
                                            <span style={{ fontWeight: 600 }}>₹{parseFloat(run.total_gross_earnings).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "var(--text-muted)" }}>Employer Statutory Costs (PF + ESI + LWF):</span>
                                            <span style={{ fontWeight: 600 }}>₹{parseFloat(run.total_employer_statutory_cost).toLocaleString()}</span>
                                        </div>
                                        <hr style={{ border: 0, borderTop: "1px solid var(--border-color)" }} />
                                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1rem" }}>
                                            <span style={{ color: "var(--primary-navy)" }}>Status of Run:</span>
                                            <span style={{ color: "var(--primary-navy)", textTransform: "uppercase" }}>{run.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                <div className="card">
                                    <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>Authorization Lock</h3>
                                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                                        Approving and locking this run generates the branch invoices, performs reconciliation, and publishes employee payslips.
                                    </p>
                                    
                                    <div>
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: "100%", padding: "0.6rem" }} 
                                            onClick={handleApproveAndLock} 
                                            disabled={role !== 'admin' || run.status === 'locked'}
                                        >
                                            {run.status === 'locked' 
                                                ? (pendingSupplementaryRuns.length > 0 
                                                    ? `✓ Parent Locked — ${pendingSupplementaryRuns.length} supplementary pending below` 
                                                    : '✓ Locked and Finalized') 
                                                : '✓ Approve & Lock Batch'}
                                        </button>
                                        <Link href={route('payroll.processing', { client_id: clientId, payroll_month: month })} className="btn btn-secondary" style={{ width: "100%", marginTop: "0.5rem", padding: "0.6rem", display: "block", textAlign: "center", boxSizing: "border-box" }}>
                                            Return to Calculations
                                        </Link>
                                    </div>
                                    
                                    {role !== 'admin' && (
                                        <div style={{ backgroundColor: "var(--status-danger-bg)", borderRadius: "var(--radius-sm)", padding: "0.75rem", border: "1px solid #FFCDD2", marginTop: "0.5rem" }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--status-danger)" }}>
                                                🔒 Manager: You do not have permissions to lock this payroll run. Please notify the Administrator.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {pendingSupplementaryRuns.length > 0 && (
                                    <div className="card" style={{ border: '2px solid #F59E0B', backgroundColor: '#FFFBEB', marginTop: '1.5rem' }}>
                                        <h3 className="card-title" style={{ marginBottom: '0.5rem', color: '#92400E' }}>
                                            ⚠️ {pendingSupplementaryRuns.length} Supplementary Run{pendingSupplementaryRuns.length > 1 ? 's' : ''} Pending Approval
                                        </h3>
                                        <p style={{ fontSize: '0.8rem', color: '#92400E', marginBottom: '1rem' }}>
                                            These supplementary runs must be approved and locked before all employees' payslips are finalized.
                                        </p>
                                        {pendingSupplementaryRuns.map(sr => (
                                            <div key={sr.id} style={{ borderTop: '1px solid #FEF3C7', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <div>
                                                        <strong>Run #{sr.id}</strong>
                                                        <span className={`badge ${sr.status === 'draft' ? 'badge-warning' : 'badge-info'}`} style={{ marginLeft: '0.5rem' }}>
                                                            {sr.status}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {sr.total_employees_processed} employee{sr.total_employees_processed !== 1 ? 's' : ''} · ₹{parseFloat(sr.total_net_disbursement || 0).toLocaleString()} net
                                                    </span>
                                                </div>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ width: '100%' }}
                                                    onClick={() => handleApproveSupplementary(sr.id, sr.status)}
                                                    disabled={role !== 'admin'}
                                                >
                                                    {sr.status === 'approved' ? '🔒 Lock Supplementary Run' : '✓ Approve & Lock Supplementary Run'} #{sr.id}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No active draft payroll run exists for this month. Go back to <Link href={route('payroll.processing')} style={{ textDecoration: "underline", color: "var(--primary-blue)" }}>Payroll Processing</Link> to generate calculations first.
                    </div>
                )}

                {/* Supplementary Run Modal */}
                {showSupplementaryModal && (
                    <div className="modal-overlay active">
                        <div className="modal-box" style={{ maxWidth: "650px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                <h3 style={{ color: "var(--primary-navy)", margin: 0 }}>Create Supplementary Payroll Run</h3>
                                <button className="btn btn-secondary btn-xs" style={{ border: "none", background: "transparent", fontSize: "1.25rem", padding: 0 }} onClick={() => setShowSupplementaryModal(false)}>×</button>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
                                A supplementary run processes the remaining {excludedItems.length} excluded employees and {newHires.length} new hires separately.
                            </p>
                            
                            <div className="table-responsive" style={{ marginBottom: "1.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                                <table className="data-table" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Blocking / Status Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {excludedItems.map(item => (
                                            <tr key={`ex-${item.id}`}>
                                                <td><strong>{item.full_name}</strong> ({item.employee_code})</td>
                                                <td><span style={{ color: "var(--status-danger)", fontWeight: 500 }}>{item.exclusion_reason}</span></td>
                                            </tr>
                                        ))}
                                        {newHires.map(item => (
                                            <tr key={`nh-${item.id}`}>
                                                <td><strong>{item.full_name}</strong> ({item.employee_code})</td>
                                                <td><span style={{ color: "var(--status-warning)", fontWeight: 500 }}>New Hire (Joined {item.date_of_joining})</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="modal-footer" style={{ marginTop: 0 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplementaryModal(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleCreateSupplementary}>Confirm & Start Supplementary Run</button>
                            </div>
                        </div>
                    </div>
                )}
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
