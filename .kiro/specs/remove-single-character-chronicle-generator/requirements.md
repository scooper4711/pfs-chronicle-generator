# Requirements Document

## Introduction

This document specifies the requirements for removing the legacy single-character chronicle generator from the PFS Chronicle Generator module. The single-character generator has been superseded by the party chronicle generator, which provides a more efficient workflow for generating chronicles for multiple party members simultaneously. This removal will simplify the codebase, reduce maintenance burden, and eliminate user confusion between the two chronicle generation methods.

The removal must be surgical - preserving all functionality that is still needed (party chronicle generator, download/delete buttons, FACTION_NAMES constant, Select Layout menu) while cleanly removing only the deprecated single-character workflow.

## Glossary

- **Single_Character_Chronicle_Generator**: The legacy ApplicationV2-based form (PFSChronicleGeneratorApp) that generates chronicles for one character at a time
- **Party_Chronicle_Generator**: The current chronicle generation system (PartyChronicleApp) that generates chronicles for all party members simultaneously
- **Generate_Chronicle_Button**: The button in character sheets that opens the single character chronicle generator
- **FACTION_NAMES**: A constant exported from PFSChronicleGeneratorApp that maps faction abbreviations to full names, used by the party chronicle system
- **Download_Chronicle_Button**: The button in character sheets that downloads a previously generated chronicle PDF
- **Delete_Chronicle_Button**: The button in character sheets that deletes a previously generated chronicle PDF
- **Select_Layout_Menu**: The settings menu button that opens the layout designer
- **Legacy_Settings**: The game settings for gmName, gmPfsNumber, eventName, eventcode, and eventDate that were used by the single character generator
- **Module**: The PFS Chronicle Generator Foundry VTT module

## Requirements

### Requirement 1: Remove Single Character Chronicle Generator UI

**User Story:** As a GM, I want the single character chronicle generator removed from character sheets, so that I only see the party chronicle generator workflow.

#### Acceptance Criteria

1. WHEN a GM views a character sheet's Society tab, THE Module SHALL NOT display a "Generate Chronicle" button
2. THE Module SHALL continue to display the "Download Chronicle" button in character sheets
3. THE Module SHALL continue to display the "Delete Chronicle" button in character sheets
4. THE Module SHALL NOT render the single character chronicle generator form when any button is clicked

### Requirement 2: Remove Single Character Chronicle Generator Code

**User Story:** As a developer, I want the single character chronicle generator code removed, so that the codebase is simpler and easier to maintain.

#### Acceptance Criteria

1. THE Module SHALL delete the PFSChronicleGeneratorApp.ts file
2. THE Module SHALL delete the pfs-chronicle-generator.hbs template file
3. THE Module SHALL delete the single-chronicle-handlers.ts file
4. THE Module SHALL remove all imports of PFSChronicleGeneratorApp from main.ts
5. THE Module SHALL remove the event listener that opens PFSChronicleGeneratorApp from main.ts

### Requirement 3: Preserve FACTION_NAMES Constant

**User Story:** As a developer, I want the FACTION_NAMES constant preserved, so that the party chronicle generator continues to work correctly.

#### Acceptance Criteria

1. THE Module SHALL export the FACTION_NAMES constant from a module file
2. THE Module SHALL make FACTION_NAMES available to reputation-calculator.ts
3. THE Module SHALL make FACTION_NAMES available to party-chronicle-validator.ts
4. THE Module SHALL make FACTION_NAMES available to all test files that currently import it
5. WHEN the party chronicle generator calculates reputation, THE Module SHALL use the FACTION_NAMES constant to format faction names

### Requirement 4: Update Legacy Settings

**User Story:** As a GM, I want useful default settings preserved while removing unused ones, so that I don't have to re-enter common information like my name and PFS number for each session.

#### Acceptance Criteria

1. THE Module SHALL continue to register the gmName setting
2. THE Module SHALL continue to register the gmPfsNumber setting
3. THE Module SHALL continue to register the eventName setting
4. THE Module SHALL continue to register the eventcode setting
5. THE Module SHALL NOT register the eventDate setting
6. THE Module SHALL continue to register the partyChronicleData setting
7. THE Module SHALL continue to register the layoutDesigner settings menu
8. THE Module SHALL continue to register the blankChroniclePath setting
9. THE Module SHALL continue to register the season setting
10. THE Module SHALL continue to register the layout setting

### Requirement 5: Preserve Party Chronicle Generator

**User Story:** As a GM, I want the party chronicle generator to continue working, so that I can generate chronicles for my party.

#### Acceptance Criteria

1. WHEN a GM opens a party sheet's Society tab, THE Module SHALL display the party chronicle form
2. WHEN a GM fills out the party chronicle form and clicks "Generate Chronicles", THE Module SHALL generate PDF chronicles for all party members
3. THE Module SHALL continue to use PartyChronicleApp for party chronicle generation
4. THE Module SHALL continue to use party-chronicle-handlers.ts for party chronicle event handling
5. THE Module SHALL continue to use all party chronicle model files (party-chronicle-types.ts, party-chronicle-storage.ts, party-chronicle-validator.ts, party-chronicle-mapper.ts, reputation-calculator.ts)

### Requirement 6: Preserve Download and Delete Functionality

**User Story:** As a player or GM, I want to download and delete chronicles from character sheets, so that I can manage previously generated chronicles.

#### Acceptance Criteria

1. WHEN a character has a chronicle PDF attached, THE Module SHALL display an enabled "Download Chronicle" button in the character sheet's Society tab
2. WHEN a character has no chronicle PDF attached, THE Module SHALL display a disabled "Download Chronicle" button in the character sheet's Society tab
3. WHEN a player clicks the "Download Chronicle" button, THE Module SHALL download the chronicle PDF with a properly formatted filename
4. WHEN a GM views a character sheet with a chronicle PDF attached, THE Module SHALL display an enabled "Delete Chronicle" button
5. WHEN a GM clicks the "Delete Chronicle" button and confirms, THE Module SHALL delete the chronicle PDF and all saved form data from the actor flags
6. WHEN a GM clicks the "Delete Chronicle" button and cancels, THE Module SHALL NOT delete any data

### Requirement 7: Clean Code Removal

**User Story:** As a developer, I want all unused code removed completely, so that the codebase doesn't contain dead code.

#### Acceptance Criteria

1. THE Module SHALL NOT contain commented-out code from the single character chronicle generator
2. THE Module SHALL NOT contain unused imports related to the single character chronicle generator
3. THE Module SHALL NOT contain unused functions related to the single character chronicle generator
4. THE Module SHALL NOT contain unused CSS styles specific to the single character chronicle generator form
5. WHEN code is removed, THE Module SHALL maintain proper code formatting and structure

### Requirement 8: Maintain Test Coverage

**User Story:** As a developer, I want all existing tests to continue passing, so that I know the party chronicle generator still works correctly.

#### Acceptance Criteria

1. WHEN tests are run, THE Module SHALL pass all tests in treasure-bundle-integration.test.ts
2. WHEN tests are run, THE Module SHALL pass all tests in party-chronicle-validator.test.ts
3. WHEN tests are run, THE Module SHALL pass all tests in party-chronicle-validator.property.test.ts
4. WHEN tests are run, THE Module SHALL pass all tests in reputation-calculator.test.ts
5. WHEN tests are run, THE Module SHALL pass all tests in reputation-calculator.property.test.ts
6. WHEN tests are run, THE Module SHALL pass all tests in party-chronicle-mapper.test.ts
7. WHEN tests are run, THE Module SHALL pass all tests in party-chronicle-shared-fields.test.ts
8. WHEN tests are run, THE Module SHALL pass all tests in party-chronicle-unique-fields.test.ts
9. THE Module SHALL update test mocks to import FACTION_NAMES from the new location

### Requirement 9: Preserve Useful Default Settings

**User Story:** As a GM, I want my name, PFS number, and event information to be preserved as default settings, so that I don't have to re-enter this information for each chronicle generation session.

#### Acceptance Criteria

1. WHEN a GM opens the module settings, THE Module SHALL display the "GM Name" setting
2. WHEN a GM opens the module settings, THE Module SHALL display the "GM PFS Number" setting
3. WHEN a GM opens the module settings, THE Module SHALL display the "Event Name" setting
4. WHEN a GM opens the module settings, THE Module SHALL display the "Event Code" setting
5. WHEN a GM opens the party chronicle form, THE Module SHALL pre-populate GM PFS Number with the saved setting value
6. WHEN a GM opens the party chronicle form, THE Module SHALL pre-populate Scenario Name with the saved Event Name setting value
7. WHEN a GM opens the party chronicle form, THE Module SHALL pre-populate Event Code with the saved setting value
8. THE Module SHALL NOT display the "Event Date" setting (removed as it changes frequently)


### Requirement 10: Preserve Select Layout Menu

**User Story:** As a GM, I want the Select Layout menu to remain available, so that I can configure chronicle layouts.

#### Acceptance Criteria

1. WHEN a GM opens the module settings, THE Module SHALL display the "Select Layout" menu button
2. WHEN a GM clicks the "Select Layout" menu button, THE Module SHALL open the LayoutDesignerApp
3. THE Module SHALL continue to register the layoutDesigner settings menu
4. THE Module SHALL NOT remove any code related to LayoutDesignerApp
