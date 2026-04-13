/**
 * Form Data Extraction
 * 
 * This module handles extraction of form data from the party chronicle form.
 * It reads all form fields and constructs structured data objects.
 * 
 * Requirements: party-chronicle-filling 4.5, multi-line-reputation-tracking 1.2, 1.3, 4.1, 4.2, earned-income-calculation 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import type { PartyActor } from './event-listener-helpers.js';
import type { ChronicleFormData, SharedFields, UniqueFields } from '../model/party-chronicle-types.js';
import { GM_CHARACTER_SELECTORS } from '../constants/dom-selectors.js';

/**
 * Extracts form data into PartyChronicleData structure
 * 
 * This helper function reads all form fields and constructs a structured
 * data object containing both shared fields and character-specific fields.
 * 
 * This function is exported for use in main.ts (Generate Chronicles button)
 * and is also used internally by the handlers.
 * 
 * CCN Complexity Note: This function has high cyclomatic complexity and exceeds the
 * max-lines-per-function limit. However, this is acceptable per architecture guidelines
 * because the complexity comes from flat, repetitive null-coalescing patterns
 * (|| defaultValue) and checkbox/select reads rather than nested conditionals.
 * The cognitive complexity is low and refactoring would create unnecessary abstraction
 * without improving readability.
 * 
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @returns Structured form data object with shared and character-specific fields
 * 
 * Requirements: party-chronicle-filling 4.5, multi-line-reputation-tracking 1.2, 1.3, 4.1, 4.2, earned-income-calculation 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
// eslint-disable-next-line complexity, max-lines-per-function
export function extractFormData(container: HTMLElement, partyActors: PartyActor[]): ChronicleFormData {
    // Extract shared fields
    const shared: SharedFields = {
        gmPfsNumber: (container.querySelector('#gmPfsNumber') as HTMLInputElement)?.value || '',
        scenarioName: (container.querySelector('#scenarioName') as HTMLInputElement)?.value || '',
        eventCode: (container.querySelector('#eventCode') as HTMLInputElement)?.value || '',
        eventDate: (container.querySelector('#eventDate') as HTMLInputElement)?.value || '',
        xpEarned: Number.parseInt((container.querySelector('#xpEarned') as HTMLInputElement)?.value) || 0,
        treasureBundles: Number.parseInt((container.querySelector('#treasureBundles') as HTMLInputElement)?.value) || 0,
        downtimeDays: Number.parseInt((container.querySelector('#downtimeDays') as HTMLInputElement)?.value) || 0,
        layoutId: (container.querySelector('#layout') as HTMLSelectElement)?.value || '',
        seasonId: (container.querySelector('#season') as HTMLSelectElement)?.value || '',
        blankChroniclePath: (container.querySelector('#blankChroniclePath') as HTMLInputElement)?.value || '',
        adventureSummaryCheckboxes: Array.from(
            container.querySelectorAll('input[name="shared.adventureSummaryCheckboxes"]:checked')
        ).map((el) => (el as HTMLInputElement).value),
        strikeoutItems: Array.from(
            container.querySelectorAll('input[name="shared.strikeoutItems"]:checked')
        ).map((el) => (el as HTMLInputElement).value),
        chosenFactionReputation: Number.parseInt((container.querySelector('#chosenFactionReputation') as HTMLInputElement)?.value) || 2,
        reputationValues: {
            EA: Number.parseInt((container.querySelector('#reputation-EA') as HTMLInputElement)?.value) || 0,
            GA: Number.parseInt((container.querySelector('#reputation-GA') as HTMLInputElement)?.value) || 0,
            HH: Number.parseInt((container.querySelector('#reputation-HH') as HTMLInputElement)?.value) || 0,
            VS: Number.parseInt((container.querySelector('#reputation-VS') as HTMLInputElement)?.value) || 0,
            RO: Number.parseInt((container.querySelector('#reputation-RO') as HTMLInputElement)?.value) || 0,
            VW: Number.parseInt((container.querySelector('#reputation-VW') as HTMLInputElement)?.value) || 0,
        },
        reportingA: (container.querySelector('#reportingA') as HTMLInputElement)?.checked || false,
        reportingB: (container.querySelector('#reportingB') as HTMLInputElement)?.checked || false,
        reportingC: (container.querySelector('#reportingC') as HTMLInputElement)?.checked || false,
        reportingD: (container.querySelector('#reportingD') as HTMLInputElement)?.checked || false,
    };
    
    // Read GM character actor ID from hidden input (gm-character-party-sheet 4.3, 8.1)
    const gmCharacterActorId = (container.querySelector(GM_CHARACTER_SELECTORS.ACTOR_ID_INPUT) as HTMLInputElement)?.value || '';
    if (gmCharacterActorId) {
        shared.gmCharacterActorId = gmCharacterActorId;
    }
    
    // Extract character-specific fields
    const characters: Record<string, UniqueFields> = {};
    
    // Build the list of actor IDs to extract: party actors + GM character (if assigned)
    const actorsToExtract: PartyActor[] = [...partyActors];
    if (gmCharacterActorId) {
        // Add a minimal PartyActor entry for the GM character so the same extraction loop handles it.
        // The GM character's hidden fields in the DOM use the same characters.{actorId}.* naming pattern.
        const gmSection = container.querySelector(`[data-character-id="${gmCharacterActorId}"]`);
        if (gmSection) {
            actorsToExtract.push({ id: gmCharacterActorId, name: '', system: { details: { level: { value: 1 } } } } as PartyActor);
        }
    }
    
    // eslint-disable-next-line complexity -- Flat field extraction pattern, low cognitive complexity
    actorsToExtract.forEach((actor: PartyActor) => {
        const actorId = actor.id;
        
        // Get task level value (can be "-" or a number)
        const taskLevelSelect = container.querySelector(`select[name="characters.${actorId}.taskLevel"]`) as HTMLSelectElement;
        const taskLevelValue = taskLevelSelect?.value || '-';
        const taskLevel = taskLevelValue === '-' ? '-' : Number.parseInt(taskLevelValue, 10);
        
        characters[actorId] = {
            // Read from hidden fields (non-editable)
            characterName: (container.querySelector(`input[name="characters.${actorId}.characterName"]`) as HTMLInputElement)?.value || actor.name,
            playerNumber: (container.querySelector(`input[name="characters.${actorId}.playerNumber"]`) as HTMLInputElement)?.value || '',
            characterNumber: (container.querySelector(`input[name="characters.${actorId}.characterNumber"]`) as HTMLInputElement)?.value || '',
            level: Number.parseInt((container.querySelector(`input[name="characters.${actorId}.level"]`) as HTMLInputElement)?.value) || actor.system?.details?.level?.value || 1,
            // Read earned income input fields
            taskLevel: taskLevel,
            successLevel: (container.querySelector(`select[name="characters.${actorId}.successLevel"]`) as HTMLSelectElement)?.value || 'success',
            proficiencyRank: (container.querySelector(`select[name="characters.${actorId}.proficiencyRank"]`) as HTMLSelectElement)?.value || 'trained',
            earnedIncome: Number.parseFloat((container.querySelector(`input[name="characters.${actorId}.earnedIncome"]`) as HTMLInputElement)?.value) || 0,
            // Read from visible editable fields
            currencySpent: Number.parseFloat((container.querySelector(`#currencySpent-${actorId}`) as HTMLInputElement)?.value) || 0,
            notes: (container.querySelector(`#notes-${actorId}`) as HTMLTextAreaElement)?.value || '',
            // Read session reporting fields
            consumeReplay: (container.querySelector(`input[name="characters.${actorId}.consumeReplay"]`) as HTMLInputElement)?.checked || false,
        };
    });
    
    return { shared, characters };
}
