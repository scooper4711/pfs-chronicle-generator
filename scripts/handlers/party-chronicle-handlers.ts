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
 * Requirements: 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { layoutStore } from '../LayoutStore.js';
import { savePartyChronicleData, clearPartyChronicleData } from '../model/party-chronicle-storage.js';
import { updateLayoutSpecificFields } from '../utils/layout-utils.js';
import { updateValidationDisplay } from './validation-display.js';
import { 
  SharedFields,
  GenerationResult
} from '../model/party-chronicle-types.js';
import { Layout } from '../model/layout.js';
import { mapToCharacterData } from '../model/party-chronicle-mapper.js';
import { validateSharedFields, validateUniqueFields } from '../model/party-chronicle-validator.js';
import { PdfGenerator } from '../PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { calculateTreasureBundlesGp, formatGoldValue } from '../utils/treasure-bundle-calculator.js';

/**
 * Handles portrait image click events to open character sheets
 * 
 * This handler is called when a user clicks on a character portrait in the
 * party chronicle form. It finds the associated actor and opens their sheet.
 * 
 * @param event - The mouse click event
 * @param partyActors - Array of party member actors
 * 
 * Requirements: party-chronicle-filling 5.1
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
 * Requirements: treasure-bundle-calculation 4.1, 4.2, 4.3, 4.4
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
 * Requirements: treasure-bundle-calculation 4.1, 4.2, 4.3, 4.4
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
 * Requirements: 5.2
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
 * Requirements: 5.3
 */
export async function handleLayoutChange(
    event: Event,
    container: HTMLElement,
    partyActors: any[],
    extractFormData: (container: HTMLElement, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Layout changed');
    const layoutId = (event.target as HTMLSelectElement).value;
    
    // Update blank chronicle path if defaultChronicleLocation exists
    const layout = await layoutStore.getLayout(layoutId);
    if (layout?.defaultChronicleLocation) {
        try {
            const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
            if (response.ok) {
                const blankPathInput = container.querySelector('#blankChroniclePath') as HTMLInputElement;
                if (blankPathInput) {
                    blankPathInput.value = layout.defaultChronicleLocation;
                }
            }
        } catch (error) {
            console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
        }
    }
    
    // Update layout-specific fields (checkboxes and strikeout items)
    await updateLayoutSpecificFields(container, layoutId, async () => {
        await saveFormData(container, partyActors);
    });
    
    // Auto-save
    await saveFormData(container, partyActors);
    
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
 * @param event - The change event from the field
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @param extractFormData - Function to extract form data from the container
 * 
 * Requirements: party-chronicle-filling 5.4, treasure-bundle-calculation 4.3
 */
export async function handleFieldChange(
    event: Event,
    container: HTMLElement,
    partyActors: any[],
    extractFormData: (container: HTMLElement, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Field changed');
    
    const input = event.target as HTMLInputElement;
    const fieldName = input.name;
    
    // If treasure bundles changed, update all treasure bundle displays
    if (fieldName === 'shared.treasureBundles') {
        const treasureBundles = parseInt(input.value, 10) || 0;
        updateAllTreasureBundleDisplays(treasureBundles, container);
    }
    
    // If a character's level changed, update that character's treasure bundle display
    if (fieldName && fieldName.includes('.level')) {
        const match = fieldName.match(/characters\.([^.]+)\.level/);
        if (match) {
            const characterId = match[1];
            const treasureBundlesInput = container.querySelector<HTMLInputElement>('#treasureBundles');
            const treasureBundles = parseInt(treasureBundlesInput?.value || '0', 10);
            const characterLevel = parseInt(input.value, 10);
            updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
        }
    }
    
    await saveFormData(container, partyActors);
    // Update validation display and button state
    updateValidationDisplay(container, partyActors, extractFormData);
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

/**
 * Extracts form data into PartyChronicleData structure
 * 
 * This helper function reads all form fields and constructs a structured
 * data object containing both shared fields and character-specific fields.
 * 
 * This function is exported for use in main.ts (Generate Chronicles button)
 * and is also used internally by the handlers.
 * 
 * CCN Complexity Note: This function has a cyclomatic complexity of 18, which exceeds
 * the standard limit of 15. However, this is acceptable per architecture guidelines
 * because the complexity comes from flat, repetitive null-coalescing patterns
 * (|| defaultValue) rather than nested conditionals. The cognitive complexity is low
 * and refactoring would create unnecessary abstraction without improving readability.
 * 
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @returns Structured form data object with shared and character-specific fields
 */
// eslint-disable-next-line complexity
export function extractFormData(container: HTMLElement, partyActors: any[]): any {
    // Extract shared fields
    const shared: any = {
        gmPfsNumber: (container.querySelector('#gmPfsNumber') as HTMLInputElement)?.value || '',
        scenarioName: (container.querySelector('#scenarioName') as HTMLInputElement)?.value || '',
        eventCode: (container.querySelector('#eventCode') as HTMLInputElement)?.value || '',
        eventDate: (container.querySelector('#eventDate') as HTMLInputElement)?.value || '',
        xpEarned: parseInt((container.querySelector('#xpEarned') as HTMLInputElement)?.value) || 0,
        treasureBundles: parseInt((container.querySelector('#treasureBundles') as HTMLInputElement)?.value) || 0,
        layoutId: (container.querySelector('#layout') as HTMLSelectElement)?.value || '',
        seasonId: (container.querySelector('#season') as HTMLSelectElement)?.value || '',
        blankChroniclePath: (container.querySelector('#blankChroniclePath') as HTMLInputElement)?.value || '',
        adventureSummaryCheckboxes: Array.from(
            container.querySelectorAll('input[name="shared.adventureSummaryCheckboxes"]:checked')
        ).map((el) => (el as HTMLInputElement).value),
        strikeoutItems: Array.from(
            container.querySelectorAll('input[name="shared.strikeoutItems"]:checked')
        ).map((el) => (el as HTMLInputElement).value),
        chosenFactionReputation: parseInt((container.querySelector('#chosenFactionReputation') as HTMLInputElement)?.value) || 2,
        reputationValues: {
            EA: parseInt((container.querySelector('#reputation-EA') as HTMLInputElement)?.value) || 0,
            GA: parseInt((container.querySelector('#reputation-GA') as HTMLInputElement)?.value) || 0,
            HH: parseInt((container.querySelector('#reputation-HH') as HTMLInputElement)?.value) || 0,
            VS: parseInt((container.querySelector('#reputation-VS') as HTMLInputElement)?.value) || 0,
            RO: parseInt((container.querySelector('#reputation-RO') as HTMLInputElement)?.value) || 0,
            VW: parseInt((container.querySelector('#reputation-VW') as HTMLInputElement)?.value) || 0,
        },
    };
    
    // Extract character-specific fields
    const characters: any = {};
    // eslint-disable-next-line complexity
    partyActors.forEach((actor: any) => {
        const actorId = actor.id;
        characters[actorId] = {
            // Read from hidden fields (non-editable)
            characterName: (container.querySelector(`input[name="characters.${actorId}.characterName"]`) as HTMLInputElement)?.value || actor.name,
            societyId: (container.querySelector(`input[name="characters.${actorId}.societyId"]`) as HTMLInputElement)?.value || '',
            level: parseInt((container.querySelector(`input[name="characters.${actorId}.level"]`) as HTMLInputElement)?.value) || actor.level || 1,
            // Read from visible editable fields
            incomeEarned: parseFloat((container.querySelector(`#incomeEarned-${actorId}`) as HTMLInputElement)?.value) || 0,
            goldSpent: parseFloat((container.querySelector(`#goldSpent-${actorId}`) as HTMLInputElement)?.value) || 0,
            notes: (container.querySelector(`#notes-${actorId}`) as HTMLTextAreaElement)?.value || '',
        };
    });
    
    return { shared, characters };
}

/**
 * Generates chronicles for all party members
 * 
 * This function handles the complete chronicle generation workflow:
 * 1. Validates shared and unique fields
 * 2. Loads the selected layout
 * 3. Generates a PDF chronicle for each party member
 * 4. Saves the chronicle data and PDF to actor flags
 * 5. Clears saved form data on success
 * 
 * Extracted from PartyChronicleApp to reduce file size and improve modularity.
 * 
 * @param data - Expanded form data containing shared and character-specific fields
 * @param partyActors - Array of party member actors
 * @returns Promise that resolves when all chronicles are generated
 * 
 * Requirements: 1.2, 5.1, 5.2, 5.3
 */
export async function generateChroniclesFromPartyData(
  data: any,
  partyActors: any[]
): Promise<void> {
  console.log('[PFS Chronicle] Generate chronicles called', data);
  
  // Validate shared fields
  const sharedValidation = validateSharedFields(data.shared || {});
  if (!sharedValidation.valid) {
    ui.notifications?.error(`Validation failed: ${sharedValidation.errors.join(', ')}`);
    return;
  }
  
  // Validate unique fields for all characters
  const allErrors: string[] = [];
  const characters = data.characters || {};
  
  for (const [actorId, unique] of Object.entries(characters)) {
    const actor = partyActors.find(a => a.id === actorId);
    const characterName = actor?.name || actorId;
    const result = validateUniqueFields(unique as any, characterName);
    allErrors.push(...result.errors);
  }
  
  if (allErrors.length > 0) {
    ui.notifications?.error(`Validation failed: ${allErrors.join(', ')}`);
    return;
  }
  
  // Collect generation results for all characters
  const results: GenerationResult[] = [];
  let allSucceeded = true;
  
  // Get the selected layout
  const layoutId = data.shared?.layoutId || game.settings.get('pfs-chronicle-generator', 'layout');
  let layout: Layout;
  try {
    layout = await layoutStore.getLayout(layoutId as string);
  } catch (error) {
    ui.notifications?.error(`Failed to load layout: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  
  // Get the blank chronicle path
  const blankChroniclePath = data.shared?.blankChroniclePath || game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');
  if (!blankChroniclePath || typeof blankChroniclePath !== 'string') {
    ui.notifications?.error("Blank chronicle PDF path is not set.");
    return;
  }
  
  // Process each party member
  for (const actor of partyActors) {
    const characterId = actor.id;
    const characterName = actor.name;
    
    try {
      // Extract shared fields
      const sharedFields: SharedFields = {
        gmPfsNumber: data.shared?.gmPfsNumber || '',
        scenarioName: data.shared?.scenarioName || '',
        eventCode: data.shared?.eventCode || '',
        eventDate: data.shared?.eventDate || '',
        xpEarned: Number(data.shared?.xpEarned) || 0,
        adventureSummaryCheckboxes: Array.isArray(data.shared?.adventureSummaryCheckboxes) 
          ? data.shared.adventureSummaryCheckboxes 
          : (data.shared?.adventureSummaryCheckboxes ? [data.shared.adventureSummaryCheckboxes] : []),
        strikeoutItems: Array.isArray(data.shared?.strikeoutItems)
          ? data.shared.strikeoutItems
          : (data.shared?.strikeoutItems ? [data.shared.strikeoutItems] : []),
        treasureBundles: Number(data.shared?.treasureBundles) || 0,
        layoutId: layoutId as string,
        seasonId: data.shared?.seasonId || '',
        blankChroniclePath: blankChroniclePath,
        chosenFactionReputation: Number(data.shared?.chosenFactionReputation) || 2,
        reputationValues: {
          EA: Number(data.shared?.reputationValues?.EA) || 0,
          GA: Number(data.shared?.reputationValues?.GA) || 0,
          HH: Number(data.shared?.reputationValues?.HH) || 0,
          VS: Number(data.shared?.reputationValues?.VS) || 0,
          RO: Number(data.shared?.reputationValues?.RO) || 0,
          VW: Number(data.shared?.reputationValues?.VW) || 0
        }
      };
      
      // Extract unique fields for this character
      const uniqueFields = data.characters?.[characterId] || {};
      const characterData = {
        characterName: uniqueFields.characterName || characterName,
        societyId: uniqueFields.societyId || '',
        level: Number(uniqueFields.level) || actor.system?.details?.level?.value || 1,
        incomeEarned: Number(uniqueFields.incomeEarned) || 0,
        goldEarned: Number(uniqueFields.goldEarned) || 0,
        goldSpent: Number(uniqueFields.goldSpent) || 0,
        notes: uniqueFields.notes || ''
      };
      
      // Map to chronicle data format
      const chronicleData = mapToCharacterData(sharedFields, characterData, actor);
      
      // Save chronicle data to actor flags
      await actor.setFlag('pfs-chronicle-generator', 'chronicleData', chronicleData);
      
      // Generate PDF
      const response = await fetch(blankChroniclePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch blank chronicle PDF: ${response.statusText}`);
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pdfDoc.registerFontkit(fontkit);
      
      const generator = new PdfGenerator(pdfDoc, layout, chronicleData);
      await generator.generate();
      
      // Convert PDF to base64 and attach to actor
      const modifiedPdfBytes = await pdfDoc.save();
      let binary = '';
      const len = modifiedPdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(modifiedPdfBytes[i]);
      }
      const base64String = btoa(binary);
      
      await actor.setFlag('pfs-chronicle-generator', 'chroniclePdf', base64String);
      
      // Record success
      results.push({
        characterId,
        characterName,
        success: true
      });
      
      console.log(`[PFS Chronicle] Successfully generated chronicle for ${characterName}`);
      
    } catch (error) {
      // Record failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        characterId,
        characterName,
        success: false,
        error: errorMessage
      });
      allSucceeded = false;
      console.error(`[PFS Chronicle] Failed to generate chronicle for ${characterName}:`, error);
    }
  }
  
  // Display summary notifications
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  if (allSucceeded) {
    ui.notifications?.info(`Successfully generated ${successCount} chronicle(s) for all party members.`);
    
    // Note: Data is NOT cleared after generation to allow review and correction
    // Data should only be cleared when the user explicitly clicks the Clear button
  } else {
    const failedCharacters = results
      .filter(r => !r.success)
      .map(r => `${r.characterName}: ${r.error}`)
      .join('; ');
    
    ui.notifications?.warn(
      `Generated ${successCount} chronicle(s), but ${failureCount} failed: ${failedCharacters}`
    );
  }
}
