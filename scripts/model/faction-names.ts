/**
 * Maps faction abbreviations to full faction names.
 * 
 * Used by reputation calculator and validator for formatting faction names
 * in party chronicle generation.
 * 
 * Requirements: remove-single-character-chronicle-generator 3.1
 */
export const FACTION_NAMES: Record<string, string> = {
    'EA': 'Envoy\'s Alliance',
    'GA': 'Grand Archive',
    'HH': 'Horizon Hunters',
    'VS': 'Vigilant Seal',
    'RO': 'Radiant Oath',
    'VW': 'Verdant Wheel'
};
