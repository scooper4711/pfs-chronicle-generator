# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Session Report Encoding, repEarned, and gameDate Bugs
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three bugs exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for each bug:
    - UTF-16LE: Serialize any report with `skipBase64 = false`, base64-decode, interpret as UTF-16LE, assert valid JSON matching original
    - repEarned: Build report with `chosenFactionReputation` in range 1–9, assert `report.repEarned === chosenFactionReputation`
    - gameDate: Build any report, assert `gameDate` matches `/^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00\+00:00$/` and starts with `shared.eventDate`
  - Test file: `scripts/model/__tests__/session-report-encoding-fix.pbt.test.ts`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bugs exist)
  - Document counterexamples found:
    - UTF-16LE decode of `btoa(json)` output produces garbled characters, not valid JSON
    - `report.repEarned` is always `0` regardless of `chosenFactionReputation` input
    - `report.gameDate` has no `T` separator or time component
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unchanged Behaviors Across Fix
  - **IMPORTANT**: Follow observation-first methodology
  - **Observe on UNFIXED code**:
    - `serializeSessionReport(report, true)` returns raw JSON string (skipBase64 mode)
    - All fields except `repEarned` and `gameDate` are identical between old and new builder output
    - Per-player `signUps[].repEarned` equals `shared.chosenFactionReputation`
    - `bonusRepEarned` includes only non-chosen factions with non-zero reputation values
  - **Write property-based tests**:
    - For all valid `SessionReport` objects with `skipBase64 = true`: `serializeSessionReport(report, true)` returns `JSON.stringify(report)`
    - For all `SessionReportBuildParams`: `gameSystem`, `generateGmChronicle`, `gmOrgPlayNumber`, `reportingA`–`reportingD`, `scenario`, `signUps`, and `bonusRepEarned` are identical to original builder output
  - Test file: `scripts/model/__tests__/session-report-encoding-fix.pbt.test.ts` (same file, separate describe block)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix session report encoding, repEarned, and gameDate bugs

  - [x] 3.1 Widen `repEarned` type in `SessionReport` interface
    - In `scripts/model/session-report-types.ts`, change `repEarned: 0` to `repEarned: number`
    - Update JSDoc to indicate it carries the chosen faction reputation value
    - _Bug_Condition: isBugCondition(input) where SessionReport.repEarned is literal type 0_
    - _Expected_Behavior: repEarned accepts any number value_
    - _Preservation: No other interface fields change_
    - _Requirements: 2.2_

  - [x] 3.2 Set `repEarned` from `shared.chosenFactionReputation` in builder
    - In `scripts/model/session-report-builder.ts`, replace `repEarned: 0` with `repEarned: shared.chosenFactionReputation`
    - _Bug_Condition: buildSessionReport hardcodes repEarned to 0_
    - _Expected_Behavior: report.repEarned = params.shared.chosenFactionReputation_
    - _Preservation: All other fields in buildSessionReport remain unchanged_
    - _Requirements: 2.2_

  - [x] 3.3 Add `buildGameDateTime` helper and append rounded time to `gameDate`
    - Extract a `buildGameDateTime(eventDate: string, now?: Date): string` helper function
    - Rounding logic: minutes >= 45 → round up to next hour :00; minutes >= 15 → :30; otherwise → :00
    - Handle hour rollover at 23:45+ (produces next-day 00:00 — only time portion matters, date comes from eventDate)
    - Format output as `YYYY-MM-DDTHH:MM:00+00:00`
    - Accept optional `now` parameter on `SessionReportBuildParams` for deterministic testing
    - Replace `gameDate: shared.eventDate` with `gameDate: buildGameDateTime(shared.eventDate, params.now)`
    - _Bug_Condition: gameDate = shared.eventDate (date-only, no time component)_
    - _Expected_Behavior: gameDate matches /^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00\+00:00$/ and starts with shared.eventDate_
    - _Preservation: eventDate portion of gameDate is unchanged_
    - _Requirements: 2.3_

  - [x] 3.4 Replace `btoa(json)` with UTF-16LE encoding in serializer
    - In `scripts/model/session-report-serializer.ts`, replace `btoa(JSON.stringify(report))` with UTF-16LE encoding logic
    - Convert each character to 2-byte little-endian pair using `Uint8Array`
    - Convert byte array to binary string, then `btoa()` the binary string
    - Keep `skipBase64` path unchanged (return raw JSON)
    - _Bug_Condition: btoa(JSON.stringify(report)) encodes as UTF-8, not UTF-16LE_
    - _Expected_Behavior: base64Decode(encoded) interpreted as UTF-16LE yields original JSON_
    - _Preservation: skipBase64 = true path returns raw JSON unchanged_
    - _Requirements: 2.1_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Session Report Encoding, repEarned, and gameDate Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms all three bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Unchanged Behaviors Across Fix
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm skipBase64 mode, JSON structure, signUps, and bonusRepEarned are all unchanged

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx jest --silent`
  - Run lint: `npm run lint`
  - Ensure all tests pass and no lint errors
  - Ask the user if questions arise
