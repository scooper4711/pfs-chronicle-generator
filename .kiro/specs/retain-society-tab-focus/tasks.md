# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Society Tab Focus Lost After Chronicle Generation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case - clicking "Generate Chronicles" while on Society tab
  - Test that when "Generate Chronicles" button is clicked while Society tab is active, the active tab changes (bug behavior)
  - The test assertions should verify that activeTab == 'pfs' after render (expected behavior from design)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Active tab changes from 'pfs' to first tab after render")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Manual Tab Navigation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (manual tab clicks, initial render, other buttons)
  - Write property-based tests capturing observed behavior patterns:
    - Manual tab switching works correctly (clicking any tab activates it)
    - Initial party sheet render displays the default first tab
    - Other button clicks (Save, Clear) don't affect tab state
    - Tab switching from other tabs works correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix for Society tab focus loss after chronicle generation

  - [ ] 3.1 Implement the fix in renderPartyChronicleForm
    - Capture active tab state before calling partySheet.render(true)
    - Access partySheet._tabs or query DOM for active tab identifier
    - Store the active tab identifier (likely 'pfs' for Society tab)
    - Keep existing partySheet.render(true) call to update download buttons
    - Restore active tab state after render completes
    - Wait for render to complete (handle promise if returned)
    - Activate the previously captured tab using Foundry's tab API
    - Add defensive checks for edge cases (tab doesn't exist, _tabs undefined)
    - _Bug_Condition: isBugCondition(input) where input.buttonClick.target.id == 'generateChronicles' AND input.activeTab == 'pfs' AND input.renderCalled == true_
    - _Expected_Behavior: activeTab(result) == 'pfs' after render completes_
    - _Preservation: Manual tab navigation, initial render default, other button operations remain unchanged_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Society Tab Retained After Chronicle Generation
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Manual Tab Navigation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
