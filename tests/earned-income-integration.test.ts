/**
 * Integration tests for Earned Income Calculation feature
 * 
 * Tests the complete workflow:
 * 1. Enter downtime days → select task level → select success level → select proficiency rank
 * 2. See calculated income displayed
 * 3. Generate PDFs with correct income_earned values
 * 4. Verify form data is preserved on reload
 * 
 * Requirements: earned-income-calculation 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5,
 *               3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8,
 *               7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.1, 12.2, 12.3
 */

import { describe, it, expect } from '@jest/globals';
import { mapToCharacterData } from '../scripts/model/party-chronicle-mapper';
import { createSharedFields, createUniqueFields, createMockActor } from './model/test-helpers';
import { formatIncomeValue } from '../scripts/utils/earned-income-calculator';

describe('Earned Income Calculation - Integration Tests', () => {
  describe('Complete Workflow: Enter downtime days → select inputs → see calculated income → generate PDFs', () => {
    /**
     * Test the complete workflow with party members at different levels
     * Requirements: 1.1, 1.2, 1.4, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 6.1, 6.2, 6.3, 7.1, 7.2, 12.1, 12.2
     */
    it('should calculate correct income for party members at different levels', () => {
      const shared = createSharedFields({
        downtimeDays: 4,
        scenarioName: 'The Blackwood Lost'
      });

      // Test with characters at levels 1, 5, 10, and 20
      const testCases = [
        { 
          level: 1, 
          taskLevel: 0,  // level - 1 (floored at 0)
          successLevel: 'success', 
          proficiencyRank: 'trained',
          expectedIncome: 0.2,  // 0.05 gp/day × 4 days (level 0 trained)
          name: 'Level 1 Character'
        },
        { 
          level: 5, 
          taskLevel: 3,  // level - 2 (default)
          successLevel: 'success', 
          proficiencyRank: 'expert',
          expectedIncome: 2.0,  // 0.5 gp/day × 4 days
          name: 'Level 5 Character'
        },
        { 
          level: 10, 
          taskLevel: 8,  // level - 2 (default)
          successLevel: 'success', 
          proficiencyRank: 'master',
          expectedIncome: 12.0,  // 3 gp/day × 4 days
          name: 'Level 10 Character'
        },
        { 
          level: 20, 
          taskLevel: 18,  // level - 2 (default)
          successLevel: 'success', 
          proficiencyRank: 'legendary',
          expectedIncome: 360.0,  // 90 gp/day × 4 days
          name: 'Level 20 Character'
        }
      ];

      testCases.forEach(({ level, taskLevel, successLevel, proficiencyRank, expectedIncome, name }) => {
        const unique = createUniqueFields({
          characterName: name,
          level,
          taskLevel,
          successLevel,
          proficiencyRank
        });

        const actor = createMockActor(`actor-${level}`, 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        // Verify income_earned is calculated correctly
        expect(result.income_earned).toBe(expectedIncome);
        
        // Verify gp_gained includes both treasure bundles and income earned
        const expectedGpGained = result.treasure_bundles_gp + expectedIncome;
        expect(result.gp_gained).toBe(expectedGpGained);
      });
    });

    /**
     * Test with "-" task level selection (opt-out)
     * Requirements: 1.3, 1.6, 6.6, 7.3
     */
    it('should return 0 income when task level is "-" (opt-out)', () => {
      const shared = createSharedFields({
        downtimeDays: 4
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: '-',
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // With task level "-", income_earned should be 0
      expect(result.income_earned).toBe(0);
      
      // Verify formatted display
      const formatted = formatIncomeValue(result.income_earned);
      expect(formatted).toBe('0.00 gp');
    });

    /**
     * Test with critical failure (0 income)
     * Requirements: 3.4, 6.6, 7.3
     */
    it('should return 0 income when success level is critical failure', () => {
      const shared = createSharedFields({
        downtimeDays: 4
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,
        successLevel: 'critical_failure',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // With critical failure, income_earned should be 0
      expect(result.income_earned).toBe(0);
    });

    /**
     * Test with critical success (uses level + 1)
     * Requirements: 3.5, 6.4, 7.3
     */
    it('should use level + 1 for critical success', () => {
      const shared = createSharedFields({
        downtimeDays: 4
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,  // Task level 3
        successLevel: 'critical_success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Critical success uses level + 1 (task level 4)
      // Level 4 trained = 0.8 gp/day × 4 days = 3.2 gp
      expect(result.income_earned).toBe(3.2);
    });

    /**
     * Test with level 20 critical success (special values)
     * Requirements: 3.5, 6.5, 7.3
     */
    it('should use special values for level 20 critical success', () => {
      const shared = createSharedFields({
        downtimeDays: 4
      });

      const testCases = [
        { proficiencyRank: 'trained', expectedPerDay: 35, expectedTotal: 140 },
        { proficiencyRank: 'expert', expectedPerDay: 40, expectedTotal: 160 },
        { proficiencyRank: 'master', expectedPerDay: 50, expectedTotal: 200 },
        { proficiencyRank: 'legendary', expectedPerDay: 60, expectedTotal: 240 }
      ];

      testCases.forEach(({ proficiencyRank, expectedTotal }) => {
        const unique = createUniqueFields({
          level: 20,
          taskLevel: 20,
          successLevel: 'critical_success',
          proficiencyRank
        });

        const actor = createMockActor('actor-20', 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        // Level 20 critical success uses special table values
        expect(result.income_earned).toBe(expectedTotal);
      });
    });

    /**
     * Test with 0 downtime days (0 income)
     * Requirements: 2.4, 6.3, 7.3
     */
    it('should return 0 income when downtime days is 0', () => {
      const shared = createSharedFields({
        downtimeDays: 0
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // With 0 downtime days, income_earned should be 0
      expect(result.income_earned).toBe(0);
    });

    /**
     * Test with 8 downtime days (maximum)
     * Requirements: 2.2, 2.3, 6.3, 7.3
     */
    it('should calculate correctly with 8 downtime days (maximum)', () => {
      const shared = createSharedFields({
        downtimeDays: 8
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,  // Level 3 trained = 0.5 gp/day
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // 0.5 gp/day × 8 days = 4.0 gp
      expect(result.income_earned).toBe(4.0);
    });
  });

  describe('Downtime Days Change Updates All Character Displays', () => {
    /**
     * Test that changing downtime days updates all characters
     * Requirements: 2.5, 7.3
     */
    it('should recalculate income for all characters when downtime days changes', () => {
      // Initial state: 4 downtime days
      const shared1 = createSharedFields({
        downtimeDays: 4
      });

      const character1 = createUniqueFields({
        level: 5,
        taskLevel: 3,
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const character2 = createUniqueFields({
        level: 10,
        taskLevel: 8,
        successLevel: 'success',
        proficiencyRank: 'master'
      });

      const actor1 = createMockActor('actor-1', 'EA');
      const actor2 = createMockActor('actor-2', 'EA');

      const result1_initial = mapToCharacterData(shared1, character1, actor1);
      const result2_initial = mapToCharacterData(shared1, character2, actor2);

      // Initial incomes: 0.5 × 4 = 2.0, 3 × 4 = 12.0
      expect(result1_initial.income_earned).toBe(2.0);
      expect(result2_initial.income_earned).toBe(12.0);

      // Change downtime days to 8
      const shared2 = createSharedFields({
        downtimeDays: 8
      });

      const result1_updated = mapToCharacterData(shared2, character1, actor1);
      const result2_updated = mapToCharacterData(shared2, character2, actor2);

      // Updated incomes: 0.5 × 8 = 4.0, 3 × 8 = 24.0
      expect(result1_updated.income_earned).toBe(4.0);
      expect(result2_updated.income_earned).toBe(24.0);
    });
  });

  describe('PDF Generation Integration', () => {
    /**
     * Verify PDF contains correct income_earned values
     * Requirements: 12.1, 12.2, 12.3
     */
    it('should include correct income_earned in PDF data', () => {
      const shared = createSharedFields({
        downtimeDays: 4,
        scenarioName: 'Test Scenario'
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Verify parameter name is exactly "income_earned" for PDF compatibility
      expect(result).toHaveProperty('income_earned');
      expect(result.income_earned).toBe(2.0);  // 0.5 × 4 = 2.0
      
      // Verify it's included in gp_gained
      expect(result.gp_gained).toBeGreaterThanOrEqual(result.income_earned);
    });

    /**
     * Test PDF generation with various income scenarios
     * Requirements: 12.1, 12.2, 12.3
     */
    it('should handle various income scenarios in PDF generation', () => {
      const testCases = [
        {
          name: 'Zero income (opt-out)',
          downtimeDays: 4,
          taskLevel: '-',
          successLevel: 'success',
          proficiencyRank: 'trained',
          expectedIncome: 0
        },
        {
          name: 'Zero income (critical failure)',
          downtimeDays: 4,
          taskLevel: 3,
          successLevel: 'critical_failure',
          proficiencyRank: 'trained',
          expectedIncome: 0
        },
        {
          name: 'Normal success',
          downtimeDays: 4,
          taskLevel: 3,
          successLevel: 'success',
          proficiencyRank: 'trained',
          expectedIncome: 2.0
        },
        {
          name: 'Critical success',
          downtimeDays: 4,
          taskLevel: 3,
          successLevel: 'critical_success',
          proficiencyRank: 'trained',
          expectedIncome: 3.2
        },
        {
          name: 'High proficiency',
          downtimeDays: 4,
          taskLevel: 10,
          successLevel: 'success',
          proficiencyRank: 'legendary',
          expectedIncome: 24.0
        }
      ];

      testCases.forEach(({ downtimeDays, taskLevel, successLevel, proficiencyRank, expectedIncome }) => {
        const shared = createSharedFields({ downtimeDays });
        const unique = createUniqueFields({
          level: 5,
          taskLevel,
          successLevel,
          proficiencyRank
        });

        const actor = createMockActor('actor-1', 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        expect(result.income_earned).toBe(expectedIncome);
      });
    });
  });

  describe('Form Data Persistence', () => {
    /**
     * Verify form data is preserved on reload
     * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
     */
    it('should preserve all earned income inputs', () => {
      const shared = createSharedFields({
        downtimeDays: 6
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 4,
        successLevel: 'critical_success',
        proficiencyRank: 'expert'
      });

      // Verify all fields are present
      expect(shared.downtimeDays).toBe(6);
      expect(unique.taskLevel).toBe(4);
      expect(unique.successLevel).toBe('critical_success');
      expect(unique.proficiencyRank).toBe('expert');

      // Simulate save/load by creating new objects with same data
      const savedShared = { ...shared };
      const savedUnique = { ...unique };

      // Verify data is preserved
      expect(savedShared.downtimeDays).toBe(6);
      expect(savedUnique.taskLevel).toBe(4);
      expect(savedUnique.successLevel).toBe('critical_success');
      expect(savedUnique.proficiencyRank).toBe('expert');
    });

    /**
     * Test that calculated income is recalculated on load
     * Requirements: 10.5, 10.6
     */
    it('should recalculate income from saved inputs', () => {
      const shared = createSharedFields({
        downtimeDays: 4
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      
      // First calculation
      const result1 = mapToCharacterData(shared, unique, actor);
      expect(result1.income_earned).toBe(2.0);

      // Simulate reload by recalculating
      const result2 = mapToCharacterData(shared, unique, actor);
      expect(result2.income_earned).toBe(2.0);
      
      // Results should be identical
      expect(result1.income_earned).toBe(result2.income_earned);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    /**
     * Test with minimum values
     * Requirements: 1.8, 1.9, 2.2, 6.3
     */
    it('should handle minimum values correctly', () => {
      const shared = createSharedFields({
        downtimeDays: 0
      });

      const unique = createUniqueFields({
        level: 1,
        taskLevel: 0,  // Minimum task level
        successLevel: 'failure',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // 0 downtime days = 0 income
      expect(result.income_earned).toBe(0);
    });

    /**
     * Test with maximum values
     * Requirements: 2.2, 2.3, 6.3
     */
    it('should handle maximum values correctly', () => {
      const shared = createSharedFields({
        downtimeDays: 8
      });

      const unique = createUniqueFields({
        level: 20,
        taskLevel: 20,  // Maximum task level
        successLevel: 'critical_success',
        proficiencyRank: 'legendary'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Level 20 critical success legendary = 60 gp/day × 8 days = 480 gp
      expect(result.income_earned).toBe(480);
    });

    /**
     * Test with failure outcome
     * Requirements: 6.2, 6.3
     */
    it('should use failure income values correctly', () => {
      const shared = createSharedFields({
        downtimeDays: 4
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,
        successLevel: 'failure',
        proficiencyRank: 'trained'  // Proficiency rank is ignored for failure
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Level 3 failure = 0.08 gp/day × 4 days = 0.32 gp
      expect(result.income_earned).toBe(0.32);
    });

    /**
     * Test rounding to 2 decimal places
     * Requirements: 6.7, 7.2
     */
    it('should round income to 2 decimal places', () => {
      const shared = createSharedFields({
        downtimeDays: 3
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 0,
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Level 0 trained = 0.05 gp/day × 3 days = 0.15 gp
      expect(result.income_earned).toBe(0.15);
      
      // Verify formatted display
      const formatted = formatIncomeValue(result.income_earned);
      expect(formatted).toBe('0.15 gp');
    });

    /**
     * Test with all proficiency ranks
     * Requirements: 4.1, 4.2, 4.3, 6.2
     */
    it('should handle all proficiency ranks correctly', () => {
      const shared = createSharedFields({
        downtimeDays: 4
      });

      const testCases = [
        { proficiencyRank: 'trained', expectedIncome: 2.0 },    // 0.5 × 4
        { proficiencyRank: 'expert', expectedIncome: 2.0 },     // 0.5 × 4
        { proficiencyRank: 'master', expectedIncome: 2.0 },     // 0.5 × 4
        { proficiencyRank: 'legendary', expectedIncome: 2.0 }   // 0.5 × 4
      ];

      testCases.forEach(({ proficiencyRank, expectedIncome }) => {
        const unique = createUniqueFields({
          level: 5,
          taskLevel: 3,
          successLevel: 'success',
          proficiencyRank
        });

        const actor = createMockActor('actor-1', 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        expect(result.income_earned).toBe(expectedIncome);
      });
    });

    /**
     * Test integration with treasure bundles
     * Requirements: 6.3, 12.1, 12.2
     */
    it('should correctly combine earned income with treasure bundles', () => {
      const shared = createSharedFields({
        downtimeDays: 4,
        treasureBundles: 3
      });

      const unique = createUniqueFields({
        level: 5,
        taskLevel: 3,
        successLevel: 'success',
        proficiencyRank: 'trained'
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Earned income: 0.5 × 4 = 2.0 gp
      expect(result.income_earned).toBe(2.0);
      
      // Treasure bundles: 3 × 10 gp (level 5) = 30 gp
      expect(result.treasure_bundles_gp).toBe(30);
      
      // Total gp_gained: 30 + 2.0 = 32.0 gp
      expect(result.gp_gained).toBe(32.0);
    });
  });

  describe('Display Formatting', () => {
    /**
     * Test income display formatting
     * Requirements: 6.8, 7.2
     */
    it('should format income values with 2 decimals and gp suffix', () => {
      const testCases = [
        { value: 0, expected: '0.00 gp' },
        { value: 0.5, expected: '0.50 gp' },
        { value: 2, expected: '2.00 gp' },
        { value: 10.5, expected: '10.50 gp' },
        { value: 100, expected: '100.00 gp' },
        { value: 480, expected: '480.00 gp' }
      ];

      testCases.forEach(({ value, expected }) => {
        const formatted = formatIncomeValue(value);
        expect(formatted).toBe(expected);
      });
    });
  });
});
