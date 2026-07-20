import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import RoleGuard from '../../Components/RoleGuard.jsx';

// Simple numbers-to-words helper in English
function numberToEnglishWords(num) {
    if (num === 0) return 'zero';
    
    const a = [
        '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
    ];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    function g(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
    }

    function h(n) {
        if (n < 100) return g(n);
        const rest = n % 100;
        return a[Math.floor(n / 100)] + ' hundred' + (rest ? ' and ' + g(rest) : '');
    }

    function convert(n) {
        if (n < 1000) return h(n);
        const thousands = Math.floor(n / 1000);
        const rest = n % 1000;
        return h(thousands) + ' thousand' + (rest ? ' ' + h(rest) : '');
    }

    const words = convert(Math.floor(num));
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function Payslip({ items, clients = [], selectedClientId, selectedMonth }) {
    const [clientId, setClientId] = useState(selectedClientId || '');
    const [month, setMonth] = useState(selectedMonth || '2026-07-01');
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (items && items.length > 0) {
            setSelectedItem(items[0]);
        } else {
            setSelectedItem(null);
        }
    }, [items]);

    const handleClientChange = (newClientId) => {
        setClientId(newClientId);
        router.get(route('payroll.payslips'), { client_id: newClientId, payroll_month: month }, { preserveState: false });
    };

    const handleMonthChange = (newMonth) => {
        setMonth(newMonth);
        router.get(route('payroll.payslips'), { client_id: clientId, payroll_month: newMonth }, { preserveState: false });
    };

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

    const getWords = (net) => {
        try {
            const amount = Math.round(parseFloat(net || 0));
            return "Rupees " + numberToEnglishWords(amount) + " Only";
        } catch (e) {
            return `Rupees ${net} Only`;
        }
    };

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title="Payslips" />
                
                <style>{`
                    .payslip-container {
                        background-color: white;
                        border: 1px solid #CBD5E1;
                        padding: 2.5rem;
                        border-radius: var(--radius-sm);
                        margin-bottom: 2rem;
                    }
                    .payslip-header {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 2px solid var(--primary-navy);
                        padding-bottom: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    .payslip-title {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: var(--primary-navy);
                        text-transform: uppercase;
                    }
                    .payslip-meta-label {
                        color: var(--text-muted);
                        font-weight: 500;
                    }
                    .payslip-meta-val {
                        font-weight: 600;
                        color: var(--text-main);
                    }
                `}</style>

                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Employee Payslips Center</h2>
                        <p className="text-gray-500 text-sm">Review, print, or download finalized payslips from locked runs.</p>
                    </div>
                </div>

                {/* Client and Payout Month selection */}
                <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "250px" }}>
                            <label style={{ marginBottom: "0.25rem", display: "block", fontSize: "0.85rem", fontWeight: "bold" }}>Target Client Contract</label>
                            <select className="form-control" value={clientId} onChange={e => handleClientChange(e.target.value)}>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.company_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: "200px" }}>
                            <label style={{ marginBottom: "0.25rem", display: "block", fontSize: "0.85rem", fontWeight: "bold" }}>Select Payout Month</label>
                            <select className="form-control" value={month} onChange={e => handleMonthChange(e.target.value)}>
                                {getMonthOptions().map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {items && items.length > 0 && selectedItem ? (
                    <div className="grid grid-cols-[1fr_300px] gap-6 items-start">
                        {/* Payslip Print Preview */}
                        <div>
                            <div className="payslip-container">
                                <div className="payslip-header">
                                    <div>
                                        <div className="font-bold text-[1.2rem] text-[#1F3864]">TECLA AGENCY PRIVATE LIMITED</div>
                                        <div className="text-[0.75rem] text-gray-500">Mumbai, Maharashtra | GST: 27AABCM1234N1ZQ</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="payslip-title">Salary Payslip</div>
                                    </div>
                                </div>

                                {/* Employee Info */}
                                <div className="flex gap-8 bg-[#F8FAFC] p-6 rounded-md mb-6 border border-gray-200">
                                    <div className="flex-1 flex flex-col gap-3 text-[0.85rem]">
                                        <div className="flex justify-between"><span className="payslip-meta-label">Employee Code</span><span className="payslip-meta-val">{selectedItem.employee_code}</span></div>
                                        <div className="flex justify-between"><span className="payslip-meta-label">Designation</span><span className="payslip-meta-val">{selectedItem.designation || 'Staff'}</span></div>
                                        <div className="flex justify-between"><span className="payslip-meta-label">Bank Name</span><span className="payslip-meta-val">{selectedItem.bank_name || '—'}</span></div>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-3 text-[0.85rem]">
                                        <div className="flex justify-between"><span className="payslip-meta-label">Employee Name</span><span className="payslip-meta-val">{selectedItem.full_name}</span></div>
                                        <div className="flex justify-between"><span className="payslip-meta-label">Account No</span><span className="payslip-meta-val">{selectedItem.bank_account_number || '—'}</span></div>
                                        <div className="flex justify-between"><span className="payslip-meta-label">Actual Working Days</span><span className="payslip-meta-val">{parseFloat(selectedItem.paid_days).toFixed(1)}</span></div>
                                    </div>
                                </div>

                                {/* Earnings vs Deductions */}
                                <div className="flex gap-8 mb-8">
                                    <div className="flex-1">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="bg-[#1F3864] text-white p-2 border border-[#1F3864]">Components</th>
                                                    <th className="bg-[#1F3864] text-white p-2 text-right border border-[#1F3864]">Earned Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr><td className="p-2 border border-gray-200">1. Basic Pay</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.basic_pay).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">2. HRA</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.hra).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">3. Conveyance</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.conveyance).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">4. DA</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.da).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">5. Medical Allowance</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.medical_allowance).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">6. Special Allowance</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.special_allowance).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">7. Arrears / Other Additions</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.other_additions).toLocaleString()}</td></tr>
                                                <tr className="bg-[#F1F5F9] font-bold border-t-2 border-t-[#1F3864]">
                                                    <td className="p-2 border border-gray-200">Gross Total</td>
                                                    <td className="p-2 border border-gray-200 text-right text-[#1F3864]">₹{parseFloat(selectedItem.gross_total).toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex-1">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="bg-[#1F3864] text-white p-2 border border-[#1F3864]">Deductions</th>
                                                    <th className="bg-[#1F3864] text-white p-2 text-right border border-[#1F3864]">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr><td className="p-2 border border-gray-200">1. Employee PF</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.employee_pf).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">2. Employee ESIC</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.employee_esi).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">3. Professional Tax</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.professional_tax).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">4. Welfare Fund (LWF)</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.lwf_deduction).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">5. TDS</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.tds_deduction).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200">6. Loan EMI</td><td className="p-2 border border-gray-200 text-right font-semibold">₹{parseFloat(selectedItem.loan_emi_deduction).toLocaleString()}</td></tr>
                                                <tr><td className="p-2 border border-gray-200 text-gray-500">7. LOP Deduction <span className="text-[0.7rem] italic">(Informational)</span></td><td className="p-2 border border-gray-200 text-right font-semibold text-gray-500">₹{parseFloat(selectedItem.lop_deduction).toLocaleString()}</td></tr>
                                                <tr className="bg-[#FFF5F5] font-bold border-t-2 border-t-red-600">
                                                    <td className="p-2 border border-gray-200">Total Deductions</td>
                                                    <td className="p-2 border border-gray-200 text-right text-red-600">
                                                        ₹{(
                                                            parseFloat(selectedItem.employee_pf) + 
                                                            parseFloat(selectedItem.employee_esi) + 
                                                            parseFloat(selectedItem.professional_tax) + 
                                                            parseFloat(selectedItem.lwf_deduction) + 
                                                            parseFloat(selectedItem.tds_deduction) + 
                                                            parseFloat(selectedItem.loan_emi_deduction)
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Net Statement */}
                                <div className="bg-[#1F3864] text-white p-5 px-8 rounded-md flex justify-between items-center shadow-lg">
                                    <div className="text-[1.4rem] font-bold text-[#B8860B]">
                                        Net Pay Rs.{Math.round(parseFloat(selectedItem.net_pay)).toLocaleString('en-IN')}/-
                                    </div>
                                    <div className="text-[0.95rem] italic font-medium">
                                        ({getWords(selectedItem.net_pay)})
                                    </div>
                                </div>

                                {/* Employer Contributions & CTC */}
                                <div className="mt-8">
                                    <h4 className="text-[1.1rem] text-[#1F3864] mb-3 border-b border-gray-200 pb-2 font-bold uppercase">Employer Contributions</h4>
                                    <div className="flex gap-8">
                                        <div className="flex-1 bg-white border border-gray-200 rounded-md p-5 shadow-sm">
                                            <div className="flex flex-col gap-2 text-[0.85rem]">
                                                <div className="flex justify-between"><span className="payslip-meta-label">Employer PF Contribution</span><span className="payslip-meta-val">₹{parseFloat(selectedItem.employer_pf).toLocaleString()}</span></div>
                                                <div className="flex justify-between"><span className="payslip-meta-label">Employer ESI Contribution</span><span className="payslip-meta-val">₹{parseFloat(selectedItem.employer_esi).toLocaleString()}</span></div>
                                                <div className="flex justify-between"><span className="payslip-meta-label">Employer LWF Contribution</span><span className="payslip-meta-val">₹{parseFloat(selectedItem.employer_lwf).toLocaleString()}</span></div>
                                                <hr className="border-t border-gray-200 my-1" />
                                                <div className="flex justify-between font-bold">
                                                    <span className="text-[#1F3864]">Total Employer Cost</span>
                                                    <span>
                                                        ₹{(
                                                            parseFloat(selectedItem.employer_pf) + 
                                                            parseFloat(selectedItem.employer_esi) + 
                                                            parseFloat(selectedItem.employer_lwf)
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] rounded-md p-5 flex flex-col justify-center items-center">
                                            <div className="text-[0.9rem] font-bold text-gray-500 uppercase tracking-wider mb-1">Cost to Company (CTC)</div>
                                            <div className="text-[1.5rem] font-bold text-[#1F3864]">
                                                ₹{(
                                                    parseFloat(selectedItem.gross_total) + 
                                                    parseFloat(selectedItem.employer_pf) + 
                                                    parseFloat(selectedItem.employer_esi) + 
                                                    parseFloat(selectedItem.employer_lwf)
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center text-[0.85rem] font-medium text-gray-500 mt-10 border-t border-gray-200 pt-6">
                                    This is a computer generated Payslip. Hence, Signature is not required.
                                </div>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button variant="secondary" onClick={() => window.print()}>🖨 Print Payslip</Button>
                            </div>
                        </div>

                        {/* Sidebar Navigation */}
                        <div className="flex flex-col gap-6">
                            <div className="card">
                                <h3 className="text-lg font-bold text-[#1F3864] mb-4">Locked Payslips</h3>
                                
                                <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-1">
                                    {items.map((emp) => {
                                        const isActive = selectedItem && selectedItem.id === emp.id;
                                        return (
                                            <div 
                                                key={emp.id}
                                                className={`p-2 rounded-md border cursor-pointer transition-colors ${isActive ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'border-gray-200 hover:bg-gray-50'}`}
                                                onClick={() => setSelectedItem(emp)}
                                            >
                                                <div className="text-[0.85rem] font-bold text-gray-900">{emp.full_name}</div>
                                                <div className="text-[0.75rem] text-gray-500">Net: ₹{Math.round(parseFloat(emp.net_pay)).toLocaleString('en-IN')} ({emp.employee_code})</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No finalized payslips available for the selected client and month.
                    </div>
                )}
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
