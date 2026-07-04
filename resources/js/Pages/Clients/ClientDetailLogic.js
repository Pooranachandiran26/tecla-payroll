// Auto-extracted logic for ClientDetail

// Expose functions globally for React inline handlers
window.showToast = showToast;
window.initPage = initPage;
window.renderHeader = renderHeader;
window.renderBanners = renderBanners;
window.createBanner = createBanner;
window.renderOverviewTab = renderOverviewTab;
window.renderCandidatesTab = renderCandidatesTab;
window.renderInvoicesTab = renderInvoicesTab;
window.renderDocumentsTab = renderDocumentsTab;
window.toggleVersionHistory = toggleVersionHistory;
window.replaceDocVersion = replaceDocVersion;
window.renderContactsTab = renderContactsTab;
window.renderSLATab = renderSLATab;
window.renderActivityTimeline = renderActivityTimeline;
window.filterActivityLogs = filterActivityLogs;
window.addActivityLog = addActivityLog;
window.openStatusModal = openStatusModal;
window.closeStatusModal = closeStatusModal;
window.confirmStatusChange = confirmStatusChange;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.confirmPaymentRecord = confirmPaymentRecord;
window.sendInvoiceReminder = sendInvoiceReminder;


    // ─── Global State & Defaults ───
    const BASELINE_TODAY = '2026-06-29';
    let client = null;
    let clientInvoices = [];
    let clientDocs = [];
    let clientActivities = [];

    const DEFAULT_CLIENT = {
      id: 1,
      name: 'Mahindra & Mahindra Limited',
      code: 'MAH-012',
      type: 'pub_ltd',
      industry: 'Automobile',
      country: 'India',
      gstin: '27AAAAM1234A1Z1',
      pan: 'AAAAM1234A',
      tan: 'TANM12345A',
      regAddressLine1: 'Mahindra Towers, Worli',
      regCity: 'Mumbai',
      regState: 'Maharashtra',
      regPin: '400018',
      poc1Name: 'Vikas Mehta',
      poc1Email: 'vmehta@mahindra.com',
      poc1Phone: '9876543210',
      poc1Designation: 'HR Manager',
      poc2Name: 'Ravi Joshi',
      poc2Email: 'accounts@mahindra.com',
      poc2Phone: '9876543211',
      poc2Designation: 'Accounts Manager',
      poc3Name: 'Priya Nair',
      poc3Email: 'hr@mahindra.com',
      poc3Phone: '9876543212',
      poc3Designation: 'Talent Acquisition',
      contractType: 'agency',
      billingModel: 'markup',
      markupPct: 8.5,
      contractStart: '2024-01-01',
      contractEnd: '2026-12-31',
      autoRenewal: true,
      creditLimit: 1000000,
      latePenalty: 1.5,
      billingCurrency: 'INR',
      pfApplicable: true,
      esiApplicable: true,
      ptApplicable: true,
      tdsApplicable: true,
      lwfApplicable: false,
      gratuityApplicable: true,
      bonusApplicable: true,
      invoiceRaiseDay: 30,
      payrollMonthConvention: 'calendar',
      cycleStartDay: 28,
      cycleEndDay: 27,
      accountManager: 'sunita',
      status: 'active'
    };

    const DEFAULT_INVOICES = [
      {
        invoiceNo: 'INV-2026-004',
        clientCode: 'MAH-012',
        billingMonth: 'May 2026',
        issueDate: '2026-06-01',
        dueDate: '2026-06-15',
        totalAmount: 420000,
        marginAmount: 32900,
        status: 'unpaid',
        payments: []
      },
      {
        invoiceNo: 'INV-2026-003',
        clientCode: 'MAH-012',
        billingMonth: 'Apr 2026',
        issueDate: '2026-05-01',
        dueDate: '2026-05-15',
        totalAmount: 395000,
        marginAmount: 30950,
        status: 'paid',
        payments: [
          { mode: 'NEFT', ref: 'UTR-99882211', date: '2026-05-16', amount: 395000, deductTds: false }
        ]
      }
    ];

    const DEFAULT_DOCS = [
      { id: 'msa', name: 'Master Service Agreement', icon: '📜', fileName: 'msa_mahindra_v2.pdf', size: '2.4 MB', expiryDate: '2026-12-31', versions: [
        { version: 'v2', date: '2025-01-10', uploader: 'Sunita Verma (Admin)', fileName: 'msa_mahindra_v2.pdf', active: true },
        { version: 'v1', date: '2024-01-01', uploader: 'System Admin', fileName: 'msa_mahindra_v1.pdf', active: false }
      ] },
      { id: 'gst_cert', name: 'GST Registration Cert.', icon: '🏛️', fileName: 'gst_cert_2024.pdf', size: '1.1 MB', expiryDate: '2028-12-31', versions: [
        { version: 'v1', date: '2024-01-01', uploader: 'System Admin', fileName: 'gst_cert_2024.pdf', active: true }
      ] },
      { id: 'pan_card', name: 'Company PAN Card', icon: '💳', fileName: 'mahindra_pan.jpg', size: '500 KB', expiryDate: '', versions: [
        { version: 'v1', date: '2024-01-01', uploader: 'System Admin', fileName: 'mahindra_pan.jpg', active: true }
      ] },
      { id: 'work_order', name: 'Work Order (2026-27)', icon: '📋', fileName: 'work_order_2026.pdf', size: '1.8 MB', expiryDate: '2026-05-31', versions: [
        { version: 'v1', date: '2026-01-10', uploader: 'Sunita Verma (Admin)', fileName: 'work_order_2026.pdf', active: true }
      ] },
      { id: 'nda', name: 'Signed NDA', icon: '🔒', fileName: 'nda_signed.pdf', size: '3.2 MB', expiryDate: '', versions: [
        { version: 'v1', date: '2024-01-01', uploader: 'System Admin', fileName: 'nda_signed.pdf', active: true }
      ] }
    ];

    const DEFAULT_ACTIVITIES = [
      { date: '2026-06-01', time: '10:30 AM', type: 'System', desc: 'Invoice INV-2026-004 automatically generated and emailed to Finance Contact.', user: 'System Auto-action' },
      { date: '2026-05-16', time: '04:15 PM', type: 'Billing', desc: 'Payment received for invoice INV-2026-003 (₹3,95,000). Marked as Paid.', user: 'by Amit Singh (Account Manager)' },
      { date: '2026-05-01', time: '09:00 AM', type: 'Portal', desc: 'Added new candidate Karan Malhotra (TEC-142) under this client.', user: 'by Priya Nair (via Portal)' },
      { date: '2024-01-10', time: '02:45 PM', type: 'Compliance', desc: 'Contract renewed. Work Order (2026-27) uploaded.', user: 'by Sunita Verma (Admin)' },
      { date: '2024-01-01', time: '11:00 AM', type: 'System', desc: 'Client profile created and Activated.', user: 'by System Admin' }
    ];

    // ─── Toast Alerts ───
    function showToast(msg) {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
      }
      
      const toast = document.createElement('div');
      toast.style.background = 'var(--primary-navy)';
      toast.style.color = 'white';
      toast.style.padding = '12px 24px';
      toast.style.borderRadius = '8px';
      toast.style.fontSize = '0.9rem';
      toast.style.fontWeight = '500';
      toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.textContent = msg;

      container.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      }, 50);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    // ─── Initialize Data ───
    function initPage() {
      const urlParams = new URLSearchParams(window.location.search);
      const codeParam = urlParams.get('code');
      const idParam = urlParams.get('id') ? parseInt(urlParams.get('id')) : null;

      let clients = JSON.parse(localStorage.getItem('tecla_clients') || '[]');
      if (clients.length === 0) {
        clients = [DEFAULT_CLIENT];
        localStorage.setItem('tecla_clients', JSON.stringify(clients));
      }

      if (codeParam) {
        client = clients.find(c => c.code === codeParam);
      } else if (idParam) {
        client = clients.find(c => c.id === idParam);
      } else {
        client = clients[0]; // fallback
      }

      if (!client) {
        client = DEFAULT_CLIENT;
      }

      // Sync invoices
      let invoices = JSON.parse(localStorage.getItem('tecla_invoices') || '[]');
      if (invoices.length === 0) {
        invoices = DEFAULT_INVOICES;
        localStorage.setItem('tecla_invoices', JSON.stringify(invoices));
      }
      clientInvoices = invoices.filter(i => i.clientCode === client.code);

      // Sync documents
      const docsKey = `tecla_client_docs_${client.code}`;
      clientDocs = JSON.parse(localStorage.getItem(docsKey) || '[]');
      if (clientDocs.length === 0) {
        clientDocs = DEFAULT_DOCS;
        localStorage.setItem(docsKey, JSON.stringify(clientDocs));
      }

      // Sync activities
      const actKey = `tecla_client_activities_${client.code}`;
      clientActivities = JSON.parse(localStorage.getItem(actKey) || '[]');
      if (clientActivities.length === 0) {
        clientActivities = DEFAULT_ACTIVITIES;
        localStorage.setItem(actKey, JSON.stringify(clientActivities));
      }

      renderHeader();
      renderBanners();
      renderOverviewTab();
      renderCandidatesTab();
      renderInvoicesTab();
      renderDocumentsTab();
      renderContactsTab();
      renderSLATab();
      renderActivityTimeline();
    }

    function renderHeader() {
      const headerTitle = document.querySelector('.client-header-container h2');
      if (headerTitle) headerTitle.textContent = client.name;

      const badge = document.getElementById('current-status-badge');
      if (badge) {
        if (client.status === 'active') {
          badge.className = "badge badge-success badge-status-lg";
          badge.textContent = "● Active";
        } else if (client.status === 'suspended') {
          badge.className = "badge badge-danger badge-status-lg";
          badge.textContent = "● Suspended";
        } else {
          badge.className = "badge badge-neutral badge-status-lg";
          badge.textContent = "● Inactive";
        }
      }

      const quickMeta = document.querySelector('.quick-meta');
      if (quickMeta) {
        quickMeta.innerHTML = `
          <span><strong>Client Code:</strong> ${client.code}</span>
          <span><strong>Type:</strong> ${client.contractType === 'eor' ? 'Pass-through EOR' : client.contractType === 'agency' ? 'Agency Contract' : 'Direct Hire'}</span>
          <span><strong>Industry:</strong> ${client.industry || 'N/A'}</span>
          <span><strong>Client Since:</strong> ${client.contractStart || 'N/A'}</span>
        `;
      }

      // Update Edit Button link dynamically
      const editBtn = document.querySelector('a[href^="/clients/create"]');
      if (editBtn) {
        editBtn.setAttribute('href', `/clients/create?code=${client.code}`);
      }

      // Update Generate Invoice link dynamically
      const invoiceBtn = document.querySelector('a[href^="/invoices/generate"]');
      if (invoiceBtn) {
        invoiceBtn.setAttribute('href', `/invoices/generate?client=${client.code}`);
      }
    }

    // ─── Warning Banners & Credit Exposure ───
    function renderBanners() {
      const container = document.getElementById('alert-banner-container');
      if (!container) return;
      container.innerHTML = '';

      const todayVal = new Date(BASELINE_TODAY);
      
      // Calculate unpaid outstanding dues
      let totalUnpaid = 0;
      let hasMajorOverdue = false;

      clientInvoices.forEach(inv => {
        if (inv.status !== 'paid') {
          const paidAmt = inv.payments ? inv.payments.reduce((acc, curr) => acc + curr.amount, 0) : 0;
          totalUnpaid += (inv.totalAmount - paidAmt);
          
          // Check if invoice is >15 days overdue
          const due = new Date(inv.dueDate);
          const diff = (todayVal - due) / (1000 * 60 * 60 * 24);
          if (diff > 15) {
            hasMajorOverdue = true;
          }
        }
      });

      // 1. Credit Limit Exceeded Banner
      if (totalUnpaid > client.creditLimit) {
        const excess = totalUnpaid - client.creditLimit;
        createBanner(container, 'danger', `⚠️ <strong>Credit Limit Exceeded:</strong> Outstanding dues of ₹${totalUnpaid.toLocaleString('en-IN')} exceed the credit limit of ₹${client.creditLimit.toLocaleString('en-IN')} by ₹${excess.toLocaleString('en-IN')}. New placements are blocked.`);
      }

      // 2. Auto-Hold Triggered Banner
      if (totalUnpaid > client.creditLimit || hasMajorOverdue) {
        createBanner(container, 'danger', `🚫 <strong>Invoice Auto-Hold Active:</strong> New work orders and placement contracts are restricted due to payment overdue status or credit exposure.`);
      }

      // 3. Contract Expiry / Expiring Soon Banner
      if (client.contractEnd) {
        const expiry = new Date(client.contractEnd);
        const daysToExpiry = (expiry - todayVal) / (1000 * 60 * 60 * 24);
        if (daysToExpiry < 0) {
          createBanner(container, 'danger', `⚠️ <strong>Contract Expired:</strong> The service agreement for this client expired on ${client.contractEnd}. Please upload a renewed work order or MSA.`);
        } else if (daysToExpiry <= 30) {
          createBanner(container, 'warning', `⚠️ <strong>Contract Expiring Soon:</strong> This client's agreement expires in ${Math.ceil(daysToExpiry)} days (on ${client.contractEnd}).`);
        }
      }

      // 4. Expired compliance documents
      clientDocs.forEach(doc => {
        if (doc.expiryDate) {
          const exp = new Date(doc.expiryDate);
          if (exp < todayVal) {
            createBanner(container, 'warning', `⚠️ <strong>Expired Compliance Document:</strong> <u>${doc.name}</u> expired on ${doc.expiryDate}. Please replace it with an updated copy.`);
          }
        }
      });
    }

    function createBanner(parent, type, text) {
      const banner = document.createElement('div');
      banner.style.padding = '0.75rem 1rem';
      banner.style.borderRadius = 'var(--radius-sm)';
      banner.style.fontSize = '0.85rem';
      banner.style.fontWeight = '500';
      if (type === 'danger') {
        banner.style.background = '#FDE8E8';
        banner.style.color = '#9B1C1C';
        banner.style.borderLeft = '4px solid #F05252';
      } else {
        banner.style.background = '#FEF3C7';
        banner.style.color = '#92400E';
        banner.style.borderLeft = '4px solid #F59E0B';
      }
      banner.innerHTML = text;
      parent.appendChild(banner);
    }

    // ─── Tab Rendering ───
    function renderOverviewTab() {
      // Metric 1: Outstanding
      let unpaidTotal = 0;
      clientInvoices.forEach(inv => {
        if (inv.status !== 'paid') {
          const paid = inv.payments ? inv.payments.reduce((acc, p) => acc + p.amount, 0) : 0;
          unpaidTotal += (inv.totalAmount - paid);
        }
      });
      document.getElementById('metric-outstanding').textContent = `₹${unpaidTotal.toLocaleString('en-IN')}`;
      document.getElementById('metric-credit-limit').innerHTML = `<span style="color:var(--text-muted);">Credit Limit:</span> ₹${client.creditLimit.toLocaleString('en-IN')}`;

      // Metric 2: Candidates Count
      const candidates = JSON.parse(localStorage.getItem('tecla_candidates') || '[]');
      const activeCandidates = candidates.filter(c => c.clientCode === client.code && c.status === 'active');
      const count = activeCandidates.length || 42; // default to prototype mock count if empty
      document.getElementById('metric-active-candidates').textContent = count;
      document.getElementById('metric-active-trend').innerHTML = `▲ Active deployed headcount`;

      // Metric 3: Credit Utilization
      const utilPct = client.creditLimit > 0 ? Math.round((unpaidTotal / client.creditLimit) * 100) : 0;
      document.getElementById('metric-credit-utilization').textContent = `${utilPct}%`;
      const fillBar = document.getElementById('metric-credit-util-fill');
      if (fillBar) {
        fillBar.style.width = `${Math.min(utilPct, 100)}%`;
        fillBar.style.background = utilPct > 100 ? 'var(--status-danger)' : 'var(--accent-gold)';
      }

      // Metric 4: YTD Invoiced
      let ytdTotal = 0;
      clientInvoices.forEach(inv => {
        if (inv.issueDate && inv.issueDate.startsWith('2026')) {
          ytdTotal += inv.totalAmount;
        }
      });
      document.getElementById('metric-ytd-invoiced').textContent = `₹${ytdTotal.toLocaleString('en-IN')}`;
      const contractExpiryBadge = document.getElementById('metric-contract-expiry');
      if (contractExpiryBadge) {
        contractExpiryBadge.textContent = `Expires: ${client.contractEnd || 'Never'}`;
        if (new Date(client.contractEnd) < new Date(BASELINE_TODAY)) {
          contractExpiryBadge.className = 'badge badge-danger';
        } else {
          contractExpiryBadge.className = 'badge badge-success';
        }
      }

      // Populate PO Tracker
      const poCard = document.getElementById('po-tracker-card');
      if (client.poRequired && client.poNumber) {
        poCard.style.display = 'block';
        document.getElementById('tracker-po-number').textContent = client.poNumber;
        document.getElementById('tracker-po-validity').textContent = client.poValidity || 'No expiry';
        
        const totalValue = client.poValue || 0;
        let consumedValue = 0;
        clientInvoices.forEach(inv => {
          consumedValue += inv.totalAmount;
        });
        
        document.getElementById('tracker-po-utilized').textContent = `₹${consumedValue.toLocaleString('en-IN')}`;
        document.getElementById('tracker-po-value').textContent = totalValue > 0 ? `₹${totalValue.toLocaleString('en-IN')}` : 'Not Specified';
        
        let pct = 0;
        if (totalValue > 0) {
          pct = Math.min(100, Math.round((consumedValue / totalValue) * 100));
          document.getElementById('tracker-po-remaining').textContent = `₹${Math.max(0, totalValue - consumedValue).toLocaleString('en-IN')} Remaining`;
        } else {
          document.getElementById('tracker-po-remaining').textContent = '';
        }
        
        const bar = document.getElementById('tracker-po-bar');
        bar.style.width = `${pct}%`;
        if (pct >= 90) {
          bar.style.background = 'var(--status-danger)';
          document.getElementById('po-warning-alert').style.display = 'flex';
          document.getElementById('po-status-badge').className = 'badge badge-danger';
          document.getElementById('po-status-badge').textContent = 'Exhausted / Critical';
        } else {
          bar.style.background = 'var(--accent-gold)';
          document.getElementById('po-warning-alert').style.display = 'none';
          document.getElementById('po-status-badge').className = 'badge badge-success';
          document.getElementById('po-status-badge').textContent = 'Active';
        }
        document.getElementById('tracker-po-percentage').textContent = `${pct}% Consumed`;
      } else {
        poCard.style.display = 'none';
      }

      // Onboarding Status checkmarks checklist
      const leftCol = document.querySelector('.grid-layout > div');
      if (leftCol) {
        const onboardingCard = leftCol.querySelector('.card:nth-child(2)') || document.querySelector('[style*="border-left: 3px solid var(--status-success)"]');
        if (onboardingCard) {
          const docOk = clientDocs.length >= 3 ? '✅' : '⚠️';
          const contactsOk = (client.poc1Name && client.poc2Name) ? '✅' : '⚠️';
          const billingOk = client.billingModel ? '✅' : '⚠️';
          const statutoryOk = (client.pan && client.gstin) ? '✅' : '⚠️';
          
          onboardingCard.innerHTML = `
            <h3 style="font-size:1.05rem; margin-bottom:1rem;">Onboarding Integrity Checklist</h3>
            <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.85rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;"><span>${statutoryOk}</span> Statutory Profile Set</div>
              <div style="display:flex; align-items:center; gap:0.5rem;"><span>${contactsOk}</span> Contacts Details Populated</div>
              <div style="display:flex; align-items:center; gap:0.5rem;"><span>${billingOk}</span> SLA / Billing Terms Defined</div>
              <div style="display:flex; align-items:center; gap:0.5rem;"><span>${docOk}</span> Essential Compliance Documents (${clientDocs.length})</div>
            </div>
            <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--border-color); font-size:0.8rem;">
              <strong>Portal Access:</strong> ${client.portalAccess ? 'Enabled' : 'Disabled'}
            </div>
          `;
        }
      }

      // Company Profile snapshot grid rendering
      const snapshotGrid = document.getElementById('profile-snapshot-grid');
      if (snapshotGrid) {
        let taxBlock = '';
        if (client.country === 'India') {
          taxBlock = `
            <div>
              <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">GSTIN</strong>
              <span style="font-family:monospace; font-weight:600;">${client.gstin || 'Pending'}</span>
            </div>
            <div>
              <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">PAN</strong>
              <span style="font-family:monospace; font-weight:600;">${client.pan || 'Pending'}</span>
            </div>
            <div>
              <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">TAN</strong>
              <span style="font-family:monospace; font-weight:600;">${client.tan || 'Pending'}</span>
            </div>
          `;
        } else {
          taxBlock = `
            <div>
              <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Tax ID / FEIN</strong>
              <span style="font-family:monospace; font-weight:600;">${client.taxId || 'N/A'}</span>
            </div>
            <div>
              <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Registration Number</strong>
              <span style="font-family:monospace; font-weight:600;">${client.regNo || 'N/A'}</span>
            </div>
          `;
        }

        const typeMap = {
          'proprietorship': 'Sole Proprietorship',
          'partnership': 'Partnership',
          'pvt_ltd': 'Private Limited',
          'pub_ltd': 'Public Limited',
          'llp': 'LLP',
          'govt': 'Government Agency',
          'trust': 'Trust / NGO'
        };

        snapshotGrid.innerHTML = `
          <div>
            <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Legal Name</strong>
            ${client.name}
          </div>
          <div>
            <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Company Type</strong>
            ${typeMap[client.type] || client.type || 'N/A'}
          </div>
          ${taxBlock}
          <div style="grid-column: span 2; margin-top: 0.5rem;">
            <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Registered Address</strong>
            ${client.regAddressLine1 || ''}, ${client.regCity || ''}, ${client.regState || ''} ${client.regPin || ''}
          </div>
        `;
      }
    }

    function renderCandidatesTab() {
      // Optional enhancement: Render candidate entries matching this client
      const tbody = document.querySelector('.tab-content[data-tab="candidates"] tbody');
      const candidates = JSON.parse(localStorage.getItem('tecla_candidates') || '[]');
      const clientCandList = candidates.filter(c => c.clientCode === client.code);
      
      const tabHeader = document.querySelector('.tab-headers li[data-tab="candidates"]');
      
      if (clientCandList.length > 0) {
        if (tabHeader) tabHeader.textContent = `Deployed Candidates (${clientCandList.length})`;
        tbody.innerHTML = '';
        clientCandList.forEach(cand => {
          tbody.innerHTML += `
            <tr>
              <td>${cand.code || 'N/A'}</td>
              <td><strong>${cand.name}</strong></td>
              <td>${cand.designation || 'N/A'}</td>
              <td>₹${(cand.grossSalary || 0).toLocaleString('en-IN')}</td>
              <td>
                <span class="badge ${cand.pfApplicable ? 'badge-success' : 'badge-neutral'}">PF</span>
                <span class="badge ${cand.esiApplicable ? 'badge-success' : 'badge-neutral'}">ESI</span>
                <span class="badge ${cand.tdsApplicable ? 'badge-success' : 'badge-neutral'}">TDS</span>
              </td>
              <td>${cand.dateJoined || 'N/A'}</td>
              <td><span class="badge ${cand.status === 'active' ? 'badge-success' : 'badge-neutral'}">${cand.status}</span></td>
              <td><a href="/employees/${cand.code}" class="btn btn-secondary btn-xs">View Profile</a></td>
            </tr>
          `;
        });
      } else {
        if (tabHeader) tabHeader.textContent = `Deployed Candidates (2)`;
      }
    }

    function renderInvoicesTab() {
      const tbody = document.getElementById('invoice-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (clientInvoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No invoices available for this client.</td></tr>`;
        return;
      }

      clientInvoices.forEach(inv => {
        const todayVal = new Date(BASELINE_TODAY);
        const due = new Date(inv.dueDate);
        
        let outstanding = inv.totalAmount;
        let paidAmt = 0;
        let lateDays = 0;
        let penaltyVal = 0;
        
        if (inv.payments) {
          inv.payments.forEach(p => {
            paidAmt += p.amount;
            // Calculate late days if payment was after due date
            const payDate = new Date(p.date);
            if (payDate > due) {
              const diff = Math.ceil((payDate - due) / (1000 * 60 * 60 * 24));
              if (diff > lateDays) lateDays = diff;
            }
          });
        }
        
        outstanding -= paidAmt;

        // Calculate late penalty if unpaid and overdue
        if (inv.status !== 'paid' && todayVal > due) {
          const daysPast = Math.ceil((todayVal - due) / (1000 * 60 * 60 * 24));
          const monthlyRate = client.latePenalty || 1.5;
          const dailyRate = (monthlyRate / 30) / 100;
          penaltyVal = Math.round(outstanding * dailyRate * daysPast);
        }

        let statusBadge = '';
        if (inv.status === 'paid') {
          if (lateDays > 0) {
            statusBadge = `<span class="badge badge-success" title="Paid ${lateDays} days late">Paid (${lateDays}d late)</span>`;
          } else {
            statusBadge = `<span class="badge badge-success">Paid</span>`;
          }
        } else if (paidAmt > 0) {
          statusBadge = `<span class="badge badge-warning">Partial (₹${outstanding.toLocaleString('en-IN')} due)</span>`;
        } else {
          statusBadge = `<span class="badge badge-danger">Unpaid</span>`;
        }

        let actionButtons = '';
        if (inv.status !== 'paid') {
          actionButtons = `
            <button class="btn btn-secondary btn-xs" title="Download Invoice">📥</button>
            <button class="btn btn-navy btn-xs" onclick="sendInvoiceReminder(this, '${inv.invoiceNo}')">📧 Reminder</button>
            <button class="btn btn-success btn-xs" style="background:#2E7D32; color:white; border:none;"
              onclick="openPaymentModal('${inv.invoiceNo}')">💰 Record Payment</button>
          `;
        } else {
          actionButtons = `
            <button class="btn btn-secondary btn-xs" title="Download Invoice">📥</button>
            <button class="btn btn-secondary btn-xs" title="Download Receipt">🧾 Receipt</button>
          `;
        }

        tbody.innerHTML += `
          <tr>
            <td>${inv.invoiceNo}</td>
            <td>${inv.billingMonth}</td>
            <td>${inv.issueDate}</td>
            <td>${inv.dueDate}</td>
            <td>
              <strong>₹${inv.totalAmount.toLocaleString('en-IN')}</strong>
              ${penaltyVal > 0 ? `<div style="font-size:0.72rem; color:var(--status-danger);">+₹${penaltyVal.toLocaleString('en-IN')} late fee</div>` : ''}
            </td>
            <td>₹${(inv.marginAmount || 0).toLocaleString('en-IN')}</td>
            <td>${statusBadge}</td>
            <td style="display:flex; gap:0.4rem;">
              ${actionButtons}
            </td>
          </tr>
        `;
      });
    }

    function renderDocumentsTab() {
      const container = document.getElementById('document-grid-container');
      if (!container) return;
      container.innerHTML = '';

      const tabHeader = document.querySelector('.tab-headers li[data-tab="documents"]');
      if (tabHeader) tabHeader.textContent = `Documents (${clientDocs.length})`;

      clientDocs.forEach(doc => {
        const activeVer = doc.versions.find(v => v.active) || doc.versions[0];
        
        let verListHtml = '';
        doc.versions.forEach(v => {
          verListHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; padding:0.25rem 0; border-bottom:1px dashed #f0f0f0;">
              <span style="font-weight:${v.active ? 'bold' : 'normal'}; color:${v.active ? 'var(--primary-navy)' : 'var(--text-muted)'};">
                ${v.version} (${v.fileName}) ${v.active ? '• Active' : ''}
              </span>
              <span style="color:var(--text-muted); font-size:0.7rem;">${v.date} by ${v.uploader}</span>
            </div>
          `;
        });

        container.innerHTML += `
          <div class="doc-card" id="doc-card-${doc.id}">
            <div class="doc-icon-title">
              <span>${doc.icon}</span>
              <div>
                <h4 style="margin:0; font-size:0.95rem;">${doc.name}</h4>
                <div class="doc-meta">${activeVer.fileName} • ${doc.size}</div>
                ${doc.expiryDate ? `<div style="font-size:0.72rem; color:${new Date(doc.expiryDate) < new Date(BASELINE_TODAY) ? 'var(--status-danger)' : 'var(--text-muted)'}; font-weight:600;">Expires: ${doc.expiryDate}</div>` : ''}
              </div>
            </div>
            
            <div id="ver-history-${doc.id}" style="display:none; background:#F8FAFC; padding:0.5rem; border-radius:4px; margin-top:0.25rem;">
              <h5 style="margin:0 0 0.4rem 0; font-size:0.75rem; color:var(--text-muted);">Version History</h5>
              ${verListHtml}
            </div>

            <div class="doc-actions" style="margin-top:auto; padding-top:0.75rem;">
              <button class="btn btn-secondary btn-xs" style="padding:0.25rem 0.5rem;" onclick="toggleVersionHistory('${doc.id}')">⏳ History</button>
              <button class="btn btn-secondary btn-xs" style="padding:0.25rem 0.5rem;" onclick="replaceDocVersion('${doc.id}')">🔄 Replace</button>
              <button class="btn btn-secondary btn-xs" style="padding:0.25rem 0.5rem;">⬇️ Download</button>
            </div>
          </div>
        `;
      });
    }

    function toggleVersionHistory(docId) {
      const panel = document.getElementById(`ver-history-${docId}`);
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    }

    function replaceDocVersion(docId) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const doc = clientDocs.find(d => d.id === docId);
        if (doc) {
          doc.versions.forEach(v => v.active = false);
          const nextVerNum = doc.versions.length + 1;
          const newVersion = {
            version: `v${nextVerNum}`,
            date: BASELINE_TODAY,
            uploader: 'Current User (AM)',
            fileName: file.name,
            active: true
          };
          doc.versions.unshift(newVersion);
          doc.fileName = file.name;
          doc.size = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
          
          localStorage.setItem(`tecla_client_docs_${client.code}`, JSON.stringify(clientDocs));
          
          addActivityLog('Compliance', `Uploaded new version ${newVersion.version} of compliance doc ${doc.name} (${file.name})`);
          
          renderBanners();
          renderOverviewTab();
          renderDocumentsTab();
          showToast(`✅ Successfully uploaded ${doc.name} v${nextVerNum}`);
        }
      };
      fileInput.click();
    }

    function renderContactsTab() {
      const container = document.getElementById('contacts-grid-container');
      if (!container) return;

      container.innerHTML = `
        <div class="contact-card">
          <span class="contact-role-badge" style="background:#E3F2FD; color:#1565C0;">PRIMARY POC</span>
          <h3 style="font-size:1.1rem; margin-bottom:0.25rem;">${client.poc1Name || 'Pending'}</h3>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${client.poc1Designation || 'HR POC'}</div>
          <div class="contact-detail">✉️ ${client.poc1Email || 'N/A'}</div>
          <div class="contact-detail">📞 ${client.poc1Phone || 'N/A'}</div>
        </div>
        <div class="contact-card">
          <span class="contact-role-badge" style="background:#FFF3E0; color:#ED6C02;">FINANCE CONTACT</span>
          <h3 style="font-size:1.1rem; margin-bottom:0.25rem;">${client.poc2Name || 'Pending'}</h3>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${client.poc2Designation || 'Finance POC'}</div>
          <div class="contact-detail">✉️ ${client.poc2Email || 'N/A'}</div>
          <div class="contact-detail">📞 ${client.poc2Phone || 'N/A'}</div>
        </div>
      `;

      if (client.poc3Name) {
        container.innerHTML += `
          <div class="contact-card">
            <span class="contact-role-badge" style="background:#E8F5E9; color:#2E7D32;">SECONDARY POC</span>
            <h3 style="font-size:1.1rem; margin-bottom:0.25rem;">${client.poc3Name}</h3>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">${client.poc3Designation || 'Contact'}</div>
            <div class="contact-detail">✉️ ${client.poc3Email || 'N/A'}</div>
            <div class="contact-detail">📞 ${client.poc3Phone || 'N/A'}</div>
          </div>
        `;
      }
    }

    function renderSLATab() {
      const container = document.getElementById('sla-grid-container');
      if (!container) return;

      const modelMap = {
        'markup': `CTC + ${client.markupPct}% Markup`,
        'flat': `Flat Fee (₹${client.flatFee || 0} / candidate)`,
        'commission': `${client.commissionPct}% gross placement salary`
      };

      const statPF = client.pfApplicable ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Disabled</span>';
      const statESI = client.esiApplicable ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Disabled</span>';
      const statPT = client.ptApplicable ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Disabled</span>';
      const statTDS = client.tdsApplicable ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Disabled</span>';
      const statLWF = client.lwfApplicable ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Disabled</span>';
      const statGrat = client.gratuityApplicable ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Disabled</span>';
      const statBonus = client.bonusApplicable ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Disabled</span>';

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          <div class="card">
            <h3 style="font-size:1.05rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:1rem;">Billing Terms</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.875rem;">
              <div><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Billing Model</strong>${modelMap[client.billingModel] || client.billingModel}</div>
              <div><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Invoice Cycle</strong>Monthly (${client.invoiceRaiseDay === 30 ? 'Last Day' : `Day ${client.invoiceRaiseDay}`})</div>
              <div><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Payment Terms</strong>Net 15 Days</div>
              <div><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Late Penalty</strong>${client.latePenalty}% per month</div>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size:1.05rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:1rem;">Payroll Calendar (SLA)</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.875rem;">
              <div><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Attendance Cut-off</strong>Day ${client.cycleStartDay} of month</div>
              <div><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Payroll Lock Day</strong>Day ${client.cycleEndDay} of month</div>
              <div><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block;">Salary Credit Date</strong>Day 7 of next month</div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          <div class="card" style="background: #FAFBFC;">
            <h3 style="font-size:1.05rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:1rem;">Default Statutory Configuration</h3>
            <div style="display:flex; flex-direction:column; gap:0.75rem; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Provident Fund (PF)</span>
                ${statPF}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Employee State Insurance (ESI)</span>
                ${statESI}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Professional Tax (PT)</span>
                ${statPT}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>TDS Withholding</span>
                ${statTDS}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Labour Welfare Fund (LWF)</span>
                ${statLWF}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Gratuity Mode</span>
                ${statGrat}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Bonus Allocation</span>
                ${statBonus}
              </div>
            </div>
            <div style="margin-top:1rem; font-size:0.75rem; color:var(--text-muted);">
              These statutory parameters apply automatically when setting payroll profiles for active EOR personnel.
            </div>
          </div>
        </div>
      `;
    }

    function renderActivityTimeline() {
      const container = document.getElementById('activity-timeline-container');
      if (!container) return;

      const typeFilter = document.getElementById('log-filter-type').value;
      const startFilter = document.getElementById('log-filter-start').value;
      const endFilter = document.getElementById('log-filter-end').value;

      container.innerHTML = '';

      let filtered = [...clientActivities];

      if (typeFilter !== 'all') {
        filtered = filtered.filter(act => act.type === typeFilter);
      }

      if (startFilter) {
        filtered = filtered.filter(act => new Date(act.date) >= new Date(startFilter));
      }

      if (endFilter) {
        filtered = filtered.filter(act => new Date(act.date) <= new Date(endFilter));
      }

      if (filtered.length === 0) {
        container.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:1.5rem;">No log activities match this search filter.</div>`;
        return;
      }

      // Sort chronological descending
      filtered.forEach(act => {
        container.innerHTML += `
          <div class="activity-item">
            <div class="activity-time">${act.date}, ${act.time}</div>
            <div class="activity-desc">${act.desc}</div>
            <div class="activity-user">${act.user}</div>
          </div>
        `;
      });
    }

    function filterActivityLogs() {
      renderActivityTimeline();
    }

    function addActivityLog(type, desc) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newAct = {
        date: BASELINE_TODAY,
        time: timeStr,
        type: type,
        desc: desc,
        user: 'by Active Account Manager'
      };
      clientActivities.unshift(newAct);
      localStorage.setItem(`tecla_client_activities_${client.code}`, JSON.stringify(clientActivities));
      renderActivityTimeline();
    }

    // ─── Modal Operations ───
    function openStatusModal() {
      document.getElementById('new-status-select').value = client.status;
      document.getElementById('status-modal').classList.add('active');
    }

    function closeStatusModal() {
      document.getElementById('status-modal').classList.remove('active');
    }

    function confirmStatusChange() {
      const select = document.getElementById('new-status-select');
      const oldStatus = client.status;
      client.status = select.value;

      const clients = JSON.parse(localStorage.getItem('tecla_clients') || '[]');
      const idx = clients.findIndex(c => c.code === client.code);
      if (idx > -1) {
        clients[idx].status = client.status;
        localStorage.setItem('tecla_clients', JSON.stringify(clients));
      }

      addActivityLog('System', `Client Status updated from ${oldStatus.toUpperCase()} to ${client.status.toUpperCase()}`);
      
      closeStatusModal();
      renderHeader();
      renderBanners();
      showToast(`✅ Client status changed to ${client.status}`);
    }

    function openPaymentModal(invoiceNo) {
      const invoice = clientInvoices.find(i => i.invoiceNo === invoiceNo);
      if (!invoice) return;

      document.getElementById('pay-invoice-no').value = invoiceNo;
      
      let paidAmt = 0;
      if (invoice.payments) {
        invoice.payments.forEach(p => paidAmt += p.amount);
      }
      const pending = invoice.totalAmount - paidAmt;

      document.getElementById('pay-invoice-amount').textContent = `₹${invoice.totalAmount.toLocaleString('en-IN')}`;
      document.getElementById('pay-invoice-pending').textContent = `₹${pending.toLocaleString('en-IN')}`;
      
      document.getElementById('pay-amount').value = pending;
      document.getElementById('pay-ref').value = '';
      document.getElementById('pay-date').value = BASELINE_TODAY;
      document.getElementById('pay-deduct-tds').checked = false;

      document.getElementById('payment-modal').classList.add('active');
    }

    function closePaymentModal() {
      document.getElementById('payment-modal').classList.remove('active');
    }

    function confirmPaymentRecord() {
      const invoiceNo = document.getElementById('pay-invoice-no').value;
      const mode = document.getElementById('pay-mode').value;
      const ref = document.getElementById('pay-ref').value;
      const date = document.getElementById('pay-date').value;
      const amount = parseFloat(document.getElementById('pay-amount').value);
      const deductTds = document.getElementById('pay-deduct-tds').checked;

      if (!ref || ref.trim() === '') {
        alert('Please specify a Reference/UTR number for bank compliance tracing.');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive payment amount.');
        return;
      }

      let globalInvoices = JSON.parse(localStorage.getItem('tecla_invoices') || '[]');
      const target = globalInvoices.find(i => i.invoiceNo === invoiceNo);
      
      if (target) {
        if (!target.payments) target.payments = [];
        
        target.payments.push({
          mode: mode,
          ref: ref,
          date: date,
          amount: amount,
          deductTds: deductTds
        });

        let paidAmt = target.payments.reduce((acc, curr) => acc + curr.amount, 0);
        
        let tdsClearedInfo = '';
        if (deductTds) {
          const stdTds = target.totalAmount * 0.10;
          paidAmt += stdTds;
          tdsClearedInfo = ' (including 10% TDS allocation)';
        }

        if (paidAmt >= target.totalAmount) {
          target.status = 'paid';
        } else {
          target.status = 'partial';
        }

        localStorage.setItem('tecla_invoices', JSON.stringify(globalInvoices));
        clientInvoices = globalInvoices.filter(i => i.clientCode === client.code);

        addActivityLog('Billing', `Recorded payment of ₹${amount.toLocaleString('en-IN')} via ${mode} for invoice ${invoiceNo}. Ref: ${ref}.${tdsClearedInfo}`);

        closePaymentModal();
        renderBanners();
        renderOverviewTab();
        renderInvoicesTab();
        showToast('💰 Payment recorded successfully.');
      }
    }

    function sendInvoiceReminder(btn, invoiceNo) {
      btn.textContent = "⏳ Sending...";
      btn.disabled = true;
      
      setTimeout(() => {
        btn.textContent = "📧 Sent";
        btn.className = "btn btn-success btn-xs";
        btn.style.background = "#2E7D32";
        btn.style.color = "white";
        btn.style.border = "none";
        
        addActivityLog('Portal', `Emailed payment reminder for Invoice ${invoiceNo} to Finance contact ${client.poc2Name}`);
        showToast(`📧 Reminder notification dispatched for ${invoiceNo}`);
      }, 800);
    }

    // Direct tab linking from URL hash (e.g. #invoices)
    (function __initPage() {
      initPage();
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const targetTab = document.querySelector(`.tab-headers li[data-tab="${hash}"]`);
        if (targetTab) targetTab.click();
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
