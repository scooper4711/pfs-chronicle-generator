# Bug #4: Incorrect Filename Generation - Fix Summary

## Problem Description

When downloading a generated chronicle PDF, the filename was incorrect. It was using an old chronicle path from the module settings instead of the current chronicle path from the form.

**Example**:
- Form shows: `5-03-HeidmarchHeistChronicle.pdf`
- Downloaded filename: `Valeros_5-01-OldChronicle.pdf` (wrong!)
- Expected filename: `Valeros_5-03-HeidmarchHeistChronicle.pdf`

## Root Cause Analysis

### Data Flow Investigation

1. **Form Extraction** (`form-data-extraction.ts`):
   - ✅ Correctly extracts `blankChroniclePath` from form input
   - ✅ Includes it in `data.shared.blankChroniclePath`

2. **Chronicle Generation** (`chronicle-generation.ts`):
   - ✅ `loadLayoutConfiguration()` correctly resolves `blankChroniclePath`
   - ✅ `extractCharacterChronicleData()` includes it in `sharedFields.blankChroniclePath`
   - ✅ Passes `blankChroniclePath` to `generateSingleCharacterPdf()`

3. **Data Mapping** (`party-chronicle-mapper.ts`):
   - ⚠️ `mapToCharacterData()` transforms data to `ChronicleData` format
   - ❌ **ISSUE**: `ChronicleData` interface does NOT include `blankChroniclePath`
   - This is correct for PDF generation (PdfGenerator doesn't need it)
   - But causes problems when saving to actor flags

4. **Saving to Actor Flags** (`chronicle-generation.ts` line 257):
   - ❌ **ISSUE**: Saves mapped `chronicleData` which lacks `blankChroniclePath`
   - The actor flag `chronicleData` is missing the path information

5. **Download Handler** (`main.ts` line 189-192):
   - Tries to read `blankChroniclePath` from actor flag
   - Falls back to module setting when not found
   - ❌ **ISSUE**: Always falls back because actor flag doesn't have it

### The Core Issue

The `blankChroniclePath` was being lost during the data transformation step. The mapper function (`mapToCharacterData`) correctly excludes it from the `ChronicleData` format (since PdfGenerator doesn't need it), but we were saving that mapped data to the actor flags without adding the path back.

## Solution

### Fix Applied

Modified `generateSingleCharacterPdf()` in `chronicle-generation.ts` to add `blankChroniclePath` back to the chronicle data before saving to actor flags:

```typescript
// Before (BROKEN):
await actor.setFlag('pfs-chronicle-generator', 'chronicleData', chronicleData);

// After (FIXED):
const chronicleDataWithPath = {
  ...chronicleData,
  blankChroniclePath: blankChroniclePath
};
await actor.setFlag('pfs-chronicle-generator', 'chronicleData', chronicleDataWithPath);
```

### Why This Works

1. The mapped `chronicleData` is used for PDF generation (correct format)
2. Before saving to actor flags, we add `blankChroniclePath` back
3. The download handler can now read the correct path from actor flags
4. Filename generation uses the correct chronicle path

### Debug Logging Added

Added comprehensive debug logging to trace the issue:

**In `main.ts` (download handler)**:
- Logs `chronicleData` from actor flag
- Logs `chronicleData.blankChroniclePath`
- Logs module setting path
- Logs final resolved path
- Logs generated filename

**In `chronicle-generation.ts` (save handler)**:
- Logs when saving chronicleData to actor flag
- Logs the blankChroniclePath being saved
- Confirms whether original chronicleData had the path

## Testing

### Manual Test Steps

1. Open party sheet and navigate to Society tab
2. Select a chronicle (e.g., `5-03-HeidmarchHeistChronicle.pdf`)
3. Fill out form and click "Generate Chronicles"
4. Open a character sheet
5. Click "Download Chronicle"
6. Check browser console for `[FILENAME DEBUG]` logs
7. Verify downloaded filename matches the selected chronicle

### Expected Debug Output

```
[FILENAME DEBUG] chronicleData from actor flag: {char: "Valeros", ...}
[FILENAME DEBUG] chronicleData.blankChroniclePath: "modules/pf2e-pfs05.../5-03-HeidmarchHeistChronicle.pdf"
[FILENAME DEBUG] module setting blankChroniclePath: "modules/pf2e-pfs05.../5-01-OldChronicle.pdf"
[FILENAME DEBUG] Final blankChroniclePath used for filename: "modules/pf2e-pfs05.../5-03-HeidmarchHeistChronicle.pdf"
[FILENAME DEBUG] Generated filename: "Valeros_5-03-HeidmarchHeistChronicle.pdf"
```

### Success Criteria

- ✅ `chronicleData.blankChroniclePath` is defined (not undefined)
- ✅ Final path matches the form selection (not module setting)
- ✅ Generated filename includes correct chronicle name
- ✅ Downloaded file has correct filename

## Files Modified

1. **`scripts/handlers/chronicle-generation.ts`**:
   - Modified `generateSingleCharacterPdf()` to add `blankChroniclePath` to saved data
   - Added debug logging for filename generation

2. **`scripts/main.ts`**:
   - Added debug logging in download button handler
   - Logs all path sources and final resolution

## Related Issues

- Bug #2: Wrong selector used (fixed - used wrong constant)
- Bug #3: Strikeout items not working (fixed - incorrect comma splitting)
- Bug #4: Incorrect filename (THIS BUG - fixed - missing path in actor flag)

## Cleanup

After confirming the fix works:
1. Remove `[FILENAME DEBUG]` logs from `main.ts`
2. Remove `[FILENAME DEBUG]` logs from `chronicle-generation.ts`
3. Keep `[CHRONICLE PATH DEBUG]` logs temporarily for further debugging if needed

## Architecture Notes

### Why ChronicleData Doesn't Include blankChroniclePath

The `ChronicleData` interface is designed to match the format expected by `PdfGenerator`. The PDF generator only needs the data to render on the PDF (character name, XP, gold, etc.). It doesn't need to know where the blank PDF came from - that's handled by the caller.

This is good separation of concerns:
- `PdfGenerator` focuses on rendering data onto a PDF
- Chronicle generation workflow handles file paths and loading

### Why We Need blankChroniclePath in Actor Flags

The actor flags serve two purposes:
1. Store the generated PDF (as base64)
2. Store the chronicle data for reference and filename generation

The download handler needs `blankChroniclePath` to generate the correct filename. Without it, the filename would always use the module setting (which might be outdated).

### Design Decision

We could have:
1. Added `blankChroniclePath` to `ChronicleData` interface (rejected - pollutes PDF generator interface)
2. Stored path separately in a different flag (rejected - more complex)
3. Added path back before saving to flags (CHOSEN - simple and clean)

Option 3 is the best because:
- Keeps `ChronicleData` interface clean for PDF generation
- Stores all chronicle-related data in one place
- Minimal code changes
- Easy to understand and maintain
