# Bugfix Requirements Document

## Introduction

The Earn Income critical success calculation in `getIncomePerDay()` incorrectly applies a minimum effective level of 3 when computing income for critical successes. The current implementation interprets the PFS rule as "use `max(taskLevel + 1, 3)`", which inflates income for low-level characters. The actual PFS rule is simpler: on a critical success, the player earns income as if their task level were one level higher (i.e., `taskLevel + 1`), with no artificial minimum of 3. The minimum-level-3 clause in the CRB refers to the minimum PC level at which Earn Income becomes available, not a floor on the income lookup level.

For example, a level 3 PC with the PFS default task level of 1 who rolls a critical success currently gets income for level 3 (0.5 gp/day = 4 gp over 8 days), when they should get income for level 2 (0.3 gp/day = 2.4 gp over 8 days).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a character rolls a critical success on an Earn Income check with a task level below 2 THEN the system incorrectly floors the effective income lookup level at 3 using `Math.max(taskLevel + 1, 3)`, resulting in inflated income

1.2 WHEN a level 3 PC with task level 1 (PFS default) rolls a critical success with trained proficiency and 8 downtime days THEN the system returns 4.0 gp (level 3 trained = 0.5 gp/day × 8) instead of the correct 2.4 gp

1.3 WHEN a level 1 PC with task level 0 rolls a critical success with trained proficiency THEN the system uses level 3 for the income lookup (due to the `Math.max` floor) instead of level 1

1.4 WHEN a level 2 PC with task level 0 rolls a critical success with trained proficiency THEN the system uses level 3 for the income lookup instead of level 1

### Expected Behavior (Correct)

2.1 WHEN a character rolls a critical success on an Earn Income check THEN the system SHALL use `taskLevel + 1` as the effective level for the income table lookup, with no minimum floor (except clamping to the valid range 0-20)

2.2 WHEN a level 3 PC with task level 1 (PFS default) rolls a critical success with trained proficiency and 8 downtime days THEN the system SHALL return 2.4 gp (level 2 trained = 0.3 gp/day × 8)

2.3 WHEN a level 1 PC with task level 0 rolls a critical success with trained proficiency THEN the system SHALL use level 1 for the income lookup (0 + 1 = 1)

2.4 WHEN a level 2 PC with task level 0 rolls a critical success with trained proficiency THEN the system SHALL use level 1 for the income lookup (0 + 1 = 1)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a character rolls a critical success with task level 19 THEN the system SHALL CONTINUE TO use level 20 for the income lookup (19 + 1 = 20, clamped at 20)

3.2 WHEN a character rolls a critical success with task level 20 THEN the system SHALL CONTINUE TO use the special level 20 critical success table values

3.3 WHEN a character rolls a regular success on an Earn Income check THEN the system SHALL CONTINUE TO use the task level directly for the income lookup with no modification

3.4 WHEN a character rolls a failure on an Earn Income check THEN the system SHALL CONTINUE TO use the failure column of the income table at the task level

3.5 WHEN a character rolls a critical failure on an Earn Income check THEN the system SHALL CONTINUE TO return 0 gp

3.6 WHEN a character opts out of Earn Income (task level "-") THEN the system SHALL CONTINUE TO return 0 gp

3.7 WHEN a character has 0 downtime days THEN the system SHALL CONTINUE TO return 0 gp regardless of success level

3.8 WHEN a character rolls a critical success with task level 5 or higher THEN the system SHALL CONTINUE TO use `taskLevel + 1` for the income lookup (these levels were unaffected by the minimum-3 floor)
