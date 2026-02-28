import {
  TREASURE_BUNDLE_VALUES,
  getTreasureBundleValue,
  calculateTreasureBundlesGp,
  calculateGpGained,
  formatGoldValue
} from './treasure-bundle-calculator';

describe('treasure-bundle-calculator', () => {
  describe('TREASURE_BUNDLE_VALUES', () => {
    it('should contain all 20 character levels', () => {
      expect(Object.keys(TREASURE_BUNDLE_VALUES).length).toBe(20);
      for (let level = 1; level <= 20; level++) {
        expect(TREASURE_BUNDLE_VALUES[level]).toBeDefined();
      }
    });

    it('should have correct values for each level', () => {
      expect(TREASURE_BUNDLE_VALUES[1]).toBe(1.4);
      expect(TREASURE_BUNDLE_VALUES[2]).toBe(2.2);
      expect(TREASURE_BUNDLE_VALUES[3]).toBe(3.8);
      expect(TREASURE_BUNDLE_VALUES[4]).toBe(6.4);
      expect(TREASURE_BUNDLE_VALUES[5]).toBe(10);
      expect(TREASURE_BUNDLE_VALUES[6]).toBe(15);
      expect(TREASURE_BUNDLE_VALUES[7]).toBe(22);
      expect(TREASURE_BUNDLE_VALUES[8]).toBe(30);
      expect(TREASURE_BUNDLE_VALUES[9]).toBe(44);
      expect(TREASURE_BUNDLE_VALUES[10]).toBe(60);
      expect(TREASURE_BUNDLE_VALUES[11]).toBe(86);
      expect(TREASURE_BUNDLE_VALUES[12]).toBe(124);
      expect(TREASURE_BUNDLE_VALUES[13]).toBe(188);
      expect(TREASURE_BUNDLE_VALUES[14]).toBe(274);
      expect(TREASURE_BUNDLE_VALUES[15]).toBe(408);
      expect(TREASURE_BUNDLE_VALUES[16]).toBe(620);
      expect(TREASURE_BUNDLE_VALUES[17]).toBe(960);
      expect(TREASURE_BUNDLE_VALUES[18]).toBe(1560);
      expect(TREASURE_BUNDLE_VALUES[19]).toBe(2660);
      expect(TREASURE_BUNDLE_VALUES[20]).toBe(3680);
    });
  });

  describe('getTreasureBundleValue', () => {
    it('should return correct values for all levels 1-20', () => {
      expect(getTreasureBundleValue(1)).toBe(1.4);
      expect(getTreasureBundleValue(5)).toBe(10);
      expect(getTreasureBundleValue(10)).toBe(60);
      expect(getTreasureBundleValue(15)).toBe(408);
      expect(getTreasureBundleValue(20)).toBe(3680);
    });

    it('should return 0 for level below 1', () => {
      expect(getTreasureBundleValue(0)).toBe(0);
      expect(getTreasureBundleValue(-1)).toBe(0);
      expect(getTreasureBundleValue(-10)).toBe(0);
    });

    it('should return 0 for level above 20', () => {
      expect(getTreasureBundleValue(21)).toBe(0);
      expect(getTreasureBundleValue(25)).toBe(0);
      expect(getTreasureBundleValue(100)).toBe(0);
    });
  });

  describe('calculateTreasureBundlesGp', () => {
    it('should calculate correct gold for various treasure bundle counts and levels', () => {
      // Level 1: 1.4 gp per bundle
      expect(calculateTreasureBundlesGp(1, 1)).toBe(1.4);
      expect(calculateTreasureBundlesGp(5, 1)).toBe(7);
      expect(calculateTreasureBundlesGp(10, 1)).toBe(14);

      // Level 5: 10 gp per bundle
      expect(calculateTreasureBundlesGp(1, 5)).toBe(10);
      expect(calculateTreasureBundlesGp(3, 5)).toBe(30);
      expect(calculateTreasureBundlesGp(10, 5)).toBe(100);

      // Level 10: 60 gp per bundle
      expect(calculateTreasureBundlesGp(1, 10)).toBe(60);
      expect(calculateTreasureBundlesGp(2, 10)).toBe(120);

      // Level 20: 3680 gp per bundle
      expect(calculateTreasureBundlesGp(1, 20)).toBe(3680);
      expect(calculateTreasureBundlesGp(5, 20)).toBe(18400);
    });

    it('should return 0 when treasure bundles is 0', () => {
      expect(calculateTreasureBundlesGp(0, 1)).toBe(0);
      expect(calculateTreasureBundlesGp(0, 10)).toBe(0);
      expect(calculateTreasureBundlesGp(0, 20)).toBe(0);
    });

    it('should return 0 for invalid character levels', () => {
      expect(calculateTreasureBundlesGp(5, 0)).toBe(0);
      expect(calculateTreasureBundlesGp(5, -1)).toBe(0);
      expect(calculateTreasureBundlesGp(5, 21)).toBe(0);
      expect(calculateTreasureBundlesGp(5, 100)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // Level 2: 2.2 gp per bundle
      // 3 bundles = 6.6 gp (already 1 decimal place)
      expect(calculateTreasureBundlesGp(3, 2)).toBe(6.6);

      // Level 1: 1.4 gp per bundle
      // 7 bundles = 9.8 gp (already 1 decimal place)
      expect(calculateTreasureBundlesGp(7, 1)).toBe(9.8);
    });
  });

  describe('calculateGpGained', () => {
    it('should calculate total gold gained correctly', () => {
      expect(calculateGpGained(10, 5)).toBe(15);
      expect(calculateGpGained(100, 50)).toBe(150);
      expect(calculateGpGained(1.4, 2.6)).toBe(4);
    });

    it('should handle zero values', () => {
      expect(calculateGpGained(0, 0)).toBe(0);
      expect(calculateGpGained(10, 0)).toBe(10);
      expect(calculateGpGained(0, 5)).toBe(5);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateGpGained(10.555, 5.444)).toBe(16);
      expect(calculateGpGained(1.111, 2.222)).toBe(3.33);
      expect(calculateGpGained(10.1, 5.05)).toBe(15.15);
    });

    it('should handle large values', () => {
      expect(calculateGpGained(18400, 100)).toBe(18500);
      expect(calculateGpGained(3680, 250.5)).toBe(3930.5);
    });
  });

  describe('formatGoldValue', () => {
    it('should format gold values with 2 decimal places and gp suffix', () => {
      expect(formatGoldValue(10)).toBe('10.00 gp');
      expect(formatGoldValue(10.5)).toBe('10.50 gp');
      expect(formatGoldValue(10.55)).toBe('10.55 gp');
    });

    it('should handle zero', () => {
      expect(formatGoldValue(0)).toBe('0.00 gp');
    });

    it('should handle large values', () => {
      expect(formatGoldValue(18400)).toBe('18400.00 gp');
      expect(formatGoldValue(3680.5)).toBe('3680.50 gp');
    });

    it('should format values with more than 2 decimal places', () => {
      expect(formatGoldValue(10.555)).toBe('10.55 gp');
      expect(formatGoldValue(10.556)).toBe('10.56 gp');
    });
  });
});
