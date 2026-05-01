# Requirements Document

## Introduction

The PFS Chronicle Generator's override feature (implemented in the `gm-override-values` spec) allows GMs to override calculated XP and currency values for individual characters. Currently, override controls live inside a collapsible "Advanced" section at the bottom of each character card, and activating an override applies strikethrough styling to the original calculated labels. This redesign improves the override UX by repositioning override checkboxes into a dedicated column adjacent to their corresponding fields, replacing strikethrough with visibility toggling (hiding original fields and showing override inputs in their place), and pre-populating the currency override input with the sum of the character's calculated values. The underlying data model, chronicle generation, session reporting, and persistence logic remain unchanged — this is a UI/UX-only change.

## Glossary

- **Society_Tab**: The GM-only tab injected into the Party Sheet by the module, containing the chronicle generation form.
- **Character_Card**: A per-character section in the Society_Tab displaying character info and data entry fields. Applies to both Party_Actor sections and the GM_Character section.
- **Override_Checkbox_Column**: A new visual column positioned between the character portrait/identity area and the main character fields grid, containing the override checkboxes.
- **Override_XP_Checkbox**: A checkbox in the Override_Checkbox_Column, positioned adjacent to the "XP Earned" row, that toggles the XP override for a specific character.
- **Override_Currency_Checkbox**: A checkbox in the Override_Checkbox_Column, positioned adjacent to the "Earned Income" row, that toggles the currency override for a specific character. Labeled contextually based on game system.
- **Override_XP_Input**: A numeric input field that replaces the "XP Earned" display when the Override_XP_Checkbox is checked.
- **Override_Currency_Input**: A numeric input field that replaces the "Earned Income" and "Treasure Bundles" rows (or "Credits Awarded" row for Starfinder) when the Override_Currency_Checkbox is checked.
- **Calculated_XP_Row**: The form group displaying the calculated "XP Earned" value on the Character_Card.
- **Earned_Income_Row**: The form group displaying the calculated "Earned Income" value on the Character_Card.
- **Treasure_Bundles_Row**: The form group displaying the calculated "Treasure Bundles" gold value on the Character_Card (Pathfinder only).
- **Credits_Awarded_Row**: The form group displaying the calculated "Credits Awarded" value on the Character_Card (Starfinder only).
- **Consume_Replay_Checkbox**: The existing checkbox that marks whether a player is consuming a replay credit. Currently inside the Advanced section, to be relocated above the Notes field.
- **Chronicle_Generator**: The module's PDF generation pipeline that produces filled chronicle sheets for each character.
- **Party_Actor**: A character actor that is a member of the Foundry VTT party.
- **GM_Character**: The actor designated as the GM's character for GM credit.

## Requirements

### Requirement 1: Override Checkbox Column Layout

**User Story:** As a GM, I want override checkboxes positioned in their own column between the portrait and the fields grid, so that the existing field labels remain aligned and the override controls are visually associated with the fields they affect.

#### Acceptance Criteria

1. THE Character_Card SHALL display an Override_Checkbox_Column between the character portrait/identity area and the character fields grid
2. THE Override_Checkbox_Column SHALL contain the Override_Currency_Checkbox positioned adjacent to the "Earned Income" row
3. THE Override_Checkbox_Column SHALL contain the Override_XP_Checkbox positioned adjacent to the "XP Earned" row
4. THE Override_Checkbox_Column SHALL preserve the vertical alignment of labels in the character fields grid
5. THE Override_Checkbox_Column layout SHALL apply to both Party_Actor cards and the GM_Character card

### Requirement 2: Override XP Visibility Toggle

**User Story:** As a GM, I want checking the Override XP checkbox to hide the calculated XP display and show an editable input in its place, so that the override feels like enabling inline editing rather than a separate control.

#### Acceptance Criteria

1. WHILE the Override_XP_Checkbox is unchecked, THE Character_Card SHALL display the Calculated_XP_Row with the calculated XP value
2. WHILE the Override_XP_Checkbox is unchecked, THE Override_XP_Input SHALL be hidden
3. WHEN the GM checks the Override_XP_Checkbox, THE Character_Card SHALL hide the Calculated_XP_Row
4. WHEN the GM checks the Override_XP_Checkbox, THE Character_Card SHALL display the Override_XP_Input in place of the Calculated_XP_Row
5. THE Override_XP_Input SHALL have the label "XP Earned"
6. THE Override_XP_Input SHALL have a tooltip indicating the value is a manual override
7. WHEN the GM unchecks the Override_XP_Checkbox, THE Character_Card SHALL restore the Calculated_XP_Row and hide the Override_XP_Input
8. THE Override_XP_Input SHALL accept numeric values with a minimum of zero

### Requirement 3: Override Currency Visibility Toggle (Pathfinder)

**User Story:** As a GM, I want checking the Override GP checkbox to hide both the Earned Income and Treasure Bundles rows and show a single "GP Gained" input, so that I can directly specify the total gold a character receives.

#### Acceptance Criteria

1. WHILE the Override_Currency_Checkbox is unchecked, THE Character_Card SHALL display the Earned_Income_Row and the Treasure_Bundles_Row with their calculated values
2. WHILE the Override_Currency_Checkbox is unchecked, THE Override_Currency_Input SHALL be hidden
3. WHEN the GM checks the Override_Currency_Checkbox, THE Character_Card SHALL hide the Earned_Income_Row and the Treasure_Bundles_Row
4. WHEN the GM checks the Override_Currency_Checkbox, THE Character_Card SHALL display the Override_Currency_Input in place of the hidden rows
5. THE Override_Currency_Input SHALL have the label "GP Gained"
6. WHEN the GM checks the Override_Currency_Checkbox, THE Override_Currency_Input SHALL default to the sum of the character's current treasure bundle gold value and earned income value
7. THE Override_Currency_Input SHALL accept numeric values with up to two decimal places and a minimum of zero
8. WHEN the GM unchecks the Override_Currency_Checkbox, THE Character_Card SHALL restore the Earned_Income_Row and Treasure_Bundles_Row and hide the Override_Currency_Input

### Requirement 4: Override Currency Visibility Toggle (Starfinder)

**User Story:** As a GM, I want the Override Credits checkbox to hide the Credits Awarded row and show a "Credits Gained" input, so that I can directly specify the total credits a character receives in Starfinder Society play.

#### Acceptance Criteria

1. WHILE the game system is Starfinder and the Override_Currency_Checkbox is unchecked, THE Character_Card SHALL display the Credits_Awarded_Row with the calculated credits value
2. WHILE the Override_Currency_Checkbox is unchecked, THE Override_Currency_Input SHALL be hidden
3. WHEN the GM checks the Override_Currency_Checkbox in Starfinder, THE Character_Card SHALL hide the Credits_Awarded_Row
4. WHEN the GM checks the Override_Currency_Checkbox in Starfinder, THE Character_Card SHALL display the Override_Currency_Input in place of the hidden row
5. THE Override_Currency_Input SHALL have the label "Credits Gained"
6. WHEN the GM checks the Override_Currency_Checkbox in Starfinder, THE Override_Currency_Input SHALL default to the character's current credits awarded value
7. THE Override_Currency_Input SHALL accept whole number values with a minimum of zero
8. WHEN the GM unchecks the Override_Currency_Checkbox in Starfinder, THE Character_Card SHALL restore the Credits_Awarded_Row and hide the Override_Currency_Input

### Requirement 5: Override Checkbox Labels

**User Story:** As a GM, I want the override checkboxes to have system-appropriate labels, so that the terminology matches the game system I am running.

#### Acceptance Criteria

1. WHILE the active game system is Pathfinder, THE Override_Currency_Checkbox SHALL display a tooltip reading "Override GP"
2. WHILE the active game system is Starfinder, THE Override_Currency_Checkbox SHALL display a tooltip reading "Override Credits"
3. THE Override_XP_Checkbox SHALL display a tooltip reading "Override XP"
4. THE Override_Checkbox_Column SHALL display only the checkbox controls without text labels, relying on tooltips for identification

### Requirement 6: Advanced Section Removal and Consume Replay Relocation

**User Story:** As a GM, I want the Advanced section removed entirely and the Consume Replay checkbox placed directly above the Notes field, so that all controls are visible without expanding a collapsible section.

#### Acceptance Criteria

1. THE Character_Card SHALL display the Consume_Replay_Checkbox directly above the Notes field, outside of any collapsible section
2. THE Character_Card SHALL NOT contain an Advanced_Section after the redesign
3. THE Consume_Replay_Checkbox SHALL retain its current `name` attribute format (`characters.{id}.consumeReplay`), tooltip, auto-save behavior, and form data extraction behavior
4. THE collapsible section handler SHALL no longer register or initialize `advanced-{characterId}` section IDs

### Requirement 7: Override Data Model Preservation

**User Story:** As a GM, I want the override data model and persistence to remain unchanged, so that existing saved data continues to work after the UI redesign.

#### Acceptance Criteria

1. THE form data extraction SHALL continue to read override checkbox states and input values using the same `name` attribute patterns (`characters.{id}.overrideXp`, `characters.{id}.overrideXpValue`, `characters.{id}.overrideCurrency`, `characters.{id}.overrideCurrencyValue`)
2. THE Chronicle_Generator SHALL continue to use override values when active, using the same logic as before the redesign
3. THE session report builder SHALL continue to use override values when active, using the same logic as before the redesign
4. WHEN the form is loaded with previously saved override data, THE Society_Tab SHALL restore override checkbox states, input values, and the correct visibility states for original and override fields
5. WHEN the Clear Data button is pressed, THE Society_Tab SHALL reset all override checkboxes to unchecked, restore visibility of all original fields, and hide all override inputs

### Requirement 8: Default Value Calculation for Currency Override

**User Story:** As a GM, I want the currency override input to pre-populate with the sum of the character's calculated values when I enable the override, so that I have a reasonable starting point to adjust from.

#### Acceptance Criteria

1. WHEN the Override_Currency_Checkbox is checked for a Pathfinder character, THE Override_Currency_Input value SHALL be set to the sum of the character's current treasure bundle gold value and the character's current earned income value
2. WHEN the Override_Currency_Checkbox is checked for a Starfinder character, THE Override_Currency_Input value SHALL be set to the character's current credits awarded value
3. WHEN the Override_Currency_Checkbox is unchecked, THE Override_Currency_Input value SHALL be reset to zero
4. THE default value calculation SHALL read the current displayed values from the DOM at the time the checkbox is checked

### Requirement 9: Per-Character Override Independence

**User Story:** As a GM, I want overrides to apply independently per character, so that I can override values for one character without affecting others.

#### Acceptance Criteria

1. THE Override_XP_Checkbox, Override_XP_Input, Override_Currency_Checkbox, and Override_Currency_Input SHALL be independent for each Character_Card
2. WHEN the GM enables an override for one character, THE Society_Tab SHALL leave all other characters' override states and field visibility unchanged
3. THE GM_Character card SHALL support the same override controls and visibility behavior as Party_Actor cards

