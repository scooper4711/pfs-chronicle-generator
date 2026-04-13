/**
 * Unit tests for earned income calculator
 * 
 * These tests validate specific examples and edge cases for the earned income
 * calculator, complementing the property-based tests.
 * 
 * Requirements: earned-income-calculation 1.1, 1.2, 1.4, 1.5, 1.8, 1.9, 3.4, 3.5,
 *               5.1, 5.2, 5.3, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.2
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  DC_BY_LEVEL,
  INCOME_TABLE,
  getDCForLevel,
  calculateDowntimeDays,
  calculateTaskLevelOptions,
  getIncomePerDay,
  calculateEarnedIncome,
  formatIncomeValue
} from '../../scripts/utils/earned-income-calculator';

describe('Earned Income Calculator Unit Tests', () => {
  // Set up minimal game global so getGameSystem() defaults to 'pf2e'
  beforeAll(() => {
    (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
  });

  afterAll(() => {
    delete (globalThis as any).game;
  });

  describe('getDCForLevel', () => {
    it('should return correct DC for level 0', () => {
      expect(getDCForLevel(0)).toBe(14);
    });

    it('should return correct DC for level 1', () => {
      expect(getDCForLevel(1)).toBe(15);
    });

    it('should return correct DC for level 5', () => {
      expect(getDCForLevel(5)).toBe(20);
    });

    it('should return correct DC for level 10', () => {
      expect(getDCForLevel(10)).toBe(27);
    });

    it('should return correct DC for level 15', () => {
      expect(getDCForLevel(15)).toBe(34);
    });

    it('should return correct DC for level 20', () => {
      expect(getDCForLevel(20)).toBe(40);
    });

    it('should return all correct DCs for levels 0-20', () => {
      const expectedDCs = [
        14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27,
        28, 30, 31, 32, 34, 35, 36, 38, 39, 40
      ];
      
      for (let level = 0; level <= 20; level++) {
        expect(getDCForLevel(level)).toBe(expectedDCs[level]);
      }
    });

    it('should return level 0 DC for negative levels', () => {
      expect(getDCForLevel(-1)).toBe(14);
      expect(getDCForLevel(-5)).toBe(14);
      expect(getDCForLevel(-100)).toBe(14);
    });

    it('should return level 0 DC for levels above 20', () => {
      expect(getDCForLevel(21)).toBe(14);
      expect(getDCForLevel(25)).toBe(14);
      expect(getDCForLevel(100)).toBe(14);
    });
  });

  describe('calculateDowntimeDays', () => {
    it('should return 0 downtime days for Bounty (1 XP)', () => {
      expect(calculateDowntimeDays(1)).toBe(0);
    });

    it('should return 2 downtime days for Series 1 Quest (1 XP + 2.5 TB)', () => {
      expect(calculateDowntimeDays(1, 2.5)).toBe(2);
    });

    it('should return 4 downtime days for Quest (2 XP)', () => {
      expect(calculateDowntimeDays(2)).toBe(4);
    });

    it('should return 8 downtime days for Scenario (4 XP)', () => {
      expect(calculateDowntimeDays(4)).toBe(8);
    });
  });

  describe('calculateTaskLevelOptions', () => {
    it('should return exactly 5 options for high-level characters with no duplicates', () => {
      const options = calculateTaskLevelOptions(10);
      expect(options).toHaveLength(5);
    });

    it('should have "-" as first option', () => {
      const options = calculateTaskLevelOptions(10);
      expect(options[0].value).toBe('-');
      expect(options[0].label).toBe('-');
      expect(options[0].dc).toBeUndefined();
    });

    it('should calculate correct task levels for level 10 character', () => {
      const options = calculateTaskLevelOptions(10);
      
      expect(options[1].value).toBe(7);  // 10 - 3
      expect(options[1].label).toBe('Level 7 (DC 23)');
      expect(options[1].dc).toBe(23);
      
      expect(options[2].value).toBe(8);  // 10 - 2 (PFS default)
      expect(options[2].label).toBe('Level 8 (DC 24) (PFS default)');
      expect(options[2].dc).toBe(24);
      
      expect(options[3].value).toBe(9);  // 10 - 1
      expect(options[3].label).toBe('Level 9 (DC 26)');
      expect(options[3].dc).toBe(26);
      
      expect(options[4].value).toBe(10); // 10
      expect(options[4].label).toBe('Level 10 (DC 27)');
      expect(options[4].dc).toBe(27);
    });

    it('should remove duplicate task levels for level 1 character', () => {
      const options = calculateTaskLevelOptions(1);
      
      // Should only have 3 options: "-", 0 (PFS default), 1
      expect(options).toHaveLength(3);
      
      expect(options[0].value).toBe('-');
      expect(options[0].label).toBe('-');
      
      expect(options[1].value).toBe(0);  // max(1 - 2, 0) = 0 (first occurrence, PFS default)
      expect(options[1].label).toBe('Level 0 (DC 14) (PFS default)');
      
      expect(options[2].value).toBe(1);  // 1
      expect(options[2].label).toBe('Level 1 (DC 15)');
    });

    it('should remove duplicate task levels for level 2 character', () => {
      const options = calculateTaskLevelOptions(2);
      
      // Should only have 4 options: "-", 0 (PFS default), 1, 2
      expect(options).toHaveLength(4);
      
      expect(options[0].value).toBe('-');
      expect(options[1].value).toBe(0);  // max(2 - 2, 0) = 0 (first occurrence, PFS default)
      expect(options[1].label).toBe('Level 0 (DC 14) (PFS default)');
      expect(options[2].value).toBe(1);  // max(2 - 1, 0) = 1
      expect(options[3].value).toBe(2);  // 2
    });

    it('should remove duplicate task levels for level 3 character', () => {
      const options = calculateTaskLevelOptions(3);
      
      // Should have 5 options: "-", 0, 1 (PFS default), 2, 3
      expect(options).toHaveLength(5);
      
      expect(options[0].value).toBe('-');
      expect(options[1].value).toBe(0);  // max(3 - 3, 0) = 0
      expect(options[2].value).toBe(1);  // max(3 - 2, 0) = 1 (PFS default)
      expect(options[2].label).toBe('Level 1 (DC 15) (PFS default)');
      expect(options[3].value).toBe(2);  // max(3 - 1, 0) = 2
      expect(options[4].value).toBe(3);  // 3
    });

    it('should calculate correct task levels for level 20 character', () => {
      const options = calculateTaskLevelOptions(20);
      
      expect(options).toHaveLength(5);
      expect(options[1].value).toBe(17); // 20 - 3
      expect(options[2].value).toBe(18); // 20 - 2 (PFS default)
      expect(options[2].label).toBe('Level 18 (DC 38) (PFS default)');
      expect(options[3].value).toBe(19); // 20 - 1
      expect(options[4].value).toBe(20); // 20
    });
  });

  describe('getIncomePerDay', () => {
    it('should return 0 for task level "-"', () => {
      expect(getIncomePerDay('-', 'success', 'trained')).toBe(0);
      expect(getIncomePerDay('-', 'critical_success', 'legendary')).toBe(0);
    });

    it('should return 0 for critical failure', () => {
      expect(getIncomePerDay(5, 'critical_failure', 'trained')).toBe(0);
      expect(getIncomePerDay(10, 'critical_failure', 'master')).toBe(0);
      expect(getIncomePerDay(20, 'critical_failure', 'legendary')).toBe(0);
    });

    it('should return correct income for level 0 failure', () => {
      expect(getIncomePerDay(0, 'failure', 'trained')).toBe(0.01);
    });

    it('should return correct income for level 1 trained success', () => {
      expect(getIncomePerDay(1, 'success', 'trained')).toBe(0.2);
    });

    it('should return correct income for level 5 expert success', () => {
      expect(getIncomePerDay(5, 'success', 'expert')).toBe(1);
    });

    it('should return correct income for level 10 master success', () => {
      expect(getIncomePerDay(10, 'success', 'master')).toBe(6);
    });

    it('should return correct income for level 15 legendary success', () => {
      expect(getIncomePerDay(15, 'success', 'legendary')).toBe(28);
    });

    it('should use level + 1 for critical success (level 5)', () => {
      // Critical success at level 5 uses level 6 values
      expect(getIncomePerDay(5, 'critical_success', 'trained')).toBe(1.5);
      expect(getIncomePerDay(5, 'critical_success', 'expert')).toBe(2);
      expect(getIncomePerDay(5, 'critical_success', 'master')).toBe(2);
      expect(getIncomePerDay(5, 'critical_success', 'legendary')).toBe(2);
    });

    it('should use level + 1 for critical success (level 10)', () => {
      // Critical success at level 10 uses level 11 values
      expect(getIncomePerDay(10, 'critical_success', 'trained')).toBe(5);
      expect(getIncomePerDay(10, 'critical_success', 'expert')).toBe(6);
      expect(getIncomePerDay(10, 'critical_success', 'master')).toBe(8);
      expect(getIncomePerDay(10, 'critical_success', 'legendary')).toBe(8);
    });

    it('should use level + 1 for critical success at level 0', () => {
      // Critical success at level 0 uses level 1 values (0 + 1 = 1)
      expect(getIncomePerDay(0, 'critical_success', 'trained')).toBe(0.2);
      expect(getIncomePerDay(0, 'critical_success', 'expert')).toBe(0.2);
      expect(getIncomePerDay(0, 'critical_success', 'master')).toBe(0.2);
      expect(getIncomePerDay(0, 'critical_success', 'legendary')).toBe(0.2);
    });

    it('should use level + 1 for critical success at level 1', () => {
      // Critical success at level 1 uses level 2 values (1 + 1 = 2)
      expect(getIncomePerDay(1, 'critical_success', 'trained')).toBe(0.3);
      expect(getIncomePerDay(1, 'critical_success', 'expert')).toBe(0.3);
      expect(getIncomePerDay(1, 'critical_success', 'master')).toBe(0.3);
      expect(getIncomePerDay(1, 'critical_success', 'legendary')).toBe(0.3);
    });

    it('should use level + 1 for critical success at level 2', () => {
      // Critical success at level 2 uses level 3 values (2 + 1 = 3)
      expect(getIncomePerDay(2, 'critical_success', 'trained')).toBe(0.5);
      expect(getIncomePerDay(2, 'critical_success', 'expert')).toBe(0.5);
      expect(getIncomePerDay(2, 'critical_success', 'master')).toBe(0.5);
      expect(getIncomePerDay(2, 'critical_success', 'legendary')).toBe(0.5);
    });

    it('should use level + 1 for critical success at level 3', () => {
      // Critical success at level 3 uses level 4 values
      expect(getIncomePerDay(3, 'critical_success', 'trained')).toBe(0.7);
      expect(getIncomePerDay(3, 'critical_success', 'expert')).toBe(0.8);
      expect(getIncomePerDay(3, 'critical_success', 'master')).toBe(0.8);
      expect(getIncomePerDay(3, 'critical_success', 'legendary')).toBe(0.8);
    });

    it('should use level + 1 for critical success at level 4 and above', () => {
      // Critical success at level 4 uses level 5 values
      expect(getIncomePerDay(4, 'critical_success', 'trained')).toBe(0.9);
      expect(getIncomePerDay(4, 'critical_success', 'expert')).toBe(1);
      expect(getIncomePerDay(4, 'critical_success', 'master')).toBe(1);
      expect(getIncomePerDay(4, 'critical_success', 'legendary')).toBe(1);
    });

    it('should use special critical success values for level 20', () => {
      expect(getIncomePerDay(20, 'critical_success', 'trained')).toBe(50);
      expect(getIncomePerDay(20, 'critical_success', 'expert')).toBe(90);
      expect(getIncomePerDay(20, 'critical_success', 'master')).toBe(175);
      expect(getIncomePerDay(20, 'critical_success', 'legendary')).toBe(300);
    });

    it('should return correct income for level 20 normal success', () => {
      expect(getIncomePerDay(20, 'success', 'trained')).toBe(40);
      expect(getIncomePerDay(20, 'success', 'expert')).toBe(75);
      expect(getIncomePerDay(20, 'success', 'master')).toBe(150);
      expect(getIncomePerDay(20, 'success', 'legendary')).toBe(200);
    });

    it('should return correct income for level 19 critical success', () => {
      // Critical success at level 19 uses level 20 normal values (not critical)
      expect(getIncomePerDay(19, 'critical_success', 'trained')).toBe(40);
      expect(getIncomePerDay(19, 'critical_success', 'expert')).toBe(75);
      expect(getIncomePerDay(19, 'critical_success', 'master')).toBe(150);
      expect(getIncomePerDay(19, 'critical_success', 'legendary')).toBe(200);
    });

    it('should handle string task level', () => {
      expect(getIncomePerDay('5', 'success', 'trained')).toBe(0.9);
      expect(getIncomePerDay('10', 'success', 'master')).toBe(6);
    });

    it('should return 0 for invalid task level', () => {
      expect(getIncomePerDay(-1, 'success', 'trained')).toBe(0);
      expect(getIncomePerDay(21, 'success', 'trained')).toBe(0);
      expect(getIncomePerDay(100, 'success', 'trained')).toBe(0);
    });

    it('should return 0 for invalid string task level', () => {
      expect(getIncomePerDay('invalid', 'success', 'trained')).toBe(0);
      expect(getIncomePerDay('abc', 'success', 'trained')).toBe(0);
    });
  });

  describe('calculateEarnedIncome', () => {
    it('should return 0 for task level "-"', () => {
      expect(calculateEarnedIncome('-', 'success', 'trained', 4)).toBe(0);
      expect(calculateEarnedIncome('-', 'critical_success', 'legendary', 8)).toBe(0);
    });

    it('should return 0 for critical failure', () => {
      expect(calculateEarnedIncome(5, 'critical_failure', 'trained', 4)).toBe(0);
      expect(calculateEarnedIncome(10, 'critical_failure', 'master', 8)).toBe(0);
    });

    it('should return 0 for 0 downtime days', () => {
      expect(calculateEarnedIncome(5, 'success', 'trained', 0)).toBe(0);
      expect(calculateEarnedIncome(10, 'critical_success', 'legendary', 0)).toBe(0);
    });

    it('should calculate income per day × downtime days', () => {
      // Level 5 trained success = 0.9 gp/day × 4 days = 3.6 gp
      expect(calculateEarnedIncome(5, 'success', 'trained', 4)).toBe(3.6);
      
      // Level 10 master success = 6 gp/day × 3 days = 18 gp
      expect(calculateEarnedIncome(10, 'success', 'master', 3)).toBe(18);
      
      // Level 15 legendary success = 28 gp/day × 2 days = 56 gp
      expect(calculateEarnedIncome(15, 'success', 'legendary', 2)).toBe(56);
    });

    it('should round to 2 decimal places', () => {
      // Level 1 trained success = 0.2 gp/day × 3 days = 0.6 gp
      expect(calculateEarnedIncome(1, 'success', 'trained', 3)).toBe(0.6);
      
      // Level 0 trained success = 0.05 gp/day × 7 days = 0.35 gp
      expect(calculateEarnedIncome(0, 'success', 'trained', 7)).toBe(0.35);
      
      // Level 2 failure = 0.04 gp/day × 5 days = 0.2 gp
      expect(calculateEarnedIncome(2, 'failure', 'trained', 5)).toBe(0.2);
    });

    it('should handle rounding edge cases', () => {
      // Test that rounding works correctly for values that need rounding
      // Level 4 trained success = 0.7 gp/day × 3 days = 2.1 gp
      expect(calculateEarnedIncome(4, 'success', 'trained', 3)).toBe(2.1);
      
      // Level 5 expert success = 1 gp/day × 3 days = 3 gp
      expect(calculateEarnedIncome(5, 'success', 'expert', 3)).toBe(3);
    });

    it('should calculate correctly with maximum downtime days', () => {
      // Level 10 master success = 6 gp/day × 8 days = 48 gp
      expect(calculateEarnedIncome(10, 'success', 'master', 8)).toBe(48);
      
      // Level 20 legendary success = 200 gp/day × 8 days = 1600 gp
      expect(calculateEarnedIncome(20, 'success', 'legendary', 8)).toBe(1600);
    });

    it('should calculate correctly with critical success', () => {
      // Level 5 critical success uses level 6 values
      // Level 6 trained = 1.5 gp/day × 4 days = 6 gp
      expect(calculateEarnedIncome(5, 'critical_success', 'trained', 4)).toBe(6);
      
      // Level 10 critical success uses level 11 values
      // Level 11 master = 8 gp/day × 5 days = 40 gp
      expect(calculateEarnedIncome(10, 'critical_success', 'master', 5)).toBe(40);
    });

    it('should calculate correctly with level 20 critical success', () => {
      // Level 20 critical success uses special values
      expect(calculateEarnedIncome(20, 'critical_success', 'trained', 4)).toBe(200);  // 50 × 4
      expect(calculateEarnedIncome(20, 'critical_success', 'expert', 4)).toBe(360);   // 90 × 4
      expect(calculateEarnedIncome(20, 'critical_success', 'master', 4)).toBe(700);   // 175 × 4
      expect(calculateEarnedIncome(20, 'critical_success', 'legendary', 4)).toBe(1200); // 300 × 4
    });

    it('should handle small income values correctly', () => {
      // Level 0 failure = 0.01 gp/day × 1 day = 0.01 gp
      expect(calculateEarnedIncome(0, 'failure', 'trained', 1)).toBe(0.01);
      
      // Level 1 failure = 0.02 gp/day × 2 days = 0.04 gp
      expect(calculateEarnedIncome(1, 'failure', 'trained', 2)).toBe(0.04);
    });

    // Bugfix: earn-income-crit-success-fix
    // Exploratory test: concrete example from the bug report
    // Task level 1, critical success, trained, 8 downtime days
    // Expected: 2.4 gp (level 2 trained = 0.3 gp/day × 8 days)
    // Unfixed code returns: 4.0 gp (level 3 trained = 0.5 gp/day × 8 days)
    // **Validates: Requirements 2.2**
    it('should return 2.4 gp for task level 1 critical success trained with 8 downtime days', () => {
      expect(calculateEarnedIncome(1, 'critical_success', 'trained', 8)).toBe(2.4);
    });
  });

  describe('formatIncomeValue', () => {
    it('should format with 2 decimal places and "gp" suffix', () => {
      expect(formatIncomeValue(0)).toBe('0.00 gp');
      expect(formatIncomeValue(1)).toBe('1.00 gp');
      expect(formatIncomeValue(10)).toBe('10.00 gp');
      expect(formatIncomeValue(100)).toBe('100.00 gp');
    });

    it('should format decimal values with 2 decimal places', () => {
      expect(formatIncomeValue(0.5)).toBe('0.50 gp');
      expect(formatIncomeValue(1.2)).toBe('1.20 gp');
      expect(formatIncomeValue(3.45)).toBe('3.45 gp');
      expect(formatIncomeValue(12.99)).toBe('12.99 gp');
    });

    it('should round to 2 decimal places if more precision provided', () => {
      expect(formatIncomeValue(1.234)).toBe('1.23 gp');
      expect(formatIncomeValue(5.678)).toBe('5.68 gp');
      expect(formatIncomeValue(0.999)).toBe('1.00 gp');
    });

    it('should format small values correctly', () => {
      expect(formatIncomeValue(0.01)).toBe('0.01 gp');
      expect(formatIncomeValue(0.05)).toBe('0.05 gp');
      expect(formatIncomeValue(0.1)).toBe('0.10 gp');
    });

    it('should format large values correctly', () => {
      expect(formatIncomeValue(400)).toBe('400.00 gp');
      expect(formatIncomeValue(1000)).toBe('1000.00 gp');
      expect(formatIncomeValue(9999.99)).toBe('9999.99 gp');
    });
  });

  describe('DC_BY_LEVEL constant', () => {
    it('should contain all levels 0-20', () => {
      for (let level = 0; level <= 20; level++) {
        expect(DC_BY_LEVEL[level]).toBeDefined();
        expect(typeof DC_BY_LEVEL[level]).toBe('number');
      }
    });

    it('should have correct values from Pathfinder 2e table', () => {
      expect(DC_BY_LEVEL[0]).toBe(14);
      expect(DC_BY_LEVEL[5]).toBe(20);
      expect(DC_BY_LEVEL[10]).toBe(27);
      expect(DC_BY_LEVEL[15]).toBe(34);
      expect(DC_BY_LEVEL[20]).toBe(40);
    });
  });

  describe('INCOME_TABLE constant', () => {
    it('should contain all levels 0-20', () => {
      for (let level = 0; level <= 20; level++) {
        expect(INCOME_TABLE[level]).toBeDefined();
        expect(typeof INCOME_TABLE[level]).toBe('object');
      }
    });

    it('should contain failure values for all levels', () => {
      for (let level = 0; level <= 20; level++) {
        expect(INCOME_TABLE[level].failure).toBeDefined();
        expect(typeof INCOME_TABLE[level].failure).toBe('number');
      }
    });

    it('should contain all proficiency ranks for all levels', () => {
      const ranks = ['trained', 'expert', 'master', 'legendary'];
      for (let level = 0; level <= 20; level++) {
        for (const rank of ranks) {
          expect(INCOME_TABLE[level][rank]).toBeDefined();
          expect(typeof INCOME_TABLE[level][rank]).toBe('number');
        }
      }
    });

    it('should have special critical success values for level 20', () => {
      const critical = INCOME_TABLE[20].critical as Record<string, number>;
      expect(critical).toBeDefined();
      expect(critical.trained).toBe(50);
      expect(critical.expert).toBe(90);
      expect(critical.master).toBe(175);
      expect(critical.legendary).toBe(300);
    });

    it('should have all values as positive numbers', () => {
      for (let level = 0; level <= 20; level++) {
        const levelData = INCOME_TABLE[level];
        for (const key in levelData) {
          if (key === 'critical') {
            const critical = levelData[key] as Record<string, number>;
            for (const rank in critical) {
              expect(critical[rank]).toBeGreaterThan(0);
            }
          } else {
            expect(levelData[key] as number).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
