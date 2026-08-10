import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { 
  ArrowLeft, 
  Landmark, 
  Lock, 
  Settings, 
  Info, 
  AlertOctagon, 
  User, 
  IndianRupee, 
  Scale, 
  AlertTriangle, 
  Save, 
  Shield,
  X 
} from 'lucide-react';
import './EmployeeForm.css';
import RoleGuard from '../../Components/RoleGuard.jsx';
import axios from 'axios';
import useToast from '../../Hooks/useToast';
import { runJQueryValidation } from '../../Utils/jqueryValidation';


export default function EmployeeForm({ clients = [], errors: serverErrors, employee = null }) {
  const [formMode, setFormMode] = useState('add');
  const [empId, setEmpId] = useState(employee ? employee.data?.id || employee.id : null);
  const { showToast } = useToast();
  const emp = employee ? (employee.data || employee) : null;

  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  }, []);

  const [formData, setFormData] = useState(() => {
    let clientIdParam = '';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      clientIdParam = urlParams.get('client_id') || '';
    }
    
    return {
      firstName: emp?.first_name || (emp?.full_name ? emp.full_name.split(' ')[0] : ''),
      lastName: emp?.last_name || (emp?.full_name ? emp.full_name.split(' ').slice(1).join(' ') : ''),
      fatherName: emp?.father_name || '',
      motherName: emp?.mother_name || '',
      spouseName: emp?.spouse_name || '',
      fullName: emp?.full_name || '',
      gender: emp?.gender || '',
      bloodGroup: emp?.blood_group || '',
      maritalStatus: emp?.marital_status || '',
      dob: emp?.date_of_birth || '',
      personalEmail: emp?.personal_email || '',
      phone: emp?.phone_number || '',
      emergencyContact: emp?.emergency_contact_phone || '',
      clientPartner: emp?.client_id || clientIdParam || '',
      branchPartner: emp?.branch_id || emp?.branchId || '',
      designation: emp?.designation || '',
      doj: emp?.date_of_joining || '',
      attendanceTrackingStartDate: emp?.attendance_tracking_start_date || '',
      empType: emp?.employment_model || 'eor',
      priorEmploymentFlag: emp ? Boolean(emp.prior_employment_flag) : true,
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
      pfMemberId: emp?.pf_member_id || '',
      memberRelationship: emp?.member_relationship || 'F',
      esiMode: emp?.esi_mode || 'new',
      esiNo: emp?.esic_number || '',
      basicSal: emp?.basic_pay ?? '',
      hraSal: emp?.hra ?? '',
      conveyanceSal: emp?.conveyance ?? '',
      daSal: emp?.da ?? '',
      medicalSal: emp?.medical_allowance ?? '',
      specialSal: emp?.special_allowance ?? '',
      otherSal: emp?.other_additions ?? '',
      ptDeduction: emp?.pt_deduction_override ?? '',
      pfToggle: emp ? Boolean(emp.pf_applicable) : true,
      epsToggle: emp ? (emp.eps_applicable !== undefined ? Boolean(emp.eps_applicable) : true) : true,
      esiToggle: emp ? Boolean(emp.esi_applicable) : true,
      tdsToggle: emp ? Boolean(emp.tds_applicable) : true,
      ptToggle: emp ? Boolean(emp.pt_applicable) : true,
      lwfToggle: emp ? Boolean(emp.lwf_applicable) : true,
      bonusToggle: emp ? Boolean(emp.bonus_toggle) : true,
      taxRegime: emp?.tds_regime || 'new',
      declarations: emp ? (Boolean(emp.declarations_accepted) ? 'yes' : 'no') : 'yes',
      gratuityMode: emp?.gratuity_mode || 'part_of_ctc',
      lopBasis: emp?.lop_basis_days || '26',
      weeklyOffPattern: emp?.weekly_off_pattern || emp?.weeklyOffPattern || '',
      weekly_off_pattern: emp?.weekly_off_pattern || emp?.weeklyOffPattern || '',
      emergencyContactName: emp?.emergency_contact_name || '',
      prevEmployerName: emp?.previous_employer_name || '',
      prevEmployerUAN: emp?.previous_employer_uan || '',
      probationEndDate: emp?.probation_end_date || '',
      reportingManagerId: emp?.reporting_manager_id || '',
      noticePeriodDays: emp?.notice_period_days ?? '',
      esiPeriodEnd: emp?.esi_contribution_period_end || '',
      insuranceProvider: emp?.health_insurance_provider || '',
      insurancePolicyNo: emp?.health_insurance_policy_no || '',
      insuranceSumInsured: emp?.health_insurance_sum_insured ?? '',
      jointDeclarationStatus: emp?.joint_declaration_status || 'not_required',
    };
  });

  const [overrides, setOverrides] = useState({
    pf: false, esi: false, tds: false, pt: false, lwf: false, bonus: false, gratuity: false, lop: false, noticePeriod: false, weeklyOff: emp ? Boolean(emp.weekly_off_pattern || emp.weeklyOffPattern) : false
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
        const selectedClientId = formData.clientPartner || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('client_id') : null);
        const payload = {
          client_id: selectedClientId,
          basic_pay: formData.basicSal || 0,
          hra: formData.hraSal || 0,
          conveyance: formData.conveyanceSal || 0,
          da: formData.daSal || 0,
          medical_allowance: formData.medicalSal || 0,
          special_allowance: formData.specialSal || 0,
          other_additions: formData.otherSal || 0,
          pf_applicable: formData.pfToggle,
          eps_applicable: formData.epsToggle,
          esi_applicable: formData.esiToggle,
          pt_applicable: formData.ptToggle,
          lwf_applicable: formData.lwfToggle,
          pt_deduction_override: formData.ptDeduction,
          gender: formData.gender,
          date_of_birth: formData.dob
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
    formData.clientPartner, formData.gender, formData.dob,
    formData.basicSal, formData.hraSal, formData.conveyanceSal, 
    formData.daSal, formData.medicalSal, formData.specialSal, 
    formData.otherSal, formData.pfToggle, formData.epsToggle, formData.esiToggle, 
    formData.ptToggle, formData.lwfToggle, formData.ptDeduction
  ]);

  const [activeClientDefaults, setActiveClientDefaults] = useState(null);
  const [clientActiveEmployees, setClientActiveEmployees] = useState([]);
  const [clientContactPersons, setClientContactPersons] = useState([]);

  // Fetch active employees & contact persons for Reporting Manager / Reporting To dropdown
  useEffect(() => {
    if (!formData.clientPartner) {
      setClientActiveEmployees([]);
      setClientContactPersons([]);
      return;
    }
    axios.get(route('clients.activeEmployees', formData.clientPartner))
      .then(res => {
        const rawData = Array.isArray(res.data) ? res.data : (res.data?.all || res.data?.employees || []);
        const contactsList = rawData.filter(item => item.is_contact || String(item.id).startsWith('contact_'));
        const employeesList = rawData.filter(item => !item.is_contact && !String(item.id).startsWith('contact_'));
        
        setClientContactPersons(contactsList);
        setClientActiveEmployees(employeesList);
      })
      .catch(() => {
        setClientActiveEmployees([]);
        setClientContactPersons([]);
      });
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

        const clientLop = d.lopBasisDays !== undefined && d.lopBasisDays !== null && d.lopBasisDays !== '' 
          ? String(d.lopBasisDays).replace(/\D/g, '') 
          : '26';
        const clientNotice = d.noticePeriodDays !== undefined && d.noticePeriodDays !== null && d.noticePeriodDays !== ''
          ? String(d.noticePeriodDays)
          : '30';

        // Only apply client statutory defaults when adding a new employee.
        // When editing an existing employee, retain their saved statutory profile and calculate override badges.
        if (!employee) {
          setFormData(prev => {
            const next = { ...prev };
            if (d.contractType) {
              next.empType = d.contractType === 'agency' ? 'agency_contract' : 'eor';
            }
            if (d.branches && d.branches.length > 0 && !next.branchPartner) {
              next.branchPartner = d.branches[0].id;
            }
            if (!overrides.pf) next.pfToggle = d.pfApplicable;
            if (!overrides.esi) next.esiToggle = d.esiApplicable;
            if (!overrides.tds) next.taxRegime = d.tdsRegime;
            if (!overrides.pt) next.ptToggle = d.ptApplicable;
            if (!overrides.lwf) next.lwfToggle = d.lwfApplicable;
            if (!overrides.bonus) next.bonusToggle = d.statutoryBonusApplicable;
            if (!overrides.gratuity) {
              if (d.gratuityMode === 'na' || d.gratuityMode === 'ctc_included') {
                 next.gratuityMode = 'part_of_ctc';
              } else if (d.gratuityMode === 'over_ctc') {
                 next.gratuityMode = 'over_and_above';
              } else {
                 next.gratuityMode = d.gratuityMode;
              }
            }
            if (!overrides.lop) {
                 next.lopBasis = clientLop;
            }
            if (!overrides.noticePeriod) {
                 next.noticePeriodDays = clientNotice;
            }
            return next;
          });
        } else {
          // In edit mode: dynamically evaluate if saved LOP / notice period differ from client defaults
          setOverrides(prev => {
            const currentLop = formData.lopBasis ? String(formData.lopBasis).replace(/\D/g, '') : '';
            const currentNotice = formData.noticePeriodDays !== undefined && formData.noticePeriodDays !== null && formData.noticePeriodDays !== '' ? String(formData.noticePeriodDays) : '';
            
            const isLopOverridden = currentLop !== '' && currentLop !== clientLop;
            const isNoticeOverridden = currentNotice !== '' && currentNotice !== clientNotice;

            return {
              ...prev,
              lop: isLopOverridden,
              noticePeriod: isNoticeOverridden,
            };
          });
        }
      })
      .catch(err => console.error("Failed to fetch statutory defaults:", err));
  }, [formData.clientPartner, employee]);

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

  const calculateProbationEndDate = (monthsToAdd) => {
    if (!formData.doj) {
      setErrorMsg('doj', 'Please select Date of Joining first to calculate Probation End Date.', 'error');
      setErrorMsg('probationEndDate', 'Please select Date of Joining first to use month presets.', 'error');
      return;
    }
    clearErrorMsg('probationEndDate');

    const parts = formData.doj.split('-');
    if (parts.length !== 3) return;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!year || !month || !day) return;

    const targetDate = new Date(year, month - 1 + parseInt(monthsToAdd, 10), day);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    handleInputChange('probationEndDate', formattedDate);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearErrorMsg(field);

    // Live validation triggers for fields as user types / edits
    if (field === 'firstName') validateFirstName(value);
    if (field === 'lastName') validateLastName(value);
    if (field === 'fatherName') validateFatherName(value);
    if (field === 'dob') validateDOB(value);
    if (field === 'clientPartner') validateClientPartner(value);
    if (field === 'designation') validateDesignation(value);
    if (field === 'doj') validateDOJ(value);
    if (field === 'address') validateAddress(value);
    if (field === 'accountNo') validateAccountNo(value);
    if (field === 'accountNoConfirm') validateAccountNoConfirm(value, formData.accountNo);
    if (field === 'accountHolder') validateAccountHolder(value);
    if (field === 'pan') validatePAN(value);
    if (field === 'basicSal') validateBasicSal(value);
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
  const validateNameFields = () => {
    const currentFull = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
    const originalName = employee ? (employee.data?.full_name || employee.full_name) : null;
    if (formMode !== 'add' && originalName && currentFull !== originalName) {
      setNameChangeUploadVisible(true);
      addBlocker('Name change requires supporting document upload'); 
    } else {
      setNameChangeUploadVisible(false);
      removeBlocker('Name change requires supporting document upload');
    }
  };

  const validateFirstName = (val = formData.firstName) => {
    if (!val || !val.trim()) {
      setErrorMsg('firstName', '⛔ First name is required.', 'error');
      addBlocker('First name is required');
      return false;
    }
    clearErrorMsg('firstName');
    removeBlocker('First name is required');
    validateNameFields();
    return true;
  };

  const validateLastName = (val = formData.lastName) => {
    if (!val || !val.trim()) {
      setErrorMsg('lastName', '⛔ Last name is required.', 'error');
      addBlocker('Last name is required');
      return false;
    }
    clearErrorMsg('lastName');
    removeBlocker('Last name is required');
    validateNameFields();
    return true;
  };

  const validateFatherName = (val = formData.fatherName) => {
    if (!val || !val.trim()) {
      setErrorMsg('fatherName', '⛔ Father\'s name is required.', 'error');
      addBlocker('Father\'s name is required');
      return false;
    }
    clearErrorMsg('fatherName');
    removeBlocker('Father\'s name is required');
    return true;
  };

  const validateDOB = (val = formData.dob) => {
    if (isAdd && (!val || !val.trim())) {
      setErrorMsg('dob', '⛔ Date of birth is required.', 'error');
      addBlocker('Date of birth is required');
      return false;
    }
    if (!val) return true;
    clearErrorMsg('dob');
    removeBlocker('Date of birth is required');
    validateAgeAtJoining();
    return true;
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

  const checkLiveUniqueness = async (field, value) => {
    if (!value) return;
    try {
      const res = await axios.get(route('employees.check-unique'), {
        params: {
          field,
          value,
          ignore_id: !isAdd ? empId : null
        }
      });
      const fieldKey = field === 'personal_email' ? 'personalEmail' : 'phone';
      const labelStr = field === 'personal_email' ? 'Personal email' : 'Phone number';
      if (res.data && res.data.available === false) {
        setErrorMsg(fieldKey, `⛔ ${res.data.message}`, 'error');
        addBlocker(`${labelStr} is already registered`);
      } else {
        removeBlocker(`${labelStr} is already registered`);
      }
    } catch (e) {
      // Ignore network errors in live check UX helper
    }
  };

  const validatePersonalEmail = async () => {
    if (!formData.personalEmail) {
      setErrorMsg('personalEmail', '⛔ Personal email is required.', 'error');
      addBlocker('Personal email is required and must be valid');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail)) {
      setErrorMsg('personalEmail', '⛔ Enter a valid email address.', 'error');
      addBlocker('Personal email is required and must be valid');
      return false;
    }
    removeBlocker('Personal email is required and must be valid');
    await checkLiveUniqueness('personal_email', formData.personalEmail);
    return true;
  };

  const validatePhone = async () => {
    setPhoneDupChoiceVisible(false);
    removeBlocker('Phone number must be exactly 10 digits');
    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) {
      setErrorMsg('phone', '⛔ Phone number must be exactly 10 digits.', 'error');
      addBlocker('Phone number must be exactly 10 digits');
      return false;
    }
    clearErrorMsg('phone');
    await checkLiveUniqueness('phone_number', formData.phone);
    return true;
  };

  const validateClientPartner = (val = formData.clientPartner) => {
    if (isAdd && (!val || !String(val).trim())) {
      setErrorMsg('clientPartner', '⛔ Client partner is required.', 'error');
      addBlocker('Client partner is required');
      return false;
    }
    clearErrorMsg('clientPartner');
    removeBlocker('Client partner is required');
    return true;
  };

  const validateDesignation = (val = formData.designation) => {
    if (!val || !val.trim()) {
      setErrorMsg('designation', '⛔ Designation is required.', 'error');
      addBlocker('Designation is required');
      return false;
    }
    clearErrorMsg('designation');
    removeBlocker('Designation is required');
    return true;
  };

  const validateDOJ = (val = formData.doj) => {
    if (!val || !val.trim()) {
      setErrorMsg('doj', '⛔ Date of joining is required.', 'error');
      addBlocker('Date of joining is required');
      return false;
    }
    clearErrorMsg('doj');
    removeBlocker('Date of joining is required');
    validateAgeAtJoining();
    return true;
  };

  const validateAddress = (val = formData.address) => {
    if (!val || !val.trim()) {
      setErrorMsg('address', '⛔ Residential address is required.', 'error');
      addBlocker('Residential address is required');
      return false;
    }
    clearErrorMsg('address');
    removeBlocker('Residential address is required');
    return true;
  };

  const acceptDuplicatePhone = () => {
    setPhoneDupChoiceVisible(false);
    clearErrorMsg('phone');
  };

  const rejectDuplicatePhone = () => {
    handleInputChange('phone', '');
    setPhoneDupChoiceVisible(false);
  };

  const validateAccountNo = (val = formData.accountNo) => {
    if (isActive) return true;
    if (!val || !val.trim()) {
      setErrorMsg('accountNo', '⛔ Bank account number is required.', 'error');
      addBlocker('Bank account number is required');
      return false;
    }
    if (!/^\d{9,18}$/.test(val.trim())) {
      setErrorMsg('accountNo', '⛔ Account number must be 9 to 18 digits.', 'error');
      addBlocker('Account number format is invalid');
      return false;
    }
    clearErrorMsg('accountNo');
    removeBlocker('Bank account number is required');
    removeBlocker('Account number format is invalid');
    validateAccountMatch();
    return true;
  };

  const validateAccountNoConfirm = (valConfirm = formData.accountNoConfirm, valAcc = formData.accountNo) => {
    if (isActive) return true;
    if (!valConfirm || !valConfirm.trim()) {
      setErrorMsg('accountNoConfirm', '⛔ Confirm account number is required.', 'error');
      addBlocker('Account numbers do not match');
      return false;
    }
    if (valConfirm !== valAcc) {
      setErrorMsg('accountNoConfirm', '⛔ Account numbers do not match.', 'error');
      addBlocker('Account numbers do not match');
      return false;
    }
    clearErrorMsg('accountNoConfirm');
    removeBlocker('Account numbers do not match');
    return true;
  };

  const validateAccountMatch = () => {
    removeBlocker('Account numbers do not match');
    if (!formData.accountNo || !formData.accountNoConfirm) return;
    if (formData.accountNo !== formData.accountNoConfirm) {
      setErrorMsg('accountNoConfirm', '⛔ Account numbers do not match.', 'error');
      addBlocker('Account numbers do not match');
    }
  };

  const validateAccountHolder = (val = formData.accountHolder) => {
    if (isActive) return true;
    if (!val || !val.trim()) {
      setErrorMsg('accountHolder', '⛔ Account holder name is required.', 'error');
      addBlocker('Account holder name is required');
      return false;
    }
    clearErrorMsg('accountHolder');
    removeBlocker('Account holder name is required');
    return true;
  };

  const validateIFSC = async () => {
    if (isActive) return true;
    removeBlocker('IFSC code format is invalid');
    removeBlocker('IFSC code not found');
    removeBlocker('IFSC code is required');
    if (!formData.ifsc) {
      setErrorMsg('ifsc', '⛔ IFSC code is required.', 'error');
      addBlocker('IFSC code is required');
      setFormData(prev => ({ ...prev, bankName: '', bankBranch: '' }));
      return false;
    }
    const ifscUpper = formData.ifsc.toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscUpper)) {
      setErrorMsg('ifsc', '⛔ IFSC must be 4 letters + 0 + 6 alphanumeric chars (e.g. HDFC0000060).', 'error');
      addBlocker('IFSC code format is invalid');
      setFormData(prev => ({ ...prev, bankName: '', bankBranch: '' }));
      return false;
    }
    
    try {
      const res = await axios.get(`https://ifsc.razorpay.com/${ifscUpper}`);
      if (res.data) {
        setFormData(prev => ({ ...prev, bankName: res.data.BANK, bankBranch: res.data.BRANCH }));
        setErrorMsg('ifsc', '✅ Verified', 'success');
        return true;
      }
    } catch (err) {
      setFormData(prev => ({ ...prev, bankName: '', bankBranch: '' }));
      setErrorMsg('ifsc', '⛔ Invalid IFSC code or not found.', 'error');
      addBlocker('IFSC code not found');
      return false;
    }
    return true;
  };

  const validatePAN = (val = formData.pan) => {
    if (!val || !val.trim()) {
      setErrorMsg('pan', '⛔ Permanent Account Number (PAN) is required.', 'error');
      addBlocker('PAN is required');
      return false;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val.toUpperCase())) {
      setErrorMsg('pan', '⛔ Invalid PAN format. Must be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).', 'error');
      addBlocker('PAN format is invalid');
      return false;
    }
    clearErrorMsg('pan');
    removeBlocker('PAN is required');
    removeBlocker('PAN format is invalid');
    validateNameFields();
    return true;
  };

  const validateBasicSal = (val = formData.basicSal) => {
    if (isActive) return true;
    const num = Number(val);
    if (val === '' || val === null || val === undefined || isNaN(num) || num <= 0) {
      setErrorMsg('basicSal', '⛔ Basic Pay is mandatory for salary structure and must be greater than 0.', 'error');
      addBlocker('Basic Pay is required for salary structure');
      return false;
    }
    clearErrorMsg('basicSal');
    removeBlocker('Basic Pay is required for salary structure');
    validateBasicPct();
    return true;
  };

  const validateBasicPct = () => {
    removeBlocker('Basic Pay must be at least 50% of CTC');
    if (grossCTC === 0) return;
    const pct = (Number(formData.basicSal) / grossCTC) * 100;
    if (pct < 50) {
      setErrorMsg('basicSal', `⚠ Basic Pay (₹${formData.basicSal.toLocaleString('en-IN')}) is ${pct.toFixed(1)}% of CTC — usually should be at least 50% as per new wage code rules, but you can proceed.`, 'warn');
    }
  };

  const validateAllFields = async () => {
    let valid = true;
    if (!validateFirstName(formData.firstName)) valid = false;
    if (!validateLastName(formData.lastName)) valid = false;
    if (!validateFatherName(formData.fatherName)) valid = false;
    if (!validateDOB(formData.dob)) valid = false;
    if (!validateClientPartner(formData.clientPartner)) valid = false;
    if (!validateDesignation(formData.designation)) valid = false;
    if (!validateDOJ(formData.doj)) valid = false;
    if (!validateAddress(formData.address)) valid = false;
    if (!validatePAN(formData.pan)) valid = false;
    
    const emailValid = await validatePersonalEmail();
    if (!emailValid) valid = false;

    const phoneValid = await validatePhone();
    if (!phoneValid) valid = false;

    if (!isActive) {
      if (!validateAccountNo(formData.accountNo)) valid = false;
      if (!validateAccountNoConfirm(formData.accountNoConfirm, formData.accountNo)) valid = false;
      if (!validateAccountHolder(formData.accountHolder)) valid = false;
      if (!validateBasicSal(formData.basicSal)) valid = false;
      const ifscValid = await validateIFSC();
      if (!ifscValid) valid = false;
    }

    return valid;
  };

  // ESI limits check
  useEffect(() => {
    const limit = activeClientDefaults ? activeClientDefaults.esiLimit : 21000;
    if (grossCTC > limit) {
      if (formMode !== 'add' && formData.esiToggle) {
        setErrorMsg('esiWarning', `ℹ Gross salary now exceeds ESI threshold (₹${limit}). ESI contribution continues until end of period.`, 'warn');
      } else {
        if (!overrides.esi) {
          handleInputChange('esiToggle', false);
        }
        setErrorMsg('esiWarning', `⚠ Gross salary exceeds ESI threshold (₹${limit}) — ESI does not apply.`, 'error');
      }
    } else {
      clearErrorMsg('esiWarning');
      if (grossCTC > 0 && !overrides.esi) {
        handleInputChange('esiToggle', true);
      }
    }
  }, [grossCTC, activeClientDefaults, formMode]);

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
    
    const isValid = await validateAllFields();

    if (!isValid || blockingErrors.size > 0) {
      setProcessing(false);
      setTimeout(() => {
        runJQueryValidation('#emp-form', errors);
      }, 50);
      return;
    }
    
    const errorKeyMap = {
      'client_id': 'clientPartner', 'first_name': 'firstName', 'last_name': 'lastName', 'father_name': 'fatherName', 'mother_name': 'motherName', 'spouse_name': 'spouseName', 'full_name': 'fullName', 'personal_email': 'personalEmail',
      'phone_number': 'phone', 'emergency_contact_phone': 'emergencyContact', 'date_of_birth': 'dob',
      'date_of_joining': 'doj', 'attendance_tracking_start_date': 'attendanceTrackingStartDate', 'employment_model': 'empType', 'prior_employment_flag': 'priorEmploymentFlag',
      'residential_address': 'address', 'bank_account_number': 'accountNo', 'bank_ifsc': 'ifsc',
      'bank_name': 'bankName', 'bank_branch': 'bankBranch', 'account_holder_name': 'accountHolder',
      'gender': 'gender', 'blood_group': 'bloodGroup', 'marital_status': 'maritalStatus',
      'pan_number': 'pan', 'aadhaar_number': 'aadhaar', 'uan_mode': 'uanMode', 'uan_number': 'uan', 'pf_member_id': 'pfMemberId', 'member_relationship': 'memberRelationship',
      'esi_mode': 'esiMode', 'esic_number': 'esiNo', 'basic_pay': 'basicSal', 'hra': 'hraSal', 'conveyance': 'conveyanceSal',
      'da': 'daSal', 'medical_allowance': 'medicalSal', 'special_allowance': 'specialSal',
      'other_additions': 'otherSal', 'pt_deduction_override': 'ptDeduction', 'tds_regime': 'taxRegime',
      'gratuity_mode': 'gratuityMode', 'lop_basis_days': 'lopBasis',
      'emergency_contact_name': 'emergencyContactName', 'previous_employer_name': 'prevEmployerName',
      'previous_employer_uan': 'prevEmployerUAN', 'probation_end_date': 'probationEndDate',
      'reporting_manager_id': 'reportingManagerId', 'notice_period_days': 'noticePeriodDays',
      'esi_contribution_period_end': 'esiPeriodEnd', 'designation': 'designation', 'branch_id': 'branchPartner',
      'health_insurance_provider': 'insuranceProvider', 'health_insurance_policy_no': 'insurancePolicyNo', 'health_insurance_sum_insured': 'insuranceSumInsured',
      'joint_declaration_status': 'jointDeclarationStatus',
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
          const msgText = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : String(serverErrors[key]);
          mappedErrors[frontendKey] = { msg: msgText, type: 'error' };
          errorMessages.push(msgText);
        });
        setErrors(prev => ({ ...prev, ...mappedErrors }));
        setTimeout(() => {
          runJQueryValidation('#emp-form', mappedErrors);
        }, 50);
      }
    });
  };

  const toggleOverride = (field) => {
    setOverrides(prev => ({ ...prev, [field]: true }));
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="candidates">
      <AuthenticatedLayout>
        <Head title={isAdd ? "Add New Employee" : `Edit Employee (${isActive ? 'Active' : 'Onboarding'})`} />
        
        <div className="legacy-react-wrapper">
          <div className="mb-6">
            <Link href={route('employees.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline inline-flex items-center gap-1">
              ← Back to Employees Directory
            </Link>
            <h2 id="form-page-title" className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">
              {isAdd ? 'Add New Employee' : `Edit Employee — ${isActive ? 'Active' : 'Onboarding'}`}
            </h2>
            <p id="form-page-subtitle" className="text-gray-500 text-sm">
              {isActive ? 'Salary, bank details and Date of Joining are locked. Use dedicated flows to change those.' : 'Configure personal profile, sensitive banking, custom salary breakdown, and statutory overrides.'}
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
                    <label>First Name <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className={`form-control ${errors.firstName ? `is-${errors.firstName.type || 'error'}` : ''}`} value={formData.firstName}
                      onChange={e => {
                        const newFirst = e.target.value;
                        handleInputChange('firstName', newFirst);
                        const newFull = `${newFirst} ${formData.lastName || ''}`.trim();
                        handleInputChange('fullName', newFull);
                        handleInputChange('accountHolder', newFull);
                      }}
                      onBlur={validateNameFields} required />
                    {errors.firstName && <div className={`field-msg ${errors.firstName.type || 'error'} show`}>{errors.firstName.msg}</div>}
                  </div>

                  <div className="form-group">
                    <label>Last Name <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className={`form-control ${errors.lastName ? `is-${errors.lastName.type || 'error'}` : ''}`} value={formData.lastName}
                      onChange={e => {
                        const newLast = e.target.value;
                        handleInputChange('lastName', newLast);
                        const newFull = `${formData.firstName || ''} ${newLast}`.trim();
                        handleInputChange('fullName', newFull);
                        handleInputChange('accountHolder', newFull);
                      }}
                      onBlur={validateNameFields} required />
                    {errors.lastName && <div className={`field-msg ${errors.lastName.type || 'error'} show`}>{errors.lastName.msg}</div>}
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

                  {isAdd && (
                    <div className="form-group">
                      <label>Employee Code</label>
                      <input type="text" className="form-control read-only-field" value="TEC-089 (auto-assigned on save)" readOnly />
                      <div className="field-msg info show" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Lock size={12} /> Auto-generated on save. Cannot be manually set.
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Father's Name <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className={`form-control ${errors.fatherName ? `is-${errors.fatherName.type || 'error'}` : ''}`} value={formData.fatherName}
                      onChange={e => handleInputChange('fatherName', e.target.value)} onBlur={e => validateFatherName(e.target.value)} required />
                    {errors.fatherName && <div className={`field-msg ${errors.fatherName.type || 'error'} show`}>{errors.fatherName.msg}</div>}

                    {nameChangeUploadVisible && (
                      <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "var(--status-warning-bg)", borderLeft: "3px solid var(--status-warning)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ fontSize: "0.85rem", color: "var(--status-warning)", fontWeight: "600", marginBottom: "0.5rem" }}>
                          Name changes require a supporting document. Upload before saving.
                        </div>
                        <input type="file" className="form-control" style={{ fontSize: "0.8rem", padding: "0.25rem" }} onChange={() => removeBlocker('Name change requires supporting document upload')} />
                      </div>
                    )}
                  </div>
                  
                  {formData.maritalStatus === 'married' ? (
                    <div className="form-group">
                      <label>Wife / Spouse Name</label>
                      <input type="text" className={`form-control ${errors.spouseName ? `is-${errors.spouseName.type || 'error'}` : ''}`} value={formData.spouseName}
                        onChange={e => handleInputChange('spouseName', e.target.value)} placeholder="Enter wife / spouse name" />
                      {errors.spouseName && <div className={`field-msg ${errors.spouseName.type || 'error'} show`}>{errors.spouseName.msg}</div>}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Mother's Name</label>
                      <input type="text" className={`form-control ${errors.motherName ? `is-${errors.motherName.type || 'error'}` : ''}`} value={formData.motherName}
                        onChange={e => handleInputChange('motherName', e.target.value)} placeholder="Enter mother's name" />
                      {errors.motherName && <div className={`field-msg ${errors.motherName.type || 'error'} show`}>{errors.motherName.msg}</div>}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  {isAdd && (
                    <div className="form-group">
                      <label>Date of Birth <span style={{ color: "var(--status-danger)" }}>*</span></label>
                      <input type="date" max={maxDobDate} className={`form-control ${errors.dob ? `is-${errors.dob.type || 'error'}` : ''}`} value={formData.dob}
                        onChange={e => { handleInputChange('dob', e.target.value); validateAgeAtJoining(); }} onBlur={e => validateDOB(e.target.value)} required />
                      {errors.dob && <div className={`field-msg ${errors.dob.type || 'error'} show`}>{errors.dob.msg}</div>}
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
                    <label>Personal Email <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="email" className={`form-control ${errors.personalEmail ? `is-${errors.personalEmail.type || 'error'}` : ''}`} value={formData.personalEmail}
                      onChange={e => handleInputChange('personalEmail', e.target.value)} onBlur={validatePersonalEmail} required />
                    {errors.personalEmail && <div className={`field-msg ${errors.personalEmail.type || 'error'} show`}>{errors.personalEmail.msg}</div>}
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
                    <input type="text" className={`form-control ${errors.phone ? `is-${errors.phone.type || 'error'}` : ''}`} value={formData.phone} maxLength="10"
                      onChange={e => handleInputChange('phone', e.target.value)} onBlur={validatePhone} required />
                    {errors.phone && <div className={`field-msg ${errors.phone.type || 'error'} show`}>{errors.phone.msg}</div>}
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
                      <select className={`form-control ${errors.clientPartner ? `is-${errors.clientPartner.type || 'error'}` : ''}`} value={formData.clientPartner} onChange={e => handleInputChange('clientPartner', e.target.value)} onBlur={e => validateClientPartner(e.target.value)} disabled={isActive} required>
                        <option value="">-- Select Client --</option>
                        {clients && clients.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                      {errors.clientPartner && <div className={`field-msg ${errors.clientPartner.type || 'error'} show`}>{errors.clientPartner.msg}</div>}
                    </div>
                  )}

                  {formData.clientPartner && activeClientDefaults?.branches && activeClientDefaults.branches.length > 0 && (
                    <div className="form-group">
                      <label>Work Location / Branch <span style={{ color: "var(--status-danger)" }}>*</span></label>
                      <select className="form-control" value={formData.branchPartner} onChange={e => handleInputChange('branchPartner', e.target.value)} required>
                        {activeClientDefaults.branches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.state || 'Head Office'}) {b.is_head_office ? '★ Primary' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Designation <span style={{ color: "var(--status-danger)" }}>*</span></label>
                    <input type="text" className={`form-control ${errors.designation ? `is-${errors.designation.type || 'error'}` : ''}`} value={formData.designation} onChange={e => handleInputChange('designation', e.target.value)} onBlur={e => validateDesignation(e.target.value)} required />
                    {errors.designation && <div className={`field-msg ${errors.designation.type || 'error'} show`}>{errors.designation.msg}</div>}
                  </div>

                  <div className="form-group">
                    <label>Reporting To / Manager</label>
                    <select 
                      className="form-control" 
                      value={formData.reportingManagerId} 
                      onChange={e => handleInputChange('reportingManagerId', e.target.value)}
                    >
                      <option value="">-- Select Reporting Manager / Contact Person --</option>
                      {clientContactPersons && clientContactPersons.length > 0 && (
                        <optgroup label="Client Contact Persons">
                          {clientContactPersons.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.full_name} {c.designation ? `— ${c.designation}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {clientActiveEmployees && clientActiveEmployees.length > 0 && (
                        <optgroup label="Active Employees">
                          {clientActiveEmployees.map(empItem => (
                            <option key={empItem.id} value={empItem.id}>
                              {empItem.full_name} ({empItem.employee_code}) {empItem.designation ? `— ${empItem.designation}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>


                <div className="form-row">
                  <div className="form-group">
                      <label>Date of Joining <span style={{ color: "var(--status-danger)" }}>*</span></label>
                      <input type="date" className={`form-control ${isActive ? 'read-only-field' : ''} ${errors.doj ? `is-${errors.doj.type || 'error'}` : ''}`} value={formData.doj}
                        onChange={e => { handleInputChange('doj', e.target.value); validateAgeAtJoining(); }} onBlur={e => validateDOJ(e.target.value)} readOnly={isActive} required />
                      {errors.doj && <div className={`field-msg ${errors.doj.type || 'error'} show`}>{errors.doj.msg}</div>}
                    </div>
                    <div className="form-group">
                      <label>Employment Model {activeClientDefaults?.contractType && !employee && <span className="badge badge-neutral">Auto-set from Client</span>}</label>
                      <select className="form-control" value={formData.empType} onChange={handleEmpTypeChange} disabled={!employee && !!activeClientDefaults?.contractType}>
                        <option value="eor">Pass-through EOR</option>
                        <option value="agency_contract">Agency Contract</option>
                      </select>
                      {formData.empType === 'eor' && <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#F8FAFC", borderLeft: "3px solid var(--primary-navy)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>PF, ESI, and PT are filed under client registration.</div>}
                      {formData.empType === 'agency_contract' && <div style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#F8FAFC", borderLeft: "3px solid var(--primary-navy)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>PF, ESI, and PT are filed under Tecla Agency registration.</div>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>
                        Attendance Tracking Start Date{' '}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "normal" }}>
                          (Leave blank unless employee joined before adopting this payroll software)
                        </span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${errors.attendanceTrackingStartDate ? `is-${errors.attendanceTrackingStartDate.type || 'error'}` : ''}`}
                        value={formData.attendanceTrackingStartDate}
                        onChange={e => handleInputChange('attendanceTrackingStartDate', e.target.value)}
                        min={formData.doj || undefined}
                      />
                      {errors.attendanceTrackingStartDate && (
                        <div className={`field-msg ${errors.attendanceTrackingStartDate.type || 'error'} show`}>
                          {errors.attendanceTrackingStartDate.msg}
                        </div>
                      )}
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
                    <textarea
                      className={`form-control ${errors.address ? `is-${errors.address.type || 'error'}` : ''}`}
                      rows={3}
                      value={formData.address}
                      onChange={e => handleInputChange('address', e.target.value)}
                      onBlur={e => validateAddress(e.target.value)}
                      placeholder="Enter complete residential address..."
                      required
                    />
                    {errors.address && <div className={`field-msg ${errors.address.type || 'error'} show`}>{errors.address.msg}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label style={{ margin: 0 }}>Probation End Date</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', marginRight: '0.15rem' }}>Months:</span>
                        {[2, 4, 6, 12].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => calculateProbationEndDate(m)}
                            style={{
                              padding: '0.15rem 0.45rem',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              borderRadius: '0.25rem',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#F8FAFC',
                              color: '#1F3864',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease-in-out'
                            }}
                            title={`Calculate +${m} months from Date of Joining (${formData.doj || 'Today'})`}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#1F3864';
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#1F3864';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = '#F8FAFC';
                              e.currentTarget.style.color = '#1F3864';
                              e.currentTarget.style.borderColor = '#CBD5E1';
                            }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
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
                      onChange={e => {
                        const val = e.target.value;
                        handleInputChange('noticePeriodDays', val);
                        const clientNotice = activeClientDefaults?.noticePeriodDays !== undefined && activeClientDefaults?.noticePeriodDays !== null && activeClientDefaults?.noticePeriodDays !== ''
                          ? String(activeClientDefaults.noticePeriodDays)
                          : '30';
                        const isOverridden = val !== '' && String(val) !== clientNotice;
                        setOverrides(prev => ({ ...prev, noticePeriod: isOverridden }));
                      }} placeholder="e.g. 30" />
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

                <div className="section-banner info" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Landmark size={18} className="shrink-0 text-blue-600" />
                  <span>
                    <strong>Bank details can only be set here during initial employee creation.</strong> Once the employee is <em>Active</em>, bank changes must go through the Bank Change Requests approval flow.
                  </span>
                </div>

                {isActive ? (
                  <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Lock size={14} className="shrink-0 text-slate-500" />
                    <span style={{ fontWeight: "500", color: "var(--text-main)" }}>Locked — use <Link href={route('employees.bank-change-requests')} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Bank Change Requests</Link> to update</span>
                  </div>
                ) : (
                  <div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Account Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.accountNo ? `is-${errors.accountNo.type || 'error'}` : ''}`} value={formData.accountNo}
                          onChange={e => handleInputChange('accountNo', e.target.value)} onBlur={e => validateAccountNo(e.target.value)} required />
                        {errors.accountNo && <div className={`field-msg ${errors.accountNo.type || 'error'} show`}>{errors.accountNo.msg}</div>}
                      </div>
                      <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>Confirm Account Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.accountNoConfirm ? `is-${errors.accountNoConfirm.type || 'error'}` : ''}`} value={formData.accountNoConfirm}
                          onChange={e => handleInputChange('accountNoConfirm', e.target.value)} onBlur={e => validateAccountNoConfirm(e.target.value, formData.accountNo)} required />
                        {errors.accountNoConfirm && <div className={`field-msg ${errors.accountNoConfirm.type || 'error'} show`}>{errors.accountNoConfirm.msg}</div>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: "0" }}>
                        <label>IFSC Code <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="text" className={`form-control ${errors.ifsc ? `is-${errors.ifsc.type || 'error'}` : ''}`} value={formData.ifsc}
                          onChange={e => handleInputChange('ifsc', e.target.value.toUpperCase())} onBlur={validateIFSC} required />
                        {errors.ifsc && <div className={`field-msg ${errors.ifsc.type || 'error'} show`}>{errors.ifsc.msg}</div>}
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
                        <input type="text" className={`form-control ${errors.accountHolder ? `is-${errors.accountHolder.type || 'error'}` : ''}`} value={formData.accountHolder} onChange={e => handleInputChange('accountHolder', e.target.value)} onBlur={e => validateAccountHolder(e.target.value)} required />
                        {errors.accountHolder && <div className={`field-msg ${errors.accountHolder.type || 'error'} show`}>{errors.accountHolder.msg}</div>}
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
                    <input type="text" className={`form-control ${errors.pan ? `is-${errors.pan.type || 'error'}` : ''}`} value={formData.pan}
                      onChange={e => handleInputChange('pan', e.target.value.toUpperCase())} onBlur={e => validatePAN(e.target.value)} required />
                    {errors.pan && <div className={`field-msg ${errors.pan.type || 'error'} show`}>{errors.pan.msg}</div>}
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
                    <Lock size={14} className="shrink-0 text-slate-500" />
                    <span style={{ fontWeight: "500", color: "var(--text-main)" }}>Locked — use <Link href={route('employees.salary-revision.create', empId)} style={{ color: "var(--primary-navy)", fontWeight: "600", textDecoration: "underline" }}>Revise Salary</Link> to update</span>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ fontSize: "0.95rem", color: "var(--primary-navy)", marginBottom: "1rem" }}>Earnings Breakdown</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>1. Basic Pay (₹) <span style={{ color: "var(--status-danger)" }}>*</span></label>
                        <input type="number" className={`form-control ${errors.basicSal ? `is-${errors.basicSal.type || 'error'}` : ''}`} value={formData.basicSal}
                          onChange={e => handleInputChange('basicSal', e.target.value)} onWheel={e => e.target.blur()} onBlur={e => validateBasicSal(e.target.value)} min="0" required />
                        {errors.basicSal && <div className={`field-msg ${errors.basicSal.type || 'error'} show`}>{errors.basicSal.msg}</div>}
                      </div>
                      <div className="form-group">
                        <label>2. HRA (₹)</label>
                        <input type="number" className="form-control" value={formData.hraSal} onChange={e => handleInputChange('hraSal', e.target.value)} onWheel={e => e.target.blur()} min="0" required />
                      </div>
                      <div className="form-group">
                        <label>3. Conveyance (₹)</label>
                        <input type="number" className="form-control" value={formData.conveyanceSal} onChange={e => handleInputChange('conveyanceSal', e.target.value)} onWheel={e => e.target.blur()} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>4. DA (₹)</label>
                        <input type="number" className="form-control" value={formData.daSal} onChange={e => handleInputChange('daSal', e.target.value)} onWheel={e => e.target.blur()} />
                      </div>
                      <div className="form-group">
                        <label>5. Medical (₹)</label>
                        <input type="number" className="form-control" value={formData.medicalSal} onChange={e => handleInputChange('medicalSal', e.target.value)} onWheel={e => e.target.blur()} />
                      </div>
                      <div className="form-group">
                        <label>6. Special (₹)</label>
                        <input type="number" className="form-control" value={formData.specialSal} onChange={e => handleInputChange('specialSal', e.target.value)} onWheel={e => e.target.blur()} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>7. Other Additions (₹)</label>
                        <input type="number" className="form-control" value={formData.otherSal} onChange={e => handleInputChange('otherSal', e.target.value)} onWheel={e => e.target.blur()} />
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
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Settings size={14} className="shrink-0 text-[#1F3864]" /> <span style={{ fontWeight: "500", color: "var(--primary-navy)" }}>Defaults inherited from client...</span> Toggling any setting creates an override.
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
                          {errors.uanMode && <div className={`field-msg ${errors.uanMode.type || 'error'} show`}>{errors.uanMode.msg || errors.uanMode}</div>}
                          <small style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                            <Info size={13} className="shrink-0 text-blue-600" />
                            <span>
                              {formData.uanMode === 'new' 
                                ? 'Select for first-time employees. EPFO portal auto-generates 12-digit UAN upon ECR upload.' 
                                : 'Mandatory 12-digit UAN number from previous employer.'}
                            </span>
                          </small>
                        </div>
                        {formData.uanMode === 'existing_transfer' && (
                          <div className="form-group" style={{ marginBottom: "0" }}>
                            <label>UAN Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                            <input type="text" className={`form-control ${errors.uan ? 'is-invalid' : ''}`} value={formData.uan} onChange={e => handleInputChange('uan', e.target.value)} placeholder="12-digit UAN" maxLength="12" />
                            {errors.uan && <div className={`field-msg ${errors.uan.type || 'error'} show`}>{errors.uan.msg || errors.uan}</div>}
                          </div>
                        )}
                      </div>

                      <div className="form-row" style={{ marginTop: "0.75rem" }}>
                        <div className="form-group" style={{ marginBottom: "0" }}>
                          <label>PF Member ID (Member Account No.) <span style={{ color: "var(--status-danger)" }}>*</span></label>
                          <input 
                            type="text" 
                            className={`form-control ${errors.pfMemberId ? 'is-invalid' : ''}`} 
                            value={formData.pfMemberId} 
                            onChange={e => handleInputChange('pfMemberId', e.target.value)} 
                            placeholder="e.g. DLCPM00123450000000271" 
                            maxLength="50" 
                          />
                          {errors.pfMemberId && <div className={`field-msg ${errors.pfMemberId.type || 'error'} show`}>{errors.pfMemberId.msg || errors.pfMemberId}</div>}
                          <small style={{ color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                            EPFO Member ID required for PF ECR Return filing. From EPFO Employer Portal.
                          </small>
                        </div>
                        <div className="form-group" style={{ marginBottom: "0" }}>
                          <label>Member Relationship (for ECR Return)</label>
                          <select 
                            className="form-control" 
                            value={formData.memberRelationship} 
                            onChange={e => handleInputChange('memberRelationship', e.target.value)}
                          >
                            <option value="F">Father (F)</option>
                            <option value="S">Spouse (S)</option>
                          </select>
                          <small style={{ color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                            Official EPFO Field #13 (F = Father, S = Spouse).
                          </small>
                        </div>
                      </div>
                      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <strong style={{ fontSize: "0.85rem", color: "var(--primary-navy)" }}>EPS Contribution (Employees' Pension Scheme)</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", maxWidth: "600px" }}>
                            Splits 12% Employer PF into 8.33% EPS (capped ₹1,249.50) + 3.67% EPF (₹550.50). Uncheck ONLY if employee first joined EPF post-Sept 2014 with Basic Pay &gt; ₹15,000. (Note: Employees aged 58+ automatically cutoff to ₹0 EPS).
                          </div>
                        </div>
                        <label className="toggle-container" style={{ flexShrink: 0, marginLeft: "1rem" }}>
                          <input type="checkbox" className="toggle-input" checked={formData.epsToggle} onChange={e => handleInputChange('epsToggle', e.target.checked)} />
                          <span className="toggle-switch"></span>
                        </label>
                      </div>

                      {/* Para 26(6) Joint Declaration Status — Shown whenever client uses Actual Basic+DA on either side */}
                      {(
                        activeClientDefaults?.employeePfWageBasis === 'actual_basic_da' || 
                        activeClientDefaults?.employerPfWageBasis === 'actual_basic_da' || 
                        activeClientDefaults?.employee_pf_wage_basis === 'actual_basic_da' || 
                        activeClientDefaults?.employer_pf_wage_basis === 'actual_basic_da' ||
                        clients.find(c => String(c.id) === String(formData.clientPartner))?.employee_pf_wage_basis === 'actual_basic_da' ||
                        clients.find(c => String(c.id) === String(formData.clientPartner))?.employer_pf_wage_basis === 'actual_basic_da'
                      ) && (
                        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--border-color)" }}>
                          <div className="form-group" style={{ marginBottom: "0" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)" }}>
                              EPF Scheme Para 26(6) Joint Declaration Status
                            </label>
                            <select className={`form-control ${errors.joint_declaration_status ? 'is-invalid' : ''}`} value={formData.jointDeclarationStatus} onChange={e => { handleInputChange('jointDeclarationStatus', e.target.value); handleInputChange('joint_declaration_status', e.target.value); }}>
                              <option value="not_required">Not Required (&le; ₹15,000 or Ceiling Base)</option>
                              <option value="pending">Pending Attestation</option>
                              <option value="submitted">Submitted to EPFO</option>
                              <option value="approved">Approved by RPFC</option>
                            </select>
                            {errors.joint_declaration_status && <div className="field-msg error show">{errors.joint_declaration_status.msg || errors.joint_declaration_status}</div>}
                            <small style={{ color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                              Required whenever candidate earns Basic+DA &gt; ₹15,000/mo and employer or candidate contributes on Actual Basic+DA.
                            </small>
                          </div>
                        </div>
                      )}
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
                  {formData.esiToggle ? (
                    <div style={{ backgroundColor: "#FFFFFF", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", marginTop: "0.5rem" }}>
                      <div className="form-row">
                        <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                          <label>ESI Mode <span style={{ color: "var(--status-danger)" }}>*</span></label>
                          <select className={`form-control ${errors.esiMode ? 'is-invalid' : ''}`} value={formData.esiMode} onChange={e => handleInputChange('esiMode', e.target.value)}>
                            <option value="new">Pending / New Registration</option>
                            <option value="existing_transfer">Existing IP Number</option>
                          </select>
                          {errors.esiMode && <div className={`field-msg ${errors.esiMode.type || 'error'} show`}>{errors.esiMode.msg || errors.esiMode}</div>}
                          <small style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                            <Info size={13} className="shrink-0 text-blue-600" />
                            <span>
                              {formData.esiMode === 'new' 
                                ? 'Select for first-time workers. ESIC portal auto-generates 10-digit IP number upon registration upload.' 
                                : 'Mandatory 10-digit ESIC IP number from previous employer.'}
                            </span>
                          </small>
                        </div>
                        {formData.esiMode === 'existing_transfer' && (
                          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                            <label>ESIC IP Number <span style={{ color: "var(--status-danger)" }}>*</span></label>
                            <input type="text" className={`form-control ${errors.esiNo ? 'is-invalid' : ''}`} value={formData.esiNo} onChange={e => handleInputChange('esiNo', e.target.value)} placeholder="10-digit ESIC Number" maxLength="10" />
                            {errors.esiNo && <div className={`field-msg ${errors.esiNo.type || 'error'} show`}>{errors.esiNo.msg || errors.esiNo}</div>}
                          </div>
                        )}
                      </div>
                      {!isAdd && (
                        <div className="form-group" style={{ marginBottom: "0" }}>
                          <label>ESI Contribution Period End</label>
                          <input type="date" className={`form-control ${errors.esiPeriodEnd ? `is-${errors.esiPeriodEnd.type || 'error'}` : ''}`} value={formData.esiPeriodEnd}
                            onChange={e => handleInputChange('esiPeriodEnd', e.target.value)} />
                          {errors.esiPeriodEnd && <div className={`field-msg ${errors.esiPeriodEnd.type || 'error'} show`}>{errors.esiPeriodEnd.msg}</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    (Boolean(formData.insuranceProvider || formData.insurancePolicyNo || formData.insuranceSumInsured) || (activeClientDefaults?.healthInsuranceEnabled !== false && activeClientDefaults?.health_insurance_enabled !== false)) ? (
                      <div style={{ backgroundColor: "#FFFFFF", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid #CBD5E1", marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "#1E293B", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Shield size={16} className="text-blue-600" />
                          <span>Group Medical Insurance (Non-ESI Employee Coverage)</span>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                          This employee is not covered under statutory ESI. Capture their commercial Group Medical Insurance policy details below (optional).
                        </p>
                        <div className="form-row">
                          <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                            <label>Insurance Provider / TPA</label>
                            <input type="text" className="form-control" placeholder="e.g. Star Health, HDFC ERGO, Niva Bupa" value={formData.insuranceProvider} onChange={e => handleInputChange('insuranceProvider', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                            <label>Policy / Card Number</label>
                            <input type="text" className="form-control" placeholder="e.g. GMI-2026-98745" value={formData.insurancePolicyNo} onChange={e => handleInputChange('insurancePolicyNo', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ marginBottom: "0.5rem" }}>
                            <label>Sum Insured (₹)</label>
                            <input type="number" className="form-control" placeholder="e.g. 500000" value={formData.insuranceSumInsured} onChange={e => handleInputChange('insuranceSumInsured', e.target.value)} min="0" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ backgroundColor: "#F8FAFC", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid #E2E8F0", marginTop: "0.5rem", fontSize: "0.75rem", color: "#64748B" }}>
                        <strong>Establishment Policy:</strong> This client establishment does not provide commercial Group Medical Insurance for employees above the ESI ceiling (&gt; ₹21,000/mo).
                      </div>
                    )
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
                            <small style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                              <Info size={13} className="shrink-0 text-blue-600" />
                              <span>
                                {formData.taxRegime === 'new' 
                                  ? 'New Regime (Default for FY26-27): ₹75,000 Standard Deduction, zero tax up to ₹12L (Sec 87A rebate).' 
                                  : 'Old Regime: ₹50,000 Standard Deduction, 80C, 80D, 24b & HRA exemptions applicable.'}
                              </span>
                            </small>
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

                  <hr style={{ border: "0", borderTop: "1px solid var(--border-color)" }} />

                  {/* PT Toggle */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.85rem" }}>Professional Tax (PT)</strong>
                          <span className={`badge ${overrides.pt ? 'badge-gold' : 'badge-neutral'}`}>{overrides.pt ? 'Overridden' : 'Inherited'}</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>State-specific Professional Tax deduction. Toggle off for exempt employees.</span>
                      </div>
                      <label className="toggle-container">
                        <input type="checkbox" className="toggle-input" checked={formData.ptToggle} onChange={e => { handleInputChange('ptToggle', e.target.checked); toggleOverride('pt'); }} />
                        <span className="toggle-switch"></span>
                      </label>
                    </div>
                  </div>

                  <hr style={{ border: "0", borderTop: "1px solid var(--border-color)" }} />

                  {/* LWF Toggle */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.85rem" }}>Labour Welfare Fund (LWF)</strong>
                          <span className={`badge ${overrides.lwf ? 'badge-gold' : 'badge-neutral'}`}>{overrides.lwf ? 'Overridden' : 'Inherited'}</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>State Labour Welfare Fund contribution. Toggle off for exempt employees.</span>
                      </div>
                      <label className="toggle-container">
                        <input type="checkbox" className="toggle-input" checked={formData.lwfToggle} onChange={e => { handleInputChange('lwfToggle', e.target.checked); toggleOverride('lwf'); }} />
                        <span className="toggle-switch"></span>
                      </label>
                    </div>
                  </div>

                  {/* LOP Divisor Basis */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.85rem" }}>Loss of Pay (LOP) Divisor Basis (Days)</strong>
                          <span className="badge badge-neutral">Standard</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Denominator used for daily wage calculation (Basic / 30). Standard fixed monthly divisor.</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "0.35rem 0.75rem", borderRadius: "6px", fontWeight: "bold", color: "var(--primary-navy)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        <Lock size={13} /> Strictly 30 Days
                      </div>
                    </div>
                  </div>

                  <hr style={{ border: "0", borderTop: "1px solid var(--border-color)" }} />

                  {/* Override Weekly Off Pattern */}
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.85rem" }}>Override Weekly Off Pattern</strong>
                          <span className={`badge ${overrides.weeklyOff ? 'badge-gold' : 'badge-neutral'}`}>
                            {overrides.weeklyOff ? 'Overridden' : 'Inherited'}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                          Leave blank to inherit client default.
                        </span>
                        <div style={{ fontSize: "0.72rem", color: "var(--primary-navy)", fontWeight: "500", marginTop: "2px" }}>
                          Client Default: {activeClientDefaults?.weeklyOffPattern || activeClientDefaults?.weekly_off_pattern || clients.find(c => String(c.id) === String(formData.clientPartner))?.weekly_off_pattern || 'sat,sun'}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          {[
                            { id: 'mon', label: 'M' },
                            { id: 'tue', label: 'T' },
                            { id: 'wed', label: 'W' },
                            { id: 'thu', label: 'T' },
                            { id: 'fri', label: 'F' },
                            { id: 'sat', label: 'S' },
                            { id: 'sun', label: 'S' }
                          ].map(d => {
                            const currentVal = formData.weeklyOffPattern || formData.weekly_off_pattern || '';
                            const currentArr = currentVal ? currentVal.split(',').map(s => s.trim().toLowerCase()) : [];
                            const isSelected = currentArr.includes(d.id);
                            return (
                              <button
                                type="button"
                                key={d.id}
                                className="day-pill"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  fontSize: '0.72rem',
                                  fontWeight: '600',
                                  border: isSelected ? '1px solid var(--primary-navy)' : '1px solid #CBD5E1',
                                  backgroundColor: isSelected ? 'var(--primary-navy)' : '#F8FAFC',
                                  color: isSelected ? '#FFFFFF' : '#475569',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  let nextArr = isSelected ? currentArr.filter(x => x !== d.id) : [...currentArr, d.id];
                                  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                                  nextArr.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
                                  const val = nextArr.join(',');
                                  handleInputChange('weeklyOffPattern', val);
                                  handleInputChange('weekly_off_pattern', val);
                                  setOverrides(prev => ({ ...prev, weeklyOff: Boolean(val) }));
                                }}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                        {(formData.weeklyOffPattern || formData.weekly_off_pattern) ? (
                          <button
                            type="button"
                            className="btn btn-link btn-xs"
                            style={{ fontSize: "0.7rem", color: "var(--status-danger)", padding: 0 }}
                            onClick={() => {
                              handleInputChange('weeklyOffPattern', '');
                              handleInputChange('weekly_off_pattern', '');
                              setOverrides(prev => ({ ...prev, weeklyOff: false }));
                            }}
                          >
                            Reset to Client Default
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  </div>
                  
                    <div style={{ backgroundColor: "#F8FAFC", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "500", color: "var(--text-color)" }}>Calculated Monthly Gross Earnings:</span>
                        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--primary-navy)" }}>₹{previewCalculations ? previewCalculations.gross_monthly_salary?.toLocaleString('en-IN') : grossCTC.toLocaleString('en-IN')}</span>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)" }}>
                        <span>Estimated Employee Deductions (PF, ESI, PT):</span>
                        <span style={{ fontWeight: "600", color: "#991B1B" }}>- ₹{previewCalculations ? (previewCalculations.employee_pf_monthly + previewCalculations.employee_esi_monthly + previewCalculations.pt_monthly)?.toLocaleString('en-IN') : '0'}</span>
                      </div>

                      {previewCalculations && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", background: "#FFF5F5", padding: "0.75rem", borderRadius: "6px", border: "1px solid #FED7D7", fontSize: "0.78rem" }}>
                          <div style={{ fontWeight: "700", color: "#9B2C2C", marginBottom: "0.15rem" }}>Employee Deductions Breakdown:</div>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem" }}>
                            <span>• Employee PF Contribution (12%):</span>
                            <strong>₹{(previewCalculations.employee_pf_monthly || 0).toLocaleString('en-IN')}</strong>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem" }}>
                            <span>• Employee ESI Contribution (0.75%):</span>
                            <strong>{previewCalculations.employee_esi_monthly > 0 ? `₹${(previewCalculations.employee_esi_monthly || 0).toLocaleString('en-IN')}` : '₹0.00 (Exempt / Not Applicable)'}</strong>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem" }}>
                            <span>• Professional Tax (PT):</span>
                            <strong>₹{(previewCalculations.pt_monthly || 0).toLocaleString('en-IN')}</strong>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #FEB2B2", paddingTop: "0.35rem", marginTop: "0.15rem", fontWeight: "700", color: "#742A2A" }}>
                            <span>Total Employee Deductions:</span>
                            <span>- ₹{(previewCalculations.employee_pf_monthly + previewCalculations.employee_esi_monthly + previewCalculations.pt_monthly).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )}

                      <div style={{ backgroundColor: "var(--primary-navy)", color: "white", padding: "1rem", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "500" }}>Estimated Net Take Home:</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--accent-gold)" }}>₹{previewCalculations ? previewCalculations.net_take_home_monthly?.toLocaleString('en-IN') : grossCTC.toLocaleString('en-IN')}</span>
                      </div>

                      {previewCalculations && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", background: "#F8FAFC", padding: "0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "0.78rem" }}>
                          <div style={{ fontWeight: "700", color: "#334155", marginBottom: "0.15rem" }}>Employer Contributions & Accruals Breakdown:</div>
                          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem" }}>
                            <span>• Employer EPF (3.67% / Remainder):</span>
                            <strong>₹{(previewCalculations.employer_epf_monthly || 0).toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem" }}>
                            <span>• Employer EPS Pension (8.33% - Capped ₹1,249.50):</span>
                            <strong>{previewCalculations.employer_eps_monthly > 0 ? `₹${(previewCalculations.employer_eps_monthly || 0).toLocaleString('en-IN')}` : '₹0.00 (EPS Excluded / Age 58+)'}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem" }}>
                            <span>• EDLI (0.5%):</span>
                            <strong>{previewCalculations.edli_monthly === 0 ? '₹0.00 (Exempted)' : `₹${(previewCalculations.edli_monthly || 0).toLocaleString('en-IN')}`}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem" }}>
                            <span>• EPF Admin Charges (0.5%):</span>
                            <strong>₹{(previewCalculations.epf_admin_monthly || 0).toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #CBD5E1", paddingTop: "0.35rem", marginTop: "0.15rem", fontWeight: "700", color: "#1E293B" }}>
                            <span>Total Employer PF & EPFO Charges:</span>
                            <span style={{ color: "#1F3864" }}>₹{((previewCalculations.employer_epf_monthly || 0) + (previewCalculations.employer_eps_monthly || 0) + (previewCalculations.edli_monthly || 0) + (previewCalculations.epf_admin_monthly || 0)).toLocaleString('en-IN')}</span>
                          </div>

                          {previewCalculations.employer_esi_monthly > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem", marginTop: "0.15rem" }}>
                              <span>• Employer ESI Contribution (3.25%):</span>
                              <strong>₹{(previewCalculations.employer_esi_monthly || 0).toLocaleString('en-IN')}</strong>
                            </div>
                          )}

                          {previewCalculations.gratuity_accrual_monthly > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem", marginTop: "0.15rem", color: "#0F766E" }}>
                              <span>• Monthly Gratuity Accrual (15 days/yr = ~4.81% of Basic+DA):</span>
                              <strong>+ ₹{(previewCalculations.gratuity_accrual_monthly || 0).toLocaleString('en-IN')}</strong>
                            </div>
                          )}

                          {previewCalculations.bonus_accrual_monthly > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "0.5rem", marginTop: "0.15rem", color: "#B45309" }}>
                              <span>• Monthly Statutory Bonus Accrual:</span>
                              <strong>+ ₹{(previewCalculations.bonus_accrual_monthly || 0).toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                        </div>
                      )}

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
                    <h4 style={{ color: "var(--status-danger)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <AlertOctagon size={18} /> Blocking Errors
                    </h4>
                    <ul style={{ fontSize: "0.82rem", color: "var(--status-danger)", paddingLeft: "1.1rem", margin: "0", lineHeight: "1.8" }}>
                      {[...blockingErrors].map(err => <li key={err}>{err}</li>)}
                    </ul>
                  </div>
                )}

                {isAdd && (
                  <div style={{
                    marginTop: "1.5rem",
                    marginBottom: "1rem",
                    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                    border: "1px solid #7dd3fc",
                    borderLeft: "5px solid #0284c7",
                    borderRadius: "10px",
                    padding: "1.1rem 1.3rem",
                    boxShadow: "0 4px 14px rgba(2, 132, 199, 0.09)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem"
                  }}>
                    <div style={{
                      background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                      color: "#ffffff",
                      borderRadius: "8px",
                      padding: "0.55rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)"
                    }}>
                      <Info size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: "0.93rem",
                        fontWeight: "700",
                        color: "#0369a1",
                        marginBottom: "0.3rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem"
                      }}>
                        Onboarding Status Notice
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          backgroundColor: "#ffffff",
                          color: "#0284c7",
                          padding: "0.15rem 0.6rem",
                          borderRadius: "12px",
                          border: "1px solid #7dd3fc",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          Initial State
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "#0c4a6e",
                        lineHeight: "1.55"
                      }}>
                        <strong>Note:</strong> New employees automatically start in <span style={{ color: "#0284c7", fontWeight: "700", background: "#ffffff", padding: "0.1rem 0.45rem", borderRadius: "5px", border: "1px solid #7dd3fc" }}>Onboarding</span> status. Upload and get all required documents verified to activate them under their assigned client.
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "2rem" }}>
                  <Link href={route('employees.index')} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <X size={15} /> Cancel
                  </Link>
                  <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} disabled={processing} onClick={() => {
                    if (blockingErrors.size > 0) {
                      setTimeout(() => {
                        runJQueryValidation('#emp-form', errors);
                      }, 50);
                    }
                  }}>
                    <Save size={15} /> {processing ? 'Saving...' : 'Save Employee Configuration'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Right Side Notes Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "sticky", top: "1.5rem", alignSelf: "start", maxHeight: "calc(100vh - 3rem)", overflowY: "auto", paddingRight: "0.25rem" }}>
              <div className="card" style={{ padding: "1.25rem", background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", border: "1px solid #cbd5e1", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.95rem", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ padding: "0.35rem", borderRadius: "6px", background: "#e2e8f0", color: "#1e293b", display: "inline-flex" }}>
                    <User size={16} />
                  </span>
                  Personal &amp; Employment Profile
                </h4>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#475569", lineHeight: "1.6" }}>
                  • <strong>PAN Name Matching:</strong> Ensure Full Name matches PAN card exactly for statutory filing.<br/>
                  • <strong>Uniqueness Checks:</strong> Emails, Phone numbers, PAN, and Bank Accounts are checked for duplicate entries.<br/>
                  • <strong>Filing Entity:</strong> EOR uses Client code; Agency Contract uses Tecla Media code.
                </p>
              </div>
              
              <div className="card" style={{ padding: "1.25rem", background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", border: "1px solid #cbd5e1", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.95rem", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ padding: "0.35rem", borderRadius: "6px", background: "#e2e8f0", color: "#1e293b", display: "inline-flex" }}>
                    <Landmark size={16} />
                  </span>
                  Banking Security Info
                </h4>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#475569", lineHeight: "1.6" }}>
                  • <strong>Live Razorpay Verification:</strong> Valid IFSC codes auto-fetch Bank Name and Branch.<br/>
                  • <strong>Data Encryption:</strong> Account numbers are encrypted in DB with SHA-256 hash duplication protection.<br/>
                  • <strong>Lock Rule:</strong> Bank info can only be set during onboarding; active employees must use Bank Change Requests.
                </p>
              </div>
              
              <div className="card" style={{ padding: "1.25rem", background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", border: "1px solid #cbd5e1", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.95rem", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ padding: "0.35rem", borderRadius: "6px", background: "#e2e8f0", color: "#1e293b", display: "inline-flex" }}>
                    <IndianRupee size={16} />
                  </span>
                  Salary &amp; Deductions Cap
                </h4>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#475569", lineHeight: "1.6" }}>
                  • <strong>Wage Code Rule:</strong> Basic Pay should be 50%+ of CTC.<br/>
                  • <strong>50% Deduction Cap:</strong> Total deductions (PF + ESI + PT + TDS + Loan EMI) are legally capped at 50% gross salary to protect employee take-home pay.
                </p>
              </div>
              
              <div className="card" style={{ padding: "1.25rem", background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", border: "1px solid #cbd5e1", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.95rem", color: "#1e293b", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ padding: "0.35rem", borderRadius: "6px", background: "#e2e8f0", color: "#1e293b", display: "inline-flex" }}>
                    <Scale size={16} />
                  </span>
                  Statutory Rules &amp; PF Compliance
                </h4>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#475569", lineHeight: "1.6" }}>
                  • <strong>PF &amp; ESI Modes:</strong> Select <em>"Pending / New Registration"</em> for first-time workers (EPFO/ESIC portals auto-issue numbers upon upload).<br/>
                  • <strong>EPF Wage Basis:</strong> Inherited from Client defaults (Statutory Ceiling ₹15k vs Actual Basic+DA).<br/>
                  • <strong>Para 26(6) Joint Declaration:</strong> Required whenever Actual Basic+DA contribution is active &amp; candidate earns Basic+DA &gt; ₹15,000.<br/>
                  • <strong>Statutory Caps:</strong> EPS (8.33% = max ₹1,249.50), EDLI (0.5% = max ₹75), and Admin (0.5% = max ₹75) stay capped at ₹15,000 base regardless of employer EPF wage basis.<br/>
                  • <strong>ESI Limit:</strong> Auto-disables if Gross exceeds ₹21,000.<br/>
                  • <strong>TDS Slabs:</strong> FY26-27 New Regime tax-free up to ₹12L net taxable income.
                </p>
              </div>
            </div>
          </div>
          
          {/* Modal */}
          {showEmpTypeModal && (
            <div className="modal-overlay active">
              <div className="modal-box" style={{ width: "440px" }}>
                <div className="modal-header">
                  <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={18} className="shrink-0 text-amber-600" /> Confirm Employment Type Change
                  </h3>
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
