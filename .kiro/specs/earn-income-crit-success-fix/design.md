# Earn Income Critical Success Fix - Bugfix Design

## Overview

The `getIncomePerDay()` function in `scripts/utils/earned-income-calculator.ts` incorrectly calculates income for critical successes at low task levels. The current code uses `Math.max(level + 1, 3)` which floors the effective income lookup level at 3, inflating income for task levels 0, 1, and 2. The PFS rule simply says "treat your task level as 1 higher" on a critical success — there is no minimum-level-3 floor on the income lookup. The fix replaces `Math.max(level + 1, 3)` with `Math.min(level + 1, 20)`, applying only the upper-bound clamp to the valid table range.

## Glossary

- **Bug_Condition (C)**: A critical success on an Earn Income check where `taskLevel < 2` — the range where `Math.max(level + 1, 
 proficiency rank
- **INCOME_TABLE**: The lookup table mapping task levels (0-20) and proficiency ranks to income per day in gold pieces
- **effectiveLevel**: The computed task level used for the income table lookup on critical success — currently `Math.max(level + 1, 3)`, should be `Math.min(level + 1, 20)`

## Bug Details

### Bug Condition

The bug manifests when a character rolls a critical success on an Earn Income check with a task level of 0 or 1. The `getIncomePerDay` function uses `Math.max(level + 1, 3)` to compute the effective level, which incorrectly floors the lookup level at 3 for these low task levels. Task level 2 also triggers the floor (since `max(3, 3) = 3` equals `2 + 1 = 3`, the result is coincidentally correct but for the wrong reason).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { taskLevel: number, successLevel: string }
  OUTPUT: boolean

  RETURN input.successLevel == 'critical_success'
         AND input.taskLevel IN [0, 1]
         AND input.taskLevel != 20
END FUNCTION
```

Note: Task level 2 is technically affected by the `Math.max` call (`max(3, 3) = 3`), but the result coincidentally matches `level + 1 = 3`, so the output is correct. The observable bug only manifests at task levels 0 and 1.

### Examples

- **Task level 0, trained, critical success**: Current returns 0.5 gp/day (level 3 trained). Expected: 0.2 gp/day (level 1 trained). Difference: +0.3 gp/day.
- **Task level 1, trained, critical success**: Current returns 0.5 gp/day (level 3 trained). Expected: 0.3 gp/day (level 2 trained). Difference: +0.2 gp/day.
- **Task level 0, expert, critical success**: Current returns 0.5 gp/day (level 3 expert). Expected: 0.2 gp/day (level 1 expert). Difference: +0.3 gp/day.
- **Task level 1, expert, critical success**: Current returns 0.5 gp/day (level 3 expert). Expected: 0.3 gp/day (level 2 expert). Difference: +0.2 gp/day.
- **Task level 5, trained, critical success**: Current returns 1.5 gp/day (level 6 trained). Expected: 1.5 gp/day (level 6 trained). No difference — levels >= 3 are unaffected.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Regular success income lookups must continue to use the task level directly with no modification
- Failure income lookups must continue to use the failure column at the task level
- Critical failure must continue to return 0 gp
- Task level "-" (opt-out) must continue to return 0 gp
- 0 downtime days must continue to return 0 gp regardless of success level
- Level 20 critical success must continue to use the special critical success table values
- Critical success at task levels 3-19 must continue to use `taskLevel + 1` (these were already correct since `max(level + 1, 3) == level + 1` when `level >= 2`)
- The `calculateEarnedIncome` formula (income per day × downtime days, rounded to 2 decimals) must remain unchanged
- The `formatIncomeValue` function must remain unchanged

**Scope:**
All inputs that do NOT involve a critical success at task levels 0 or 1 should be completely unaffected by this fix. This includes:
- All success, failure, and critical failure lookups at any task level
- All critical success lookups at task levels 2-20
- All `calculateEarnedIncome` calls that don't involve the affected `getIncomePerDay` path
- All `calculateTaskLevelOptions`, `getDCForLevel`, and `formatIncomeValue` calls

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is a single misinterpretation of the PFS rules:

1. **Misinterpreted Rule**: The CRB states that Earn Income becomes available at level 3. The developer interpreted "minimum level 3" as a floor on the income lookup level for critical successes, encoding it as `Math.max(level + 1, 3)`. The actual PFS rule is simply "treat your task level as 1 higher" — the level-3 minimum refers to PC eligibility, not the income table lookup.

2. **Specific Code Location**: Line in `getIncomePerDay()` within the `critical_success` branch:
   ```typescript
   const effectiveLevel = Math.min(Math.max(level + 1, 3), 20);
   ```
   The `Math.max(..., 3)` is the bug. The `Math.min(..., 20)` upper clamp is correct and should be preserved.

## Correctness Properties

Property 1: Bug Condition - Critical Success Uses TaskLevel + 1 Without Floor

_For any_ task level in [0, 19] and any proficiency rank, the fixed `getIncomePerDay` function with `successLevel = 'critical_success'` SHALL return the income table value at `taskLevel + 1` for that proficiency rank, with no minimum floor applied.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Critical-Success Behavior Unchanged

_For any_ task level in [0, 20], any proficiency rank, and any success level that is NOT `critical_success`, the fixed `getIncomePerDay` function SHALL produce the same result as the original function, preserving all success, failure, and critical failure income lookups.

**Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7**

Property 3: Preservation - High Task Level Critical Success Unchanged

_For any_ task level in [3, 19] and any proficiency rank, the fixed `getIncomePerDay` function with `successLevel = 'critical_success'` SHALL produce the same result as the original function, since `Math.max(level + 1, 3) == level + 1` when `level >= 2`.

**Validates: Requirements 3.1, 3.8**

Property 4: Preservation - Level 20 Critical Success Special Case

_For any_ proficiency rank, the fixed `getIncomePerDay` function with `taskLevel = 20` and `successLevel = 'critical_success'` SHALL return the special level 20 critical success table value, identical to the original function.

**Validates: Requirements 3.2**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `scripts/utils/earned-income-calculator.ts`

**Function**: `getIncomePerDay`

**Specific Changes**:
1. **Remove the minimum-3 floor**: Change `Math.min(Math.max(level + 1, 3), 20)` to `Math.min(level + 1, 20)`. This removes the `Math.max(..., 3)` that incorrectly floors the effective level.

2. **Update the JSDoc comment**: Remove the "(minimum level 3)" language from the function's doc comment and the inline comment. The corrected comment should reflect the actual PFS rule: "On a critical success, use task level + 1 for the income lookup."

3. **Update the inline comment**: Change `// For other levels, use max(task level + 1, 3) to enforce minimum level 3` to `// For other levels, use task level + 1 (clamped to valid range)`.

**No other files need to change.** The fix is a single-expression change in one function.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that `Math.max(level + 1, 3)` is the root cause by observing inflated income at low task levels.

**Test Plan**: Write property-based tests that generate critical success inputs at task levels 0 and 1, and assert that the income equals the table value at `taskLevel + 1`. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Task Level 0 Critical Success**: Assert `getIncomePerDay(0, 'critical_success', rank) == INCOME_TABLE[1][rank]` (will fail on unfixed code — returns level 3 values)
2. **Task Level 1 Critical Success**: Assert `getIncomePerDay(1, 'critical_success', rank) == INCOME_TABLE[2][rank]` (will fail on unfixed code — returns level 3 values)
3. **Concrete Example**: Assert `calculateEarnedIncome(1, 'critical_success', 'trained', 8) == 2.4` (will fail on unfixed code — returns 4.0)

**Expected Counterexamples**:
- `getIncomePerDay(0, 'critical_success', 'trained')` returns 0.5 (level 3) instead of 0.2 (level 1)
- `getIncomePerDay(1, 'critical_success', 'trained')` returns 0.5 (level 3) instead of 0.3 (level 2)
- Root cause confirmed: `Math.max(0 + 1, 3) = 3` and `Math.max(1 + 1, 3) = 3` instead of 1 and 2

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL taskLevel IN [0, 19], proficiencyRank IN [trained, expert, master, legendary]
  WHERE successLevel == 'critical_success' DO
    result := getIncomePerDay_fixed(taskLevel, 'critical_success', proficiencyRank)
    expectedLevel := taskLevel + 1
    ASSERT result == INCOME_TABLE[expectedLevel][proficiencyRank]
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL taskLevel IN [0, 20], proficiencyRank, successLevel
  WHERE NOT (successLevel == 'critical_success' AND taskLevel IN [0, 1]) DO
    ASSERT getIncomePerDay_original(taskLevel, successLevel, proficiencyRank)
           == getIncomePerDay_fixed(taskLevel, successLevel, proficiencyRank)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of task level, proficiency rank, and success level automatically
- It catches any unintended side effects of the one-line change
- It provides strong guarantees that all non-buggy paths remain unchanged

**Test Plan**: Capture the current behavior of the unfixed code for non-critical-success paths and critical success at levels 3-19, then write property-based tests asserting the fixed code matches.

**Test Cases**:
1. **Success Preservation**: Verify `getIncomePerDay(level, 'success', rank)` is unchanged for all levels 0-20
2. **Failure Preservation**: Verify `getIncomePerDay(level, 'failure', rank)` is unchanged for all levels 0-20
3. **Critical Failure Preservation**: Verify `getIncomePerDay(level, 'critical_failure', rank)` returns 0 for all levels
4. **High-Level Critical Success Preservation**: Verify `getIncomePerDay(level, 'critical_success', rank)` is unchanged for levels 3-19
5. **Level 20 Critical Success Preservation**: Verify special table values are unchanged

### Unit Tests

- Test the specific examples from the bug report (task level 0, 1 with each proficiency rank)
- Test the concrete scenario: level 3 PC, task level 1, trained, 8 days = 2.4 gp
- Test edge cases: task level 19 critical success (level 20 normal values), task level 20 critical success (special values)
- Update existing unit tests that assert the old minimum-3 behavior to assert the corrected behavior

### Property-Based Tests

- Generate random task levels 0-19 and proficiency ranks, verify critical success uses `taskLevel + 1` for income lookup
- Generate random non-critical-success inputs, verify income is unchanged from the original implementation
- Generate random critical success inputs at levels 3-19, verify income matches the original implementation (these were already correct)

### Integration Tests

- Test full `calculateEarnedIncome` flow with critical success at low task levels and various downtime days
- Test that the income display in the chronicle form shows correct values after the fix
