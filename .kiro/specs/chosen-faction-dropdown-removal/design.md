# Chosen Faction Dropdown Removal Bugfix Design

## Overview

The `#chosenFaction` dropdown in the reputation section of the party chronicle form incorrectly filters bonus reputation entries. When a faction is selected, `buildBonusReputation` excludes that faction from the `bonusRepEarned` array, silently dropping a valid reputation entry from the session report. The dropdown serves no valid purpose — the correct behavior is to include all non-zero reputations without exclusion. The fix removes the dropdown entirely and simplifies `buildBonusReputation` to stop filtering by chosen faction.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a faction is selected in the `#chosenFaction` dropdown and that faction has a non-zero reputation value, causing its bonus reputation to be excluded from the session report
- **Property (P)**: The desired behavior — all non-zero reputations from `reputationValues` appear in `bonusRepEarned`, with no faction excluded
- **Preservation**: Existing behaviors that must remain unchanged: `chosenFactionReputation` numeric field usage, zero-value reputation exclusion, SignUp faction sourcing from actor data, save/load of other shared fields
- **`buildBonusReputation`**: The function in `scripts/model/session-report-builder.ts` that assembles the `bonusRepEarned` array from shared reputation values, currently accepting a `chosenFaction` parameter used to exclude one faction
- **`chosenFaction`**: The `SharedFields.chosenFaction` string property (faction abbreviation code) extracted from the `#chosenFaction` dropdown — this is the field being removed
- **`chosenFactionReputation`**: The `SharedFields.chosenFactionReputation` numeric property (0–9) extracted from the `#chosenFactionReputation` dropdown — this field is NOT being removed and must remain unchanged

## Bug Details

### Bug Condition

The bug manifests when a user selects a faction in the `#chosenFaction` dropdown and that faction has a non-zero reputation value. The `buildBonusReputation` function filters out the selected faction from the `bonusRepEarned` array, causing that faction's reputation to be silently dropped from the session report.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { reputationValues: Record<FactionCode, number>, chosenFaction: string }
  OUTPUT: boolean

  RETURN input.chosenFaction IN ['EA', 'GA', 'HH', 'VS', 'RO', 'VW']
         AND input.reputationValues[input.chosenFaction] > 0
END FUNCTION
```

When `chosenFaction` is empty string (the default), no faction matches the filter and all non-zero reputations are included — this is accidentally correct behavior.

### Examples

- **Example 1**: `chosenFaction = 'EA'`, `reputationValues = { EA: 2, GA: 1, HH: 0, VS: 0, RO: 0, VW: 0 }` → Current: `bonusRepEarned` contains only GA (EA excluded). Expected: `bonusRepEarned` contains both EA and GA.
- **Example 2**: `chosenFaction = 'GA'`, `reputationValues = { EA: 0, GA: 3, HH: 0, VS: 0, RO: 0, VW: 0 }` → Current: `bonusRepEarned` is empty (GA excluded, all others zero). Expected: `bonusRepEarned` contains GA.
- **Example 3**: `chosenFaction = ''` (default), `reputationValues = { EA: 2, GA: 1, HH: 0, VS: 0, RO: 0, VW: 0 }` → Current: `bonusRepEarned` contains EA and GA (accidentally correct). Expected: same.
- **Edge case**: `chosenFaction = 'EA'`, all reputations zero → Current: empty array. Expected: empty array (no change, bug condition not met since chosen faction rep is 0).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `chosenFactionReputation` (numeric, 0–9) continues to be used for the top-level `repEarned` field and each SignUp entry's `repEarned` field
- Zero-value reputations continue to be excluded from `bonusRepEarned`
- SignUp entries continue to source their `faction` field from actor PFS data (`actor.system.pfs.currentFaction`), not from any dropdown
- Save/load of all remaining shared fields (gmPfsNumber, scenarioName, eventCode, eventDate, xpEarned, etc.) continues to work correctly
- The `#chosenFactionReputation` dropdown (labeled "Chosen Faction") continues to render and function as before
- Faction-specific reputation inputs (EA, GA, HH, VS, RO, VW) continue to render and extract values as before

**Scope:**
All inputs that do NOT involve the `chosenFaction` string field should be completely unaffected by this fix. This includes:
- All SignUp entry assembly logic
- All constant field assembly (gameSystem, generateGmChronicle)
- All field mapping logic (gameDate, gmOrgPlayNumber, reporting flags)
- The `chosenFactionReputation` numeric dropdown and its value extraction
- Chronicle PDF generation and export

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear and confirmed:

1. **Incorrect Exclusion Logic in `buildBonusReputation`**: The function at line ~100 of `session-report-builder.ts` filters with `.filter((code) => code !== chosenFaction && ...)`, which excludes the chosen faction from bonus reputation entries. This filter condition is the direct cause of the b
 element in `party-chronicle-filling.hbs` (lines 92–101) provides a faction selection dropdown that feeds into the incorrect exclusion logic. Removing the dropdown eliminates the source of the bad data.

4. **Dead Code Across Multiple Files**: The `chosenFaction` field propagates through `SharedFields` type, `extractFormData`, `createDefaultChronicleData`, `SHARED_FIELD_SELECTORS`, and `buildBonusReputation` parameter — all of which become dead code once the dropdown is removed.

## Correctness Properties

Property 1: Bug Condition - All Non-Zero Reputations Included in Bonus Rep

_For any_ set of reputation values where at least one faction has a non-zero value, the fixed `buildBonusReputation` function SHALL include every faction with a non-zero reputation in the `bonusRepEarned` array, using the correct full faction name and reputation value, without excluding any faction.

**Validates: Requirements 2.1**

Property 2: Preservation - Zero-Value Reputation Exclusion

_For any_ set of reputation values, the fixed `buildBonusReputation` function SHALL exclude factions with zero reputation from the `bonusRepEarned` array, preserving the existing zero-filtering behavior.

**Validates: Requirements 3.2**

Property 3: Preservation - chosenFactionReputation Usage Unchanged

_For any_ valid session report build parameters, the fixed `buildSessionReport` function SHALL produce the same `repEarned` (top-level and per-SignUp) values as the original function, since `chosenFactionReputation` is not modified by this fix.

**Validates: Requirements 3.1**

Property 4: Preservation - SignUp Entry Assembly Unchanged

_For any_ valid party of actors with character fields, the fixed `buildSessionReport` function SHALL produce identical SignUp entries (isGM, orgPlayNumber, characterNumber, characterName, consumeReplay, repEarned, faction) as the original function, since SignUp assembly does not depend on `chosenFaction`.

**Validates: Requirements 3.6**

## Fix Implementation

### Changes Required

The root cause is confirmed — the `chosenFaction` field and its exclusion logic are the problem. The fix is a straightforward removal.

**File**: `scripts/model/session-report-builder.ts`

**Function**: `buildBonusReputation`

**Specific Changes**:
1. **Remove `chosenFaction` parameter**: Change signature from `buildBonusReputation(reputationValues, chosenFaction)` to `buildBonusReputation(reputationValues)`
2. **Remove exclusion filter**: Change `.filter((code) => code !== chosenFaction && ...)` to `.filter((code) => ...nonZeroCheck...)` — remove the `code !== chosenFaction` condition
3. **Update call site**: In `buildSessionReport`, change `buildBonusReputation(shared.reputationValues, shared.chosenFaction)` to `buildBonusReputation(shared.reputationValues)`
4. **Update JSDoc**: Remove the `@param chosenFaction` documentation and update the function description to remove "is not the chosen faction"

**File**: `scripts/model/party-chronicle-types.ts`

**Specific Changes**:
5. **Remove `chosenFaction` property**: Delete the `chosenFaction: string` field from the `SharedFields` interface

**File**: `scripts/handlers/form-data-extraction.ts`

**Specific Changes**:
6. **Remove `chosenFaction` extraction**: Delete the line `chosenFaction: (container.querySelector('#chosenFaction') as HTMLSelectElement)?.value || ''`

**File**: `scripts/handlers/event-listener-helpers.ts`

**Specific Changes**:
7. **Remove `chosenFaction` default**: Delete the `chosenFaction: ''` line from `createDefaultChronicleData`

**File**: `scripts/constants/dom-selectors.ts`

**Specific Changes**:
8. **Remove `CHOSEN_FACTION` constant**: Delete the `CHOSEN_FACTION: '#chosenFaction'` entry from `SHARED_FIELD_SELECTORS`

**File**: `templates/party-chronicle-filling.hbs`

**Specific Changes**:
9. **Remove dropdown HTML**: Delete the `<div class="form-group">` block containing the `#chosenFaction` select element (lines 92–102)

**File**: `scripts/model/test-helpers.ts`

**Specific Changes**:
10. **Remove `chosenFaction` from `createSharedFields`**: Delete the `chosenFaction: ''` default from the factory function

**File**: `scripts/model/session-report-builder.property.test.ts`

**Specific Changes**:
11. **Update existing property tests**: Remove `chosenFaction` from `buildParams`, update Property 5 tests to no longer pass or assert on chosen faction exclusion. The "chosen faction is excluded" test should be removed. The "non-zero non-chosen factions" test should be updated to assert all non-zero factions are included.

**File**: `scripts/model/session-report-builder.test.ts`

**Specific Changes**:
12. **Update unit tests**: Remove `chosenFaction` from test data and update assertions to reflect that all non-zero factions appear in `bonusRepEarned`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause: `buildBonusReputation` excludes the chosen faction.

**Test Plan**: Write property-based tests that generate random reputation values with a chosen faction that has a non-zero value, then assert that the chosen faction appears in `bonusRepEarned`. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Chosen Faction Excluded Test**: Generate random `reputationValues` where the chosen faction has a non-zero value, call `buildBonusReputation` with that chosen faction, assert the chosen faction appears in the result (will fail on unfixed code)
2. **All Non-Zero Factions Included Test**: Generate random `reputationValues`, call `buildBonusReputation` with a random chosen faction, assert the result length equals the count of all non-zero factions (will fail on unfixed code when chosen faction is non-zero)
3. **Full Report Bonus Rep Test**: Build a full session report with a chosen faction that has non-zero rep, assert `bonusRepEarned` includes that faction (will fail on unfixed code)

**Expected Counterexamples**:
- `chosenFaction = 'EA'`, `reputationValues.EA = 3` → EA missing from `bonusRepEarned`
- Any case where the chosen faction has a non-zero reputation value will demonstrate the exclusion bug

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := buildBonusReputation_fixed(input.reputationValues)
  ASSERT allNonZeroFactionsIncluded(result, input.reputationValues)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT buildBonusReputation_original(input.reputationValues, input.chosenFaction)
       = buildBonusReputation_fixed(input.reputationValues)
END FOR
```

When `chosenFaction` is empty string (the non-buggy default), the original function already includes all non-zero factions, so the fixed function (which always includes all non-zero factions) produces the same result.

**Testing Approach**: Property-based testing is recommended for both fix and preservation checking because:
- It generates many combinations of reputation values across all six factions
- It catches edge cases like all-zero reputations, single non-zero faction, all non-zero factions
- It provides strong guarantees that the exclusion logic is fully removed

**Test Plan**: Observe behavior on UNFIXED code first with empty `chosenFaction` (the non-buggy path), then write property-based tests capturing that all non-zero factions are always included.

**Test Cases**:
1. **Zero-Value Exclusion Preservation**: Verify factions with zero reputation continue to be excluded from `bonusRepEarned` after the fix
2. **chosenFactionReputation Preservation**: Verify `repEarned` in the report and SignUp entries continues to use `chosenFactionReputation` numeric value
3. **SignUp Assembly Preservation**: Verify SignUp entries are identical before and after the fix (they don't depend on `chosenFaction`)
4. **Full Faction Name Preservation**: Verify `bonusRepEarned` entries continue to use full faction names from `FACTION_NAMES`

### Unit Tests

- Test `buildBonusReputation` with various reputation value combinations and verify all non-zero factions are included
- Test `buildBonusReputation` with all-zero reputations returns empty array
- Test `buildBonusReputation` with single non-zero faction returns exactly one entry
- Test `buildBonusReputation` with all non-zero factions returns six entries
- Test `buildSessionReport` produces correct `bonusRepEarned` without any faction exclusion
- Test that `SharedFields` type no longer includes `chosenFaction`

### Property-Based Tests

- Generate random reputation values (0–6 per faction) and verify `bonusRepEarned` contains exactly the non-zero factions with correct names and values (fix checking)
- Generate random reputation values and verify zero-value factions are never in `bonusRepEarned` (preservation)
- Generate random session report params and verify `repEarned` equals `chosenFactionReputation` (preservation)
- Generate random party configurations and verify SignUp entries are unaffected (preservation)

### Integration Tests

- Test full session report assembly with multiple non-zero reputations and verify all appear in `bonusRepEarned`
- Test that removing the `chosenFaction` field from saved data does not break loading of other shared fields
- Test that the `#chosenFactionReputation` dropdown continues to function correctly after the `#chosenFaction` dropdown is removed
