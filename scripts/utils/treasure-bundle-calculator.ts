/**
 * Treasure Bundle Calculator
 * 
 * Provides lookup tables and calculation functions for converting treasure bundles
 * (shared party rewards) into character-specific currency values based on character level.
 * 
 * Source: Pathfinder Society Guide (PF2e values; Starfinder values TBD)
 */

/**
 * Lookup table mapping character levels (1-20) to treasure bundle values in currency.
 * 
 * Each treasure bundle is worth a different amount depending on the character's level.
 * These values are from the official Pathfinder Society Guide and must be exact.
 * TODO: Add Starfinder treasure bundle values when Starfinder support is added.
 */
export const TREASURE_BUNDLE_VALUES: Record<number, number> = {
  1: 1.4,
  2: 2.2,
  3: 3.8,
  4: 6.4,
  5: 10,
  6: 15,
  7: 22,
  8: 30,
  9: 44,
  10: 60,
  11: 86,
  12: 124,
  13: 188,
  14: 274,
  15: 408,
  16: 620,
  17: 960,
  18: 1560,
  19: 2660,
  20: 3680
};

/**
 * Gets the treasure bundle value for a specific character level.
 * 
 * @param level - Character level (1-20)
 * @returns Treasure bundle value in gold pieces, or 0 if level is out of range
 * 
 * Requirements: treasure-bundle-calculation 1.1, 1.2, 1.3, 1.4
 */
export function getTreasureBundleValue(level: number): number {
  if (level < 1 || level > 20) {
    return 0;
  }
  return TREASURE_BUNDLE_VALUES[level] || 0;
}

/**
 * Calculates the total gold from treasure bundles for a character.
 * 
 * Formula: treasure bundles × treasure bundle value for character level
 * Result is rounded to 2 decimal places.
 * 
 * @param treasureBundles - Number of treasure bundles (typically 0-10)
 * @param characterLevel - Character level (1-20)
 * @returns Total gold from treasure bundles, rounded to 2 decimal places
 * 
 * Requirements: treasure-bundle-calculation 2.1, 2.2, 2.3, 2.4
 */
export function calculateTreasureBundleValue(
  treasureBundles: number,
  characterLevel: number
): number {
  if (treasureBundles === 0) {
    return 0;
  }
  
  const bundleValue = getTreasureBundleValue(characterLevel);
  const totalGold = treasureBundles * bundleValue;
  
  return Math.round(totalGold * 100) / 100;
}

/**
 * Calculates the total currency gained (treasure bundles + income earned).
 * 
 * Formula: treasure_bundle_value + income_earned
 * Result is rounded to 2 decimal places.
 * 
 * @param treasureBundleValue - Currency from treasure bundles
 * @param incomeEarned - Currency from income earned
 * @returns Total currency gained, rounded to 2 decimal places
 * 
 * Requirements: treasure-bundle-calculation 4.1, 4.2
 */
export function calculateCurrencyGained(
  treasureBundleValue: number,
  incomeEarned: number
): number {
  const totalGold = treasureBundleValue + incomeEarned;
  return Math.round(totalGold * 100) / 100;
}

/**
 * Formats a currency value for display with 2 decimal places and unit suffix.
 * Currently hardcoded to "gp" for PF2e; will be system-aware when Starfinder is added.
 * 
 * @param value - Currency value to format
 * @returns Formatted string (e.g., "10.50 gp")
 */
export function formatCurrencyValue(value: number): string {
  return `${value.toFixed(2)} gp`;
}
