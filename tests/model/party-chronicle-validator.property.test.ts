/**
 * Property-based tests for party chronicle validation functions
 * 
 * Feature: multi-line-reputation-tracking
 * These tests use fast-check to verify universal properties across many inputs
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { validateSharedFields } from './party-chronicle-validator';
import { SharedFields } from './party-chronicle-types';

describe('Reputation Validation Properties', () => {
  /**
   * Property 1: Reputation Input Validation
   * **Validates: Requirements 1.4, 1.5, 6.1, 6.2**
   * 
   * For any reputation input value (chosen faction or faction-specific),
   * the validator should accept values that are integers between 0 and 9 (inclusive),
   * and reject all other values.
   */
  describe('Property 1: Reputation Input Validation', () => {
    it('should accept all valid reputation values (0-9 integers) for chosen faction', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9 }), // Chosen faction must be > 0
          (value) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: value,
              reputationValues: {
                EA: 0,
                GA: 0,
                HH: 0,
                VS: 0,
                RO: 0,
                VW: 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            // Should not have errors about value being out of range or non-integer
            const hasRangeError = result.errors.some(e => 
              e.includes('Chosen Faction reputation must be between 0 and 9') || 
              e.includes('Chosen Faction reputation must be a whole number')
            );
            expect(hasRangeError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid reputation values (0-9 integers) for faction-specific fields', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 9 }),
          fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW'),
          (value, factionCode) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: {
                EA: factionCode === 'EA' ? value : 0,
                GA: factionCode === 'GA' ? value : 0,
                HH: factionCode === 'HH' ? value : 0,
                VS: factionCode === 'VS' ? value : 0,
                RO: factionCode === 'RO' ? value : 0,
                VW: factionCode === 'VW' ? value : 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            // Should not have errors about this faction's value being out of range or non-integer
            const factionNames: Record<string, string> = {
              'EA': 'Envoy\'s Alliance',
              'GA': 'Grand Archive',
              'HH': 'Horizon Hunters',
              'VS': 'Vigilant Seal',
              'RO': 'Radiant Oath',
              'VW': 'Verdant Wheel'
            };
            const factionName = factionNames[factionCode];
            const hasRangeError = result.errors.some(e => 
              e.includes(`${factionName} reputation must be between 0 and 9`) || 
              e.includes(`${factionName} reputation must be a whole number`)
            );
            expect(hasRangeError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid reputation values (outside 0-9 range) for chosen faction', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: 10, max: 100 }),  // Too high
            fc.integer({ min: -100, max: -1 })  // Negative
          ),
          (value) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: value,
              reputationValues: {
                EA: 0,
                GA: 0,
                HH: 0,
                VS: 0,
                RO: 0,
                VW: 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            // Should have an error about chosen faction reputation being out of range
            const hasRangeError = result.errors.some(e => 
              e.includes('Chosen Faction reputation must be between 0 and 9')
            );
            expect(hasRangeError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-integer reputation values for chosen faction', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 8.9, noNaN: true }),
          (value) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: value,
              reputationValues: {
                EA: 0,
                GA: 0,
                HH: 0,
                VS: 0,
                RO: 0,
                VW: 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            // Should have an error about chosen faction reputation being a whole number
            const hasIntegerError = result.errors.some(e => 
              e.includes('Chosen Faction reputation must be a whole number')
            );
            expect(hasIntegerError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid reputation values (outside 0-9 range) for faction-specific fields', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: 10, max: 100 }),  // Too high
            fc.integer({ min: -100, max: -1 })  // Negative
          ),
          fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW'),
          (value, factionCode) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: {
                EA: factionCode === 'EA' ? value : 0,
                GA: factionCode === 'GA' ? value : 0,
                HH: factionCode === 'HH' ? value : 0,
                VS: factionCode === 'VS' ? value : 0,
                RO: factionCode === 'RO' ? value : 0,
                VW: factionCode === 'VW' ? value : 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            // Should have an error about this faction's value being out of range
            const factionNames: Record<string, string> = {
              'EA': 'Envoy\'s Alliance',
              'GA': 'Grand Archive',
              'HH': 'Horizon Hunters',
              'VS': 'Vigilant Seal',
              'RO': 'Radiant Oath',
              'VW': 'Verdant Wheel'
            };
            const factionName = factionNames[factionCode];
            const hasRangeError = result.errors.some(e => 
              e.includes(`${factionName} reputation must be between 0 and 9`)
            );
            expect(hasRangeError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-integer reputation values for faction-specific fields', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 8.9, noNaN: true }),
          fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW'),
          (value, factionCode) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: {
                EA: factionCode === 'EA' ? value : 0,
                GA: factionCode === 'GA' ? value : 0,
                HH: factionCode === 'HH' ? value : 0,
                VS: factionCode === 'VS' ? value : 0,
                RO: factionCode === 'RO' ? value : 0,
                VW: factionCode === 'VW' ? value : 0
              }
            };
            
            const result = validateSharedFields(shared);
            
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            // Should have an error about this faction's value being a whole number
            const factionNames: Record<string, string> = {
              'EA': 'Envoy\'s Alliance',
              'GA': 'Grand Archive',
              'HH': 'Horizon Hunters',
              'VS': 'Vigilant Seal',
              'RO': 'Radiant Oath',
              'VW': 'Verdant Wheel'
            };
            const factionName = factionNames[factionCode];
            const hasIntegerError = result.errors.some(e => 
              e.includes(`${factionName} reputation must be a whole number`)
            );
            expect(hasIntegerError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Chosen Faction Reputation Non-Zero Validation
   * **Validates: Requirements 6.3**
   * 
   * For any shared fields data where chosenFactionReputation is 0,
   * the validator should reject the data and prevent chronicle generation.
   */
  describe('Property 2: Chosen Faction Reputation Non-Zero Validation', () => {
    it('should reject data when chosenFactionReputation is 0', () => {
      fc.assert(
        fc.property(
          // Generate valid values for all other fields
          fc.record({
            EA: fc.integer({ min: 0, max: 9 }),
            GA: fc.integer({ min: 0, max: 9 }),
            HH: fc.integer({ min: 0, max: 9 }),
            VS: fc.integer({ min: 0, max: 9 }),
            RO: fc.integer({ min: 0, max: 9 }),
            VW: fc.integer({ min: 0, max: 9 })
          }),
          (reputationValues) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 0, // This should cause validation to fail
              reputationValues
            };
            
            const result = validateSharedFields(shared);
            
            // Validation should fail
            expect(result.valid).toBe(false);
            
            // Should have specific error about chosen faction being greater than 0
            const hasZeroError = result.errors.some(e => 
              e.includes('Chosen Faction reputation must be greater than 0')
            );
            expect(hasZeroError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept data when chosenFactionReputation is any value from 1-9', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9 }),
          fc.record({
            EA: fc.integer({ min: 0, max: 9 }),
            GA: fc.integer({ min: 0, max: 9 }),
            HH: fc.integer({ min: 0, max: 9 }),
            VS: fc.integer({ min: 0, max: 9 }),
            RO: fc.integer({ min: 0, max: 9 }),
            VW: fc.integer({ min: 0, max: 9 })
          }),
          (chosenFactionReputation, reputationValues) => {
            const shared: Partial<SharedFields> = {
              gmPfsNumber: '12345',
              scenarioName: 'Test',
              eventCode: 'TEST-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              treasureBundles: 0,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation,
              reputationValues
            };
            
            const result = validateSharedFields(shared);
            
            // Should not have error about chosen faction being 0
            const hasZeroError = result.errors.some(e => 
              e.includes('Chosen Faction reputation must be greater than 0')
            );
            expect(hasZeroError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
