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

/**
 * Handles portrait image click events to open character sheets
 * 
 * This handler is called when a user clicks on a character portrait in the
 * party chronicle form. It finds the associated actor and opens their sheet.
 * 
 * @param event - The mouse click event
 * @param partyActors - Array of party member actors
 * 
 * Requirements: 5.1
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
 * Handles season dropdown change events
 * 
 * When the season changes, this handler:
 * 1. Updates the layout dropdown with layouts for the selected season
 * 2. Triggers a layout change if layouts are available
 * 3. Auto-saves the form data
 * 4. Updates validation display
 * 
 * @param event - The change event from the season dropdown
 * @param $container - jQuery object wrapping the form container
 * @param partyActors - Array of party member actors
 * @param extractFormData - Function to extract form data from the container
 * 
 * Requirements: 5.2
 */
export async function handleSeasonChange(
    event: any,
    $container: any,
    partyActors: any[],
    extractFormData: ($container: any, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Season changed');
    const seasonId = event.target.value;
    const layouts = layoutStore.getLayoutsByParent(seasonId);
    
    const layoutDropdown = $container.find('#layout');
    layoutDropdown.empty();
    for (const layout of layouts) {
        const option = document.createElement('option');
        option.value = layout.id;
        option.innerText = layout.description;
        layoutDropdown.append(option);
    }
    
    if (layouts.length > 0) {
        layoutDropdown.val(layouts[0].id);
        layoutDropdown.trigger('change');
    }
    
    // Auto-save
    await saveFormData($container, partyActors);
    
    // Update validation display
    updateValidationDisplay($container, partyActors, extractFormData);
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
 * @param $container - jQuery object wrapping the form container
 * @param partyActors - Array of party member actors
 * @param extractFormData - Function to extract form data from the container
 * 
 * Requirements: 5.3
 */
export async function handleLayoutChange(
    event: any,
    $container: any,
    partyActors: any[],
    extractFormData: ($container: any, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Layout changed');
    const layoutId = event.target.value;
    
    // Update blank chronicle path if defaultChronicleLocation exists
    const layout = await layoutStore.getLayout(layoutId);
    if (layout?.defaultChronicleLocation) {
        try {
            const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
            if (response.ok) {
                $container.find('#blankChroniclePath').val(layout.defaultChronicleLocation);
            }
        } catch (error) {
            console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
        }
    }
    
    // Update layout-specific fields (checkboxes and strikeout items)
    await updateLayoutSpecificFields($container, layoutId, async () => {
        await saveFormData($container, partyActors);
    });
    
    // Auto-save
    await saveFormData($container, partyActors);
    
    // Update validation display
    updateValidationDisplay($container, partyActors, extractFormData);
}

/**
 * Handles generic field change events for auto-save and validation
 * 
 * This handler is called when any input, select, or textarea field changes.
 * It auto-saves the form data and updates the validation display.
 * 
 * @param event - The change event from the field
 * @param $container - jQuery object wrapping the form container
 * @param partyActors - Array of party member actors
 * @param extractFormData - Function to extract form data from the container
 * 
 * Requirements: 5.4
 */
export async function handleFieldChange(
    event: any,
    $container: any,
    partyActors: any[],
    extractFormData: ($container: any, partyActors: any[]) => any
): Promise<void> {
    console.log('[PFS Chronicle] Field changed');
    await saveFormData($container, partyActors);
    // Update validation display and button state
    updateValidationDisplay($container, partyActors, extractFormData);
}

/**
 * Helper function to save form data to world flags
 * 
 * This is a private helper used by the handlers to auto-save form data.
 * It extracts the current form data and saves it to world settings.
 * 
 * Exported for use in main.ts (Save button and layout-specific fields callback).
 * 
 * @param $container - jQuery object wrapping the form container
 * @param partyActors - Array of party member actors
 */
export async function saveFormData($container: any, partyActors: any[]): Promise<void> {
    try {
        const formData = extractFormData($container, partyActors);
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
 * @param $container - jQuery object wrapping the form container
 * @param partyActors - Array of party member actors
 * @returns Structured form data object with shared and character-specific fields
 */
// eslint-disable-next-line complexity
export function extractFormData($container: any, partyActors: any[]): any {
    const formElement = $container.closest('form')[0] || $container[0];
    const formData = new FormData(formElement);
    
    // Extract shared fields
    const shared: any = {
        gmPfsNumber: $container.find('#gmPfsNumber').val() || '',
        scenarioName: $container.find('#scenarioName').val() || '',
        eventCode: $container.find('#eventCode').val() || '',
        eventDate: $container.find('#eventDate').val() || '',
        xpEarned: parseInt($container.find('#xpEarned').val() as string) || 0,
        treasureBundles: parseInt($container.find('#treasureBundles').val() as string) || 0,
        layoutId: $container.find('#layout').val() || '',
        seasonId: $container.find('#season').val() || '',
        blankChroniclePath: $container.find('#blankChroniclePath').val() || '',
        adventureSummaryCheckboxes: $container.find('input[name="shared.adventureSummaryCheckboxes"]:checked').map((_: number, el: HTMLElement) => $(el).val()).get(),
        strikeoutItems: $container.find('input[name="shared.strikeoutItems"]:checked').map((_: number, el: HTMLElement) => $(el).val()).get(),
        chosenFactionReputation: parseInt($container.find('#chosenFactionReputation').val() as string) || 2,
        reputationValues: {
            EA: parseInt($container.find('#reputation-EA').val() as string) || 0,
            GA: parseInt($container.find('#reputation-GA').val() as string) || 0,
            HH: parseInt($container.find('#reputation-HH').val() as string) || 0,
            VS: parseInt($container.find('#reputation-VS').val() as string) || 0,
            RO: parseInt($container.find('#reputation-RO').val() as string) || 0,
            VW: parseInt($container.find('#reputation-VW').val() as string) || 0,
        },
    };
    
    // Extract character-specific fields
    const characters: any = {};
    partyActors.forEach((actor: any) => {
        const actorId = actor.id;
        characters[actorId] = {
            // Read from hidden fields (non-editable)
            characterName: $container.find(`input[name="characters.${actorId}.characterName"]`).val() || actor.name,
            societyId: $container.find(`input[name="characters.${actorId}.societyId"]`).val() || '',
            level: parseInt($container.find(`input[name="characters.${actorId}.level"]`).val() as string) || actor.level || 1,
            // Read from visible editable fields
            incomeEarned: parseFloat($container.find(`#incomeEarned-${actorId}`).val() as string) || 0,
            goldEarned: parseFloat($container.find(`#goldEarned-${actorId}`).val() as string) || 0,
            goldSpent: parseFloat($container.find(`#goldSpent-${actorId}`).val() as string) || 0,
            notes: $container.find(`#notes-${actorId}`).val() || '',
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
    
    // Clear saved data after successful generation
    try {
      await clearPartyChronicleData();
      console.log('[PFS Chronicle] Cleared saved party chronicle data after successful generation');
    } catch (error) {
      console.error('[PFS Chronicle] Failed to clear saved data:', error);
      ui.notifications?.warn("Chronicles generated but failed to clear saved data.");
    }
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
