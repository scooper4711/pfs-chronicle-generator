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

import { layoutStore } from '../LayoutStore.js';
import { savePartyChronicleData } from '../model/party-chronicle-storage.js';
import { updateLayoutSpecificFields } from '../utils/layout-utils.js';
import { updateValidationDisplay } from './validation-display.js';
import { calculateTreasureBundlesGp, formatGoldValue } from '../utils/treasure-bundle-calculator.js';
import { calculateDowntimeDays, calculateEarnedIncome, formatIncomeValue } from '../utils/earned-income-calculator.js';
import { extractFormData } from './form-data-extraction.js';
import { generateChroniclesFromPartyData } from './chronicle-generation.js';
import { updateSectionSummary } from './collapsible-section-handlers.js';

// Re-export for backward compatibility
export { extractFormData, generateChroniclesFromPartyData };

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
export function handlePortraitClick(event: MouseEvent, partyActors: any[]): void {
    console.log('[PFS Chronicle] Portrait clicked!', event.target);
    event.preventDefault();
    
    const memberActivity = (event.target as HTMLElement).closest('.member-activity');
    console.log('[PFS Chronicle] Member activity element:', memberActivity);
    
    const characterId = memberActivity?.getAttribute('data-character-id');
    console.log('[PFS Chronicle] Character ID:', characterId);
    
    if (!characterId) {
        console.warn('[PFS Chronicle] Portrait clicked but no character ID found');
        return;
    }
    
    const actor = partyActors.find(a => a?.id === characterId);
    console.log('[PFS Chronicle] Found actor:', actor);
    
    if (actor?.sheet) {
        console.log('[PFS Chronicle] Opening actor sheet');
        actor.sheet.render(true, { focus: true });
    } else {
        console.warn('[PFS Chronicle] Actor or actor sheet not found');
    }
}

/**
 * Updates the displayed treasure bundle value for a specific character.
 * 
 * This handler is called when treasure bundles or character level changes.
 * It calculates the gold value from treasure bundles based on the character's level
 * and updates the display element with class 'treasure-bundle-value'.
 * 
 * @param characterId - Actor ID of the character
 * @param treasureBundles - Number of treasure bundles
 * @param characterLevel - Character level
 * @param container - Container element for the form
 * 
 * Requirements: treasure-bundle-calculation 5.1, 5.2, 5.3, 5.4
 */
export function updateTreasureBundleDisplay(
  characterId: string,
  treasureBundles: number,
  characterLevel: number,
  container: HTMLElement
): void {
  const displayElement = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] .treasure-bundle-value`
  );
  
  if (displayElement) {
    const treasureBundlesGp = calculateTreasureBundlesGp(treasureBundles, characterLevel);
    displayElement.textContent = formatGoldValue(treasureBundlesGp);
  }
}

/**
 * Updates treasure bundle displays for all characters.
 * 
 * This handler is called when the shared treasure bundles field changes.
 * It iterates through all party members and updates their treasure bundle displays
 * based on their current level.
 * 
 * @param treasureBundles - Number of treasure bundles
 * @param container - Container element for the form
 * 
 * Requirements: treasure-bundle-calculation 5.1, 5.2, 5.3, 5.4
 */
export function updateAllTreasureBundleDisplays(
  treasureBundles: number,
  container: HTMLElement
): void {
  const memberActivities = container.querySelectorAll('.member-activity');
  
  memberActivities.forEach((activity) => {
    const characterId = activity.getAttribute('data-character-id');
    const levelInput = activity.querySelector<HTMLInputElement>('input[name$=".level"]');
    
    if (characterId && levelInput) {
      const characterLevel = parseInt(levelInput.value, 10);
      updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
    }
  });
}

/**
 * Updates the downtime days display based on XP earned and treasure bundles.
 * 
 * This handler is called when the XP Earned or Treasure Bundles dropdown changes.
 * It calculates the downtime days using the formula: XP × 2 for Quests/Scenarios,
 * 0 for Bounties, with a special case for Series 1 Quests (1 XP + 2.5 TB = 2 days).
 * After updating the downtime days display, it triggers a recalculation of all
 * character earned income displays.
 * 
 * @param xpEarned - XP earned from the adventure (1 for Bounty/Series 1 Quest, 2 for Quest, 4 for Scenario)
 * @param container - Container element for the form
 * 
 * Requirements: earned-income-calculation 2.4, 2.5, 7.3
 */
export function updateDowntimeDaysDisplay(
  xpEarned: number,
  container: HTMLElement
): void {
  // Get treasure bundles value to detect Series 1 Quest
  const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
  const treasureBundles = parseFloat(treasureBundlesSelect?.value || '0');
  
  // Calculate downtime days based on XP earned and treasure bundles
  const downtimeDays = calculateDowntimeDays(xpEarned, treasureBundles);
  
  // Update the downtime days display element
  const displayElement = container.querySelector('.downtime-days-value');
  if (displayElement) {
    displayElement.textContent = downtimeDays.toString();
  }
  
  // Update the hidden input field for form submission
  const hiddenInput = container.querySelector<HTMLInputElement>('#downtimeDays');
  if (hiddenInput) {
    hiddenInput.value = downtimeDays.toString();
  }
  
  // Update all earned income displays with the new downtime days value
  updateAllEarnedIncomeDisplays(downtimeDays, container);
}

/**
 * Updates the displayed earned income value for a specific character.
 * 
 * This handler is called when task level, success level, proficiency rank, or downtime days changes.
 * It calculates the earned income based on the character's inputs and updates the display element
 * with class 'earned-income-value'.
 * 
 * @param characterId - Actor ID of the character
 * @param taskLevel - Task level (0-20 or "-")
 * @param successLevel - Success level (critical_failure, failure, success, critical_success)
 * @param proficiencyRank - Proficiency rank (trained, expert, master, legendary)
 * @param downtimeDays - Number of downtime days (0-8)
 * @param container - Container element for the form
 * 
 * Requirements: earned-income-calculation 2.5, 7.3
 */
export function updateEarnedIncomeDisplay(
  characterId: string,
  taskLevel: number | string,
  successLevel: string,
  proficiencyRank: string,
  downtimeDays: number,
  container: HTMLElement
): void {
  console.log('[PFS Chronicle] updateEarnedIncomeDisplay called:', {
    characterId,
    taskLevel,
    successLevel,
    proficiencyRank,
    downtimeDays
  });
  
  const displayElement = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] .earned-income-value`
  );
  
  const hiddenInput = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] input[name="characters.${characterId}.earnedIncome"]`
  ) as HTMLInputElement;
  
  console.log('[PFS Chronicle] Display element found:', !!displayElement);
  
  if (displayElement) {
    const earnedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
    const formattedValue = formatIncomeValue(earnedIncome);
    console.log('[PFS Chronicle] Calculated earned income:', earnedIncome, 'formatted:', formattedValue);
    displayElement.textContent = formattedValue;
    
    // Update hidden input field for form submission and validation
    if (hiddenInput) {
      hiddenInput.value = earnedIncome.toString();
      console.log('[PFS Chronicle] Hidden input updated to:', hiddenInput.value);
    }
    
    console.log('[PFS Chronicle] Display element updated to:', displayElement.textContent);
  } else {
    console.warn('[PFS Chronicle] Display element not found for character:', characterId);
  }
}

/**
 * Updates earned income displays for all characters.
 * 
 * This handler is called when the shared downtime days field changes.
 * It iterates through all party members and updates their earned income displays
 * based on their current task level, success level, and proficiency rank.
 * 
 * @param downtimeDays - Number of downtime days (0-8)
 * @param container - Container element for the form
 * 
 * Requirements: earned-income-calculation 2.5, 7.3
 */
export function updateAllEarnedIncomeDisplays(
  downtimeDays: number,
  container: HTMLElement
): void {
  console.log('[PFS Chronicle] updateAllEarnedIncomeDisplays called with downtimeDays:', downtimeDays);
  const memberActivities = container.querySelectorAll('.member-activity');
  console.log('[PFS Chronicle] Found member activities:', memberActivities.length);
  
  memberActivities.forEach((activity) => {
    const characterId = activity.getAttribute('data-character-id');
    const taskLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
    const successLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
    const proficiencyRankSelect = activity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
    
    console.log('[PFS Chronicle] Processing character:', characterId, {
      hasTaskLevel: !!taskLevelSelect,
      hasSuccessLevel: !!successLevelSelect,
      hasProficiencyRank: !!proficiencyRankSelect,
      taskLevelValue: taskLevelSelect?.value,
      successLevelValue: successLevelSelect?.value,
      proficiencyRankValue: proficiencyRankSelect?.value
    });
    
    if (characterId && taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
      const taskLevel = taskLevelSelect.value;
      const successLevel = successLevelSelect.value;
      const proficiencyRank = proficiencyRankSelect.value;
      
      updateEarnedIncomeDisplay(characterId, taskLevel, successLevel, proficiencyRank, downtimeDays, container);
    } else {
      console.warn('[PFS Chronicle] Skipping character due to missing elements:', characterId);
    }
  });
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
    partyActors: any[],
    extractFormData: (container: HTMLElement, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Season changed');
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
    partyActors: any[],
    extractFormData: (container: HTMLElement, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Layout changed');
    const layoutId = (event.target as HTMLSelectElement).value;
    
    // Update blank chronicle path based on layout's defaultChronicleLocation
    const layout = await layoutStore.getLayout(layoutId);
    const blankPathInput = container.querySelector('#blankChroniclePath') as HTMLInputElement;
    
    if (layout?.defaultChronicleLocation) {
        // Layout has a default chronicle location - try to use it
        try {
            const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
            if (response.ok && blankPathInput) {
                blankPathInput.value = layout.defaultChronicleLocation;
            }
        } catch (error) {
            console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
            // Clear the path if default isn't accessible
            if (blankPathInput) {
                blankPathInput.value = '';
            }
        }
    } else {
        // Layout doesn't have a default chronicle location - clear the path
        // This makes the chronicle path field visible so user can select a file
        console.log('[PFS Chronicle] Layout has no default chronicle location, clearing path');
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
    partyActors: any[],
    extractFormData: (container: HTMLElement, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Field changed');
    
    const input = event.target as HTMLInputElement;
    const fieldName = input.name;
    const fieldId = input.id;
    
    // If treasure bundles changed, update all treasure bundle displays
    if (fieldName === 'shared.treasureBundles') {
        const treasureBundles = parseFloat(input.value) || 0;
        updateAllTreasureBundleDisplays(treasureBundles, container);
    }
    
    // If a character's level changed, update that character's treasure bundle display
    if (fieldName && fieldName.includes('.level')) {
        const match = fieldName.match(/characters\.([^.]+)\.level/);
        if (match) {
            const characterId = match[1];
            const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
            const treasureBundles = parseFloat(treasureBundlesSelect?.value || '0');
            const characterLevel = parseInt(input.value, 10);
            updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
        }
    }
    
    // If downtime days changed, update all earned income displays
    if (fieldName === 'shared.downtimeDays') {
        const downtimeDays = parseInt(input.value, 10) || 0;
        updateAllEarnedIncomeDisplays(downtimeDays, container);
    }
    
    // If a character's task level, success level, or proficiency rank changed, update that character's earned income display
    if (fieldName && (fieldName.includes('.taskLevel') || fieldName.includes('.successLevel') || fieldName.includes('.proficiencyRank'))) {
        const match = fieldName.match(/characters\.([^.]+)\./);
        if (match) {
            const characterId = match[1];
            const downtimeDaysInput = container.querySelector<HTMLInputElement>('#downtimeDays');
            const downtimeDays = parseInt(downtimeDaysInput?.value || '0', 10);
            
            const memberActivity = container.querySelector(`.member-activity[data-character-id="${characterId}"]`);
            if (memberActivity) {
                const taskLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
                const successLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
                const proficiencyRankSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
                
                if (taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
                    const taskLevel = taskLevelSelect.value;
                    const successLevel = successLevelSelect.value;
                    const proficiencyRank = proficiencyRankSelect.value;
                    
                    updateEarnedIncomeDisplay(characterId, taskLevel, successLevel, proficiencyRank, downtimeDays, container);
                }
            }
        }
    }
    
    // Update section summaries for relevant fields
    // Event Details fields: layout (scenario), eventName, eventCode, eventDate
    if (fieldId === 'layout' || fieldId === 'eventName' || fieldId === 'eventCode' || fieldId === 'eventDate') {
        updateSectionSummary('event-details', container);
    }
    
    // Reputation fields: chosenFactionReputation, reputation-*
    if (fieldId === 'chosenFactionReputation' || fieldId?.startsWith('reputation-')) {
        updateSectionSummary('reputation', container);
    }
    
    // Shared Rewards fields: xpEarned, treasureBundles
    if (fieldId === 'xpEarned' || fieldId === 'treasureBundles') {
        updateSectionSummary('shared-rewards', container);
    }
    
    await saveFormData(container, partyActors);
    // Update validation display and button state
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
                
                // Get current layout ID to check if it has a default
                const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
                const layoutId = layoutSelect?.value;
                
                // Update visibility
                await updateChroniclePathVisibility(path, container, layoutId);
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
 * This ensures that for layouts without a default, users can always change the chronicle path.
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
    const formGroup = container.querySelector('#chroniclePathGroup');
    if (!formGroup) return;
    
    const fileExists = await checkFileExists(path);
    
    // Check if layout has a default chronicle location (if layoutId provided)
    let layoutHasDefault = true; // Default to true for backward compatibility
    if (layoutId) {
        const layout = await layoutStore.getLayout(layoutId);
        layoutHasDefault = !!layout?.defaultChronicleLocation;
    }
    
    // Hide field only if layout has default AND file exists
    // If layoutId not provided, use old behavior (hide if file exists)
    const shouldHide = layoutHasDefault && fileExists;
    
    if (shouldHide) {
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

/**
 * Helper function to save form data to world flags
 * 
 * This is a private helper used by the handlers to auto-save form data.
 * It extracts the current form data and saves it to world settings.
 * 
 * Exported for use in main.ts (Save button and layout-specific fields callback).
 * 
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 */
export async function saveFormData(container: HTMLElement, partyActors: any[]): Promise<void> {
    try {
        const formData = extractFormData(container, partyActors);
        await savePartyChronicleData(formData);
        console.log('[PFS Chronicle] Auto-saved party chronicle data');
    } catch (error) {
        console.error('[PFS Chronicle] Auto-save failed:', error);
        ui.notifications?.warn('Failed to auto-save chronicle data');
    }
}

