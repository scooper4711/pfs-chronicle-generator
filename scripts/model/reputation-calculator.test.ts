/**
 * Unit tests for reputation calculator
 * 
 * These tests validate specific examples and edge cases for the reputation
 * calculator, complementing the property-based tests.
 */

import { describe, it, expect } from '@jest/globals';
import type { SharedFields } from './party-chronicle-types';
import { calculateReputation } from './reputation-calculator';

// Helper to create minimal SharedFields for testing
function createSharedFields(
  chosenFactionReputation: number,
  reputationValues: Record<string, number>
): SharedFields {
  return {
    gmPfsNumber: '12345-01',
    scenarioName: 'Test Scenario',
    eventCode: 'TEST-001',
    eventDate: '2024-01-15',
    xpEarned: 4,
    adventureSummaryCheckboxes: [],
    strikeoutItems: [],
    treasureBundles: 2,
    downtimeDays: 8, // Calculated from xpEarned (4 * 2 = 8)
    layoutId: 'test-layout',
    seasonId: 'season-6',
    blankChroniclePath: 'path/to/blank.pdf',
    chosenFactionReputation,
    reputationValues: {
      EA: reputationValues.EA ?? 0,
      GA: reputationValues.GA ?? 0,
      HH: reputationValues.HH ?? 0,
      VS: reputationValues.VS ?? 0,
      RO: reputationValues.RO ?? 0,
      VW: reputationValues.VW ?? 0,
    }
  };
}

// Helper to create actor with chosen faction
function createActor(chosenFaction: string | null | undefined, name: string = 'Test Character') {
  return {
    name,
    system: {
      pfs: {
        currentFaction: chosenFaction
      }
    }
  };
}

describe('Reputation Calculator Unit Tests', () => {
  describe('Character with chosen faction', () => {
    it('should calculate reputation for character with chosen faction', () => {
      const shared = createSharedFields(2, { EA: 2, GA: 1 });
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // EA gets 2 (faction-specific) + 2 (chosen) = 4
      // GA gets 1 (faction-specific)
      expect(result).toEqual(["Envoy's Alliance: +4", "Grand Archive: +1"]);
    });

    it('should add chosen faction bonus to correct faction', () => {
      const shared = createSharedFields(3, { EA: 0, GA: 2, HH: 1 });
      const actor = createActor('GA');

      const result = calculateReputation(shared, actor);

      // GA gets 2 (faction-specific) + 3 (chosen) = 5
      // HH gets 1 (faction-specific)
      expect(result).toEqual(["Grand Archive: +5", "Horizon Hunters: +1"]);
    });

    it('should handle chosen faction with zero faction-specific value', () => {
      const shared = createSharedFields(2, { EA: 0, GA: 0 });
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // EA gets 0 (faction-specific) + 2 (chosen) = 2
      expect(result).toEqual(["Envoy's Alliance: +2"]);
    });
  });

  describe('Character with no chosen faction', () => {
    it('should handle character with no chosen faction (null)', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 0 });
      const actor = createActor(null);

      const result = calculateReputation(shared, actor);

      // Only EA appears with faction-specific value (no chosen bonus)
      expect(result).toEqual(["Envoy's Alliance: +3"]);
    });

    it('should handle character with undefined chosen faction', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 1 });
      const actor = createActor(undefined);

      const result = calculateReputation(shared, actor);

      // Only faction-specific values, no chosen bonus
      expect(result).toEqual(["Envoy's Alliance: +3", "Grand Archive: +1"]);
    });

    it('should handle character with empty string chosen faction', () => {
      const shared = createSharedFields(2, { EA: 2, GA: 0 });
      const actor = createActor('');

      const result = calculateReputation(shared, actor);

      // Empty string is falsy, so no chosen bonus
      expect(result).toEqual(["Envoy's Alliance: +2"]);
    });
  });

  describe('All zeros edge case', () => {
    it('should return empty array when all factions are zero', () => {
      const shared = createSharedFields(2, { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 });
      const actor = createActor(null);

      const result = calculateReputation(shared, actor);

      expect(result).toEqual([]);
    });

    it('should return empty array when chosen faction bonus is zero and no faction-specific values', () => {
      const shared = createSharedFields(0, { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 });
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // EA gets 0 (faction-specific) + 0 (chosen) = 0, filtered out
      expect(result).toEqual([]);
    });
  });

  describe('Multiple factions', () => {
    it('should handle multiple factions with various values', () => {
      const shared = createSharedFields(2, { EA: 1, GA: 2, HH: 0, VS: 3, RO: 0, VW: 1 });
      const actor = createActor('VS');

      const result = calculateReputation(shared, actor);

      // EA: 1, GA: 2, VS: 3+2=5, VW: 1
      // Sorted alphabetically
      expect(result).toEqual([
        "Envoy's Alliance: +1",
        "Grand Archive: +2",
        "Verdant Wheel: +1",
        "Vigilant Seal: +5"
      ]);
    });

    it('should handle all factions having non-zero values', () => {
      const shared = createSharedFields(1, { EA: 1, GA: 1, HH: 1, VS: 1, RO: 1, VW: 1 });
      const actor = createActor('RO');

      const result = calculateReputation(shared, actor);

      // All factions get 1, RO gets 1+1=2
      // Sorted alphabetically
      expect(result).toEqual([
        "Envoy's Alliance: +1",
        "Grand Archive: +1",
        "Horizon Hunters: +1",
        "Radiant Oath: +2",
        "Verdant Wheel: +1",
        "Vigilant Seal: +1"
      ]);
    });
  });

  describe('Invalid faction code', () => {
    it('should handle invalid faction code gracefully', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 0 });
      const actor = createActor('INVALID');

      const result = calculateReputation(shared, actor);

      // Invalid faction code is ignored, only faction-specific values used
      expect(result).toEqual(["Envoy's Alliance: +3"]);
    });

    it('should handle lowercase faction code', () => {
      const shared = createSharedFields(2, { EA: 1, GA: 0 });
      const actor = createActor('ea');

      const result = calculateReputation(shared, actor);

      // Lowercase 'ea' doesn't match 'EA', so no chosen bonus
      expect(result).toEqual(["Envoy's Alliance: +1"]);
    });
  });

  describe('Missing actor data', () => {
    it('should handle missing actor.system', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 0 });
      const actor = { name: 'Test Character' };

      const result = calculateReputation(shared, actor);

      // No chosen faction bonus, only faction-specific
      expect(result).toEqual(["Envoy's Alliance: +3"]);
    });

    it('should handle missing actor.system.pfs', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 0 });
      const actor = { name: 'Test Character', system: {} };

      const result = calculateReputation(shared, actor);

      // No chosen faction bonus, only faction-specific
      expect(result).toEqual(["Envoy's Alliance: +3"]);
    });

    it('should handle null actor', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 0 });
      const actor = null;

      const result = calculateReputation(shared, actor);

      // No chosen faction bonus, only faction-specific
      expect(result).toEqual(["Envoy's Alliance: +3"]);
    });

    it('should handle undefined actor', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 0 });
      const actor = undefined;

      const result = calculateReputation(shared, actor);

      // No chosen faction bonus, only faction-specific
      expect(result).toEqual(["Envoy's Alliance: +3"]);
    });
  });

  describe('Sorting with multiple factions', () => {
    it('should sort reputation lines alphabetically', () => {
      const shared = createSharedFields(0, { EA: 0, GA: 0, HH: 0, VS: 2, RO: 0, VW: 1 });
      const actor = createActor(null);

      const result = calculateReputation(shared, actor);

      // Verdant Wheel comes before Vigilant Seal alphabetically
      expect(result).toEqual(["Verdant Wheel: +1", "Vigilant Seal: +2"]);
    });

    it('should sort correctly with apostrophes in faction names', () => {
      const shared = createSharedFields(0, { EA: 1, GA: 2, HH: 0, VS: 0, RO: 0, VW: 0 });
      const actor = createActor(null);

      const result = calculateReputation(shared, actor);

      // "Envoy's Alliance" comes before "Grand Archive"
      expect(result).toEqual(["Envoy's Alliance: +1", "Grand Archive: +2"]);
    });

    it('should maintain consistent sorting order', () => {
      const shared = createSharedFields(1, { EA: 1, GA: 1, HH: 1, VS: 1, RO: 1, VW: 1 });
      const actor = createActor('EA');

      const result1 = calculateReputation(shared, actor);
      const result2 = calculateReputation(shared, actor);
      const result3 = calculateReputation(shared, actor);

      // All calls should produce identical results
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('Boundary values', () => {
    it('should handle maximum reputation values', () => {
      const shared = createSharedFields(9, { EA: 9, GA: 0 });
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // EA gets 9 + 9 = 18
      expect(result).toEqual(["Envoy's Alliance: +18"]);
    });

    it('should handle minimum non-zero reputation values', () => {
      const shared = createSharedFields(1, { EA: 1, GA: 0 });
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // EA gets 1 + 1 = 2
      expect(result).toEqual(["Envoy's Alliance: +2"]);
    });

    it('should handle single faction with value 1', () => {
      const shared = createSharedFields(0, { EA: 1, GA: 0 });
      const actor = createActor(null);

      const result = calculateReputation(shared, actor);

      expect(result).toEqual(["Envoy's Alliance: +1"]);
    });
  });

  describe('Formatting', () => {
    it('should format positive values with + sign', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 0 });
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // All values should have + sign
      expect(result[0]).toMatch(/\+\d+$/);
    });

    it('should use full faction names, not abbreviations', () => {
      const shared = createSharedFields(0, { EA: 1, GA: 1, HH: 1, VS: 1, RO: 1, VW: 1 });
      const actor = createActor(null);

      const result = calculateReputation(shared, actor);

      // Check that full names are used
      expect(result).toContain("Envoy's Alliance: +1");
      expect(result).toContain("Grand Archive: +1");
      expect(result).toContain("Horizon Hunters: +1");
      expect(result).toContain("Vigilant Seal: +1");
      expect(result).toContain("Radiant Oath: +1");
      expect(result).toContain("Verdant Wheel: +1");

      // Check that abbreviations are NOT used
      expect(result.join(' ')).not.toContain('EA:');
      expect(result.join(' ')).not.toContain('GA:');
      expect(result.join(' ')).not.toContain('HH:');
      expect(result.join(' ')).not.toContain('VS:');
      expect(result.join(' ')).not.toContain('RO:');
      expect(result.join(' ')).not.toContain('VW:');
    });

    it('should use consistent format: "Name: +X"', () => {
      const shared = createSharedFields(2, { EA: 3, GA: 1 });
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // Check format consistency
      for (const line of result) {
        expect(line).toMatch(/^[A-Za-z' ]+: \+\d+$/);
        expect(line.split(': ')).toHaveLength(2);
      }
    });
  });

  describe('Missing reputationValues', () => {
    it('should handle missing reputationValues object', () => {
      const shared = {
        gmPfsNumber: '12345-01',
        scenarioName: 'Test Scenario',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        adventureSummaryCheckboxes: [],
        strikeoutItems: [],
        treasureBundles: 2,
        layoutId: 'test-layout',
        seasonId: 'season-6',
        blankChroniclePath: 'path/to/blank.pdf',
        chosenFactionReputation: 2,
        // reputationValues is missing
      } as any;
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // Should handle gracefully, EA gets only chosen bonus
      expect(result).toEqual(["Envoy's Alliance: +2"]);
    });

    it('should handle partial reputationValues object', () => {
      const shared = {
        gmPfsNumber: '12345-01',
        scenarioName: 'Test Scenario',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        adventureSummaryCheckboxes: [],
        strikeoutItems: [],
        treasureBundles: 2,
        layoutId: 'test-layout',
        seasonId: 'season-6',
        blankChroniclePath: 'path/to/blank.pdf',
        chosenFactionReputation: 2,
        reputationValues: { EA: 1 } // Missing other factions
      } as any;
      const actor = createActor('EA');

      const result = calculateReputation(shared, actor);

      // EA gets 1 (faction-specific) + 2 (chosen) = 3
      expect(result).toEqual(["Envoy's Alliance: +3"]);
    });
  });
});
