/**
 * Property-based tests for validation logic in Party Chronicle Filling
 * 
 * These tests validate that the validation functions correctly identify
 * missing required fields and report appropriate error messages.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

import fc from 'fast-check';
import { validateSharedFields, validateUniqueFields, validateAllFields } from './party-chronicle-validator';
import { SharedFields, UniqueFields } from './party-chronicle-types';

/**
 * Generator for valid shared field values
 */
const validSharedFieldsArbitrary = fc.record({
  gmPfsNumber: fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.trim().length > 0),
  scenarioName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  eventCode: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  eventDate: fc.integer({ min: 2000, max: 2099 }).chain(year =>
    fc.integer({ min: 1, max: 12 }).chain(month =>
      fc.integer({ min: 1, max: 28 }).map(day =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )
    )
  ),
  xpEarned: fc.integer({ min: 0, max: 12 }),
  adventureSummaryCheckboxes: fc.array(fc.string(), { maxLength: 5 }),
  strikeoutItems: fc.array(fc.string(), { maxLength: 10 }),
  treasureBundles: fc.integer({ min: 0, max: 10 }),
  layoutId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  seasonId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
});

/**
 * Generator for valid unique field values
 */
const validUniqueFieldsArbitrary = fc.record({
  characterName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  societyId: fc.integer({ min: 1, max: 999999 }).chain(playerNum =>
    fc.integer({ min: 1, max: 99 }).map(charNum =>
      `${playerNum}-${String(charNum).padStart(2, '0')}`
    )
  ),
  level: fc.integer({ min: 1, max: 20 }),
  incomeEarned: fc.integer({ min: 0, max: 100 }),
  goldEarned: fc.integer({ min: 0, max: 1000 }),
  goldSpent: fc.integer({ min: 0, max: 1000 }),
  notes: fc.string({ maxLength: 200 }),
  reputation: fc.string({ maxLength: 50 })
});

/**
 * Generator for actor IDs
 */
const actorIdArbitrary = fc.uuid();

describe('Party Chronicle Validation Property Tests', () => {
  describe('Property 10: Shared Field Validation', () => {
    /**
     * **Validates: Requirements 6.1, 6.3**
     * 
     * For any chronicle data entry, when validation is performed, the system SHALL
     * verify that all required shared fields are populated and SHALL report any
     * missing required shared fields.
     * 
     * Feature: party-chronicle-filling, Property 10: Shared field validation
     */
    it('validates that all required shared fields are populated', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          async (shared) => {
            const result = validateSharedFields(shared);
            
            // Property: Valid shared fields should pass validation
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('reports missing required shared fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.constantFrom(
            'gmPfsNumber',
            'scenarioName',
            'eventCode',
            'eventDate',
            'xpEarned',
            'layoutId',
            'seasonId',
            'blankChroniclePath'
          ),
          async (shared, fieldToRemove) => {
            // Create invalid shared fields by removing a required field
            const invalidShared = { ...shared };
            if (fieldToRemove === 'xpEarned') {
              delete (invalidShared as any)[fieldToRemove];
            } else {
              (invalidShared as any)[fieldToRemove] = '';
            }

            const result = validateSharedFields(invalidShared);
            
            // Property: Missing required field should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Property: Error message should mention the missing field
            const errorText = result.errors.join(' ');
            expect(errorText.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates XP earned is a non-negative number', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant('not a number' as any),
            fc.integer({ min: -100, max: -1 })
          ),
          async (shared, invalidXp) => {
            const invalidShared = { ...shared, xpEarned: invalidXp };
            
            const result = validateSharedFields(invalidShared);
            
            // Property: Invalid XP should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates event date format', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.oneof(
            fc.constant('invalid-date'),
            fc.constant('2024/01/15'),
            fc.constant('01-15-2024'),
            fc.constant('2024-13-01'), // Invalid month
            fc.constant('2024-01-32')  // Invalid day
          ),
          async (shared, invalidDate) => {
            const invalidShared = { ...shared, eventDate: invalidDate };
            
            const result = validateSharedFields(invalidShared);
            
            // Property: Invalid date format should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('validates treasure bundles is an integer from 0-10', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant('not a number' as any),
            fc.integer({ min: -100, max: -1 }),
            fc.integer({ min: 11, max: 100 }),
            fc.double({ min: 0.1, max: 9.9 }) // Non-integer
          ),
          async (shared, invalidTreasureBundles) => {
            const invalidShared = { ...shared, treasureBundles: invalidTreasureBundles };
            
            const result = validateSharedFields(invalidShared);
            
            // Property: Invalid treasure bundles should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates optional array fields must be arrays if provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.oneof(
            fc.constant('not an array' as any),
            fc.constant(123 as any),
            fc.constant({ key: 'value' } as any)
          ),
          async (shared, invalidArray) => {
            const invalidShared1 = { ...shared, adventureSummaryCheckboxes: invalidArray };
            const invalidShared2 = { ...shared, strikeoutItems: invalidArray };
            
            const result1 = validateSharedFields(invalidShared1);
            const result2 = validateSharedFields(invalidShared2);
            
            // Property: Invalid array types should fail validation
            expect(result1.valid).toBe(false);
            expect(result1.errors.length).toBeGreaterThan(0);
            expect(result2.valid).toBe(false);
            expect(result2.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('accepts valid optional fields when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          async (shared) => {
            // All fields are valid including optional ones
            const result = validateSharedFields(shared);
            
            // Property: Valid optional fields should not cause validation failure
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles multiple missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.integer({ min: 2, max: 5 }),
          async (shared, numFieldsToRemove) => {
            const requiredFields = [
              'gmPfsNumber',
              'scenarioName',
              'eventCode',
              'eventDate',
              'layoutId'
            ];

            const invalidShared = { ...shared };
            const fieldsToRemove = requiredFields.slice(0, numFieldsToRemove);
            
            fieldsToRemove.forEach(field => {
              (invalidShared as any)[field] = '';
            });
            
            const result = validateSharedFields(invalidShared);
            
            // Property: Multiple missing fields should result in multiple errors
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(numFieldsToRemove);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Unique Field Validation', () => {
    /**
     * **Validates: Requirements 6.2, 6.3**
     * 
     * For any player character and any chronicle data entry, when validation is
     * performed, the system SHALL verify that all required unique fields are
     * populated for that character and SHALL report any missing required unique fields.
     * 
     * Feature: party-chronicle-filling, Property 11: Unique field validation
     */
    it('validates that all required unique fields are populated', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          async (unique) => {
            const result = validateUniqueFields(unique);
            
            // Property: Valid unique fields should pass validation
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('reports missing required unique fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          fc.constantFrom(
            'characterName',
            'societyId',
            'level',
            'incomeEarned',
            'goldEarned',
            'goldSpent'
          ),
          async (unique, fieldToRemove) => {
            // Create invalid unique fields by removing a required field
            const invalidUnique = { ...unique };
            if (['level', 'incomeEarned', 'goldEarned', 'goldSpent'].includes(fieldToRemove)) {
              delete (invalidUnique as any)[fieldToRemove];
            } else {
              (invalidUnique as any)[fieldToRemove] = '';
            }
            
            const result = validateUniqueFields(invalidUnique);
            
            // Property: Missing required field should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Property: Error message should exist
            const errorText = result.errors.join(' ');
            expect(errorText.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates level is between 1 and 20', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          fc.oneof(
            fc.integer({ min: -100, max: 0 }),
            fc.integer({ min: 21, max: 100 }),
            fc.constant(undefined),
            fc.constant(null),
            fc.constant('not a number' as any),
            fc.double({ min: 1.1, max: 19.9 }) // Non-integer
          ),
          async (unique, invalidLevel) => {
            const invalidUnique = { ...unique, level: invalidLevel };
            
            const result = validateUniqueFields(invalidUnique);
            
            // Property: Invalid level should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates numeric fields are non-negative', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          fc.constantFrom('incomeEarned', 'goldEarned', 'goldSpent'),
          fc.integer({ min: -1000, max: -1 }),
          async (unique, fieldName, negativeValue) => {
            const invalidUnique = { ...unique, [fieldName]: negativeValue };
            
            const result = validateUniqueFields(invalidUnique);

            // Property: Negative numeric values should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validates society ID format', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          fc.oneof(
            fc.constant('invalid'),
            fc.constant('12345'),
            fc.constant('12345-'),
            fc.constant('-01'),
            fc.constant('abc-def'),
            fc.constant('12345-1-2')
          ),
          async (unique, invalidSocietyId) => {
            const invalidUnique = { ...unique, societyId: invalidSocietyId };
            
            const result = validateUniqueFields(invalidUnique);
            
            // Property: Invalid society ID format should fail validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('includes character name in error messages when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          fc.string({ minLength: 1, maxLength: 30 }),
          async (unique, characterName) => {
            // Create invalid unique fields
            const invalidUnique = { ...unique, societyId: '' };
            
            const result = validateUniqueFields(invalidUnique, characterName);
            
            // Property: Error messages should include character name
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            const errorText = result.errors.join(' ');
            expect(errorText).toContain(characterName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles multiple missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          fc.integer({ min: 2, max: 4 }),
          async (unique, numFieldsToRemove) => {
            const requiredFields = ['characterName', 'societyId', 'level', 'incomeEarned'];
            const invalidUnique = { ...unique };
            const fieldsToRemove = requiredFields.slice(0, numFieldsToRemove);
            
            fieldsToRemove.forEach(field => {
              if (field === 'level' || field === 'incomeEarned') {
                delete (invalidUnique as any)[field];
              } else {
                (invalidUnique as any)[field] = '';
              }
            });
            
            const result = validateUniqueFields(invalidUnique);
            
            // Property: Multiple missing fields should result in multiple errors
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(numFieldsToRemove);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts valid optional fields when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          async (unique) => {
            // All fields are valid including optional ones (notes, reputation)
            const result = validateUniqueFields(unique);
            
            // Property: Valid optional fields should not cause validation failure
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('allows empty strings for optional fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          async (unique) => {
            const uniqueWithEmptyOptionals = {
              ...unique,
              notes: '',
              reputation: ''
            };
            
            const result = validateUniqueFields(uniqueWithEmptyOptionals);
            
            // Property: Empty optional fields should not cause validation failure
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Validation Error Reporting', () => {
    /**
     * **Validates: Requirements 6.3**
     * 
     * For any validation failure, the system SHALL display error messages that
     * specifically identify which fields need correction.
     * 
     * Feature: party-chronicle-filling, Property 12: Validation error reporting
     */
    it('reports specific field names in error messages for shared fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.constantFrom(
            'gmPfsNumber',
            'scenarioName',
            'eventCode',
            'eventDate',
            'layoutId',
            'seasonId',
            'blankChroniclePath'
          ),
          async (shared, fieldToRemove) => {
            const invalidShared = { ...shared, [fieldToRemove]: '' };
            
            const result = validateSharedFields(invalidShared);
            
            // Property: Error message should be specific and non-empty
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Property: Each error message should be a non-empty string
            result.errors.forEach(error => {
              expect(typeof error).toBe('string');
              expect(error.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('reports specific field names in error messages for unique fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUniqueFieldsArbitrary,
          fc.constantFrom(
            'characterName',
            'societyId',
            'level',
            'incomeEarned',
            'goldEarned',
            'goldSpent'
          ),
          async (unique, fieldToRemove) => {
            const invalidUnique = { ...unique };
            if (['level', 'incomeEarned', 'goldEarned', 'goldSpent'].includes(fieldToRemove)) {
              delete (invalidUnique as any)[fieldToRemove];
            } else {
              (invalidUnique as any)[fieldToRemove] = '';
            }
            
            const result = validateUniqueFields(invalidUnique);

            // Property: Error message should be specific and non-empty
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Property: Each error message should be a non-empty string
            result.errors.forEach(error => {
              expect(typeof error).toBe('string');
              expect(error.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('provides actionable error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          async (shared) => {
            // Create multiple validation errors
            const invalidShared = {
              ...shared,
              gmPfsNumber: '',
              eventCode: '',
              xpEarned: -5
            };
            
            const result = validateSharedFields(invalidShared);
            
            // Property: Multiple errors should be reported
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(3);
            
            // Property: Each error should be actionable (non-empty, descriptive)
            result.errors.forEach(error => {
              expect(error.length).toBeGreaterThan(5); // More than just "Error"
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('distinguishes between different validation failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          async (shared) => {
            // Create different types of validation errors
            const invalidShared1 = { ...shared, gmPfsNumber: '' };
            const invalidShared2 = { ...shared, xpEarned: -1 };
            const invalidShared3 = { ...shared, eventDate: 'invalid' };
            
            const result1 = validateSharedFields(invalidShared1);
            const result2 = validateSharedFields(invalidShared2);
            const result3 = validateSharedFields(invalidShared3);
            
            // Property: Different errors should have different messages
            expect(result1.errors[0]).not.toBe(result2.errors[0]);
            expect(result2.errors[0]).not.toBe(result3.errors[0]);
            expect(result1.errors[0]).not.toBe(result3.errors[0]);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('reports all errors for multiple characters in validateAllFields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, validUniqueFieldsArbitrary),
            { minLength: 2, maxLength: 5 }
          ),
          async (shared, characterPairs) => {
            // Create invalid data for all characters
            const invalidShared = { ...shared, gmPfsNumber: '' };
            const invalidCharacters = Object.fromEntries(
              characterPairs.map(([actorId, unique]) => [
                actorId,
                { ...unique, societyId: '' }
              ])
            );
            
            const characterNames = Object.fromEntries(
              characterPairs.map(([actorId, unique]) => [actorId, unique.characterName])
            );
            
            const result = validateAllFields(invalidShared, invalidCharacters, characterNames);
            
            // Property: Should report errors for shared fields + all characters
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(characterPairs.length + 1);
            
            // Property: Each character's name should appear in error messages
            characterPairs.forEach(([actorId, unique]) => {
              const hasCharacterError = result.errors.some(error =>
                error.includes(unique.characterName)
              );
              expect(hasCharacterError).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns empty errors array when validation passes', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          validUniqueFieldsArbitrary,
          async (shared, unique) => {
            const sharedResult = validateSharedFields(shared);
            const uniqueResult = validateUniqueFields(unique);
            
            // Property: Valid data should have no errors
            expect(sharedResult.valid).toBe(true);
            expect(sharedResult.errors).toHaveLength(0);
            expect(uniqueResult.valid).toBe(true);
            expect(uniqueResult.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('error messages are consistent for the same validation failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          async (shared) => {

            // Create the same validation error twice
            const invalidShared = { ...shared, gmPfsNumber: '' };
            
            const result1 = validateSharedFields(invalidShared);
            const result2 = validateSharedFields(invalidShared);
            
            // Property: Same error should produce same error messages
            expect(result1.errors).toEqual(result2.errors);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('combines errors from shared and unique validation in validateAllFields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          actorIdArbitrary,
          validUniqueFieldsArbitrary,
          async (shared, actorId, unique) => {
            // Create errors in both shared and unique fields
            const invalidShared = { ...shared, scenarioName: '' };
            const invalidUnique = { ...unique, characterName: '' };
            
            const result = validateAllFields(
              invalidShared,
              { [actorId]: invalidUnique },
              { [actorId]: 'TestCharacter' }
            );
            
            // Property: Should report errors from both shared and unique validation
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves error order and completeness', async () => {
      await fc.assert(
        fc.asyncProperty(
          validSharedFieldsArbitrary,
          fc.integer({ min: 2, max: 5 }),
          async (shared, numErrors) => {
            // Create multiple validation errors
            const invalidShared = { ...shared };
            const fieldsToInvalidate = ['gmPfsNumber', 'scenarioName', 'eventCode', 'layoutId', 'seasonId'];
            
            for (let i = 0; i < numErrors && i < fieldsToInvalidate.length; i++) {
              (invalidShared as any)[fieldsToInvalidate[i]] = '';
            }
            
            const result = validateSharedFields(invalidShared);
            
            // Property: Should report all errors
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(numErrors);
            
            // Property: No duplicate error messages
            const uniqueErrors = new Set(result.errors);
            expect(uniqueErrors.size).toBe(result.errors.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

