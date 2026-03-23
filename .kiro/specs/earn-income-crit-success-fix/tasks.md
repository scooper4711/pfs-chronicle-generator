# Earn Income Critical Success Fix - Tasks

## Task 1: Write Exploratory Tests (Bug Condition Checking)

Write tests that demonstrate the bug on the UNFIXED code, confirming the root cause.

- [x] 1.1 Add exploratory PBT in `tests/utils/earned-income-calculator.pbt.test.ts` that generates task levels 0-1 with all proficiency ranks and asserts `getIncomePerDay(taskLevel, 'critical_success', rank) == INCOME_TABLE[taskLevel + 1][rank]`. This test SHOULD FAIL on unfixed code, confirming the bug.
  - PBT Property: "Property 1: Bug Condition - Critical Success Uses TaskLevel + 1 Without Floor"
- [x] 1.2 Add exploratory unit test in `tests/utils/earned-income-calculator.test.ts` asserting `calculateEarnedIncome(1, 'critical_success', 'trained', 8) == 2.4` (the concrete example from the bug report). This test SHOULD FAIL on unfixed code (returns 4.0).

## Task 2: Fix the Bug

Apply the one-line fix to `getIncomePerDay()`.

- [x] 2.1 In `scripts/utils/earned-income-calculator.ts`, in the `getIncomePerDay` function's critical success branch, change `Math.min(Math.max(level + 1, 3), 20)` to `Math.min(level + 1, 20)`
- [x] 2.2 Update the JSDoc comment on `getIncomePerDay` to remove "minimum level 3" language and reflect the corrected rule
- [x] 2.3 Update the inline comment from `// For other levels, use max(task level + 1, 3) to enforce minimum level 3` to `// For other levels, use task level + 1 (clamped to valid range)`

## Task 3: Update Existing Tests to Match Corrected Behavior

Update unit tests and PBT tests that assert the old minimum-3 floor behavior.

- [x] 3.1 Update the unit test "should use minimum level 3 for critical success at level 0" to assert the corrected values: `getIncomePerDay(0, 'critical_success', 'trained')` should return 0.2 (level 1 trained), not 0.5 (level 3 trained). Update all proficiency ranks in this test.
- [x] 3.2 Update the unit test "should use minimum level 3 for critical success at level 1" to assert the corrected values: `getIncomePerDay(1, 'critical_success', 'trained')` should return 0.3 (level 2 trained), not 0.5 (level 3 trained). Update all proficiency ranks in this test.
- [x] 3.3 Update the unit test "should use minimum level 3 for critical success at level 2" to assert the corrected values: `getIncomePerDay(2, 'critical_success', 'trained')` should return 0.5 (level 3 trained) — this value is coincidentally the same, but update the test name and comment to reflect the corrected reasoning (level 2 + 1 = 3, not "minimum level 3").
- [x] 3.4 Update the PBT "Property 3: Critical Success Calculation" test that asserts `effectiveLevel = Math.max(taskLevel + 1, 3)` to assert `effectiveLevel = taskLevel + 1` instead. This is the existing PBT that encodes the old buggy behavior.

## Task 4: Write Fix Verification and Preservation Tests

Write property-based tests that verify the fix and preservation of existing behavior.

- [x] 4.1 Add PBT for Property 1 (fix verification): generate task levels 0-19 and all proficiency ranks, assert `getIncomePerDay(taskLevel, 'critical_success', rank) == INCOME_TABLE[taskLevel + 1][rank]`
  - PBT Property: "Property 1: Bug Condition - Critical Success Uses TaskLevel + 1 Without Floor"
- [x] 4.2 Add PBT for Property 2 (preservation): generate task levels 0-20, all proficiency ranks, and non-critical-success success levels, assert income is unchanged (matches the income table directly)
  - PBT Property: "Property 2: Preservation - Non-Critical-Success Behavior Unchanged"
- [x] 4.3 Add PBT for Property 4 (level 20 preservation): assert level 20 critical success returns the special table values for all proficiency ranks
  - PBT Property: "Property 4: Preservation - Level 20 Critical Success Special Case"

## Task 5: Run All Tests and Verify

- [x] 5.1 Run `npx jest --silent` and verify all tests pass
- [x] 5.2 Run `npm run lint` and verify no lint errors
