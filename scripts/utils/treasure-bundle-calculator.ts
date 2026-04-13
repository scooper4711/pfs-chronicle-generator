/**
 * Treasure Bundle Calculator
 * 
 * Provides lookup tables and calculation functions for converting treasure bundles
 * (shared party rewards) into character-specific currency values based on character level.
 * In Starfinder mode, a flat Credits Awarded table replaces treasure bundles.
 * 
 * Requirements: treasure-bundle-calculation 1.1-4.2
 *               starfinder-support 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 3.4, 3.6
 */

import type { GameSystem } from './game-system-detector';
import { getGameSystem } from './game-system-detector';
import { formatCurrency } from './currency-formatter';

/**
 * Starfinder Credits Awarded by character level (SFS Guide, levels 1-10 only).
 * Starfinder Society does not use treasure bundles — each character receives a flat
 * Credits award determined entirely by their level.
 *
 * Requirements: starfinder-support 5.2, 5.3, 5.4
 */
export const CREDITS_AWARDED_TABLE: Record<number, number> = {
  1: 140,
  2: 220,
  3: 380,
  4: 640,
  5: 1000,
  6: 1500,
  7: 2200,
  8: 3000,
  9: 4400,
  10: 6000,
};

/**
 * Gets the Credits Awarded for a Starfinder character level.
 *
 * @param level - Character level (1-10 for Starfinder Society)
 * @returns Credits awarded, or 0 for levels outside 1-10
 *
 * Requirements: starfinder-support 5.2, 5.3, 5.5
 */
export function getCreditsAwarded(level: number): number {
  return CREDITS_AWARDED_TABLE[level] ?? 0;
}

/**
 * Lookup table mapping character levels (1-20) to treasure bundle values in currency.
 * 
 * Each treasure bundle is worth a different amount depending on the character's level.
 * These values are from the official Pathfinder Society Guide and must be exact.
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
 * Calculates the total currency gained (treasure bundles/credits awarded + income earned).
 * 
 * In Pathfinder mode the first parameter is the treasure bundle value; in Starfinder mode
 * the caller passes the Credits Awarded value instead. The function simply adds the two
 * values and rounds appropriately for the active system.
 * 
 * @param treasureBundleValue - Currency from treasure bundles (PF2e) or credits awarded (SF2e)
 * @param incomeEarned - Currency from income earned
 * @param gameSystem - Active game system (defaults to detected system)
 * @returns Total currency gained
 * 
 * Requirements: treasure-bundle-calculation 4.1, 4.2, starfinder-support 5.6, 5.7
 */
export function calculateCurrencyGained(
  treasureBundleValue: number,
  incomeEarned: number,
  gameSystem?: GameSystem
): number {
  const system = gameSystem ?? getGameSystem();
  const total = treasureBundleValue + incomeEarned;

  if (system === 'sf2e') {
    return Math.ceil(total);
  }

  return Math.round(total * 100) / 100;
}

/**
 * Formats a currency value for display using the system-appropriate format.
 * Delegates to the shared Currency_Formatter.
 * 
 * @param value - Currency value to format
 * @param gameSystem - Active game system (defaults to detected system)
 * @returns Formatted string (e.g., "10.50 gp" or "105 Credits")
 *
 * Requirements: starfinder-support 3.4, 3.6
 */
export function formatCurrencyValue(value: number, gameSystem?: GameSystem): string {
  const system = gameSystem ?? getGameSystem();
  return formatCurrency(value, system);
}
