// Auto-extracted logic for ClientForm

// Expose functions globally for React inline handlers
window.addStateRegistration = addStateRegistration;
window.validateGSTIN = validateGSTIN;
window.validatePAN = validatePAN;
window.validateTAN = validateTAN;
window.validateCIN = validateCIN;
window.validatePIN = validatePIN;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.validateContractDates = validateContractDates;
window.autoGenerateCode = autoGenerateCode;
window.toggleBillingAddress = toggleBillingAddress;
window.syncBillingState = syncBillingState;
window.handleBillingModelChange = handleBillingModelChange;
window.handleContractTypeChange = handleContractTypeChange;
window.togglePortalFields = togglePortalFields;
window.triggerDocUpload = triggerDocUpload;
window.handleFileDrop = handleFileDrop;
window.handleFileSelect = handleFileSelect;
window.processFiles = processFiles;
window.renderDocItem = renderDocItem;
window.updateDocType = updateDocType;
window.removeDoc = removeDoc;
window.updateDocChecklist = updateDocChecklist;
window.refreshDocChecklist = refreshDocChecklist;
window.markProgress = markProgress;
window.updateOnboardingChecklist = updateOnboardingChecklist;
window.showToast = showToast;
window.checkIncorporation = checkIncorporation;
window.handleIndustryChange = handleIndustryChange;
window.toggleGroupCompany = toggleGroupCompany;
window.handleCompanyType = handleCompanyType;
window.checkGSTINDuplicate = checkGSTINDuplicate;
window.crossCheckPANGSTIN = crossCheckPANGSTIN;
window.handleCountryChange = handleCountryChange;
window.autofillFromPIN = autofillFromPIN;
window.toggleBranches = toggleBranches;
window.addBranchRow = addBranchRow;
window.removeBranchRow = removeBranchRow;
window.addExtraContact = addExtraContact;
window.removeExtraContact = removeExtraContact;
window.checkContactEmailDuplicate = checkContactEmailDuplicate;
window.togglePOFields = togglePOFields;
window.handleGSTRateChange = handleGSTRateChange;
window.handleTDSChange = handleTDSChange;
window.handlePFCeiling = handlePFCeiling;
window.handleESILimit = handleESILimit;
window.saveMSAExpiry = saveMSAExpiry;
window.checkDocExpiry = checkDocExpiry;
window.markDocVerified = markDocVerified;
window.handleAccessLevel = handleAccessLevel;
window.handleLogoSelect = handleLogoSelect;
window.handlePayrollConvention = handlePayrollConvention;
window.toggleReminderInfo = toggleReminderInfo;
window.updateInvoiceDuePreview = updateInvoiceDuePreview;
window.getClientCode = getClientCode;
window.validateStatusTransition = validateStatusTransition;
window.updateBackupAMOptions = updateBackupAMOptions;
window.getFormPayload = getFormPayload;
window.populateForm = populateForm;
window.saveDraft = saveDraft;
window.submitForm = submitForm;
window.goToStep = goToStep;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showStep = showStep;
window.validateStep = validateStep;
window.addClientBranch = addClientBranch;
window.updateRemoveButtons = updateRemoveButtons;
window.removeClientBranch = removeClientBranch;
window.handlePrimaryBranchChange = handlePrimaryBranchChange;
window.updateBranchCode = updateBranchCode;
window.validateBranchGSTIN = validateBranchGSTIN;
window.checkAllBranchesGSTIN = checkAllBranchesGSTIN;


              function addStateRegistration() {
                const container = document.getElementById('state-registrations-container');
                const row = document.createElement('div');
                row.className = 'form-row';
                row.style.cssText = 'background:#FAFBFC; padding:0.75rem; border:1px solid var(--border-color); border-radius:var(--radius-md); align-items:center;';
                row.innerHTML = `
                  <div class="form-group" style="margin-bottom:0; flex:1;">
                    <label style="font-size:0.75rem;">State</label>
                    <select class="form-control" style="font-size:0.8rem; padding:0.25rem;">
                      <option value="">--Select--</option>
                      <option value="MH">Maharashtra</option>
                      <option value="KA">Karnataka</option>
                      <option value="DL">Delhi</option>
                      <option value="TN">Tamil Nadu</option>
                      <option value="TS">Telangana</option>
                      <option value="WB">West Bengal</option>
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom:0; flex:1.5;">
                    <label style="font-size:0.75rem;">PT Registration No.</label>
                    <input type="text" class="form-control" style="font-size:0.8rem; padding:0.25rem;" placeholder="PT EC/RC number">
                  </div>
                  <div class="form-group" style="margin-bottom:0; flex:1.5;">
                    <label style="font-size:0.75rem;">LWF Registration No.</label>
                    <input type="text" class="form-control" style="font-size:0.8rem; padding:0.25rem;" placeholder="LWF Est. code">
                  </div>
                  <button type="button" class="btn" style="background:none; border:none; color:var(--status-danger); cursor:pointer; padding:0 0.5rem;" onclick="this.parentElement.remove()" title="Remove">🗑️</button>
                `;
                container.appendChild(row);
              }
            


    // ══════════════════════════════════════════
    //  CLIENT FORM — COMPLETE LOGIC ENGINE
    // ══════════════════════════════════════════

    const uploadedDocs = [];
    let sectionProgress = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };

    // ── GSTIN Validator ──────────────────────
    function validateGSTIN(input) {
      const val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      input.value = val;
      const hint = document.getElementById('gstin-hint');
      // Format: 2 digits + 5 alpha + 4 digits + 1 alpha + 1 alpha/digit + Z + 1 alphanumeric
      const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (val.length === 0) {
        input.className = 'form-control';
        hint.textContent = '15-character alphanumeric GST Identification Number.';
        hint.className = 'field-hint';
      } else if (val.length < 15) {
        input.className = 'form-control';
        hint.textContent = `${val.length}/15 characters entered.`;
        hint.className = 'field-hint';
      } else if (pattern.test(val)) {
        input.className = 'form-control valid';
        hint.textContent = '✓ Valid GSTIN format. State code: ' + val.substring(0, 2);
        hint.className = 'field-hint success';
        markProgress(1);
      } else {
        input.className = 'form-control invalid';
        hint.textContent = '✗ Invalid GSTIN format. Example: 27AAACM1234A1Z1';
        hint.className = 'field-hint error';
      }
    }

    // ── PAN Validator ────────────────────────
    function validatePAN(input) {
      const val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      input.value = val;
      const hint = document.getElementById('pan-hint');
      const pattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (val.length === 0) {
        input.className = 'form-control';
        hint.textContent = '10-character PAN as per Income Tax.';
        hint.className = 'field-hint';
      } else if (pattern.test(val)) {
        input.className = 'form-control valid';
        hint.textContent = '✓ Valid PAN format.';
        hint.className = 'field-hint success';
      } else if (val.length <= 10) {
        input.className = 'form-control';
        hint.textContent = `${val.length}/10 — Format: AAAAA9999A`;
        hint.className = 'field-hint';
      } else {
        input.className = 'form-control invalid';
        hint.textContent = '✗ Invalid PAN. Must be 10 chars: 5 alpha + 4 digits + 1 alpha.';
        hint.className = 'field-hint error';
      }
    }

    // ── TAN Validator ────────────────────────
    function validateTAN(input) {
      const val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      input.value = val;
      const hint = document.getElementById('tan-hint');
      const pattern = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
      if (val.length > 0 && val.length === 10) {
        if (pattern.test(val)) {
          input.className = 'form-control valid';
          hint.textContent = '✓ Valid TAN format.';
          hint.className = 'field-hint success';
        } else {
          input.className = 'form-control invalid';
          hint.textContent = '✗ Invalid TAN. Format: MUMD12345A (4 alpha + 5 digits + 1 alpha)';
          hint.className = 'field-hint error';
        }
      } else {
        input.className = 'form-control';
        hint.textContent = 'Required for TDS deduction filing.';
        hint.className = 'field-hint';
      }
    }

    // ── CIN Validator ────────────────────────
    function validateCIN(input) {
      const val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      input.value = val;
      const hint = document.getElementById('cin-hint');
      if (val.length > 0 && val.length < 21) {
        hint.textContent = `${val.length}/21 characters.`;
        hint.className = 'field-hint';
        input.className = 'form-control';
      } else if (val.length === 21) {
        input.className = 'form-control valid';
        hint.textContent = '✓ CIN length valid.';
        hint.className = 'field-hint success';
      } else {
        input.className = 'form-control';
        hint.textContent = '21-character Corporate Identity Number from MCA.';
        hint.className = 'field-hint';
      }
    }

    // ── PIN Code Validator ───────────────────
    function validatePIN(input) {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val;
      if (val.length === 6 && val !== '000000') {
        input.className = 'form-control valid';
      } else if (val.length > 0) {
        input.className = 'form-control';
      }
    }

    // ── Email Validator ──────────────────────
    function validateEmail(input) {
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (input.value && !pattern.test(input.value)) {
        input.className = 'form-control invalid';
      } else if (pattern.test(input.value)) {
        input.className = 'form-control valid';
        markProgress(3);
      } else {
        input.className = 'form-control';
      }
    }

    // ── Phone Validator ──────────────────────
    function validatePhone(input) {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val;
      if (val.length === 10 && ['6', '7', '8', '9'].includes(val[0])) {
        input.className = 'form-control valid';
      } else if (val.length > 0) {
        input.className = 'form-control';
      }
    }

    // ── Contract Date Validation ─────────────
    function validateContractDates() {
      const start = document.getElementById('contract-start').value;
      const end = document.getElementById('contract-end').value;
      const hint = document.getElementById('contract-end-hint');
      if (start && end && end <= start) {
        document.getElementById('contract-end').className = 'form-control invalid';
        hint.textContent = '✗ End date must be after start date.';
        hint.className = 'field-hint error';
      } else if (end) {
        document.getElementById('contract-end').className = 'form-control valid';
        const days = Math.round((new Date(end) - new Date(start)) / 86400000);
        hint.textContent = `✓ Contract duration: ${days} days`;
        hint.className = 'field-hint success';
        markProgress(4);
      } else {
        document.getElementById('contract-end').className = 'form-control';
        hint.textContent = 'Leave blank for open-ended contracts.';
        hint.className = 'field-hint';
      }
    }

    // ── Auto-generate Client Code ────────────
    function autoGenerateCode() {
      const name = document.getElementById('company-name').value;
      if (!name) { showToast('⚠️ Enter company name first'); return; }
      const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
      const num = Math.floor(Math.random() * 900) + 100;
      document.getElementById('client-code').value = `${prefix}-${num}`;
      document.getElementById('client-code').className = 'form-control valid';
    }

    // ── Billing Address Toggle ───────────────
    function toggleBillingAddress(checkbox) {
      document.getElementById('billing-address-section').style.display = checkbox.checked ? 'none' : 'block';
    }

    // ── Sync billing state from registered state
    function syncBillingState() {
      if (document.getElementById('same-as-registered').checked) return;
      const state = document.getElementById('reg-state').value;
      const billState = document.getElementById('bill-state');
      for (let opt of billState.options) {
        if (opt.value === state || opt.text === state) { opt.selected = true; break; }
      }
    }

    // ── Billing Model: Show/Hide Conditional Fields ──
    function handleBillingModelChange(select) {
      const val = select.value;
      document.getElementById('billing-markup-fields').classList.toggle('hidden', val !== 'markup');
      document.getElementById('billing-fixed-candidate-fields').classList.toggle('hidden', val !== 'fixed_per_candidate');
      document.getElementById('billing-fixed-monthly-fields').classList.toggle('hidden', val !== 'fixed_per_month');
      document.getElementById('billing-hourly-fields').classList.toggle('hidden', val !== 'hourly');
      if (val) markProgress(4);
    }

    // ── Contract Type Change ─────────────────
    function handleContractTypeChange(select) {
      if (select.value) markProgress(4);
    }

    // ── Portal Fields Toggle ─────────────────
    function togglePortalFields(checkbox) {
      document.getElementById('portal-fields').style.display = checkbox.checked ? 'block' : 'none';
    }

    // ── Document Type Upload Trigger ─────────
    function triggerDocUpload(type) {
      document.getElementById('pending-doc-type').value = type;
      document.getElementById('file-input').click();
    }

    // ── File Drop Handler ────────────────────
    function handleFileDrop(event) {
      event.preventDefault();
      document.getElementById('upload-zone').classList.remove('dragover');
      const files = event.dataTransfer.files;
      processFiles(files, document.getElementById('pending-doc-type').value);
    }

    function handleFileSelect(event) {
      processFiles(event.target.files, document.getElementById('pending-doc-type').value);
      event.target.value = '';
    }

    function processFiles(files, docType) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const maxSize = 10 * 1024 * 1024; // 10 MB

      for (let file of files) {
        if (!allowedTypes.includes(file.type)) {
          showToast(`❌ ${file.name}: Only PDF, JPG, PNG, XLSX allowed`);
          continue;
        }
        if (file.size > maxSize) {
          showToast(`❌ ${file.name}: File exceeds 10 MB limit`);
          continue;
        }

        const docId = Date.now() + Math.random();
        const doc = { id: docId, name: file.name, size: file.size, type: docType, file: file };
        uploadedDocs.push(doc);
        renderDocItem(doc);
        updateDocChecklist(docType);
        showToast(`✅ ${file.name} uploaded successfully`);
        markProgress(6);
      }
    }

    const docTypeLabels = {
      'agent_client_agreement': 'Agent & Client Agreement', 'msa': 'Master Service Agreement', 'nda': 'NDA',
      'work_order': 'Work Order', 'gst_cert': 'GST Certificate',
      'pan_card': 'PAN Card', 'tan_doc': 'TAN Allotment Letter', 'other': 'Other Document'
    };
    const docTypeIcons = { 'agent_client_agreement': '🤝', 'msa': '📜', 'nda': '🔒', 'work_order': '📋', 'gst_cert': '🏛️', 'pan_card': '💳', 'tan_doc': '📄', 'other': '📎' };

    function renderDocItem(doc) {
      const list = document.getElementById('doc-list');
      const item = document.createElement('div');
      item.className = 'doc-item';
      item.id = `doc-${doc.id}`;
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      item.style.gap = '0.5rem';
      const sizeMB = (doc.size / 1024).toFixed(1);
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem; width: 100%;">
          <span class="doc-icon">${docTypeIcons[doc.type] || '📎'}</span>
          <div class="doc-meta" style="flex:1;">
            <div class="doc-name">${doc.name}</div>
            <div class="doc-size">${sizeMB} KB · 
              <select class="doc-type-select" onchange="updateDocType(${doc.id}, this.value)">
                ${Object.entries(docTypeLabels).map(([k, v]) =>
                  `<option value="${k}" ${k === doc.type ? 'selected' : ''}>${v}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <span class="badge badge-success" style="font-size:0.7rem;">Uploaded</span>
          <button class="doc-remove" onclick="removeDoc(${doc.id})" title="Remove">🗑️</button>
        </div>
        <div class="form-row" style="margin-top:0.25rem; border-top:1px dashed var(--border-color); padding-top:0.5rem; width: 100%;">
          <div class="form-group" style="margin: 0; flex: 1;">
            <label style="font-size:0.72rem; font-weight:600; color:var(--text-muted);">Expiry Date</label>
            <input type="date" class="form-control" style="font-size:0.75rem; padding: 0.2rem 0.4rem; height: auto;" onchange="checkDocExpiry(this, '${doc.type}')">
          </div>
          <div class="form-group" style="margin: 0; flex: 1;">
            <label style="font-size:0.72rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom: 0.15rem;">Verification</label>
            <label class="toggle-container" style="margin:0;">
              <input type="checkbox" class="toggle-input" onchange="markDocVerified(this)">
              <span class="toggle-switch"></span>
              <span style="font-size:0.75rem; margin-left:0.4rem;">Mark Verified</span>
            </label>
          </div>
        </div>
      `;
      list.appendChild(item);
    }

    function updateDocType(id, newType) {
      const doc = uploadedDocs.find(d => d.id === id);
      if (doc) { doc.type = newType; refreshDocChecklist(); }
    }

    function removeDoc(id) {
      const idx = uploadedDocs.findIndex(d => d.id === id);
      if (idx > -1) uploadedDocs.splice(idx, 1);
      const el = document.getElementById(`doc-${id}`);
      if (el) el.remove();
      refreshDocChecklist();
    }

    function updateDocChecklist(docType) {
      refreshDocChecklist();
    }

    function refreshDocChecklist() {
      const allTypes = ['agent_client_agreement', 'msa', 'pan_card', 'gst_cert', 'work_order', 'nda', 'tan_doc'];
      allTypes.forEach(type => {
        const has = uploadedDocs.some(d => d.type === type);
        const el = document.getElementById(`chk-${type}`);
        if (el) {
          el.querySelector('.check-icon').textContent = has ? '✅' : '⬜';
          el.className = has ? 'checklist-item done' : 'checklist-item';
        }
      });
    }

    // ── Progress Tracking ────────────────────
    function markProgress(section) {
      sectionProgress[section] = true;
      updateOnboardingChecklist();
    }

    function updateOnboardingChecklist() {
      const mapping = {
        1: 'ob-identity', 2: 'ob-address', 3: 'ob-contacts',
        4: 'ob-contract', 5: 'ob-statutory', 6: 'ob-documents'
      };
      let done = 0;
      Object.entries(sectionProgress).forEach(([sec, val]) => {
        const el = document.getElementById(mapping[sec]);
        if (el) {
          if (val) {
            el.className = 'checklist-item done';
            el.querySelector('.check-icon').textContent = '✅';
            done++;
          }
        }
      });
      const pct = Math.round((done / 6) * 100);
      document.getElementById('progress-bar').style.width = pct + '%';
      document.getElementById('progress-label').textContent = `${pct}% complete (${done}/6 sections)`;

      // Update progress steps
      const steps = document.querySelectorAll('.progress-step');
      steps.forEach((step, idx) => {
        if (sectionProgress[idx + 1]) {
          step.className = 'progress-step complete';
        }
      });
    }

    // Watch key fields to auto-update progress
    document.getElementById('reg-address-line1').addEventListener('input', () => markProgress(2));
    document.getElementById('poc1-name').addEventListener('input', () => markProgress(3));
    document.getElementById('contract-start').addEventListener('change', () => markProgress(4));
    document.getElementById('pf-applicable').addEventListener('change', () => markProgress(5));

    // ── Toast Notification ───────────────────
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
      setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
      }, 3000);
    }

    const pinMapping = {
      '400018': { city: 'Mumbai', state: 'Maharashtra' },
      '400001': { city: 'Mumbai', state: 'Maharashtra' },
      '560001': { city: 'Bengaluru', state: 'Karnataka' },
      '600001': { city: 'Chennai', state: 'Tamil Nadu' },
      '110001': { city: 'New Delhi', state: 'Delhi (NCT)' },
      '500001': { city: 'Hyderabad', state: 'Telangana' },
      '380001': { city: 'Ahmedabad', state: 'Gujarat' }
    };

    function checkIncorporation(el) {
      const val = el.value;
      if (!val) return;
      const d = new Date(val);
      const today = new Date();
      if (d > today) {
        showToast('🚫 Date of Incorporation cannot be in the future.');
        el.classList.add('invalid');
        return;
      }
      el.classList.remove('invalid');
      const years = (today - d) / (1000 * 60 * 60 * 24 * 365.25);
      if (years > 50) {
        showToast('⚠️ Verify company is still active (MCA portal).');
      }
    }

    function handleIndustryChange(val) {
      const subGroup = document.getElementById('sub-industry-group');
      if (subGroup) {
        subGroup.style.display = val === 'Other' ? 'block' : 'none';
      }
    }

    function toggleGroupCompany(checkbox) {
      const pGroup = document.getElementById('parent-company-group');
      if (pGroup) {
        pGroup.style.display = checkbox.checked ? 'block' : 'none';
      }
    }

    function handleCompanyType(val) {
      const trustReg = document.getElementById('trust-reg-field');
      if (trustReg) {
        trustReg.style.display = (val === 'trust') ? 'block' : 'none';
      }
      const gstLabel = document.querySelector('label[for="gstin"]');
      const gstinInput = document.getElementById('gstin');
      if (gstinInput && gstLabel) {
        if (val === 'govt') {
          gstLabel.innerHTML = 'GSTIN (Optional for Govt/PSU)';
          gstinInput.removeAttribute('required');
        } else {
          gstLabel.innerHTML = 'GSTIN <span style="color:var(--status-danger);">*</span>';
          gstinInput.setAttribute('required', 'true');
        }
      }
    }

    function checkGSTINDuplicate(val) {
      const existingClients = JSON.parse(localStorage.getItem('tecla_clients') || '[]');
      const currentCode = getClientCode();
      const dup = existingClients.find(c => c.gstin === val.toUpperCase() && c.code !== currentCode);
      if (dup) {
        showToast(`⚠️ A client with this GSTIN already exists: ${dup.name}`);
        document.getElementById('gstin').classList.add('invalid');
      }
    }

    function crossCheckPANGSTIN() {
      const panInput = document.getElementById('pan');
      const gstinInput = document.getElementById('gstin');
      if (!panInput || !gstinInput) return;
      const pan = panInput.value.toUpperCase();
      const gstin = gstinInput.value.toUpperCase();
      const hint = document.getElementById('pan-hint');
      if (pan.length === 10 && gstin.length === 15) {
        if (gstin.substring(2, 12) !== pan) {
          panInput.classList.add('invalid');
          hint.textContent = 'PAN does not match GSTIN (chars 3–12 of GSTIN must equal PAN).';
          hint.className = 'field-hint error';
        } else {
          panInput.classList.remove('invalid');
          hint.textContent = '✓ Valid PAN format.';
          hint.className = 'field-hint success';
        }
      }
    }

    function handleCountryChange(val) {
      const isIndia = val === 'India';
      const gstinGroup = document.getElementById('gstin').closest('.form-group');
      const panGroup = document.getElementById('pan').closest('.form-group');
      const tanGroup = document.getElementById('tan').closest('.form-group');
      const cinGroup = document.getElementById('cin').closest('.form-group');
      const genericTaxIdRow = document.getElementById('generic-tax-id-row');

      if (!isIndia) {
        if (gstinGroup) gstinGroup.style.display = 'none';
        if (panGroup) panGroup.style.display = 'none';
        if (tanGroup) tanGroup.style.display = 'none';
        if (cinGroup) cinGroup.style.display = 'none';
        if (genericTaxIdRow) genericTaxIdRow.style.display = 'flex';
        document.getElementById('billing-currency').value = 'USD';
        showToast('ℹ️ International client profile — statutory fields hidden.');
      } else {
        if (gstinGroup) gstinGroup.style.display = 'block';
        if (panGroup) panGroup.style.display = 'block';
        if (tanGroup) tanGroup.style.display = 'block';
        if (cinGroup) cinGroup.style.display = 'block';
        if (genericTaxIdRow) genericTaxIdRow.style.display = 'none';
        document.getElementById('billing-currency').value = 'INR';
      }
    }

    function autofillFromPIN(val) {
      const mapping = pinMapping[val];
      if (mapping) {
        document.getElementById('reg-city').value = mapping.city;
        document.getElementById('reg-state').value = mapping.state;
        document.getElementById('reg-state').dispatchEvent(new Event('change'));
        showToast(`📍 Auto-filled City & State for PIN ${val}`);
      }
    }

    function toggleBranches(checkbox) {
      document.getElementById('agency-branches-section').style.display = checkbox.checked ? 'block' : 'none';
    }

    let branchCount = 0;
    function addBranchRow() {
      branchCount++;
      const rowId = `branch-row-${branchCount}`;
      const html = `
        <div class="form-row branch-row" id="${rowId}" style="margin-bottom:0.75rem; align-items: flex-end;">
          <div class="form-group" style="flex:1.5; margin-bottom: 0;">
            <label>Branch Name / Location <span style="color:var(--status-danger);">*</span></label>
            <input type="text" class="form-control branch-name-input" placeholder="e.g. Mumbai Head Office" required>
          </div>
          <div class="form-group" style="flex:1; margin-bottom: 0;">
            <label>State <span style="color:var(--status-danger);">*</span></label>
            <select class="form-control branch-state-select" required>
              <option value="">-- Select State --</option>
              <option>Andhra Pradesh</option>
              <option>Arunachal Pradesh</option>
              <option>Assam</option>
              <option>Bihar</option>
              <option>Chhattisgarh</option>
              <option>Goa</option>
              <option>Gujarat</option>
              <option>Haryana</option>
              <option>Himachal Pradesh</option>
              <option>Jharkhand</option>
              <option>Karnataka</option>
              <option>Kerala</option>
              <option>Madhya Pradesh</option>
              <option>Maharashtra</option>
              <option>Manipur</option>
              <option>Meghalaya</option>
              <option>Mizoram</option>
              <option>Nagaland</option>
              <option>Odisha</option>
              <option>Punjab</option>
              <option>Rajasthan</option>
              <option>Sikkim</option>
              <option>Tamil Nadu</option>
              <option>Telangana</option>
              <option>Tripura</option>
              <option>Uttar Pradesh</option>
              <option>Uttarakhand</option>
              <option>West Bengal</option>
              <option>Delhi (NCT)</option>
              <option>Chandigarh</option>
            </select>
          </div>
          <div class="form-group" style="flex:1.5; margin-bottom: 0;">
            <label>GSTIN <span style="color:var(--status-danger);">*</span></label>
            <input type="text" class="form-control branch-gstin-input" placeholder="e.g. 27AAACT1234A1Z1" maxlength="15" style="text-transform:uppercase;" required>
          </div>
          <button type="button" class="btn btn-danger btn-xs" style="margin-bottom:0.15rem;" onclick="removeBranchRow('${rowId}')">🗑 Remove</button>
        </div>
      `;
      document.getElementById('agency-branches-rows-container').insertAdjacentHTML('beforeend', html);
    }

    function removeBranchRow(rowId) {
      document.getElementById(rowId).remove();
    }

    let extraContactCount = 0;
    function addExtraContact() {
      const container = document.getElementById('extra-contacts-container');
      const count = container.querySelectorAll('.extra-contact-card').length;
      if (count >= 5) {
        showToast('⚠️ Maximum 5 additional contact persons allowed.');
        return;
      }
      extraContactCount++;
      const cardId = `extra-contact-card-${extraContactCount}`;
      const html = `
        <div class="extra-contact-card" id="${cardId}" style="background:#FAFBFC; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; margin-bottom:1rem; position:relative;">
          <button type="button" class="btn btn-danger btn-xs" style="position:absolute; top:10px; right:10px;" onclick="removeExtraContact('${cardId}')">🗑 Remove</button>
          <strong style="font-size:0.875rem; color:var(--primary-navy); display:block; margin-bottom:0.75rem;">👤 Additional Contact</strong>
          
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Role</label>
              <select class="form-control role-select">
                <option value="operations">Operations POC</option>
                <option value="it_support">IT Support POC</option>
                <option value="management">Management/Director</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group" style="flex:1.5;">
              <label>Full Name <span style="color:var(--status-danger);">*</span></label>
              <input type="text" class="form-control name-input" placeholder="e.g. John Doe" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group" style="flex:1; margin-bottom: 0;">
              <label>Designation</label>
              <input type="text" class="form-control designation-input" placeholder="e.g. Operations Head">
            </div>
            <div class="form-group" style="flex:1; margin-bottom: 0;">
              <label>Email <span style="color:var(--status-danger);">*</span></label>
              <input type="email" class="form-control email-input" placeholder="e.g. john@mahindra.com" required oninput="validateEmail(this); checkContactEmailDuplicate(this.value, this);">
            </div>
            <div class="form-group" style="flex:1; margin-bottom: 0;">
              <label>Phone</label>
              <input type="tel" class="form-control phone-input" placeholder="10-digit mobile" maxlength="10" oninput="validatePhone(this)">
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', html);
    }

    function removeExtraContact(cardId) {
      document.getElementById(cardId).remove();
    }

    function checkContactEmailDuplicate(email, fieldEl) {
      const allEmails = [...document.querySelectorAll('input[type="email"]')]
        .filter(el => el !== fieldEl)
        .map(el => el.value.trim().toLowerCase());
      if (email && allEmails.includes(email.toLowerCase())) {
        fieldEl.classList.add('invalid');
        showToast('ℹ️ Same email address used for multiple contacts.');
      } else {
        fieldEl.classList.remove('invalid');
      }
    }

    function togglePOFields(checkbox) {
      document.getElementById('po-fields').style.display = checkbox.checked ? 'block' : 'none';
    }

    function handleGSTRateChange(val) {
      document.getElementById('lut-ref-group').style.display = val === '0_lut' ? 'block' : 'none';
    }

    function handleTDSChange(val) {
      const hint = document.getElementById('tds-preview-hint');
      if (val === 'na') {
        hint.textContent = 'Net receivable = Invoice Amount';
      } else if (val === '1') {
        hint.textContent = 'Net receivable = Invoice Amount - 1% TDS';
      } else if (val === '2') {
        hint.textContent = 'Net receivable = Invoice Amount - 2% TDS';
      } else if (val === '10') {
        hint.textContent = 'Net receivable = Invoice Amount - 10% TDS';
      } else {
        hint.textContent = 'Net receivable = Invoice Amount - Custom TDS%';
      }
    }

    function handlePFCeiling(val) {
      const hint = document.getElementById('pf-ceiling-hint');
      if (!hint) return;
      if (parseFloat(val) > 15000) {
        hint.textContent = 'Voluntary PF — contributions computed on actual basic.';
        hint.className = 'field-hint warning';
      } else {
        hint.textContent = 'Standard EPFO statutory wage ceiling is ₹15,000.';
        hint.className = 'field-hint';
      }
    }

    function handleESILimit(val) {
      const hint = document.getElementById('esi-limit-hint');
      if (!hint) return;
      if (parseFloat(val) !== 21000) {
        hint.textContent = 'Note: Statutory ESI limit is ₹21,000.';
        hint.className = 'field-hint warning';
      } else {
        hint.textContent = 'Standard ESIC statutory gross wage ceiling is ₹21,000.';
        hint.className = 'field-hint';
      }
    }

    function saveMSAExpiry(dateStr) {
      console.log('MSA Expiry Date saved:', dateStr);
    }

    function checkDocExpiry(dateInput, docType) {
      if (!dateInput.value) return;
      const expiry = new Date(dateInput.value);
      const today = new Date();
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        showToast('🔴 Document is already expired! Update required.');
        dateInput.classList.add('invalid');
      } else if (diffDays <= 30) {
        showToast(`⚠️ Document expires in ${diffDays} days. Plan renewal.`);
        dateInput.classList.add('invalid');
      } else {
        dateInput.classList.remove('invalid');
      }
      
      if (docType === 'msa' && dateInput.value) {
        saveMSAExpiry(dateInput.value);
      }
    }

    function markDocVerified(toggleInput) {
      if (toggleInput.checked) {
        showToast('✓ Document marked as Verified.');
      }
    }

    function handleAccessLevel(val) {
      const faToggle = document.getElementById('portal-2fa');
      if (val === 'full') {
        if (faToggle) {
          faToggle.checked = true;
          faToggle.disabled = true;
        }
        showToast('🔒 2FA enforced for Full Access accounts.');
      } else {
        if (faToggle) {
          faToggle.disabled = false;
        }
      }
    }

    function handleLogoSelect(input) {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast('❌ Logo file size exceeds 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        const hint = document.getElementById('logo-upload-hint');
        hint.textContent = `✓ Logo selected: ${file.name}`;
        hint.setAttribute('data-logo-url', e.target.result);
        showToast('✅ Logo uploaded successfully.');
      };
      reader.readAsDataURL(file);
    }

    function handlePayrollConvention(val) {
      document.getElementById('custom-cycle-row').style.display = val === 'custom' ? 'flex' : 'none';
    }

    function toggleReminderInfo(checkbox) {
      document.getElementById('reminder-info-box').style.display = checkbox.checked ? 'block' : 'none';
    }

    function updateInvoiceDuePreview() {
      const invoiceDayText = document.getElementById('invoice-raise-day')?.value || 'Same as Payroll Lock Day';
      const netTermsSelect = document.getElementById('payment-terms');
      const preview = document.getElementById('invoice-due-preview');
      if (preview && netTermsSelect) {
        const netTermsVal = netTermsSelect.value;
        const termDays = { 'net7': 7, 'net15': 15, 'net30': 30, 'net45': 45, 'net60': 60, 'immediate': 0 };
        const days = termDays[netTermsVal] !== undefined ? termDays[netTermsVal] : 15;
        let raiseDay = 3; // Lock day is 3rd of next month
        if (invoiceDayText === '+1 Day') raiseDay += 1;
        else if (invoiceDayText === '+2 Days') raiseDay += 2;
        else if (invoiceDayText === '+3 Days') raiseDay += 3;
        const dueDay = raiseDay + days;
        preview.textContent = `Preview: Invoice raised on ${raiseDay}th of month → Due on ${dueDay}th (Net ${days} days)`;
      }
    }

    function getClientCode() {
      const codeEl = document.getElementById('client-code');
      return codeEl && codeEl.value ? codeEl.value.trim() : 'temp';
    }

    const allowedTransitions = {
      'draft': ['onboarding'],
      'onboarding': ['active'],
      'active': ['suspended', 'inactive'],
      'suspended': ['active'],
      'inactive': ['active'],
    };

    function validateStatusTransition(from, to) {
      if (from === to) return true;
      const allowed = allowedTransitions[from] || [];
      if (!allowed.includes(to)) {
        showToast(`🚫 Cannot change status from ${from} to ${to}.`);
        return false;
      }
      return true;
    }

    function updateBackupAMOptions(primaryAM) {
      const backupAMSelect = document.getElementById('backup-account-manager');
      if (!backupAMSelect) return;
      Array.from(backupAMSelect.options).forEach(opt => {
        if (opt.value === primaryAM && primaryAM !== '') {
          opt.disabled = true;
          opt.style.display = 'none';
          if (backupAMSelect.value === primaryAM) {
            backupAMSelect.value = '';
          }
        } else {
          opt.disabled = false;
          opt.style.display = 'block';
        }
      });
    }

    function getFormPayload() {
      const poc1_prefs = [];
      if (document.getElementById('poc1-pref-email')?.checked) poc1_prefs.push('Email');
      if (document.getElementById('poc1-pref-sms')?.checked) poc1_prefs.push('SMS');
      if (document.getElementById('poc1-pref-wa')?.checked) poc1_prefs.push('WhatsApp');

      const poc2_prefs = [];
      if (document.getElementById('poc2-pref-email')?.checked) poc2_prefs.push('Email');
      if (document.getElementById('poc2-pref-sms')?.checked) poc2_prefs.push('SMS');
      if (document.getElementById('poc2-pref-wa')?.checked) poc2_prefs.push('WhatsApp');

      const poc3_prefs = [];
      if (document.getElementById('poc3-pref-email')?.checked) poc3_prefs.push('Email');
      if (document.getElementById('poc3-pref-sms')?.checked) poc3_prefs.push('SMS');
      if (document.getElementById('poc3-pref-wa')?.checked) poc3_prefs.push('WhatsApp');

      const branches = [];
      document.querySelectorAll('#agency-branches-rows-container .branch-row').forEach((row, index) => {
        const name = row.querySelector('.branch-name-input').value;
        const state = row.querySelector('.branch-state-select').value;
        const gstin = row.querySelector('.branch-gstin-input').value;
        if (name && state && gstin) {
          branches.push({ id: `branch-${index + 1}`, name, state, gstin });
        }
      });

      const extraContacts = [];
      document.querySelectorAll('#extra-contacts-container .extra-contact-card').forEach(card => {
        const role = card.querySelector('.role-select').value;
        const name = card.querySelector('.name-input').value;
        const designation = card.querySelector('.designation-input').value;
        const email = card.querySelector('.email-input').value;
        const phone = card.querySelector('.phone-input').value;
        if (name && email) {
          extraContacts.push({ role, name, designation, email, phone });
        }
      });

      return {
        id: currentEditId || Date.now(),
        name: document.getElementById('company-name').value,
        type: document.getElementById('company-type').value,
        trustRegNo: document.getElementById('trust-reg-no')?.value || '',
        gstin: document.getElementById('gstin').value,
        pan: document.getElementById('pan').value,
        tan: document.getElementById('tan').value,
        cin: document.getElementById('cin').value,
        incorporationDate: document.getElementById('incorporation-date').value,
        code: document.getElementById('client-code').value,
        industry: document.getElementById('industry').value,
        subIndustry: document.getElementById('sub-industry')?.value || '',
        status: document.getElementById('client-status').value || 'onboarding',
        locationsCount: parseInt(document.getElementById('work-locations-count')?.value || '1'),
        isGroupCompany: document.getElementById('is-group-company')?.checked || false,
        parentCompany: document.getElementById('parent-company')?.value || '',
        
        regAddressLine1: document.getElementById('reg-address-line1').value,
        regAddressLine2: document.getElementById('reg-address-line2').value,
        regCity: document.getElementById('reg-city').value,
        regState: document.getElementById('reg-state').value,
        regPin: document.getElementById('reg-pin').value,
        country: document.getElementById('country')?.value || 'India',
        taxId: document.getElementById('tax-id')?.value || '',
        regNo: document.getElementById('reg-no')?.value || '',
        billingSame: document.getElementById('same-as-registered').checked,
        billAddressLine1: document.getElementById('bill-address-line1').value,
        billCity: document.getElementById('bill-city').value,
        billState: document.getElementById('bill-state').value,
        billPin: document.getElementById('bill-pin').value,
        branches,

        poc1: {
          name: document.getElementById('poc1-name').value,
          designation: document.getElementById('poc1-designation').value,
          email: document.getElementById('poc1-email').value,
          phone: document.getElementById('poc1-phone').value,
          whatsappSame: document.getElementById('poc1-whatsapp-same')?.checked || false,
          preferences: poc1_prefs
        },
        poc2: {
          name: document.getElementById('poc2-name').value,
          designation: document.getElementById('poc2-designation').value,
          email: document.getElementById('poc2-email').value,
          phone: document.getElementById('poc2-phone').value,
          whatsappSame: document.getElementById('poc2-whatsapp-same')?.checked || false,
          ccInvoice: document.getElementById('poc2-cc-invoice')?.checked || false,
          preferences: poc2_prefs
        },
        poc3: {
          name: document.getElementById('poc3-name').value,
          email: document.getElementById('poc3-email').value,
          whatsappSame: document.getElementById('poc3-whatsapp-same')?.checked || false,
          onboardingKits: document.getElementById('poc3-onboarding-kits')?.checked || false,
          preferences: poc3_prefs
        },
        extraContacts,

        contractType: document.getElementById('contract-type').value,
        billingModel: document.getElementById('billing-model').value,
        markupPct: parseFloat(document.getElementById('markup-pct').value || '0'),
        markupBase: document.getElementById('markup-base').value,
        fixedFeeCandidate: parseFloat(document.getElementById('fixed-fee-candidate')?.value || '0'),
        fixedMonthlyRetainer: parseFloat(document.getElementById('fixed-monthly-retainer')?.value || '0'),
        hourlyRate: parseFloat(document.getElementById('hourly-rate')?.value || '0'),
        standardHours: parseFloat(document.getElementById('standard-hours')?.value || '0'),
        invoiceCycle: document.getElementById('invoice-cycle').value,
        paymentTerms: document.getElementById('payment-terms').value,
        contractStart: document.getElementById('contract-start').value,
        contractEnd: document.getElementById('contract-end').value,
        autoRenewal: document.getElementById('auto-renewal').checked,
        poRequired: document.getElementById('po-required').checked,
        poNumber: document.getElementById('po-number')?.value || '',
        poValue: parseFloat(document.getElementById('po-value')?.value || '0'),
        poValidity: document.getElementById('po-validity')?.value || '',
        noticePeriod: parseInt(document.getElementById('notice-period').value || '30'),
        creditLimit: parseFloat(document.getElementById('credit-limit').value || '0'),
        latePenalty: parseFloat(document.getElementById('late-penalty').value || '0'),
        billingCurrency: document.getElementById('billing-currency').value,
        gstRate: document.getElementById('gst-rate')?.value || '18',
        lutRefNo: document.getElementById('lut-ref-no')?.value || '',
        reverseCharge: document.getElementById('reverse-charge')?.checked || false,
        tdsApplicableAgency: document.getElementById('tds-applicable-agency')?.value || 'na',
        prefFormatPDF: document.getElementById('pref-format-pdf')?.checked || false,
        prefFormatXLSX: document.getElementById('pref-format-xlsx')?.checked || false,
        invoiceFooterNotes: document.getElementById('invoice-footer-notes')?.value || '',

        pfCeiling: parseFloat(document.getElementById('pf-ceiling').value || '15000'),
        pfApplicable: document.getElementById('pf-applicable').checked,
        esiLimit: parseFloat(document.getElementById('esi-limit').value || '21000'),
        esiApplicable: document.getElementById('esi-applicable').checked,
        ptState: document.getElementById('pt-state').value,
        ptApplicable: document.getElementById('pt-applicable').checked,
        lwfFrequency: document.getElementById('lwf-frequency').value,
        lwfApplicable: document.getElementById('lwf-applicable').checked,
        tdsRegime: document.getElementById('tds-regime').value,
        tdsApplicable: document.getElementById('tds-applicable').checked,
        gratuityMode: document.getElementById('gratuity-mode').value,
        gratuityApplicable: document.getElementById('gratuity-applicable').checked,
        bonusPct: parseFloat(document.getElementById('bonus-pct').value || '8.33'),
        bonusApplicable: document.getElementById('bonus-applicable').checked,
        bonusRate: parseFloat(document.getElementById('bonus-pct').value || '8.33'),
        statutoryBonusApplicable: document.getElementById('bonus-applicable').checked,
        lopBasis: document.getElementById('client-lop-basis')?.value || 'inherit',

        portalAccess: document.getElementById('portal-access').checked,
        portalEmail: document.getElementById('portal-email').value,
        portalAccessLevel: document.getElementById('portal-access-level').value,
        portalViewSalary: document.getElementById('portal-view-salary').checked,
        portalViewInvoices: document.getElementById('portal-view-invoices').checked,
        portalViewPayslips: document.getElementById('portal-view-payslips').checked,
        portalRaiseRequests: document.getElementById('portal-raise-requests').checked,
        portal2fa: document.getElementById('portal-2fa')?.checked || false,
        sessionTimeout: parseInt(document.getElementById('session-timeout')?.value || '60'),
        ipWhitelist: document.getElementById('ip-whitelist')?.value || '',
        logoUrl: document.getElementById('logo-upload-hint')?.getAttribute('data-logo-url') || '',

        invoiceRaiseDay: document.getElementById('invoice-raise-day')?.value || 'Same as Payroll Lock Day',
        payrollMonthConvention: document.getElementById('payroll-month-convention')?.value || 'calendar',
        cycleStartDay: parseInt(document.getElementById('cycle-start-day')?.value || '1'),
        cycleEndDay: parseInt(document.getElementById('cycle-end-day')?.value || '28'),
        backupAM: document.getElementById('backup-account-manager')?.value || '',
        autoReminders: document.getElementById('auto-reminders')?.checked || false,
        accountManager: document.getElementById('account-manager').value,
        clientNotes: document.getElementById('client-notes').value,
        
        outstanding: 0,
        outstandingLimitExceeded: false,
        contractExpired: false,
        contractExpiringSoon: false
      };
    }

    function populateForm(data) {
      if (!data) return;
      
      if (data.name) document.getElementById('company-name').value = data.name;
      if (data.type) {
        document.getElementById('company-type').value = data.type;
        handleCompanyType(data.type);
      }
      if (data.trustRegNo && document.getElementById('trust-reg-no')) {
        document.getElementById('trust-reg-no').value = data.trustRegNo;
      }
      if (data.gstin) document.getElementById('gstin').value = data.gstin;
      if (data.pan) document.getElementById('pan').value = data.pan;
      if (data.tan) document.getElementById('tan').value = data.tan;
      if (data.cin) document.getElementById('cin').value = data.cin;
      if (data.incorporationDate) document.getElementById('incorporation-date').value = data.incorporationDate;
      if (data.code) document.getElementById('client-code').value = data.code;
      if (data.industry) {
        document.getElementById('industry').value = data.industry;
        handleIndustryChange(data.industry);
      }
      if (data.subIndustry && document.getElementById('sub-industry')) {
        document.getElementById('sub-industry').value = data.subIndustry;
      }
      if (data.status) document.getElementById('client-status').value = data.status;
      if (data.locationsCount && document.getElementById('work-locations-count')) {
        document.getElementById('work-locations-count').value = data.locationsCount;
      }
      if (data.isGroupCompany && document.getElementById('is-group-company')) {
        document.getElementById('is-group-company').checked = data.isGroupCompany;
        toggleGroupCompany(document.getElementById('is-group-company'));
      }
      if (data.parentCompany && document.getElementById('parent-company')) {
        document.getElementById('parent-company').value = data.parentCompany;
      }

      if (data.regAddressLine1) document.getElementById('reg-address-line1').value = data.regAddressLine1;
      if (data.regAddressLine2) document.getElementById('reg-address-line2').value = data.regAddressLine2;
      if (data.regCity) document.getElementById('reg-city').value = data.regCity;
      if (data.regState) document.getElementById('reg-state').value = data.regState;
      if (data.regPin) document.getElementById('reg-pin').value = data.regPin;
      if (data.country && document.getElementById('country')) {
        document.getElementById('country').value = data.country;
        handleCountryChange(data.country);
      }
      if (data.taxId && document.getElementById('tax-id')) document.getElementById('tax-id').value = data.taxId;
      if (data.regNo && document.getElementById('reg-no')) document.getElementById('reg-no').value = data.regNo;
      
      if (data.billingSame !== undefined) {
        document.getElementById('same-as-registered').checked = data.billingSame;
        toggleBillingAddress(document.getElementById('same-as-registered'));
      }
      if (data.billAddressLine1) document.getElementById('bill-address-line1').value = data.billAddressLine1;
      if (data.billCity) document.getElementById('bill-city').value = data.billCity;
      if (data.billState) document.getElementById('bill-state').value = data.billState;
      if (data.billPin) document.getElementById('bill-pin').value = data.billPin;

      if (data.branches) {
        document.getElementById('agency-branches-rows-container').innerHTML = '';
        data.branches.forEach(b => {
          addBranchRow();
          const rows = document.querySelectorAll('#agency-branches-rows-container .branch-row');
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            lastRow.querySelector('.branch-name-input').value = b.name;
            lastRow.querySelector('.branch-state-select').value = b.state;
            lastRow.querySelector('.branch-gstin-input').value = b.gstin;
          }
        });
        if (data.branches.length > 0) {
          document.getElementById('has-agency-branches').checked = true;
          toggleBranches(document.getElementById('has-agency-branches'));
        }
      }

      if (data.poc1) {
        document.getElementById('poc1-name').value = data.poc1.name || '';
        document.getElementById('poc1-designation').value = data.poc1.designation || '';
        document.getElementById('poc1-email').value = data.poc1.email || '';
        document.getElementById('poc1-phone').value = data.poc1.phone || '';
        if (document.getElementById('poc1-whatsapp-same')) {
          document.getElementById('poc1-whatsapp-same').checked = data.poc1.whatsappSame;
        }
        if (data.poc1.preferences) {
          document.getElementById('poc1-pref-email').checked = data.poc1.preferences.includes('Email');
          document.getElementById('poc1-pref-sms').checked = data.poc1.preferences.includes('SMS');
          document.getElementById('poc1-pref-wa').checked = data.poc1.preferences.includes('WhatsApp');
        }
      }
      if (data.poc2) {
        document.getElementById('poc2-name').value = data.poc2.name || '';
        document.getElementById('poc2-designation').value = data.poc2.designation || '';
        document.getElementById('poc2-email').value = data.poc2.email || '';
        document.getElementById('poc2-phone').value = data.poc2.phone || '';
        if (document.getElementById('poc2-whatsapp-same')) {
          document.getElementById('poc2-whatsapp-same').checked = data.poc2.whatsappSame;
        }
        if (document.getElementById('poc2-cc-invoice')) {
          document.getElementById('poc2-cc-invoice').checked = data.poc2.ccInvoice;
        }
        if (data.poc2.preferences) {
          document.getElementById('poc2-pref-email').checked = data.poc2.preferences.includes('Email');
          document.getElementById('poc2-pref-sms').checked = data.poc2.preferences.includes('SMS');
          document.getElementById('poc2-pref-wa').checked = data.poc2.preferences.includes('WhatsApp');
        }
      }
      if (data.poc3) {
        document.getElementById('poc3-name').value = data.poc3.name || '';
        document.getElementById('poc3-email').value = data.poc3.email || '';
        if (document.getElementById('poc3-whatsapp-same')) {
          document.getElementById('poc3-whatsapp-same').checked = data.poc3.whatsappSame;
        }
        if (document.getElementById('poc3-onboarding-kits')) {
          document.getElementById('poc3-onboarding-kits').checked = data.poc3.onboardingKits;
        }
        if (data.poc3.preferences) {
          document.getElementById('poc3-pref-email').checked = data.poc3.preferences.includes('Email');
          document.getElementById('poc3-pref-sms').checked = data.poc3.preferences.includes('SMS');
          document.getElementById('poc3-pref-wa').checked = data.poc3.preferences.includes('WhatsApp');
        }
      }

      if (data.extraContacts) {
        document.getElementById('extra-contacts-container').innerHTML = '';
        data.extraContacts.forEach(c => {
          addExtraContact();
          const cards = document.querySelectorAll('#extra-contacts-container .extra-contact-card');
          const lastCard = cards[cards.length - 1];
          if (lastCard) {
            lastCard.querySelector('.role-select').value = c.role;
            lastCard.querySelector('.name-input').value = c.name;
            lastCard.querySelector('.designation-input').value = c.designation;
            lastCard.querySelector('.email-input').value = c.email;
            lastCard.querySelector('.phone-input').value = c.phone;
          }
        });
      }

      if (data.contractType) document.getElementById('contract-type').value = data.contractType;
      if (data.billingModel) {
        document.getElementById('billing-model').value = data.billingModel;
        handleBillingModelChange(document.getElementById('billing-model'));
      }
      if (data.markupPct) document.getElementById('markup-pct').value = data.markupPct;
      if (data.markupBase) document.getElementById('markup-base').value = data.markupBase;
      if (data.fixedFeeCandidate && document.getElementById('fixed-fee-candidate')) {
        document.getElementById('fixed-fee-candidate').value = data.fixedFeeCandidate;
      }
      if (data.fixedMonthlyRetainer && document.getElementById('fixed-monthly-retainer')) {
        document.getElementById('fixed-monthly-retainer').value = data.fixedMonthlyRetainer;
      }
      if (data.hourlyRate && document.getElementById('hourly-rate')) {
        document.getElementById('hourly-rate').value = data.hourlyRate;
      }
      if (data.standardHours && document.getElementById('standard-hours')) {
        document.getElementById('standard-hours').value = data.standardHours;
      }
      if (data.invoiceCycle) document.getElementById('invoice-cycle').value = data.invoiceCycle;
      if (data.paymentTerms) document.getElementById('payment-terms').value = data.paymentTerms;
      if (data.contractStart) document.getElementById('contract-start').value = data.contractStart;
      if (data.contractEnd) document.getElementById('contract-end').value = data.contractEnd;
      if (data.autoRenewal) document.getElementById('auto-renewal').checked = data.autoRenewal;
      
      if (data.poRequired !== undefined) {
        document.getElementById('po-required').checked = data.poRequired;
        togglePOFields(document.getElementById('po-required'));
      }
      if (data.poNumber && document.getElementById('po-number')) document.getElementById('po-number').value = data.poNumber;
      if (data.poValue && document.getElementById('po-value')) document.getElementById('po-value').value = data.poValue;
      if (data.poValidity && document.getElementById('po-validity')) document.getElementById('po-validity').value = data.poValidity;

      if (data.noticePeriod) document.getElementById('notice-period').value = data.noticePeriod;
      if (data.creditLimit) document.getElementById('credit-limit').value = data.creditLimit;
      if (data.latePenalty) document.getElementById('late-penalty').value = data.latePenalty;
      if (data.billingCurrency) document.getElementById('billing-currency').value = data.billingCurrency;
      
      if (data.gstRate && document.getElementById('gst-rate')) {
        document.getElementById('gst-rate').value = data.gstRate;
        handleGSTRateChange(data.gstRate);
      }
      if (data.lutRefNo && document.getElementById('lut-ref-no')) document.getElementById('lut-ref-no').value = data.lutRefNo;
      if (data.reverseCharge && document.getElementById('reverse-charge')) document.getElementById('reverse-charge').checked = data.reverseCharge;
      if (data.tdsApplicableAgency && document.getElementById('tds-applicable-agency')) {
        document.getElementById('tds-applicable-agency').value = data.tdsApplicableAgency;
        handleTDSChange(data.tdsApplicableAgency);
      }
      if (data.prefFormatPDF && document.getElementById('pref-format-pdf')) document.getElementById('pref-format-pdf').checked = data.prefFormatPDF;
      if (data.prefFormatXLSX && document.getElementById('pref-format-xlsx')) document.getElementById('pref-format-xlsx').checked = data.prefFormatXLSX;
      if (data.invoiceFooterNotes && document.getElementById('invoice-footer-notes')) document.getElementById('invoice-footer-notes').value = data.invoiceFooterNotes;

      if (data.pfCeiling) document.getElementById('pf-ceiling').value = data.pfCeiling;
      if (data.pfApplicable !== undefined) document.getElementById('pf-applicable').checked = data.pfApplicable;
      if (data.esiLimit) document.getElementById('esi-limit').value = data.esiLimit;
      if (data.esiApplicable !== undefined) document.getElementById('esi-applicable').checked = data.esiApplicable;
      if (data.ptState) document.getElementById('pt-state').value = data.ptState;
      if (data.ptApplicable !== undefined) document.getElementById('pt-applicable').checked = data.ptApplicable;
      if (data.lwfFrequency) document.getElementById('lwf-frequency').value = data.lwfFrequency;
      if (data.lwfApplicable !== undefined) document.getElementById('lwf-applicable').checked = data.lwfApplicable;
      if (data.tdsRegime) document.getElementById('tds-regime').value = data.tdsRegime;
      if (data.tdsApplicable !== undefined) document.getElementById('tds-applicable').checked = data.tdsApplicable;
      if (data.gratuityMode) document.getElementById('gratuity-mode').value = data.gratuityMode;
      if (data.gratuityApplicable !== undefined) document.getElementById('gratuity-applicable').checked = data.gratuityApplicable;
      if (data.bonusPct) document.getElementById('bonus-pct').value = data.bonusPct;
      if (data.bonusApplicable !== undefined) document.getElementById('bonus-applicable').checked = data.bonusApplicable;
      if (data.lopBasis && document.getElementById('client-lop-basis')) document.getElementById('client-lop-basis').value = data.lopBasis;

      if (data.portalAccess !== undefined) {
        document.getElementById('portal-access').checked = data.portalAccess;
        togglePortalFields(document.getElementById('portal-access'));
      }
      if (data.portalEmail) document.getElementById('portal-email').value = data.portalEmail;
      if (data.portalAccessLevel) {
        document.getElementById('portal-access-level').value = data.portalAccessLevel;
        handleAccessLevel(data.portalAccessLevel);
      }
      if (data.portalViewSalary !== undefined) document.getElementById('portal-view-salary').checked = data.portalViewSalary;
      if (data.portalViewInvoices !== undefined) document.getElementById('portal-view-invoices').checked = data.portalViewInvoices;
      if (data.portalViewPayslips !== undefined) document.getElementById('portal-view-payslips').checked = data.portalViewPayslips;
      if (data.portalRaiseRequests !== undefined) document.getElementById('portal-raise-requests').checked = data.portalRaiseRequests;
      
      if (data.portal2fa !== undefined && document.getElementById('portal-2fa')) document.getElementById('portal-2fa').checked = data.portal2fa;
      if (data.sessionTimeout && document.getElementById('session-timeout')) document.getElementById('session-timeout').value = data.sessionTimeout;
      if (data.ipWhitelist && document.getElementById('ip-whitelist')) document.getElementById('ip-whitelist').value = data.ipWhitelist;
      if (data.logoUrl && document.getElementById('logo-upload-hint')) {
        document.getElementById('logo-upload-hint').setAttribute('data-logo-url', data.logoUrl);
        document.getElementById('logo-upload-hint').textContent = '✓ Logo uploaded';
      }

      if (data.invoiceRaiseDay && document.getElementById('invoice-raise-day')) {
        document.getElementById('invoice-raise-day').value = data.invoiceRaiseDay;
      }
      if (data.payrollMonthConvention && document.getElementById('payroll-month-convention')) {
        document.getElementById('payroll-month-convention').value = data.payrollMonthConvention;
        handlePayrollConvention(data.payrollMonthConvention);
      }
      if (data.cycleStartDay && document.getElementById('cycle-start-day')) document.getElementById('cycle-start-day').value = data.cycleStartDay;
      if (data.cycleEndDay && document.getElementById('cycle-end-day')) document.getElementById('cycle-end-day').value = data.cycleEndDay;
      if (data.backupAM && document.getElementById('backup-account-manager')) document.getElementById('backup-account-manager').value = data.backupAM;
      if (data.autoReminders !== undefined && document.getElementById('auto-reminders')) {
        document.getElementById('auto-reminders').checked = data.autoReminders;
        toggleReminderInfo(document.getElementById('auto-reminders'));
      }
      
      if (data.accountManager) document.getElementById('account-manager').value = data.accountManager;
      if (data.clientNotes) document.getElementById('client-notes').value = data.clientNotes;
      
      updateInvoiceDuePreview();
    }

    function saveDraft(isAuto = false) {
      const code = getClientCode();
      const payload = getFormPayload();
      localStorage.setItem(`tecla_client_draft_${code}`, JSON.stringify(payload));
      
      const indicator = document.getElementById('autosave-indicator');
      if (indicator) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        indicator.textContent = `Auto-saved at ${time}`;
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; }, 3000);
      }
      if (!isAuto) {
        showToast('💾 Draft saved successfully!');
      }
    }

    function submitForm() {
      const payload = getFormPayload();
      
      const urlParams = new URLSearchParams(window.location.search);
      const existingClients = JSON.parse(localStorage.getItem('tecla_clients') || '[]');
      let initialStatus = 'draft';
      
      let currentClient = null;
      if (urlParams.get('code')) {
        currentClient = existingClients.find(c => c.code === urlParams.get('code'));
      } else if (urlParams.get('id')) {
        currentClient = existingClients.find(c => c.id === parseInt(urlParams.get('id')));
      }
      if (currentClient) {
        initialStatus = currentClient.status || 'draft';
      }
      
      if (!validateStatusTransition(initialStatus, payload.status)) {
        return;
      }
      
      const required = [
        { id: 'company-name', label: 'Company Name' },
        { id: 'company-type', label: 'Company Type' },
        { id: 'client-code', label: 'Client Code' },
        { id: 'reg-address-line1', label: 'Registered Address' },
        { id: 'reg-city', label: 'City' },
        { id: 'reg-state', label: 'State' },
        { id: 'reg-pin', label: 'PIN Code' },
        { id: 'poc1-name', label: 'Primary POC Name' },
        { id: 'poc1-email', label: 'Primary POC Email' },
        { id: 'poc1-phone', label: 'Primary POC Phone' },
        { id: 'contract-type', label: 'Contract Type' },
        { id: 'billing-model', label: 'Billing Model' },
        { id: 'contract-start', label: 'Contract Start Date' },
      ];
      
      if (payload.type === 'trust') {
        required.push({ id: 'trust-reg-no', label: 'Trust/NGO Registration Number' });
      }
      if (payload.country !== 'India') {
        required.push({ id: 'tax-id', label: 'Tax ID' });
        required.push({ id: 'reg-no', label: 'Registration Number' });
      } else {
        if (payload.type !== 'govt') {
          required.push({ id: 'gstin', label: 'GSTIN' });
        }
        required.push({ id: 'pan', label: 'PAN' });
      }
      
      if (payload.poRequired) {
        required.push({ id: 'po-number', label: 'PO Number' });
      }

      let firstError = null;
      let errorCount = 0;

      required.forEach(field => {
        const el = document.getElementById(field.id);
        if (!el) return;
        if (!el.value || el.value.trim() === '') {
          el.classList.add('invalid');
          if (!firstError) firstError = el;
          errorCount++;
        } else {
          el.classList.remove('invalid');
        }
      });
      
      if (payload.country === 'India' && payload.gstin) {
        const gstinEl = document.getElementById('gstin');
        const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinPattern.test(payload.gstin.toUpperCase())) {
          gstinEl.classList.add('invalid');
          if (!firstError) firstError = gstinEl;
          errorCount++;
        }
      }

      // Check branch GSTIN errors
      const branchesValid = checkAllBranchesGSTIN();
      if (!branchesValid) {
        showToast('❌ Fix GSTIN errors in Branch / Work Locations before saving.');
        const checklistItem = document.getElementById('ob-address');
        if (checklistItem) {
          checklistItem.classList.remove('done');
          checklistItem.style.color = 'var(--status-warning)';
          const icon = checklistItem.querySelector('.check-icon');
          if (icon) icon.textContent = '⚠️';
        }
        
        const firstErr = document.querySelector('.branch-gstin-error[style*="display: block"]');
        if (firstErr) {
          const sectionDiv = firstErr.closest('.form-step-section');
          if (sectionDiv) {
            const stepId = parseInt(sectionDiv.id.replace('step-section-', ''));
            goToStep(stepId);
          }
          setTimeout(() => {
            firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        }
        return;
      } else {
        const checklistItem = document.getElementById('ob-address');
        if (checklistItem && currentStep > 2) {
           checklistItem.classList.add('done');
           checklistItem.style.color = '';
           const icon = checklistItem.querySelector('.check-icon');
           if (icon) icon.textContent = '✅';
        }
      }

      if (errorCount > 0) {
        showToast(`❌ ${errorCount} required field(s) missing or invalid. Please review.`);
        if (firstError) {
          const sectionDiv = firstError.closest('.form-step-section');
          if (sectionDiv) {
            const stepId = parseInt(sectionDiv.id.replace('step-section-', ''));
            goToStep(stepId);
          }
          setTimeout(() => {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
          }, 200);
        }
        return;
      }
      
      if (payload.contractEnd && new Date(payload.contractEnd) < new Date('2026-06-29')) {
        showToast('⚠️ Notice: Saving client with an expired contract end date.');
      }
      
      if (payload.billingModel === 'markup' && payload.markupPct === 0) {
        if (!confirm('⚠️ You entered 0% markup. Confirm you want to proceed with 0% markup?')) {
          return;
        }
      }
      
      if (payload.creditLimit > 5000000) {
        showToast('⚠️ Large credit exposure detected. Require Director sign-off.');
      }
      
      if (!payload.pfApplicable && !payload.esiApplicable && !payload.ptApplicable && !payload.lwfApplicable) {
        showToast('⚠️ All statutory contributions disabled. Confirm this is correct under Section 16 of Code on Wages.');
      }
      
      const idx = existingClients.findIndex(c => c.code === payload.code || c.id === payload.id);
      if (idx > -1) {
        existingClients[idx] = { ...existingClients[idx], ...payload };
      } else {
        existingClients.push(payload);
      }
      
      localStorage.setItem('tecla_clients', JSON.stringify(existingClients));
      
      const codeKey = payload.code || 'temp';
      localStorage.removeItem(`tecla_client_draft_${codeKey}`);
      
      showToast('✅ Client saved & activated successfully!');
      setTimeout(() => { window.location.href = 'clients-list.html'; }, 1500);
    }

    // ── Init: Set max incorporation date to today ──
    document.getElementById('incorporation-date').max = new Date().toISOString().split('T')[0];

    // Pre-populate if editing (dynamic from localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const currentEditCode = urlParams.get('code');
    const currentEditId = urlParams.get('id') ? parseInt(urlParams.get('id')) : null;
    
    let currentClient = null;
    const existingClients = JSON.parse(localStorage.getItem('tecla_clients') || '[]');
    if (currentEditCode) {
      currentClient = existingClients.find(c => c.code === currentEditCode);
    } else if (currentEditId) {
      currentClient = existingClients.find(c => c.id === currentEditId);
    }
    
    const codeKey = currentClient ? currentClient.code : (currentEditCode || 'temp');
    const draftStr = localStorage.getItem(`tecla_client_draft_${codeKey}`);
    
    if (draftStr) {
      try {
        const draftData = JSON.parse(draftStr);
        populateForm(draftData);
        showToast('ℹ️ Loaded form from auto-saved draft.');
      } catch (e) {
        console.error(e);
      }
    } else if (currentClient) {
      document.getElementById('form-page-title').textContent = `Edit Client — ${currentClient.name}`;
      populateForm(currentClient);
      
      // Mark all progress
      Object.keys(sectionProgress).forEach(k => { sectionProgress[k] = true; });
      updateOnboardingChecklist();
    }

    // Start auto-save timer (every 60 seconds)
    setInterval(() => saveDraft(true), 60000);

    // ─── Wizard Navigation Controls ───
    let currentStep = 1;

    function goToStep(stepNum) {
      if (stepNum > currentStep) {
        // Validate intermediate steps
        for (let s = currentStep; s < stepNum; s++) {
          if (!validateStep(s)) {
            return;
          }
        }
      }
      currentStep = stepNum;
      showStep(currentStep);
    }

    function nextStep() {
      if (validateStep(currentStep)) {
        if (currentStep < 8) {
          currentStep++;
          showStep(currentStep);
        }
      }
    }

    function prevStep() {
      if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
      }
    }

    function showStep(stepNum) {
      // Hide all sections
      document.querySelectorAll('.form-step-section').forEach(sec => sec.classList.remove('active'));
      // Show target step
      const targetSec = document.getElementById(`step-section-${stepNum}`);
      if (targetSec) targetSec.classList.add('active');

      // Update progress indicators at top
      const steps = document.querySelectorAll('.progress-step');
      steps.forEach((st, idx) => {
        st.classList.remove('active', 'complete');
        if (idx + 1 === stepNum) {
          st.classList.add('active');
        } else if (idx + 1 < stepNum) {
          st.classList.add('complete');
        }
      });

      // Update sidebar visual checkboxes
      const checklistItems = [
        { id: 'ob-identity', step: 1 },
        { id: 'ob-address', step: 2 },
        { id: 'ob-contacts', step: 3 },
        { id: 'ob-contract', step: 4 },
        { id: 'ob-statutory', step: 5 },
        { id: 'ob-documents', step: 6 },
        { id: 'ob-portal', step: 7 },
        { id: 'ob-sla', step: 8 }
      ];

      checklistItems.forEach(item => {
        const el = document.getElementById(item.id);
        if (!el) return;
        const icon = el.querySelector('.check-icon');
        if (item.step < stepNum) {
          el.classList.add('done');
          if (icon) icon.textContent = '✅';
        } else {
          el.classList.remove('done');
          if (icon) icon.textContent = '⬜';
        }
      });

      // Show/Hide prev/next/submit action buttons at the bottom of the card
      const prevBtn = document.getElementById('btn-prev-step');
      const nextBtn = document.getElementById('btn-next-step');
      const submitBtn = document.getElementById('btn-submit-form');

      if (prevBtn) prevBtn.style.display = stepNum === 1 ? 'none' : 'inline-block';
      if (nextBtn) nextBtn.style.display = stepNum === 8 ? 'none' : 'inline-block';
      if (submitBtn) submitBtn.style.display = stepNum === 8 ? 'inline-block' : 'none';

      // Scroll smoothly back to top of main card container
      const titleEl = document.getElementById('form-page-title');
      if (titleEl) {
        titleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function validateStep(stepNum) {
      let isValid = true;
      let firstError = null;

      const requiredInputs = [];

      if (stepNum === 1) {
        requiredInputs.push(
          { id: 'company-name', label: 'Company Name' },
          { id: 'company-type', label: 'Company Type' },
          { id: 'client-code', label: 'Client Code' }
        );
        const country = document.getElementById('country') ? document.getElementById('country').value : 'India';
        const type = document.getElementById('company-type').value;
        if (country === 'India') {
          if (type !== 'govt' && type !== 'trust') {
            requiredInputs.push({ id: 'gstin', label: 'GSTIN' });
          }
          requiredInputs.push({ id: 'pan', label: 'PAN' });
        } else {
          requiredInputs.push(
            { id: 'tax-id', label: 'Tax ID' },
            { id: 'reg-no', label: 'Registration Number' }
          );
        }
        if (type === 'trust') {
          requiredInputs.push({ id: 'trust-reg-no', label: 'Trust/NGO Registration Number' });
        }
      } else if (stepNum === 2) {
        requiredInputs.push(
          { id: 'reg-address-line1', label: 'Registered Address' },
          { id: 'reg-city', label: 'City' },
          { id: 'reg-state', label: 'State' },
          { id: 'reg-pin', label: 'PIN Code' }
        );
        if (!checkAllBranchesGSTIN()) {
           isValid = false;
           const firstErrInput = document.querySelector('.client-branch-card[data-gstin-error="true"] .branch-gstin');
           if (!firstError && firstErrInput) firstError = firstErrInput;
           const checklistItem = document.getElementById('ob-address');
           if (checklistItem) {
             checklistItem.classList.remove('done');
             checklistItem.style.color = 'var(--status-warning)';
             const icon = checklistItem.querySelector('.check-icon');
             if (icon) icon.textContent = '⚠️';
           }
        }
      } else if (stepNum === 3) {
        requiredInputs.push(
          { id: 'poc1-name', label: 'Primary POC Name' },
          { id: 'poc1-email', label: 'Primary POC Email' },
          { id: 'poc1-phone', label: 'Primary POC Phone' }
        );
      } else if (stepNum === 4) {
        requiredInputs.push(
          { id: 'contract-type', label: 'Contract Type' },
          { id: 'billing-model', label: 'Billing Model' },
          { id: 'contract-start', label: 'Contract Start Date' }
        );
        const poRequired = document.getElementById('po-required') && document.getElementById('po-required').checked;
        if (poRequired) {
          requiredInputs.push({ id: 'po-number', label: 'PO Number' });
        }
      }

      requiredInputs.forEach(field => {
        const el = document.getElementById(field.id);
        if (!el) return;
        if (!el.value || el.value.trim() === '') {
          el.classList.add('invalid');
          isValid = false;
          if (!firstError) firstError = el;
        } else {
          el.classList.remove('invalid');
        }
      });

      // GSTIN Pattern validation if on Step 1
      if (stepNum === 1) {
        const type = document.getElementById('company-type').value;
        const country = document.getElementById('country') ? document.getElementById('country').value : 'India';
        if (country === 'India' && type !== 'govt' && type !== 'trust') {
          const gstinEl = document.getElementById('gstin');
          const gstinVal = gstinEl ? gstinEl.value : '';
          const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (gstinEl && !gstinPattern.test(gstinVal.toUpperCase())) {
            gstinEl.classList.add('invalid');
            isValid = false;
            if (!firstError) firstError = gstinEl;
          }
        }
      }

      if (!isValid) {
        showToast(`❌ Section ${stepNum} has missing/invalid required fields.`);
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstError.focus();
        }
      }

      return isValid;
    }

    // ── Client Branches Logic ──
    let clientBranchCount = 0;
    const gstStateCodes = {
      'Tamil Nadu': '33', 'Maharashtra': '27', 'Karnataka': '29',
      'Delhi (NCT)': '07', 'Telangana': '36', 'Gujarat': '24',
      'West Bengal': '19', 'Rajasthan': '08', 'Uttar Pradesh': '09'
    };

    function addClientBranch(seedData = null) {
      clientBranchCount++;
      const branchId = `client-branch-${clientBranchCount}`;
      const isFirst = clientBranchCount === 1;
      
      const container = document.getElementById('client-branches-container');
      
      const card = document.createElement('div');
      card.className = 'client-branch-card';
      card.id = branchId;
      card.style.cssText = 'background:#FAFBFC; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; position:relative;';
      
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
          <strong style="font-size:0.9rem; color:var(--primary-navy);">Branch Details</strong>
          <button type="button" class="btn-remove-branch" onclick="removeClientBranch('${branchId}')" style="background:none; border:none; color:var(--status-danger); cursor:pointer; font-size:0.8rem; font-weight:600; padding:0;">🗑 Remove Branch</button>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Branch Name <span style="color:var(--status-danger);">*</span></label>
            <input type="text" class="form-control branch-name" required placeholder="e.g. Chennai Office" oninput="updateBranchCode('${branchId}')">
          </div>
          <div class="form-group">
            <label>Branch Code</label>
            <input type="text" class="form-control branch-code" readonly style="background:#f1f5f9; color:var(--text-muted);">
          </div>
        </div>

        <div class="form-group">
          <label>Address Line 1 <span style="color:var(--status-danger);">*</span></label>
          <input type="text" class="form-control branch-addr1" required>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Address Line 2</label>
            <input type="text" class="form-control branch-addr2">
          </div>
          <div class="form-group">
            <label>City <span style="color:var(--status-danger);">*</span></label>
            <input type="text" class="form-control branch-city" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>State <span style="color:var(--status-danger);">*</span></label>
            <select class="form-control branch-state" required onchange="validateBranchGSTIN('${branchId}')">
              <option value="">-- Select --</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Delhi (NCT)">Delhi (NCT)</option>
              <option value="Telangana">Telangana</option>
              <option value="Gujarat">Gujarat</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
            </select>
          </div>
          <div class="form-group">
            <label>PIN Code <span style="color:var(--status-danger);">*</span></label>
            <input type="text" class="form-control branch-pin" maxlength="6" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>GSTIN <span style="color:var(--status-danger);">*</span></label>
            <div style="position:relative; display:flex; align-items:center;">
              <input type="text" class="form-control branch-gstin" maxlength="15" required style="text-transform:uppercase;" onblur="validateBranchGSTIN('${branchId}')" oninput="validateBranchGSTIN('${branchId}')">
              <span class="gstin-status-icon" style="position:absolute; right:10px; font-size:1.2rem;"></span>
            </div>
            <div class="field-hint branch-gstin-hint" style="color:var(--text-muted);">Format: [State Code][10-digit PAN][1-char entity][1-char Z][1 alphanumeric check]</div>
            <div class="field-hint branch-gstin-error" style="color:var(--status-danger); display:none; font-weight:600; margin-top:0.2rem;"></div>
          </div>
          <div class="form-group">
            <label>GST Registration Type</label>
            <select class="form-control branch-gst-type">
              <option value="Regular">Regular</option>
              <option value="Composition">Composition</option>
              <option value="Exempt">Exempt</option>
            </select>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-color); margin:1rem 0; padding-top:1rem;">
          <strong style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:0.75rem;">Branch Finance POC</strong>
          <div class="form-row">
            <div class="form-group">
              <label>Name <span style="color:var(--status-danger);">*</span></label>
              <input type="text" class="form-control branch-poc-name" required>
            </div>
            <div class="form-group">
              <label>Email <span style="color:var(--status-danger);">*</span></label>
              <input type="email" class="form-control branch-poc-email" required>
            </div>
            <div class="form-group">
              <label>Phone <span style="color:var(--status-danger);">*</span></label>
              <input type="tel" class="form-control branch-poc-phone" maxlength="10" required>
            </div>
          </div>
        </div>

        <div style="background:#F0F9FF; padding:0.75rem; border-radius:var(--radius-sm); border:1px solid #BAE6FD;">
          <label style="display:flex; align-items:center; gap:0.5rem; margin:0; cursor:pointer;">
            <input type="radio" name="primary-billing-branch" class="branch-primary-radio" onchange="handlePrimaryBranchChange('${branchId}')" ${isFirst ? 'checked' : ''}>
            <span style="font-size:0.85rem; font-weight:600;">Primary Billing Branch</span>
          </label>
        </div>
      `;
      
      container.appendChild(card);
      updateRemoveButtons();

      if (seedData) {
        card.querySelector('.branch-name').value = seedData.name || '';
        card.querySelector('.branch-code').value = seedData.code || '';
        card.querySelector('.branch-addr1').value = seedData.addr1 || '';
        card.querySelector('.branch-addr2').value = seedData.addr2 || '';
        card.querySelector('.branch-city').value = seedData.city || '';
        card.querySelector('.branch-state').value = seedData.state || '';
        card.querySelector('.branch-pin').value = seedData.pin || '';
        card.querySelector('.branch-gstin').value = seedData.gstin || '';
        card.querySelector('.branch-gst-type').value = seedData.gstType || 'Regular';
        card.querySelector('.branch-poc-name').value = seedData.pocName || '';
        card.querySelector('.branch-poc-email').value = seedData.pocEmail || '';
        card.querySelector('.branch-poc-phone').value = seedData.pocPhone || '';
        if (seedData.isPrimary) {
          card.querySelector('.branch-primary-radio').checked = true;
          handlePrimaryBranchChange(branchId);
        }
        validateBranchGSTIN(branchId);
      }
    }

    function updateRemoveButtons() {
      const cards = document.querySelectorAll('.client-branch-card');
      cards.forEach(card => {
        const btn = card.querySelector('.btn-remove-branch');
        if (cards.length === 1) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'block';
        }
      });
    }

    function removeClientBranch(branchId) {
      const card = document.getElementById(branchId);
      if (!card) return;
      const isPrimary = card.querySelector('.branch-primary-radio').checked;
      card.remove();
      updateRemoveButtons();
      if (isPrimary) {
        showToast('⚠️ Removing the primary branch — please select a new primary branch.');
        const remaining = document.querySelector('.client-branch-card');
        if (remaining) remaining.querySelector('.branch-primary-radio').checked = true;
      }
    }

    function handlePrimaryBranchChange(branchId) {
      // Radio buttons naturally handle mutual exclusion because they share the same 'name' attribute.
    }

    function updateBranchCode(branchId) {
      const card = document.getElementById(branchId);
      const name = card.querySelector('.branch-name').value.trim();
      const codeInput = card.querySelector('.branch-code');
      if (name.length >= 3) {
        const prefix = name.substring(0, 3).toUpperCase();
        const idx = branchId.split('-').pop().padStart(2, '0');
        codeInput.value = `${prefix}-${idx}`;
      } else {
        codeInput.value = '';
      }
    }

    function validateBranchGSTIN(branchId) {
      const card = document.getElementById(branchId);
      if (!card) return false;
      
      const gstinInput = card.querySelector('.branch-gstin');
      const stateSelect = card.querySelector('.branch-state');
      const errorDiv = card.querySelector('.branch-gstin-error');
      const iconSpan = card.querySelector('.gstin-status-icon');
      
      const gstin = gstinInput.value.trim().toUpperCase();
      const state = stateSelect.value;
      
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
      iconSpan.textContent = '';
      gstinInput.classList.remove('invalid', 'valid');
      card.removeAttribute('data-gstin-error');

      if (!gstin) return true; // empty checked by required field logic elsewhere

      if (gstin.length !== 15) {
        errorDiv.textContent = 'GSTIN must be exactly 15 characters.';
        errorDiv.style.display = 'block';
        gstinInput.classList.add('invalid');
        iconSpan.textContent = '❌';
        card.setAttribute('data-gstin-error', 'true');
        return false;
      }

      if (state && gstStateCodes[state]) {
        const expectedCode = gstStateCodes[state];
        const actualCode = gstin.substring(0, 2);
        if (actualCode !== expectedCode) {
          errorDiv.textContent = `GSTIN state code [${actualCode}] does not match selected state ${state} (expected [${expectedCode}]).`;
          errorDiv.style.display = 'block';
          gstinInput.classList.add('invalid');
          iconSpan.textContent = '❌';
          card.setAttribute('data-gstin-error', 'true');
          return false;
        }
      }

      gstinInput.classList.add('valid');
      iconSpan.textContent = '✅';
      return true;
    }

    function checkAllBranchesGSTIN() {
      let isValid = true;
      document.querySelectorAll('.client-branch-card').forEach(card => {
        const ok = validateBranchGSTIN(card.id);
        if (!ok) isValid = false;
      });
      return isValid;
    }

    // Initialize first step display on load
    (function __initPage() {
      // Seed Demo Branches
      addClientBranch({
        name: 'Chennai Office',
        code: 'CHE-01',
        addr1: '14 Anna Salai, Nandanam',
        addr2: '',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pin: '600035',
        gstin: '33AABCT1332L1ZQ',
        gstType: 'Regular',
        pocName: 'Vikas Mehta',
        pocEmail: 'vikas.mehta@mahindra.com',
        pocPhone: '9884123456',
        isPrimary: true
      });
      addClientBranch({
        name: 'Mumbai HQ',
        code: 'MUM-01',
        addr1: 'Mahindra Towers, BKC',
        addr2: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin: '400051',
        gstin: '27AABCT1332L1ZA',
        gstType: 'Regular',
        pocName: 'Priya Nair',
        pocEmail: 'priya.nair@mahindra.com',
        pocPhone: '9820987654',
        isPrimary: false
      });

      setTimeout(() => {
        showStep(1);
      }, 100);
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
