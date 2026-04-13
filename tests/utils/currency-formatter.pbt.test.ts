/**
 * Property-based tests for currency formatter
 *
 * Feature: starfinder-support, Property 2: Pathfinder Currency Format
 * Feature: starfinder-support, Property 3: Starfinder Currency Format
 *
 * **Validates: Requirements 3.1, 3.2**
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { formatCurrency } from '../../scripts/utils/currency-formatter';

describe('Currency Formatter Property-Based Tests', () => {
  // Feature: starfinder-support, Property 2: Pathfinder Currency Format
  // **Validates: Requirements 3.1**
  describe('Property 2: Pathfinder Currency Format', () => {
    it('should match <number with 2 decimals> gp for any non-negative number', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000, noNaN: true }),
          (value) => {
            const result = formatCurrency(value, 'pf2e');
            expect(result).toMatch(/^\d+\.\d{2} gp$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve the numeric value to 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000, noNaN: true }),
          (value) => {
            const result = formatCurrency(value, 'pf2e');
            const numericPart = parseFloat(result.replace(' gp', ''));
            const expected = parseFloat(value.toFixed(2));
            expect(numericPart).toBeCloseTo(expected, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: starfinder-support, Property 3: Starfinder Currency Format
  // **Validates: Requirements 3.2**
  describe('Property 3: Starfinder Currency Format', () => {
    it('should match <whole number> Credits for any non-negative number', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000, noNaN: true }),
          (value) => {
            const result = formatCurrency(value, 'sf2e');
            expect(result).toMatch(/^\d+ Credits$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should contain no decimal point in the numeric part', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1_000_000, noNaN: true }),
          (value) => {
            const result = formatCurrency(value, 'sf2e');
            const numericPart = result.replace(' Credits', '');
            expect(numericPart).not.toContain('.');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
