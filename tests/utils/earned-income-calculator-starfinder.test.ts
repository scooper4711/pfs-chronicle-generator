/**
 * Unit tests for Starfinder earned income calculator
 *
 * Tests SF income table values, SF earned income calculation, SF downtime days,
 * and SF formatIncomeValue. Verifies existing PF2e behavior is unchanged.
 *
 * Requirements: starfinder-support 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.3
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  INCOME_TABLE,
  STARFINDER_INCOME_TABLE,
  getIncomePerDay,
  calculateEarnedIncome,
  calculateDowntimeDays,
  formatIncomeValue
} from '../../scripts/utils/earned-income-calculator';

describe('Starfinder Earned Income Calculator Unit Tests', () => {
  beforeAll(() => {
    (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
  });

  afterAll(() => {
    delete (globalThis as any).game;
  });

  describe('STARFINDER_INCOME_TABLE', () => {
    it('should contain all levels 0-20', () => {
      for (let level = 0; level <= 20; level++) {
        expect(STARFINDER_INCOME_TABLE[level]).toBeDefined();
      }
    });

    it('should have level 0 failure = Math.ceil(0.01 * 10) = 1', () => {
      expect(STARFINDER_INCOME_TABLE[0].failure).toBe(1);
    });

    it('should have level 0 trained = Math.ceil(0.05 * 10) = 1', () => {
      expect(STARFINDER_INCOME_TABLE[0].trained).toBe(1);
    });

    it('should have level 5 trained = Math.ceil(0.9 * 10) = 9', () => {
      expect(STARFINDER_INCOME_TABLE[5].trained).toBe(9);
    });

    it('should have level 5 expert = Math.ceil(1 * 10) = 10', () => {
      expect(STARFINDER_INCOME_TABLE[5].expert).toBe(10);
    });

    it('should have level 10 failure = Math.ceil(0.7 * 10) = 7', () => {
      expect(STARFINDER_INCOME_TABLE[10].failure).toBe(7);
    });

    it('should have level 10 master = Math.ceil(6 * 10) = 60', () => {
      expect(STARFINDER_INCOME_TABLE[10].master).toBe(60);
    });

    it('should have level 20 trained = Math.ceil(40 * 10) = 400', () => {
      expect(STARFINDER_INCOME_TABLE[20].trained).toBe(400);
    });

    it('should have level 20 legendary = Math.ceil(200 * 10) = 2000', () => {
      expect(STARFINDER_INCOME_TABLE[20].legendary).toBe(2000);
    });

    it('should have level 20 critical success sub-table', () => {
      const critical = STARFINDER_INCOME_TABLE[20].critical as Record<string, number>;
      expect(critical).toBeDefined();
      expect(critical.trained).toBe(500);   // Math.ceil(50 * 10)
      expect(critical.expert).toBe(900);    // Math.ceil(90 * 10)
      expect(critical.master).toBe(1750);   // Math.ceil(175 * 10)
      expect(critical.legendary).toBe(3000); // Math.ceil(300 * 10)
    });

    it('should have level 4 failure = Math.ceil(0.1 * 10) = 1', () => {
      expect(STARFINDER_INCOME_TABLE[4].failure).toBe(1);
    });

    it('should have level 14 failure = Math.ceil(1.5 * 10) = 15', () => {
      expect(STARFINDER_INCOME_TABLE[14].failure).toBe(15);
    });

    it('should derive every value from INCOME_TABLE using Math.ceil(value * 10)', () => {
      for (let level = 0; level <= 20; level++) {
        for (const [rank, pfValue] of Object.entries(INCOME_TABLE[level])) {
          if (rank === 'critical' && typeof pfValue === 'object') {
            const sfCritical = STARFINDER_INCOME_TABLE[level][rank] as Record<string, number>;
            for (const [critRank, critValue] of Object.entries(pfValue)) {
              expect(sfCritical[critRank]).toBe(Math.ceil(critValue * 10));
            }
          } else {
            expect(STARFINDER_INCOME_TABLE[level][rank]).toBe(Math.ceil((pfValue as number) * 10));
          }
        }
      }
    });
  });

  describe('getIncomePerDay (Starfinder)', () => {
    it('should return SF table value for level 0 trained success', () => {
      expect(getIncomePerDay(0, 'success', 'trained', 'sf2e')).toBe(1);
    });

    it('should return SF table value for level 5 expert success', () => {
      expect(getIncomePerDay(5, 'success', 'expert', 'sf2e')).toBe(10);
    });

    it('should return SF table value for level 10 master success', () => {
      expect(getIncomePerDay(10, 'success', 'master', 'sf2e')).toBe(60);
    });

    it('should return SF table value for level 20 legendary success', () => {
      expect(getIncomePerDay(20, 'success', 'legendary', 'sf2e')).toBe(2000);
    });

    it('should return SF failure value for level 0', () => {
      expect(getIncomePerDay(0, 'failure', 'trained', 'sf2e')).toBe(1);
    });

    it('should return 0 for critical failure in SF mode', () => {
      expect(getIncomePerDay(10, 'critical_failure', 'master', 'sf2e')).toBe(0);
    });

    it('should return 0 for task level "-" in SF mode', () => {
      expect(getIncomePerDay('-', 'success', 'trained', 'sf2e')).toBe(0);
    });

    it('should use level + 1 for critical success in SF mode (level 5)', () => {
      // Critical success at level 5 uses level 6 SF values
      expect(getIncomePerDay(5, 'critical_success', 'trained', 'sf2e')).toBe(15); // Math.ceil(1.5 * 10)
      expect(getIncomePerDay(5, 'critical_success', 'expert', 'sf2e')).toBe(20);  // Math.ceil(2 * 10)
    });

    it('should use special critical success values for level 20 in SF mode', () => {
      expect(getIncomePerDay(20, 'critical_success', 'trained', 'sf2e')).toBe(500);
      expect(getIncomePerDay(20, 'critical_success', 'expert', 'sf2e')).toBe(900);
      expect(getIncomePerDay(20, 'critical_success', 'master', 'sf2e')).toBe(1750);
      expect(getIncomePerDay(20, 'critical_success', 'legendary', 'sf2e')).toBe(3000);
    });
  });

  describe('getIncomePerDay (PF2e unchanged)', () => {
    it('should return PF2e values when gameSystem is pf2e', () => {
      expect(getIncomePerDay(0, 'success', 'trained', 'pf2e')).toBe(0.05);
      expect(getIncomePerDay(5, 'success', 'expert', 'pf2e')).toBe(1);
      expect(getIncomePerDay(10, 'success', 'master', 'pf2e')).toBe(6);
    });

    it('should default to PF2e in test environment', () => {
      // game.system.id is 'pf2e' in beforeAll
      expect(getIncomePerDay(5, 'success', 'trained')).toBe(0.9);
    });
  });

  describe('calculateEarnedIncome (Starfinder)', () => {
    it('should return whole-number Credits for SF mode', () => {
      // Level 5 trained success = 9 Credits/day × 8 days = 72 Credits
      expect(calculateEarnedIncome(5, 'success', 'trained', 8, 'sf2e')).toBe(72);
    });

    it('should apply Math.ceil to fractional results in SF mode', () => {
      // Level 0 failure = 1 Credit/day × 3 days = 3 Credits (already whole)
      expect(calculateEarnedIncome(0, 'failure', 'trained', 3, 'sf2e')).toBe(3);
    });

    it('should return 0 for critical failure in SF mode', () => {
      expect(calculateEarnedIncome(10, 'critical_failure', 'master', 8, 'sf2e')).toBe(0);
    });

    it('should return 0 for task level "-" in SF mode', () => {
      expect(calculateEarnedIncome('-', 'success', 'trained', 8, 'sf2e')).toBe(0);
    });

    it('should return 0 for 0 downtime days in SF mode', () => {
      expect(calculateEarnedIncome(10, 'success', 'master', 0, 'sf2e')).toBe(0);
    });

    it('should calculate level 20 legendary success × 8 days in SF mode', () => {
      // 2000 Credits/day × 8 days = 16000 Credits
      expect(calculateEarnedIncome(20, 'success', 'legendary', 8, 'sf2e')).toBe(16000);
    });

    it('should calculate level 20 critical success in SF mode', () => {
      // legendary critical = 3000 Credits/day × 4 days = 12000 Credits
      expect(calculateEarnedIncome(20, 'critical_success', 'legendary', 4, 'sf2e')).toBe(12000);
    });

    it('should return whole number even when intermediate product would be fractional', () => {
      // All SF income table values are already whole numbers (Math.ceil applied),
      // so incomePerDay * downtimeDays is always whole. But Math.ceil ensures it.
      const result = calculateEarnedIncome(1, 'success', 'trained', 3, 'sf2e');
      expect(result % 1).toBe(0);
    });
  });

  describe('calculateEarnedIncome (PF2e unchanged)', () => {
    it('should return decimal values for PF2e mode', () => {
      expect(calculateEarnedIncome(5, 'success', 'trained', 4, 'pf2e')).toBe(3.6);
    });

    it('should default to PF2e in test environment', () => {
      expect(calculateEarnedIncome(5, 'success', 'trained', 4)).toBe(3.6);
    });
  });

  describe('calculateDowntimeDays (Starfinder)', () => {
    it('should return 8 for any XP value in SF mode', () => {
      expect(calculateDowntimeDays(4, undefined, 'sf2e')).toBe(8);
    });

    it('should return 8 regardless of XP in SF mode', () => {
      expect(calculateDowntimeDays(1, undefined, 'sf2e')).toBe(8);
      expect(calculateDowntimeDays(2, undefined, 'sf2e')).toBe(8);
      expect(calculateDowntimeDays(0, undefined, 'sf2e')).toBe(8);
    });

    it('should return 8 regardless of treasure bundles in SF mode', () => {
      expect(calculateDowntimeDays(1, 2.5, 'sf2e')).toBe(8);
      expect(calculateDowntimeDays(4, 10, 'sf2e')).toBe(8);
    });
  });

  describe('calculateDowntimeDays (PF2e unchanged)', () => {
    it('should return PF2e values when gameSystem is pf2e', () => {
      expect(calculateDowntimeDays(1, undefined, 'pf2e')).toBe(0);
      expect(calculateDowntimeDays(1, 2.5, 'pf2e')).toBe(2);
      expect(calculateDowntimeDays(2, undefined, 'pf2e')).toBe(4);
      expect(calculateDowntimeDays(4, undefined, 'pf2e')).toBe(8);
    });
  });

  describe('formatIncomeValue (Starfinder)', () => {
    it('should format as whole number Credits in SF mode', () => {
      expect(formatIncomeValue(105, 'sf2e')).toBe('105 Credits');
    });

    it('should format zero as "0 Credits" in SF mode', () => {
      expect(formatIncomeValue(0, 'sf2e')).toBe('0 Credits');
    });

    it('should format large values in SF mode', () => {
      expect(formatIncomeValue(16000, 'sf2e')).toBe('16000 Credits');
    });
  });

  describe('formatIncomeValue (PF2e unchanged)', () => {
    it('should format with gp suffix in PF2e mode', () => {
      expect(formatIncomeValue(10.5, 'pf2e')).toBe('10.50 gp');
    });

    it('should default to PF2e in test environment', () => {
      expect(formatIncomeValue(0)).toBe('0.00 gp');
    });
  });
});
