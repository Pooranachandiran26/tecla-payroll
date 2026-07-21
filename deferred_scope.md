# Deferred Scope

This document tracks unresolved items, inconsistencies, and outstanding observations for future cleanup.

---

## Test Count Baseline Mismatches

### 1. 227 vs 221 Discrepancy
- **Observation**: A prior test-count inconsistency was flagged regarding a baseline mismatch of 227 vs 221.

### 2. 233 vs 231 Discrepancy (Current Feature)
- **Observation**: A second test-count baseline mismatch occurred — expected baseline was 233 (per Compliance Phase 3 Step 2's walkthrough), but this feature's reconciliation used 231 as "true baseline" before adding its own 4 new tests. 
- **Status**: Not blocking. `git status` confirmed no files were improperly modified in this specific change, so the discrepancy likely originates from an earlier, already-flagged counting inconsistency rather than anything wrong with this feature.
- **Recommendation**: Perform a clean, full test-suite recount whenever there is a natural pause to establish one single trustworthy baseline number going forward, rather than continuing to patch small mismatches feature by feature.
