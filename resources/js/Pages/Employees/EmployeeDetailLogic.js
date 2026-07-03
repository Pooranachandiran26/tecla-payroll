// Auto-extracted logic for EmployeeDetail

// Expose functions globally for React inline handlers
window.openEditPanel = openEditPanel;
window.closeEditPanel = closeEditPanel;
window.handleOverlayClick = handleOverlayClick;
window.onNameChange = onNameChange;
window.onNameDocUploaded = onNameDocUploaded;
window.onDesignationChange = onDesignationChange;
window.validateEpEmail = validateEpEmail;
window.validateEpPhone = validateEpPhone;
window.validateEpEmergency = validateEpEmergency;
window.updateEpSaveButton = updateEpSaveButton;
window.saveEditProfile = saveEditProfile;
window.showDesigLogBanner = showDesigLogBanner;
window.switchTab = switchTab;
window.togglePayrollRunSim = togglePayrollRunSim;
window.openRegimeModal = openRegimeModal;
window.closeRegimeModal = closeRegimeModal;
window.saveRegimeChange = saveRegimeChange;
window.calc80C = calc80C;
window.calc80D = calc80D;
window.toggleHraSim = toggleHraSim;
window.calcHRA = calcHRA;
window.calcSec24b = calcSec24b;
window.openProofModal = openProofModal;
window.closeProofModal = closeProofModal;
window.submitProofUpload = submitProofUpload;
window.toggleTrueUpSim = toggleTrueUpSim;
window.previewForm16 = previewForm16;
window.downloadForm16 = downloadForm16;
window.togglePriorEmpSim = togglePriorEmpSim;
window.updateDocProgress = updateDocProgress;
window.previewDocument = previewDocument;
window.downloadDocument = downloadDocument;
window.approveDocument = approveDocument;
window.openRejectModal = openRejectModal;
window.closeRejectModal = closeRejectModal;
window.confirmRejectDoc = confirmRejectDoc;
window.uploadMissingDoc = uploadMissingDoc;
window.toggleBreakup = toggleBreakup;
window.changeAttendanceMonth = changeAttendanceMonth;
window.onAttendanceMonthSelect = onAttendanceMonthSelect;
window.openAddDocModal = openAddDocModal;
window.closeAddDocModal = closeAddDocModal;
window.submitAddDoc = submitAddDoc;
window.toggleNewLoanForm = toggleNewLoanForm;
window.submitNewAdvance = submitNewAdvance;


    // ════════════════════════════════════════════
    //  EDIT PANEL STATE
    // ════════════════════════════════════════════
    const ORIGINAL_NAME        = 'Aarav Sharma';
    const ORIGINAL_DESIGNATION = 'Senior Developer';

    let nameChanged       = false;
    let nameDocAttached   = false;
    let designationChanged= false;
    let epHasError        = false;

    // ── Open / Close ──
    function openEditPanel() {
      document.getElementById('edit-panel-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeEditPanel() {
      document.getElementById('edit-panel-overlay').classList.remove('open');
      document.body.style.overflow = '';
    }
    function handleOverlayClick(e) {
      if (e.target === document.getElementById('edit-panel-overlay')) closeEditPanel();
    }

    // ── Name Change ──
    function onNameChange() {
      const current = document.getElementById('ep-name').value.trim();
      nameChanged = current !== ORIGINAL_NAME;
      const uploadBlock = document.getElementById('name-doc-upload');
      if (nameChanged) {
        uploadBlock.classList.add('show');
        nameDocAttached = false; // reset until re-uploaded
      } else {
        uploadBlock.classList.remove('show');
        nameDocAttached = true;
      }
      updateEpSaveButton();
    }

    function onNameDocUploaded() {
      const file = document.getElementById('name-doc-file').files[0];
      nameDocAttached = !!file;
      const msgEl = document.getElementById('msg-name-doc');
      if (nameDocAttached) {
        msgEl.textContent = `✓ Document attached: ${file.name}`;
        msgEl.style.color = 'var(--status-success)';
      } else {
        msgEl.textContent = 'Document required — Save is disabled until uploaded.';
        msgEl.style.color = 'var(--status-warning)';
      }
      updateEpSaveButton();
    }

    // ── Designation Change ──
    function onDesignationChange() {
      const current = document.getElementById('ep-designation').value.trim();
      designationChanged = current !== ORIGINAL_DESIGNATION;
      const note = document.getElementById('desig-changed-note');
      if (designationChanged) {
        note.classList.add('show');
      } else {
        note.classList.remove('show');
      }
    }

    // ── Email validation ──
    function validateEpEmail() {
      const val = document.getElementById('ep-email').value.trim();
      const msg = document.getElementById('ep-msg-email');
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!val || !emailRe.test(val)) {
        msg.textContent = '⛔ Enter a valid email address.';
        msg.classList.add('show');
        epHasError = true;
      } else {
        msg.textContent = '';
        msg.classList.remove('show');
        epHasError = false;
      }
      updateEpSaveButton();
    }

    // ── Phone validation ──
    function validateEpPhone() {
      const val = document.getElementById('ep-phone').value.trim();
      const msg = document.getElementById('ep-msg-phone');
      if (!val || !/^\d{10}$/.test(val)) {
        msg.textContent = '⛔ Phone must be exactly 10 digits.';
        msg.classList.add('show');
        epHasError = true;
      } else {
        msg.textContent = '';
        msg.classList.remove('show');
        epHasError = false;
      }
      validateEpEmergency();
      updateEpSaveButton();
    }

    // ── Emergency contact conflict ──
    function validateEpEmergency() {
      const phone = document.getElementById('ep-phone').value.trim();
      const emerg = document.getElementById('ep-emergency').value.trim();
      const msg   = document.getElementById('ep-msg-emergency');
      if (phone && emerg && phone === emerg) {
        msg.textContent = '⚠ Emergency contact should not be the employee\'s own number.';
        msg.classList.add('show');
        msg.style.color = 'var(--status-warning)';
      } else {
        msg.textContent = '';
        msg.classList.remove('show');
      }
    }

    // ── Save button state ──
    function updateEpSaveButton() {
      const btn = document.getElementById('ep-save-btn');
      const blocked = epHasError || (nameChanged && !nameDocAttached);
      btn.disabled = blocked;
      btn.style.opacity = blocked ? '0.5' : '';
      btn.style.cursor  = blocked ? 'not-allowed' : '';
      btn.title = blocked
        ? (nameChanged && !nameDocAttached
            ? 'Upload a supporting document for the name change before saving'
            : 'Fix errors before saving')
        : '';
    }

    // ── Save & apply to profile display ──
    function saveEditProfile() {
      const newName   = document.getElementById('ep-name').value.trim();
      const newDesig  = document.getElementById('ep-designation').value.trim();
      const newEmail  = document.getElementById('ep-email').value.trim();
      const newPhone  = document.getElementById('ep-phone').value.trim();
      const newEmerg  = document.getElementById('ep-emergency').value.trim();
      const newAddr   = document.getElementById('ep-address').value.trim();

      // Update display
      document.getElementById('page-emp-name').textContent  = newName;
      document.getElementById('display-designation').textContent = newDesig;
      document.getElementById('display-email').textContent  = newEmail;
      document.getElementById('display-phone').textContent  = newPhone;
      document.getElementById('display-emergency').textContent = newEmerg;
      document.getElementById('display-address').textContent= newAddr;

      // If designation changed without salary revision, show a flash banner
      if (designationChanged) {
        showDesigLogBanner(newDesig);
      }

      closeEditPanel();
    }

    // ── Designation-change activity log banner ──
    function showDesigLogBanner(newDesig) {
      const existing = document.getElementById('desig-log-toast');
      if (existing) existing.remove();

      const banner = document.createElement('div');
      banner.id = 'desig-log-toast';
      banner.style.cssText = `
        position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
        background: var(--status-warning-bg); border: 1px solid var(--status-warning);
        border-left: 4px solid var(--status-warning);
        color: var(--status-warning); font-size: 0.82rem; font-weight: 500;
        padding: 0.75rem 1.25rem; border-radius: var(--radius-md);
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        z-index: 9999; max-width: 480px; line-height: 1.5;
        animation: fadeIn 0.25s ease;
      `;
      banner.innerHTML = `
        ⚠ <strong>Activity logged:</strong> "Designation changed for Aarav Sharma to '${newDesig}' without a concurrent salary revision — verify if a pay change is also needed."
        <a href="activity-log.html" style="color:var(--status-warning);font-weight:600;text-decoration:underline;margin-left:0.4rem;">View Log →</a>
        <button onclick="this.parentElement.remove()" style="float:right;background:none;border:none;cursor:pointer;color:var(--status-warning);font-size:1rem;margin-left:1rem;line-height:1;">×</button>
      `;
      document.body.appendChild(banner);

      setTimeout(() => { if (banner.parentNode) banner.remove(); }, 9000);
    }

    // ── Init ──
    (function __initPage() {
      updateEpSaveButton();
    });

    // ════════════════════════════════════════════
    //  TAX DECLARATION TAB LOGIC
    // ════════════════════════════════════════════
    let currentTaxRegime = 'new';
    let isPayrollAlreadyRun = false;
    let activeProofTargetDoc = '';
    let activeProofTargetStatus = '';

    function switchTab(targetTab) {
      const header = document.querySelector(`.tab-headers li[data-tab="${targetTab}"]`);
      if (header) header.click();
    }

    function togglePayrollRunSim() {
      isPayrollAlreadyRun = document.getElementById('sim-payroll-run').checked;
      alert(`Simulation mode updated: First payroll run for FY 2025-26 is now set to ${isPayrollAlreadyRun ? 'TRUE (Regime Locked)' : 'FALSE (Regime Unlocked)'}.`);
    }

    function openRegimeModal() {
      const modal = document.getElementById('regime-change-modal');
      const blockMsg = document.getElementById('regime-block-msg');
      const formBox = document.getElementById('regime-form-box');

      if (isPayrollAlreadyRun) {
        blockMsg.style.display = 'block';
        formBox.style.display = 'none';
      } else {
        blockMsg.style.display = 'none';
        formBox.style.display = 'block';
        document.getElementById('regime-select-dropdown').value = currentTaxRegime;
      }

      if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
    }

    function closeRegimeModal() {
      const modal = document.getElementById('regime-change-modal');
      if (modal) modal.classList.remove('active');
    }

    function saveRegimeChange() {
      const selected = document.getElementById('regime-select-dropdown').value;
      currentTaxRegime = selected;

      const badge = document.getElementById('tax-regime-badge');
      const invStatus = document.getElementById('inv-regime-status');
      const newNote = document.getElementById('new-regime-note');
      const oldForm = document.getElementById('old-regime-form');
      const stdDed = document.getElementById('summary-std-ded');
      const npsCap = document.getElementById('summary-nps-cap');
      const npsNote = document.getElementById('nps-cap-note');

      if (selected === 'new') {
        badge.textContent = 'Current Regime: New Tax Regime';
        invStatus.className = 'badge badge-info';
        invStatus.textContent = 'Disabled (New Regime Active)';
        newNote.style.display = 'block';
        oldForm.style.display = 'none';
        stdDed.textContent = '₹75,000';
        npsCap.textContent = '14% of Basic';
        npsNote.textContent = '14% of Basic Salary (New Tax Regime)';
      } else {
        badge.textContent = 'Current Regime: Old Tax Regime';
        invStatus.className = 'badge badge-success';
        invStatus.textContent = 'Enabled (Old Regime Active)';
        newNote.style.display = 'none';
        oldForm.style.display = 'flex';
        stdDed.textContent = '₹50,000';
        npsCap.textContent = '10% of Basic';
        npsNote.textContent = '10% of Basic Salary (Old Tax Regime)';
        calc80C();
        calc80D();
        calcHRA();
        calcSec24b();
      }

      closeRegimeModal();
      alert(`Tax regime successfully updated to ${selected === 'new' ? 'New Tax Regime' : 'Old Tax Regime'}.`);
    }

    // ── 80C Calculation ──
    function calc80C() {
      const pf = parseFloat(document.getElementById('val-80c-pf').value) || 0;
      const elss = parseFloat(document.getElementById('val-80c-elss').value) || 0;
      const lic = parseFloat(document.getElementById('val-80c-lic').value) || 0;
      const ppf = parseFloat(document.getElementById('val-80c-ppf').value) || 0;

      const total = pf + elss + lic + ppf;
      const totalSpan = document.getElementById('sec80c-total');
      const note = document.getElementById('sec80c-excess-note');

      totalSpan.textContent = `₹${total.toLocaleString('en-IN')}`;

      if (total > 150000) {
        totalSpan.style.textDecoration = 'line-through';
        totalSpan.style.color = 'var(--status-warning)';
        note.style.display = 'block';
      } else {
        totalSpan.style.textDecoration = 'none';
        totalSpan.style.color = 'var(--primary-navy)';
        note.style.display = 'none';
      }
    }

    // ── 80D Calculation ──
    function calc80D() {
      const selfVal = parseFloat(document.getElementById('val-80d-self').value) || 0;
      const parentsVal = parseFloat(document.getElementById('val-80d-parents').value) || 0;

      const noteSelf = document.getElementById('note-80d-self');
      const badgeSelf = document.getElementById('cap-80d-self');
      if (selfVal > 25000) {
        noteSelf.style.display = 'block';
        badgeSelf.className = 'badge badge-warning';
      } else {
        noteSelf.style.display = 'none';
        badgeSelf.className = 'badge badge-success';
      }

      const noteParents = document.getElementById('note-80d-parents');
      const badgeParents = document.getElementById('cap-80d-parents');
      if (parentsVal > 50000) {
        noteParents.style.display = 'block';
        badgeParents.className = 'badge badge-warning';
      } else {
        noteParents.style.display = 'none';
        badgeParents.className = 'badge badge-success';
      }
    }

    // ── HRA Calculation ──
    function toggleHraSim() {
      const val = document.getElementById('sim-hra-val').value;
      const note = document.getElementById('hra-disabled-note');
      const fields = document.getElementById('hra-active-fields');

      if (val === '0') {
        note.style.display = 'block';
        fields.style.pointerEvents = 'none';
        fields.style.opacity = '0.5';
      } else {
        note.style.display = 'none';
        fields.style.pointerEvents = 'auto';
        fields.style.opacity = '1';
      }
    }

    function calcHRA() {
      const rent = parseFloat(document.getElementById('hra-rent').value) || 0;
      const panVal = document.getElementById('hra-pan').value.trim();
      const annualRent = rent * 12;

      document.getElementById('hra-annual-rent').textContent = `₹${annualRent.toLocaleString('en-IN')}`;

      const asterisk = document.getElementById('hra-pan-asterisk');
      const reqNote = document.getElementById('hra-pan-req-note');
      const err = document.getElementById('hra-pan-err');

      if (annualRent > 100000) {
        asterisk.style.display = 'inline';
        reqNote.style.display = 'block';
        if (!panVal) {
          err.style.display = 'block';
        } else {
          err.style.display = 'none';
        }
      } else {
        asterisk.style.display = 'none';
        reqNote.style.display = 'none';
        err.style.display = 'none';
      }
    }

    // ── Sec 24b Calculation ──
    function calcSec24b() {
      const val = parseFloat(document.getElementById('val-sec24b').value) || 0;
      const note = document.getElementById('note-sec24b');
      const badge = document.getElementById('cap-sec24b');

      if (val > 200000) {
        note.style.display = 'block';
        badge.className = 'badge badge-warning';
      } else {
        note.style.display = 'none';
        badge.className = 'badge badge-success';
      }
    }

    // ── Proof Modal Logic ──
    function openProofModal(itemName, docId, statusId) {
      activeProofTargetDoc = docId;
      activeProofTargetStatus = statusId;
      document.getElementById('proof-modal-title').textContent = `Upload Proof: ${itemName}`;
      document.getElementById('proof-file-input').value = '';
      const modal = document.getElementById('proof-upload-modal');
      if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
    }

    function closeProofModal() {
      const modal = document.getElementById('proof-upload-modal');
      if (modal) modal.classList.remove('active');
    }

    function submitProofUpload() {
      const input = document.getElementById('proof-file-input');
      if (!input.files || input.files.length === 0) {
        alert('Please select a valid document file to upload.');
        return;
      }
      const fileName = input.files[0].name;

      if (activeProofTargetDoc && activeProofTargetStatus) {
        document.getElementById(activeProofTargetDoc).textContent = fileName;
        document.getElementById(activeProofTargetStatus).innerHTML = `<span class="badge badge-warning">Proof Submitted</span>`;
      }

      closeProofModal();
      alert(`Proof document (${fileName}) uploaded successfully. Status updated to Proof Submitted.`);
    }

    // ── Toggle True-Up Scenario ──
    function toggleTrueUpSim() {
      const rowRec = document.getElementById('trueup-recovery-row');
      const rowRef = document.getElementById('trueup-refund-row');
      if (rowRec.style.display !== 'none') {
        rowRec.style.display = 'none';
        rowRef.style.display = 'table-row';
        alert('True-up simulation toggled to: TDS Refund Adjustment (Green).');
      } else {
        rowRec.style.display = 'table-row';
        rowRef.style.display = 'none';
        alert('True-up simulation toggled to: Additional TDS Recovery (Red).');
      }
    }

    // ── Form 16 Mockup ──
    function previewForm16() {
      alert('Generating Form 16 (Part A & B) secure PDF preview for Aarav Sharma...\nDigital signature verified.');
    }
    function downloadForm16() {
      alert('📥 Form16_FY2025-26_AaravSharma.pdf downloaded successfully.');
    }

    // ════════════════════════════════════════════
    //  DOCUMENTS & KYC CHECKLIST LOGIC
    // ════════════════════════════════════════════
    let docStatuses = {
      pan: 'Verified',
      aadhaar: 'Verified',
      bank: 'Verified',
      offer: 'Verified',
      photo: 'Verified',
      relieving: 'Pending',
      payslips: 'Pending',
      form16: 'Missing'
    };

    let currentRejectDocId = '';
    let currentRejectDocName = '';

    function togglePriorEmpSim() {
      const isPrior = document.getElementById('sim-prior-emp').checked;
      document.getElementById('prior-emp-label').textContent = isPrior ? 'Yes' : 'No';
      
      document.querySelectorAll('.cond-doc-row').forEach(row => {
        row.style.display = isPrior ? 'table-row' : 'none';
      });

      updateDocProgress();
    }

    let customMandatoryDocs = [];
    function updateDocProgress() {
      const isPrior = document.getElementById('sim-prior-emp').checked;
      
      let totalMandatory = (isPrior ? 7 : 5) + customMandatoryDocs.length; 
      let verifiedCount = 0;
      if (docStatuses.pan === 'Verified') verifiedCount++;
      if (docStatuses.aadhaar === 'Verified') verifiedCount++;
      if (docStatuses.bank === 'Verified') verifiedCount++;
      if (docStatuses.offer === 'Verified') verifiedCount++;
      if (docStatuses.photo === 'Verified') verifiedCount++;
      if (isPrior && docStatuses.relieving === 'Verified') verifiedCount++;
      if (isPrior && docStatuses.payslips === 'Verified') verifiedCount++;

      customMandatoryDocs.forEach(id => {
        if (docStatuses[id] === 'Verified') verifiedCount++;
      });

      const progressText = document.getElementById('doc-progress-text');
      const progressBar = document.getElementById('doc-progress-bar');
      const progressNote = document.getElementById('doc-progress-note');

      progressText.textContent = `${verifiedCount} of ${totalMandatory} mandatory documents verified`;
      const pct = Math.min(100, Math.round((verifiedCount / totalMandatory) * 100));
      progressBar.style.width = pct + '%';

      if (verifiedCount >= totalMandatory) {
        progressBar.style.backgroundColor = 'var(--status-success)';
        progressNote.style.color = 'var(--status-success)';
        progressNote.innerHTML = '✓ All mandatory documents verified. Employee is eligible for Active status.';
      } else {
        progressBar.style.backgroundColor = 'var(--status-warning)';
        progressNote.style.color = 'var(--status-warning)';
        progressNote.innerHTML = '⚠ Employee cannot be moved to Active status until all mandatory documents are Verified';
      }
    }

    function previewDocument(name) {
      alert(`Generating secure preview for ${name}...\nAll digital signatures and timestamps verified.`);
    }

    function downloadDocument(name) {
      alert(`📥 ${name}.pdf downloaded successfully.`);
    }

    function approveDocument(docId) {
      docStatuses[docId] = 'Verified';
      const statusTd = document.getElementById(`status-${docId}`);
      const actionsTd = document.getElementById(`actions-${docId}`);
      
      if (statusTd) statusTd.innerHTML = '<span class="badge badge-success">Verified</span>';
      if (actionsTd) {
        actionsTd.innerHTML = `
          <button class="btn btn-secondary btn-xs" onclick="previewDocument('${docId}')">Preview</button>
          <button class="btn btn-link btn-xs" style="margin-left: 0.5rem;" onclick="downloadDocument('${docId}')">Download</button>
        `;
      }
      updateDocProgress();
    }

    function openRejectModal(docId, docName) {
      currentRejectDocId = docId;
      currentRejectDocName = docName;
      document.getElementById('reject-doc-title').textContent = `Reject ${docName}`;
      document.getElementById('reject-reason-input').value = '';
      const modal = document.getElementById('doc-reject-modal');
      modal.style.display = 'flex';
      modal.classList.add('active');
    }

    function closeRejectModal() {
      const modal = document.getElementById('doc-reject-modal');
      modal.classList.remove('active');
    }

    function confirmRejectDoc() {
      const reason = document.getElementById('reject-reason-input').value.trim();
      if (!reason) {
        alert('Please enter a mandatory rejection reason.');
        return;
      }

      docStatuses[currentRejectDocId] = 'Rejected';
      const statusTd = document.getElementById(`status-${currentRejectDocId}`);
      const actionsTd = document.getElementById(`actions-${currentRejectDocId}`);

      if (statusTd) {
        statusTd.innerHTML = `<span class="badge badge-danger" style="border: 1px solid var(--status-danger); background: #FFF5F5; color: var(--status-danger);">Rejected</span>`;
      }
      if (actionsTd) {
        actionsTd.innerHTML = `
          <button class="btn btn-navy btn-xs" onclick="uploadMissingDoc('${currentRejectDocId}', '${currentRejectDocName}')">📤 Re-upload Document</button>
        `;
      }

      closeRejectModal();
      alert(`Document rejected successfully. Reason logged: "${reason}". Notification sent to candidate portal.`);
      updateDocProgress();
    }

    function uploadMissingDoc(docId, docName) {
      alert(`Opening secure file selection dialog for ${docName}...\nDocument uploaded successfully. Status updated to Pending Verification.`);
      docStatuses[docId] = 'Pending';
      const statusTd = document.getElementById(`status-${docId}`);
      const actionsTd = document.getElementById(`actions-${docId}`);
      if (statusTd) statusTd.innerHTML = '<span class="badge badge-warning">Pending Verification</span>';
      if (actionsTd) {
        actionsTd.innerHTML = `
          <div style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
            <button class="btn btn-secondary btn-xs" onclick="previewDocument('${docName}')">Preview</button>
            <span style="color: var(--border-color);">|</span>
            <button class="btn btn-xs" style="background-color: var(--status-success); color: white;" onclick="approveDocument('${docId}')">✓ Approve</button>
            <button class="btn btn-danger btn-xs" onclick="openRejectModal('${docId}', '${docName}')">✕ Reject</button>
          </div>
        `;
      }
      updateDocProgress();
    }
  


    // ── Breakup Toggle ──
    function toggleBreakup(id) {
      const row = document.getElementById(id);
      if (row) {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
      }
    }

    // ── Attendance Month Navigation ──
    const attendanceData = [
      {
        month: "April 2026",
        present: "20 (+1 Half)", leave: "1", absent: "0", total: "22",
        days: [
          {num: 1, type: "present", label: "Present"}, {num: 2, type: "present", label: "Present"}, {num: 3, type: "present", label: "Present"}, {num: 4, type: "other-month", label: "Wknd"}, {num: 5, type: "other-month", label: "Wknd"},
          {num: 6, type: "present", label: "Present"}, {num: 7, type: "present", label: "Present"}, {num: 8, type: "present", label: "Present"}, {num: 9, type: "present", label: "Present"}, {num: 10, type: "half-day", label: "Half-day"}, {num: 11, type: "other-month", label: "Wknd"}, {num: 12, type: "other-month", label: "Wknd"},
          {num: 13, type: "present", label: "Present"}, {num: 14, type: "present", label: "Present"}, {num: 15, type: "present", label: "Present"}, {num: 16, type: "present", label: "Present"}, {num: 17, type: "present", label: "Present"}, {num: 18, type: "other-month", label: "Wknd"}, {num: 19, type: "other-month", label: "Wknd"},
          {num: 20, type: "present", label: "Present"}, {num: 21, type: "present", label: "Present"}, {num: 22, type: "present", label: "Present"}, {num: 23, type: "present", label: "Present"}, {num: 24, type: "leave", label: "On Leave"}, {num: 25, type: "other-month", label: "Wknd"}, {num: 26, type: "other-month", label: "Wknd"},
          {num: 27, type: "present", label: "Present"}, {num: 28, type: "present", label: "Present"}, {num: 29, type: "present", label: "Present"}, {num: 30, type: "present", label: "Present"}
        ]
      },
      {
        month: "May 2026",
        present: "21", leave: "2", absent: "0", total: "23",
        days: [
          {num: 1, type: "present", label: "Present"}, {num: 2, type: "other-month", label: "Wknd"}, {num: 3, type: "other-month", label: "Wknd"},
          {num: 4, type: "present", label: "Present"}, {num: 5, type: "present", label: "Present"}, {num: 6, type: "present", label: "Present"}, {num: 7, type: "present", label: "Present"}, {num: 8, type: "present", label: "Present"}, {num: 9, type: "other-month", label: "Wknd"}, {num: 10, type: "other-month", label: "Wknd"},
          {num: 11, type: "present", label: "Present"}, {num: 12, type: "present", label: "Present"}, {num: 13, type: "present", label: "Present"}, {num: 14, type: "present", label: "Present"}, {num: 15, type: "present", label: "Present"}, {num: 16, type: "other-month", label: "Wknd"}, {num: 17, type: "other-month", label: "Wknd"},
          {num: 18, type: "present", label: "Present"}, {num: 19, type: "present", label: "Present"}, {num: 20, type: "present", label: "Present"}, {num: 21, type: "leave", label: "On Leave"}, {num: 22, type: "leave", label: "On Leave"}, {num: 23, type: "other-month", label: "Wknd"}, {num: 24, type: "other-month", label: "Wknd"},
          {num: 25, type: "present", label: "Present"}, {num: 26, type: "present", label: "Present"}, {num: 27, type: "present", label: "Present"}, {num: 28, type: "present", label: "Present"}, {num: 29, type: "present", label: "Present"}, {num: 30, type: "other-month", label: "Wknd"}, {num: 31, type: "other-month", label: "Wknd"}
        ]
      },
      {
        month: "June 2026",
        present: "19 (+1 Half)", leave: "1", absent: "1", total: "22",
        days: [
          {num: 1, type: "present", label: "Present"}, {num: 2, type: "present", label: "Present"}, {num: 3, type: "present", label: "Present"}, {num: 4, type: "present", label: "Present"}, {num: 5, type: "present", label: "Present"}, {num: 6, type: "other-month", label: "Wknd"}, {num: 7, type: "other-month", label: "Wknd"},
          {num: 8, type: "present", label: "Present"}, {num: 9, type: "present", label: "Present"}, {num: 10, type: "present", label: "Present"}, {num: 11, type: "present", label: "Present"}, {num: 12, type: "half-day", label: "Half-day"}, {num: 13, type: "other-month", label: "Wknd"}, {num: 14, type: "other-month", label: "Wknd"},
          {num: 15, type: "present", label: "Present"}, {num: 16, type: "present", label: "Present"}, {num: 17, type: "present", label: "Present"}, {num: 18, type: "present", label: "Present"}, {num: 19, type: "absent", label: "Absent"}, {num: 20, type: "other-month", label: "Wknd"}, {num: 21, type: "other-month", label: "Wknd"},
          {num: 22, type: "present", label: "Present"}, {num: 23, type: "leave", label: "On Leave"}, {num: 24, type: "present", label: "Present"}, {num: 25, type: "present", label: "Present"}, {num: 26, type: "present", label: "Present"}, {num: 27, type: "other-month", label: "Wknd"}, {num: 28, type: "other-month", label: "Wknd"},
          {num: 29, type: "present", label: "Present"}, {num: 30, type: "present", label: "Present"}
        ]
      },
      {
        month: "July 2026",
        present: "22", leave: "1", absent: "0", total: "23",
        days: [
          {num: 1, type: "present", label: "Present"}, {num: 2, type: "present", label: "Present"}, {num: 3, type: "present", label: "Present"}, {num: 4, type: "other-month", label: "Wknd"}, {num: 5, type: "other-month", label: "Wknd"},
          {num: 6, type: "present", label: "Present"}, {num: 7, type: "present", label: "Present"}, {num: 8, type: "present", label: "Present"}, {num: 9, type: "present", label: "Present"}, {num: 10, type: "present", label: "Present"}, {num: 11, type: "other-month", label: "Wknd"}, {num: 12, type: "other-month", label: "Wknd"},
          {num: 13, type: "present", label: "Present"}, {num: 14, type: "present", label: "Present"}, {num: 15, type: "present", label: "Present"}, {num: 16, type: "present", label: "Present"}, {num: 17, type: "leave", label: "On Leave"}, {num: 18, type: "other-month", label: "Wknd"}, {num: 19, type: "other-month", label: "Wknd"},
          {num: 20, type: "present", label: "Present"}, {num: 21, type: "present", label: "Present"}, {num: 22, type: "present", label: "Present"}, {num: 23, type: "present", label: "Present"}, {num: 24, type: "present", label: "Present"}, {num: 25, type: "other-month", label: "Wknd"}, {num: 26, type: "other-month", label: "Wknd"},
          {num: 27, type: "present", label: "Present"}, {num: 28, type: "present", label: "Present"}, {num: 29, type: "present", label: "Present"}, {num: 30, type: "present", label: "Present"}, {num: 31, type: "present", label: "Present"}
        ]
      }
    ];

    function changeAttendanceMonth(dir) {
      const select = document.getElementById('attendance-month-select');
      let val = parseInt(select.value) + dir;
      if (val >= 0 && val < attendanceData.length) {
        select.value = val;
        onAttendanceMonthSelect();
      }
    }

    function onAttendanceMonthSelect() {
      const val = parseInt(document.getElementById('attendance-month-select').value);
      const data = attendanceData[val];
      
      document.getElementById('att-month-title').textContent = `Attendance Summary (${data.month})`;
      const tabHeader = document.getElementById('tab-header-attendance');
      if (tabHeader) tabHeader.textContent = `Attendance Log (${data.month.split(' ')[0]})`;

      document.getElementById('att-present-count').innerHTML = data.present;
      document.getElementById('att-leave-count').innerHTML = data.leave;
      document.getElementById('att-absent-count').innerHTML = data.absent;
      document.getElementById('att-total-count').innerHTML = data.total;

      const grid = document.getElementById('att-calendar-grid');
      if (!grid) return;
      
      let html = `
        <div class="calendar-day-header">Mon</div>
        <div class="calendar-day-header">Tue</div>
        <div class="calendar-day-header">Wed</div>
        <div class="calendar-day-header">Thu</div>
        <div class="calendar-day-header">Fri</div>
        <div class="calendar-day-header">Sat</div>
        <div class="calendar-day-header">Sun</div>
      `;

      data.days.forEach(d => {
        let colorStyle = d.type === 'other-month' ? 'style="color: #94A3B8;"' : '';
        html += `<div class="calendar-day-cell ${d.type}"><span>${d.num}</span><span class="calendar-indicator ${d.type}" ${colorStyle}>${d.label}</span></div>`;
      })();

      grid.innerHTML = html;
    }

    // ── Add Document Modal & Submission ──
    function openAddDocModal() {
      const modal = document.getElementById('add-doc-modal');
      if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
    }
    function closeAddDocModal() {
      const modal = document.getElementById('add-doc-modal');
      if (modal) modal.classList.remove('active');
    }
    function submitAddDoc() {
      const name = document.getElementById('add-doc-name').value.trim();
      const req = document.getElementById('add-doc-req').value;
      const fileInput = document.getElementById('add-doc-file');

      if (!name) {
        alert('Please enter a Document Name.');
        return;
      }
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please upload a file.');
        return;
      }

      const docId = 'custom_' + Date.now();
      docStatuses[docId] = 'Pending';
      if (req === 'Mandatory') {
        customMandatoryDocs.push(docId);
      }

      const tbody = document.getElementById('docs-tbody');
      const tr = document.createElement('tr');
      tr.id = `row-${docId}`;
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600; color: var(--primary-navy); display: flex; align-items: center; gap: 0.5rem;">
            <span>📄</span> ${name}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-left: 1.5rem;">Attached: ${fileInput.files[0].name}</div>
        </td>
        <td><span class="badge badge-neutral" style="font-size: 0.75rem;">${req}</span></td>
        <td id="status-${docId}"><span class="badge badge-warning">Pending Verification</span></td>
        <td style="text-align: right;">
          <div id="actions-${docId}" style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
            <button class="btn btn-secondary btn-xs" onclick="previewDocument('${name}')">Preview</button>
            <span style="color: var(--border-color);">|</span>
            <button class="btn btn-xs" style="background-color: var(--status-success); color: white;" onclick="approveDocument('${docId}')">✓ Approve</button>
            <button class="btn btn-danger btn-xs" onclick="openRejectModal('${docId}', '${name}')">✕ Reject</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      closeAddDocModal();
      alert(`Document "${name}" added successfully to verification checklist.`);
      updateDocProgress();
    }

    // ── Issue New Salary Advance ──
    function toggleNewLoanForm() {
      const form = document.getElementById('new-loan-form-card');
      if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
      }
    }
    function submitNewAdvance() {
      const amount = parseFloat(document.getElementById('adv-amount').value) || 0;
      const emi = parseFloat(document.getElementById('adv-emi').value) || 0;
      const start = document.getElementById('adv-start').value;
      const purpose = document.getElementById('adv-purpose').value.trim();

      const tbody = document.getElementById('agency-loans-tbody');
      const tr = document.createElement('tr');
      const advId = 'ADV-2026-' + Math.floor(100 + Math.random() * 900);
      tr.innerHTML = `
        <td>${advId}</td>
        <td>${purpose}</td>
        <td>₹${amount.toLocaleString('en-IN')}</td>
        <td>₹${emi.toLocaleString('en-IN')} / mo</td>
        <td>${start}</td>
        <td><strong style="color: var(--primary-navy);">₹${amount.toLocaleString('en-IN')}</strong></td>
        <td><span class="badge badge-warning">Active Deduction</span></td>
      `;
      tbody.appendChild(tr);

      toggleNewLoanForm();
      alert(`New Salary Advance (${advId}) for ₹${amount.toLocaleString('en-IN')} authorized successfully.`);
    }
  


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
