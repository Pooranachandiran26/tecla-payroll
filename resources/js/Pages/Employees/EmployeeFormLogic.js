// Auto-extracted logic for EmployeeForm

// Expose functions globally for React inline handlers
window.getClientBranches = getClientBranches;
window.showMsg = showMsg;
window.hideMsg = hideMsg;
window.clearMsg = clearMsg;
window.setFieldState = setFieldState;
window.addBlockingError = addBlockingError;
window.removeBlockingError = removeBlockingError;
window.updateSaveButton = updateSaveButton;
window.applyFormMode = applyFormMode;
window.validateFullName = validateFullName;
window.validateAgeAtJoining = validateAgeAtJoining;
window.validatePersonalEmail = validatePersonalEmail;
window.validatePhone = validatePhone;
window.acceptDuplicatePhone = acceptDuplicatePhone;
window.rejectDuplicatePhone = rejectDuplicatePhone;
window.validateEmergencyConflict = validateEmergencyConflict;
window.checkDesignationChange = checkDesignationChange;
window.populateBranchDropdown = populateBranchDropdown;
window.onBranchChange = onBranchChange;
window.validateBranch = validateBranch;
window.validateDoj = validateDoj;
window.onEmpTypeChange = onEmpTypeChange;
window.confirmEmpTypeChange = confirmEmpTypeChange;
window.cancelEmpTypeChange = cancelEmpTypeChange;
window.syncNameFields = syncNameFields;
window.validateAccountMatch = validateAccountMatch;
window.validateIFSC = validateIFSC;
window.autoPopulateBank = autoPopulateBank;
window.validateAccountHolderName = validateAccountHolderName;
window.validatePAN = validatePAN;
window.showAadhaarClear = showAadhaarClear;
window.maskAadhaar = maskAadhaar;
window.onUanModeChange = onUanModeChange;
window.calculateGross = calculateGross;
window.validateBasicPct = validateBasicPct;
window.onPfToggleChange = onPfToggleChange;
window.onEsiToggleChange = onEsiToggleChange;
window.onTdsToggleChange = onTdsToggleChange;
window.checkTdsThreshold = checkTdsThreshold;
window.setInheritedUI = setInheritedUI;
window.syncClientDefaultsFromStorage = syncClientDefaultsFromStorage;
window.onClientChange = onClientChange;
window.applyEmpTypeBehavior = applyEmpTypeBehavior;
window.updateStatutoryInheritance = updateStatutoryInheritance;
window.runEmployeeLevelLegalChecks = runEmployeeLevelLegalChecks;
window.markOverride = markOverride;
window.applyRegimeSuggestion = applyRegimeSuggestion;
window.handleFormSubmit = handleFormSubmit;


    // ════════════════════════════════════════════════════════
    //  DEMO DATA & STATE
    // ════════════════════════════════════════════════════════

    const CLIENT_BRANCHES = {
      'mahindra': [
        { code: 'CHE-01', name: 'Chennai Office (CHE-01)', gstin: '33AABCT1332L1ZQ', poc: 'Vikas Mehta' },
        { code: 'MUM-01', name: 'Mumbai HQ (MUM-01)', gstin: '27AABCT1332L1ZA', poc: 'Priya Nair' }
      ],
      'tcs': [
        { code: 'BAN-01', name: 'Bangalore Tech Park (BAN-01)', gstin: '29AABCT5566K1ZB', poc: 'Rohan Shetty' },
        { code: 'DEL-01', name: 'Delhi NCR Office (DEL-01)', gstin: '07AABCT5566K1ZC', poc: 'Anjali Kapoor' }
      ],
      'tcs_agency': [
        { code: 'BAN-01', name: 'Bangalore Tech Park (BAN-01)', gstin: '29AABCT5566K1ZB', poc: 'Rohan Shetty' },
        { code: 'DEL-01', name: 'Delhi NCR Office (DEL-01)', gstin: '07AABCT5566K1ZC', poc: 'Anjali Kapoor' }
      ],
      'reliance': [
        { code: 'MUC-01', name: 'Mumbai Central (MUC-01)', gstin: '27AABCR7788L1ZD', poc: 'Suresh Bhat' }
      ],
      'wipro': [
        { code: 'HYD-01', name: 'Hyderabad Campus (HYD-01)', gstin: '36AABCW9900M1ZE', poc: 'Kavitha Rao' },
        { code: 'PUN-01', name: 'Pune Office (PUN-01)', gstin: '27AABCW9900M1ZF', poc: 'Amit Desai' }
      ]
    };

    function getClientBranches(clientId) {
      if (CLIENT_BRANCHES[clientId]) return CLIENT_BRANCHES[clientId];
      return [{ code: 'HO-01', name: 'Head Office (HO-01)', gstin: '— (uses parent company GSTIN)', poc: 'Finance Team' }];
    }

    const EXISTING_PHONES = {
      '9999988888': 'Priya Mehta (TEC-045)',
      '8888877777': 'Rohit Kapoor (TEC-072)'
    };

    const EXISTING_PANS = {
      'ZZZZZ9999Z': 'Neha Patil (TEC-121)',
      'YYYYY8888Y': 'Suresh Kumar (TEC-033)',
      'XXXXX7777X': 'Divya Rao (TEC-056)'
    };

    const IFSC_LOOKUP = {
      'HDFC': { bank: 'HDFC Bank',            branch: 'Andheri East, Mumbai' },
      'ICIC': { bank: 'ICICI Bank',           branch: 'Connaught Place, Delhi' },
      'SBIN': { bank: 'State Bank of India',  branch: 'Fort, Mumbai' },
      'KKBK': { bank: 'Kotak Mahindra Bank',  branch: 'Bandra West, Mumbai' },
      'UTIB': { bank: 'Axis Bank',            branch: 'Nariman Point, Mumbai' },
      'PUNB': { bank: 'Punjab National Bank', branch: 'Chandni Chowk, Delhi' }
    };

    // Dummy employees with processed payroll (for DOJ / emp-type lock simulation)
    const PAYROLL_PROCESSED_EMPLOYEES = ['TEC-088', 'TEC-045'];

    // Form mode state
    let FORM_MODE = 'add'; // 'add' | 'edit-onboarding' | 'edit-active'
    let previousEmpType = '';
    let phoneDuplicateAccepted = false;
    let aadhaarRawValue = '';
    let blockingErrors = new Set();

    const ORIG_VALUES = {
      fullName: 'Aarav Sharma',
      phone: '9876543210',
      email: 'aarav.sharma@gmail.com',
      designation: 'Senior Developer'
    };

    // ════════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════════

    function showMsg(id, text, type) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.className = 'field-msg ' + type + ' show';
    }

    function hideMsg(id) {
      const el = document.getElementById(id);
      if (el) { el.className = 'field-msg'; el.textContent = ''; }
    }

    function clearMsg(msgId, fieldId) {
      hideMsg(msgId);
      const f = document.getElementById(fieldId);
      if (f) f.classList.remove('is-error', 'is-warn');
    }

    function setFieldState(fieldId, state) {
      const f = document.getElementById(fieldId);
      if (!f) return;
      f.classList.remove('is-error', 'is-warn');
      if (state === 'error') f.classList.add('is-error');
      if (state === 'warn')  f.classList.add('is-warn');
    }

    function addBlockingError(key) {
      blockingErrors.add(key);
      updateSaveButton();
    }

    function removeBlockingError(key) {
      blockingErrors.delete(key);
      updateSaveButton();
    }

    function updateSaveButton() {
      const btn = document.getElementById('save-btn');
      if (!btn) return;
      if (blockingErrors.size > 0) {
        btn.disabled = true;
        btn.title = 'Fix blocking errors before saving';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.disabled = false;
        btn.title = '';
        btn.style.opacity = '';
        btn.style.cursor = '';
      }

      // Update sidebar summary
      const card = document.getElementById('validation-summary-card');
      const list = document.getElementById('validation-summary-list');
      if (blockingErrors.size > 0) {
        card.style.display = 'block';
        list.innerHTML = [...blockingErrors].map(e => `<li>${e}</li>`).join('');
      } else {
        card.style.display = 'none';
        list.innerHTML = '';
      }
    }

    // ════════════════════════════════════════════════════════
    //  FORM MODE — detected automatically from URL params
    //  ?id=88&mode=edit-active      → Active employee (payroll processed) — salary/bank/DOJ locked
    //  ?id=88&mode=edit-onboarding  → Onboarding employee (no payroll yet) — salary/bank still editable
    //  ?id=88  (no mode)            → Defaults to edit-active (id present = existing employee)
    //  (no id, no mode)             → Add New Employee — everything editable
    // ════════════════════════════════════════════════════════

    function applyFormMode() {
      const params = new URLSearchParams(window.location.search);
      const empId     = params.get('id') || null;
      // If an employee id exists but no explicit mode was passed, treat as edit-active.
      // Only default to 'add' when there is genuinely no id in the URL.
      const modeParam = params.get('mode') || (empId ? 'edit-active' : 'add');
      FORM_MODE = modeParam;

      const isActive     = FORM_MODE === 'edit-active';
      const isAdd        = FORM_MODE === 'add';
      const isOnboarding = FORM_MODE === 'edit-onboarding';

      // ── Update page heading & title ──
      const pageTitle = document.getElementById('form-page-title');
      const pageSubtitle = document.getElementById('form-page-subtitle');
      if (isAdd) {
        document.title = 'Add New Employee - Tecla Payroll';
        if (pageTitle)    pageTitle.textContent = 'Add New Employee';
        if (pageSubtitle) pageSubtitle.textContent = 'Fill in all sections below to create a new employee record.';
      } else if (isActive) {
        document.title = 'Edit Employee (Active) - Tecla Payroll';
        if (pageTitle)    pageTitle.textContent = 'Edit Employee — Active';
        if (pageSubtitle) pageSubtitle.textContent = 'Salary, bank details and Date of Joining are locked. Use the dedicated flows to change those.';
      } else if (isOnboarding) {
        document.title = 'Edit Employee (Onboarding) - Tecla Payroll';
        if (pageTitle)    pageTitle.textContent = 'Edit Employee — Onboarding';
        if (pageSubtitle) pageSubtitle.textContent = 'Employee is in onboarding. Salary and bank details are still editable before first payroll run.';
      }

      // ── Employee Code ──
      const empCodeInput = document.getElementById('emp-code');
      const empCodeMsg   = document.getElementById('msg-emp-code');
      if (isAdd) {
        empCodeInput.value = 'TEC-089 (auto-assigned on save)';
        empCodeInput.readOnly = true;
        empCodeMsg.style.display = 'block';
        empCodeMsg.className = 'field-msg info show';
        empCodeMsg.textContent = '🔒 Auto-generated on save. Cannot be manually set.';
      } else {
        empCodeInput.value = empId ? 'TEC-' + empId.padStart(3, '0') : 'TEC-088';
        empCodeInput.readOnly = true;
        empCodeMsg.style.display = 'none';
      }

      // ── DOJ lock for active employees ──
      const dojInput = document.getElementById('doj');
      if (isActive && FORM_MODE === 'add') {
        dojInput.readOnly = true;
        dojInput.classList.add('read-only-field');
        showMsg('msg-doj', 'Cannot change Date of Joining after payroll has been processed for this employee.', 'error');
        addBlockingError('Date of Joining is locked — payroll already processed');
      } else {
        dojInput.readOnly = false;
        dojInput.classList.remove('read-only-field');
        hideMsg('msg-doj');
        removeBlockingError('Date of Joining is locked — payroll already processed');
      }

      // ── Edit Mode Section Removal & Footer Note ──
      const editFooter = document.getElementById('edit-footer-note');
      if (FORM_MODE !== 'add') {
        document.querySelectorAll('.hide-in-edit').forEach(el => el.style.display = 'none');
        if (editFooter) editFooter.style.display = 'block';
      } else {
        document.querySelectorAll('.hide-in-edit').forEach(el => el.style.display = '');
        if (editFooter) editFooter.style.display = 'none';
      }

      // ── Bank section ──
      const bankFields = document.getElementById('bank-fields-section');
      const bankLocked = document.getElementById('bank-locked-section');
      if (isActive) {
        bankFields.style.display = 'none';
        bankLocked.style.display = 'block';
      } else {
        bankFields.style.display = 'block';
        bankLocked.style.display = 'none';
      }

      // ── Salary section ──
      const salaryFields = document.getElementById('salary-fields-section');
      const salaryLocked = document.getElementById('salary-locked-msg');
      const salInputs    = salaryFields.querySelectorAll('input[type="number"]');
      if (isActive) {
        salaryLocked.style.display = 'block';
        salInputs.forEach(i => { i.readOnly = true; i.classList.add('read-only-field'); });
      } else {
        salaryLocked.style.display = 'none';
        salInputs.forEach(i => { i.readOnly = false; i.classList.remove('read-only-field'); });
      }

      onClientChange();
    }

    // ════════════════════════════════════════════════════════
    //  SECTION 1: PERSONAL DETAILS VALIDATION
    // ════════════════════════════════════════════════════════

    // Full Name — PAN mismatch warning & Document Proof Gate for Name Change
    function validateFullName() {
      const name = document.getElementById('emp-name').value.trim();
      const pan  = document.getElementById('pan').value.trim();
      hideMsg('msg-emp-name');
      setFieldState('emp-name', '');
      if (!name) return;

      if (FORM_MODE !== 'add' && name !== ORIG_VALUES.fullName) {
        document.getElementById('name-change-upload-container').style.display = 'block';
        const fileInput = document.getElementById('name-change-file');
        if (!fileInput.files || fileInput.files.length === 0) {
          addBlockingError('Name change requires supporting document upload');
        } else {
          removeBlockingError('Name change requires supporting document upload');
        }
      } else {
        document.getElementById('name-change-upload-container').style.display = 'none';
        removeBlockingError('Name change requires supporting document upload');
      }

      if (pan.length === 10) {
        showMsg('msg-emp-name',
          '⚠ Name mismatch with PAN — statutory filings may be rejected. Confirm before saving.',
          'warn');
        setFieldState('emp-name', 'warn');
      }
    }

    // DOB / Age at Joining
    function validateAgeAtJoining() {
      const dob = document.getElementById('dob').value;
      const doj = document.getElementById('doj').value;
      hideMsg('msg-dob');
      removeBlockingError('Employee must be at least 18 years old at joining date');
      setFieldState('dob', '');
      if (!dob || !doj) return;

      const dobDate = new Date(dob);
      const dojDate = new Date(doj);
      const ageMs   = dojDate - dobDate;
      const ageYrs  = ageMs / (1000 * 60 * 60 * 24 * 365.25);

      if (ageYrs < 18) {
        showMsg('msg-dob', '⛔ Employee must be at least 18 years old at the Date of Joining.', 'error');
        setFieldState('dob', 'error');
        addBlockingError('Employee must be at least 18 years old at joining date');
      } else if (ageYrs >= 58 && ageYrs <= 60) {
        showMsg('msg-dob',
          '⚠ PF continuation beyond age 58 requires explicit consent — confirm with employee.',
          'warn');
        setFieldState('dob', 'warn');
      }
    }

    // Personal Email
    function validatePersonalEmail() {
      const val = document.getElementById('personal-email').value.trim();
      hideMsg('msg-personal-email');
      document.getElementById('msg-personal-email-notice').style.display = 'none';
      removeBlockingError('Personal email is required and must be valid');
      setFieldState('personal-email', '');
      if (!val) {
        showMsg('msg-personal-email', '⛔ Personal email is required.', 'error');
        setFieldState('personal-email', 'error');
        addBlockingError('Personal email is required and must be valid');
        return;
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(val)) {
        showMsg('msg-personal-email', '⛔ Enter a valid email address.', 'error');
        setFieldState('personal-email', 'error');
        addBlockingError('Personal email is required and must be valid');
        return;
      }
      if (FORM_MODE !== 'add' && val !== ORIG_VALUES.email) {
        document.getElementById('msg-personal-email-notice').style.display = 'block';
      }
    }

    // Phone — 10 digit + duplicate check
    function validatePhone() {
      const val = document.getElementById('phone').value.trim();
      document.getElementById('phone-dup-choice').style.display = 'none';
      hideMsg('msg-phone');
      removeBlockingError('Phone number must be exactly 10 digits');
      setFieldState('phone', '');
      phoneDuplicateAccepted = false;

      if (!val) {
        showMsg('msg-phone', '⛔ Phone number is required.', 'error');
        setFieldState('phone', 'error');
        addBlockingError('Phone number must be exactly 10 digits');
        return;
      }
      if (!/^\d{10}$/.test(val)) {
        showMsg('msg-phone', '⛔ Phone number must be exactly 10 digits.', 'error');
        setFieldState('phone', 'error');
        addBlockingError('Phone number must be exactly 10 digits');
        return;
      }
      if (FORM_MODE !== 'add' && val === ORIG_VALUES.phone) {
        return;
      }
      if (EXISTING_PHONES[val]) {
        const existingName = EXISTING_PHONES[val];
        showMsg('msg-phone',
          `⚠ This number is already linked to ${existingName}. Continue anyway?`,
          'warn');
        setFieldState('phone', 'warn');
        document.getElementById('phone-dup-choice').style.display = 'flex';
      }
    }

    function acceptDuplicatePhone() {
      phoneDuplicateAccepted = true;
      document.getElementById('phone-dup-choice').style.display = 'none';
      showMsg('msg-phone', '✓ Acknowledged — duplicate number accepted.', 'info');
      setFieldState('phone', '');
    }

    function rejectDuplicatePhone() {
      document.getElementById('phone').value = ORIG_VALUES.phone;
      document.getElementById('phone-dup-choice').style.display = 'none';
      hideMsg('msg-phone');
      setFieldState('phone', '');
      validateEmergencyConflict();
    }

    // Emergency contact should differ from phone
    function validateEmergencyConflict() {
      const phone = document.getElementById('phone').value.trim();
      const emerg = document.getElementById('emergency-contact').value.trim();
      hideMsg('msg-emergency-contact');
      setFieldState('emergency-contact', '');
      if (phone && emerg && phone === emerg) {
        showMsg('msg-emergency-contact',
          '⚠ Emergency contact should not be the employee\'s own number.',
          'warn');
        setFieldState('emergency-contact', 'warn');
      }
    }

    function checkDesignationChange() {
      const val = document.getElementById('designation').value.trim();
      if (FORM_MODE !== 'add' && val !== ORIG_VALUES.designation) {
        localStorage.setItem('designation_changed_log', 'true');
      } else {
        localStorage.removeItem('designation_changed_log');
      }
    }

    function populateBranchDropdown(clientId) {
      const branchSelect = document.getElementById('emp-branch');
      const infoLine = document.getElementById('branch-info-line');
      
      branchSelect.innerHTML = '<option value="">— Select a branch —</option>';
      infoLine.style.display = 'none';
      infoLine.innerText = '';
      hideMsg('msg-emp-branch');
      setFieldState('emp-branch', '');
      removeBlockingError('Work Location / Branch is required');

      if (!clientId) {
        branchSelect.innerHTML = '<option value="">— Select a client first —</option>';
        branchSelect.disabled = true;
        return;
      }

      const branches = getClientBranches(clientId);
      branches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.code;
        opt.textContent = b.name;
        opt.dataset.gstin = b.gstin;
        opt.dataset.poc = b.poc;
        branchSelect.appendChild(opt);
      });
      branchSelect.disabled = false;
    }

    function onBranchChange() {
      const branchSelect = document.getElementById('emp-branch');
      const infoLine = document.getElementById('branch-info-line');
      
      validateBranch();
      
      if (!branchSelect.value) {
        infoLine.style.display = 'none';
      } else {
        const selectedOpt = branchSelect.options[branchSelect.selectedIndex];
        const gstin = selectedOpt.dataset.gstin;
        const poc = selectedOpt.dataset.poc;
        const name = selectedOpt.textContent.replace(/\s\([^)]+\)$/, '');
        
        infoLine.innerText = `Billing GSTIN: ${gstin} | Finance POC: ${poc} | Invoice raised to: ${name}`;
        infoLine.style.display = 'block';
      }
      
      updateStatutoryInheritance();
    }

    function validateBranch() {
      const val = document.getElementById('emp-branch').value;
      hideMsg('msg-emp-branch');
      removeBlockingError('Work Location / Branch is required');
      setFieldState('emp-branch', '');
      
      if (!val) {
        showMsg('msg-emp-branch', '⛔ Work Location / Branch is required.', 'error');
        setFieldState('emp-branch', 'error');
        addBlockingError('Work Location / Branch is required');
      }
    }


    // DOJ edit lock check
    function validateDoj() {
      if (FORM_MODE === 'edit-active') return; // already locked in switchFormMode
      validateAgeAtJoining();
    }

    // Employment type change with payroll history
    let pendingEmpTypeValue = '';
    function onEmpTypeChange() {
      const select = document.getElementById('emp-type');
      const hasPayrollHistory = (FORM_MODE === 'edit-active');
      if (hasPayrollHistory && previousEmpType && select.value !== previousEmpType) {
        pendingEmpTypeValue = select.value;
        select.value = previousEmpType; // revert until confirmed
        openModal('emp-type-modal');
      } else {
        previousEmpType = select.value;
        applyEmpTypeBehavior();
      }
    }

    function confirmEmpTypeChange() {
      const select = document.getElementById('emp-type');
      select.value = pendingEmpTypeValue;
      previousEmpType = pendingEmpTypeValue;
      closeModal('emp-type-modal');
      applyEmpTypeBehavior();
    }

    function cancelEmpTypeChange() {
      closeModal('emp-type-modal');
    }

    // Sync name with account holder on name change
    function syncNameFields() {
      // Silently update if account holder is empty or was identical
      const name = document.getElementById('emp-name').value.trim();
      const holder = document.getElementById('account-holder');
      if (holder && (!holder.value || holder.dataset.synced === 'true')) {
        holder.value = name;
        holder.dataset.synced = 'true';
        hideMsg('msg-account-holder');
      }
    }

    // ════════════════════════════════════════════════════════
    //  SECTION 2: BANK DETAILS VALIDATION
    // ════════════════════════════════════════════════════════

    function validateAccountMatch() {
      const a  = document.getElementById('account-no').value.trim();
      const b  = document.getElementById('account-no-confirm').value.trim();
      hideMsg('msg-account-no-confirm');
      removeBlockingError('Account numbers do not match');
      setFieldState('account-no', '');
      setFieldState('account-no-confirm', '');
      if (!a || !b) return;
      if (a !== b) {
        showMsg('msg-account-no-confirm', '⛔ Account numbers do not match.', 'error');
        setFieldState('account-no-confirm', 'error');
        setFieldState('account-no', 'error');
        addBlockingError('Account numbers do not match');
      }
    }

    function validateIFSC() {
      const val = document.getElementById('ifsc').value.trim().toUpperCase();
      hideMsg('msg-ifsc');
      removeBlockingError('IFSC code format is invalid');
      setFieldState('ifsc', '');
      if (!val) return;
      const ifscRe = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRe.test(val)) {
        showMsg('msg-ifsc', '⛔ IFSC must be 4 letters + 0 + 6 alphanumeric chars (e.g. HDFC0000060).', 'error');
        setFieldState('ifsc', 'error');
        addBlockingError('IFSC code format is invalid');
      }
    }

    function autoPopulateBank() {
      const val    = document.getElementById('ifsc').value.trim().toUpperCase();
      const prefix = val.slice(0, 4);
      const info   = IFSC_LOOKUP[prefix];
      if (info) {
        document.getElementById('bank-name-display').value  = info.bank;
        document.getElementById('bank-branch-display').value = info.branch;
        hideMsg('msg-ifsc');
        removeBlockingError('IFSC code format is invalid');
        setFieldState('ifsc', '');
      } else if (val.length >= 4) {
        document.getElementById('bank-name-display').value  = '';
        document.getElementById('bank-branch-display').value = '';
      }
      validateIFSC();
    }

    function validateAccountHolderName() {
      const name   = document.getElementById('emp-name').value.trim().toLowerCase();
      const holder = document.getElementById('account-holder').value.trim().toLowerCase();
      hideMsg('msg-account-holder');
      setFieldState('account-holder', '');
      if (!name || !holder) return;
      if (name !== holder) {
        showMsg('msg-account-holder',
          '⚠ Account holder name differs from employee name — confirm this is a joint/family account.',
          'warn');
        setFieldState('account-holder', 'warn');
        document.getElementById('account-holder').dataset.synced = 'false';
      }
    }

    // ════════════════════════════════════════════════════════
    //  SECTION 3: STATUTORY IDs VALIDATION
    // ════════════════════════════════════════════════════════

    function validatePAN() {
      const val = document.getElementById('pan').value.trim().toUpperCase();
      hideMsg('msg-pan');
      removeBlockingError('PAN is already registered to another employee');
      removeBlockingError('PAN format is invalid');
      setFieldState('pan', '');
      if (!val) return;

      const panRe = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      if (!panRe.test(val)) {
        showMsg('msg-pan', '⛔ Invalid PAN format. Must be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).', 'error');
        setFieldState('pan', 'error');
        addBlockingError('PAN format is invalid');
        return;
      }
      // Duplicate check
      if (EXISTING_PANS[val]) {
        showMsg('msg-pan',
          `⛔ This PAN is already registered to ${EXISTING_PANS[val]}. Cannot create duplicate record.`,
          'error');
        setFieldState('pan', 'error');
        addBlockingError('PAN is already registered to another employee');
        return;
      }
      // Show name check if name is present
      validateFullName();
    }

    // Aadhaar: show raw on focus, mask on blur
    function showAadhaarClear() {
      const input   = document.getElementById('aadhaar');
      const masked  = document.getElementById('aadhaar-masked');
      if (aadhaarRawValue) {
        input.value = aadhaarRawValue;
        input.type  = 'text';
      }
      masked.style.display = 'none';
    }

    function maskAadhaar() {
      const input  = document.getElementById('aadhaar');
      const masked = document.getElementById('aadhaar-masked');
      const val    = input.value.replace(/\D/g, '');
      hideMsg('msg-aadhaar');
      removeBlockingError('Aadhaar must be 12 digits');
      setFieldState('aadhaar', '');

      if (!val) {
        masked.style.display = 'none';
        return;
      }
      if (val.length !== 12) {
        showMsg('msg-aadhaar', '⛔ Aadhaar must be exactly 12 digits.', 'error');
        setFieldState('aadhaar', 'error');
        addBlockingError('Aadhaar must be 12 digits');
        return;
      }
      aadhaarRawValue  = val;
      input.value      = '';
      input.placeholder = 'Click to reveal/edit';
      const last4      = val.slice(-4);
      masked.textContent = `••••••••${last4}`;
      masked.style.display = 'block';
    }

    // UAN mode toggle
    function onUanModeChange() {
      const mode    = document.querySelector('input[name="uan-mode"]:checked').value;
      const uanInput = document.getElementById('uan');
      hideMsg('msg-uan');
      if (mode === 'new') {
        uanInput.value = '';
        uanInput.disabled = true;
        uanInput.classList.add('read-only-field');
        showMsg('msg-uan',
          '⚡ If this employee may have had PF at a past employer under a different UAN, duplicate UANs require manual EPFO merge — this cannot be auto-detected.',
          'warn');
      } else {
        uanInput.disabled = false;
        uanInput.classList.remove('read-only-field');
        hideMsg('msg-uan');
      }
    }

    // ════════════════════════════════════════════════════════
    //  SECTION 4: SALARY STRUCTURE VALIDATION
    // ════════════════════════════════════════════════════════

    function calculateGross() {
      const basic      = parseFloat(document.getElementById('basic-sal').value)      || 0;
      const hra        = parseFloat(document.getElementById('hra-sal').value)        || 0;
      const conveyance = parseFloat(document.getElementById('conveyance-sal').value) || 0;
      const da         = parseFloat(document.getElementById('da-sal').value)         || 0;
      const medical    = parseFloat(document.getElementById('medical-sal').value)    || 0;
      const special    = parseFloat(document.getElementById('special-sal').value)    || 0;
      const other      = parseFloat(document.getElementById('other-sal').value)      || 0;
      const arrears    = parseFloat(document.getElementById('arrears-sal').value)    || 0;
      const gross      = basic + hra + conveyance + da + medical + special + other + arrears;

      document.getElementById('gross-display').innerText = '₹' + gross.toLocaleString('en-IN');

      // ESI threshold check
      const clientId   = document.getElementById('client-partner').value;
      const defaults   = window.CLIENT_STATUTORY_DEFAULTS && window.CLIENT_STATUTORY_DEFAULTS[clientId];
      const esiLimit   = defaults ? defaults.esiLimit : 21000;
      const periodEndStr = defaults ? defaults.esiContributionPeriodEnd : '2026-09-30';
      const periodEnd  = new Date(periodEndStr);
      const today      = new Date();

      const esiToggle  = document.getElementById('esi-toggle');
      const esiWarning = document.getElementById('esi-warning');
      const esiTag     = document.getElementById('esi-tag');

      // ESI Act rule: contribution continues through the end of the current period once enrolled, even if salary later exceeds the threshold — do not instantly disable.
      if (gross > esiLimit) {
        const wasAlreadyEnrolled = (FORM_MODE !== 'add' && esiToggle.checked);
        
        if (wasAlreadyEnrolled && today < periodEnd) {
          esiToggle.disabled = false;
          esiWarning.style.display = 'block';
          esiWarning.className = 'badge badge-gold';
          esiWarning.innerText = `ℹ Gross salary now exceeds ESI threshold (₹${esiLimit.toLocaleString('en-IN')}). ESI contribution continues until the end of the current period (${periodEndStr}), then will auto-stop for the next period.`;
          esiTag.className  = 'badge badge-gold';
          esiTag.innerText  = 'Active — Transitioning';
        } else {
          esiToggle.checked  = false;
          esiToggle.disabled = true;
          esiWarning.style.display = 'block';
          esiWarning.className = 'badge badge-danger';
          esiWarning.innerText = `⚠ Gross salary exceeds ESI threshold (₹${esiLimit.toLocaleString('en-IN')}) — ESI does not apply.`;
          esiTag.className  = 'badge badge-neutral';
          esiTag.innerText  = 'Disabled';
        }
      } else {
        esiToggle.disabled = false;
        esiWarning.style.display = 'none';
        if (esiTag.innerText === 'Disabled' || esiTag.innerText.includes('Transitioning')) {
          updateStatutoryInheritance();
        }
      }

      // ESI number visibility
      const esiNoGroup = document.getElementById('esi-no-group');
      if (esiNoGroup) {
        esiNoGroup.style.display = esiToggle.checked ? 'block' : 'none';
      }

      validateBasicPct();
      checkTdsThreshold();
    }

    function validateBasicPct() {
      const basic      = parseFloat(document.getElementById('basic-sal').value)      || 0;
      const hra        = parseFloat(document.getElementById('hra-sal').value)        || 0;
      const conveyance = parseFloat(document.getElementById('conveyance-sal').value) || 0;
      const da         = parseFloat(document.getElementById('da-sal').value)         || 0;
      const medical    = parseFloat(document.getElementById('medical-sal').value)    || 0;
      const special    = parseFloat(document.getElementById('special-sal').value)    || 0;
      const other      = parseFloat(document.getElementById('other-sal').value)      || 0;
      const arrears    = parseFloat(document.getElementById('arrears-sal').value)    || 0;
      const gross      = basic + hra + conveyance + da + medical + special + other + arrears;
      hideMsg('msg-basic-sal');
      removeBlockingError('Basic Pay must be at least 50% of CTC');
      setFieldState('basic-sal', '');
      if (gross === 0) return;
      const pct = (basic / gross) * 100;
      if (pct < 50) {
        showMsg('msg-basic-sal',
          `⛔ Basic Pay (₹${basic.toLocaleString('en-IN')}) is ${pct.toFixed(1)}% of CTC — must be at least 50% as per current wage code rules. Adjust the structure.`,
          'error');
        setFieldState('basic-sal', 'error');
        addBlockingError('Basic Pay must be at least 50% of CTC');
      }
    }

    // ════════════════════════════════════════════════════════
    //  SECTION 5: STATUTORY APPLICABILITY
    // ════════════════════════════════════════════════════════

    function onPfToggleChange() {
      const pfOn     = document.getElementById('pf-toggle').checked;
      const uanMode  = document.querySelector('input[name="uan-mode"]:checked')?.value;
      const basic    = parseFloat(document.getElementById('basic-sal').value) || 0;
      const hasPriorUan = (uanMode === 'prior' && document.getElementById('uan').value.trim().length > 5);

      hideMsg('msg-pf');
      removeBlockingError('PF cannot be discontinued — employee has existing UAN');
      markOverride('pf');

      if (pfOn && basic > 15000 && !hasPriorUan) {
        showMsg('msg-pf',
          '⚠ This employee qualifies as an "Excluded Employee" under PF rules (Basic > ₹15,000, no prior PF history). Confirm mutual consent for voluntary PF coverage.',
          'warn');
      } else if (!pfOn && hasPriorUan) {
        showMsg('msg-pf',
          '⛔ Employee has an existing UAN from previous employment — PF cannot be discontinued without a formal EPFO exit process (Form 11). This toggle does not legally exempt the employee.',
          'error');
        addBlockingError('PF cannot be discontinued — employee has existing UAN');
      }
    }

    function onEsiToggleChange() {
      markOverride('esi');
      const esiNoGroup = document.getElementById('esi-no-group');
      const esiOn = document.getElementById('esi-toggle').checked;
      if (esiNoGroup) {
        esiNoGroup.style.display = esiOn ? 'block' : 'none';
      }
    }

    function onTdsToggleChange() {
      const tdsOn = document.getElementById('tds-toggle').checked;
      document.getElementById('tds-sub-fields').style.display = tdsOn ? 'block' : 'none';
      const tdsTag = document.getElementById('tds-tag');
      if (tdsOn) {
        tdsTag.innerText  = 'Overridden (TDS Custom)';
        tdsTag.className  = 'badge badge-gold';
      } else {
        tdsTag.innerText  = 'Inherited (Off)';
        tdsTag.className  = 'badge badge-neutral';
      }
      markOverride('tds');
      checkTdsThreshold();
    }

    function checkTdsThreshold() {
      const tdsOn      = document.getElementById('tds-toggle').checked;
      const basic      = parseFloat(document.getElementById('basic-sal').value)      || 0;
      const hra        = parseFloat(document.getElementById('hra-sal').value)        || 0;
      const conveyance = parseFloat(document.getElementById('conveyance-sal').value) || 0;
      const da         = parseFloat(document.getElementById('da-sal').value)         || 0;
      const medical    = parseFloat(document.getElementById('medical-sal').value)    || 0;
      const special    = parseFloat(document.getElementById('special-sal').value)    || 0;
      const other      = parseFloat(document.getElementById('other-sal').value)      || 0;
      const arrears    = parseFloat(document.getElementById('arrears-sal').value)    || 0;
      const annual     = (basic + hra + conveyance + da + medical + special + other + arrears) * 12;

      hideMsg('msg-tds');
      if (!tdsOn && annual > 400000) {
        showMsg('msg-tds',
          `⚠ Projected annual income (₹${annual.toLocaleString('en-IN')}) exceeds the tax-free threshold — disabling TDS may result in non-compliance. Confirm this is intentional.`,
          'warn');
      }
    }

    // Helper to safely set UI element from defaults without triggering override if inherited
    function setInheritedUI(toggleId, tagId, value) {
      const el = document.getElementById(toggleId);
      const tag = document.getElementById(tagId);
      if (!el || !tag) return;
      
      // We only apply inheritance if this field hasn't been manually overridden yet
      if (tag.innerText.includes('Overridden')) return;

      if (el.type === 'checkbox') {
        if (!el.disabled) {
          el.checked = value;
          tag.innerText = 'Inherited' + (value ? ' (On)' : ' (Off)');
          tag.className = 'badge badge-neutral';
        }
      } else {
        el.value = value;
        tag.innerText = 'Inherited';
        tag.className = 'badge badge-neutral';
      }
    }

    function syncClientDefaultsFromStorage() {
      var saved = JSON.parse(localStorage.getItem('tecla_clients') || '[]');
      if (!saved.length) return;
      saved.forEach(function(client) {
        // Match by code first (strip non-alpha, lowercase), then fall back to name
        var key = null;
        var codeKey = client.code ? client.code.toLowerCase().replace(/[^a-z]/g, '') : null;
        if (codeKey && window.CLIENT_STATUTORY_DEFAULTS[codeKey]) {
          key = codeKey;
        } else {
          key = Object.keys(window.CLIENT_STATUTORY_DEFAULTS).find(function(k) {
            return window.CLIENT_STATUTORY_DEFAULTS[k].name === client.name;
          });
        }
        if (!key) return;
        var d = window.CLIENT_STATUTORY_DEFAULTS[key];
        var FIELDS = ['pfApplicable','esiApplicable','esiLimit',
                      'esiContributionPeriodEnd','ptApplicable','lwfApplicable',
                      'lwfFrequency','tdsRegime','gratuityMode',
                      'statutoryBonusApplicable','bonusRate','lopBasis'];
        FIELDS.forEach(function(f) {
          if (client[f] !== undefined) d[f] = client[f];
        });
      });
    }

    function onClientChange() {
      const clientId = document.getElementById('client-partner').value;
      const defaults = window.CLIENT_STATUTORY_DEFAULTS && window.CLIENT_STATUTORY_DEFAULTS[clientId];
      
      const empTypeSelect = document.getElementById('emp-type');
      if (empTypeSelect && defaults) {
        Array.from(empTypeSelect.options).forEach(opt => {
          if (opt.value === 'internal') {
             opt.disabled = false;
             opt.style.display = '';
          } else if (defaults.contractType === 'agency_payroll') {
             opt.disabled = (opt.value !== 'contract');
             opt.style.display = (opt.value !== 'contract') ? 'none' : '';
          } else if (defaults.contractType === 'eor') {
             opt.disabled = (opt.value !== 'eor');
             opt.style.display = (opt.value !== 'eor') ? 'none' : '';
          } else if (defaults.contractType === 'hybrid') {
             opt.disabled = false;
             opt.style.display = '';
          }
        });
        
        if (defaults.contractType === 'agency_payroll') {
          empTypeSelect.value = 'contract';
        } else if (defaults.contractType === 'eor') {
          empTypeSelect.value = 'eor';
        } else if (empTypeSelect.options[empTypeSelect.selectedIndex].disabled) {
          empTypeSelect.value = 'eor';
        }
        previousEmpType = empTypeSelect.value;
      }

      populateBranchDropdown(clientId);
      updateStatutoryInheritance();
      calculateGross();
      applyEmpTypeBehavior();
    }

    function applyEmpTypeBehavior() {
      const empType = document.getElementById('emp-type').value;
      const banner = document.getElementById('emp-type-banner');
      const clientSelect = document.getElementById('client-partner');
      const clientId = clientSelect.value;
      const defaults = window.CLIENT_STATUTORY_DEFAULTS && window.CLIENT_STATUTORY_DEFAULTS[clientId];
      const clientName = defaults ? defaults.name : 'Client';

      if (!banner) return;

      if (empType === 'eor') {
        banner.style.display = 'block';
        banner.innerText = `PF, ESI, and PT contributions are filed under ${clientName}'s statutory registration, not the agency's. Agency handles payroll processing and disbursement only.`;
        clientSelect.disabled = false;
      } else if (empType === 'contract') {
        banner.style.display = 'block';
        banner.innerText = `PF, ESI, and PT contributions are filed under Tecla Media's own statutory registration (UAN/ESIC numbers issued under agency registration).`;
        clientSelect.disabled = false;
      } else if (empType === 'internal') {
        banner.style.display = 'block';
        banner.innerText = `This employee is agency staff, not a client-deployed candidate — excluded from client billing/invoicing.`;
        clientSelect.disabled = true;
        localStorage.setItem('internal_staff_flag', 'true');
      }

      if (empType !== 'internal') {
        localStorage.removeItem('internal_staff_flag');
      }
    }

    function updateStatutoryInheritance() {
      const clientId = document.getElementById('client-partner').value;
      const defaults = window.CLIENT_STATUTORY_DEFAULTS && window.CLIENT_STATUTORY_DEFAULTS[clientId];
      
      const sourceLine = document.getElementById('inheritance-source-line');
      if (defaults && sourceLine) {
        let today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const branchSelect = document.getElementById('emp-branch');
        let branchName = '';
        if (branchSelect && branchSelect.value) {
          branchName = ' — ' + branchSelect.options[branchSelect.selectedIndex].textContent.replace(/\s\([^)]+\)$/, '');
        }
        sourceLine.innerText = `Defaults inherited from client: ${defaults.name}${branchName} — last configured ${today}.`;
        
        setInheritedUI('pf-toggle', 'pf-tag', defaults.pfApplicable);
        setInheritedUI('esi-toggle', 'esi-tag', defaults.esiApplicable);
        setInheritedUI('pt-toggle', 'pt-tag', defaults.ptApplicable);
        setInheritedUI('lwf-toggle', 'lwf-tag', defaults.lwfApplicable);
        setInheritedUI('tax-regime', 'tds-tag', defaults.tdsRegime);
        setInheritedUI('gratuity-select', 'gratuity-tag', defaults.gratuityMode);
        setInheritedUI('bonus-toggle', 'bonus-tag', defaults.statutoryBonusApplicable);
        setInheritedUI('lop-select', 'lop-tag', defaults.lopBasis);
      }

      // Update ESI number visibility
      const esiToggle = document.getElementById('esi-toggle');
      const esiNoGroup = document.getElementById('esi-no-group');
      if (esiNoGroup && esiToggle) {
        esiNoGroup.style.display = esiToggle.checked ? 'block' : 'none';
      }

      runEmployeeLevelLegalChecks();
    }

    function runEmployeeLevelLegalChecks() {
      // 1. PF Prior UAN Rule
      const pfToggle   = document.getElementById('pf-toggle');
      const uanMode    = document.querySelector('input[name="uan-mode"]:checked')?.value;
      const hasPriorUan= (uanMode === 'prior' && document.getElementById('uan').value.trim().length > 5);
      
      hideMsg('msg-pf');
      removeBlockingError('PF cannot be discontinued — employee has existing UAN');
      
      if (!pfToggle.checked && hasPriorUan) {
        showMsg('msg-pf',
          '⛔ Employee has an existing UAN from previous employment — PF cannot be discontinued without a formal EPFO exit process (Form 11). This toggle does not legally exempt the employee.',
          'error');
        addBlockingError('PF cannot be discontinued — employee has existing UAN');
      }

      // 2. ESI Limit Rule (calculateGross already handles this, we just invoke it to ensure it runs *after* inheritance sets defaults)
      // We don't want infinite loops, so calculateGross calls updateStatutoryInheritance. Wait, calculateGross calls updateStatutoryInheritance?
      // If calculateGross calls updateStatutoryInheritance, then calling calculateGross here would loop.
    }

    function markOverride(type) {
      const tag = document.getElementById(type + '-tag');
      if (tag) {
        tag.innerText = 'Overridden';
        tag.className = 'badge badge-gold';
      }
    }

    function applyRegimeSuggestion() {
      document.getElementById('tax-regime').value = 'new';
      const name = document.getElementById('emp-name').value || 'this employee';
      alert('Applied: New Tax Regime has been configured for ' + name + '.');
    }

    // ════════════════════════════════════════════════════════
    //  FORM SUBMIT
    // ════════════════════════════════════════════════════════

    function handleFormSubmit(e) {
      e.preventDefault();
      // Run all validations on submit
      validatePersonalEmail();
      validatePhone();
      validatePAN();
      validateAccountMatch();
      validateIFSC();
      validateBasicPct();
      validateAgeAtJoining();
      validateBranch();

      if (blockingErrors.size > 0) {
        document.getElementById('validation-summary-card').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      window.location.href = 'candidates-list.html';
    }

    // ════════════════════════════════════════════════════════
    //  INIT
    // ════════════════════════════════════════════════════════

    (function __initPage() {
      // Store initial emp type for change detection
      previousEmpType = document.getElementById('emp-type').value;

      // Sync saved client statutory settings from localStorage into CLIENT_STATUTORY_DEFAULTS
      // so that edits made in client-form.html are reflected here immediately.
      syncClientDefaultsFromStorage();

      // Apply mode from URL — must run before calculateGross/tds
      applyFormMode();
      onTdsToggleChange();

      // Initialize Aadhaar masked display
      aadhaarRawValue = '123456789012';
      document.getElementById('aadhaar').value = '';
      document.getElementById('aadhaar').placeholder = 'Click to reveal/edit';
      document.getElementById('aadhaar-masked').textContent = '••••••••9012';
      document.getElementById('aadhaar-masked').style.display = 'block';

      // Sync account holder name initially
      document.getElementById('account-holder').dataset.synced = 'true';

      // Initialize branch dropdown
      const initialClient = document.getElementById('client-partner').value;
      if (initialClient) {
        populateBranchDropdown(initialClient);
      }
    })();
  


// Re-injected Tab Logic from legacy global script
function setupTabs() {
  const tabContainers = document.querySelectorAll(".tab-container");
  tabContainers.forEach(container => {
    const headers = container.querySelectorAll(".tab-headers li");
    const contents = container.querySelectorAll(".tab-content");

    headers.forEach(header => {
      header.addEventListener("click", () => {
        const targetTab = header.getAttribute("data-tab");
        
        headers.forEach(h => h.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));

        header.classList.add("active");
        const targetContent = container.querySelector('.tab-content[data-tab="' + targetTab + '"]');
        if (targetContent) {
          targetContent.classList.add("active");
        }
      });
    });
  });
}
// Execute it dynamically on load
setTimeout(setupTabs, 100);
