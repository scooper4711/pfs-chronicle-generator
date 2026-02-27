# Implementation Plan: Multi-Line Reputation Tracking

## Overview

This implementation adds multi-line reputation tracking to the PFS Chronicle Generator's party chronicle filling interface. Reputation values are entered once in the sidebar, and the system automatically calculates per-character reputation during PDF generation by combining the character's chosen faction bonus with faction-specific bonuses.

The implementation follows the hybrid ApplicationV2 architecture where event listeners are attached in main.ts, context preparation happens in PartyChronicleApp, and data logic resides in scripts/model/.

## Tasks

- [x] 1. Update data models and types
  - [x] 1.1 Add reputation fields to SharedFields interface
    - Add `chosenFactionReputation: number` field
    - Add `reputationValues` object with EA, GA, HH, VS, RO, VW properties
    - File: `scripts/model/party-chronicle-types.ts`
    - _Requirements: 4.1, 4.2_
  
  - [x] 1.2 Remove reputation field from UniqueFields interface
    - Remove `reputation: string` field (no longer stored per-character)
    - File: `scripts/model/party-chronicle-types.ts`
    - _Requirements: 3.3_
  
  - [x] 1.3 Export FACTION_NAMES constant for reuse
    - Export existing FACTION_NAMES constant from PFSChronicleGeneratorApp.ts
    - This will be imported by reputation-calculator.ts
    - File: `scripts/PFSChronicleGeneratorApp.ts`
    - _Requirements: 8.3_

- [x] 2. Create reputation calculator module
  - [x] 2.1 Implement calculateReputation function
    - Create new file `scripts/model/reputation-calculator.ts`
    - Implement algorithm: create reputation map, add faction-specific values, add chosen faction bonus, filter zeros, format lines, sort alphabetically
    - Import FACTION_NAMES constant
    - Handle missing/invalid chosen faction gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 2.2 Write property test for non-zero faction inclusion
    - **Property 6: Non-Zero Faction Inclusion**
    - **Validates: Requirements 2.2**
    - Use fast-check to generate random reputation values
    - Verify all factions with non-zero values appear in output
    - Minimum 100 iterations
  
  - [x] 2.3 Write property test for zero faction exclusion
    - **Property 7: Zero Faction Exclusion**
    - **Validates: Requirements 2.6**
    - Verify factions with zero final value are excluded from output
    - Minimum 100 iterations
  
  - [x] 2.4 Write property test for chosen faction bonus addition
    - **Property 8: Chosen Faction Bonus Addition**
    - **Validates: Requirements 2.3, 2.4**
    - Verify chosen faction bonus is correctly added to faction total
    - Test with various chosen factions and null cases
    - Minimum 100 iterations
  
  - [x] 2.5 Write property test for reputation line formatting
    - **Property 9: Reputation Line Formatting**
    - **Validates: Requirements 2.5, 2.7, 8.2**
    - Verify format matches "{Faction_Full_Name}: {+/-}{value}"
    - Verify faction names come from FACTION_NAMES constant
    - Minimum 100 iterations
  
  - [x] 2.6 Write property test for reputation line sorting
    - **Property 10: Reputation Line Sorting**
    - **Validates: Requirements 2.8**
    - Verify output is sorted alphabetically by faction name
    - Minimum 100 iterations
  
  - [x] 2.7 Write unit tests for reputation calculator
    - Test specific examples: character with chosen faction, no chosen faction, all zeros, multiple factions
    - Test edge cases: invalid faction code, missing actor data
    - Test sorting with multiple factions

- [ ] 3. Update validation logic
  - [x] 3.1 Add reputation validation to validateSharedFields
    - Validate chosenFactionReputation: integer, 0-9 range, greater than 0
    - Validate each faction-specific value: integer, 0-9 range
    - Add appropriate error messages using faction full names
    - File: `scripts/model/party-chronicle-validator.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 3.2 Remove reputation validation from validateUniqueFields
    - Remove validation for per-character reputation field (no longer exists)
    - File: `scripts/model/party-chronicle-validator.ts`
    - _Requirements: 3.3_
  
  - [x] 3.3 Write property test for reputation input validation
    - **Property 1: Reputation Input Validation**
    - **Validates: Requirements 1.4, 1.5, 6.1, 6.2**
    - Test that validator accepts all valid values (0-9 integers)
    - Test that validator rejects invalid values (outside range, non-integer)
    - Minimum 100 iterations
  
  - [x] 3.4 Write property test for chosen faction non-zero validation
    - **Property 2: Chosen Faction Reputation Non-Zero Validation**
    - **Validates: Requirements 6.3**
    - Verify validator rejects data when chosenFactionReputation is 0
    - Minimum 100 iterations
  
  - [~] 3.5 Write property test for validation error UI feedback
    - **Property 13: Validation Error UI Feedback**
    - **Validates: Requirements 6.4**
    - Verify validation errors are displayed and Generate button is disabled
    - Test with various invalid reputation values
    - Minimum 100 iterations
  
  - [x] 3.6 Write unit tests for reputation validation
    - Test specific error messages for each validation rule
    - Test edge cases: boundary values (0, 9, 10, -1)
    - Test multiple validation errors at once

- [x] 4. Update mapper to use reputation calculator
  - [x] 4.1 Modify mapToCharacterData function signature
    - Add `actor` parameter to function signature
    - Import calculateReputation from reputation-calculator
    - Call calculateReputation(shared, actor) to get reputation lines array
    - Assign reputation lines array directly to ChronicleData.reputation field (do NOT join with newlines)
    - Update ChronicleData interface: change `reputation: string` to `reputation: string[]`
    - File: `scripts/model/party-chronicle-mapper.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x] 4.2 Update all call sites of mapToCharacterData
    - Update call in `main.ts` → `generateChroniclesFromForm()` to pass actor parameter
    - Update call in `PartyChronicleApp.ts` → `#generateChronicles()` to pass actor parameter
    - _Requirements: 5.5_
  
  - [ ]* 4.3 Write property test for reputation mapping to ChronicleData
    - **Property 11: Reputation Mapping to ChronicleData**
    - **Validates: Requirements 5.1, 5.2**
    - Verify reputation field contains calculated lines as an array of strings
    - Minimum 100 iterations
  
  - [ ]* 4.4 Write property test for empty reputation handling
    - **Property 12: Empty Reputation Handling**
    - **Validates: Requirements 5.3**
    - Verify empty array when all factions have zero value
    - Minimum 100 iterations
  
  - [ ]* 4.5 Write unit tests for mapper integration
    - Test end-to-end: shared fields → calculator → ChronicleData
    - Test with various actor configurations
    - Test empty reputation case

- [x] 5. Update UI template
  - [x] 5.1 Add Shared Reputation Section to template
    - Insert new section above "Shared Rewards" in sidebar
    - Add header "Reputation"
    - Add input field for "Chosen Faction" (id: chosenFactionReputation, default: 2)
    - Add input fields for each faction: EA, GA, HH, VS, RO, VW (default: 0)
    - Use full faction names as labels
    - Set input attributes: type="number", min="0", max="9"
    - Use Handlebars syntax for data binding: {{shared.chosenFactionReputation}}, {{lookup shared.reputationValues 'EA'}}
    - File: `templates/party-chronicle-filling.hbs`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.4_
  
  - [x] 5.2 Remove reputation field from per-character section
    - Remove reputation input field from character-specific section (currently around line 120)
    - File: `templates/party-chronicle-filling.hbs`
    - _Requirements: 3.1, 3.2_

- [x] 6. Update context preparation
  - [x] 6.1 Add reputation fields to context in PartyChronicleApp
    - Modify `_prepareContext()` method
    - Add `chosenFactionReputation` to shared context (default: 2)
    - Add `reputationValues` object to shared context (default: all zeros)
    - Load saved values from savedData if available
    - File: `scripts/PartyChronicleApp.ts`
    - _Requirements: 4.3, 4.4_

- [x] 7. Add event listeners for reputation fields
  - [x] 7.1 Attach change event listeners to reputation inputs
    - In `main.ts` → `renderPartyChronicleForm()` function
    - Use native DOM APIs: `querySelectorAll()` and `addEventListener()`
    - Select all reputation inputs: `input[name^="shared.reputationValues"]` and `input[name="shared.chosenFactionReputation"]`
    - On change: trigger auto-save and update validation display
    - Add console logging for debugging
    - _Requirements: 1.6, 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 7.2 Write property test for auto-save on reputation change
    - **Property 3: Auto-Save on Reputation Change**
    - **Validates: Requirements 1.6, 7.1, 7.4, 4.3**
    - Verify auto-save triggers within 100ms of field change
    - Verify data is persisted to storage
    - Minimum 100 iterations
  
  - [ ]* 7.3 Write unit tests for event handling
    - Test that change events trigger auto-save
    - Test that validation updates after change
    - Test with various field values

- [x] 8. Update form data extraction
  - [x] 8.1 Add reputation fields to extractFormData function
    - Extract chosenFactionReputation from #chosenFactionReputation input
    - Extract reputationValues for each faction (EA, GA, HH, VS, RO, VW)
    - Parse as integers with fallback to defaults (2 for chosen, 0 for others)
    - Add to shared object
    - File: `main.ts`
    - _Requirements: 4.3_
  
  - [x] 8.2 Remove reputation extraction from character-specific section
    - Remove extraction of per-character reputation field
    - File: `main.ts`
    - _Requirements: 3.3_
  
  - [ ]* 8.3 Write property test for reputation data persistence round-trip
    - **Property 4: Reputation Data Persistence Round-Trip**
    - **Validates: Requirements 4.4**
    - Save reputation values, reload form, verify exact values restored
    - Minimum 100 iterations
  
  - [ ]* 8.4 Write property test for chosen faction not stored
    - **Property 5: Chosen Faction Not Stored**
    - **Validates: Requirements 4.5**
    - Verify saved data does NOT contain character's chosen faction
    - Verify chosen faction is read from actor data, not storage
    - Minimum 100 iterations
  
  - [ ]* 8.5 Write unit tests for form data extraction
    - Test extraction with various input values
    - Test default values when inputs are empty
    - Test integer parsing

- [x] 9. Add CSS styling for reputation section
  - [x] 9.1 Add reputation section styles
    - Add styles for .reputation-section class
    - Style form groups, labels, and number inputs
    - Add validation error styles (.has-error, .field-error)
    - Ensure consistent styling with existing form sections
    - File: `css/style.css`
    - _Requirements: 1.1_

- [x] 10. Checkpoint - Ensure all tests pass
  - Run all unit tests and property-based tests
  - Verify no TypeScript compilation errors
  - Test in Foundry VTT: enter reputation values, save, reload, generate PDF
  - Verify multi-line reputation appears correctly in generated PDFs
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation follows the hybrid ApplicationV2 architecture: event listeners in main.ts, context in PartyChronicleApp, data logic in model/
- No backward compatibility or data migration needed (feature not yet in production)
