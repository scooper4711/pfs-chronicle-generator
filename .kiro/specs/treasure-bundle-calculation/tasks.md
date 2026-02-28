# Implementation Plan: Treasure Bundle Calculation

## Overview

This implementation plan converts the treasure bundle calculation design into discrete coding tasks. The feature automates the conversion of treasure bundles (shared party rewards) into character-specific gold values based on character level, eliminating manual calculation errors.

The implementation follows the existing modular architecture and hybrid ApplicationV2 pattern. Event listeners must be attached in `main.ts`, handler logic goes in `handlers/party-chronicle-handlers.ts`, and utility functions are extracted into dedicated modules.

## Tasks

- [x] 1. Create treasure bundle calculator utility module
  - Create `scripts/utils/treasure-bundle-calculator.ts`
  - Implement `TREASURE_BUNDLE_VALUES` lookup table with all 20 levels
  - Implement `getTreasureBundleValue(level: number): number` function
  - Implement `calculateTreasureBundlesGp(treasureBundles: number, characterLevel: number): number` function
  - Implement `calculateGpGained(treasureBundlesGp: number, incomeEarned: number): number` function
  - Implement `formatGoldValue(value: number): string` helper function for display formatting
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

- [x] 1.1 Write unit tests for treasure bundle calculator
  - Test `getTreasureBundleValue()` for all levels 1-20
  - Test `getTreasureBundleValue()` for out-of-range levels (returns 0)
  - Test `calculateTreasureBundlesGp()` with various treasure bundle counts and levels
  - Test `calculateTreasureBundlesGp()` with 0 treasure bundles (returns 0)
  - Test `calculateGpGained()` with various combinations
  - Test rounding to 2 decimal places
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

- [x] 2. Update type definitions
  - Modify `scripts/model/party-chronicle-types.ts`
  - Remove `goldEarned` field from `UniqueFields` interface
  - Add JSDoc comments explaining the removal
  - _Requirements: 5.2, 5.4_

- [x] 3. Update data mapper for PDF generation
  - Modify `scripts/model/party-chronicle-mapper.ts`
  - Import calculation functions from `treasure-bundle-calculator.ts`
  - Update `ChronicleData` interface to include `treasure_bundles_gp` field
  - Modify `mapToCharacterData()` to calculate `treasure_bundles_gp` using `calculateTreasureBundlesGp()`
  - Modify `mapToCharacterData()` to calculate `gp_gained` using `calculateGpGained()`
  - Ensure parameter names match exactly: `treasure_bundles_gp`, `gp_gained`, `income_earned`
  - Remove any references to `goldEarned` field
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 3.1 Write unit tests for data mapper
  - Test `mapToCharacterData()` calculates correct `treasure_bundles_gp` for various levels
  - Test `mapToCharacterData()` calculates correct `gp_gained` (treasure_bundles_gp + income_earned)
  - Test parameter names are exactly `treasure_bundles_gp`, `gp_gained`, `income_earned`
  - Test that legacy `goldEarned` values are ignored if present
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2_

- [x] 4. Update validation logic
  - Modify `scripts/model/party-chronicle-validator.ts`
  - Remove validation for `goldEarned` field from `validateUniqueFields()`
  - Ensure `incomeEarned` validation remains (non-negative number)
  - Update validation error messages if needed
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 4.1 Write unit tests for validation
  - Test that `incomeEarned` validation works correctly (non-negative)
  - Test that negative `incomeEarned` produces error message
  - Test that `incomeEarned` = 0 is valid
  - Test that no validation errors occur for missing `goldEarned` field
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [-] 5. Add event handler functions for reactive updates
  - Modify `scripts/handlers/party-chronicle-handlers.ts`
  - Import calculation functions from `treasure-bundle-calculator.ts`
  - Implement `updateTreasureBundleDisplay()` function to update a single character's display
  - Implement `updateAllTreasureBundleDisplays()` function to update all characters' displays
  - Modify `handleFieldChange()` to trigger treasure bundle display updates when treasure bundles or level changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.1 Write unit tests for event handlers
  - Test `updateTreasureBundleDisplay()` updates the correct DOM element
  - Test `updateAllTreasureBundleDisplays()` updates all character displays
  - Test `handleFieldChange()` triggers updates for treasure bundles field changes
  - Test `handleFieldChange()` triggers updates for level field changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Update template to display treasure bundle value
  - Modify `templates/party-chronicle-filling.hbs`
  - Remove the "Gold Earned" input field from character-specific section
  - Add "Treasure Bundle Value" read-only display field
  - Use class `treasure-bundle-value` for the display element
  - Initialize display with "0.00 gp" placeholder text
  - _Requirements: 4.1, 4.2, 4.5, 5.1_

- [x] 7. Add CSS styling for treasure bundle value display
  - Modify `css/style.css`
  - Add styles for `.treasure-bundle-value` class
  - Style as read-only field (gray background, border, monospace font)
  - Ensure right-aligned text for numeric display
  - _Requirements: 4.1, 4.2_

- [x] 8. Attach event listeners in main entry point
  - Modify `scripts/main.ts` in `renderPartyChronicleForm()` function
  - Import handler functions from `party-chronicle-handlers.ts`
  - Add event listener for treasure bundles input field changes
  - Add event listeners for all character level input field changes
  - Call `updateAllTreasureBundleDisplays()` on initial render to populate displays
  - Follow existing pattern of event listener attachment (native DOM APIs)
  - _Requirements: 4.3, 9.1_

- [x] 9. Update auto-save logic
  - Verify that `handleFieldChange()` triggers auto-save for treasure bundles changes
  - Verify that `handleFieldChange()` triggers auto-save for income earned changes
  - Ensure auto-save does NOT store calculated `treasure_bundles_gp` values
  - Ensure auto-save stores treasure bundles and income earned values
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Manually test the form in Foundry VTT
  - Verify treasure bundle value updates when treasure bundles or level changes
  - Verify PDF generation uses correct parameter names
  - Ask the user if questions arise

- [x] 11. Integration testing
  - Test complete workflow: enter treasure bundles → see calculated values → generate PDFs
  - Test with party members at different levels
  - Test with 0 treasure bundles
  - Test with maximum treasure bundles (10)
  - Test that income earned is added correctly to treasure bundle gold
  - Verify PDF contains correct gold values with correct parameter names
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 7.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The checkpoint ensures incremental validation
- Event listeners MUST be attached in `main.ts` (hybrid ApplicationV2 pattern)
- Handler logic MUST be in `handlers/party-chronicle-handlers.ts`
- Parameter names `treasure_bundles_gp`, `gp_gained`, `income_earned` are non-negotiable for PDF compatibility
- No backward compatibility or data migration tasks needed (per user guidance)
