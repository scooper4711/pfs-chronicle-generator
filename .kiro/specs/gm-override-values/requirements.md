# Requirements Document

## Introduction

The PFS Chronicle Generator automatically calculates `xp_gained` and `currency_gained` for each character based on shared reward settings (XP earned, treasure bundles, downtime days) and per-character earned income inputs (task level, success level, proficiency rank). However, feats, boons, and certain downtime activities can modify these values in ways the calculator cannot account for. This feature adds an "Advanced" collapsible section to each character card (both party members and the GM credit character) that allows the GM to override the calculated XP and currency values. The existing "Consume Replay" checkbox relocates into this new section. Override checkboxes control whether the override is active, and when active, the calculated label outside the Advanced section receives strikethrough styling while the override input value replaces the calculated value during chronicle generation.

## Glossary

- **Society_Tab**: The GM-only tab injected into the Party Sheet by the module, containing the chronicle generation form.
- **Character_Card**: A per-character section in the Society_Tab displaying character info and data entry fields. Applies to both Party_Actor sections and the GM_Character section.
- **Advanced_Section**: A collapsible section within each Character_Card titled "Advanced" that contains override controls and the relocated Consume Replay checkbox.
- **Override_XP_Checkbox**: A checkbox within the Advanced_Section that enables or disables the XP override for a specific character.
- **Override_Currency_Checkbox**: A checkbox within the Advanced_Section that enables or disables the currency override for a specific character. Labeled "Override GP Gained" for Pathfinder and "Override Credits Gained" for Starfinder.
- **Override_XP_Input**: A numeric input field next to the Override_XP_Checkbox where the GM enters the override XP value.
- **Override_Currency_Input**: A numeric input field next to the Override_Currency_Checkbox where the GM enters the override currency value.
- **Calculated_XP_Label**: The existing display element on the Character_Card that shows the XP earned value (from shared fields).
- **Calculated_Currency_Label**: The existing display element on the Character_Card that shows the calculated currency gained value (earned income + treasure bundle value or credits awarded).
- **Earned_Income_Label**: The existing "Earned Income" label on the Character_Card that titles the earned income display value, located within the earned income section.
- **Chronicle_Generator**: The module's PDF generation pipeline that produces filled chronicle sheets for each character.
- **Party_Actor**: A character actor that is a member of the Foundry VTT party.
- **GM_Character**: The actor designated as the GM's character for GM credit.
- **Collapsible_Section_Handler**: The existing module component that manages collapsible section toggle, keyboard support, and collapse state persistence.

## Requirements

### Requirement 1: Advanced Section Structure

**User Story:** As a GM, I want each character card to have a collapsible "Advanced" section, so that override controls are available but do not clutter the default view.

#### Acceptance Criteria

1. THE Society_Tab SHALL display an Advanced_Section within each Character_Card, including both Party_Actor and GM_Character cards
2. THE Advanced_Section SHALL have the title "Advanced"
3. THE Advanced_Section SHALL be collapsed by default when the form is first rendered
4. WHEN the GM clicks or activates the Advanced_Section header, THE Collapsible_Section_Handler SHALL toggle the section between collapsed and expanded states
5. THE Advanced_Section SHALL support keyboard activation (Enter and Space keys) consistent with existing collapsible sections
6. THE Advanced_Section SHALL use ARIA attributes (`aria-expanded`, `aria-controls`) consistent with existing collapsible sections

### Requirement 2: Consume Replay Relocation

**User Story:** As a GM, I want the "Consume Replay" checkbox to be inside the Advanced section, so that the character card's default view is cleaner.

#### Acceptance Criteria

1. THE Advanced_Section SHALL contain the existing Consume Replay checkbox for each character
2. THE Consume Replay checkbox SHALL retain its current `name` attribute format (`characters.{id}.consumeReplay`) after relocation
3. THE Consume Replay checkbox SHALL retain its current auto-save and form data extraction behavior after relocation
4. THE Consume Replay checkbox SHALL retain its current tooltip text after relocation

### Requirement 3: Override XP Checkbox and Input

**User Story:** As a GM, I want to override the calculated XP for a specific character, so that I can account for feats, boons, or other adjustments that modify XP earned.

#### Acceptance Criteria

1. THE Advanced_Section SHALL contain an Override_XP_Checkbox labeled "Override XP"
2. THE Advanced_Section SHALL contain an Override_XP_Input next to the Override_XP_Checkbox
3. WHILE the Override_XP_Checkbox is unchecked, THE Override_XP_Input SHALL be disabled (not accepting input)
4. WHEN the GM checks the Override_XP_Checkbox, THE Override_XP_Input SHALL become enabled
5. WHEN the GM checks the Override_XP_Checkbox, THE Calculated_XP_Label on the Character_Card SHALL display with strikethrough styling
6. WHEN the GM unchecks the Override_XP_Checkbox, THE Override_XP_Input SHALL become disabled and THE Calculated_XP_Label SHALL remove the strikethrough styling
7. THE Override_XP_Input SHALL accept numeric values

### Requirement 4: Override Currency Checkbox and Input

**User Story:** As a GM, I want to override the calculated currency gained for a specific character, so that I can account for feats, boons, or downtime activities that modify gold or credits earned.

#### Acceptance Criteria

1. THE Advanced_Section SHALL contain an Override_Currency_Checkbox
2. WHILE the active game system is Pathfinder, THE Override_Currency_Checkbox SHALL be labeled "Override GP Gained"
3. WHILE the active game system is Starfinder, THE Override_Currency_Checkbox SHALL be labeled "Override Credits Gained"
4. THE Advanced_Section SHALL contain an Override_Currency_Input next to the Override_Currency_Checkbox
5. WHILE the Override_Currency_Checkbox is unchecked, THE Override_Currency_Input SHALL be disabled (not accepting input)
6. WHEN the GM checks the Override_Currency_Checkbox, THE Override_Currency_Input SHALL become enabled
7. WHEN the GM checks the Override_Currency_Checkbox, THE Calculated_Currency_Label and THE Earned_Income_Label on the Character_Card SHALL display with strikethrough styling
8. WHEN the GM unchecks the Override_Currency_Checkbox, THE Override_Currency_Input SHALL become disabled and THE Calculated_Currency_Label and THE Earned_Income_Label SHALL remove the strikethrough styling
9. THE Override_Currency_Input SHALL accept numeric values with up to two decimal places for Pathfinder and whole numbers for Starfinder

### Requirement 5: Override Values in Chronicle Generation

**User Story:** As a GM, I want override values to replace the calculated values on the generated chronicle PDF, so that the printed chronicle reflects the correct adjusted amounts.

#### Acceptance Criteria

1. WHEN the Override_XP_Checkbox is checked, THE Chronicle_Generator SHALL use the Override_XP_Input value (including zero) as `xp_gained` instead of the shared `xpEarned` value for that character
2. WHEN the Override_Currency_Checkbox is checked, THE Chronicle_Generator SHALL use the Override_Currency_Input value (including zero) as `currency_gained` instead of the calculated currency gained for that character
3. WHEN the Override_XP_Checkbox is unchecked, THE Chronicle_Generator SHALL use the standard calculated `xp_gained` value for that character
4. WHEN the Override_Currency_Checkbox is unchecked, THE Chronicle_Generator SHALL use the standard calculated `currency_gained` value for that character

### Requirement 6: Override Data Persistence

**User Story:** As a GM, I want override settings to persist when the form is reloaded, so that I do not lose override values between sessions.

#### Acceptance Criteria

1. WHEN the GM changes an override checkbox or input value, THE Society_Tab SHALL auto-save the override state and value to the character's stored data alongside existing fields
2. WHEN the form is loaded with previously saved data that includes override values, THE Society_Tab SHALL restore the override checkbox states, input values, strikethrough styling, and input enabled/disabled states
3. WHEN the Clear Data button is pressed, THE Society_Tab SHALL reset all override checkboxes to unchecked and all override input values to empty

### Requirement 7: Override Data in Session Reporting

**User Story:** As a GM, I want the session report to reflect override values when they are active, so that the copied session report data is accurate.

#### Acceptance Criteria

1. WHEN the Override_XP_Checkbox is checked for a character, THE Session_Report_Builder SHALL use the Override_XP_Input value as the XP earned for that character in the session report
2. WHEN the Override_Currency_Checkbox is checked for a character, THE Session_Report_Builder SHALL use the Override_Currency_Input value as the currency gained for that character in the session report
3. WHEN no override is active for a character, THE Session_Report_Builder SHALL use the standard calculated values

### Requirement 8: Per-Character Scope

**User Story:** As a GM, I want overrides to apply independently per character, so that I can override values for one character without affecting others.

#### Acceptance Criteria

1. THE Override_XP_Checkbox and Override_XP_Input SHALL be independent for each Character_Card
2. THE Override_Currency_Checkbox and Override_Currency_Input SHALL be independent for each Character_Card
3. WHEN the GM enables an override for one character, THE Society_Tab SHALL leave all other characters' override states unchanged
4. THE GM_Character card SHALL support the same override controls as Party_Actor cards
