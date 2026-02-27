# Design Document: Code Standards Refactoring

## Overview

This design describes the refactoring strategy to bring the PFS Chronicle Generator codebase into compliance with established coding standards. The refactoring addresses two primary concerns:

1. **File Size Violations**: Four files exceed the 500-line hard limit (main.ts: 916 lines, PartyChronicleApp.ts: 806 lines, PdfGenerator.ts: 650 lines, PFSChronicleGeneratorApp.ts: 418 lines)
2. **Cyclomatic Complexity Violations**: Five functions exceed CCN 15 (ranging from CCN 24 to CCN 45)

The refactoring must preserve all existing functionality while improving code maintainability, testability, and readability. A critical constraint is maintaining the hybrid ApplicationV2 rendering pattern where event listeners remain in main.ts rather than ApplicationV2 lifecycle methods.

## Architecture

### Refactoring Strategy

The refactoring follows a **behavior-preserving transformation** approach:

1. **Extract and Isolate**: Move cohesive functionality into focused modules
2. **Decompose Complexity**: Break down high-CCN functions into smaller, single-purpose functions
3. **Preserve Interfaces**: Maintain all public APIs and function signatures
4. **Validate Continuously**: Run existing tests after each extraction to ensure behavior preservation

### Architectural Constraints

**Hybrid Rendering Pattern (CRITICAL)**:
- Event listeners MUST remain in `main.ts` in the `renderPartyChronicleForm()` function
- Event listeners MUST NOT be moved to ApplicationV2 `_onRender()` methods
- Manual DOM manipulation and template rendering MUST stay in `main.ts`
- Context preparation in ApplicationV2 classes can be refactored freely

**Module Organization**:
- New modules should follow single-responsibility principle
- Extracted modules should be independently testable
- Module boundaries should reduce coupling where possible
- File structure should follow existing conventions (scripts/, scripts/model/, scripts/handlers/, scripts/utils/)

### Refactoring Phases

**Phase 1: Extract Utilities and Helpers**
- Create utility modules for reusable functions
- Extract domain-specific helpers (validation, formatting, data transformation)
- Target: Reduce file sizes by 20-30%

**Phase 2: Decompose High-Complexity Functions**
- Break down functions with CCN ≥15 into smaller functions
- Extract nested conditionals into well-named helper functions
- Preserve simple null-coalescing patterns (don't over-refactor)
- Target: All functions CCN <15

**Phase 3: Reorganize Event Handlers**
- Extract event handler logic into handler modules
- Keep event listener attachments in main.ts
- Improve handler testability through better separation
- Target: main.ts under 500 lines

**Phase 4: Validate and Document**
- Run all existing tests (unit and property-based)
- Verify TypeScript strict mode compliance
- Measure file sizes and CCN metrics
- Update architecture.md with new module structure

## Components and Interfaces

### New Module Structure

```
scripts/
├── main.ts                          # Entry point, event listener attachments (target: <500 lines)
├── PartyChronicleApp.ts             # ApplicationV2 context preparation (target: <500 lines)
├── PFSChronicleGeneratorApp.ts      # Single-character chronicle app (target: <300 lines)
├── PdfGenerator.ts                  # PDF rendering (target: <500 lines)
├── handlers/
│   ├── party-chronicle-handlers.ts  # Event handler logic extracted from main.ts
│   ├── validation-display.ts        # Validation UI update logic
│   └── form-data-handlers.ts        # Form data extraction and saving
├── utils/
│   ├── filename-utils.ts            # Filename sanitization and formatting
│   ├── layout-utils.ts              # Layout-specific field utilities
│   └── dom-utils.ts                 # DOM manipulation helpers
└── model/
    ├── party-chronicle-validator.ts # Validation logic (refactored to CCN <15)
    ├── validation-helpers.ts        # Extracted validation helper functions
    └── [existing model files]
```

### Module Responsibilities

**handlers/party-chronicle-handlers.ts**:
- Extracted event handler logic from main.ts
- Functions called by event listeners in main.ts
- Handles: portrait clicks, season changes, layout changes, field changes
- Exports: `handlePortraitClick()`, `handleSeasonChange()`, `handleLayoutChange()`, etc.

**handlers/validation-display.ts**:
- Extracted from `updateValidationDisplay()` in main.ts (CCN 24)
- Handles validation UI updates and error display
- Exports: `updateValidationDisplay()`, helper functions for error rendering

**handlers/form-data-handlers.ts**:
- Extracted form data extraction and saving logic
- Handles: `extractFormData()`, `saveFormData()`, auto-save logic
- Exports: `extractFormData()`, `saveFormData()`, `autoSave()`

**utils/filename-utils.ts**:
- Extracted filename sanitization from main.ts
- Exports: `sanitizeFilename()`, `generateChronicleFilename()`

**utils/layout-utils.ts**:
- Extracted layout-specific field utilities
- Handles: checkbox choices, strikeout choices, layout field updates
- Exports: `findCheckboxChoices()`, `findStrikeoutChoices()`, `updateLayoutSpecificFields()`

**model/validation-helpers.ts**:
- Extracted helper functions from party-chronicle-validator.ts
- Reduces CCN of `validateSharedFields()` and `validateUniqueFields()`
- Exports: `validateDateFormat()`, `validateSocietyIdFormat()`, `validateNumberField()`, `validateRequiredString()`

### Refactored Function Signatures

All existing public APIs will be preserved. Internal helper functions will have new signatures:

```typescript
// handlers/validation-display.ts
export function updateValidationDisplay(
  container: HTMLElement,
  partyActors: any[]
): void;

// Extracted helpers (new)
function renderSharedFieldErrors(container: HTMLElement, errors: string[]): void;
function renderCharacterErrors(container: HTMLElement, actorId: string, errors: string[]): void;
function clearValidationDisplay(container: HTMLElement): void;

// model/validation-helpers.ts
export function validateDateFormat(date: string): { valid: boolean; error?: string };
export function validateSocietyIdFormat(societyId: string): { valid: boolean; error?: string };
export function validateNumberField(
  value: any,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean }
): { valid: boolean; error?: string };
export function validateRequiredString(value: any, fieldName: string): { valid: boolean; error?: string };
```

## Data Models

No changes to existing data models. All types in `party-chronicle-types.ts` remain unchanged:
- `SharedFields`
- `UniqueFields`
- `PartyChronicleData`
- `ValidationResult`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, most are about refactoring outcomes (file sizes, CCN metrics) or code quality attributes (naming, organization, documentation) that cannot be tested with property-based testing. The testable criteria are primarily examples that validate the refactoring preserved existing behavior:

- Criteria 3.1-3.7: Validate that refactoring preserves functionality (tested by existing test suite)
- Criteria 4.1-4.4: Validate architectural constraints are maintained (code inspection)
- Criteria 6.5, 7.1-7.3: Validate compilation and metrics (one-time verification)

These are all **example-based validations** rather than properties that hold across many inputs. The primary validation mechanism is the existing test suite—if all existing unit tests and property-based tests pass after refactoring, we have high confidence that behavior is preserved.

**No new property-based tests are needed for this refactoring**. The existing property-based tests in the codebase already validate the correctness of the system's behavior. If those tests continue to pass after refactoring, it proves the refactoring preserved the properties they test.

### Validation Strategy

Instead of new properties, we rely on:

1. **Existing Test Suite**: All existing unit tests and property-based tests must pass without modification
2. **TypeScript Compiler**: Code must compile with strict mode enabled
3. **Metrics Validation**: Scripts to verify file sizes and CCN metrics meet standards
4. **Manual Code Review**: Verify architectural constraints (event listeners in main.ts, etc.)

## Error Handling

### Error Handling Preservation

All existing error handling must be preserved exactly:
- Try-catch blocks must remain in the same logical locations
- Error messages must remain unchanged
- Error propagation patterns must be maintained
- User-facing error notifications must work identically

### Refactoring-Specific Error Handling

During refactoring, if extraction creates new module boundaries:
- Errors should propagate naturally through function returns
- Don't add new try-catch blocks unless necessary for new module boundaries
- Maintain existing error handling patterns (e.g., validation returns `ValidationResult` objects)

## Testing Strategy

### Validation Approach

This refactoring uses **regression testing** rather than new test creation:

**Primary Validation**:
1. Run all existing unit tests after each extraction
2. Run all existing property-based tests after each extraction
3. If tests pass, refactoring preserved behavior
4. If tests fail, revert and adjust extraction strategy

**Secondary Validation**:
1. TypeScript compilation with strict mode
2. ESLint with complexity rules (verify CCN <15)
3. Line count scripts (verify files <500 lines)
4. Manual testing of UI interactions in Foundry VTT

### Test Execution Order

After each refactoring step:
1. Run TypeScript compiler: `npm run build`
2. Run unit tests: `npm test`
3. Run property-based tests: `npm run test:property`
4. Verify metrics: `npm run lint` (check CCN), `npm run check:lines` (check file sizes)

### No New Tests Required

The existing test suite already provides comprehensive coverage:
- Unit tests validate specific behaviors and edge cases
- Property-based tests validate universal properties across inputs
- Together they provide confidence that refactoring preserves functionality

**If all existing tests pass after refactoring, the refactoring is successful.**

### Manual Testing Checklist

After refactoring is complete, manually verify in Foundry VTT:
- [ ] Party chronicle form renders correctly in Society tab
- [ ] Season dropdown changes update layout options
- [ ] Layout dropdown changes update form fields
- [ ] Shared field changes trigger auto-save
- [ ] Unique field changes trigger auto-save
- [ ] Validation errors display correctly
- [ ] Generate Chronicles button creates PDFs
- [ ] Portrait clicks open character sheets
- [ ] All event listeners work correctly

## Implementation Notes

### Refactoring main.ts (916 → <500 lines)

**Target Extractions**:
ty-chronicle-handlers.ts` (~50 lines)

**Estimated Result**: 916 - 360 = ~556 lines (need additional extraction)

**Additional Extractions**:
8. Event handler logic from `renderPartyChronicleForm()` → `handlers/party-chronicle-handlers.ts`
   - Extract handler functions, keep event listener attachments in main.ts
   - Estimated: ~100 lines extracted

**Final Estimate**: ~450 lines (under 500 ✓)

### Refactoring PartyChronicleApp.ts (806 → <500 lines)

**Target Extractions**:
1. `_prepareContext()` decomposition (CCN 28):
   - Extract layout loading logic → helper function (~30 lines)
   - Extract field mapping logic → helper function (~40 lines)
   - Extract checkbox/strikeout logic → helper function (~30 lines)
2. `_updateLayoutSpecificFields()` → `utils/layout-utils.ts` (shared with main.ts) (~80 lines)
3. `_findCheckboxChoices()`, `_findStrikeoutChoices()` → `utils/layout-utils.ts` (~30 lines)
4. `#generateChronicles()` → `handlers/party-chronicle-handlers.ts` (~170 lines)

**Estimated Result**: 806 - 380 = ~426 lines (under 500 ✓)

### Refactoring PdfGenerator.ts (650 → <500 lines)

**Target Extractions**:
1. Color and font resolution → `utils/pdf-utils.ts` (~80 lines)
2. Canvas and coordinate utilities → `utils/pdf-utils.ts` (~40 lines)
3. Element resolution logic → `utils/pdf-element-utils.ts` (~60 lines)

**Estimated Result**: 650 - 180 = ~470 lines (under 500 ✓)

### Refactoring PFSChronicleGeneratorApp.ts (418 → <300 lines)

**Target Extractions**:
1. `_prepareContext()` decomposition (CCN 45):
   - Extract layout loading → helper function (~30 lines)
   - Extract field mapping → helper function (~50 lines)
   - Extract checkbox/strikeout → helper function (~30 lines)
2. `#generatePDF()` → `handlers/single-chronicle-handlers.ts` (~60 lines)

**Estimated Result**: 418 - 170 = ~248 lines (under 300 ✓)

### Refactoring party-chronicle-validator.ts (CCN 31, 25)

**Decompose `validateSharedFields()` (CCN 31 → <15)**:

Current structure: Long sequence of if-statements checking each field.

Refactoring strategy:
1. Extract field validation into helper functions
2. Use helper functions to reduce nesting and branching

```typescript
// Before (CCN 31)
export function validateSharedFields(shared: Partial<SharedFields>): ValidationResult {
  const errors: string[] = [];
  
  if (!shared.gmPfsNumber || shared.gmPfsNumber.trim() === '') {
    errors.push('GM PFS Number is required');
  }
  // ... 20+ more if-statements
  
  return { valid: errors.length === 0, errors };
}

// After (CCN ~8)
export function validateSharedFields(shared: Partial<SharedFields>): ValidationResult {
  const errors: string[] = [];
  
  errors.push(...validateRequiredString(shared.gmPfsNumber, 'GM PFS Number'));
  errors.push(...validateRequiredString(shared.scenarioName, 'Scenario Name'));
  errors.push(...validateRequiredString(shared.eventCode, 'Event Code'));
  errors.push(...validateEventDate(shared.eventDate));
  errors.push(...validateXpEarned(shared.xpEarned));
  errors.push(...validateTreasureBundles(shared.treasureBundles));
  errors.push(...validateRequiredString(shared.layoutId, 'Layout selection'));
  errors.push(...validateRequiredString(shared.seasonId, 'Season selection'));
  errors.push(...validateRequiredString(shared.blankChroniclePath, 'Blank Chronicle Path'));
  errors.push(...validateOptionalArray(shared.adventureSummaryCheckboxes, 'Adventure Summary Checkboxes'));
  errors.push(...validateOptionalArray(shared.strikeoutItems, 'Strikeout Items'));
  
  return { valid: errors.length === 0, errors: errors.filter(e => e) };
}
```

**Decompose `validateUniqueFields()` (CCN 25 → <15)**:

Similar strategy—extract field validations into helpers.

**Decompose `updateValidationDisplay()` (CCN 24 → <15)**:

Extract rendering logic into helper functions:
- `renderSharedFieldErrors()`
- `renderCharacterErrors()`
- `clearValidationDisplay()`

### Cognitive Complexity Considerations

**Do NOT refactor**:
- Simple null-coalescing: `value || defaultValue`
- Flat validation checks without nesting
- Optional chaining: `obj?.prop ?? default`

**DO refactor**:
- Nested conditionals (if inside if inside if)
- Complex boolean expressions with multiple && and ||
- Long chains of if-else with different logic in each branch

## Migration Path

This refactoring does not change the hybrid rendering architecture. Future migration to full ApplicationV2 (when PFS system supports it) would be a separate effort documented in architecture.md.

## Dependencies

- Existing TypeScript configuration
- Existing ESLint configuration with complexity rules
- Existing test framework (Jest or similar)
- Existing property-based testing library (fast-check or similar)

## Risks and Mitigations

**Risk**: Breaking existing functionality during extraction
**Mitigation**: Run tests after each extraction; revert if tests fail

**Risk**: Introducing new bugs in refactored code
**Mitigation**: Preserve exact logic; only restructure, don't rewrite

**Risk**: Missing event listener attachments after extraction
**Mitigation**: Manual testing checklist; verify all UI interactions work

**Risk**: TypeScript compilation errors after extraction
**Mitigation**: Compile after each extraction; fix import/export issues immediately

**Risk**: Over-refactoring simple patterns (null-coalescing)
**Mitigation**: Follow cognitive complexity guidelines; don't refactor flat patterns

## Success Criteria

Refactoring is complete when:
1. ✅ All production files are under 500 lines (preferably under 300)
2. ✅ All functions have CCN under 15 (preferably under 10)
3. ✅ All existing unit tests pass without modification
4. ✅ All existing property-based tests pass without modification
5. ✅ TypeScript compiles with strict mode enabled
6. ✅ Manual testing checklist passes
7. ✅ Architecture.md is updated with new module structure
