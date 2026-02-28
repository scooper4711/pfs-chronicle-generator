/**
 * Validation Display Handler Module
 * 
 * This module handles the display of validation errors in the Party Chronicle form.
 * It updates the validation error panel, inline field errors, and the generate button state.
 * 
 * IMPORTANT: This module is called from event handlers in main.ts as part of the
 * hybrid ApplicationV2 rendering pattern. Event listeners remain in main.ts.
 */

/**
 * Updates the validation display for the Party Chronicle form.
 * Validates both shared fields and character-specific fields, then updates
 * the UI to show errors and disable the generate button if needed.
 * 
 * @param $container - jQuery object containing the form container
 * @param partyActors - Array of party actor objects
 * @param extractFormData - Function to extract form data from the container
 */
export function updateValidationDisplay(
    $container: any,
    partyActors: any[],
    extractFormData: ($container: any, partyActors: any[]) => any
): void {
    // Import validation functions
    const { validateSharedFields, validateUniqueFields } = require('../model/party-chronicle-validator.js');
    
    // Extract form data
    const formData = extractFormData($container, partyActors);
    
    // Validate shared fields
    const sharedValidation = validateSharedFields(formData.shared);
    
    // Validate unique fields for all characters
    const characterValidations = validateAllCharacters(
        formData.characters,
        partyActors,
        validateUniqueFields
    );
    
    // Combine all errors
    const allErrors = [...sharedValidation.errors, ...characterValidations.allErrors];
    
    // Update UI components
    updateErrorPanel($container, allErrors);
    updateGenerateButton($container, allErrors);
    clearPreviousFieldErrors($container);
    renderSharedFieldErrors($container, sharedValidation.errors);
    renderCharacterErrors($container, partyActors, formData.characters, validateUniqueFields);
}

/**
 * Validates unique fields for all characters in the party.
 * 
 * @param characters - Object mapping actor IDs to character data
 * @param partyActors - Array of party actor objects
 * @param validateUniqueFields - Validation function for unique fields
 * @returns Object containing all errors and per-character validation results
 */
function validateAllCharacters(
    characters: any,
    partyActors: any[],
    validateUniqueFields: (unique: any, characterName: string) => { valid: boolean; errors: string[] }
): { allErrors: string[]; results: Map<string, { valid: boolean; errors: string[] }> } {
    const allErrors: string[] = [];
    const results = new Map<string, { valid: boolean; errors: string[] }>();
    
    for (const [actorId, unique] of Object.entries(characters)) {
        const actor = partyActors.find(a => a.id === actorId);
        const characterName = actor?.name || actorId;
        const result = validateUniqueFields(unique as any, characterName);
        results.set(actorId, result);
        allErrors.push(...result.errors);
    }
    
    return { allErrors, results };
}

/**
 * Updates the validation error summary panel.
 * Shows the panel with error list if there are errors, hides it otherwise.
 * 
 * @param $container - jQuery object containing the form container
 * @param errors - Array of error messages to display
 */
function updateErrorPanel($container: any, errors: string[]): void {
    const errorPanel = $container.find('#validationErrors');
    const errorList = $container.find('#validationErrorList');
    
    if (errors.length > 0) {
        // Show error panel with errors
        errorList.empty();
        errors.forEach(error => {
            errorList.append(`<li>${error}</li>`);
        });
        errorPanel.show();
    } else {
        // Hide error panel
        errorPanel.hide();
    }
}

/**
 * Updates the generate button state based on validation errors.
 * Disables the button and shows a tooltip if there are errors.
 * 
 * @param $container - jQuery object containing the form container
 * @param errors - Array of error messages
 */
function updateGenerateButton($container: any, errors: string[]): void {
    const generateButton = $container.find('#generateChronicles');
    
    if (errors.length > 0) {
        generateButton.prop('disabled', true);
        generateButton.attr('data-tooltip', 'Please correct validation errors before generating chronicles');
    } else {
        generateButton.prop('disabled', false);
        generateButton.attr('data-tooltip', 'Generate Chronicles');
    }
}

/**
 * Clears all previous field error styling from the form.
 * Removes error classes and error message spans.
 * 
 * @param $container - jQuery object containing the form container
 */
function clearPreviousFieldErrors($container: any): void {
    $container.find('.form-group').removeClass('has-error');
    $container.find('.field-error').remove();
}

/**
 * Renders inline error styling for shared fields based on validation errors.
 * Maps error messages to specific field IDs and adds error styling.
 * 
 * @param $container - jQuery object containing the form container
 * @param errors - Array of shared field error messages
 */
function renderSharedFieldErrors($container: any, errors: string[]): void {
    if (errors.length === 0) return;
    
    // Map of error keywords to field configurations
    const fieldErrorMap = [
        { keyword: 'GM PFS Number', fieldId: '#gmPfsNumber', errorText: 'Required' },
        { keyword: 'Scenario Name', fieldId: '#scenarioName', errorText: 'Required' },
        { keyword: 'Event Code', fieldId: '#eventCode', errorText: 'Required' },
        { keyword: 'Event Date', fieldId: '#eventDate', errorText: 'Invalid date' },
        { keyword: 'XP Earned', fieldId: '#xpEarned', errorText: 'Invalid value' },
        { keyword: 'Treasure Bundles', fieldId: '#treasureBundles', errorText: 'Must be 0-10' },
        { keyword: 'Layout selection', fieldId: '#layout', errorText: 'Required' },
        { keyword: 'Season selection', fieldId: '#season', errorText: 'Required' },
        { keyword: 'Blank Chronicle Path', fieldId: '#blankChroniclePath', errorText: 'Required' },
    ];
    
    errors.forEach(error => {
        for (const mapping of fieldErrorMap) {
            if (error.includes(mapping.keyword)) {
                addFieldError($container, mapping.fieldId, mapping.errorText);
            }
        }
    });
}

/**
 * Adds error styling to a specific field.
 * 
 * @param $container - jQuery object containing the form container
 * @param fieldId - CSS selector for the field
 * @param errorText - Error message to display
 */
function addFieldError($container: any, fieldId: string, errorText: string): void {
    const formGroup = $container.find(fieldId).closest('.form-group');
    formGroup.addClass('has-error');
    formGroup.find('label').after(`<span class="field-error">${errorText}</span>`);
}

/**
 * Renders inline error styling for character-specific fields.
 * Validates each character's unique fields and adds error styling.
 * 
 * @param $container - jQuery object containing the form container
 * @param partyActors - Array of party actor objects
 * @param characters - Object mapping actor IDs to character data
 * @param validateUniqueFields - Validation function for unique fields
 */
function renderCharacterErrors(
    $container: any,
    partyActors: any[],
    characters: any,
    validateUniqueFields: (unique: any, characterName: string) => { valid: boolean; errors: string[] }
): void {
    partyActors.forEach((actor: any) => {
        const actorId = actor.id;
        const characterName = actor.name;
        const unique = characters[actorId];
        const result = validateUniqueFields(unique as any, characterName);
        
        if (result.errors.length > 0) {
            result.errors.forEach(error => {
                // Map error messages to field IDs (remove character name prefix)
                const errorWithoutPrefix = error.replace(`${characterName}: `, '');
                
                if (errorWithoutPrefix.includes('Society ID')) {
                    const formGroup = $container.find(`#incomeEarned-${actorId}`).closest('.member-activity').find('.character-society-id');
                    formGroup.css('color', '#d32f2f');
                }
                if (errorWithoutPrefix.includes('Income Earned')) {
                    const formGroup = $container.find(`#incomeEarned-${actorId}`).closest('.form-group');
                    formGroup.addClass('has-error');
                }
                if (errorWithoutPrefix.includes('Gold Earned')) {
                    const formGroup = $container.find(`#goldEarned-${actorId}`).closest('.form-group');
                    formGroup.addClass('has-error');
                }
                if (errorWithoutPrefix.includes('Gold Spent')) {
                    const formGroup = $container.find(`#goldSpent-${actorId}`).closest('.form-group');
                    formGroup.addClass('has-error');
                }
            });
        }
    });
}
