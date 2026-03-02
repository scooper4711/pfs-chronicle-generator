# Implementation Plan: Earned Income Calculation

## Overview

This implementation plan converts the earned income calculation design into discrete coding tasks. The feature automates the calculation of income earned during downtime days in Pathfinder Society scenarios, with players selecting task level, success level, and proficiency rank to determine their earned income.

The implementation follows the existing modular architecture established by the treasure bundle calculation feature. Event listeners must be attached in `main.ts`, handler logic goes in `handlers/party-chronicle-handlers.ts`, and utility functions are extracted into dedicated modules.

## Tasks

- [x] 1. Create earned income calculator utility module
  - Create `scripts/utils/earned-income-calculator.ts`
  - Implement `DC_BY_LEVEL` lookup table mapping task levels 0-20 to DCs
  - Implement `INCOME_TABLE` lookup table with all values pre-converted to gold pieces (levels 0-20, all proficiency ranks, failure outcomes, level 20 critical success special case)
  - Implement `getDCForLevel(level: number): number` function
  - Implement `calculateTaskLevelOptions(characterLevel: number)` function returning 5 options: "-", level-3, level-2, level-1, level (all floored at 0)
  - Implement `getIncomePerDay(taskLevel, successLevel, proficiencyRank): number` function with critical success handling
  - Implement `calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays): number` function
  - Implement `formatIncomeValue(value: number): string` helper function for display formatting
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.8, 1.9, 3.5, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.1, 8.2, 8.3, 8.4_

- [x] 1.1 Write unit tests for earned income calculator
  - Test `getDCForLevel()` for all levels 0-20
  - Test `getDCForLevel()` for out-of-range levels
  - Test `calculateTaskLevelOptions()` for edge cases (level 1, 2, 3) to verify flooring at 0
  - Test `calculateTaskLevelOptions()` returns exactly 5 options with correct values
  - Test `getIncomePerDay()` for specific table lookups (level 0 failure = 0.01 gp, level 1 trained = 0.2 gp)
  - Test `getIncomePerDay()` for critical success (uses level + 1)
  - Test `getIncomePerDay()` for level 20 critical success special case
  - Test `calculateEarnedIncome()` with task level "-" returns 0
  - Test `calculateEarnedIncome()` with critical failure returns 0
  - Test `calculateEarnedIncome()` with 0 downtime days returns 0
  - Test `calculateEarnedIncome()` formula (income per day × downtime days)
  - Test rounding to 2 decimal places
  - Test `formatIncomeValue()` formats with 2 decimals and "gp" suffix
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.8, 1.9, 3.4, 3.5, 5.1, 5.2, 5.3, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.2_

- [x] 1.2 Write property-based tests for earned income calculator
  - **Property 1: Task Level Options Generation** - For any character level 1-20, verify 5 options with correct values and flooring
  - **Validates: Requirements 1.2, 1.4, 1.5, 1.8, 1.9, 8.1, 8.4**
  - **Property 2: Income Table Lookup** - For any valid task level, proficiency rank, and success level, verify non-negative gold value returned
  - **Validates: Requirements 4.3, 5.1, 5.2, 5.3, 6.2**
  - **Property 3: Critical Success Calculation** - For any task level 0-19, verify critical success uses level + 1
  - **Validates: Requirements 3.5, 6.4**
  - **Property 4: Income Calculation Formula** - For any income per day and downtime days 0-8, verify total = income × days rounded to 2 decimals
  - **Validates: Requirements 6.3, 6.7**
  - **Property 5: Zero Income Cases** - For any character with task level "-" OR critical failure, verify earned income = 0
  - **Validates: Requirements 3.4, 6.6**
  - **Property 13: DC Lookup Accuracy** - For any task level 0-20, verify correct DC from Pathfinder 2e table
  - **Validates: Requirements 8.2**
  - _Requirements: 1.2, 1.4, 1.5, 1.8, 1.9, 3.4, 3.5, 4.3, 5.1, 5.2, 5.3, 6.2, 6.3, 6.4, 6.7, 8.1, 8.2, 8.4_

- [x] 2. Update type definitions
  - Modify `scripts/model/party-chronicle-types.ts`
  - Add `downtimeDays: number` to `SharedFields` interface with JSDoc comment
  - Add `taskLevel: number | string` to `UniqueFields` interface with JSDoc comment
  - Add `successLevel: string` to `UniqueFields` interface with JSDoc comment
  - Add `proficiencyRank: string` to `UniqueFields` interface with JSDoc comment
  - Add `earnedIncome: number` to `UniqueFields` interface with JSDoc comment (replaces incomeEarned)
  - _Requirements: 2.1, 3.1, 3.2, 4.1, 6.1, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 3. Update data mapper for PDF generation
  - Modify `scripts/model/party-chronicle-mapper.ts`
  - Import `calculateEarnedIncome` from `earned-income-calculator.ts`
  - Modify `mapToCharacterData()` to calculate `income_earned` using `calculateEarnedIncome()`
  - Update `calculateGpGained()` call to use calculated `incomeEarned` value
  - Ensure parameter name is exactly `income_earned` for PDF compatibility
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 12.1, 12.2, 12.3_

- [x] 3.1 Write unit tests for data mapper
  - Test `mapToCharacterData()` calculates correct `income_earned` for various input combinations
  - Test `mapToCharacterData()` with task level "-" produces income_earned = 0
  - Test `mapToCharacterData()` with critical failure produces income_earned = 0
  - Test `mapToCharacterData()` with critical success uses level + 1
  - Test `mapToCharacterData()` with level 20 critical success uses special values
  - Test parameter name is exactly `income_earned`
  - Test `gp_gained` includes both treasure_bundles_gp and income_earned
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 12.1, 12.2, 12.3_

- [x] 3.2 Write property-based test for PDF generation integration
  - **Property 12: PDF Generation Integration** - For any character with earned income inputs, verify PDF generator receives calculated value
  - **Validates: Requirements 12.1, 12.2, 12.3**
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 4. Update validation logic
  - Modify `scripts/model/party-chronicle-validator.ts`
  - Add downtime days validation to `validateSharedFields()` using `validateNumberField()` helper (min: 0, max: 8, integer: true)
  - Add task level validation to `validateUniqueFields()` (must be 0-20 or "-")
  - Add success level validation to `validateUniqueFields()` (must be critical_failure, failure, success, or critical_success)
  - Add proficiency rank validation to `validateUniqueFields()` (must be trained, expert, master, or legendary)
  - Add conditional validation: when task level is not "-", require success level and proficiency rank
  - _Requirements: 2.2, 2.3, 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_

- [x] 4.1 Write unit tests for validation
  - Test downtime days validation accepts 0-8
  - Test downtime days validation rejects negative values
  - Test downtime days validation rejects values > 8
  - Test downtime days validation rejects non-integers
  - Test task level validation accepts 0-20 and "-"
  - Test task level validation rejects invalid values
  - Test success level validation accepts valid values
  - Test success level validation rejects invalid values
  - Test proficiency rank validation accepts valid values
  - Test proficiency rank validation rejects invalid values
  - Test conditional validation: task level not "-" requires success level and proficiency rank
  - Test conditional validation: task level "-" does not require success level or proficiency rank
  - _Requirements: 2.2, 2.3, 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_

- [x] 4.2 Write property-based tests for validation
  - **Property 6: Downtime Days Validation** - For any downtime days value, verify validator accepts 0-8 and rejects others
  - **Validates: Requirements 2.2, 2.3, 9.1, 9.2, 9.3**
  - **Property 7: Conditional Validation** - For any character, verify validator requires success level and proficiency rank when task level is not "-"
  - **Validates: Requirements 9.5, 9.6, 9.7**
  - _Requirements: 2.2, 2.3, 9.1, 9.2, 9.3, 9.5, 9.6, 9.7_

- [x] 5. Add event handler functions for reactive updates
  - Modify `scripts/handlers/party-chronicle-handlers.ts`
  - Import calculation functions from `earned-income-calculator.ts`
  - Implement `updateEarnedIncomeDisplay(characterId, taskLevel, successLevel, proficiencyRank, downtimeDays, container)` function
  - Implement `updateAllEarnedIncomeDisplays(downtimeDays, container)` function
  - Modify `handleFieldChange()` to trigger earned income display updates when downtime days changes
  - Modify `handleFieldChange()` to trigger earned income display updates when task level, success level, or proficiency rank changes
  - _Requirements: 2.5, 7.3_

- [x] 5.1 Write unit tests for event handlers
  - Test `updateEarnedIncomeDisplay()` updates the correct DOM element
  - Test `updateEarnedIncomeDisplay()` calculates correct value
  - Test `updateAllEarnedIncomeDisplays()` updates all character displays
  - Test `handleFieldChange()` triggers updates for downtime days changes
  - Test `handleFieldChange()` triggers updates for task level changes
  - Test `handleFieldChange()` triggers updates for success level changes
  - Test `handleFieldChange()` triggers updates for proficiency rank changes
  - _Requirements: 2.5, 7.3_

- [x] 5.2 Write property-based tests for reactive updates
  - **Property 9: Reactive Display Updates** - For any change to inputs, verify earned income display updates
  - **Validates: Requirements 7.3**
  - **Property 10: Shared Downtime Days Propagation** - For any party with multiple characters, verify downtime days change updates all displays
  - **Validates: Requirements 2.5**
  - _Requirements: 2.5, 7.3_

- [x] 6. Register Handlebars helper for task level options
  - Modify `scripts/main.ts`
  - Import `calculateTaskLevelOptions` from `earned-income-calculator.ts`
  - Register Handlebars helper `calculateTaskLevelOptions` before rendering template
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.8, 1.9_

- [x] 7. Update template to add earned income UI fields
  - Modify `templates/party-chronicle-filling.hbs`
  - Add downtime days input field to shared fields section (type="number", min="0", max="8", step="1", default="0")
  - Add earned income section to character-specific fields
  - Add task level dropdown using `calculateTaskLevelOptions` helper (5 options: "-", level-3, level-2, level-1, level)
  - Add help text explaining task level options ("-" = no income, level-3 = infamy, level-2 = default, level-1/level = feat/boon)
  - Add success level dropdown (4 options: critical failure, failure, success, critical success, default="success")
  - Add proficiency rank dropdown (4 options: trained, expert, master, legendary)
  - Add earned income display field (read-only, class="earned-income-value", initial="0.00 gp")
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 7.1, 7.2, 7.4_

- [x] 8. Add CSS styling for earned income fields
  - Modify `css/style.css`
  - Add styles for `.earned-income-section` (margin, padding, background, border)
  - Add styles for `.earned-income-value` class (read-only field appearance: gray background, border, monospace font, right-aligned)
  - Add styles for `.help-text` class (small font, gray color, italic)
  - Ensure consistent styling with treasure bundle fields
  - _Requirements: 7.1, 7.2_

- [x] 9. Attach event listeners in main entry point
  - Modify `scripts/main.ts` in `renderPartyChronicleForm()` function
  - Import handler functions from `party-chronicle-handlers.ts`
  - Add event listener for downtime days input changes (use `input` event)
  - Add event listeners for all task level dropdown changes (use `change` event)
  - Add event listeners for all success level dropdown changes (use `change` event)
  - Add event listeners for all proficiency rank dropdown changes (use `change` event)
  - Call `updateAllEarnedIncomeDisplays()` on initial render to populate displays
  - Follow existing pattern of event listener attachment (native DOM APIs)
  - _Requirements: 7.3_

- [x] 10. Update auto-save logic
  - Verify that `handleFieldChange()` triggers auto-save for downtime days changes
  - Verify that `handleFieldChange()` triggers auto-save for task level changes
  - Verify that `handleFieldChange()` triggers auto-save for success level changes
  - Verify that `handleFieldChange()` triggers auto-save for proficiency rank changes
  - Ensure auto-save stores all earned income input values
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 10.1 Write property-based test for data persistence
  - **Property 11: Data Persistence Round-Trip** - For any valid earned income inputs, verify save and load restores all values
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 11. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property-based tests and verify they pass
  - Manually test the form in Foundry VTT
  - Verify earned income display updates when any input changes
  - Verify downtime days change updates all character displays
  - Verify PDF generation uses correct parameter names
  - Ask the user if questions arise

- [x] 12. Integration testing
  - Test complete workflow: enter downtime days → select task level → select success level → select proficiency rank → see calculated income → generate PDFs
  - Test with party members at different levels
  - Test with "-" task level selection (0 income)
  - Test with critical failure (0 income)
  - Test with critical success (uses level + 1)
  - Test with level 20 critical success (special values)
  - Test with 0 downtime days (0 income)
  - Test with 8 downtime days (maximum)
  - Test that downtime days change updates all character displays
  - Verify PDF contains correct income_earned values
  - Verify form data is preserved on reload
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.1, 12.2, 12.3_

- [x] 12.1 Write property-based test for display formatting
  - **Property 8: Display Formatting** - For any calculated earned income value, verify formatted display shows 2 decimals and "gp" suffix
  - **Validates: Requirements 6.8, 7.2**
  - _Requirements: 6.8, 7.2_

- [x] 12.2 Write property-based test for default success level
  - **Property 14: Default Success Level** - For any character where success level is not set, verify form defaults to "success"
  - **Validates: Requirements 3.3, 9.8**
  - _Requirements: 3.3, 9.8_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The checkpoint ensures incremental validation
- Event listeners MUST be attached in `main.ts` (hybrid ApplicationV2 pattern)
- Handler logic MUST be in `handlers/party-chronicle-handlers.ts`
- Parameter name `income_earned` is non-negotiable for PDF compatibility
- Property-based tests use `fast-check` library with minimum 100 iterations
- All property tests are tagged with feature name and property number
- Unit tests and property tests are complementary - both are valuable


## New Tasks for XP Dropdown and Downtime Calculation

- [x] 13. Update earned income calculator for critical success adjustment
  - Modify `scripts/utils/earned-income-calculator.ts`
  - Update `getIncomePerDay()` to use `max(taskLevel + 1, 3)` for critical success (minimum level 3)
  - Add JSDoc comment explaining PFS rule: "On a critical success, treat your PC level as 1 higher to determine results, to a minimum level of 3"
  - _Requirements: 3.5, 6.4_

- [x] 13.1 Write unit tests for critical success adjustment
  - Test critical success at level 0 uses level 3 (minimum)
  - Test critical success at level 1 uses level 3 (minimum)
  - Test critical success at level 2 uses level 3 (minimum)
  - Test critical success at level 3 uses level 4
  - Test critical success at level 4+ uses level + 1
  - _Requirements: 3.5, 6.4_

- [x] 14. Add downtime days calculation function
  - Modify `scripts/utils/earned-income-calculator.ts`
  - Implement `calculateDowntimeDays(xpEarned: number): number` function
  - Formula: `xpEarned === 1 ? 0 : xpEarned * 2`
  - Add JSDoc comment with PFS rule: "Scenarios and Quests grant two days of Downtime per XP earned. Bounties are missions the PC undertakes during their Downtime and thus grant no Downtime."
  - _Requirements: 2.1, 2.4_

- [x] 14.1 Write unit tests for downtime calculation
  - Test Bounty (1 XP) returns 0 downtime days
  - Test Quest (2 XP) returns 4 downtime days
  - Test Scenario (4 XP) returns 8 downtime days
  - _Requirements: 2.1, 2.4_

- [x] 15. Update template for XP dropdown and downtime display
  - Modify `templates/party-chronicle-filling.hbs`
  - Replace XP Earned number input with dropdown
  - Add 3 options: "Bounty (1 XP)", "Quest (2 XP)", "Scenario (4 XP)"
  - Default to "Scenario (4 XP)"
  - Replace Downtime Days input with read-only display field
  - Add class `downtime-days-value` to downtime display
  - Style downtime display to match treasure bundle and earned income displays
  - _Requirements: 2.1, 2.4, 7.1, 7.2_

- [x] 16. Add CSS for downtime days display
  - Modify `css/style.css`
  - Add styles for `.downtime-days-value` class matching `.treasure-bundle-value` and `.earned-income-value`
  - Ensure consistent styling: gray background, border, monospace font, right-aligned
  - _Requirements: 7.1, 7.2_

- [x] 17. Add event handler for XP dropdown changes
  - Modify `scripts/handlers/party-chronicle-handlers.ts`
  - Implement `updateDowntimeDaysDisplay(xpEarned: number, container: HTMLElement)` function
  - Call `calculateDowntimeDays()` to get downtime days
  - Update `.downtime-days-value` display element
  - After updating downtime days, call `updateAllEarnedIncomeDisplays()` to recalculate all earned income
  - _Requirements: 2.4, 2.5, 7.3_

- [x] 17.1 Write unit tests for downtime display update
  - Test `updateDowntimeDaysDisplay()` updates the correct DOM element
  - Test `updateDowntimeDaysDisplay()` calculates correct value for Bounty (0)
  - Test `updateDowntimeDaysDisplay()` calculates correct value for Quest (4)
  - Test `updateDowntimeDaysDisplay()` calculates correct value for Scenario (8)
  - Test `updateDowntimeDaysDisplay()` triggers `updateAllEarnedIncomeDisplays()`
  - _Requirements: 2.4, 2.5, 7.3_

- [x] 18. Attach event listener for XP dropdown
  - Modify `scripts/main.ts` in `renderPartyChronicleForm()` function
  - Add event listener for XP Earned dropdown changes (use `change` event)
  - Call `updateDowntimeDaysDisplay()` when XP changes
  - Call `updateDowntimeDaysDisplay()` on initial render to populate display
  - _Requirements: 2.4, 7.3_

- [x] 19. Update Clear Data button defaults
  - Modify `scripts/main.ts` in clear button handler
  - Update default XP to 4 (Scenario) for scenarios, 2 (Quest) for quests, 1 (Bounty) for bounties
  - Detection logic: check if scenario name contains "quest" or "bounty" (case-insensitive)
  - Downtime days will be calculated automatically from XP
  - _Requirements: 2.1, 2.4_

- [x] 20. Update validation to remove downtime days validation
  - Modify `scripts/model/party-chronicle-validator.ts`
  - Remove downtime days validation from `validateSharedFields()` (it's now calculated, not user input)
  - Keep XP validation (should be 1, 2, or 4)
  - _Requirements: 2.1, 9.1, 9.2, 9.3_

- [x] 20.1 Write unit tests for updated validation
  - Test XP validation accepts 1, 2, 4
  - Test XP validation rejects other values
  - Verify downtime days validation is removed
  - _Requirements: 2.1, 9.1, 9.2, 9.3_

- [x] 21. Integration testing for XP and downtime changes
  - Test complete workflow: select XP → see downtime days update → see all earned income update
  - Test Bounty (1 XP) → 0 downtime → 0 earned income
  - Test Quest (2 XP) → 4 downtime → correct earned income
  - Test Scenario (4 XP) → 8 downtime → correct earned income
  - Test Clear Data button sets correct XP defaults based on scenario name
  - Verify PDF generation uses correct downtime days
  - Verify form data is preserved on reload
  - _Requirements: 2.1, 2.4, 2.5, 7.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.1, 12.2, 12.3_
