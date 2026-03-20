/**
 * Reputation Calculator Module
 * 
 * Calculates multi-line reputation for characters during PDF generation.
 * Combines faction-specific reputation values with chosen faction bonuses.
 * 
 * Requirements: multi-line-reputation-tracking 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 5.1, 5.2, 5.3, 5.5, 8.2, 8.3
 */

import { FACTION_NAMES } from './faction-names.js';
import { debug, warn } from '../utils/logger.js';
import type { SharedFields } from './party-chronicle-types.js';

/**
 * Calculates multi-line reputation for a character
 * 
 * Algorithm:
 * 1. Create empty reputation map for all factions
 * 2. Add faction-specific values from shared.reputationValues
 * 3. Read actor.system.pfs.currentFaction and add chosen faction bonus
 * 4. Filter out factions with 0 value
 * 5. Format as "{Faction_Full_Name}: {+/-}{value}"
 * 6. Sort alphabetically by faction name
 * 
 * @param shared - Shared fields containing reputation values
 * @param actor - Actor object to read chosen faction from
 * @returns Array of reputation lines (e.g., ["Envoy's Alliance: +4"])
 * 
 * Requirements: multi-line-reputation-tracking 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 5.1, 5.2, 5.3, 8.2, 8.3
 */
export function calculateReputation(
    shared: SharedFields,
    actor: any
): string[] {
    // Step 1: Create empty reputation map for all factions
    const reputationMap: Record<string, number> = {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
    };

    // Step 2: Add faction-specific values from shared.reputationValues
    const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;
    for (const code of factionCodes) {
        const value = shared.reputationValues?.[code] ?? 0;
        reputationMap[code] += value;
    }

    // Step 3: Read chosen faction and add bonus
    const chosenFaction = actor?.system?.pfs?.currentFaction;
    if (chosenFaction && FACTION_NAMES[chosenFaction]) {
        const chosenBonus = shared.chosenFactionReputation ?? 0;
        reputationMap[chosenFaction] += chosenBonus;
        debug(`Adding chosen faction bonus: ${chosenFaction} +${chosenBonus}`);
    } else if (chosenFaction) {
        warn(`Unknown faction code: ${chosenFaction}`);
    }

    // Step 4: Filter out factions with 0 value
    const nonZeroFactions = factionCodes.filter(code => reputationMap[code] !== 0);

    // Step 5: Format as "{Faction_Full_Name}: {+/-}{value}"
    const reputationLines = nonZeroFactions.map(code => {
        const fullName = FACTION_NAMES[code];
        const value = reputationMap[code];
        const sign = value >= 0 ? '+' : '';
        return `${fullName}: ${sign}${value}`;
    });

    // Step 6: Sort alphabetically by faction name
    reputationLines.sort((a, b) => a.localeCompare(b));

    debug(`Calculated reputation for ${actor?.name}:`, reputationLines);

    return reputationLines;
}
