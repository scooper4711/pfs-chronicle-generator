/**
 * Clear Button Handlers
 *
 * Logic for the "Clear Chronicle Data" button: confirmation dialog,
 * adventure-type defaults, default character fields, and re-render.
 *
 * Extracted from event-listener-helpers.ts to keep files under 500 lines.
 *
 * Requirements: party-chronicle-filling 5.5
 */

import { debug } from '../utils/logger.js';
import {
    SHARED_FIELD_SELECTORS,
    BUTTON_SELECTORS
} from '../constants/dom-selectors.js';
import { clearPartyChronicleData, savePartyChronicleData } from '../model/party-chronicle-storage.js';
import { clearArchive } from '../handlers/chronicle-exporter.js';
import { updateChroniclePathVisibility } from './party-chronicle-handlers.js';
import type { PartyActor, PartySheetApp } from './event-listener-helpers.js';
import type { FlagActor } from '../handlers/chronicle-exporter.js';
import type { PartyChronicleData, UniqueFields } from '../model/party-chronicle-types.js';

/**
 * Attaches clear button event listener with confirmation dialog
 *
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 * @param partyActor - The Party actor for archive flag operations
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
 * Handles the clear button action after user confirmation.
 *
 * Preserves GM PFS number, scenario name, event code, chronicle path,
 * season, and layout. Determines smart defaults based on adventure type,
 * clears stored data, saves new defaults, and re-renders the form.
 *
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 * @param partyActor - The Party actor for archive flag operations
 */
async function handleClearButtonConfirmed(
    container: HTMLElement,
    partyActors: PartyActor[],
    partySheet: PartySheetApp,
    partyActor: FlagActor
): Promise<void> {
    const gmPfsNumber = (container.querySelector(SHARED_FIELD_SELECTORS.GM_PFS_NUMBER) as HTMLInputElement)?.value || '';
    const scenarioName = (container.querySelector(SHARED_FIELD_SELECTORS.SCENARIO_NAME) as HTMLInputElement)?.value || '';
    const eventCode = (container.querySelector(SHARED_FIELD_SELECTORS.EVENT_CODE) as HTMLInputElement)?.value || '';
    const chroniclePath = (container.querySelector(SHARED_FIELD_SELECTORS.BLANK_CHRONICLE_PATH) as HTMLInputElement)?.value || '';
    const seasonSelect = container.querySelector(SHARED_FIELD_SELECTORS.SEASON) as HTMLSelectElement;
    const layoutSelect = container.querySelector(SHARED_FIELD_SELECTORS.LAYOUT) as HTMLSelectElement;
    const seasonId = seasonSelect?.value || '';
    const layoutId = layoutSelect?.value || '';

    const { defaultXp, defaultTreasureBundles, defaultDowntimeDays, defaultChosenFactionRep } =
        determineAdventureDefaults(scenarioName);

    await clearPartyChronicleData();
    await clearArchive(partyActor);

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

    debug('Saving new data with defaults:', newData);
    await savePartyChronicleData(newData);

    ui.notifications?.info('Chronicle data cleared and defaults set');
    debug('Re-rendering form after clear');

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
 * - Scenario: everything else
 *
 * @param scenarioName - Name of the scenario
 * @returns Object with default values for XP, treasure bundles, downtime days, and faction reputation
 */
export function determineAdventureDefaults(scenarioName: string): {
    defaultXp: number;
    defaultTreasureBundles: number;
    defaultDowntimeDays: number;
    defaultChosenFactionRep: number;
} {
    const scenarioNameLower = scenarioName.toLowerCase().trim();
    const isBounty = /^b\d+\b/.test(scenarioNameLower);
    const isQuest = /^q\d+\b/.test(scenarioNameLower);

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
export function buildDefaultCharacterFields(partyActors: PartyActor[]): { [actorId: string]: UniqueFields } {
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
                overrideCurrencyValue: 0,
                slowTrack: false
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
