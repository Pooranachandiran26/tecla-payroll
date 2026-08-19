export const formatINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const MONTH_OPTIONS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

export function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export function computeDueDate(year, month) {
  if (!year || !month) return null;
  // Due date = 15th of the month following the selected payroll month
  const monthIndex = parseInt(month, 10) - 1;
  const dueDate = new Date(parseInt(year, 10), monthIndex + 1, 15);
  return dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// This Form B module is built and legally verified only against the Tamil Nadu Labour Welfare
// Fund Rules, 1973 (Rule 29) — see FormBGeneratorService::resolveContext() on the server, which
// is the actual enforcement point. This frontend mirror exists only to display that same
// derivation immediately, without waiting on a round trip; it never overrides the server's check.
const TN_APPLICABLE_ACT = 'Tamil Nadu Labour Welfare Fund Act, 1972';
const TN_LEGAL_BASIS = 'Rule 29, Tamil Nadu Labour Welfare Fund Rules, 1973';
const NOT_AVAILABLE_ACT = 'Not available in current Form B module';

function isTamilNadu(state) {
  return !!state && state.trim().toLowerCase() === 'tamil nadu';
}

function contextForState(client, branch, state) {
  const applicable = isTamilNadu(state);
  return {
    client_id: client.id,
    company_name: client.company_name,
    branch_id: branch?.id || null,
    branch_name: branch?.branch_name || null,
    state: state || null,
    form_b_applicable: applicable,
    applicable_act: applicable ? TN_APPLICABLE_ACT : NOT_AVAILABLE_ACT,
    legal_basis: applicable ? TN_LEGAL_BASIS : '—',
  };
}

/**
 * Derive the Report Context (state/applicable act/legal basis) for a selected client and
 * optional branch. When no branch is selected ("All Branches"), the state is only shown when
 * every branch of the client shares the same state — a client whose branches span multiple
 * states must not be shown a single (potentially wrong) state or a false Tamil Nadu applicability.
 */
export function deriveFormBContext(client, branchId) {
  const branch = branchId ? client.branches.find((b) => b.id === branchId) : null;

  if (branch) {
    return contextForState(client, branch, branch.state || client.registered_state);
  }

  const branches = client.branches || [];
  if (branches.length === 0) {
    return contextForState(client, null, client.registered_state);
  }

  const uniqueStates = Array.from(new Set(branches.map((b) => (b.state || '').trim()).filter(Boolean)));

  if (uniqueStates.length === 1) {
    return contextForState(client, null, uniqueStates[0]);
  }

  // Mixed states across branches — never guess/display a single state or Tamil Nadu applicability.
  return {
    client_id: client.id,
    company_name: client.company_name,
    branch_id: null,
    branch_name: null,
    state: 'Multiple States',
    form_b_applicable: false,
    applicable_act: 'Not applicable',
    legal_basis: '—',
  };
}

export const STEPS = [
  { key: 'period', label: 'Select Period', description: 'Choose the payroll month' },
  { key: 'source', label: 'Payroll Source', description: 'Pick the locked payroll run' },
  { key: 'review', label: 'Review Data', description: 'Verify calculated values' },
  { key: 'preview', label: 'Preview Form B', description: 'See the statutory register' },
  { key: 'download', label: 'Download / Export', description: 'Get the final file' },
];
