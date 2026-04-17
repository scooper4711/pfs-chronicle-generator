/**
 * Event Listener Helper Functions
 * 
 * This module provides helper functions for attaching event listeners to the
 * party chronicle form. These functions are extracted from main.ts to reduce
 * complexity and improve type safety.
 * 
 * Requirements: code-standards-refactoring 4.1, 4.2, 4.3, 4.4, 4.5
 */

import {
    SHARED_FIELD_SELECTORS,
    CHARACTER_FIELD_PATTERNS,
    BUTTON_SELECTORS,
    GENERAL_SELECTORS,
    GM_CHARACTER_SELECTORS
} from '../constants/dom-selectors.js';
import {
    handleSeasonChange,
    handleLayoutChange,
    handleFieldChange,
    handlePortraitClick,
    handleChroniclePathFilePicker,
    extractFormData,
    saveFormData,
    generateChroniclesFromPartyData,
    updateAllTreasureBundleDisplays,
    updateTreasureBundleDisplay,
    updateAllEarnedIncomeDisplays,
    updateDowntimeDaysDisplay,
    updateChroniclePathVisibility
} from './party-chronicle-handlers.js';
import {
    handleSectionHeaderClick,
    handleSectionHeaderKeydown
} from './collapsible-section-handlers.js';
import {
    handleGmCharacterDrop,
    handleGmCharacterClear
} from './gm-character-handlers.js';
import {
    handleOverrideXpChange,
    handleOverrideCurrencyChange
} from './override-handlers.js';
import { createEarnedIncomeChangeHandler } from '../utils/earned-income-form-helpers.js';
import { clearPartyChronicleData, savePartyChronicleData } from '../model/party-chronicle-storage.js';
import { PartyChronicleData, UniqueFields } from '../model/party-chronicle-types.js';
import { handleCopySessionReport } from './session-report-handler.js';
import { FlagActor, clearArchive, downloadArchive, hasArchive } from './chronicle-exporter.js';
import { debug } from '../utils/logger.js';

/**
 * Actor type definition for party members.
 * 
 * Represents a PF2e character actor with the properties accessed
 * throughout the chronicle generator. Extends FlagActor for flag
 * operations (getFlag, setFlag, unsetFlag).
 */
export interface PartyActor extends FlagActor {
    id: string;
    name: string;
    img: string;
    type: string;
    render(force?: boolean): void;
    sheet?: {
        render(force?: boolean, options?: { focus?: boolean }): void;
    };
    system?: {
        details?: {
            level?: {
                value: number;
            };
        };
        pfs?: {
            playerNumber?: number;
            characterNumber?: number;
            currentFaction?: string;
        };
    };
}

/**
 * Minimal type for the PF2e Party Sheet app passed to renderPartySheetPF2e hook.
 * Provides access to the party actor and its members.
 */
export interface PartySheetApp {
    actor?: {
        members: PartyActor[];
    } & FlagActor;
}

/**
 * Minimal type for the PF2e Character Sheet app passed to renderCharacterSheetPF2e hook.
 * Provides access to the character actor for flag operations and rendering.
 */
export interface CharacterSheetApp {
    actor: PartyActor;
    render(force?: boolean): void;
}

/**
 * Attaches season and layout change event listeners
 * 
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 */
export function attachSeasonAndLayoutListeners(
    container: HTMLElement,
    partyActors: PartyActor[]
): void {
    const seasonSelect = container.querySelector(SHARED_FIELD_SELECTORS.SEASON) as HTMLSelectElement;
    seasonSelect?.addEventListener('change', async (event: Event) => {
        await handleSeasonChange(event, container, partyActors, extractFormData);
    });
    
    const layoutSelect = container.querySelector(SHARED_FIELD_SELECTORS.LAYOUT) as HTMLSelectElement;
    layoutSelect?.addEventListener('change', async (event: Event) => {
        await handleLayoutChange(event, container, partyActors, extractFormData);
    });
}

/**
 * Attaches auto-save and validation listeners to all form elements
 * 
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 */
export function attachFormFieldListeners(
    container: HTMLElement,
    partyActors: PartyActor[]
): void {
    const formElements = container.querySelectorAll(GENERAL_SELECTORS.ALL_FORM_ELEMENTS);
    formElements.forEach((element) => {
        element.addEventListener('change', async (event: Event) => {
            await handleFieldChange(event, container, partyActors, extractFormData);
        });
    });
}

/**
 * Attaches treasure bundle related event listeners
 * 
 * @param container - Form container element
 */
export function attachTreasureBundleListeners(container: HTMLElement): void {
    const treasureBundlesSelect = container.querySelector<HTMLSelectElement>(
        SHARED_FIELD_SELECTORS.TREASURE_BUNDLES
    );
    
    // Treasure bundles change handler for reactive display updates
    treasureBundlesSelect?.addEventListener('change', (event: Event) => {
        const select = event.target as HTMLSelectElement;
        const treasureBundles = Number.parseFloat(select.value) || 0;
        updateAllTreasureBundleDisplays(treasureBundles, container);
    });
    
    // Character level input change handlers for reactive treasure bundle display updates
    const levelInputs = container.querySelectorAll<HTMLInputElement>(CHARACTER_FIELD_PATTERNS.LEVEL_ALL);
    levelInputs.forEach((levelInput) => {
        levelInput.addEventListener('input', (event: Event) => {
            const input = event.target as HTMLInputElement;
            const match = input.name.match(/characters\.([^.]+)\.level/);
            
            if (match) {
                const characterId = match[1];
                const treasureBundlesSelect = container.querySelector<HTMLSelectElement>(
                    SHARED_FIELD_SELECTORS.TREASURE_BUNDLES
                );
                const treasureBundles = Number.parseFloat(treasureBundlesSelect?.value || '0');
                const characterLevel = Number.parseInt(input.value, 10);
                updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
            }
        });
    });
}

/**
 * Attaches downtime days related event listeners
 * Requirements: earned-income-calculation 2.4, 2.5, 7.3
 * 
 * @param container - Form container element
 */
export function attachDowntimeDaysListeners(container: HTMLElement): void {
    const xpEarnedSelect = container.querySelector<HTMLSelectElement>(SHARED_FIELD_SELECTORS.XP_EARNED);
    const treasureBundlesSelect = container.querySelector<HTMLSelectElement>(
        SHARED_FIELD_SELECTORS.TREASURE_BUNDLES
    );
    
    // XP Earned change handler for reactive downtime days display updates
    xpEarnedSelect?.addEventListener('change', (event: Event) => {
        const select = event.target as HTMLSelectElement;
        const xpEarned = Number.parseInt(select.value, 10) || 0;
        updateDowntimeDaysDisplay(xpEarned, container);
    });
    
    // Treasure Bundles change handler for reactive downtime days display updates
    // (needed for Series 1 Quest detection: 1 XP + 2.5 TB = 2 downtime days)
    treasureBundlesSelect?.addEventListener('change', () => {
        const xpEarnedSelect = container.querySelector<HTMLSelectElement>(SHARED_FIELD_SELECTORS.XP_EARNED);
        const xpEarned = Number.parseInt(xpEarnedSelect?.value || '0', 10);
        updateDowntimeDaysDisplay(xpEarned, container);
    });
}

/**
 * Attaches earned income related event listeners
 * Requirements: earned-income-calculation 7.3
 * 
 * @param container - Form container element
 */
export function attachEarnedIncomeListeners(container: HTMLElement): void {
    // Downtime days change handler
    const downtimeDaysSelect = container.querySelector<HTMLSelectElement>(
        SHARED_FIELD_SELECTORS.DOWNTIME_DAYS
    );
    downtimeDaysSelect?.addEventListener('change', (event: Event) => {
        const select = event.target as HTMLSelectElement;
        const downtimeDays = Number.parseInt(select.value, 10) || 1;
        updateAllEarnedIncomeDisplays(downtimeDays, container);
    });
    
    // Task level, success level, and proficiency rank change handlers
    const earnedIncomeHandler = createEarnedIncomeChangeHandler(container);
    
    const taskLevelSelects = container.querySelectorAll<HTMLSelectElement>(
        CHARACTER_FIELD_PATTERNS.TASK_LEVEL_ALL
    );
    taskLevelSelects.forEach((select) => {
        select.addEventListener('change', earnedIncomeHandler);
    });
    
    const successLevelSelects = container.querySelectorAll<HTMLSelectElement>(
        CHARACTER_FIELD_PATTERNS.SUCCESS_LEVEL_ALL
    );
    successLevelSelects.forEach((select) => {
        select.addEventListener('change', earnedIncomeHandler);
    });
    
    const proficiencyRankSelects = container.querySelectorAll<HTMLSelectElement>(
        CHARACTER_FIELD_PATTERNS.PROFICIENCY_RANK_ALL
    );
    proficiencyRankSelects.forEach((select) => {
        select.addEventListener('change', earnedIncomeHandler);
    });
}

/**
 * Attaches save button event listener
 * 
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 */
export function attachSaveButtonListener(
    container: HTMLElement,
    partyActors: PartyActor[]
): void {
    const saveButton = container.querySelector(BUTTON_SELECTORS.SAVE_DATA);
    saveButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        await saveFormData(container, partyActors);
        ui.notifications?.info('Chronicle data saved successfully');
    });
}

/**
 * Attaches clear button event listener with confirmation dialog
 * 
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 */
export function attachClearButtonListener(
    container: HTMLElement,
    partyActors: PartyActor[],
    partySheet: PartySheetApp,
    partyActor: FlagActor
): void {
    const clearButton = container.querySelector(BUTTON_SELECTORS.CLEAR_DATA);
    clearButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Clear Chronicle Data' },
            content: '<p>Are you sure you want to clear all saved chronicle data? This cannot be undone.</p>',
            rejectClose: false,
            modal: true
        });

        if (confirmed) {
            await handleClearButtonConfirmed(container, partyActors, partySheet, partyActor);
        }
    });
}

/**
 * Handles the clear button action after user confirmation
 * Extracted to reduce complexity of the clear button listener
 * 
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 */
async function handleClearButtonConfirmed(
    container: HTMLElement,
    partyActors: PartyActor[],
    partySheet: PartySheetApp,
    partyActor: FlagActor
): Promise<void> {
    // Get current values to preserve
    const gmPfsNumber = (container.querySelector(SHARED_FIELD_SELECTORS.GM_PFS_NUMBER) as HTMLInputElement)?.value || '';
    const scenarioName = (container.querySelector(SHARED_FIELD_SELECTORS.SCENARIO_NAME) as HTMLInputElement)?.value || '';
    const eventCode = (container.querySelector(SHARED_FIELD_SELECTORS.EVENT_CODE) as HTMLInputElement)?.value || '';
    const chroniclePath = (container.querySelector(SHARED_FIELD_SELECTORS.BLANK_CHRONICLE_PATH) as HTMLInputElement)?.value || '';
    const seasonSelect = container.querySelector(SHARED_FIELD_SELECTORS.SEASON) as HTMLSelectElement;
    const layoutSelect = container.querySelector(SHARED_FIELD_SELECTORS.LAYOUT) as HTMLSelectElement;
    const seasonId = seasonSelect?.value || '';
    const layoutId = layoutSelect?.value || '';
    
    // Determine adventure type and set smart defaults
    const { defaultXp, defaultTreasureBundles, defaultDowntimeDays, defaultChosenFactionRep } = 
        determineAdventureDefaults(scenarioName);
    
    // Clear all data first
    await clearPartyChronicleData();
    await clearArchive(partyActor);
    
    // Create new data with preserved values and smart defaults
    const newData = createDefaultChronicleData({
        gmPfsNumber,
        scenarioName,
        eventCode,
        chroniclePath,
        layoutId,
        seasonId,
        defaultXp,
        defaultTreasureBundles,
        defaultDowntimeDays,
        defaultChosenFactionRep
    }, partyActors);
    
    // Save the new data with defaults
    debug('Saving new data with defaults:', newData);
    await savePartyChronicleData(newData);
    
    ui.notifications?.info('Chronicle data cleared and defaults set');
    debug('Re-rendering form after clear');
    
    // Re-render form
    const { renderPartyChronicleForm } = await import('../main.js');
    await renderPartyChronicleForm(container, partyActors, partySheet);
    
    debug('Update chronicle path visibility after re-rendering');
    await updateChroniclePathVisibility(chroniclePath, container, layoutId);
}

/**
 * Determines default values based on adventure type (Bounty, Quest, or Scenario).
 * 
 * Detects type by checking the scenario name prefix:
 * - Bounty: starts with "Bxx" (e.g., "B1 The Whitefang Wyrm")
 * - Quest: starts with "Qxx" (e.g., "Q14 The Swordlords Challenge")
 * - Scenario: everything else (e.g., "7-01 Journeymakers Lodge")
 * 
 * @param scenarioName - Name of the scenario
 * @returns Object with default values for XP, treasure bundles, downtime days, and faction reputation
 */
function determineAdventureDefaults(scenarioName: string): {
    defaultXp: number;
    defaultTreasureBundles: number;
    defaultDowntimeDays: number;
    defaultChosenFactionRep: number;
} {
    const scenarioNameLower = scenarioName.toLowerCase().trim();
    const isBounty = /^b\d+\b/.test(scenarioNameLower);
    const isQuest = /^q\d+\b/.test(scenarioNameLower);
    
    // Bounty: 1 XP, Quest: 2 XP, Scenario: 4 XP (default)
    return {
        defaultXp: isBounty ? 1 : (isQuest ? 2 : 4),
        defaultTreasureBundles: isBounty ? 2 : (isQuest ? 4 : 8),
        defaultDowntimeDays: isBounty ? 0 : (isQuest ? 4 : 8),
        defaultChosenFactionRep: isBounty ? 1 : (isQuest ? 2 : 4)
    };
}

/**
 * Builds default UniqueFields for each party actor
 * 
 * @param partyActors - Array of party member actors
 * @returns Map of actor IDs to default UniqueFields
 */
function buildDefaultCharacterFields(partyActors: PartyActor[]): { [actorId: string]: UniqueFields } {
    const characters: { [actorId: string]: UniqueFields } = {};
    
    partyActors.forEach((actor) => {
        if (actor?.id) {
            const characterLevel = actor.system?.details?.level?.value || 1;
            const defaultTaskLevel = Math.max(0, characterLevel - 2);
            
            debug('Setting defaults for character:', actor.name, {
                characterLevel,
                defaultTaskLevel
            });
            
            characters[actor.id] = {
                characterName: actor.name || '',
                playerNumber: '',
                characterNumber: '',
                level: characterLevel,
                taskLevel: defaultTaskLevel,
                successLevel: 'success',
                proficiencyRank: 'trained',
                earnedIncome: 0,
                currencySpent: 0,
                notes: '',
                consumeReplay: false,
                overrideXp: false,
                overrideXpValue: 0,
                overrideCurrency: false,
                overrideCurrencyValue: 0
            };
        }
    });
    
    return characters;
}

/** Parameters for creating default chronicle data after a clear operation */
interface ClearDefaults {
    gmPfsNumber: string;
    scenarioName: string;
    eventCode: string;
    chroniclePath: string;
    layoutId: string;
    seasonId: string;
    defaultXp: number;
    defaultTreasureBundles: number;
    defaultDowntimeDays: number;
    defaultChosenFactionRep: number;
}

/**
 * Creates default chronicle data structure with preserved and default values
 * 
 * @param defaults - Preserved field values and adventure-type defaults
 * @param partyActors - Array of party member actors
 * @returns Chronicle data structure with defaults
 */
function createDefaultChronicleData(
    defaults: ClearDefaults,
    partyActors: PartyActor[]
): PartyChronicleData {
    return {
        shared: {
            gmPfsNumber: defaults.gmPfsNumber,
            scenarioName: defaults.scenarioName,
            eventCode: defaults.eventCode,
            eventDate: '',
            xpEarned: defaults.defaultXp,
            treasureBundles: defaults.defaultTreasureBundles,
            downtimeDays: defaults.defaultDowntimeDays,
            layoutId: defaults.layoutId,
            seasonId: defaults.seasonId,
            blankChroniclePath: defaults.chroniclePath,
            adventureSummaryCheckboxes: [],
            strikeoutItems: [],
            chosenFactionReputation: defaults.defaultChosenFactionRep,
            reputationValues: {
                EA: 0,
                GA: 0,
                HH: 0,
                VS: 0,
                RO: 0,
                VW: 0
            },
            reportingA: false,
            reportingB: false,
            reportingC: false,
            reportingD: false,
        },
        characters: buildDefaultCharacterFields(partyActors)
    };
}

/**
 * Attaches click listener to the Generate Chronicles button.
 *
 * Extracts form data and delegates to the chronicle generation pipeline,
 * passing the Party actor for zip archive storage.
 *
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * @param partyActor - The Party actor for zip archive storage
 */
export function attachGenerateButtonListener(
    container: HTMLElement,
    partyActors: PartyActor[],
    partyActor: FlagActor
): void {
    const generateButton = container.querySelector(BUTTON_SELECTORS.GENERATE_CHRONICLES);
    generateButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        const formData = extractFormData(container, partyActors);
        const gmCharacterActorId = formData.shared?.gmCharacterActorId;
        const gmCharacterActor = gmCharacterActorId
            ? game.actors.get(gmCharacterActorId) as PartyActor | undefined
            : undefined;
        await generateChroniclesFromPartyData(formData, partyActors, partyActor, gmCharacterActor);

        const exportButton = container.querySelector(BUTTON_SELECTORS.EXPORT_CHRONICLES);
        if (exportButton && hasArchive(partyActor)) {
            exportButton.removeAttribute('disabled');
        }
    });
}

/**
 * Attaches Copy Session Report button event listener
 *
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 *
 * Requirements: paizo-session-reporting 1.3, 3.3, 10.3, 10.4
 */
export function attachCopySessionReportListener(
    container: HTMLElement,
    partyActors: PartyActor[]
): void {
    const copyButton = container.querySelector(BUTTON_SELECTORS.COPY_SESSION_REPORT);
    copyButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        const layoutSelect = container.querySelector(SHARED_FIELD_SELECTORS.LAYOUT) as HTMLSelectElement;
        const layoutId = layoutSelect?.value || '';
        await handleCopySessionReport(container, partyActors, layoutId, event as MouseEvent);
    });
}

/**
 * Attaches Export Chronicles button event listener.
 * Downloads the stored zip archive using the scenario name and event date
 * from the form fields.
 *
 * @param container - Form container element
 * @param partyActor - The Party actor holding the zip archive in its flags
 *
 * Requirements: chronicle-export 2.1, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 6.2
 */
export function attachExportButtonListener(
    container: HTMLElement,
    partyActor: FlagActor
): void {
    const exportButton = container.querySelector(BUTTON_SELECTORS.EXPORT_CHRONICLES);
    exportButton?.addEventListener('click', (event: Event) => {
        event.preventDefault();

        if (!hasArchive(partyActor)) {
            ui.notifications?.error('No chronicle archive available to export.');
            return;
        }

        const scenarioName = (container.querySelector(SHARED_FIELD_SELECTORS.SCENARIO_NAME) as HTMLInputElement)?.value || '';
        const eventDate = (container.querySelector(SHARED_FIELD_SELECTORS.EVENT_DATE) as HTMLInputElement)?.value || '';

        downloadArchive(partyActor, scenarioName, eventDate);
    });
}


/**
 * Attaches portrait click event listeners
 * 
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 */
export function attachPortraitListeners(
    container: HTMLElement,
    partyActors: PartyActor[]
): void {
    const portraits = container.querySelectorAll('.actor-image img.actor-link');
    portraits.forEach((img) => {
        img.addEventListener('click', (event: Event) => {
            handlePortraitClick(event as MouseEvent, partyActors);
        });
    });
}

/**
 * Attaches chronicle path file picker button event listener
 * 
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 */
export function attachFilePickerListener(
    container: HTMLElement,
    partyActors: PartyActor[]
): void {
    const filePickerButton = container.querySelector(SHARED_FIELD_SELECTORS.CHRONICLE_PATH_FILE_PICKER);
    filePickerButton?.addEventListener('click', async (event: Event) => {
        await handleChroniclePathFilePicker(event, container, partyActors);
    });
}

/**
 * Attaches collapsible section header event listeners
 * 
 * @param container - Form container element
 */
export function attachCollapsibleSectionListeners(container: HTMLElement): void {
    const collapsibleHeaders = container.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach((header) => {
        header.addEventListener('click', (event: Event) => {
            handleSectionHeaderClick(event as MouseEvent, container);
        });
        header.addEventListener('keydown', (event: Event) => {
            handleSectionHeaderKeydown(event as KeyboardEvent, container);
        });
    });
}

/**
 * Attaches override checkbox change event listeners for XP and currency overrides.
 * 
 * Queries all override XP and currency checkboxes, extracts the character ID
 * from each checkbox's name attribute, and attaches change listeners that
 * delegate to the appropriate override handler.
 * 
 * @param container - Form container element
 * 
 * Requirements: gm-override-values 1.4, 1.5, 3.3, 3.4, 4.5, 4.6
 */
export function attachOverrideListeners(container: HTMLElement): void {
    const xpCheckboxes = container.querySelectorAll<HTMLInputElement>(
        CHARACTER_FIELD_PATTERNS.OVERRIDE_XP_ALL
    );
    xpCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            const match = checkbox.name.match(/characters\.([^.]+)\.overrideXp/);
            if (match) {
                handleOverrideXpChange(match[1], container);
            }
        });
    });

    const currencyCheckboxes = container.querySelectorAll<HTMLInputElement>(
        CHARACTER_FIELD_PATTERNS.OVERRIDE_CURRENCY_ALL
    );
    currencyCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            const match = checkbox.name.match(/characters\.([^.]+)\.overrideCurrency/);
            if (match) {
                handleOverrideCurrencyChange(match[1], container);
            }
        });
    });
}

/**
 * Attaches GM character drop zone and clear button event listeners.
 *
 * The drop zone accepts Foundry actor drag-and-drop payloads. The clear
 * button removes the current GM character assignment. Both delegate to
 * handler functions in `gm-character-handlers.ts`.
 *
 * Note: GM character form field change listeners (auto-save, earned income,
 * treasure bundle, downtime) are already covered by the existing wildcard
 * `querySelectorAll` patterns in `attachFormFieldListeners`,
 * `attachEarnedIncomeListeners`, `attachTreasureBundleListeners`, and
 * `attachDowntimeDaysListeners` since GM character fields use the same
 * `characters.{id}.fieldName` naming convention as party members.
 *
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 *
 * Requirements: gm-character-party-sheet 1.3, 3.1, 3.2, 3.3, 4.2, 4.3
 */
export function attachGmCharacterListeners(
    container: HTMLElement,
    partyActors: PartyActor[],
    partySheet: PartySheetApp
): void {
    const dropZone = container.querySelector<HTMLElement>(GM_CHARACTER_SELECTORS.DROP_ZONE);
    if (dropZone) {
        dropZone.addEventListener('dragover', (event: Event) => {
            event.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', async (event: Event) => {
            event.stopPropagation();
            dropZone.classList.remove('dragover');
            await handleGmCharacterDrop(event as DragEvent, container, partyActors, partySheet);
        });
    }

    // When a GM character is already assigned, the section replaces the drop zone.
    // Attach drop listeners to the section so dragging a new actor replaces the current one.
    const gmSection = container.querySelector<HTMLElement>(GM_CHARACTER_SELECTORS.SECTION);
    if (gmSection) {
        gmSection.addEventListener('dragover', (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        gmSection.addEventListener('drop', async (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            await handleGmCharacterDrop(event as DragEvent, container, partyActors, partySheet);
        });
    }

    const clearButton = container.querySelector<HTMLButtonElement>(GM_CHARACTER_SELECTORS.CLEAR_BUTTON);
    clearButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        await handleGmCharacterClear(container, partyActors, partySheet);
    });
}
