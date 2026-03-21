# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Chosen Faction Excluded From Bonus Reputation
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Generate reputation values where the chosen faction has a non-zero value (isBugCondition: `chosenFaction IN ['EA','GA','HH','VS','RO','VW'] AND reputationValues[chosenFaction] > 0`), then assert the chosen faction appears in `bonusRepEarned`
  - Create file `scripts/model/chosen-faction-removal.pbt.test.ts`
  - Import `buildSessionReport` and `buildParams` helper, `FACTION_NAMES`, and `createSharedFields`
  - Use `reputationValuesArbitrary` (0–6 per faction) and `factionCodeArbitrary` from existing arbitraries
  - Use `fc.pre()` to ensure `reputationValues[chosenFaction] > 0` (bug condition)
  - Assert: `bonusRepEarned` contains an entry with `faction === FACTION_NAMES[chosenFaction]` and `reputation === reputationValues[chosenFaction]`
  - Assert: `bonusRepEarned.length` equals the count of ALL non-zero factions (not excluding chosen)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (chosen faction is excluded by the filter in `buildBonusReputation`)
  - Document counterexamples found (e.g., `chosenFaction='EA', reputationValues.EA=3` → EA missing from `bonusRepEarned`)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Bug-Condition Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (where `chosenFaction` is empty string — the default, which matches no faction code)
  - Write property-based tests in `scripts/model/chosen-faction-removal.pbt.test.ts` capturing observed behavior:
    - **2a: Zero-value factions excluded**: For any reputation values with `chosenFaction = ''`, factions with zero reputation are excluded from `bonusRepEarned` (preservation of requirement 3.2)
    - **2b: chosenFactionReputation usage preserved**: For any valid build params, `report.repEarned` equals `shared.chosenFactionReputation` and each SignUp entry's `repEarned` equals `shared.chosenFactionReputation` (preservation of requirement 3.1)
    - **2c: SignUp assembly unchanged**: For any valid party of actors, SignUp entries have correct `isGM`, `orgPlayNumber`, `characterNumber`, `characterName`, `consumeReplay`, `repEarned`, and `faction` fields sourced from actor data (preservation of requirement 3.6)
    - **2d: Full faction names used**: Every `bonusRepEarned` entry uses a full faction name from `FACTION_NAMES` (preservation of requirement 3.5)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [x] 3. Remove chosenFaction dropdown and exclusion logic

  - [x] 3.1 Remove chosenFaction parameter and exclusion filter from buildBonusReputation
    - In `scripts/model/session-report-builder.ts`, remove `chosenFaction` parameter from `buildBonusReputation` signature
    - Change `.filter((code) => code !== chosenFaction && ...)` to `.filter((code) => (reputationValues[code as keyof typeof reputationValues] ?? 0) !== 0)`
    - Update call site in `buildSessionReport`: change `buildBonusReputation(shared.reputationValues, shared.chosenFaction)` to `buildBonusReputation(shared.reputationValues)`
    - Update JSDoc to remove `@param chosenFaction` and remove "is not the chosen faction" from description
    - _Bug_Condition: isBugCondition(input) where chosenFaction IN factionCodes AND reputationValues[chosenFaction] > 0_
    - _Expected_Behavior: bonusRepEarned includes ALL non-zero factions without exclusion_
    - _Preservation: Zero-value exclusion, chosenFactionReputation usage, SignUp assembly unchanged_
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.2 Remove chosenFaction from SharedFields type and all references
    - In `scripts/model/party-chronicle-types.ts`, remove `chosenFaction: string` from `SharedFields` interface
    - In `scripts/handlers/form-data-extraction.ts`, remove the `chosenFaction` extraction line
    - In `scripts/handlers/event-listener-helpers.ts`, remove `chosenFaction: ''` from `createDefaultChronicleData`
    - In `scripts/constants/dom-selectors.ts`, remove `CHOSEN_FACTION` constant from `SHARED_FIELD_SELECTORS`
    - In `scripts/model/test-helpers.ts`, remove `chosenFaction: ''` from `createSharedFields`
    - _Requirements: 2.4_

  - [x] 3.3 Remove chosenFaction dropdown from template
    - In `templates/party-chronicle-filling.hbs`, remove the `<div class="form-group">` block containing the `#chosenFaction` select element
    - _Requirements: 2.3_

  - [x] 3.4 Update existing tests to remove chosenFaction references
    - In `scripts/model/session-report-builder.property.test.ts`:
      - Remove `chosenFaction` from `buildParams` helper and all test calls
      - Remove `factionCodeArbitrary` generation where it was only used for `chosenFaction`
      - Update Property 5 "bonusRepEarned includes non-zero non-chosen factions" to assert ALL non-zero factions are included (no exclusion)
      - Remove the "chosen faction is excluded from bonusRepEarned even when non-zero" test entirely
      - Update "factions with zero reputation are excluded" test to remove `chosenFaction` param
      - Update "bonusRepEarned entries use full faction names" test to remove `chosenFaction` param
    - In `scripts/model/session-report-builder.test.ts`:
      - Remove `chosenFaction` from test data
      - Update assertions to reflect all non-zero factions appear in `bonusRepEarned`
    - _Requirements: 2.1, 2.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - All Non-Zero Reputations Included
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (all non-zero factions in bonusRepEarned)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Bug-Condition Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npx jest --silent` and verify all tests pass
  - Run `npm run lint` and verify no lint errors
  - Ensure all property-based tests (bug condition, preservation, existing) pass
  - Ask the user if questions arise
