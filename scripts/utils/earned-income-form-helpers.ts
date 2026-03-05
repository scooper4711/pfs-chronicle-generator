/**
 * Earned Income Form Helper Utilities
 * 
 * Helper functions for extracting earned income calculation parameters from the form.
 * These utilities follow the DRY principle by centralizing repeated logic.
 * 
 * Requirements: earned-income-calculation 7.3
 */

import { SHARED_FIELD_SELECTORS, CHARACTER_FIELD_SELECTORS } from '../constants/dom-selectors.js';
import { calculateDowntimeDays } from './earned-income-calculator.js';
import { updateEarnedIncomeDisplay } from '../handlers/party-chronicle-handlers.js';

/**
 * Earned income parameters extracted from the form
 */
export interface EarnedIncomeParams {
    characterId: string;
    taskLevel: number | '-';
    successLevel: string;
    proficiencyRank: string;
    downtimeDays: number;
}

/**
 * Extracts all earned income calculation parameters for a specific character from the form.
 * 
 * This function centralizes the logic for gathering:
 * - XP earned and treasure bundles (to calculate downtime days)
 * - Task level, success level, and proficiency rank for the character
 * 
 * @param characterId - The character's ID
 * @param container - The form container element
 * @returns Earned income parameters structure
 * 
 * Requirements: earned-income-calculation 7.3
 */
export function extractEarnedIncomeParams(
    characterId: string,
    container: HTMLElement
): EarnedIncomeParams {
    // Get shared fields (XP and treasure bundles) to calculate downtime days
    const xpEarnedSelect = container.querySelector<HTMLSelectElement>(SHARED_FIELD_SELECTORS.XP_EARNED);
    const xpEarned = parseInt(xpEarnedSelect?.value || '0', 10);
    
    const treasureBundlesSelect = container.querySelector<HTMLSelectElement>(SHARED_FIELD_SELECTORS.TREASURE_BUNDLES);
    const treasureBundles = parseFloat(treasureBundlesSelect?.value || '0');
    
    const downtimeDays = calculateDowntimeDays(xpEarned, treasureBundles);
    
    // Get character-specific fields
    const taskLevelSelect = container.querySelector<HTMLSelectElement>(CHARACTER_FIELD_SELECTORS.TASK_LEVEL(characterId));
    const taskLevelValue = taskLevelSelect?.value || '0';
    const taskLevel = taskLevelValue === '-' ? '-' : parseInt(taskLevelValue, 10);
    
    const successLevelSelect = container.querySelector<HTMLSelectElement>(CHARACTER_FIELD_SELECTORS.SUCCESS_LEVEL(characterId));
    const successLevel = successLevelSelect?.value || 'success';
    
    const proficiencyRankSelect = container.querySelector<HTMLSelectElement>(CHARACTER_FIELD_SELECTORS.PROFICIENCY_RANK(characterId));
    const proficiencyRank = proficiencyRankSelect?.value || 'trained';
    
    return {
        characterId,
        taskLevel,
        successLevel,
        proficiencyRank,
        downtimeDays
    };
}

/**
 * Extracts the character ID from a form field name.
 * 
 * @param fieldName - The form field name (e.g., "characters.abc123.taskLevel")
 * @returns The character ID, or null if not found
 */
export function extractCharacterIdFromFieldName(fieldName: string): string | null {
    const match = fieldName.match(/characters\.([^.]+)\./);
    return match ? match[1] : null;
}

/**
 * Creates a change event handler for character-specific earned income fields.
 * 
 * This function eliminates code duplication by providing a single handler factory
 * that works for task level, success level, and proficiency rank fields.
 * 
 * @param container - The form container element
 * @returns Event handler function
 * 
 * Requirements: earned-income-calculation 7.3
 */
export function createEarnedIncomeChangeHandler(
    container: HTMLElement
): (event: Event) => void {
    return (event: Event) => {
        const selectElement = event.target as HTMLSelectElement;
        const characterId = extractCharacterIdFromFieldName(selectElement.name);
        
        if (characterId) {
            const params = extractEarnedIncomeParams(characterId, container);
            updateEarnedIncomeDisplay(
                params.characterId,
                params.taskLevel,
                params.successLevel,
                params.proficiencyRank,
                params.downtimeDays,
                container
            );
        }
    };
}
