/**
 * Unit tests for currency formatter
 *
 * Tests formatting for both game systems, zero values, and edge cases.
 *
 * Requirements: starfinder-support 3.1, 3.2
 */

import { describe, it, expect } from '@jest/globals';
import { formatCurrency, getCurrencyLabel, getZeroCurrencyDisplay } from '../../scripts/utils/currency-formatter';

describe('Currency Formatter', () => {
  describe('formatCurrency', () => {
    describe('Pathfinder (pf2e)', () => {
      it('should format whole numbers with 2 decimal places and gp suffix', () => {
        expect(formatCurrency(10, 'pf2e')).toBe('10.00 gp');
        expect(formatCurrency(100, 'pf2e')).toBe('100.00 gp');
      });

      it('should format decimal values with 2 decimal places', () => {
        expect(formatCurrency(10.5, 'pf2e')).toBe('10.50 gp');
        expect(formatCurrency(10.55, 'pf2e')).toBe('10.55 gp');
      });

      it('should round to 2 decimal places', () => {
        expect(formatCurrency(10.555, 'pf2e')).toBe('10.55 gp');
        expect(formatCurrency(10.556, 'pf2e')).toBe('10.56 gp');
      });

      it('should format zero', () => {
        expect(formatCurrency(0, 'pf2e')).toBe('0.00 gp');
      });

      it('should format small values', () => {
        expect(formatCurrency(0.01, 'pf2e')).toBe('0.01 gp');
        expect(formatCurrency(0.05, 'pf2e')).toBe('0.05 gp');
      });

      it('should format large values', () => {
        expect(formatCurrency(18400, 'pf2e')).toBe('18400.00 gp');
      });
    });

    describe('Starfinder (sf2e)', () => {
      it('should format as whole numbers with Credits suffix', () => {
        expect(formatCurrency(105, 'sf2e')).toBe('105 Credits');
        expect(formatCurrency(1000, 'sf2e')).toBe('1000 Credits');
      });

      it('should round decimal values to whole numbers', () => {
        expect(formatCurrency(105.4, 'sf2e')).toBe('105 Credits');
        expect(formatCurrency(105.5, 'sf2e')).toBe('106 Credits');
        expect(formatCurrency(105.9, 'sf2e')).toBe('106 Credits');
      });

      it('should format zero', () => {
        expect(formatCurrency(0, 'sf2e')).toBe('0 Credits');
      });

      it('should format large values', () => {
        expect(formatCurrency(6000, 'sf2e')).toBe('6000 Credits');
      });
    });
  });

  describe('getCurrencyLabel', () => {
    it('should return gp for Pathfinder', () => {
      expect(getCurrencyLabel('pf2e')).toBe('gp');
    });

    it('should return Credits for Starfinder', () => {
      expect(getCurrencyLabel('sf2e')).toBe('Credits');
    });
  });

  describe('getZeroCurrencyDisplay', () => {
    it('should return 0.00 gp for Pathfinder', () => {
      expect(getZeroCurrencyDisplay('pf2e')).toBe('0.00 gp');
    });

    it('should return 0 Credits for Starfinder', () => {
      expect(getZeroCurrencyDisplay('sf2e')).toBe('0 Credits');
    });
  });
});
