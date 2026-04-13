# Implementation Plan: Starfinder Support

## Overview

Add Starfinder Society (SFS) support to the PFS Chronicle Generator so the module works with both Pathfinder 2e and Starfinder 2e from a single codebase. A thin game system detection layer selects system-specific behavior at runtime, and each calculator/formatter/template branches on the detected system. Implementation proceeds bottom-up: detection → formatting → calculators → model layer → template → app/handlers → entry point → manifest.

## Tasks

- [x] 1. Create game system detector and currency formatter utilities
  - [x] 1.1 Create `scripts/utils/game-system-detector.ts` with `GameSystem` type, `getGameSystem()`, `isStarfinder()`, and `isPathfinder()` functions
    - Detection logic: return `'sf2e'` if `game.system.id === 'sf2e'` OR `game.modules.get('sf2e-anachronism')?.active === true`, else `'pf2e'`
    - Functions are called at usage sites (not cached at module load) for testability
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Write unit tests for game system detector (`tests/utils/game-system-detector.test.ts`)
    - Test all detection branches: sf2e system ID, anachronism module active, both conditions, neither condition
    - Mock `game.system.id` and `game.modules.get()` for each case
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.3 Write property test for game system detector (`tests/utils/game-system-detector.pbt.test.ts`)
    - **Property 1: Anachronism Module Triggers Starfinder Detection**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 1.4 Create `scripts/utils/currency-formatter.ts` with `formatCurrency()`, `getCurrencyLabel()`, and `getZeroCurrencyDisplay()` functions
    - PF2e: `"10.50 gp"` (2 decimal places + "gp")
    - SF2e: `"105 Credits"` (whole number + "Credits")
    - `gameSystem` parameter passed explicitly (pure function, no global access)
    - _Requirements: 3.1, 3.2_

  - [x] 1.5 Write unit tests for currency formatter (`tests/utils/currency-formatter.test.ts`)
    - Test formatting for both systems, zero values, edge cases
    - _Requirements: 3.1, 3.2_

  - [x] 1.6 Write property tests for currency formatter (`tests/utils/currency-formatter.pbt.test.ts`)
    - **Property 2: Pathfinder Currency Format** — output matches `<number with 2 decimals> gp`
    - **Property 3: Starfinder Currency Format** — output matches `<whole number> Credits`
    - **Validates: Requirements 3.1, 3.2**

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Modify earned income calculator for Starfinder support
  - [x] 3.1 Add `STARFINDER_INCOME_TABLE` to `scripts/utils/earned-income-calculator.ts`
    - Build programmatically from `INCOME_TABLE` using `Math.ceil(value * 10)` for every entry (including critical success sub-table at level 20)
    - Computed once at module load time as a constant via `buildStarfinderIncomeTable()` helper
    - _Requirements: 4.1, 4.2, 9.1_

  - [x] 3.2 Add optional `gameSystem` parameter to `getIncomePerDay`, `calculateEarnedIncome`, `calculateDowntimeDays`, and `formatIncomeValue`
    - `getIncomePerDay`: when Starfinder, look up from `STARFINDER_INCOME_TABLE`
    - `calculateEarnedIncome`: when Starfinder, apply `Math.ceil()` to final result for whole-number Credits
    - `calculateDowntimeDays`: when Starfinder, always return `8` (preserving function call path, not hardcoding in UI)
    - `formatIncomeValue`: delegate to `formatCurrency` from currency-formatter
    - Default `gameSystem` to `getGameSystem()` so existing callers are unaffected
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3, 3.3_

  - [x] 3.3 Write unit tests for Starfinder earned income (`tests/utils/earned-income-calculator-starfinder.test.ts`)
    - Test SF income table values, SF earned income calculation, SF downtime days, SF formatIncomeValue
    - Verify existing PF2e behavior is unchanged (gameSystem defaults to pf2e in test env)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.3_

  - [x] 3.4 Write property tests for Starfinder earned income (`tests/utils/earned-income-calculator-starfinder.pbt.test.ts`)
    - **Property 4: Starfinder Income Table Derivation** — SF value === `Math.ceil(PF value * 10)` for all levels/ranks
    - **Property 5: Starfinder Earned Income Whole Number** — `value % 1 === 0` for all valid inputs in SF mode
    - **Property 7: Starfinder Downtime Days Fixed at 8** — always returns 8 in SF mode regardless of XP/TB inputs
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6, 6.3, 9.1, 9.2**

- [ ] 4. Add Credits Awarded table and modify treasure bundle calculator
  - [~] 4.1 Add `CREDITS_AWARDED_TABLE`, `getCreditsAwarded()`, and modify `calculateCurrencyGained()` and `formatCurrencyValue()` in `scripts/utils/treasure-bundle-calculator.ts`
    - `CREDITS_AWARDED_TABLE`: levels 1-10 mapping to flat credit amounts (140, 220, 380, 640, 1000, 1500, 2200, 3000, 4400, 6000)
    - `getCreditsAwarded(level)`: returns 0 for levels outside 1-10
    - `calculateCurrencyGained`: add optional `gameSystem` parameter; when Starfinder, use credits awarded + earned income
    - `formatCurrencyValue`: delegate to `formatCurrency` from currency-formatter
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 3.4, 3.6_

  - [~] 4.2 Write unit tests for Credits Awarded (`tests/utils/treasure-bundle-calculator-starfinder.test.ts`)
    - Test exact table values for all 10 levels, out-of-range levels, currency gained in SF mode
    - Verify existing PF2e treasure bundle behavior is unchanged
    - _Requirements: 5.2, 5.3, 5.4, 5.7, 9.3, 9.4_

  - [~] 4.3 Write property test for Credits Awarded (`tests/utils/treasure-bundle-calculator-starfinder.pbt.test.ts`)
    - **Property 6: Starfinder Currency Gained from Credits Awarded** — `calculateCurrencyGained` in SF mode returns `CREDITS_AWARDED_TABLE[level] + earnedIncome`, and Credits Awarded is a positive whole number
    - **Validates: Requirements 5.2, 5.4, 5.6, 9.3**

- [~] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Modify scenario identifier and session report builder
  - [~] 6.1 Update `scripts/model/scenario-identifier.ts` to handle Starfinder layout IDs
    - Add `SF_SCENARIO_PATTERN = /^sfs2\.s(\d+-\d+)$/` regex
    - Check SF pattern first, then PF pattern, then fallback (strip `sfs2.` or `pfs2.` prefix)
    - _Requirements: 8.3, 8.4_

  - [~] 6.2 Write unit tests for Starfinder scenario identifiers (`tests/model/scenario-identifier-starfinder.test.ts`)
    - Test SF layout ID parsing (e.g., "sfs2.s1-01" → "SFS2E 1-01"), fallback for non-standard SF IDs
    - Verify existing PF2e parsing is unchanged
    - _Requirements: 8.3, 8.4_

  - [~] 6.3 Write property test for Starfinder scenario identifiers (`tests/model/scenario-identifier-starfinder.pbt.test.ts`)
    - **Property 9: Starfinder Scenario Identifier Parsing** — for any valid season/scenario numbers, `buildScenarioIdentifier("sfs2.s{season}-{scenario}")` returns `"SFS2E {season}-{scenario}"`
    - **Validates: Requirements 8.3**

  - [~] 6.4 Update `scripts/model/session-report-builder.ts` and `scripts/model/session-report-types.ts` for Starfinder game system
    - Widen `SessionReport.gameSystem` type from `'PFS2E'` to `'PFS2E' | 'SFS2E'`
    - Import `getGameSystem` in builder; set `gameSystem` to `'SFS2E'` when detected system is `'sf2e'`
    - _Requirements: 8.1, 8.2_

  - [~] 6.5 Write unit tests for Starfinder session report (`tests/model/session-report-builder-starfinder.test.ts`)
    - Test gameSystem field is 'SFS2E' when detector returns sf2e, 'PFS2E' when pf2e
    - _Requirements: 8.1, 8.2_

  - [~] 6.6 Write property test for Starfinder session report (`tests/model/session-report-builder-starfinder.pbt.test.ts`)
    - **Property 8: Session Report Game System Matches Detected System** — gameSystem field matches detected system for all valid build params
    - **Validates: Requirements 8.1, 8.2**

- [~] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Modify template, types, mapper, app, and handlers for Starfinder UI
  - [~] 8.1 Add `gameSystem` field to `PartyChronicleContext` in `scripts/model/party-chronicle-types.ts`
    - Type: `'pf2e' | 'sf2e'`
    - _Requirements: 7.3_

  - [~] 8.2 Update `scripts/model/party-chronicle-mapper.ts` for system-aware calculations
    - Import `getGameSystem` from detector
    - When Starfinder, use `getCreditsAwarded(level)` instead of `calculateTreasureBundleValue(bundles, level)`
    - Pass `gameSystem` to `calculateEarnedIncome` and `calculateCurrencyGained`
    - _Requirements: 5.6, 4.5_

  - [~] 8.3 Update `scripts/PartyChronicleApp.ts` to pass `gameSystem` in context
    - Import `getGameSystem` from detector
    - Add `gameSystem: getGameSystem()` to the object returned by `_prepareContext`
    - _Requirements: 7.3_

  - [~] 8.4 Update `templates/party-chronicle-filling.hbs` for conditional Starfinder rendering
    - XP Earned: hide dropdown in SF mode, show fixed "4 XP" with hidden input `value="4"`
    - Treasure Bundles: hide entire dropdown in SF mode (`{{#unless (eq gameSystem "sf2e")}}`)
    - Per-character: show "Credits Awarded" (from `getCreditsAwarded`) in SF mode instead of treasure bundle value
    - Earned income initial value: use `{{getZeroCurrencyDisplay gameSystem}}` instead of hardcoded "0.00 gp"
    - Currency Spent label: show "Credits Spent" in SF mode
    - Tooltips: use system-appropriate text (no Bounty/Quest references in SF mode)
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 5.1, 5.2, 5.5, 6.1, 6.2, 6.4, 6.5, 7.1, 7.2, 7.4, 7.5_

  - [~] 8.5 Update `scripts/handlers/party-chronicle-handlers.ts` for system-aware display updates
    - `updateEarnedIncomeDisplay`: pass `getGameSystem()` to `calculateEarnedIncome` and `formatIncomeValue`
    - `updateTreasureBundleDisplay`: pass `getGameSystem()` to `formatCurrencyValue`
    - `updateDowntimeDaysDisplay`: pass `getGameSystem()` to `calculateDowntimeDays`
    - Add new `updateAllCreditsAwardedDisplays(container)` function for Starfinder mode
    - _Requirements: 7.6, 7.7, 5.2_

- [ ] 9. Update main entry point and module manifest
  - [~] 9.1 Update `scripts/main.ts` for Starfinder hooks and Handlebars helpers
    - Register hooks for `renderPartySheetSF2e` and `renderCharacterSheetSF2e` (in addition to existing PF2e hooks)
    - Register new Handlebars helpers: `getCreditsAwarded`, `getZeroCurrencyDisplay`, `getCurrencyLabel`
    - `initializeForm`: call `updateAllCreditsAwardedDisplays` when in Starfinder mode instead of `updateAllTreasureBundleDisplays`
    - _Requirements: 2.2, 2.3, 3.5, 3.7, 5.2_

  - [~] 9.2 Update `module.json` to declare SF2e system compatibility
    - Add `{ "id": "sf2e", "type": "system", "compatibility": {} }` to `relationships.systems` array
    - _Requirements: 2.1_

- [~] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 9 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Jest for testing and fast-check for property-based tests
- All existing tests must continue to pass — the optional `gameSystem` parameter defaults to `getGameSystem()`, which returns `'pf2e'` in test environments where `game.system.id` is undefined
