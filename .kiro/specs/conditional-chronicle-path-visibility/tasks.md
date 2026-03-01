# Implementation Plan: Conditional Chronicle Path Visibility

## Overview

This implementation plan converts the conditional chronicle path visibility design into discrete coding tasks. The feature adds a File Picker button to the chronicle path field and implements conditional visibility based on file existence, reducing form clutter when a valid chronicle path is set.

The implementation follows the existing modular architecture and hybrid ApplicationV2 pattern. Event listeners must be attached in `main.ts`, handler logic goes in `handlers/party-chronicle-handlers.ts`, and context preparation is handled in `PartyChronicleApp.ts`.

## Tasks

- [x] 1. Update template to add file picker button
  - Modify `templates/party-chronicle-filling.hbs`
  - Wrap chronicle path input and button in `form-fields` div (matching Layout Designer pattern)
  - Add file picker button with id `chroniclePathFilePicker` and folder icon (fas fa-folder-open)
  - Add conditional visibility class to form group: `{{#unless chroniclePathExists}}chronicle-path-visible{{/unless}}`
  - Add id `chroniclePathGroup` to form group for JavaScript targeting
  - Ensure input field remains readonly
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Write unit tests for template structure
  - Test that file picker button exists in rendered form
  - Test that button has folder icon (fas fa-folder-open)
  - Test that chronicle path field has readonly attribute
  - Test that form-fields wrapper structure matches Layout Designer
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 2. Add CSS styling for conditional visibility
  - Modify `css/style.css`
  - Add rule to hide form groups without `chronicle-path-visible` class
  - Ensure styling is consistent with existing form elements
  - _Requirements: 5.1, 5.2, 6.1, 6.2_

- [x] 3. Implement file existence check in PartyChronicleApp
  - Modify `scripts/PartyChronicleApp.ts`
  - Add `checkFileExists(path: string): Promise<boolean>` private method
  - Use `fetch()` with HEAD request to verify file existence
  - Handle empty paths (return false immediately)
  - Catch and log errors, return false on failure
  - _Requirements: 5.3, 5.4_

- [x] 3.1 Write unit tests for file existence check
  - Test that empty paths return false
  - Test that HEAD request is made for non-empty paths
  - Test that successful responses return true
  - Test that network errors are handled gracefully (return false)
  - _Requirements: 5.3_

- [x] 4. Update context preparation with file existence check
  - Modify `scripts/PartyChronicleApp.ts` in `_prepareContext()` method
  - Extract chronicle path from saved data
  - Call `checkFileExists()` to verify file existence
  - Add `chroniclePathExists` boolean to context
  - Ensure chronicle path value is always available in context
  - _Requirements: 5.1, 5.2, 5.5, 6.4_

- [x] 4.1 Write unit tests for context preparation
  - Test that `chroniclePathExists` is true when file exists
  - Test that `chroniclePathExists` is false when file doesn't exist
  - Test that `chroniclePathExists` is false when path is empty
  - Test that file existence check is called during context preparation
  - _Requirements: 5.1, 5.2, 6.4_

- [x] 5. Implement file picker handler function
  - Modify `scripts/handlers/party-chronicle-handlers.ts`
  - Implement `handleChroniclePathFilePicker(event, container, partyActors)` function
  - Instantiate FilePicker using `foundry.applications.apps.FilePicker.implementation`
  - Configure with `type: 'any'` to allow any file type
  - Implement callback to update input field value
  - Trigger auto-save after file selection
  - Call `updateChroniclePathVisibility()` after file selection
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.4, 4.1_

- [x] 5.1 Write unit tests for file picker handler
  - Test that FilePicker is instantiated with correct configuration
  - Test that FilePicker uses `type: 'any'`
  - Test that callback updates input field value
  - Test that auto-save is triggered after file selection
  - Test that visibility update is called after file selection
  - _Requirements: 2.3, 2.4, 3.1, 3.2, 4.1_

- [x] 6. Implement visibility update handler function
  - Modify `scripts/handlers/party-chronicle-handlers.ts`
  - Implement `updateChroniclePathVisibility(path, container)` function
  - Implement helper `checkFileExists(path)` function (same logic as PartyChronicleApp)
  - Check file existence using HEAD request
  - Add or remove `chronicle-path-visible` class based on file existence
  - Handle empty paths (show field)
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

- [x] 6.1 Write property test for visibility logic
  - **Property 5: Field Hidden When Valid File Exists**
  - **Validates: Requirements 5.1, 6.1**
  - Use fast-check to generate file paths
  - Test that field is hidden when file exists
  - Run 100+ iterations

- [x] 6.2 Write property test for visibility when file missing
  - **Property 6: Field Shown When File Missing or Path Empty**
  - **Validates: Requirements 5.2, 6.2**
  - Use fast-check to generate empty/invalid paths
  - Test that field is shown when file doesn't exist or path is empty
  - Run 100+ iterations

- [x] 7. Attach event listener in main entry point
  - Modify `scripts/main.ts` in `renderPartyChronicleForm()` function
  - Import `handleChroniclePathFilePicker` from `party-chronicle-handlers.ts`
  - Add event listener for file picker button click
  - Use native DOM APIs (`querySelector`, `addEventListener`)
  - Follow existing pattern of other event listeners
  - _Requirements: 2.1_

- [x] 7.1 Write unit tests for event listener attachment
  - Test that file picker button click listener is attached
  - Test that handler function is called when button is clicked
  - _Requirements: 2.1_

- [x] 8. Verify form data persistence
  - Verify that `extractFormData()` includes chronicle path in shared fields
  - Verify that hidden fields still contribute to form data
  - Verify that saved paths are restored on re-render
  - No code changes needed - this is verification only
  - _Requirements: 3.3, 4.3, 5.5_

- [x] 8.1 Write property test for form data persistence
  - **Property 3: Chronicle Path Persists in Form Data**
  - **Validates: Requirements 3.3, 5.5**
  - Use fast-check to generate file paths
  - Test that extracting form data includes the path regardless of visibility
  - Run 100+ iterations

- [x] 8.2 Write property test for saved path persistence
  - **Property 4: Saved Chronicle Path Persists Across Re-renders**
  - **Validates: Requirements 4.3**
  - Use fast-check to generate file paths
  - Test that saved paths are restored when form is re-rendered
  - Run 100+ iterations

- [x] 9. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Manually test the form in Foundry VTT
  - Verify file picker button opens FilePicker dialog
  - Verify field visibility updates based on file existence
  - Ask the user if questions arise

- [x] 10. Integration testing
  - Test complete workflow: click button → select file → field hides → path persists
  - Test with existing valid file path (field should be hidden on render)
  - Test with missing file (field should be visible)
  - Test with empty path (field should be visible)
  - Test that chronicles can be generated with selected path
  - Test that deleting the file makes field visible again on re-render
  - Verify visibility updates within 500ms of file selection
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The checkpoint ensures incremental validation
- Event listeners MUST be attached in `main.ts` (hybrid ApplicationV2 pattern)
- Handler logic MUST be in `handlers/party-chronicle-handlers.ts`
- File existence checks use HEAD requests to avoid downloading entire files
- The feature follows the existing pattern from Layout Designer for consistency
- Property-based tests use fast-check library with 100+ iterations per property
