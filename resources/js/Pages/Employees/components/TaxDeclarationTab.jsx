import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';

export default function TaxDeclarationTab({ employee, taxDeclaration: decProp, taxComparison: compProp }) {
    const { auth } = usePage().props;
    const isStaff = ['admin', 'manager'].includes(auth?.user?.role);

    const declaration = decProp || {};
    const comparison = compProp || {};

    const [form, setForm] = useState({
        regime: declaration.regime || employee.tds_regime || 'new',
        ppf_amount: declaration.ppf_amount || 0,
        elss_amount: declaration.elss_amount || 0,
        life_insurance_premium: declaration.life_insurance_premium || 0,
        tuition_fees: declaration.tuition_fees || 0,
        nsc_amount: declaration.nsc_amount || 0,
        housing_loan_principal: declaration.housing_loan_principal || 0,
        other_80c: declaration.other_80c || 0,
        health_insurance_self: declaration.health_insurance_self || 0,
        health_insurance_parents: declaration.health_insurance_parents || 0,
        is_parents_senior: Boolean(declaration.is_parents_senior),
        home_loan_interest_self: declaration.home_loan_interest_self || 0,
        monthly_rent_paid: declaration.monthly_rent_paid || 0,
        landlord_name: declaration.landlord_name || '',
        landlord_pan: declaration.landlord_pan || '',
        landlord_address: declaration.landlord_address || '',
        is_metro_city: Boolean(declaration.is_metro_city),
        section_80e_education_loan: declaration.section_80e_education_loan || 0,
        section_80g_donations: declaration.section_80g_donations || 0,
        other_exemptions: declaration.other_exemptions || 0,
        previous_employer_gross: declaration.previous_employer_gross || 0,
        previous_employer_tds: declaration.previous_employer_tds || 0,
    });

    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (decProp) {
            setForm({
                regime: decProp.regime || 'new',
                ppf_amount: decProp.ppf_amount || 0,
                elss_amount: decProp.elss_amount || 0,
                life_insurance_premium: decProp.life_insurance_premium || 0,
                tuition_fees: decProp.tuition_fees || 0,
                nsc_amount: decProp.nsc_amount || 0,
                housing_loan_principal: decProp.housing_loan_principal || 0,
                other_80c: decProp.other_80c || 0,
                health_insurance_self: decProp.health_insurance_self || 0,
                health_insurance_parents: decProp.health_insurance_parents || 0,
                is_parents_senior: Boolean(decProp.is_parents_senior),
                home_loan_interest_self: decProp.home_loan_interest_self || 0,
                monthly_rent_paid: decProp.monthly_rent_paid || 0,
                landlord_name: decProp.landlord_name || '',
                landlord_pan: decProp.landlord_pan || '',
                landlord_address: decProp.landlord_address || '',
                is_metro_city: Boolean(decProp.is_metro_city),
                section_80e_education_loan: decProp.section_80e_education_loan || 0,
                section_80g_donations: decProp.section_80g_donations || 0,
                other_exemptions: decProp.other_exemptions || 0,
                previous_employer_gross: decProp.previous_employer_gross || 0,
                previous_employer_tds: decProp.previous_employer_tds || 0,
            });
        }
    }, [decProp]);

    const total80c = Number(form.ppf_amount) + Number(form.elss_amount) + Number(form.life_insurance_premium) + 
                     Number(form.tuition_fees) + Number(form.nsc_amount) + Number(form.housing_loan_principal) + Number(form.other_80c);
    const capped80c = Math.min(150000, total80c);

    const annualRent = Number(form.monthly_rent_paid) * 12;

    const handleSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(route('employees.tax-declarations.store', employee.id), form, {
            onFinish: () => setProcessing(false),
        });
    };

    const handleVerify = (status) => {
        let reason = null;
        if (status === 'rejected') {
            reason = prompt('Reason for rejection:');
            if (!reason) return;
        }

        if (confirm(`Are you sure you want to mark this declaration as ${status}?`)) {
            router.post(route('employees.tax-declarations.verify', { id: employee.id, declarationId: declaration.id }), {
                status: status,
                rejection_reason: reason,
            });
        }
    };

    const newReg = comparison.new_regime || {};
    const oldReg = comparison.old_regime || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header & Status Card */}
            <div className="card" style={{ background: '#F8FAFC', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🏛️</span> Income Tax Declaration &amp; TDS Preview (FY {comparison.financial_year || '2026-2027'})
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Sec 192 TDS auto-calculation based on verified investment proofs &amp; statutory slabs.
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {declaration.status === 'verified' && (
                            <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>✓ Verified &amp; Active</span>
                        )}
                        {declaration.status === 'submitted' && (
                            <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>⏳ Pending Verification</span>
                        )}
                        {declaration.status === 'rejected' && (
                            <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>✕ Rejected</span>
                        )}
                        {(!declaration.status || declaration.status === 'draft') && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>📝 Draft / Not Submitted</span>
                        )}

                        {isStaff && declaration.id && declaration.status === 'submitted' && (
                            <>
                                <button className="btn btn-success btn-xs" onClick={() => handleVerify('verified')}>✓ Approve</button>
                                <button className="btn btn-danger btn-xs" onClick={() => handleVerify('rejected')}>✕ Reject</button>
                            </>
                        )}
                    </div>
                </div>

                {declaration.status === 'rejected' && declaration.rejection_reason && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 'var(--radius-sm)', color: '#991B1B', fontSize: '0.8rem' }}>
                        <strong>Rejection Reason:</strong> {declaration.rejection_reason}
                    </div>
                )}
            </div>

            {/* Tax Regime Comparison Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* New Regime Card */}
                <div className="card" style={{ border: form.regime === 'new' ? '2px solid var(--primary-navy)' : '1px solid var(--border-color)', background: form.regime === 'new' ? '#F0F9FF' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '1rem', margin: 0, color: 'var(--primary-navy)' }}>New Tax Regime (Section 115BAC)</h4>
                        {form.regime === 'new' && <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Selected</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Annual Gross Income:</span>
                            <strong>₹{(newReg.annual_gross || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Standard Deduction:</span>
                            <strong style={{ color: 'var(--status-success)' }}>- ₹{(newReg.standard_deduction || 75000).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Section 87A Rebate:</span>
                            <strong style={{ color: 'var(--status-success)' }}>- ₹{(newReg.rebate_87a || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                            <strong>Projected Annual Tax:</strong>
                            <strong style={{ color: (newReg.total_annual_tax || 0) === 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                ₹{(newReg.total_annual_tax || 0).toLocaleString('en-IN')}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Old Regime Card */}
                <div className="card" style={{ border: form.regime === 'old' ? '2px solid var(--primary-navy)' : '1px solid var(--border-color)', background: form.regime === 'old' ? '#F0F9FF' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '1rem', margin: 0, color: 'var(--primary-navy)' }}>Old Tax Regime</h4>
                        {form.regime === 'old' && <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Selected</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Annual Gross Income:</span>
                            <strong>₹{(oldReg.annual_gross || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Std Ded + HRA + Chapter VI-A:</span>
                            <strong style={{ color: 'var(--status-success)' }}>- ₹{(oldReg.total_deductions || 50000).toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Section 87A Rebate:</span>
                            <strong style={{ color: 'var(--status-success)' }}>- ₹{(oldReg.rebate_87a || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                            <strong>Projected Annual Tax:</strong>
                            <strong style={{ color: (oldReg.total_annual_tax || 0) === 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                ₹{(oldReg.total_annual_tax || 0).toLocaleString('en-IN')}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Declaration Input Form */}
            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h4 style={{ fontSize: '1.05rem', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    1. Tax Regime Selection
                </h4>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                        <input type="radio" name="regime" value="new" checked={form.regime === 'new'} onChange={e => setForm(f => ({ ...f, regime: e.target.value }))} />
                        New Tax Regime (Sec 115BAC - Default)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                        <input type="radio" name="regime" value="old" checked={form.regime === 'old'} onChange={e => setForm(f => ({ ...f, regime: e.target.value }))} />
                        Old Tax Regime (Allows 80C, 80D, HRA &amp; 24b Exemptions)
                    </label>
                </div>

                <h4 style={{ fontSize: '1.05rem', margin: '1rem 0 0 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    2. Section 80C Investments (Max Limit: ₹1,50,000)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                        <label className="data-label">PPF (Public Provident Fund)</label>
                        <input type="number" min="0" className="form-control" value={form.ppf_amount} onChange={e => setForm(f => ({ ...f, ppf_amount: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">ELSS Mutual Funds</label>
                        <input type="number" min="0" className="form-control" value={form.elss_amount} onChange={e => setForm(f => ({ ...f, elss_amount: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">Life Insurance Premium</label>
                        <input type="number" min="0" className="form-control" value={form.life_insurance_premium} onChange={e => setForm(f => ({ ...f, life_insurance_premium: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">Children Tuition Fees</label>
                        <input type="number" min="0" className="form-control" value={form.tuition_fees} onChange={e => setForm(f => ({ ...f, tuition_fees: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">Housing Loan Principal</label>
                        <input type="number" min="0" className="form-control" value={form.housing_loan_principal} onChange={e => setForm(f => ({ ...f, housing_loan_principal: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">NSC / Other 80C</label>
                        <input type="number" min="0" className="form-control" value={form.other_80c} onChange={e => setForm(f => ({ ...f, other_80c: e.target.value }))} />
                    </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: total80c > 150000 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                    Total Declared 80C: <strong>₹{total80c.toLocaleString('en-IN')}</strong> | Eligible Capped Deduction: <strong>₹{capped80c.toLocaleString('en-IN')}</strong>
                </div>

                <h4 style={{ fontSize: '1.05rem', margin: '1rem 0 0 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    3. House Rent Allowance (HRA - Section 10(13A)) &amp; Home Loan
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                        <label className="data-label">Monthly Rent Paid (₹)</label>
                        <input type="number" min="0" className="form-control" value={form.monthly_rent_paid} onChange={e => setForm(f => ({ ...f, monthly_rent_paid: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">Landlord Name</label>
                        <input type="text" className="form-control" value={form.landlord_name} onChange={e => setForm(f => ({ ...f, landlord_name: e.target.value }))} placeholder="e.g. Ramesh Kumar" />
                    </div>
                    <div>
                        <label className="data-label">Landlord PAN {annualRent > 100000 && <span style={{ color: 'var(--status-danger)' }}>* (Mandatory &gt;1L/yr)</span>}</label>
                        <input type="text" maxLength="10" className="form-control" value={form.landlord_pan} onChange={e => setForm(f => ({ ...f, landlord_pan: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={form.is_metro_city} onChange={e => setForm(f => ({ ...f, is_metro_city: e.target.checked }))} />
                        Accommodation in Metro City (Mumbai, Delhi, Kolkata, Chennai - 50% Basic)
                    </label>
                </div>

                <h4 style={{ fontSize: '1.05rem', margin: '1rem 0 0 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    4. Section 80D Health Insurance &amp; Section 24b Home Loan
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                        <label className="data-label">Health Insurance (Self/Family - Max ₹25,000)</label>
                        <input type="number" min="0" className="form-control" value={form.health_insurance_self} onChange={e => setForm(f => ({ ...f, health_insurance_self: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">Health Insurance (Parents - Max ₹25k/50k)</label>
                        <input type="number" min="0" className="form-control" value={form.health_insurance_parents} onChange={e => setForm(f => ({ ...f, health_insurance_parents: e.target.value }))} />
                    </div>
                    <div>
                        <label className="data-label">Sec 24b Home Loan Interest (Max ₹2,00,000)</label>
                        <input type="number" min="0" className="form-control" value={form.home_loan_interest_self} onChange={e => setForm(f => ({ ...f, home_loan_interest_self: e.target.value }))} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-navy" disabled={processing}>
                        {processing ? 'Saving...' : '💾 Submit Tax Declaration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
