---
inclusion: fileMatch
fileMatchPattern: "scripts/**,templates/**,css/**"
---

# PFS Chronicle Generator - Foundry VTT Architecture Guide

## Overview

This document describes the architectural patterns and constraints of the PFS Chronicle Generator module. Understanding these patterns is critical for implementing new features and fixing bugs correctly.

## Rendering Architecture (CRITICAL)

### Hybrid ApplicationV2 Pattern

The Party Chronicle form uses a **hybrid rendering approach** that differs from standard Foundry VTT ApplicationV2 patterns:

**PartyChronicleApp** (`scripts/PartyChronicleApp.ts`):
- Extends ApplicationV2 but is NOT used for actual rendering
- The `_onRender` lifecycle method is NOT called during normal operation
- The class is only used to prepare context data via `_prepareContext()`
- Event handlers defined in PartyChronicleApp are NOT automatically attached

**Actual Rendering** (`scripts/main.ts`):
- The form is rendered manually in the `renderPartyChronicleForm()` function
- Uses `foundry.applications.handlebars.renderTemplate()` to render the template
- Injects the HTML directly into a container element in the PFS party sheet's "Society" tab
- Manually attaches ALL event listeners using jQuery and native DOM APIs

### Why This Architecture?

This hybrid approach exists because the **PFS system (Pathfinder Society character sheets) has not fully migrated to ApplicationV2**. The Party Chronicle form needs to be injected into the PFS party sheet's "Society" tab, which requires manual DOM manipulation rather than using ApplicationV2's standard rendering lifecycle.

### Implications for Development

When adding new interactive features to the Party Chronicle form:

1. ❌ **Do NOT** add event listeners in `PartyChronicleApp._onRender` - they won't be called
2. ✅ **DO** add event listeners in `main.ts` in the `renderPartyChronicleForm()` function
3. ✅ **DO** follow the existing pattern of other event handlers in that function
4. ✅ **DO** use native DOM APIs (`querySelectorAll`, `addEventListener`) for new code
5. ⚠️ **EXISTING** code uses jQuery (`$(container).find()`, `.on()`) - this is legacy but functional
6. ✅ **DO** extract handler logic into `handlers/` modules for better organization and testability

### Where to Add Event Listeners

**Correct location** - `scripts/main.ts` in `renderPartyChronicleForm()`:
```typescript
// Import handler functions from handlers/ modules
import { handlePortraitClick, handleSeasonChange } from './handlers/party-chronicle-handlers.js';

async function renderPartyChronicleForm(container: HTMLElement, partyActors: any[], partySheet: any) {
    // ... template rendering ...
    
    // Add your event listeners HERE, after template is rendered
    const portraits = container.querySelectorAll('.actor-image img.actor-link');
    portraits.forEach((img) => {
        img.addEventListener('click', (event: MouseEvent) => {
            // Call handler function from handlers/ module
            handlePortraitClick(event, partyActors);
        });
    });
    
    // ... rest of function ...
}
```

**Correct location for handler logic** - `scripts/handlers/party-chronicle-handlers.ts`:
```typescript
/**
 * Handles portrait image click events to open character sheets
 * This handler is called from event listeners in main.ts
 */
export function handlePortraitClick(event: MouseEvent, partyActors: any[]): void {
    event.preventDefault();
    const memberActivity = (event.target as HTMLElement).closest('.member-activity');
    const characterId = memberActivity?.getAttribute('data-character-id');
    // ... handler logic ...
}
```

**Incorrect location** - `scripts/PartyChronicleApp.ts` in `_onRender()`:
```typescript
// ❌ THIS WILL NOT WORK - _onRender is never called
async _onRender(context: any, options: any): Promise<void> {
    // Event listeners here are NEVER attached
}
```

## jQuery vs Native DOM APIs

### Current State

The codebase uses a **mix of jQuery and native DOM APIs**:

- **jQuery**: Used extensively in `main.ts` for event listener attachment (`$(container).find()`, `.on()`)
- **Native DOM**: Recommended for new code (`querySelectorAll()`, `addEventListener()`)
- **Foundry Context**: ApplicationV2 uses native DOM by default; jQuery is still available but not preferred

### Best Practices

**For new features**:
- Use native DOM APIs (`querySelector`, `querySelectorAll`, `addEventListener`)
- This aligns with Foundry VTT v12+ best practices
- Example: Portrait click handler uses native DOM APIs

**For existing code**:
- jQuery patterns are functional and don't need immediate replacement
- A bugfix spec exists for modernizing jQuery usage: `.kiro/specs/modernize-jquery-to-native-dom/`
- Prioritize new features over refactoring unless jQuery causes issues

## Future Migration Path

When the PFS system fully migrates to ApplicationV2, this module can be refactored:

### Step 1: Remove Manual Rendering
- Delete the `renderPartyChronicleForm()` function from `main.ts`
- Remove the tab injection logic that manually inserts HTML

### Step 2: Use PartyChronicleApp as Proper ApplicationV2
- Call `new PartyChronicleApp(partyActors).render(true)` to open as a standalone window
- OR integrate with PFS party sheet's tab system if it provides ApplicationV2 hooks

### Step 3: Move Event Listeners to `_onRender`
- All event listeners currently in `main.ts` should move to `PartyChronicleApp._onRender()`
- Many handler methods are already implemented in PartyChronicleApp (e.g., `_onPortraitClick`)
- Use native DOM APIs: `this.element.querySelectorAll()` and `addEventListener()`

### Step 4: Update Integration Points
- Replace `$(container)` jQuery patterns with `this.element` native DOM access
- Ensure all handlers use `this.` binding for proper context
- Remove jQuery dependency entirely

### Step 5: Testing Checklist
- Verify all event listeners work (season, layout, fields, buttons, portraits)
- Confirm auto-save functionality still works
- Test form state preservation across re-renders
- Validate that all interactive features work correctly

## Common Pitfalls

### Pitfall 1: Adding Event Listeners in Wrong Location
**Problem**: Adding event listeners in `PartyChronicleApp._onRender()` and wondering why they don't work.

**Solution**: Add them in `main.ts` in `renderPartyChronicleForm()` after the template is rendered.

### Pitfall 2: Assuming ApplicationV2 Lifecycle Works
**Problem**: Expecting ApplicationV2 lifecycle methods (`_onRender`, `_onClose`, etc.) to be called automatically.

**Solution**: Remember this is a hybrid approach - only `_prepareContext()` is used. All other logic is manual.

### Pitfall 3: jQuery Object vs DOM Element Confusion
**Problem**: Calling native DOM methods on jQuery objects or vice versa.

**Solution**: 
- jQuery object: `const $elem = $(container)` → use `.find()`, `.on()`
- DOM element: `const elem = container` → use `.querySelector()`, `.addEventListener()`
- Convert: `const elem = $elem[0]` (jQuery to DOM) or `const $elem = $(elem)` (DOM to jQuery)

## File Organization

### Directory Structure

The codebase follows a modular organization pattern to maintain code quality and comply with file size and complexity standards:

```
scripts/
├── main.ts                          # Entry point, tab injection, event listener attachments
├── PartyChronicleApp.ts             # ApplicationV2 context preparation for party chronicles
├── PFSChronicleGeneratorApp.ts      # ApplicationV2 for single-character chronicles
├── PdfGenerator.ts                  # PDF rendering engine
├── LayoutStore.ts                   # Layout configuration management
├── handlers/                        # Event handler logic (called from main.ts)
│   ├── party-chronicle-handlers.ts  # Party chronicle event handlers
│   ├── form-data-extraction.ts      # Form data extraction logic
│   ├── chronicle-generation.ts      # Chronicle generation workflow
│   ├── single-chronicle-handlers.ts # Single-character chronicle handlers
│   └── validation-display.ts        # Validation UI update logic
├── utils/                           # Utility functions
│   ├── filename-utils.ts            # Filename sanitization and generation
│   ├── layout-utils.ts              # Layout-specific field utilities
│   ├── pdf-utils.ts                 # PDF color, font, and coordinate utilities
│   └── pdf-element-utils.ts         # PDF element resolution logic
└── model/                           # Data models and business logic
    ├── party-chronicle-types.ts     # TypeScript type definitions
    ├── party-chronicle-storage.ts   # Data persistence
    ├── party-chronicle-validator.ts # Validation logic
    ├── validation-helpers.ts        # Reusable validation helper functions
    ├── party-chronicle-mapper.ts    # Data transformation
    ├── layout.ts                    # Layout data structures
    └── reputation-calculator.ts     # Reputation calculation logic
```

### Module Responsibilities

#### Core Application Files

**`scripts/main.ts`**:
- Module entry point and Foundry VTT hook registration
- Tab injection into PFS party sheet's "Society" tab
- Manual template rendering using `foundry.applications.handlebars.renderTemplate()`
- **Event listener attachments** (CRITICAL: all event listeners MUST be attached here)
- Calls handler functions from `handlers/` modules
- Maintains hybrid ApplicationV2 pattern

**`scripts/PartyChronicleApp.ts`**:
- ApplicationV2 class for party chronicle form (context preparation only)
- `_prepareContext()` method prepares data for template rendering
- Does NOT use ApplicationV2 rendering lifecycle (`_onRender` is not called)
- Helper methods for layout and field processing

**`scripts/PFSChronicleGeneratorApp.ts`**:
- ApplicationV2 class for single-character chronicle generation
- Similar context preparation pattern to PartyChronicleApp
- Handles individual character chronicle generation

**`scripts/PdfGenerator.ts`**:
- PDF rendering engine using pdf-lib
- Renders chronicle data onto blank PDF templates
- Uses utility functions from `utils/pdf-utils.ts` and `utils/pdf-element-utils.ts`

#### Handler Modules (`scripts/handlers/`)

**`party-chronicle-handlers.ts`**:
- Event handler logic for party chronicle form interactions
- Functions called by event listeners attached in `main.ts`
- Handles: portrait clicks, season changes, layout changes, field changes, treasure bundle display updates
- Key functions:
  - `handlePortraitClick()` - Opens character sheet when portrait is clicked
  - `handleSeasonChange()` - Updates layout options when season changes
  - `handleLayoutChange()` - Updates form fields when layout changes
  - `handleFieldChange()` - Handles form field changes and auto-save
  - `updateTreasureBundleDisplay()` - Updates treasure bundle gold display for a character
  - `updateAllTreasureBundleDisplays()` - Updates treasure bundle displays for all characters
  - `saveFormData()` - Saves form data to world flags
- Re-exports `extractFormData` and `generateChroniclesFromPartyData` for backward compatibility

**`form-data-extraction.ts`**:
- Form data extraction logic
- Reads all form fields and constructs structured data objects
- Key functions:
  - `extractFormData()` - Extracts form data into PartyChronicleData structure

**`chronicle-generation.ts`**:
- Chronicle generation workflow orchestration
- Handles validation, layout loading, PDF generation, and result display
- Key functions:
  - `generateChroniclesFromPartyData()` - Main orchestrator for chronicle generation
  - Internal helpers for validation, layout loading, PDF generation, and notifications

**`validation-display.ts`**:
- Validation UI update logic extracted from `main.ts`
- Updates validation error panel, inline field errors, and generate button state
- Key functions:
  - `updateValidationDisplay()` - Main entry point for validation UI updates
  - Helper functions for rendering errors and updating UI components

**`single-chronicle-handlers.ts`**:
- Event handler logic for single-character chronicle generation
- Called from `PFSChronicleGeneratorApp`
- Key functions:
  - `generateSingleChronicle()` - Generates PDF for a single character

#### Utility Modules (`scripts/utils/`)

**`filename-utils.ts`**:
- Filename sanitization and generation for chronicle PDFs
- Ensures cross-platform filename compatibility
- Key functions:
  - `sanitizeFilename()` - Removes invalid characters from filenames
  - `generateChronicleFilename()` - Creates standardized chronicle filenames

**`layout-utils.ts`**:
- Layout-specific field utilities shared across multiple modules
- Handles checkbox choices, strikeout choices, and layout field updates
- Key functions:
  - `findCheckboxChoices()` - Extracts checkbox options from layout
  - `findStrikeoutChoices()` - Extracts strikeout options from layout
  - `updateLayoutSpecificFields()` - Updates form fields based on selected layout

**`pdf-utils.ts`**:
- PDF rendering utilities for color, font, and coordinate handling
- Extracted from `PdfGenerator.ts` to reduce file size
- Key functions:
  - Color resolution functions
  - Font resolution functions
  - Canvas and coordinate utilities

**`pdf-element-utils.ts`**:
- PDF element resolution logic
- Handles element value extraction, type detection, and rendering
- Extracted from `PdfGenerator.ts` to reduce file size

#### Model Modules (`scripts/model/`)

**`party-chronicle-validator.ts`**:
- Validation logic for party chronicle data
- Uses helper functions from `validation-helpers.ts` to reduce complexity
- Key functions:
  - `validateSharedFields()` - Validates fields shared across all party members
  - `validateUniqueFields()` - Validates character-specific fields

**`validation-helpers.ts`**:
- Reusable validation helper functions
- Reduces cyclomatic complexity in main validation functions
- Key functions:
  - `validateDateFormat()` - Validates date strings
  - `validateSocietyIdFormat()` - Validates PFS society ID format
  - `validateNumberField()` - Validates numeric fields with constraints
  - `validateRequiredString()` - Validates required string fields
  - `validateOptionalArray()` - Validates optional array fields

**Other model files**:
- `party-chronicle-types.ts` - TypeScript type definitions
- `party-chronicle-storage.ts` - Data persistence (localStorage)
- `party-chronicle-mapper.ts` - Data transformation between formats
- `layout.ts` - Layout data structures and configuration
- `reputation-calculator.ts` - Reputation calculation logic

### Where to Make Changes

When implementing new features or fixing bugs, use this guide to determine where to make changes:

#### Adding New UI Interactions

1. **Event Listener Attachment**: Add in `main.ts` → `renderPartyChronicleForm()`
   - ✅ Attach event listeners here using native DOM APIs or jQuery
   - ❌ Do NOT add event listeners in `PartyChronicleApp._onRender()` (it's never called)

2. **Event Handler Logic**: Add in `handlers/party-chronicle-handlers.ts`
   - Create a new handler function (e.g., `handleNewFeature()`)
   - Call this function from the event listener in `main.ts`
   - Follow the pattern of existing handlers

3. **Example Pattern**:
   ```typescript
   // In main.ts - renderPartyChronicleForm()
   const newButton = container.querySelector('.new-feature-button');
   newButton?.addEventListener('click', (event) => {
       handleNewFeature(event, partyActors, container);
   });
   
   // In handlers/party-chronicle-handlers.ts
   export function handleNewFeature(event: MouseEvent, partyActors: any[], container: HTMLElement): void {
       // Handler logic here
   }
   ```

#### Modifying Data Preparation

- **Party Chronicle Context**: Modify `PartyChronicleApp._prepareContext()`
- **Single Chronicle Context**: Modify `PFSChronicleGeneratorApp._prepareContext()`
- **Layout Processing**: Modify functions in `utils/layout-utils.ts`

#### Updating Validation Logic

- **Shared Field Validation**: Modify `model/party-chronicle-validator.ts` → `validateSharedFields()`
- **Character Field Validation**: Modify `model/party-chronicle-validator.ts` → `validateUniqueFields()`
- **New Validation Helpers**: Add to `model/validation-helpers.ts`
- **Validation UI**: Modify `handlers/validation-display.ts`

#### Modifying Template Structure

- **Form Layout**: Edit `templates/party-chronicle-filling.hbs`
- **Styling**: Update `css/style.css`

#### Adding Utility Functions

- **Filename Operations**: Add to `utils/filename-utils.ts`
- **Layout Operations**: Add to `utils/layout-utils.ts`
- **PDF Operations**: Add to `utils/pdf-utils.ts` or `utils/pdf-element-utils.ts`
- **General Utilities**: Create a new utility module in `utils/` if needed

#### Modifying PDF Generation

- **PDF Rendering Logic**: Modify `PdfGenerator.ts`
- **PDF Utilities**: Modify `utils/pdf-utils.ts` or `utils/pdf-element-utils.ts`
- **Chronicle Generation**: Modify `handlers/party-chronicle-handlers.ts` or `handlers/single-chronicle-handlers.ts`

### Key Files (Legacy Reference)

For quick reference, here are the most commonly modified files:

- `scripts/main.ts` - Entry point, tab injection, manual rendering, event listeners
- `scripts/PartyChronicleApp.ts` - ApplicationV2 class (context preparation only)
- `scripts/handlers/party-chronicle-handlers.ts` - Event handler logic
- `templates/party-chronicle-filling.hbs` - Handlebars template for the form
- `scripts/model/` - Data models, storage, validation, mapping

## References

- [Foundry VTT ApplicationV2 Documentation](https://foundryvtt.wiki/en/development/api/applicationv2)
- [ApplicationV2 Conversion Guide](https://foundryvtt.wiki/en/development/guides/applicationV2-conversion-guide)
- Bugfix Spec: `.kiro/specs/modernize-jquery-to-native-dom/` - jQuery to native DOM migration
- Feature Spec: `.kiro/specs/party-chronicle-filling/` - Original party chronicle implementation
- Refactoring Spec: `.kiro/specs/code-standards-refactoring/` - Code standards compliance refactoring (2024)

## Questions?

If you're unsure where to add code for a new feature:
1. Check if it's UI interaction → Event listener in `main.ts` → Handler logic in `handlers/party-chronicle-handlers.ts`
2. Check if it's data preparation → `PartyChronicleApp._prepareContext()` or helper functions
3. Check if it's validation → `model/party-chronicle-validator.ts` or `model/validation-helpers.ts`
4. Check if it's a utility function → Create or add to appropriate module in `utils/`
5. Check if it's template structure → `templates/party-chronicle-filling.hbs`
6. When in doubt, follow the pattern of existing similar features and consult the "Where to Make Changes" section above
