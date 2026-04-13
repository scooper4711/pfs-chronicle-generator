/**
 * Property-based tests for party chronicle validator
 * 
 * These tests verify universal validation properties that should hold across all valid inputs,
 * complementing the unit tests which focus on specific examples and edge cases.
 * 
 * Requirements: earned-income-calculation 2.1, 9.1, 9.2, 9.3, 9.5, 9.6, 9.7
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import {
  validateSharedFields,
  validateUniqueFields
} from '../../scripts/model/party-chronicle-validator';
import { SharedFields, UniqueFields } from '../../scripts/model/party-chronicle-types';

describe('Party Chronicle Validator Property-Based Tests', () => {
  // Feature: earned-income-calculation, Property 6: XP Earned Validation
  // **Validates: Requirements 2.1, 9.1, 9.2, 9.3**
  describe('Property 6: XP Earned Validation', () => {
    it('should accept XP values of 1, 2, or 4', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(1, 2, 4),
          (xpEarned) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: xpEarned,
              layoutId: 'test-layout',
              seasonId: 'season-1',
              blankChroniclePath: '/path/to/chronicle.pdf',
              treasureBundles: 2,
              downtimeDays: xpEarned === 1 ? 0 : xpEarned * 2,
              chosenFactionReputation: 2,
              reputationValues: {
                EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            // Should not have any errors related to XP Earned
            const xpErrors = result.errors.filter(err => 
              err.includes('XP Earned')
            );
            expect(xpErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject XP values other than 1, 2, or 4', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10, max: 20 }).filter(n => ![1, 2, 4].includes(n)),
          (xpEarned) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: xpEarned,
              layoutId: 'test-layout',
              seasonId: 'season-1',
              blankChroniclePath: '/path/to/chronicle.pdf',
              treasureBundles: 2,
              downtimeDays: 0,
              chosenFactionReputation: 2,
              reputationValues: {
                EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            // Should have an error related to XP Earned
            const xpErrors = result.errors.filter(err => 
              err.includes('XP Earned')
            );
            expect(xpErrors.length).toBeGreaterThan(0);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: earned-income-calculation, Property 7: Conditional Validation
  // **Validates: Requirements 9.5, 9.6, 9.7**
  describe('Property 7: Conditional Validation', () => {
    it('should require success level and proficiency rank when task level is not "-"', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          (taskLevel) => {
            // Test case 1: Missing success level
            const uniqueNoSuccess: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: taskLevel,
              successLevel: undefined,
              proficiencyRank: 'trained'
            };
            
            const resultNoSuccess = validateUniqueFields(uniqueNoSuccess);
            
            // Should have an error about missing success level
            const successLevelErrors = resultNoSuccess.errors.filter(err => 
              err.includes('Success Level is required')
            );
            expect(successLevelErrors.length).toBeGreaterThan(0);
            expect(resultNoSuccess.valid).toBe(false);
            
            // Test case 2: Missing proficiency rank
            const uniqueNoProficiency: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: taskLevel,
              successLevel: 'success',
              proficiencyRank: undefined
            };
            
            const resultNoProficiency = validateUniqueFields(uniqueNoProficiency);
            
            // Should have an error about missing proficiency rank
            const proficiencyRankErrors = resultNoProficiency.errors.filter(err => 
              err.includes('Proficiency Rank is required')
            );
            expect(proficiencyRankErrors.length).toBeGreaterThan(0);
            expect(resultNoProficiency.valid).toBe(false);
            
            // Test case 3: Both provided (should be valid for earned income fields)
            const uniqueComplete: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: taskLevel,
              successLevel: 'success',
              proficiencyRank: 'trained'
            };
            
            const resultComplete = validateUniqueFields(uniqueComplete);
            
            // Should not have errors about success level or proficiency rank
            const earnedIncomeErrors = resultComplete.errors.filter(err => 
              err.includes('Success Level is required') || 
              err.includes('Proficiency Rank is required')
            );
            expect(earnedIncomeErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not require success level or proficiency rank when task level is "-"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('success', 'failure', 'critical_success', 'critical_failure', undefined),
          fc.constantFrom('trained', 'expert', 'master', 'legendary', undefined),
          (successLevel, proficiencyRank) => {
            const unique: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: '-',
              successLevel: successLevel,
              proficiencyRank: proficiencyRank
            };
            
            const result = validateUniqueFields(unique);
            
            // Should not have errors about missing success level or proficiency rank
            const conditionalErrors = result.errors.filter(err => 
              err.includes('Success Level is required') || 
              err.includes('Proficiency Rank is required')
            );
            expect(conditionalErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate success level values when provided', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => 
            s.length > 0 && !['critical_failure', 'failure', 'success', 'critical_success'].includes(s)
          ),
          (invalidSuccessLevel) => {
            const unique: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: 5,
              successLevel: invalidSuccessLevel,
              proficiencyRank: 'trained'
            };
            
            const result = validateUniqueFields(unique);
            
            // Should have an error about invalid success level
            const successLevelErrors = result.errors.filter(err => 
              err.includes('Success Level must be')
            );
            expect(successLevelErrors.length).toBeGreaterThan(0);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate proficiency rank values when provided', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => 
            s.length > 0 && !['trained', 'expert', 'master', 'legendary'].includes(s)
          ),
          (invalidProficiencyRank) => {
            const unique: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: 5,
              successLevel: 'success',
              proficiencyRank: invalidProficiencyRank
            };
            
            const result = validateUniqueFields(unique);
            
            // Should have an error about invalid proficiency rank
            const proficiencyRankErrors = result.errors.filter(err => 
              err.includes('Proficiency Rank must be')
            );
            expect(proficiencyRankErrors.length).toBeGreaterThan(0);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid success level values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
          (successLevel) => {
            const unique: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: 5,
              successLevel: successLevel,
              proficiencyRank: 'trained'
            };
            
            const result = validateUniqueFields(unique);
            
            // Should not have errors about success level format
            const successLevelErrors = result.errors.filter(err => 
              err.includes('Success Level must be')
            );
            expect(successLevelErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid proficiency rank values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          (proficiencyRank) => {
            const unique: Partial<UniqueFields> = {
              characterName: 'Test Character',
              playerNumber: '12345', characterNumber: '01',
              level: 5,
              currencySpent: 0,
              taskLevel: 5,
              successLevel: 'success',
              proficiencyRank: proficiencyRank
            };
            
            const result = validateUniqueFields(unique);
            
            // Should not have errors about proficiency rank format
            const proficiencyRankErrors = result.errors.filter(err => 
              err.includes('Proficiency Rank must be')
            );
            expect(proficiencyRankErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
