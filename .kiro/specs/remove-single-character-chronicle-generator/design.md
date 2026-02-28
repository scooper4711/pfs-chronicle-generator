# Design Document: Remove Single Character Chronicle Generator

## Overview

This design document specifies the technical approach for removing the legacy single-character chronicle generator from the PFS Chronicle Generator module. The single-character generator (PFSChronicleGeneratorApp) has been superseded by the party chronicle generator (PartyChronicleApp), which provides a more efficient workflow for generating chronicles for multiple party members simultaneously.

The removal must be surgical and precise:
- **Remove**: Single character generator UI, code files, legacy settings, and all related imports
- **Preserve**: Party chronicle generator, Download/Delete buttons, FACTION_NAMES constant, Select Layout menu, and all existing tests
- **Relocate**: FACTION_NAMES constant to a new dedicated module file

This is a code cleanup and simplification effort that will reduce maintenance burden and eliminate user confusion between two chronicle generation methods.

## Architecture

### Current Architecture

The module currently has two chronicle generation systems:

1. **Single Character Generator (Legacy - TO BE REMOVED)**:
   - `PFSChronicleGeneratorApp.ts` - ApplicationV2 form for single character chronicles
   - `templates/pfs-chronicle-generator.hbs` - Template for single character form
   - `handlers/single-chronicle-handlers.ts` - Event handlers for single character generation
   - "Generate Chronicle" button in character sheets (GM only)
   - 5 legacy settings: gmName, gmPfsNumber, eventName, eventcode, eventDate

2. **Party Chronicle Generator (Current - TO BE PRESERVED)**:
   - `PartyChronicleApp.ts` - ApplicationV2 context preparation for party chronicles
   - `templates/party-chronicle-filling.hbs` - Template for party chronicle form
   - `handlers/party-chronicle-handlers.ts` - Event handlers for party chronicle generation
   - Party chronicle form injected into party sheet's Society tab
   - All model files in `scripts/model/` directory

### Target Architecture

After removal, the module will have a single chronicle generation system:

1. **Party Chronicle Generator (Only System)**:
   - All party chronicle files remain unchanged
   - FACTION_NAMES constant moved to `scripts/model/faction-names.ts`
   - Download/Delete buttons remain in character sheets
   - Select Layout menu remains in settings

2. **Removed Components**:
   - PFSChronicleGeneratorApp.ts (deleted)
   - templates/pfs-chronicle-generator.hbs (deleted)
   - handlers/single-chronicle-handlers.ts (deleted)
   - "Generate Chronicle" button (removed from main.ts)
   - 5 legacy settings (removed from main.ts)
   - All imports of PFSChronicleGeneratorApp (removed from main.ts)

### Architectural Constraints

1. **No Functional Regression**: Party chronicle generator must continue to work exactly as before
2. **Test Compatibility**: All existing tests must pass with updated imports
3. **Clean Removal**: No commented-out code, unused imports, or dead code
4. **Import Updates**: All files importing FACTION_NAMES must be updated to new location

## Components and Interfaces

### New Component: faction-names.ts

A new module file will be created to house the FACTION_NAMES constant:

**File**: `scripts/model/faction-names.ts`

**Purpose**: Centralized location for faction name mappings used throughout the party chronicle system

**Interface**:
```typescript
/**
 * Maps faction abbreviations to full faction names.
 * Used by reputation calculator and validator for formatting faction names.
 */
export const FACTION_NAMES: Record<string, string> = {
    'EA': 'Envoy\'s Alliance',
    'GA': 'Grand Archive',
    'HH': 'Horizon Hunters',
    'VS': 'Vigilant Seal',
    'RO': 'Radiant Oath',
    'VW': 'Verdant Wheel'
};
```

**Rationale**: 
- The FACTION_NAMES constant is used by the party chronicle system (reputation-calculator.ts, party-chronicle-validator.ts)
- It should not be deleted with PFSChronicleGeneratorApp.ts
- Placing it in `scripts/model/` aligns with its usage as a data model constant
- The name `faction-names.ts` is clear and follows the module's naming conventions

### Files to Delete

1. **scripts/PFSChronicleGeneratorApp.ts**
   - Contains the legacy single character chronicle generator ApplicationV2 class
   - Exports FACTION_NAMES (will be moved to faction-names.ts before deletion)
   - Contains methods for single character form rendering and event handling
   - No longer needed after party chronicle generator adoption

2. **templates/pfs-chronicle-generator.hbs**
   - Handlebars template for single character chronicle form
   - Rendered by PFSChronicleGeneratorApp
   - No longer needed after party chronicle generator adoption

3. **scripts/handlers/single-chronicle-handlers.ts**
   - Contains `generateSingleChronicle()` function
   - Called by PFSChronicleGeneratorApp's form submit handler
   - No longer needed after party chronicle generator adoption

### Files to Modify

1. **scripts/main.ts**
   - Remove import of PFSChronicleGeneratorApp
   - Remove "Generate Chronicle" button creation code (lines ~144-162)
   - Remove 5 legacy settings registrations (gmName, gmPfsNumber, eventName, eventcode, eventDate)
   - Preserve all other functionality (party chronicle, download/delete buttons, layout designer menu)

2. **scripts/model/reputation-calculator.ts**
   - Update import: `import { FACTION_NAMES } from './faction-names.js';`
   - No other changes needed

3. **scripts/model/party-chronicle-validator.ts**
   - Update import: `import { FACTION_NAMES } from './faction-names.js';`
   - No other changes needed

4. **All Test Files** (9 files total):
   - Update jest.mock() to mock './faction-names' instead of '../PFSChronicleGeneratorApp'
   - Update import statements where FACTION_NAMES is imported directly
   - Files to update:
     - `scripts/treasure-bundle-integration.test.ts`
     - `scripts/model/party-chronicle-unique-fields.test.ts`
     - `scripts/model/party-chronicle-validator.property.test.ts`
     - `scripts/model/reputation-calculator.property.test.ts`
     - `scripts/model/reputation-calculator.test.ts`
     - `scripts/model/party-chronicle-shared-fields.test.ts`
     - `scripts/model/party-chronicle-mapper.test.ts`
     - `scripts/model/party-chronicle-validator.test.ts`
     - Any other test files that mock or import FACTION_NAMES

### Files to Preserve (No Changes)

1. **scripts/PartyChronicleApp.ts** - Party chronicle context preparation
2. **scripts/handlers/party-chronicle-handlers.ts** - Party chronicle event handlers
3. **templates/party-chronicle-filling.hbs** - Party chronicle form template
4. **scripts/LayoutDesignerApp.ts** - Layout designer (Select Layout menu)
5. **All files in scripts/model/** - Data models, storage, validation, mapping
6. **All files in scripts/utils/** - Utility functions
7. **scripts/PdfGenerator.ts** - PDF rendering engine
8. **scripts/LayoutStore.ts** - Layout configuration management

## Data Models

### FACTION_NAMES Constant

**Type**: `Record<string, string>`

**Structure**:
```typescript
{
  'EA': 'Envoy\'s Alliance',
  'GA': 'Grand Archive',
  'HH': 'Horizon Hunters',
  'VS': 'Vigilant Seal',
  'RO': 'Radiant Oath',
  'VW': 'Verdant Wheel'
}
```

**Usage**:
- **reputation-calculator.ts**: Maps faction abbreviations to full names when formatting reputation lines
- **party-chronicle-validator.ts**: Maps faction abbreviations to full names for validation error messages
- **Test files**: Used in test assertions to verify correct faction name formatting

**Migration Path**:
1. Create new file `scripts/model/faction-names.ts` with FACTION_NAMES export
2. Update all imports to reference new location
3. Delete PFSChronicleGeneratorApp.ts (which currently exports FACTION_NAMES)

### Settings to Remove

The following game settings will be unregistered (removed from main.ts):

1. **gmName** (String, world scope, config: true)
2. **gmPfsNumb
ed directly in the party chronicle form

### Settings to Preserve

The following game settings will remain registered:

1. **partyChronicleData** (Object, world scope, config: false) - Party chronicle form data storage
2. **blankChroniclePath** (String, world scope, config: false) - Path to blank chronicle PDF
3. **season** (String, world scope, config: false) - Selected season for layouts
4. **layout** (String, world scope, config: false) - Selected layout ID
5. **layoutDesigner** (Menu, world scope, restricted: true) - Select Layout menu button

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all acceptance criteria in the prework analysis, all criteria are **specific examples** rather than universal properties. This is expected for a code removal/refactoring feature:

- Criteria test specific file existence/absence (e.g., "PFSChronicleGeneratorApp.ts should not exist")
- Criteria test specific UI elements (e.g., "Generate Chronicle button should not appear")
- Criteria test specific settings registration (e.g., "gmName setting should not be registered")
- Criteria test specific test execution (e.g., "reputation-calculator.test.ts should pass")

These are all concrete, deterministic checks rather than rules that apply across a range of inputs. Therefore, this feature has **no universal properties** - only specific examples and verification steps.

### Testing Approach

Since this is a code removal feature, testing will focus on:

1. **Negative Tests**: Verify removed components are gone
   - Files deleted
   - Imports removed
   - UI elements removed
   - Settings unregistered

2. **Positive Tests**: Verify preserved components still work
   - Party chronicle generator functions correctly
   - Download/Delete buttons work correctly
   - Select Layout menu works correctly
   - All existing tests pass

3. **Integration Tests**: Verify updated imports work correctly
   - FACTION_NAMES imports resolve correctly
   - Test mocks reference correct module
   - No broken imports or missing dependencies

## Error Handling

### Potential Issues and Mitigations

1. **Issue**: Broken imports after FACTION_NAMES relocation
   - **Detection**: TypeScript compilation errors, test failures
   - **Mitigation**: Update all imports before deleting PFSChronicleGeneratorApp.ts
   - **Verification**: Run TypeScript compiler and all tests

2. **Issue**: Accidentally removing code needed by party chronicle generator
   - **Detection**: Party chronicle generator stops working, test failures
   - **Mitigation**: Carefully review all code in files to be deleted
   - **Verification**: Manual testing of party chronicle generator, run all tests

3. **Issue**: Leftover references to deleted files
   - **Detection**: TypeScript compilation errors, runtime errors
   - **Mitigation**: Search codebase for all references before deletion
   - **Verification**: Run TypeScript compiler, search for "PFSChronicleGeneratorApp", "single-chronicle-handlers"

4. **Issue**: CSS styles for single character form affecting party chronicle form
   - **Detection**: Visual inspection of party chronicle form
   - **Mitigation**: Review CSS file for single-character-specific styles
   - **Verification**: Visual inspection after removal

### Error Prevention Strategy

1. **Pre-Deletion Checklist**:
   - Create faction-names.ts and verify it exports FACTION_NAMES correctly
   - Update all imports to reference faction-names.ts
   - Run all tests to verify imports work
   - Search codebase for all references to files being deleted
   - Review CSS for single-character-specific styles

2. **Deletion Order**:
   - Step 1: Create faction-names.ts
   - Step 2: Update all imports (production code and tests)
   - Step 3: Run tests to verify imports work
   - Step 4: Remove Generate Chronicle button from main.ts
   - Step 5: Remove legacy settings from main.ts
   - Step 6: Remove import of PFSChronicleGeneratorApp from main.ts
   - Step 7: Delete PFSChronicleGeneratorApp.ts
   - Step 8: Delete pfs-chronicle-generator.hbs
   - Step 9: Delete single-chronicle-handlers.ts
   - Step 10: Run all tests to verify nothing broke

3. **Post-Deletion Verification**:
   - Run TypeScript compiler (no errors)
   - Run all tests (all pass)
   - Manual test: Open party sheet, verify party chronicle form works
   - Manual test: Open character sheet, verify Download/Delete buttons work
   - Manual test: Open settings, verify Select Layout menu works
   - Manual test: Verify Generate Chronicle button does not appear

## Testing Strategy

### Dual Testing Approach

This feature uses a **verification-focused testing approach** rather than the typical dual unit/property testing approach:

- **Manual Verification Tests**: Verify UI changes and file deletions
- **Automated Regression Tests**: Verify all existing tests still pass
- **Integration Tests**: Verify updated imports work correctly

### Manual Verification Tests

These tests verify the removal was successful:

1. **File Deletion Verification**:
   - Verify `scripts/PFSChronicleGeneratorApp.ts` does not exist
   - Verify `templates/pfs-chronicle-generator.hbs` does not exist
   - Verify `scripts/handlers/single-chronicle-handlers.ts` does not exist

2. **UI Verification**:
   - Open character sheet → Society tab → Verify "Generate Chronicle" button does not appear
   - Open character sheet → Society tab → Verify "Download Chronicle" button appears
   - Open character sheet → Society tab → Verify "Delete Chronicle" button appears (GM only)
   - Open party sheet → Society tab → Verify party chronicle form appears

3. **Settings Verification**:
   - Open module settings → Verify gmName setting does not appear
   - Open module settings → Verify gmPfsNumber setting does not appear
   - Open module settings → Verify eventName setting does not appear
   - Open module settings → Verify eventcode setting does not appear
   - Open module settings → Verify eventDate setting does not appear
   - Open module settings → Verify "Select Layout" menu button appears

4. **Code Quality Verification**:
   - Search codebase for "PFSChronicleGeneratorApp" → No results (except in comments/docs)
   - Search codebase for "single-chronicle-handlers" → No results (except in comments/docs)
   - Review main.ts → No commented-out code from single character generator
   - Review CSS → No unused styles for single character generator form

### Automated Regression Tests

All existing tests must pass after the changes:

1. **Unit Tests**:
   - `scripts/treasure-bundle-integration.test.ts` - Treasure bundle calculations
   - `scripts/model/party-chronicle-validator.test.ts` - Validation logic
   - `scripts/model/reputation-calculator.test.ts` - Reputation calculations
   - `scripts/model/party-chronicle-mapper.test.ts` - Data mapping
   - `scripts/model/party-chronicle-shared-fields.test.ts` - Shared field validation
   - `scripts/model/party-chronicle-unique-fields.test.ts` - Unique field validation

2. **Property-Based Tests**:
   - `scripts/model/party-chronicle-validator.property.test.ts` - Validation properties
   - `scripts/model/reputation-calculator.property.test.ts` - Reputation calculation properties

### Integration Tests

Verify updated imports work correctly:

1. **Import Resolution**:
   - Verify `scripts/model/reputation-calculator.ts` imports FACTION_NAMES from `./faction-names.js`
   - Verify `scripts/model/party-chronicle-validator.ts` imports FACTION_NAMES from `./faction-names.js`
   - Verify all test files mock `./faction-names` or `../model/faction-names` correctly

2. **Test Mock Updates**:
   - Verify all test files that mock FACTION_NAMES reference the correct module path
   - Verify test mocks provide the same FACTION_NAMES structure as the real module

### Test Execution

Run all tests with:
```bash
npm test
```

Expected result: All tests pass (0 failures)

### Test Coverage

This feature does not add new functionality, so no new tests are needed. The focus is on:
- Verifying existing tests still pass (regression testing)
- Manual verification of UI changes
- Code quality checks (no dead code, no broken imports)

## Implementation Notes

### Critical Implementation Order

The implementation must follow this exact order to avoid breaking the codebase:

1. **Create faction-names.ts** (new file, no dependencies)
2. **Update production code imports** (reputation-calculator.ts, party-chronicle-validator.ts)
3. **Update test file imports** (all 9 test files)
4. **Run tests** (verify imports work before deletion)
5. **Remove Generate Chronicle button** (main.ts)
6. **Remove legacy settings** (main.ts)
7. **Remove PFSChronicleGeneratorApp import** (main.ts)
8. **Delete files** (PFSChronicleGeneratorApp.ts, pfs-chronicle-generator.hbs, single-chronicle-handlers.ts)
9. **Run tests again** (verify nothing broke)
10. **Manual verification** (UI checks, settings checks)

### Import Path Considerations

When updating imports, use relative paths:

- From `scripts/model/reputation-calculator.ts`: `import { FACTION_NAMES } from './faction-names.js';`
- From `scripts/model/party-chronicle-validator.ts`: `import { FACTION_NAMES } from './faction-names.js';`
- From test files in `scripts/model/`: `jest.mock('./faction-names', () => ({ ... }))`
- From test files in `scripts/`: `jest.mock('./model/faction-names', () => ({ ... }))`

### Code Removal Guidelines

When removing code from main.ts:

1. **Generate Chronicle Button** (lines ~144-162):
   - Remove entire block including header, button creation, and event listener
   - Preserve Download and Delete buttons that follow

2. **Legacy Settings** (lines ~23-64):
   - Remove 5 settings: gmName, gmPfsNumber, eventName, eventcode, eventDate
   - Preserve partyChronicleData setting
   - Preserve layoutDesigner menu registration
   - Preserve blankChroniclePath, season, layout settings (registered in 'ready' hook)

3. **Import Statement** (line 1):
   - Remove: `import { PFSChronicleGeneratorApp } from './PFSChronicleGeneratorApp.js';`
   - Preserve all other imports

### Preservation Guidelines

Do NOT modify these files:
- `scripts/PartyChronicleApp.ts`
- `scripts/handlers/party-chronicle-handlers.ts`
- `templates/party-chronicle-filling.hbs`
- `scripts/LayoutDesignerApp.ts`
- `scripts/LayoutStore.ts`
- `scripts/PdfGenerator.ts`
- All files in `scripts/model/` (except reputation-calculator.ts and party-chronicle-validator.ts for import updates)
- All files in `scripts/utils/`

### CSS Considerations

Review `css/style.css` for single-character-specific styles:
- Look for styles targeting `.pfs-chronicle-generator-button` (used by Generate Chronicle button)
- Look for styles targeting `.pfs-chronicle-generator-header` (used by Generate Chronicle button header)
- These styles may be safe to remove if not used elsewhere
- Verify party chronicle form styles are not affected

## References

- Requirements Document: `.kiro/specs/remove-single-character-chronicle-generator/requirements.md`
- Architecture Guide: `.kiro/steering/architecture.md`
- Party Chronicle Feature Spec: `.kiro/specs/party-chronicle-filling/`
- Existing Test Files: `scripts/model/*.test.ts`, `scripts/*.test.ts`
