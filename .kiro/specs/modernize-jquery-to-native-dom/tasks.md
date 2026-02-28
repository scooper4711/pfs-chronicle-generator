# Implementation Tasks: Modernize jQuery to Native DOM

## Overview

This task list outlines the step-by-step implementation for migrating jQuery-based DOM manipulation to native DOM APIs. The work is organized into three main areas: removing dead code, modernizing layout-utils.ts, and modernizing main.ts.

## Task Organization

Tasks are ordered to minimize breaking changes and allow for incremental testing:
1. Remove dead code first (safest, no functional impact)
2. Modernize layout-utils.ts (isolated utility function)
3. Modernize main.ts and handlers (most complex, requires careful testing)

---

## Phase 1: Dead Code Removal

### Task 1: Remove Dead Code from PartyChronicleApp.ts

- [x] 1.1 Search codebase for references to methods being removed
  - Search for `_onRender` references
  - Search for `_onSeasonChanged` references
  - Search for `_onLayoutChanged` references
  - Search for `_onSharedFieldChanged` references
  - Search for `_onUniqueFieldChanged` references
  - Search for `_onSaveData` references
  - Search for `_onClearData` references
  - Search for `_onPortraitClick` references
  - Search for `_updateLayoutSpecificFields` references
  - Search for `_updateButtonStates` references
  - _Validates: Requirements 2.11, 2.12, 2.13_

- [x] 1.2 Remove unused methods from PartyChronicleApp.ts
  - Remove `_onRender()` method
  - Remove `_onSeasonChanged()` method
  - Remove `_onLayoutChanged()` method
  - Remove `_onSharedFieldChanged()` method
  - Remove `_onUniqueFieldChanged()` method
  - Remove `_onSaveData()` method
  - Remove `_onClearData()` method
  - Remove `_onPortraitClick()` method
  - Remove `_updateLayoutSpecificFields()` method
  - Remove `_updateButtonStates()` method
  - _Validates: Requirements 2.11, 2.12, 2.13_

- [x] 1.3 Verify PartyChronicleApp.ts compiles without errors
  - Run TypeScript compiler
  - Fix any compilation errors
  - _Validates: Requirements 2.14_

- [x] 1.4 Run existing tests for PartyChronicleApp
  - Run `npm test PartyChronicleApp.test.ts`
  - Verify all tests pass
  - _Validates: Requirements 3.14, 3.15_

---

## Phase 2: Modernize Layout-Utils.ts

### Task 2: Update updateLayoutSpecificFields() Function Signature

- [x] 2.1 Update function signature to accept only HTMLElement
  - Change `container: HTMLElement | JQuery` to `container: HTMLElement`
  - Update JSDoc comments if present
  - _Validates: Requirement 2.10_

- [x] 2.2 Remove jQuery/native DOM detection logic
  - Remove `isJQuery` variable and conditional check
  - Remove entire jQuery code path (if block)
  - Keep only native DOM implementation (else block)
  - _Validates: Requirement 2.10_

### Task 3: Modernize Checkbox Creation in updateLayoutSpecificFields()

- [x] 3.1 Replace jQuery element creation with native DOM for adventure summary checkboxes
  - Replace `$('<div class="checkbox-choice"></div>')` with `document.createElement('div')`
  - Replace `$('<input type="checkbox" ...>')` with `document.createElement('input')` and property assignments
  - Replace `$('<label ...>')` with `document.createElement('label')` and property assignments
  - Replace `.append()` with `.appendChild()`
  - _Validates: Requirement 2.9_

- [x] 3.2 Replace jQuery element creation with native DOM for strikeout items
  - Replace `$('<div class="item-choice"></div>')` with `document.createElement('div')`
  - Replace `$('<input type="checkbox" ...>')` with `document.createElement('input')` and property assignments
  - Replace `$('<label ...>')` with `document.createElement('label')` and property assignments
  - Replace `.append()` with `.appendChild()`
  - _Validates: Requirement 2.9_

### Task 4: Modernize Container Operations in updateLayoutSpecificFields()

- [x] 4.1 Replace jQuery container queries with native DOM
  - Replace `$container.find('#adventureSummaryCheckboxes .checkbox-choices')` with `element.querySelector('#adventureSummaryCheckboxes .checkbox-choices')`
  - Replace `$container.find('#strikeoutItems .strikeout-choices')` with `element.querySelector('#strikeoutItems .strikeout-choices')`
  - _Validates: Requirement 2.8_

- [x] 4.2 Replace jQuery container clearing with native DOM
  - Replace `checkboxContainer.empty()` with `checkboxContainer.innerHTML = ''`
  - Replace `strikeoutContainer.empty()` with `strikeoutContainer.innerHTML = ''`
  - _Validates: Requirement 2.8_

- [x] 4.3 Replace jQuery event listener attachment with native DOM
  - Replace `$container.find(...).on('change', onChangeCallback)` with `querySelectorAll` + `forEach` + `addEventListener`
  - _Validates: Requirement 2.8_

### Task 5: Test Layout-Utils.ts Changes

- [x] 5.1 Verify layout-utils.ts compiles without errors
  - Run TypeScript compiler
  - Fix any compilation errors
  - _Validates: Requirement 2.10_

- [x] 5.2 Update all call sites to pass HTMLElement instead of jQuery object
  - Update calls in `main.ts`
  - Update calls in `handlers/party-chronicle-handlers.ts`
  - _Validates: Requirements 3.9, 3.10, 3.11_

- [x] 5.3 Manual test layout-specific fields
  - Change layout dropdown
  - Verify checkbox choices populate correctly
  - Verify strikeout choices populate correctly
  - Verify saved selections are restored
  - Verify change listeners fire correctly
  - _Validates: Requirements 3.9, 3.10, 3.11_

---

## Phase 3: Modernize Main.ts

### Task 6: Update Event Listener Attachments in renderPartyChronicleForm()

- [x] 6.1 Remove jQuery wrapper creation
  - Remove `const $container = $(container);` line
  - _Validates: Requirement 2.1_

- [x] 6.2 Modernize season dropdown event listener
  - Replace `$container.find('#season').on('change', ...)` with `container.querySelector('#season')?.addEventListener('change', ...)`
  - Update event parameter type from `any` to `Event`
  - Pass `container` instead of `$container` to handler
  - _Validates: Requirement 2.2_

- [x] 6.3 Modernize layout dropdown event listener
  - Replace `$container.find('#layout').on('change', ...)` with `container.querySelector('#layout')?.addEventListener('change', ...)`
  - Update event parameter type from `any` to `Event`
  - Pass `container` instead of `$container` to handler
  - _Validates: Requirement 2.3_

- [x] 6.4 Modernize form fields event listeners
  - Replace `$container.find('input, select, textarea').on('change', ...)` with `container.querySelectorAll('input, select, textarea')` + `forEach` + `addEventListener`
  - Update event parameter type from `any` to `Event`
  - Pass `container` instead of `$container` to handler
  - _Validates: Requirement 2.4_

- [x] 6.5 Modernize save button event listener
  - Replace `$container.find('#saveData').on('click', ...)` with `container.querySelector('#saveData')?.addEventListener('click', ...)`
  - Update event parameter type from `any` to `Event`
  - Pass `container` instead of `$container` to handler
  - _Validates: Requirement 2.5_

- [x] 6.6 Modernize clear button event listener
  - Replace `$container.find('#clearData').on('click', ...)` with `container.querySelector('#clearData')?.addEventListener('click', ...)`
  - Update event parameter type from `any` to `Event`
  - Pass `container` instead of `$container` to handler
  - _Validates: Requirement 2.5_

- [x] 6.7 Modernize generate button event listener
  - Replace `$container.find('#generateChronicles').on('click', ...)` with `container.querySelector('#generateChronicles')?.addEventListener('click', ...)`
  - Update event parameter type from `any` to `Event`
  - Pass `container` instead of `$container` to handler
  - _Validates: Requirement 2.5_

### Task 7: Update Value Extraction in renderPartyChronicleForm()

- [x] 7.1 Modernize layout ID extraction
  - Replace `$container.find('#layout').val()` with `(container.querySelector('#layout') as HTMLSelectElement)?.value`
  - Add null coalescing operator for default value
  - _Validates: Requirement 2.7_

- [x] 7.2 Update extractFormData calls
  - Pass `container` instead of `$container` to all `extractFormData()` calls
  - _Validates: Requirement 2.6_

- [x] 7.3 Update handler function calls
  - Pass `container` instead of `$container` to all handler functions
  - _Validates: Requirement 2.6_

### Task 8: Verify Main.ts Compilation

- [x] 8.1 Verify main.ts compiles without errors
  - Run TypeScript compiler
  - Fix any compilation errors
  - _Validates: Requirements 2.1-2.7_

---

## Phase 4: Modernize Handler Functions

### Task 9: Update Handler Function Signatures

- [x] 9.1 Update handleSeasonChange signature
  - Change `$container: JQuery` to `container: HTMLElement`
  - Change `event: any` to `event: Event`
  - _Validates: Requirement 2.6_

- [x] 9.2 Update handleLayoutChange signature
  - Change `$container: JQuery` to `container: HTMLElement`
  - Change `event: any` to `event: Event`
  - _Validates: Requirement 2.6_

- [x] 9.3 Update handleFieldChange signature
  - Change `$container: JQuery` to `container: HTMLElement`
  - Change `event: any` to `event: Event`
  - _Validates: Requirement 2.6_

### Task 10: Update Handler Function Implementations

- [x] 10.1 Modernize jQuery usage in handleSeasonChange
  - Replace `$container.find()` with `container.querySelector()` or `container.querySelectorAll()`
  - Replace `.val()` with `.value` property access
  - Add proper type assertions for DOM elements
  - _Validates: Requirements 3.1_

- [x] 10.2 Modernize jQuery usage in handleLayoutChange
  - Replace `$container.find()` with `container.querySelector()` or `container.querySelectorAll()`
  - Replace `.val()` with `.value` property access
  - Add proper type assertions for DOM elements
  - _Validates: Requirements 3.2_

- [x] 10.3 Modernize jQuery usage in handleFieldChange
  - Replace `$container.find()` with `container.querySelector()` or `container.querySelectorAll()`
  - Replace `.val()` with `.value` property access
  - Add proper type assertions for DOM elements
  - _Validates: Requirements 3.3_

### Task 11: Update extractFormData Function

- [x] 11.1 Update extractFormData signature
  - Change `$container: JQuery` to `container: HTMLElement`
  - _Validates: Requirement 2.6_

- [x] 11.2 Modernize jQuery usage in extractFormData
  - Replace `$container.find()` with `container.querySelector()` or `container.querySelectorAll()`
  - Replace `.val()` with `.value` property access
  - Replace `.map().get()` with native array methods (Array.from + map)
  - Add proper type assertions for DOM elements
  - _Validates: Requirements 3.4, 3.5, 3.6, 3.13_

- [x] 11.3 Verify extractFormData compiles without errors
  - Run TypeScript compiler
  - Fix any compilation errors
  - _Validates: Requirement 2.6_

---

## Phase 5: Testing and Validation

### Task 12: Run Automated Tests

- [x] 12.1 Run all TypeScript compilation
  - Run `npm run build` or equivalent
  - Fix any compilation errors
  - _Validates: All requirements_

- [x] 12.2 Run all unit tests
  - Run `npm test`
  - Fix any failing tests
  - _Validates: Requirements 3.14, 3.15_

- [x] 12.3 Run property-based tests
  - Verify PartyChronicleApp.test.ts passes
  - Verify context preparation tests pass
  - _Validates: Requirements 3.14, 3.15_

### Task 13: Manual Testing - Season and Layout

- [x] 13.1 Test season dropdown
  - Open party chronicle form
  - Change season dropdown
  - Verify layout options update correctly
  - Verify saved data persists
  - _Validates: Requirements 3.1, 3.13_

- [x] 13.2 Test layout dropdown
  - Change layout dropdown
  - Verify form fields update correctly
  - Verify checkbox choices populate correctly
  - Verify strikeout choices populate correctly
  - Verify saved data persists
  - _Validates: Requirements 3.2, 3.9, 3.10, 3.13_

### Task 14: Manual Testing - Form Fields

- [x] 14.1 Test shared field changes
  - Change shared fields (GM PFS Number, Scenario Name, etc.)
  - Verify auto-save triggers
  - Verify validation updates in real-time
  - Verify saved data persists
  - _Validates: Requirements 3.3, 3.12_

- [x] 14.2 Test character-specific field changes
  - Change character-specific fields (Income Earned, Gold Earned, etc.)
  - Verify auto-save triggers
  - Verify validation updates in real-time
  - Verify saved data persists
  - _Validates: Requirements 3.3, 3.12_

- [x] 14.3 Test reputation field changes
  - Change reputation values
  - Verify auto-save triggers
  - Verify validation updates
  - _Validates: Requirements 3.8, 3.12_

### Task 15: Manual Testing - Action Buttons

- [x] 15.1 Test save button
  - Click Save button
  - Verify success notification appears
  - Verify data is saved correctly
  - _Validates: Requirements 3.4_

- [x] 15.2 Test clear button
  - Click Clear button
  - Verify confirmation dialog appears
  - Click Cancel → verify no changes
  - Click Clear again → Click Confirm → verify data cleared
  - Verify form re-renders correctly
  - _Validates: Requirements 3.5_

- [x] 15.3 Test generate button
  - Fill out form with valid data
  - Click Generate Chronicles button
  - Verify PDFs are generated correctly
  - Verify no console errors
  - _Validates: Requirements 3.6_

### Task 16: Manual Testing - Portrait Clicks

- [x] 16.1 Test portrait clicks
  - Click on each party member portrait
  - Verify correct character sheet opens
  - Verify character sheet focuses if already open
  - _Validates: Requirements 3.7_

### Task 17: Manual Testing - Checkbox Interactions

- [x] 17.1 Test adventure summary checkboxes
  - Change layout to one with checkboxes
  - Check/uncheck adventure summary checkboxes
  - Verify auto-save triggers
  - Verify selections persist after reload
  - _Validates: Requirements 3.9, 3.10, 3.11_

- [x] 17.2 Test strikeout item checkboxes
  - Change layout to one with strikeout items
  - Check/uncheck strikeout items
  - Verify auto-save triggers
  - Verify selections persist after reload
  - _Validates: Requirements 3.9, 3.10, 3.11_

### Task 18: Final Validation

- [x] 18.1 Check browser console for errors
  - Open browser dev tools
  - Perform all manual tests
  - Verify no console errors or warnings
  - _Validates: All requirements_

- [x] 18.2 Test in different browsers (if applicable)
  - Test in Chrome
  - Test in Firefox
  - Test in Safari (if on Mac)
  - _Validates: All requirements_

- [x] 18.3 Verify no jQuery references remain
  - Search codebase for `$(` in main.ts
  - Search codebase for `$(` in layout-utils.ts
  - Search codebase for `$(` in party-chronicle-handlers.ts
  - Verify only expected jQuery usage remains (tab creation, other files)
  - _Validates: Requirements 2.1-2.10_

---

## Notes

- **Task Dependencies**: Tasks should be completed in order within each phase, but phases can overlap if careful
- **Testing**: Test after each phase to catch issues early
- **Rollback**: If issues arise, each phase can be rolled back independently
- **Documentation**: Update architecture.md if any patterns change significantly
- **Performance**: Monitor for any performance regressions during testing

## Completion Checklist

- [ ] All tasks marked complete
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] No console errors or warnings
- [ ] Code compiles without errors
- [ ] No jQuery usage in main.ts event listeners
- [ ] No jQuery usage in layout-utils.ts
- [ ] Dead code removed from PartyChronicleApp.ts
- [ ] All handler functions use native DOM APIs
- [ ] extractFormData uses native DOM APIs
