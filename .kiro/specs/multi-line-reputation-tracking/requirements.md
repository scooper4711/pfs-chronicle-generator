# Requirements Document

## Introduction

This feature adds multi-line reputation tracking to the PFS Chronicle Generator for Pathfinder Society factions. The system works as follows:

1. Shared faction reputation values are entered once in the sidebar (above Shared Rewards)
2. Each character's chosen faction is read from their actor data (actor.system.pfs.currentFaction)
3. Reputation is calculated during PDF generation by combining the character's chosen faction bonus with faction-specific bonuses
4. The calculated multi-line reputation appears in the generated chronicle PDF

This aligns with Pathfinder Society rules where characters earn reputation with their chosen faction plus any additional faction-specific rewards from the adventure. The calculation is invisible to the GM until they generate the PDF.

## Glossary

- **Faction**: One of six Pathfinder Society organizations (Envoy's Alliance, Grand Archive, Horizon Hunters, Vigilant Seal, Radiant Oath, Verdant Wheel)
- **Faction_Code**: Two-letter abbreviation for a faction (EA, GA, HH, VS, RO, VW)
- **Chosen_Faction**: The faction a character has selected as their primary affiliation, stored in actor.system.pfs.currentFaction
- **Reputation_Value**: A numeric value representing reputation points earned with a faction
- **Reputation_Line**: A formatted string showing faction name and reputation (e.g., "Envoy's Alliance: +4")
- **Shared_Reputation_Section**: The sidebar UI section containing faction reputation input fields
- **Party_Chronicle_Form**: The form in the PFS party sheet's "Society" tab for filling chronicles
- **Reputation_Calculator**: The logic that combines chosen faction bonus with faction-specific bonuses during PDF generation

## Requirements

### Requirement 1: Shared Reputation Input Section

**User Story:** As a GM, I want to enter faction reputation values once in the sidebar, so that I don't have to repeat the same values for each character.

#### Acceptance Criteria

1. THE Party_Chronicle_Form SHALL display a Shared_Reputation_Section in the sidebar above the "Shared Rewards" section
2. THE Shared_Reputation_Section SHALL contain a numeric input field labeled "Chosen Faction" with default value 2
3. FOR EACH Faction_Code in ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'], THE Shared_Reputation_Section SHALL display a numeric input field with the faction's full name as the label
4. THE Chosen Faction input field SHALL accept positive integer values from 0 to 9
5. THE faction-specific input fields SHALL accept positive integer values from 0 to 9 and default to 0
6. WHEN a shared reputation field changes, THE Party_Chronicle_Form SHALL auto-save the data

### Requirement 2: Reputation Calculation Logic

**User Story:** As a GM, I want reputation to be automatically calculated during PDF generation from shared faction values and the character's chosen faction, so that I don't have to manually compute reputation for each character.

#### Acceptance Criteria

1. WHEN mapping party chronicle data to ChronicleData format for PDF generation, THE Reputation_Calculator SHALL create an empty reputation map for each character
2. FOR EACH faction with a non-zero Reputation_Value in Shared_Reputation_Section, THE Reputation_Calculator SHALL add that faction and value to the reputation map
3. THE Reputation_Calculator SHALL read the character's Chosen_Faction from actor.system.pfs.currentFaction
4. IF the character has a Chosen_Faction value, THE Reputation_Calculator SHALL add the "Chosen Faction" Reputation_Value to the chosen faction's total in the reputation map
5. THE Reputation_Calculator SHALL use the FACTION_NAMES constant to map Faction_Code to full faction names
6. THE Reputation_Calculator SHALL filter out any factions with a final reputation value of 0
7. THE Reputation_Calculator SHALL format each remaining faction as a Reputation_Line with format "{Faction_Full_Name}: {+/-}{value}"
8. THE Reputation_Calculator SHALL return an array of Reputation_Line strings sorted alphabetically by faction name

### Requirement 3: No Per-Character Reputation Field

**User Story:** As a GM, I want to enter reputation values only once in the sidebar, so that the form is simpler and I don't repeat data entry for each character.

#### Acceptance Criteria

1. THE Party_Chronicle_Form SHALL NOT display any reputation field in the per-character section
2. THE reputation calculation SHALL be invisible to the GM until PDF generation
3. THE UniqueFields data structure SHALL NOT include a reputation field

### Requirement 4: Reputation Data Persistence

**User Story:** As a GM, I want shared reputation values to be saved with other chronicle data, so that I can resume filling chronicles if interrupted.

#### Acceptance Criteria

1. THE SharedFields data structure SHALL include a reputationValues field containing a map of Faction_Code to Reputation_Value
2. THE SharedFields data structure SHALL include a chosenFactionReputation field containing the numeric value for chosen faction bonus
3. WHEN auto-save is triggered, THE Party_Chronicle_Form SHALL save shared reputation values and chosen faction reputation to SharedFields
4. WHEN loading saved data, THE Party_Chronicle_Form SHALL restore shared reputation values to the Shared_Reputation_Section inputs
5. THE chosen faction SHALL NOT be stored by this feature as it is read from actor.system.pfs.currentFaction

### Requirement 5: Reputation Mapping to Chronicle Data

**User Story:** As a GM, I want the calculated multi-line reputation to be included in generated chronicle PDFs, so that players receive accurate reputation records.

#### Acceptance Criteria

1. WHEN mapping party chronicle data to ChronicleData format for PDF generation, THE party-chronicle-mapper SHALL calculate reputation for each character using the Reputation_Calculator
2. THE reputation field in ChronicleData SHALL contain the calculated Reputation_Line strings as an array
3. IF a character has no reputation, THE reputation field SHALL be an empty array
4. THE existing PdfGenerator SHALL render each reputation line from the array to the chronicle PDF
5. THE reputation calculation SHALL occur only during the mapping process, not during form rendering or data entry

### Requirement 6: Reputation Validation

**User Story:** As a GM, I want validation to ensure reputation data is complete and valid, so that I don't generate invalid chronicles.

#### Acceptance Criteria

1. THE party-chronicle-validator SHALL validate that all faction-specific reputation values are positive integers between 0 and 9
2. THE party-chronicle-validator SHALL validate that chosen faction reputation is a positive integer between 0 and 9
3. THE party-chronicle-validator SHALL validate that chosen faction reputation is greater than 0 before allowing chronicle generation
4. WHEN validation fails, THE Party_Chronicle_Form SHALL display error messages and disable the "Generate Chronicles" button

### Requirement 7: UI Event Handling

**User Story:** As a GM, I want the reputation fields to save automatically when I change them, so that my data is preserved.

#### Acceptance Criteria

1. WHEN a shared reputation input field changes, THE Party_Chronicle_Form SHALL trigger auto-save to persist the data
2. THE event listeners for reputation fields SHALL be attached in the renderPartyChronicleForm function in main.ts
3. THE event listeners SHALL use native DOM APIs (addEventListener) for new code
4. THE auto-save SHALL complete within 100ms of the input change event

### Requirement 8: Faction Display Names

**User Story:** As a GM, I want to see full faction names in the UI and output, so that the reputation is clear and readable.

#### Acceptance Criteria

1. THE Shared_Reputation_Section SHALL display faction labels using full names: "Envoy's Alliance", "Grand Archive", "Horizon Hunters", "Vigilant Seal", "Radiant Oath", "Verdant Wheel"
2. THE Reputation_Line output SHALL use full faction names, not abbreviations
3. THE faction name mapping SHALL use the existing FACTION_NAMES constant from PFSChronicleGeneratorApp.ts
4. THE faction order in the Shared_Reputation_Section SHALL match the order: EA, GA, HH, VS, RO, VW
