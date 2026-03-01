# Design Document: Conditional Chronicle Path Visibility

## Overview

This feature enhances the chronicle path input field in the party chronicle form by adding a File Picker button and implementing conditional visibility. The design follows the existing pattern from the Layout Designer tool, ensuring consistency across the module.

The feature consists of two main components:
1. **File Picker Integration**: A button next to the chronicle path field that opens Foundry's FilePicker dialog for browsing and selecting PDF files
2. **Conditional Visibility**: Logic to hide the chronicle path field when a valid file path exists, reducing form clutter

This design leverages Foundry VTT's built-in FilePicker API and follows the module's hybrid ApplicationV2 architecture pattern where event listeners are attached in `main.ts` rather than in ApplicationV2 lifecycle methods.

## Architecture

### Component Structure

The implementation spans multiple files following the module's established architecture:

**Template Layer** (`templates/party-chronicle-filling.hbs`):
- Modify the chronicle path form group to include a file picker button
- Wrap the input and button in a `form-fields` div (matching Layout Designer pattern)
- Add conditional visibility class/attribute for showing/hiding the field

**Context Preparation** (`scripts/PartyChronicleApp.ts`):
- Add `chroniclePathExists` boolean to template context
- Implement file existence check using Foundry's fetch API with HEAD request
- Ensure chronicle path value is always available in context for form data

**Event Handling** (`scripts/main.ts`):
- Attach click event listener to file picker button in `attachEventListeners()`
- Call handler function from `handlers/party-chronicle-handlers.ts`

**Handler Logic** (`scripts/handlers/party-chronicle-handlers.ts`):
- Implement `handleChroniclePathFilePicker()` function
- Open FilePicker dialog with callback to update field and trigger auto-save
- Implement `updateChroniclePathVisibility()` function to show/hide field based on file existence

**Utility Functions** (if needed):
- File existence checking may be extracted to a utility function if reused

### Data Flow

1. **Form Rendering**:
   - `PartyChronicleApp._prepareContext()` checks if chronicle path file exists
   - Context includes `chroniclePathExists` boolean
   - Template conditionally shows/hides field based on this flag

2. **File Selection**:
   - User clicks file picker button
   - `handleChroniclePathFilePicker()` opens FilePicker dialog
   - User selects file, callback updates input field value
   - Auto-save mechanism persists the new path
   - `updateChroniclePathVisibility()` hides the field if file exists

3. **Form Re-rendering**:
   - When form is re-rendered, context preparation re-checks file existence
   - Field visibility updates based on current file existence status

### Integration Points

**Foundry VTT APIs**:
- `foundry.applications.apps.FilePicker.implementation` - File picker dialog
- `fetch()` with HEAD method - File existence verification
- `game.settings` - Chronicle path persistence (existing)

**Existing Module Components**:
- Auto-save mechanism (existing in `handleFieldChange()`)
- Form data extraction (existing in `extractFormData()`)
- Template rendering (existing in `renderPartyChronicleForm()`)

## Components and Interfaces

### Template Changes

**File**: `templates/party-chronicle-filling.hbs`

Modify the chronicle path form group from:
```handlebars
<div class="form-group">
    <label for="blankChroniclePath">Chronicle Path</label>
    <input type="text" id="blankChroniclePath" name="shared.blankChroniclePath" value="{{shared.blankChroniclePath}}" readonly>
</div>
```

To:
```handlebars
<div class="form-group {{#unless chroniclePathExists}}chronicle-path-visible{{/unless}}" id="chroniclePathGroup">
    <label for="blankChroniclePath">Chronicle Path</label>
    <div class="form-fields">
        <input type="text" id="blankChroniclePath" name="shared.blankChroniclePath" value="{{shared.blankChroniclePath}}" readonly>
        <button type="button" class="file-picker-button" id="chroniclePathFilePicker"><i class="fas fa-folder-open"></i></button>
    </div>
</div>
```

**CSS Changes** (if needed):
```css
.form-group:not(.chronicle-path-visible) {
    display: none;
}
```

### Context Preparation

**File**: `scripts/PartyChronicleApp.ts`

Add to `_prepareContext()` method:

```typescript
async _prepareContext(options?: any): Promise<any> {
    // ... existing context preparation ...
    
    // Check if chronicle path file exists
    const chroniclePath = savedData?.shared?.blankChroniclePath || '';
    const chroniclePathExists = await this.checkFileExists(chroniclePath);
    
    return {
        // ... existing context properties ...
        chroniclePathExists,
    };
}

/**
 * Checks if a file exists at the given path
 * 
 * Uses Foundry's fetch API with HEAD request to verify file existence
 * without downloading the entire file.
 * 
 * @param path - File path relative to Foundry data directory
 * @returns True if file exists and is accessible, false otherwise
 */
private async checkFileExists(path: string): Promise<boolean> {
    if (!path) return false;
    
    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.log(`Chronicle path file not accessible: ${path}`);
        return false;
    }
}
```

### Event Listener Attachment

**File**: `scripts/main.ts`

Add to `attachEventListeners()` function:

```typescript
function attachEventListeners(
    container: HTMLElement,
    partyActors: any[],
    partySheet: any
): void {
    // ... existing event listeners ...
    
    // Chronicle path file picker button handler
    const filePickerButton = container.querySelector('#chroniclePathFilePicker');
    filePickerButton?.addEventListener('click', async (event: Event) => {
        await handleChroniclePathFilePicker(event, container, partyActors);
    });
}
```

### Handler Functions

**File**: `scripts/handlers/party-chronicle-handlers.ts`

Add new handler functions:

```typescript
/**
 * Handles chronicle path file picker button click
 * 
 * Opens Foundry's FilePicker dialog to allow browsing and selecting
 * a blank chronicle PDF file. Updates the input field and triggers
 * auto-save when a file is selected.
 * 
 * @param event - Click event from file picker button
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * 
 * Requirements: conditional-chronicle-path-visibility 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4
 */
export async function handleChroniclePathFilePicker(
    event: Event,
    container: HTMLElement,
    partyActors: any[]
): Promise<void> {
    event.preventDefault();
    
    const filePicker = new foundry.applications.apps.FilePicker.implementation({
        type: 'any',
        callback: async (path: string) => {
            // Update input field
            const input = container.querySelector('#blankChroniclePath') as HTMLInputElement;
            if (input) {
                input.value = path;
                
                // Trigger auto-save
                await saveFormData(container, partyActors);
                
                // Update visibility
                await updateChroniclePathVisibility(path, container);
            }
        }
    });
    
    await filePicker.browse();
}

/**
 * Updates chronicle path field visibility based on file existence
 * 
 * Checks if the file at the given path exists and hides the chronicle
 * path field if it does. Shows the field if the file doesn't exist.
 * 
 * @param path - Chronicle path to check
 * @param container - Form container element
 * 
 * Requirements: conditional-chronicle-path-visibility 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3
 */
export async function updateChroniclePathVisibility(
    path: string,
    container: HTMLElement
): Promise<void> {
    const formGroup = container.querySelector('#chroniclePathGroup');
    if (!formGroup) return;
    
    const fileExists = await checkFileExists(path);
    
    if (fileExists) {
        formGroup.classList.remove('chronicle-path-visible');
    } else {
        formGroup.classList.add('chronicle-path-visible');
    }
}

/**
 * Checks if a file exists at the given path
 * 
 * Uses Foundry's fetch API with HEAD request to verify file existence
 * without downloading the entire file.
 * 
 * @param path - File path relative to Foundry data directory
 * @returns True if file exists and is accessible, false otherwise
 */
async function checkFileExists(path: string): Promise<boolean> {
    if (!path) return false;
    
    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.log(`Chronicle path file not accessible: ${path}`);
        return false;
    }
}
```

## Data Models

### Context Data Structure

The template context is extended with a new property:

```typescript
interface PartyChronicleContext {
    // ... existing properties ...
    
    /**
     * Indicates whether a valid chronicle path file exists
     * Used to control visibility of the chronicle path field
     */
    chroniclePathExists: boolean;
}
```

### Form Data Structure

No changes to the existing `PartyChronicleData` structure. The chronicle path continues to be stored in `shared.blankChroniclePath`.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing the acceptance criteria, I identified the following testable properties and examples. Several criteria were found to be redundant or covered by other properties:

**Redundancies Identified**:
- Criteria 3.4 (display full path) is covered by 3.1 (update field value) - if the value is updated, it will be displayed
- Criteria 4.1 (trigger auto-save) is a duplicate of 3.2
- Criteria 5.1 and 6.1 both test hiding the field when file exists - these can be combined into one property
- Criteria 5.2 and 6.2 both test showing the field when file doesn't exist - these can be combined into one property

**Non-Testable Criteria**:
- Visual consistency (1.2) - requires manual inspection
- FilePicker internal behavior (2.1, 2.2) - controlled by Foundry VTT
- Existing auto-save behavior (4.2, 4.4) - already tested
- Path interpretation (5.4) - handled by Foundry automatically
- Performance timing (6.3) - integration test concern

### Property 1: File Picker Callback Updates Input Field

*For any* file path selected through the FilePicker callback, the chronicle path input field value should be updated to match the selected path.

**Validates: Requirements 3.1, 3.4**

### Property 2: File Selection Triggers Auto-Save

*For any* file path selected through the FilePicker, the auto-save mechanism should be triggered to persist the chronicle path value.

**Validates: Requirements 3.2, 4.1**

### Property 3: Chronicle Path Persists in Form Data

*For any* chronicle path value set in the form, extracting the form data should include that path in the shared fields, regardless of whether the field is visible or hidden.

**Validates: Requirements 3.3, 5.5**

### Property 4: Saved Chronicle Path Persists Across Re-renders

*For any* chronicle path value that is saved, re-rendering the form should display that same path value in the chronicle path input field.

**Validates: Requirements 4.3**

### Property 5: Field Hidden When Valid File Exists

*For any* chronicle path where the file exists and is accessible, the chronicle path field and file picker button should be hidden when the form is rendered.

**Validates: Requirements 5.1, 6.1**

### Property 6: Field Shown When File Missing or Path Empty

*For any* chronicle path that is empty or where the file does not exist, the chronicle path field and file picker button should be visible when the form is rendered.

**Validates: Requirements 5.2, 6.2**

### Example Tests

The following specific examples should be tested:

**Example 1: File Picker Button Exists in Rendered Form**
- When the party chronicle form is rendered, the file picker button should exist in the DOM next to the chronicle path input field
- **Validates: Requirements 1.1**

**Example 2: File Picker Button Has Folder Icon**
- The file picker button should contain an `<i>` element with the CSS class "fas fa-folder-open"
- **Validates: Requirements 1.3**

**Example 3: Chronicle Path Field is Readonly**
- The chronicle path input field should have the "readonly" attribute set
- **Validates: Requirements 1.4**

**Example 4: FilePicker Configured with Type 'any'**
- When instantiating the FilePicker, the configuration should include `type: 'any'` to allow selection of any file type
- **Validates: Requirements 2.3**

**Example 5: FilePicker Uses Foundry Implementation API**
- The file picker should be instantiated using `foundry.applications.apps.FilePicker.implementation`
- **Validates: Requirements 2.4**

**Example 6: File Existence Check Uses HEAD Request**
- When checking if a file exists, the implementation should use `fetch()` with `method: 'HEAD'`
- **Validates: Requirements 5.3**

**Example 7: File Existence Checked on Each Render**
- When the form is rendered, the file existence check function should be called during context preparation
- **Validates: Requirements 6.4**

## Error Handling

### File Existence Check Failures

**Scenario**: Network error or permission issue when checking file existence

**Handling**:
- Catch exceptions from `fetch()` calls
- Log the error to console for debugging
- Treat failed checks as "file does not exist" (show the field)
- This ensures the form remains functional even if file checks fail

**Implementation**:
```typescript
try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
} catch (error) {
    console.log(`Chronicle path file not accessible: ${path}`);
    return false; // Treat as file not existing
}
```

### FilePicker Dialog Errors

**Scenario**: FilePicker fails to open or encounters an error

**Handling**:
- Foundry's FilePicker handles its own errors internally
- If the callback is never called, the form state remains unchanged
- No additional error handling needed in our code

### Empty or Invalid Paths

**Scenario**: Chronicle path is empty, null, or undefined

**Handling**:
- File existence check returns `false` immediately for empty paths
- Field remains visible, allowing user to select a file
- No error messages needed - this is a valid state

### Auto-Save Failures

**Scenario**: Auto-save fails to persist chronicle path

**Handling**:
- Existing auto-save mechanism handles errors
- Error is logged and user is notified via Foundry's notification system
- This feature doesn't add new error handling for auto-save

## Testing Strategy

### Dual Testing Approach

This feature will be tested using both unit tests and property-based tests:

**Unit Tests**:
- Specific examples (file picker button exists, has correct icon, etc.)
- Edge cases (empty paths, null values, network errors)
- Integration points (FilePicker instantiation, auto-save triggering)
- DOM structure verification

**Property-Based Tests**:
- Universal properties across all file paths
- Visibility behavior with various file existence states
- Form data persistence across re-renders
- Auto-save triggering for any file selection

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: conditional-chronicle-path-visibility, Property {number}: {property_text}`

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: conditional-chronicle-path-visibility, Property 1: File Picker Callback Updates Input Field
test('Property 1: File picker callback updates input field for any path', () => {
    fc.assert(
        fc.property(
            fc.string(), // Generate random file paths
            (filePath) => {
                // Test that callback updates input field
                // ... test implementation ...
            }
        ),
        { numRuns: 100 }
    );
});
```

### Unit Test Coverage

**Template Rendering Tests**:
- Verify file picker button is rendered in correct location
- Verify button has correct icon class
- Verify input field has readonly attribute
- Verify form-fields wrapper structure matches Layout Designer

**Event Handler Tests**:
- Verify file picker button click opens FilePicker
- Verify FilePicker callback updates input field
- Verify auto-save is triggered after file selection
- Verify visibility update is called after file selection

**Visibility Logic Tests**:
- Verify field is hidden when file exists
- Verify field is shown when file doesn't exist
- Verify field is shown when path is empty
- Verify visibility updates after file selection

**File Existence Check Tests**:
- Verify HEAD request is made to check file existence
- Verify empty paths return false
- Verify network errors are handled gracefully
- Verify successful responses return true

**Form Data Persistence Tests**:
- Verify chronicle path is included in extracted form data
- Verify hidden fields still contribute to form data
- Verify saved paths are restored on re-render

### Integration Testing

**Manual Testing Checklist**:
1. Open party chronicle form
2. Verify file picker button appears next to chronicle path field
3. Click file picker button and verify FilePicker dialog opens
4. Select a PDF file and verify path is updated in input field
5. Verify field is hidden after selecting a valid file
6. Refresh the form and verify path is still saved
7. Delete or move the selected file
8. Re-render the form and verify field becomes visible again
9. Verify chronicles can be generated with the selected path

**Edge Cases to Test Manually**:
- Selecting a file that doesn't exist
- Selecting a non-PDF file
- Canceling the FilePicker dialog
- Selecting a file from a different directory
- Network issues during file existence check

### Test Organization

Tests will be organized in a new test file:

**File**: `scripts/handlers/chronicle-path-visibility.test.ts`

This keeps the tests close to the handler functions they're testing and follows the module's existing test organization pattern.

