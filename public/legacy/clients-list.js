
    const today = new Date("2026-06-29");

    function showToast(message) {
      const t = document.getElementById('toast');
      t.textContent = message;
      t.style.transform = 'translateY(0)';
      t.style.opacity = '1';
      setTimeout(() => { t.style.transform = 'translateY(100px)'; t.style.opacity = '0'; }, 3000);
    }

    const defaultClients = [
      {
        id: 1,
        name: "Mahindra & Mahindra Limited",
        code: "MAH-012",
        gstin: "27AAAAM1234A1Z1",
        pan: "AAAAM1234A",
        contractType: "eor",
        billingModel: "markup",
        markupPct: "8.5",
        onboardingProgress: 100,
        clientSince: "2024-01-01",
        lastInvoiceDate: "2026-06-01",
        lastInvoiceStatus: "Unpaid",
        lastInvoiceAmount: 420000,
        outstanding: 420000,
        overdueDays: 14,
        activeCandidates: 42,
        status: "active",
        city: "Mumbai",
        state: "Maharashtra",
        am: "sunita",
        contractEnd: "2026-12-31",
        creditLimit: 1000000,
        industry: "Automobile"
      },
      {
        id: 2,
        name: "Tata Consultancy Services",
        code: "TCS-005",
        gstin: "27AAATT5678A2Z2",
        pan: "AAATT5678A",
        contractType: "eor",
        billingModel: "fixed_per_candidate",
        fixedFeeCandidate: "1500",
        onboardingProgress: 100,
        clientSince: "2024-01-01",
        lastInvoiceDate: "2026-06-01",
        lastInvoiceStatus: "Unpaid",
        lastInvoiceAmount: 420000,
        outstanding: 420000,
        overdueDays: 14,
        activeCandidates: 42,
        status: "active",
        city: "Mumbai",
        state: "Maharashtra",
        am: "sunita",
        contractEnd: "2026-07-15",
        creditLimit: 500000,
        industry: "Information Technology (IT)"
      },
      {
        id: 5,
        name: "Tata Consultancy Services",
        code: "TCS-006",
        gstin: "29AAATT5678A2Z3",
        pan: "AAATT5678A",
        contractType: "agency",
        billingModel: "fixed_per_candidate",
        fixedFeeCandidate: "1500",
        onboardingProgress: 66,
        clientSince: "2025-03-15",
        lastInvoiceDate: "2026-05-01",
        lastInvoiceStatus: "Paid",
        lastInvoiceAmount: 130000,
        outstanding: 0,
        activeCandidates: 90,
        status: "active",
        city: "Bangalore",
        state: "Karnataka",
        am: "rahul",
        contractEnd: "2026-07-15",
        creditLimit: 500000,
        industry: "Information Technology (IT)"
      },
      {
        id: 3,
        name: "Reliance Digital",
        code: "REL-099",
        gstin: "27AAARR9012A3Z3",
        pan: "AAARR9012A",
        contractType: "hybrid",
        billingModel: "markup",
        markupPct: "10.0",
        onboardingProgress: 100,
        clientSince: "2022-08-10",
        lastInvoiceDate: "2025-12-01",
        lastInvoiceStatus: "Paid",
        lastInvoiceAmount: 80000,
        outstanding: 0,
        activeCandidates: 0,
        status: "inactive",
        city: "Mumbai",
        state: "Maharashtra",
        am: "priya",
        contractEnd: "2026-03-31", // Already Expired
        creditLimit: 1500000,
        industry: "Retail & E-Commerce"
      },
      {
        id: 4,
        name: "Infosys BPO Ltd",
        code: "INF-009",
        gstin: "29AAABI4321A1Z0",
        pan: "AAABI4321A",
        contractType: "eor",
        billingModel: "markup",
        markupPct: "5.0",
        onboardingProgress: 100,
        clientSince: "2023-05-20",
        lastInvoiceDate: "2026-04-15",
        lastInvoiceStatus: "Unpaid",
        lastInvoiceAmount: 600000,
        outstanding: 600000,
        overdueDays: 45,
        activeCandidates: 15,
        status: "suspended",
        city: "Hyderabad",
        state: "Telangana",
        am: "amit",
        contractEnd: "2027-05-20",
        creditLimit: 500000, // Limit Exceeded
        industry: "Information Technology (IT)"
      }
    ];

    let clients = [];
    let currentPage = 1;
    const itemsPerPage = 5;

    function initData() {
      // Always seed from hardcoded defaults so the list reflects static mockup data.
      // Any localStorage data from previous sessions is intentionally discarded.
      clients = [...defaultClients];
      localStorage.setItem('tecla_clients', JSON.stringify(clients));
    }

    function formatRupee(amount) {
      if (amount === 0 || amount === null || amount === undefined) return '—';
      const str = Math.round(amount).toString();
      let lastThree = str.substring(str.length - 3);
      const otherNumbers = str.substring(0, str.length - 3);
      if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
      }
      const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
      return '₹' + res;
    }

    function formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jun", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      // Quick fix for month display to match date format '03 Jun 2026'
      const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${String(d.getDate()).padStart(2, '0')} ${mNames[d.getMonth()]} ${d.getFullYear()}`;
    }

    function renderTable(filtered) {
      const tbody = document.getElementById('clients-table-body');
      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:3rem;color:var(--text-muted);">
          No clients match your filters. <a href="#" onclick="clearFilters()">Clear Filters</a>
        </td></tr>`;
        document.getElementById('pagination-info').textContent = 'Showing 0 to 0 of 0 Clients';
        document.getElementById('pagination-controls').innerHTML = '';
        return;
      }

      // Pagination slice
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
      const paginated = filtered.slice(startIndex, endIndex);

      // Render pagination details
      document.getElementById('pagination-info').textContent = `Showing ${startIndex + 1} to ${endIndex} of ${filtered.length} Clients`;
      
      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      let pageControlsHTML = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">← Prev</button>`;
      for (let i = 1; i <= totalPages; i++) {
        pageControlsHTML += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
      }
      pageControlsHTML += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next →</button>`;
      document.getElementById('pagination-controls').innerHTML = pageControlsHTML;

      const amNames = { sunita: "Sunita Verma", rahul: "Rahul Desai", priya: "Priya Kapoor", amit: "Amit Singh" };

      paginated.forEach(c => {
        const tr = document.createElement('tr');
        
        // Row level conditional styling
        const isOverCredit = c.outstanding > (c.creditLimit || 0);
        if (c.status === 'suspended') {
          tr.setAttribute('style', 'border-left: 3px solid var(--status-warning); opacity: 0.85;');
        } else if (isOverCredit) {
          tr.setAttribute('style', 'border-left: 3px solid var(--status-danger); background-color: #FFF5F5;');
        }

        // Outstanding UI
        let outstandingHTML = '—';
        let overdueTooltip = '';
        if (c.outstanding && c.outstanding > 0) {
          const overdueDays = c.overdueDays || 14;
          overdueTooltip = `title="${overdueDays} days overdue"`;
          outstandingHTML = `<span style="color:var(--status-danger); font-weight:600;" ${overdueTooltip}>${formatRupee(c.outstanding)}</span>`;
          if (c.outstanding > (c.creditLimit || 0)) {
            outstandingHTML += `<br><span class="badge badge-danger" style="font-size:0.65rem; margin-top:0.25rem; display:inline-block;">Limit Exceeded</span>`;
          }
        }

        // Contract Expiry Badges
        let expiryBadgeHTML = '';
        if (c.contractEnd) {
          const cEnd = new Date(c.contractEnd);
          const diffDays = Math.ceil((cEnd - today) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            expiryBadgeHTML = `<span class="badge badge-danger" style="font-size:0.7rem;margin-left:0.5rem; display:inline-block;">Expired</span>`;
          } else if (diffDays <= 30) {
            expiryBadgeHTML = `<span class="badge badge-warning" style="font-size:0.7rem;margin-left:0.5rem; display:inline-block;">Expiring Soon</span>`;
          }
        }

        // Onboarding Progress Badge
        let obHTML = '';
        if (c.onboardingProgress === 100) {
          obHTML = `<div class="onboarding-progress" title="100% Configured">
                      <div class="progress-bar-bg">
                        <div class="progress-bar-fill complete" style="width:100%;"></div>
                      </div>
                      <span style="color:var(--status-success);">Complete</span>
                    </div>`;
        } else {
          obHTML = `<div class="onboarding-progress" title="${c.onboardingProgress}% Configured">
                      <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:${c.onboardingProgress}%;"></div>
                      </div>
                      <span style="color:var(--status-warning);">${c.onboardingProgress}% (Action Req.)</span>
                    </div>`;
        }

        // AM Display
        const amLabel = amNames[c.am] || c.am || 'Unassigned';

        // Billing Model Display
        let billingModelText = '';
        if (c.billingModel === 'markup') {
          billingModelText = `CTC + ${c.markupPct || '0'}% Markup`;
        } else if (c.billingModel === 'fixed_per_candidate') {
          billingModelText = `Fixed ₹${c.fixedFeeCandidate || '0'} / Candidate`;
        } else if (c.billingModel === 'fixed_per_month') {
          billingModelText = `Fixed Monthly Retainer`;
        } else {
          billingModelText = c.billingModel || '—';
        }

        const contractLabelText = c.contractType === 'eor' ? 'Pass-through EOR' : (c.contractType === 'agency' ? 'Agency Staffing' : 'Hybrid');

        tr.innerHTML = `
          <td style="text-align: center;">
            <input type="checkbox" class="client-checkbox" value="${c.code}" onchange="updateBulkActions()">
          </td>
          <td>
            <div class="client-name-cell">
              <a href="/clients/1" class="name">${c.name}</a>
              <div class="meta">
                <span><strong>Code:</strong> ${c.code}</span>
                <span><strong>GSTIN:</strong> ${c.gstin || '—'}</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.1rem;">
                City: ${c.city || '—'} | AM: ${amLabel}
              </div>
            </div>
          </td>
          <td>
            <div style="font-size:0.85rem;">${contractLabelText}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${billingModelText}</div>
          </td>
          <td>${obHTML}</td>
          <td>
            <div style="font-size:0.85rem;">Since: ${formatDate(c.clientSince)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">
              Ends: ${c.contractEnd ? formatDate(c.contractEnd) : 'Open'}${expiryBadgeHTML}
            </div>
          </td>
          <td>
            <div style="font-size:0.85rem;">${c.lastInvoiceDate ? formatDate(c.lastInvoiceDate) : '—'}</div>
            <div style="font-size:0.75rem;"><span class="badge ${c.lastInvoiceStatus === 'Paid' ? 'badge-success' : 'badge-warning'}" style="font-size:0.65rem;">${c.lastInvoiceAmount ? (c.lastInvoiceAmount / 100000).toFixed(1) + 'L' : ''} ${c.lastInvoiceStatus}</span></div>
          </td>
          <td>${outstandingHTML}</td>
          <td style="font-weight: 600; text-align: center; font-size:1.1rem; color:var(--primary-navy);">${c.activeCandidates || 0}</td>
          <td>
            <span class="badge badge-${c.status === 'active' ? 'success' : (c.status === 'suspended' ? 'warning' : 'neutral')}">${c.status.toUpperCase()}</span>
            ${isOverCredit ? '<br><span class="badge badge-danger" style="font-size:0.65rem; margin-top:0.25rem;">🚫 Hold (Over Credit)</span>' : ''}
          </td>
          <td>
            <select class="form-control" style="width: auto; padding: 0.25rem; font-size: 0.75rem; height: auto;" onchange="handleRowAction(this, '${c.code}')">
              <option value="">-- Actions --</option>
              <option value="view">👁️ View Details</option>
              <option value="edit">✏️ Edit Config</option>
              <option value="invoice" ${c.status === 'inactive' ? 'disabled' : ''}>🧾 Generate Invoice</option>
              <option value="add_candidate" ${isOverCredit ? 'disabled title="Client on Credit Hold"' : ''}>👤 Onboard Candidate</option>
              <option value="reminder">📧 Send Invoice Reminder</option>
              <option value="report">📋 Onboarding Report</option>
            </select>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function getFilteredClients() {
      const search = document.getElementById('search-input').value.toLowerCase().trim();
      const contractType = document.getElementById('contract-type-filter').value;
      const onboarding = document.getElementById('onboarding-filter').value;
      const status = document.getElementById('status-filter').value;
      const industry = document.getElementById('industry-filter').value;
      const am = document.getElementById('am-filter').value;
      const expiry = document.getElementById('expiry-filter').value;
      const overdue = document.getElementById('overdue-filter').checked;

      return clients.filter(c => {
        // Search
        if (search) {
          const matchSearch = c.name.toLowerCase().includes(search) ||
                              c.code.toLowerCase().includes(search) ||
                              (c.gstin && c.gstin.toLowerCase().includes(search)) ||
                              (c.pan && c.pan.toLowerCase().includes(search));
          if (!matchSearch) return false;
        }

        // Contract Type
        if (contractType && c.contractType !== contractType) return false;

        // Onboarding
        if (onboarding) {
          if (onboarding === 'complete' && c.onboardingProgress !== 100) return false;
          if (onboarding === 'pending' && c.onboardingProgress === 100) return false;
        }

        // Status
        if (status !== 'all' && c.status !== status) return false;

        // Industry
        if (industry && c.industry !== industry) return false;

        // AM
        if (am && c.am !== am) return false;

        // Expiry
        if (expiry) {
          if (!c.contractEnd) return false;
          const cEnd = new Date(c.contractEnd);
          const diffDays = Math.ceil((cEnd - today) / (1000 * 60 * 60 * 24));
          if (expiry === 'expired' && diffDays >= 0) return false;
          if (expiry === '30' && (diffDays < 0 || diffDays > 30)) return false;
          if (expiry === '60' && (diffDays < 0 || diffDays > 60)) return false;
          if (expiry === '90' && (diffDays < 0 || diffDays > 90)) return false;
        }

        // Overdue
        if (overdue) {
          if (!(c.outstanding && c.outstanding > 0)) return false;
        }

        return true;
      });
    }

    function applyFilters() {
      currentPage = 1;
      const filtered = getFilteredClients();
      updateSummary(filtered);
      renderTable(filtered);
    }

    function clearFilters() {
      document.getElementById('search-input').value = '';
      document.getElementById('contract-type-filter').value = '';
      document.getElementById('onboarding-filter').value = '';
      document.getElementById('status-filter').value = 'active';
      document.getElementById('industry-filter').value = '';
      document.getElementById('am-filter').value = '';
      document.getElementById('expiry-filter').value = '';
      document.getElementById('overdue-filter').checked = false;
      document.getElementById('select-all').checked = false;
      
      applyFilters();
      showToast('Filters cleared.');
    }

    function changePage(p) {
      currentPage = p;
      const filtered = getFilteredClients();
      renderTable(filtered);
    }

    function handleRowAction(selectElement, clientCode) {
      const action = selectElement.value;
      if (!action) return;
      
      if (action === 'view') {
        window.location.href = `/clients/1`;
      } else if (action === 'edit') {
        window.location.href = `/clients/create?id=1`;
      } else if (action === 'invoice') {
        window.location.href = `#`;
      } else if (action === 'reminder') {
        showToast(`📧 Invoice reminder successfully queued and sent to ${clientCode}!`);
      } else if (action === 'report') {
        showToast(`📋 Onboarding & Compliance report generated for ${clientCode}.`);
      }
      selectElement.value = '';
    }

    function updateSummary(filtered) {
      const total = filtered.length;
      const active = filtered.filter(c => c.status === 'active').length;
      const onboarding = filtered.filter(c => c.onboardingProgress < 100).length;
      const totalOutstanding = filtered.reduce((sum, c) => sum + (c.outstanding || 0), 0);
      const totalDeployed = filtered.reduce((sum, c) => sum + (c.activeCandidates || 0), 0);

      document.getElementById('summary-total').textContent = total;
      document.getElementById('summary-active').textContent = active;
      document.getElementById('summary-onboarding').textContent = onboarding;
      document.getElementById('summary-outstanding').textContent = formatRupee(totalOutstanding);
      document.getElementById('summary-deployed').textContent = totalDeployed;
    }

    // Checkboxes and Bulk Actions
    function toggleAllCheckboxes(masterCheckbox) {
      const checkboxes = document.querySelectorAll('.client-checkbox');
      checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
      updateBulkActions();
    }

    function updateBulkActions() {
      const checkboxes = document.querySelectorAll('.client-checkbox:checked');
      const count = checkboxes.length;
      const bar = document.getElementById('bulk-actions');
      const countSpan = document.getElementById('selected-count');

      countSpan.textContent = count;
      if (count > 0) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
        document.getElementById('select-all').checked = false;
      }
    }

    // Bulk Actions handlers
    function exportCSV() {
      const checkboxes = document.querySelectorAll('.client-checkbox:checked');
      const codes = [...checkboxes].map(cb => cb.value);
      showToast(`⬇️ Exporting CSV for clients: ${codes.join(', ')}...`);
    }

    function bulkChangeStatus() {
      const checkboxes = document.querySelectorAll('.client-checkbox:checked');
      const codes = [...checkboxes].map(cb => cb.value);
      const newStatus = prompt("Enter new status (onboarding / active / inactive / suspended):");
      if (newStatus) {
        const valid = ['onboarding', 'active', 'inactive', 'suspended'];
        if (!valid.includes(newStatus.toLowerCase())) {
          alert("Invalid status entered.");
          return;
        }
        clients.forEach(c => {
          if (codes.includes(c.code)) {
            c.status = newStatus.toLowerCase();
          }
        });
        localStorage.setItem('tecla_clients', JSON.stringify(clients));
        applyFilters();
        showToast(`🔄 Status updated to ${newStatus} for ${countText(codes.length)}.`);
      }
    }

    function bulkAssignAM() {
      const checkboxes = document.querySelectorAll('.client-checkbox:checked');
      const codes = [...checkboxes].map(cb => cb.value);
      const newAM = prompt("Assign AM (sunita / rahul / priya / amit):");
      if (newAM) {
        const valid = ['sunita', 'rahul', 'priya', 'amit'];
        if (!valid.includes(newAM.toLowerCase())) {
          alert("Invalid AM entered.");
          return;
        }
        clients.forEach(c => {
          if (codes.includes(c.code)) {
            c.am = newAM.toLowerCase();
          }
        });
        localStorage.setItem('tecla_clients', JSON.stringify(clients));
        applyFilters();
        showToast(`👤 Assigned AM ${newAM} to selected clients.`);
      }
    }

    function bulkSendReminder() {
      const checkboxes = document.querySelectorAll('.client-checkbox:checked');
      const codes = [...checkboxes].map(cb => cb.value);
      showToast(`📧 Invoice reminder emails sent for selected clients: ${codes.join(', ')}.`);
    }

    function bulkDelete() {
      const checkboxes = document.querySelectorAll('.client-checkbox:checked');
      const codes = [...checkboxes].map(cb => cb.value);
      if (confirm(`⚠️ Are you sure you want to delete ${codes.length} selected client(s)?`)) {
        clients = clients.filter(c => !codes.includes(c.code));
        localStorage.setItem('tecla_clients', JSON.stringify(clients));
        document.getElementById('select-all').checked = false;
        applyFilters();
        showToast(`🗑️ Selected clients deleted.`);
      }
    }

    function countText(count) {
      return `${count} client${count > 1 ? 's' : ''}`;
    }

    // Initialize page
    initData();
    applyFilters();
  