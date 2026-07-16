import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './PayrollProcessing.css';

export default function PayrollProcessing({ clients, selectedClientId, selectedMonth, run, items, preflight }) {
    const [clientId, setClientId] = useState(selectedClientId);
    const [month, setMonth] = useState(selectedMonth);
    const [earnVisible, setEarnVisible] = useState(true);
    const [deductVisible, setDeductVisible] = useState(true);
    const [showSourceBanner, setShowSourceBanner] = useState(true);

    const handleClientChange = (newClientId) => {
        setClientId(newClientId);
        router.get('/payroll/processing', { client_id: newClientId, payroll_month: month }, { preserveState: false });
    };

    const handleMonthChange = (newMonth) => {
        setMonth(newMonth);
        router.get('/payroll/processing', { client_id: clientId, payroll_month: newMonth }, { preserveState: false });
    };

    const handleProcess = () => {
        router.post('/payroll/runs', {
            client_id: clientId,
            payroll_month: month
        }, {
            onSuccess: () => {
                alert('Payroll run processed successfully!');
            },
            onError: (errors) => {
                alert('Error processing run: ' + (errors.error || 'Unknown error'));
            }
        });
    };

    // Calculate sum of columns if run and items exist
    const totals = React.useMemo(() => {
        if (!items || items.length === 0) return null;
        let t = {
            basic: 0, hra: 0, conv: 0, da: 0, med: 0, special: 0, other: 0, gross: 0,
            pf: 0, esi: 0, pt: 0, lop: 0, tds: 0, loan: 0, totalDeduct: 0, net: 0
        };
        items.forEach(item => {
            if (item.is_excluded) return;
            t.basic += parseFloat(item.basic_pay || 0);
            t.hra += parseFloat(item.hra || 0);
            t.conv += parseFloat(item.conveyance || 0);
            t.da += parseFloat(item.da || 0);
            t.med += parseFloat(item.medical_allowance || 0);
            t.special += parseFloat(item.special_allowance || 0);
            t.other += parseFloat(item.other_additions || 0);
            t.gross += parseFloat(item.gross_total || 0);
            t.pf += parseFloat(item.employee_pf || 0);
            t.esi += parseFloat(item.employee_esi || 0);
            t.pt += parseFloat(item.professional_tax || 0);
            t.lop += parseFloat(item.lop_deduction || 0);
            t.tds += parseFloat(item.tds_deduction || 0);
            t.loan += parseFloat(item.loan_emi_deduction || 0);
            t.totalDeduct += (parseFloat(item.employee_pf || 0) + parseFloat(item.employee_esi || 0) + parseFloat(item.professional_tax || 0) + parseFloat(item.tds_deduction || 0) + parseFloat(item.loan_emi_deduction || 0));
            t.net += parseFloat(item.net_pay || 0);
        });
        return t;
    }, [items]);

    const activeItems = items ? items.filter(i => !i.is_excluded) : [];
    const excludedCount = items ? items.filter(i => i.is_excluded).length : 0;

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title="Payroll Processing" />

                <div style={{ marginBottom: "1.5rem" }}>
                    <h2 style={{ marginTop: "0.5rem" }}>Payroll Run & Calculations</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Review statutory deductions, check for onboarding blockers, and process payslip calculations.</p>
                </div>
                
                {showSourceBanner && (
                    <div style={{ backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB", borderLeft: "4px solid var(--primary-navy)", padding: "1rem 1.25rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "1.25rem" }}>ℹ️</span>
                            <span style={{ fontSize: "0.9rem", color: "#374151" }}>
                                Attendance is pulled automatically. Live punch from the Employee Portal takes priority. If an employee doesn't use punch-in, their client's uploaded timesheet is used instead. Approved leave days are never counted as Loss of Pay.
                            </span>
                        </div>
                        <button className="btn btn-secondary btn-xs" onClick={() => setShowSourceBanner(false)}>Dismiss</button>
                    </div>
                )}

                {/* Pre-Flight Validation Gates */}
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
                                    <div className="preflight-icon">{f.type === 'red' ? '❌' : '⚠️'}</div>
                                    <div className="preflight-content">
                                        <strong>{f.type === 'red' ? 'BLOCKER' : 'WARNING'}:</strong> {f.msg}
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

                {/* Client and Payout Month selection */}
                <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "250px" }}>
                        <label style={{ marginBottom: "0.25rem" }}>Target Client Contract</label>
                        <select className="form-control" value={clientId} onChange={e => handleClientChange(e.target.value)}>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.company_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "200px" }}>
                        <label style={{ marginBottom: "0.25rem" }}>Select Payout Month</label>
                        <select className="form-control" value={month} onChange={e => handleMonthChange(e.target.value)}>
                            <option value="2026-06-01">June 2026</option>
                            <option value="2026-05-01">May 2026</option>
                            <option value="2026-07-01">July 2026</option>
                        </select>
                    </div>
                    <div style={{ marginTop: "1.2rem" }}>
                        <button 
                            className="btn btn-navy" 
                            onClick={handleProcess}
                            disabled={run && (run.status === 'approved' || run.status === 'locked')}
                        >
                            {run ? 'Recalculate Run' : 'Calculate & Process'}
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div>
                                <h3 className="card-title">Calculation Summary</h3>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    {run ? (
                                        <strong>Status: <span style={{ textTransform: "uppercase" }}>{run.status}</span> | LOP computed based on calendar weekdays</strong>
                                    ) : (
                                        <strong>No calculations generated yet. Click "Calculate & Process" above.</strong>
                                    )}
                                </span>
                            </div>
                        </div>
                        <div>
                            <button className="btn btn-secondary btn-xs" style={{ marginRight: '0.5rem' }} onClick={() => setEarnVisible(!earnVisible)}>Toggle Earnings</button>
                            <button className="btn btn-secondary btn-xs" onClick={() => setDeductVisible(!deductVisible)}>Toggle Deductions</button>
                        </div>
                    </div>

                    <div className="table-scroll-wrapper">
                        <table className="data-table extended-table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Emp Code</th>
                                    <th rowSpan="2">Employee Name</th>
                                    <th rowSpan="2">Paid Days</th>
                                    {earnVisible && <th colSpan="7" className="col-group-earn">Earnings</th>}
                                    <th rowSpan="2" className="col-group-total">Gross Total</th>
                                    <th rowSpan="2" className="col-group-total" style={{ background: "#F8FAFC", color: "#475569" }}>Unpaid LOP <span style={{ fontWeight: "normal", fontSize: "0.75em", display: "block" }}>(Already Subtracted)</span></th>
                                    {deductVisible && <th colSpan="6" className="col-group-deduct">Deductions</th>}
                                    <th rowSpan="2" className="col-group-total">Total Deduct.</th>
                                    <th rowSpan="2" className="col-group-total" style={{ color: "var(--primary-navy)" }}>Net Pay</th>
                                    <th rowSpan="2">Status</th>
                                </tr>
                                <tr>
                                    {earnVisible && (
                                        <>
                                            <th className="col-group-earn">Basic</th>
                                            <th className="col-group-earn">HRA</th>
                                            <th className="col-group-earn">Conv.</th>
                                            <th className="col-group-earn">DA</th>
                                            <th className="col-group-earn">Med.</th>
                                            <th className="col-group-earn">Special</th>
                                            <th className="col-group-earn">Arrears</th>
                                        </>
                                    )}
                                    {deductVisible && (
                                        <>
                                            <th className="col-group-deduct">PF</th>
                                            <th className="col-group-deduct">ESI</th>
                                            <th className="col-group-deduct">PT</th>
                                            <th className="col-group-deduct">Welfare</th>
                                            <th className="col-group-deduct">TDS</th>
                                            <th className="col-group-deduct">Loan EMI</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {items && items.length > 0 ? (
                                    items.map((row) => {
                                        if (row.is_excluded) {
                                            return (
                                                <tr key={`ex-${row.id}`} style={{ opacity: 0.6, background: "#F8FAFC" }}>
                                                    <td>{row.employee_code}</td>
                                                    <td><strong>{row.full_name}</strong></td>
                                                    <td colSpan={earnVisible ? (deductVisible ? 19 : 12) : (deductVisible ? 11 : 4)} style={{ color: "var(--status-danger)", paddingLeft: "1.5rem" }}>
                                                        Excluded: {row.exclusion_reason}
                                                    </td>
                                                    <td><span className="badge badge-danger">Excluded</span></td>
                                                </tr>
                                            );
                                        }

                                        const itemDeductions = (parseFloat(row.employee_pf) + parseFloat(row.employee_esi) + parseFloat(row.professional_tax) + parseFloat(row.lwf_deduction) + parseFloat(row.tds_deduction) + parseFloat(row.loan_emi_deduction));

                                        return (
                                            <tr key={row.id}>
                                                <td>{row.employee_code}</td>
                                                <td><strong>{row.full_name}</strong></td>
                                                <td>{parseFloat(row.paid_days).toFixed(1)} days</td>
                                                
                                                {earnVisible && (
                                                    <>
                                                        <td>₹{parseFloat(row.basic_pay).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.hra).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.conveyance).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.da).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.medical_allowance).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.special_allowance).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.other_additions).toLocaleString()}</td>
                                                    </>
                                                )}
                                                
                                                <td className="col-group-total">₹{parseFloat(row.gross_total).toLocaleString()}</td>
                                                <td className="col-group-total" style={{ background: "#F8FAFC" }}>₹{parseFloat(row.lop_deduction).toLocaleString()}</td>
                                                
                                                {deductVisible && (
                                                    <>
                                                        <td>₹{parseFloat(row.employee_pf).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.employee_esi).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.professional_tax).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.lwf_deduction).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.tds_deduction).toLocaleString()}</td>
                                                        <td>₹{parseFloat(row.loan_emi_deduction).toLocaleString()}</td>
                                                    </>
                                                )}

                                                <td className="col-group-total">₹{itemDeductions.toLocaleString()}</td>
                                                <td className="col-group-total" style={{ color: "var(--primary-navy)", fontSize: "1.1em" }}>₹{parseFloat(row.net_pay).toLocaleString()}</td>
                                                <td><span className="badge badge-success">Processed</span></td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="22" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No payroll calculations run yet for this month. Choose client and click "Calculate & Process".</td></tr>
                                )}
                            </tbody>
                            {totals && (
                                <tfoot>
                                    <tr style={{ backgroundColor: "#F1F5F9", fontWeight: "bold", borderTop: "2px solid var(--border-color)" }}>
                                        <td colSpan="3" style={{ textAlign: "right" }}>GRAND TOTALS:</td>
                                        {earnVisible && (
                                            <>
                                                <td>₹{totals.basic.toLocaleString()}</td>
                                                <td>₹{totals.hra.toLocaleString()}</td>
                                                <td>₹{totals.conv.toLocaleString()}</td>
                                                <td>₹{totals.da.toLocaleString()}</td>
                                                <td>₹{totals.med.toLocaleString()}</td>
                                                <td>₹{totals.special.toLocaleString()}</td>
                                                <td>₹{totals.other.toLocaleString()}</td>
                                            </>
                                        )}
                                        <td className="col-group-total">₹{totals.gross.toLocaleString()}</td>
                                        <td className="col-group-total" style={{ background: "#F8FAFC" }}>₹{totals.lop.toLocaleString()}</td>
                                        
                                        {deductVisible && (
                                            <>
                                                <td>₹{totals.pf.toLocaleString()}</td>
                                                <td>₹{totals.esi.toLocaleString()}</td>
                                                <td>₹{totals.pt.toLocaleString()}</td>
                                                <td>—</td>
                                                <td>₹{totals.tds.toLocaleString()}</td>
                                                <td>₹{totals.loan.toLocaleString()}</td>
                                            </>
                                        )}
                                        
                                        <td className="col-group-total">₹{totals.totalDeduct.toLocaleString()}</td>
                                        <td className="col-group-total" style={{ color: "var(--primary-navy)", fontSize: "1.1em" }}>₹{totals.net.toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong>Active Processed:</strong> {activeItems.length} | <strong>Excluded:</strong> {excludedCount}
                        </div>
                        <div>
                            <Link href="/dashboard" className="btn btn-secondary" style={{ marginRight: '0.5rem' }}>Dashboard</Link>
                            {run && (run.status === 'draft') && (
                                <Link 
                                    href={`/payroll/approval?client_id=${clientId}&payroll_month=${month}`} 
                                    className="btn btn-primary"
                                    style={{ padding: "0.6rem 1.5rem" }}
                                >
                                    Proceed to Approvals & Lock →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
