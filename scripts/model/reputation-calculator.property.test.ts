/**
 * Property-based tests for reputation calculator
 * 
 * These tests validate that the reputation calculator correctly combines
 * faction-specific and chosen faction bonuses, filters zero values, formats
 * output, and sorts results alphabetically.
 */

import fc from 'fast-check';
import type { SharedFields } from './party-chronicle-types';
import { calculateReputation } from './reputation-calculator';
import { FACTION_NAMES } from './faction-names';

// Faction abbreviations for test generation
const FACTION_ABBREVS = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'];

/**
 * Generator for valid reputation values (0-9)
 */
const reputationValueArbitrary = fc.integer({ min: 0, max: 9 });

/**
 * Generator for valid chosen faction reputation (1-9, must be > 0)
 */
const chosenFactionReputationArbitrary = fc.integer({ min: 1, max: 9 });

/**
 * Generator for faction codes
 */
const factionCodeArbitrary = fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW', null);

/**
 * Generator for shared fields with reputation values
 */
const sharedFieldsWithReputationArbitrary = fc.record({
  chosenFactionReputation: chosenFactionReputationArbitrary,
  reputationValues: fc.record({
    EA: reputationValueArbitrary,
    GA: reputationValueArbitrary,
    HH: reputationValueArbitrary,
    VS: reputationValueArbitrary,
    RO: reputationValueArbitrary,
    VW: reputationValueArbitrary,
  }),
}).map(partial => ({
  ...partial,
  // Add other required SharedFields properties with dummy values
  gmPfsNumber: '12345-01',
  scenarioName: 'Test Scenario',
  eventCode: 'TEST-001',
  eventDate: '2024-01-15',
  xpEarned: 4,
  adventureSummaryCheckboxes: [] as string[],
  strikeoutItems: [] as string[],
  treasureBundles: 2,
  layoutId: 'test-layout',
  seasonId: 'season-6',
  blankChroniclePath: 'path/to/blank.pdf',
}));

/**
 * Generator for actor with chosen faction
 */
const actorArbitrary = (chosenFaction: string | null) => fc.constant({
  name: 'Test Character',
  system: {
    pfs: {
      currentFaction: chosenFaction
    }
  }
});

describe('Reputation Calculator Property Tests', () => {
  describe('Property 6: Non-Zero Faction Inclusion', () => {
    /**
     * **Validates: Requirements 2.2**
     * 
     * For any faction with a non-zero reputation value in the shared fields,
     * that faction should appear in the calculated reputation map with its
     * corresponding value.
     * 
     * Feature: multi-line-reputation-tracking, Property 6: Non-Zero Faction Inclusion
     */
    it('should include all factions with non-zero values in output', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Check that all non-zero factions appear in output
            const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;
            for (const code of factionCodes) {
              let expectedValue = shared.reputationValues[code];
              if (code === chosenFaction) {
                expectedValue += shared.chosenFactionReputation;
              }
              
              if (expectedValue > 0) {
                const factionName = FACTION_NAMES[code];
                const found = result.some(line => line.startsWith(factionName));
                expect(found).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Zero Faction Exclusion', () => {
    /**
     * **Validates: Requirements 2.6**
     * 
     * For any faction with a final reputation value of 0 (after combining
     * faction-specific and chosen faction bonuses), that faction should NOT
     * appear in the output reputation lines.
     * 
     * Feature: multi-line-reputation-tracking, Property 7: Zero Faction Exclusion
     */
    it('should exclude all factions with zero final value from output', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Check that all zero-value factions are excluded
            const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;
            for (const code of factionCodes) {
              let expectedValue = shared.reputationValues[code];
              if (code === chosenFaction) {
                expectedValue += shared.chosenFactionReputation;
              }
              
              if (expectedValue === 0) {
                const factionName = FACTION_NAMES[code];
                const found = result.some(line => line.startsWith(factionName));
                expect(found).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Chosen Faction Bonus Addition', () => {
    /**
     * **Validates: Requirements 2.3, 2.4**
     * 
     * For any character with a valid chosen faction, the reputation calculator
     * should add the chosenFactionReputation value to that faction's total in
     * the reputation map.
     * 
     * Feature: multi-line-reputation-tracking, Property 8: Chosen Faction Bonus Addition
     */
    it('should correctly add chosen faction bonus to faction total', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW'),
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Calculate expected value for chosen faction
            const expectedValue = shared.reputationValues[chosenFaction] + shared.chosenFactionReputation;
            
            if (expectedValue > 0) {
              // Chosen faction should appear in output with combined value
              const factionName = FACTION_NAMES[chosenFaction];
              const expectedLine = `${factionName}: +${expectedValue}`;
              
              expect(result).toContain(expectedLine);
            } else {
              // If combined value is 0, faction should not appear
              const factionName = FACTION_NAMES[chosenFaction];
              const found = result.some(line => line.startsWith(factionName));
              expect(found).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.3, 2.4**
     * 
     * For any character with no chosen faction (null), the reputation calculator
     * should not add the chosen faction bonus to any faction.
     * 
     * Feature: multi-line-reputation-tracking, Property 8: Chosen Faction Bonus Addition (null case)
     */
    it('should handle null chosen faction correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          async (shared) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: null } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Check that each faction appears with only its faction-specific value
            const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;
            for (const code of factionCodes) {
              const factionValue = shared.reputationValues[code];
              
              if (factionValue > 0) {
                const factionName = FACTION_NAMES[code];
                const expectedLine = `${factionName}: +${factionValue}`;
                expect(result).toContain(expectedLine);
              } else {
                const factionName = FACTION_NAMES[code];
                const found = result.some(line => line.startsWith(factionName));
                expect(found).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.3, 2.4**
     * 
     * For any character with an undefined chosen faction, the reputation calculator
     * should not add the chosen faction bonus to any faction.
     * 
     * Feature: multi-line-reputation-tracking, Property 8: Chosen Faction Bonus Addition (undefined case)
     */
    it('should handle undefined chosen faction correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          async (shared) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: undefined } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Check that each faction appears with only its faction-specific value
            const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;
            for (const code of factionCodes) {
              const factionValue = shared.reputationValues[code];
              
              if (factionValue > 0) {
                const factionName = FACTION_NAMES[code];
                const expectedLine = `${factionName}: +${factionValue}`;
                expect(result).toContain(expectedLine);
              } else {
                const factionName = FACTION_NAMES[code];
                const found = result.some(line => line.startsWith(factionName));
                expect(found).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Reputation Line Formatting', () => {
    /**
     * **Validates: Requirements 2.5, 2.7, 8.2**
     * 
     * For any faction with non-zero reputation, the output reputation line
     * should match the format "{Faction_Full_Name}: {+/-}{value}" where the
     * faction name comes from the FACTION_NAMES constant.
     * 
     * Feature: multi-line-reputation-tracking, Property 9: Reputation Line Formatting
     */
    it('should format all reputation lines correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Check format: "{Faction_Full_Name}: {+/-}{value}"
            const formatRegex = /^[A-Za-z' ]+: [+-]\d+$/;
            for (const line of result) {
              expect(line).toMatch(formatRegex);
              
              // Verify faction name is from FACTION_NAMES
              const colonIndex = line.indexOf(':');
              const factionName = line.substring(0, colonIndex);
              const isValidFaction = Object.values(FACTION_NAMES).includes(factionName);
              expect(isValidFaction).toBe(true);
              
              // Verify sign is present (+ or -)
              const valuePartMatch = line.match(/: ([+-]\d+)$/);
              expect(valuePartMatch).not.toBeNull();
              if (valuePartMatch) {
                const valuePart = valuePartMatch[1];
                expect(valuePart).toMatch(/^[+-]\d+$/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.5, 2.7, 8.2**
     * 
     * Verify that positive values are formatted with a '+' sign prefix.
     * 
     * Feature: multi-line-reputation-tracking, Property 9: Reputation Line Formatting (positive values)
     */
    it('should format positive reputation values with + sign', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // All reputation values in this test are positive (0-9 range)
            // So all output lines should have '+' sign
            for (const line of result) {
              expect(line).toMatch(/: \+\d+$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.5, 2.7, 8.2**
     * 
     * Verify that each reputation line uses the correct full faction name
     * from the FACTION_NAMES constant, not abbreviations.
     * 
     * Feature: multi-line-reputation-tracking, Property 9: Reputation Line Formatting (faction names)
     */
    it('should use full faction names from FACTION_NAMES constant', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Verify each line starts with a valid full faction name
            const validFactionNames = Object.values(FACTION_NAMES);
            for (const line of result) {
              const colonIndex = line.indexOf(':');
              const factionName = line.substring(0, colonIndex);
              
              expect(validFactionNames).toContain(factionName);
              
              // Verify it's NOT an abbreviation (EA, GA, etc.)
              const abbreviations = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'];
              expect(abbreviations).not.toContain(factionName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.5, 2.7, 8.2**
     * 
     * Verify that the format is consistent: faction name, colon, space, sign, value.
     * No extra spaces or formatting variations.
     * 
     * Feature: multi-line-reputation-tracking, Property 9: Reputation Line Formatting (consistency)
     */
    it('should maintain consistent formatting across all lines', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            for (const line of result) {
              // Verify format: "Name: +X" or "Name: -X"
              // Exactly one colon, exactly one space after colon
              const parts = line.split(': ');
              expect(parts).toHaveLength(2);
              
              const [factionName, valuePart] = parts;
              
              // Faction name should not be empty
              expect(factionName.length).toBeGreaterThan(0);
              
              // Value part should be sign + digits
              expect(valuePart).toMatch(/^[+-]\d+$/);
              
              // No extra spaces
              expect(line).not.toMatch(/  /); // No double spaces
              expect(line).not.toMatch(/^ /); // No leading space
              expect(line).not.toMatch(/ $/); // No trailing space
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Reputation Line Sorting', () => {
    /**
     * **Validates: Requirements 2.8**
     * 
     * For any set of reputation lines, the output array should be sorted
     * alphabetically by faction full name.
     * 
     * Feature: multi-line-reputation-tracking, Property 10: Reputation Line Sorting
     */
    it('should sort reputation lines alphabetically by faction name', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Check that result is sorted alphabetically
            // Compare each consecutive pair of lines
            for (let i = 1; i < result.length; i++) {
              const prev = result[i - 1];
              const curr = result[i];
              
              // Extract faction names (everything before the colon)
              const prevName = prev.substring(0, prev.indexOf(':'));
              const currName = curr.substring(0, curr.indexOf(':'));
              
              // Verify alphabetical order
              expect(prevName.localeCompare(currName)).toBeLessThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.8**
     * 
     * Verify that sorting is case-insensitive and handles special characters
     * correctly (e.g., apostrophes in "Envoy's Alliance").
     * 
     * Feature: multi-line-reputation-tracking, Property 10: Reputation Line Sorting (special characters)
     */
    it('should handle special characters in faction names when sorting', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            const result = calculateReputation(shared, actor);
            
            // Verify that the result is sorted correctly
            // Create a sorted copy and compare
            const sortedResult = [...result].sort((a, b) => {
              const aName = a.substring(0, a.indexOf(':'));
              const bName = b.substring(0, b.indexOf(':'));
              return aName.localeCompare(bName);
            });
            
            expect(result).toEqual(sortedResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.8**
     * 
     * Verify that sorting is stable and consistent across multiple calls
     * with the same input.
     * 
     * Feature: multi-line-reputation-tracking, Property 10: Reputation Line Sorting (stability)
     */
    it('should produce consistent sorting across multiple calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsWithReputationArbitrary,
          factionCodeArbitrary,
          async (shared, chosenFaction) => {
            const actor = { 
              name: 'Test Character',
              system: { pfs: { currentFaction: chosenFaction } } 
            };
            
            // Call calculateReputation multiple times with same input
            const result1 = calculateReputation(shared, actor);
            const result2 = calculateReputation(shared, actor);
            const result3 = calculateReputation(shared, actor);
            
            // All results should be identical
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
