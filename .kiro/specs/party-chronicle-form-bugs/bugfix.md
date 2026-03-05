# Bugfix Requirements Document

## Introduction

This bugfix addresses four related bugs in the party chronicle form that were introduced during recent feature implementations. These bugs affect the Clear button functionality, chronicle path visibility, strikeout item PDF generation, and downloaded PDF filenames. All bugs impact the user experience when managing party chronicles and generating PDFs.

The bugs were discovered during testing after implementing the earned-income-calculation feature. The Clear button now incorrectly resets the selected scenario to the first scenario of the season instead of preserving the user's selection. Additionally, the chronicle path field visibility logic is not being triggered after clearing, strikeout items are not being passed to PDF generation, and the downloaded PDF filename uses an outdated module setting instead of the form's chronicle path value.

## Bug Analysis

### Current Behavior (Defect)

#### Bug 1: Clear Button Resets Scenario Selection

1.1 WHEN the user clicks the Clear button in the party chronicle form AND confirms the clear action THEN the system resets the selected scenario to the first scenario of the selected season instead of preserving the user's scenario selection

1.2 WHEN the form is re-rendered after clearing THEN the system displays the first scenario's chronicle path instead of the user's originally selected scenario's chronicle path

#### Bug 2: Chronicle Path Visibility Not Updated After Clear

2.1 WHEN the user clicks the Clear button AND confirms the clear action AND the selected scenario has a valid chronicle PDF file THEN the system displays the chronicle path input field instead of hiding it according to the conditional-chronicle-path-visibility requirements

2.2 WHEN the form is re-rendered after clearing THEN the system does not call the updateChroniclePathVisibility function to check file existence and update field visibility

#### Bug 3: Strikeout Items Not Passed to PDF Generation

3.1 WHEN the user selects strikeout items in the form AND clicks Generate Chronicles THEN the system does not pass the strikeout items to the PDF generation logic OR passes them in an incorrect format

3.2 WHEN the PDF is generated THEN the system does not render strikeout items on the chronicle PDF even though the strikeout items were selected in the form

#### Bug 4: Downloaded PDF Filename Uses Outdated Module Setting

4.1 WHEN the user clicks the download button for a generated chronicle PDF THEN the system uses the outdated module setting 'blankChroniclePath' to generate the filename instead of using the chronicle path from the form data

4.2 WHEN the filename is generated THEN the system extracts the scenario name from the wrong chronicle path, resulting in an incorrect filename that does not match the selected scenario

### Expected Behavior (Correct)

#### Bug 1: Clear Button Preserves Scenario Selection

2.1 WHEN the user clicks the Clear button in the party chronicle form AND confirms the clear action THEN the system SHALL preserve the selected season and scenario values

2.2 WHEN the form is re-rendered after clearing THEN the system SHALL display the chronicle path for the user's originally selected scenario

2.3 WHEN saving the cleared form data THEN the system SHALL include the preserved seasonId and layoutId in the saved data structure

#### Bug 2: Chronicle Path Visibility Updated After Clear

2.4 WHEN the user clicks the Clear button AND confirms the clear action THEN the system SHALL call updateChroniclePathVisibility after re-rendering the form

2.5 WHEN updateChroniclePathVisibility is called THEN the system SHALL check if the chronicle PDF file exists and hide the chronicle path field if the file exists and the layout has a default chronicle location

2.6 WHEN the chronicle path field should be hidden THEN the system SHALL remove the 'chronicle-path-visible' class from the chronicle path form group

#### Bug 3: Strikeout Items Passed to PDF Generation

2.7 WHEN the user selects strikeout items in the form AND clicks Generate Chronicles THEN the system SHALL extract the strikeout items from the form data and pass them to the chronicle generation handler

2.8 WHEN the chronicle generation handler processes the data THEN the system SHALL include the strikeout items in the SharedFields structure passed to mapToCharacterData

2.9 WHEN mapToCharacterData maps the data THEN the system SHALL include the strikeout items in the strikeout_item_lines field of the ChronicleData object

2.10 WHEN the PDF is generated THEN the system SHALL render the strikeout items on the chronicle PDF according to the layout configuration

#### Bug 4: Downloaded PDF Filename Uses Form Chronicle Path

2.11 WHEN the user clicks the download button for a generated chronicle PDF THEN the system SHALL use the chronicle path from the actor's flag data to generate the filename

2.12 WHEN the filename is generated THEN the system SHALL extract the scenario name from the correct chronicle path stored in the actor's flag data

2.13 WHEN the actor's flag data does not contain a chronicle path THEN the system SHALL fall back to using the module setting 'blankChroniclePath' for backward compatibility

### Unchanged Behavior (Regression Prevention)

#### Clear Button Functionality

3.1 WHEN the user clicks the Clear button AND cancels the confirmation dialog THEN the system SHALL CONTINUE TO preserve all form data without changes

3.2 WHEN the user clicks the Clear button AND confirms the clear action THEN the system SHALL CONTINUE TO clear all character-specific data (gold spent, notes, earned income fields)

3.3 WHEN the user clicks the Clear button AND confirms the clear action THEN the system SHALL CONTINUE TO preserve the GM PFS number, scenario name, and event code fields

3.4 WHEN the user clicks the Clear button AND confirms the clear action THEN the system SHALL CONTINUE TO set smart defaults for XP, treasure bundles, and downtime days based on the adventure type (bounty, quest, or scenario)

#### Chronicle Path Visibility

3.5 WHEN the user changes the season or layout selection THEN the system SHALL CONTINUE TO update the chronicle path visibility based on file existence

3.6 WHEN the user selects a file using the file picker button THEN the system SHALL CONTINUE TO update the chronicle path visibility after file selection

#### PDF Generation

3.7 WHEN the user clicks Generate Chronicles THEN the system SHALL CONTINUE TO generate PDFs for all party members with valid data

3.8 WHEN the PDF is generated THEN the system SHALL CONTINUE TO include all other form fields (character name, XP, gold, reputation, adventure summary checkboxes, etc.) in the PDF

#### Filename Generation

3.9 WHEN the user downloads a single-character chronicle from the character sheet THEN the system SHALL CONTINUE TO use the module setting 'blankChroniclePath' for filename generation (this is the legacy single-character chronicle feature, not the party chronicle form)

3.10 WHEN the filename is generated THEN the system SHALL CONTINUE TO sanitize the actor name and chronicle filename to ensure cross-platform compatibility
