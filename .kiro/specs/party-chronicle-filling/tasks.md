# Implementation Plan: Party Chronicle Filling

## Overview

This implementation adds a GM-only "PFS" tab to the Foundry VTT party sheet that enables filling out chronicle information once for all party members. The implementation reuses the existing PdfGenerator class and follows the ApplicationV2 architecture pattern established in the codebase. Tasks are organized to build incrementally, with early validation of core functionality and property-based tests placed close to implementation.

## Tasks

- [x] 1. Set up data structures and interfaces
  - Create TypeScript interfaces for PartyChronicleData, PartyChronicleContext, and ValidationResult
  - Define SharedFields and UniqueFields type structures
  - Create GenerationResult interface for per-character PDF generation results
  - _Requirements: 2.3, 3.3, 4.4, 8.1_

- [x] 2. Implement data persistence layer
  - [x] 2.1 Create world flag storage functions for party chronicle data
    - Implement savePartyChronicleData() to store data with timestamp
    - Implement loadPartyChronicleData() to retrieve saved data
    - Implement clearPartyChronicleData() to remove data after successful generation
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 2.2 Write property test for data persistence
    - **Property 16: Data Persistence Round-Trip**
    - **Validates: Requirements 8.2**
  
  - [x] 2.3 Write unit tests for data persistence error handling
    - Test save failure scenarios
    - Test load failure scenarios with fallback to empty form
    - _Requirements: 8.1, 8.2_

- [x] 3. Create PartyChronicleApp class foundation
  - [x] 3.1 Implement PartyChronicleApp extending ApplicationV2 with HandlebarsApplicationMixin
    - Define DEFAULT_OPTIONS with id, form configuration, position, and window settings
    - Define PARTS with main and footer template references
    - Implement constructor accepting partyActors array
    - _Requirements: 1.2, 1.3_
  
  - [x] 3.2 Implement _prepareContext() method
    - Extract party member data (id, name, level, societyId)
    - Load saved party chronicle data from world flags
    - Prepare season dropdown data using LayoutStore.getSeasons()
    - Prepare layout dropdown data using LayoutStore.getLayoutsByParent(seasonId)
    - Handle season/layout synchronization (if layout doesn't belong to season, adjust season)
    - Return PartyChronicleContext object
    - _Requirements: 1.3, 1.4, 2.5, 8.2_
  
  - [x] 3.3 Write property test for party member listing
    - **Property 1: Party Member Listing Completeness**
    - **Validates: Requirements 1.3**

- [x] 4. Implement data mapping and validation logic
  - [x] 4.1 Create mapToCharacterData() function
    - Combine shared fields and character-specific unique fields
    - Map party data structure to PdfGenerator's expected ChronicleData format
    - Handle all field mappings per design specification
    - _Requirements: 4.3, 5.2_
  
  - [x] 4.2 Write property test for data combination correctness
    - **Property 6: Data Combination Correctness**
    - **Validates: Requirements 4.3**
  
  - [x] 4.3 Implement validateSharedFields() method
    - Check all required shared fields are populated
    - Validate data types and formats
    - Return ValidationResult with specific error messages
    - _Requirements: 6.1, 6.3_
  
  - [x] 4.4 Implement validateUniqueFields() method
    - Check required unique fields for each character
    - Validate data types and formats per character
    - Return ValidationResult with character-specific error messages
    - _Requirements: 6.2, 6.3_
  
  - [x] 4.5 Write property tests for validation logic
    - **Property 10: Shared Field Validation**
    - **Property 11: Unique Field Validation**
    - **Property 12: Validation Error Reporting**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create Handlebars template for party chronicle UI
  - [x] 6.1 Create party-chronicle-filling.hbs template file
    - Implement Event Details section with shared fields (GM PFS Number, season selector from LayoutStore.getSeasons(), layout selector from LayoutStore.getLayoutsByParent(seasonId), event details)
    - Implement Shared Rewards section (XP, treasure bundles as integer 0-10, adventure summary checkboxes, strikeout items)
    - Implement Character-Specific section that repeats for each party member
    - Add action buttons (Generate Chronicles, Clear Data)
    - Apply PF2E system styling conventions
    - Note: Save button removed as auto-save handles persistence automatically
    - _Requirements: 1.4, 2.1, 2.4, 2.5, 3.1, 3.4_
  
  - [x] 6.2 Implement _onRender() method in PartyChronicleApp
    - Attach event listeners for form field changes (auto-save)
    - Attach event listeners for season dropdown changes (updates layout dropdown using LayoutStore.getLayoutsByParent)
    - Attach event listeners for layout dropdown changes (updates layout-specific fields)
    - Update button states based on validation
    - Note: Save button handler removed as auto-save handles persistence automatically
    - _Requirements: 2.2, 2.5, 6.4, 8.1_

- [ ] 7. Implement chronicle generation logic
  - [x] 7.1 Create generateChronicles() static method
    - Extract form data using FormDataExtended
    - Validate all shared and unique fields
    - For each party member: map data, call PdfGenerator, attach PDF to actor flags
    - Collect GenerationResult for each character
    - Display success/failure notifications with summary
    - Clear saved data on successful generation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 7.1, 8.3_
  
  - [ ]* 7.2 Write property tests for chronicle generation
    - **Property 5: Chronicle Generation Completeness**
    - **Property 7: Generation Notification Completeness**
    - **Property 14: Chronicle Attachment Correctness**
    - **Validates: Requirements 4.2, 4.4, 7.1**
  
  - [ ]* 7.3 Write property test for layout processing consistency
    - **Property 8: Layout Processing Consistency**
    - **Validates: Requirements 5.2**
  
  - [ ]* 7.4 Write unit tests for error handling during generation
    - Test missing layout file error handling
    - Test PDF generation failure per character
    - Test partial success scenarios (some characters succeed, others fail)
    - _Requirements: 5.3, 4.4_

- [x] 8. Implement shared field propagation
  - [x] 8.1 Add shared field change handlers
    - When shared field changes, update all character chronicle data
    - Auto-save updated data to world flags
    - _Requirements: 2.2, 8.1_
  
  - [x] 8.2 Write property test for shared field propagation
    - **Property 2: Shared Field Propagation**
    - **Validates: Requirements 2.2**

- [x] 9. Implement unique field isolation
  - [x] 9.1 Add unique field change handlers
    - When unique field changes, update only that character's data
    - Auto-save updated data to world flags
    - _Requirements: 3.2, 8.1_
  
  - [x] 9.2 Write property tests for unique field handling
    - **Property 3: Unique Field Isolation**
    - **Property 4: Per-Character Unique Field Provision**
    - **Validates: Requirements 3.1, 3.2**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integrate PFS tab into party sheet
  - [x] 11.1 Register renderApplication hook for party sheet
    - Detect when party sheet (ApplicationV2) is rendered
    - Check if user has GM permissions
    - Inject "PFS" tab after "stash" tab in the party sheet navigation
    - _Requirements: 1.1_
  
  - [x] 11.2 Implement tab click handler
    - When PFS tab is clicked, instantiate and render PartyChronicleApp
    - Pass current party actors to PartyChronicleApp constructor
    - _Requirements: 1.2_
  
  - [ ]* 11.3 Write unit tests for tab integration
    - Test tab injection only occurs for GMs
    - Test tab appears after stash tab
    - Test tab click opens PartyChronicleApp
    - _Requirements: 1.1, 1.2_

- [x] 12. Implement validation blocking and error display
  - [x] 12.1 Add inline validation error display
    - Show red borders and error messages next to invalid fields
    - Display summary error panel at top of form
    - _Requirements: 6.3_
  
  - [x] 12.2 Implement generation button state management
    - Disable "Generate Chronicles" button when validation errors exist
    - Enable button only when all validation passes
    - _Requirements: 6.4_
  
  - [ ]* 12.3 Write property test for validation blocking
    - **Property 13: Generation Blocking on Validation Errors**
    - **Validates: Requirements 6.4**

- [ ] 13. Add missing layout error handling
  - [ ] 13.1 Implement layout file existence check before generation
    - Check if layout file exists for selected layout
    - Display error message if missing
    - Prevent chronicle generation if layout missing
    - _Requirements: 5.3_
  
  - [ ]* 13.2 Write property test for missing layout handling
    - **Property 9: Missing Layout Error Handling**
    - **Validates: Requirements 5.3**

- [ ] 14. Verify chronicle download functionality
  - [ ]* 14.1 Write property test for download equivalence
    - **Property 15: Download Functionality Equivalence**
    - **Validates: Requirements 7.3**
  
  - [ ]* 14.2 Write unit tests for chronicle attachment
    - Test chronicles generated from party interface are accessible from character sheets
    - Test download functionality works identically for party-generated chronicles
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 15. Implement data cleanup after successful generation
  - [ ] 15.1 Add cleanup logic to generateChronicles()
    - After all chronicles successfully generated, call clearPartyChronicleData()
    - Only clear data if all characters succeeded
    - _Requirements: 8.3_
  
  - [ ]* 15.2 Write property test for data cleanup
    - **Property 17: Data Cleanup After Generation**
    - **Validates: Requirements 8.3**

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and integration points
- The implementation reuses PdfGenerator without modification, ensuring consistency
- All UI follows PF2E system styling conventions
- The PFS tab is GM-only and uses ApplicationV2 architecture throughout
