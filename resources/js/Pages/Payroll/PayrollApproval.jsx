import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './PayrollApproval.css';

export default function PayrollApproval() {
    const [clientId, setClientId] = useState('mahindra');
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showDisbursementModal, setShowDisbursementModal] = useState(false);
    const [showSupplementaryModal, setShowSupplementaryModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState('active');

    // Currently simulating role access
    // In a real app this would come from Inertia page props (auth.user.role)
    const role = 'admin'; // For demo, assuming admin has access

    const data = useMemo(() => {
        let multiplier = 1;
        let empCount = 38;
        let clientName = 'Mahindra Corp';

        if (clientId === 'tcs') { multiplier = 2.5; empCount = 85; clientName = 'Tata Consultancy Services'; }
        else if (clientId === 'reliance') { multiplier = 0.8; empCount = 15; clientName = 'Reliance Digital'; }

        const gross = 3480000 * multiplier;
        const pf_employee = 248500 * multiplier;
        const esi_employee = 12400 * multiplier;
        const pt = 8400 * multiplier;
        const tds = 100700 * multiplier;
        const loan = 0;
        const pf_employer = 248500 * multiplier;
        const esi_employer = 53733 * multiplier;

        const totalDeductions = pf_employee + esi_employee + pt + tds + loan;
        const totalEmployerCost = pf_employer + esi_employer;
        const netPay = gross - totalDeductions;
        const invoicedAmount = Math.round(gross * 1.085);
        const agencyMargin = invoicedAmount - (gross + totalEmployerCost);

        const dummyRows = [1, 2].map(i => {
            const basic = 20000 * multiplier;
            const hra = 10000 * multiplier;
            const conv = 2000 * multiplier;
            const da = 5000 * multiplier;
            const g = basic + hra + conv + da;
            const pf = 2400 * multiplier;
            const pt_val = 200 * multiplier;
            const net = g - (pf + pt_val);
            return {
                id: `TEC-${100+i}`, name: `Employee ${i}`, basic, hra, conv, da, gross: g, pf, pt: pt_val, net
            };
        });

        return {
            clientName, empCount, gross, pf_employee, esi_employee, pt, tds, loan, pf_employer, esi_employer,
            totalDeductions, totalEmployerCost, netPay, invoicedAmount, agencyMargin, dummyRows
        };
    }, [clientId]);

    const handleApprove = () => {
        setShowDisbursementModal(true);
    };

    const finalizeLock = () => {
        setShowDisbursementModal(false);
        alert("Batch finalized! Bank disbursal E-file generated successfully with the selected account.\n\n✅ Compliance Integration: Draft PF ECR, ESI, and PT data have been auto-populated for this batch in the Statutory Compliance Center.");
        window.location.href = "/compliance";
    };

    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
            <AuthenticatedLayout>
                <Head title="Payroll Approval" />

                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                        <h2 style={{ marginTop: "0.5rem" }}>Approve & Lock Payroll Batch</h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                            Review consolidated totals for {data.clientName} (June 2026) and authorize bank file disbursements.
                        </p>
                    </div>
                    <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FEF3C7", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "#92400E", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                        <strong>Partial Batch: {data.empCount} of {data.empCount + 4} active employees covered.</strong>
                        <span>4 employees excluded — click 'Create Supplementary Run' to see reasons and fix them.</span>
                        <button className="btn btn-secondary btn-xs" style={{ marginTop: "0.25rem" }} onClick={() => setShowSupplementaryModal(true)}>Create Supplementary Run for 4 Excluded</button>
                    </div>
                </div>

                <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label style={{ fontWeight: 500, marginBottom: 0 }}>Select Client Batch:</label>
                    <select className="form-control" style={{ width: "300px" }} value={clientId} onChange={e => setClientId(e.target.value)}>
                        <option value="mahindra">Mahindra Corp</option>
                        <option value="tcs">Tata Consultancy Services</option>
                        <option value="reliance">Reliance Digital</option>
                    </select>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "auto" }}>Payroll Period: June 2026</span>
                </div>

                <div className="grid-cols-4" style={{ marginBottom: "1.5rem" }}>
                    <div className="card metric-card">
                        <span className="metric-label">Processed Employees</span>
                        <span className="metric-value">{data.empCount}</span>
                        <span className="metric-trend text-muted">Out of {data.empCount + 4} Active</span>
                    </div>
                    <div className="card metric-card">
                        <span className="metric-label">Total Gross Earnings</span>
                        <span className="metric-value">₹{data.gross.toLocaleString()}</span>
                        <span className="metric-trend text-muted">Sum of all 8 components</span>
                    </div>
                    <div className="card metric-card">
                        <span className="metric-label">Total Net Disbursement</span>
                        <span className="metric-value" style={{ color: "var(--primary-navy)" }}>₹{data.netPay.toLocaleString()}</span>
                        <span className="metric-trend text-muted">Amount sent to bank</span>
                    </div>
                    <div className="card metric-card">
                        <span className="metric-label">Employer-Side Statutory Cost</span>
                        <span className="metric-value" style={{ color: "var(--status-warning)" }}>₹{data.totalEmployerCost.toLocaleString()}</span>
                        <span className="metric-trend text-muted">Er PF + Er ESI</span>
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
                                                    <th rowSpan="2">Emp Code</th>
                                                    <th rowSpan="2">Employee Name</th>
                                                    <th colSpan="8" className="col-group-earn">Earnings</th>
                                                    <th rowSpan="2" className="col-group-total">Gross Total</th>
                                                    <th colSpan="7" className="col-group-deduct">Employee Deductions</th>
                                                    <th rowSpan="2" className="col-group-total">Total Deduct.</th>
                                                    <th colSpan="2" style={{ background: "#FFF7ED" }}>Employer Cost</th>
                                                    <th rowSpan="2" className="col-group-total" style={{ color: "var(--primary-navy)" }}>Net Pay</th>
                                                </tr>
                                                <tr>
                                                    <th className="col-group-earn">Basic</th>
                                                    <th className="col-group-earn">HRA</th>
                                                    <th className="col-group-earn">Conv.</th>
                                                    <th className="col-group-earn">DA</th>
                                                    <th className="col-group-earn">Med.</th>
                                                    <th className="col-group-earn">Special</th>
                                                    <th className="col-group-earn">Other</th>
                                                    <th className="col-group-earn">Arrears</th>
                                                    
                                                    <th className="col-group-deduct">PF</th>
                                                    <th className="col-group-deduct">ESI</th>
                                                    <th className="col-group-deduct">PT</th>
                                                    <th className="col-group-deduct">Welfare</th>
                                                    <th className="col-group-deduct">LOP</th>
                                                    <th className="col-group-deduct">TDS</th>
                                                    <th className="col-group-deduct">Loan EMI</th>
                                                    
                                                    <th style={{ background: "#FFF7ED" }}>Er PF</th>
                                                    <th style={{ background: "#FFF7ED" }}>Er ESI</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.dummyRows.map(r => (
                                                    <tr key={r.id}>
                                                        <td>{r.id}</td>
                                                        <td><strong>{r.name}</strong></td>
                                                        <td className="col-earn">₹{r.basic.toLocaleString()}</td>
                                                        <td className="col-earn">₹{r.hra.toLocaleString()}</td>
                                                        <td className="col-earn">₹{r.conv.toLocaleString()}</td>
                                                        <td className="col-earn">₹{r.da.toLocaleString()}</td>
                                                        <td className="col-earn">₹0</td>
                                                        <td className="col-earn">₹0</td>
                                                        <td className="col-earn">₹0</td>
                                                        <td className="col-earn">₹0</td>
                                                        <td className="col-group-total">₹{r.gross.toLocaleString()}</td>
                                                        <td className="col-deduct">₹{r.pf.toLocaleString()}</td>
                                                        <td className="col-deduct">—</td>
                                                        <td className="col-deduct">₹{r.pt.toLocaleString()}</td>
                                                        <td className="col-deduct">—</td>
                                                        <td className="col-deduct">—</td>
                                                        <td className="col-deduct">—</td>
                                                        <td className="col-deduct">—</td>
                                                        <td className="col-group-total">₹{(r.pf + r.pt).toLocaleString()}</td>
                                                        <td style={{ background: "#FFF7ED" }}>₹{r.pf.toLocaleString()}</td>
                                                        <td style={{ background: "#FFF7ED" }}>—</td>
                                                        <td className="col-group-total" style={{ color: "var(--primary-navy)", fontSize: "1.1em" }}>₹{r.net.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan="22" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", padding: "1rem" }}>... {data.empCount - 2} more employees</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Employee Deductions (PF, ESI, PT, TDS):</span>
                                    <span style={{ fontWeight: 600 }}>₹{data.totalDeductions.toLocaleString()}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)" }}>Employer Costs (Er PF + Er ESI):</span>
                                    <span style={{ fontWeight: 600 }}>₹{data.totalEmployerCost.toLocaleString()}</span>
                                </div>
                                <hr style={{ border: 0, borderTop: "1px solid var(--border-color)" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1rem" }}>
                                    <span style={{ color: "var(--primary-navy)" }}>Total Disbursable (Net Pay + Liabilities):</span>
                                    <span style={{ color: "var(--primary-navy)" }}>₹{(data.netPay + data.totalDeductions + data.totalEmployerCost).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div className={`card ${role === 'executive' ? 'locked-card' : ''}`}>
                            <div className={role === 'executive' ? 'locked-blur' : ''}>
                                <h3 className="card-title">Agency Profit Margin</h3>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Calculated as Invoiced Amount minus Gross Earnings and True Employer-Side Cost.</p>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Contract Model:</span>
                                        <span style={{ fontWeight: 600 }}>8.5% Markup on Gross CTC</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Invoiced to Client:</span>
                                        <span style={{ fontWeight: 600 }}>₹{data.invoicedAmount.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--status-danger)" }}>Less: Gross Earnings:</span>
                                        <span style={{ fontWeight: 600, color: "var(--status-danger)" }}>-₹{data.gross.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--status-danger)" }}>Less: Employer Cost:</span>
                                        <span style={{ fontWeight: 600, color: "var(--status-danger)" }}>-₹{data.totalEmployerCost.toLocaleString()}</span>
                                    </div>
                                    <hr style={{ border: 0, borderTop: "1px solid var(--border-color)" }} />
                                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1.05rem" }}>
                                        <span style={{ color: "var(--status-success)" }}>True Agency Margin:</span>
                                        <span style={{ color: "var(--status-success)" }}>₹{data.agencyMargin.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {role === 'executive' && (
                                <div className="locked-overlay">
                                    <div className="locked-badge">🔒 Margin Lock</div>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 600, textAlign: "center", color: "var(--text-main)" }}>Margin Data Protected</span>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.25rem" }}>Requires Administrator role to view margin metrics.</span>
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>Lock Action</h3>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                                Approving locks this run. Net salary records are compiled into a bank-ready format and payslips are made downloadable.
                            </p>
                            
                            <div>
                                <button className="btn btn-primary" style={{ width: "100%", padding: "0.6rem" }} onClick={handleApprove} disabled={role === 'executive'}>
                                    ✓ Approve & Lock Batch
                                </button>
                                <Link href="/payroll/processing" className="btn btn-secondary" style={{ width: "100%", marginTop: "0.5rem", padding: "0.6rem", display: "block", textAlign: "center", boxSizing: "border-box" }}>
                                    Return to Calculations
                                </Link>
                            </div>
                            
                            {role === 'executive' && (
                                <div style={{ backgroundColor: "var(--status-danger-bg)", borderRadius: "var(--radius-sm)", padding: "0.75rem", border: "1px solid #FFCDD2", marginTop: "0.5rem" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--status-danger)" }}>
                                        🔒 Manager: You do not have permissions to lock this payroll run. Please notify the Administrator.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {showDisbursementModal && (
                    <div className="modal-overlay" style={{ display: 'flex' }}>
                        <div className="modal-box">
                            <h3 style={{ marginTop: 0, color: "var(--status-danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>⚠️ Post-Approval Data Change Detected</h3>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "1.5rem" }}>
                                <strong>Neha Patil's</strong> bank details were updated after this batch was processed but before final disbursement. Do not proceed until you confirm which account receives this transfer.
                            </p>
                            
                            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                                <div 
                                    style={{ flex: 1, padding: "1rem", border: selectedAccount === 'processing' ? "2px solid var(--primary-navy)" : "1px solid var(--border-color)", borderRadius: "var(--radius-md)", backgroundColor: selectedAccount === 'processing' ? "#F8FAFC" : "transparent", cursor: "pointer" }}
                                    onClick={() => setSelectedAccount('processing')}
                                >
                                    <div style={{ fontSize: "0.75rem", color: selectedAccount === 'processing' ? "var(--primary-navy)" : "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase" }}>Account Active at Processing</div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.5rem" }}>SBI Bank</div>
                                    <div style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>••••••••125432</div>
                                </div>
                                <div 
                                    style={{ flex: 1, padding: "1rem", border: selectedAccount === 'active' ? "2px solid var(--primary-navy)" : "1px solid var(--border-color)", borderRadius: "var(--radius-md)", backgroundColor: selectedAccount === 'active' ? "#F8FAFC" : "transparent", cursor: "pointer" }}
                                    onClick={() => setSelectedAccount('active')}
                                >
                                    <div style={{ fontSize: "0.75rem", color: selectedAccount === 'active' ? "var(--primary-navy)" : "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase" }}>Currently Active Account</div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.5rem" }}>HDFC Bank</div>
                                    <div style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>••••••••993821</div>
                                </div>
                            </div>
                            
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDisbursementModal(false)}>Cancel Lock</button>
                                <button type="button" className="btn btn-primary" onClick={finalizeLock}>Confirm & Finalize Disbursement</button>
                            </div>
                        </div>
                    </div>
                )}

                {showSupplementaryModal && (
                    <div className="modal-overlay" style={{ display: 'flex' }}>
                        <div className="modal-box" style={{ maxWidth: "650px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                <h3 style={{ color: "var(--primary-navy)", margin: 0 }}>Create Supplementary Payroll Run</h3>
                                <button className="btn btn-secondary btn-xs" style={{ border: "none", background: "transparent", fontSize: "1.25rem", padding: 0 }} onClick={() => setShowSupplementaryModal(false)}>×</button>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
                                A supplementary run processes the excluded employees separately, once their blocking issues are resolved. It is treated as part of the same payroll period (June 2026) for statutory filing purposes.
                            </p>
                            
                            <div className="table-responsive" style={{ marginBottom: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                                <table className="data-table" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Blocking Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>Vikram Rao</strong> (TEC-168)</td>
                                            <td><span style={{ color: "var(--status-danger)", fontWeight: 500 }}>Attendance data missing</span> (no punch records, no uploaded sheet)</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Priya Nair</strong> (TEC-177)</td>
                                            <td><span style={{ color: "var(--status-danger)", fontWeight: 500 }}>Bank account details incomplete</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Arjun Das</strong> (TEC-183)</td>
                                            <td><span style={{ color: "var(--status-danger)", fontWeight: 500 }}>Attendance data missing</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Sneha Iyer</strong> (TEC-201)</td>
                                            <td><span style={{ color: "var(--status-danger)", fontWeight: 500 }}>PAN not verified</span> — TDS cannot be computed</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <p style={{ fontSize: "0.85rem", fontWeight: 500, marginBottom: "1.5rem", color: "var(--text-main)", backgroundColor: "#F8FAFC", padding: "0.75rem", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--primary-blue)" }}>
                                Fix these issues in the Employee module, then return here to process the supplementary run. The main batch (38 employees) is unaffected.
                            </p>
                            
                            <div className="modal-footer" style={{ marginTop: 0 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplementaryModal(false)}>Close</button>
                                <Link href="/employees" className="btn btn-secondary" style={{ textDecoration: "none" }}>Go to Employee Module</Link>
                            </div>
                        </div>
                    </div>
                )}
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
