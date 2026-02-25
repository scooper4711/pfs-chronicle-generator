# Bugfix Requirements Document

## Introduction

The `PartyChronicleApp._onRender` method currently uses deprecated jQuery patterns (`$(this.element)`, `html.find()`, `.on()`) for DOM manipulation and event handling. Modern Foundry VTT development (v10+) has moved away from jQuery in favor of native DOM APIs. This creates technical debt and inconsistency with modern Foundry development practices, as evidenced by the portrait click listener which has already been modernized using `querySelector()` and `addEventListener()`.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `_onRender` method executes THEN the system wraps `this.element` with jQuery using `$(this.element)`

1.2 WHEN querying for DOM elements THEN the system uses jQuery's `html.find()` method instead of native DOM query methods

1.3 WHEN attaching event listeners THEN the system uses jQuery's `.on()` method instead of native `addEventListener()`

1.4 WHEN selecting the season dropdown THEN the system uses `html.find('#season').on('change', ...)` with jQuery

1.5 WHEN selecting the layout dropdown THEN the system uses `html.find('#layout').on('change', ...)` with jQuery

1.6 WHEN selecting shared field inputs THEN the system uses `html.find('input[name^="shared."], select[name^="shared."], textarea[name^="shared."]').on('change', ...)` with jQuery

1.7 WHEN selecting unique field inputs THEN the system uses `html.find('input[name^="characters."], select[name^="characters."], textarea[name^="characters."]').on('change', ...)` with jQuery

1.8 WHEN selecting action buttons THEN the system uses `html.find('#saveData').on('click', ...)` and `html.find('#clearData').on('click', ...)` with jQuery

### Expected Behavior (Correct)

2.1 WHEN the `_onRender` method executes THEN the system SHALL use `this.element` directly without jQuery wrapping

2.2 WHEN querying for DOM elements THEN the system SHALL use native `querySelector()` or `querySelectorAll()` methods

2.3 WHEN attaching event listeners THEN the system SHALL use native `addEventListener()` method

2.4 WHEN selecting the season dropdown THEN the system SHALL use `this.element.querySelector('#season')?.addEventListener('change', ...)`

2.5 WHEN selecting the layout dropdown THEN the system SHALL use `this.element.querySelector('#layout')?.addEventListener('change', ...)`

2.6 WHEN selecting shared field inputs THEN the system SHALL use `this.element.querySelectorAll('input[name^="shared."], select[name^="shared."], textarea[name^="shared."]')` with `forEach` and `addEventListener('change', ...)`

2.7 WHEN selecting unique field inputs THEN the system SHALL use `this.element.querySelectorAll('input[name^="characters."], select[name^="characters."], textarea[name^="characters."]')` with `forEach` and `addEventListener('change', ...)`

2.8 WHEN selecting action buttons THEN the system SHALL use `this.element.querySelector('#saveData')?.addEventListener('click', ...)` and `this.element.querySelector('#clearData')?.addEventListener('click', ...)`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the season dropdown changes THEN the system SHALL CONTINUE TO call `_onSeasonChanged` with the correct binding

3.2 WHEN the layout dropdown changes THEN the system SHALL CONTINUE TO call `_onLayoutChanged` with the correct binding

3.3 WHEN shared field inputs change THEN the system SHALL CONTINUE TO call `_onSharedFieldChanged` with the correct binding

3.4 WHEN unique field inputs change THEN the system SHALL CONTINUE TO call `_onUniqueFieldChanged` with the correct binding

3.5 WHEN the save button is clicked THEN the system SHALL CONTINUE TO call `_onSaveData` with the correct binding

3.6 WHEN the clear button is clicked THEN the system SHALL CONTINUE TO call `_onClearData` with the correct binding

3.7 WHEN portrait images are clicked THEN the system SHALL CONTINUE TO use the existing modern DOM API implementation with `querySelectorAll()` and `addEventListener()`

3.8 WHEN `_updateLayoutSpecificFields()` is called THEN the system SHALL CONTINUE TO execute after event listeners are attached

3.9 WHEN `_updateButtonStates()` is called THEN the system SHALL CONTINUE TO execute after layout fields are updated
