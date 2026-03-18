# Implementation Plan: Paizo Session Reporting

## Overview

Implement a "Copy Session Report" button for the Party Chronicle form that assembles session data into a JSON structure, base64-encodes it, and copies it to the clipboard for use with Paizo.com reporting browser plugins. This involves extending existing data types, adding new UI fields, creating a builder/serializer pipeline, and wiring everything together.

## Tasks

- [-] 1. Create feature branch and commit spec files
  - Create git branch `feat/paizo-session-reporting` from current HEAD
  - Stage and commit `requirements.md`, `design.md`, and `tasks.md` from `.kiro/specs/paizo-session-reporting/`
  - Use commit message: `docs: Add spec files for paizo-session-reporting feature`
  - _Requirements: N/A (project workflow)_

- [ ] 2. Define session report types and extend existing data models
  - [ ] 2.1 Create `scripts/model/session-report-types.ts` with `SessionReport`, `SignUp`, and `BonusRep` interfaces
    - `SessionReport` must include `gameDate`, `gameSystem` (literal `'PFS2E'`), `generateGmChronicle` (literal `false`), `gmOrgPlayNumber`, `repEarned` (literal `0`), `reportingA`–`reportingD`, `scenario`, `signUps`, `bonusRepEarned`
    - `SignUp` must include `isGM` (literal `false`), `orgPlayNumber`, `characterNumber`, `characterName`, `consumeReplay`, `repEarned`, `faction`
    - `BonusRep` must include `faction` (string) and `reputation` (number)
    - _Requirements: 4.1–4.11_
  - [ ] 2.2 Extend `SharedFields` in `scripts/model/party-chronicle-types.ts`
    - Add `reportingA`, `reportingB`, `reportingC`, `reportingD` (boolean) fields
    - Add `chosenFaction` (string) field for the faction abbreviation code
    - _Requirements: 10.1, 1.2_
  - [ ] 2.3 Extend `UniqueFields` in `scripts/model/party-chronicle-types.ts`
    - Add `consumeReplay` (boolean) field
    - _Requirements: 10.2, 3.2_
  - [ ] 2.4 Run lint and tests, then commit
    - Run `npm run lint` and `npx jest --silent` to verify no regressions
    - Commit message: `feat: Define session report types and extend data models`

- [ ] 3. Implement scenario identifier construction with tests
  - [ ] 3.1 Create `scripts/model/scenario-identifier.ts` with `buildScenarioIdentifier(layoutId: string): string`
    - Parse layout ID format `"pfs2.sN-MM"` to produce `"PFS2E N-MM"`
    - Handle edge cases (non-standard layout IDs) with a fallback
    - _Requirements: 5.1, 5.2, 4.8_
  - [ ] 3.2 Write property test for scenario identifier construction
    - Create `scripts/model/scenario-identifier.property.test.ts`
    - **Property 1: Scenario identifier construction**
    - **Validates: Requirements 5.1, 4.8**
  - [ ] 3.3 Write unit tests for scenario identifier edge cases
    - Create `scripts/model/scenario-identifier.test.ts`
    - Test specific layout ID examples: `"pfs2.s5-18"` → `"PFS2E 5-18"`, `"pfs2.s7-03"` → `"PFS2E 7-03"`
    - Test non-standard layout IDs (bounties, quests) and fallback behavior
    - _Requirements: 5.1, 5.2_
  - [ ] 3.4 Run lint and tests, then commit
    - Run `npm run lint` and `npx jest --silent` to verify all tests pass
    - Commit message: `feat: Implement scenario identifier construction`

- [ ] 4. Implement session report builder with tests
  - [ ] 4.1 Create `scripts/model/session-report-builder.ts` with `buildSessionReport(params: SessionReportBuildParams): SessionReport`
    - Define `SessionReportBuildParams` interface with `shared`, `characters`, `partyActors`, `layoutId`
    - Assemble constant fields (`gameSystem`, `generateGmChronicle`, `repEarned`)
    - Map `gameDate`, `gmOrgPlayNumber`, `reportingA`–`reportingD` from shared fields
    - Build `signUps` array from party actors and character data
    - Call `buildScenarioIdentifier` for the `scenario` field
    - Assemble `bonusRepEarned` from `reputationValues` excluding the chosen faction and zero values, using `FACTION_NAMES` for full names
    - _Requirements: 4.1–4.11, 9.1–9.6_
  - [ ] 4.2 Write property test for constant fields invariant
    - Add to `scripts/model/session-report-builder.property.test.ts`
    - **Property 2: Session report constant fields invariant**
    - **Validates: Requirements 4.3, 4.4, 4.6**
  - [ ] 4.3 Write property test for field mapping
    - Add to `scripts/model/session-report-builder.property.test.ts`
    - **Property 3: Session report field mapping**
    - **Validates: Requirements 4.2, 4.5, 4.7**
  - [ ] 4.4 Write property test for SignUp entry correctness
    - Add to `scripts/model/session-report-builder.property.test.ts`
    - **Property 4: SignUp entry correctness**
    - Use `fc.uniqueArray` with `selector` for generating party members with unique actor IDs
    - **Validates: Requirements 4.9, 4.10**
  - [ ] 4.5 Write property test for bonus reputation assembly
    - Add to `scripts/model/session-report-builder.property.test.ts`
    - **Property 5: Bonus reputation assembly**
    - **Validates: Requirements 4.11, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
  - [ ] 4.6 Run lint and tests, then commit
    - Run `npm run lint` and `npx jest --silent` to verify all tests pass
    - Commit message: `feat: Implement session report builder`

- [ ] 5. Implement session report serializer with tests
  - [ ] 5.1 Create `scripts/model/session-report-serializer.ts` with `serializeSessionReport(report: SessionReport, skipBase64?: boolean): string`
    - Serialize `SessionReport` to JSON string via `JSON.stringify`
    - Base64-encode via `btoa` unless `skipBase64` is true
    - _Requirements: 6.1, 6.2, 6.5_
  - [ ] 5.2 Write property test for serialization round-trip
    - Create `scripts/model/session-report-serializer.property.test.ts`
    - **Property 6: Serialization round-trip**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - [ ] 5.3 Run lint and tests, then commit
    - Run `npm run lint` and `npx jest --silent` to verify all tests pass
    - Commit message: `feat: Implement session report serializer`

- [ ] 6. Add session report validation with tests
  - [ ] 6.1 Add session-report-specific validation to `scripts/model/party-chronicle-validator.ts`
    - Create a new `validateSessionReportFields` function
    - Validate event date is populated, scenario is selected (layoutId not empty), GM PFS number is populated
    - Validate each party member has a faction value from actor data
    - Return `ValidationResult` with collected errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ] 6.2 Write property test for validation rejects missing required fields
    - Create `scripts/model/session-report-validation.property.test.ts`
    - **Property 7: Validation rejects missing required fields**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
  - [ ] 6.3 Run lint and tests, then commit
    - Run `npm run lint` and `npx jest --silent` to verify all tests pass
    - Commit message: `feat: Add session report validation`

- [ ] 7. Update DOM selectors and form data extraction
  - [ ] 7.1 Add new selectors to `scripts/constants/dom-selectors.ts`
    - Add selectors for reporting flag checkboxes (`#reportingA` through `#reportingD`)
    - Add selector for chosen faction dropdown (`#chosenFaction`)
    - Add selector for Copy Session Report button (`#copySessionReport`)
    - Add character-level selectors for consume replay checkbox and faction display
    - _Requirements: 1.2, 2.4, 3.1, 3.2_
  - [ ] 7.2 Extend `extractFormData` in `scripts/handlers/form-data-extraction.ts`
    - Extract reporting flag checkbox values (`reportingA`–`reportingD`) into shared fields
    - Extract chosen faction dropdown value into shared fields
    - Extract per-character consume replay checkbox value into unique fields
    - _Requirements: 10.3, 10.4_

- [ ] 8. Update Handlebars template for UI changes
  - [ ] 8.1 Rename "Event Details" section to "Session Reporting" in `templates/party-chronicle-filling.hbs`
    - Change section title text from "Event Details" to "Session Reporting"
    - Add four reporting flag checkboxes (A, B, C, D) at the bottom of the section
    - _Requirements: 1.1, 1.2_
  - [ ] 8.2 Add chosen faction dropdown to the Reputation section
    - Add a `<select>` for chosen faction with options mapping abbreviation codes to full names
    - _Requirements: 9.2_
  - [ ] 8.3 Create Actions section and reorganize buttons
    - Add a new "Actions" section above the "Character-Specific Information" section
    - Move Clear Data and Generate Chronicles buttons into the Actions section
    - Add Copy Session Report button to the Actions section
    - Remove buttons from the Character-Specific Information header
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 8.4 Add per-character faction display and consume replay checkbox
    - Display character faction as read-only text below the level text, read from actor data
    - Add "Consume Replay" checkbox per character
    - _Requirements: 3.1, 3.2_
  - [ ] 8.5 Run lint and tests, then commit
    - Run `npm run lint` and `npx jest --silent` to verify all tests pass
    - Commit message: `feat: Update UI for session reporting fields and actions section`

> **Visual checkpoint:** After task 8, open the Party Chronicle form in FoundryVTT and verify the renamed "Session Reporting" section, reporting flag checkboxes, chosen faction dropdown, Actions section with reorganized buttons, and per-character faction display and consume replay checkbox all render correctly.

- [ ] 9. Implement session report click handler and wire everything together
  - [ ] 9.1 Create `scripts/handlers/session-report-handler.ts`
    - Implement `handleCopySessionReport(container, partyActors, layoutId, event)` function
    - Orchestrate: validate → build → serialize → clipboard copy → notify
    - Detect Option/Alt key on click event to toggle `skipBase64`
    - Use `navigator.clipboard.writeText()` for clipboard write
    - Display success notification via `ui.notifications.info()` on success
    - Display error notification via `ui.notifications.error()` on clipboard failure
    - Display validation errors in the `#validationErrors` panel on validation failure
    - _Requirements: 4.1, 6.5, 7.1, 7.2, 7.3, 7.4, 8.5_
  - [ ] 9.2 Wire event listeners in `scripts/main.ts`
    - Attach click handler for Copy Session Report button
    - Attach change handlers for new fields (reporting flags, consume replay, chosen faction) to trigger auto-save
    - _Requirements: 1.3, 3.3, 10.3, 10.4_
  - [ ] 9.3 Update data persistence in `scripts/handlers/form-data-extraction.ts` and `scripts/model/party-chronicle-storage.ts`
    - Ensure new shared fields (reporting flags, chosen faction) are saved and restored
    - Ensure new unique field (consume replay) is saved and restored per character
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ] 9.4 Run lint and tests, then commit
    - Run `npm run lint` and `npx jest --silent` to verify all tests pass
    - Commit message: `feat: Implement session report handler and wire event listeners`

> **Visual checkpoint:** After task 9, do a full end-to-end test in FoundryVTT: fill in session data, click Copy Session Report, paste and decode the clipboard contents to verify the JSON structure is correct. Also test Option/Alt-click to confirm raw JSON (no base64) is copied.

## Notes

- Each task group ends with a lint/test/commit step to ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Jest, and fast-check for property-based testing
- All new modules follow the existing pattern of pure functions in `scripts/model/` and handlers in `scripts/handlers/`
