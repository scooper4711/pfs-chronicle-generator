# Requirements Document

## Introduction

The Treasure Bundle Calculation feature automates the conversion of treasure bundles (a shared party reward) into character-specific gold values based on character level. Currently, the system requires manual calculation and entry of gold earned values. This feature eliminates manual calculation errors and streamlines chronicle generation by automatically computing gold values from treasure bundles and income earned.

### Parameter Naming Constraint

This feature MUST use the exact parameter names `treasure_bundles_gp`, `gp_gained`, and `income_earned` for compatibility with the existing PDF generation system. These parameter names are already defined in the PDF layouts used by the single-character chronicle functionality that the party chronicle sheet is replacing. Changing these names would break PDF generation across all existing chronicle layouts.

- `treasure_bundles_gp`: The calculated gold value from treasure bundles (treasure bundles × treasure bundle value)
- `gp_gained`: The total gold gained (treasure_bundles_gp + income_earned)
- `income_earned`: Additional gold from downtime activities or other sources

These parameter names are non-negotiable and must be used exactly as specified throughout the implementation.

## Glossary

- **Treasure_Bundle**: A shared reward unit earned by the entire party during an adventure (integer value 0-10)
- **Character_Level**: The level of a player character (integer value 1-20)
- **Treasure_Bundle_Value**: The gold piece value of a single treasure bundle for a specific character level
- **treasure_bundles_gp**: The total gold value from treasure bundles for a character (treasure bundles × treasure bundle value for character level) - REQUIRED parameter name for PDF compatibility
- **income_earned**: Additional gold earned by a character through downtime activities or other sources - REQUIRED parameter name for PDF compatibility
- **gp_gained**: The sum of treasure_bundles_gp and income_earned - REQUIRED parameter name for PDF compatibility
- **Party_Chronicle_Form**: The UI form for filling out chronicles for all party members at once
- **PDF_Generator**: The system component that renders chronicle data onto blank PDF templates

## Requirements

### Requirement 1: Treasure Bundle Value Lookup

**User Story:** As a GM, I want treasure bundles to automatically convert to the correct gold value for each character's level, so that I don't have to manually calculate gold values.

#### Acceptance Criteria

1. THE System SHALL maintain a lookup table mapping character levels 1-20 to treasure bundle values
2. THE lookup table SHALL contain the following mappings:
   - Level 1: 1.4 gp, Level 2: 2.2 gp, Level 3: 3.8 gp, Level 4: 6.4 gp, Level 5: 10 gp
   - Level 6: 15 gp, Level 7: 22 gp, Level 8: 30 gp, Level 9: 44 gp, Level 10: 60 gp
   - Level 11: 86 gp, Level 12: 124 gp, Level 13: 188 gp, Level 14: 274 gp, Level 15: 408 gp
   - Level 16: 620 gp, Level 17: 960 gp, Level 18: 1560 gp, Level 19: 2660 gp, Level 20: 3680 gp
3. WHEN a character level is provided, THE System SHALL return the corresponding treasure bundle value
4. IF a character level is outside the range 1-20, THEN THE System SHALL return 0 gp

### Requirement 2: Calculate Treasure Bundle Gold

**User Story:** As a GM, I want the system to calculate treasure bundle gold for each character, so that characters of different levels receive the correct gold amounts.

#### Acceptance Criteria

1. WHEN treasure bundles and character level are provided, THE System SHALL calculate treasure_bundles_gp as (treasure bundles × treasure bundle value for character level)
2. THE System SHALL round treasure_bundles_gp to 2 decimal places
3. WHEN treasure bundles is 0, THE System SHALL return 0 gp for treasure_bundles_gp
4. FOR ALL character levels 1-20, THE calculation SHALL use the correct treasure bundle value from the lookup table

### Requirement 3: Calculate Total Gold Gained

**User Story:** As a GM, I want the system to calculate total gold gained for PDF generation, so that the chronicle shows the correct total gold amount.

#### Acceptance Criteria

1. WHEN treasure_bundles_gp and income_earned are provided, THE System SHALL calculate gp_gained as (treasure_bundles_gp + income_earned)
2. THE System SHALL round gp_gained to 2 decimal places
3. THE gp_gained value SHALL be passed to PDF_Generator using the exact parameter name "gp_gained"
4. WHEN both treasure_bundles_gp and income_earned are 0, THE System SHALL pass 0 as gp_gained

### Requirement 4: Display Treasure Bundle Gold in Form

**User Story:** As a GM, I want to see the calculated treasure bundle gold value for each character in the form, so that I can verify the calculation is correct before generating chronicles.

#### Acceptance Criteria

1. THE Party_Chronicle_Form SHALL display a "Treasure Bundle Value" field for each character
2. THE "Treasure Bundle Value" field SHALL be read-only text (not an editable input)
3. WHEN treasure bundles or character level changes, THE System SHALL update the displayed treasure_bundles_gp value
4. THE displayed value SHALL show gold amounts formatted to 2 decimal places with "gp" suffix
5. THE "Treasure Bundle Value" field SHALL replace the current "Gold Earned" input field in the character-specific section

### Requirement 5: Remove Manual Gold Earned Input

**User Story:** As a GM, I want the gold earned field to be calculated automatically, so that I cannot accidentally enter incorrect values.

#### Acceptance Criteria

1. THE Party_Chronicle_Form SHALL NOT display an editable "Gold Earned" input field in the character-specific section
2. THE System SHALL NOT store a goldEarned value in UniqueFields data structure
3. THE System SHALL calculate treasure_bundles_gp at PDF generation time
4. WHEN loading saved party chronicle data, THE System SHALL ignore any legacy goldEarned values

### Requirement 6: Preserve Income Earned Field

**User Story:** As a GM, I want to continue entering income earned separately, so that I can track downtime earnings and other income sources.

#### Acceptance Criteria

1. THE Party_Chronicle_Form SHALL display an editable "Income Earned" input field for each character
2. THE "Income Earned" field SHALL accept decimal values with 2 decimal places
3. THE System SHALL store income_earned values in the UniqueFields data structure using the exact field name "income_earned"
4. WHEN generating PDFs, THE System SHALL pass income_earned to PDF_Generator using the exact parameter name "income_earned"

### Requirement 7: Update Data Mapping for PDF Generation

**User Story:** As a developer, I want the data mapper to calculate treasure bundle gold and total gold gained, so that PDF generation receives correct values with correct parameter names.

#### Acceptance Criteria

1. WHEN mapping party chronicle data to chronicle data, THE System SHALL calculate treasure_bundles_gp using character level and shared treasure bundles
2. THE System SHALL pass treasure_bundles_gp to PDF_Generator using the exact parameter name "treasure_bundles_gp"
3. THE System SHALL calculate gp_gained as (treasure_bundles_gp + income_earned)
4. THE System SHALL pass gp_gained to PDF_Generator using the exact parameter name "gp_gained"
5. THE System SHALL pass income_earned to PDF_Generator using the exact parameter name "income_earned"
6. THE System SHALL NOT use the goldEarned field from UniqueFields for PDF generation

### Requirement 8: Maintain Backward Compatibility

**User Story:** As a GM, I want existing saved party chronicle data to continue working, so that I don't lose my in-progress chronicles.

#### Acceptance Criteria

1. WHEN loading saved party chronicle data with legacy goldEarned values, THE System SHALL ignore the goldEarned values
2. THE System SHALL recalculate treasure_bundles_gp from treasure bundles and character level
3. THE System SHALL preserve income_earned values from saved data
4. WHEN saving party chronicle data, THE System SHALL NOT include goldEarned in the saved data structure

### Requirement 9: Update Form Auto-Save

**User Story:** As a GM, I want the form to auto-save when I change treasure bundles, so that my calculated gold values are preserved.

#### Acceptance Criteria

1. WHEN the treasure bundles field changes, THE System SHALL trigger auto-save
2. WHEN the income_earned field changes, THE System SHALL trigger auto-save
3. THE auto-save SHALL store treasure bundles and income_earned values
4. THE auto-save SHALL NOT store calculated treasure_bundles_gp values

### Requirement 10: Update Validation Logic

**User Story:** As a GM, I want validation to check income earned but not gold earned, so that I receive appropriate error messages.

#### Acceptance Criteria

1. THE System SHALL validate that income_earned is a non-negative number
2. THE System SHALL NOT validate a goldEarned field (as it no longer exists in the form)
3. WHEN income_earned is negative, THE System SHALL display an error message
4. THE validation SHALL allow income_earned to be 0
