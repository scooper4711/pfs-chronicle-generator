/**
 * Validation functions for Party Chronicle Filling feature
 * 
 * This module provides validation functions to check that required fields
 * are populated and have valid formats before chronicle generation.
 * 
 * Requirements: party-chronicle-filling 6.1, 6.2, 6.3
 */

import { SharedFields, UniqueFields, ValidationResult } from './party-chronicle-types.js';
import { FACTION_NAMES } from './faction-names.js';
import {
  validateDateFormat,
  validateNumberField,
  validateRequiredString,
  validatePlayerNumber,
  validateCharacterNumber,
  validateOptionalArray
} from './validation-helpers.js';

/**
 * Validates that all required shared fields are populated and have valid formats.
 * 
 * Shared fields are those that apply to all party members. This function checks:
 * - Required fields are not empty
 * - Data types are correct (numbers are numbers, dates are valid dates)
 * - Formats are valid (e.g., event codes, dates)
 * 
 * @param shared - The shared fields to validate
 * @returns ValidationResult with valid flag and array of error messages
 * 
 * @example
 * ```typescript
 * const shared: Partial<SharedFields> = {
 *   gmPfsNumber: '12345',
 *   scenarioName: 'The Blackwood Lost',
 *   eventCode: '',  // Missing!
 *   eventDate: '2024-01-15',
 *   xpEarned: 4,
 *   // ... other fields
 * };
 * 
 * const result = validateSharedFields(shared);
 * if (!result.valid) {
 *   console.log('Errors:', result.errors);
 *   // Errors: ['Event Code is required']
 * }
 * ```
 * 
 * Validates: Requirements party-chronicle-filling 6.1, 6.3, multi-line-reputation-tracking 6.1, 6.2, 6.3, earned-income-calculation 2.1, 9.1, 9.2, 9.3
 */
export function validateSharedFields(shared: Partial<SharedFields>): ValidationResult {
  const errors: string[] = [];
  
  // Validate required string fields
  errors.push(...validateRequiredString(shared.gmPfsNumber, 'GM PFS Number'));
  errors.push(...validateRequiredString(shared.scenarioName, 'Scenario Name'));
  errors.push(...validateRequiredString(shared.eventCode, 'Event Code'));
  errors.push(...validateRequiredString(shared.layoutId, 'Layout selection'));
  errors.push(...validateRequiredString(shared.seasonId, 'Season selection'));
  errors.push(...validateRequiredString(shared.blankChroniclePath, 'Chronicle Path'));
  
  // Validate Event Date
  errors.push(...validateDateFormat(shared.eventDate, 'Event Date'));
  
  // Validate XP Earned - must be 1, 2, or 4 (Bounty, Quest, or Scenario)
  if (shared.xpEarned !== undefined && shared.xpEarned !== null) {
    if (![1, 2, 4].includes(shared.xpEarned)) {
      errors.push('XP Earned must be 1 (Bounty), 2 (Quest), or 4 (Scenario)');
    }
  } else {
    errors.push('XP Earned is required');
  }
  
  // Validate optional array fields
  errors.push(...validateOptionalArray(shared.adventureSummaryCheckboxes, 'Adventure Summary Checkboxes'));
  errors.push(...validateOptionalArray(shared.strikeoutItems, 'Strikeout Items'));
  
  // Validate Treasure Bundles - required, must be integer from 0-10
  errors.push(...validateNumberField(shared.treasureBundles, 'Treasure Bundles', { 
    min: 0, 
    max: 10, 
    integer: true 
  }));
  
  // Note: Downtime Days is calculated from XP Earned and doesn't need validation
  // Requirements: earned-income-calculation 2.1, 2.4
  
  // Validate chosen faction reputation - must be integer from 1-9 (0 is not allowed)
  // Check range first (< 0 or > 9), then check for 0 specifically
  const chosenFactionErrors = validateNumberField(shared.chosenFactionReputation, 'Chosen Faction reputation', { 
    min: 0, 
    max: 9, 
    integer: true
  });
  
  // If the value is 0, replace the error message with a more specific one
  if (shared.chosenFactionReputation === 0) {
    errors.push('Chosen Faction reputation must be greater than 0');
  } else {
    errors.push(...chosenFactionErrors);
  }
  
  // Validate faction-specific reputation values
  if (shared.reputationValues) {
    const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;
    for (const code of factionCodes) {
      const value = shared.reputationValues[code];
      if (value !== undefined && value !== null) {
        errors.push(...validateNumberField(value, `${FACTION_NAMES[code]} reputation`, { 
          min: 0, 
          max: 9, 
          integer: true,
          required: false
        }));
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates that all required unique fields are populated and have valid formats
 * for a specific character.
 * 
 * Unique fields are character-specific. This function checks:
 * - Required fields are not empty
 * - Data types are correct (numbers are numbers, strings are strings)
 * - Formats are valid (e.g., society IDs, levels)
 * 
 * @param unique - The unique fields to validate for a character
 * @param characterName - The character name for error messages (optional)
 * @returns ValidationResult with valid flag and array of character-specific error messages
 * 
 * @example
 * ```typescript
 * const unique: Partial<UniqueFields> = {
 *   characterName: 'Valeros',
 *   playerNumber: '',     // Missing!
 *   characterNumber: '',  // Missing!
 *   level: 3,
 *   incomeEarned: 8,
 *   currencySpent: 10,
 *   notes: ''
 * };
 * 
 * const result = validateUniqueFields(unique, 'Valeros');
 * if (!result.valid) {
 *   console.log('Errors:', result.errors);
 *   // Errors: ['Valeros: Society ID is required']
 * }
 * ```
 * 
 * Validates: Requirements party-chronicle-filling 6.2, 6.3, treasure-bundle-calculation 11.1, 11.2, 11.3, 11.4, earned-income-calculation 9.5, 9.6, 9.7
 */
const VALID_SUCCESS_LEVELS = ['critical_failure', 'failure', 'success', 'critical_success'];
const VALID_PROFICIENCY_RANKS = ['trained', 'expert', 'master', 'legendary'];

/**
 * Validates task level and its dependent fields (success level, proficiency rank).
 */
function validateTaskLevelFields(unique: Partial<UniqueFields>, prefix: string): string[] {
  const errors: string[] = [];

  if (unique.taskLevel === undefined || unique.taskLevel === '-') {
    return errors;
  }

  const taskLevelNum = typeof unique.taskLevel === 'number' ? unique.taskLevel : Number.parseInt(unique.taskLevel as string);
  if (Number.isNaN(taskLevelNum) || taskLevelNum < 0 || taskLevelNum > 20) {
    errors.push(`${prefix}Task Level must be between 0 and 20 or "-"`);
  }

  if (!unique.successLevel) {
    errors.push(`${prefix}Success Level is required when Task Level is not "-"`);
  }
  if (!unique.proficiencyRank) {
    errors.push(`${prefix}Proficiency Rank is required when Task Level is not "-"`);
  }

  return errors;
}

export function validateUniqueFields(
  unique: Partial<UniqueFields>,
  characterName?: string
): ValidationResult {
  const errors: string[] = [];
  const prefix = characterName ? `${characterName}: ` : '';
  
  // Validate Character Name
  errors.push(...validateRequiredString(unique.characterName, 'Character Name', prefix));
  
  // Validate Player Number and Character Number
  errors.push(...validatePlayerNumber(unique.playerNumber, 'Player Number', prefix));
  errors.push(...validateCharacterNumber(unique.characterNumber, 'Character Number', prefix));
  
  // Validate Level
  errors.push(...validateNumberField(unique.level, 'Level', { 
    min: 1, 
    max: 20, 
    integer: true 
  }, prefix));
  
  // Note: Earned Income is calculated automatically and doesn't need validation
  // Requirements: earned-income-calculation 6.1, 6.7
  
  // Validate Currency Spent
  errors.push(...validateNumberField(unique.currencySpent, 'Currency Spent', { 
    min: 0 
  }, prefix));
  
  // Validate Task Level and dependent fields
  errors.push(...validateTaskLevelFields(unique, prefix));
  
  // Validate Success Level (if provided)
  if (unique.successLevel && !VALID_SUCCESS_LEVELS.includes(unique.successLevel)) {
    errors.push(`${prefix}Success Level must be critical_failure, failure, success, or critical_success`);
  }
  
  // Validate Proficiency Rank (if provided)
  if (unique.proficiencyRank && !VALID_PROFICIENCY_RANKS.includes(unique.proficiencyRank)) {
    errors.push(`${prefix}Proficiency Rank must be trained, expert, master, or legendary`);
  }
  
  // Optional fields - no validation needed for notes
  // Notes can be an empty string
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates all party chronicle data (shared fields + all character unique fields).
 * 
 * This is a convenience function that validates both shared fields and all
 * character-specific unique fields in one call.
 * 
 * @param shared - The shared fields to validate
 * @param characters - Map of character unique fields indexed by actor ID
 * @param characterNames - Optional map of character names for better error messages
 * @returns ValidationResult with combined errors from all validations
 * 
 * @example
 * ```typescript
 * const shared: Partial<SharedFields> = { ... };
 * const characters = {
 *   'actor-1': { characterName: 'Valeros', ... },
 *   'actor-2': { characterName: 'Seoni', ... }
 * };
 * const names = {
 *   'actor-1': 'Valeros',
 *   'actor-2': 'Seoni'
 * };
 * 
 * const result = validateAllFields(shared, characters, names);
 * if (!result.valid) {
 *   result.errors.forEach(error => console.log(error));
 * }
 * ```
 * 
 * Validates: Requirements party-chronicle-filling 6.1, 6.2, 6.3
 */
export function validateAllFields(
  shared: Partial<SharedFields>,
  characters: { [actorId: string]: Partial<UniqueFields> },
  characterNames?: { [actorId: string]: string }
): ValidationResult {
  const allErrors: string[] = [];
  
  // Validate shared fields
  const sharedResult = validateSharedFields(shared);
  allErrors.push(...sharedResult.errors);
  
  // Validate each character's unique fields
  for (const [actorId, unique] of Object.entries(characters)) {
    const charName = characterNames?.[actorId] || unique.characterName || actorId;
    const uniqueResult = validateUniqueFields(unique, charName);
    allErrors.push(...uniqueResult.errors);
  }
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Parameters for session report validation.
 *
 * Groups the data sources needed to validate that a session report
 * can be assembled: shared form fields and party actor data.
 */
export interface SessionReportValidationParams {
  /** Shared form fields containing event date, GM PFS number, and layout ID */
  shared: Partial<SharedFields>;
  /** Party actors with PFS data including currentFaction */
  partyActors: Array<{
    id: string;
    name: string;
    system?: {
      pfs?: {
        currentFaction?: string;
      };
    };
  }>;
}

/**
 * Validates fields required for session report assembly.
 *
 * Checks that the event date is populated, a scenario is selected
 * (layoutId not empty), the GM PFS number is populated, and each
 * party member has a faction value available from actor data.
 * Returns a ValidationResult with collected errors.
 *
 * @param params - The validation parameters containing shared fields and party actors
 * @returns ValidationResult with valid flag and array of error messages
 *
 * Requirements: paizo-session-reporting 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function validateSessionReportFields(params: SessionReportValidationParams): ValidationResult {
  const errors: string[] = [];
  const { shared, partyActors } = params;

  errors.push(...validateRequiredString(shared.eventDate, 'Event Date'));
  errors.push(...validateRequiredString(shared.layoutId, 'Scenario selection'));
  errors.push(...validateRequiredString(shared.gmPfsNumber, 'GM PFS Number'));

  for (const actor of partyActors) {
    const faction = actor.system?.pfs?.currentFaction;
    if (!faction || faction.trim() === '') {
      errors.push(`${actor.name}: Faction is required for session reporting`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

