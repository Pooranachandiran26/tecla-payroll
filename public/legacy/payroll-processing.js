
    // --- PAYROLL ENGINE DEMO DATA & LOGIC ---
    
    // Settings configuration
    const agencySettings = {
      requireFullKYC: true, // Toggled in Settings
    };
    
    const clientSettings = {
      mahindra: {
        lopBasis: 26,
        name: "Mahindra Corp"
      },
      tcs: {
        lopBasis: 30,
        name: "Tata Consultancy Services"
      }
    };

    // Dummy Data simulating complex edge cases
    let employeesData = [
      {
        id: "TEC-088",
        name: "Aarav Sharma",
        client: "mahindra",
        attendance: { livePunch: 24, manualUpload: null, leave: 2 }, // Valid live punch + leave
        bankDetails: { account: "1234567890", ifsc: "HDFC0001234" },
        kycComplete: true,
        pendingBankChange: false,
        salaryRevision: null,
        loanEmi: 0,
        structure: { basic: 20000, hra: 10000, conv: 2000, da: 5000, med: 1000, special: 7000, other: 0 }, // Gross: 45000
        esiTransitionActive: true, // Phase 3: ESI mid-year logic
        tdsTrueUp: true // Phase 3: TDS true-up logic
      },
      {
        id: "TEC-121",
        name: "Neha Patil",
        client: "mahindra",
        attendance: { livePunch: null, manualUpload: null }, // RED FLAG: No attendance
        bankDetails: { account: "0987654321", ifsc: "SBIN0001234" },
        kycComplete: true,
        pendingBankChange: false,
        salaryRevision: null,
        loanEmi: 0,
        structure: { basic: 15000, hra: 7000, conv: 2000, da: 3000, med: 1000, special: 4000, other: 0 }
      },
      {
        id: "TEC-168",
        name: "Vikram Rao",
        client: "mahindra",
        attendance: { livePunch: null, manualUpload: 26 }, // Fallback to manual
        bankDetails: { account: null, ifsc: null }, // RED FLAG: Missing Bank Details
        kycComplete: true,
        pendingBankChange: false,
        salaryRevision: null,
        loanEmi: 0,
        structure: { basic: 10000, hra: 4000, conv: 1000, da: 1000, med: 500, special: 2000, other: 0 }
      },
      {
        id: "TEC-142",
        name: "Karan Malhotra",
        client: "mahindra",
        attendance: { livePunch: 26, manualUpload: 20 }, // Uses Live Punch 26 (Overrides manual)
        bankDetails: { account: "1122334455", ifsc: "ICIC0001234" },
        kycComplete: false, // RED flag since agencySettings.requireFullKYC is true
        pendingBankChange: false,
        salaryRevision: null,
        loanEmi: 0,
        structure: { basic: 18000, hra: 9000, conv: 2000, da: 4000, med: 1000, special: 7000, other: 0 }
      },
      {
        id: "TEC-199",
        name: "Priya Singh",
        client: "mahindra",
        attendance: { livePunch: 26, manualUpload: null },
        bankDetails: { account: "5544332211", ifsc: "UTIB0001234" },
        kycComplete: true,
        pendingBankChange: true, // AMBER FLAG
        salaryRevision: null,
        loanEmi: 0,
        structure: { basic: 22000, hra: 11000, conv: 2000, da: 5000, med: 1000, special: 9000, other: 0 }
      },
      {
        id: "TEC-205",
        name: "Rahul Verma",
        client: "mahindra",
        attendance: { livePunch: 26, manualUpload: null },
        bankDetails: { account: "9988776655", ifsc: "PUNB0001234" },
        kycComplete: true,
        pendingBankChange: false,
        // MID-CYCLE REVISION (AMBER & SPLIT CALC)
        salaryRevision: {
          effectiveDate: "16th June",
          daysOld: 15,
          daysNew: 11, // 26 basis: 15 + 11 = 26
          oldStructure: { basic: 12000, hra: 6000, conv: 1000, da: 2000, med: 500, special: 3500, other: 0 }, // 25000
          newStructure: { basic: 16000, hra: 8000, conv: 1000, da: 3000, med: 500, special: 4500, other: 0 }  // 33000 (PF CEILING BREACH)
        },
        loanEmi: 0,
        structure: null // Uses revision logic
      },
      {
        id: "TEC-210",
        name: "Anita Desai",
        client: "mahindra",
        attendance: { livePunch: 26, manualUpload: null },
        bankDetails: { account: "1111222233", ifsc: "BKID0001234" },
        kycComplete: true,
        pendingBankChange: false,
        salaryRevision: null,
        loanEmi: 20000, // HUGE EMI to trigger 50% deduction cap
        structure: { basic: 15000, hra: 7000, conv: 2000, da: 3000, med: 1000, special: 2000, other: 0 } // Gross 30000
      }
    ];
    
    // State to track manual arrear entries
    let manualArrears = {}; // { empId: { amount: 0, reason: "" } }
    
    // Helper: calculate total of structure
    function getGross(struct) {
      if(!struct) return 0;
      return struct.basic + struct.hra + struct.conv + struct.da + struct.med + struct.special + struct.other;
    }

    function runPayrollEngine() {
      const clientId = document.getElementById("select-client").value;
      
      // Safety check in case a client without data is selected
      if (!clientSettings[clientId]) {
        document.getElementById("preflight-checks-container").innerHTML = `<div class="preflight-item status-amber">No configuration for this client.</div>`;
        return;
      }
      
      const basis = clientSettings[clientId].lopBasis;
      
      document.getElementById("lop-basis-display").innerHTML = `<strong>Active LOP Basis:</strong> Using ${basis}-day basis for ${clientSettings[clientId].name}`;
      
      let preflightHTML = "";
      let hasRedFlags = false;
      let tbodyHTML = "";
      let flaggedEmps = new Set();
      
      let totals = {
        basic: 0, hra: 0, conv: 0, da: 0, med: 0, special: 0, other: 0, arrears: 0, gross: 0,
        pf: 0, esi: 0, pt: 0, welfare: 0, lop: 0, tds: 0, loan: 0, totalDeduct: 0, net: 0
      };

      let clientEmployees = employeesData.filter(e => e.client === clientId);
      
      if (clientEmployees.length === 0) {
        tbodyHTML = `<tr><td colspan="22" style="text-align: center; padding: 2rem;">No employees found for this client.</td></tr>`;
      }

      clientEmployees.forEach(emp => {
        let isExcluded = false;
        let flags = [];
        
        // --- PRE-FLIGHT VALIDATIONS (SECTION A) ---
        // 1. Attendance Check
        let presentDays = 0;
        let sourceTag = "";
        
        if (emp.attendance.livePunch !== null) {
          presentDays = emp.attendance.livePunch;
          sourceTag = "🟢 Live Punch";
          flags.push({ type: 'green', msg: `${sourceTag}: ${emp.name} — synced (${presentDays} days)`, tag: sourceTag });
        } else if (emp.attendance.manualUpload !== null) {
          presentDays = emp.attendance.manualUpload;
          sourceTag = "🔵 Uploaded";
          flags.push({ type: 'amber', msg: `${sourceTag}: ${emp.name} — using manual timesheet upload (${presentDays} days)`, tag: sourceTag });
        } else {
          sourceTag = "🔴 No Attendance";
          flags.push({ type: 'red', msg: `${sourceTag}: ${emp.name} — no attendance data found (no punches, no upload). Cannot process.`, tag: sourceTag });
          isExcluded = true;
          hasRedFlags = true;
        }

        if (emp.attendance.leave) {
          presentDays += emp.attendance.leave;
          flags.push({ type: 'amber', msg: `🟠 Leave Adjusted: ${emp.attendance.leave} approved leave days applied for ${emp.name}`, tag: '🟠 Leave Adjusted' });
        }
        
        // 2. Bank Details Check
        if (!emp.bankDetails.account || !emp.bankDetails.ifsc) {
          flags.push({ type: 'red', msg: `${emp.name} — missing bank details. Cannot disburse, excluded from this run.` });
          isExcluded = true;
          hasRedFlags = true;
        }
        
        // 3. KYC Check
        if (!emp.kycComplete) {
          if (agencySettings.requireFullKYC) {
            flags.push({ type: 'red', msg: `${emp.name} — KYC incomplete and strict policy is ON. Cannot process.` });
            isExcluded = true;
            hasRedFlags = true;
          } else {
            flags.push({ type: 'amber', msg: `${emp.name} — KYC documents incomplete, processing anyway per policy.` });
          }
        }
        
        // 4. Pending Bank Change
        if (emp.pendingBankChange) {
          flags.push({ type: 'amber', msg: `${emp.name} has a pending bank change request — confirm which account to use for this disbursement.` });
        }
        
        // 5. Mid-Cycle Revision
        if (emp.salaryRevision) {
          flags.push({ type: 'amber', msg: `${emp.name} — salary revised mid-period (effective ${emp.salaryRevision.effectiveDate}). This run will calculate using BOTH the old and new structure, split by days, for the same month.` });
          if (emp.salaryRevision.newStructure.basic > 15000 && emp.salaryRevision.oldStructure.basic <= 15000) {
            flags.push({ type: 'amber', msg: `${emp.name}'s Basic Pay change affects PF computation base — verify PF contribution logic before approving.` });
          }
        }
        
        // 7. Loan EMI Check
        if (emp.loanEmi > 0) {
          flags.push({ type: 'green', msg: `${emp.name} — Active Loan EMI of ₹${emp.loanEmi} pulled into deductions.` });
        }
        
        // Track flagged employees for confidence score
        if (flags.some(f => f.type === 'red' || f.type === 'amber')) {
          flaggedEmps.add(emp.id);
        }
        
        // Render flags for this employee
        flags.forEach(f => {
          let icon = f.type === 'red' ? '❌' : f.type === 'amber' ? '⚠️' : '✅';
          let colorClass = f.type === 'red' ? 'status-red' : f.type === 'amber' ? 'status-amber' : 'status-green';
          preflightHTML += `<div class="preflight-item ${colorClass}"><div class="preflight-icon">${icon}</div><div class="preflight-content"><strong>${f.type === 'red'? 'BLOCKER' : f.type==='amber' ? 'WARNING' : 'INFO'}:</strong> ${f.msg}</div></div>`;
        });
        
        // If excluded, skip calculation and render skipped row
        if (isExcluded) {
          tbodyHTML += `<tr style="opacity: 0.5; background: #F8FAFC;">
            <td>${emp.id}</td><td><strong>${emp.name}</strong></td>
            <td colspan="19" class="text-center" style="color: var(--status-danger); text-align: center;">Excluded from Run due to Red Flags</td>
            <td><span class="badge badge-danger">Excluded</span></td>
          </tr>`;
          return; // Skip remaining calculation
        }

        // --- CALCULATIONS ---
        
        let renderEarn = { basic: 0, hra: 0, conv: 0, da: 0, med: 0, special: 0, other: 0 };
        let splitHTML = "";
        
        // Arrears
        let arrearAmt = (manualArrears[emp.id] && manualArrears[emp.id].amount) || 0;
        let arrearReason = (manualArrears[emp.id] && manualArrears[emp.id].reason) || "";
        
        // Base Gross calculation
        let calculatedGross = 0;
        if (emp.salaryRevision) {
          // SECTION C: SPLIT CALC
          let rev = emp.salaryRevision;
          let oldGross = getGross(rev.oldStructure);
          let newGross = getGross(rev.newStructure);
          
          let oldDaily = oldGross / basis;
          let newDaily = newGross / basis;
          
          let oldComponentFactors = rev.daysOld / basis;
          let newComponentFactors = rev.daysNew / basis;
          
          // Pro-rate each component
          for(let key in renderEarn) {
            renderEarn[key] = Math.round((rev.oldStructure[key] * oldComponentFactors) + (rev.newStructure[key] * newComponentFactors));
          }
          calculatedGross = getGross(renderEarn);
          
          splitHTML = `<tr class="split-row">
            <td colspan="3"></td>
            <td colspan="19">↳ <em>Mid-Cycle Split: ${rev.daysOld} days @ old rate (₹${oldGross}/mo) + ${rev.daysNew} days @ new rate (₹${newGross}/mo) = ₹${calculatedGross} this month base</em></td>
          </tr>`;
        } else {
          renderEarn = { ...emp.structure };
          calculatedGross = getGross(renderEarn);
        }
        
        // SECTION B: LOP CALCULATION
        let lopDays = Math.max(0, basis - presentDays);
        let perDaySalary = calculatedGross / basis;
        let lopDeduction = Math.round(perDaySalary * lopDays);
        
        // Final Gross for period
        let finalGross = calculatedGross + arrearAmt;
        
        // Statutory Deductions
        let pf = Math.min(renderEarn.basic, 15000) * 0.12;
        
        // Phase 3: ESI Transition Logic
        let esi = 0;
        if (finalGross <= 21000 || emp.esiTransitionActive) {
          esi = Math.ceil(finalGross * 0.0075);
          if (finalGross > 21000) {
            preflightHTML += `<div class="preflight-item status-amber"><div class="preflight-icon">⚠️</div><div class="preflight-content"><strong>ESI TRANSITION:</strong> ${emp.name} — Gross > ₹21k, but ESI continued (0.75%) due to active Contribution Period rule (ends Sep 30).</div></div>`;
            flaggedEmps.add(emp.id); // Add to warnings count
          }
        }
        
        let pt = 200; 
        let welfare = 0; 
        let tds = finalGross > 40000 ? Math.round(finalGross * 0.1) : 0; 
        
        // Phase 3: TDS Year-End True-Up
        if (emp.tdsTrueUp) {
          let trueUpAdjustment = 3200;
          tds += trueUpAdjustment;
          preflightHTML += `<div class="preflight-item status-green"><div class="preflight-icon">✅</div><div class="preflight-content"><strong>TDS TRUE-UP:</strong> ${emp.name} — Year-end/Exit true-up adjustment (+₹${trueUpAdjustment}) applied to TDS based on final tax declarations.</div></div>`;
        }
        
        let statutoryDeductions = Math.round(pf + esi + pt + welfare + tds + lopDeduction);
        
        // SECTION D: WAGE DEDUCTION CAP CHECK (50%)
        let maxAllowedDeduction = Math.floor(finalGross * 0.5);
        let actualLoanEmi = emp.loanEmi;
        let carryForward = 0;
        let capFlagHTML = "";
        
        if ((statutoryDeductions + actualLoanEmi) > maxAllowedDeduction) {
          actualLoanEmi = Math.max(0, maxAllowedDeduction - statutoryDeductions);
          carryForward = emp.loanEmi - actualLoanEmi;
          capFlagHTML = `<br><span style="color:var(--status-danger); font-size: 0.7rem; font-weight:bold;">Capped! ₹${carryForward} carried forward</span>`;
          
          preflightHTML += `<div class="preflight-item status-amber"><div class="preflight-icon">⚠️</div><div class="preflight-content"><strong>DEDUCTION CAP:</strong> ${emp.name} — Loan EMI partially deferred this cycle to stay within the 50% wage deduction cap. ₹${carryForward} carried forward to next month.</div></div>`;
        }
        
        let totalDeductions = statutoryDeductions + actualLoanEmi;
        let netPay = finalGross - totalDeductions;
        
        // Add to totals
        totals.basic += renderEarn.basic; totals.hra += renderEarn.hra; totals.conv += renderEarn.conv;
        totals.da += renderEarn.da; totals.med += renderEarn.med; totals.special += renderEarn.special;
        totals.other += renderEarn.other; totals.arrears += arrearAmt; totals.gross += finalGross;
        totals.pf += pf; totals.esi += esi; totals.pt += pt; totals.welfare += welfare; 
        totals.lop += lopDeduction; totals.tds += tds; totals.loan += actualLoanEmi;
        totals.totalDeduct += totalDeductions; totals.net += netPay;
        
        // Render Row
        tbodyHTML += `<tr>
          <td>${emp.id}</td>
          <td><strong>${emp.name}</strong></td>
          <td>${presentDays} / ${basis}</td>
          <td class="col-earn">₹${renderEarn.basic}</td>
          <td class="col-earn">₹${renderEarn.hra}</td>
          <td class="col-earn">₹${renderEarn.conv}</td>
          <td class="col-earn">₹${renderEarn.da}</td>
          <td class="col-earn">₹${renderEarn.med}</td>
          <td class="col-earn">₹${renderEarn.special}</td>
          <td class="col-earn">₹${renderEarn.other}</td>
          <td class="col-earn">
            <input type="number" class="arrears-input form-control" value="${arrearAmt}" onchange="updateArrears('${emp.id}', this.value, null)">
            <input type="text" class="arrears-reason form-control" value="${arrearReason}" placeholder="Reason..." style="margin-top:2px;" onchange="updateArrears('${emp.id}', null, this.value)">
          </td>
          <td class="col-group-total">₹${finalGross}</td>
          
          <td class="col-deduct">₹${Math.round(pf)}</td>
          <td class="col-deduct">${esi > 0 ? '₹'+esi : '—'}</td>
          <td class="col-deduct">₹${pt}</td>
          <td class="col-deduct">—</td>
          <td class="col-deduct" style="${lopDeduction>0?'color:var(--status-danger);':''}">₹${lopDeduction}</td>
          <td class="col-deduct">${tds > 0 ? '₹'+tds : '—'}</td>
          <td class="col-deduct" style="max-width:150px; white-space:normal;">₹${actualLoanEmi}${capFlagHTML}</td>
          
          <td class="col-group-total">₹${totalDeductions}</td>
          <td class="col-group-total" style="color: var(--primary-navy); font-size:1.1em;">₹${netPay}</td>
          <td>
            ${flags.filter(f => f.tag).map(f => `<div style="font-weight: 500; font-size: 0.8rem; margin-bottom: 2px;">${f.tag}</div>`).join('')}
            ${emp.salaryRevision ? '<div style="margin-top: 4px;"><span class="badge badge-warning">Split</span></div>' : ''}
          </td>
        </tr>`;
        
        if (splitHTML) tbodyHTML += splitHTML;
      });
      
      // Update preflight container
      if (preflightHTML === "") {
         preflightHTML = `<div class="preflight-item status-green"><div class="preflight-icon">✅</div><div class="preflight-content"><strong>ALL CLEAR:</strong> All validations passed! Ready for processing.</div></div>`;
      }
      document.getElementById("preflight-checks-container").innerHTML = preflightHTML;
      
      // Update Confidence Score
      let cleanCount = clientEmployees.length - flaggedEmps.size;
      let score = Math.round((cleanCount / clientEmployees.length) * 100) || 0;
      document.getElementById("confidence-score-val").innerText = `${score}% Clean`;
      document.getElementById("confidence-score-detail").innerText = `${cleanCount} of ${clientEmployees.length} employees checked out without manual review required.`;
      
      let badge = document.getElementById("preflight-status-badge");
      if (hasRedFlags) {
        badge.className = "badge badge-danger";
        badge.innerText = "Blockers Found";
        document.getElementById("process-btn").disabled = true;
        document.getElementById("process-btn").style.opacity = "0.5";
      } else {
        badge.className = "badge badge-success";
        badge.innerText = "All Clear";
        document.getElementById("process-btn").disabled = false;
        document.getElementById("process-btn").style.opacity = "1";
      }
      
      // Totals footer
      document.getElementById("payroll-table-foot").innerHTML = `<tr style="background-color: #F1F5F9; font-weight: bold; border-top: 2px solid var(--border-color);">
        <td colspan="3" style="text-align: right;">GRAND TOTALS:</td>
        <td class="col-earn">₹${totals.basic}</td>
        <td class="col-earn">₹${totals.hra}</td>
        <td class="col-earn">₹${totals.conv}</td>
        <td class="col-earn">₹${totals.da}</td>
        <td class="col-earn">₹${totals.med}</td>
        <td class="col-earn">₹${totals.special}</td>
        <td class="col-earn">₹${totals.other}</td>
        <td class="col-earn">₹${totals.arrears}</td>
        <td class="col-group-total">₹${totals.gross}</td>
        
        <td class="col-deduct">₹${Math.round(totals.pf)}</td>
        <td class="col-deduct">₹${totals.esi}</td>
        <td class="col-deduct">₹${totals.pt}</td>
        <td class="col-deduct">₹${totals.welfare}</td>
        <td class="col-deduct">₹${totals.lop}</td>
        <td class="col-deduct">₹${totals.tds}</td>
        <td class="col-deduct">₹${totals.loan}</td>
        
        <td class="col-group-total">₹${totals.totalDeduct}</td>
        <td class="col-group-total" style="color: var(--primary-navy); font-size:1.1em;">₹${totals.net}</td>
        <td></td>
      </tr>`;
      
      document.getElementById("payroll-table-body").innerHTML = tbodyHTML;
    }
    
    // Manual Arrears update trigger
    window.updateArrears = function(empId, amtStr, reasonStr) {
      if (!manualArrears[empId]) manualArrears[empId] = { amount: 0, reason: "" };
      
      if (amtStr !== null) {
        let amt = parseInt(amtStr) || 0;
        manualArrears[empId].amount = amt;
      }
      if (reasonStr !== null) {
        manualArrears[empId].reason = reasonStr;
      }
      
      runPayrollEngine();
    };
    
    // Column Toggle Logic
    let earnVisible = true;
    let deductVisible = true;
    window.toggleColumns = function(type) {
      let elems = document.querySelectorAll(`.col-${type}`);
      if (type === 'earn') {
        earnVisible = !earnVisible;
        elems.forEach(el => el.style.display = earnVisible ? 'table-cell' : 'none');
      } else {
        deductVisible = !deductVisible;
        elems.forEach(el => el.style.display = deductVisible ? 'table-cell' : 'none');
      }
    };
    
    // Friendly Automation - Use Last Month's Settings
    window.useLastMonthSettings = function() {
      document.getElementById("select-client").value = "mahindra";
      document.getElementById("select-month").value = "june"; // Simulating auto-select
      
      // Pre-fill some recurring arrears from last month
      manualArrears["TEC-199"] = { amount: 1500, reason: "Recurring Perf. Bonus" };
      alert("Settings and recurring arrears applied from last month!");
      
      runPayrollEngine();
    };
    
    // Initialize on load
    (function __initPage() {
      const urlParams = new URLSearchParams(window.location.search);
      const clientParam = urlParams.get('client');
      if (clientParam) {
        const selectClient = document.getElementById('select-client');
        if (selectClient.querySelector(`option[value="${clientParam}"]`)) {
          selectClient.value = clientParam;
        }
      }
      runPayrollEngine();
    })();

  