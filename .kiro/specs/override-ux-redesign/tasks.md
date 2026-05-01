# Implementation Plan: Override UX Redesign

## Overview

Redesign the override UX by moving override checkboxes into a dedicated column between the character portrait and fields grid, replacing strikethrough with visibility toggling, pre-populating the currency override input with calculated defaults, relocating Consume Replay above Notes, and removing the Advanced collapsible section entirely. This is a UI/UX-only change — the data model, chronicle generation, session reporting, and persistence logic remain unchanged.

## Tasks

- [ ] 1. Initial spec commit
  - [-] 1.1 Create feature branch `feat/override-ux-redesign` from current branch
  - [~] 1.2 Commit spec files with message `docs: Add override-ux-redesign spec`
    - Stage `.kiro/specs/override-ux-redesign/requirements.md`, `.kiro/specs/override-ux-redesign/design.md`, `.kiro/specs/override-ux-redesign/tasks.md`, `.kiro/specs/override-ux-redesign/.config.kiro`

- [ ] 2. Update DOM selectors and CSS classes
  - [~] 2.1 Add new DOM selectors to `constants/dom-selectors.ts`
    - Add character field selectors: `EARNED_INCOME_SECTION`, `TREASURE_BUNDLES_ROW`, `CREDITS_AWARDED_ROW`, `OVERRIDE_CURRENCY_ROW`, `OVERRIDE_XP_ROW` as functions of `characterId`
    - Add `OVERRIDE_HIDDEN: 'override-hidden'` to `CSS_CLASSES`
    - Remove `STRIKETHROUGH_OVERRIDE` from `CSS_CLASSES`
    - _Requirements: 2.3, 2.4, 3.3, 3.4, 4.3, 4.4_

  - [~] 2.2 Update `css/style.css` with new override visibility styles and checkbox column layout
    - Add `.override-hidden` class with `display: none !important`
    - Add `.override-checkbox-column` styles for the new column between portrait and fields
    - Add `.override-xp-row` and `.override-currency-row` styles (hidden by default)
    - Remove `.strikethrough-override` class
    - Remove all `.advanced-section` styles (the entire Advanced section CSS block)
    - Update `.member-activity` layout to accommodate the 3-column structure (portrait | checkbox column | fields)
    - _Requirements: 1.1, 1.4, 2.2, 2.3, 3.2, 3.3, 4.2, 4.3_

- [ ] 3. Restructure template for new override layout
  - [~] 3.1 Restructure party member character cards in `templates/party-chronicle-filling.hbs`
    - Add `override-checkbox-column` div between `character-info` and `character-fields` containing:
      - Override Currency checkbox (`name="characters.{{this.id}}.overrideCurrency"`) with system-aware tooltip ("Override GP" for PF2e, "Override Credits" for SF2e), no text label
      - Override XP checkbox (`name="characters.{{this.id}}.overrideXp"`) with tooltip "Override XP", no text label
    - Add `.treasure-bundle-row` class to the Treasure Bundles form-group (PF2e) and `.credits-awarded-row` class to the Credits Awarded form-group (SF2e) for visibility targeting
    - Add Override Currency Input row (`.override-currency-row`, hidden by default) after Treasure Bundles / Credits Awarded row with:
      - Label "GP Gained" (PF2e) or "Credits Gained" (SF2e)
      - Input `name="characters.{{this.id}}.overrideCurrencyValue"`, `min="0"`, system-aware `step` (`0.01` PF2e, `1` SF2e)
    - Add Override XP Input row (`.override-xp-row`, hidden by default) after XP Earned display with:
      - Label "XP Earned" with override-specific tooltip
      - Input `name="characters.{{this.id}}.overrideXpValue"`, `min="0"`, `step="1"`
    - Move Consume Replay checkbox from Advanced section to directly above Notes field
    - Remove the entire Advanced section (`collapsible-section advanced-section` div)
    - Restore saved override checkbox states and input values from `savedData.characters`
    - _Requirements: 1.1, 1.2, 1.3, 2.5, 2.6, 2.8, 3.5, 3.7, 4.5, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3_

  - [~] 3.2 Restructure GM character card in `templates/party-chronicle-filling.hbs`
    - Apply the same structural changes as task 3.1 to the GM character section:
      - Add `override-checkbox-column` div with Override Currency and Override XP checkboxes
      - Add `.treasure-bundle-row` / `.credits-awarded-row` classes to the corresponding form-groups
      - Add Override Currency Input row and Override XP Input row (hidden by default)
      - Move Consume Replay above Notes
      - Remove the Advanced section
    - _Requirements: 1.5, 9.3_

- [ ] 4. Update override handlers for visibility toggle behavior
  - [~] 4.1 Update `handleOverrideXpChange()` in `handlers/override-handlers.ts`
    - Replace strikethrough logic with visibility toggle:
      - When checked: add `.override-hidden` to the Calculated XP Row, remove `.override-hidden` from the Override XP Row, enable the Override XP Input
      - When unchecked: remove `.override-hidden` from the Calculated XP Row, add `.override-hidden` to the Override XP Row (or ensure it's hidden), disable the Override XP Input, reset Override XP Input value to zero
    - Remove references to `CSS_CLASSES.STRIKETHROUGH_OVERRIDE`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [~] 4.2 Update `handleOverrideCurrencyChange()` in `handlers/override-handlers.ts`
    - Replace strikethrough logic with visibility toggle:
      - When checked: add `.override-hidden` to the Earned Income Section and Treasure Bundles Row (PF2e) or Credits Awarded Row (SF2e), remove `.override-hidden` from the Override Currency Row, enable the Override Currency Input, calculate and set default value (sum of treasure bundle value + earned income for PF2e, credits awarded for SF2e)
      - When unchecked: remove `.override-hidden` from the original rows, add `.override-hidden` to the Override Currency Row, disable the Override Currency Input, reset Override Currency Input value to zero
    - Add default value calculation logic: read treasure bundle display text and earned income hidden input value from DOM, parse numeric values, sum them
    - For Starfinder: read credits awarded display text, parse numeric value
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.8, 4.1, 4.2, 4.3, 4.4, 4.6, 4.8, 8.1, 8.2, 8.3, 8.4_

  - [~] 4.3 Update `initializeOverrideStates()` in `handlers/override-handlers.ts`
    - Update to apply visibility states instead of strikethrough on form load
    - Call the updated `handleOverrideXpChange` and `handleOverrideCurrencyChange` for each character, which now handle visibility toggling
    - Note: on form load, the default value calculation in `handleOverrideCurrencyChange` will overwrite saved override values. To preserve saved values on load, the initialization must set the saved value AFTER calling the handler, or the handler must be aware of the initialization context. The simplest approach: call the handler (which sets visibility correctly and calculates a default), then if saved data has a non-zero override value, overwrite the input with the saved value.
    - _Requirements: 7.4_

- [ ] 5. Update collapsible section handler
  - [~] 5.1 Remove `advanced-{characterId}` support from `handlers/collapsible-section-handlers.ts`
    - Update `isValidSectionId()` to no longer accept section IDs matching the `advanced-` prefix pattern
    - Update `initializeCollapseSections()` to no longer discover or initialize `advanced-*` sections
    - _Requirements: 6.2, 6.4_

- [ ] 6. Write tests for the redesigned override behavior
  - [~] 6.1 Write unit tests for updated `handleOverrideXpChange()`
    - Test checking Override XP hides Calculated XP Row and shows Override XP Input row
    - Test unchecking Override XP restores Calculated XP Row, hides Override XP Input row, and resets input value to zero
    - Test Override XP Input is enabled when checked, disabled when unchecked
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [~] 6.2 Write unit tests for updated `handleOverrideCurrencyChange()`
    - Test checking Override Currency (PF2e) hides Earned Income Section and Treasure Bundles Row, shows Override Currency Row
    - Test checking Override Currency (PF2e) sets default value to sum of treasure bundle value + earned income
    - Test unchecking Override Currency (PF2e) restores original rows, hides Override Currency Row, resets input to zero
    - Test checking Override Currency (SF2e) hides Credits Awarded Row, shows Override Currency Row
    - Test checking Override Currency (SF2e) sets default value to credits awarded value
    - Test unchecking Override Currency (SF2e) restores Credits Awarded Row, hides Override Currency Row, resets input to zero
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.8, 4.1, 4.2, 4.3, 4.4, 4.6, 4.8, 8.1, 8.2, 8.3_

  - [~] 6.3 Write unit tests for updated `initializeOverrideStates()`
    - Test initialization with XP override active applies correct visibility
    - Test initialization with Currency override active applies correct visibility
    - Test initialization with saved override values preserves the saved values (not overwritten by default calculation)
    - Test initialization with no overrides active leaves all original rows visible
    - _Requirements: 7.4_

  - [~] 6.4 Write unit tests for template structure changes
    - Test override checkbox column exists between portrait and fields in party member cards
    - Test override checkbox column exists in GM character card
    - Test Override XP Input has label "XP Earned" and override tooltip
    - Test Override Currency Input label is "GP Gained" (PF2e) / "Credits Gained" (SF2e)
    - Test Override Currency Input step is `0.01` (PF2e) / `1` (SF2e)
    - Test checkbox tooltips: "Override GP" (PF2e), "Override Credits" (SF2e), "Override XP"
    - Test Consume Replay is above Notes, not in a collapsible section
    - Test no Advanced section exists in character cards
    - Test `isValidSectionId` rejects `advanced-{characterId}` patterns
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.5, 2.6, 2.8, 3.5, 3.7, 4.5, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 9.3_

  - [~] 6.5 Write property test: XP override visibility toggle consistency
    - **Property 1: XP override visibility toggle is consistent with checkbox state**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**

  - [~] 6.6 Write property test: Currency override visibility toggle consistency (Pathfinder)
    - **Property 2: Currency override visibility toggle is consistent with checkbox state (Pathfinder)**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8**

  - [~] 6.7 Write property test: Currency override visibility toggle consistency (Starfinder)
    - **Property 3: Currency override visibility toggle is consistent with checkbox state (Starfinder)**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.8**

  - [~] 6.8 Write property test: Currency override default value equals sum of calculated values
    - **Property 4: Currency override default value equals sum of calculated values**
    - **Validates: Requirements 3.6, 8.1, 8.3, 8.4**

  - [~] 6.9 Write property test: Override state restoration on form load
    - **Property 5: Override state restoration on form load**
    - **Validates: Requirements 7.4**

  - [~] 6.10 Write property test: Per-character override independence
    - **Property 6: Per-character override independence**
    - **Validates: Requirements 9.1, 9.2**

- [~] 7. Checkpoint - Ensure all tests pass
  - Run the full test suite. Ensure all new and existing tests pass. Ask the user if questions arise.

- [ ] 8. Verify existing override logic is preserved
  - [~] 8.1 Run existing override-related tests to confirm no regressions
    - Run existing property tests and unit tests from the `gm-override-values` spec
    - Verify chronicle generation mapper tests still pass (override values used correctly)
    - Verify session report builder tests still pass (override values used correctly)
    - Verify form data extraction tests still pass (same name attributes)
    - _Requirements: 7.1, 7.2, 7.3_

- [~] 9. Commit implementation
  - Commit with message `feat: Redesign override UX with inline checkboxes and visibility toggle`
  - Stage all changed files: `templates/party-chronicle-filling.hbs`, `css/style.css`, `scripts/handlers/override-handlers.ts`, `scripts/constants/dom-selectors.ts`, `scripts/handlers/collapsible-section-handlers.ts`, test files, and updated spec task file

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- This is a UI/UX-only redesign — no changes to data model, chronicle generation, session reporting, or persistence
- The same `name` attributes are used for all override form fields, ensuring backward compatibility with saved data
- The `.strikethrough-override` CSS class is removed entirely and replaced with `.override-hidden` visibility toggling
- The Advanced collapsible section is removed from both party member and GM character cards
- Consume Replay moves to the main fields area above Notes
- The `advanced-{characterId}` pattern is removed from the collapsible section handler
- Git commits follow conventional commit format with signed commits (`git commit -S`)
- First commit is `docs:` with spec files per coding standards
- Task 4.3 (initializeOverrideStates) needs special care: the handler calculates a default value when checking, but on form load we need to preserve saved values. The handler should set visibility, then the initialization should overwrite the input with the saved value afterward.
