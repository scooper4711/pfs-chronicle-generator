# Party Chronicle Form Bugs - Bugfix Design

## Overview

This bugfix addresses four related bugs in the party chronicle form that were introduced during recent feature implementations. The bugs affect:

1. Clear button incorrectly resetting scenario selection to the first scenario of the season
2. Chronicle path visibility not being updated after clearing the form
3. Strikeout items being extracted from the form but not passed to PDF generation
4. Downloaded PDF filename using an outdated module setting instead of the form's chronicle path

All bugs impact the user experience when managing party chronicles and generating PDFs. The fixes are targeted and minimal, focusing on preserving existing functionality while correcting the defects.

## Glossary

- **Bug_Condition (C)**: The conditions that trigger each of the four bugs
- **Property (P)**: The desired correct behavior for each bug scenario
- **Preservation**: Existing functionality that must remain unchanged by the fixes
- **Clear Button**: The button in the party chronicle form that clears character-specific data while preserving shared fields
- **Chronicle Path**: The file path to the blank chronicle PDF template, stored in `shared.blankChroniclePath`
- **Strikeout Items**: Checkbox selections for items that should be struck out on the chronicle PDF
- **Season/Layout Selection**: The dropdown selections that determine which chronicle template to use
- **updateChroniclePathVisibility**: Function in `party-chronicle-handlers.ts` that shows/hides the chronicle path field based on file existence
- **extractFormData**: Function in `form-data-extraction.ts` that reads all form fields into a structured data object
- **generateChroniclesFromPartyData**: Function in `chronicle-generation.ts` that orchestrates PDF generation
- **extractCharacterChronicleData**: Function in `chronicle-generation.ts` that prepares data for a single character's PDF

## Bug Details

### Bug 1: Clear Button Resets Scenario Selection

#### Fault Condition

The bug manifests when a user clicks the Clear button and confirms the action. The Clear button handler in `main.ts` (lines 447-550) correctly extracts the `seasonId` and `layoutId` values before clearing, but the subsequent form re-render causes the layout dropdown to reset to the first layout of the selected season.

**Root Cause**: The `renderPartyChronicleForm` function calls `_prepareContext()` which calls `loadPartyLayoutData()`. This function determines the `effectiveLayoutId` by checking if the saved `layoutId` exists in the `layoutsInSeason` array. However, after clearing, the saved data contains the preserved `layoutId`, but the template rendering logic may not be correctly selecting this layout in the dropdown, causing it to default to the first layout.

**Formal Specification:**
```
FUNCTION isBugCondition_ClearResetScenario(input)
  INPUT: input of type { action: 'clear', confirmed: boolean, seasonId: string, layoutId: string }
  OUTPUT: boolean
  
  RETURN input.action == 'clear'
         AND input.confirmed == true
         AND input.layoutId != ''
         AND afterClear_selectedLayoutId != input.layoutId
END FUNCTION
```

#### Examples

- User selects Season 6, Scenario 6-03, clicks Clear and confirms → Form shows Season 6, Scenario 6-01 instead of 6-03
- User selects Season 5, Scenario 5-12, clicks Clear and confirms → Form shows Season 5, Scenario 5-01 instead of 5-12
- User selects Season 4, Scenario 4-05, clicks Clear and confirms → Form shows Season 4, Scenario 4-01 instead of 4-05

### Bug 2: Chronicle Path Visibility Not Updated After Clear

#### Fault Condition

The bug manifests when a user clicks the Clear button and confirms the action. The form is re-rendered, but the `updateChroniclePathVisibility` function is not called after the re-render. This means that if the selected scenario has a valid chronicle PDF file, the chronicle path input field remains visible instead of being hidden according to the conditional-chronicle-path-visibility requirements.

**Root Cause**: The Clear button handler in `main.ts` calls `renderPartyChronicleForm` to re-render the form, but does not call `updateChroniclePathVisibility` afterward. Other event handlers (season change, layout change, file picker) all call `updateChroniclePathVisibility` after updating the form, but the Clear button handler omits this step.

**Formal Specification:**
```
FUNCTION isBugCondition_VisibilityNotUpdated(input)
  INPUT: input of type { action: 'clear', confirmed: boolean, chroniclePathExists: boolean, layoutHasDefault: boolean }
  OUTPUT: boolean
  
  RETURN input.action == 'clear'
         AND input.confirmed == true
         AND input.chroniclePathExists == true
         AND input.layoutHasDefault == true
         AND chroniclePathFieldVisible == true
END FUNCTION
```

#### Examples

- User has Season 6, Scenario 6-03 selected with valid PDF file, clicks Clear → Chronicle path field remains visible instead of being hidden
- User has Season 5, Scenario 5-08 selected with valid PDF file, clicks Clear → Chronicle path field remains visible instead of being hidden

### Bug 3: Strikeout Items Not Passed to PDF Generation

#### Fault Condition

The bug manifests when a user selects strikeout items in the form and clicks Generate Chronicles. The `extractFormData` function correctly extracts the strikeout items from the form (line 48-51 in `form-data-extraction.ts`), but the `extractCharacterChronicleData` function in `chronicle-generation.ts` correctly includes them in the `SharedFields` structure (line 142-144). However, the strikeout items may not be reaching the PDF generation due to an issue in how the data is passed or mapped.

**Root Cause Analysis**: After examining the code more carefully, the strikeout items ARE being extracted and passed to `SharedFields`. The issue must be in the `mapToCharacterData` function or in how the PDF generator uses the data. The `mapToCharacterData` function should map `strikeoutItems` to `strikeout_item_lines` in the ChronicleData object, but this mapping may be missing or incorrect.

**Formal Specification:**
```
FUNCTION isBugCondition_StrikeoutNotPassed(input)
  INPUT: input of type { strikeoutItems: string[], pdfGenerated: boolean }
  OUTPUT: boolean
  
  RETURN input.strikeoutItems.length > 0
         AND input.pdfGenerated == true
         AND pdfContainsStrikeoutItems == false
END FUNCTION
```

#### Examples

- User selects "Item 1" and "Item 2" as strikeout items, generates PDF → PDF does not show strikeout items
- User selects "Potion of Healing" as strikeout item, generates PDF → PDF does not show the strikeout

### Bug 4: Downloaded PDF Filename Uses Outdated Module Setting

#### Fault Condition

The bug manifests when a user clicks the download button for a generated chronicle PDF from a character sheet. The download button handler in `main.ts` (lines 166-188) uses `game.settings.get('pfs-chronicle-generator', 'blankChroniclePath')` to get the chronicle path for filename generation, instead of using the chronicle path stored in the actor's flag data.

**Root Cause**: The download button is part of the legacy single-character chronicle feature (rendered in the character sheet's PFS tab), not the party chronicle form. However, when a chronicle is generated from the party form, it saves the chronicle data to the actor's flags, including the `blankChroniclePath` from the form. The download button should use this saved path instead of the module setting, which may be outdated or incorrect.

**Formal Specification:**
```
FUNCTION isBugCondition_WrongFilename(input)
  INPUT: input of type { action: 'download', actorHasChronicleData: boolean, formChroniclePath: string, settingChroniclePath: string }
  OUTPUT: boolean
  
  RETURN input.action == 'download'
         AND input.actorHasChronicleData == true
         AND input.formChroniclePath != input.settingChroniclePath
         AND filenameUsesPath == input.settingChroniclePath
END FUNCTION
```

#### Examples

- User generates chronicle from party form with Scenario 6-03, then downloads from character sheet → 


**Implementation**: The issue is likely in how the template renders the layout dropdown. The `_prepareContext` function correctly determines the `effectiveLayoutId`, but the template may not be using this value to set the `selected` attribute on the correct option. The fix should ensure that the template uses `selectedLayoutId` to mark the correct option as selected.

### Bug 2: Chronicle Path Visibility Updated After Clear

**Correct Behavior**: When the user clicks Clear and confirms, the form should call 
terData` function in `party-chronicle-mapper.ts`. This function should map `sharedFields.strikeoutItems` to `chronicleData.strikeout_item_lines`. If this mapping is missing, it needs to be added.

### Bug 4: Downloaded PDF Filename Uses Form Chronicle Path

**Correct Behavior**: When the user downloads a chronicle PDF from a character sheet, the filename should be generated using the chronicle path stored in the actor's flag data (from the party form), with a fallback to the module setting for backward compatibility.

**Implementation**: Modify the download button handler to first check if the actor has chronicle data in its flags, and if so, use the `blankChroniclePath` from that data. Only fall back to the module setting if the actor has no chronicle data (legacy single-character chronicles).

## Hypothesized Root Cause

Based on the bug descriptions and code analysis, the most likely root causes are:

### Bug 1: Clear Button Resets Scenario Selection

1. **Template Rendering Issue**: The Handlebars template (`party-chronicle-filling.hbs`) may not be correctly using the `selectedLayoutId` context variable to set the `selected` attribute on the layout dropdown options.

2. **Context Data Issue**: The `_prepareContext` function may be returning the correct `selectedLayoutId`, but the template may be using a different variable or logic to determine which option is selected.

### Bug 2: Chronicle Path Visibility Not Updated

1. **Missing Function Call**: The Clear button handler simply forgot to call `updateChroniclePathVisibility` after re-rendering the form, unlike other handlers that modify the form state.

### Bug 3: Strikeout Items Not Passed to PDF Generation

1. **Missing Mapping**: The `mapToCharacterData` function in `party-chronicle-mapper.ts` may not be mapping `sharedFields.strikeoutItems` to `chronicleData.strikeout_item_lines`.

2. **Incorrect Field Name**: The mapping may exist but use the wrong field name (e.g., `strikeoutItems` instead of `strikeout_item_lines`).

### Bug 4: Downloaded PDF Filename Uses Outdated Module Setting

1. **Legacy Code Path**: The download button handler was written for the legacy single-character chronicle feature and has not been updated to use the actor's flag data when available.

2. **Missing Fallback Logic**: The handler needs to check if the actor has chronicle data in its flags and use that data's `blankChroniclePath` instead of the module setting.

## Correctness Properties

Property 1: Fault Condition - Clear Button Preserves Scenario Selection

_For any_ user action where the Clear button is clicked and confirmed, the fixed code SHALL preserve the selected season and layout values, and the re-rendered form SHALL display the correct scenario in the layout dropdown.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Fault Condition - Chronicle Path Visibility Updated After Clear

_For any_ user action where the Clear button is clicked and confirmed, the fixed code SHALL call updateChroniclePathVisibility after re-rendering the form to check if the chronicle path field should be hidden based on file existence and layout configuration.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 3: Fault Condition - Strikeout Items Passed to PDF Generation

_For any_ form submission where strikeout items are selected, the fixed code SHALL extract the strikeout items from the form, pass them through the SharedFields structure, map them to the strikeout_item_lines field in ChronicleData, and render them on the generated PDF.

**Validates: Requirements 2.7, 2.8, 2.9, 2.10**

Property 4: Fault Condition - Downloaded PDF Filename Uses Form Chronicle Path

_For any_ download action where the actor has chronicle data in its flags, the fixed code SHALL use the blankChroniclePath from the actor's flag data to generate the filename, with a fallback to the module setting for backward compatibility when no flag data exists.

**Validates: Requirements 2.11, 2.12, 2.13**

Property 5: Preservation - Clear Button Functionality

_For any_ user action involving the Clear button, the fixed code SHALL produce the same behavior as the original code for all non-buggy scenarios, including canceling the confirmation dialog, clearing character-specific data, preserving GM/scenario/event fields, and setting smart defaults.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 6: Preservation - Chronicle Path Visibility

_For any_ user action that changes season, layout, or file selection, the fixed code SHALL produce the same behavior as the original code for updating chronicle path visibility.

**Validates: Requirements 3.5, 3.6**

Property 7: Preservation - PDF Generation

_For any_ PDF generation action, the fixed code SHALL produce the same behavior as the original code for all other form fields (character name, XP, gold, reputation, adventure summary checkboxes, etc.).

**Validates: Requirements 3.7, 3.8**

Property 8: Preservation - Filename Generation

_For any_ filename generation action, the fixed code SHALL produce the same behavior as the original code for legacy single-character chronicles and filename sanitization.

**Validates: Requirements 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the following changes are needed:

#### Bug 1: Clear Button Preserves Scenario Selection

**File**: `templates/party-chronicle-filling.hbs`

**Specific Changes**:
1. **Verify Layout Dropdown Rendering**: Check the layout dropdown rendering logic to ensure it uses `selectedLayoutId` to set the `selected` attribute on the correct option.
2. **Fix Selection Logic**: If the template is not using `selectedLayoutId`, update it to use this context variable to mark the correct option as selected.

**Example Fix**:
```handlebars
<select id="layout" name="shared.layoutId">
  {{#each layoutsInSeason}}
    <option value="{{this.id}}" {{#if (eq this.id ../selectedLayoutId)}}selected{{/if}}>
      {{this.name}}
    </option>
  {{/each}}
</select>
```

#### Bug 2: Chronicle Path Visibility Updated After Clear

**File**: `scripts/main.ts`

**Function**: Clear button handler (lines 447-550)

**Specific Changes**:
1. **Add Function Call**: After the `renderPartyChronicleForm` call, add a call to `updateChroniclePathVisibility(container)`.
2. **Import Function**: Ensure `updateChroniclePathVisibility` is imported from `handlers/party-chronicle-handlers.ts`.

**Example Fix**:
```typescript
// After line 548: await renderPartyChronicleForm(container, partyActors, partySheet);
await updateChroniclePathVisibility(container);
```

#### Bug 3: Strikeout Items Passed to PDF Generation

**File**: `scripts/model/party-chronicle-mapper.ts`

**Function**: `mapToCharacterData`

**Specific Changes**:
1. **Add Strikeout Mapping**: Ensure the function maps `sharedFields.strikeoutItems` to `chronicleData.strikeout_item_lines`.
2. **Verify Field Name**: Confirm the field name matches what the PDF generator expects (likely `strikeout_item_lines` based on the layout configuration).

**Example Fix**:
```typescript
// In mapToCharacterData function
strikeout_item_lines: sharedFields.strikeoutItems || [],
```

#### Bug 4: Downloaded PDF Filename Uses Form Chronicle Path

**File**: `scripts/main.ts`

**Function**: Download button handler (lines 166-188)

**Specific Changes**:
1. **Check Actor Flags**: Before using the module setting, check if the actor has chronicle data in its flags.
2. **Use Flag Data**: If flag data exists, use `chronicleData.blankChroniclePath` for filename generation.
3. **Fallback to Setting**: Only use the module setting if no flag data exists (backward compatibility).

**Example Fix**:
```typescript
// Replace line 183
const chronicleData = sheet.actor.getFlag('pfs-chronicle-generator', 'chronicleData') as any;
const blankChroniclePath = chronicleData?.blankChroniclePath 
  || game.settings.get('pfs-chronicle-generator', 'blankChroniclePath') as string;
const filename = generateChronicleFilename(sheet.actor.name, blankChroniclePath);
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fixes. Confirm or refute the root cause analysis for each bug.

**Test Plan**: Write tests that reproduce each bug scenario on the UNFIXED code to observe failures and understand the root causes.

#### Bug 1: Clear Button Resets Scenario Selection

**Test Cases**:
1. **Scenario Selection Preservation Test**: Select Season 6, Scenario 6-03, click Clear and confirm → Verify form shows 6-01 instead of 6-03 (will fail on unfixed code)
2. **Multiple Seasons Test**: Test with different seasons (4, 5, 6) and different scenarios → Verify all reset to first scenario (will fail on unfixed code)
3. **Chronicle Path Preservation Test**: Verify the chronicle path also resets to the first scenario's path (will fail on unfixed code)

**Expected Counterexamples**:
- Layout dropdown shows first scenario instead of selected scenario after clearing
- Chronicle path field shows first scenario's path instead of selected scenario's path
- Possible causes: template not using `selectedLayoutId`, context data not being passed correctly

#### Bug 2: Chronicle Path Visibility Not Updated

**Test Cases**:
1. **Visibility After Clear Test**: Select scenario with valid PDF file, click Clear and confirm → Verify chronicle path field remains visible (will fail on unfixed code)
2. **Multiple Scenarios Test**: Test with different scenarios that have valid PDF files → Verify field remains visible after clearing (will fail on unfixed code)

**Expected Counterexamples**:
- Chronicle path field remains visible after clearing when it should be hidden
- Possible cause: `updateChroniclePathVisibility` not being called after re-render

#### Bug 3: Strikeout Items Not Passed to PDF Generation

**Test Cases**:
1. **Strikeout Items in PDF Test**: Select strikeout items, generate PDF → Verify PDF does not show strikeout items (will fail on unfixed code)
2. **Multiple Strikeout Items Test**: Select multiple strikeout items, generate PDF → Verify none appear in PDF (will fail on unfixed code)
3. **Data Flow Test**: Add logging to verify strikeout items are extracted but not reaching PDF generator (diagnostic test)

**Expected Counterexamples**:
- Strikeout items are extracted from form but not rendered in PDF
- Possible causes: missing mapping in `mapToCharacterData`, incorrect field name

#### Bug 4: Downloaded PDF Filename Uses Outdated Module Setting

**Test Cases**:
1. **Filename Source Test**: Generate chronicle from party form with Scenario 6-03, download from character sheet → Verify filename uses wrong scenario (will fail on unfixed code)
2. **Module Setting Mismatch Test**: Set module setting to different scenario, generate from party form, download → Verify filename uses module setting instead of form data (will fail on unfixed code)

**Expected Counterexamples**:
- Downloaded PDF filename uses module setting instead of actor flag data
- Possible cause: download handler not checking actor flags

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed code produces the expected behavior.

#### Bug 1: Clear Button Preserves Scenario Selection

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_ClearResetScenario(input) DO
  result := clearButtonHandler_fixed(input)
  ASSERT result.selectedLayoutId == input.layoutId
  ASSERT result.displayedScenario == input.scenario
END FOR
```

#### Bug 2: Chronicle Path Visibility Updated After Clear

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_VisibilityNotUpdated(input) DO
  result := clearButtonHandler_fixed(input)
  ASSERT updateChroniclePathVisibility_called == true
  ASSERT chroniclePathFieldVisible == false
END FOR
```

#### Bug 3: Strikeout Items Passed to PDF Generation

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_StrikeoutNotPassed(input) DO
  result := generateChronicles_fixed(input)
  ASSERT result.pdfContainsStrikeoutItems == true
  ASSERT result.strikeoutItems == input.strikeoutItems
END FOR
```

#### Bug 4: Downloaded PDF Filename Uses Form Chronicle Path

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_WrongFilename(input) DO
  result := downloadHandler_fixed(input)
  ASSERT result.filenameUsesPath == input.formChroniclePath
  ASSERT result.filename.includes(input.formScenarioName)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT (isBugCondition_ClearResetScenario(input) 
                      OR isBugCondition_VisibilityNotUpdated(input)
                      OR isBugCondition_StrikeoutNotPassed(input)
                      OR isBugCondition_WrongFilename(input)) DO
  ASSERT originalCode(input) = fixedCode(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-buggy scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Clear Button Cancel Preservation**: Click Clear and cancel → Verify all data preserved (same as unfixed code)
2. **Clear Button Data Clearing Preservation**: Click Clear and confirm → Verify character-specific data cleared, shared fields preserved (same as unfixed code)
3. **Season/Layout Change Preservation**: Change season or layout → Verify visibility update works (same as unfixed code)
4. **PDF Generation Preservation**: Generate PDF without strikeout items → Verify all other fields rendered correctly (same as unfixed code)
5. **Legacy Download Preservation**: Download chronicle from legacy single-character feature → Verify uses module setting (same as unfixed code)

### Unit Tests

- Test Clear button handler with different season/layout combinations
- Test updateChroniclePathVisibility is called after clearing
- Test mapToCharacterData includes strikeout items in output
- Test download handler uses actor flag data when available
- Test download handler falls back to module setting when no flag data exists
- Test filename generation with different chronicle paths

### Property-Based Tests

- Generate random season/layout selections and verify Clear preserves them
- Generate random strikeout item selections and verify they appear in PDFs
- Generate random chronicle paths and verify download uses correct path
- Test that all non-buggy scenarios continue to work across many inputs

### Integration Tests

- Test full workflow: select scenario, fill form, clear, verify scenario preserved
- Test full workflow: select scenario, clear, verify visibility updated
- Test full workflow: select strikeout items, generate PDF, verify items in PDF
- Test full workflow: generate from party form, download from character sheet, verify filename correct
- Test that all four fixes work together without interfering with each other
