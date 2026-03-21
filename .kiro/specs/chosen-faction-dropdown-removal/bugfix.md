# Bugfix Requirements Document

## Introduction

The reputation section of the party chronicle form contains a `chosenFaction` dropdown (labeled "Faction", id `#chosenFaction`) that was incorrectly added during the session reporting feature implementation. This dropdown allows the user to select a faction abbreviation code, which is then used by `buildBonusReputation` to exclude that faction from the bonus reputation entries in the session report.

This logic is wrong. The correct behavior is: every reputation value from `reputationValues` (EA, GA, HH, VS, RO, VW) that is non-zero should appear in the bonus reputation entries. The `chosenFactionReputation` numeric field (which already exists and is correct) is what provides the `repEarned` value for each SignUp entry. There is no need for a faction-selection dropdown to filter bonus reputations.

The bug affects the session report output: bonus reputation entries are missing the chosen faction's reputation when it should be included, and the dropdown itself is unnecessary UI clutter.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a faction is selected in the `#chosenFaction` dropdown AND that faction has a non-zero reputation value THEN the system excludes that faction from the `bonusRepEarned` array in the session report, causing its reputation to be silently dropped from the report.

1.2 WHEN the `#chosenFaction` dropdown is left at the default empty value THEN the system includes all non-zero reputations in `bonusRepEarned`, which happens to be the correct behavior but only by accident (empty string matches no faction code).

1.3 WHEN the party chronicle form is rendered THEN the system displays a "Faction" dropdown (`#chosenFaction`) in the reputation section that serves no valid purpose and confuses the user.

### Expected Behavior (Correct)

2.1 WHEN building the session report `bonusRepEarned` array THEN the system SHALL include every faction from `reputationValues` that has a non-zero value, without excluding any faction based on a dropdown selection.

2.2 WHEN building the session report THEN the system SHALL use the `chosenFactionReputation` numeric value for the `repEarned` field in each SignUp entry (this already works correctly and must remain unchanged).

2.3 WHEN the party chronicle form is rendered THEN the system SHALL NOT display a "Faction" dropdown (`#chosenFaction`) in the reputation section.

2.4 WHEN the `chosenFaction` field is removed from the codebase THEN the system SHALL remove all references including: the `SharedFields.chosenFaction` type property, the `CHOSEN_FACTION` DOM selector constant, the form data extraction line, the default value in `createDefaultChronicleData`, and the `chosenFaction` parameter from `buildBonusReputation`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN building the session report THEN the system SHALL CONTINUE TO use `chosenFactionReputation` for the top-level `repEarned` field and for each SignUp entry's `repEarned` field.

3.2 WHEN a faction in `reputationValues` has a value of zero THEN the system SHALL CONTINUE TO exclude it from the `bonusRepEarned` array (only non-zero reputations are included).

3.3 WHEN the `chosenFactionReputation` dropdown (id `#chosenFactionReputation`, labeled "Chosen Faction") is used THEN the system SHALL CONTINUE TO extract and use its numeric value for reputation earned, with the same default and range behavior.

3.4 WHEN saving and loading party chronicle data THEN the system SHALL CONTINUE TO persist and restore all remaining shared fields correctly (the removal of `chosenFaction` must not break serialization/deserialization of other fields).

3.5 WHEN the reputation section displays faction-specific reputation inputs (EA, GA, HH, VS, RO, VW) THEN the system SHALL CONTINUE TO render and extract those values as before.

3.6 WHEN building SignUp entries THEN the system SHALL CONTINUE TO source each SignUp's `faction` field from the actor's data, not from the `chosenFaction` dropdown being removed.
