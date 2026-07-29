import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';

import useToast from '../../Hooks/useToast';
import PayrollCorrectionModal from '../../Components/PayrollCorrectionModal';
import BatchPayrollCorrectionModal from '../../Components/BatchPayrollCorrectionModal';
import ConfirmDialog from '../../Components/ui/ConfirmDialog/ConfirmDialog';

// SVG Icons
const Icons = {
    Filter: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    Building: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    User: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Wrench: () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Printer: () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Loader: () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    IndianRupee: () => <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13l8.5 8"/><path d="M6 13h3c3.5 0 6-2.5 6-5H6"/></svg>,
};

export default function Payslip({ items, clients = [], selectedClientId, selectedMonth, clientBranding, lockedRun }) {
    const { showToast } = useToast();
    const [isReleasing, setIsReleasing] = useState(false);
    const [showSingleCorrectionModal, setShowSingleCorrectionModal] = useState(false);
    const [showBatchCorrectionModal, setShowBatchCorrectionModal] = useState(false);
    const [clientId, setClientId] = useState(selectedClientId || '');
    const [month, setMonth] = useState(selectedMonth || '2026-07-01');
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showConfirmResend, setShowConfirmResend] = useState(false);

    const handleExecuteRelease = () => {
        setIsReleasing(true);
        setShowConfirmResend(false);
        router.post(route('payroll.run.release-payslips', lockedRun.id), {}, {
            onFinish: () => setIsReleasing(false),
            onSuccess: () => showToast({ type: 'success', title: 'Success', message: 'Official PDF payslips released & emailed to employees.' }),
            onError: (errs) => showToast({ type: 'error', title: 'Error', message: errs.error || 'Failed to release payslips.' })
        });
    };

    const handleReleaseClick = () => {
        if (lockedRun?.payslip_released_at) {
            setShowConfirmResend(true);
        } else {
            handleExecuteRelease();
        }
    };

    const { branding } = usePage().props;

    // Resolve accent color
    let accentColor = "#1F3864";
    if (selectedItem?.employment_model === 'eor' && clientBranding?.accent_color) {
        accentColor = clientBranding.accent_color;
    }

    useEffect(() => {
        if (items && items.data && items.data.length > 0) {
            setSelectedItem(items.data[0]);
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
        const startDate = new Date(2026, 4, 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2);
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

    // Filter employees by search
    const filteredEmployees = items?.data?.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title="Payslips" />
                
                <style>{`
                    .payslip-split-layout {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1.25rem;
                        height: calc(100vh - 160px);
                        min-height: 600px;
                    }
                    .payslip-left-panel {
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                        overflow: hidden;
                    }
                    .payslip-right-panel {
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    }
                    .payslip-right-panel iframe {
                        flex: 1;
                        width: 100%;
                        border: none;
                        background: #ffffff;
                    }
                    .filter-card {
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 1rem;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    }
                    .emp-list-card {
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        min-height: 0;
                        overflow: hidden;
                    }
                    .emp-list-header {
                        padding: 0.85rem 1rem 0.65rem;
                        border-bottom: 1px solid #f1f5f9;
                        flex-shrink: 0;
                    }
                    .emp-list-search {
                        padding: 0 0.75rem 0.65rem;
                        flex-shrink: 0;
                    }
                    .emp-list-scroll {
                        flex: 1;
                        overflow-y: auto;
                        padding: 0 0.5rem 0.5rem;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0.35rem;
                        align-content: start;
                    }
                    .emp-list-scroll::-webkit-scrollbar { width: 5px; }
                    .emp-list-scroll::-webkit-scrollbar-track { background: transparent; }
                    .emp-list-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    .emp-list-footer {
                        padding: 0.65rem 0.75rem;
                        border-top: 1px solid #f1f5f9;
                        flex-shrink: 0;
                    }
                    .emp-item {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.5rem 0.55rem;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        border: 1.5px solid transparent;
                    }
                    .emp-item:hover {
                        background: #f8fafc;
                        border-color: #e2e8f0;
                    }
                    .emp-item.active {
                        background: #eff6ff;
                        border-color: #93c5fd;
                    }
                    .emp-avatar {
                        width: 34px;
                        height: 34px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: 0.75rem;
                        color: #ffffff;
                        flex-shrink: 0;
                        text-transform: uppercase;
                    }
                    .actions-card {
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 0.75rem;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                        flex-shrink: 0;
                    }
                    .action-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.4rem;
                        padding: 0.5rem 0.75rem;
                        border-radius: 7px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        border: 1px solid #e2e8f0;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        background: #ffffff;
                        color: #374151;
                        white-space: nowrap;
                    }
                    .action-btn:hover { background: #f1f5f9; }
                    .action-btn.primary {
                        background: #059669;
                        color: #ffffff;
                        border-color: #059669;
                    }
                    .action-btn.primary:hover { background: #047857; }
                    .action-btn.blue {
                        background: #3B82F6;
                        color: #ffffff;
                        border-color: #3B82F6;
                    }
                    .action-btn.blue:hover { background: #2563eb; }
                    .search-input-wrap {
                        position: relative;
                    }
                    .search-input-wrap svg {
                        position: absolute;
                        left: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: #94a3b8;
                    }
                    .search-input-wrap input {
                        width: 100%;
                        padding: 0.45rem 0.65rem 0.45rem 2rem;
                        border: 1px solid #e2e8f0;
                        border-radius: 7px;
                        font-size: 0.8rem;
                        color: #334155;
                        background: #f8fafc;
                        outline: none;
                        transition: border-color 0.15s;
                    }
                    .search-input-wrap input:focus {
                        border-color: #93c5fd;
                        background: #ffffff;
                    }
                    .empty-state {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        padding: 3rem;
                        text-align: center;
                    }
                    @media (max-width: 900px) {
                        .payslip-split-layout {
                            grid-template-columns: 1fr;
                            height: auto;
                        }
                        .payslip-right-panel {
                            min-height: 700px;
                        }
                    }
                `}</style>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1F3864', marginBottom: '0.15rem' }}>Employee Payslips Center</h2>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Review, print, or download finalized payslips from locked runs.</p>
                    </div>
                    {lockedRun && items?.data?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <button className="action-btn" onClick={() => setShowSingleCorrectionModal(true)}>
                                <Icons.Wrench /> Correct Single
                            </button>
                            <button className="action-btn blue" onClick={() => setShowBatchCorrectionModal(true)}>
                                <Icons.Zap /> Batch Correct
                            </button>
                            <button 
                                className="action-btn primary"
                                disabled={isReleasing}
                                onClick={handleReleaseClick}
                            >
                                {isReleasing ? <><Icons.Loader /> Releasing...</> : <><Icons.Send /> {lockedRun.payslip_released_at ? `Re-send${lockedRun.resend_count ? ` (${lockedRun.resend_count})` : ''}` : 'Release'}</>}
                            </button>
                        </div>
                    )}
                </div>

                <div className="payslip-split-layout">
                    {/* ===== LEFT PANEL ===== */}
                    <div className="payslip-left-panel">
                        {/* Filters */}
                        <div className="filter-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <Icons.Filter /> Filters
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                                        <Icons.Building /> Client Contract
                                    </label>
                                    <select className="form-control" value={clientId} onChange={e => handleClientChange(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.company_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>
                                        <Icons.Calendar /> Payout Month
                                    </label>
                                    <select className="form-control" value={month} onChange={e => handleMonthChange(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}>
                                        {getMonthOptions().map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Employee List */}
                        {items && items.data && items.data.length > 0 ? (
                            <div className="emp-list-card">
                                <div className="emp-list-header">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                            <Icons.Users /> Employees
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                                            {filteredEmployees.length} of {items.total}
                                        </span>
                                    </div>
                                </div>

                                <div className="emp-list-search">
                                    <div className="search-input-wrap">
                                        <Icons.Search />
                                        <input
                                            type="text"
                                            placeholder="Search by name or code..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="emp-list-scroll">
                                    {filteredEmployees.map((emp) => {
                                        const isActive = selectedItem && selectedItem.id === emp.id;
                                        return (
                                            <div
                                                key={emp.id}
                                                className={`emp-item ${isActive ? 'active' : ''}`}
                                                onClick={() => setSelectedItem(emp)}
                                                style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.15rem', position: 'relative', paddingLeft: isActive ? '0.75rem' : '0.55rem' }}
                                            >
                                                {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', borderRadius: '2px', background: '#3b82f6' }} />}
                                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.full_name}</div>
                                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <span>{emp.employee_code}</span>
                                                    <span style={{ opacity: 0.35 }}>|</span>
                                                    <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                                        <Icons.IndianRupee />
                                                        {Math.round(parseFloat(emp.net_pay)).toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredEmployees.length === 0 && (
                                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', gridColumn: '1 / -1' }}>
                                            No employees match your search.
                                        </div>
                                    )}
                                </div>

                                <div className="emp-list-footer">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                            Showing {items.from || 0}–{items.to || 0} of {items.total}
                                        </span>
                                        {items.last_page > 1 && (
                                            <Pagination
                                                currentPage={items.current_page}
                                                totalPages={items.last_page}
                                                totalItems={items.total}
                                                itemsPerPage={items.per_page}
                                                onPageChange={(page) => {
                                                    const params = new URLSearchParams(window.location.search);
                                                    params.set('page', page);
                                                    window.location.search = params.toString();
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="emp-list-card">
                                <div className="empty-state">
                                    <Icons.FileText />
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginTop: '0.75rem', marginBottom: '0.25rem' }}>No Locked Payslips</h3>
                                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '220px' }}>Select a client and month with a locked payroll run to view payslips.</p>
                                </div>
                            </div>
                        )}


                    </div>

                    {/* ===== RIGHT PANEL — PAYSLIP PREVIEW ===== */}
                    <div className="payslip-right-panel">
                        {selectedItem ? (
                            <iframe
                                src={`/admin/payslip-templates/preview?client_id=${clientId}&item_id=${selectedItem.id}&template=${clientBranding?.payslip_template || 'standard'}&accent_color=${encodeURIComponent(accentColor)}&t=${Date.now()}`}
                                title="Employee Payslip Preview"
                            />
                        ) : (
                            <div className="empty-state">
                                <Icons.FileText />
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginTop: '0.75rem', marginBottom: '0.25rem' }}>No Payslip Selected</h3>
                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '280px' }}>
                                    Select an employee from the list to preview their payslip here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <PayrollCorrectionModal 
                    isOpen={showSingleCorrectionModal} 
                    onClose={() => setShowSingleCorrectionModal(false)} 
                    parentRun={lockedRun} 
                    items={items?.data || []} 
                />

                <BatchPayrollCorrectionModal 
                    isOpen={showBatchCorrectionModal} 
                    onClose={() => setShowBatchCorrectionModal(false)} 
                    parentRun={lockedRun} 
                    items={items?.data || []} 
                />

                <ConfirmDialog
                    isOpen={showConfirmResend}
                    onClose={() => setShowConfirmResend(false)}
                    onConfirm={handleExecuteRelease}
                    title="Confirm Re-send Payslips"
                    message={`Payslips for this month have already been emailed to employees${lockedRun?.resend_count ? ` ${lockedRun.resend_count} time(s)` : ''}. Are you sure you want to RE-SEND official PDF payslips to all employees again?`}
                    confirmLabel="Yes, Re-send Payslips"
                    cancelLabel="Cancel"
                    variant="warning"
                    loading={isReleasing}
                />
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
