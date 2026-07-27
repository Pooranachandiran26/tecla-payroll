// Node.js test script to verify HistoryTimeline client-side filter predicate logic

const revisions = [
  { id: 1, effective_date: '2026-01-15', status: 'approved', old_basic_pay: 20000, new_basic_pay: 22000 },
  { id: 2, effective_date: '2026-04-01', status: 'pending_approval', old_basic_pay: 22000, new_basic_pay: 25000 },
  { id: 3, effective_date: '2026-07-01', status: 'approved', old_basic_pay: 25000, new_basic_pay: 30000 },
  { id: 4, effective_date: '2026-10-01', status: 'rejected', old_basic_pay: 30000, new_basic_pay: 40000 },
];

function filterRevisions(list, statusFilter = 'all', fromDate = '', toDate = '') {
  return list.filter(item => {
    // 1. Status Filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    // 2. Date Range Filter on effective_date
    if (item.effective_date) {
      const itemDateStr = String(item.effective_date).substring(0, 10);
      if (fromDate && itemDateStr < fromDate) {
        return false;
      }
      if (toDate && itemDateStr > toDate) {
        return false;
      }
    } else if (fromDate || toDate) {
      return false;
    }

    return true;
  });
}

console.log("=========================================================");
console.log("CLIENT-SIDE FILTER PREDICATE VERIFICATION (Node.js)");
console.log("=========================================================");

// Test 1: Default View (No filter)
const defaultView = filterRevisions(revisions, 'all', '', '');
console.log(`1. Default View (all): ${defaultView.length} records returned (Expected: 4)`);
if (defaultView.length !== 4) throw new Error("Default view failed!");

// Test 2: Filter by Status = Approved
const approvedOnly = filterRevisions(revisions, 'approved', '', '');
console.log(`2. Status = Approved: ${approvedOnly.length} records returned (Expected: 2) -> IDs: [${approvedOnly.map(x=>x.id).join(', ')}]`);
if (approvedOnly.length !== 2 || approvedOnly.some(x => x.status !== 'approved')) throw new Error("Approved status filter failed!");

// Test 3: Filter by Status = Rejected
const rejectedOnly = filterRevisions(revisions, 'rejected', '', '');
console.log(`3. Status = Rejected: ${rejectedOnly.length} records returned (Expected: 1) -> IDs: [${rejectedOnly.map(x=>x.id).join(', ')}]`);
if (rejectedOnly.length !== 1 || rejectedOnly[0].id !== 4) throw new Error("Rejected status filter failed!");

// Test 4: Date Range Filter (2026-03-01 to 2026-08-01)
const dateFiltered = filterRevisions(revisions, 'all', '2026-03-01', '2026-08-01');
console.log(`4. Date Range 2026-03-01 to 2026-08-01: ${dateFiltered.length} records returned (Expected: 2) -> IDs: [${dateFiltered.map(x=>x.id).join(', ')}]`);
if (dateFiltered.length !== 2 || !dateFiltered.map(x=>x.id).includes(2) || !dateFiltered.map(x=>x.id).includes(3)) {
  throw new Error("Date range filter failed!");
}

// Test 5: Combined Status + Date Range Filter (status=approved, from=2026-06-01)
const combinedFiltered = filterRevisions(revisions, 'approved', '2026-06-01', '');
console.log(`5. Combined Status=Approved & From=2026-06-01: ${combinedFiltered.length} records returned (Expected: 1) -> ID: ${combinedFiltered[0].id}`);
if (combinedFiltered.length !== 1 || combinedFiltered[0].id !== 3) {
  throw new Error("Combined filter failed!");
}

// Test 6: Clear Filters Reset
const clearedView = filterRevisions(revisions, 'all', '', '');
console.log(`6. Clear Filters Reset: ${clearedView.length} records returned (Expected: 4)`);
if (clearedView.length !== 4) throw new Error("Clear filters reset failed!");

console.log("=========================================================");
console.log("ALL PREDICATE FILTER TESTS PASSED 100% CLEANLY!");
console.log("=========================================================");
