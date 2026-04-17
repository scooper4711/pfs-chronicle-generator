/**
 * Party Chronicle Event Handlers
 * 
 * This module contains event handler logic for the party chronicle form.
 * These handlers are called from event listeners attached in main.ts.
 * 
 * Architecture Note:
 * Due to the hybrid ApplicationV2 pattern used in this module, event listeners
 * MUST be attached in main.ts (renderPartyChronicleForm function), not in
 * PartyChronicleApp._onRender. See architecture.md for details.
 * 
 * Requirements: party-chronicle-filling 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { debug, warn, error } from '../utils/logger.js';
import { layoutStore } from '../LayoutStore.js';
import { savePartyChronicleData } from '../model/party-chronicle-storage.js';
import { updateLayoutSpecificFields } from '../utils/layout-utils.js';
import { updateValidationDisplay } from './validation-display.js';
import { extractFormData } from './form-data-extraction.js';
import { generateChroniclesFromPartyData } from './chronicle-generation.js';
import { updateSectionSummary } from './collapsible-section-handlers.js';
import { 
    SHARED_FIELD_SELECTORS,
    CSS_CLASSES
} from '../constants/dom-selectors.js';
import type { PartyActor } from './event-listener-helpers.js';
import type { ChronicleFormData } from '../model/party-chronicle-types.js';

// Re-export for backward compatibility
export { extractFormData, generateChroniclesFromPartyData };

// Re-export shared rewards handlers so existing imports keep working
export {
    updateTreasureBundleDisplay,
    updateAllTreasureBundleDisplays,
    updateAllCreditsAwardedDisplays,
    updateEarnedIncomeDisplay,
    updateAllEarnedIncomeDisplays,
    updateDowntimeDaysDisplay,
    getDefaultTreasureBundles,
    updateTreasureBundlesForXp,
    updateXpForSeason
} from './shared-rewards-handlers.js';

// Local import for use within this file
import {
    updateAllTreasureBundleDisplays,
    updateTreasureBundleDisplay,
    updateAllEarnedIncomeDisplays
} from './shared-rewards-handlers.js';

/**
 * Handles portrait image click events to open character sheets
 * 
 * This handler is called when a user clicks on a character portrait in the
 * party chronicle form. It finds the associated actor and opens their sheet.
 * 
 * @param event - The mouse click event
 * @param partyActors - Array of party member actors
 * 
 * Requirements: clickable-player-portraits 1.1, 1.3, 1.4, 3.1, 3.2, 3.3
 */
export function handlePortraitClick(event: MouseEvent, partyActors: PartyActor[]): void {
    debug('Portrait clicked!', event.target);
    event.preventDefault();
    
    const memberActivity = (event.target as HTMLElement).closest('.member-activity') as HTMLElement | null;
    debug('Member activity element:', memberActivity);
    
    const characterId = memberActivity?.dataset.characterId;
    debug('Character ID:', characterId);
    
    if (!characterId) {
        warn('Portrait clicked but no character ID found');
        return;
    }
    
    const actor = partyActors.find(a => a?.id === characterId)
        ?? (game.actors.get(characterId) as PartyActor | undefined);
    debug('Found actor:', actor?.name ?? 'not found');
    
    if (actor?.sheet) {
        debug('Opening actor sheet');
        actor.sheet.render(true, { focus: true });
    } else {
        warn('Actor or actor sheet not found');
    }
}

/**
 * Handles season dropdown change events
 * 
 * When the season changes, this handler:
 * 1. Updates the layout dropdown with layouts for the selected season
 * 2. Triggers a layout change if layouts are available
 * 3. Auto-saves the form data
 * 4. Updates validation display
 * 
 * @param event - The change event from the season dropdown
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @param extractFormData - Function to extract form data from the container
 * 
 * Requirements: party-chronicle-filling 5.2
 */
export async function handleSeasonChange(
    event: Event,
    container: HTMLElement,
    partyActors: PartyActor[],
    extractFormData: (container: HTMLElement, partyActors: PartyActor[]) => ChronicleFormData
): Promise<void> {
    debug('Season changed');
    const seasonId = (event.target as HTMLSelectElement).value;
    const layouts = layoutStore.getLayoutsByParent(seasonId);
    
    const layoutDropdown = container.querySelector('#layout') as HTMLSelectElement;
    if (!layoutDropdown) return;
    
    layoutDropdown.innerHTML = '';
    for (const layout of layouts) {
        const option = document.createElement('option');
        option.value = layout.id;
        option.innerText = layout.description;
        layoutDropdown.appendChild(option);
    }
    
    if (layouts.length > 0) {
        layoutDropdown.value = layouts[0].id;
        layoutDropdown.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Auto-select XP earned based on season type
    // (imported from shared-rewards-handlers)
    const { updateXpForSeason } = await import('./shared-rewards-handlers.js');
    updateXpForSeason(seasonId, container);
    
    // Auto-save
    await saveFormData(container, partyActors);
    
    // Update validation display
    updateValidationDisplay(container, partyActors, extractFormData);
}

/**
 * Handles layout dropdown change events
 * 
 * When the layout changes, this handler:
 * 1. Updates the blank chronicle path if the layout has a default location
 * 2. Updates layout-specific fields (checkboxes and strikeout items)
 * 3. Auto-saves the form data
 * 4. Updates validation display
 * 
 * @param event - The change event from the layout dropdown
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @param extractFormData - Function to extract form data from the container
 * 
 * Requirements: party-chronicle-filling 5.3
 */
export async function handleLayoutChange(
    event: Event,
    container: HTMLElement,
    partyActors: PartyActor[],
    extractFormData: (container: HTMLElement, partyActors: PartyActor[]) => ChronicleFormData
): Promise<void> {
    debug('Layout changed');
    const layoutId = (event.target as HTMLSelectElement).value;
    
    // Update blank chronicle path based on layout's defaultChronicleLocation
    const layout = await layoutStore.getLayout(layoutId);
    const blankPathInput = container.querySelector('#blankChroniclePath') as HTMLInputElement;
    
    if (layout?.defaultChronicleLocation) {
        try {
            const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
            if (response.ok && blankPathInput) {
                blankPathInput.value = layout.defaultChronicleLocation;
            }
        } catch (_error) {
            debug(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
            if (blankPathInput) {
                blankPathInput.value = '';
            }
        }
    } else {
        debug('Layout has no default chronicle location, clearing path');
        if (blankPathInput) {
            blankPathInput.value = '';
        }
    }
    
    // Update layout-specific fields (checkboxes and strikeout items)
    await updateLayoutSpecificFields(container, layoutId, async () => {
        await saveFormData(container, partyActors);
    });
    
    // Auto-save
    await saveFormData(container, partyActors);
    
    // Update chronicle path visibility based on new path value
    const newPath = blankPathInput?.value || '';
    await updateChroniclePathVisibility(newPath, container, layoutId);
    
    // Update validation display
    updateValidationDisplay(container, partyActors, extractFormData);
}

/**
 * Handles generic field change events for auto-save and validation
 * 
 * This handler is called when any input, select, or textarea field changes.
 * It auto-saves the form data and updates the validation display.
 * 
 * For treasure bundles and level fields, it also triggers treasure bundle
 * display updates to show the calculated gold values.
 * 
 * For earned income fields (downtime days, task level, success level, proficiency rank),
 * it triggers earned income display updates to show the calculated income values.
 * 
 * For fields in collapsible sections, it updates the section summary text
 * to reflect the new values.
 * 
 * @param event - The change event from the field
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @param extractFormData - Function to extract form data from the container
 * 
 * Requirements: party-chronicle-filling 5.4, treasure-bundle-calculation 5.3, earned-income-calculation 2.5, 7.3, collapsible-shared-sections 7.1, 7.2, 7.3, 7.4
 */
// eslint-disable-next-line complexity -- Flat field ID checks are clearer than extraction
export async function handleFieldChange(
    event: Event,
    container: HTMLElement,
    partyActors: PartyActor[],
    extractFormData: (container: HTMLElement, partyActors: PartyActor[]) => ChronicleFormData
): Promise<void> {
    debug('Field changed');
    
    const input = event.target as HTMLInputElement;
    const fieldName = input.name;
    const fieldId = input.id;
    
    // If treasure bundles changed, update all treasure bundle displays
    if (fieldName === 'shared.treasureBundles') {
        const treasureBundles = Number.parseFloat(input.value) || 0;
        updateAllTreasureBundleDisplays(treasureBundles, container);
    }
    
    // If a character's level changed, update that character's treasure bundle display
    if (fieldName?.includes('.level')) {
        const match = fieldName.match(/characters\.([^.]+)\.level/);
        if (match) {
            const characterId = match[1];
            const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
            const treasureBundles = Number.parseFloat(treasureBundlesSelect?.value || '0');
            const characterLevel = Number.parseInt(input.value, 10);
            updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
        }
    }
    
    // If downtime days changed, update all earned income displays
    if (fieldName === 'shared.downtimeDays') {
        const downtimeDays = Number.parseInt(input.value, 10) || 0;
        updateAllEarnedIncomeDisplays(downtimeDays, container);
    }
    
    // If a character's task level, success level, or proficiency rank changed, update that character's earned income display
    if (fieldName && (fieldName.includes('.taskLevel') || fieldName.includes('.successLevel') || fieldName.includes('.proficiencyRank'))) {
        const match = fieldName.match(/characters\.([^.]+)\./);
        if (match) {
            const characterId = match[1];
            const downtimeDaysInput = container.querySelector<HTMLInputElement>('#downtimeDays');
            const downtimeDays = Number.parseInt(downtimeDaysInput?.value || '0', 10);
            
            const memberActivity = container.querySelector(`.member-activity[data-character-id="${characterId}"]`);
            if (memberActivity) {
                const taskLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
                const successLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
                const proficiencyRankSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
                
                if (taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
                    const taskLevel = taskLevelSelect.value;
                    const successLevel = successLevelSelect.value;
                    const proficiencyRank = proficiencyRankSelect.value;
                    
                    const { updateEarnedIncomeDisplay } = await import('./shared-rewards-handlers.js');
                    updateEarnedIncomeDisplay(characterId, taskLevel, successLevel, proficiencyRank, downtimeDays, container);
                }
            }
        }
    }
    
    // Update section summaries for relevant fields
    if (fieldId === 'layout' || fieldId === 'eventName' || fieldId === 'eventCode' || fieldId === 'eventDate') {
        updateSectionSummary('event-details', container);
    }
    
    if (fieldId === 'chosenFactionReputation' || fieldId?.startsWith('reputation-')) {
        updateSectionSummary('reputation', container);
    }
    
    if (fieldId === 'xpEarned' || fieldId === 'treasureBundles') {
        updateSectionSummary('shared-rewards', container);
    }
    
    await saveFormData(container, partyActors);
    updateValidationDisplay(container, partyActors, extractFormData);
}

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
 * Requirements: conditional-chronicle-path-visibility 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.4, 4.1
 */
export async function handleChroniclePathFilePicker(
    event: Event,
    container: HTMLElement,
    partyActors: PartyActor[]
): Promise<void> {
    event.preventDefault();
    
    const filePicker = new foundry.applications.apps.FilePicker.implementation({
        type: 'any',
        // NOSONAR: Async callback is intentional - FilePicker doesn't await it, but we need async work inside
        callback: async (path: string): Promise<void> => {
            const input = container.querySelector('#blankChroniclePath') as HTMLInputElement;
            if (!input) return;

            input.value = path;

            const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
            const layoutId = layoutSelect?.value;

            try {
                await saveFormData(container, partyActors);
                await updateChroniclePathVisibility(path, container, layoutId);
                updateValidationDisplay(container, partyActors, extractFormData);
            } catch (caughtError) {
                error('File picker callback failed:', caughtError);
            }
        }
    });
    
    await filePicker.browse();
}

/**
 * Updates chronicle path field visibility based on file existence and layout configuration
 * 
 * The field is hidden only if:
 * 1. The selected layout has a default chronicle location, AND
 * 2. A valid file exists at the chronicle path
 * 
 * Otherwise, the field is shown so users can select/change the file.
 * 
 * @param path - Chronicle path to check
 * @param container - Form container element
 * @param layoutId - Optional layout ID to check if it has a default chronicle location
 * 
 * Requirements: conditional-chronicle-path-visibility 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3
 */
export async function updateChroniclePathVisibility(
    path: string,
    container: HTMLElement,
    layoutId?: string
): Promise<void> {
    const formGroup = container.querySelector(SHARED_FIELD_SELECTORS.CHRONICLE_PATH_GROUP);
    if (!formGroup) return;
    
    const fileExists = await checkFileExists(path);
    
    let layoutHasDefault = true;
    if (layoutId) {
        const layout = await layoutStore.getLayout(layoutId);
        layoutHasDefault = !!layout?.defaultChronicleLocation;
    }
    
    const shouldHide = layoutHasDefault && fileExists;
    
    if (shouldHide) {
        formGroup.classList.remove(CSS_CLASSES.CHRONICLE_PATH_VISIBLE);
    } else {
        formGroup.classList.add(CSS_CLASSES.CHRONICLE_PATH_VISIBLE);
    }
}

/**
 * Checks if a file exists at the given path
 * 
 * @param path - File path relative to Foundry data directory
 * @returns True if file exists and is accessible, false otherwise
 */
async function checkFileExists(path: string): Promise<boolean> {
    if (!path) return false;
    
    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch (_error) {
        debug(`Chronicle path file not accessible: ${path}`);
        return false;
    }
}

/**
 * Helper function to save form data to world flags
 * 
 * Exported for use in main.ts (Save button and layout-specific fields callback).
 * 
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 */
export async function saveFormData(container: HTMLElement, partyActors: PartyActor[]): Promise<void> {
    try {
        const formData = extractFormData(container, partyActors);
        await savePartyChronicleData(formData);
        debug('Auto-saved party chronicle data');
    } catch (caughtError) {
        error('Auto-save failed:', caughtError);
        ui.notifications?.warn('Failed to auto-save chronicle data');
    }
}
