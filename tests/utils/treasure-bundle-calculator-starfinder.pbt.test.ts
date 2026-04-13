/**
 * Property-based tests for Starfinder Credits Awarded in treasure-bundle-calculator.
 *
 * Property 6 from the design document.
 *
 * Requirements: starfinder-support 5.2, 5.4, 5.6, 9.3
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';
import {
  CREDITS_AWARDED_TABLE,
  calculateCurrencyGained
} from '../../scripts/utils/treasure-bundle-calculator';

describe('Starfinder Credits Awarded Property-Based Tests', () => {
  beforeAll(() => {
    (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
  });

  afterAll(() => {
    delete (globalThis as any).game;
  });

  // Feature: starfinder-support, Property 6: Starfinder Currency Gained from Credits Awarded
  // calculateCurrencyGained in SF mode returns CREDITS_AWARDED_TABLE[level] + earnedIncome,
  // and Credits Awarded is a positive whole number.
  // **Validates: Requirements 5.2, 5.4, 5.6, 9.3**
  describe('Property 6: Starfinder Currency Gained from Credits Awarded', () => {
    it('should return CREDITS_AWARDED_TABLE[level] + earnedIncome in SF mode', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 0, max: 100000 }),
          (level, earnedIncome) => {
            const creditsAwarded = CREDITS_AWARDED_TABLE[level];
            const result = calculateCurrencyGained(creditsAwarded, earnedIncome, 'sf2e');

            expect(result).toBe(Math.ceil(creditsAwarded + earnedIncome));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have Credits Awarded as a positive whole number for all valid levels', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (level) => {
            const creditsAwarded = CREDITS_AWARDED_TABLE[level];

            expect(creditsAwarded).toBeGreaterThan(0);
            expect(Number.isInteger(creditsAwarded)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
