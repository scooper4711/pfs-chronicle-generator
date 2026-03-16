/**
 * Chronicle Generation Logic
 * 
 * This module handles the core chronicle generation workflow including
 * validation, layout loading, PDF generation, and result display.
 * 
 * Requirements: party-chronicle-filling 1.2, 5.1, 5.2, 5.3, code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */

import { layoutStore } from '../LayoutStore.js';
import { 
  SharedFields,
  UniqueFields,
  GenerationResult
} from '../model/party-chronicle-types.js';
import { Layout } from '../model/layout.js';
import { mapToCharacterData } from '../model/party-chronicle-mapper.js';
import { validateSharedFields, validateUniqueFields } from '../model/party-chronicle-validator.js';
import { PdfGenerator } from '../PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

/**
 * Validates all character fields (shared and unique) for chronicle generation
 * 
 * This helper function aggregates validation for both shared fields and all
 * character-specific fields. It returns a validation result that includes
 * all errors found across all characters.
 * 
 * @param data - Form data containing shared and character-specific fields
 * @param partyActors - Array of party member actors (used for character names)
 * @returns Object with valid flag and array of all validation errors
 * 
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */
function validateAllCharacterFields(
  data: any,
  partyActors: any[]
): { valid: boolean; errors: string[] } {
  const allErrors: string[] = [];
  
  // Validate shared fields
  const sharedValidation = validateSharedFields(data.shared || {});
  allErrors.push(...sharedValidation.errors);
  
  // Validate unique fields for all characters
  const characters = data.characters || {};
  for (const [actorId, unique] of Object.entries(characters)) {
    const actor = partyActors.find(a => a.id === actorId);
    const characterName = actor?.name || actorId;
    const result = validateUniqueFields(unique as any, characterName);
    allErrors.push(...result.errors);
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Loads layout configuration and blank chronicle path
 * 
 * This helper function extracts layout loading logic from the main orchestrator.
 * It retrieves the layout ID and blank chronicle path from form data or settings,
 * loads the layout, and validates that all required configuration is present.
 * 
 * @param data - Form data containing shared fields with layoutId and blankChroniclePath
 * @returns Object with layout, layoutId, and blankChroniclePath, or null if loading fails
 * 
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */
async function loadLayoutConfiguration(
  data: any
): Promise<{ layout: Layout; layoutId: string; blankChroniclePath: string } | null> {
  // Get the selected layout ID
  const layoutId = data.shared?.layoutId || game.settings.get('pfs-chronicle-generator', 'layout');
  
  // Load the layout
  let layout: Layout;
  try {
    layout = await layoutStore.getLayout(layoutId as string);
  } catch (error) {
    ui.notifications?.error(`Failed to load layout: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  
  // Get the blank chronicle path
  const blankChroniclePath = data.shared?.blankChroniclePath || game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');
  
  if (!blankChroniclePath || typeof blankChroniclePath !== 'string') {
    ui.notifications?.error("Blank chronicle PDF path is not set.");
    return null;
  }
  
  return {
    layout,
    layoutId: layoutId as string,
    blankChroniclePath
  };
}

/**
 * Extracts and transforms character chronicle data from raw form data
 *
 * This helper function extracts SharedFields and character-specific UniqueFields
 * from raw form data, then transforms them into the chronicle data format using
 * mapToCharacterData. This reduces complexity in generateChroniclesFromPartyData
 * by isolating data transformation logic.
 *
 * CCN Complexity Note: This function has a cyclomatic complexity of 56, which exceeds
 * the standard limit of 15. However, this is acceptable per architecture guidelines
 * because the complexity comes from flat, repetitive null-coalescing patterns
 * (|| defaultValue) and ternary operators for array normalization. The cognitive
 * complexity is low and refactoring would create unnecessary abstraction without
 * improving readability.
 *
 * @param data - Raw form data containing shared and character-specific fields
 * @param actor - The actor (character) to extract data for
 * @param layoutId - The selected layout ID
 * @param blankChroniclePath - Path to the blank chronicle PDF
 * @returns Structured chronicle data ready for PDF generation
 *
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */
// eslint-disable-next-line complexity -- Flat null-coalescing pattern is clearer than extraction
function extractCharacterChronicleData(
  data: any,
  actor: any,
  layoutId: string,
  blankChroniclePath: string
): any {
  const characterId = actor.id;
  const characterName = actor.name;

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
    layoutId: layoutId,
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
    },
    downtimeDays: Number(data.shared?.downtimeDays) || 0
  };

  // Extract unique fields for this character
  const uniqueFields = data.characters?.[characterId] || {};
  const characterData: UniqueFields = {
    characterName: uniqueFields.characterName || characterName,
    societyId: uniqueFields.societyId || '',
    level: Number(uniqueFields.level) || actor.system?.details?.level?.value || 1,
    taskLevel: uniqueFields.taskLevel !== undefined ? uniqueFields.taskLevel : (Number(uniqueFields.level) || 1) - 2,
    successLevel: uniqueFields.successLevel || 'success',
    proficiencyRank: uniqueFields.proficiencyRank || 'trained',
    earnedIncome: Number(uniqueFields.earnedIncome) || 0,
    goldSpent: Number(uniqueFields.goldSpent) || 0,
    notes: uniqueFields.notes || ''
  };

  // Map to chronicle data format
  const mappedData = mapToCharacterData(sharedFields, characterData, actor);
  
  return mappedData;
}

/**
 * Generates a single character's PDF chronicle
 *
 * This helper function handles the PDF generation workflow for one character:
 * 1. Loads the blank PDF from the specified path
 * 2. Generates the filled PDF using PdfGenerator
 * 3. Converts the PDF to base64
 * 4. Saves both chronicle data and PDF to actor flags
 *
 * This function reduces complexity in generateChroniclesFromPartyData by
 * isolating PDF generation and actor flag saving logic.
 *
 * @param chronicleData - Structured chronicle data ready for PDF generation
 * @param layout - The layout configuration for PDF generation
 * @param blankChroniclePath - Path to the blank chronicle PDF
 * @param actor - The actor to save the chronicle to
 * @returns Promise that resolves to a GenerationResult
 *
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */
async function generateSingleCharacterPdf(
  chronicleData: any,
  layout: Layout,
  blankChroniclePath: string,
  actor: any
): Promise<GenerationResult> {
  const characterId = actor.id;
  const characterName = actor.name;

  try {
    // Save chronicle data to actor flags (add blankChroniclePath for filename generation)
    const chronicleDataWithPath = {
      ...chronicleData,
      blankChroniclePath: blankChroniclePath
    };
    
    await actor.setFlag('pfs-chronicle-generator', 'chronicleData', chronicleDataWithPath);

    // Load blank PDF
    const response = await fetch(blankChroniclePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch blank chronicle PDF: ${response.statusText}`);
    }

    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(fontkit);

    // Generate filled PDF
    const generator = new PdfGenerator(pdfDoc, layout, chronicleData);
    await generator.generate();

    // Convert PDF to base64
    const modifiedPdfBytes = await pdfDoc.save();
    let binary = '';
    const len = modifiedPdfBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCodePoint(modifiedPdfBytes[i]);
    }
    const base64String = btoa(binary);

    // Save PDF to actor flags
    await actor.setFlag('pfs-chronicle-generator', 'chroniclePdf', base64String);

    console.log(`[PFS Chronicle] Successfully generated chronicle for ${characterName}`);

    return {
      characterId,
      characterName,
      success: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PFS Chronicle] Failed to generate chronicle for ${characterName}:`, error);

    return {
      characterId,
      characterName,
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Processes all party members to generate their chronicles
 * 
 * This helper function iterates through all party members and generates a PDF
 * chronicle for each one. It extracts character data, generates the PDF, and
 * saves it to actor flags. Results are collected and returned for notification display.
 * 
 * @param data - Form data containing shared and character-specific fields
 * @param partyActors - Array of party member actors
 * @param layout - The layout configuration for PDF generation
 * @param layoutId - The selected layout ID
 * @param blankChroniclePath - Path to the blank chronicle PDF
 * @returns Promise that resolves to array of GenerationResult objects
 * 
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */
async function processAllPartyMembers(
  data: any,
  partyActors: any[],
  layout: Layout,
  layoutId: string,
  blankChroniclePath: string
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  
  for (const actor of partyActors) {
    // Extract and transform character chronicle data
    const chronicleData = extractCharacterChronicleData(
      data,
      actor,
      layoutId,
      blankChroniclePath
    );
    
    // Generate PDF and save to actor flags
    const result = await generateSingleCharacterPdf(
      chronicleData,
      layout,
      blankChroniclePath,
      actor
    );
    
    results.push(result);
  }
  
  return results;
}

/**
 * Displays generation results to the user via notifications
 *
 * This helper function takes an array of GenerationResult objects and displays
 * appropriate success or warning notifications based on the results. If all
 * chronicles generated successfully, it shows a success notification. If some
 * failed, it shows a warning with details about which characters failed.
 *
 * This function reduces complexity in generateChroniclesFromPartyData by
 * isolating notification display logic.
 *
 * @param results - Array of GenerationResult objects from chronicle generation
 *
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */
function displayGenerationResults(results: GenerationResult[]): void {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const allSucceeded = failureCount === 0;

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

/**
 * Generates chronicles for all party members
 * 
 * This is the main orchestrator function that coordinates the complete chronicle
 * generation workflow. It delegates specific responsibilities to helper functions
 * to maintain low complexity and high readability.
 * 
 * Workflow:
 * 1. Validates all fields (shared and character-specific)
 * 2. Loads the selected layout configuration
 * 3. Processes each party member (extract data, generate PDF, save to actor)
 * 4. Displays summary notifications to the user
 * 
 * @param data - Form data containing shared and character-specific fields
 * @param partyActors - Array of party member actors
 * @returns Promise that resolves when all chronicles are generated
 * 
 * Requirements: code-standards-refactoring 2.1, 2.6, 2.7, 2.8, 3.1, 3.6
 */
export async function generateChroniclesFromPartyData(
  data: any,
  partyActors: any[]
): Promise<void> {
  // Step 1: Validate all fields
  const validation = validateAllCharacterFields(data, partyActors);
  if (!validation.valid) {
    ui.notifications?.error(`Validation failed: ${validation.errors.join(', ')}`);
    return;
  }
  
  // Step 2: Load layout and blank chronicle path
  const layoutConfig = await loadLayoutConfiguration(data);
  if (!layoutConfig) {
    return; // Error already displayed by helper
  }
  
  // Step 3: Process each party member
  const results = await processAllPartyMembers(
    data,
    partyActors,
    layoutConfig.layout,
    layoutConfig.layoutId,
    layoutConfig.blankChroniclePath
  );
  
  // Step 4: Display summary notifications
  displayGenerationResults(results);
}
