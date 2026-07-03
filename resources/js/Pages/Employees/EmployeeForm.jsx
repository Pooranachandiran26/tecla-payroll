import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import './EmployeeForm.css';
import RoleGuard from '../../Components/RoleGuard.jsx';

const CLIENT_STATUTORY_DEFAULTS = {
  mahindra: {
    name: "Mahindra Corp", contractType: "agency_payroll", pfApplicable: true, pfCeiling: 15000,
    esiApplicable: true, esiLimit: 21000, esiContributionPeriodEnd: '2026-09-30', ptApplicable: true, ptBasis: "auto",
    lwfApplicable: true, lwfFrequency: "annual", tdsRegime: "new", gratuityMode: "part_of_ctc", statutoryBonusApplicable: true, bonusRate: 8.33, lopBasis: "26_days"
  },
  tcs: {
    name: "Tata Consultancy Services — EOR", contractType: "eor", pfApplicable: true, pfCeiling: 15000,
    esiApplicable: false, esiLimit: 21000, esiContributionPeriodEnd: '2026-09-30', ptApplicable: true, ptBasis: "auto",
    lwfApplicable: false, lwfFrequency: "annual", tdsRegime: "old", gratuityMode: "over_and_above", statutoryBonusApplicable: false, bonusRate: 8.33, lopBasis: "30_days"
  },
  tcs_agency: {
    name: "Tata Consultancy Services — Agency", contractType: "agency_payroll", pfApplicable: true, pfCeiling: 15000,
    esiApplicable: true, esiLimit: 21000, esiContributionPeriodEnd: '2026-09-30', ptApplicable: true, ptBasis: "auto",
    lwfApplicable: true, lwfFrequency: "annual", tdsRegime: "old", gratuityMode: "part_of_ctc", statutoryBonusApplicable: true, bonusRate: 8.33, lopBasis: "30_days"
  },
  reliance: {
    name: "Reliance Digital", contractType: "hybrid", pfApplicable: true, pfCeiling: 15000,
    esiApplicable: true, esiLimit: 25000, esiContributionPeriodEnd: '2026-09-30', ptApplicable: false, ptBasis: "auto",
    lwfApplicable: true, lwfFrequency: "monthly", tdsRegime: "new", gratuityMode: "part_of_ctc", statutoryBonusApplicable: true, bonusRate: 10.0, lopBasis: "inherit_global"
  },
  wipro: {
    name: "Wipro Ltd", contractType: "hybrid", pfApplicable: true, pfCeiling: 15000,
    esiApplicable: true, esiLimit: 21000, esiContributionPeriodEnd: '2026-09-30', ptApplicable: true, ptBasis: "auto",
    lwfApplicable: true, lwfFrequency: "bi-annual", tdsRegime: "employee_choice", gratuityMode: "over_and_above", statutoryBonusApplicable: true, bonusRate: 8.33, lopBasis: "30_days"
  }
};

const EXISTING_PHONES = { '9999988888': 'Priya Mehta (TEC-045)', '8888877777': 'Rohit Kapoor (TEC-072)' };
const EXISTING_PANS = { 'ZZZZZ9999Z': 'Neha Patil (TEC-121)', 'YYYYY8888Y': 'Suresh Kumar (TEC-033)', 'XXXXX7777X': 'Divya Rao (TEC-056)' };
const IFSC_LOOKUP = {
  'HDFC': { bank: 'HDFC Bank', branch: 'Andheri East, Mumbai' },
  'ICIC': { bank: 'ICICI Bank', branch: 'Connaught Place, Delhi' },
  'SBIN': { bank: 'State Bank of India', branch: 'Fort, Mumbai' },
  'KKBK': { bank: 'Kotak Mahindra Bank', branch: 'Bandra West, Mumbai' },
  'UTIB': { bank: 'Axis Bank', branch: 'Nariman Point, Mumbai' },
  'PUNB': { bank: 'Punjab National Bank', branch: 'Chandni Chowk, Delhi' }
};

const ORIG_VALUES = {
  fullName: 'Aarav Sharma', phone: '9876543210', email: 'aarav.sharma@gmail.com', designation: 'Senior Developer'
};

export default function EmployeeForm() {
  const [formMode, setFormMode] = useState('add');
  const [empId, setEmpId] = useState(null);

  const [formData, setFormData] = useState({
    fullName: 'Aarav Sharma',
    dob: '1998-04-12',
    personalEmail: 'aarav.sharma@gmail.com',
    phone: '9876543210',
    emergencyContact: '9876543211',
    clientPartner: 'mahindra',
    designation: 'Senior Developer',
    doj: '2025-01-15',
    empType: 'eor',
    priorEmploymentFlag: true,
    address: 'Flat 4B, Andheri East, Mumbai',
    accountNo: '50100452398571',
    accountNoConfirm: '50100452398571',
    ifsc: 'HDFC0000060',
    bankName: 'HDFC Bank',
    bankBranch: 'Andheri East, Mumbai',
    accountHolder: 'Aarav Sharma',
    pan: 'ABCDE1234F',
    aadhaar: '', 
    uanMode: 'prior',
    uan: '100523485790',
    esiNo: '3114589723',
    basicSal: 22000,
    hraSal: 11000,
    conveyanceSal: 1600,
    daSal: 0,
    medicalSal: 0,
    specialSal: 10400,
    otherSal: 0,
    arrearsSal: 0,
    ptDeduction: 200,
    welfareFund: 0,
    pfToggle: true,
    esiToggle: true,
    tdsToggle: true,
    ptToggle: true,
    lwfToggle: true,
    bonusToggle: true,
    taxRegime: 'new',
    declarations: 'yes',
    gratuityMode: 'part_of_ctc',
    lopBasis: '26_days'
  });

  const [overrides, setOverrides] = useState({
    pf: false, esi: false, tds: false, pt: false, lwf: false, bonus: false, gratuity: false, lop: false
  });

  const [errors, setErrors] = useState({});
  const [blockingErrors, setBlockingErrors] = useState(new Set());
  
  const [phoneDupChoiceVisible, setPhoneDupChoiceVisible] = useState(false);
  const [nameChangeUploadVisible, setNameChangeUploadVisible] = useState(false);
  
  const [showEmpTypeModal, setShowEmpTypeModal] = useState(false);
  const [pendingEmpType, setPendingEmpType] = useState('');
  const [previousEmpType, setPreviousEmpType] = useState('eor');
  
  const [aadhaarMasked, setAadhaarMasked] = useState('••••••••7890');
  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [isAadhaarFocused, setIsAadhaarFocused] = useState(false);

  // Computed values
  const isActive = formMode === 'edit-active';
  const isAdd = formMode === 'add';
  const isOnboarding = formMode === 'edit-onboarding';
  
  const grossCTC = useMemo(() => {
    return Number(formData.basicSal) + Number(formData.hraSal) + Number(formData.conveyanceSal) + 
           Number(formData.daSal) + Number(formData.medicalSal) + Number(formData.specialSal) + 
           Number(formData.otherSal) + Number(formData.arrearsSal);
  }, [formData.basicSal, formData.hraSal, formData.conveyanceSal, formData.daSal, formData.medicalSal, formData.specialSal, formData.otherSal, formData.arrearsSal]);

  const [previewCalculations, setPreviewCalculations] = useState(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const payload = {
          basic_pay: formData.basicSal || 0,
          hra: formData.hraSal || 0,
          conveyance: formData.conveyanceSal || 0,
          da: formData.daSal || 0,
          medical_allowance: formData.medicalSal || 0,
          special_allowance: formData.specialSal || 0,
          other_additions: formData.otherSal || 0,
          pf_applicable: formData.pfToggle,
          esi_applicable: formData.esiToggle,
          pt_deduction_override: formData.ptDeduction
        };
        const res = await window.axios.post('/employees/calculate-preview', payload);
        if (res.status === 200) {
          setPreviewCalculations(res.data);
        }
      } catch (err) {
        console.error('Failed to calculate preview:', err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    formData.basicSal, formData.hraSal, formData.conveyanceSal, 
    formData.daSal, formData.medicalSal, formData.specialSal, 
    formData.otherSal, formData.pfToggle, formData.esiToggle, 
    formData.ptDeduction
  ]);

  const activeClientDefaults = CLIENT_STATUTORY_DEFAULTS[formData.clientPartner];

  // Helper for errors
  const setErrorMsg = (field, msg, type = 'error') => {
    setErrors(prev => ({ ...prev, [field]: { msg, type } }));
  };
  const clearErrorMsg = (field) => {
    setErrors(prev => {
      const newErr = { ...prev };
      delete newErr[field];
      return newErr;
    });
  };
  const addBlocker = (key) => setBlockingErrors(prev => new Set(prev).add(key));
  const removeBlocker = (key) => {
    setBlockingErrors(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearErrorMsg(field);
  };

  // Initialization (URL parse)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const mode = params.get('mode') || (id ? 'edit-active' : 'add');
    setEmpId(id);
    setFormMode(mode);
    
    if (mode === 'edit-active') {
      addBlocker('Date of Joining is locked — payroll already processed');
      setErrorMsg('doj', 'Cannot change Date of Joining after payroll has been processed for this employee.', 'error');
    }
  }, []);

  // Sync logic on client change
  useEffect(() => {
    if (activeClientDefaults) {
      const d = activeClientDefaults;
      setFormData(prev => {
        const next = { ...prev };
        if (!overrides.pf) next.pfToggle = d.pfApplicable;
        if (!overrides.esi) next.esiToggle = d.esiApplicable;
        if (!overrides.tds) next.taxRegime = d.tdsRegime;
        if (!overrides.pt) next.ptToggle = d.ptApplicable;
        if (!overrides.lwf) next.lwfToggle = d.lwfApplicable;
        if (!overrides.bonus) next.bonusToggle = d.statutoryBonusApplicable;
        if (!overrides.gratuity) next.gratuityMode = d.gratuityMode;
        if (!overrides.lop) next.lopBasis = d.lopBasis;
        return next;
      });
    }
  }, [formData.clientPartner, overrides]);

  // Validations
  const validateFullName = () => {
    if (!formData.fullName) return;
    if (formMode !== 'add' && formData.fullName !== ORIG_VALUES.fullName) {
      setNameChangeUploadVisible(true);
      // In a real scenario we'd check file upload state here, simplifying for mockup:
      addBlocker('Name change requires supporting document upload'); 
    } else {
      setNameChangeUploadVisible(false);
      removeBlocker('Name change requires supporting document upload');
    }

    if (formData.pan.length === 10) {
      setErrorMsg('fullName', '⚠ Name mismatch with PAN — statutory filings may be rejected. Confirm before saving.', 'warn');
    }
  };

  const validateAgeAtJoining = () => {
    if (!formData.dob || !formData.doj) return;
    removeBlocker('Employee must be at least 18 years old at joining date');
    clearErrorMsg('dob');

    const ageYrs = (new Date(formData.doj) - new Date(formData.dob)) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYrs < 18) {
      setErrorMsg('dob', '⛔ Employee must be at least 18 years old at the Date of Joining.', 'error');
      addBlocker('Employee must be at least 18 years old at joining date');
    } else if (ageYrs >= 58 && ageYrs <= 60) {
      setErrorMsg('dob', '⚠ PF continuation beyond age 58 requires explicit consent — confirm with employee.', 'warn');
    }
  };

  const validatePersonalEmail = () => {
    if (!formData.personalEmail) {
      setErrorMsg('personalEmail', '⛔ Personal email is required.', 'error');
      addBlocker('Personal email is required and must be valid');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail)) {
      setErrorMsg('personalEmail', '⛔ Enter a valid email address.', 'error');
      addBlocker('Personal email is required and must be valid');
      return;
    }
    removeBlocker('Personal email is required and must be valid');
  };

  const validatePhone = () => {
    setPhoneDupChoiceVisible(false);
    removeBlocker('Phone number must be exactly 10 digits');
    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) {
      setErrorMsg('phone', '⛔ Phone number must be exactly 10 digits.', 'error');
      addBlocker('Phone number must be exactly 10 digits');
      return;
    }
    if (formMode !== 'add' && formData.phone === ORIG_VALUES.phone) return;
    
    if (EXISTING_PHONES[formData.phone]) {
      setErrorMsg('phone', `⚠ This number is already linked to ${EXISTING_PHONES[formData.phone]}. Continue anyway?`, 'warn');
      setPhoneDupChoiceVisible(true);
    }
  };

  const acceptDuplicatePhone = () => {
    setPhoneDupChoiceVisible(false);
    setErrorMsg('phone', '✓ Acknowledged — duplicate number accepted.', 'info');
  };

  const rejectDuplicatePhone = () => {
    handleInputChange('phone', ORIG_VALUES.phone);
    setPhoneDupChoiceVisible(false);
  };

  const validateAccountMatch = () => {
    removeBlocker('Account numbers do not match');
    if (!formData.accountNo || !formData.accountNoConfirm) return;
    if (formData.accountNo !== formData.accountNoConfirm) {
      setErrorMsg('accountNoConfirm', '⛔ Account numbers do not match.', 'error');
      addBlocker('Account numbers do not match');
    }
  };

  const validateIFSC = () => {
    removeBlocker('IFSC code format is invalid');
    if (!formData.ifsc) return;
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc.toUpperCase())) {
      setErrorMsg('ifsc', '⛔ IFSC must be 4 letters + 0 + 6 alphanumeric chars (e.g. HDFC0000060).', 'error');
      addBlocker('IFSC code format is invalid');
      return;
    }
    
    const prefix = formData.ifsc.toUpperCase().slice(0, 4);
    if (IFSC_LOOKUP[prefix]) {
      setFormData(prev => ({ ...prev, bankName: IFSC_LOOKUP[prefix].bank, bankBranch: IFSC_LOOKUP[prefix].branch }));
    }
  };

  const validatePAN = () => {
    removeBlocker('PAN format is invalid');
    removeBlocker('PAN is already registered to another employee');
    if (!formData.pan) return;
    
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan.toUpperCase())) {
      setErrorMsg('pan', '⛔ Invalid PAN format. Must be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).', 'error');
      addBlocker('PAN format is invalid');
      return;
    }
    if (EXISTING_PANS[formData.pan.toUpperCase()]) {
      setErrorMsg('pan', `⛔ This PAN is already registered to ${EXISTING_PANS[formData.pan.toUpperCase()]}. Cannot create duplicate record.`, 'error');
      addBlocker('PAN is already registered to another employee');
      return;
    }
    validateFullName();
  };

  const validateBasicPct = () => {
    removeBlocker('Basic Pay must be at least 50% of CTC');
    if (grossCTC === 0) return;
    const pct = (Number(formData.basicSal) / grossCTC) * 100;
    if (pct < 50) {
      setErrorMsg('basicSal', `⛔ Basic Pay (₹${formData.basicSal.toLocaleString('en-IN')}) is ${pct.toFixed(1)}% of CTC — must be at least 50% as per current wage code rules.`, 'error');
      addBlocker('Basic Pay must be at least 50% of CTC');
    }
  };

  // ESI limits check
  useEffect(() => {
    const limit = activeClientDefaults ? activeClientDefaults.esiLimit : 21000;
    if (grossCTC > limit) {
      if (formMode !== 'add' && formData.esiToggle) {
        setErrorMsg('esiWarning', `ℹ Gross salary now exceeds ESI threshold (₹${limit}). ESI contribution continues until end of period.`, 'warn');
      } else {
        handleInputChange('esiToggle', false);
        setErrorMsg('esiWarning', `⚠ Gross salary exceeds ESI threshold (₹${limit}) — ESI does not apply.`, 'error');
      }
    } else {
      clearErrorMsg('esiWarning');
    }
  }, [grossCTC, formData.esiToggle, activeClientDefaults, formMode]);

  // Handlers
  const handleEmpTypeChange = (e) => {
    const val = e.target.value;
    if (isActive && previousEmpType && val !== previousEmpType) {
      setPendingEmpType(val);
      setShowEmpTypeModal(true);
    } else {
      setPreviousEmpType(val);
      handleInputChange('empType', val);
    }
  };

  const confirmEmpTypeChange = () => {
    handleInputChange('empType', pendingEmpType);
    setPreviousEmpType(pendingEmpType);
    setShowEmpTypeModal(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    validatePersonalEmail();
    validatePhone();
    validatePAN();
    validateAccountMatch();
    validateIFSC();
    validateBasicPct();
    validateAgeAtJoining();

    if (blockingErrors.size > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    router.visit('/employees');
  };

  const toggleOverride = (field) => {
    setOverrides(prev => ({ ...prev, [field]: true }));
  };

  return (
    <RoleGuard allowedRoles={['admin', 'executive']}>
      <AuthenticatedLayout>
        <Head title={isAdd ? "Add New Employee" : `Edit Employee (${isActive ? 'Active' : 'Onboarding'})`} />
        
        <div className="legacy-react-wrapper">
          <div style={{ marginBottom: "1.5rem" }}>
            <Link href="/employees" style={{ fontSize: "0.85rem", fontWeight: "600" }}>← Back to Employees Directory</Link>
            <h2 id="form-page-title" style={{ marginTop: "0.5rem" }}>
              {isAdd ? 'Add New Employee' : `Edit Employee — ${isActive ? 'Active' : 'Onboarding'}`}
            </h2>
            <p id="form-page-subtitle" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {isActive ? 'Salary, bank details and Date of Joining are locked. Use the dedicated flows to change those.' : 'Configure personal profile, sensitive banking, custom salary breakdown, and statutory overrides.'}
            </p>
          </div>

          <div className="grid-layout">
            <div className="card">
              <form id="emp-form" onSubmit={handleFormSubmit}>
                
                {/* 1. PERSONAL DETAILS */}
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1.25rem", fontSize: "1.05rem" }}>
                  Personal &amp; Employment Profile
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" className={`form-control ${errors.fullName ? `is-${errors.fullName.type}` : ''}`} value={formData.fullName}
                      onChange={e => { handleInputChange('fullName', e.target.value); handleInputChange('accountHolder', e.target.value); }}
                      onBlur={validateFullName} />
                    {errors.fullName && <div className={`field-msg ${errors.fullName.type} show`}>{errors.fullName.msg}</div>}
                    
                    {nameChangeUploadVisible && (
                      <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "var(--status-warning-bg)", borderLeft: "3px solid var(--status-warning)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ fontSize: "0.85rem", color: "var(--status-warning)", fontWeight: "600", marginBottom: "0.5rem" }}>
                          Name changes require a supporting document. Upload before saving.
                        </div>
                        <input type="file" className="form-control" style={{ fontSize: "0.8rem", padding: "0.25rem" }} onChange={() => removeBlocker('Name change requires supporting document upload')} />
                      </div>
                    )}
                  </div>
                  
                  {isAdd && (
                    <div className="form-group">
                      <label>Employee Code</label>
                      <input type="text" className="form-control read-only-field" value="TEC-089 (auto-assigned on save)" readOnly />
                      <div className="field-msg info show">🔒 Auto-generated on save. Cannot be manually set.</div>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  {isAdd && (
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" className={`form-control ${errors.dob ? `is-${errors.dob.type}` : ''}`} value={formData.dob}
                        onChange={e => { handleInputChange('dob', e.target.value); validateAgeAtJoining(); }} />
                      {errors.dob && <div className={`field-msg ${errors.dob.type} show`}>{errors.dob.msg}</div>}
                    </div>
                  )}
                  <div className="form-group">
                    <label>Personal Email <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="email" className={`form-control ${errors.personalEmail ? `is-${errors.personalEmail.type}` : ''}`} value={formData.personalEmail}
                      onChange={e => handleInputChange('personalEmail', e.target.value)} onBlur={validatePersonalEmail} />
                    {errors.personalEmail && <div className={`field-msg ${errors.personalEmail.type} show`}>{errors.personalEmail.msg}</div>}
                    {!isAdd && formData.personalEmail !== ORIG_VALUES.email && (
                      <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#64748B", fontStyle: "italic" }}>
                        A notification will be sent to the previous email address confirming this change.
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className={`form-control ${errors.phone ? `is-${errors.phone.type}` : ''}`} value={formData.phone} maxLength="10"
                      onChange={e => handleInputChange('phone', e.target.value)} onBlur={validatePhone} />
                    {errors.phone && <div className={`field-msg ${errors.phone.type} show`}>{errors.phone.msg}</div>}
                    {phoneDupChoiceVisible && (
                      <div className="inline-choice" style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button type="button" className="btn btn-primary btn-xs" onClick={acceptDuplicatePhone}>Yes, Continue</button>
                        <button type="button" className="btn btn-secondary btn-xs" onClick={rejectDuplicatePhone}>Cancel</button>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Number</label>
                    <input type="text" className="form-control" value={formData.emergencyContact} maxLength="10"
                      onChange={e => handleInputChange('emergencyContact', e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  {isAdd && (
                    <div className="form-group">
                      <label>Client Partner</label>
                      <select className="form-control" value={formData.clientPartner} onChange={e => handleInputChange('clientPartner', e.target.value)} disabled={isActive}>
                        <option value="mahindra">Mahindra Corp</option>
                        <option value="tcs">Tata Consultancy Services — EOR</option>
                        <option value="tcs_agency">Tata Consultancy Services — Agency</option>
                        <option value="reliance">Reliance Digital</option>
                        <option value="wipro">Wipro Ltd</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Designation</label>
                    <input type="text" className="form-control" value={formData.designation} onChange={e => handleInputChange('designation', e.target.value)} required />
                  </div>
                </div>

                {isAdd && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Joining</label>
                      <input type="date" className={`form-control ${isActive ? 'read-only-field' : ''} ${errors.doj ? `is-${errors.doj.type}` : ''}`} value={formData.doj}
                        onChange={e => { handleInputChange('doj', e.target.value); validateAgeAtJoining(); }} readOnly={isActive} />
                      {errors.doj && <div className={`field-msg ${errors.doj.type} show`}>{errors.doj.msg}</div>}
                    </div>
                    <div className="form-group">
                      <label>Employment Model</label>
                      <select className="form-control" value={formData.empType} onChange={handleEmpTypeChange} disabled={isActive && formData.empType === 'internal'}>
                        <option value="eor">Pass-through EOR</option>
                        <option value="contract">Agency Contract</option>
                        <option value="internal">Internal Staff</option>
                      </select>
                      {formData.empType === 'eor' && <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#F8FAFC", borderLeft: "3px solid var(--primary-navy)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>PF, ESI, and PT are filed under client registration.</div>}
                      {formData.empType === 'contract' && <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#F8FAFC", borderLeft: "3px solid var(--primary-navy)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>PF, ESI, and PT are filed under Tecla Media registration.</div>}
                    </div>
                  </div>
                )}

                <div className="form-row">
                  {isAdd && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Prior Employment Flag <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Required for Previous Employer KYC docs)</span></label>
                      <div style={{ marginTop: "0.5rem" }}>
                        <label className="toggle-container">
                          <input type="checkbox" className="toggle-input" checked={formData.priorEmploymentFlag} onChange={e => handleInputChange('priorEmploymentFlag', e.target.checked)} disabled={isActive} />
                          <span className="toggle-switch"></span>
                          <span style={{ fontWeight: "600", color: "var(--primary-navy)" }}>{formData.priorEmploymentFlag ? 'Yes' : 'No'}</span>
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Residential Address</label>
                    <input type="text" className="form-control" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                  </div>
                </div>

                {isAdd && (
                  <>
                {/* 2. BANK DETAILS */}
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginTop: "2rem", marginBottom: "0.75rem", fontSize: "1.05rem" }}>
                  Secure Disbursement Details
                </h3>

                <div className="section-banner info">
                  🏦 <strong>Bank details can only be set here during initial employee creation.</strong>
                  Once the employee is <em>Active</em>, bank changes must go through the Bank Change Requests approval flow.
                </div>

                {isActive ? (
                  <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "500", color: "var(--text-main)" }}>🔒 Locked — use <Link href="/bank-change-requests" style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Bank Change Requests</Link> to update</span>
                  </div>
                ) : (
                  <div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Account Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.accountNo ? `is-${errors.accountNo.type}` : ''}`} value={formData.accountNo}
                          onChange={e => handleInputChange('accountNo', e.target.value)} onBlur={validateAccountMatch} />
                      </div>
                      <div className="form-group">
                        <label>Confirm Account Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.accountNoConfirm ? `is-${errors.accountNoConfirm.type}` : ''}`} value={formData.accountNoConfirm}
                          onChange={e => handleInputChange('accountNoConfirm', e.target.value)} onBlur={validateAccountMatch} />
                        {errors.accountNoConfirm && <div className={`field-msg ${errors.accountNoConfirm.type} show`}>{errors.accountNoConfirm.msg}</div>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>IFSC Code <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.ifsc ? `is-${errors.ifsc.type}` : ''}`} value={formData.ifsc}
                          onChange={e => handleInputChange('ifsc', e.target.value.toUpperCase())} onBlur={validateIFSC} />
                        {errors.ifsc && <div className={`field-msg ${errors.ifsc.type} show`}>{errors.ifsc.msg}</div>}
                      </div>
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input type="text" className="form-control read-only-field" value={formData.bankName} readOnly />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Branch</label>
                        <input type="text" className="form-control read-only-field" value={formData.bankBranch} readOnly />
                      </div>
                      <div className="form-group">
                        <label>Account Holder Name</label>
                        <input type="text" className="form-control" value={formData.accountHolder} onChange={e => handleInputChange('accountHolder', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. STATUTORY IDs */}
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginTop: "2rem", marginBottom: "1.25rem", fontSize: "1.05rem" }}>
                  Statutory Credentials
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>Permanent Account Number (PAN)</label>
                    <input type="text" className={`form-control ${errors.pan ? `is-${errors.pan.type}` : ''}`} value={formData.pan}
                      onChange={e => handleInputChange('pan', e.target.value.toUpperCase())} onBlur={validatePAN} />
                    {errors.pan && <div className={`field-msg ${errors.pan.type} show`}>{errors.pan.msg}</div>}
                  </div>
                  <div className="form-group">
                    <label>Aadhaar Number</label>
                    <input type="text" className="form-control" 
                      value={isAadhaarFocused ? aadhaarRaw : ''}
                      placeholder={isAadhaarFocused ? "12-digit Aadhaar" : "Click to reveal/edit"}
                      onFocus={() => setIsAadhaarFocused(true)} 
                      onBlur={() => setIsAadhaarFocused(false)} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setAadhaarRaw(val);
                        setAadhaarMasked(val ? `••••••••${val.slice(-4)}` : '');
                      }} 
                    />
                    {!isAadhaarFocused && aadhaarMasked && <div style={{ fontFamily: "monospace", letterSpacing: "0.1em", fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{aadhaarMasked}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Provident Fund UAN</label>
                    <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.5rem" }}>
                      <label><input type="radio" value="prior" checked={formData.uanMode === 'prior'} onChange={() => handleInputChange('uanMode', 'prior')} /> Has Prior PF</label>
                      <label><input type="radio" value="new" checked={formData.uanMode === 'new'} onChange={() => handleInputChange('uanMode', 'new')} /> Generate New UAN</label>
                    </div>
                    <input type="text" className={`form-control ${formData.uanMode === 'new' ? 'read-only-field' : ''}`} value={formData.uanMode === 'new' ? '' : formData.uan} 
                      onChange={e => handleInputChange('uan', e.target.value)} disabled={formData.uanMode === 'new'} placeholder="Universal Account Number" />
                    {formData.uanMode === 'new' && <div className="field-msg warn show">⚡ Duplicate UANs require manual EPFO merge if past history exists.</div>}
                  </div>
                  {formData.esiToggle && (
                    <div className="form-group">
                      <label>ESI IP Number</label>
                      <input type="text" className="form-control" value={formData.esiNo} onChange={e => handleInputChange('esiNo', e.target.value)} />
                    </div>
                  )}
                </div>

                {/* 4. SALARY STRUCTURE */}
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginTop: "2rem", marginBottom: "1.25rem", fontSize: "1.05rem" }}>
                  Salary Structure &amp; Compensation (Monthly)
                </h3>

                {isActive ? (
                  <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "500", color: "var(--text-main)" }}>🔒 Locked — use <Link href={`/employees/${empId}/salary-revision`} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Revise Salary</Link> to update</span>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ fontSize: "0.95rem", color: "var(--primary-navy)", marginBottom: "1rem" }}>Earnings Breakdown</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>1. Basic Pay (₹)</label>
                        <input type="number" className={`form-control ${errors.basicSal ? `is-${errors.basicSal.type}` : ''}`} value={formData.basicSal}
                          onChange={e => handleInputChange('basicSal', e.target.value)} onBlur={validateBasicPct} />
                        {errors.basicSal && <div className={`field-msg ${errors.basicSal.type} show`}>{errors.basicSal.msg}</div>}
                      </div>
                      <div className="form-group">
                        <label>2. HRA (₹)</label>
                        <input type="number" className="form-control" value={formData.hraSal} onChange={e => handleInputChange('hraSal', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>3. Conveyance (₹)</label>
                        <input type="number" className="form-control" value={formData.conveyanceSal} onChange={e => handleInputChange('conveyanceSal', e.target.value)} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>4. DA (₹)</label>
                        <input type="number" className="form-control" value={formData.daSal} onChange={e => handleInputChange('daSal', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>5. Medical (₹)</label>
                        <input type="number" className="form-control" value={formData.medicalSal} onChange={e => handleInputChange('medicalSal', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>6. Special (₹)</label>
                        <input type="number" className="form-control" value={formData.specialSal} onChange={e => handleInputChange('specialSal', e.target.value)} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>7. Other Additions (₹)</label>
                        <input type="number" className="form-control" value={formData.otherSal} onChange={e => handleInputChange('otherSal', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>8. Arrears Amount (₹)</label>
                        <input type="number" className="form-control" value={formData.arrearsSal} onChange={e => handleInputChange('arrearsSal', e.target.value)} />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Professional Tax Override (₹)</label>
                        <input type="number" className="form-control" placeholder="Leave blank for 0" value={formData.ptDeduction} onChange={e => handleInputChange('ptDeduction', e.target.value)} />
                        <small style={{ color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Default is 0 if blank</small>
                      </div>
                    </div>

                    <div style={{ backgroundColor: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "500", color: "var(--text-color)" }}>Calculated Monthly Gross Earnings:</span>
                        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--primary-navy)" }}>₹{previewCalculations ? previewCalculations.gross_monthly_salary?.toLocaleString('en-IN') : grossCTC.toLocaleString('en-IN')}</span>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)" }}>
                        <span>Estimated Employee Deductions (PF, ESI, PT):</span>
                        <span>- ₹{previewCalculations ? (previewCalculations.employee_pf_monthly + previewCalculations.employee_esi_monthly + previewCalculations.pt_monthly)?.toLocaleString('en-IN') : '0'}</span>
                      </div>

                      <div style={{ backgroundColor: "var(--primary-navy)", color: "white", padding: "1rem", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "500" }}>Estimated Net Take Home:</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--accent-gold)" }}>₹{previewCalculations ? previewCalculations.net_take_home_monthly?.toLocaleString('en-IN') : grossCTC.toLocaleString('en-IN')}</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                        <span>Estimated Employer Contributions:</span>
                        <span>+ ₹{previewCalculations ? (previewCalculations.employer_pf_monthly + previewCalculations.employer_esi_monthly)?.toLocaleString('en-IN') : '0'}</span>
                      </div>

                      <div style={{ borderTop: "2px dashed var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                        <span style={{ fontWeight: "bold", color: "var(--text-color)", fontSize: "1.1rem" }}>Estimated Cost to Company (CTC):</span>
                        <span style={{ fontSize: "1.3rem", fontWeight: "bold", color: "var(--primary-navy)" }}>₹{previewCalculations ? previewCalculations.ctc_monthly?.toLocaleString('en-IN') : grossCTC.toLocaleString('en-IN')}</span>
                      </div>
                      
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.5rem" }}>
                        * Final Net Pay and CTC may vary slightly based on monthly attendance and finalized tax declarations.
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. STATUTORY APPLICABILITY */}
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginTop: "2rem", marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                  Statutory Applicability for This Employee
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "1.25rem" }}>
                  ⚙️ <span style={{ fontWeight: "500", color: "var(--primary-navy)" }}>Defaults inherited from client...</span> Toggling any setting creates an override.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "#F8FAFC", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", marginBottom: "1.5rem" }}>
                  
                  {/* PF Toggle */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.85rem" }}>PF Contribution</strong>
                          <span className={`badge ${overrides.pf ? 'badge-gold' : 'badge-neutral'}`}>{overrides.pf ? 'Overridden' : 'Inherited'}</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Standard 12% Provident Fund deductions.</span>
                      </div>
                      <label className="toggle-container">
                        <input type="checkbox" className="toggle-input" checked={formData.pfToggle} onChange={e => { handleInputChange('pfToggle', e.target.checked); toggleOverride('pf'); }} />
                        <span className="toggle-switch"></span>
                      </label>
                    </div>
                  </div>
                  <hr style={{ border: "0", borderTop: "1px solid var(--border-color)" }} />

                  {/* ESI Toggle */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.85rem" }}>ESI Contribution</strong>
                          <span className={`badge ${overrides.esi ? 'badge-gold' : 'badge-neutral'}`}>{overrides.esi ? 'Overridden' : 'Inherited'}</span>
                        </div>
                        {errors.esiWarning && (
                          <span className={`badge ${errors.esiWarning.type === 'error' ? 'badge-danger' : 'badge-gold'}`} style={{ display: "block", marginTop: "0.25rem" }}>
                            {errors.esiWarning.msg}
                          </span>
                        )}
                      </div>
                      <label className="toggle-container">
                        <input type="checkbox" className="toggle-input" checked={formData.esiToggle} onChange={e => { handleInputChange('esiToggle', e.target.checked); toggleOverride('esi'); }} disabled={grossCTC > (activeClientDefaults?.esiLimit||21000) && (!formData.esiToggle)} />
                        <span className="toggle-switch"></span>
                      </label>
                    </div>
                  </div>
                  <hr style={{ border: "0", borderTop: "1px solid var(--border-color)" }} />

                  {/* TDS Toggle */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.85rem" }}>TDS (Tax Deducted at Source)</strong>
                          <span className={`badge ${overrides.tds ? 'badge-gold' : 'badge-neutral'}`}>{overrides.tds ? 'Overridden' : 'Inherited'}</span>
                        </div>
                      </div>
                      <label className="toggle-container">
                        <input type="checkbox" className="toggle-input" checked={formData.tdsToggle} onChange={e => { handleInputChange('tdsToggle', e.target.checked); toggleOverride('tds'); }} />
                        <span className="toggle-switch"></span>
                      </label>
                    </div>
                    {formData.tdsToggle && (
                      <div style={{ backgroundColor: "#FFFFFF", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", marginTop: "0.5rem" }}>
                        <div className="form-row">
                          <div className="form-group" style={{ marginBottom: "0" }}>
                            <label>Income Tax Regime</label>
                            <select className="form-control" value={formData.taxRegime} onChange={e => { handleInputChange('taxRegime', e.target.value); toggleOverride('tds'); }}>
                              <option value="old">Old Tax Regime</option>
                              <option value="new">New Tax Regime</option>
                              <option value="employee_choice">Employee Choice</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: "0" }}>
                            <label>Investment Declarations?</label>
                            <select className="form-control" value={formData.declarations} onChange={e => handleInputChange('declarations', e.target.value)}>
                              <option value="yes">Yes, Verified</option>
                              <option value="no">No Declarations</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
                  </>
                )}
                
                {!isAdd && (
                  <div id="edit-footer-note" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Looking to update bank details, salary, or statutory settings? Go to: <Link href="/bank-change-requests" style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Bank Change Requests</Link> · <Link href={`/employees/${empId}/salary-revision`} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Revise Salary</Link>
                  </div>
                )}

                {/* Validation Summary */}
                {blockingErrors.size > 0 && (
                  <div className="card" style={{ marginTop: "1rem", border: "1px solid var(--status-danger)", backgroundColor: "var(--status-danger-bg)" }}>
                    <h4 style={{ color: "var(--status-danger)", marginBottom: "0.75rem" }}>⛔ Blocking Errors</h4>
                    <ul style={{ fontSize: "0.82rem", color: "var(--status-danger)", paddingLeft: "1.1rem", margin: "0", lineHeight: "1.8" }}>
                      {[...blockingErrors].map(err => <li key={err}>{err}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "2rem" }}>
                  <Link href="/employees" className="btn btn-secondary">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={blockingErrors.size > 0} style={blockingErrors.size > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                    Save Employee Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Modal */}
          {showEmpTypeModal && (
            <div className="modal-overlay active">
              <div className="modal-box" style={{ width: "440px" }}>
                <div className="modal-header">
                  <h3>⚠ Confirm Employment Type Change</h3>
                  <button className="modal-close" onClick={() => setShowEmpTypeModal(false)}>×</button>
                </div>
                <div>
                  <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>Changing employment type after payroll history exists <strong>only applies going forward</strong>.</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowEmpTypeModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={confirmEmpTypeChange}>Yes, Change</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
