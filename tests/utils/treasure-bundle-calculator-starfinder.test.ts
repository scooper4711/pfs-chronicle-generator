/**
 * Unit tests for Starfinder Credits Awarded in treasure-bundle-calculator.
 *
 * Requirements: starfinder-support 5.2, 5.3, 5.4, 5.7, 9.3, 9.4
 */

import {
  CREDITS_AWARDED_TABLE,
  getCreditsAwarded,
  calculateCurrencyGained,
  formatCurrencyValue,
  calculateTreasureBundleValue,
  getTreasureBundleValue
} from '../../scripts/utils/treasure-bundle-calculator';

describe('Starfinder Credits Awarded', () => {
  beforeAll(() => {
    (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
  });

  afterAll(() => {
    delete (globalThis as any).game;
  });

  describe('CREDITS_AWARDED_TABLE', () => {
    it('should contain exactly 10 levels', () => {
      expect(Object.keys(CREDITS_AWARDED_TABLE).length).toBe(10);
    });

    it('should have exact official SFS Guide values for all 10 levels', () => {
      expect(CREDITS_AWARDED_TABLE[1]).toBe(140);
      expect(CREDITS_AWARDED_TABLE[2]).toBe(220);
      expect(CREDITS_AWARDED_TABLE[3]).toBe(380);
      expect(CREDITS_AWARDED_TABLE[4]).toBe(640);
      expect(CREDITS_AWARDED_TABLE[5]).toBe(1000);
      expect(CREDITS_AWARDED_TABLE[6]).toBe(1500);
      expect(CREDITS_AWARDED_TABLE[7]).toBe(2200);
      expect(CREDITS_AWARDED_TABLE[8]).toBe(3000);
      expect(CREDITS_AWARDED_TABLE[9]).toBe(4400);
      expect(CREDITS_AWARDED_TABLE[10]).toBe(6000);
    });

    it('should contain only positive whole numbers', () => {
      for (const [, value] of Object.entries(CREDITS_AWARDED_TABLE)) {
        expect(value).toBeGreaterThan(0);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe('getCreditsAwarded', () => {
    it('should return correct values for all levels 1-10', () => {
      expect(getCreditsAwarded(1)).toBe(140);
      expect(getCreditsAwarded(2)).toBe(220);
      expect(getCreditsAwarded(3)).toBe(380);
      expect(getCreditsAwarded(4)).toBe(640);
      expect(getCreditsAwarded(5)).toBe(1000);
      expect(getCreditsAwarded(6)).toBe(1500);
      expect(getCreditsAwarded(7)).toBe(2200);
      expect(getCreditsAwarded(8)).toBe(3000);
      expect(getCreditsAwarded(9)).toBe(4400);
      expect(getCreditsAwarded(10)).toBe(6000);
    });

    it('should return 0 for levels below 1', () => {
      expect(getCreditsAwarded(0)).toBe(0);
      expect(getCreditsAwarded(-1)).toBe(0);
    });

    it('should return 0 for levels above 10', () => {
      expect(getCreditsAwarded(11)).toBe(0);
      expect(getCreditsAwarded(20)).toBe(0);
      expect(getCreditsAwarded(100)).toBe(0);
    });
  });

  describe('calculateCurrencyGained in Starfinder mode', () => {
    it('should return credits awarded + earned income', () => {
      // Level 1: 140 credits awarded + 10 earned = 150
      expect(calculateCurrencyGained(140, 10, 'sf2e')).toBe(150);
    });

    it('should ceil fractional results in SF mode', () => {
      // 140 + 0.5 = 140.5 → ceil → 141
      expect(calculateCurrencyGained(140, 0.5, 'sf2e')).toBe(141);
    });

    it('should return credits awarded when earned income is 0', () => {
      expect(calculateCurrencyGained(1000, 0, 'sf2e')).toBe(1000);
    });

    it('should return earned income when credits awarded is 0', () => {
      expect(calculateCurrencyGained(0, 50, 'sf2e')).toBe(50);
    });

    it('should return 0 when both values are 0', () => {
      expect(calculateCurrencyGained(0, 0, 'sf2e')).toBe(0);
    });
  });

  describe('calculateCurrencyGained PF2e backward compatibility', () => {
    it('should still round to 2 decimal places in PF2e mode', () => {
      expect(calculateCurrencyGained(10.555, 5.444, 'pf2e')).toBe(16);
      expect(calculateCurrencyGained(1.111, 2.222, 'pf2e')).toBe(3.33);
    });

    it('should default to PF2e behavior when no gameSystem is provided', () => {
      // game global is set to pf2e in beforeAll
      expect(calculateCurrencyGained(10, 5)).toBe(15);
      expect(calculateCurrencyGained(10.1, 5.05)).toBe(15.15);
    });
  });

  describe('formatCurrencyValue', () => {
    it('should format as Credits in Starfinder mode', () => {
      expect(formatCurrencyValue(1000, 'sf2e')).toBe('1000 Credits');
      expect(formatCurrencyValue(0, 'sf2e')).toBe('0 Credits');
      expect(formatCurrencyValue(140, 'sf2e')).toBe('140 Credits');
    });

    it('should format as gp in Pathfinder mode', () => {
      expect(formatCurrencyValue(10, 'pf2e')).toBe('10.00 gp');
      expect(formatCurrencyValue(10.5, 'pf2e')).toBe('10.50 gp');
      expect(formatCurrencyValue(0, 'pf2e')).toBe('0.00 gp');
    });

    it('should default to PF2e format when no gameSystem is provided', () => {
      // game global is set to pf2e in beforeAll
      expect(formatCurrencyValue(10)).toBe('10.00 gp');
    });
  });

  describe('PF2e treasure bundle behavior unchanged', () => {
    it('should still calculate treasure bundle values correctly', () => {
      expect(getTreasureBundleValue(1)).toBe(1.4);
      expect(getTreasureBundleValue(10)).toBe(60);
      expect(getTreasureBundleValue(20)).toBe(3680);
    });

    it('should still calculate treasure bundle totals correctly', () => {
      expect(calculateTreasureBundleValue(5, 1)).toBe(7);
      expect(calculateTreasureBundleValue(10, 5)).toBe(100);
    });
  });
});
