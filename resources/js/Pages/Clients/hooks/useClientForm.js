import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PATTERNS, PIN_MAPPING, GST_STATE_CODES, ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE, DOC_TYPE_LABELS, DOC_TYPE_ICONS, REQUIRED_DOC_TYPES,
  ALLOWED_STATUS_TRANSITIONS, getDefaultFormData, DEMO_BRANCHES,
} from '../constants/clientFormData';

// ═══════════════════════════════════════════════════
//  useClientForm — All form state, validation & logic
// ═══════════════════════════════════════════════════

export default function useClientForm() {
  // ── Core state ───────────────────────────────────
  const [formData, setFormData] = useState(getDefaultFormData());
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
  const [toastMessage, setToastMessage] = useState('');
  const [editId, setEditId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
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
  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  }, []);

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
      const doc = {
        id: Date.now() + Math.random(),
        name: file.name, size: file.size, type: pendingDocType,
        file, verified: false, expiryDate: '',
      };
      newDocs.push(doc);
      showToast(`✅ ${file.name} uploaded successfully`);
      markProgress(6);
    }
    if (newDocs.length > 0) {
      setUploadedDocs(prev => [...prev, ...newDocs]);
    }
  }, [pendingDocType, showToast, markProgress]);

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

  const validateStep = useCallback((stepNum) => {
    const requiredFields = [];
    const country = formData.country;
    const compType = formData.companyType;

    if (stepNum === 1) {
      requiredFields.push(
        { key: 'companyName', label: 'Company Name' },
        { key: 'companyType', label: 'Company Type' },
        { key: 'clientCode', label: 'Client Code' },
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
    }
    // Steps 5-8 have no required fields for step validation

    let isValid = true;
    let newErrors = { ...errors };
    let firstErrorKey = null;

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
        if (!firstErrorKey) firstErrorKey = field.key;
      } else {
        delete newErrors[field.key];
      }
    });

    // GSTIN pattern validation on step 1
    if (stepNum === 1 && country === 'India' && compType !== 'govt' && compType !== 'trust') {
      const gstin = (formData.gstin || '').toUpperCase();
      if (gstin && !PATTERNS.GSTIN.test(gstin)) {
        newErrors.gstin = true;
        isValid = false;
        if (!firstErrorKey) firstErrorKey = 'gstin';
      }
    }

    // Branch GSTIN validation on step 2
    if (stepNum === 2 && !checkAllBranchesGSTIN()) {
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      showToast(`❌ Section ${stepNum} has missing/invalid required fields.`);
    }

    return isValid;
  }, [formData, errors, checkAllBranchesGSTIN, showToast]);

  const goToStep = useCallback((stepNum) => {
    if (stepNum > currentStep) {
      for (let s = currentStep; s < stepNum; s++) {
        if (!validateStep(s)) return;
      }
    }
    setCurrentStep(stepNum);
  }, [currentStep, validateStep]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep) && currentStep < 8) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateStep]);

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
      branches: clientBranches.map(b => ({
        name: b.name, code: b.code, addr1: b.addr1, addr2: b.addr2,
        city: b.city, state: b.state, pin: b.pin, gstin: b.gstin,
        gstType: b.gstType, pocName: b.pocName, pocEmail: b.pocEmail,
        pocPhone: b.pocPhone, isPrimary: b.isPrimary,
      })),
      poc1: { ...formData.poc1, preferences: Object.entries(formData.poc1.prefs).filter(([, v]) => v).map(([k]) => k === 'wa' ? 'WhatsApp' : k === 'sms' ? 'SMS' : 'Email') },
      poc2: { ...formData.poc2, preferences: Object.entries(formData.poc2.prefs).filter(([, v]) => v).map(([k]) => k === 'wa' ? 'WhatsApp' : k === 'sms' ? 'SMS' : 'Email') },
      poc3: { ...formData.poc3, preferences: Object.entries(formData.poc3.prefs).filter(([, v]) => v).map(([k]) => k === 'wa' ? 'WhatsApp' : k === 'sms' ? 'SMS' : 'Email') },
      extraContacts: extraContacts.filter(c => c.name && c.email),
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
      backupAM: formData.backupAccountManager,
      autoReminders: formData.autoReminders,
      accountManager: formData.accountManager,
      clientNotes: formData.clientNotes,
      outstanding: 0, outstandingLimitExceeded: false,
      contractExpired: false, contractExpiringSoon: false,
    };
  }, [formData, editId, clientBranches, extraContacts]);

  const saveDraft = useCallback((isAuto = false) => {
    const code = formData.clientCode || 'temp';
    const payload = getFormPayload();
    localStorage.setItem(`tecla_client_draft_${code}`, JSON.stringify(payload));
    if (!isAuto) showToast('💾 Draft saved successfully!');
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [formData.clientCode, getFormPayload, showToast]);

  const submitForm = useCallback(() => {
    const payload = getFormPayload();
    const existingClients = JSON.parse(localStorage.getItem('tecla_clients') || '[]');

    // Status transition check
    let initialStatus = 'draft';
    let currentClient = null;
    if (editId) {
      currentClient = existingClients.find(c => c.id === editId || c.code === formData.clientCode);
      if (currentClient) initialStatus = currentClient.status || 'draft';
    }
    if (initialStatus !== payload.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[initialStatus] || [];
      if (!allowed.includes(payload.status)) {
        showToast(`🚫 Cannot change status from ${initialStatus} to ${payload.status}.`);
        return false;
      }
    }

    // Full required field validation
    const required = [
      { key: 'companyName', label: 'Company Name' },
      { key: 'companyType', label: 'Company Type' },
      { key: 'clientCode', label: 'Client Code' },
      { key: 'regAddressLine1', label: 'Registered Address' },
      { key: 'regCity', label: 'City' },
      { key: 'regState', label: 'State' },
      { key: 'regPin', label: 'PIN Code' },
      { key: 'poc1.name', label: 'Primary POC Name' },
      { key: 'poc1.email', label: 'Primary POC Email' },
      { key: 'poc1.phone', label: 'Primary POC Phone' },
      { key: 'contractType', label: 'Contract Type' },
      { key: 'billingModel', label: 'Billing Model' },
      { key: 'contractStart', label: 'Contract Start Date' },
    ];
    if (formData.companyType === 'trust') required.push({ key: 'trustRegNo', label: 'Trust/NGO Registration Number' });
    if (formData.country !== 'India') {
      required.push({ key: 'taxId', label: 'Tax ID' }, { key: 'regNo', label: 'Registration Number' });
    } else {
      if (formData.companyType !== 'govt') required.push({ key: 'gstin', label: 'GSTIN' });
      required.push({ key: 'pan', label: 'PAN' });
    }
    if (formData.poRequired) required.push({ key: 'poNumber', label: 'PO Number' });

    let errorCount = 0;
    let newErrors = {};
    let firstErrorStep = null;

    required.forEach(field => {
      let value;
      if (field.key.includes('.')) {
        const [parent, child] = field.key.split('.');
        value = formData[parent]?.[child];
      } else {
        value = formData[field.key];
      }
      if (!value || String(value).trim() === '') {
        newErrors[field.key] = true;
        errorCount++;
        if (!firstErrorStep) {
          // Determine which step this field belongs to
          if (['companyName', 'companyType', 'clientCode', 'gstin', 'pan', 'tan', 'cin', 'trustRegNo', 'taxId', 'regNo'].includes(field.key)) firstErrorStep = 1;
          else if (['regAddressLine1', 'regCity', 'regState', 'regPin'].includes(field.key)) firstErrorStep = 2;
          else if (field.key.startsWith('poc1')) firstErrorStep = 3;
          else if (['contractType', 'billingModel', 'contractStart', 'poNumber'].includes(field.key)) firstErrorStep = 4;
        }
      }
    });

    // GSTIN pattern check
    if (formData.country === 'India' && formData.gstin) {
      if (!PATTERNS.GSTIN.test(formData.gstin.toUpperCase())) {
        newErrors.gstin = true;
        errorCount++;
        if (!firstErrorStep) firstErrorStep = 1;
      }
    }

    // Branch GSTIN check
    if (!checkAllBranchesGSTIN()) {
      showToast('❌ Fix GSTIN errors in Branch / Work Locations before saving.');
      if (!firstErrorStep) firstErrorStep = 2;
      setErrors(prev => ({ ...prev, ...newErrors }));
      if (firstErrorStep) goToStep(firstErrorStep);
      return false;
    }

    if (errorCount > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      showToast(`❌ ${errorCount} required field(s) missing or invalid. Please review.`);
      if (firstErrorStep) goToStep(firstErrorStep);
      return false;
    }

    // Warnings (non-blocking)
    if (payload.contractEnd && new Date(payload.contractEnd) < new Date()) {
      showToast('⚠️ Notice: Saving client with an expired contract end date.');
    }
    if (payload.billingModel === 'markup' && payload.markupPct === 0) {
      if (!confirm('⚠️ You entered 0% markup. Confirm you want to proceed with 0% markup?')) return false;
    }
    if (payload.creditLimit > 5000000) {
      showToast('⚠️ Large credit exposure detected. Require Director sign-off.');
    }
    if (!payload.pfApplicable && !payload.esiApplicable && !payload.ptApplicable && !payload.lwfApplicable) {
      showToast('⚠️ All statutory contributions disabled. Confirm this is correct under Section 16 of Code on Wages.');
    }

    // Save
    const idx = existingClients.findIndex(c => c.code === payload.code || c.id === payload.id);
    if (idx > -1) {
      existingClients[idx] = { ...existingClients[idx], ...payload };
    } else {
      existingClients.push(payload);
    }
    localStorage.setItem('tecla_clients', JSON.stringify(existingClients));
    localStorage.removeItem(`tecla_client_draft_${payload.code || 'temp'}`);
    showToast('✅ Client saved & activated successfully!');
    setTimeout(() => { window.location.href = '/clients'; }, 1500);
    return true;
  }, [formData, editId, getFormPayload, checkAllBranchesGSTIN, showToast, goToStep]);

  // ═══ POPULATE FROM DATA ═══════════════════════════

  const populateForm = useCallback((data) => {
    if (!data) return;
    setFormData(prev => ({
      ...prev,
      companyName: data.name || '',
      companyType: data.type || '',
      trustRegNo: data.trustRegNo || '',
      gstin: data.gstin || '',
      pan: data.pan || '',
      tan: data.tan || '',
      cin: data.cin || '',
      incorporationDate: data.incorporationDate || '',
      clientCode: data.code || '',
      industry: data.industry || '',
      subIndustry: data.subIndustry || '',
      clientStatus: data.status || 'onboarding',
      workLocationsCount: data.locationsCount || 1,
      isGroupCompany: data.isGroupCompany || false,
      parentCompany: data.parentCompany || '',
      regAddressLine1: data.regAddressLine1 || '',
      regAddressLine2: data.regAddressLine2 || '',
      regCity: data.regCity || '',
      regState: data.regState || '',
      regPin: data.regPin || '',
      country: data.country || 'India',
      taxId: data.taxId || '',
      regNo: data.regNo || '',
      billingSame: data.billingSame !== undefined ? data.billingSame : true,
      billAddressLine1: data.billAddressLine1 || '',
      billCity: data.billCity || '',
      billState: data.billState || '',
      billPin: data.billPin || '',
      poc1: data.poc1 ? {
        name: data.poc1.name || '', designation: data.poc1.designation || '',
        email: data.poc1.email || '', phone: data.poc1.phone || '',
        whatsappSame: data.poc1.whatsappSame !== undefined ? data.poc1.whatsappSame : true,
        prefs: { email: data.poc1.preferences?.includes('Email') ?? true, sms: data.poc1.preferences?.includes('SMS') ?? true, wa: data.poc1.preferences?.includes('WhatsApp') ?? true },
      } : prev.poc1,
      poc2: data.poc2 ? {
        name: data.poc2.name || '', designation: data.poc2.designation || '',
        email: data.poc2.email || '', phone: data.poc2.phone || '',
        whatsappSame: data.poc2.whatsappSame !== undefined ? data.poc2.whatsappSame : true,
        ccInvoice: data.poc2.ccInvoice !== undefined ? data.poc2.ccInvoice : true,
        prefs: { email: data.poc2.preferences?.includes('Email') ?? true, sms: data.poc2.preferences?.includes('SMS') ?? false, wa: data.poc2.preferences?.includes('WhatsApp') ?? false },
      } : prev.poc2,
      poc3: data.poc3 ? {
        name: data.poc3.name || '', email: data.poc3.email || '',
        whatsappSame: data.poc3.whatsappSame !== undefined ? data.poc3.whatsappSame : true,
        onboardingKits: data.poc3.onboardingKits !== undefined ? data.poc3.onboardingKits : true,
        prefs: { email: data.poc3.preferences?.includes('Email') ?? true, sms: data.poc3.preferences?.includes('SMS') ?? false, wa: data.poc3.preferences?.includes('WhatsApp') ?? false },
      } : prev.poc3,
      contractType: data.contractType || '',
      billingModel: data.billingModel || '',
      markupPct: data.markupPct || '',
      markupBase: data.markupBase || 'gross',
      fixedFeeCandidate: data.fixedFeeCandidate || '',
      fixedMonthlyRetainer: data.fixedMonthlyRetainer || '',
      hourlyRate: data.hourlyRate || '',
      standardHours: data.standardHours || '',
      invoiceCycle: data.invoiceCycle || 'monthly',
      paymentTerms: data.paymentTerms || 'net15',
      contractStart: data.contractStart || '',
      contractEnd: data.contractEnd || '',
      autoRenewal: data.autoRenewal || false,
      poRequired: data.poRequired || false,
      poNumber: data.poNumber || '',
      poValue: data.poValue || '',
      poValidity: data.poValidity || '',
      noticePeriod: data.noticePeriod || 30,
      creditLimit: data.creditLimit || '',
      latePenalty: data.latePenalty || '',
      billingCurrency: data.billingCurrency || 'INR',
      gstRate: data.gstRate || '18',
      lutRefNo: data.lutRefNo || '',
      reverseCharge: data.reverseCharge || false,
      tdsApplicableAgency: data.tdsApplicableAgency || 'na',
      prefFormatPDF: data.prefFormatPDF !== undefined ? data.prefFormatPDF : true,
      prefFormatXLSX: data.prefFormatXLSX || false,
      invoiceFooterNotes: data.invoiceFooterNotes || '',
      pfCeiling: data.pfCeiling || 15000,
      pfApplicable: data.pfApplicable !== undefined ? data.pfApplicable : true,
      esiLimit: data.esiLimit || 21000,
      esiApplicable: data.esiApplicable !== undefined ? data.esiApplicable : true,
      ptState: data.ptState || 'auto',
      ptApplicable: data.ptApplicable !== undefined ? data.ptApplicable : true,
      lwfFrequency: data.lwfFrequency || 'biannual',
      lwfApplicable: data.lwfApplicable !== undefined ? data.lwfApplicable : false,
      tdsRegime: data.tdsRegime || 'new',
      tdsApplicable: data.tdsApplicable !== undefined ? data.tdsApplicable : true,
      gratuityMode: data.gratuityMode || 'ctc_included',
      gratuityApplicable: data.gratuityApplicable !== undefined ? data.gratuityApplicable : true,
      bonusPct: data.bonusPct || 8.33,
      bonusApplicable: data.bonusApplicable !== undefined ? data.bonusApplicable : false,
      lopBasis: data.lopBasis || 'inherit',
      portalAccess: data.portalAccess || false,
      portalEmail: data.portalEmail || '',
      portalAccessLevel: data.portalAccessLevel || 'view_only',
      portalViewSalary: data.portalViewSalary !== undefined ? data.portalViewSalary : true,
      portalViewInvoices: data.portalViewInvoices !== undefined ? data.portalViewInvoices : true,
      portalViewPayslips: data.portalViewPayslips || false,
      portalRaiseRequests: data.portalRaiseRequests !== undefined ? data.portalRaiseRequests : true,
      portal2fa: data.portal2fa !== undefined ? data.portal2fa : true,
      sessionTimeout: data.sessionTimeout || 60,
      ipWhitelist: data.ipWhitelist || '',
      logoUrl: data.logoUrl || '',
      invoiceRaiseDay: data.invoiceRaiseDay || 'Same as Payroll Lock Day',
      payrollMonthConvention: data.payrollMonthConvention || 'calendar',
      cycleStartDay: data.cycleStartDay || 1,
      cycleEndDay: data.cycleEndDay || 28,
      accountManager: data.accountManager || '',
      backupAccountManager: data.backupAM || '',
      autoReminders: data.autoReminders !== undefined ? data.autoReminders : true,
      clientNotes: data.clientNotes || '',
    }));

    if (data.extraContacts) {
      setExtraContacts(data.extraContacts.map((c, i) => ({ id: `contact-loaded-${i}`, ...c })));
    }
    if (data.branches && data.branches.length > 0) {
      setClientBranches([]);
      // Use setTimeout to ensure state is clear first
      setTimeout(() => {
        data.branches.forEach(b => {
          const branch = {
            id: `branch-loaded-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            ...b, gstinError: '', gstinValid: !!b.gstin,
          };
          setClientBranches(prev => [...prev, branch]);
        });
      }, 0);
    }
  }, []);

  // ═══ INITIALIZATION ═══════════════════════════════

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editCode = urlParams.get('code');
    const editIdParam = urlParams.get('id') ? parseInt(urlParams.get('id')) : null;

    const existingClients = JSON.parse(localStorage.getItem('tecla_clients') || '[]');
    let clientToEdit = null;

    if (editCode) {
      clientToEdit = existingClients.find(c => c.code === editCode);
    } else if (editIdParam) {
      clientToEdit = existingClients.find(c => c.id === editIdParam);
    }

    const codeKey = clientToEdit ? clientToEdit.code : (editCode || 'temp');
    const draftStr = localStorage.getItem(`tecla_client_draft_${codeKey}`);

    if (draftStr) {
      try {
        const draftData = JSON.parse(draftStr);
        populateForm(draftData);
        setEditId(draftData.id || editIdParam);
        showToast('ℹ️ Loaded form from auto-saved draft.');
      } catch (e) { console.error(e); }
    } else if (clientToEdit) {
      setIsEditMode(true);
      setEditId(clientToEdit.id);
      populateForm(clientToEdit);
      setSectionProgress({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true });
    } else {
      // New client — seed demo branches
      DEMO_BRANCHES.forEach(b => addClientBranch(b));
    }

    // Auto-save every 60 seconds
    autoSaveTimerRef.current = setInterval(() => saveDraft(true), 60000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ RETURN ═══════════════════════════════════════

  return {
    // State
    formData, errors, hints, currentStep, sectionProgress,
    uploadedDocs, extraContacts, clientBranches, agencyBranches,
    stateRegistrations, toastMessage, isEditMode, pendingDocType,
    fileInputRef, logoInputRef,

    // Generic handlers
    handleInputChange, handlePocChange, handlePocPrefChange,
    showToast, markProgress,

    // Validators
    validateGSTIN, validatePAN, validateTAN, validateCIN, validatePIN,
    validateEmail, validatePhone, validateContractDates, validateStep,
    validateBranchGSTIN, checkAllBranchesGSTIN, crossCheckPANGSTIN,

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
    saveDraft, submitForm, getFormPayload, populateForm,
  };
}
