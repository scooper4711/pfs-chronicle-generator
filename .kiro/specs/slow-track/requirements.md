# Requirements Document

## Introduction

Pathfinder Society Organized Play offers a "slow track" advancement option. Per the Lorespire rules: "Playing an adventure using slow advancement earns half the rewards (not rounded) of standard speed, including experience points, Reputation, gold, and Downtime days." This feature adds a per-character "Slow Track" checkbox to the party chronicle form. When checked, XP, all reputation values, gold (treasure bundle value + earned income), and downtime days are all halved for that character. Halving does not round — fractional values are preserved (e.g., 4 XP → 2 XP, 3 reputation → 1.5 reputation, 7 downtime days → 3.5 downtime days). If the XP or gold earned override checkboxes are checked, the override input values are used as-is and only reputation and downtime days are halved. The checkbox appears on the same line as the existing "Consume Replay" checkbox in each character's section, for both party members and the GM character. Both the Slow Track and Consume Replay checkboxes are hidden when the active game system is Starfinder Society (sf2e), as these options are not part of Starfinder Society rules.

## Glossary

- **Society_Tab**: The GM-only tab injected into the Party Sheet by the module, containing the chronicle generation form.
- **Character_Card**: A per-character section in the Society_Tab displaying character info and data entry fields. Applies to both Party_Actor sections and the GM_Character section.
- **Slow_Track_Checkbox**: A checkbox within each Character_Card that enables slow track halving for that character. Placed on the same line as the Consume_Replay_Checkbox.
- **Consume_Replay_Checkbox**: The existing checkbox within each Character_Card that marks whether the player is consuming a replay credit.
- **Chronicle_Generator**: The module's PDF generation pipeline that produces filled chronicle sheets for each character (party-chronicle-mapper.ts).
- **Session_Report_Builder**: The module component that assembles session report JSON for Paizo.com clipboard export (session-report-builder.ts).
- **Reputation_Calculator**: The module component that computes multi-line reputation strings from shared reputation values and the character's chosen faction (reputation-calculator.ts).
- **Earned_Income_Calculator**: The module component that computes earned income from task level, success level, proficiency rank, and downtime days (earned-income-calculator.ts).
- **Override_XP_Checkbox**: The existing checkbox that enables manual XP override for a character.
- **Override_Currency_Checkbox**: The existing checkbox that enables manual currency override for a character.
- **Party_Actor**: A character actor that is a member of the Foundry VTT party.
- **GM_Character**: The actor designated as the GM's character for GM credit.
- **Calculated_XP_Label**: The display element on the Character_Card that shows the XP earned value.
- **Game_System**: The active game system, either `pf2e` (Pathfinder Society) or `sf2e` (Starfinder Society), detected at runtime.

## Requirements

### Requirement 1: Slow Track Checkbox Placement

**User Story:** As a GM, I want a "Slow Track" checkbox on each character card, so that I can mark individual characters as using slow track advancement.

#### Acceptance Criteria

1. WHEN the Game_System is `pf2e`, THE Society_Tab SHALL display a Slow_Track_Checkbox within each Character_Card, including both Party_Actor and GM_Character cards
2. THE Slow_Track_Checkbox SHALL be labeled "Slow Track"
3. THE Slow_Track_Checkbox SHALL appear on the same line (same form-group element) as the Consume_Replay_Checkbox
4. THE Slow_Track_Checkbox SHALL be unchecked by default when the form is first rendered
5. THE Slow_Track_Checkbox SHALL have a tooltip explaining that slow track halves XP, reputation, and downtime days
6. WHEN the Game_System is `sf2e`, THE Society_Tab SHALL NOT display the Slow_Track_Checkbox or the Consume_Replay_Checkbox on any Character_Card
7. WHEN the Game_System is `sf2e`, THE Chronicle_Generator and Session_Report_Builder SHALL treat `slowTrack` and `consumeReplay` as `false` regardless of stored data

### Requirement 2: Slow Track XP Halving

**User Story:** As a GM, I want slow track to halve the XP earned for a character, so that the chronicle reflects the reduced advancement rate.

#### Acceptance Criteria

1. WHEN the Slow_Track_Checkbox is checked and the Override_XP_Checkbox is unchecked, THE Chronicle_Generator SHALL halve the shared `xpEarned` value (not rounded) for that character
2. WHEN the Slow_Track_Checkbox is checked and the Override_XP_Checkbox is checked, THE Chronicle_Generator SHALL use the override XP value as-is without halving
3. WHEN the Slow_Track_Checkbox is unchecked, THE Chronicle_Generator SHALL use the standard XP value (shared or override) without halving
4. WHEN the Slow_Track_Checkbox is checked and the Override_XP_Checkbox is unchecked, THE Calculated_XP_Label SHALL display the halved XP value (e.g., "2 XP" instead of "4 XP")
5. WHEN the Slow_Track_Checkbox is unchecked, THE Calculated_XP_Label SHALL display the standard shared XP value

### Requirement 3: Slow Track Reputation Halving

**User Story:** As a GM, I want slow track to halve all reputation values for a character, so that the chronicle reflects the reduced reputation gain.

#### Acceptance Criteria

1. WHEN the Slow_Track_Checkbox is checked, THE Chronicle_Generator SHALL halve the chosen faction reputation value (not rounded) before passing it to the Reputation_Calculator for that character
2. WHEN the Slow_Track_Checkbox is checked, THE Chronicle_Generator SHALL halve each faction-specific reputation value (not rounded) before passing them to the Reputation_Calculator for that character
3. WHEN the Slow_Track_Checkbox is unchecked, THE Chronicle_Generator SHALL pass the standard reputation values to the Reputation_Calculator without modification

### Requirement 4: Slow Track Downtime Days Halving

**User Story:** As a GM, I want slow track to halve the downtime days for a character, so that earned income is reduced proportionally.

#### Acceptance Criteria

1. WHEN the Slow_Track_Checkbox is checked, THE Chronicle_Generator SHALL halve the shared `downtimeDays` value (not rounded) before passing it to the Earned_Income_Calculator for that character
2. WHEN the Slow_Track_Checkbox is unchecked, THE Chronicle_Generator SHALL pass the standard `downtimeDays` value to the Earned_Income_Calculator without modification
3. THE halved downtime days SHALL propagate to the earned income calculation, resulting in reduced earned income for that character

### Requirement 5: Slow Track Gold Halving

**User Story:** As a GM, I want slow track to halve the total gold earned for a character, so that the chronicle accurately reflects the Organized Play slow track rules.

#### Acceptance Criteria

1. WHEN the Slow_Track_Checkbox is checked and the Override_Currency_Checkbox is unchecked, THE Chronicle_Generator SHALL halve the total `currency_gained` value (treasure bundle value + earned income, then divided by 2, not rounded) for that character
2. WHEN the Slow_Track_Checkbox is checked and the Override_Currency_Checkbox is checked, THE Chronicle_Generator SHALL use the override currency value as-is without any slow track modification
3. WHEN the Slow_Track_Checkbox is unchecked, THE Chronicle_Generator SHALL calculate currency using the standard formula without halving
4. THE halving SHALL apply to the final `currency_gained` total, not to the individual components (treasure bundle value and earned income) separately

### Requirement 6: Slow Track Data Persistence

**User Story:** As a GM, I want the slow track checkbox state to persist when the form is reloaded, so that I do not lose the setting between sessions.

#### Acceptance Criteria

1. WHEN the GM checks or unchecks the Slow_Track_Checkbox, THE Society_Tab SHALL auto-save the slow track state to the character's stored data alongside existing fields
2. WHEN the form is loaded with previously saved data that includes a slow track value, THE Society_Tab SHALL restore the Slow_Track_Checkbox state
3. WHEN the Clear Data button is pressed, THE Society_Tab SHALL reset all Slow_Track_Checkboxes to unchecked

### Requirement 7: Slow Track in Session Reporting

**User Story:** As a GM, I want the session report to reflect slow track adjustments, so that the copied session report data sent to Paizo.com is accurate.

#### Acceptance Criteria

1. WHEN the Slow_Track_Checkbox is checked for a character, THE Session_Report_Builder SHALL include `slowTrack: true` in the SignUp entry for that character
2. WHEN the Slow_Track_Checkbox is checked and the Override_XP_Checkbox is unchecked, THE Session_Report_Builder SHALL halve the XP earned value (not rounded) in the SignUp entry
3. WHEN the Slow_Track_Checkbox is checked and the Override_XP_Checkbox is checked, THE Session_Report_Builder SHALL use the override XP value as-is in the SignUp entry
4. WHEN the Slow_Track_Checkbox is checked, THE Session_Report_Builder SHALL halve the chosen faction reputation value (not rounded) in the SignUp entry
5. WHEN the Slow_Track_Checkbox is checked and the Override_Currency_Checkbox is unchecked, THE Session_Report_Builder SHALL halve the total currency gained value (not rounded) in the SignUp entry
6. WHEN the Slow_Track_Checkbox is checked and the Override_Currency_Checkbox is checked, THE Session_Report_Builder SHALL use the override currency value as-is in the SignUp entry

### Requirement 8: Slow Track Display Updates

**User Story:** As a GM, I want the form to immediately reflect slow track changes, so that I can see the effect of enabling slow track before generating chronicles.

#### Acceptance Criteria

1. WHEN the GM checks the Slow_Track_Checkbox, THE Calculated_XP_Label for that character SHALL immediately update to show the halved XP value
2. WHEN the GM unchecks the Slow_Track_Checkbox, THE Calculated_XP_Label for that character SHALL immediately revert to the standard shared XP value
3. WHEN the GM checks the Slow_Track_Checkbox, THE earned income display for that character SHALL immediately update to reflect the halved downtime days
4. WHEN the GM unchecks the Slow_Track_Checkbox, THE earned income display for that character SHALL immediately revert to the standard earned income value
5. WHEN the GM checks the Slow_Track_Checkbox, THE treasure bundle / gold display for that character SHALL immediately update to reflect the halved gold value
6. WHEN the GM unchecks the Slow_Track_Checkbox, THE treasure bundle / gold display for that character SHALL immediately revert to the standard gold value

### Requirement 9: Per-Character Scope

**User Story:** As a GM, I want slow track to apply independently per character, so that I can enable slow track for one character without affecting others.

#### Acceptance Criteria

1. THE Slow_Track_Checkbox SHALL be independent for each Character_Card
2. WHEN the GM enables slow track for one character, THE Society_Tab SHALL leave all other characters' slow track states unchanged
3. THE GM_Character card SHALL support the same Slow_Track_Checkbox as Party_Actor cards
4. WHEN multiple characters have slow track enabled, THE Chronicle_Generator SHALL apply halving independently to each character's values
