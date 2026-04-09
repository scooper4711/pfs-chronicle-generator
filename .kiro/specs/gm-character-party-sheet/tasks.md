# Implementation Plan: GM Character Party Sheet

## Overview

Add a GM Character drop zone and data entry section to the Society tab. The GM character integrates into all existing workflows (data entry, chronicle generation, session reporting) as a parallel data path alongside party members. Implementation follows the hybrid ApplicationV2 pattern: types first, then handlers, template, context preparation, and finally wiring into generation and reporting pipelines.

## Tasks

- [x] 1. Add GM character type definitions and DOM selectors
  - [x] 1.1 Extend SharedFields, PartyChronicleContext, and SignUp interfaces
    - Add `gmCharacterActorId?: string` to `SharedFields` in `model/party-chronicle-types.ts`
    - Add `gmCharacter: PartyMember | null` and `gmCharacterFields: UniqueFields | null` to `PartyChronicleContext` in `model/party-chronicle-types.ts`
    - Change `isGM: false` to `isGM: boolean` in `SignUp` interface in `model/session-report-types.ts`
    - _Requirements: 1.1, 2.1, 6.2, 8.1_

  - [x] 1.2 Add GM character DOM selectors to `constants/dom-selectors.ts`
    - Add `GM_CHARACTER_SELECTORS` constant with `DROP_ZONE`, `SECTION`, `CLEAR_BUTTON`, `ACTOR_ID_INPUT` selectors
    - _Requirements: 1.1, 3.1_

  - [x] 1.3 Write property tests for PFS ID validation (Properties 7, 8)
    - **Property 7: PFS ID mismatch produces descriptive validation error**
    - **Property 8: Matching PFS IDs produce no mismatch error**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 2. Implement GM character handler module
  - [x] 2.1 Create `handlers/gm-character-handlers.ts` with drop validation and clear logic
    - Implement `handleGmCharacterDrop()`: parse `event.dataTransfer` JSON, resolve actor via `fromUuid()`, validate actor type is `character`, validate actor is not already a party member, save `gmCharacterActorId` and default `UniqueFields` to storage, re-render form
    - Implement `handleGmCharacterClear()`: remove `gmCharacterActorId` from shared data, remove GM character entry from `characters` map, save to storage, re-render form
    - Implement `validateGmCharacterPfsId()`: compare actor's `playerNumber` to `gmPfsNumber`, return descriptive error string or null
    - _Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3_

  - [x] 2.2 Write property tests for drop validation (Properties 1, 2, 3)
    - **Property 1: Valid character drop assigns GM character**
    - **Property 2: Non-character actor drop is rejected**
    - **Property 3: Party member actor drop is rejected**
    - **Validates: Requirements 1.3, 1.4, 1.5, 3.3**

  - [x] 2.3 Write property test for clear removes all GM character data (Property 4)
    - **Property 4: Clear removes all GM character data**
    - **Validates: Requirements 3.4**

  - [x] 2.4 Write unit tests for `gm-character-handlers.ts`
    - Test drop of valid character actor assigns GM character
    - Test drop of familiar/NPC/vehicle is rejected with notification
    - Test drop of existing party member is rejected with notification
    - Test drop with unparseable dataTransfer is silently ignored
    - Test clear button removes assignment and clears stored data
    - Test replace: dropping new actor onto occupied section replaces current GM character
    - _Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4_

- [x] 3. Checkpoint - Ensure all tests pass and commit
  - Ensure all tests pass, ask the user if questions arise.
  - Run `git add -A && git commit -S -m "feat: add GM character types, selectors, handlers, and tests"` to commit the type definitions, handler module, and associated tests as one cohesive unit.

- [x] 4. Add GM character section to Handlebars template and CSS
  - [x] 4.1 Add GM character drop zone and character section to `templates/party-chronicle-filling.hbs`
    - Add GM Character Drop Zone above the `{{#each partyMembers}}` loop with placeholder text when `gmCharacter` is null
    - When `gmCharacter` is not null, render the GM character section with portrait, name, Society ID, level, faction, and all data entry fields (task level, success level, proficiency rank, earned income, gold spent, notes, consume replay) using the same field structure as party member sections
    - Add a "GM Credit" label and a clear button (`#clearGmCharacter`) in the GM character section header
    - Add hidden input `#gmCharacterActorId` to persist the actor ID in the form
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1_

  - [x] 4.2 Add GM character CSS styles to `css/style.css`
    - Add distinct background color or border style for the GM character section (`.gm-character-section`)
    - Style the drop zone with dashed border and hover/dragover visual feedback
    - Style the "GM Credit" label badge
    - _Requirements: 2.2_

- [x] 5. Integrate GM character into context preparation and form data extraction
  - [x] 5.1 Extend `PartyChronicleApp._prepareContext()` to resolve GM character
    - Read `gmCharacterActorId` from saved shared fields
    - Resolve actor via `game.actors.get(gmCharacterActorId)`
    - If actor exists and `type === 'character'`, populate `gmCharacter` (PartyMember) and `gmCharacterFields` (UniqueFields from `savedData.characters[actorId]`) in context
    - If actor cannot be resolved, clear `gmCharacterActorId` from saved data and set `gmCharacter` to null
    - _Requirements: 4.4, 8.1, 8.2, 8.3_

  - [x] 5.2 Extend `extractFormData()` in `handlers/form-data-extraction.ts` to include GM character
    - Read `gmCharacterActorId` from the hidden input `#gmCharacterActorId`
    - If present, extract the GM character's unique fields from the DOM using the same field patterns as party members
    - Store `gmCharacterActorId` in `shared` and GM character fields in `characters[gmActorId]`
    - _Requirements: 4.3, 8.1_

  - [x] 5.3 Extend `mapPartyFieldsToContext()` in `PartyChronicleApp.ts` to include `gmCharacterActorId`
    - Map `savedData.shared.gmCharacterActorId` to the shared context fields
    - _Requirements: 8.1, 8.2_

  - [x] 5.4 Write property test for GM character data persistence round-trip (Property 5)
    - **Property 5: GM character data persistence round-trip**
    - **Validates: Requirements 4.4, 8.1, 8.2**

  - [x] 5.5 Write property test for stale actor ID handling (Property 9)
    - **Property 9: Stale GM character actor ID is gracefully cleared**
    - **Validates: Requirements 8.3**

- [x] 6. Checkpoint - Ensure all tests pass and commit
  - Ensure all tests pass, ask the user if questions arise.
  - Run `git add -A && git commit -S -m "feat: add GM character UI, context preparation, and form data extraction"` to commit the template, CSS, context preparation, form data extraction, and associated tests.

- [x] 7. Wire GM character event listeners in main.ts
  - [x] 7.1 Attach GM character event listeners in `main.ts` `attachEventListeners()`
    - Attach `dragover` and `drop` listeners on the GM Character Drop Zone, delegating to `handleGmCharacterDrop()`
    - Attach click listener on `#clearGmCharacter` button, delegating to `handleGmCharacterClear()`
    - Attach change listeners on GM character form fields for auto-save (same pattern as party member fields)
    - Attach earned income, treasure bundle, and downtime display update listeners for the GM character fields
    - _Requirements: 1.3, 3.1, 3.2, 3.3, 4.2, 4.3_

  - [x] 7.2 Write unit tests for GM character event listener wiring
    - Test drop zone accepts dragover and drop events
    - Test clear button click triggers handler
    - Test GM character field changes trigger auto-save
    - _Requirements: 1.3, 3.1, 4.3_

- [x] 8. Integrate GM character into chronicle generation pipeline
  - [x] 8.1 Extend `processAllPartyMembers()` in `handlers/chronicle-generation.ts` to include GM character
    - Accept optional GM character actor parameter
    - If GM character is present, include it in the generation loop alongside party actors
    - Generate PDF for GM character using the same pipeline (validate, map, render, archive)
    - Save GM character's chronicle PDF to the GM character actor's flags
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.2 Extend `validateAllCharacterFields()` in `handlers/chronicle-generation.ts` to validate GM character
    - Include GM character's unique fields in validation
    - Add PFS ID mismatch validation using `validateGmCharacterPfsId()`
    - _Requirements: 5.5, 7.1, 7.4_

  - [x] 8.3 Extend `generateChroniclesFromPartyData()` to resolve and pass GM character actor
    - Read `gmCharacterActorId` from form data shared fields
    - Resolve actor via `game.actors.get()`
    - Pass resolved actor to `processAllPartyMembers()` and `validateAllCharacterFields()`
    - Include GM character in chat notification listing
    - _Requirements: 5.1, 5.4_

  - [x] 8.4 Write unit tests for GM character chronicle generation
    - Test GM character PDF is generated alongside party member PDFs
    - Test GM character PDF is included in zip archive
    - Test GM character is included in chat notification
    - Test validation errors for GM character are reported
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Integrate GM character into session reporting
  - [x] 9.1 Extend `buildSessionReport()` in `model/session-report-builder.ts` to include GM character SignUp
    - Accept optional GM character actor and UniqueFields in `SessionReportBuildParams`
    - If GM character is present, build a `SignUp` entry with `isGM: true` and append to `signUps` array
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Extend `handleCopySessionReport()` in `handlers/session-report-handler.ts` to pass GM character
    - Resolve GM character actor from form data `gmCharacterActorId`
    - Pass GM character actor and its UniqueFields to `buildSessionReport()`
    - Include PFS ID mismatch validation in session report validation
    - _Requirements: 6.1, 7.4_

  - [x] 9.3 Write property test for GM character session report SignUp (Property 6)
    - **Property 6: GM character session report SignUp correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 9.4 Write unit tests for GM character session reporting
    - Test session report includes GM character SignUp with `isGM: true`
    - Test GM character SignUp has correct orgPlayNumber, characterNumber, characterName, faction, repEarned, consumeReplay
    - Test session report without GM character has no `isGM: true` entries
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 10. Integrate GM character into Clear Data flow
  - [x] 10.1 Extend clear button handler in `event-listener-helpers.ts` to clear GM character data
    - In `handleClearButtonConfirmed()`, ensure `gmCharacterActorId` is removed from the new default data
    - Ensure the GM character's entry is not included in `buildDefaultCharacterFields()` output
    - _Requirements: 3.4, 8.4_

  - [x] 10.2 Write unit tests for Clear Data with GM character
    - Test Clear Data removes GM character assignment
    - Test Clear Data removes GM character from characters map
    - Test form re-renders with empty drop zone after clear
    - _Requirements: 3.4, 8.4_

- [-] 11. Final checkpoint - Ensure all tests pass and commit
  - Ensure all tests pass, ask the user if questions arise.
  - Run `git add -A && git commit -S -m "feat: integrate GM character into event listeners, generation, reporting, and clear data"` to commit the event listener wiring, chronicle generation, session reporting, clear data integration, and associated tests.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows the hybrid ApplicationV2 pattern: context in `PartyChronicleApp`, rendering via Handlebars, event listeners in `main.ts`
- All GM character logic reuses existing field rendering, calculation, and validation functions — no duplication of business logic
