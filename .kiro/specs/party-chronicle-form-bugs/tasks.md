# Implementation Plan

## Bug 1: Clear Button Resets Scenario Selection

- [x] 1. Write bug condition exploration test for Bug 1
  - **Property 1: Fault Condition** - Clear Button Resets Scenario Selection
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test with multiple season/scenario combinations (Season 4-6, various scenarios)
  - Test that after clicking Clear and confirming, the selected scenario is preserved (not reset to first scenario)
  - Verify the layout dropdown shows the correct scenario after clearing
  - Verify the chronicle path field shows the correct scenario's path after clearing
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Season 6, Scenario 6-03 resets to 6-01 after clearing")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write bug condition exploration test for Bug 2
  - **Property 1: Fault Condition** - Chronicle Path Visibility Not Updated After Clear
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test with scenarios that have valid chronicle PDF files
  - Test that after clicking Clear and confirming, updateChroniclePathVisibility is called
  - Verify the chronicle path field visibility is updated based on file existence
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Chronicle path field remains visible after clearing when it should be hidden")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 3. Write bug condition exploration test for Bug 3
  - **Property 1: Fault Condition** - Strikeout Items Not Passed to PDF Generation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test with various strikeout item selections (single item, multiple items)
  - Test that strikeout items selected in the form are passed through extractFormData
  - Test that strikeout items are included in SharedFields structure
  - Test that strikeout items are mapped to strikeout_item_lines in ChronicleData
  - Test that strikeout items appear in the generated PDF
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Strikeout items extracted but not in PDF")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.7, 2.8, 2.9, 2.10_

- [x] 4. Write bug condition exploration test for Bug 4
  - **Property 1: Fault Condition** - Downloaded PDF Filename Uses Outdated Module Setting
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Test with different chronicle paths in form vs module setting
  - Test that when actor has chronicle data in flags, download uses flag data's chronicle path
  - Test that filename is generated from the correct chronicle path (form data, not module setting)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Filename uses module setting instead of form chronicle path")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.11, 2.12, 2.13_

- [x] 5. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Existing Functionality Preserved
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Test cases:
    - Clear button cancel preserves all form data
    - Clear button confirm clears character-specific data but preserves shared fields
    - Clear button confirm sets smart defaults for XP, treasure bundles, downtime days
    - Season/layout change updates chronicle path visibility
    - File picker updates chronicle path visibility
    - PDF generation includes all other form fields (character name, XP, gold, reputation, etc.)
    - Legacy single-character chronicle download uses module setting
    - Filename sanitization works correctly
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## Implementation

- [x] 6. Fix Bug 1: Clear Button Preserves Scenario Selection

  - [x] 6.1 Investigate template rendering logic
    - Examine `templates/party-chronicle-filling.hbs` layout dropdown rendering
    - Verify how `selectedLayoutId` is used to set the `selected` attribute
    - Identify why the dropdown resets to the first scenario after clearing
    - _Bug_Condition: isBugCondition_ClearResetScenario(input) where user clicks Clear and confirms_
    - _Expected_Behavior: Form preserves selected season and scenario after clearing_
    - _Preservation: Clear button continues to clear character data and preserve shared fields_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 6.2 Fix template to use selectedLayoutId correctly
    - Update layout dropdown rendering to use `selectedLayoutId` context variable
    - Ensure the correct option is marked as `selected` in the dropdown
    - Test that the fix preserves the selected scenario after clearing
    - _Bug_Condition: isBugCondition_ClearResetScenario(input) where user clicks Clear and confirms_
    - _Expected_Behavior: Form preserves selected season and scenario after clearing_
    - _Preservation: Clear button continues to clear character data and preserve shared fields_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 6.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Clear Button Preserves Scenario Selection
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Fix Bug 2: Chronicle Path Visibility Updated After Clear

  - [x] 7.1 Add updateChroniclePathVisibility call after clearing
    - Locate Clear button handler in `scripts/main.ts` (lines 447-550)
    - After the `renderPartyChronicleForm` call, add call to `updateChroniclePathVisibility(container)`
    - Ensure `updateChroniclePathVisibility` is imported from `handlers/party-chronicle-handlers.ts`
    - _Bug_Condition: isBugCondition_VisibilityNotUpdated(input) where user clicks Clear and confirms_
    - _Expected_Behavior: Chronicle path visibility is updated after clearing based on file existence_
    - _Preservation: Season/layout change and file picker continue to update visibility_
    - _Requirements: 2.4, 2.5, 2.6, 3.5, 3.6_

  - [x] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Chronicle Path Visibility Updated After Clear
    - **IMPORTANT**: Re-run the SAME test from task 2 - do NOT write a new test
    - The test from task 2 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 2
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 8. Fix Bug 3: Strikeout Items Passed to PDF Generation

  - [x] 8.1 Add strikeout items mapping in mapToCharacterData
    - Locate `mapToCharacterData` function in `scripts/model/party-chronicle-mapper.ts`
    - Add mapping from `sharedFields.strikeoutItems` to `chronicleData.strikeout_item_lines`
    - Verify the field name matches what the PDF generator expects
    - _Bug_Condition: isBugCondition_StrikeoutNotPassed(input) where strikeout items are selected_
    - _Expected_Behavior: Strikeout items are passed through to PDF generation and rendered_
    - _Preservation: All other form fields continue to be included in PDF_
    - _Requirements: 2.7, 2.8, 2.9, 2.10, 3.7, 3.8_

  - [x] 8.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Strikeout Items Passed to PDF Generation
    - **IMPORTANT**: Re-run the SAME test from task 3 - do NOT write a new test
    - The test from task 3 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 3
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.7, 2.8, 2.9, 2.10_

- [x] 9. Fix Bug 4: Downloaded PDF Filename Uses Form Chronicle Path

  - [x] 9.1 Update download handler to use actor flag data
    - Locate download button handler in `scripts/main.ts` (lines 166-188)
    - Before using module setting, check if actor has chronicle data in flags
    - If flag data exists, use `chronicleData.blankChroniclePath` for filename generation
    - Fall back to module setting only if no flag data exists (backward compatibility)
    - _Bug_Condition: isBugCondition_WrongFilename(input) where actor has chronicle data in flags_
    - _Expected_Behavior: Filename uses chronicle path from actor flags, falls back to module setting_
    - _Preservation: Legacy single-character chronicles continue to use module setting_
    - _Requirements: 2.11, 2.12, 2.13, 3.9, 3.10_

  - [x] 9.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Downloaded PDF Filename Uses Form Chronicle Path
    - **IMPORTANT**: Re-run the SAME test from task 4 - do NOT write a new test
    - The test from task 4 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 4
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.11, 2.12, 2.13_

  - [x] 9.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Functionality Preserved
    - **IMPORTANT**: Re-run the SAME tests from task 5 - do NOT write new tests
    - Run preservation property tests from step 5
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after all four fixes (no regressions)

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
