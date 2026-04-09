# Requirements Document

## Introduction

The PFS Chronicle Generator currently generates chronicles only for party member actors on the party sheet. GMs who play a character for GM credit during Pathfinder Society sessions have no way to include their own character in the chronicle generation or session reporting workflow. This feature adds a dedicated GM Character area to the party sheet's Society tab where the GM can drag and drop an actor to represent their GM credit character. The GM character participates in all existing workflows (data entry, chronicle generation, session reporting) and is validated against the GM PFS ID entered in the session info section.

## Glossary

- **Party_Sheet**: The PF2e party sheet rendered by Foundry VTT, into which the module injects the Society tab containing the chronicle form.
- **Society_Tab**: The GM-only tab injected into the Party_Sheet by the module, containing the chronicle generation form.
- **GM_Character_Drop_Zone**: A dedicated drag-and-drop target area at the top of the character list in the Society_Tab where the GM drops an actor to designate it as the GM credit character.
- **GM_Character**: The actor dropped into the GM_Character_Drop_Zone, representing the GM's character for GM credit during PFS reporting.
- **Party_Actor**: A character actor that is a member of the Foundry VTT party. Defined by the `PartyActor` interface in `event-listener-helpers.ts`.
- **Chronicle_Generator**: The module's PDF generation pipeline that produces filled chronicle sheets for each character.
- **Session_Report_Builder**: The module component that assembles the JSON session report payload for Paizo.com reporting via the RPG Chronicles browser plugin.
- **Validation_Display**: The module component that renders inline validation errors on the form and manages the error panel.
- **PFS_ID**: The Paizo Organized Play player number stored on an actor at `actor.system.pfs.playerNumber`.
- **GM_PFS_Number**: The GM's PFS number entered in the Session Reporting section of the shared fields, stored as `shared.gmPfsNumber`.

## Requirements

### Requirement 1: GM Character Drop Zone

**User Story:** As a GM, I want a dedicated drop zone at the top of the player list on the party sheet, so that I can drag and drop an actor to designate my GM credit character.

#### Acceptance Criteria

1. THE Society_Tab SHALL display a GM_Character_Drop_Zone above the list of Party_Actor character sections
2. WHILE no GM_Character is assigned, THE GM_Character_Drop_Zone SHALL display placeholder text indicating the GM can drop an actor to assign a GM credit character
3. WHEN the GM drags a Foundry actor onto the GM_Character_Drop_Zone, THE Society_Tab SHALL accept the drop and assign that actor as the GM_Character
4. WHEN the GM drags a non-character actor (familiar, NPC, vehicle) onto the GM_Character_Drop_Zone, THE Society_Tab SHALL reject the drop and display a notification explaining only character actors are accepted
5. WHEN the GM drops an actor that is already in the party member list onto the GM_Character_Drop_Zone, THE Society_Tab SHALL reject the drop and display a notification explaining the actor is already a party member

### Requirement 2: GM Character Visual Display

**User Story:** As a GM, I want the GM character area to be visually distinct from the regular party member list, so that I can clearly identify which character is the GM credit character.

#### Acceptance Criteria

1. WHEN a GM_Character is assigned, THE GM_Character_Drop_Zone SHALL display the GM_Character's portrait, name, Society ID, level, and faction using the same layout as Party_Actor character sections
2. THE GM_Character section SHALL be visually distinct from Party_Actor sections through a different background color or border style and a "GM Credit" label
3. THE GM_Character section SHALL include all the same data entry fields as Party_Actor sections (task level, success level, proficiency rank, earned income, gold spent, notes, consume replay)

### Requirement 3: GM Character Management

**User Story:** As a GM, I want to clear or replace the GM character, so that I can correct mistakes or change my GM credit character.

#### Acceptance Criteria

1. WHEN a GM_Character is assigned, THE GM_Character section SHALL display a clear button that removes the GM_Character assignment
2. WHEN the GM clicks the clear button, THE Society_Tab SHALL remove the GM_Character and return the GM_Character_Drop_Zone to its empty placeholder state
3. WHEN the GM drags a new actor onto an occupied GM_Character section, THE Society_Tab SHALL replace the current GM_Character with the new actor
4. WHEN the GM_Character is cleared, THE Society_Tab SHALL remove the GM_Character's form data from the saved party chronicle data

### Requirement 4: GM Character Data Entry

**User Story:** As a GM, I want the GM character to behave like other party members for data entry, so that I can configure earned income, gold spent, and notes for my GM credit character.

#### Acceptance Criteria

1. THE GM_Character section SHALL receive all shared reward settings (XP earned, treasure bundles, downtime days, reputation) identically to Party_Actor sections
2. WHEN the GM changes the task level, success level, or proficiency rank for the GM_Character, THE Society_Tab SHALL calculate and display earned income using the same formula as Party_Actor sections
3. WHEN the GM changes any form field, THE Society_Tab SHALL auto-save the GM_Character's data to Foundry world settings alongside the Party_Actor data
4. WHEN the form is loaded with previously saved data that includes a GM_Character, THE Society_Tab SHALL restore the GM_Character assignment and all associated field values

### Requirement 5: GM Character Chronicle Generation

**User Story:** As a GM, I want the Generate Chronicles button to also generate a chronicle for my GM character, so that I receive a filled chronicle sheet for GM credit.

#### Acceptance Criteria

1. WHEN the GM clicks the Generate Chronicles button, THE Chronicle_Generator SHALL generate a PDF chronicle for the GM_Character in addition to all Party_Actor chronicles
2. THE Chronicle_Generator SHALL include the GM_Character's PDF in the zip archive alongside Party_Actor PDFs
3. THE Chronicle_Generator SHALL save the GM_Character's chronicle PDF to the GM_Character actor's flags using the same flag structure as Party_Actor chronicles
4. THE Chronicle_Generator SHALL include the GM_Character in the chat notification listing characters that received chronicles
5. WHEN the GM_Character has validation errors, THE Chronicle_Generator SHALL report those errors using the same validation display as Party_Actor errors

### Requirement 6: GM Character Session Reporting

**User Story:** As a GM, I want the GM character to be included in the session report data structure and identified as a GM character, so that Paizo.com session reporting correctly records my GM credit.

#### Acceptance Criteria

1. WHEN the GM clicks Copy Session Report, THE Session_Report_Builder SHALL include the GM_Character in the signUps array of the session report
2. THE GM_Character's SignUp entry SHALL have its `isGM` field set to `true` to distinguish the GM_Character from regular Party_Actor sign-ups
3. THE Session_Report_Builder SHALL populate the GM_Character's SignUp entry with the same fields as Party_Actor entries (orgPlayNumber, characterNumber, characterName, consumeReplay, repEarned, faction)

### Requirement 7: GM Character PFS ID Validation

**User Story:** As a GM, I want the module to validate that my GM character's PFS ID matches the GM PFS Number in the session info, so that I am alerted to mismatches before generating chronicles or session reports.

#### Acceptance Criteria

1. WHEN a GM_Character is assigned and the GM_Character's PFS_ID does not match the GM_PFS_Number in the shared fields, THE Validation_Display SHALL display a validation error indicating the mismatch
2. THE validation error message SHALL identify both the GM_Character's PFS_ID and the expected GM_PFS_Number so the GM can determine which value to correct
3. WHEN the GM corrects either the GM_Character's PFS_ID (on the actor sheet) or the GM_PFS_Number (in the session info), THE Validation_Display SHALL clear the mismatch error on the next validation pass
4. THE PFS_ID mismatch validation SHALL run during both chronicle generation validation and session report validation

### Requirement 8: GM Character Persistence

**User Story:** As a GM, I want the GM character assignment to persist across form reloads, so that I do not have to re-assign the GM character every time the party sheet is opened.

#### Acceptance Criteria

1. WHEN a GM_Character is assigned, THE Society_Tab SHALL persist the GM_Character's actor ID in the party chronicle data stored in Foundry world settings
2. WHEN the Society_Tab is rendered and saved data contains a GM_Character actor ID, THE Society_Tab SHALL resolve the actor and restore the GM_Character section
3. IF the saved GM_Character actor ID cannot be resolved (actor deleted or unavailable), THEN THE Society_Tab SHALL clear the GM_Character assignment and display the empty drop zone
4. WHEN the Clear Data button is pressed, THE Society_Tab SHALL clear the GM_Character assignment along with all other form data
