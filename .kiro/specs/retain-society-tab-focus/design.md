# Retain Society Tab Focus Bugfix Design

## Overview

When the "Generate Chronicles" button is clicked in the Party Chronicle Filling interface, the system calls `partySheet.render(true)` to refresh the party sheet and update download buttons. However, this re-render resets the active tab to the first tab instead of preserving the Society tab focus. The fix will capture the active tab state before re-rendering and restore it afterward, ensuring users remain on the Society tab after chronicle generation.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `partySheet.render(true)` is called after chronicle generation while the Society tab is active
- **Property (P)**: The desired behavior - the Society tab should remain active and visible after re-rendering
- **Preservation**: Existing tab navigation behavior (manual tab switching, initial render default) that must remain unchanged by the fix
- **partySheet**: The Foundry VTT party sheet application instance that manages the party UI
- **render(true)**: A Foundry VTT method that forces a complete re-render of an application, which resets UI state including active tabs
- **Active Tab State**: The currently visible tab in the party sheet navigation, typically stored in the application's internal state or DOM

## Bug Details

### Fault Condition

The bug manifests when the "Generate Chronicles" button is clicked while the user is on the Society tab. The `renderPartyChronicleForm` function's button handler calls `partySheet.render(true)` to refresh the sheet, but this re-render loses the active tab state and defaults to the first tab in the navigation.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { buttonClick: Event, activeTab: string, renderCalled: boolean }
  OUTPUT: boolean
  
  RETURN input.buttonClick.target.id == 'generateChronicles'
         AND input.activeTab == 'pfs'
         AND input.renderCalled == true
END FUNCTION
```

### Examples

- User is on Society tab → clicks "Generate Chronicles" → sheet re-renders → user is now on first tab (Members/Overview)
- User is on Society tab → clicks "Generate Chronicles" → chronicles are generated successfully → user must manually click Society tab again to continue work
- User is on Society tab → generates chronicles for 5 characters → must click Society tab 5 times to return after each generation
- Edge case: User is on Inventory tab → clicks a button that triggers render → should stay on Inventory tab (not affected by this bug since they're not on Society tab)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Manual tab switching must continue to work exactly as before (clicking any tab activates it)
- Initial party sheet render must continue to display the default first tab
- Chronicle generation must continue to update download buttons on character sheets
- Form data save/clear operations must continue to function correctly

**Scope:**
All inputs that do NOT involve clicking "Generate Chronicles" while on the Society tab should be completely unaffected by this fix. This includes:
- Manual tab navigation clicks
- Initial sheet opening
- Other button clicks (Save, Clear)
- Tab switching from other tabs

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **No Tab State Capture**: The code calls `partySheet.render(true)` without first capturing which tab is currently active
   - The render method resets the application state
   - Foundry VTT's tab system defaults to the first tab when no active tab is specified

2. **Missing Tab Restoration Logic**: There is no mechanism to restore the active tab after re-rendering
   - The partySheet likely has a `_tabs` property or similar that tracks active tabs
   - This state needs to be explicitly set after render completes

3. **Render Force Flag**: The `render(true)` call with force=true may be too aggressive
   - This forces a complete re-render and state reset
   - A more targeted update might preserve tab state automatically

4. **Timing Issues**: The tab restoration might need to happen after the render completes
   - Foundry VTT's render is likely asynchronous
   - Tab activation might need to wait for the render promise to resolve

## Correctness Properties

Property 1: Fault Condition - Society Tab Retained After Chronicle Generation

_For any_ button click event where the "Generate Chronicles" button is clicked while the Society tab is active, the fixed code SHALL preserve the Society tab as the active tab after the party sheet re-renders, ensuring the user remains on the Society tab without manual navigation.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Manual Tab Navigation Unchanged

_For any_ tab navigation event that is NOT triggered by the "Generate Chronicles" button (manual tab clicks, initial render, other operations), the fixed code SHALL produce exactly the same tab behavior as the original code, preserving all existing tab navigation functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `scripts/main.ts`

**Function**: `renderPartyChronicleForm` (specifically the "Generate Chronicles" button handler)

**Specific Changes**:
1. **Capture Active Tab Before Render**: Before calling `partySheet.render(true)`, capture the current active tab state
   - Access `partySheet._tabs` or query the DOM for the active tab
   - Store the active tab identifier (likely 'pfs' for Society tab)

2. **Call Render Method**: Keep the existing `partySheet.render(true)` call to update download buttons

3. **Restore Active Tab After Render**: After the render completes, restore the active tab state
   - Wait for render to complete (it may return a promise)
   - Activate the previously captured tab using Foundry's tab API
   - This might involve calling a method like `partySheet.activateTab('pfs')` or setting `partySheet._tabs[0].activate('pfs')`

4. **Handle Edge Cases**: Ensure the fix works even if the tab system changes
   - Check if the captured tab still exists after render
   - Fall back to default behavior if tab restoration fails

5. **Add Defensive Checks**: Verify the partySheet has the necessary tab management properties
   - Check if `_tabs` exists before accessing it
   - Handle cases where the tab system might be undefined

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate clicking the "Generate Chronicles" button while on the Society tab, then check which tab is active after render. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Society Tab Focus Lost**: Click "Generate Chronicles" on Society tab → verify active tab is NOT 'pfs' (will fail on unfixed code)
2. **First Tab Becomes Active**: Click "Generate Chronicles" on Society tab → verify active tab defaults to first tab (will fail on unfixed code)
3. **Multiple Generations**: Generate chronicles 3 times in a row → verify user must manually return to Society tab each time (will fail on unfixed code)
4. **Other Tabs Unaffected**: Click a button on Inventory tab that doesn't trigger render → verify tab stays on Inventory (may pass on unfixed code)

**Expected Counterexamples**:
- Active tab changes from 'pfs' to the first tab (likely 'members' or 'overview') after render
- Possible causes: no tab state capture, no restoration logic, render resets state to default

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleGenerateChroniclesClick_fixed(input)
  ASSERT activeTab(result) == 'pfs'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleTabInteraction_original(input) = handleTabInteraction_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for manual tab switching and initial render, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Manual Tab Switching Preservation**: Observe that clicking tabs manually works correctly on unfixed code, then write test to verify this continues after fix
2. **Initial Render Preservation**: Observe that opening party sheet shows first tab on unfixed code, then write test to verify this continues after fix
3. **Other Button Preservation**: Observe that Save/Clear buttons work correctly on unfixed code, then write test to verify this continues after fix
4. **Non-Society Tab Preservation**: Observe that working on other tabs (Inventory, Members) works correctly on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that clicking "Generate Chronicles" on Society tab preserves Society tab focus
- Test that manual tab switching continues to work correctly
- Test that initial party sheet render shows the default first tab
- Test edge cases (tab doesn't exist after render, _tabs property missing)

### Property-Based Tests

- Generate random sequences of tab interactions and verify preservation of manual navigation behavior
- Generate random button click scenarios and verify only "Generate Chronicles" on Society tab triggers tab restoration
- Test across many party configurations (different numbers of members, different tab orders)

### Integration Tests

- Test full workflow: open party sheet → navigate to Society tab → fill form → generate chronicles → verify still on Society tab
- Test multiple chronicle generations in sequence without losing tab focus
- Test that download buttons update correctly while maintaining tab focus
- Test switching between tabs and generating chronicles from different tabs
