import { useState, useCallback, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import useToast from '@/Hooks/useToast';
import {
  PATTERNS, PIN_MAPPING, GST_STATE_CODES, ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE, DOC_TYPE_LABELS, DOC_TYPE_ICONS, REQUIRED_DOC_TYPES,
  ALLOWED_STATUS_TRANSITIONS, getDefaultFormData, DEMO_BRANCHES,
} from '../constants/clientFormData';

// ═══════════════════════════════════════════════════
//  useClientForm — All form state, validation & logic
// ═══════════════════════════════════════════════════

export default function useClientForm(defaultLopBasis = 'inherit', initialClient = null) {
  // ── Core state ───────────────────────────────────
  const initialFormData = getDefaultFormData();
  initialFormData.lopBasis = defaultLopBasis;
  
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [hints, setHints] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [sectionProgress, setSectionProgress] = useState({
    1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false,
  });
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [extraContacts, setExtraContacts] = useState([]);
  const [clientBranches, setClientBranches] = useState([]);
  const [agencyBranches, setAgencyBranches] = useState([]);
  const [stateRegistrations, setStateRegistrations] = useState([
    { state: 'MH', ptRegNo: '', lwfRegNo: '' },
  ]);

  const getStepForField = (field) => {
    if (['companyName', 'companyType', 'trustRegNo', 'gstin', 'gstType', 'pan', 'tan', 'cin', 'incorporationDate', 'clientCode', 'industry', 'subIndustry', 'clientStatus', 'workLocationsCount', 'isGroupCompany', 'parentCompany'].includes(field)) return 1;
    if (['regAddressLine1', 'regAddressLine2', 'regCity', 'regState', 'regPin', 'country', 'taxId', 'regNo', 'billingSame', 'billAddressLine1', 'billCity', 'billState', 'billPin', 'hasAgencyBranches'].includes(field) || field.startsWith('branches')) return 2;
    if (field.startsWith('poc') || field.startsWith('extraContacts')) return 3;
    if (['contractType', 'billingModel', 'markupPct', 'markupBase', 'fixedFeeCandidate', 'fixedMonthlyRetainer', 'hourlyRate', 'standardHours', 'otBilling', 'otApproval', 'invoiceCycle', 'paymentTerms', 'contractStart', 'contractEnd', 'autoRenewal', 'poRequired', 'poNumber', 'poValue', 'poValidity', 'gstRate', 'lutRefNo', 'reverseCharge', 'tdsApplicableAgency', 'prefFormatPDF', 'prefFormatXLSX', 'invoiceFooterNotes', 'noticePeriod', 'creditLimit', 'latePenalty', 'billingCurrency'].includes(field)) return 4;
    if (['pfCeiling', 'pfApplicable', 'esiLimit', 'esiApplicable', 'ptState', 'ptApplicable', 'lwfFrequency', 'lwfApplicable', 'tdsRegime', 'tdsApplicable', 'gratuityMode', 'gratuityApplicable', 'bonusPct', 'bonusApplicable', 'lopBasis'].includes(field)) return 5;
    if (field === 'documents') return 6;
    if (['portalAccess', 'portalEmail', 'portalAccessLevel', 'portalViewSalary', 'portalViewInvoices', 'portalViewPayslips', 'portalRaiseRequests', 'portal2fa', 'sessionTimeout', 'ipWhitelist', 'logoUrl'].includes(field)) return 7;
    if (['attendanceCutoff', 'payrollLockDay', 'salaryCreditDay', 'invoiceDisputeDays', 'invoiceRaiseDay', 'payrollMonthConvention', 'cycleStartDay', 'cycleEndDay', 'accountManager', 'backupAccountManager', 'autoReminders', 'clientNotes'].includes(field)) return 8;
    return 1;
  };

  const { showToast: globalToast } = useToast();
  const [isEditMode, setIsEditMode] = useState(!!initialClient);
  const [editId, setEditId] = useState(initialClient ? initialClient.id : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [pendingDocType, setPendingDocType] = useState('other');
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // ── Generic field updater ────────────────────────
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ── Nested object updater (for poc1, poc2, poc3) ─
  const handlePocChange = useCallback((pocKey, field, value) => {
    setFormData(prev => ({
      ...prev,
      [pocKey]: { ...prev[pocKey], [field]: value },
    }));
  }, []);

  const handlePocPrefChange = useCallback((pocKey, pref, value) => {
    setFormData(prev => ({
      ...prev,
      [pocKey]: {
        ...prev[pocKey],
        prefs: { ...prev[pocKey].prefs, [pref]: value },
      },
    }));
  }, []);

  // ── Toast helper ─────────────────────────────────
  const showToast = useCallback((msgOrObj) => {
    if (typeof msgOrObj === 'string') {
      let type = 'success';
      if (msgOrObj.includes('❌') || msgOrObj.includes('🚫') || msgOrObj.includes('🔴')) type = 'error';
      else if (msgOrObj.includes('⚠️')) type = 'warning';
      
      const cleanMsg = msgOrObj.replace(/^[❌🚫🔴⚠️✅✓💡💻🔐⚙️📅🤝⭐💼🧾🔢📍🏢⚡👤👔📱💰📋📚📁✔️]\s*/, '');
      globalToast({ message: cleanMsg, type });
    } else {
      globalToast(msgOrObj);
    }
  }, [globalToast]);

  // ── Mark section progress ────────────────────────
  const markProgress = useCallback((section) => {
    setSectionProgress(prev => ({ ...prev, [section]: true }));
  }, []);

  // ═══ VALIDATORS ═══════════════════════════════════

  const validateGSTIN = useCallback((value) => {
    const val = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length === 0) {
      setHints(prev => ({ ...prev, gstin: { text: '15-character alphanumeric GST Identification Number.', type: '' } }));
      setErrors(prev => { const n = { ...prev }; delete n.gstin; return n; });
    } else if (val.length < 15) {
      setHints(prev => ({ ...prev, gstin: { text: `${val.length}/15 characters entered.`, type: '' } }));
      setErrors(prev => { const n = { ...prev }; delete n.gstin; return n; });
    } else if (PATTERNS.GSTIN.test(val)) {
      setHints(prev => ({ ...prev, gstin: { text: '✓ Valid GSTIN format. State code: ' + val.substring(0, 2), type: 'success' } }));
      setErrors(prev => { const n = { ...prev }; delete n.gstin; return n; });
      markProgress(1);
      // Cross-check PAN
      crossCheckPANGSTIN(formData.pan, val);
    } else {
      setHints(prev => ({ ...prev, gstin: { text: '✗ Invalid GSTIN format. Example: 27AAACM1234A1Z1', type: 'error' } }));
      setErrors(prev => ({ ...prev, gstin: true }));
    }
    return val;
  }, [formData.pan, markProgress]);

  const validatePAN = useCallback((value) => {
    const val = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length === 0) {
      setHints(prev => ({ ...prev, pan: { text: '10-character PAN as per Income Tax.', type: '' } }));
      setErrors(prev => { const n = { ...prev }; delete n.pan; return n; });
    } else if (PATTERNS.PAN.test(val)) {
      setHints(prev => ({ ...prev, pan: { text: '✓ Valid PAN format.', type: 'success' } }));
      setErrors(prev => { const n = { ...prev }; delete n.pan; return n; });
      crossCheckPANGSTIN(val, formData.gstin);
    } else if (val.length <= 10) {
      setHints(prev => ({ ...prev, pan: { text: `${val.length}/10 — Format: AAAAA9999A`, type: '' } }));
      setErrors(prev => { const n = { ...prev }; delete n.pan; return n; });
    } else {
      setHints(prev => ({ ...prev, pan: { text: '✗ Invalid PAN. Must be 10 chars: 5 alpha + 4 digits + 1 alpha.', type: 'error' } }));
      setErrors(prev => ({ ...prev, pan: true }));
    }
    return val;
  }, [formData.gstin]);

  const crossCheckPANGSTIN = useCallback((pan, gstin) => {
    if (!pan || !gstin) return;
    const p = pan.toUpperCase();
    const g = gstin.toUpperCase();
    if (p.length === 10 && g.length === 15) {
      if (g.substring(2, 12) !== p) {
        setHints(prev => ({ ...prev, pan: { text: 'PAN does not match GSTIN (chars 3–12 of GSTIN must equal PAN).', type: 'error' } }));
        setErrors(prev => ({ ...prev, pan: true }));
      }
    }
  }, []);

  const validateTAN = useCallback((value) => {
    const val = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 0 && val.length === 10) {
      if (PATTERNS.TAN.test(val)) {
        setHints(prev => ({ ...prev, tan: { text: '✓ Valid TAN format.', type: 'success' } }));
        setErrors(prev => { const n = { ...prev }; delete n.tan; return n; });
      } else {
        setHints(prev => ({ ...prev, tan: { text: '✗ Invalid TAN. Format: MUMD12345A (4 alpha + 5 digits + 1 alpha)', type: 'error' } }));
        setErrors(prev => ({ ...prev, tan: true }));
      }
    } else {
      setHints(prev => ({ ...prev, tan: { text: 'Required for TDS deduction filing.', type: '' } }));
      setErrors(prev => { const n = { ...prev }; delete n.tan; return n; });
    }
    return val;
  }, []);

  const validateCIN = useCallback((value) => {
    const val = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 0 && val.length < 21) {
      setHints(prev => ({ ...prev, cin: { text: `${val.length}/21 characters.`, type: '' } }));
    } else if (val.length === 21) {
      setHints(prev => ({ ...prev, cin: { text: '✓ CIN length valid.', type: 'success' } }));
    } else {
      setHints(prev => ({ ...prev, cin: { text: '21-character Corporate Identity Number from MCA.', type: '' } }));
    }
    return val;
  }, []);

  const validatePIN = useCallback((value) => {
    const val = (value || '').replace(/[^0-9]/g, '');
    const isValid = val.length === 6 && val !== '000000';
    if (isValid) {
      // Auto-fill from PIN mapping
      const mapped = PIN_MAPPING[val];
      if (mapped) {
        setFormData(prev => ({ ...prev, regCity: mapped.city, regState: mapped.state }));
        showToast(`📍 Auto-filled City & State for PIN ${val}`);
      }
    }
    return val;
  }, [showToast]);

  const validateEmail = useCallback((value) => {
    if (!value) return false;
    return PATTERNS.EMAIL.test(value);
  }, []);

  const validatePhone = useCallback((value) => {
    const val = (value || '').replace(/[^0-9]/g, '');
    return val.length === 10 && ['6', '7', '8', '9'].includes(val[0]);
  }, []);

  const validateContractDates = useCallback(() => {
    const start = formData.contractStart;
    const end = formData.contractEnd;
    if (start && end && end <= start) {
      setHints(prev => ({ ...prev, contractEnd: { text: '✗ End date must be after start date.', type: 'error' } }));
      setErrors(prev => ({ ...prev, contractEnd: true }));
    } else if (end && start) {
      const days = Math.round((new Date(end) - new Date(start)) / 86400000);
      setHints(prev => ({ ...prev, contractEnd: { text: `✓ Contract duration: ${days} days`, type: 'success' } }));
      setErrors(prev => { const n = { ...prev }; delete n.contractEnd; return n; });
      markProgress(4);
    } else {
      setHints(prev => ({ ...prev, contractEnd: { text: 'Leave blank for open-ended contracts.', type: '' } }));
      setErrors(prev => { const n = { ...prev }; delete n.contractEnd; return n; });
    }
  }, [formData.contractStart, formData.contractEnd, markProgress]);

  // ═══ HANDLERS ═════════════════════════════════════

  const autoGenerateCode = useCallback(() => {
    if (!formData.companyName) { showToast('⚠️ Enter company name first'); return; }
    const prefix = formData.companyName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const num = Math.floor(Math.random() * 900) + 100;
    handleInputChange('clientCode', `${prefix}-${num}`);
  }, [formData.companyName, handleInputChange, showToast]);

  const handleCompanyType = useCallback((value) => {
    handleInputChange('companyType', value);
    markProgress(1);
  }, [handleInputChange, markProgress]);

  const handleCountryChange = useCallback((value) => {
    handleInputChange('country', value);
    if (value !== 'India') {
      handleInputChange('billingCurrency', 'USD');
      showToast('ℹ️ International client profile — statutory fields hidden.');
    } else {
      handleInputChange('billingCurrency', 'INR');
    }
  }, [handleInputChange, showToast]);

  const handleIndustryChange = useCallback((value) => {
    handleInputChange('industry', value);
  }, [handleInputChange]);

  const handleBillingModelChange = useCallback((value) => {
    handleInputChange('billingModel', value);
    if (value) markProgress(4);
  }, [handleInputChange, markProgress]);

  const handleContractTypeChange = useCallback((value) => {
    handleInputChange('contractType', value);
    if (value) markProgress(4);
  }, [handleInputChange, markProgress]);

  const handleGSTRateChange = useCallback((value) => {
    handleInputChange('gstRate', value);
  }, [handleInputChange]);

  const handleTDSChange = useCallback((value) => {
    handleInputChange('tdsApplicableAgency', value);
  }, [handleInputChange]);

  const getTDSPreview = useCallback(() => {
    const val = formData.tdsApplicableAgency;
    if (val === 'na') return 'Net receivable = Invoice Amount';
    if (val === '1') return 'Net receivable = Invoice Amount - 1% TDS';
    if (val === '2') return 'Net receivable = Invoice Amount - 2% TDS';
    if (val === '10') return 'Net receivable = Invoice Amount - 10% TDS';
    return 'Net receivable = Invoice Amount - Custom TDS%';
  }, [formData.tdsApplicableAgency]);

  const handlePFCeiling = useCallback((value) => {
    handleInputChange('pfCeiling', value);
  }, [handleInputChange]);

  const getPFCeilingHint = useCallback(() => {
    if (parseFloat(formData.pfCeiling) > 15000) {
      return { text: 'Voluntary PF — contributions computed on actual basic.', type: 'warning' };
    }
    return { text: 'Standard EPFO statutory wage ceiling is ₹15,000.', type: '' };
  }, [formData.pfCeiling]);

  const handleESILimit = useCallback((value) => {
    handleInputChange('esiLimit', value);
  }, [handleInputChange]);

  const getESILimitHint = useCallback(() => {
    if (parseFloat(formData.esiLimit) !== 21000) {
      return { text: 'Note: Statutory ESI limit is ₹21,000.', type: 'warning' };
    }
    return { text: 'Standard ESIC statutory gross wage ceiling is ₹21,000.', type: '' };
  }, [formData.esiLimit]);

  const handleAccessLevel = useCallback((value) => {
    handleInputChange('portalAccessLevel', value);
    if (value === 'full') {
      handleInputChange('portal2fa', true);
      showToast('🔒 2FA enforced for Full Access accounts.');
    }
  }, [handleInputChange, showToast]);

  const handlePayrollConvention = useCallback((value) => {
    handleInputChange('payrollMonthConvention', value);
  }, [handleInputChange]);

  const checkIncorporation = useCallback((value) => {
    if (!value) return;
    const d = new Date(value);
    const today = new Date();
    if (d > today) {
      showToast('🚫 Date of Incorporation cannot be in the future.');
      setErrors(prev => ({ ...prev, incorporationDate: true }));
      return;
    }
    setErrors(prev => { const n = { ...prev }; delete n.incorporationDate; return n; });
    const years = (today - d) / (1000 * 60 * 60 * 24 * 365.25);
    if (years > 50) {
      showToast('⚠️ Verify company is still active (MCA portal).');
    }
  }, [showToast]);

  const updateInvoiceDuePreview = useCallback(() => {
    const invoiceDayText = formData.invoiceRaiseDay;
    const netTermsVal = formData.paymentTerms;
    const termDays = { 'net7': 7, 'net15': 15, 'net30': 30, 'net45': 45, 'net60': 60, 'immediate': 0 };
    const days = termDays[netTermsVal] !== undefined ? termDays[netTermsVal] : 15;
    let raiseDay = 3;
    if (invoiceDayText === '+1 Day') raiseDay += 1;
    else if (invoiceDayText === '+2 Days') raiseDay += 2;
    else if (invoiceDayText === '+3 Days') raiseDay += 3;
    const dueDay = raiseDay + days;
    return `Preview: Invoice raised on ${raiseDay}th of month → Due on ${dueDay}th (Net ${days} days)`;
  }, [formData.invoiceRaiseDay, formData.paymentTerms]);

  const updateBackupAMOptions = useCallback((primaryAM) => {
    // The backup AM select will filter out the primary in the render
    handleInputChange('accountManager', primaryAM);
  }, [handleInputChange]);

  // ═══ CLIENT BRANCHES ══════════════════════════════

  const addClientBranch = useCallback((seedData = null) => {
    const newBranch = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: seedData?.name || '',
      code: seedData?.code || '',
      addr1: seedData?.addr1 || '',
      addr2: seedData?.addr2 || '',
      city: seedData?.city || '',
      state: seedData?.state || '',
      pin: seedData?.pin || '',
      gstin: seedData?.gstin || '',
      gstType: seedData?.gstType || 'Regular',
      pocName: seedData?.pocName || '',
      pocEmail: seedData?.pocEmail || '',
      pocPhone: seedData?.pocPhone || '',
      isPrimary: seedData?.isPrimary || false,
      gstinError: '',
      gstinValid: false,
    };
    setClientBranches(prev => {
      const next = [...prev, newBranch];
      if (next.length === 1) next[0].isPrimary = true;
      return next;
    });
  }, []);

  const removeClientBranch = useCallback((branchId) => {
    setClientBranches(prev => {
      const filtered = prev.filter(b => b.id !== branchId);
      const removedWasPrimary = prev.find(b => b.id === branchId)?.isPrimary;
      if (removedWasPrimary && filtered.length > 0) {
        filtered[0].isPrimary = true;
        showToast('⚠️ Removing the primary branch — first remaining branch set as primary.');
      }
      return filtered;
    });
  }, [showToast]);

  const updateClientBranch = useCallback((branchId, field, value) => {
    setClientBranches(prev => prev.map(b => {
      if (b.id !== branchId) return b;
      const updated = { ...b, [field]: value };
      // Auto-generate branch code
      if (field === 'name' && value.trim().length >= 3) {
        const prefix = value.trim().substring(0, 3).toUpperCase();
        const idx = prev.findIndex(br => br.id === branchId) + 1;
        updated.code = `${prefix}-${String(idx).padStart(2, '0')}`;
      }
      return updated;
    }));
  }, []);

  const handlePrimaryBranchChange = useCallback((branchId) => {
    setClientBranches(prev => prev.map(b => ({
      ...b, isPrimary: b.id === branchId,
    })));
  }, []);

  const validateBranchGSTIN = useCallback((branchId) => {
    setClientBranches(prev => prev.map(b => {
      if (b.id !== branchId) return b;
      const gstin = (b.gstin || '').trim().toUpperCase();
      if (!gstin) return { ...b, gstinError: '', gstinValid: false };
      if (gstin.length !== 15) {
        return { ...b, gstinError: 'GSTIN must be exactly 15 characters.', gstinValid: false };
      }
      if (b.state && GST_STATE_CODES[b.state]) {
        const expected = GST_STATE_CODES[b.state];
        const actual = gstin.substring(0, 2);
        if (actual !== expected) {
          return { ...b, gstinError: `GSTIN state code [${actual}] does not match ${b.state} (expected [${expected}]).`, gstinValid: false };
        }
      }
      return { ...b, gstinError: '', gstinValid: true };
    }));
  }, []);

  const checkAllBranchesGSTIN = useCallback(() => {
    let allValid = true;
    clientBranches.forEach(b => {
      const gstin = (b.gstin || '').trim().toUpperCase();
      if (!gstin) return;
      if (gstin.length !== 15) { allValid = false; return; }
      if (b.state && GST_STATE_CODES[b.state]) {
        const expected = GST_STATE_CODES[b.state];
        if (gstin.substring(0, 2) !== expected) { allValid = false; }
      }
    });
    return allValid;
  }, [clientBranches]);

  // ═══ AGENCY BRANCHES ══════════════════════════════

  const addAgencyBranch = useCallback(() => {
    setAgencyBranches(prev => [...prev, {
      id: `agency-${Date.now()}`,
      name: '', state: '', gstin: '',
    }]);
  }, []);

  const removeAgencyBranch = useCallback((id) => {
    setAgencyBranches(prev => prev.filter(b => b.id !== id));
  }, []);

  const updateAgencyBranch = useCallback((id, field, value) => {
    setAgencyBranches(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  }, []);

  // ═══ EXTRA CONTACTS ═══════════════════════════════

  const addExtraContact = useCallback(() => {
    if (extraContacts.length >= 5) {
      showToast('⚠️ Maximum 5 additional contact persons allowed.');
      return;
    }
    setExtraContacts(prev => [...prev, {
      id: `contact-${Date.now()}`,
      role: 'operations', name: '', designation: '', email: '', phone: '',
    }]);
  }, [extraContacts.length, showToast]);

  const removeExtraContact = useCallback((id) => {
    setExtraContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateExtraContact = useCallback((id, field, value) => {
    setExtraContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  // ═══ STATE REGISTRATIONS ══════════════════════════

  const addStateRegistration = useCallback(() => {
    setStateRegistrations(prev => [...prev, { state: '', ptRegNo: '', lwfRegNo: '' }]);
  }, []);

  const removeStateRegistration = useCallback((index) => {
    setStateRegistrations(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateStateRegistration = useCallback((index, field, value) => {
    setStateRegistrations(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }, []);

  // ═══ DOCUMENT UPLOAD ══════════════════════════════

  const triggerDocUpload = useCallback((docType) => {
    setPendingDocType(docType);
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const processFiles = useCallback((files) => {
    const newDocs = [];
    for (let file of files) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        showToast(`❌ ${file.name}: Only PDF, JPG, PNG, XLSX allowed`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast(`❌ ${file.name}: File exceeds 10 MB limit`);
        continue;
      }
      
      if (isEditMode && editId) {
        // Upload immediately if editing an existing client
        const docFormData = new FormData();
        docFormData.append('type', pendingDocType);
        docFormData.append('file', file);
        
        router.post(route('clients.documents.store', editId), docFormData, {
          preserveScroll: true,
          onSuccess: () => {
            showToast(`✅ ${file.name} uploaded successfully`);
          },
          onError: (errs) => {
            showToast(`❌ Failed to upload ${file.name}`);
            console.error(errs);
          }
        });
      } else {
        // Queue for bulk upload on new client creation
        const doc = {
          id: Date.now() + Math.random(),
          name: file.name, size: file.size, type: pendingDocType,
          file, verified: false, expiryDate: '',
        };
        newDocs.push(doc);
        showToast(`✅ ${file.name} added. Will upload on save.`);
        markProgress(6);
      }
    }
    if (newDocs.length > 0) {
      setUploadedDocs(prev => [...prev, ...newDocs]);
    }
  }, [pendingDocType, showToast, markProgress, isEditMode, editId]);

  const updateDocType = useCallback((docId, newType) => {
    setUploadedDocs(prev => prev.map(d => d.id === docId ? { ...d, type: newType } : d));
  }, []);

  const removeDoc = useCallback((docId) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== docId));
  }, []);

  const updateDocExpiry = useCallback((docId, dateStr) => {
    setUploadedDocs(prev => prev.map(d => d.id === docId ? { ...d, expiryDate: dateStr } : d));
    if (dateStr) {
      const expiry = new Date(dateStr);
      const today = new Date();
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) showToast('🔴 Document is already expired! Update required.');
      else if (diffDays <= 30) showToast(`⚠️ Document expires in ${diffDays} days. Plan renewal.`);
    }
  }, [showToast]);

  const markDocVerified = useCallback((docId, checked) => {
    setUploadedDocs(prev => prev.map(d => d.id === docId ? { ...d, verified: checked } : d));
    if (checked) showToast('✓ Document marked as Verified.');
  }, [showToast]);

  const getDocChecklist = useCallback(() => {
    return REQUIRED_DOC_TYPES.map(type => ({
      type,
      label: DOC_TYPE_LABELS[type],
      icon: DOC_TYPE_ICONS[type],
      uploaded: uploadedDocs.some(d => d.type === type),
    }));
  }, [uploadedDocs]);

  // ═══ LOGO UPLOAD ══════════════════════════════════

  const handleLogoSelect = useCallback((file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('❌ Logo file size exceeds 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      handleInputChange('logoUrl', e.target.result);
      showToast('✅ Logo uploaded successfully.');
    };
    reader.readAsDataURL(file);
  }, [handleInputChange, showToast]);

  // ═══ WIZARD NAVIGATION ════════════════════════════

  const validateStep = useCallback((stepNum, isTabNavigation = false) => {
    const requiredFields = [];
    const country = formData.country;
    const compType = formData.companyType;

    if (stepNum === 1) {
      requiredFields.push(
        { key: 'companyName', label: 'Company Name' },
        { key: 'companyType', label: 'Company Type' },
        { key: 'clientCode', label: 'Client Code' },
        { key: 'workLocationsCount', label: 'Number of Work Locations' },
        { key: 'clientStatus', label: 'Client Status' }
      );
      if (country === 'India') {
        if (compType !== 'govt' && compType !== 'trust') {
          requiredFields.push({ key: 'gstin', label: 'GSTIN' });
        }
        requiredFields.push({ key: 'pan', label: 'PAN' });
      } else {
        requiredFields.push({ key: 'taxId', label: 'Tax ID' }, { key: 'regNo', label: 'Registration Number' });
      }
      if (compType === 'trust') {
        requiredFields.push({ key: 'trustRegNo', label: 'Trust/NGO Registration Number' });
      }
    } else if (stepNum === 2) {
      requiredFields.push(
        { key: 'regAddressLine1', label: 'Registered Address' },
        { key: 'regCity', label: 'City' },
        { key: 'regState', label: 'State' },
        { key: 'regPin', label: 'PIN Code' },
      );
    } else if (stepNum === 3) {
      requiredFields.push(
        { key: 'poc1.name', label: 'Primary POC Name' },
        { key: 'poc1.email', label: 'Primary POC Email' },
        { key: 'poc1.phone', label: 'Primary POC Phone' },
      );
    } else if (stepNum === 4) {
      requiredFields.push(
        { key: 'contractType', label: 'Contract Type' },
        { key: 'billingModel', label: 'Billing Model' },
        { key: 'contractStart', label: 'Contract Start Date' },
      );
      if (formData.poRequired) {
        requiredFields.push({ key: 'poNumber', label: 'PO Number' });
      }
      if (formData.billingModel === 'markup') {
        requiredFields.push({ key: 'markupPct', label: 'Markup Percentage' });
      }
      if (formData.billingModel === 'fixed_per_candidate') {
        requiredFields.push({ key: 'fixedFeeCandidate', label: 'Fixed Fee Per Candidate' });
      }
    }

    let isValid = true;
    let newErrors = { ...errors };
    let missingLabels = [];

    requiredFields.forEach(field => {
      let value;
      if (field.key.includes('.')) {
        const [parent, child] = field.key.split('.');
        value = formData[parent]?.[child];
      } else {
        value = formData[field.key];
      }
      if (!value || String(value).trim() === '') {
        newErrors[field.key] = true;
        isValid = false;
        missingLabels.push(field.label);
      } else {
        delete newErrors[field.key];
      }
    });

    if (stepNum === 1 && country === 'India' && compType !== 'govt' && compType !== 'trust') {
      const gstin = (formData.gstin || '').toUpperCase();
      if (gstin && !PATTERNS.GSTIN.test(gstin)) {
        newErrors.gstin = true;
        isValid = false;
        if (!missingLabels.includes('GSTIN (Invalid format)')) {
            missingLabels.push('GSTIN (Invalid format)');
        }
      }
    }

    if (stepNum === 2) {
      if (!checkAllBranchesGSTIN()) {
        isValid = false;
        missingLabels.push('Valid Branch GSTINs');
      }
      if (formData.workLocationsCount > 1 && clientBranches.length === 0) {
        isValid = false;
        missingLabels.push('At least one Branch (required for >1 locations)');
      }
    }

    setErrors(newErrors);

    if (!isValid) {
      const msg = `Missing required fields: ${missingLabels.join(', ')}`;
      if (isTabNavigation) {
        showToast({ message: `Cannot navigate: ${msg}`, type: 'error' });
      } else {
        showToast({ message: msg, type: 'error' });
      }
    }

    return isValid;
  }, [formData, errors, checkAllBranchesGSTIN, showToast, clientBranches.length]);

  const goToStep = useCallback((stepNum) => {
    // SUGGESTION: implement real-time validation observer for sectionProgress instead of only checking on forward nav
    if (stepNum > currentStep) {
      for (let s = currentStep; s < stepNum; s++) {
        if (!validateStep(s, true)) return;
        markProgress(s);
      }
    }
    setCurrentStep(stepNum);
  }, [currentStep, validateStep, markProgress]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep) && currentStep < 8) {
      markProgress(currentStep);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateStep, markProgress]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  }, [currentStep]);

  // ═══ COMPLETION TRACKING ══════════════════════════

  const completionPct = (() => {
    const done = Object.values(sectionProgress).filter(Boolean).length;
    return Math.round((done / 8) * 100);
  })();

  const completionCount = Object.values(sectionProgress).filter(Boolean).length;

  // ═══ FORM PAYLOAD & SUBMISSION ════════════════════

  const getFormPayload = useCallback(() => {
    return {
      id: editId || Date.now(),
      name: formData.companyName,
      type: formData.companyType,
      trustRegNo: formData.trustRegNo,
      gstin: formData.gstin,
      pan: formData.pan,
      tan: formData.tan,
      cin: formData.cin,
      incorporationDate: formData.incorporationDate,
      code: formData.clientCode,
      industry: formData.industry,
      subIndustry: formData.subIndustry,
      status: formData.clientStatus,
      locationsCount: formData.workLocationsCount,
      isGroupCompany: formData.isGroupCompany,
      parentCompany: formData.parentCompany,
      regAddressLine1: formData.regAddressLine1,
      regAddressLine2: formData.regAddressLine2,
      regCity: formData.regCity,
      regState: formData.regState,
      regPin: formData.regPin,
      country: formData.country,
      taxId: formData.taxId,
      regNo: formData.regNo,
      billingSame: formData.billingSame,
      billAddressLine1: formData.billAddressLine1,
      billCity: formData.billCity,
      billState: formData.billState,
      billPin: formData.billPin,
      branches: formData.workLocationsCount === 1 ? [] : clientBranches.map(b => ({
        id: b.id, name: b.name, code: b.code, addr1: b.addr1, addr2: b.addr2,
        city: b.city, state: b.state, pin: b.pin, gstin: b.gstin,
        gstType: b.gstType, pocName: b.pocName, pocEmail: b.pocEmail,
        pocPhone: b.pocPhone, isPrimary: b.isPrimary,
      })),
      poc1: { ...formData.poc1, preferences: Object.entries(formData.poc1?.prefs || {}).filter(([, v]) => v).map(([k]) => k === 'wa' ? 'WhatsApp' : k === 'sms' ? 'SMS' : 'Email') },
      poc2: { ...formData.poc2, preferences: Object.entries(formData.poc2?.prefs || {}).filter(([, v]) => v).map(([k]) => k === 'wa' ? 'WhatsApp' : k === 'sms' ? 'SMS' : 'Email') },
      poc3: { ...formData.poc3, preferences: Object.entries(formData.poc3?.prefs || {}).filter(([, v]) => v).map(([k]) => k === 'wa' ? 'WhatsApp' : k === 'sms' ? 'SMS' : 'Email') },
      extraContacts: extraContacts.filter(c => c.name && c.email).map(c => ({ ...c })),
      contractType: formData.contractType,
      billingModel: formData.billingModel,
      markupPct: parseFloat(formData.markupPct || '0'),
      markupBase: formData.markupBase,
      fixedFeeCandidate: parseFloat(formData.fixedFeeCandidate || '0'),
      fixedMonthlyRetainer: parseFloat(formData.fixedMonthlyRetainer || '0'),
      hourlyRate: parseFloat(formData.hourlyRate || '0'),
      standardHours: parseFloat(formData.standardHours || '0'),
      invoiceCycle: formData.invoiceCycle,
      paymentTerms: formData.paymentTerms,
      contractStart: formData.contractStart,
      contractEnd: formData.contractEnd,
      autoRenewal: formData.autoRenewal,
      poRequired: formData.poRequired,
      poNumber: formData.poNumber,
      poValue: parseFloat(formData.poValue || '0'),
      poValidity: formData.poValidity,
      noticePeriod: parseInt(formData.noticePeriod || '30'),
      creditLimit: parseFloat(formData.creditLimit || '0'),
      latePenalty: parseFloat(formData.latePenalty || '0'),
      billingCurrency: formData.billingCurrency,
      gstRate: formData.gstRate,
      lutRefNo: formData.lutRefNo,
      reverseCharge: formData.reverseCharge,
      tdsApplicableAgency: formData.tdsApplicableAgency,
      prefFormatPDF: formData.prefFormatPDF,
      prefFormatXLSX: formData.prefFormatXLSX,
      invoiceFooterNotes: formData.invoiceFooterNotes,
      pfCeiling: parseFloat(formData.pfCeiling || '15000'),
      pfApplicable: formData.pfApplicable,
      esiLimit: parseFloat(formData.esiLimit || '21000'),
      esiApplicable: formData.esiApplicable,
      ptState: formData.ptState,
      ptApplicable: formData.ptApplicable,
      lwfFrequency: formData.lwfFrequency,
      lwfApplicable: formData.lwfApplicable,
      tdsRegime: formData.tdsRegime,
      tdsApplicable: formData.tdsApplicable,
      gratuityMode: formData.gratuityMode,
      gratuityApplicable: formData.gratuityApplicable,
      bonusPct: parseFloat(formData.bonusPct || '8.33'),
      bonusApplicable: formData.bonusApplicable,
      bonusRate: parseFloat(formData.bonusPct || '8.33'),
      statutoryBonusApplicable: formData.bonusApplicable,
      lopBasis: formData.lopBasis,
      portalAccess: formData.portalAccess,
      portalEmail: formData.portalEmail,
      portalAccessLevel: formData.portalAccessLevel,
      portalViewSalary: formData.portalViewSalary,
      portalViewInvoices: formData.portalViewInvoices,
      portalViewPayslips: formData.portalViewPayslips,
      portalRaiseRequests: formData.portalRaiseRequests,
      portal2fa: formData.portal2fa,
      sessionTimeout: parseInt(formData.sessionTimeout || '60'),
      ipWhitelist: formData.ipWhitelist,
      logoUrl: formData.logoUrl,
      invoiceRaiseDay: formData.invoiceRaiseDay,
      payrollMonthConvention: formData.payrollMonthConvention,
      cycleStartDay: parseInt(formData.cycleStartDay || '1'),
      cycleEndDay: parseInt(formData.cycleEndDay || '28'),
      attendanceCutoff: formData.attendanceCutoff,
      payrollLockDay: formData.payrollLockDay,
      salaryCreditDay: formData.salaryCreditDay,
      invoiceDisputeDays: parseInt(formData.invoiceDisputeDays || '7'),
      backupAM: formData.backupAccountManager,
      autoReminders: formData.autoReminders,
      accountManager: formData.accountManager,
      clientNotes: formData.clientNotes,
      outstanding: 0, outstandingLimitExceeded: false,
      contractExpired: false, contractExpiringSoon: false,
      documents: uploadedDocs.filter(d => d.file).map(d => ({
        type: d.type,
        file: d.file
      })),
    };
  }, [formData, editId, clientBranches, extraContacts, uploadedDocs]);

  const getDraftKey = useCallback(() => {
    return isEditMode && editId ? `tecla_client_draft_edit_${editId}` : `tecla_client_draft_create`;
  }, [isEditMode, editId]);

  const saveDraft = useCallback((isAuto = false) => {
    const key = getDraftKey();
    const draftPayload = {
      _draftVersion: 2,
      formData: { ...formData },
      clientBranches: [...clientBranches],
      extraContacts: [...extraContacts],
      agencyBranches: [...agencyBranches],
      stateRegistrations: [...stateRegistrations],
      sectionProgress: { ...sectionProgress },
      currentStep,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(draftPayload));
    if (!isAuto) showToast('💾 Draft saved successfully!');
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [getDraftKey, formData, clientBranches, extraContacts, agencyBranches, stateRegistrations, sectionProgress, currentStep, showToast]);

  const errorKeyMap = useCallback((laravelErrors) => {
    const mapped = {};
    const flatMap = {
      'company_name': 'companyName',
      'company_type': 'companyType',
      'client_code': 'clientCode',
      'registered_address_line_1': 'regAddressLine1',
      'registered_city': 'regCity',
      'registered_state': 'regState',
      'registered_pin': 'regPin',
      'registered_pin_code': 'regPin',
      'tax_id': 'taxId',
      'registration_number': 'regNo',
      'gstin': 'gstin',
      'pan': 'pan',
      'trust_registration_number': 'trustRegNo',
      'contract_type': 'contractType',
      'billing_model': 'billingModel',
      'contract_start_date': 'contractStart',
      'po_number': 'poNumber',
      'primary_poc_name': 'poc1.name',
    };

    Object.keys(laravelErrors).forEach(key => {
      let mappedKey = key;
      if (flatMap[key]) mappedKey = flatMap[key];
      else if (key.startsWith('contacts.')) {
        // contacts.0.email -> poc1.email
        const parts = key.split('.');
        const index = parseInt(parts[1]);
        const field = parts.slice(2).join('.');
        if (index === 0) mappedKey = `poc1.${field}`;
        else if (index === 1) mappedKey = `poc2.${field}`;
        else if (index === 2) mappedKey = `poc3.${field}`;
        else mappedKey = `extraContacts[${index - 3}].${field}`;
      } else if (key.startsWith('branches.')) {
        // branches.0.gstin -> branches.0.gstin or let's use brackets for array
        const parts = key.split('.');
        const index = parseInt(parts[1]);
        const field = parts.slice(2).join('.');
        
        let branchField = field;
        if (field === 'branch_name') branchField = 'name';
        if (field === 'branch_code') branchField = 'code';
        if (field === 'address_line_1') branchField = 'addr1';
        if (field === 'city') branchField = 'city';
        if (field === 'pin_code') branchField = 'pin';
        if (field === 'finance_poc_name') branchField = 'pocName';
        if (field === 'finance_poc_email') branchField = 'pocEmail';
        if (field === 'finance_poc_phone') branchField = 'pocPhone';
        if (field === 'gst_registration_type') branchField = 'gstType';

        mappedKey = `branches.${index}.${branchField}`;
      }
      mapped[mappedKey] = laravelErrors[key];
    });
    return mapped;
  }, []);

  const submitForm = useCallback(() => {
    const payload = getFormPayload();

    setIsSubmitting(true);
    setErrors({});
    
    // Status transition check
    if (isEditMode) {
      // Allow the backend to handle the status transition validation
      // if it has it, otherwise we could keep it here.
    }

    // Warnings (non-blocking)
    if (payload.contractEnd && new Date(payload.contractEnd) < new Date()) {
      showToast('⚠️ Notice: Saving client with an expired contract end date.');
    }

    const handleSuccess = (page) => {
      setIsSubmitting(false);
      showToast('✅ Client saved & activated successfully!');
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('tecla_client_draft_')) {
          localStorage.removeItem(k);
        }
      });
    };

    const handleError = (errors) => {
      setIsSubmitting(false);
      const mapped = errorKeyMap(errors);
      setErrors(mapped);
      
      // Map branch errors directly to the state for AddressSection
      let branchErrors = {};
      Object.keys(mapped).forEach(k => {
        if (k.startsWith('branches.')) {
          const parts = k.split('.');
          const idx = parts[1];
          const f = parts[2];
          if (f === 'gstin') branchErrors[idx] = mapped[k];
        }
      });
      if (Object.keys(branchErrors).length > 0) {
        setClientBranches(prev => prev.map((b, i) => {
          if (branchErrors[i]) return { ...b, gstinError: branchErrors[i] };
          return b;
        }));
      }

      // Jump to first error step
      if (Object.keys(mapped).length > 0) {
        const firstErrorKey = Object.keys(mapped)[0];
        const step = getStepForField(firstErrorKey);
        setCurrentStep(step);
      }

      showToast(`❌ Required fields missing or invalid. Please check the highlighted errors.`);
    };

    if (isEditMode && editId) {
      router.put(route('clients.update', editId), payload, {
        onSuccess: handleSuccess,
        onError: handleError,
        preserveScroll: false
      });
    } else {
      router.post(route('clients.store'), payload, {
        onSuccess: handleSuccess,
        onError: handleError,
        preserveScroll: false
      });
    }
    return true;
  }, [getFormPayload, showToast, isEditMode, editId, errorKeyMap]);

  const loadClientData = useCallback((client) => {
    if (!client) return;

    setIsEditMode(true);
    setEditId(client.id);

    setFormData(prev => ({
      ...prev,
      companyName: client.company_name || '',
      companyType: client.company_type || '',
      trustRegNo: client.trust_registration_number || '',
      gstin: client.gstin || '',
      pan: client.pan_number || '',
      tan: client.tan_number || '',
      cin: client.cin_number || '',
      incorporationDate: client.incorporation_date || '',
      clientCode: client.client_code || '',
      industry: client.industry || '',
      subIndustry: client.sub_industry || '',
      clientStatus: client.status || 'onboarding',
      workLocationsCount: client.branches ? Math.max(1, client.branches.length) : 1,
      isGroupCompany: client.is_group_company || false,
      parentCompany: client.parent_company || '',
      regAddressLine1: client.registered_address_line_1 || '',
      regAddressLine2: client.registered_address_line_2 || '',
      regCity: client.registered_city || '',
      regState: client.registered_state || '',
      regPin: client.registered_pin || '',
      country: client.country || 'India',
      taxId: client.tax_id || '',
      regNo: client.registration_number || '',
      billingSame: client.is_billing_same_as_registered !== undefined ? client.is_billing_same_as_registered : true,
      billAddressLine1: client.billing_address_line_1 || '',
      billCity: client.billing_city || '',
      billState: client.billing_state || '',
      billPin: client.billing_pin_code || '',
      contractType: client.contract_type || '',
      billingModel: client.billing_model || '',
      markupPct: client.markup_percentage || '',
      markupBase: client.markup_base || 'gross',
      fixedFeeCandidate: client.fixed_fee_per_candidate || '',
      fixedMonthlyRetainer: client.fixed_monthly_retainer || '',
      hourlyRate: client.hourly_rate || '',
      standardHours: client.standard_hours_per_month || '',
      invoiceCycle: client.invoice_cycle || 'monthly',
      paymentTerms: client.payment_net_terms || 'net15',
      contractStart: client.contract_start_date || '',
      contractEnd: client.contract_end_date || '',
      autoRenewal: client.auto_renewal || false,
      poRequired: client.po_required || false,
      poNumber: client.po_number || '',
      poValue: client.po_value || '',
      poValidity: client.po_validity_date || '',
      noticePeriod: client.notice_period_days || 30,
      creditLimit: client.credit_limit || '',
      latePenalty: client.late_payment_penalty_pct || '',
      billingCurrency: client.currency || 'INR',
      gstRate: client.gst_rate || '18',
      lutRefNo: client.lut_reference_number || '',
      reverseCharge: client.is_reverse_charge_applicable || false,
      tdsApplicableAgency: client.tds_applicable_on_agency_fee || 'na',
      prefFormatPDF: client.invoice_format_pdf !== undefined ? client.invoice_format_pdf : true,
      prefFormatXLSX: client.invoice_format_xlsx || false,
      invoiceFooterNotes: client.invoice_footer_notes || '',
      pfCeiling: client.pf_ceiling || 15000,
      pfApplicable: client.pf_applicable !== undefined ? client.pf_applicable : true,
      esiLimit: client.esi_limit || 21000,
      esiApplicable: client.esi_applicable !== undefined ? client.esi_applicable : true,
      ptState: client.pt_state || 'auto',
      ptApplicable: client.pt_applicable !== undefined ? client.pt_applicable : true,
      lwfFrequency: client.lwf_frequency || 'biannual',
      lwfApplicable: client.lwf_applicable !== undefined ? client.lwf_applicable : false,
      tdsRegime: client.tds_regime || 'new',
      tdsApplicable: client.tds_applicable !== undefined ? client.tds_applicable : true,
      gratuityMode: client.default_gratuity_mode || 'ctc_included',
      gratuityApplicable: true, // Not in DB, default true
      bonusPct: client.bonus_rate_percentage || 8.33,
      bonusApplicable: client.statutory_bonus_applicable !== undefined ? client.statutory_bonus_applicable : false,
      lopBasis: client.lop_basis_days || defaultLopBasis,
      portalAccess: client.client_portal_enabled || false,
      portalEmail: client.primary_poc_email || '',
      portalAccessLevel: client.portal_access_level || 'view_only',
      portalViewSalary: client.portal_view_salary !== undefined ? client.portal_view_salary : true,
      portalViewInvoices: client.portal_view_invoices !== undefined ? client.portal_view_invoices : true,
      portalViewPayslips: client.portal_view_payslips || false,
      portalRaiseRequests: client.portal_raise_requests !== undefined ? client.portal_raise_requests : true,
      portal2fa: client.portal_require_2fa !== undefined ? client.portal_require_2fa : true,
      sessionTimeout: client.portal_session_timeout || 60,
      ipWhitelist: client.portal_ip_whitelist || '',
      logoUrl: client.logo_url || '',
      invoiceRaiseDay: client.invoice_raise_day || 'Same as Payroll Lock Day',
      payrollMonthConvention: client.payroll_convention || 'calendar',
      cycleStartDay: client.custom_cycle_start_day || 1,
      cycleEndDay: client.custom_cycle_end_day || 28,
      attendanceCutoff: client.cutoff_day || '28',
      payrollLockDay: client.payroll_lock_day || '3_next',
      salaryCreditDay: client.salary_credit_day || '7',
      invoiceDisputeDays: client.invoice_dispute_window_days || '7',
      accountManager: client.account_manager_id || '',
      backupAccountManager: client.backup_account_manager_id || '',
      autoReminders: client.auto_reminders !== undefined ? client.auto_reminders : true,
      clientNotes: client.client_notes || '',
    }));

    // Contacts
    if (client.contacts) {
      let extContacts = [];
      const newPoc1 = {};
      const newPoc2 = {};
      const newPoc3 = {};
      
      client.contacts.forEach(c => {
        const contactData = {
          name: c.full_name || '',
          designation: c.designation || '',
          email: c.email || '',
          phone: c.phone || '',
          whatsappSame: c.is_whatsapp_same !== undefined ? !!c.is_whatsapp_same : true,
          ccInvoice: c.cc_on_invoice !== undefined ? !!c.cc_on_invoice : false,
          onboardingKits: c.receive_onboarding_kits !== undefined ? !!c.receive_onboarding_kits : false,
          prefs: {
            email: c.preference_email !== undefined ? !!c.preference_email : true,
            sms: c.preference_sms !== undefined ? !!c.preference_sms : false,
            wa: c.preference_whatsapp !== undefined ? !!c.preference_whatsapp : false
          }
        };

        if (c.contact_type === 'primary') Object.assign(newPoc1, contactData);
        else if (c.contact_type === 'finance') Object.assign(newPoc2, contactData);
        else if (c.contact_type === 'hr') Object.assign(newPoc3, contactData);
        else {
          extContacts.push({ ...contactData, id: `contact-loaded-${c.id}` });
        }
      });

      setFormData(prev => ({
        ...prev,
        poc1: { ...prev.poc1, ...newPoc1 },
        poc2: { ...prev.poc2, ...newPoc2 },
        poc3: { ...prev.poc3, ...newPoc3 },
      }));
      setExtraContacts(extContacts);
    }

    // Branches Reverse-Mapping
    if (client.branches && client.branches.length > 0) {
      setClientBranches(client.branches.map(branch => ({
        id: branch.id,
        name: branch.branch_name || '',
        code: branch.branch_code || '',
        addr1: branch.address_line_1 || '',
        addr2: branch.address_line_2 || '', // if it exists, else empty
        city: branch.city || '',
        state: branch.state || '',
        pin: branch.pin_code || '', // if exists in DB
        gstin: branch.gstin || '',
        gstType: branch.gst_registration_type || 'Regular',
        pocName: branch.finance_poc_name || '',
        pocEmail: branch.finance_poc_email || '',
        pocPhone: branch.finance_poc_phone || '',
        isPrimary: branch.is_primary_billing_branch === 1 || branch.is_primary_billing_branch === true,
        gstinError: '',
        gstinValid: !!branch.gstin,
      })));
    }

    // Documents Reverse-Mapping
    if (client.documents && client.documents.length > 0) {
      setUploadedDocs(client.documents.map(doc => ({
        id: doc.id,
        dbId: doc.id,
        name: doc.file_name,
        size: doc.file_size_kb * 1024,
        type: doc.document_type,
        verified: doc.verification_status === 'verified',
        verification_status: doc.verification_status,
        rejection_reason: doc.rejection_reason,
        file: null // already in DB
      })));
    }

    setSectionProgress({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true });
  }, []);

  // ═══ INITIALIZATION ═══════════════════════════════

  useEffect(() => {
    // If not in edit mode, load draft if one exists for this exact key
    if (!isEditMode) {
      const key = getDraftKey();
      const draftStr = localStorage.getItem(key);

      if (draftStr) {
        try {
          const parsed = JSON.parse(draftStr);

          if (parsed._draftVersion === 2 && parsed.formData) {
            // ── Version 2 draft: raw formData was saved directly ──
            const savedForm = parsed.formData;

            // Normalise lopBasis
            if (savedForm.lopBasis === 'inherit' || savedForm.lopBasis === '') {
              savedForm.lopBasis = defaultLopBasis;
            } else if (savedForm.lopBasis === '26_days') {
              savedForm.lopBasis = '26';
            } else if (savedForm.lopBasis === '30_days') {
              savedForm.lopBasis = '30';
            }

            setFormData(prev => ({ ...prev, ...savedForm }));

            // Restore client branches
            if (Array.isArray(parsed.clientBranches)) {
              setClientBranches(parsed.clientBranches);
            }

            // Restore extra contacts
            if (Array.isArray(parsed.extraContacts)) {
              setExtraContacts(parsed.extraContacts);
            }

            // Restore agency branches
            if (Array.isArray(parsed.agencyBranches)) {
              setAgencyBranches(parsed.agencyBranches);
            }

            // Restore state registrations
            if (Array.isArray(parsed.stateRegistrations)) {
              setStateRegistrations(parsed.stateRegistrations);
            }

            // Restore section progress
            if (parsed.sectionProgress && typeof parsed.sectionProgress === 'object') {
              setSectionProgress(parsed.sectionProgress);
            }

            // Restore step position
            if (parsed.currentStep >= 1 && parsed.currentStep <= 8) {
              setCurrentStep(parsed.currentStep);
            }

            showToast('ℹ️ Loaded form from local draft.');
          }
        } catch (e) { console.error('Draft restore error:', e); }
      }
    }
  }, [isEditMode, getDraftKey]);

  const clearDraft = useCallback(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('tecla_client_draft_')) {
        localStorage.removeItem(k);
      }
    });
    const fresh = getDefaultFormData();
    fresh.lopBasis = defaultLopBasis;
    setFormData(fresh);
    setClientBranches([]);
    setExtraContacts([]);
    setAgencyBranches([]);
    setStateRegistrations([{ state: 'MH', ptRegNo: '', lwfRegNo: '' }]);
    setSectionProgress({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false });
    setCurrentStep(1);
    showToast('🗑️ Draft cleared and form reset.');
  }, [defaultLopBasis, showToast]);

  return {
    // State
    formData, errors, hints, currentStep, sectionProgress,
    uploadedDocs, extraContacts, clientBranches, agencyBranches, stateRegistrations,
    isEditMode, editId, pendingDocType, fileInputRef, logoInputRef,

    // Generic handlers
    handleInputChange, handlePocChange, handlePocPrefChange,
    showToast, markProgress,

    // Validators
    validateGSTIN, validatePAN, validateTAN, validateCIN, validatePIN,
    validateEmail, validatePhone, validateContractDates, validateStep,

    // Field-specific handlers
    autoGenerateCode, handleCompanyType, handleCountryChange,
    handleIndustryChange, handleBillingModelChange, handleContractTypeChange,
    handleGSTRateChange, handleTDSChange, getTDSPreview,
    handlePFCeiling, getPFCeilingHint, handleESILimit, getESILimitHint,
    handleAccessLevel, handlePayrollConvention, checkIncorporation,
    updateInvoiceDuePreview, updateBackupAMOptions, getInvoicePreview: updateInvoiceDuePreview,

    // Branch handlers
    addClientBranch, removeClientBranch, updateClientBranch,
    handlePrimaryBranchChange,

    // Agency branch handlers
    addAgencyBranch, removeAgencyBranch, updateAgencyBranch,

    // Contact handlers
    addExtraContact, removeExtraContact, updateExtraContact,

    // State registration handlers
    addStateRegistration, removeStateRegistration, updateStateRegistration,

    // Document handlers
    triggerDocUpload, processFiles, updateDocType, removeDoc,
    updateDocExpiry, markDocVerified, getDocChecklist,
    setPendingDocType,

    // Logo
    handleLogoSelect,

    // Wizard
    goToStep, nextStep, prevStep,

    // Completion
    completionPct, completionCount,

    // Form actions
    saveDraft, clearDraft, submitForm, getFormPayload, loadClientData,
    isSubmitting, submitSuccess,
  };
}
