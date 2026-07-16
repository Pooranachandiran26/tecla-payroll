import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './PayrollApproval.css';

export default function PayrollApproval({ clients, selectedClientId, selectedMonth, run, items }) {
    const [clientId, setClientId] = useState(selectedClientId);
    const [month, setMonth] = useState(selectedMonth);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showDisbursementModal, setShowDisbursementModal] = useState(false);
    const [showSupplementaryModal, setShowSupplementaryModal] = useState(false);

    const { auth } = usePage().props;
    const role = auth?.user?.role || 'manager';

    const handleClientChange = (newClientId) => {
        setClientId(newClientId);
        router.get('/payroll/approval', { client_id: newClientId, payroll_month: month }, { preserveState: false });
    };

    const handleMonthChange = (newMonth) => {
        setMonth(newMonth);
        router.get('/payroll/approval', { client_id: clientId, payroll_month: newMonth }, { preserveState: false });
    };

    // Filter items into active and excluded
    const activeItems = items ? items.filter(i => !i.is_excluded) : [];
    const excludedItems = items ? items.filter(i => i.is_excluded) : [];

    // Trigger Approve
    const handleApproveAndLock = () => {
        if (!run) return;
        
        router.post(`/payroll/${run.id}/approve`, {}, {
            onSuccess: () => {
                // Once approved, run lock
                router.post(`/payroll/${run.id}/lock`, {}, {
                    onSuccess: () => {
                        alert("Batch approved and locked! Invoice generated successfully.");
                        router.visit('/invoices');
                    },
                    onError: (errors) => {
                        alert("Error locking batch: " + (errors.error || 'Unknown error'));
                    }
                });
            },
            onError: (errors) => {
                alert("Error approving batch: " + (errors.error || 'Unknown error'));
            }
        });
    };

    // Trigger Supplementary Run
    const handleCreateSupplementary = () => {
        if (!run) return;
        router.post(`/payroll/${run.id}/supplementary`, {}, {
            onSuccess: () => {
                alert("Supplementary run created successfully!");
                setShowSupplementaryModal(false);
                router.reload();
            },
            onError: (errors) => {
                alert("Error creating supplementary run: " + (errors.error || 'Unknown error'));
            }
        });
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
                    {run && excludedItems.length > 0 && (
                        <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FEF3C7", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "#92400E", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                            <strong>Partial Batch: {activeItems.length} of {items.length} employees processed.</strong>
                            <span>{excludedItems.length} employees excluded — click 'Create Supplementary Run' to process them.</span>
                            <button 
                                className="btn btn-secondary btn-xs" 
                                style={{ marginTop: "0.25rem" }} 
                                onClick={() => setShowSupplementaryModal(true)}
                                disabled={role !== 'admin'}
                            >
                                Create Supplementary Run for {excludedItems.length} Excluded
                            </button>
                        </div>
                    )}
                </div>

                <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label style={{ fontWeight: 500, marginBottom: 0 }}>Select Client Batch:</label>
                    <select className="form-control" style={{ width: "300px" }} value={clientId} onChange={e => handleClientChange(e.target.value)}>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                    </select>
                    <select className="form-control" style={{ width: "150px" }} value={month} onChange={e => handleMonthChange(e.target.value)}>
                        <option value="2026-06-01">June 2026</option>
                        <option value="2026-05-01">May 2026</option>
                        <option value="2026-07-01">July 2026</option>
                    </select>
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
                                            {run.status === 'locked' ? '✓ Locked and Finalized' : '✓ Approve & Lock Batch'}
                                        </button>
                                        <Link href="/payroll/processing" className="btn btn-secondary" style={{ width: "100%", marginTop: "0.5rem", padding: "0.6rem", display: "block", textAlign: "center", boxSizing: "border-box" }}>
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
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No active draft payroll run exists for this month. Go back to <Link href="/payroll/processing" style={{ textDecoration: "underline", color: "var(--primary-blue)" }}>Payroll Processing</Link> to generate calculations first.
                    </div>
                )}

                {/* Supplementary Run Modal */}
                {showSupplementaryModal && (
                    <div className="modal-overlay" style={{ display: 'flex' }}>
                        <div className="modal-box" style={{ maxWidth: "650px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                <h3 style={{ color: "var(--primary-navy)", margin: 0 }}>Create Supplementary Payroll Run</h3>
                                <button className="btn btn-secondary btn-xs" style={{ border: "none", background: "transparent", fontSize: "1.25rem", padding: 0 }} onClick={() => setShowSupplementaryModal(false)}>×</button>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
                                A supplementary run processes the remaining {excludedItems.length} excluded employees separately once their blocking issues are resolved.
                            </p>
                            
                            <div className="table-responsive" style={{ marginBottom: "1.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                                <table className="data-table" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Blocking Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {excludedItems.map(item => (
                                            <tr key={item.id}>
                                                <td><strong>{item.full_name}</strong> ({item.employee_code})</td>
                                                <td><span style={{ color: "var(--status-danger)", fontWeight: 500 }}>{item.exclusion_reason}</span></td>
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
