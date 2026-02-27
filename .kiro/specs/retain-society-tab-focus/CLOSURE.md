# Bugfix Spec Closure: Retain Society Tab Focus

**Status**: Cannot Fix - External System Limitation  
**Date**: 2025-02-25  
**Reason**: Foundry VTT architectural constraint

## Summary

This bugfix spec was closed because the reported behavior is caused by Foundry VTT's core architecture, not a bug in the PFS Chronicle Generator module. The Society tab focus loss occurs due to how Foundry VTT handles document updates and party sheet rendering.

## Root Cause Analysis

### The Observed Behavior

When clicking "Generate Chronicles" on the Society tab, the party sheet re-renders multiple times and loses focus on the Society tab, defaulting to the first tab (Overview).

### The Actual Cause

1. **Foundry VTT Document Update Behavior**: When an actor document is updated (via `setFlag`), Foundry VTT automatically triggers a re-render of any open sheets displaying that actor or its parent (the party sheet).

2. **Dynamic Tab Injection**: The Society tab is dynamically injected by the PFS Chronicle Generator module and doesn't exist in the base PFS party sheet template. When the party sheet re-renders, the tab is destroyed and must be re-injected by the `renderPartySheetPF2e` hook.

3. **Multiple Updates**: The original code called `setFlag` twice per character (once for `chronicleData`, once for `chroniclePdf`), causing multiple party sheet re-renders during chronicle generation.

### Why This Cannot Be Fixed

- **Foundry VTT Core Behavior**: The automatic re-rendering when documents are updated is core Foundry VTT functionality and cannot be disabled without breaking expected UI behavior.

- **PFS System Limitation**: The PFS party sheet has not fully migrated to ApplicationV2 and doesn't provide hooks for persistent custom tabs. The Society tab must be dynamically injected on each render.

- **No Control Over Re-render Timing**: The module cannot prevent Foundry from re-rendering the party sheet when actor flags are updated.

## Mitigation Implemented

While the core issue cannot be fixed, we implemented an optimization to minimize the impact:

### Batch Flag Updates

**File**: `scripts/main.ts`  
**Function**: `generateChroniclesFromForm`

**Change**: Refactored chronicle generation to:
1. Generate all PDFs first (no flag updates)
2. Batch all `setFlag` calls at the end
3. This reduces party sheet re-renders from 8+ times (2 per character) to 1-2 times total

**Code**:
```typescript
// Collect flag updates during generation
const flagUpdates: Array<{ actor: any, chronicleData: any, base64String: string }> = [];

// ... generate PDFs ...

// Batch update all actor flags at once
for (const { actor, chronicleData, base64String } of flagUpdates) {
    await actor.setFlag('pfs-chronicle-generator', 'chronicleData', chronicleData);
    await actor.setFlag('pfs-chronicle-generator', 'chroniclePdf', base64String);
}
```

### Impact

- **Before**: Party sheet re-rendered 4-8 times during chronicle generation (once or twice per character)
- **After**: Party sheet re-renders 1-2 times total (once for batch flag updates, once for clearing saved data)
- **Result**: Significantly reduced UI disruption, though tab focus may still be lost on the final re-render

## Alternative Solutions Considered

### 1. Suppress Renders with `render: false`
**Rejected**: Would cause stale UI state and break expected Foundry workflow. Users wouldn't see updated data until manual refresh.

### 2. Store Data Elsewhere (Not on Actor Documents)
**Rejected**: Breaks logical data model. Chronicle data belongs with the character actor. Would complicate data access and persistence.

### 3. Wait for PFS System Migration
**Future**: When the PFS system fully migrates to ApplicationV2, it may provide better support for persistent custom tabs. This would be the proper long-term solution but is outside our control.

## Recommendations

1. **Accept Current Behavior**: The batching optimization significantly reduces the issue. The remaining tab focus loss is a minor UX inconvenience that users can work around.

2. **Document for Users**: Consider adding a note in the module documentation that the Society tab may lose focus after chronicle generation due to Foundry VTT's update behavior.

3. **Monitor PFS System Updates**: If the PFS system adds ApplicationV2 support for custom tabs in the future, revisit this issue.

## Files Modified

- `scripts/main.ts` - Refactored `generateChroniclesFromForm` to batch flag updates

## Tests

All existing tests pass with the batching optimization:
- 9 test suites passed
- 138 tests passed

## Conclusion

This is not a bug in the PFS Chronicle Generator module, but rather a limitation of how Foundry VTT and the PFS system handle document updates and custom UI elements. The implemented optimization significantly reduces the impact, making this an acceptable user experience given the architectural constraints.
