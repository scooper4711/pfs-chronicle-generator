/**
 * Validation functions for Party Chronicle Filling feature
 * 
 * This module provides validation functions to check that required fields
 * are populated and have valid formats before chronicle generation.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */

import { SharedFields, UniqueFields, ValidationResult } from './party-chronicle-types.js';

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
 * Validates: Requirements 6.1, 6.3
 */
export function validateSharedFields(shared: Partial<SharedFields>): ValidationResult {
  const errors: string[] = [];
  
  // Validate GM PFS Number
  if (!shared.gmPfsNumber || shared.gmPfsNumber.trim() === '') {
    errors.push('GM PFS Number is required');
  }
  
  // Validate Scenario Name
  if (!shared.scenarioName || shared.scenarioName.trim() === '') {
    errors.push('Scenario Name is required');
  }
  
  // Validate Event Code
  if (!shared.eventCode || shared.eventCode.trim() === '') {
    errors.push('Event Code is required');
  }
  
  // Validate Event Date
  if (!shared.eventDate || shared.eventDate.trim() === '') {
    errors.push('Event Date is required');
  } else {
    // Check if date is valid format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(shared.eventDate)) {
      errors.push('Event Date must be in YYYY-MM-DD format');
    } else {
      // Check if date is a valid calendar date
      const date = new Date(shared.eventDate);
      if (isNaN(date.getTime())) {
        errors.push('Event Date is not a valid date');
      }
    }
  }
  
  // Validate XP Earned
  if (shared.xpEarned === undefined || shared.xpEarned === null) {
    errors.push('XP Earned is required');
  } else if (typeof shared.xpEarned !== 'number') {
    errors.push('XP Earned must be a number');
  } else if (shared.xpEarned < 0) {
    errors.push('XP Earned cannot be negative');
  }
  
  // Validate Layout ID
  if (!shared.layoutId || shared.layoutId.trim() === '') {
    errors.push('Layout selection is required');
  }
  
  // Validate Season ID
  if (!shared.seasonId || shared.seasonId.trim() === '') {
    errors.push('Season selection is required');
  }
  
  // Validate Blank Chronicle Path
  if (!shared.blankChroniclePath || shared.blankChroniclePath.trim() === '') {
    errors.push('Blank Chronicle Path is required');
  }
  
  // Optional fields - validate format if provided
  
  // Adventure Summary Checkboxes - optional, but must be array if provided
  if (shared.adventureSummaryCheckboxes !== undefined && 
      !Array.isArray(shared.adventureSummaryCheckboxes)) {
    errors.push('Adventure Summary Checkboxes must be an array');
  }
  
  // Strikeout Items - optional, but must be array if provided
  if (shared.strikeoutItems !== undefined && 
      !Array.isArray(shared.strikeoutItems)) {
    errors.push('Strikeout Items must be an array');
  }
  
  // Treasure Bundles - required, must be integer from 0-10
  if (shared.treasureBundles === undefined || shared.treasureBundles === null) {
    errors.push('Treasure Bundles is required');
  } else if (typeof shared.treasureBundles !== 'number') {
    errors.push('Treasure Bundles must be a number');
  } else if (!Number.isInteger(shared.treasureBundles)) {
    errors.push('Treasure Bundles must be a whole number');
  } else if (shared.treasureBundles < 0 || shared.treasureBundles > 10) {
    errors.push('Treasure Bundles must be between 0 and 10');
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
 *   goldEarned: 24,
 *   goldSpent: 10,
 *   notes: '',
 *   reputation: ''
 * };
 * 
 * const result = validateUniqueFields(unique, 'Valeros');
 * if (!result.valid) {
 *   console.log('Errors:', result.errors);
 *   // Errors: ['Valeros: Society ID is required']
 * }
 * ```
 * 
 * Validates: Requirements 6.2, 6.3
 */
export function validateUniqueFields(
  unique: Partial<UniqueFields>,
  characterName?: string
): ValidationResult {
  const errors: string[] = [];
  const prefix = characterName ? `${characterName}: ` : '';
  
  // Validate Character Name
  if (!unique.characterName || unique.characterName.trim() === '') {
    errors.push(`${prefix}Character Name is required`);
  }
  
  // Validate Society ID
  if (!unique.societyId || unique.societyId.trim() === '') {
    errors.push(`${prefix}Society ID is required`);
  } else {
    // Check if society ID is in valid format (playerNumber-characterNumber)
    const societyIdRegex = /^\d+-\d+$/;
    if (!societyIdRegex.test(unique.societyId)) {
      errors.push(`${prefix}Society ID must be in format "playerNumber-characterNumber" (e.g., "12345-01")`);
    }
  }
  
  // Validate Level
  if (unique.level === undefined || unique.level === null) {
    errors.push(`${prefix}Level is required`);
  } else if (typeof unique.level !== 'number') {
    errors.push(`${prefix}Level must be a number`);
  } else if (unique.level < 1 || unique.level > 20) {
    errors.push(`${prefix}Level must be between 1 and 20`);
  } else if (!Number.isInteger(unique.level)) {
    errors.push(`${prefix}Level must be a whole number`);
  }
  
  // Validate Income Earned
  if (unique.incomeEarned === undefined || unique.incomeEarned === null) {
    errors.push(`${prefix}Income Earned is required`);
  } else if (typeof unique.incomeEarned !== 'number') {
    errors.push(`${prefix}Income Earned must be a number`);
  } else if (unique.incomeEarned < 0) {
    errors.push(`${prefix}Income Earned cannot be negative`);
  }
  
  // Validate Gold Earned
  if (unique.goldEarned === undefined || unique.goldEarned === null) {
    errors.push(`${prefix}Gold Earned is required`);
  } else if (typeof unique.goldEarned !== 'number') {
    errors.push(`${prefix}Gold Earned must be a number`);
  } else if (unique.goldEarned < 0) {
    errors.push(`${prefix}Gold Earned cannot be negative`);
  }
  
  // Validate Gold Spent
  if (unique.goldSpent === undefined || unique.goldSpent === null) {
    errors.push(`${prefix}Gold Spent is required`);
  } else if (typeof unique.goldSpent !== 'number') {
    errors.push(`${prefix}Gold Spent must be a number`);
  } else if (unique.goldSpent < 0) {
    errors.push(`${prefix}Gold Spent cannot be negative`);
  }
  
  // Optional fields - no validation needed for notes and reputation
  // They can be empty strings
  
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
 * Validates: Requirements 6.1, 6.2, 6.3
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
