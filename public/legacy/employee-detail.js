
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
      });

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
  