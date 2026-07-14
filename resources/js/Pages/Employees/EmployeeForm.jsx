import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import './EmployeeForm.css';
import RoleGuard from '../../Components/RoleGuard.jsx';
import axios from 'axios';
import useToast from '../../Hooks/useToast';


export default function EmployeeForm({ clients = [], errors: serverErrors, employee = null }) {
  const [formMode, setFormMode] = useState('add');
  const [empId, setEmpId] = useState(employee ? employee.data?.id || employee.id : null);
  const { showToast } = useToast();

  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  }, []);

  const [formData, setFormData] = useState(() => {
    const emp = employee ? (employee.data || employee) : null;
    return {
      fullName: emp?.full_name || '',
      gender: emp?.gender || '',
      bloodGroup: emp?.blood_group || '',
      maritalStatus: emp?.marital_status || '',
      dob: emp?.date_of_birth || '',
      personalEmail: emp?.personal_email || '',
      phone: emp?.phone_number || '',
      emergencyContact: emp?.emergency_contact_phone || '',
      clientPartner: emp?.client_id || '',
      designation: emp?.designation || '',
      doj: emp?.date_of_joining || '',
      empType: emp?.employment_model || 'eor',
      priorEmploymentFlag: emp ? emp.prior_employment_flag === 1 : true,
      address: emp?.residential_address || '',
      accountNo: emp?.bank_account_number || '',
      accountNoConfirm: emp?.bank_account_number || '',
      ifsc: emp?.bank_ifsc || '',
      bankName: emp?.bank_name || '',
      bankBranch: emp?.bank_branch || '',
      accountHolder: emp?.account_holder_name || '',
      pan: emp?.pan_number || '',
      aadhaar: emp?.aadhaar_number || '',
      uanMode: emp?.uan_mode || 'new',
      uan: emp?.uan_number || '',
      esiNo: emp?.esic_number || '',
      basicSal: emp?.basic_pay ?? '',
      hraSal: emp?.hra ?? '',
      conveyanceSal: emp?.conveyance ?? '',
      daSal: emp?.da ?? '',
      medicalSal: emp?.medical_allowance ?? '',
      specialSal: emp?.special_allowance ?? '',
      otherSal: emp?.other_additions ?? '',
      ptDeduction: emp?.pt_deduction_override ?? '',
      pfToggle: emp ? emp.pf_applicable === 1 : true,
      esiToggle: emp ? emp.esi_applicable === 1 : true,
      tdsToggle: emp ? emp.tds_applicable === 1 : true,
      ptToggle: emp ? emp.pt_applicable === 1 : true,
      lwfToggle: emp ? emp.lwf_applicable === 1 : true,
      bonusToggle: emp ? emp.bonus_toggle === 1 : true,
      taxRegime: emp?.tds_regime || 'new',
      declarations: emp ? (emp.declarations_accepted === 1 ? 'yes' : 'no') : 'yes',
      gratuityMode: emp?.gratuity_mode || 'part_of_ctc',
      lopBasis: emp?.lop_basis_days || '30',
      emergencyContactName: emp?.emergency_contact_name || '',
      prevEmployerName: emp?.previous_employer_name || '',
      prevEmployerUAN: emp?.previous_employer_uan || '',
      probationEndDate: emp?.probation_end_date || '',
      reportingManagerId: emp?.reporting_manager_id || '',
      noticePeriodDays: emp?.notice_period_days ?? '',
      esiPeriodEnd: emp?.esi_contribution_period_end || '',
    };
  });

  const [overrides, setOverrides] = useState({
    pf: false, esi: false, tds: false, pt: false, lwf: false, bonus: false, gratuity: false, lop: false, noticePeriod: false
  });

  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [blockingErrors, setBlockingErrors] = useState(new Set());
  
  const [phoneDupChoiceVisible, setPhoneDupChoiceVisible] = useState(false);
  const [nameChangeUploadVisible, setNameChangeUploadVisible] = useState(false);
  
  const [showEmpTypeModal, setShowEmpTypeModal] = useState(false);
  const [pendingEmpType, setPendingEmpType] = useState('');
  const [previousEmpType, setPreviousEmpType] = useState('eor');
  

  const [isAadhaarFocused, setIsAadhaarFocused] = useState(false);

  // Computed values
  const isActive = formMode === 'edit-active';
  const isAdd = formMode === 'add';
  const isOnboarding = formMode === 'edit-onboarding';
  
  const grossCTC = useMemo(() => {
    return Number(formData.basicSal) + Number(formData.hraSal) + Number(formData.conveyanceSal) + 
           Number(formData.daSal) + Number(formData.medicalSal) + Number(formData.specialSal) + 
           Number(formData.otherSal);
  }, [formData.basicSal, formData.hraSal, formData.conveyanceSal, formData.daSal, formData.medicalSal, formData.specialSal, formData.otherSal]);

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
        const res = await axios.post(route('employees.calculate-preview'), payload);
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

  const [activeClientDefaults, setActiveClientDefaults] = useState(null);
  const [clientActiveEmployees, setClientActiveEmployees] = useState([]);

  // Fetch active employees for Reporting Manager dropdown
  useEffect(() => {
    if (!formData.clientPartner) {
      setClientActiveEmployees([]);
      return;
    }
    axios.get(route('clients.activeEmployees', formData.clientPartner))
      .then(res => setClientActiveEmployees(res.data || []))
      .catch(() => setClientActiveEmployees([]));
  }, [formData.clientPartner]);

  // Sync logic on client change
  useEffect(() => {
    if (!formData.clientPartner) {
      setActiveClientDefaults(null);
      return;
    }
    axios.get(route('clients.statutoryDefaults', formData.clientPartner))
      .then(res => {
        const d = res.data;
        setActiveClientDefaults(d);
        setFormData(prev => {
          const next = { ...prev };
          if (!overrides.pf) next.pfToggle = d.pfApplicable;
          if (!overrides.esi) next.esiToggle = d.esiApplicable;
          if (!overrides.tds) next.taxRegime = d.tdsRegime;
          if (!overrides.pt) next.ptToggle = d.ptApplicable;
          if (!overrides.lwf) next.lwfToggle = d.lwfApplicable;
          if (!overrides.bonus) next.bonusToggle = d.statutoryBonusApplicable;
          if (!overrides.gratuity) {
            if (d.gratuityMode === 'na') {
               next.gratuityMode = 'part_of_ctc';
            } else if (d.gratuityMode === 'ctc_included') {
               next.gratuityMode = 'part_of_ctc';
            } else if (d.gratuityMode === 'over_ctc') {
               next.gratuityMode = 'over_and_above';
            } else {
               next.gratuityMode = d.gratuityMode;
            }
          }
          if (!overrides.lop) {
               // inherit resolves to '26' globally
               let rawLop = String(d.lopBasisDays || '');
               if (rawLop.includes('30')) next.lopBasis = '30';
               else next.lopBasis = '26';
            }
          if (!overrides.noticePeriod) {
               next.noticePeriodDays = d.noticePeriodDays ?? 30;
            }
          return next;
        });
      })
      .catch(err => console.error("Failed to fetch statutory defaults:", err));
  }, [formData.clientPartner, overrides]);

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
    const id = params.get('id') || (employee ? (employee.data?.id || employee.id) : null);
    const mode = params.get('mode') || (id ? (employee && (employee.data?.status || employee.status) === 'active' ? 'edit-active' : 'edit-onboarding') : 'add');
    setEmpId(id);
    setFormMode(mode);
    
    if (mode === 'edit-active') {
      // Just a visual indicator that some fields are locked. Do not block form submission.
      setErrorMsg('doj', 'Date of Joining is locked as payroll history exists.', 'warn');
    }
  }, []);

  // Sync logic on client change is now handled above.

  // Validations
  const validateFullName = () => {
    if (!formData.fullName) return;
    // Name change detection only applies in edit mode — compare against the
    // server-provided employee record (not a hardcoded mockup name).
    const originalName = employee ? (employee.data?.full_name || employee.full_name) : null;
    if (formMode !== 'add' && originalName && formData.fullName !== originalName) {
      setNameChangeUploadVisible(true);
      addBlocker('Name change requires supporting document upload'); 
    } else {
      setNameChangeUploadVisible(false);
      removeBlocker('Name change requires supporting document upload');
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
    // Real duplicate phone checks happen server-side via unique DB index.
    clearErrorMsg('phone');
  };

  const acceptDuplicatePhone = () => {
    setPhoneDupChoiceVisible(false);
    clearErrorMsg('phone');
  };

  const rejectDuplicatePhone = () => {
    handleInputChange('phone', '');
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

  const validateIFSC = async () => {
    removeBlocker('IFSC code format is invalid');
    removeBlocker('IFSC code not found');
    if (!formData.ifsc) {
      setFormData(prev => ({ ...prev, bankName: '', bankBranch: '' }));
      return;
    }
    const ifscUpper = formData.ifsc.toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscUpper)) {
      setErrorMsg('ifsc', '⛔ IFSC must be 4 letters + 0 + 6 alphanumeric chars (e.g. HDFC0000060).', 'error');
      addBlocker('IFSC code format is invalid');
      setFormData(prev => ({ ...prev, bankName: '', bankBranch: '' }));
      return;
    }
    
    try {
      const res = await axios.get(`https://ifsc.razorpay.com/${ifscUpper}`);
      if (res.data) {
        setFormData(prev => ({ ...prev, bankName: res.data.BANK, bankBranch: res.data.BRANCH }));
        setErrorMsg('ifsc', '✅ Verified', 'success');
      }
    } catch (err) {
      setFormData(prev => ({ ...prev, bankName: '', bankBranch: '' }));
      setErrorMsg('ifsc', '⛔ Invalid IFSC code or not found.', 'error');
      addBlocker('IFSC code not found');
    }
  };

  const validatePAN = () => {
    removeBlocker('PAN format is invalid');
    if (!formData.pan) return;
    
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan.toUpperCase())) {
      setErrorMsg('pan', '⛔ Invalid PAN format. Must be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).', 'error');
      addBlocker('PAN format is invalid');
      return;
    }
    // Real duplicate PAN checks happen server-side via SHA-256 hash uniqueness.
    clearErrorMsg('pan');
    validateFullName();
  };

  const validateBasicPct = () => {
    removeBlocker('Basic Pay must be at least 50% of CTC');
    if (grossCTC === 0) return;
    const pct = (Number(formData.basicSal) / grossCTC) * 100;
    if (pct < 50) {
      setErrorMsg('basicSal', `⚠ Basic Pay (₹${formData.basicSal.toLocaleString('en-IN')}) is ${pct.toFixed(1)}% of CTC — usually should be at least 50% as per new wage code rules, but you can proceed.`, 'warn');
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (processing) return;
    setProcessing(true);
    
    validatePersonalEmail();
    validatePhone();
    validatePAN();
    validateAccountMatch();
    await validateIFSC();
    validateBasicPct();
    validateAgeAtJoining();

    if (blockingErrors.size > 0) {
      setProcessing(false);
      showToast({ 
        type: 'error', 
        title: 'Cannot Save Employee', 
        message: 'Please resolve the blocking errors indicated in the form fields before saving.' 
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    const errorKeyMap = {
      'client_id': 'clientPartner', 'full_name': 'fullName', 'personal_email': 'personalEmail',
      'phone_number': 'phone', 'emergency_contact_phone': 'emergencyContact', 'date_of_birth': 'dob',
      'date_of_joining': 'doj', 'employment_model': 'empType', 'prior_employment_flag': 'priorEmploymentFlag',
      'residential_address': 'address', 'bank_account_number': 'accountNo', 'bank_ifsc': 'ifsc',
      'bank_name': 'bankName', 'bank_branch': 'bankBranch', 'account_holder_name': 'accountHolder',
      'gender': 'gender', 'blood_group': 'bloodGroup', 'marital_status': 'maritalStatus',
      'pan_number': 'pan', 'aadhaar_number': 'aadhaar', 'uan_mode': 'uanMode', 'uan_number': 'uan',
      'esic_number': 'esiNo', 'basic_pay': 'basicSal', 'hra': 'hraSal', 'conveyance': 'conveyanceSal',
      'da': 'daSal', 'medical_allowance': 'medicalSal', 'special_allowance': 'specialSal',
      'other_additions': 'otherSal', 'pt_deduction_override': 'ptDeduction', 'tds_regime': 'taxRegime',
      'gratuity_mode': 'gratuityMode', 'lop_basis_days': 'lopBasis',
      'emergency_contact_name': 'emergencyContactName', 'previous_employer_name': 'prevEmployerName',
      'previous_employer_uan': 'prevEmployerUAN', 'probation_end_date': 'probationEndDate',
      'reporting_manager_id': 'reportingManagerId', 'notice_period_days': 'noticePeriodDays',
      'esi_contribution_period_end': 'esiPeriodEnd',
    };
    
    const url = isAdd ? route('employees.store') : route('employees.update', empId);
    const method = isAdd ? 'post' : 'put';
    
    router[method](url, formData, {
      onFinish: () => setProcessing(false),
      onError: (serverErrors) => {
        setProcessing(false);
        const mappedErrors = {};
        const errorMessages = [];
        Object.keys(serverErrors).forEach(key => {
          const frontendKey = errorKeyMap[key] || key;
          mappedErrors[frontendKey] = { msg: serverErrors[key], type: 'error' };
          errorMessages.push(serverErrors[key]);
        });
        setErrors(prev => ({ ...prev, ...mappedErrors }));
        showToast({ type: 'error', title: 'Validation Failed', message: errorMessages.join(' | ') });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const toggleOverride = (field) => {
    setOverrides(prev => ({ ...prev, [field]: true }));
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title={isAdd ? "Add New Employee" : `Edit Employee (${isActive ? 'Active' : 'Onboarding'})`} />
        
        <div className="legacy-react-wrapper">
          <div style={{ marginBottom: "1.5rem" }}>
            <Link href={route('employees.index')} style={{ fontSize: "0.85rem", fontWeight: "600" }}>← Back to Employees Directory</Link>
            <h2 id="form-page-title" style={{ marginTop: "0.5rem" }}>
              {isAdd ? 'Add New Employee' : `Edit Employee — ${isActive ? 'Active' : 'Onboarding'}`}
            </h2>
            <p id="form-page-subtitle" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {isActive ? 'Salary, bank details and Date of Joining are locked. Use the dedicated flows to change those.' : 'Configure personal profile, sensitive banking, custom salary breakdown, and statutory overrides.'}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: "2rem", alignItems: "start" }}>
            <div className="card">
              <form id="emp-form" onSubmit={handleFormSubmit} noValidate>
                
                {/* 1. PERSONAL DETAILS */}
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1.25rem", fontSize: "1.05rem" }}>
                  Personal &amp; Employment Profile
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className={`form-control ${errors.fullName ? `is-${errors.fullName.type}` : ''}`} value={formData.fullName}
                      onChange={e => { handleInputChange('fullName', e.target.value); handleInputChange('accountHolder', e.target.value); }}
                      onBlur={validateFullName} required />
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
                      <label>Date of Birth <span style={{ color: "var(--status-danger)" }}>*</span></label>
                      <input type="date" max={maxDobDate} className={`form-control ${errors.dob ? `is-${errors.dob.type}` : ''}`} value={formData.dob}
                        onChange={e => { handleInputChange('dob', e.target.value); validateAgeAtJoining(); }} required />
                      {errors.dob && <div className={`field-msg ${errors.dob.type} show`}>{errors.dob.msg}</div>}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Gender</label>
                    <select className="form-control" value={formData.gender} onChange={e => handleInputChange('gender', e.target.value)}>
                      <option value="">-- Select --</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Blood Group</label>
                    <select className="form-control" value={formData.bloodGroup} onChange={e => handleInputChange('bloodGroup', e.target.value)}>
                      <option value="">-- Select --</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Marital Status</label>
                    <select className="form-control" value={formData.maritalStatus} onChange={e => handleInputChange('maritalStatus', e.target.value)}>
                      <option value="">-- Select --</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Personal Email <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="email" className={`form-control ${errors.personalEmail ? `is-${errors.personalEmail.type}` : ''}`} value={formData.personalEmail}
                      onChange={e => handleInputChange('personalEmail', e.target.value)} onBlur={validatePersonalEmail} required />
                    {errors.personalEmail && <div className={`field-msg ${errors.personalEmail.type} show`}>{errors.personalEmail.msg}</div>}
                    {!isAdd && employee && formData.personalEmail !== (employee.data?.personal_email || employee.personal_email) && (
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
                      onChange={e => handleInputChange('phone', e.target.value)} onBlur={validatePhone} required />
                    {errors.phone && <div className={`field-msg ${errors.phone.type} show`}>{errors.phone.msg}</div>}
                    {phoneDupChoiceVisible && (
                      <div className="inline-choice" style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button type="button" className="btn btn-primary btn-xs" onClick={acceptDuplicatePhone}>Yes, Continue</button>
                        <button type="button" className="btn btn-secondary btn-xs" onClick={rejectDuplicatePhone}>Cancel</button>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Name</label>
                    <input type="text" className="form-control" value={formData.emergencyContactName}
                      onChange={e => handleInputChange('emergencyContactName', e.target.value)} placeholder="Name of emergency contact" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Emergency Contact Number</label>
                    <input type="text" className="form-control" value={formData.emergencyContact} maxLength="10"
                      onChange={e => handleInputChange('emergencyContact', e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  {isAdd && (
                    <div className="form-group">
                      <label>Client Partner <span style={{ color: "var(--status-danger)" }}>*</span></label>
                      <select className="form-control" value={formData.clientPartner} onChange={e => handleInputChange('clientPartner', e.target.value)} disabled={isActive} required>
                        <option value="">-- Select Client --</option>
                        {clients && clients.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Designation <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className="form-control" value={formData.designation} onChange={e => handleInputChange('designation', e.target.value)} required />
                  </div>
                </div>


                <div className="form-row">
                  <div className="form-group">
                      <label>Date of Joining <span style={{ color: "var(--status-danger)" }}>*</span></label>
                      <input type="date" className={`form-control ${isActive ? 'read-only-field' : ''} ${errors.doj ? `is-${errors.doj.type}` : ''}`} value={formData.doj}
                        onChange={e => { handleInputChange('doj', e.target.value); validateAgeAtJoining(); }} readOnly={isActive} required />
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
                  
                  <div className="form-row">
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
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Residential Address <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className="form-control" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Probation End Date</label>
                    <input type="date" className={`form-control ${errors.probationEndDate ? `is-${errors.probationEndDate.type || 'error'}` : ''}`} value={formData.probationEndDate}
                      onChange={e => handleInputChange('probationEndDate', e.target.value)} />
                    {errors.probationEndDate && <div className={`field-msg ${errors.probationEndDate.type || 'error'} show`}>{errors.probationEndDate.msg}</div>}
                  </div>
                  <div className="form-group">
                    <label>Reporting Manager</label>
                    <select className={`form-control ${errors.reportingManagerId ? `is-${errors.reportingManagerId.type || 'error'}` : ''}`} value={formData.reportingManagerId}
                      onChange={e => handleInputChange('reportingManagerId', e.target.value)}>
                      <option value="">-- None --</option>
                      {clientActiveEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                      ))}
                    </select>
                    {errors.reportingManagerId && <div className={`field-msg ${errors.reportingManagerId.type || 'error'} show`}>{errors.reportingManagerId.msg}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      Notice Period (Days)
                      <span className={`badge ${overrides.noticePeriod ? 'badge-gold' : 'badge-neutral'}`}>{overrides.noticePeriod ? 'Overridden' : 'Inherited'}</span>
                    </label>
                    <input type="number" className={`form-control ${errors.noticePeriodDays ? `is-${errors.noticePeriodDays.type || 'error'}` : ''}`} value={formData.noticePeriodDays} min="0"
                      onChange={e => { handleInputChange('noticePeriodDays', e.target.value); toggleOverride('noticePeriod'); }} placeholder="e.g. 30" />
                    {errors.noticePeriodDays && <div className={`field-msg ${errors.noticePeriodDays.type || 'error'} show`}>{errors.noticePeriodDays.msg}</div>}
                  </div>
                </div>

                {formData.priorEmploymentFlag && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Previous Employer Name</label>
                      <input type="text" className="form-control" value={formData.prevEmployerName}
                        onChange={e => handleInputChange('prevEmployerName', e.target.value)} placeholder="Previous company name" />
                    </div>
                    <div className="form-group">
                      <label>Previous Employer UAN</label>
                      <input type="text" className="form-control" value={formData.prevEmployerUAN}
                        onChange={e => handleInputChange('prevEmployerUAN', e.target.value)} placeholder="Previous UAN (if available)" />
                    </div>
                  </div>
                )}


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
                    <span style={{ fontWeight: "500", color: "var(--text-main)" }}>🔒 Locked — use <Link href={route('employees.bank-change-requests')} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Bank Change Requests</Link> to update</span>
                  </div>
                ) : (
                  <div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Account Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.accountNo ? `is-${errors.accountNo.type}` : ''}`} value={formData.accountNo}
                          onChange={e => handleInputChange('accountNo', e.target.value)} onBlur={validateAccountMatch} required />
                      </div>
                      <div className="form-group">
                        <label>Confirm Account Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.accountNoConfirm ? `is-${errors.accountNoConfirm.type}` : ''}`} value={formData.accountNoConfirm}
                          onChange={e => handleInputChange('accountNoConfirm', e.target.value)} onBlur={validateAccountMatch} required />
                        {errors.accountNoConfirm && <div className={`field-msg ${errors.accountNoConfirm.type} show`}>{errors.accountNoConfirm.msg}</div>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>IFSC Code <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.ifsc ? `is-${errors.ifsc.type}` : ''}`} value={formData.ifsc}
                          onChange={e => handleInputChange('ifsc', e.target.value.toUpperCase())} onBlur={validateIFSC} required />
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
                        <label>Account Holder Name <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className="form-control" value={formData.accountHolder} onChange={e => handleInputChange('accountHolder', e.target.value)} required />
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
                    <label>Permanent Account Number (PAN) <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className={`form-control ${errors.pan ? `is-${errors.pan.type}` : ''}`} value={formData.pan}
                      onChange={e => handleInputChange('pan', e.target.value.toUpperCase())} onBlur={validatePAN} required />
                    {errors.pan && <div className={`field-msg ${errors.pan.type} show`}>{errors.pan.msg}</div>}
                    <small style={{ color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Note: Name on PAN must exactly match the Full Name entered above to avoid statutory rejection.</small>
                  </div>
                  <div className="form-group">
                    <label>Aadhaar Number</label>
                    <input type="text" className="form-control" 
                      value={isAadhaarFocused ? formData.aadhaar : ''}
                      placeholder={isAadhaarFocused ? "12-digit Aadhaar" : "Click to reveal/edit"}
                      onFocus={() => setIsAadhaarFocused(true)} 
                      onBlur={() => setIsAadhaarFocused(false)} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        handleInputChange('aadhaar', val);
                      }} 
                      maxLength="12"
                    />
                    {!isAadhaarFocused && formData.aadhaar && <div style={{ fontFamily: "monospace", letterSpacing: "0.1em", fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{`••••••••${formData.aadhaar.slice(-4)}`}</div>}
                  </div>
                </div>



                {/* 4. SALARY STRUCTURE */}
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginTop: "2rem", marginBottom: "1.25rem", fontSize: "1.05rem" }}>
                  Salary Structure &amp; Compensation (Monthly)
                </h3>

                {isActive ? (
                  <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "500", color: "var(--text-main)" }}>🔒 Locked — use <Link href={route('employees.salary-revision.create', empId)} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Revise Salary</Link> to update</span>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ fontSize: "0.95rem", color: "var(--primary-navy)", marginBottom: "1rem" }}>Earnings Breakdown</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>1. Basic Pay (₹)</label>
                        <input type="number" className={`form-control ${errors.basicSal ? `is-${errors.basicSal.type}` : ''}`} value={formData.basicSal}
                          onChange={e => handleInputChange('basicSal', e.target.value)} onBlur={validateBasicPct} min="0" required />
                        {errors.basicSal && <div className={`field-msg ${errors.basicSal.type} show`}>{errors.basicSal.msg}</div>}
                      </div>
                      <div className="form-group">
                        <label>2. HRA (₹)</label>
                        <input type="number" className="form-control" value={formData.hraSal} onChange={e => handleInputChange('hraSal', e.target.value)} min="0" required />
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
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Professional Tax Override (₹)</label>
                        <input type="number" className="form-control" placeholder="Leave blank for 0" value={formData.ptDeduction} onChange={e => handleInputChange('ptDeduction', e.target.value)} />
                        <small style={{ color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                          Default is 0 if blank.<br/>
                          (Note: Professional Tax (PT) is currently contributing ₹0 to this deduction, likely because it was left blank/overridden to 0 or the specific state slab doesn't trigger for this exact amount yet).
                        </small>
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
                  {formData.pfToggle && (
                    <div style={{ backgroundColor: "#FFFFFF", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", marginTop: "0.5rem" }}>
                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: "0" }}>
                          <label>UAN Mode <span style={{ color: "var(--status-danger)" }}>*</span></label>
                          <select className={`form-control ${errors.uanMode ? 'is-invalid' : ''}`} value={formData.uanMode} onChange={e => handleInputChange('uanMode', e.target.value)}>
                            <option value="new">Pending / New Registration</option>
                            <option value="existing_transfer">Existing UAN</option>
                          </select>
                          {errors.uanMode && <div className="invalid-feedback">{errors.uanMode.msg || errors.uanMode}</div>}
                        </div>
                        {formData.uanMode === 'existing_transfer' && (
                          <div className="form-group" style={{ marginBottom: "0" }}>
                            <label>UAN Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                            <input type="text" className={`form-control ${errors.uan ? 'is-invalid' : ''}`} value={formData.uan} onChange={e => handleInputChange('uan', e.target.value)} placeholder="12-digit UAN" maxLength="12" />
                            {errors.uan && <div className="invalid-feedback">{errors.uan.msg || errors.uan}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                  {formData.esiToggle && (
                    <div style={{ backgroundColor: "#FFFFFF", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", marginTop: "0.5rem" }}>
                      <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                        <label>ESIC IP Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.esiNo ? 'is-invalid' : ''}`} value={formData.esiNo} onChange={e => handleInputChange('esiNo', e.target.value)} placeholder="10-digit ESIC Number" maxLength="10" />
                        {errors.esiNo && <div className="invalid-feedback">{errors.esiNo.msg || errors.esiNo}</div>}
                      </div>
                      <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>ESI Contribution Period End</label>
                        <input type="date" className={`form-control ${errors.esiPeriodEnd ? `is-${errors.esiPeriodEnd.type || 'error'}` : ''}`} value={formData.esiPeriodEnd}
                          onChange={e => handleInputChange('esiPeriodEnd', e.target.value)} />
                        {errors.esiPeriodEnd && <div className={`field-msg ${errors.esiPeriodEnd.type || 'error'} show`}>{errors.esiPeriodEnd.msg}</div>}
                      </div>
                    </div>
                  )}
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

                
                {!isAdd && (
                  <div id="edit-footer-note" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Looking to update bank details, salary, or statutory settings? Go to: <Link href={route('employees.bank-change-requests')} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Bank Change Requests</Link> · <Link href={route('employees.salary-revision.create', empId)} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Revise Salary</Link>
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

                {isAdd && (
                  <div className="alert-banner info" style={{ marginTop: "1rem", backgroundColor: "#E0F2FE", border: "1px solid #BAE6FD", color: "#0369A1", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                    ℹ️ <strong>Note:</strong> New employees start in <strong>Onboarding</strong> status. Upload and get all required documents verified to activate them under their assigned client.
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "2rem" }}>
                  <Link href={route('employees.index')} className="btn btn-secondary">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={processing} onClick={() => {
                    if (blockingErrors.size > 0) {
                      showToast({ type: 'error', title: 'Cannot Save Employee', message: Array.from(blockingErrors).join(' | ') });
                    }
                  }}>
                    {processing ? 'Saving...' : 'Save Employee Configuration'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Right Side Notes Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="card" style={{ padding: "1.25rem", background: "#f8faff", border: "1px solid #d0dfff" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>👤</span> Personal Details
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>Ensure the PAN matches the Full Name perfectly. Phone numbers and Emails are checked for duplicates against our database.</p>
              </div>
              
              <div className="card" style={{ padding: "1.25rem", background: "#f8faff", border: "1px solid #d0dfff" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏦</span> Banking Info
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>The IFSC code automatically fetches the correct Branch and Bank Name directly via the Razorpay API. Double check the account number.</p>
              </div>
              
              <div className="card" style={{ padding: "1.25rem", background: "#f8faff", border: "1px solid #d0dfff" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>💰</span> Salary Structure
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>By law, Basic Pay should ideally be 50% or more of the CTC. The preview calculates exact Employer Contributions dynamically.</p>
              </div>
              
              <div className="card" style={{ padding: "1.25rem", background: "#f8faff", border: "1px solid #d0dfff" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>⚖️</span> Statutory Compliance
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>PF wage ceiling is inherited from the client. ESI is disabled automatically if Gross exceeds ₹21,000. PT override bypasses state slabs.</p>
              </div>
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
