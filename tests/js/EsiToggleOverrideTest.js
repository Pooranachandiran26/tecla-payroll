import assert from 'assert';

/**
 * Pure state transition simulator matching EmployeeForm.jsx useEffect logic
 */
function evaluateEsiToggleState({ grossCTC, limit = 21000, currentEsiToggle, overridesEsi, formMode = 'add' }) {
  let newEsiToggle = currentEsiToggle;
  let warningMessage = null;

  if (grossCTC > limit) {
    if (formMode !== 'add' && currentEsiToggle) {
      warningMessage = `ℹ Gross salary now exceeds ESI threshold (₹${limit}). ESI contribution continues until end of period.`;
    } else {
      if (!overridesEsi) {
        newEsiToggle = false;
      }
      warningMessage = `⚠ Gross salary exceeds ESI threshold (₹${limit}) — ESI does not apply.`;
    }
  } else {
    warningMessage = null;
    if (grossCTC > 0 && !overridesEsi) {
      newEsiToggle = true;
    }
  }

  return { esiToggle: newEsiToggle, warningMessage };
}

// -------------------------------------------------------------
// TEST CASE 1: Manual override set (overrides.esi = true, esiToggle = false)
// When gross drops below 21000, esiToggle MUST STAY false (NOT flip back on)
// -------------------------------------------------------------
console.log('Running Test Case 1: Respect explicit manual override when gross < 21000...');
const case1Initial = {
  grossCTC: 25000,
  limit: 21000,
  currentEsiToggle: false,
  overridesEsi: true, // Admin explicitly turned ESI OFF
  formMode: 'add'
};

const case1Result = evaluateEsiToggleState({ ...case1Initial, grossCTC: 19994 });

assert.strictEqual(
  case1Result.esiToggle,
  false,
  'esiToggle must stay false when overrides.esi is true (manual override respected)'
);
console.log('✓ Case 1 Passed: Manual override (esiToggle=false, overrides.esi=true) preserved when gross drops below 21000.');


// -------------------------------------------------------------
// TEST CASE 2: Mirror Test (overrides.esi = false, default state)
// When gross drops below 21000, esiToggle MUST auto-enable (flip to true)
// -------------------------------------------------------------
console.log('Running Test Case 2 (Mirror Test): Auto-enable ESI when no override and gross < 21000...');
const case2Initial = {
  grossCTC: 25000,
  limit: 21000,
  currentEsiToggle: false,
  overridesEsi: false, // No manual override
  formMode: 'add'
};

const case2Result = evaluateEsiToggleState({ ...case2Initial, grossCTC: 19994 });

assert.strictEqual(
  case2Result.esiToggle,
  true,
  'esiToggle must auto-enable to true when overrides.esi is false'
);
console.log('✓ Case 2 Passed: Auto-enable (esiToggle=true) triggered when gross drops below 21000 without override.');

console.log('\nAll ESI toggle override tests passed successfully!');
