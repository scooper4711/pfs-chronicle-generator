# Implementation Plan: GM Override Values

## Overview

Add override controls for XP and currency values to each character card in the Society tab. The implementation extends the existing per-character data model with four new fields, introduces a new `override-handlers.ts` module for checkbox toggle logic, relocates the Consume Replay checkbox into a new collapsible "Advanced" section, and integrates override-aware logic into the chronicle generation and session report pipelines. All changes follow the hybrid ApplicationV2 pattern and reuse the existing collapsible section infrastructure.

## Tasks

- [ ] 1. Initial spec commit
  - [x] 1.1 Create feature branch `feat/gm-override-values` from current branch
  - [-] 1.2 Commit spec files with message `docs: Add gm-override-values spec`
    - Stage `.kiro/specs/gm-override-values/requirements.md`, `.kiro/specs/gm-override-values/design.md`, `.kiro/specs/gm-override-values/tasks.md`, `.kiro/specs/gm-override-values/.config.kiro`

- [ ] 2. Extend data model and DOM selectors for override fields
  - [~] 2.1 Add override fields to `UniqueFields` interface in `model/party-chronicle-types.ts`
    - Add `overrideXp: boolean`, `overrideXpValue: number`, `overrideCurrency: boolean`, `overrideCurrencyValue: number` to the `UniqueFields` interface
    - _Requirements: 3.1, 3.2, 4.1, 4.4, 8.1, 8.2_

  - [~] 2.2 Add override DOM selectors to `constants/dom-selectors.ts`
    - Add character field selectors: `OVERRIDE_XP`, `OVERRIDE_XP_VALUE`, `OVERRIDE_CURRENCY`, `OVERRIDE_CURRENCY_VALUE`, `CALCULATED_XP_LABEL`, `CALCULATED_CURRENCY_LABEL`, `EARNED_INCOME_LABEL` as functions of `characterId`
    - Add character field patterns: `OVERRIDE_XP_ALL`, `OVERRIDE_CURRENCY_ALL` for `querySelectorAll`
    - Add `STRIKETHROUGH_OVERRIDE` to `CSS_CLASSES`
    - _Requirements: 3.1, 3.2, 4.1, 4.4_

  - [~] 2.3 Add `.strikethrough-override` CSS class to `css/style.css`
    - Add a `.strikethrough-override` class with `text-decoration: line-through` styling
    - _Requirements: 3.5, 3.6, 4.7, 4.8_

  - [~] 2.4 Extend `buildDefaultCharacterFields()` in `handlers/event-listener-helpers.ts`
    - Add `overrideXp: false`, `overrideXpValue: 0`, `overrideCurrency: false`, `overrideCurrencyValue: 0` to the default character fields object
    - _Requirements: 6.3_

- [ ] 3. Create override handler module and tests
  - [~] 3.1 Create `handlers/override-handlers.ts` with checkbox toggle and initialization logic
    - Implement `handleOverrideXpChange(characterId, container)`: toggle Override_XP_Input disabled state, toggle `.strikethrough-override` on Calculated_XP_Label, trigger auto-save via `handleFieldChange`
    - Implement `handleOverrideCurrencyChange(characterId, container)`: toggle Override_Currency_Input disabled state, toggle `.strikethrough-override` on Calculated_Currency_Label and Earned_Income_Label, trigger auto-save
    - Implement `initializeOverrideStates(container)`: read all override checkboxes, apply correct disabled/enabled and strikethrough states from saved data on form load
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 4.5, 4.6, 4.7, 4.8, 6.2_

  - [ ]* 3.2 Write property test: XP override checkbox controls input state and strikethrough
    - **Property 1: XP override checkbox controls input state and strikethrough**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6**

  - [ ]* 3.3 Write property test: Currency override checkbox controls input state and strikethrough
    - **Property 2: Currency override checkbox controls input state and strikethrough**
    - **Validates: Requirements 4.5, 4.6, 4.7, 4.8**

  - [~] 3.4 Write unit tests for `handlers/override-handlers.ts`
    - Test `handleOverrideXpChange` enables input and adds strikethrough when checked
    - Test `handleOverrideXpChange` disables input and removes strikethrough when unchecked
    - Test `handleOverrideCurrencyChange` enables input and adds strikethrough to currency label and earned income label when checked
    - Test `handleOverrideCurrencyChange` disables input and removes strikethrough when unchecked
    - Test `initializeOverrideStates` applies correct states from saved data
    - Test override controls are independent per character
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 4.5, 4.6, 4.7, 4.8, 6.2, 8.1, 8.2_

- [~] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 5. Commit override handler module
  - Commit with message `feat: Add override handler module with data model and selectors`
  - Stage all files changed in tasks 2 and 3 plus updated spec task file

- [ ] 6. Add Advanced section to template and extend collapsible handler
  - [~] 6.1 Add Advanced collapsible section to each character card in `templates/party-chronicle-filling.hbs`
    - Add an Advanced collapsible section (`data-section-id="advanced-{{this.id}}"`) within each party member's `character-fields` div, containing:
      - Relocated Consume Replay checkbox (remove from current position, place inside Advanced section) retaining existing `name` attribute format and tooltip
      - Override XP checkbox (`name="characters.{{this.id}}.overrideXp"`) and numeric input (`name="characters.{{this.id}}.overrideXpValue"`, `min="0"`, `step="1"`, `disabled`)
      - Override Currency checkbox (`name="characters.{{this.id}}.overrideCurrency"`) with system-aware label ("Override GP Gained" for PF2e, "Override Credits Gained" for SF2e) and numeric input (`name="characters.{{this.id}}.overrideCurrencyValue"`, `min="0"`, system-aware `step`, `disabled`)
    - Add the same Advanced section to the GM character card section
    - Add `calculated-xp-label` CSS class to the XP display element on each character card
    - Add `calculated-currency-label` CSS class to the treasure bundle value / credits awarded display element on each character card
    - Add `earned-income-label` CSS class to the "Earned Income" label element on each character card
    - Restore saved override checkbox states and input values from `savedData.characters` / `gmCharacterFields`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.7, 4.1, 4.2, 4.3, 4.4, 4.9, 8.4_

  - [~] 6.2 Extend collapsible section handler to support dynamic Advanced section IDs
    - Update `isValidSectionId()` in `handlers/collapsible-section-handlers.ts` to accept section IDs matching the `advanced-` prefix pattern in addition to existing static IDs
    - Update `initializeCollapseSections()` to discover and initialize `advanced-*` sections from the DOM (default state: collapsed)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [~] 6.3 Write unit tests for Advanced section template rendering and collapsible handler
    - Test Advanced section renders within each character card (party member and GM character)
    - Test Advanced section has title "Advanced" and is collapsed by default
    - Test Consume Replay checkbox is inside Advanced section with correct `name` attribute
    - Test Override XP checkbox and input render with correct attributes
    - Test Override Currency label is system-aware ("Override GP Gained" vs "Override Credits Gained")
    - Test Override Currency input step is `0.01` for Pathfinder and `1` for Starfinder
    - Test `isValidSectionId` accepts `advanced-{characterId}` patterns
    - Test `initializeCollapseSections` initializes Advanced sections as collapsed
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2, 3.1, 3.2, 3.7, 4.2, 4.3, 4.9, 8.4_

- [~] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 8. Commit Advanced section and collapsible handler
  - Commit with message `feat: Add Advanced collapsible section with override UI controls`
  - Stage all files changed in task 6 plus updated spec task file

- [ ] 9. Extend form data extraction and persistence
  - [~] 9.1 Extend `extractFormData()` in `handlers/form-data-extraction.ts` to read override fields
    - Read `overrideXp` checkbox checked state from `input[name="characters.{id}.overrideXp"]`
    - Read `overrideXpValue` numeric value from `input[name="characters.{id}.overrideXpValue"]`
    - Read `overrideCurrency` checkbox checked state from `input[name="characters.{id}.overrideCurrency"]`
    - Read `overrideCurrencyValue` numeric value from `input[name="characters.{id}.overrideCurrencyValue"]`
    - Use `|| false` for checkboxes and `|| 0` for numeric values as safe defaults for migration
    - _Requirements: 6.1, 6.2_

  - [ ]* 9.2 Write property test: Override data persistence round-trip
    - **Property 5: Override data persistence round-trip**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.3 Write property test: Clear resets all overrides
    - **Property 6: Clear resets all overrides**
    - **Validates: Requirements 6.3**

  - [ ]* 9.4 Write property test: Per-character override independence
    - **Property 8: Per-character override independence**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 10. Extend chronicle generation mapper for override-aware values
  - [~] 10.1 Extend `mapToCharacterData()` in `model/party-chronicle-mapper.ts`
    - When `unique.overrideXp === true`: set `xp_gained = unique.overrideXpValue` instead of `shared.xpEarned`
    - When `unique.overrideCurrency === true`: set `currency_gained = unique.overrideCurrencyValue` instead of the calculated `treasureBundleValue + earnedIncome`
    - When overrides are not active, use the existing calculated values unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 10.2 Write property test: XP override in chronicle generation
    - **Property 3: XP override in chronicle generation**
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 10.3 Write property test: Currency override in chronicle generation
    - **Property 4: Currency override in chronicle generation**
    - **Validates: Requirements 5.2, 5.4**

  - [~] 10.4 Write unit tests for override-aware `mapToCharacterData()`
    - Test XP override active: `xp_gained` equals `overrideXpValue` (including zero)
    - Test XP override inactive: `xp_gained` equals `shared.xpEarned`
    - Test currency override active: `currency_gained` equals `overrideCurrencyValue` (including zero)
    - Test currency override inactive: `currency_gained` equals calculated value
    - Test both overrides active simultaneously
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Extend session report builder for override-aware values
  - [~] 11.1 Extend `buildSessionReport()` in `model/session-report-builder.ts`
    - Extend `buildSignUp` and `buildGmSignUp` to accept override fields from `UniqueFields`
    - When `overrideXp` is true, use `overrideXpValue` as the XP for that character in the session report
    - When `overrideCurrency` is true, use `overrideCurrencyValue` as the currency for that character in the session report
    - When overrides are not active, use the standard calculated values
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 11.2 Write property test: Override values in session report
    - **Property 7: Override values in session report**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [~] 11.3 Write unit tests for override-aware session report
    - Test session report uses override XP when active
    - Test session report uses override currency when active
    - Test session report uses calculated values when overrides are inactive
    - Test GM character override values in session report
    - _Requirements: 7.1, 7.2, 7.3_

- [~] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 13. Commit extraction, generation, and session report changes
  - Commit with message `feat: Add override-aware chronicle generation and session reporting`
  - Stage all files changed in tasks 9, 10, and 11 plus updated spec task file

- [ ] 14. Wire override event listeners into main.ts
  - [~] 14.1 Extend `attachEventListeners()` in `main.ts`
    - Import `handleOverrideXpChange`, `handleOverrideCurrencyChange`, and `initializeOverrideStates` from `handlers/override-handlers.ts`
    - Create and export `attachOverrideListeners(container)` in `handlers/event-listener-helpers.ts` that attaches change listeners to all override XP and currency checkboxes using `CHARACTER_FIELD_PATTERNS.OVERRIDE_XP_ALL` and `CHARACTER_FIELD_PATTERNS.OVERRIDE_CURRENCY_ALL`
    - Call `attachOverrideListeners(container)` from `attachEventListeners()` in `main.ts`
    - _Requirements: 1.4, 1.5, 3.3, 3.4, 4.5, 4.6_

  - [~] 14.2 Extend `initializeForm()` in `main.ts`
    - Call `initializeOverrideStates(container)` after `initializeCollapseSections(container)` to restore override checkbox states, input values, disabled states, and strikethrough styling from saved data on form load
    - _Requirements: 6.2_

- [~] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 16. Commit event listener wiring
  - Commit with message `feat: Wire override event listeners and form initialization`
  - Stage all files changed in task 14 plus updated spec task file

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, matching the existing codebase
- Override fields are stored in `UniqueFields` (per-character), not `SharedFields`
- The Advanced section reuses the existing `Collapsible_Section_Handler` infrastructure with dynamic `advanced-{characterId}` section IDs
- Consume Replay relocation is a template-only change — no logic changes needed
- Git commits follow conventional commit format with signed commits (`git commit -S`)
- First commit is `docs:` with spec files per coding standards
- Subsequent commits bundle implementation + tests as coherent units at each checkpoint
