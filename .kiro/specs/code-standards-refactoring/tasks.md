# Implementation Plan: Code Standards Refactoring

## Overview

This implementation refactors the PFS Chronicle Generator codebase to comply with established coding standards. The refactoring addresses file size violations (4 files exceed 500 lines) and cyclomatic complexity violations (5 functions exceed CCN 15) while preserving all existing functionality. The implementation follows a behavior-preserving transformation approach with continuous validation through the existing test suite.

A critical constraint is maintaining the hybrid ApplicationV2 rendering pattern where event listeners remain in main.ts rather than ApplicationV2 lifecycle methods.

## Tasks

- [x] 1. Phase 1: Extract Utilities and Helpers
  - [x] 1.1 Create utils/filename-utils.ts module
    - Extract `sanitizeFilename()` function from main.ts
    - Extract `generateChronicleFilename()` function from main.ts
    - Add JSDoc comments explaining purpose
    - Export functions for use in main.ts and PartyChronicleApp.ts
    - File: `scripts/utils/filename-utils.ts` (new)
    - _Requirements: 1.5, 5.1, 5.3, 5.4, 5.5_
  
  - [x] 1.2 Create utils/layout-utils.ts module
    - Extract `findCheckboxChoices()` from PartyChronicleApp.ts
    - Extract `findStrikeoutChoices()` from PartyChronicleApp.ts
    - Extract `updateLayoutSpecificFields()` logic (shared between main.ts and PartyChronicleApp.ts)
    - Add JSDoc comments explaining purpose
    - Export functions for use in main.ts and PartyChronicleApp.ts
    - File: `scripts/utils/layout-utils.ts` (new)
    - _Requirements: 1.5, 5.1, 5.3, 5.4, 5.5_
  
  - [x] 1.3 Create utils/dom-utils.ts module (SKIPPED - no value added)
    - ~~Extract DOM manipulation helper functions from main.ts~~
    - ~~Functions for element selection, attribute manipulation, class management~~
    - Note: Analysis showed this task would create one-line jQuery wrappers with no actual benefit
    - File was created but never used, then removed as it provided no value
    - _Requirements: 1.5, 5.1, 5.3, 5.4, 5.5_
  
  - [x] 1.4 Create utils/pdf-utils.ts module
    - Extract color resolution functions from PdfGenerator.ts
    - Extract font resolution functions from PdfGenerator.ts
    - Extract canvas and coordinate utilities from PdfGenerator.ts
    - Add JSDoc comments explaining purpose
    - Export functions for use in PdfGenerator.ts
    - File: `scripts/utils/pdf-utils.ts` (new)
    - _Requirements: 1.5, 5.1, 5.3, 5.4, 5.5_
  
  - [x] 1.5 Create utils/pdf-element-utils.ts module
    - Extract element resolution logic from PdfGenerator.ts
    - Functions for resolving element values, types, and rendering
    - Add JSDoc comments explaining purpose
    - Export functions for use in PdfGenerator.ts
    - File: `scripts/utils/pdf-element-utils.ts` (new)
    - _Requirements: 1.5, 5.1, 5.3, 5.4, 5.5_
  
  - [x] 1.6 Update imports in main.ts for extracted utilities
    - Import functions from utils/filename-utils.ts
    - Import functions from utils/layout-utils.ts
    - ~~Import functions from utils/dom-utils.ts~~ (task 1.3 skipped)
    - Remove extracted function definitions
    - Verify TypeScript compilation succeeds
    - File: `scripts/main.ts`
    - _Requirements: 1.6, 3.1, 3.6_
  
  - [x] 1.7 Update imports in PartyChronicleApp.ts for extracted utilities
    - Import functions from utils/filename-utils.ts
    - Import functions from utils/layout-utils.ts
    - Remove extracted function definitions
    - Verify TypeScript compilation succeeds
    - File: `scripts/PartyChronicleApp.ts`
    - _Requirements: 1.6, 3.1, 3.6_
  
  - [x] 1.8 Update imports in PdfGenerator.ts for extracted utilities
    - Import functions from utils/pdf-utils.ts
    - Import functions from utils/pdf-element-utils.ts
    - Remove extracted function definitions
    - Verify TypeScript compilation succeeds
    - File: `scripts/PdfGenerator.ts`
    - _Requirements: 1.6, 3.1, 3.6_
  
  - [x] 1.9 Run tests after Phase 1 extractions
    - Run TypeScript compiler: `npm run build`
    - Run all unit tests: `npm test`
    - Verify all tests pass without modification
    - If tests fail, revert and adjust extraction strategy
    - _Requirements: 3.4, 3.5, 7.3_

- [x] 2. Phase 2: Decompose High-Complexity Functions
  - [x] 2.1 Create model/validation-helpers.ts module
    - Extract `validateDateFormat()` helper function
    - Extract `validateSocietyIdFormat()` helper function
    - Extract `validateNumberField()` helper function
    - Extract `validateRequiredString()` helper function
    - Extract `validateOptionalArray()` helper function
    - Add JSDoc comments explaining purpose and parameters
    - Export functions for use in party-chronicle-validator.ts
    - File: `scripts/model/validation-helpers.ts` (new)
    - _Requirements: 2.6, 5.1, 5.3, 5.4, 5.5_
  
  - [x] 2.2 Refactor validateSharedFields (CCN 31 → <15)
    - Replace inline validation logic with calls to validation-helpers functions
    - Use `validateRequiredString()` for required string fields
    - Use `validateDateFormat()` for date validation
    - Use `validateNumberField()` for numeric fields
    - Use `validateOptionalArray()` for array fields
    - Maintain exact error messages and behavior
    - File: `scripts/model/party-chronicle-validator.ts`
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.3 Refactor validateUniqueFields (CCN 25 → <15)
    - Replace inline validation logic with calls to validation-helpers functions
    - Use `validateRequiredString()` for required string fields
    - Use `validateNumberField()` for numeric fields
    - Maintain exact error messages and behavior
    - File: `scripts/model/party-chronicle-validator.ts`
    - _Requirements: 2.1, 2.3, 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.4 Create handlers/validation-display.ts module
    - Extract `updateValidationDisplay()` function from main.ts
    - Extract `renderSharedFieldErrors()` helper function
    - Extract `renderCharacterErrors()` helper function
    - Extract `clearValidationDisplay()` helper function
    - Reduce CCN from 24 to <15 through helper extraction
    - Add JSDoc comments explaining purpose
    - Export `updateValidationDisplay()` for use in main.ts
    - File: `scripts/handlers/validation-display.ts` (new)
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 2.5 Decompose PFSChronicleGeneratorApp._prepareContext (CCN 45 → <15)
    - Extract layout loading logic into helper function `loadLayoutData()`
    - Extract field mapping logic into helper function `mapFieldsToContext()`
    - Extract checkbox/strikeout logic into helper function `processChoiceFields()`
    - Call helper functions from `_prepareContext()`
    - Maintain exact behavior and return values
    - File: `scripts/PFSChronicleGeneratorApp.ts`
    - _Requirements: 2.1, 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.6 Decompose PartyChronicleApp._prepareContext (CCN 28 → <15)
    - Extract layout loading logic into helper function `loadPartyLayoutData()`
    - Extract field mapping logic into helper function `mapPartyFieldsToContext()`
    - Extract checkbox/strikeout logic into helper function `processPartyChoiceFields()`
    - Call helper functions from `_prepareContext()`
    - Maintain exact behavior and return values
    - File: `scripts/PartyChronicleApp.ts`
    - _Requirements: 2.1, 2.3, 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.7 Refactor generateChroniclesFromPartyData - Extract validation logic
    - Create helper function `validateAllCharacterFields()` in handlers/party-chronicle-handlers.ts
    - Move shared field validation and unique field validation loops into helper
    - Return aggregated validation results
    - Reduce main function complexity by extracting validation responsibility
    - File: `scripts/handlers/party-chronicle-handlers.ts`
    - _Requirements: 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.8 Refactor generateChroniclesFromPartyData - Extract data mapping logic
    - Create helper function `extractCharacterChronicleData()` in handlers/party-chronicle-handlers.ts
    - Move SharedFields and character data extraction logic into helper
    - Takes raw form data and actor, returns structured chronicle data
    - Reduce main function complexity by extracting data transformation responsibility
    - File: `scripts/handlers/party-chronicle-handlers.ts`
    - _Requirements: 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.9 Refactor generateChroniclesFromPartyData - Extract PDF generation logic
    - Create helper function `generateSingleCharacterPdf()` in handlers/party-chronicle-handlers.ts
    - Move PDF loading, generation, and actor flag saving logic into helper
    - Takes chronicle data, layout, blank PDF path, and actor
    - Returns success/failure result
    - Reduce main function complexity by extracting PDF generation responsibility
    - File: `scripts/handlers/party-chronicle-handlers.ts`
    - _Requirements: 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.10 Refactor generateChroniclesFromPartyData - Extract notification logic
    - Create helper function `displayGenerationResults()` in handlers/party-chronicle-handlers.ts
    - Move result collection and notification display logic into helper
    - Takes array of GenerationResult objects
    - Displays appropriate success/warning notifications
    - Reduce main function complexity by extracting notification responsibility
    - File: `scripts/handlers/party-chronicle-handlers.ts`
    - _Requirements: 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.11 Refactor generateChroniclesFromPartyData - Simplify main orchestrator
    - Update main function to call extracted helper functions
    - Keep function as high-level orchestrator (under 50 lines)
    - Flow: validate → load layout → process each character → display results
    - Maintain exact behavior and error handling
    - Target CCN: <10 (simple orchestration pattern)
    - File: `scripts/handlers/party-chronicle-handlers.ts`
    - _Requirements: 2.1, 2.6, 2.7, 2.8, 3.1, 3.6_
  
  - [x] 2.12 Run tests after Phase 2 decomposition
    - Run TypeScript compiler: `npm run build`
    - Run all unit tests: `npm test`
    - Verify all tests pass without modification
    - If tests fail, revert and adjust decomposition strategy
    - _Requirements: 3.4, 3.5, 7.3_

- [x] 3. Phase 3: Reorganize Event Handlers
  - [x] 3.1 Create handlers/party-chronicle-handlers.ts module
    - Extract `handlePortraitClick()` logic from main.ts
    - Extract `handleSeasonChange()` logic from main.ts
    - Extract `handleLayoutChange()` logic from main.ts
    - Extract `handleFieldChange()` logic from main.ts
    - Add JSDoc comments explaining purpose and parameters
    - Export handler functions for use in main.ts
    - Document that these are called from event listeners in main.ts
    - File: `scripts/handlers/party-chronicle-handlers.ts` (new)
    - _Requirements: 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 3.2 Create handlers/form-data-handlers.ts module
    - Extract `extractFormData()` function from main.ts
    - Extract `saveFormData()` function from main.ts
    - Extract `autoSave()` logic from main.ts
    - Add JSDoc comments explaining purpose
    - Export functions for use in main.ts
    - File: `scripts/handlers/form-data-handlers.ts` (new)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 3.3 Extract generateChronicles logic from PartyChronicleApp
    - Move `#generateChronicles()` method logic to handlers/party-chronicle-handlers.ts
    - Export as `generateChroniclesFromPartyData()` function
    - Update PartyChronicleApp to call the extracted function
    - Maintain exact behavior
    - File: `scripts/PartyChronicleApp.ts`, `scripts/handlers/party-chronicle-handlers.ts`
    - _Requirements: 1.2, 5.1, 5.2, 5.3_
  
  - [x] 3.4 Update: `scripts/main.ts`
    - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 3.5 Create handlers/single-chronicle-handlers.ts module
    - Extract `#generatePDF()` method logic from PFSChronicleGeneratorApp.ts
    - Export as `generateSingleChronicle()` function
    - Add JSDoc comments explaining purpose
    - File: `scripts/handlers/single-chronicle-handlers.ts` (new)
    - _Requirements: 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 3.6 Update PFSChronicleGeneratorApp to use extracted handler
    - Import `generateSingleChronicle()` from handlers/single-chronicle-handlers.ts
    - Update `#generatePDF()` to call the extracted function
    - Remove extracted logic
    - Verify TypeScript compilation succeeds
    - File: `scripts/PFSChronicleGeneratorApp.ts`
    - _Requirements: 1.4, 3.1, 3.6_
  
  - [x] 3.7 Run tests after Phase 3 reorganization
    - Run TypeScript compiler: `npm run build`
    - Run all unit tests: `npm test`
    - Verify all tests pass without modification
    - If tests fail, revert and adjust extraction strategy
    - _Requirements: 3.4, 3.5, 7.3_

- [x] 4. Phase 4: Validate and Document
  - [x] 4.1 Verify file size compliance
    - Check main.ts line count (target: <500 lines)
    - Check PartyChronicleApp.ts line count (target: <500 lines)
    - Check PdfGenerator.ts line count (target: <500 lines)
    - Check PFSChronicleGeneratorApp.ts line count (target: <300 lines)
    - Document any files between 300-500 lines with justification
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.4_
  
  - [x] 4.2 Verify cyclomatic complexity compliance
    - Run ESLint with complexity rules: `npm run lint`
    - Verify all functions have CCN <15
    - Specifically check: PFSChronicleGeneratorApp._prepareContext, validateSharedFields, PartyChronicleApp._prepareContext, validateUniqueFields, updateValidationDisplay
    - Document any functions with CCN 10-15 with justification
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.2, 7.5_
  
  - [x] 4.3 Run full test suite
    - Run TypeScript compiler: `npm run build`
    - Run all unit tests: `npm test`
    - Run all property-based tests (if separate command exists)
    - Verify all tests pass without modification
    - _Requirements: 3.4, 3.5, 6.5, 7.3_
  
  - [x] 4.4 Verify TypeScript strict mode compliance
    - Ensure tsconfig.json has strict mode enabled
    - Verify no TypeScript compilation errors
    - Verify no type safety regressions
    - _Requirements: 6.5, 7.3_
  
  - [x] 4.5 Manual testing in Foundry VTT
    - Test party chronicle form renders correctly in Society tab
    - Test season dropdown changes update layout options
    - Test layout dropdown changes update form fields
    - Test shared field changes trigger auto-save
    - Test unique field changes trigger auto-save
    - Test validation errors display correctly
    - Test Generate Chronicles button creates PDFs
    - Test portrait clicks open character sheets
    - Verify all event listeners work correctly
    - _Requirements: 3.2, 3.3, 3.7, 4.1, 4.2, 4.3, 4.4_
  
  - [x] 4.6 Update architecture.md documentation
    - Document new module structure (handlers/, utils/ directories)
    - Document extracted modules and their responsibilities
    - Update file organization section
    - Add notes about where to make changes for future features
    - Document that event listeners remain in main.ts (hybrid pattern preserved)
    - File: `.kiro/steering/architecture.md`
    - _Requirements: 5.4, 5.5, 6.3, 6.4_
  
  - [x] 4.7 Final validation checkpoint
    - Confirm all production files are under 500 lines
    - Confirm all functions have CCN under 15
    - Confirm all tests pass
    - Confirm TypeScript compiles with strict mode
    - Confirm manual testing checklist passes
    - Confirm architecture.md is updated
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Notes

- This refactoring uses behavior-preserving transformation—no functionality changes
- Run tests after each phase to catch regressions early
- CRITICAL: Event listeners MUST remain in main.ts (hybrid ApplicationV2 pattern)
- Do NOT move event listeners to ApplicationV2 _onRender methods
- Preserve all existing function signatures and public APIs
- Preserve all existing error handling behavior
- Do NOT refactor simple null-coalescing patterns or flat validation checks
- Focus on cognitive complexity, not just raw CCN numbers
- Each task references specific requirements for traceability
- The existing test suite provides validation—no new tests needed
- If tests fail after extraction, revert and adjust strategy
