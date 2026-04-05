/**
 * Validation helper functions for Party Chronicle Filling feature
 * 
 * This module provides reusable validation helper functions that can be used
 * to validate individual fields. These helpers reduce cyclomatic complexity
 * in the main validation functions by extracting common validation patterns.
 * 
 * Requirements: party-chronicle-filling 2.6, 5.1, 5.3, 5.4, 5.5
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
  if (Number.isNaN(dateObj.getTime())) {
    errors.push(`${fieldName} is not a valid date`);
  }
  
  return errors;
}

/**
 * Validates that a player number is a non-empty numeric string.
 * 
 * @param value - The player number to validate
 * @param fieldName - The name of the field for error messages
 * @param prefix - Optional prefix for error messages (e.g., character name)
 * @returns Array of error messages (empty if valid)
 */
export function validatePlayerNumber(
  value: string | undefined | null,
  fieldName: string,
  prefix: string = ''
): string[] {
  if (!value || value.trim() === '') {
    return [`${prefix}${fieldName} is required`];
  }
  if (!/^\d+$/.test(value)) {
    return [`${prefix}${fieldName} must be a numeric string (e.g., "12345")`];
  }
  return [];
}

/**
 * Validates that a character number is a non-empty numeric string.
 * 
 * @param value - The character number to validate
 * @param fieldName - The name of the field for error messages
 * @param prefix - Optional prefix for error messages (e.g., character name)
 * @returns Array of error messages (empty if valid)
 */
export function validateCharacterNumber(
  value: string | undefined | null,
  fieldName: string,
  prefix: string = ''
): string[] {
  if (!value || value.trim() === '') {
    return [`${prefix}${fieldName} is required`];
  }
  if (!/^\d+$/.test(value)) {
    return [`${prefix}${fieldName} must be a numeric string (e.g., "2001")`];
  }
  return [];
}

/**
 * Validates a number against range constraints (min/max with optional exclusive min).
 */
/**
 * Validates a number against a minimum constraint.
 */
/**
 * Validates a number against a minimum-only constraint.
 */
function validateMinOnly(
  value: number,
  fieldName: string,
  min: number | undefined,
  minExclusive: boolean,
  prefix: string
): string[] {
  if (min === undefined) return [];
  if (minExclusive && value <= min) {
    return [`${prefix}${fieldName} must be greater than ${min}`];
  }
  if (!minExclusive && value < min) {
    return [min === 0
      ? `${prefix}${fieldName} cannot be negative`
      : `${prefix}${fieldName} must be at least ${min}`];
  }
  return [];
}

/**
 * Validates a number against a maximum-only constraint.
 */
function validateMaxOnly(
  value: number,
  fieldName: string,
  max: number | undefined,
  prefix: string
): string[] {
  if (max === undefined || value <= max) return [];
  return [`${prefix}${fieldName} must be at most ${max}`];
}

/**
 * Validates a number against range constraints (min/max with optional exclusive min).
 */
/**
 * Validates a number against range constraints (min/max with optional exclusive min).
 */
function validateRange(
  value: number,
  fieldName: string,
  options: { min?: number; max?: number; minExclusive?: boolean },
  prefix: string
): string[] {
  const { min, max, minExclusive } = options;

  // When both bounds are set, use a unified "between" message for out-of-range
  if (min !== undefined && max !== undefined) {
    if (minExclusive && value <= min) {
      return [`${prefix}${fieldName} must be greater than ${min}`];
    }
    if (!minExclusive && (value < min || value > max)) {
      return [`${prefix}${fieldName} must be between ${min} and ${max}`];
    }
    if (minExclusive && value > max) {
      return [`${prefix}${fieldName} must be between ${min} and ${max}`];
    }
    return [];
  }

  return [
    ...validateMinOnly(value, fieldName, min, minExclusive ?? false, prefix),
    ...validateMaxOnly(value, fieldName, max, prefix),
  ];
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
  const required = options.required !== false;
  
  if (value === undefined || value === null) {
    return required ? [`${prefix}${fieldName} is required`] : [];
  }
  
  if (typeof value !== 'number') {
    return [`${prefix}${fieldName} must be a number`];
  }
  
  if (options.integer && !Number.isInteger(value)) {
    return [`${prefix}${fieldName} must be a whole number`];
  }
  
  return validateRange(value, fieldName, options, prefix);
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
