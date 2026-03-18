# Requirements Document

## Introduction

This feature adds a "Copy Session Report" button to the Party Chronicle form that assembles session data into a JSON structure, base64-encodes it, and copies it to the clipboard. The JSON payload is designed for reporting the session to Paizo.com. The base64-encoded data is consumed by browser plugins that automate the Paizo reporting form. Implementing this feature requires renaming the existing "Event Details" collapsible section to "Session Reporting", adding new input fields (per-character consume replay flag and reporting flag checkboxes), displaying each character's faction as read-only text from the character sheet, reorganizing action buttons, and introducing a new data assembly and serialization pipeline.

The feature reuses existing form data (GM PFS number, event date, scenario selection, character names, society IDs, reputation values, character factions) and supplements it with new fields specific to Paizo session reporting. Each player's repEarned value comes from the shared "Reputation, Chosen Faction" field. The bonusRepEarned array is assembled at the session level from non-zero reputation values for factions other than the chosen faction. The scenario value in the JSON is constructed from the existing scenario selector rather than entered manually. The JSON structure is assembled at button-click time from current form state, serialized, base64-encoded, and placed in the clipboard.

## Glossary

- **Session_Report**: The JSON data structure assembled for reporting a session to Paizo.com
- **Session_Report_Builder**: The module that assembles form data into the Session_Report JSON structure
- **Session_Report_Serializer**: The module that serializes the Session_Report to a JSON string and base64-encodes it
- **Actions_Section**: A new section positioned above the "Character-Specific Information" section, containing all action buttons (Clear Data, Generate Chronicles, Copy Session Report)
- **Copy_Report_Button**: The UI button that triggers Session_Report assembly, encoding, and clipboard copy
- **Party_Chronicle_Form**: The existing form in the PFS party sheet's "Society" tab
- **Session_Reporting_Section**: The existing "Event Details" collapsible section, renamed to "Session Reporting"
- **Game_Date**: The existing "Event Date" field (mapped to gameDate in the JSON), an ISO 8601 date string
- **Game_System**: Constant string "PFS2E" identifying the Pathfinder Society 2nd Edition game system
- **Scenario_Identifier**: A string identifying the scenario played, constructed from the existing scenario selector (e.g., "PFS2E 5-18")
- **Org_Play_Number**: A player's or GM's Paizo organized play number (personally identifying information)
- **Character_Number**: The numeric identifier for a specific character under a player's org play number
- **Sign_Up**: A single player entry in the session report containing character and reporting details
- **Bonus_Rep**: An array of faction/reputation pairs representing bonus reputation earned beyond the base
- **Reporting_Flag**: One of four boolean flags (A through D) indicating reporting conditions, displayed as checkboxes labeled "A", "B", "C", "D"
- **Consume_Replay**: A boolean flag indicating whether a player is consuming a replay for this session
- **Faction**: A Pathfinder Society faction (Envoy's Alliance, Grand Archive, Horizon Hunters, Vigilant Seal, Radiant Oath, Verdant Wheel), read from the character sheet (actor.system.pfs.currentFaction) and displayed as read-only text

## Requirements

### Requirement 1: Rename Event Details Section and Add New Shared Fields

**User Story:** As a GM, I want the existing Event Details section renamed to Session Reporting and supplemented with new reporting fields, so that I can provide the data needed for Paizo session reporting without duplicating existing fields.

#### Acceptance Criteria

1. THE Party_Chronicle_Form SHALL rename the existing "Event Details" collapsible section to "Session Reporting"
2. THE Session_Reporting_Section SHALL contain four checkboxes labeled "A", "B", "C", and "D" at the bottom of the section for the Reporting_Flag values (reportingA through reportingD), each defaulting to unchecked
3. WHEN a Session Reporting field changes, THE Party_Chronicle_Form SHALL auto-save the data

### Requirement 2: Actions Section and Button Reorganization

**User Story:** As a GM, I want all action buttons grouped together in one place above the character list, so that I can easily find and use them.

#### Acceptance Criteria

1. THE Party_Chronicle_Form SHALL display a new "Actions" section positioned above the "Character-Specific Information" section
2. THE Actions_Section SHALL contain the existing "Clear Data" button (moved from the Character-Specific Information header)
3. THE Actions_Section SHALL contain the existing "Generate Chronicles" button (moved from the Character-Specific Information header)
4. THE Actions_Section SHALL contain the Copy_Report_Button labeled "Copy Session Report"
5. THE "Character-Specific Information" header SHALL no longer contain the Clear Data or Generate Chronicles buttons

### Requirement 3: New Per-Character Input Fields

**User Story:** As a GM, I want to see per-character reporting fields for each party member, so that each player's session data is captured accurately.

#### Acceptance Criteria

1. FOR EACH party member, THE Party_Chronicle_Form SHALL display the character's chosen faction as read-only text positioned below the level text in the per-character display area, read from actor.system.pfs.currentFaction
2. FOR EACH party member, THE Party_Chronicle_Form SHALL display a checkbox labeled "Consume Replay" defaulting to unchecked
3. WHEN a per-character reporting field changes, THE Party_Chronicle_Form SHALL auto-save the data

### Requirement 4: Session Report JSON Assembly

**User Story:** As a GM, I want the session report JSON to be assembled from form data, so that I get an accurate report payload without manual data entry.

#### Acceptance Criteria

1. WHEN the Copy_Report_Button is clicked, THE Session_Report_Builder SHALL assemble a Session_Report JSON object from the current form state
2. THE Session_Report SHALL include the gameDate value read from the existing Event Date field
3. THE Session_Report SHALL include the gameSystem field set to the constant value "PFS2E"
4. THE Session_Report SHALL include the generateGmChronicle field set to false
5. THE Session_Report SHALL include the gmOrgPlayNumber read directly from the existing GM PFS Number field
6. THE Session_Report SHALL include the top-level repEarned field set to the constant value 0
7. THE Session_Report SHALL include the four Reporting_Flag boolean values (reportingA through reportingD) from the checkboxes labeled "A", "B", "C", "D"
8. THE Session_Report SHALL include the scenario value constructed from the existing scenario selector (not a free text input)
9. THE Session_Report SHALL include a signUps array with one Sign_Up entry per party member
10. FOR EACH Sign_Up entry, THE Session_Report_Builder SHALL include isGM set to false, the player's Org_Play_Number read from actor.system.pfs.playerNumber, the Character_Number read from actor.system.pfs.characterNumber, the character name, the Consume_Replay flag, the repEarned value read from the shared "Reputation, Chosen Faction" input field (same value for all players), and the character's faction full name read from actor.system.pfs.currentFaction
11. THE Session_Report SHALL include a session-level bonusRepEarned array assembled from the shared Reputation section, containing entries for each faction where the reputation value is non-zero AND the faction is not the "Chosen Faction" selected in the shared Reputation section

### Requirement 5: Scenario Identifier Construction

**User Story:** As a GM, I want the scenario identifier to be automatically constructed from the selected scenario, so that I don't have to type it manually.

#### Acceptance Criteria

1. WHEN assembling the Session_Report, THE Session_Report_Builder SHALL construct the Scenario_Identifier from the currently selected scenario in the existing scenario selector
2. THE Scenario_Identifier SHALL be derived from the selected scenario's metadata (not from a free text input field)
3. IF no scenario is selected, THEN THE Session_Report_Builder SHALL report a validation error

### Requirement 6: Session Report Serialization and Encoding

**User Story:** As a GM, I want the session report to be serialized to JSON and base64-encoded, so that it can be consumed by browser plugins that automate Paizo session reporting.

#### Acceptance Criteria

1. WHEN the Session_Report JSON object is assembled, THE Session_Report_Serializer SHALL serialize the object to a JSON string
2. THE Session_Report_Serializer SHALL base64-encode the JSON string
3. FOR ALL valid Session_Report objects, serializing to JSON then parsing back SHALL produce an equivalent object (round-trip property)
4. FOR ALL valid base64-encoded strings, decoding then re-encoding SHALL produce the same string (round-trip property)
5. WHEN the Copy_Report_Button is clicked while the Option key (Alt key) is held, THE Session_Report_Serializer SHALL skip the base64 encoding step and copy the raw JSON string to the clipboard instead

### Requirement 7: Clipboard Copy

**User Story:** As a GM, I want the encoded session report to be copied to my clipboard when I click the button, so that I can use it with a browser plugin to populate the Paizo reporting form.

#### Acceptance Criteria

1. WHEN the Session_Report is serialized and encoded, THE Copy_Report_Button handler SHALL write the base64 string to the system clipboard using the Clipboard API
2. WHEN the clipboard write succeeds, THE Party_Chronicle_Form SHALL display a success notification to the GM
3. IF the clipboard write fails, THEN THE Party_Chronicle_Form SHALL display an error notification to the GM
4. THE success notification SHALL indicate that the session report has been copied to the clipboard

### Requirement 8: Validation Before Copy

**User Story:** As a GM, I want the system to validate required reporting fields before copying, so that I don't submit incomplete reports.

#### Acceptance Criteria

1. WHEN the Copy_Report_Button is clicked, THE Session_Report_Builder SHALL validate that the existing Event Date field is populated
2. THE Session_Report_Builder SHALL validate that a scenario is selected in the existing scenario selector
3. THE Session_Report_Builder SHALL validate that the existing GM PFS Number field is populated
4. THE Session_Report_Builder SHALL validate that each party member has a faction value available from the character sheet
5. IF validation fails, THEN THE Party_Chronicle_Form SHALL display the validation errors and prevent the copy operation

### Requirement 9: Bonus Reputation Assembly

**User Story:** As a GM, I want bonus reputation to be automatically assembled from the existing faction reputation fields, so that the session report includes accurate bonus reputation data.

#### Acceptance Criteria

1. THE Session_Report_Builder SHALL read the faction-specific reputation values from the existing Shared_Reputation_Section
2. THE Session_Report_Builder SHALL read the "Chosen Faction" value from the shared Reputation section to identify the chosen faction
3. FOR EACH faction with a non-zero reputation value that is NOT the chosen faction, THE Session_Report_Builder SHALL create a bonusRepEarned entry with the faction full name and the reputation value
4. THE Session_Report_Builder SHALL exclude the chosen faction from the bonusRepEarned array regardless of its reputation value
5. THE Session_Report_Builder SHALL exclude factions with a reputation value of 0 from the bonusRepEarned array
6. THE bonusRepEarned array SHALL use full faction names from the FACTION_NAMES constant

### Requirement 10: Data Persistence for New Fields

**User Story:** As a GM, I want the new session reporting fields to be saved with other chronicle data, so that I can resume filling out the report if interrupted.

#### Acceptance Criteria

1. THE SharedFields data structure SHALL be extended to include the four Reporting_Flag values (reportingA, reportingB, reportingC, reportingD)
2. FOR EACH character, THE UniqueFields data structure SHALL be extended to include the consumeReplay field
3. WHEN auto-save is triggered, THE Party_Chronicle_Form SHALL save all new session reporting fields
4. WHEN loading saved data, THE Party_Chronicle_Form SHALL restore all session reporting fields to their input elements
