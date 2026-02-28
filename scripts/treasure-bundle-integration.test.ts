/**
 * Integration tests for Treasure Bundle Calculation feature
 * 
 * Tests the complete workflow:
 * 1. Enter treasure bundles → see calculated values
 * 2. Generate PDFs with correct gold values
 * 3. Verify parameter names are correct
 * 
 * Requirements: treasure-bundle-calculation 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mapToCharacterData } from './model/party-chronicle-mapper';
import { SharedFields, UniqueFields } from './model/party-chronicle-types';
import { createSharedFields, createUniqueFields, createMockActor } from './model/test-helpers';
import { calculateTreasureBundlesGp, calculateGpGained } from './utils/treasure-bundle-calculator';

// Mock the PFSChronicleGeneratorApp module to avoid Foundry dependencies
jest.mock('./PFSChronicleGeneratorApp', () => ({
  FACTION_NAMES: {
    'EA': 'Envoy\'s Alliance',
    'GA': 'Grand Archive',
    'HH': 'Horizon Hunters',
    'VS': 'Vigilant Seal',
    'RO': 'Radiant Oath',
    'VW': 'Verdant Wheel'
  }
}));

describe('Treasure Bundle Calculation - Integration Tests', () => {
  describe('Complete Workflow: Enter treasure bundles → Calculate values → Generate PDFs', () => {
    it('should calculate correct gold values for party members at different levels', () => {
      // Requirement 2.1, 2.2, 2.3, 2.4: Calculate treasure bundle gold for different levels
      const shared = createSharedFields({
        treasureBundles: 3,
        scenarioName: 'The Blackwood Lost'
      });

      // Test with characters at levels 1, 5, 10, and 20
      const testCases = [
        { level: 1, expectedTreasureBundlesGp: 4.2, name: 'Level 1 Character' },
        { level: 5, expectedTreasureBundlesGp: 30, name: 'Level 5 Character' },
        { level: 10, expectedTreasureBundlesGp: 180, name: 'Level 10 Character' },
        { level: 20, expectedTreasureBundlesGp: 11040, name: 'Level 20 Character' }
      ];

      testCases.forEach(({ level, expectedTreasureBundlesGp, name }) => {
        const unique = createUniqueFields({
          characterName: name,
          level,
          incomeEarned: 10
        });

        const actor = createMockActor(`actor-${level}`, 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        // Verify treasure_bundles_gp is calculated correctly
        expect(result.treasure_bundles_gp).toBe(expectedTreasureBundlesGp);
        
        // Verify gp_gained includes both treasure bundles and income earned
        // Requirement 3.1, 3.2, 3.3: Calculate total gold gained
        const expectedGpGained = expectedTreasureBundlesGp + 10;
        expect(result.gp_gained).toBe(expectedGpGained);
        
        // Verify income_earned is preserved
        expect(result.income_earned).toBe(10);
      });
    });

    it('should handle 0 treasure bundles correctly', () => {
      // Requirement 2.3: When treasure bundles is 0, return 0 gp
      const shared = createSharedFields({
        treasureBundles: 0
      });

      const unique = createUniqueFields({
        level: 5,
        incomeEarned: 15
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // With 0 treasure bundles, treasure_bundles_gp should be 0
      expect(result.treasure_bundles_gp).toBe(0);
      
      // gp_gained should equal income_earned when treasure bundles is 0
      // Requirement 3.4: When both are 0, pass 0 as gp_gained
      expect(result.gp_gained).toBe(15);
      expect(result.income_earned).toBe(15);
    });

    it('should handle maximum treasure bundles (10) correctly', () => {
      // Test with maximum treasure bundles
      const shared = createSharedFields({
        treasureBundles: 10
      });

      const testCases = [
        { level: 1, expectedTreasureBundlesGp: 14 },
        { level: 10, expectedTreasureBundlesGp: 600 },
        { level: 20, expectedTreasureBundlesGp: 36800 }
      ];

      testCases.forEach(({ level, expectedTreasureBundlesGp }) => {
        const unique = createUniqueFields({
          level,
          incomeEarned: 0
        });

        const actor = createMockActor(`actor-${level}`, 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        expect(result.treasure_bundles_gp).toBe(expectedTreasureBundlesGp);
        expect(result.gp_gained).toBe(expectedTreasureBundlesGp);
      });
    });

    it('should add income earned correctly to treasure bundle gold', () => {
      // Requirement 3.1, 3.2: Calculate gp_gained as treasure_bundles_gp + income_earned
      const shared = createSharedFields({
        treasureBundles: 2
      });

      const testCases = [
        { level: 5, incomeEarned: 0, expectedTreasureBundlesGp: 20, expectedGpGained: 20 },
        { level: 5, incomeEarned: 10, expectedTreasureBundlesGp: 20, expectedGpGained: 30 },
        { level: 5, incomeEarned: 25.5, expectedTreasureBundlesGp: 20, expectedGpGained: 45.5 },
        { level: 10, incomeEarned: 50, expectedTreasureBundlesGp: 120, expectedGpGained: 170 }
      ];

      testCases.forEach(({ level, incomeEarned, expectedTreasureBundlesGp, expectedGpGained }) => {
        const unique = createUniqueFields({
          level,
          incomeEarned
        });

        const actor = createMockActor(`actor-${level}-${incomeEarned}`, 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        expect(result.treasure_bundles_gp).toBe(expectedTreasureBundlesGp);
        expect(result.gp_gained).toBe(expectedGpGained);
        expect(result.income_earned).toBe(incomeEarned);
      });
    });

    it('should use correct parameter names for PDF compatibility', () => {
      // Requirement 7.1, 7.2, 7.3, 7.4, 7.5: Use exact parameter names
      const shared = createSharedFields({
        treasureBundles: 2
      });

      const unique = createUniqueFields({
        level: 5,
        incomeEarned: 10
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Verify exact parameter names exist
      expect(result).toHaveProperty('treasure_bundles_gp');
      expect(result).toHaveProperty('gp_gained');
      expect(result).toHaveProperty('income_earned');
      
      // Verify no legacy goldEarned field
      expect(result).not.toHaveProperty('goldEarned');
      
      // Verify parameter names are exactly as specified (not camelCase or other variants)
      const keys = Object.keys(result);
      expect(keys).toContain('treasure_bundles_gp');
      expect(keys).toContain('gp_gained');
      expect(keys).toContain('income_earned');
      expect(keys).not.toContain('treasureBundlesGp');
      expect(keys).not.toContain('gpGained');
      expect(keys).not.toContain('incomeEarned');
    });

    it('should handle decimal values and rounding correctly', () => {
      // Requirement 2.2, 3.2: Round to 2 decimal places
      const shared = createSharedFields({
        treasureBundles: 3
      });

      // Level 1: 1.4 gp per bundle, 3 × 1.4 = 4.2
      const unique1 = createUniqueFields({
        level: 1,
        incomeEarned: 5.55
      });

      const actor1 = createMockActor('actor-1', 'EA');
      const result1 = mapToCharacterData(shared, unique1, actor1);

      expect(result1.treasure_bundles_gp).toBe(4.2);
      // 4.2 + 5.55 = 9.75
      expect(result1.gp_gained).toBe(9.75);

      // Level 2: 2.2 gp per bundle, 3 × 2.2 = 6.6
      const unique2 = createUniqueFields({
        level: 2,
        incomeEarned: 10.444
      });

      const actor2 = createMockActor('actor-2', 'EA');
      const result2 = mapToCharacterData(shared, unique2, actor2);

      expect(result2.treasure_bundles_gp).toBe(6.6);
      // 6.6 + 10.444 = 17.044, rounded to 17.04
      expect(result2.gp_gained).toBe(17.04);
    });

    it('should handle all character levels 1-20 correctly', () => {
      // Requirement 2.4: For all character levels 1-20, use correct treasure bundle value
      const shared = createSharedFields({
        treasureBundles: 1
      });

      const expectedValues = [
        { level: 1, value: 1.4 },
        { level: 2, value: 2.2 },
        { level: 3, value: 3.8 },
        { level: 4, value: 6.4 },
        { level: 5, value: 10 },
        { level: 6, value: 15 },
        { level: 7, value: 22 },
        { level: 8, value: 30 },
        { level: 9, value: 44 },
        { level: 10, value: 60 },
        { level: 11, value: 86 },
        { level: 12, value: 124 },
        { level: 13, value: 188 },
        { level: 14, value: 274 },
        { level: 15, value: 408 },
        { level: 16, value: 620 },
        { level: 17, value: 960 },
        { level: 18, value: 1560 },
        { level: 19, value: 2660 },
        { level: 20, value: 3680 }
      ];

      expectedValues.forEach(({ level, value }) => {
        const unique = createUniqueFields({
          level,
          incomeEarned: 0
        });

        const actor = createMockActor(`actor-${level}`, 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        expect(result.treasure_bundles_gp).toBe(value);
        expect(result.gp_gained).toBe(value);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle party with mixed levels and treasure bundles', () => {
      // Realistic scenario: party with characters at different levels
      const shared = createSharedFields({
        treasureBundles: 4,
        scenarioName: 'Mixed Level Party Test'
      });

      const partyMembers = [
        { level: 3, incomeEarned: 5, expectedTreasureBundlesGp: 15.2, expectedGpGained: 20.2 },
        { level: 4, incomeEarned: 0, expectedTreasureBundlesGp: 25.6, expectedGpGained: 25.6 },
        { level: 5, incomeEarned: 10, expectedTreasureBundlesGp: 40, expectedGpGained: 50 },
        { level: 5, incomeEarned: 8, expectedTreasureBundlesGp: 40, expectedGpGained: 48 }
      ];

      partyMembers.forEach(({ level, incomeEarned, expectedTreasureBundlesGp, expectedGpGained }, index) => {
        const unique = createUniqueFields({
          characterName: `Character ${index + 1}`,
          level,
          incomeEarned
        });

        const actor = createMockActor(`actor-${index}`, 'EA');
        const result = mapToCharacterData(shared, unique, actor);

        expect(result.treasure_bundles_gp).toBe(expectedTreasureBundlesGp);
        expect(result.gp_gained).toBe(expectedGpGained);
        expect(result.income_earned).toBe(incomeEarned);
      });
    });

    it('should handle zero income earned with non-zero treasure bundles', () => {
      const shared = createSharedFields({
        treasureBundles: 5
      });

      const unique = createUniqueFields({
        level: 10,
        incomeEarned: 0
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Level 10: 5 × 60 = 300
      expect(result.treasure_bundles_gp).toBe(300);
      expect(result.gp_gained).toBe(300);
      expect(result.income_earned).toBe(0);
    });

    it('should handle zero treasure bundles with non-zero income earned', () => {
      const shared = createSharedFields({
        treasureBundles: 0
      });

      const unique = createUniqueFields({
        level: 10,
        incomeEarned: 50
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      expect(result.treasure_bundles_gp).toBe(0);
      expect(result.gp_gained).toBe(50);
      expect(result.income_earned).toBe(50);
    });

    it('should handle both zero treasure bundles and zero income earned', () => {
      // Requirement 3.4: When both are 0, pass 0 as gp_gained
      const shared = createSharedFields({
        treasureBundles: 0
      });

      const unique = createUniqueFields({
        level: 5,
        incomeEarned: 0
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      expect(result.treasure_bundles_gp).toBe(0);
      expect(result.gp_gained).toBe(0);
      expect(result.income_earned).toBe(0);
    });

    it('should handle large income earned values', () => {
      const shared = createSharedFields({
        treasureBundles: 2
      });

      const unique = createUniqueFields({
        level: 20,
        incomeEarned: 1000
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Level 20: 2 × 3680 = 7360
      expect(result.treasure_bundles_gp).toBe(7360);
      // 7360 + 1000 = 8360
      expect(result.gp_gained).toBe(8360);
      expect(result.income_earned).toBe(1000);
    });
  });

  describe('Calculation Consistency', () => {
    it('should produce consistent results for the same inputs', () => {
      const shared = createSharedFields({
        treasureBundles: 3
      });

      const unique = createUniqueFields({
        level: 7,
        incomeEarned: 15
      });

      const actor = createMockActor('actor-1', 'EA');

      // Call mapToCharacterData multiple times with same inputs
      const result1 = mapToCharacterData(shared, unique, actor);
      const result2 = mapToCharacterData(shared, unique, actor);
      const result3 = mapToCharacterData(shared, unique, actor);

      // All results should be identical
      expect(result1.treasure_bundles_gp).toBe(result2.treasure_bundles_gp);
      expect(result2.treasure_bundles_gp).toBe(result3.treasure_bundles_gp);
      
      expect(result1.gp_gained).toBe(result2.gp_gained);
      expect(result2.gp_gained).toBe(result3.gp_gained);
      
      expect(result1.income_earned).toBe(result2.income_earned);
      expect(result2.income_earned).toBe(result3.income_earned);
    });

    it('should match direct calculation using utility functions', () => {
      const treasureBundles = 4;
      const level = 8;
      const incomeEarned = 20;

      // Calculate using utility functions directly
      const expectedTreasureBundlesGp = calculateTreasureBundlesGp(treasureBundles, level);
      const expectedGpGained = calculateGpGained(expectedTreasureBundlesGp, incomeEarned);

      // Calculate using mapper
      const shared = createSharedFields({ treasureBundles });
      const unique = createUniqueFields({ level, incomeEarned });
      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Results should match
      expect(result.treasure_bundles_gp).toBe(expectedTreasureBundlesGp);
      expect(result.gp_gained).toBe(expectedGpGained);
    });
  });

  describe('Data Structure Validation', () => {
    it('should include all required fields in ChronicleData', () => {
      const shared = createSharedFields({
        treasureBundles: 2
      });

      const unique = createUniqueFields({
        level: 5,
        incomeEarned: 10
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Verify all required fields exist
      expect(result).toHaveProperty('char');
      expect(result).toHaveProperty('societyid');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('gmid');
      expect(result).toHaveProperty('event');
      expect(result).toHaveProperty('eventcode');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('xp_gained');
      expect(result).toHaveProperty('income_earned');
      expect(result).toHaveProperty('treasure_bundles_gp');
      expect(result).toHaveProperty('gp_gained');
      expect(result).toHaveProperty('gp_spent');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('reputation');
      expect(result).toHaveProperty('summary_checkbox');
      expect(result).toHaveProperty('strikeout_item_lines');
      expect(result).toHaveProperty('treasure_bundles');
    });

    it('should have correct data types for all fields', () => {
      const shared = createSharedFields({
        treasureBundles: 2
      });

      const unique = createUniqueFields({
        level: 5,
        incomeEarned: 10
      });

      const actor = createMockActor('actor-1', 'EA');
      const result = mapToCharacterData(shared, unique, actor);

      // Verify data types
      expect(typeof result.char).toBe('string');
      expect(typeof result.societyid).toBe('string');
      expect(typeof result.level).toBe('number');
      expect(typeof result.gmid).toBe('string');
      expect(typeof result.event).toBe('string');
      expect(typeof result.eventcode).toBe('string');
      expect(typeof result.date).toBe('string');
      expect(typeof result.xp_gained).toBe('number');
      expect(typeof result.income_earned).toBe('number');
      expect(typeof result.treasure_bundles_gp).toBe('number');
      expect(typeof result.gp_gained).toBe('number');
      expect(typeof result.gp_spent).toBe('number');
      expect(typeof result.notes).toBe('string');
      expect(Array.isArray(result.reputation)).toBe(true);
      expect(Array.isArray(result.summary_checkbox)).toBe(true);
      expect(Array.isArray(result.strikeout_item_lines)).toBe(true);
      expect(typeof result.treasure_bundles).toBe('string');
    });
  });
});
