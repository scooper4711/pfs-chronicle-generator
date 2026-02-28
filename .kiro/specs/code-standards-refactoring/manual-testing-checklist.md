# Manual Testing Checklist - Code Standards Refactoring

## Overview

This document provides a comprehensive manual testing checklist for validating the code standards refactoring. The refactoring extracted code into multiple modules while preserving all existing functionality. This checklist ensures that all interactive features of the PFS Chronicle Generator continue to work correctly after the refactoring.

**Testing Environment**: Foundry VTT with PFS system installed

**Prerequisites**:
- Foundry VTT running with the PFS system
- PFS Chronicle Generator module installed and enabled
- At least one PFS party actor created with multiple characters
- Test chronicle layouts and blank chronicle PDFs available

## Testing Instructions

For each test case:
1. ✅ Mark the checkbox when the test passes
2. ❌ Note any failures with details
3. 🔄 Retest after fixes

## Test Suite

### 1. Form Rendering Tests

#### 1.1 Party Chronicle Form Renders in Society Tab
**Requirement**: 3.2, 4.1

**Steps**:
1. Open a PFS party actor sheet
2. Click on the "Society" tab
3. Verify the party chronicle form is visible

**Expected Result**:
- [ ] Party chronicle form renders correctly
- [ ] All form sections are visible (Season, Layout, Shared Fields, Character Fields)
- [ ] No console errors appear
- [ ] Form layout matches expected design

**Notes**: _____________________________________

---

#### 1.2 Form Displays All Expected Sections
**Requirement**: 3.2

**Steps**:
1. With party chronicle form open, verify all sections are present

**Expected Result**:
- [ ] Season dropdown is visible
- [ ] Layout dropdown is visible
- [ ] Shared fields section is visible
- [ ] Character portraits are displayed
- [ ] Character-specific fields are visible for each character
- [ ] Generate Chronicles button is visible
- [ ] Validation error area is present (may be empty)

**Notes**: _____________________________________

---

### 2. Season Dropdown Tests

#### 2.1 Season Dropdown Populates Correctly
**Requirement**: 3.2, 4.2

**Steps**:
1. Open party chronicle form
2. Click on the Season dropdown

**Expected Result**:
- [ ] Dropdown opens and displays available seasons
- [ ] Seasons are listed in expected order
- [ ] Default season is selected (if applicable)

**Notes**: _____________________________________

---

#### 2.2 Season Change Updates Layout Options
**Requirement**: 3.2, 4.2

**Steps**:
1. Open party chronicle form
2. Select a season from the dropdown
3. Observe the Layout dropdown

**Expected Result**:
- [ ] Layout dropdown updates to show layouts for selected season
- [ ] Only layouts compatible with selected season are shown
- [ ] Layout dropdown is enabled/disabled appropriately
- [ ] No console errors appear

**Notes**: _____________________________________

---

#### 2.3 Season Change Triggers Auto-Save
**Requirement**: 3.2, 4.2

**Steps**:
1. Open party chronicle form
2. Change the season selection
3. Close and reopen the party sheet
4. Navigate back to Society tab

**Expected Result**:
- [ ] Selected season is preserved after reopening
- [ ] Form st
 Layout Change Updates Form Fields
**Requirement**: 3.2, 4.2

**Steps**:
1. Open party chronicle form
2. Select a season and layout
3. Observe the form fields (shared and character-specific)
4. Change to a different layout
5. Observe how form fields change

**Expected Result**:
- [ ] Form fields update to match selected layout
- [ ] Layout-specific fields appear/disappear as expected
- [ ] Checkbox choices update correctly
- [ ] Strikeout items update correctly
- [ ] Field labels match layout configuration
- [ ] No console errors appear

**Notes**: _____________________________________

---

#### 3.3 Layout Change Triggers Auto-Save
**Requirement**: 3.2, 4.2

**Steps**:
1. Open party chronicle form
2. Select a layout
3. Close and reopen the party sheet
4. Navigate back to Society tab

**Expected Result**:
- [ ] Selected layout is preserved after reopening
- [ ] Form state is maintained
- [ ] No data loss occurs

**Notes**: _____________________________________

---

### 4. Shared Field Tests

#### 4.1 Shared Fields Display Correctly
**Requirement**: 3.2, 4.3

**Steps**:
1. Open party chronicle form
2. Verify shared fields section displays all expected fields

**Expected Result**:
- [ ] GM PFS Number field is visible
- [ ] Scenario Name field is visible
- [ ] Event Code field is visible
- [ ] Event Date field is visible
- [ ] XP Earned field is visible
- [ ] Treasure Bundles field is visible
- [ ] Other layout-specific shared fields are visible
- [ ] Field labels are correct

**Notes**: _____________________________________

---

#### 4.2 Shared Field Changes Trigger Auto-Save
**Requirement**: 3.2, 4.3

**Steps**:
1. Open party chronicle form
2. Enter or modify a shared field (e.g., GM PFS Number)
3. Wait a moment (auto-save delay)
4. Close and reopen the party sheet
5. Navigate back to Society tab

**Expected Result**:
- [ ] Shared field value is preserved after reopening
- [ ] All shared field changes are saved
- [ ] No data loss occurs
- [ ] No console errors appear

**Notes**: _____________________________________

---

#### 4.3 Shared Field Validation Works
**Requirement**: 3.7, 4.3

**Steps**:
1. Open party chronicle form
2. Leave required shared fields empty or enter invalid data
3. Observe validation error display

**Expected Result**:
- [ ] Validation errors appear for invalid/missing fields
- [ ] Error messages are clear and specific
- [ ] Errors are displayed in the validation area
- [ ] Errors update as fields are corrected

**Notes**: _____________________________________

---

### 5. Character-Specific Field Tests

#### 5.1 Character Fields Display for Each Character
**Requirement**: 3.2, 4.3

**Steps**:
1. Open party chronicle form for a party with multiple characters
2. Verify character-specific fields are displayed

**Expected Result**:
- [ ] Each character has their own field section
- [ ] Character portraits are displayed
- [ ] Character names are shown
- [ ] Character-specific fields are visible for each character
- [ ] Fields are properly organized by character

**Notes**: _____________________________________

---

#### 5.2 Unique Field Changes Trigger Auto-Save
**Requirement**: 3.2, 4.3

**Steps**:
1. Open party chronicle form
2. Enter or modify a character-specific field
3. Wait a moment (auto-save delay)
4. Close and reopen the party sheet
5. Navigate back to Society tab

**Expected Result**:
- [ ] Character field value is preserved after reopening
- [ ] All character field changes are saved
- [ ] Changes for different characters are saved independently
- [ ] No data loss occurs
- [ ] No console errors appear

**Notes**: _____________________________________

---

#### 5.3 Unique Field Validation Works
**Requirement**: 3.7, 4.3

**Steps**:
1. Open party chronicle form
2. Leave required character fields empty or enter invalid data
3. Observe validation error display

**Expected Result**:
- [ ] Validation errors appear for invalid/missing character fields
- [ ] Errors are associated with the correct character
- [ ] Error messages are clear and specific
- [ ] Errors are displayed in the validation area
- [ ] Errors update as fields are corrected

**Notes**: _____________________________________

---

### 6. Validation Display Tests

#### 6.1 Validation Errors Display Correctly
**Requirement**: 3.7, 4.3

**Steps**:
1. Open party chronicle form
2. Create validation errors (leave required fields empty, enter invalid data)
3. Observe the validation error display area

**Expected Result**:
- [ ] Validation errors are displayed in a dedicated area
- [ ] Shared field errors are grouped together
- [ ] Character-specific errors are grouped by character
- [ ] Error messages are clear and actionable
- [ ] Error styling is appropriate (color, icons, etc.)

**Notes**: _____________________________________

---

#### 6.2 Validation Errors Clear When Fixed
**Requirement**: 3.7, 4.3

**Steps**:
1. Open party chronicle form with validation errors
2. Correct the invalid fields
3. Observe the validation error display

**Expected Result**:
- [ ] Errors disappear as fields are corrected
- [ ] Validation display updates in real-time
- [ ] No stale errors remain after correction
- [ ] Validation area is hidden when no errors exist

**Notes**: _____________________________________

---

#### 6.3 Validation Prevents PDF Generation
**Requirement**: 3.7, 4.4

**Steps**:
1. Open party chronicle form with validation errors
2. Click the "Generate Chronicles" button

**Expected Result**:
- [ ] PDF generation is prevented
- [ ] User is notified of validation errors
- [ ] Error messages guide user to fix issues
- [ ] No PDFs are created with invalid data

**Notes**: _____________________________________

---

### 7. PDF Generation Tests

#### 7.1 Generate Chronicles Button is Visible
**Requirement**: 4.4

**Steps**:
1. Open party chronicle form
2. Locate the "Generate Chronicles" button

**Expected Result**:
- [ ] Button is visible and accessible
- [ ] Button styling is appropriate
- [ ] Button label is clear

**Notes**: _____________________________________

---

#### 7.2 Generate Chronicles Creates PDFs
**Requirement**: 4.4

**Steps**:
1. Open party chronicle form
2. Fill in all required fields with valid data
3. Click "Generate Chronicles" button
4. Wait for PDF generation to complete

**Expected Result**:
- [ ] PDF generation starts without errors
- [ ] Progress indicator appears (if applicable)
- [ ] PDFs are created for each character
- [ ] PDFs are saved to the expected location
- [ ] Success message is displayed
- [ ] No console errors appear

**Notes**: _____________________________________

---

#### 7.3 Generated PDFs Contain Correct Data
**Requirement**: 4.4

**Steps**:
1. Generate chronicles as in test 7.2
2. Open the generated PDF files
3. Verify the data in the PDFs

**Expected Result**:
- [ ] Shared field data appears correctly in all PDFs
- [ ] Character-specific data appears correctly in each character's PDF
- [ ] Layout-specific fields are rendered correctly
- [ ] Checkbox choices are marked correctly
- [ ] Strikeout items are struck out correctly
- [ ] PDF formatting matches the blank chronicle template

**Notes**: _____________________________________

---

### 8. Portrait Click Tests

#### 8.1 Portrait Clicks Open Character Sheets
**Requirement**: 4.4

**Steps**:
1. Open party chronicle form
2. Click on a character portrait

**Expected Result**:
- [ ] Character sheet opens for the clicked character
- [ ] Correct character sheet is opened
- [ ] No console errors appear
- [ ] Portrait click is responsive (cursor changes, etc.)

**Notes**: _____________________________________

---

#### 8.2 Portrait Clicks Work for All Characters
**Requirement**: 4.4

**Steps**:
1. Open party chronicle form with multiple characters
2. Click on each character portrait in turn

**Expected Result**:
- [ ] Each portrait click opens the correct character sheet
- [ ] All portraits are clickable
- [ ] No portraits are unresponsive

**Notes**: _____________________________________

---

### 9. Event Listener Tests

#### 9.1 All Dropdowns Respond to Changes
**Requirement**: 4.4

**Steps**:
1. Open party chronicle form
2. Interact with season dropdown
3. Interact with layout dropdown
4. Observe responses

**Expected Result**:
- [ ] Season dropdown change triggers expected behavior
- [ ] Layout dropdown change triggers expected behavior
- [ ] Dropdowns are responsive and not laggy
- [ ] No console errors appear

**Notes**: _____________________________________

---

#### 9.2 All Input Fields Respond to Changes
**Requirement**: 4.4

**Steps**:
1. Open party chronicle form
2. Type in various text input fields
3. Change numeric input fields
4. Interact with checkboxes (if present)
5. Observe responses

**Expected Result**:
- [ ] Text inputs accept and display typed text
- [ ] Numeric inputs accept and validate numbers
- [ ] Checkboxes toggle correctly
- [ ] All inputs trigger auto-save
- [ ] No console errors appear

**Notes**: _____________________________________

---

#### 9.3 All Buttons Respond to Clicks
**Requirement**: 4.4

**Steps**:
1. Open party chronicle form
2. Click the "Generate Chronicles" button
3. Click any other buttons present in the form

**Expected Result**:
- [ ] All buttons respond to clicks
- [ ] Button actions execute correctly
- [ ] Buttons provide visual feedback (hover, active states)
- [ ] No console errors appear

**Notes**: _____________________________________

---

### 10. Edge Case Tests

#### 10.1 Form Works with Single Character Party
**Requirement**: 3.2, 4.3

**Steps**:
1. Create or open a party with only one character
2. Open party chronicle form
3. Test all functionality

**Expected Result**:
- [ ] Form renders correctly for single character
- [ ] All features work as expected
- [ ] PDF generation creates one PDF
- [ ] No errors occur

**Notes**: _____________________________________

---

#### 10.2 Form Works with Large Party
**Requirement**: 3.2, 4.3

**Steps**:
1. Create or open a party with many characters (6+)
2. Open party chronicle form
3. Test all functionality

**Expected Result**:
- [ ] Form renders correctly for all characters
- [ ] Form remains usable (not too crowded)
- [ ] All features work as expected
- [ ] PDF generation creates PDFs for all characters
- [ ] No performance issues occur

**Notes**: _____________________________________

---

#### 10.3 Form Handles Missing Blank Chronicle
**Requirement**: 3.7, 4.4

**Steps**:
1. Open party chronicle form
2. Select a layout with no blank chronicle PDF configured
3. Attempt to generate chronicles

**Expected Result**:
- [ ] Validation error appears for missing blank chronicle
- [ ] User is notified clearly
- [ ] PDF generation is prevented
- [ ] No crashes or console errors occur

**Notes**: _____________________________________

---

#### 10.4 Form Handles Rapid Input Changes
**Requirement**: 4.3

**Steps**:
1. Open party chronicle form
2. Rapidly change multiple fields in quick succession
3. Observe auto-save behavior

**Expected Result**:
- [ ] Auto-save handles rapid changes gracefully
- [ ] No data loss occurs
- [ ] No console errors appear
- [ ] Form remains responsive

**Notes**: _____________________________________

---

## Summary

### Test Results

- **Total Tests**: 34
- **Passed**: _____
- **Failed**: _____
- **Skipped**: _____

### Critical Issues Found

_List any critical issues that prevent core functionality:_

1. _____________________________________
2. _____________________________________
3. _____________________________________

### Non-Critical Issues Found

_List any minor issues or cosmetic problems:_

1. _____________________________________
2. _____________________________________
3. _____________________________________

### Overall Assessment

- [ ] All critical functionality works correctly
- [ ] Refactoring preserved all existing behavior
- [ ] No regressions detected
- [ ] Ready for production use

**Tester Name**: _____________________

**Date**: _____________________

**Foundry VTT Version**: _____________________

**PFS System Version**: _____________________

**Module Version**: _____________________

## Notes and Observations

_Additional notes, observations, or feedback:_

_____________________________________
_____________________________________
_____________________________________
_____________________________________
_____________________________________

