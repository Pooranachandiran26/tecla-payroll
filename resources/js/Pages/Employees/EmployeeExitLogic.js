// ════════════════════════════════════════════════════════
    //  WIZARD STATE & LOGIC
    // ════════════════════════════════════════════════════════
    let currentStage = 1;
    let maxStageReached = 1;
    let settlementApprovalState = 'draft'; // draft, pending, approved
    let adhocAdjustment = { amount: 0, reason: '' };

    // Initialize Dates on load
    document.addEventListener('DOMContentLoaded', () => {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('submission-date').value = today;
      
      // Default LWD to 30 days from today
      const lwdDate = new Date();
      lwdDate.setDate(lwdDate.getDate() + 30);
      document.getElementById('lwd-input').value = lwdDate.toISOString().split('T')[0];

      onExitTypeChange();
      calculateNotice();
      calculateSettlement();
    });

    // ── STAGE NAVIGATION ──
    function goToStage(stage) {
      if (stage > maxStageReached && stage !== 7 && stage !== 6) {
        // Can only click ahead if unlocked
        return;
      }
      if (stage === 6 && settlementApprovalState !== 'approved') {
        alert('Stage 6 (Confirm Exit) is locked until Stage 5 Settlement is Approved.');
        return;
      }

      // Hide all stages
      document.querySelectorAll('.wizard-stage').forEach(el => el.classList.remove('active'));
      // Show selected stage
      const target = document.getElementById(`stage-${stage}`);
      if (target) target.classList.add('active');

      currentStage = stage;
      updateStepTrackerUI();

      // Top cancel button visibility (visible 1-5, hidden 6-7)
      const topCancel = document.getElementById('top-cancel-btn');
      if (stage >= 6) {
        topCancel.style.display = 'none';
      } else {
        topCancel.style.display = 'inline-block';
      }
    }

    function completeStage(stage) {
      const nextStage = stage + 1;
      if (nextStage > maxStageReached) {
        maxStageReached = nextStage;
      }
      // Mark current tab as completed
      const currentTab = document.getElementById(`step-tab-${stage}`);
      currentTab.classList.add('completed');
      currentTab.classList.remove('active');

      const connector = document.getElementById(`connector-${stage}`);
      if (connector) connector.classList.add('completed');

      // Unlock next tab
      const nextTab = document.getElementById(`step-tab-${nextStage}`);
      if (nextTab) nextTab.classList.remove('locked');

      goToStage(nextStage);
    }

    function updateStepTrackerUI() {
      for (let i = 1; i <= 7; i++) {
        const tab = document.getElementById(`step-tab-${i}`);
        if (!tab) continue;
        
        if (i === currentStage) {
          tab.classList.add('active');
          tab.classList.remove('locked');
        } else if (i < maxStageReached || tab.classList.contains('completed')) {
          tab.classList.remove('active');
          tab.classList.remove('locked');
        } else {
          tab.classList.remove('active');
          tab.classList.add('locked');
        }
      }
    }

    // ── STAGE 1 LOGIC ──
    function onExitTypeChange() {
      const exitType = document.getElementById('exit-type').value;
      const reasonSelect = document.getElementById('exit-reason');
      reasonSelect.innerHTML = '';

      if (exitType === 'Resignation') {
        reasonSelect.innerHTML = `
          <option value="Better Opportunity">Better Opportunity</option>
          <option value="Personal Reasons">Personal Reasons</option>
          <option value="Relocation">Relocation</option>
          <option value="Other">Other</option>
        `;
      } else if (exitType === 'Termination') {
        reasonSelect.innerHTML = `
          <option value="Performance">Performance</option>
          <option value="Conduct / Policy Violation">Conduct / Policy Violation</option>
          <option value="Redundancy">Redundancy / Position Elimination</option>
        `;
      } else if (exitType === 'End of Contract') {
        reasonSelect.innerHTML = `
          <option value="Project Completed">Project Completed</option>
          <option value="Fixed Term Expired">Fixed Term Expired</option>
          <option value="Non-Renewal">Non-Renewal</option>
        `;
      } else if (exitType === 'Retirement') {
        reasonSelect.innerHTML = `
          <option value="Superannuation">Superannuation</option>
          <option value="Voluntary Retirement">Voluntary Retirement</option>
          <option value="Health Reasons">Health Reasons</option>
        `;
      } else if (exitType === 'Client-Initiated') {
        reasonSelect.innerHTML = `
          <option value="Project Roll-off">Project Roll-off</option>
          <option value="Cost Reduction">Cost Reduction</option>
          <option value="Replaced by Client">Replaced by Client</option>
        `;
      }

      calculateNotice();
      calculateSettlement();
    }

    function onDiscussedToggle() {
      const val = document.querySelector('input[name="discussed-toggle"]:checked').value;
      const summaryGroup = document.getElementById('discussion-summary-group');
      if (val === 'yes') {
        summaryGroup.style.display = 'block';
      } else {
        summaryGroup.style.display = 'none';
      }
    }

    // ── STAGE 2 LOGIC ──
    function calculateNotice() {
      const subDateStr = document.getElementById('submission-date').value;
      const lwdStr = document.getElementById('lwd-input').value;
      const exitType = document.getElementById('exit-type').value;

      if (!subDateStr || !lwdStr) return;

      const subDate = new Date(subDateStr);
      const lwd = new Date(lwdStr);
      const diffTime = lwd - subDate;
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) diffDays = 0;

      const requiredNotice = 30;
      const shortfall = requiredNotice - diffDays;
      const statusBox = document.getElementById('notice-status-box');
      const warningBanner = document.getElementById('notice-warning-banner');

      const isEmployerInitiated = (exitType === 'Termination' || exitType === 'Client-Initiated');

      if (diffDays >= requiredNotice) {
        statusBox.textContent = `Notice Served: ${diffDays} days | Shortfall: 0 days`;
        warningBanner.style.display = 'none';
      } else {
        if (isEmployerInitiated) {
          // Employer initiated under-serving = Notice Pay in Lieu (Addition)
          statusBox.textContent = `Notice Served: ${diffDays} days | Notice Pay in Lieu: ${shortfall} days`;
          warningBanner.className = 'alert-banner info';
          warningBanner.innerHTML = `ℹ️ <strong>Notice Pay in Lieu:</strong> Since this is an employer/client-initiated exit (${exitType}) with a notice shortfall of ${shortfall} days, the agency will provide Notice Pay in Lieu to the employee in the final settlement.`;
          warningBanner.style.display = 'flex';
        } else {
          // Employee initiated under-serving = Notice Period Shortfall Recovery (Deduction)
          statusBox.textContent = `Notice Served: ${diffDays} days | Shortfall: ${shortfall} days`;
          warningBanner.className = 'alert-banner amber';
          warningBanner.innerHTML = `⚠ <strong>Notice Shortfall Recovery:</strong> Employee is serving ${diffDays} days against the required 30 days. A shortfall recovery for ${shortfall} days will be deducted in the final settlement.`;
          warningBanner.style.display = 'flex';
        }
      }

      // Update Confirm LWD display
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedLwd = lwd.toLocaleDateString('en-US', options);
      document.getElementById('confirm-lwd-display').textContent = formattedLwd;
      document.getElementById('modal-letter-lwd').textContent = formattedLwd;
      document.getElementById('modal-letter-lwd2').textContent = formattedLwd;
      document.getElementById('modal-letter-date').textContent = formattedLwd;

      calculateSettlement();
    }

    // ── STAGE 3 LOGIC ──
    function checkClearance() {
      const selects = [
        document.getElementById('chk-laptop').value,
        document.getElementById('chk-idcard').value,
        document.getElementById('chk-manager').value,
        document.getElementById('chk-itaccess').value,
        document.getElementById('chk-handover').value,
        document.getElementById('chk-client').value
      ];

      // Check if any is blank
      const allMarked = selects.every(val => val !== '');
      const btnNext = document.getElementById('btn-clearance-next');
      const alertBox = document.getElementById('clearance-alert');

      if (allMarked) {
        btnNext.disabled = false;
        alertBox.className = 'alert-banner green';
        alertBox.innerHTML = '✓ <strong>Clearance Complete:</strong> All departmental items have been verified. You may proceed to the Exit Interview.';
      } else {
        btnNext.disabled = true;
        alertBox.className = 'alert-banner amber';
        alertBox.innerHTML = '⚠ <strong>Action Required:</strong> Please mark all 6 clearance items above (Yes, No, or N/A) to unlock the next stage.';
      }

      // Update select styling dynamically
      document.querySelectorAll('.status-select').forEach(sel => {
        sel.classList.remove('yes', 'no', 'na');
        if (sel.value) sel.classList.add(sel.value);
      });
    }

    // ── STAGE 4 LOGIC ──
    function setStarRating(val) {
      const stars = document.querySelectorAll('#star-rating .star');
      stars.forEach(star => {
        const starVal = parseInt(star.dataset.value);
        if (starVal <= val) {
          star.classList.add('selected');
        } else {
          star.classList.remove('selected');
        }
      });
      const text = document.getElementById('star-rating-text');
      const labels = ['Very Poor', 'Poor', 'Average', 'Very Good', 'Excellent'];
      text.textContent = `${val} / 5 Stars (${labels[val-1]})`;
    }

    function submitInterview() {
      completeStage(4);
    }
    function skipInterview() {
      completeStage(4);
    }

    // ── STAGE 5 LOGIC ──
    function calculateSettlement() {
      const basicMonthly = 22000;
      const ctcMonthly = 45000;
      const dailyBasic = Math.round(basicMonthly / 30);
      const dailyCtc = Math.round(ctcMonthly / 30);

      const exitType = document.getElementById('exit-type').value;
      const isEmployerInitiated = (exitType === 'Termination' || exitType === 'Client-Initiated');

      // Calculate notice days shortfall
      const subDateStr = document.getElementById('submission-date').value;
      const lwdStr = document.getElementById('lwd-input').value;
      let shortfallDays = 0;
      if (subDateStr && lwdStr) {
        const diffTime = new Date(lwdStr) - new Date(subDateStr);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) diffDays = 0;
        shortfallDays = 30 - diffDays;
        if (shortfallDays < 0) shortfallDays = 0;
      }

      // 1. Pending Salary
      const salaryAmount = ctcMonthly; // assuming full month or pro-rated
      document.getElementById('fnf-salary').textContent = `+₹${salaryAmount.toLocaleString('en-IN')}`;

      // 2. Leave Encashment (12 days @ daily basic)
      const leaveAmount = 12 * dailyBasic;
      document.getElementById('fnf-leave').textContent = `+₹${leaveAmount.toLocaleString('en-IN')}`;

      // 3. Notice Recovery or Pay in Lieu
      let noticeAmount = 0;
      const noticeLabel = document.getElementById('fnf-notice-label');
      const noticeNote = document.getElementById('fnf-notice-note');
      const noticeCell = document.getElementById('fnf-notice');

      if (shortfallDays > 0) {
        if (isEmployerInitiated) {
          // Addition
          noticeAmount = shortfallDays * dailyCtc;
          noticeLabel.innerHTML = '<strong>Notice Pay in Lieu (Addition)</strong>';
          noticeNote.textContent = `Agency providing pay in lieu for ${shortfallDays} days notice shortfall`;
          noticeCell.className = 'amount-pos';
          noticeCell.textContent = `+₹${noticeAmount.toLocaleString('en-IN')}`;
        } else {
          // Deduction
          noticeAmount = shortfallDays * dailyBasic; // recovery usually at basic or agreed rate
          noticeLabel.innerHTML = '<strong>Notice Period Shortfall Recovery</strong>';
          noticeNote.textContent = `Shortfall deduction for ${shortfallDays} days unserved notice`;
          noticeCell.className = 'amount-neg';
          noticeCell.textContent = `-₹${noticeAmount.toLocaleString('en-IN')}`;
        }
      } else {
        noticeLabel.innerHTML = '<strong>Notice Period Shortfall Recovery</strong>';
        noticeNote.textContent = 'Shortfall against 30 days notice requirement';
        noticeCell.className = 'amount-neg';
        noticeCell.textContent = '-₹0';
      }

      // 4. Bonus
      const bonusAmount = 12500;
      document.getElementById('fnf-bonus').textContent = `+₹${bonusAmount.toLocaleString('en-IN')}`;

      // 5. Loan Recovery
      const loanInputVal = parseFloat(document.getElementById('sim-loan').value) || 0;
      document.getElementById('fnf-loan').textContent = `-₹${loanInputVal.toLocaleString('en-IN')}`;

      // 6. Gratuity Simulation
      const yearsVal = parseFloat(document.getElementById('sim-years').value) || 4.8;
      const gratuityRow = document.getElementById('gratuity-row');
      const gratuityFlagBanner = document.getElementById('gratuity-flag-banner');
      let gratuityAmount = 0;

      if (yearsVal >= 5.0) {
        gratuityAmount = Math.round((basicMonthly / 26) * 15 * yearsVal);
        gratuityRow.style.display = 'table-row';
        document.getElementById('fnf-gratuity').textContent = `+₹${gratuityAmount.toLocaleString('en-IN')}`;
        gratuityFlagBanner.style.display = 'none';
      } else if (yearsVal >= 4.5 && yearsVal < 5.0) {
        gratuityRow.style.display = 'none';
        gratuityFlagBanner.style.display = 'flex';
        gratuityFlagBanner.innerHTML = `⚠ <strong>Gratuity Review Required:</strong> Service duration is borderline for gratuity eligibility (${yearsVal} Years) — confirm before finalizing.`;
      } else {
        gratuityRow.style.display = 'none';
        gratuityFlagBanner.style.display = 'none';
      }

      // 7. TDS
      const tdsAmount = 6200;
      document.getElementById('fnf-tds').textContent = `-₹${tdsAmount.toLocaleString('en-IN')}`;

      // 8. Adhoc
      const adhocVal = adhocAdjustment.amount;

      // Net Total Summation
      let subtotal = salaryAmount + leaveAmount + bonusAmount + gratuityAmount + adhocVal;
      if (isEmployerInitiated && shortfallDays > 0) {
        subtotal += noticeAmount;
      } else if (!isEmployerInitiated && shortfallDays > 0) {
        subtotal -= noticeAmount;
      }
      subtotal -= tdsAmount;

      // Check Loan Overflow
      const loanOverflowBanner = document.getElementById('loan-overflow-banner');
      let finalNet = subtotal - loanInputVal;
      
      if (finalNet < 0) {
        const unrecovered = Math.abs(finalNet);
        finalNet = 0; // floor at 0
        loanOverflowBanner.style.display = 'flex';
        loanOverflowBanner.innerHTML = `⛔ <strong>Loan Recovery Deficit Flag:</strong> Outstanding balance of ₹${unrecovered.toLocaleString('en-IN')} could not be fully recovered from settlement — flagged for separate finance follow-up.`;
      } else {
        loanOverflowBanner.style.display = 'none';
      }

      document.getElementById('fnf-net-total').textContent = `₹${finalNet.toLocaleString('en-IN')}`;
      document.getElementById('confirm-net-display').textContent = `₹${finalNet.toLocaleString('en-IN')}`;
    }

    function toggleAdhocRow(show) {
      const inputBox = document.getElementById('adhoc-input-box');
      const btnShow = document.getElementById('btn-show-adhoc');
      if (show) {
        inputBox.style.display = 'block';
        btnShow.style.display = 'none';
      } else {
        inputBox.style.display = 'none';
        btnShow.style.display = 'inline-block';
        document.getElementById('adhoc-error').style.display = 'none';
      }
    }

    function applyAdhoc() {
      const amtInput = document.getElementById('adhoc-amount').value;
      const reasonInput = document.getElementById('adhoc-reason').value.trim();
      const errBox = document.getElementById('adhoc-error');

      const amt = parseFloat(amtInput);

      if (isNaN(amt) || !reasonInput) {
        errBox.style.display = 'block';
        return;
      }

      errBox.style.display = 'none';
      adhocAdjustment = { amount: amt, reason: reasonInput };

      const displayRow = document.getElementById('adhoc-display-row');
      const displayReason = document.getElementById('adhoc-display-reason');
      const displayAmt = document.getElementById('fnf-adhoc');

      displayRow.style.display = 'table-row';
      displayReason.textContent = reasonInput;
      if (amt >= 0) {
        displayAmt.className = 'amount-pos';
        displayAmt.textContent = `+₹${amt.toLocaleString('en-IN')}`;
      } else {
        displayAmt.className = 'amount-neg';
        displayAmt.textContent = `-₹${Math.abs(amt).toLocaleString('en-IN')}`;
      }

      toggleAdhocRow(false);
      calculateSettlement();
    }

    function submitForApproval() {
      settlementApprovalState = 'pending';
      const badge = document.getElementById('settlement-status-badge');
      badge.className = 'badge badge-warning';
      badge.textContent = 'Pending Admin Approval';

      document.getElementById('btn-submit-approval').style.display = 'none';
      document.getElementById('btn-admin-approve').style.display = 'inline-block';
      
      alert('Settlement computation submitted successfully. Status updated to Pending Admin Approval.');
    }

    function approveSettlement() {
      settlementApprovalState = 'approved';
      const badge = document.getElementById('settlement-status-badge');
      badge.className = 'badge badge-success';
      badge.textContent = 'Approved';

      document.getElementById('btn-admin-approve').style.display = 'none';
      document.getElementById('btn-settlement-next').style.display = 'inline-block';

      alert('Settlement officially approved by Admin. Stage 6 (Confirm Exit) is now unlocked.');
      completeStage(5);
    }

    // ── STAGE 6 LOGIC ──
    function openConfirmModal() {
      const m = document.getElementById('confirm-exit-modal');
      if (m) { m.style.display = 'flex'; m.classList.add('active'); }
    }
    function closeConfirmModal() {
      const m = document.getElementById('confirm-exit-modal');
      if (m) m.classList.remove('active');
    }
    function executeFinalExit() {
      closeConfirmModal();
      completeStage(6);
    }

    // ── STAGE 7 LOGIC ──
    function openRelievingModal() {
      const m = document.getElementById('letter-modal');
      if (m) { m.style.display = 'flex'; m.classList.add('active'); }
    }
    function previewDoc(name) {
      alert(`Generating secure preview for ${name}...\nDocument verified with digital signature for Aarav Sharma.`);
    }
    function downloadDoc(name) {
      alert(`📥 ${name}.pdf downloaded successfully.`);
    }

    // ── CANCEL EXIT LOGIC ──
    function openCancelModal() {
      const m = document.getElementById('cancel-exit-modal');
      if (m) { m.style.display = 'flex'; m.classList.add('active'); }
    }
    function closeCancelModal() {
      const m = document.getElementById('cancel-exit-modal');
      if (m) m.classList.remove('active');
    }
    function confirmCancelExit() {
      closeCancelModal();
      alert('Exit process cancelled. Aarav Sharma has been restored to Active status.\nCancellation event has been logged to Activity Log.');
      window.location.href = 'candidate-detail.html?id=88';
    }