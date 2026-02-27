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

### Where to Add Event Listeners

**Correct location** - `scripts/main.ts` in `renderPartyChronicleForm()`:
```typescript
async function renderPartyChronicleForm(container: HTMLElement, partyActors: any[], partySheet: any) {
    // ... template rendering ...
    
    // Add your event listeners HERE, after template is rendered
    const portraits = container.querySelectorAll('.actor-image img.actor-link');
    portraits.forEach((img) => {
        img.addEventListener('click', (event: MouseEvent) => {
            // Your handler logic
        });
    });
    
    // ... rest of function ...
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

### Key Files
- `scripts/main.ts` - Entry point, tab injection, manual rendering, event listeners
- `scripts/PartyChronicleApp.ts` - ApplicationV2 class (context preparation only)
- `templates/party-chronicle-filling.hbs` - Handlebars template for the form
- `scripts/model/` - Data models, storage, validation, mapping

### Where to Make Changes
- **UI interactions**: Add event listeners in `main.ts` → `renderPartyChronicleForm()`
- **Data preparation**: Modify `PartyChronicleApp._prepareContext()`
- **Template structure**: Edit `templates/party-chronicle-filling.hbs`
- **Styling**: Update `css/style.css`
- **Data logic**: Modify files in `scripts/model/`

## References

- [Foundry VTT ApplicationV2 Documentation](https://foundryvtt.wiki/en/development/api/applicationv2)
- [ApplicationV2 Conversion Guide](https://foundryvtt.wiki/en/development/guides/applicationV2-conversion-guide)
- Bugfix Spec: `.kiro/specs/modernize-jquery-to-native-dom/` - jQuery to native DOM migration
- Feature Spec: `.kiro/specs/party-chronicle-filling/` - Original party chronicle implementation

## Questions?

If you're unsure where to add code for a new feature:
1. Check if it's UI interaction → `main.ts` in `renderPartyChronicleForm()`
2. Check if it's data preparation → `PartyChronicleApp._prepareContext()`
3. Check if it's template structure → `templates/party-chronicle-filling.hbs`
4. When in doubt, follow the pattern of existing similar features


## Coding Standards

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
