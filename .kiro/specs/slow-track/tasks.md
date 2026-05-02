# Implementation Plan: Slow Track

## Overview

Add a per-character "Slow Track" checkbox to the party chronicle form that halves XP, all reputation values, gold (currency gained), and downtime days for that character. The checkbox appears on the same line as the existing "Consume Replay" checkbox and is hidden for Starfinder Society (`sf2e`). Override interactions are respected: override XP and override currency values are used as-is when active, while reputation and downtime days are still halved. The implementation extends the existing per-character data model, inserts halving logic into the chronicle generation and session report pipelines, and adds display update handlers.

## Tasks

- [x] 1. Extend data model with slowTrack field
  - [x] 1.1 Add `slowTrack: boolean` to `UniqueFields` interface in `scripts/model/party-chronicle-types.ts`
    - Add field with JSDoc comment referencing slow-track requirements
    - _Requirements: 1.1, 6.1_

  - [x] 1.2 Add `slowTrack: boolean` to `SignUp` interface in `scripts/model/session-report-types.ts`
    - Add field with JSDoc comment referencing slow-track requirements
    - _Requirements: 7.1_

  - [x] 1.3 Extend `buildDefaultCharacterFields()` in `scripts/handlers/clear-button-handlers.ts`
    - Add `slowTrack: false` to the default character fields object
    - _Requirements: 6.3_

- [x] 2. Add Slow Track checkbox to template
  - [x] 2.1 Add Slow Track checkbox to GM character section in `templates/party-chronicle-filling.hbs`
    - Place on the same line (same form-group) as the Consume Replay checkbox
    - Wrap both checkboxes in `{{#unless (eq gameSystem "sf2e")}}` block
    - Use `name="characters.{{gmCharacter.id}}.slowTrack"` with `class="override-icon-checkbox"`
    - Add tooltip: "Slow track halves XP, reputation, gold, and downtime days for this character."
    - Restore checked state from `gmCharacterFields.slowTrack`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.3_

  - [x] 2.2 Add Slow Track checkbox to party member section in `templates/party-chronicle-filling.hbs`
    - Place on the same line (same form-group) as the Consume Replay checkbox
    - Wrap both checkboxes in `{{#unless (eq ../gameSystem "sf2e")}}` block
    - Use `name="characters.{{this.id}}.slowTrack"` with `class="override-icon-checkbox"`
    - Add tooltip: "Slow track halves XP, reputation, gold, and downtime days for this character."
    - Restore checked state from `savedData.characters[this.id].slowTrack`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Extend form data extraction and chronicle generation extraction
  - [x] 3.1 Extend `extractFormData()` in `scripts/handlers/form-data-extraction.ts`
    - Read `slowTrack` checkbox checked state from `input[name="characters.${actorId}.slowTrack"]`
    - Use `|| false` as safe default for migration from older saved data
    - _Requirements: 6.1, 6.2_

  - [x] 3.2 Extend `extractUniqueFields()` in `scripts/handlers/chronicle-generation.ts`
    - Add `slowTrack: Boolean(uniqueFields.slowTrack)` to the returned UniqueFields object
    - _Requirements: 6.1_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement slow track halving in chronicle generation mapper
  - [x] 5.1 Extend `mapToCharacterData()` in `scripts/model/party-chronicle-mapper.ts`
    - When `unique.slowTrack && !unique.overrideXp`: set `xp_gained = shared.xpEarned / 2`
    - When `unique.slowTrack`: create a modified copy of `shared` with halved `chosenFactionReputation` and halved `reputationValues` before passing to `calculateReputation()`
    - When `unique.slowTrack`: pass `shared.downtimeDays / 2` to `calculateEarnedIncome()` instead of `shared.downtimeDays`
    - When `unique.slowTrack && !unique.overrideCurrency`: set `currency_gained = (treasureBundleValue + earnedIncome) / 2`
    - When overrides are active, use override values as-is (existing behavior)
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 Write property test for XP halving in chronicle generation (Property 1)
    - **Property 1: XP halving in chronicle generation respects slow track and override states**
    - Test `mapToCharacterData` with generated `SharedFields` and `UniqueFields` containing random `slowTrack`, `overrideXp`, `overrideXpValue`, and `xpEarned` values
    - Verify `xp_gained` equals `overrideXpValue` when `overrideXp` is true, `xpEarned / 2` when `slowTrack && !overrideXp`, or `xpEarned` when `!slowTrack && !overrideXp`
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 5.3 Write property test for reputation halving in chronicle generation (Property 2)
    - **Property 2: Reputation halving in chronicle generation**
    - Test `mapToCharacterData` with generated reputation values and `slowTrack` states
    - Verify reputation lines reflect halved values when `slowTrack` is true and standard values when false
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 5.4 Write property test for currency halving in chronicle generation (Property 3)
    - **Property 3: Currency halving in chronicle generation respects slow track, downtime, and override states**
    - Test `mapToCharacterData` with generated treasure bundles, downtime days, earned income parameters, and `slowTrack`/`overrideCurrency` states
    - Verify `currency_gained` matches the expected halving logic including halved downtime days for earned income
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4**

  - [x] 5.5 Write unit tests for slow track halving in `mapToCharacterData()`
    - Test XP halved when `slowTrack` is true and `overrideXp` is false
    - Test XP uses override value as-is when `overrideXp` is true regardless of `slowTrack`
    - Test XP unchanged when `slowTrack` is false
    - Test reputation values halved when `slowTrack` is true
    - Test reputation values unchanged when `slowTrack` is false
    - Test downtime days halved before earned income calculation when `slowTrack` is true
    - Test currency_gained halved (total, not components) when `slowTrack` is true and `overrideCurrency` is false
    - Test currency uses override value as-is when `overrideCurrency` is true regardless of `slowTrack`
    - Test fractional values preserved: 1 XP → 0.5 XP, 3 reputation → 1.5, 7 downtime → 3.5
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement slow track halving in session report builder
  - [x] 7.1 Extend `calculateCharacterRewards()` in `scripts/model/session-report-builder.ts`
    - Accept `slowTrack` from `UniqueFields` parameter
    - When `slowTrack && !overrideXp`: halve `xpEarned`
    - When `slowTrack && !overrideCurrency`: halve calculated `currencyGained`
    - When overrides are active, use override values as-is (existing behavior)
    - _Requirements: 7.2, 7.3, 7.5, 7.6_

  - [x] 7.2 Extend `buildSignUp()` and `buildGmSignUp()` in `scripts/model/session-report-builder.ts`
    - Include `slowTrack: characterFields.slowTrack` in the returned `SignUp` object
    - When `slowTrack` is true: halve `repEarned` (`shared.chosenFactionReputation / 2`)
    - _Requirements: 7.1, 7.4_

  - [x] 7.3 Write property test for session report reward halving (Property 6)
    - **Property 6: Session report reward halving respects slow track and override states**
    - Test `buildSignUp` and `buildGmSignUp` with generated `SharedFields` and `UniqueFields` containing random slow track and override states
    - Verify XP, reputation, and currency in the `SignUp` match the expected halving logic
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6**

  - [x] 7.4 Write property test for session report slowTrack flag (Property 7)
    - **Property 7: Session report includes slowTrack flag**
    - Test `buildSignUp` with generated characters, verifying the `slowTrack` field in the `SignUp` matches the input `UniqueFields.slowTrack` value
    - **Validates: Requirements 7.1**

  - [x] 7.5 Write unit tests for slow track in session report builder
    - Test session report halves XP when `slowTrack` is true and `overrideXp` is false
    - Test session report uses override XP as-is when `overrideXp` is true regardless of `slowTrack`
    - Test session report halves `repEarned` when `slowTrack` is true
    - Test session report halves currency when `slowTrack` is true and `overrideCurrency` is false
    - Test session report uses override currency as-is when `overrideCurrency` is true regardless of `slowTrack`
    - Test `slowTrack: true` included in SignUp when slow track is active
    - Test `slowTrack: false` included in SignUp when slow track is inactive
    - Test GM character SignUp includes slow track halving
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.6 Write integration test for `buildSessionReport()` with slow track (Copy Session Report)
    - Test `buildSessionReport()` end-to-end with a mixed party: one character on slow track, one on standard, and optionally a GM character on slow track
    - Verify the assembled `SessionReport.signUps` array contains correct `slowTrack`, `xpEarned`, `repEarned`, and `currencyGained` values for each character
    - Verify slow track character has halved XP, halved repEarned, and halved currencyGained
    - Verify standard character has unmodified XP, repEarned, and currencyGained
    - Verify GM character on slow track has halved values with `isGM: true`
    - Verify `bonusRepEarned` array is unaffected by per-character slow track (bonus rep is session-level, not per-character)
    - Test with override XP active on a slow track character: XP should use override value as-is
    - Test with override currency active on a slow track character: currency should use override value as-is
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement slow track persistence and clear behavior
  - [x] 9.1 Write property test for slow track persistence round-trip (Property 4)
    - **Property 4: Slow track persistence round-trip**
    - Test save/load cycle with generated `PartyChronicleData` containing random `slowTrack` values using a mock storage backend
    - Verify loaded `slowTrack` values match saved values for each character
    - **Validates: Requirements 6.1, 6.2**

  - [x] 9.2 Write property test for clear resets slow track (Property 5)
    - **Property 5: Clear resets all slow track states**
    - Test `buildDefaultCharacterFields` with generated party actors, verifying all `slowTrack` fields are reset to `false`
    - **Validates: Requirements 6.3**

  - [x] 9.3 Write property test for per-character slow track independence (Property 8)
    - **Property 8: Per-character slow track independence**
    - Test `mapToCharacterData` called for multiple characters with different `slowTrack` states, verifying each character's output reflects only its own state
    - **Validates: Requirements 9.1, 9.2, 9.4**

- [x] 10. Wire slow track event handlers for display updates
  - [x] 10.1 Extend `handleFieldChange()` in `scripts/handlers/party-chronicle-handlers.ts`
    - Detect slow track checkbox changes by checking `fieldName` for `.slowTrack`
    - When slow track changes, update the XP label for that character (halved or standard)
    - When slow track changes, update the earned income display for that character (using halved downtime days)
    - When slow track changes, update the treasure bundle / gold display for that character (halved total)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 10.2 Extend display functions in `scripts/handlers/shared-rewards-handlers.ts`
    - Extend `updateEarnedIncomeDisplay` to accept an optional `slowTrack` parameter; when true, pass halved downtime days to the earned income calculation
    - Extend `updateTreasureBundleDisplay` to accept an optional `slowTrack` parameter; when true, display the halved gold value
    - Or create a new `updateSlowTrackDisplays(characterId, container)` function that reads current shared values and slow track state, then updates XP label, earned income, and gold displays for that character
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, matching the existing codebase
- `slowTrack` is stored in `UniqueFields` (per-character), not `SharedFields`
- Halving preserves fractional values — no rounding is applied per Lorespire rules
- Override XP and override currency values bypass slow track halving when active
- Reputation and downtime days are always halved when slow track is active (regardless of overrides)
- Gold halving applies to the final `currency_gained` total, not individual components
- Both Slow Track and Consume Replay checkboxes are hidden for Starfinder Society (`sf2e`)
- The existing `Boolean()` coercion of `undefined` handles migration from older saved data without a migration script
