# Bugfix Requirements Document

## Introduction

After the code-standards-refactoring work, the codebase has been reorganized with event handlers extracted to separate modules. However, jQuery usage remains in two key areas:

1. **`scripts/main.ts`** - The `renderPartyChronicleForm()` function uses jQuery for DOM queries and event listener attachment
2. **`scripts/utils/layout-utils.ts`** - The `updateLayoutSpecificFields()` function has a dual implementation supporting both jQuery and native DOM

Additionally, `PartyChronicleApp` contains dead code that should be removed:
- `_onRender()` method and its associated handler methods are never called in the current hybrid architecture
- These methods duplicate functionality that exists in `main.ts` and `handlers/party-chronicle-handlers.ts`
- They should be deleted now and recreated later when PFS system migrates to ApplicationV2

Modern Foundry VTT development (v10+) has moved away from jQuery in favor of native DOM APIs. The portrait click listener and reputation field handlers have already been modernized using `querySelector()` and `addEventListener()`, demonstrating the preferred pattern.

## Bug Analysis

### Current Behavior (Defect)

**In `scripts/main.ts` - `renderPartyChronicleForm()` function:**

1.1 WHEN attaching event listeners THEN the system wraps `container` with jQuery using `$(container)` and stores it as `$container`

1.2 WHEN querying for the season dropdown THEN the system uses `$container.find('#season').on('change', ...)` with jQuery

1.3 WHEN querying for the layout dropdown THEN the system uses `$container.find('#layout').on('change', ...)` with jQuery

1.4 WHEN querying for all form inputs THEN the system uses `$container.find('input, select, textarea').on('change', ...)` with jQuery

1.5 WHEN querying for action buttons THEN the system uses `$container.find('#saveData').on('click', ...)`, `$container.find('#clearData').on('click', ...)`, and `$container.find('#generateChronicles').on('click', ...)` with jQuery

1.6 WHEN extracting form data THEN the system passes `$container` (jQuery object) to `extractFormData()` and handler functions

1.7 WHEN getting the layout ID THEN the system uses `$container.find('#layout').val()` with jQuery

**In `scripts/utils/layout-utils.ts` - `updateLayoutSpecificFields()` function:**

1.8 WHEN the container is a jQuery object THEN the system uses jQuery methods (`.find()`, `.empty()`, `.append()`, `$()` for element creation, `.on()` for event listeners)

1.9 WHEN creating checkbox elements THEN the system uses `$('<div class="checkbox-choice"></div>')` and similar jQuery constructors

**In `scripts/PartyChronicleApp.ts` - Dead code:**

1.10 WHEN the file is loaded THEN the system contains an unused `_onRender()` method with jQuery-based event listener attachment

1.11 WHEN the file is loaded THEN the system contains unused handler methods (`_onSeasonChanged`, `_onLayoutChanged`, `_onSharedFieldChanged`, `_onUniqueFieldChanged`, `_onSaveData`, `_onClearData`, `_onPortraitClick`) that duplicate functionality in `handlers/party-chronicle-handlers.ts`

1.12 WHEN the file is loaded THEN the system contains unused helper methods (`_updateLayoutSpecificFields`, `_updateButtonStates`) that duplicate functionality in other modules

### Expected Behavior (Correct)

**In `scripts/main.ts` - `renderPartyChronicleForm()` function:**

2.1 WHEN attaching event listeners THEN the system SHALL use `container` directly as an HTMLElement without jQuery wrapping

2.2 WHEN querying for the season dropdown THEN the system SHALL use `container.querySelector('#season')?.addEventListener('change', ...)`

2.3 WHEN querying for the layout dropdown THEN the system SHALL use `container.querySelector('#layout')?.addEventListener('change', ...)`

2.4 WHEN querying for all form inputs THEN the system SHALL use `container.querySelectorAll('input, select, textarea')` with `forEach` and `addEventListener('change', ...)`

2.5 WHEN querying for action buttons THEN the system SHALL use `container.querySelector('#saveData')?.addEventListener('click', ...)`, `container.querySelector('#clearData')?.addEventListener('click', ...)`, and `container.querySelector('#generateChronicles')?.addEventListener('click', ...)` with native DOM APIs

2.6 WHEN extracting form data THEN the system SHALL pass `container` (HTMLElement) to `extractFormData()` and handler functions

2.7 WHEN getting the layout ID THEN the system SHALL use `(container.querySelector('#layout') as HTMLSelectElement)?.value`

**In `scripts/utils/layout-utils.ts` - `updateLayoutSpecificFields()` function:**

2.8 WHEN the container is an HTMLElement THEN the system SHALL use only native DOM methods (`.querySelector()`, `.querySelectorAll()`, `.innerHTML = ''`, `.appendChild()`, `document.createElement()`, `.addEventListener()`)

2.9 WHEN creating checkbox elements THEN the system SHALL use `document.createElement('div')` and similar native DOM constructors

2.10 WHEN the function is called THEN the system SHALL remove the jQuery/native DOM detection logic and use only native DOM APIs

**In `scripts/PartyChronicleApp.ts` - Dead code removal:**

2.11 WHEN the file is loaded THEN the system SHALL NOT contain the unused `_onRender()` method

2.12 WHEN the file is loaded THEN the system SHALL NOT contain the unused handler methods (`_onSeasonChanged`, `_onLayoutChanged`, `_onSharedFieldChanged`, `_onUniqueFieldChanged`, `_onSaveData`, `_onClearData`, `_onPortraitClick`)

2.13 WHEN the file is loaded THEN the system SHALL NOT contain the unused helper methods (`_updateLayoutSpecificFields`, `_updateButtonStates`)

2.14 WHEN the file is loaded THEN the system SHALL retain only `_prepareContext()` and its supporting methods, as this is the only functionality currently used

### Unchanged Behavior (Regression Prevention)

**Event Handler Functionality:**

3.1 WHEN the season dropdown changes THEN the system SHALL CONTINUE TO call `handleSeasonChange` with the correct parameters

3.2 WHEN the layout dropdown changes THEN the system SHALL CONTINUE TO call `handleLayoutChange` with the correct parameters

3.3 WHEN form fields change THEN the system SHALL CONTINUE TO call `handleFieldChange` with the correct parameters

3.4 WHEN the save button is clicked THEN the system SHALL CONTINUE TO call `saveFormData` with the correct parameters

3.5 WHEN the clear button is clicked THEN the system SHALL CONTINUE TO show confirmation dialog and call `clearPartyChronicleData` if confirmed

3.6 WHEN the generate button is clicked THEN the system SHALL CONTINUE TO call `generateChroniclesFromPartyData` with the correct parameters

3.7 WHEN portrait images are clicked THEN the system SHALL CONTINUE TO call `handlePortraitClick` (already using native DOM APIs)

3.8 WHEN reputation inputs change THEN the system SHALL CONTINUE TO call `handleFieldChange` (already using native DOM APIs)

**Layout-Specific Fields:**

3.9 WHEN `updateLayoutSpecificFields()` is called THEN the system SHALL CONTINUE TO populate checkbox choices and strikeout choices correctly

3.10 WHEN checkboxes are created THEN the system SHALL CONTINUE TO restore saved selections from storage

3.11 WHEN new checkboxes are created THEN the system SHALL CONTINUE TO attach change listeners via the `onChangeCallback` parameter

**Validation and UI Updates:**

3.12 WHEN `updateValidationDisplay()` is called THEN the system SHALL CONTINUE TO update validation errors and button states correctly

3.13 WHEN the layout ID is retrieved THEN the system SHALL CONTINUE TO get the correct value from the layout dropdown

**Context Preparation:**

3.14 WHEN `PartyChronicleApp._prepareContext()` is called THEN the system SHALL CONTINUE TO prepare context data correctly for template rendering

3.15 WHEN `PartyChronicleApp` is instantiated THEN the system SHALL CONTINUE TO work correctly with only the `_prepareContext()` method
