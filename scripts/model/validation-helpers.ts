/**
 * Validation helper functions for Party Chronicle Filling feature
 * 
 * This module provides reusable validation helper functions that can be used
 * to validate individual fields. These helpers reduce cyclomatic complexity
 * in the main validation functions by extracting common validation patterns.
 * 
 * Requirements: 2.6, 5.1, 5.3, 5.4, 5.5
 */

/**
 * Validates that a date string is in YYYY-MM-DD format and represents a valid calendar date.
 * 
 * @param date - The date string to validate
 * @param fieldName - The name of the field for error messages
 * @returns Array of error messages (empty if valid)
 * 
 * @example
 * ```typescript
 * const errors = validateDateFormat('2024-01-15', 'Event Date');
 * // errors = []
 * 
 * const errors2 = validateDateFormat('invalid', 'Event Date');
 * // errors2 = ['Event Date must be in YYYY-MM-DD format']
 * 
 * const errors3 = validateDateFormat('2024-02-30', 'Event Date');
 * // errors3 = ['Event Date is not a valid date']
 * ```
 */
export function validateDateFormat(date: string | undefined | null, fieldName: string): string[] {
  const errors: string[] = [];
  
  if (!date || date.trim() === '') {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  // Check if date is valid format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    errors.push(`${fieldName} must be in YYYY-MM-DD format`);
    return errors;
  }
  
  // Check if date is a valid calendar date
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    errors.push(`${fieldName} is not a valid date`);
  }
  
  return errors;
}

/**
 * Validates that a society ID is in the correct format (playerNumber-characterNumber).
 * 
 * @param societyId - The society ID to validate
 * @param fieldName - The name of the field for error messages
 * @param prefix - Optional prefix for error messages (e.g., character name)
 * @returns Array of error messages (empty if valid)
 * 
 * @example
 * ```typescript
 * const errors = validateSocietyIdFormat('12345-01', 'Society ID');
 * // errors = []
 * 
 * const errors2 = validateSocietyIdFormat('invalid', 'Society ID', 'Valeros: ');
 * // errors2 = ['Valeros: Society ID must be in format "playerNumber-characterNumber" (e.g., "12345-01")']
 * ```
 */
export function validateSocietyIdFormat(
  societyId: string | undefined | null,
  fieldName: string,
  prefix: string = ''
): string[] {
  const errors: string[] = [];
  
  if (!societyId || societyId.trim() === '') {
    errors.push(`${prefix}${fieldName} is required`);
    return errors;
  }
  
  // Check if society ID is in valid format (playerNumber-characterNumber)
  const societyIdRegex = /^\d+-\d+$/;
  if (!societyIdRegex.test(societyId)) {
    errors.push(`${prefix}${fieldName} must be in format "playerNumber-characterNumber" (e.g., "12345-01")`);
  }
  
  return errors;
}

/**
 * Validates that a numeric field has a valid value within specified constraints.
 * 
 * @param value - The value to validate
 * @param fieldName - The name of the field for error messages
 * @param options - Validation options
 * @param options.min - Minimum allowed value (inclusive)
 * @param options.max - Maximum allowed value (inclusive)
 * @param options.integer - Whether the value must be a whole number
 * @param options.required - Whether the field is required (default: true)
 * @param options.minExclusive - Whether the minimum value is exclusive (default: false)
 * @param prefix - Optional prefix for error messages (e.g., character name)
 * @returns Array of error messages (empty if valid)
 * 
 * @example
 * ```typescript
 * const errors = validateNumberField(5, 'XP Earned', { min: 0 });
 * // errors = []
 * 
 * const errors2 = validateNumberField(-1, 'XP Earned', { min: 0 });
 * // errors2 = ['XP Earned cannot be negative']
 * 
 * const errors3 = validateNumberField(3.5, 'Level', { min: 1, max: 20, integer: true });
 * // errors3 = ['Level must be a whole number']
 * 
 * const errors4 = validateNumberField(0, 'Chosen Faction', { min: 0, minExclusive: true });
 * // errors4 = ['Chosen Faction must be greater than 0']
 * ```
 */
export function validateNumberField(
  value: any,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    required?: boolean;
    minExclusive?: boolean;
  } = {},
  prefix: string = ''
): string[] {
  const errors: string[] = [];
  const required = options.required !== false; // Default to true
  
  // Check if value is provided
  if (value === undefined || value === null) {
    if (required) {
      errors.push(`${prefix}${fieldName} is required`);
    }
    return errors;
  }
  
  // Check if value is a number
  if (typeof value !== 'number') {
    errors.push(`${prefix}${fieldName} must be a number`);
    return errors;
  }
  
  // Check if value must be an integer
  if (options.integer && !Number.isInteger(value)) {
    errors.push(`${prefix}${fieldName} must be a whole number`);
    return errors;
  }
  
  // Check minimum and maximum values together for range validation
  if (options.min !== undefined && options.max !== undefined) {
    // Special case: minExclusive means value must be > min (not >= min)
    if (options.minExclusive) {
      if (value <= options.min) {
        errors.push(`${prefix}${fieldName} must be greater than ${options.min}`);
      } else if (value > options.max) {
        errors.push(`${prefix}${fieldName} must be between ${options.min} and ${options.max}`);
      }
    } else {
      // Normal range check: min <= value <= max
      if (value < options.min || value > options.max) {
        errors.push(`${prefix}${fieldName} must be between ${options.min} and ${options.max}`);
      }
    }
  } else {
    // Check minimum value only
    if (options.min !== undefined) {
      if (options.minExclusive && value <= options.min) {
        errors.push(`${prefix}${fieldName} must be greater than ${options.min}`);
      } else if (!options.minExclusive && value < options.min) {
        if (options.min === 0) {
          errors.push(`${prefix}${fieldName} cannot be negative`);
        } else {
          errors.push(`${prefix}${fieldName} must be at least ${options.min}`);
        }
      }
    }
    
    // Check maximum value only
    if (options.max !== undefined && value > options.max) {
      errors.push(`${prefix}${fieldName} must be at most ${options.max}`);
    }
  }
  
  return errors;
}

/**
 * Validates that a required string field is not empty.
 * 
 * @param value - The value to validate
 * @param fieldName - The name of the field for error messages
 * @param prefix - Optional prefix for error messages (e.g., character name)
 * @returns Array of error messages (empty if valid)
 * 
 * @example
 * ```typescript
 * const errors = validateRequiredString('John Doe', 'Character Name');
 * // errors = []
 * 
 * const errors2 = validateRequiredString('', 'Character Name', 'Valeros: ');
 * // errors2 = ['Valeros: Character Name is required']
 * 
 * const errors3 = validateRequiredString(null, 'GM PFS Number');
 * // errors3 = ['GM PFS Number is required']
 * ```
 */
export function validateRequiredString(
  value: string | undefined | null,
  fieldName: string,
  prefix: string = ''
): string[] {
  const errors: string[] = [];
  
  if (!value || value.trim() === '') {
    errors.push(`${prefix}${fieldName} is required`);
  }
  
  return errors;
}

/**
 * Validates that an optional array field is actually an array if provided.
 * 
 * @param value - The value to validate
 * @param fieldName - The name of the field for error messages
 * @returns Array of error messages (empty if valid)
 * 
 * @example
 * ```typescript
 * const errors = validateOptionalArray(['item1', 'item2'], 'Checkboxes');
 * // errors = []
 * 
 * const errors2 = validateOptionalArray(undefined, 'Checkboxes');
 * // errors2 = []
 * 
 * const errors3 = validateOptionalArray('not-an-array', 'Checkboxes');
 * // errors3 = ['Checkboxes must be an array']
 * ```
 */
export function validateOptionalArray(value: any, fieldName: string): string[] {
  const errors: string[] = [];
  
  if (value !== undefined && !Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
  }
  
  return errors;
}
