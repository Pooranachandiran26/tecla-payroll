import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import axios from 'axios';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import { ArrowLeft, History, CheckCircle2, XCircle, Clock, TrendingUp, Calendar, FileText, Sparkles, Award, Mail, Send, AlertTriangle } from 'lucide-react';

export default function SalaryRevision({ employee, revisions }) {
    const { auth } = usePage().props;
    const emp = employee?.data || employee || {};

    const probationEndDate = emp.probation_end_date || emp.probationEndDate;
    const isUnderProbation = probationEndDate ? (new Date(probationEndDate) > new Date()) : false;

    const [emailModal, setEmailModal] = useState({ isOpen: false, revisionId: null, revision: null, subject: '', customNote: '', recipientEmail: '' });
    const [sendingEmail, setSendingEmail] = useState(false);

    const openEmailModal = (rev) => {
        const defaultSubject = rev.is_promotion 
            ? `🎉 Promotion & Salary Revision Letter - ${emp.full_name || 'Staff'}` 
            : `📈 Salary Revision Letter - ${emp.full_name || 'Staff'}`;
        const defaultRecipient = emp.personal_email || emp.user?.email || '';
        
        setEmailModal({
            isOpen: true,
            revisionId: rev.id,
            revision: rev,
            subject: defaultSubject,
            recipientEmail: defaultRecipient,
            customNote: ''
        });
    };

    const [rejectModal, setRejectModal] = useState({ isOpen: false, revisionId: null, reason: '' });
    const [rejecting, setRejecting] = useState(false);

    const [approveModal, setApproveModal] = useState({ isOpen: false, revisionId: null, revision: null });
    const [approving, setApproving] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        new_basic_pay: emp.basic_pay || 0,
        new_hra: emp.hra || 0,
        new_conveyance: emp.conveyance || 0,
        new_da: emp.da || 0,
        new_medical_allowance: emp.medical_allowance || 0,
        new_special_allowance: emp.special_allowance || 0,
        new_other_additions: emp.other_additions || 0,
        effective_date: new Date().toISOString().split('T')[0],
        reason_for_revision: 'appraisal',
        is_promotion: false,
        new_designation: '',
    });

    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    // Initial preview and debounced subsequent previews
    useEffect(() => {
        const timer = setTimeout(() => {
            calculatePreview();
        }, 500);
        return () => clearTimeout(timer);
    }, [
        data.new_basic_pay, data.new_hra, data.new_conveyance, 
        data.new_da, data.new_medical_allowance, data.new_special_allowance, 
        data.new_other_additions
    ]);

    const calculatePreview = async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        try {
            const res = await axios.post(route('employees.calculate-preview'), {
                client_id: emp.client_id,
                basic_pay: data.new_basic_pay,
                hra: data.new_hra,
                conveyance: data.new_conveyance,
                da: data.new_da,
                medical_allowance: data.new_medical_allowance,
                special_allowance: data.new_special_allowance,
                other_additions: data.new_other_additions,
                
                pf_applicable: emp.pf_applicable,
                esi_applicable: emp.esi_applicable,
                pt_applicable: emp.pt_applicable,
                lwf_applicable: emp.lwf_applicable,
                pt_deduction_override: emp.pt_deduction_override,
            });
            setPreview(res.data);
        } catch (error) {
            console.error(error);
            setPreviewError("Failed to calculate preview");
        } finally {
            setPreviewLoading(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('employees.salary-revision.store', employee.id));
    };

    const handleAction = (revisionId, action, reason = null) => {
        router.post(route('employees.salary-revision.approve', { id: employee.id, revisionId }), {
            action,
            rejection_reason: reason
        });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);
    };

    const reasonLabels = {
        appraisal: 'Annual Performance Appraisal',
        promotion: 'Role Promotion Adjustment',
        correction: 'Statutory Structure Correction',
        other: 'Other / Cost of Living Adjustment',
    };

    const calcCtcDelta = () => {
        if (!preview) return null;
        const currentCtc = parseFloat(emp.ctc_monthly || 0);
        const newCtc = parseFloat(preview.ctc_monthly || 0);
        const diff = newCtc - currentCtc;
        const pct = currentCtc > 0 ? ((diff / currentCtc) * 100).toFixed(1) : 0;
        return { diff, pct, isIncrease: diff >= 0 };
    };

    const delta = calcCtcDelta();

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title={`Salary Revision — ${emp.full_name || 'Staff'}`} />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                    
                    {/* Top Header Banner */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <Link 
                                href={route('employees.show', emp.id || 0)} 
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F3864] hover:text-[#B8860B] transition-colors mb-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to {emp.full_name || 'Staff'}'s Profile
                            </Link>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F3864] tracking-tight">Process Salary Revision</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Perform monthly CTC increments, salary component updates, or statutory corrections for <span className="font-semibold text-slate-700">{emp.full_name || 'Staff'}</span>.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 shrink-0">
                            <div className="w-11 h-11 rounded-full bg-[#1F3864]/10 text-[#1F3864] flex items-center justify-center font-bold text-lg">
                                {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : 'E'}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-[#1F3864]">{emp.full_name || 'Staff'}</div>
                                <div className="text-xs text-slate-500 mt-0.5">Code: <span className="font-semibold text-slate-700">{emp.employee_code || 'N/A'}</span> • {emp.designation || 'Staff'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Revision History Card */}
                    {revisions && revisions.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                                <History className="w-5 h-5 text-[#1F3864]" />
                                <h2 className="text-base font-bold text-[#1F3864]">Revision History Log</h2>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/70 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                            <th className="py-3.5 px-5">Date</th>
                                            <th className="py-3.5 px-5">Reason</th>
                                            <th className="py-3.5 px-5 text-right">Old CTC</th>
                                            <th className="py-3.5 px-5 text-right">New CTC</th>
                                            <th className="py-3.5 px-5 text-center">Status</th>
                                            <th className="py-3.5 px-5 text-center">Actions / Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {revisions.map(rev => (
                                            <tr key={rev.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-4 px-5 font-semibold text-slate-800 whitespace-nowrap">
                                                    {new Date(rev.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="py-4 px-5 font-medium text-slate-700 capitalize">
                                                    {reasonLabels[rev.reason_for_revision] || rev.reason_for_revision}
                                                </td>
                                                <td className="py-4 px-5 text-right font-semibold text-slate-600 whitespace-nowrap">
                                                    {formatCurrency(rev.old_ctc)}
                                                </td>
                                                <td className="py-4 px-5 text-right font-bold text-slate-900 whitespace-nowrap">
                                                    {formatCurrency(rev.new_ctc)}
                                                </td>
                                                <td className="py-4 px-5 text-center whitespace-nowrap">
                                                    {rev.status === 'approved' && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                                                        </span>
                                                    )}
                                                    {rev.status === 'rejected' && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <XCircle className="w-3.5 h-3.5" /> Rejected
                                                        </span>
                                                    )}
                                                    {rev.status === 'pending_approval' && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <Clock className="w-3.5 h-3.5" /> Pending Approval
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-5 text-center whitespace-nowrap">
                                                    {rev.status === 'pending_approval' && auth.user.role === 'admin' ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button 
                                                                type="button"
                                                                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#1F3864] hover:bg-[#162746] text-white font-bold text-xs rounded-md shadow-sm transition-all"
                                                                onClick={() => setApproveModal({ isOpen: true, revisionId: rev.id, revision: rev })}
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-md shadow-sm transition-all"
                                                                onClick={() => setRejectModal({ isOpen: true, revisionId: rev.id, reason: '' })}
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" /> Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="text-xs text-slate-500 italic">
                                                                {rev.status === 'rejected' ? `Reason: ${rev.rejection_reason || 'N/A'}` : (rev.approved_at ? `Resolved: ${new Date(rev.approved_at).toLocaleDateString('en-IN')}` : '—')}
                                                            </span>
                                                            {rev.status === 'approved' && (
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-md shadow-sm transition-all"
                                                                    onClick={() => openEmailModal(rev)}
                                                                    title="Send / Resend Promotion & Salary Revision Letter Email"
                                                                >
                                                                    <Mail className="w-3.5 h-3.5" /> Send Letter Mail
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Salary Structure Comparison & Form */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
                        <form onSubmit={submit} className="space-y-8">
                            
                            {/* Dual Salary Columns Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-start">
                                
                                {/* Current Active Structure (Read-Only) */}
                                <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200 space-y-5">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1F3864]">Current Salary Structure</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Active monthly breakdown</p>
                                        </div>
                                        <span className="text-xs font-bold tracking-wider uppercase bg-slate-200 text-slate-700 px-3 py-1 rounded-md">
                                            Current Active
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-white rounded-lg border border-slate-200/80 text-sm">
                                            <span className="text-slate-600 font-semibold">1. Basic Pay</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(emp.basic_pay)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-white rounded-lg border border-slate-200/80 text-sm">
                                            <span className="text-slate-600 font-semibold">2. HRA</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(emp.hra)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-white rounded-lg border border-slate-200/80 text-sm">
                                            <span className="text-slate-600 font-semibold">3. Conveyance</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(emp.conveyance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-white rounded-lg border border-slate-200/80 text-sm">
                                            <span className="text-slate-600 font-semibold">4. DA</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(emp.da)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-white rounded-lg border border-slate-200/80 text-sm">
                                            <span className="text-slate-600 font-semibold">5. Medical Allowance</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(emp.medical_allowance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-white rounded-lg border border-slate-200/80 text-sm">
                                            <span className="text-slate-600 font-semibold">6. Special Allowance</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(emp.special_allowance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-white rounded-lg border border-slate-200/80 text-sm">
                                            <span className="text-slate-600 font-semibold">7. Other Additions</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(emp.other_additions)}</span>
                                        </div>

                                        {/* Gross Monthly Total */}
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-slate-100 rounded-lg border border-slate-300 font-bold text-sm text-[#1F3864]">
                                            <span>Calculated Gross Earnings</span>
                                            <span>{formatCurrency(emp.gross_monthly_salary)}</span>
                                        </div>

                                        {/* Current Deductions Breakdown */}
                                        <div className="pt-2 border-t border-slate-200">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Deductions</div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center text-slate-600">
                                                    <span>• Employee PF (12%)</span>
                                                    <span className="font-semibold">{formatCurrency(emp.employee_pf_monthly)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600">
                                                    <span>• Employee ESIC (0.75%)</span>
                                                    <span className="font-semibold">{formatCurrency(emp.employee_esi_monthly)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600">
                                                    <span>• Professional Tax (PT)</span>
                                                    <span className="font-semibold">{formatCurrency(emp.pt_monthly)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1 font-bold text-rose-600 border-t border-slate-200">
                                                    <span>Total Employee Deductions</span>
                                                    <span>- {formatCurrency((emp.gross_monthly_salary || 0) - (emp.net_take_home_monthly || 0))}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Current Employer Contributions */}
                                        <div className="pt-2 border-t border-slate-200">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Employer Contributions</div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center text-slate-600 pl-2">
                                                    <span>• Employer EPF</span>
                                                    <span className="font-semibold">{formatCurrency(emp.pf_applicable ? (emp.employer_epf_monthly ?? 0) : 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 pl-2">
                                                    <span>• Employer EPS</span>
                                                    <span className="font-semibold">{formatCurrency(emp.pf_applicable ? (emp.employer_eps_monthly ?? 0) : 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 pl-2">
                                                    <span>• EDLI (0.5%)</span>
                                                    <span className="font-semibold">{emp.pf_applicable ? (emp.edli_exempted ? 'Exempted (₹0)' : formatCurrency(emp.edli_monthly ?? 0)) : formatCurrency(0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 pl-2">
                                                    <span>• EPF Admin Charges (0.5%)</span>
                                                    <span className="font-semibold">{formatCurrency(emp.pf_applicable ? (emp.epf_admin_monthly ?? 0) : 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-800 font-bold pt-1 border-t border-dashed border-slate-200">
                                                    <span>Total Employer PF & EPFO Charges</span>
                                                    <span className="text-[#1F3864]">{formatCurrency(emp.employer_pf_monthly)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 pt-1">
                                                    <span>• Employer ESIC (3.25%)</span>
                                                    <span className="font-semibold">{formatCurrency(emp.employer_esi_monthly)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <div className="bg-[#1F3864] text-white p-4 rounded-xl shadow-sm text-center">
                                            <div className="text-xs uppercase font-bold text-slate-300 tracking-wider">Net Take Home</div>
                                            <div className="text-xl sm:text-2xl font-extrabold text-[#B8860B] mt-1">
                                                {formatCurrency(emp.net_take_home_monthly)}
                                            </div>
                                        </div>
                                        <div className="bg-slate-200 text-slate-800 p-4 rounded-xl text-center">
                                            <div className="text-xs uppercase font-bold text-slate-600 tracking-wider">Monthly CTC</div>
                                            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                                                {formatCurrency(emp.ctc_monthly)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Proposed Salary Structure (Interactive Inputs) */}
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-6 border border-blue-200 space-y-5 shadow-sm">
                                    <div className="flex items-center justify-between pb-4 border-b border-blue-200/80">
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1F3864]">Proposed Revision Structure</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Adjust monthly components</p>
                                        </div>
                                        <span className="text-xs font-bold tracking-wider uppercase bg-blue-100 text-[#1F3864] px-3 py-1 rounded-md flex items-center gap-1.5 border border-blue-200">
                                            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" /> New Proposed
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">1. Basic Pay</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-sm">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 transition-all bg-white shadow-sm" 
                                                    value={data.new_basic_pay} 
                                                    onChange={e => setData('new_basic_pay', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                            {errors.new_basic_pay && <div className="text-xs text-rose-500 mt-1 font-medium">{errors.new_basic_pay}</div>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">2. HRA</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-sm">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 transition-all bg-white shadow-sm" 
                                                    value={data.new_hra} 
                                                    onChange={e => setData('new_hra', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">3. Conveyance</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-sm">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 transition-all bg-white shadow-sm" 
                                                    value={data.new_conveyance} 
                                                    onChange={e => setData('new_conveyance', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">4. DA</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-sm">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 transition-all bg-white shadow-sm" 
                                                    value={data.new_da} 
                                                    onChange={e => setData('new_da', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">5. Medical Allowance</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-sm">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 transition-all bg-white shadow-sm" 
                                                    value={data.new_medical_allowance} 
                                                    onChange={e => setData('new_medical_allowance', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">6. Special Allowance</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-sm">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 transition-all bg-white shadow-sm" 
                                                    value={data.new_special_allowance} 
                                                    onChange={e => setData('new_special_allowance', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">7. Other Additions</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-sm">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 transition-all bg-white shadow-sm" 
                                                    value={data.new_other_additions} 
                                                    onChange={e => setData('new_other_additions', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* New Proposed Gross Monthly Total */}
                                        <div className="flex justify-between items-center py-2.5 px-4 bg-blue-100/80 rounded-lg border border-blue-300 font-bold text-sm text-[#1F3864]">
                                            <span>New Gross Earnings</span>
                                            <span>{previewLoading ? 'Calculating...' : (preview ? formatCurrency(preview.gross_monthly_salary) : '—')}</span>
                                        </div>

                                        {/* Proposed Deductions Breakdown */}
                                        <div className="pt-2 border-t border-blue-200">
                                            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">New Proposed Deductions</div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center text-slate-700">
                                                    <span>• Employee PF (12%)</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? formatCurrency(preview.employee_pf_monthly) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-700">
                                                    <span>• Employee ESIC (0.75%)</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? formatCurrency(preview.employee_esi_monthly) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-700">
                                                    <span>• Professional Tax (PT)</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? formatCurrency(preview.pt_monthly) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1 font-bold text-rose-600 border-t border-blue-200">
                                                    <span>New Total Deductions</span>
                                                    <span>- {previewLoading ? '...' : (preview ? formatCurrency((preview.gross_monthly_salary || 0) - (preview.net_take_home_monthly || 0)) : '—')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Proposed Employer Contributions */}
                                        <div className="pt-2 border-t border-blue-200">
                                            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">New Employer Contributions</div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center text-slate-700 pl-2">
                                                    <span>• Employer EPF</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? formatCurrency(preview.employer_epf_monthly) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-700 pl-2">
                                                    <span>• Employer EPS</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? formatCurrency(preview.employer_eps_monthly) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-700 pl-2">
                                                    <span>• EDLI (0.5%)</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? (preview.edli_monthly === 0 ? 'Exempted (₹0)' : formatCurrency(preview.edli_monthly)) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-700 pl-2">
                                                    <span>• EPF Admin Charges (0.5%)</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? formatCurrency(preview.epf_admin_monthly) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t border-dashed border-blue-200">
                                                    <span>Total Employer PF & EPFO Charges</span>
                                                    <span className="text-[#1F3864]">{previewLoading ? '...' : (preview ? formatCurrency(preview.employer_pf_monthly) : '—')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-700 pt-1">
                                                    <span>• Employer ESIC (3.25%)</span>
                                                    <span className="font-semibold">{previewLoading ? '...' : (preview ? formatCurrency(preview.employer_esi_monthly) : '—')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <div className="bg-[#1F3864] text-white p-4 rounded-xl shadow border border-[#1F3864] text-center">
                                            <div className="text-xs uppercase font-bold text-slate-300 tracking-wider">New Net Take Home</div>
                                            <div className="text-xl sm:text-2xl font-extrabold text-[#B8860B] mt-1">
                                                {previewLoading ? 'Calculating...' : (preview ? formatCurrency(preview.net_take_home_monthly) : '—')}
                                            </div>
                                        </div>
                                        <div className="bg-white text-slate-900 p-4 rounded-xl border-2 border-dashed border-blue-300 text-center shadow-sm">
                                            <div className="text-xs uppercase font-bold text-[#1F3864] tracking-wider">New Monthly CTC</div>
                                            <div className="text-xl sm:text-2xl font-extrabold text-[#1F3864] mt-1">
                                                {previewLoading ? 'Calculating...' : (preview ? formatCurrency(preview.ctc_monthly) : '—')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Revision Delta Summary Banner */}
                            {preview && delta && (
                                <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                                    delta.isIncrease 
                                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                                        : 'bg-rose-50/90 border-rose-200 text-rose-900'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                            delta.isIncrease ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                        }`}>
                                            <TrendingUp className={`w-6 h-6 ${!delta.isIncrease ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-wider">
                                                Revision CTC Projection
                                            </div>
                                            <div className="text-base font-semibold mt-0.5">
                                                {formatCurrency(emp.ctc_monthly)} → <span className="font-extrabold underline">{formatCurrency(preview.ctc_monthly)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <span className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-bold ${
                                            delta.isIncrease ? 'bg-emerald-200/90 text-emerald-900' : 'bg-rose-200/90 text-rose-900'
                                        }`}>
                                            {delta.isIncrease ? '+' : ''}{formatCurrency(delta.diff)} / mo ({delta.pct}%)
                                        </span>
                                    </div>
                                </div>
                            )}

                             {/* Optional Promotion Toggle Section */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-[#1F3864] border-slate-300 rounded focus:ring-[#1F3864]" 
                                            checked={data.is_promotion} 
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                setData(prev => ({
                                                    ...prev,
                                                    is_promotion: checked,
                                                    reason_for_revision: checked ? 'promotion' : prev.reason_for_revision,
                                                    new_designation: checked ? prev.new_designation : ''
                                                }));
                                            }} 
                                        />
                                        <span className="text-sm font-bold text-slate-800">Is this a Promotion?</span>
                                        {isUnderProbation && (
                                            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 ml-2">
                                                ⚠️ Under Probation until {new Date(probationEndDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </label>
                                    {data.is_promotion && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                                            <Award className="w-3.5 h-3.5 text-purple-700 shrink-0" /> Promotion Tagged
                                        </span>
                                    )}
                                </div>

                                {data.is_promotion && isUnderProbation && (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 p-3.5 rounded-xl text-amber-900 text-xs">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-bold text-amber-950 text-xs uppercase tracking-wider">⚠️ Probation Period Warning</div>
                                            <div className="mt-1 leading-relaxed text-amber-900">
                                                This employee is currently under probation until <strong className="font-extrabold underline">{new Date(probationEndDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>. Promotion is restricted until the probation period ends.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {data.is_promotion && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Designation</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed" 
                                                value={emp.designation || 'Staff'} 
                                                readOnly 
                                                disabled 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                                New Designation <span className="text-rose-500">*</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className={`w-full px-3.5 py-2 text-sm font-semibold rounded-lg border ${errors.new_designation ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-[#1F3864] focus:ring-[#1F3864]/20'} bg-white transition-all shadow-sm`} 
                                                placeholder="e.g. Senior Software Engineer"
                                                value={data.new_designation} 
                                                onChange={e => setData('new_designation', e.target.value)} 
                                                required={data.is_promotion}
                                            />
                                            {errors.new_designation && <div className="text-xs text-rose-500 mt-1 font-semibold">{errors.new_designation}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Revision Parameters Form Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-[#1F3864]" /> Effective From Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 bg-white transition-all shadow-sm" 
                                        value={data.effective_date} 
                                        onChange={e => setData('effective_date', e.target.value)} 
                                        required 
                                        max={new Date().toISOString().split('T')[0]} 
                                    />
                                    {errors.effective_date && <div className="text-xs text-rose-500 mt-1 font-medium">{errors.effective_date}</div>}
                                    <p className="text-xs text-slate-400 mt-1">Effective date must be today or in the past.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-[#1F3864]" /> Reason for Revision <span className="text-rose-500">*</span>
                                    </label>
                                    <select 
                                        className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/20 bg-white transition-all shadow-sm" 
                                        value={data.reason_for_revision} 
                                        onChange={e => setData('reason_for_revision', e.target.value)}
                                    >
                                        <option value="appraisal">Annual Performance Appraisal</option>
                                        <option value="promotion">Role Promotion Adjustment</option>
                                        <option value="correction">Statutory Structure Correction</option>
                                        <option value="other">Other / Cost of Living Adjustment</option>
                                    </select>
                                </div>
                            </div>

                            {/* Bottom Action Footer */}
                            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                                <Link 
                                    href={route('employees.show', emp.id || 0)} 
                                    className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </Link>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2.5 text-sm font-bold text-white bg-[#1F3864] hover:bg-[#162746] rounded-lg shadow transition-all flex items-center gap-2 disabled:opacity-50" 
                                    disabled={processing}
                                >
                                    <Sparkles className="w-4 h-4 text-amber-300" />
                                    {processing ? 'Submitting...' : 'Submit for Approval'}
                                </button>
                            </div>

                        </form>
                    </div>

                </div>

                {/* Send Email Letter Confirmation & Edit Modal */}
                <ConfirmDialog
                    isOpen={emailModal.isOpen}
                    onClose={() => setEmailModal({ isOpen: false, revisionId: null, revision: null, subject: '', customNote: '', recipientEmail: '' })}
                    onConfirm={() => {
                        setSendingEmail(true);
                        router.post(
                            route('employees.salary-revision.send-email', { id: employee.id, revisionId: emailModal.revisionId }),
                            {
                                subject: emailModal.subject,
                                custom_note: emailModal.customNote,
                                recipient_email: emailModal.recipientEmail
                            },
                            {
                                onFinish: () => {
                                    setSendingEmail(false);
                                    setEmailModal({ isOpen: false, revisionId: null, revision: null, subject: '', customNote: '', recipientEmail: '' });
                                }
                            }
                        );
                    }}
                    title="Customize & Send Salary Revision Letter Email"
                    message={`Customize email subject and personal message before sending to ${emp.full_name || 'Staff'}.`}
                    confirmLabel="Send Email Letter"
                    cancelLabel="Cancel"
                    variant="primary"
                    loading={sendingEmail}
                >
                    {emailModal.revision && (
                        <div className="space-y-3 mt-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Recipient Email Address
                                </label>
                                <input
                                    type="email"
                                    className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-800"
                                    value={emailModal.recipientEmail}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, recipientEmail: e.target.value }))}
                                    placeholder="e.g. employee@company.com"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Email Subject Line
                                </label>
                                <input
                                    type="text"
                                    className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-800"
                                    value={emailModal.subject}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                                    placeholder="Enter email subject line..."
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Personal Message / Note from Management (Optional)</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Included in email body</span>
                                </label>
                                <textarea
                                    className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="3"
                                    placeholder="Add a personalized message or note for the staff member (e.g., Thank you for your leadership and great contributions!)..."
                                    value={emailModal.customNote}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, customNote: e.target.value }))}
                                ></textarea>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-600">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Revision Category:</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${emailModal.revision.is_promotion ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {emailModal.revision.is_promotion ? '🎉 Promotion & Salary Revision' : '📈 Salary Revision'}
                                    </span>
                                </div>
                                {emailModal.revision.is_promotion && (
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">New Designation:</span>
                                        <span className="font-bold text-purple-700">{emailModal.revision.new_designation || 'N/A'}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Revised Monthly CTC:</span>
                                    <span className="font-bold text-slate-900">{formatCurrency(emailModal.revision.new_ctc)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </ConfirmDialog>

                {/* Approve Confirmation Modal */}
                <ConfirmDialog
                    isOpen={approveModal.isOpen}
                    onClose={() => setApproveModal({ isOpen: false, revisionId: null, revision: null })}
                    onConfirm={() => {
                        setApproving(true);
                        router.post(
                            route('employees.salary-revision.approve', { id: employee.id, revisionId: approveModal.revisionId }),
                            { action: 'approve' },
                            {
                                onFinish: () => {
                                    setApproving(false);
                                    setApproveModal({ isOpen: false, revisionId: null, revision: null });
                                }
                            }
                        );
                    }}
                    title="Approve Salary Revision"
                    message={`Approve salary revision for ${emp.full_name || 'Staff'}? This will update their active compensation profile and automatically send the notification email.`}
                    confirmLabel="Approve & Send Mail"
                    cancelLabel="Cancel"
                    variant="primary"
                    loading={approving}
                >
                    {approveModal.revision && (
                        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-xs space-y-1.5 text-slate-700 mt-2">
                            <div className="flex justify-between">
                                <span className="font-semibold text-slate-600">New Monthly CTC:</span>
                                <span className="font-bold text-emerald-800">{formatCurrency(approveModal.revision.new_ctc)}</span>
                            </div>
                            {approveModal.revision.is_promotion && (
                                <div className="flex justify-between">
                                    <span className="font-semibold text-slate-600">Promoted Designation:</span>
                                    <span className="font-bold text-purple-700">{approveModal.revision.new_designation}</span>
                                </div>
                            )}
                        </div>
                    )}
                </ConfirmDialog>

                {/* Reject Confirmation Modal */}
                <ConfirmDialog
                    isOpen={rejectModal.isOpen}
                    onClose={() => setRejectModal({ isOpen: false, revisionId: null, reason: '' })}
                    onConfirm={() => {
                        if (!rejectModal.reason.trim()) {
                            alert('Please specify a reason for rejection.');
                            return;
                        }
                        setRejecting(true);
                        router.post(
                            route('employees.salary-revision.approve', { id: employee.id, revisionId: rejectModal.revisionId }),
                            {
                                action: 'reject',
                                rejection_reason: rejectModal.reason
                            },
                            {
                                onFinish: () => {
                                    setRejecting(false);
                                    setRejectModal({ isOpen: false, revisionId: null, reason: '' });
                                }
                            }
                        );
                    }}
                    title="Reject Salary Revision"
                    message={`Are you sure you want to reject the salary revision for ${emp.full_name || 'Staff'}?`}
                    confirmLabel="Confirm Rejection"
                    cancelLabel="Cancel"
                    variant="danger"
                    loading={rejecting}
                >
                    <div className="space-y-2 mt-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Rejection Reason (Required)
                        </label>
                        <textarea
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                            rows="3"
                            placeholder="Specify why this salary revision request is being rejected..."
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                        ></textarea>
                    </div>
                </ConfirmDialog>

            </AuthenticatedLayout>
        </RoleGuard>
    );
}
