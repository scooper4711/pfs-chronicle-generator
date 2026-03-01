# Requirements Document

## Introduction

This feature enhances the chronicle path input field in the party chronicle form by adding a File Picker button, similar to the implementation in the Layout Designer tool. Currently, the chronicle path field is a readonly text input without an easy way to browse and select files. This feature adds a file picker button next to the input field, allowing users to browse the Foundry data directory and select a blank chronicle PDF file.

This improves the user experience by providing a consistent file selection interface across the module and making it easier for users to locate and select chronicle PDF files.

## Glossary

- **Chronicle_Path_Field**: The input field in the party chronicle form that displays the path to the blank chronicle PDF
- **File_Picker_Button**: A button that opens the Foundry VTT File Picker dialog for browsing and selecting files
- **File_Picker_Widget**: A Foundry VTT UI component (FilePicker) that allows users to browse and select files from the Foundry data directory
- **Foundry_Data_Directory**: The root data directory for Foundry VTT where game assets are stored
- **Party_Chronicle_Form**: The form interface where users enter shared and character-specific chronicle data for multiple party members
- **Layout_Designer**: The existing tool in the module that already implements a file picker for selecting blank chronicle PDFs

## Requirements

### Requirement 1: Add File Picker Button to Chronicle Path Field

**User Story:** As a GM, I want a file picker button next to the chronicle path field, so that I can easily browse and select a blank chronicle PDF file.

#### Acceptance Criteria

1. WHEN the Party_Chronicle_Form is rendered, THE form SHALL display a File_Picker_Button next to the Chronicle_Path_Field
2. THE File_Picker_Button SHALL be visually consistent with the file picker button in the Layout_Designer
3. THE File_Picker_Button SHALL display a folder icon (fas fa-folder-open)
4. THE Chronicle_Path_Field SHALL remain readonly to prevent manual text entry

### Requirement 2: Open File Picker Dialog on Button Click

**User Story:** As a GM, I want the file picker dialog to open when I click the file picker button, so that I can browse the Foundry data directory for chronicle PDF files.

#### Acceptance Criteria

1. WHEN the File_Picker_Button is clicked, THE Party_Chronicle_Form SHALL open the File_Picker_Widget
2. THE File_Picker_Widget SHALL allow browsing of the Foundry_Data_Directory
3. THE File_Picker_Widget SHALL support selection of any file type
4. THE File_Picker_Widget SHALL use the Foundry VTT FilePicker.implementation API

### Requirement 3: Update Chronicle Path on File Selection

**User Story:** As a GM, I want the chronicle path field to be updated when I select a file in the file picker, so that the selected file path is used for chronicle generation.

#### Acceptance Criteria

1. WHEN a file is selected in the File_Picker_Widget, THE Party_Chronicle_Form SHALL update the Chronicle_Path_Field value with the selected file path
2. WHEN the Chronicle_Path_Field value is updated, THE Party_Chronicle_Form SHALL trigger the auto-save functionality to persist the change
3. THE selected file path SHALL be stored in the form data for chronicle generation
4. THE Chronicle_Path_Field SHALL display the full path to the selected file

### Requirement 4: Preserve Existing Auto-Save Behavior

**User Story:** As a GM, I want my chronicle path selection to be automatically saved, so that I don't lose my selection when switching between forms or refreshing the page.

#### Acceptance Criteria

1. WHEN the Chronicle_Path_Field value is updated via the File_Picker_Widget, THE Party_Chronicle_Form SHALL trigger the existing auto-save mechanism
2. THE auto-save mechanism SHALL persist the chronicle path to the world flags
3. WHEN the Party_Chronicle_Form is re-rendered, THE Chronicle_Path_Field SHALL display the previously saved chronicle path value
4. THE auto-save behavior SHALL be consistent with other form fields in the Party_Chronicle_Form

### Requirement 5: Hide Chronicle Path Field When Valid File Exists

**User Story:** As a GM, I want the chronicle path field to be hidden when a valid file path is set and the file exists, so that the form is less cluttered and I can focus on entering chronicle data.

#### Acceptance Criteria

1. WHEN the Party_Chronicle_Form is rendered AND a chronicle path value exists AND the file exists at that location, THE Party_Chronicle_Form SHALL hide the Chronicle_Path_Field and File_Picker_Button
2. WHEN the Party_Chronicle_Form is rendered AND the chronicle path is empty OR the file does not exist, THE Party_Chronicle_Form SHALL show the Chronicle_Path_Field and File_Picker_Button
3. THE Party_Chronicle_Form SHALL verify file existence using Foundry VTT's fetch API with HEAD requests
4. WHEN verifying file existence, THE Party_Chronicle_Form SHALL treat paths as relative to the Foundry_Data_Directory
5. WHEN the Chronicle_Path_Field is hidden, THE Party_Chronicle_Form SHALL preserve the chronicle path value in the form data for chronicle generation

### Requirement 6: Update Visibility When Chronicle Path Changes

**User Story:** As a GM, I want the chronicle path field visibility to update automatically when I select a file, so that the form adapts based on whether a valid file is selected.

#### Acceptance Criteria

1. WHEN a file is selected via the File_Picker_Widget AND the file exists, THE Party_Chronicle_Form SHALL hide the Chronicle_Path_Field and File_Picker_Button
2. WHEN the form is re-rendered AND the previously saved chronicle path file no longer exists, THE Party_Chronicle_Form SHALL show the Chronicle_Path_Field and File_Picker_Button
3. THE visibility update SHALL occur within 500ms of file selection
4. THE form SHALL re-check file existence each time it is rendered
