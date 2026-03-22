/**
 * Property-based tests for Earned Income Display Formatting
 * 
 * Property 8: Display Formatting
 * For any calculated earned income value, verify formatted display shows 2 decimals and "gp" suffix
 * 
 * Validates: Requirements 6.8, 7.2
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { formatIncomeValue } from '../scripts/utils/earned-income-calculator';

describe('Earned Income Display Formatting - Property Tests', () => {
  /**
   * Property 8: Display Formatting
   * 
   * For any calculated earned income value, the formatted display should show
   * the value in gold pieces with exactly 2 decimal places and a "gp" suffix.
   * 
   * Feature: earned-income-calculation, Property 8: Display Formatting
   * Validates: Requirements 6.8, 7.2
   */
  describe('Property 8: Display Formatting', () => {
    it('should format any income value with 2 decimals and gp suffix', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (incomeValue) => {
            const formatted = formatIncomeValue(incomeValue);
            
            // Should end with " gp"
            expect(formatted).toMatch(/ gp$/);
            
            // Should have exactly 2 decimal places
            const match = formatted.match(/^(\d+\.\d{2}) gp$/);
            expect(match).not.toBeNull();
            
            // The numeric part should match the input rounded to 2 decimals
            if (match) {
              const numericPart = Number.parseFloat(match[1]);
              const expectedValue = Math.round(incomeValue * 100) / 100;
              expect(numericPart).toBeCloseTo(expectedValue, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format zero correctly', () => {
      const formatted = formatIncomeValue(0);
      expect(formatted).toBe('0.00 gp');
    });

    it('should format small values correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 0.99, noNaN: true }),  // Ensure it stays below 1.00 after rounding
          (incomeValue) => {
            const formatted = formatIncomeValue(incomeValue);
            
            // Should have format "0.XX gp" where XX is between 00 and 99
            expect(formatted).toMatch(/^0\.\d{2} gp$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format large values correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 10000, noNaN: true }),
          (incomeValue) => {
            const formatted = formatIncomeValue(incomeValue);
            
            // Should have format "XXX.XX gp" or more digits
            expect(formatted).toMatch(/^\d+\.\d{2} gp$/);
            
            // Should not have scientific notation
            expect(formatted).not.toMatch(/e/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle values that need rounding', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000, noNaN: true }),
          (incomeValue) => {
            const formatted = formatIncomeValue(incomeValue);
            
            // Extract the numeric part
            const match = formatted.match(/^(\d+\.\d{2}) gp$/);
            expect(match).not.toBeNull();
            
            if (match) {
              const numericPart = Number.parseFloat(match[1]);
              
              // Should have at most 2 decimal places
              const decimalPart = match[1].split('.')[1];
              expect(decimalPart).toHaveLength(2);
              
              // Should be close to the original value (within rounding tolerance)
              expect(numericPart).toBeCloseTo(incomeValue, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format typical earned income values correctly', () => {
      // Test with typical values from the income table
      const typicalValues = [
        0.01,   // 1 cp (level 0 failure)
        0.05,   // 5 cp (level 0 trained)
        0.2,    // 2 sp (level 1 trained)
        0.5,    // 5 sp (level 3 trained)
        1,      // 1 gp (level 5 trained)
        2.5,    // 2.5 gp (level 8 trained)
        10,     // 10 gp (level 15 trained)
        30,     // 30 gp (level 20 trained)
        60,     // 60 gp (level 20 legendary critical)
        480     // 60 gp × 8 days (maximum possible)
      ];

      typicalValues.forEach((value) => {
        const formatted = formatIncomeValue(value);
        expect(formatted).toMatch(/^\d+\.\d{2} gp$/);
        
        const numericPart = Number.parseFloat(formatted.replace(' gp', ''));
        expect(numericPart).toBeCloseTo(value, 2);
      });
    });

    it('should format values after multiplication by downtime days', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 100, noNaN: true }),  // income per day
          fc.integer({ min: 0, max: 8 }),                    // downtime days
          (incomePerDay, downtimeDays) => {
            const totalIncome = incomePerDay * downtimeDays;
            const formatted = formatIncomeValue(totalIncome);
            
            // Should have correct format
            expect(formatted).toMatch(/^\d+\.\d{2} gp$/);
            
            // Extract numeric part and verify it matches the calculation
            const numericPart = Number.parseFloat(formatted.replace(' gp', ''));
            const expectedValue = Math.round(totalIncome * 100) / 100;
            expect(numericPart).toBeCloseTo(expectedValue, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never produce negative values in display', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (incomeValue) => {
            const formatted = formatIncomeValue(incomeValue);
            
            // Should not start with a minus sign
            expect(formatted).not.toMatch(/^-/);
            
            // Numeric part should be non-negative
            const numericPart = Number.parseFloat(formatted.replace(' gp', ''));
            expect(numericPart).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent formatting for the same value', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000, noNaN: true }),
          (incomeValue) => {
            const formatted1 = formatIncomeValue(incomeValue);
            const formatted2 = formatIncomeValue(incomeValue);
            
            // Should produce identical results
            expect(formatted1).toBe(formatted2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
