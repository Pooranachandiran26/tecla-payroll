import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Pagination from '../../Components/ui/Pagination';
import useToast from '../../Hooks/useToast';
import PayrollCorrectionModal from '../../Components/PayrollCorrectionModal';
import BatchPayrollCorrectionModal from '../../Components/BatchPayrollCorrectionModal';
import ConfirmDialog from '../../Components/ui/ConfirmDialog/ConfirmDialog';
import { Filter, Building2, Calendar, Users, Wrench, Zap, Send, Loader2, FileText, Search, IndianRupee } from 'lucide-react';
import './Payslip.css';
import { getMonthOptions, formatRupee, filterEmployees, resolveAccentColor } from './PayslipLogic';

// Searchable Client Dropdown Component
function SearchableClientDropdown({ clients, selectedClientId, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    const selectedClient = clients.find(c => String(c.id) === String(selectedClientId)) || clients[0];

    const filteredClients = clients.filter(c =>
        c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.client_code?.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="searchable-dropdown-wrapper">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="searchable-dropdown-trigger"
            >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '0.5rem' }}>
                    {selectedClient?.company_name || 'Select Client'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', flexShrink: 0 }}>▼</span>
            </button>

            {isOpen && (
                <div className="searchable-dropdown-menu">
                    <div style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search client..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.4rem 0.65rem',
                                fontSize: '0.82rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '5px',
                                outline: 'none',
                                background: '#ffffff'
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.2rem 0' }}>
                        {filteredClients.length > 0 ? (
                            filteredClients.map(c => {
                                const isSelected = String(c.id) === String(selectedClientId);
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            onChange(c.id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.85rem',
                                            fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? '#1d4ed8' : '#334155',
                                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <span>{c.company_name}</span>
                                        {c.client_code && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{c.client_code}</span>}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '0.65rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                                No clients found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

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

    const accentColor = resolveAccentColor(selectedItem, clientBranding);

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

    const filteredEmployees = filterEmployees(items?.data || [], searchQuery);

    return (
        <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="payroll">
            <AuthenticatedLayout>
                <Head title="Employee Payslips Center" />

                <div className="legacy-react-wrapper payslips-center-wrapper">
                    {/* Header Row */}
                    <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Employee Payslips Center</h2>
                            <p className="text-gray-500 text-[0.9rem]">Review, print, or download finalized payslips from locked runs.</p>
                        </div>
                        {lockedRun && items?.data?.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                <button className="payslip-action-btn" onClick={() => setShowSingleCorrectionModal(true)}>
                                    <Wrench size={13} /> Correct Single
                                </button>
                                <button className="payslip-action-btn blue" onClick={() => setShowBatchCorrectionModal(true)}>
                                    <Zap size={13} /> Batch Correct
                                </button>
                                <button
                                    className="payslip-action-btn primary"
                                    disabled={isReleasing}
                                    onClick={handleReleaseClick}
                                >
                                    {isReleasing ? (
                                        <><Loader2 className="animate-spin" size={13} /> Releasing...</>
                                    ) : (
                                        <><Send size={13} /> {lockedRun.payslip_released_at ? `Re-send${lockedRun.resend_count ? ` (${lockedRun.resend_count})` : ''}` : 'Release'}</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Split Layout */}
                    <div className="payslip-split-layout">
                        {/* ===== LEFT PANEL ===== */}
                        <div className="payslip-left-panel">
                            {/* Filters */}
                            <div className="payslip-filter-card">
                                <div className="payslip-filter-title">
                                    <Filter size={14} /> Filters
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label className="payslip-filter-label">
                                            <Building2 size={14} /> Client Contract
                                        </label>
                                        <SearchableClientDropdown
                                            clients={clients}
                                            selectedClientId={clientId}
                                            onChange={handleClientChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="payslip-filter-label">
                                            <Calendar size={14} /> Payout Month
                                        </label>
                                        <select
                                            className="form-control"
                                            value={month}
                                            onChange={e => handleMonthChange(e.target.value)}
                                            style={{ fontSize: '0.92rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                                        >
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
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                                <Users size={15} /> Employees
                                            </span>
                                            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                                                {filteredEmployees.length} of {items.total}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="emp-list-search">
                                        <div className="search-input-wrap">
                                            <Search size={14} />
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
                                                >
                                                    {isActive && <div className="emp-item-active-bar" />}
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isActive ? '#1d4ed8' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {emp.full_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                                                        <span>{emp.employee_code}</span>
                                                        <span style={{ opacity: 0.35 }}>|</span>
                                                        <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                                            {formatRupee(emp.net_pay)}
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
                                    <div className="payslip-empty-state">
                                        <FileText size={48} color="#94a3b8" />
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
                                <div className="payslip-empty-state">
                                    <FileText size={48} color="#94a3b8" />
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginTop: '0.75rem', marginBottom: '0.25rem' }}>No Payslip Selected</h3>
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '280px' }}>
                                        Select an employee from the list to preview their payslip here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Modals */}
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
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
