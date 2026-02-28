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
 * Validates: Requirements party-chronicle-filling 6.1, 6.3, multi-line-reputation-tracking 6.1, 6.2, 6.3
 */
export function validateSharedFields(shared: Partial<SharedFields>): ValidationResult {
  const errors: string[] = [];
  
  // Validate required string fields
  errors.push(...validateRequiredString(shared.gmPfsNumber, 'GM PFS Number'));
  errors.push(...validateRequiredString(shared.scenarioName, 'Scenario Name'));
  errors.push(...validateRequiredString(shared.eventCode, 'Event Code'));
  errors.push(...validateRequiredString(shared.layoutId, 'Layout selection'));
  errors.push(...validateRequiredString(shared.seasonId, 'Season selection'));
  errors.push(...validateRequiredString(shared.blankChroniclePath, 'Blank Chronicle Path'));
  
  // Validate Event Date
  errors.push(...validateDateFormat(shared.eventDate, 'Event Date'));
  
  // Validate XP Earned
  errors.push(...validateNumberField(shared.xpEarned, 'XP Earned', { min: 0 }));
  
  // Validate optional array fields
  errors.push(...validateOptionalArray(shared.adventureSummaryCheckboxes, 'Adventure Summary Checkboxes'));
  errors.push(...validateOptionalArray(shared.strikeoutItems, 'Strikeout Items'));
  
  // Validate Treasure Bundles - required, must be integer from 0-10
  errors.push(...validateNumberField(shared.treasureBundles, 'Treasure Bundles', { 
    min: 0, 
    max: 10, 
    integer: true 
  }));
  
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
 *   societyId: '',  // Missing!
 *   level: 3,
 *   incomeEarned: 8,
 *   goldSpent: 10,
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
 * Validates: Requirements party-chronicle-filling 6.2, 6.3, treasure-bundle-calculation 10.1, 10.2, 10.3, 10.4
 */
export function validateUniqueFields(
  unique: Partial<UniqueFields>,
  characterName?: string
): ValidationResult {
  const errors: string[] = [];
  const prefix = characterName ? `${characterName}: ` : '';
  
  // Validate Character Name
  errors.push(...validateRequiredString(unique.characterName, 'Character Name', prefix));
  
  // Validate Society ID with format check
  const societyIdErrors = validateRequiredString(unique.societyId, 'Society ID', prefix);
  if (societyIdErrors.length === 0) {
    // Only check format if the field is not empty
    const societyIdRegex = /^\d+-\d+$/;
    if (unique.societyId && !societyIdRegex.test(unique.societyId)) {
      errors.push(`${prefix}Society ID must be in format "playerNumber-characterNumber" (e.g., "12345-01")`);
    }
  } else {
    errors.push(...societyIdErrors);
  }
  
  // Validate Level
  errors.push(...validateNumberField(unique.level, 'Level', { 
    min: 1, 
    max: 20, 
    integer: true 
  }, prefix));
  
  // Validate Income Earned
  errors.push(...validateNumberField(unique.incomeEarned, 'Income Earned', { 
    min: 0 
  }, prefix));
  
  // Validate Gold Spent
  errors.push(...validateNumberField(unique.goldSpent, 'Gold Spent', { 
    min: 0 
  }, prefix));
  
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
