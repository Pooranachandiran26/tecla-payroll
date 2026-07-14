import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import axios from 'axios';
import { ArrowLeft, History, CheckCircle2, XCircle, Clock, TrendingUp, DollarSign, Calendar, FileText, Sparkles } from 'lucide-react';

export default function SalaryRevision({ employee, revisions }) {
    const { auth } = usePage().props;

    const { data, setData, post, processing, errors } = useForm({
        new_basic_pay: employee.basic_pay || 0,
        new_hra: employee.hra || 0,
        new_conveyance: employee.conveyance || 0,
        new_da: employee.da || 0,
        new_medical_allowance: employee.medical_allowance || 0,
        new_special_allowance: employee.special_allowance || 0,
        new_other_additions: employee.other_additions || 0,
        effective_date: new Date().toISOString().split('T')[0],
        reason_for_revision: 'appraisal',
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
                client_id: employee.client_id,
                basic_pay: data.new_basic_pay,
                hra: data.new_hra,
                conveyance: data.new_conveyance,
                da: data.new_da,
                medical_allowance: data.new_medical_allowance,
                special_allowance: data.new_special_allowance,
                other_additions: data.new_other_additions,
                
                pf_applicable: employee.pf_applicable,
                esi_applicable: employee.esi_applicable,
                pt_applicable: employee.pt_applicable,
                lwf_applicable: employee.lwf_applicable,
                pt_deduction_override: employee.pt_deduction_override,
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
        const currentCtc = parseFloat(employee.ctc_monthly || 0);
        const newCtc = parseFloat(preview.ctc_monthly || 0);
        const diff = newCtc - currentCtc;
        const pct = currentCtc > 0 ? ((diff / currentCtc) * 100).toFixed(1) : 0;
        return { diff, pct, isIncrease: diff >= 0 };
    };

    const delta = calcCtcDelta();

    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <AuthenticatedLayout>
                <Head title={`Salary Revision — ${employee.full_name}`} />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                    
                    {/* Top Header Banner */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <Link 
                                href={route('employees.show', employee.id)} 
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F3864] hover:text-[#B8860B] transition-colors mb-2"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to {employee.full_name}'s Profile
                            </Link>
                            <h1 className="text-2xl font-extrabold text-[#1F3864] tracking-tight">Process Salary Revision</h1>
                            <p className="text-xs text-slate-500 mt-1">
                                Configure monthly compensation adjustments, CTC increments, or statutory corrections for <span className="font-semibold text-slate-700">{employee.full_name}</span>.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 shrink-0">
                            <div className="w-10 h-10 rounded-full bg-[#1F3864]/10 text-[#1F3864] flex items-center justify-center font-bold text-base">
                                {employee.full_name ? employee.full_name.charAt(0).toUpperCase() : 'E'}
                            </div>
                            <div>
                                <div className="text-xs font-bold text-[#1F3864]">{employee.full_name}</div>
                                <div className="text-[0.7rem] text-slate-500">Code: <span className="font-mono font-semibold text-slate-700">{employee.employee_code || 'N/A'}</span> • {employee.designation || 'Staff'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Revision History Card */}
                    {revisions && revisions.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center gap-2">
                                <History className="w-4 h-4 text-[#1F3864]" />
                                <h2 className="text-sm font-bold text-[#1F3864] uppercase tracking-wider">Revision History Log</h2>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                                            <th className="py-3 px-6">Date</th>
                                            <th className="py-3 px-6">Reason</th>
                                            <th className="py-3 px-6 text-right">Old CTC</th>
                                            <th className="py-3 px-6 text-right">New CTC</th>
                                            <th className="py-3 px-6 text-center">Status</th>
                                            <th className="py-3 px-6 text-center">Actions / Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {revisions.map(rev => (
                                            <tr key={rev.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-6 font-medium text-slate-700 whitespace-nowrap">
                                                    {new Date(rev.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="py-3.5 px-6 font-medium text-slate-700 capitalize">
                                                    {reasonLabels[rev.reason_for_revision] || rev.reason_for_revision}
                                                </td>
                                                <td className="py-3.5 px-6 text-right font-mono text-slate-600">
                                                    {formatCurrency(rev.old_ctc)}
                                                </td>
                                                <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-900">
                                                    {formatCurrency(rev.new_ctc)}
                                                </td>
                                                <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                                    {rev.status === 'approved' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3" /> Approved
                                                        </span>
                                                    )}
                                                    {rev.status === 'rejected' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <XCircle className="w-3 h-3" /> Rejected
                                                        </span>
                                                    )}
                                                    {rev.status === 'pending_approval' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <Clock className="w-3 h-3" /> Pending Approval
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-6 text-center whitespace-nowrap">
                                                    {rev.status === 'pending_approval' && auth.user.role === 'admin' ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button 
                                                                type="button"
                                                                className="px-3 py-1 bg-[#1F3864] hover:bg-[#162746] text-white font-semibold text-[0.75rem] rounded shadow-sm transition-all"
                                                                onClick={() => handleAction(rev.id, 'approve')}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                className="px-3 py-1 bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold text-[0.75rem] rounded shadow-sm transition-all"
                                                                onClick={() => {
                                                                    const reason = prompt("Enter rejection reason:");
                                                                    if (reason) handleAction(rev.id, 'reject', reason);
                                                                }}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[0.75rem] text-slate-500 italic">
                                                            {rev.status === 'rejected' ? `Reason: ${rev.rejection_reason || 'N/A'}` : (rev.approved_at ? `Resolved: ${new Date(rev.approved_at).toLocaleDateString('en-IN')}` : '—')}
                                                        </span>
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
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                        <form onSubmit={submit} className="space-y-6">
                            
                            {/* Dual Salary Columns Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                
                                {/* Current Active Structure (Read-Only) */}
                                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                        <div>
                                            <h3 className="text-base font-bold text-[#1F3864]">Current Salary Structure</h3>
                                            <p className="text-[0.72rem] text-slate-500">Active monthly breakdown</p>
                                        </div>
                                        <span className="text-[0.65rem] uppercase font-extrabold tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                            Current Active
                                        </span>
                                    </div>

                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded border border-slate-200/70">
                                            <span className="text-slate-600 font-medium">1. Basic Pay</span>
                                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(employee.basic_pay)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded border border-slate-200/70">
                                            <span className="text-slate-600 font-medium">2. HRA</span>
                                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(employee.hra)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded border border-slate-200/70">
                                            <span className="text-slate-600 font-medium">3. Conveyance</span>
                                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(employee.conveyance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded border border-slate-200/70">
                                            <span className="text-slate-600 font-medium">4. DA</span>
                                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(employee.da)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded border border-slate-200/70">
                                            <span className="text-slate-600 font-medium">5. Medical Allowance</span>
                                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(employee.medical_allowance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded border border-slate-200/70">
                                            <span className="text-slate-600 font-medium">6. Special Allowance</span>
                                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(employee.special_allowance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded border border-slate-200/70">
                                            <span className="text-slate-600 font-medium">7. Other Additions</span>
                                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(employee.other_additions)}</span>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-[#1F3864] text-white p-3 rounded-lg shadow-sm text-center">
                                            <div className="text-[0.68rem] uppercase font-bold text-slate-300 tracking-wider">Net Take Home</div>
                                            <div className="text-base font-extrabold text-[#B8860B] mt-0.5 font-mono">
                                                {formatCurrency(employee.net_take_home_monthly)}
                                            </div>
                                        </div>
                                        <div className="bg-slate-200 text-slate-800 p-3 rounded-lg text-center">
                                            <div className="text-[0.68rem] uppercase font-bold text-slate-600 tracking-wider">Monthly CTC</div>
                                            <div className="text-base font-extrabold text-slate-900 mt-0.5 font-mono">
                                                {formatCurrency(employee.ctc_monthly)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Proposed Salary Structure (Interactive Inputs) */}
                                <div className="bg-gradient-to-br from-blue-50/40 to-indigo-50/20 rounded-xl p-5 border border-blue-200/80 space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between pb-3 border-b border-blue-200/80">
                                        <div>
                                            <h3 className="text-base font-bold text-[#1F3864]">Proposed Revision Structure</h3>
                                            <p className="text-[0.72rem] text-slate-500">Adjust monthly components</p>
                                        </div>
                                        <span className="text-[0.65rem] uppercase font-extrabold tracking-wider bg-blue-100 text-[#1F3864] px-2 py-0.5 rounded flex items-center gap-1 border border-blue-200">
                                            <Sparkles className="w-3 h-3 text-[#B8860B]" /> New Proposed
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">1. Basic Pay</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] transition-all bg-white" 
                                                    value={data.new_basic_pay} 
                                                    onChange={e => setData('new_basic_pay', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                            {errors.new_basic_pay && <div className="text-[0.7rem] text-rose-500 mt-0.5">{errors.new_basic_pay}</div>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">2. HRA</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] transition-all bg-white" 
                                                    value={data.new_hra} 
                                                    onChange={e => setData('new_hra', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">3. Conveyance</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] transition-all bg-white" 
                                                    value={data.new_conveyance} 
                                                    onChange={e => setData('new_conveyance', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">4. DA</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] transition-all bg-white" 
                                                    value={data.new_da} 
                                                    onChange={e => setData('new_da', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">5. Medical Allowance</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] transition-all bg-white" 
                                                    value={data.new_medical_allowance} 
                                                    onChange={e => setData('new_medical_allowance', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">6. Special Allowance</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] transition-all bg-white" 
                                                    value={data.new_special_allowance} 
                                                    onChange={e => setData('new_special_allowance', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">7. Other Additions</label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] transition-all bg-white" 
                                                    value={data.new_other_additions} 
                                                    onChange={e => setData('new_other_additions', e.target.value)} 
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-[#1F3864] text-white p-3 rounded-lg shadow border border-[#1F3864] text-center">
                                            <div className="text-[0.68rem] uppercase font-bold text-slate-300 tracking-wider">New Net Take Home</div>
                                            <div className="text-base font-extrabold text-[#B8860B] mt-0.5 font-mono">
                                                {previewLoading ? 'Calculating...' : (preview ? formatCurrency(preview.net_take_home_monthly) : '—')}
                                            </div>
                                        </div>
                                        <div className="bg-white text-slate-900 p-3 rounded-lg border-2 border-dashed border-blue-300 text-center shadow-sm">
                                            <div className="text-[0.68rem] uppercase font-bold text-[#1F3864] tracking-wider">New Monthly CTC</div>
                                            <div className="text-base font-extrabold text-[#1F3864] mt-0.5 font-mono">
                                                {previewLoading ? 'Calculating...' : (preview ? formatCurrency(preview.ctc_monthly) : '—')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Revision Delta Summary Banner */}
                            {preview && delta && (
                                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                                    delta.isIncrease 
                                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                                        : 'bg-rose-50/90 border-rose-200 text-rose-900'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                            delta.isIncrease ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                        }`}>
                                            <TrendingUp className={`w-5 h-5 ${!delta.isIncrease ? 'rotate-180' : ''}`} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-wider">
                                                Revision CTC Projection
                                            </div>
                                            <div className="text-sm font-semibold mt-0.5">
                                                {formatCurrency(employee.ctc_monthly)} → <span className="font-bold underline">{formatCurrency(preview.ctc_monthly)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                            delta.isIncrease ? 'bg-emerald-200/80 text-emerald-800' : 'bg-rose-200/80 text-rose-800'
                                        }`}>
                                            {delta.isIncrease ? '+' : ''}{formatCurrency(delta.diff)} / mo ({delta.pct}%)
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Revision Parameters Form Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-[#1F3864]" /> Effective From Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        className="w-full px-3 py-2 text-xs font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] bg-white transition-all" 
                                        value={data.effective_date} 
                                        onChange={e => setData('effective_date', e.target.value)} 
                                        required 
                                        max={new Date().toISOString().split('T')[0]} 
                                    />
                                    {errors.effective_date && <div className="text-[0.7rem] text-rose-500 mt-1">{errors.effective_date}</div>}
                                    <p className="text-[0.7rem] text-slate-400 mt-1">Effective date must be today or in the past.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-[#1F3864]" /> Reason for Revision <span className="text-rose-500">*</span>
                                    </label>
                                    <select 
                                        className="w-full px-3 py-2 text-xs font-medium rounded-md border border-slate-300 focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] bg-white transition-all" 
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
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                                <Link 
                                    href={route('employees.show', employee.id)} 
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </Link>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2 text-xs font-bold text-white bg-[#1F3864] hover:bg-[#162746] rounded-md shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50" 
                                    disabled={processing}
                                >
                                    {processing ? 'Submitting...' : '✅ Submit for Approval'}
                                </button>
                            </div>

                        </form>
                    </div>

                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
