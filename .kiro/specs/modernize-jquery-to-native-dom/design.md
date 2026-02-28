# Design Document: Modernize jQuery to Native DOM

## Overview

This design document outlines the technical approach for migrating jQuery-based DOM manipulation and event handling to native DOM APIs in the PFS Chronicle Generator. The migration focuses on three areas: `main.ts`, `layout-utils.ts`, and removing dead code from `PartyChronicleApp.ts`.

## Design Principles

1. **Native DOM First**: Use native DOM APIs (`querySelector`, `querySelectorAll`, `addEventListener`) for all new and refactored code
2. **Type Safety**: Leverage TypeScript's type system with proper type assertions for DOM elements
3. **Null Safety**: Use optional chaining (`?.`) to handle potentially missing elements gracefully
4. **Code Clarity**: Prefer explicit, readable code over terse jQuery chains
5. **Dead Code Elimination**: Remove unused code that duplicates functionality elsewhere

## Architecture Changes

### 1. Main.ts Event Listener Refactoring

**Current Architecture:**
```typescript
const $container = $(container);  // jQuery wrapper
$container.find('#season').on('change', async (event: any) => { ... });
```

**New Architecture:**
```typescript
const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
seasonSelect?.addEventListener('change', async (event: Event) => { ... });
```

**Key Changes:**
- Remove jQuery wrapper creation
- Use `querySelector` for single elements
- Use `querySelectorAll` with `forEach` for multiple elements
- Use proper TypeScript types (`HTMLSelectElement`, `HTMLInputElement`, etc.)
- Use `Event` type instead of `any` for event parameters

### 2. Layout-Utils.ts Dual Implementation Removal

**Current Architecture:**
```typescript
const isJQuery = container && typeof (container as any).jquery !== 'undefined';
if (isJQuery) {
  // jQuery implementation
  const $container = container as JQuery;
  const div = $('<div class="checkbox-choice"></div>');
} else {
  // Native DOM implementation
  const element = container as HTMLElement;
  const div = document.createElement('div');
}
```

**New Architecture:**
```typescript
// Single native DOM implementation
const element = container as HTMLElement;
const div = document.createElement('div');
div.className = 'checkbox-choice';
```

**Key Changes:**
- Remove jQuery/native DOM detection logic
- Remove entire jQuery code path
- Keep only native DOM implementation
- Update function signature to accept only `HTMLElement`

### 3. PartyChronicleApp.ts Dead Code Removal

**Current State:**
- `_onRender()` method (never called)
- Handler methods: `_onSeasonChanged`, `_onLayoutChanged`, `_onSharedFieldChanged`, `_onUniqueFieldChanged`, `_onSaveData`, `_onClearData`, `_onPortraitClick`
- Helper methods: `_updateLayoutSpecificFields`, `_updateButtonStates`

**New State:**
- Keep only `_prepareContext()` and its supporting methods
- Remove all event handling code
- Remove all UI update code

**Rationale:**
- These methods duplicate functionality in `main.ts` and `handlers/party-chronicle-handlers.ts`
- They are never called in the current hybrid architecture
- When ApplicationV2 migration happens, they can be recreated using native DOM APIs

## Detailed Implementation Design

### 3.1 Main.ts - renderPartyChronicleForm()

#### Event Listener Pattern

**Before:**
```typescript
const $container = $(container);
$container.find('#season').on('change', async (event: any) => {
    await handleSeasonChange(event, $container, partyActors, extractFormData);
});
```

**After:**
```typescript
const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
seasonSelect?.addEventListener('change', async (event: Event) => {
    await handleSeasonChange(event, container, partyActors, extractFormData);
});
```

#### Multiple Elements Pattern

**Before:**
```typescript
$container.find('input, select, textarea').on('change', async (event: any) => {
    await handleFieldChange(event, $container, partyActors, extractFormData);
});
```

**After:**
```typescript
const formElements = container.querySelectorAll('input, select, textarea');
formElements.forEach((element) => {
    element.addEventListener('change', async (event: Event) => {
        await handleFieldChange(event, container, partyActors, extractFormData);
    });
});
```

#### Value Extraction Pattern

**Before:**
```typescript
const layoutId = $container.find('#layout').val() as string;
```

**After:**
```typescript
const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
const layoutId = layoutSelect?.value || '';
```

### 3.2 Layout-Utils.ts - updateLayoutSpecificFields()

#### Function Signature Change

**Before:**
```typescript
export async function updateLayoutSpecificFields(
  container: HTMLElement | JQuery,
  layoutId: string,
  onChangeCallback: () => Promise<void>
): Promise<void>
```

**After:**
```typescript
export async function updateLayoutSpecificFields(
  container: HTMLElement,
  layoutId: string,
  onChangeCallback: () => Promise<void>
): Promise<void>
```

#### Element Creation Pattern

**Before (jQuery path):**
```typescript
const div = $('<div class="checkbox-choice"></div>');
const checkbox = $(`<input type="checkbox" id="checkbox-${index}" name="shared.adventureSummaryCheckboxes" value="${choice}" ${savedCheckboxes.includes(choice) ? 'checked' : ''}>`);
const label = $(`<label for="checkbox-${index}">${choice}</label>`);
div.append(checkbox).append(label);
checkboxContainer.append(div);
```

**After (native DOM only):**
```typescript
const div = document.createElement('div');
div.className = 'checkbox-choice';

const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.id = `checkbox-${index}`;
checkbox.name = 'shared.adventureSummaryCheckboxes';
checkbox.value = choice;
checkbox.checked = savedCheckboxes.includes(choice);

const label = document.createElement('label');
label.htmlFor = `checkbox-${index}`;
label.textContent = choice;

div.appendChild(checkbox);
div.appendChild(label);
checkboxContainer.appendChild(div);
```

#### Container Clearing Pattern

**Before (jQuery path):**
```typescript
checkboxContainer.empty();
```

**After (native DOM only):**
```typescript
checkboxContainer.innerHTML = '';
```

#### Event Listener Attachment Pattern

**Before (jQuery path):**
```typescript
$container.find('#adventureSummaryCheckboxes input, #strikeoutItems input').on('change', onChangeCallback);
```

**After (native DOM only):**
```typescript
const checkboxes = element.querySelectorAll('#adventureSummaryCheckboxes input, #strikeoutItems input');
checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', onChangeCallback);
});
```

### 3.3 PartyChronicleApp.ts - Dead Code Removal

#### Methods to Remove

1. **_onRender()** - Complete method removal
2. **_onSeasonChanged()** - Complete method removal
3. **_onLayoutChanged()** - Complete method removal
4. **_onSharedFieldChanged()** - Complete method removal
5. **_onUniqueFieldChanged()** - Complete method removal
6. **_onSaveData()** - Complete method removal
7. **_onClearData()** - Complete method removal
8. **_onPortraitClick()** - Complete method removal
9. **_updateLayoutSpecificFields()** - Complete method removal
10. **_updateButtonStates()** - Complete method removal

#### Methods to Keep

1. **constructor()** - Required for instantiation
2. **_prepareContext()** - Used by main.ts for template rendering
3. **_getSeasons()** - Supporting method for _prepareContext
4. **_getLayouts()** - Supporting method for _prepareContext
5. **_getLayoutFields()** - Supporting method for _prepareContext
6. **_getPartyMembers()** - Supporting method for _prepareContext
7. **_loadSavedData()** - Supporting method for _prepareContext

## Handler Function Updates

### Type Signature Changes

All handler functions in `handlers/party-chronicle-handlers.ts` that currently accept jQuery objects must be updated:

**Before:**
```typescript
export async function handleSeasonChange(
    event: any,
    $container: JQuery,
    partyActors: any[],
    extractFormData: Function
): Promise<void>
```

**After:**
```typescript
export async function handleSeasonChange(
    event: Event,
    container: HTMLElement,
    partyActors: any[],
    extractFormData: Function
): Promise<void>
```

### Internal jQuery Usage Updates

Within handler functions, replace jQuery queries with native DOM:

**Before:**
```typescript
const seasonId = $container.find('#season').val() || '';
```

**After:**
```typescript
const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
const seasonId = seasonSelect?.value || '';
```

## Data Extraction Updates

### extractFormData Function

The `extractFormData` function in `handlers/party-chronicle-handlers.ts` must be updated to work with HTMLElement:

**Before:**
```typescript
function extractFormData($container: JQuery, partyActors: any[]): PartyChronicleData
```

**After:**
```typescript
function extractFormData(container: HTMLElement, partyActors: any[]): PartyChronicleData
```

**Internal Changes:**
- Replace `$container.find()` with `container.querySelector()` or `container.querySelectorAll()`
- Replace `.val()` with `.value` property access
- Replace `.map().get()` with native array methods

## Error Handling

### Null Safety Pattern

All DOM queries should use optional chaining to handle missing elements:

```typescript
const element = container.querySelector('#someId') as HTMLSelectElement;
const value = element?.value || 'default';
```

### Type Assertions

Use TypeScript type assertions for specific element types:

```typescript
const input = container.querySelector('#myInput') as HTMLInputElement;
const select = container.querySelector('#mySelect') as HTMLSelectElement;
const textarea = container.querySelector('#myTextarea') as HTMLTextAreaElement;
```

## Testing Strategy

### Manual Testing Checklist

1. **Season Dropdown**
   - Change season → verify layout options update
   - Verify saved data persists

2. **Layout Dropdown**
   - Change layout → verify form fields update
   - Verify checkbox choices populate correctly
   - Verify strikeout choices populate correctly

3. **Form Fields**
   - Change shared fields → verify auto-save
   - Change character-specific fields → verify auto-save
   - Verify validation updates in real-time

4. **Action Buttons**
   - Click Save → verify success notification
   - Click Clear → verify confirmation dialog
   - Click Clear + Confirm → verify data cleared and form re-rendered
   - Click Generate → verify PDFs generated

5. **Portrait Clicks**
   - Click portrait → verify character sheet opens
   - Verify correct character sheet opens for each portrait

6. **Reputation Fields**
   - Change reputation values → verify auto-save
   - Verify validation updates

### Property-Based Testing

Existing property-based tests in `PartyChronicleApp.test.ts` should continue to pass:
- Context preparation tests
- Party member extraction tests
- Data structure validation tests

### Regression Testing

After changes, verify:
- All event handlers still fire correctly
- Form data saves and loads correctly
- Validation displays correctly
- PDF generation works correctly
- No console errors appear

## Migration Risks and Mitigation

### Risk 1: Event Handler Binding

**Risk**: Event handlers may lose proper `this` binding when converted from jQuery

**Mitigation**: 
- Use arrow functions for event handlers
- Explicitly pass required context as parameters
- Test all event handlers thoroughly

### Risk 2: jQuery-Specific Behavior

**Risk**: jQuery has subtle behavior differences from native DOM (e.g., `.val()` vs `.value`)

**Mitigation**:
- Review jQuery documentation for each method being replaced
- Test edge cases (empty values, null values, undefined)
- Use optional chaining for null safety

### Risk 3: Selector Differences

**Risk**: jQuery selectors may behave differently than `querySelector`

**Mitigation**:
- Test all selectors after conversion
- Use browser dev tools to verify elements are found
- Add null checks for all queries

### Risk 4: Breaking Existing Functionality

**Risk**: Removing dead code from PartyChronicleApp may have unexpected dependencies

**Mitigation**:
- Search codebase for references to removed methods
- Run all tests after removal
- Test the application thoroughly

## Performance Considerations

### Expected Improvements

1. **Reduced Bundle Size**: Removing jQuery dependency reduces JavaScript payload
2. **Faster DOM Queries**: Native `querySelector` is generally faster than jQuery's Sizzle engine
3. **Less Memory Overhead**: No jQuery object wrapping reduces memory usage

### No Expected Degradation

- Event listener performance should be equivalent
- DOM manipulation performance should be equivalent or better

## Future Considerations

### ApplicationV2 Migration

When PFS system migrates to ApplicationV2:

1. **Recreate _onRender()** using native DOM APIs
2. **Move event listeners** from `main.ts` to `PartyChronicleApp._onRender()`
3. **Use `this.element`** instead of `container` parameter
4. **Reference this design** for native DOM patterns

### jQuery Removal

After this migration, remaining jQuery usage:
- `PFSChronicleGeneratorApp.ts` (single-character chronicles)
- Tab creation in `main.ts` (uses jQuery for DOM construction)

These can be addressed in future bugfixes if needed.

## Acceptance Criteria

1. ✅ All jQuery usage removed from `main.ts` event listener attachment
2. ✅ All jQuery usage removed from `layout-utils.ts`
3. ✅ Dead code removed from `PartyChronicleApp.ts`
4. ✅ All event handlers work correctly with native DOM
5. ✅ Form data saves and loads correctly
6. ✅ Validation displays correctly
7. ✅ PDF generation works correctly
8. ✅ No console errors or warnings
9. ✅ All existing tests pass
10. ✅ Manual testing checklist completed

## References

- [MDN: Document.querySelector()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)
- [MDN: Document.querySelectorAll()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll)
- [MDN: EventTarget.addEventListener()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [You Might Not Need jQuery](https://youmightnotneedjquery.com/)
- Architecture Guide: `pfs-chronicle-generator/.kiro/steering/architecture.md`
