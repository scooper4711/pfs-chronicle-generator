/**
 * Form Data Extraction
 * 
 * This module handles extraction of form data from the party chronicle form.
 * It reads all form fields and constructs structured data objects.
 * 
 * Requirements: party-chronicle-filling 4.5, multi-line-reputation-tracking 1.2, 1.3, 4.1, 4.2
 */

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
 * 
 * Requirements: party-chronicle-filling 4.5, multi-line-reputation-tracking 1.2, 1.3, 4.1, 4.2
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
