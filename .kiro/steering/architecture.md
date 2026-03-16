# PFS Chronicle Generator - Architecture Guide

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


## Coding Standards

### Clean Code Principles

This project follows the principles from Robert C. Martin's "Clean Code". These are fundamental guidelines that apply to all code:

**Meaningful Names**:
- Use intention-revealing names that explain why something exists and what it does
- Avoid abbreviations and single-letter variables (except loop counters in small scopes)
- Use pronounceable, searchable names
- Class names should be nouns (`ChronicleValidator`, `LayoutStore`)
- Function names should be verbs (`validateFields`, `generatePdf`, `handleClick`)
- Be consistent - use one word per concept (don't mix `fetch`, `retrieve`, and `get`)

**Functions**:
- Functions should do ONE thing and do it well (Single Responsibility Principle)
- Keep functions small - ideally under 20 lines, definitely under 50
- Function arguments: 0 is ideal, 1-2 is good, 3 requires justification, 4+ needs refactoring
- Avoid flag arguments (boolean parameters that change behavior) - split into separate functions
- No side effects - functions should do what their name says and nothing else
- Use descriptive names - long descriptive names are better than short enigmatic ones

**Comments**:
- Strive for self-explanatory code, but use comments liberally when they add value
- Good comments explain WHY, not WHAT - the code shows what it does, comments explain the reasoning
- Encouraged comments:
  - Legal comments (copyright, licenses)
  - Explanatory comments for complex algorithms, regex patterns, or business logic
  - Warning of consequences (e.g., "This test takes 10 minutes to run")
  - TODO comments (but address them promptly)
  - JSDoc for public APIs
  - Context comments explaining architectural decisions or constraints
  - Clarifying comments for non-obvious code that can't be easily refactored
- Avoid these comment types:
  - Redundant comments that merely repeat what code already says clearly
  - Misleading or outdated comments (keep comments in sync with code changes)
  - Noise comments that add no information ("// Constructor", "// Returns the value")
- Commented-out code:
  - Prefer version control over commented-out code for long-term storage
  - Temporary commented-out code during active development is acceptable
  - If keeping commented code, add a comment explaining why it's preserved

**Formatting**:
- Vertical formatting: Related concepts should be close together
- Use blank lines to separate concepts
- Variables should be declared close to their usage
- Dependent functions should be vertically close (caller above callee)
- Horizontal formatting: Keep lines short (under 120 characters)
- Use consistent indentation (this project uses 2 spaces for TypeScript)

**Error Handling**:
- Use exceptions rather than return codes
- Write try-catch-finally first when writing code that could throw
- Provide context with exceptions - include operation name and failure type
- Don't return null - return empty objects, arrays, or use Optional pattern
- Don't pass null - avoid null parameters in function signatures

**Objects and Data Structures**:
- Objects hide data and expose operations (methods)
- Data structures expose data and have no meaningful operations
- Don't create hybrid structures that are half object, half data structure
- Follow the Law of Demeter: a method should only call methods on:
  - Itself
  - Objects passed as parameters
  - Objects it creates
  - Its direct properties
- Avoid "train wrecks": `a.getB().getC().doSomething()` - use intermediate variables

**Classes**:
- Classes should be small - measured by responsibilities, not lines
- Single Responsibility Principle: a class should have one reason to change
- High cohesion: methods and variables should be interdependent
- Low coupling: minimize dependencies between classes
- Organize from high-level to low-level (public methods first, private helpers below)

**Tests**:
- Tests should be FIRST:
  - Fast: Tests should run quickly
  - Independent: Tests should not depend on each other
  - Repeatable: Tests should work in any environment
  - Self-Validating: Tests should have boolean output (pass/fail)
  - Timely: Write tests before production code (TDD)
- One assert per test (or one concept per test)
- Test code is as important as production code - keep it clean
- Use descriptive test names that explain what is being tested

**General Rules**:
- Follow the Boy Scout Rule: "Leave the code cleaner than you found it"
- Use consistent conventions throughout the codebase
- Replace magic numbers with named constants
- Be precise - don't use `any` type in TypeScript without good reason
- **TypeScript Type Safety**:
  - Do NOT use the `any` type except when interfacing with libraries which lack TypeScript definitions
  - When `any` is necessary, add a comment explaining why and document the expected shape
  - Prefer `unknown` over `any` when the type is truly unknown - it forces type checking before use
  - Use proper type definitions or interfaces instead of `any` whenever possible
- Encapsulate conditionals: `if (isValid())` is better than `if (value > 0 && value < 100)`
- Avoid negative conditionals: `if (isValid())` is clearer than `if (!isInvalid())`
- Don't repeat yourself (DRY) - avoid repeated code and duplication
- **Parameter Management**:
  - When dealing with large groups of parameters (4+), create structures (interfaces or types)
  - Group related parameters into objects for better maintainability
  - Example: Instead of `function createUser(name: string, email: string, age: number, address: string, phone: string)`, use `function createUser(userData: UserData)`

### DRY Principle (Don't Repeat Yourself)

The DRY principle states that "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system." Code duplication is one of the most common sources of bugs and maintenance issues.

**Core Tenets of DRY**:

1. **Single Source of Truth**
   - Each piece of logic should exist in exactly one place
   - When logic needs to change, there should be only one place to change it
   - Duplication means multiple places to update, increasing the risk of inconsistency

2. **Abstraction Over Duplication**
   - When you find yourself copying code, create an abstraction instead
   - Extract repeated logic into functions, classes, or modules
   - Use parameters to handle variations rather than duplicating code

3. **Knowledge Representation**
   - DRY applies to more than just code - it includes:
     - Business logic and algorithms
     - Data structures and schemas
     - Configuration and constants
     - Documentation and comments
   - If the same concept appears in multiple places, consolidate it

**Identifying Code Duplication**:

**Exact Duplication** (easiest to spot):
```typescript
// BAD - Exact duplication
function calculatePriceA(quantity: number): number {
  const basePrice = 10;
  const tax = 0.08;
  return quantity * basePrice * (1 + tax);
}

function calculatePriceB(quantity: number): number {
  const basePrice = 10;
  const tax = 0.08;
  return quantity * basePrice * (1 + tax);
}

// GOOD - Single source of truth
function calculatePrice(quantity: number, basePrice: number): number {
  const tax = 0.08;
  return quantity * basePrice * (1 + tax);
}
```

**Structural Duplication** (same pattern, different details):
```typescript
// BAD - Structural duplication
taskLevelSelects.forEach((select) => {
  select.addEventListener('change', (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const characterId = extractCharacterIdFromFieldName(selectElement.name);
    if (characterId) {
      const params = extractEarnedIncomeParams(characterId, container);
      updateEarnedIncomeDisplay(params.characterId, params.taskLevel, 
        params.successLevel, params.proficiencyRank, params.downtimeDays, container);
    }
  });
});

successLevelSelects.forEach((select) => {
  select.addEventListener('change', (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const characterId = extractCharacterIdFromFieldName(selectElement.name);
    if (characterId) {
      const params = extractEarnedIncomeParams(characterId, container);
      updateEarnedIncomeDisplay(params.characterId, params.taskLevel, 
        params.successLevel, params.proficiencyRank, params.downtimeDays, container);
    }
  });
});

// GOOD - Extract common handler
function createEarnedIncomeChangeHandler(container: HTMLElement) {
  return (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const characterId = extractCharacterIdFromFieldName(selectElement.name);
    if (characterId) {
      const params = extractEarnedIncomeParams(characterId, container);
      updateEarnedIncomeDisplay(params.characterId, params.taskLevel, 
        params.successLevel, params.proficiencyRank, params.downtimeDays, container);
    }
  };
}

taskLevelSelects.forEach(select => 
  select.addEventListener('change', createEarnedIncomeChangeHandler(container)));
successLevelSelects.forEach(select => 
  select.addEventListener('change', createEarnedIncomeChangeHandler(container)));
```

**Semantic Duplication** (same concept, different implementation):
```typescript
// BAD - Same concept implemented differently
function isValidEmailA(email: string): boolean {
  return email.includes('@') && email.includes('.');
}

function checkEmailB(email: string): boolean {
  const parts = email.split('@');
  return parts.length === 2 && parts[1].includes('.');
}

// GOOD - Single validation function
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

**When to Apply DRY**:

✅ **DO apply DRY when**:
- The same logic appears in 2+ places
- Changes to one instance would require changing others
- The duplication represents the same concept or knowledge
- The code is stable and unlikely to diverge

❌ **DON'T apply DRY when**:
- Code looks similar but represents different concepts (coincidental duplication)
- The duplication is temporary during active development
- Abstracting would make the code harder to understand
- The code is likely to diverge in the future (premature abstraction)

**DRY Refactoring Strategies**:

1. **Extract Function**
   - Pull repeated code into a named function
   - Use parameters for variations

2. **Extract Data Structure**
   - When passing the same group of parameters repeatedly, create an interface or type
   - Example: `EarnedIncomeParams` interface instead of 5 separate parameters

3. **Extract Constant**
   - Replace magic numbers and strings with named constants
   - Define once, reference everywhere

4. **Use Higher-Order Functions**
   - Create functions that return functions (factories)
   - Example: `createEarnedIncomeChangeHandler()` returns an event handler

5. **Template Method Pattern**
   - Define algorithm structure in base, let subclasses fill in details
   - Useful for similar workflows with variations

6. **Configuration Over Code**
   - Use data structures to drive behavior instead of duplicating code
   - Example: Lookup tables instead of long if-else chains

**Measuring Code Duplication**:

Tools like `jscpd` (JavaScript Copy/Paste Detector) can automatically detect duplicated code blocks. This project uses automated duplication detection in CI to catch violations.

**Acceptable Duplication Threshold**:
- **0-5% duplication**: Excellent
- **5-10% duplication**: Acceptable
- **10-20% duplication**: Needs attention
- **>20% duplication**: Requires immediate refactoring

**Rule of Three**:
- First time: Write the code
- Second time: Duplicate with a comment noting the duplication
- Third time: Refactor to eliminate duplication

This prevents premature abstraction while ensuring duplication doesn't spread.

### File Size and Complexity

To maintain code quality and readability, all production code must adhere to these standards:

**File Size Limit**:
- Production class files SHOULD be kept under 300 lines
- Production class files MUST be kept under 500 lines
- If a file exceeds 300 lines, consider refactoring by:
  - Extracting helper functions into separate utility modules
  - Splitting large classes into smaller, focused classes
  - Moving related functionality into dedicated modules
- If a file approaches 500 lines, refactoring is mandatory

**Cyclomatic Complexity**:
- Functions SHOULD maintain cyclomatic complexity below 5
- Functions MUST maintain cyclomatic complexity below 15
- Cyclomatic complexity measures the number of independent paths through code
- High complexity (≥15) indicates code that is:
  - Difficult to test thoroughly
  - Hard to understand and maintain
  - More prone to bugs

**Important Nuance**:
- CCN is a **guideline, not an absolute rule**
- Simple, repetitive patterns are acceptable even if they increase CCN:
  - Null-coalescing operators (`value || defaultValue`)
  - Optional chaining (`obj?.prop ?? default`)
  - Simple switch statements with straightforward cases
  - Flat validation checks without nesting
- **Focus on cognitive complexity** - how hard is the code to understand?
- A function with CCN of 10 from null-coalescing is often clearer than CCN of 4 with nested conditionals
- **When high CCN is acceptable**: Suppress linter warnings with an explanatory comment:
  ```typescript
  // eslint-disable-next-line complexity -- Flat null-coalescing pattern is clearer than extraction
  function initializeDefaults(config: Config): Config {
    return {
      value1: config.value1 || DEFAULT_VALUE1,
      value2: config.value2 || DEFAULT_VALUE2,
      // ... many more similar assignments
    };
  }
  ```

**How to Reduce Complexity**:
1. Extract complex conditionals into well-named helper functions
2. Use early returns to reduce nesting
3. Replace nested if-else chains with guard clauses
4. Use lookup tables or strategy patterns instead of long switch statements
5. Break down complex functions into smaller, single-purpose functions
6. **Note**: Don't refactor simple null-coalescing patterns just to reduce CCN

**What Actually Needs Refactoring**:
- Nested conditionals (if inside if inside if)
- Complex boolean expressions with multiple && and ||
- Long chains of if-else with different logic in each branch
- Functions that do multiple different things based on conditions

**What Doesn't Need Refactoring**:
- Flat lists of assignments with `|| defaultValue`
- Simple switch statements with straightforward cases
- Validation functions with flat, repetitive checks
- Optional chaining patterns

**Example - High Complexity (BAD)**:
```typescript
function processData(data: any, type: string, options: any) {
  if (type === 'A') {
    if (options.flag1) {
      if (data.value > 10) {
        return data.value * 2;
      } else {
        return data.value + 5;
      }
    } else {
      return data.value;
    }
  } else if (type === 'B') {
    // ... more nested logic
  }
  // Cyclomatic complexity: 6+
}
```

**Example - Low Complexity (GOOD)**:
```typescript
function processData(data: any, type: string, options: any) {
  if (type === 'A') return processTypeA(data, options);
  if (type === 'B') return processTypeB(data, options);
  return data.value;
}

function processTypeA(data: any, options: any) {
  if (!options.flag1) return data.value;
  return data.value > 10 ? data.value * 2 : data.value + 5;
}
// Cyclomatic complexity: 2-3 per function
```

**Enforcement**:
- Use ESLint with complexity rules configured
- Review file sizes during code review
- Refactor proactively when approaching limits
- Consider complexity during design phase

**Exceptions**:
- Test files are exempt from these limits (they often need to be longer)
- Configuration files and type definition files are exempt
- Generated code is exempt
- If an exception is truly necessary, document the reason in comments


### Documentation Standards

**JSDoc Requirement References**:
- When documenting functions, classes, or methods that implement specific requirements from a spec, include a "Requirements:" line in the JSDoc
- **CRITICAL**: Always prefix requirement numbers with the spec/feature name to avoid confusion
- Each spec restarts requirement numbering from 1, so the prefix is essential for clarity
- Format: `Requirements: spec-name requirement-numbers`

**Attribution Scope**:
- **Attribute at the method/class level, NOT individual lines of code**
- When a method is created or modified to support a requirement, update the method's JSDoc comment
- This gives maintainers the context they need when reviewing a method
- Do NOT add inline comments attributing individual lines to requirements
- If a method implements multiple requirements, list all relevant requirement numbers

**Examples**:
```typescript
/**
 * Calculates the total gold from treasure bundles for a character.
 * 
 * @param treasureBundles - Number of treasure bundles
 * @param characterLevel - Character level (1-20)
 * @returns Total gold from treasure bundles
 * 
 * Requirements: treasure-bundle-calculation 2.1, 2.2, 2.3, 2.4
 */
export function calculateTreasureBundlesGp(
  treasureBundles: number,
  characterLevel: number
): number {
  // Implementation here - no inline requirement comments needed
  const bundleValue = getTreasureBundleValue(characterLevel);
  return Math.round(treasureBundles * bundleValue * 100) / 100;
}

/**
 * Handles portrait click events to open character sheets.
 * 
 * @param event - The mouse click event
 * @param partyActors - Array of party member actors
 * 
 * Requirements: clickable-player-portraits 1.1, 1.3, 1.4, 3.1, 3.2, 3.3
 */
export function handlePortraitClick(event: MouseEvent, partyActors: any[]): void {
  // Implementation here - no inline requirement comments needed
  event.preventDefault();
  const characterId = (event.target as HTMLElement).closest('.member-activity')?.getAttribute('data-character-id');
  // ...
}

/**
 * Validates character-specific fields.
 * 
 * @param unique - Character-specific fields to validate
 * @returns Validation result
 * 
 * Requirements: party-chronicle-filling 6.2, 6.3, treasure-bundle-calculation 10.1, 10.2
 */
export function validateUniqueFields(unique: Partial<UniqueFields>): ValidationResult {
  // Implementation here - no inline requirement comments needed
  const errors: string[] = [];
  errors.push(...validateRequiredString(unique.characterName, 'Character Name'));
  // ...
}
```

**Bad Example - Don't Do This**:
```typescript
export function extractFormData(container: HTMLElement, partyActors: any[]): any {
  const shared: any = {
    gmPfsNumber: (container.querySelector('#gmPfsNumber') as HTMLInputElement)?.value || '',
    // Requirements: multi-line-reputation-tracking 1.2, 4.2  ❌ DON'T attribute individual lines
    chosenFactionReputation: parseInt((container.querySelector('#chosenFactionReputation') as HTMLInputElement)?.value) || 2,
    // Requirements: multi-line-reputation-tracking 1.3, 4.1  ❌ DON'T attribute individual lines
    reputationValues: {
      EA: parseInt((container.querySelector('#reputation-EA') as HTMLInputElement)?.value) || 0,
      // ...
    },
  };
  // ...
}
```

**Good Example - Do This Instead**:
```typescript
/**
 * Extracts form data into PartyChronicleData structure.
 * 
 * Reads all form fields and constructs a structured data object containing
 * both shared fields and character-specific fields.
 * 
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @returns Structured form data object
 * 
 * Requirements: party-chronicle-filling 4.5, multi-line-reputation-tracking 1.2, 1.3, 4.1, 4.2
 */
export function extractFormData(container: HTMLElement, partyActors: any[]): any {
  const shared: any = {
    gmPfsNumber: (container.querySelector('#gmPfsNumber') as HTMLInputElement)?.value || '',
    chosenFactionReputation: parseInt((container.querySelector('#chosenFactionReputation') as HTMLInputElement)?.value) || 2,
    reputationValues: {
      EA: parseInt((container.querySelector('#reputation-EA') as HTMLInputElement)?.value) || 0,
      // ...
    },
  };
  // ...
}
```

**Why This Matters**:
- Prevents confusion when "requirement 4.1" appears in multiple specs
- Makes it easy to trace code back to the originating spec document
- Helps during code review to verify requirements are correctly implemented
- Useful for maintenance when understanding why code exists
- Keeps code clean and readable without excessive inline comments
- Provides context at the right level of granularity (method/class, not line-by-line)

**Spec Name Format**:
- Use the kebab-case directory name from `.kiro/specs/`
- Examples: `treasure-bundle-calculation`, `party-chronicle-filling`, `multi-line-reputation-tracking`
- For bugfix specs, use the directory name (e.g., `retain-society-tab-focus`)

### Git Commit Standards

This project follows [Conventional Commits](https://www.conventionalcommits.org/) combined with the [seven rules of a great Git commit message](https://cbea.ms/git-commit/).

**Commit Message Format**:
```
<type>: <subject>

[optional body]
```

**Type Prefixes** (Conventional Commits):
- `feat:` — A new feature
- `fix:` — A bug fix
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `docs:` — Documentation only changes
- `chore:` — Maintenance tasks (dependency updates, file cleanup, etc.)
- `test:` — Adding or updating tests
- `style:` — Formatting, whitespace, etc. (no code logic change)

**Subject Line Rules**:
1. Capitalize the first word after the type prefix
2. Use the imperative mood ("Add feature" not "Added feature")
3. Do not end with a period
4. Limit to 72 characters (aim for 50)
5. The subject should complete: "If applied, this commit will ___"

**Body Rules** (when needed):
1. Separate from subject with a blank line
2. Wrap at 72 characters
3. Explain what and why, not how
4. Use bullet points if listing multiple changes

**Branch Naming**:
- Feature work: `feat/<feature-name>`
- Refactoring: `refactor/<scope>`
- Bugfixes: `fix/<bug-name>`

**Examples**:

Good:
```
refactor: Extract shared utilities into common module

Move find_layout_file and transform_canvas_coordinates into
a shared layout_utils module to eliminate duplication between
chronicle2layout.py and clip_canvas.py.
```

```
chore: Remove obsolete Season 4 content extraction script
```

```
docs: Update README to reflect refactored module structure
```

Bad:
```
updated files          ❌ Not imperative, no type, vague
refactor: updated files.  ❌ Not imperative, ends with period
REFACTOR: EXTRACT UTILS   ❌ All caps
```

**Merge Strategy**:
- Use merge commits (`git merge --no-ff`) when integrating feature, refactor, and bugfix branches into main
- Do NOT use fast-forward merges — branches should be preserved in the commit graph so their history is visible
- The merge commit message should follow Conventional Commits format and reference the branch purpose
- Example: `Merge branch 'refactor/chronicle2layout'`
- This preserves the context of grouped work (e.g., a multi-commit refactoring) and makes `git log --graph` useful
