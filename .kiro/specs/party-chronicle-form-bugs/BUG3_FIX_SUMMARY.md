# Bug #3 Fix Summary - Strikeout Items Not Being Struck Out

## Problem Identified

**Bug**: Strikeout items were not being struck out on generated PDF chronicles.

**Root Cause**: The PDF generator was incorrectly splitting choice values on commas, even when the choice values themselves contained commas.

## Technical Details

### The Issue

In `PdfGenerator.ts`, line 211, the code was:

```typescript
const choices = value?.includes('|||') ? value.split('|||') : (value?.split(',') || []);
```

This logic:
1. Checks if the value contains `|||` delimiter
2. If yes, splits on `|||`
3. If no, **splits on comma as fallback**

### Why This Failed

Strikeout item values contain commas in their text:
```
"boarding pike (item 1, 8 sp, Pathfinder Lost Omens Pathfinder Society Guide 81)"
```

When there's only ONE strikeout item selected:
1. Array `['boarding pike (item 1, 8 sp, ...)']` is joined with `|||` → `'boarding pike (item 1, 8 sp, ...)'`
2. String doesn't contain `|||` (single item, no delimiter added)
3. Code falls back to splitting on comma
4. Result: `['boarding pike (item 1', ' 8 sp', ' Pathfinder Lost Omens Pathfinder Society Guide 81)']`
5. None of these match the layout keys, so no content is found

### Debug Log Evidence

```
[PFS Chronicle] [STRIKEOUT DEBUG] PdfGenerator initialized with data: {
  data.strikeout_item_lines: ['boarding pike (item 1, 8 sp, Pathfinder Lost Omens Pathfinder Society Guide 81)']
}

[PFS Chronicle] [STRIKEOUT DEBUG] No content found for choice: boarding pike (item 1
[PFS Chronicle] [STRIKEOUT DEBUG] No content found for choice:  8 sp
[PFS Chronicle] [STRIKEOUT DEBUG] No content found for choice:  Pathfinder Lost Omens Pathfinder Society Guide 81)
```

The value was being split into 3 parts on commas, none of which matched the layout key.

## The Fix

Changed line 213 in `PdfGenerator.ts`:

```typescript
// OLD (WRONG):
const choices = value?.includes('|||') ? value.split('|||') : (value?.split(',') || []);

// NEW (CORRECT):
const choices = value?.includes('|||') ? value.split('|||') : (value ? [value] : []);
```

### Why This Works

Now when there's no `|||` delimiter:
1. Instead of splitting on comma, treat the entire value as a single choice
2. Wrap it in an array: `[value]`
3. This preserves the full text including commas
4. The full text matches the layout key exactly

### Multiple Items Still Work

When multiple items are selected:
1. Array `['item1', 'item2']` is joined with `|||` → `'item1|||item2'`
2. String contains `|||`
3. Code splits on `|||` → `['item1', 'item2']`
4. Each item is processed correctly

## Files Modified

1. **`scripts/PdfGenerator.ts`** (line 213):
   - Changed fallback from `value?.split(',')` to `value ? [value] : []`
   - Added comment explaining not to split on comma

## Testing

### Before Fix
- Strikeout items not struck out on PDF
- Debug logs showed values being split incorrectly on commas
- "No content found for choice" errors

### After Fix
- Strikeout items should be struck out correctly
- Debug logs should show full value being used as choice
- Content should be found and drawn

### Test Cases

1. **Single strikeout item with commas**:
   - Select: "boarding pike (item 1, 8 sp, Pathfinder Lost Omens Pathfinder Society Guide 81)"
   - Expected: Item is struck out on PDF

2. **Multiple strikeout items**:
   - Select: "boarding pike (...)" AND "everyneed pack, greater (...)"
   - Expected: Both items are struck out on PDF

3. **No strikeout items**:
   - Select: None
   - Expected: No strikeouts on PDF

## Related Issues

### Bug #2 (Fixed)
- Wrong selector used (`chroniclePath` instead of `blankChroniclePath`)
- Fixed by using constants in `dom-selectors.ts`

### Bug #3 (This Fix)
- Wrong split logic (splitting on comma instead of treating as single value)
- Fixed by changing fallback logic in `PdfGenerator.ts`

## Design Consideration

### Why Use `|||` Delimiter?

The `|||` delimiter is used because:
1. It's extremely unlikely to appear in actual choice values
2. Commas are common in choice values (as seen in strikeout items)
3. It's visually distinct and easy to search for in logs
4. It's already used consistently throughout the codebase

### Alternative Approaches Considered

1. **Use JSON array serialization**: Would work but harder to read in logs
2. **Use different delimiter per field**: Too complex, inconsistent
3. **Don't join arrays, pass as-is**: Would require changes to layout format
4. **Escape commas**: Complex and error-prone

The `|||` delimiter approach is simple, reliable, and already implemented.

## Lessons Learned

1. **Don't assume delimiters**: Just because a value doesn't contain the expected delimiter doesn't mean it should be split on a different delimiter
2. **Debug logging is invaluable**: The comprehensive debug logging added made it trivial to identify the exact issue
3. **Test with real data**: The bug only manifested with real strikeout item text that contained commas
4. **Comma is a terrible delimiter**: Never use comma as a delimiter for user-facing text

## Verification Steps

1. Build the module: `npm run build`
2. Load in Foundry VTT
3. Open party sheet Society tab
4. Select a layout with strikeout items (e.g., 5-03 Heidmarch Heist)
5. Check one or more strikeout items
6. Generate chronicles
7. Open generated PDF
8. Verify selected items are struck out

## Debug Logging

The debug logging added for this bug can remain in place as it's useful for:
- Troubleshooting future choice-related issues
- Understanding data flow through the system
- Verifying fixes work correctly

To filter debug logs in console: `[STRIKEOUT DEBUG]`

## Status

✅ **FIXED** - Bug #3 resolved by changing split logic in PdfGenerator.ts
