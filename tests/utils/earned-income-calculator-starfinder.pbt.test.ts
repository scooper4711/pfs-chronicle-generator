/**
 * Property-based tests for Starfinder earned income calculator
 *
 * Properties 4, 5, and 7 from the design document.
 *
 * Requirements: starfinder-support 4.1, 4.2, 4.3, 4.5, 4.6, 6.3, 9.1, 9.2
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';
import {
  INCOME_TABLE,
  STARFINDER_INCOME_TABLE,
  getIncomePerDay,
  calculateEarnedIncome,
  calculateDowntimeDays
} from '../../scripts/utils/earned-income-calculator';

describe('Starfinder Earned Income Calculator Property-Based Tests', () => {
  beforeAll(() => {
    (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
  });

  afterAll(() => {
    delete (globalThis as any).game;
  });

  // Feature: starfinder-support, Property 4: Starfinder Income Table Derivation
  // SF value === Math.ceil(PF value * 10) for all levels/ranks
  // **Validates: Requirements 4.1, 4.2, 4.6, 9.1**
  describe('Property 4: Starfinder Income Table Derivation', () => {
    it('should have SF table value === Math.ceil(PF value * 10) for all non-critical entries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('failure', 'trained', 'expert', 'master', 'legendary'),
          (taskLevel, rank) => {
            const pfValue = INCOME_TABLE[taskLevel][rank] as number;
            const sfValue = STARFINDER_INCOME_TABLE[taskLevel][rank] as number;

            expect(sfValue).toBe(Math.ceil(pfValue * 10));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have SF critical success value === Math.ceil(PF critical value * 10) at level 20', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          (rank) => {
            const pfCritical = INCOME_TABLE[20].critical as Record<string, number>;
            const sfCritical = STARFINDER_INCOME_TABLE[20].critical as Record<string, number>;

            expect(sfCritical[rank]).toBe(Math.ceil(pfCritical[rank] * 10));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have SF getIncomePerDay === Math.ceil(PF getIncomePerDay * 10) for success/failure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('failure', 'success'),
          (taskLevel, proficiencyRank, successLevel) => {
            const pfIncome = getIncomePerDay(taskLevel, successLevel, proficiencyRank, 'pf2e');
            const sfIncome = getIncomePerDay(taskLevel, successLevel, proficiencyRank, 'sf2e');

            expect(sfIncome).toBe(Math.ceil(pfIncome * 10));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have SF getIncomePerDay === Math.ceil(PF getIncomePerDay * 10) for critical success', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          (taskLevel, proficiencyRank) => {
            const pfIncome = getIncomePerDay(taskLevel, 'critical_success', proficiencyRank, 'pf2e');
            const sfIncome = getIncomePerDay(taskLevel, 'critical_success', proficiencyRank, 'sf2e');

            expect(sfIncome).toBe(Math.ceil(pfIncome * 10));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: starfinder-support, Property 5: Starfinder Earned Income Whole Number
  // value % 1 === 0 for all valid inputs in SF mode
  // **Validates: Requirements 4.3, 4.5, 9.2**
  describe('Property 5: Starfinder Earned Income Whole Number', () => {
    it('should return a whole number for any valid SF earned income calculation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, proficiencyRank, successLevel, downtimeDays) => {
            const income = calculateEarnedIncome(
              taskLevel, successLevel, proficiencyRank, downtimeDays, 'sf2e'
            );

            expect(income % 1).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return a non-negative whole number for SF earned income', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.constantFrom('failure', 'success', 'critical_success'),
          fc.integer({ min: 1, max: 8 }),
          (taskLevel, proficiencyRank, successLevel, downtimeDays) => {
            const income = calculateEarnedIncome(
              taskLevel, successLevel, proficiencyRank, downtimeDays, 'sf2e'
            );

            expect(income).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(income)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: starfinder-support, Property 7: Starfinder Downtime Days Fixed at 8
  // Always returns 8 in SF mode regardless of XP/TB inputs
  // **Validates: Requirements 6.3**
  describe('Property 7: Starfinder Downtime Days Fixed at 8', () => {
    it('should always return 8 for any XP and treasure bundle values in SF mode', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          fc.option(fc.double({ min: 0, max: 20, noNaN: true })),
          (xpEarned, treasureBundles) => {
            const days = calculateDowntimeDays(
              xpEarned,
              treasureBundles ?? undefined,
              'sf2e'
            );

            expect(days).toBe(8);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
