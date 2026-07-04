import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './PayrollProcessing.css';

const AGENCY_SETTINGS = {
    requireFullKYC: true,
};

const CLIENT_SETTINGS = {
    mahindra: { lopBasis: 26, name: "Mahindra Corp" },
    tcs: { lopBasis: 30, name: "Tata Consultancy Services" }
};

const EMPLOYEES_DATA = [
    {
        id: "TEC-088", name: "Aarav Sharma", client: "mahindra",
        attendance: { livePunch: 24, manualUpload: null, leave: 2 },
        bankDetails: { account: "1234567890", ifsc: "HDFC0001234" },
        kycComplete: true, pendingBankChange: false, salaryRevision: null, loanEmi: 0,
        structure: { basic: 20000, hra: 10000, conv: 2000, da: 5000, med: 1000, special: 7000, other: 0 },
        esiTransitionActive: true, tdsTrueUp: true
    },
    {
        id: "TEC-121", name: "Neha Patil", client: "mahindra",
        attendance: { livePunch: null, manualUpload: null },
        bankDetails: { account: "0987654321", ifsc: "SBIN0001234" },
        kycComplete: true, pendingBankChange: false, salaryRevision: null, loanEmi: 0,
        structure: { basic: 15000, hra: 7000, conv: 2000, da: 3000, med: 1000, special: 4000, other: 0 }
    },
    {
        id: "TEC-168", name: "Vikram Rao", client: "mahindra",
        attendance: { livePunch: null, manualUpload: 26 },
        bankDetails: { account: null, ifsc: null },
        kycComplete: true, pendingBankChange: false, salaryRevision: null, loanEmi: 0,
        structure: { basic: 10000, hra: 4000, conv: 1000, da: 1000, med: 500, special: 2000, other: 0 }
    },
    {
        id: "TEC-142", name: "Karan Malhotra", client: "mahindra",
        attendance: { livePunch: 26, manualUpload: 20 },
        bankDetails: { account: "1122334455", ifsc: "ICIC0001234" },
        kycComplete: false, pendingBankChange: false, salaryRevision: null, loanEmi: 0,
        structure: { basic: 18000, hra: 9000, conv: 2000, da: 4000, med: 1000, special: 7000, other: 0 }
    },
    {
        id: "TEC-199", name: "Priya Singh", client: "mahindra",
        attendance: { livePunch: 26, manualUpload: null },
        bankDetails: { account: "5544332211", ifsc: "UTIB0001234" },
        kycComplete: true, pendingBankChange: true, salaryRevision: null, loanEmi: 0,
        structure: { basic: 22000, hra: 11000, conv: 2000, da: 5000, med: 1000, special: 9000, other: 0 }
    },
    {
        id: "TEC-205", name: "Rahul Verma", client: "mahindra",
        attendance: { livePunch: 26, manualUpload: null },
        bankDetails: { account: "9988776655", ifsc: "PUNB0001234" },
        kycComplete: true, pendingBankChange: false, loanEmi: 0, structure: null,
        salaryRevision: {
            effectiveDate: "16th June", daysOld: 15, daysNew: 11,
            oldStructure: { basic: 12000, hra: 6000, conv: 1000, da: 2000, med: 500, special: 3500, other: 0 },
            newStructure: { basic: 16000, hra: 8000, conv: 1000, da: 3000, med: 500, special: 4500, other: 0 }
        }
    },
    {
        id: "TEC-210", name: "Anita Desai", client: "mahindra",
        attendance: { livePunch: 26, manualUpload: null },
        bankDetails: { account: "1111222233", ifsc: "BKID0001234" },
        kycComplete: true, pendingBankChange: false, salaryRevision: null, loanEmi: 20000,
        structure: { basic: 15000, hra: 7000, conv: 2000, da: 3000, med: 1000, special: 2000, other: 0 }
    }
];

function getGross(struct) {
    if (!struct) return 0;
    return struct.basic + struct.hra + struct.conv + struct.da + struct.med + struct.special + struct.other;
}

export default function PayrollProcessing() {
    const [clientId, setClientId] = useState('mahindra');
    const [monthId, setMonthId] = useState('june');
    const [manualArrears, setManualArrears] = useState({});
    const [earnVisible, setEarnVisible] = useState(true);
    const [deductVisible, setDeductVisible] = useState(true);
    const [showSourceBanner, setShowSourceBanner] = useState(true);

    const handleArrearChange = (empId, amount, reason) => {
        setManualArrears(prev => {
            const current = prev[empId] || { amount: 0, reason: '' };
            return {
                ...prev,
                [empId]: {
                    amount: amount !== undefined ? (parseInt(amount) || 0) : current.amount,
                    reason: reason !== undefined ? reason : current.reason
                }
            };
        });
    };

    const useLastMonthSettings = () => {
        setClientId('mahindra');
        setMonthId('june');
        setManualArrears({
            "TEC-199": { amount: 1500, reason: "Recurring Perf. Bonus" }
        });
        alert("Settings and recurring arrears applied from last month!");
    };

    const engineData = useMemo(() => {
        const client = CLIENT_SETTINGS[clientId];
        if (!client) {
            return { error: "No configuration for this client.", rows: [], totals: null, preflightItems: [] };
        }

        const basis = client.lopBasis;
        let preflightItems = [];
        let hasRedFlags = false;
        let flaggedEmps = new Set();
        let rows = [];
        
        let totals = {
            basic: 0, hra: 0, conv: 0, da: 0, med: 0, special: 0, other: 0, arrears: 0, gross: 0,
            pf: 0, esi: 0, pt: 0, welfare: 0, lop: 0, tds: 0, loan: 0, totalDeduct: 0, net: 0
        };

        const clientEmployees = EMPLOYEES_DATA.filter(e => e.client === clientId);

        clientEmployees.forEach(emp => {
            let isExcluded = false;
            let empFlags = [];

            // 1. Attendance Check
            let presentDays = 0;
            if (emp.attendance.livePunch !== null) {
                presentDays = emp.attendance.livePunch;
                empFlags.push({ type: 'green', msg: `🟢 Live Punch: ${emp.name} — synced (${presentDays} days)`, tag: '🟢 Live Punch' });
            } else if (emp.attendance.manualUpload !== null) {
                presentDays = emp.attendance.manualUpload;
                empFlags.push({ type: 'amber', msg: `🔵 Uploaded: ${emp.name} — using manual timesheet upload (${presentDays} days)`, tag: '🔵 Uploaded' });
            } else {
                empFlags.push({ type: 'red', msg: `🔴 No Attendance: ${emp.name} — no attendance data found (no punches, no upload). Cannot process.`, tag: '🔴 No Attendance' });
                isExcluded = true;
                hasRedFlags = true;
            }

            if (emp.attendance.leave) {
                presentDays += emp.attendance.leave;
                empFlags.push({ type: 'amber', msg: `🟠 Leave Adjusted: ${emp.attendance.leave} approved leave days applied for ${emp.name}`, tag: '🟠 Leave Adjusted' });
            }

            // 2. Bank Details
            if (!emp.bankDetails.account || !emp.bankDetails.ifsc) {
                empFlags.push({ type: 'red', msg: `${emp.name} — missing bank details. Cannot disburse, excluded from this run.` });
                isExcluded = true;
                hasRedFlags = true;
            }

            // 3. KYC
            if (!emp.kycComplete) {
                if (AGENCY_SETTINGS.requireFullKYC) {
                    empFlags.push({ type: 'red', msg: `${emp.name} — KYC incomplete and strict policy is ON. Cannot process.` });
                    isExcluded = true;
                    hasRedFlags = true;
                } else {
                    empFlags.push({ type: 'amber', msg: `${emp.name} — KYC documents incomplete, processing anyway per policy.` });
                }
            }

            // 4. Pending Bank Change
            if (emp.pendingBankChange) {
                empFlags.push({ type: 'amber', msg: `${emp.name} has a pending bank change request — confirm which account to use for this disbursement.` });
            }

            // 5. Revision
            if (emp.salaryRevision) {
                empFlags.push({ type: 'amber', msg: `${emp.name} — salary revised mid-period (effective ${emp.salaryRevision.effectiveDate}). This run will calculate using BOTH the old and new structure, split by days, for the same month.` });
                if (emp.salaryRevision.newStructure.basic > 15000 && emp.salaryRevision.oldStructure.basic <= 15000) {
                    empFlags.push({ type: 'amber', msg: `${emp.name}'s Basic Pay change affects PF computation base — verify PF contribution logic before approving.` });
                }
            }

            if (emp.loanEmi > 0) {
                empFlags.push({ type: 'green', msg: `${emp.name} — Active Loan EMI of ₹${emp.loanEmi} pulled into deductions.` });
            }

            if (empFlags.some(f => f.type === 'red' || f.type === 'amber')) {
                flaggedEmps.add(emp.id);
            }

            preflightItems.push(...empFlags);

            if (isExcluded) {
                rows.push({ emp, isExcluded: true });
                return;
            }

            // Calc
            let renderEarn = { basic: 0, hra: 0, conv: 0, da: 0, med: 0, special: 0, other: 0 };
            let calculatedGross = 0;
            let splitData = null;

            if (emp.salaryRevision) {
                const rev = emp.salaryRevision;
                const oldGross = getGross(rev.oldStructure);
                const newGross = getGross(rev.newStructure);
                const oldComponentFactors = rev.daysOld / basis;
                const newComponentFactors = rev.daysNew / basis;

                for (let key in renderEarn) {
                    renderEarn[key] = Math.round((rev.oldStructure[key] * oldComponentFactors) + (rev.newStructure[key] * newComponentFactors));
                }
                calculatedGross = getGross(renderEarn);
                splitData = {
                    msg: `Mid-Cycle Split: ${rev.daysOld} days @ old rate (₹${oldGross}/mo) + ${rev.daysNew} days @ new rate (₹${newGross}/mo) = ₹${calculatedGross} this month base`
                };
            } else {
                renderEarn = { ...emp.structure };
                calculatedGross = getGross(renderEarn);
            }

            let arrearAmt = manualArrears[emp.id]?.amount || 0;
            let arrearReason = manualArrears[emp.id]?.reason || "";
            
            let lopDays = Math.max(0, basis - presentDays);
            let perDaySalary = calculatedGross / basis;
            let lopDeduction = Math.round(perDaySalary * lopDays);
            let finalGross = calculatedGross + arrearAmt;

            let pf = Math.min(renderEarn.basic, 15000) * 0.12;
            
            let esi = 0;
            if (finalGross <= 21000 || emp.esiTransitionActive) {
                esi = Math.ceil(finalGross * 0.0075);
                if (finalGross > 21000) {
                    preflightItems.push({ type: 'amber', msg: `ESI TRANSITION: ${emp.name} — Gross > ₹21k, but ESI continued (0.75%) due to active Contribution Period rule (ends Sep 30).` });
                    flaggedEmps.add(emp.id);
                }
            }

            let pt = 200;
            let welfare = 0;
            let tds = finalGross > 40000 ? Math.round(finalGross * 0.1) : 0;

            if (emp.tdsTrueUp) {
                let trueUpAdjustment = 3200;
                tds += trueUpAdjustment;
                preflightItems.push({ type: 'green', msg: `TDS TRUE-UP: ${emp.name} — Year-end/Exit true-up adjustment (+₹${trueUpAdjustment}) applied to TDS based on final tax declarations.` });
            }

            let statutoryDeductions = Math.round(pf + esi + pt + welfare + tds + lopDeduction);
            
            let maxAllowedDeduction = Math.floor(finalGross * 0.5);
            let actualLoanEmi = emp.loanEmi;
            let carryForward = 0;
            let capFlag = null;

            if ((statutoryDeductions + actualLoanEmi) > maxAllowedDeduction) {
                actualLoanEmi = Math.max(0, maxAllowedDeduction - statutoryDeductions);
                carryForward = emp.loanEmi - actualLoanEmi;
                capFlag = `Capped! ₹${carryForward} carried forward`;
                preflightItems.push({ type: 'amber', msg: `DEDUCTION CAP: ${emp.name} — Loan EMI partially deferred this cycle to stay within the 50% wage deduction cap. ₹${carryForward} carried forward to next month.` });
            }

            let totalDeductions = statutoryDeductions + actualLoanEmi;
            let netPay = finalGross - totalDeductions;

            totals.basic += renderEarn.basic; totals.hra += renderEarn.hra; totals.conv += renderEarn.conv;
            totals.da += renderEarn.da; totals.med += renderEarn.med; totals.special += renderEarn.special;
            totals.other += renderEarn.other; totals.arrears += arrearAmt; totals.gross += finalGross;
            totals.pf += pf; totals.esi += esi; totals.pt += pt; totals.welfare += welfare; 
            totals.lop += lopDeduction; totals.tds += tds; totals.loan += actualLoanEmi;
            totals.totalDeduct += totalDeductions; totals.net += netPay;

            rows.push({
                emp, isExcluded: false, presentDays, basis, renderEarn, arrearAmt, arrearReason, finalGross,
                pf: Math.round(pf), esi, pt, welfare, lopDeduction, tds, actualLoanEmi, capFlag,
                totalDeductions, netPay, empFlags, splitData
            });
        });

        if (preflightItems.length === 0) {
            preflightItems.push({ type: 'green', msg: `ALL CLEAR: All validations passed! Ready for processing.` });
        }

        let cleanCount = clientEmployees.length - flaggedEmps.size;
        let score = Math.round((cleanCount / clientEmployees.length) * 100) || 0;

        return {
            clientName: client.name,
            basis,
            rows,
            totals,
            preflightItems,
            hasRedFlags,
            score,
            cleanCount,
            totalCount: clientEmployees.length
        };

    }, [clientId, monthId, manualArrears]);

    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
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

                <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <div className="card-header" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--border-color)" }}>
                        <h3 className="card-title" style={{ margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>✈️ Pre-Flight Validation Gates</span>
                            <span className={`badge ${engineData.hasRedFlags ? 'badge-danger' : 'badge-success'}`}>
                                {engineData.hasRedFlags ? 'Blockers Found' : 'All Clear'}
                            </span>
                        </h3>
                    </div>
                    <div style={{ padding: "1rem" }}>
                        {engineData.preflightItems && engineData.preflightItems.map((f, i) => (
                            <div key={i} className={`preflight-item status-${f.type}`}>
                                <div className="preflight-icon">{f.type === 'red' ? '❌' : f.type === 'amber' ? '⚠️' : '✅'}</div>
                                <div className="preflight-content">
                                    <strong>{f.type === 'red' ? 'BLOCKER' : f.type === 'amber' ? 'WARNING' : 'INFO'}:</strong> {f.msg}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                    <button className="btn btn-secondary btn-xs" onClick={useLastMonthSettings}>🔄 Use Last Month's Settings</button>
                </div>

                <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "250px" }}>
                        <label style={{ marginBottom: "0.25rem" }}>Target Client Contract</label>
                        <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
                            <option value="mahindra">Mahindra Corp (42 Employees)</option>
                            <option value="tcs">Tata Consultancy Services (90 Employees)</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "200px" }}>
                        <label style={{ marginBottom: "0.25rem" }}>Select Payout Month</label>
                        <select className="form-control" value={monthId} onChange={e => setMonthId(e.target.value)}>
                            <option value="june">June 2026</option>
                            <option value="may">May 2026</option>
                        </select>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                        <button className="btn btn-navy" onClick={() => setManualArrears({...manualArrears})}>Recalculate Sheet</button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div>
                                <h3 className="card-title">Calculation Summary</h3>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    {engineData.error ? engineData.error : <strong>Active LOP Basis: Using {engineData.basis}-day basis for {engineData.clientName}</strong>}
                                </span>
                            </div>
                            {engineData.totals && (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "0.25rem 0.75rem", borderRadius: "50px", fontSize: "0.8rem", color: "#166534", fontWeight: 600 }}>
                                        <span style={{ width: "8px", height: "8px", backgroundColor: "#166534", borderRadius: "50%" }}></span>
                                        <span>{engineData.score}% Clean</span>
                                    </div>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{engineData.cleanCount} of {engineData.totalCount} employees checked out without manual review required.</span>
                                </>
                            )}
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
                                    {earnVisible && <th colSpan="8" className="col-group-earn">Earnings</th>}
                                    <th rowSpan="2" className="col-group-total">Gross Total</th>
                                    {deductVisible && <th colSpan="7" className="col-group-deduct">Deductions</th>}
                                    <th rowSpan="2" className="col-group-total">Total Deduct.</th>
                                    <th rowSpan="2" className="col-group-total" style={{ color: "var(--primary-navy)" }}>Net Pay</th>
                                    <th rowSpan="2">Flags</th>
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
                                            <th className="col-group-earn">Other</th>
                                            <th className="col-group-earn">Arrears</th>
                                        </>
                                    )}
                                    {deductVisible && (
                                        <>
                                            <th className="col-group-deduct">PF ℹ️</th>
                                            <th className="col-group-deduct">ESI ℹ️</th>
                                            <th className="col-group-deduct">PT ℹ️</th>
                                            <th className="col-group-deduct">Welfare</th>
                                            <th className="col-group-deduct">LOP ℹ️</th>
                                            <th className="col-group-deduct">TDS ℹ️</th>
                                            <th className="col-group-deduct">Loan EMI</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {engineData.rows && engineData.rows.length > 0 ? (
                                    engineData.rows.map((row, i) => {
                                        if (row.isExcluded) {
                                            return (
                                                <tr key={`ex-${row.emp.id}`} style={{ opacity: 0.5, background: "#F8FAFC" }}>
                                                    <td>{row.emp.id}</td>
                                                    <td><strong>{row.emp.name}</strong></td>
                                                    <td colSpan={earnVisible ? (deductVisible ? 19 : 12) : (deductVisible ? 11 : 4)} style={{ color: "var(--status-danger)", textAlign: "center" }}>
                                                        Excluded from Run due to Red Flags
                                                    </td>
                                                    <td><span className="badge badge-danger">Excluded</span></td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <React.Fragment key={row.emp.id}>
                                                <tr>
                                                    <td>{row.emp.id}</td>
                                                    <td><strong>{row.emp.name}</strong></td>
                                                    <td>{row.presentDays} / {row.basis}</td>
                                                    
                                                    {earnVisible && (
                                                        <>
                                                            <td>₹{row.renderEarn.basic}</td>
                                                            <td>₹{row.renderEarn.hra}</td>
                                                            <td>₹{row.renderEarn.conv}</td>
                                                            <td>₹{row.renderEarn.da}</td>
                                                            <td>₹{row.renderEarn.med}</td>
                                                            <td>₹{row.renderEarn.special}</td>
                                                            <td>₹{row.renderEarn.other}</td>
                                                            <td>
                                                                <input type="number" className="arrears-input form-control" value={row.arrearAmt} onChange={(e) => handleArrearChange(row.emp.id, e.target.value, undefined)} />
                                                                <input type="text" className="arrears-reason form-control" value={row.arrearReason} placeholder="Reason..." style={{ marginTop: "2px" }} onChange={(e) => handleArrearChange(row.emp.id, undefined, e.target.value)} />
                                                            </td>
                                                        </>
                                                    )}
                                                    
                                                    <td className="col-group-total">₹{row.finalGross}</td>
                                                    
                                                    {deductVisible && (
                                                        <>
                                                            <td>₹{row.pf}</td>
                                                            <td>{row.esi > 0 ? '₹'+row.esi : '—'}</td>
                                                            <td>₹{row.pt}</td>
                                                            <td>—</td>
                                                            <td style={row.lopDeduction > 0 ? { color: 'var(--status-danger)' } : {}}>₹{row.lopDeduction}</td>
                                                            <td>{row.tds > 0 ? '₹'+row.tds : '—'}</td>
                                                            <td style={{ maxWidth: "150px", whiteSpace: "normal" }}>
                                                                ₹{row.actualLoanEmi}
                                                                {row.capFlag && <><br /><span style={{ color: "var(--status-danger)", fontSize: "0.7rem", fontWeight: "bold" }}>{row.capFlag}</span></>}
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="col-group-total">₹{row.totalDeductions}</td>
                                                    <td className="col-group-total" style={{ color: "var(--primary-navy)", fontSize: "1.1em" }}>₹{row.netPay}</td>
                                                    <td>
                                                        {row.empFlags.filter(f => f.tag).map((f, i) => (
                                                            <div key={i} style={{ fontWeight: 500, fontSize: "0.8rem", marginBottom: "2px" }}>{f.tag}</div>
                                                        ))}
                                                        {row.emp.salaryRevision && <div style={{ marginTop: "4px" }}><span className="badge badge-warning">Split</span></div>}
                                                    </td>
                                                </tr>
                                                {row.splitData && (
                                                    <tr className="split-row">
                                                        <td colSpan="3"></td>
                                                        <td colSpan={earnVisible ? (deductVisible ? 19 : 12) : (deductVisible ? 11 : 4)}>
                                                            ↳ <em>{row.splitData.msg}</em>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="22" style={{ textAlign: "center", padding: "2rem" }}>No employees found for this client.</td></tr>
                                )}
                            </tbody>
                            {engineData.totals && (
                                <tfoot>
                                    <tr style={{ backgroundColor: "#F1F5F9", fontWeight: "bold", borderTop: "2px solid var(--border-color)" }}>
                                        <td colSpan="3" style={{ textAlign: "right" }}>GRAND TOTALS:</td>
                                        {earnVisible && (
                                            <>
                                                <td>₹{engineData.totals.basic}</td>
                                                <td>₹{engineData.totals.hra}</td>
                                                <td>₹{engineData.totals.conv}</td>
                                                <td>₹{engineData.totals.da}</td>
                                                <td>₹{engineData.totals.med}</td>
                                                <td>₹{engineData.totals.special}</td>
                                                <td>₹{engineData.totals.other}</td>
                                                <td>₹{engineData.totals.arrears}</td>
                                            </>
                                        )}
                                        <td className="col-group-total">₹{engineData.totals.gross}</td>
                                        
                                        {deductVisible && (
                                            <>
                                                <td>₹{Math.round(engineData.totals.pf)}</td>
                                                <td>₹{engineData.totals.esi}</td>
                                                <td>₹{engineData.totals.pt}</td>
                                                <td>₹{engineData.totals.welfare}</td>
                                                <td>₹{engineData.totals.lop}</td>
                                                <td>₹{engineData.totals.tds}</td>
                                                <td>₹{engineData.totals.loan}</td>
                                            </>
                                        )}
                                        
                                        <td className="col-group-total">₹{engineData.totals.totalDeduct}</td>
                                        <td className="col-group-total" style={{ color: "var(--primary-navy)", fontSize: "1.1em" }}>₹{engineData.totals.net}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong>Legend:</strong> <code>—</code> = Component Not Applicable. Red flags exclude employees.
                        </div>
                        <div>
                            <Link href="/employees" className="btn btn-secondary" style={{ marginRight: '0.5rem' }}>Cancel</Link>
                            <button 
                                className="btn btn-primary" 
                                style={{ padding: "0.6rem 1.5rem", opacity: engineData.hasRedFlags ? 0.5 : 1 }} 
                                disabled={engineData.hasRedFlags}
                                onClick={() => alert('Payroll processed successfully!')}
                            >
                                Process & Generate Batch Run
                            </button>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
