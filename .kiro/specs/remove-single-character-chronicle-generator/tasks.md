# Implementation Plan: Remove Single Character Chronicle Generator

## Overview

This plan removes the legacy single-character chronicle generator from the PFS Chronicle Generator module. The single-character generator has been superseded by the party chronicle generator. This removal will simplify the codebase, reduce maintenance burden, and eliminate user confusion.

The implementation follows a critical order to avoid breaking changes: create the new faction-names module, update all imports, verify tests pass, then remove the legacy code.

## Tasks

- [x] 1. Create faction-names module and update imports
  - [x] 1.1 Create scripts/model/faction-names.ts with FACTION_NAMES constant
    - Export FACTION_NAMES constant with all 6 faction mappings (EA, GA, HH, VS, RO, VW)
    - Add JSDoc comment explaining the constant's purpose
    - _Requirements: 3.1_
  
  - [x] 1.2 Update production code imports to use new faction-names module
    - Update scripts/model/reputation-calculator.ts import statement
    - Update scripts/model/party-chronicle-validator.ts import statement
    - Use relative path: `import { FACTION_NAMES } from './faction-names.js';`
    - _Requirements: 3.2, 3.3_
  
  - [x] 1.3 Update test file imports to use new faction-names module
    - Update jest.mock() calls in all 9 test files to mock './faction-names' or '../model/faction-names'
    - Update direct FACTION_NAMES imports where applicable
    - Test files: treasure-bundle-integration.test.ts, party-chronicle-unique-fields.test.ts, party-chronicle-validator.property.test.ts, reputation-calculator.property.test.ts, reputation-calculator.test.ts, party-chronicle-shared-fields.test.ts, party-chronicle-mapper.test.ts, party-chronicle-validator.test.ts
    - _Requirements: 3.4, 8.9_

- [x] 2. Checkpoint - Verify imports work correctly
  - Run all tests to verify FACTION_NAMES imports resolve correctly
  - Ensure all tests pass before proceeding with code removal
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 3. Remove single character chronicle generator UI from main.ts
  - [x] 3.1 Remove Generate Chronicle button creation code
    - Remove button header, button element creation, and click event listener (lines ~144-162)
    - Preserve Download Chronicle and Delete Chronicle buttons that follow
    - _Requirements: 1.1, 1.4, 2.5_
  
  - [x] 3.2 Remove PFSChronicleGeneratorApp import statement
    - Remove import from top of main.ts file
    - _Requirements: 2.4_

- [x] 4. Remove legacy settings from main.ts
  - [x] 4.1 Remove 5 legacy setting registrations
    - Remove gmName setting registration
    - Remove gmPfsNumber setting registration
    - Remove eventName setting registration
    - Remove eventcode setting registration
    - Remove eventDate setting registration
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 4.2 Verify preserved settings remain registered
    - Confirm partyChronicleData setting is still registered
    - Confirm layoutDesigner menu is still registered
    - Confirm blankChroniclePath, season, layout settings are still registered
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 5. Delete legacy single character chronicle generator files
  - [x] 5.1 Delete scripts/PFSChronicleGeneratorApp.ts
    - _Requirements: 2.1_
  
  - [x] 5.2 Delete templates/pfs-chronicle-generator.hbs
    - _Requirements: 2.2_
  
  - [x] 5.3 Delete scripts/handlers/single-chronicle-handlers.ts
    - _Requirements: 2.3_

- [x] 6. Checkpoint - Verify all tests pass and no broken imports
  - Run TypeScript compiler to verify no compilation errors
  - Run all tests to verify party chronicle generator still works
  - Search codebase for any remaining references to deleted files
  - _Requirements: 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 7. Clean up unused code and verify code quality
  - [x] 7.1 Search for and remove any commented-out code from single character generator
    - Review main.ts for commented-out code
    - _Requirements: 7.1, 7.5_
  
  - [x] 7.2 Review and remove unused CSS styles for single character generator
    - Check css/style.css for .pfs-chronicle-generator-button styles
    - Check css/style.css for .pfs-chronicle-generator-header styles
    - Only remove if not used by party chronicle generator
    - _Requirements: 7.4_
  
  - [x] 7.3 Verify no unused imports remain in main.ts
    - _Requirements: 7.2_

- [x] 8. Final verification - Manual testing
  - Open character sheet Society tab and verify Generate Chronicle button does not appear
  - Open character sheet Society tab and verify Download Chronicle button appears
  - Open character sheet Society tab and verify Delete Chronicle button appears (GM only)
  - Open party sheet Society tab and verify party chronicle form appears and works
  - Open module settings and verify legacy settings (gmName, gmPfsNumber, eventName, eventcode, eventDate) do not appear
  - Open module settings and verify Select Layout menu button appears
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 9.2, 9.3_

## Notes

- This is a code removal feature - no new functionality is being added
- The critical implementation order prevents breaking changes: create faction-names.ts → update imports → verify tests → remove code → verify again
- All existing tests must pass after changes - this verifies the party chronicle generator still works correctly
- FACTION_NAMES constant is preserved because it's used by the party chronicle system (reputation calculator and validator)
- Download/Delete buttons are preserved - they are not part of the single character generator
- Select Layout menu is preserved - it configures layouts for the party chronicle generator
