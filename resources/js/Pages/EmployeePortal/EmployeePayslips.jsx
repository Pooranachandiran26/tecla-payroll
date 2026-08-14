import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function EmployeePayslips({ employee, payslips = [] }) {
    const [filterYear, setFilterYear] = useState('all');

    // Derive unique years from payslips
    const availableYears = useMemo(() => {
        const years = [...new Set(payslips.map(p => new Date(p.payroll_month).getFullYear()))];
        return years.sort((a, b) => b - a);
    }, [payslips]);

    const filteredPayslips = useMemo(() => {
        if (filterYear === 'all') return payslips;
        return payslips.filter(p => new Date(p.payroll_month).getFullYear() === parseInt(filterYear));
    }, [payslips, filterYear]);

    // SVG Icons
    const DownloadIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    );
    const FileTextIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    );
    const FilterIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
    );
    const CalendarIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    );
    const CheckCircleIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    );

    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
            <AuthenticatedLayout>
                <Head title="My Salary Payslips" />
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 className="text-xl font-bold text-gray-800">My Salary Payslips</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Download your released official PDF salary statements and tax receipts.
                    </p>
                </div>

                {/* Filter Bar */}
                {payslips.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-center shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                            <FilterIcon /> Filters
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><CalendarIcon /> Year</label>
                            <select 
                                className="form-control text-sm" 
                                value={filterYear} 
                                onChange={e => setFilterYear(e.target.value)}
                                style={{ minWidth: '120px', padding: '0.35rem 0.6rem' }}
                            >
                                <option value="all">All Years</option>
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="ml-auto text-xs text-gray-400">
                            Showing {filteredPayslips.length} of {payslips.length} payslip{payslips.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                )}

                {filteredPayslips.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    <th className="p-4">Payout Month</th>
                                    <th className="p-4">Paid Days</th>
                                    <th className="p-4">Gross Total</th>
                                    <th className="p-4">Total Deductions</th>
                                    <th className="p-4">Net Pay</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                                {filteredPayslips.map((item) => {
                                    const monthLabel = new Date(item.payroll_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                    const releasedDate = item.payslip_released_at ? new Date(item.payslip_released_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                                    const totalDeductions = parseFloat(item.employee_pf || 0) + parseFloat(item.employee_vpf || 0) + parseFloat(item.employee_esi || 0) + parseFloat(item.professional_tax || 0) + parseFloat(item.lwf_deduction || 0) + parseFloat(item.tds_deduction || 0) + parseFloat(item.loan_emi_deduction || 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-semibold text-gray-800">{monthLabel}</td>
                                            <td className="p-4 text-gray-600">{parseFloat(item.paid_days).toFixed(1)}</td>
                                            <td className="p-4 text-gray-700 font-medium">₹{parseFloat(item.gross_total).toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-red-600 font-medium">₹{totalDeductions.toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-emerald-700 font-bold">₹{Math.round(parseFloat(item.net_pay)).toLocaleString('en-IN')}</td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full font-medium">
                                                    <CheckCircleIcon /> Released {releasedDate}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <a 
                                                    href={`/employee/payslips/${item.id}/download`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F3864] hover:bg-[#162c50] text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                                                >
                                                    <DownloadIcon /> Download PDF
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
                        <div className="mb-3 flex justify-center"><FileTextIcon /></div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                            {payslips.length > 0 ? 'No Payslips Match Filters' : 'No Payslips Released Yet'}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            {payslips.length > 0 
                                ? 'Try adjusting your year filter to see other payslips.'
                                : 'Official payslip PDF files will appear here once monthly payroll is processed and released by your payroll administrator.'
                            }
                        </p>
                    </div>
                )}
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
