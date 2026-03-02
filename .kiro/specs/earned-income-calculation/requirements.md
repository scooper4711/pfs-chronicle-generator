# Requirements Document

## Introduction

The Earned Income Calculation feature automates the calculation of income earned during downtime days in Pathfinder Society scenarios. Players roll skill checks against task-level DCs to earn income, with the amount determined by their proficiency rank, success level, and number of downtime days. This feature replaces the manual "Income Earned" input field with an automated calculation similar to the existing treasure bundle calculation.

## Glossary

- **Chronicle_Form**: The party chronicle filling form in the PFS party sheet's Society tab
- **Income_Calculator**: The component that calculates earned income based on task level, proficiency, success level, and downtime days
- **Task_Level**: The difficulty level of the Earn Income task, selected from three character-relative options
- **Success_Level**: The outcome of the skill check (critical failure, failure, success, or critical success)
- **Proficiency_Rank**: The character's training level in the skill used (trained, expert, master, or legendary)
- **Downtime_Days**: The number of days available for earning income in the scenario, ranging from 0 to 8. This is a shared field that applies to all characters in the party.
- **Income_Per_Day**: The base currency amount earned per day based on task level and proficiency rank
- **Total_Income**: The final calculated income (Income_Per_Day × Downtime_Days)
- **Income_Table**: The lookup table containing income values for each combination of task level and proficiency rank
- **Character_Level**: The level of the player character, ranging from 1 to 20
- **Default_Task_Level**: Character_Level minus 2, the standard task level for earning income without feats or boons
- **Task_DC**: The difficulty class associated with a task level, determined by the DC by level table
- **Income_Display**: The read-only field showing the calculated total income
- **Infamy**: A character condition that reduces effective level for Earn Income task level calculations by 1
- **Task_Level_Options**: The five selectable task levels: "-" (opt-out/none), Character_Level - 3 (with infamy), Character_Level - 2 (default), Character_Level - 1 (with feat/boon), and Character_Level (with feat/boon)

## Requirements

### Requirement 1: Task Level Selection

**User Story:** As a player, I want to select the task level for my Earn Income check from character-relative options, so that I can account for infamy penalties, feats, and boons that affect task levels, or opt out of earning income.

#### Acceptance Criteria

1. THE Chronicle_Form SHALL display a task level dropdown for each character with exactly five options
2. THE Chronicle_Form SHALL offer Task_Level_Options: "-" (opt-out), Character_Level minus 3, Character_Level minus 2, Character_Level minus 1, and Character_Level
3. THE Chronicle_Form SHALL display the "-" option first in the dropdown
4. THE Chronicle_Form SHALL set the default task level to Character_Level minus 2
5. THE Chronicle_Form SHALL display each numeric option in the format "Level X (DC Y)" where X is the task level and Y is the corresponding Task_DC
6. THE Chronicle_Form SHALL display the "-" option as "-" without additional formatting
7. THE Chronicle_Form SHALL display explanatory text indicating that "-" means no earned income, Character_Level minus 3 is for characters with infamy, Character_Level minus 2 is the default, and higher options require feats or boons
8. WHERE any calculated task level is less than 0, THE Chronicle_Form SHALL use 0 as the minimum task level for that option
9. THE Chronicle_Form SHALL ensure all task level options are floored at 0 regardless of Character_Level

### Requirement 2: Downtime Days Input

**User Story:** As a GM, I want to specify the number of downtime days granted by the scenario, so that income calculations reflect the scenario's rewards for all party members.

#### Acceptance Criteria

1. THE Chronicle_Form SHALL provide a single shared input field for Downtime_Days in the shared section of the form
2. THE Chronicle_Form SHALL accept Downtime_Days values from 0 to 8
3. THE Chronicle_Form SHALL validate that Downtime_Days is a non-negative integer
4. WHEN Downtime_Days is 0, THE Income_Calculator SHALL calculate Total_Income as 0 for all characters
5. THE Downtime_Days field SHALL apply to all characters in the party

### Requirement 3: Success Level Input

**User Story:** As a player, I want to indicate whether I critically failed, failed, succeeded, or critically succeeded on my Earn Income check, so that my income is calculated correctly.

#### Acceptance Criteria

1. THE Chronicle_Form SHALL provide a Success_Level selection for each character
2. THE Chronicle_Form SHALL offer four Success_Level options: critical failure, failure, success, and critical success
3. THE Chronicle_Form SHALL set the default success level to "success"
4. WHEN Success_Level is critical failure, THE Income_Calculator SHALL set Total_Income to 0 regardless of other inputs
5. WHEN Success_Level is critical success, THE Income_Calculator SHALL use the income value for Task_Level plus 1
6. WHEN Success_Level is critical success AND Task_Level is 20, THE Income_Calculator SHALL use the special critical success row from Income_Table

### Requirement 4: Proficiency Rank Input

**User Story:** As a player, I want to specify my proficiency rank in the skill I'm using, so that my income reflects my training level.

#### Acceptance Criteria

1. THE Chronicle_Form SHALL provide a Proficiency_Rank selection for each character
2. THE Chronicle_Form SHALL offer four Proficiency_Rank options: trained, expert, master, and legendary
3. THE Income_Calculator SHALL use the Proficiency_Rank to determine Income_Per_Day from Income_Table

### Requirement 5: Income Table Data

**User Story:** As a developer, I want the income values stored in a structured format, so that the calculator can look up the correct income per day.

#### Acceptance Criteria

1. THE Income_Table SHALL contain income values for task levels 0 through 20
2. THE Income_Table SHALL contain income values for failure outcome at each task level
3. THE Income_Table SHALL contain income values for each Proficiency_Rank at each task level
4. THE Income_Table SHALL contain special critical success values for task level 20
5. THE Income_Table SHALL store currency values in a consistent format supporting copper pieces (cp), silver pieces (sp), and gold pieces (gp)
6. THE Income_Calculator SHALL convert all currency values to gold pieces for calculation purposes

### Requirement 6: Income Calculation Logic

**User Story:** As a player, I want my earned income calculated automatically, so that I don't have to manually compute the total.

#### Acceptance Criteria

1. WHEN all required inputs are provided, THE Income_Calculator SHALL calculate Total_Income
2. THE Income_Calculator SHALL retrieve Income_Per_Day from Income_Table based on Task_Level, Success_Level, and Proficiency_Rank
3. THE Income_Calculator SHALL multiply Income_Per_Day by Downtime_Days to calculate Total_Income
4. WHEN Success_Level is critical success, THE Income_Calculator SHALL look up income using Task_Level plus 1
5. WHEN Success_Level is critical success AND Task_Level is 20, THE Income_Calculator SHALL use the level 20 critical success row
6. WHEN Task_Level is "-", THE Income_Calculator SHALL set Total_Income to 0 regardless of other inputs
7. THE Income_Calculator SHALL round Total_Income to 2 decimal places
8. THE Income_Calculator SHALL format Total_Income as gold pieces with "gp" suffix

### Requirement 7: Income Display

**User Story:** As a player, I want to see my calculated earned income displayed clearly, so that I know what to record on my chronicle sheet.

#### Acceptance Criteria

1. THE Chronicle_Form SHALL display Total_Income in a read-only field for each character
2. THE Income_Display SHALL show the value in gold pieces with 2 decimal places
3. THE Income_Display SHALL update automatically when any input value changes
4. WHEN any required input is missing, THE Income_Display SHALL show a placeholder or zero value
5. THE Income_Display SHALL replace the previous manual "Income Earned" input field

### Requirement 8: Task DC Reference

**User Story:** As a player, I want to see the DC for each task level option, so that I know what I need to roll to succeed.

#### Acceptance Criteria

1. THE Chronicle_Form SHALL display the Task_DC alongside each task level option in the dropdown
2. THE Task_DC SHALL follow the standard Pathfinder 2e DC by level table
3. THE Chronicle_Form SHALL format task level options as "Level X (DC Y)"
4. THE Chronicle_Form SHALL look up the Task_DC for each of the three character-relative task levels using the DC by level table

#### DC by Level Table

The following table defines the Task_DC for each task level:

| Level | DC  |
| ----- | --- |
| 0     | 14  |
| 1     | 15  |
| 2     | 16  |
| 3     | 18  |
| 4     | 19  |
| 5     | 20  |
| 6     | 22  |
| 7     | 23  |
| 8     | 24  |
| 9     | 26  |
| 10    | 27  |
| 11    | 28  |
| 12    | 30  |
| 13    | 31  |
| 14    | 32  |
| 15    | 34  |
| 16    | 35  |
| 17    | 36  |
| 18    | 38  |
| 19    | 39  |
| 20    | 40  |

### Requirement 9: Validation and Error Handling

**User Story:** As a user, I want clear feedback when I enter invalid values, so that I can correct my inputs.

#### Acceptance Criteria

1. WHEN Downtime_Days is not a number, THE Chronicle_Form SHALL display a validation error
2. WHEN Downtime_Days is negative, THE Chronicle_Form SHALL display a validation error
3. WHEN Downtime_Days exceeds 8, THE Chronicle_Form SHALL display a validation error
4. WHEN Task_Level is not selected, THE Chronicle_Form SHALL use the Default_Task_Level
5. WHEN Task_Level is "-", THE Chronicle_Form SHALL NOT require Success_Level or Proficiency_Rank
6. WHEN Task_Level is not "-", THE Chronicle_Form SHALL require Success_Level to be selected
7. WHEN Task_Level is not "-", THE Chronicle_Form SHALL require Proficiency_Rank to be selected
8. WHEN Success_Level is not selected AND Task_Level is not "-", THE Chronicle_Form SHALL use "success" as the default value
9. WHEN Proficiency_Rank is not selected AND Task_Level is not "-", THE Chronicle_Form SHALL display a validation error or use a default value

### Requirement 10: Data Persistence

**User Story:** As a user, I want my earned income inputs saved with the chronicle data, so that I can review or regenerate chronicles later.

#### Acceptance Criteria

1. THE Chronicle_Form SHALL save Downtime_Days as a shared field
2. THE Chronicle_Form SHALL save Task_Level for each character
3. THE Chronicle_Form SHALL save Success_Level for each character
4. THE Chronicle_Form SHALL save Proficiency_Rank for each character
5. THE Chronicle_Form SHALL save the calculated Total_Income for each character
6. WHEN the form is reopened, THE Chronicle_Form SHALL restore all saved earned income values

### Requirement 11: Integration with Existing Form

**User Story:** As a developer, I want the earned income calculation to follow the same patterns as treasure bundle calculation, so that the codebase remains consistent.

#### Acceptance Criteria

1. THE Income_Calculator SHALL follow the same architectural pattern as the treasure bundle calculator
2. THE Chronicle_Form SHALL position Downtime_Days in the shared section alongside other shared fields
3. THE Chronicle_Form SHALL position task level, success level, and proficiency rank inputs in the character-specific section
4. THE Chronicle_Form SHALL use consistent styling with other calculated fields
5. THE Income_Calculator SHALL integrate with the existing form data extraction logic
6. THE Income_Calculator SHALL integrate with the existing validation system

### Requirement 12: PDF Generation Support

**User Story:** As a user, I want the calculated earned income to appear on the generated PDF chronicle, so that I have a complete record.

#### Acceptance Criteria

1. WHEN generating a PDF chronicle, THE Chronicle_Form SHALL include the Total_Income value
2. THE PDF_Generator SHALL write the Total_Income to the appropriate field on the chronicle template
3. THE PDF_Generator SHALL format the Total_Income value consistently with other currency fields
