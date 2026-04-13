# Requirements Document

## Introduction

The PFS Chronicle Generator currently supports only Pathfinder 2e (PF2e). This feature adds Starfinder Society (SFS) support so the module works with both game systems from a single codebase. The changes are primarily cosmetic — currency display strings change from "gp" (gold pieces) to "Credits", and the earned income table values are multiplied by 10 with fractional credits rounded up to the nearest whole number. Starfinder does not use treasure bundles; instead, each character receives a flat "Credits Awarded" amount determined solely by their character level. Starfinder Society has no quests or bounties — only scenarios — so XP is always 4 per chronicle and downtime is always 8 days; the XP dropdown is hidden in Starfinder mode. The module detects which game system is active at runtime and adapts its display strings, calculations, and UI visibility accordingly. An i18n-style externalization approach keeps system-specific strings centralized and maintainable.

## Glossary

- **Game_System_Detector**: A utility that determines whether the active Foundry VTT game system is Pathfinder 2e ("pf2e") or Starfinder 2e ("sf2e") by checking two conditions: (1) `game.system.id === 'sf2e'`, or (2) the `sf2e-anachronism` module is installed and active (`game.modules.get('sf2e-anachronism')?.active`). If either condition is true, the system is Starfinder; otherwise it defaults to Pathfinder.
- **Currency_Formatter**: A set of functions that format numeric currency values into display strings using the appropriate unit label ("gp" for Pathfinder, "Credits" for Starfinder).
- **Earned_Income_Calculator**: The module (`scripts/utils/earned-income-calculator.ts`) that provides income tables, DC lookup, and calculation functions for the Earn Income downtime activity.
- **Treasure_Bundle_Calculator**: The module (`scripts/utils/treasure-bundle-calculator.ts`) that converts treasure bundle counts into currency values based on character level. Used only in Pathfinder mode.
- **Income_Table**: A lookup table mapping task levels and proficiency ranks to income per day, denominated in the active system's currency.
- **Starfinder_Income_Table**: The Starfinder variant of the Income_Table where each value is the Pathfinder value multiplied by 10, with fractional results rounded up to the nearest whole number (ceiling).
- **Credits_Awarded_Table**: A lookup table mapping Starfinder character levels (1-10) to the flat Credits awarded at the end of a scenario. Starfinder Society caps at level 10. No GM input is required — the value is determined entirely by character level. Values: Level 1 = 140, Level 2 = 220, Level 3 = 380, Level 4 = 640, Level 5 = 1,000, Level 6 = 1,500, Level 7 = 2,200, Level 8 = 3,000, Level 9 = 4,400, Level 10 = 6,000.
- **Session_Report_Builder**: The module (`scripts/model/session-report-builder.ts`) that assembles session report JSON for the RPG Chronicles browser plugin, including the `gameSystem` field.
- **Scenario_Identifier**: The module (`scripts/model/scenario-identifier.ts`) that parses layout IDs into Paizo scenario identifier strings (e.g., "PFS2E 5-18" or "SFS2E 1-01").
- **Party_Chronicle_Template**: The Handlebars template (`templates/party-chronicle-filling.hbs`) that renders the party chronicle form inside the Foundry party sheet's Society tab.

## Requirements

### Requirement 1: Game System Detection

**User Story:** As a GM, I want the module to automatically detect whether I am running Pathfinder or Starfinder, so that it displays the correct currency and labels without manual configuration.

#### Acceptance Criteria

1. WHEN the module initializes, THE Game_System_Detector SHALL check `game.system.id` and the `sf2e-anachronism` module active status to determine the active game system
2. THE Game_System_Detector SHALL identify the system as Starfinder 2e when `game.system.id === 'sf2e'` OR when `game.modules.get('sf2e-anachronism')?.active` is true
3. THE Game_System_Detector SHALL identify the system as Pathfinder 2e when neither condition in criterion 2 is met
4. THE Game_System_Detector SHALL expose a function that returns the detected game system identifier for use by other modules

### Requirement 2: Module System Compatibility

**User Story:** As a GM, I want the module to declare compatibility with both PF2e and SF2e systems, so that Foundry VTT allows the module to load in either system.

#### Acceptance Criteria

1. THE Module_Manifest SHALL declare both "pf2e" and "sf2e" as compatible systems in the `relationships.systems` array of `module.json`
2. THE Module_Manifest SHALL register hooks for both `renderPartySheetPF2e` and the equivalent Starfinder party sheet hook so the Society tab is injected in either system
3. THE Module_Manifest SHALL register hooks for both `renderCharacterSheetPF2e` and the equivalent Starfinder character sheet hook so the Download/Delete Chronicle buttons appear in either system

### Requirement 3: Currency Display Formatting

**User Story:** As a GM, I want all currency values to display in the correct unit for the active game system, so that Starfinder chronicles show "Credits" instead of "gp".

#### Acceptance Criteria

1. WHILE the active game system is Pathfinder, THE Currency_Formatter SHALL format values with 2 decimal places and the suffix "gp" (e.g., "10.50 gp")
2. WHILE the active game system is Starfinder, THE Currency_Formatter SHALL format values as whole numbers with the suffix "Credits" (e.g., "105 Credits")
3. THE Currency_Formatter SHALL be used by `formatIncomeValue` in the Earned_Income_Calculator instead of the current hardcoded "gp" format
4. WHILE the active game system is Pathfinder, THE Currency_Formatter SHALL be used by `formatCurrencyValue` in the Treasure_Bundle_Calculator instead of the current hardcoded "gp" format
5. WHEN the Party_Chronicle_Template renders earned income display values, THE Party_Chronicle_Template SHALL use the Currency_Formatter output instead of hardcoded "0.00 gp" initial values
6. WHILE the active game system is Pathfinder, WHEN the Party_Chronicle_Template renders treasure bundle display values, THE Party_Chronicle_Template SHALL use the Currency_Formatter output instead of hardcoded "0.00 gp" initial values
7. WHILE the active game system is Starfinder, WHEN the Party_Chronicle_Template renders Credits Awarded display values, THE Party_Chronicle_Template SHALL use the Currency_Formatter to format the Credits_Awarded_Table lookup result
8. WHEN the Party_Chronicle_Template renders tooltip text referencing currency, THE Party_Chronicle_Template SHALL use the system-appropriate currency unit instead of hardcoded "gp"

### Requirement 4: Starfinder Earned Income Table

**User Story:** As a GM running Starfinder, I want the earned income calculations to use Credits (10× gold, rounded up), so that chronicle sheets reflect the correct Starfinder economy.

#### Acceptance Criteria

1. WHILE the active game system is Starfinder, THE Earned_Income_Calculator SHALL use the Starfinder_Income_Table for all income lookups
2. THE Starfinder_Income_Table SHALL contain values equal to each corresponding Pathfinder Income_Table value multiplied by 10, with the result rounded up to the nearest whole number (ceiling)
3. WHILE the active game system is Starfinder, THE Earned_Income_Calculator SHALL return earned income values as whole numbers with no fractional Credits
4. WHILE the active game system is Pathfinder, THE Earned_Income_Calculator SHALL continue to use the existing Pathfinder Income_Table with no changes to current behavior
5. THE Earned_Income_Calculator `calculateEarnedIncome` function SHALL apply ceiling rounding to the total earned income when the active game system is Starfinder
6. THE Earned_Income_Calculator `getIncomePerDay` function SHALL return Starfinder_Income_Table values when the active game system is Starfinder

### Requirement 5: Starfinder Credits Awarded by Character Level

**User Story:** As a GM running Starfinder, I want each character to automatically receive a flat Credits award based on their level at the end of a scenario, so that I do not need to manually input treasure bundle counts (which do not exist in Starfinder).

#### Acceptance Criteria

1. WHILE the active game system is Starfinder, THE Party_Chronicle_Template SHALL hide all treasure bundle input fields (the treasure bundle count dropdown and the per-character treasure bundle value display)
2. WHILE the active game system is Starfinder, THE Party_Chronicle_Template SHALL display a "Credits Awarded" value for each character, determined by looking up the character's level in the Credits_Awarded_Table
3. THE Credits_Awarded_Table SHALL map character levels 1-10 to flat credit amounts as follows: Level 1 = 140, Level 2 = 220, Level 3 = 380, Level 4 = 640, Level 5 = 1,000, Level 6 = 1,500, Level 7 = 2,200, Level 8 = 3,000, Level 9 = 4,400, Level 10 = 6,000
4. THE Credits_Awarded_Table SHALL contain only whole number values with no fractional Credits
5. WHILE the active game system is Starfinder, THE Credits Awarded lookup SHALL require no GM input — the value is determined entirely by the character's level
6. WHILE the active game system is Starfinder, THE `calculateCurrencyGained` function SHALL use the Credits_Awarded_Table lookup value (instead of a treasure bundle calculation) when computing total currency gained for a character
7. WHILE the active game system is Pathfinder, THE Treasure_Bundle_Calculator SHALL continue to use the existing treasure bundle count and per-level value lookup with no changes to current behavior

### Requirement 6: Starfinder Simplified XP and Downtime

**User Story:** As a GM running Starfinder, I want XP to be fixed at 4 per chronicle with no quest/bounty options, so that the form reflects Starfinder Society's scenario-only structure.

#### Acceptance Criteria

1. WHILE the active game system is Starfinder, THE Party_Chronicle_Template SHALL hide the "XP Earned" dropdown (which offers Bounty 1 XP / Quest 2 XP / Scenario 4 XP options)
2. WHILE the active game system is Starfinder, THE Party_Chronicle_Template SHALL display a fixed "4 XP" value in place of the dropdown
3. WHILE the active game system is Starfinder, THE Earned_Income_Calculator `calculateDowntimeDays` function SHALL always return 8 (since XP is always 4 and downtime = XP × 2). The downtime days value SHALL continue to be computed via `calculateDowntimeDays` (not hardcoded in the UI) so that a future spec can decouple earn income days from downtime days without changing the call site.
4. WHILE the active game system is Starfinder, THE Party_Chronicle_Template SHALL display the downtime days tooltip without references to Bounties or Quests
5. WHILE the active game system is Starfinder, THE XP tooltip SHALL not reference Bounties or Quests
6. WHILE the active game system is Pathfinder, THE Party_Chronicle_Template SHALL continue to display the XP Earned dropdown with all current options (Bounty, Quest, Scenario) with no changes to current behavior

### Requirement 7: Template Display String Externalization

**User Story:** As a GM, I want all user-facing labels and tooltips to reflect the active game system, so that Starfinder GMs see "Credits" and Starfinder-appropriate terminology throughout the form.

#### Acceptance Criteria

1. WHEN the Party_Chronicle_Template renders tooltip text that references "gold", THE Party_Chronicle_Template SHALL display "Credits" when the active game system is Starfinder
2. WHEN the Party_Chronicle_Template renders the "Currency Spent" field label, THE Party_Chronicle_Template SHALL display the system-appropriate currency unit
3. THE Party_Chronicle_Template SHALL receive the active game system identifier in its Handlebars context so that conditional rendering can select the correct display strings
4. WHILE the active game system is Starfinder, THE Party_Chronicle_Template SHALL hide the shared "Treasure Bundles" dropdown in the Shared Rewards sidebar section and display no treasure-bundle-related UI elements
5. WHILE the active game system is Starfinder, THE Party_Chronicle_Template SHALL display a "Credits Awarded" label and value (from the Credits_Awarded_Table) in place of the per-character treasure bundle value display
6. WHEN the `updateEarnedIncomeDisplay` handler updates a character's earned income value, THE Handler SHALL use the Currency_Formatter (via `formatIncomeValue`) to produce the system-appropriate display string
7. WHILE the active game system is Pathfinder, WHEN the `updateTreasureBundleDisplay` handler updates a character's treasure bundle value, THE Handler SHALL use the Currency_Formatter to produce the system-appropriate display string

### Requirement 8: Session Report System Identification

**User Story:** As a GM, I want the session report to identify the correct game system, so that the RPG Chronicles browser plugin submits the report to the right Paizo reporting form.

#### Acceptance Criteria

1. WHILE the active game system is Pathfinder, THE Session_Report_Builder SHALL set the `gameSystem` field to "PFS2E"
2. WHILE the active game system is Starfinder, THE Session_Report_Builder SHALL set the `gameSystem` field to "SFS2E"
3. WHILE the active game system is Starfinder, THE Scenario_Identifier SHALL parse Starfinder layout IDs (e.g., "sfs2.s1-01") into the format "SFS2E 1-01"
4. WHILE the active game system is Pathfinder, THE Scenario_Identifier SHALL continue to parse Pathfinder layout IDs (e.g., "pfs2.s5-18") into the format "PFS2E 5-18"

### Requirement 9: Calculation Consistency and Round-Trip Verification

**User Story:** As a developer, I want to verify that earned income calculations and Credits Awarded values are consistent and correct, so that the Starfinder economy values are trustworthy.

#### Acceptance Criteria

1. FOR ALL valid task levels (0-20), proficiency ranks, and success levels, THE Starfinder_Income_Table value SHALL equal `Math.ceil(pathfinder_value * 10)`
2. FOR ALL valid earned income calculations in Starfinder mode, THE Earned_Income_Calculator SHALL return a value that is a whole number (no fractional part)
3. FOR ALL character levels in the Credits_Awarded_Table (1-10), THE Credits_Awarded_Table value SHALL be a positive whole number
4. FOR ALL character levels (1-10) in the Credits_Awarded_Table, THE Credits_Awarded_Table value SHALL match the official Starfinder Society Guide values exactly (Level 1 = 140, Level 2 = 220, Level 3 = 380, Level 4 = 640, Level 5 = 1,000, Level 6 = 1,500, Level 7 = 2,200, Level 8 = 3,000, Level 9 = 4,400, Level 10 = 6,000)
