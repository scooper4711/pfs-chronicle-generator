/**
 * Chronicle Generation Logic
 * 
 * This module handles the core chronicle generation workflow including
 * validation, layout loading, PDF generation, and result display.
 * 
 * Requirements: party-chronicle-filling 1.2, 5.1, 5.2, 5.3, code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */

import { layoutStore } from '../LayoutStore.js';
import { debug, error } from '../utils/logger.js';
import { 
  ChronicleFormData,
  SharedFields,
  UniqueFields,
  GenerationResult
} from '../model/party-chronicle-types.js';
import { Layout } from '../model/layout.js';
import { mapToCharacterData, ChronicleData } from '../model/party-chronicle-mapper.js';
import { validateSharedFields, validateUniqueFields } from '../model/party-chronicle-validator.js';
import { PdfGenerator } from '../PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import { createArchive, addPdfToArchive, generateBase64Zip, FlagActor } from './chronicle-exporter.js';
import { generateChronicleFilename } from '../utils/filename-utils.js';
import { PartyActor } from './event-listener-helpers.js';
import { postChatNotification } from './chat-notifier.js';
import { validateGmCharacterPfsId } from './gm-character-handlers.js';

/**
 * Validates all character fields (shared and unique) for chronicle generation
 * 
 * This helper function aggregates validation for both shared fields and all
 * character-specific fields. When a GM character actor is provided and the
 * form data has a gmCharacterActorId, PFS ID mismatch validation is also run.
 * 
 * @param data - Form data containing shared and character-specific fields
 * @param partyActors - Array of party member actors (used for character names)
 * @param gmCharacterActor - Optional GM character actor for PFS ID validation
 * @returns Object with valid flag and array of all validation errors
 * 
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 * Requirements: gm-character-party-sheet 5.5, 7.1, 7.4
 */
function validateAllCharacterFields(
  data: ChronicleFormData,
  partyActors: PartyActor[],
  gmCharacterActor?: PartyActor
): { valid: boolean; errors: string[] } {
  const allErrors: string[] = [];
  
  // Validate shared fields
  const sharedValidation = validateSharedFields(data.shared || {});
  allErrors.push(...sharedValidation.errors);
  
  // Validate unique fields for all characters (includes GM character if present in data.characters)
  const characters = data.characters || {};
  for (const [actorId, unique] of Object.entries(characters)) {
    const actor = partyActors.find(a => a.id === actorId) ?? (gmCharacterActor?.id === actorId ? gmCharacterActor : undefined);
    const characterName = actor?.name || actorId;
    const result = validateUniqueFields(unique, characterName);
    allErrors.push(...result.errors);
  }
  
  // Validate GM character PFS ID mismatch
  if (gmCharacterActor && data.shared?.gmCharacterActorId) {
    const pfsIdError = validateGmCharacterPfsId(gmCharacterActor, data.shared.gmPfsNumber);
    if (pfsIdError) {
      allErrors.push(pfsIdError);
    }
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
  data: ChronicleFormData
): Promise<{ layout: Layout; layoutId: string; blankChroniclePath: string } | null> {
  // Get the selected layout ID
  const layoutId = data.shared?.layoutId || game.settings.get('pfs-chronicle-generator', 'layout');
  
  // Load the layout
  let layout: Layout;
  try {
    layout = await layoutStore.getLayout(layoutId as string);
  } catch (caughtError) {
    ui.notifications?.error(`Failed to load layout: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`);
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
 * Extracts shared fields from raw form data into a typed SharedFields object
 * 
 * Handles coercion of raw values (strings, numbers, booleans) and provides
 * defaults for missing fields. Array fields (checkboxes, strikeout items)
 * are normalized to arrays regardless of input shape.
 * 
 * @param rawShared - Raw shared data from form extraction
 * @param layoutId - Currently selected layout ID
 * @param blankChroniclePath - Path to the blank chronicle PDF
 * @returns Typed SharedFields object with all fields populated
 */
// eslint-disable-next-line complexity -- Flat null-coalescing pattern, low cognitive complexity
function extractSharedFields(rawShared: Partial<SharedFields>, layoutId: string, blankChroniclePath: string): SharedFields {
  return {
    gmPfsNumber: rawShared?.gmPfsNumber || '',
    scenarioName: rawShared?.scenarioName || '',
    eventCode: rawShared?.eventCode || '',
    eventDate: rawShared?.eventDate || '',
    xpEarned: Number(rawShared?.xpEarned) || 0,
    adventureSummaryCheckboxes: Array.isArray(rawShared?.adventureSummaryCheckboxes)
      ? rawShared.adventureSummaryCheckboxes
      : (rawShared?.adventureSummaryCheckboxes ? [rawShared.adventureSummaryCheckboxes] : []),
    strikeoutItems: Array.isArray(rawShared?.strikeoutItems)
      ? rawShared.strikeoutItems
      : (rawShared?.strikeoutItems ? [rawShared.strikeoutItems] : []),
    treasureBundles: Number(rawShared?.treasureBundles) || 0,
    layoutId: layoutId,
    seasonId: rawShared?.seasonId || '',
    blankChroniclePath: blankChroniclePath,
    chosenFactionReputation: Number(rawShared?.chosenFactionReputation) || 2,
    reputationValues: {
      EA: Number(rawShared?.reputationValues?.EA) || 0,
      GA: Number(rawShared?.reputationValues?.GA) || 0,
      HH: Number(rawShared?.reputationValues?.HH) || 0,
      VS: Number(rawShared?.reputationValues?.VS) || 0,
      RO: Number(rawShared?.reputationValues?.RO) || 0,
      VW: Number(rawShared?.reputationValues?.VW) || 0
    },
    downtimeDays: Number(rawShared?.downtimeDays) || 0,
    reportingA: Boolean(rawShared?.reportingA),
    reportingB: Boolean(rawShared?.reportingB),
    reportingC: Boolean(rawShared?.reportingC),
    reportingD: Boolean(rawShared?.reportingD),
  };
}

/**
 * Extracts unique fields for a single character from raw form data
 * 
 * Reads character-specific data from the raw form extraction and coerces
 * values to the correct types. Falls back to actor data for character name
 * and level when form values are missing.
 * 
 * @param rawCharacters - Raw character data keyed by actor ID
 * @param actor - The actor object for fallback values
 * @returns Typed UniqueFields object for this character
 */
// eslint-disable-next-line complexity -- Flat null-coalescing pattern, low cognitive complexity
function extractUniqueFields(rawCharacters: Record<string, Partial<UniqueFields>>, actor: PartyActor): UniqueFields {
  const uniqueFields = rawCharacters?.[actor.id] || {};
  return {
    characterName: uniqueFields.characterName || actor.name,
    playerNumber: uniqueFields.playerNumber || '',
    characterNumber: uniqueFields.characterNumber || '',
    level: Number(uniqueFields.level) || actor.system?.details?.level?.value || 1,
    taskLevel: uniqueFields.taskLevel !== undefined ? uniqueFields.taskLevel : (Number(uniqueFields.level) || 1) - 2,
    successLevel: uniqueFields.successLevel || 'success',
    proficiencyRank: uniqueFields.proficiencyRank || 'trained',
    earnedIncome: Number(uniqueFields.earnedIncome) || 0,
    currencySpent: Number(uniqueFields.currencySpent) || 0,
    notes: uniqueFields.notes || '',
    consumeReplay: Boolean(uniqueFields.consumeReplay)
  };
}

/**
 * Extracts and maps a single character's chronicle data from raw form data
 * 
 * Combines shared fields and character-specific fields, then maps them
 * to the chronicle data format used by the PDF generator.
 * 
 * @param data - Raw form data containing shared and character-specific fields
 * @param actor - The actor to extract data for
 * @param layoutId - Currently selected layout ID
 * @param blankChroniclePath - Path to the blank chronicle PDF
 * @returns Mapped chronicle data ready for PDF generation
 */
function extractCharacterChronicleData(
  data: ChronicleFormData,
  actor: PartyActor,
  layoutId: string,
  blankChroniclePath: string
): ChronicleData {
  const sharedFields = extractSharedFields(data.shared, layoutId, blankChroniclePath);
  const characterData = extractUniqueFields(data.characters, actor);
  return mapToCharacterData(sharedFields, characterData, actor);
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
  chronicleData: ChronicleData,
  layout: Layout,
  blankChroniclePath: string,
  actor: PartyActor
): Promise<GenerationResult> {
  const { id: characterId, name: characterName } = actor;

  try {
    const response = await fetch(blankChroniclePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch blank chronicle PDF: ${response.statusText}`);
    }

    const pdfDoc = await PDFDocument.load(await response.arrayBuffer());

    const generator = new PdfGenerator(pdfDoc, layout, chronicleData);
    await generator.generate();

    const modifiedPdfBytes = await pdfDoc.save();
    let binary = '';
    for (let i = 0; i < modifiedPdfBytes.byteLength; i++) {
      binary += String.fromCodePoint(modifiedPdfBytes[i]);
    }

    debug(`Successfully generated chronicle for ${characterName}`);

    return {
      characterId,
      characterName,
      success: true,
      pdfBytes: modifiedPdfBytes,
      flagData: {
        chronicleData: { ...chronicleData, blankChroniclePath },
        chroniclePdf: btoa(binary)
      }
    };
  } catch (caughtError) {
    const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError);
    error(`Failed to generate chronicle for ${characterName}:`, caughtError);

    return { characterId, characterName, success: false, error: errorMessage };
  }
}

/**
 * Processes all party members to generate their chronicles
 *
 * This helper function iterates through all party members and generates a PDF
 * chronicle for each one. It extracts character data, generates the PDF, and
 * saves it to actor flags. Each successful PDF is also added to a zip archive
 * that is stored on the Party actor after the loop completes.
 *
 * @param data - Form data containing shared and character-specific fields
 * @param partyActors - Array of party member actors
 * @param layout - The layout configuration for PDF generation
 * @param layoutId - The selected layout ID
 * @param blankChroniclePath - Path to the blank chronicle PDF
 * @param partyActor - The Party actor for zip archive storage
 * @param gmCharacterActor - Optional GM character actor to include in generation
 * @returns Promise that resolves to array of GenerationResult objects
 *
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 * Requirements: chronicle-export 1.1, 1.2, 1.4, 1.5, 1.6, 5.3
 * Requirements: gm-character-party-sheet 5.1, 5.2, 5.3
 */
async function processAllPartyMembers(
  data: ChronicleFormData,
  partyActors: PartyActor[],
  layout: Layout,
  layoutId: string,
  blankChroniclePath: string,
  partyActor: FlagActor,
  gmCharacterActor?: PartyActor
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  const archive = createArchive();
  const usedFilenames = new Set<string>();
  const pendingUpdates = new Map<PartyActor, Record<string, unknown>>();

  const allActors = gmCharacterActor
    ? [...partyActors, gmCharacterActor]
    : partyActors;

  for (const actor of allActors) {
    const chronicleData = extractCharacterChronicleData(data, actor, layoutId, blankChroniclePath);
    const result = await generateSingleCharacterPdf(chronicleData, layout, blankChroniclePath, actor);

    if (result.success && result.flagData) {
      pendingUpdates.set(actor, {
        'flags.pfs-chronicle-generator.chronicleData': result.flagData.chronicleData,
        'flags.pfs-chronicle-generator.chroniclePdf': result.flagData.chroniclePdf
      });
    }

    if (result.success && result.pdfBytes && result.pdfBytes.length > 0) {
      const filename = generateChronicleFilename(actor.name, blankChroniclePath);
      addPdfToArchive(archive, result.pdfBytes, filename, usedFilenames);
    }

    results.push(result);
  }

  await flushPendingUpdates(pendingUpdates, archive, usedFilenames, partyActor);
  return results;
}

/**
 * Writes all queued actor flag data and the zip archive in a single parallel batch.
 * Each actor receives one update() call instead of multiple setFlag() calls,
 * reducing the number of Foundry document updates and sheet re-renders.
 */
async function flushPendingUpdates(
  pendingUpdates: Map<PartyActor, Record<string, unknown>>,
  archive: ReturnType<typeof createArchive>,
  usedFilenames: Set<string>,
  partyActor: FlagActor
): Promise<void> {
  const updatePromises: Promise<void>[] = [];

  for (const [actor, flagData] of pendingUpdates) {
    updatePromises.push(actor.update(flagData));
  }

  if (usedFilenames.size > 0) {
    const base64 = generateBase64Zip(archive);
    updatePromises.push(partyActor.update({
      'flags.pfs-chronicle-generator.chronicleZip': base64
    }));
  }

  await Promise.all(updatePromises);
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
 * @param partyActor - The Party actor for zip archive storage
 * @param gmCharacterActor - Optional GM character actor for generation and validation
 * @returns Promise that resolves when all chronicles are generated
 * 
 * Requirements: code-standards-refactoring 2.1, 2.6, 2.7, 2.8, 3.1, 3.6
 * Requirements: gm-character-party-sheet 5.1, 5.4, 5.5, 7.1, 7.4
 */
export async function generateChroniclesFromPartyData(
  data: ChronicleFormData,
  partyActors: PartyActor[],
  partyActor: FlagActor,
  gmCharacterActor?: PartyActor
): Promise<void> {
  // Step 1: Validate all fields (including GM character PFS ID mismatch)
  const validation = validateAllCharacterFields(data, partyActors, gmCharacterActor);
  if (!validation.valid) {
    ui.notifications?.error(`Validation failed: ${validation.errors.join(', ')}`);
    return;
  }

  // Step 2: Load layout and blank chronicle path
  const layoutConfig = await loadLayoutConfiguration(data);
  if (!layoutConfig) {
    return; // Error already displayed by helper
  }

  // Step 3: Process each party member (including GM character if present)
  const results = await processAllPartyMembers(
    data,
    partyActors,
    layoutConfig.layout,
    layoutConfig.layoutId,
    layoutConfig.blankChroniclePath,
    partyActor,
    gmCharacterActor
  );

  // Step 4: Display summary notifications
  displayGenerationResults(results);

  // Step 5: Post chat notification
  try {
    await postChatNotification(results, data.shared.scenarioName);
  } catch (err) {
    error('Failed to post chat notification', err);
  }
}
