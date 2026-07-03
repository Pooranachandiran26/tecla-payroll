
    // Toggle full breakdown
    function toggleBreakdown() {
      const container = document.getElementById("breakdown-table-container");
      container.style.display = container.style.display === "none" ? "block" : "none";
    }

    // Modal logic
    function preDisbursementCheck() {
      // Simulate a post-processing bank mismatch detection
      openModal("disbursement-modal");
    }

    function openSupplementaryModal() {
      openModal("supplementary-modal");
    }
    
    function selectAccount(element) {
      const options = element.parentElement.children;
      for (let i = 0; i < options.length; i++) {
        options[i].style.border = "1px solid var(--border-color)";
        options[i].style.backgroundColor = "transparent";
      }
      element.style.border = "2px solid var(--primary-navy)";
      element.style.backgroundColor = "#F8FAFC";
    }
    
    function finalizeLock() {
      closeModal('disbursement-modal');
      alert("Batch finalized! Bank disbursal E-file generated successfully with the selected account.\n\n✅ Compliance Integration: Draft PF ECR, ESI, and PT data have been auto-populated for this batch in the Statutory Compliance Center.");
      window.location.href = "compliance-reports.html";
    }

    (function __initPage() {
      // Role Check
      const role = localStorage.getItem("payroll_role") || "admin";
      const marginContent = document.getElementById("approval-margin-content");
      const marginOverlay = document.getElementById("approval-margin-overlay");
      const approveBtn = document.getElementById("btn-approve-lock");
      const execWarning = document.getElementById("executive-lock-warning");

      if (role === "executive") {
        if (marginContent) marginContent.classList.add("locked-blur");
        if (marginOverlay) marginOverlay.style.display = "flex";
        if (approveBtn) {
          approveBtn.disabled = true;
          approveBtn.style.opacity = "0.5";
          approveBtn.style.cursor = "not-allowed";
        }
        if (execWarning) execWarning.style.display = "block";
      }
    })();

    // --- DUMMY DATA INJECTION ---
    function loadApprovalData() {
        const clientSelect = document.getElementById("select-client");
        const clientName = clientSelect.options[clientSelect.selectedIndex].text;
        const clientId = clientSelect.value;
        
        document.getElementById("page-subtitle").innerText = `Review consolidated totals for ${clientName} (June 2026) and authorize bank file disbursements.`;
        
        let multiplier = 1;
        let empCount = 38;
        if (clientId === 'tcs') { multiplier = 2.5; empCount = 85; }
        else if (clientId === 'reliance') { multiplier = 0.8; empCount = 15; }
        
        document.getElementById("partial-batch-banner").innerHTML = `
          <strong>Partial Batch: ${empCount} of ${empCount + 4} active employees covered.</strong>
          <span>4 employees excluded — click 'Create Supplementary Run' to see reasons and fix them.</span>
          <button class="btn btn-secondary btn-xs" style="margin-top: 0.25rem;" onclick="openSupplementaryModal()">Create Supplementary Run for 4 Excluded</button>
        `;

        let totals = {
          gross: 3480000 * multiplier,
          pf_employee: 248500 * multiplier,
          esi_employee: 12400 * multiplier,
          pt: 8400 * multiplier,
          tds: 100700 * multiplier,
          loan: 0,
          pf_employer: 248500 * multiplier,
          esi_employer: 53733 * multiplier
        };
        
        let totalDeductions = totals.pf_employee + totals.esi_employee + totals.pt + totals.tds + totals.loan;
        let totalEmployerCost = totals.pf_employer + totals.esi_employer;
        let netPay = totals.gross - totalDeductions;
        
        // Update Grid Cards
        document.getElementById("summary-grid").innerHTML = `
        <div class="card metric-card">
          <span class="metric-label">Processed Employees</span>
          <span class="metric-value">${empCount}</span>
          <span class="metric-trend text-muted">Out of ${empCount + 4} Active</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Total Gross Earnings</span>
          <span class="metric-value">₹${totals.gross.toLocaleString()}</span>
          <span class="metric-trend text-muted">Sum of all 8 components</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Total Net Disbursement</span>
          <span class="metric-value" style="color: var(--primary-navy);">₹${netPay.toLocaleString()}</span>
          <span class="metric-trend text-muted">Amount sent to bank</span>
        </div>
        <div class="card metric-card">
          <span class="metric-label">Employer-Side Statutory Cost</span>
          <span class="metric-value" style="color: var(--status-warning);">₹${totalEmployerCost.toLocaleString()}</span>
          <span class="metric-trend text-muted">Er PF + Er ESI</span>
        </div>
      `;
      
      // Update Aggregate Liabilities
      document.getElementById("aggregate-liabilities").innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Employee Deductions (PF, ESI, PT, TDS):</span>
          <span style="font-weight: 600;">₹${totalDeductions.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Employer Costs (Er PF + Er ESI):</span>
          <span style="font-weight: 600;">₹${totalEmployerCost.toLocaleString()}</span>
        </div>
        <hr style="border: 0; border-top: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1rem;">
          <span style="color: var(--primary-navy);">Total Disbursable (Net Pay + Liabilities):</span>
          <span style="color: var(--primary-navy);">₹${(netPay + totalDeductions + totalEmployerCost).toLocaleString()}</span>
        </div>
      `;
      
      // Update Margin Card
      let invoicedAmount = Math.round(totals.gross * 1.085); // 8.5% markup on gross
      let agencyMargin = invoicedAmount - (totals.gross + totalEmployerCost); // (Invoiced) - (Gross + Employer Cost)
      
      document.getElementById("margin-breakdown").innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <span>Contract Model:</span>
          <span style="font-weight: 600;">8.5% Markup on Gross CTC</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Invoiced to Client:</span>
          <span style="font-weight: 600;">₹${invoicedAmount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--status-danger);">Less: Gross Earnings:</span>
          <span style="font-weight: 600; color: var(--status-danger);">-₹${totals.gross.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--status-danger);">Less: Employer Cost:</span>
          <span style="font-weight: 600; color: var(--status-danger);">-₹${totalEmployerCost.toLocaleString()}</span>
        </div>
        <hr style="border: 0; border-top: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.05rem;">
          <span style="color: var(--status-success);">True Agency Margin:</span>
          <span style="color: var(--status-success);">₹${agencyMargin.toLocaleString()}</span>
        </div>
      `;

      // Mock Table generation for "View Full Breakdown"
      let tbody = "";
      for(let i=1; i<=2; i++) { // Render 2 dummy rows just to show format
        let basic = 20000 * multiplier;
        let hra = 10000 * multiplier;
        let conv = 2000 * multiplier;
        let da = 5000 * multiplier;
        let gross = basic + hra + conv + da;
        let pf = 2400 * multiplier;
        let pt = 200 * multiplier;
        let net = gross - (pf + pt);
        
        tbody += `<tr>
          <td>TEC-${100+i}</td>
          <td><strong>Employee ${i}</strong></td>
          <td class="col-earn">₹${basic.toLocaleString()}</td>
          <td class="col-earn">₹${hra.toLocaleString()}</td>
          <td class="col-earn">₹${conv.toLocaleString()}</td>
          <td class="col-earn">₹${da.toLocaleString()}</td>
          <td class="col-earn">₹0</td>
          <td class="col-earn">₹0</td>
          <td class="col-earn">₹0</td>
          <td class="col-earn">₹0</td>
          <td class="col-group-total">₹${gross.toLocaleString()}</td>
          
          <td class="col-deduct">₹${pf.toLocaleString()}</td>
          <td class="col-deduct">—</td>
          <td class="col-deduct">₹${pt.toLocaleString()}</td>
          <td class="col-deduct">—</td>
          <td class="col-deduct">—</td>
          <td class="col-deduct">—</td>
          <td class="col-deduct">—</td>
          
          <td class="col-group-total">₹${(pf + pt).toLocaleString()}</td>
          
          <td style="background: #FFF7ED;">₹${pf.toLocaleString()}</td>
          <td style="background: #FFF7ED;">—</td>
          
          <td class="col-group-total" style="color: var(--primary-navy); font-size:1.1em;">₹${net.toLocaleString()}</td>
        </tr>`;
      }
      tbody += `<tr><td colspan="22" class="text-center" style="color: var(--text-muted); font-size: 0.8rem; text-align: center;">... ${empCount - 2} more employees</td></tr>`;
      
      document.getElementById("payroll-table-body").innerHTML = tbody;
    }
    
    (function __initPage() {
      loadApprovalData();
    })();
  