/**
 * Property-based tests for earned income calculator
 * 
 * These tests verify universal properties that should hold across all valid inputs,
 * complementing the unit tests which focus on specific examples and edge cases.
 * 
 * Requirements: earned-income-calculation 1.2, 1.4, 1.5, 1.8, 1.9, 3.4, 3.5, 4.3,
 *               5.1, 5.2, 5.3, 6.2, 6.3, 6.4, 6.7, 8.1, 8.2, 8.4
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import {
  DC_BY_LEVEL,
  getDCForLevel,
  calculateTaskLevelOptions,
  getIncomePerDay,
  calculateEarnedIncome
} from './earned-income-calculator';

describe('Earned Income Calculator Property-Based Tests', () => {
  // Feature: earned-income-calculation, Property 1: Task Level Options Generation
  // **Validates: Requirements 1.2, 1.4, 1.5, 1.8, 1.9, 8.1, 8.4**
  describe('Property 1: Task Level Options Generation', () => {
    it('should generate between 2 and 5 options for any character level 1-20', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (characterLevel) => {
            const options = calculateTaskLevelOptions(characterLevel);
            // Minimum 2 options: "-" and at least one task level
            // Maximum 5 options: "-" and 4 unique task levels
            expect(options.length).toBeGreaterThanOrEqual(2);
            expect(options.length).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have "-" as first option for any character level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (characterLevel) => {
            const options = calculateTaskLevelOptions(characterLevel);
            expect(options[0].value).toBe('-');
            expect(options[0].label).toBe('-');
            expect(options[0].dc).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should floor all numeric task levels at 0 for any character level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (characterLevel) => {
            const options = calculateTaskLevelOptions(characterLevel);
            
            // Check all numeric options (indices 1+)
            for (let i = 1; i < options.length; i++) {
              expect(options[i].value).toBeGreaterThanOrEqual(0);
              expect(typeof options[i].value).toBe('number');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not contain duplicate task level values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (characterLevel) => {
            const options = calculateTaskLevelOptions(characterLevel);
            
            // Extract numeric values (skip the "-" option)
            const numericValues = options.slice(1).map(opt => opt.value);
            
            // Check for duplicates
            const uniqueValues = new Set(numericValues);
            expect(uniqueValues.size).toBe(numericValues.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include PFS default label on the level-2 option', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (characterLevel) => {
            const options = calculateTaskLevelOptions(characterLevel);
            
            // Find the option with value = max(characterLevel - 2, 0)
            const pfsDefaultLevel = Math.max(characterLevel - 2, 0);
            const pfsDefaultOption = options.find(opt => opt.value === pfsDefaultLevel);
            
            expect(pfsDefaultOption).toBeDefined();
            expect(pfsDefaultOption!.label).toContain('(PFS default)');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format numeric options with correct DC values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (characterLevel) => {
            const options = calculateTaskLevelOptions(characterLevel);
            
            // Check all numeric options (indices 1+)
            for (let i = 1; i < options.length; i++) {
              const taskLevel = options[i].value as number;
              const expectedDC = getDCForLevel(taskLevel);
              
              expect(options[i].label).toContain(`Level ${taskLevel} (DC ${expectedDC})`);
              expect(options[i].dc).toBe(expectedDC);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: earned-income-calculation, Property 2: Income Table Lookup
  // **Validates: Requirements 4.3, 5.1, 5.2, 5.3, 6.2**
  describe('Property 2: Income Table Lookup', () => {
    it('should return non-negative gold value for any valid task level, proficiency rank, and success level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('failure', 'success'),
          (taskLevel, proficiencyRank, successLevel) => {
            const income = getIncomePerDay(taskLevel, successLevel, proficiencyRank);
            
            expect(income).toBeGreaterThanOrEqual(0);
            expect(typeof income).toBe('number');
            expect(Number.isFinite(income)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid income for critical success at any task level 0-19', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 19 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          (taskLevel, proficiencyRank) => {
            const income = getIncomePerDay(taskLevel, 'critical_success', proficiencyRank);
            
            expect(income).toBeGreaterThanOrEqual(0);
            expect(typeof income).toBe('number');
            expect(Number.isFinite(income)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid income for level 20 critical success with any proficiency rank', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          (proficiencyRank) => {
            const income = getIncomePerDay(20, 'critical_success', proficiencyRank);
            
            expect(income).toBeGreaterThanOrEqual(0);
            expect(typeof income).toBe('number');
            expect(Number.isFinite(income)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: earned-income-calculation, Property 3: Critical Success Calculation
  // **Validates: Requirements 3.5, 6.4**
  describe('Property 3: Critical Success Calculation', () => {
    it('should use task level + 1 for critical success at any task level 0-19', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 19 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          (taskLevel, proficiencyRank) => {
            const criticalIncome = getIncomePerDay(taskLevel, 'critical_success', proficiencyRank);
            
            // PFS Rule: "On a critical success, treat your PC level as 1 higher to determine results,
            // to a minimum level of 3"
            const effectiveLevel = Math.max(taskLevel + 1, 3);
            const expectedIncome = getIncomePerDay(effectiveLevel, 'success', proficiencyRank);
            
            // Critical success at level N should equal success at max(N+1, 3)
            expect(criticalIncome).toBe(expectedIncome);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use special values for level 20 critical success', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          (proficiencyRank) => {
            const criticalIncome = getIncomePerDay(20, 'critical_success', proficiencyRank);
            const normalIncome = getIncomePerDay(20, 'success', proficiencyRank);
            
            // Level 20 critical success should be greater than normal success
            expect(criticalIncome).toBeGreaterThan(normalIncome);
            
            // Verify it's using the special critical values
            const expectedCritical: Record<string, number> = {
              trained: 35,
              expert: 40,
              master: 50,
              legendary: 60
            };
            expect(criticalIncome).toBe(expectedCritical[proficiencyRank]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: earned-income-calculation, Property 4: Income Calculation Formula
  // **Validates: Requirements 6.3, 6.7**
  describe('Property 4: Income Calculation Formula', () => {
    it('should calculate total as income per day × downtime days for any valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('failure', 'success', 'critical_success'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, proficiencyRank, successLevel, downtimeDays) => {
            const incomePerDay = getIncomePerDay(taskLevel, successLevel, proficiencyRank);
            const totalIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
            
            // Calculate expected value: income per day × downtime days, rounded to 2 decimals
            const expected = Math.round(incomePerDay * downtimeDays * 100) / 100;
            
            expect(totalIncome).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round total income to 2 decimal places for any inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('failure', 'success', 'critical_success'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, proficiencyRank, successLevel, downtimeDays) => {
            const totalIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
            
            // Check that the value has at most 2 decimal places
            const decimalPlaces = (totalIncome.toString().split('.')[1] || '').length;
            expect(decimalPlaces).toBeLessThanOrEqual(2);
            
            // Verify rounding is correct
            const incomePerDay = getIncomePerDay(taskLevel, successLevel, proficiencyRank);
            const expected = Math.round(incomePerDay * downtimeDays * 100) / 100;
            expect(totalIncome).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: earned-income-calculation, Property 5: Zero Income Cases
  // **Validates: Requirements 3.4, 6.6**
  describe('Property 5: Zero Income Cases', () => {
    it('should return 0 for task level "-" with any other inputs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
          fc.integer({ min: 0, max: 8 }),
          (proficiencyRank, successLevel, downtimeDays) => {
            const totalIncome = calculateEarnedIncome('-', successLevel, proficiencyRank, downtimeDays);
            expect(totalIncome).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for critical failure with any other inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, proficiencyRank, downtimeDays) => {
            const totalIncome = calculateEarnedIncome(taskLevel, 'critical_failure', proficiencyRank, downtimeDays);
            expect(totalIncome).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for 0 downtime days with any other inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('failure', 'success', 'critical_success'),
          (taskLevel, proficiencyRank, successLevel) => {
            const totalIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, 0);
            expect(totalIncome).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: earned-income-calculation, Property 13: DC Lookup Accuracy
  // **Validates: Requirements 8.2**
  describe('Property 13: DC Lookup Accuracy', () => {
    it('should return correct DC from Pathfinder 2e table for any task level 0-20', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          (taskLevel) => {
            const dc = getDCForLevel(taskLevel);
            const expectedDC = DC_BY_LEVEL[taskLevel];
            
            expect(dc).toBe(expectedDC);
            expect(typeof dc).toBe('number');
            expect(dc).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent DC values for the same task level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          (taskLevel) => {
            const dc1 = getDCForLevel(taskLevel);
            const dc2 = getDCForLevel(taskLevel);
            
            // Multiple calls should return the same value
            expect(dc1).toBe(dc2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return level 0 DC for out-of-range task levels', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: -1 }),
            fc.integer({ min: 21, max: 100 })
          ),
          (invalidLevel) => {
            const dc = getDCForLevel(invalidLevel);
            expect(dc).toBe(DC_BY_LEVEL[0]);
            expect(dc).toBe(14);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
