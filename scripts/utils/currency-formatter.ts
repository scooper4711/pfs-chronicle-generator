/**
 * Currency Formatter
 *
 * Formats numeric currency values into display strings using the appropriate
 * unit label for the active game system. Pure functions — no global access.
 *
 * Requirements: starfinder-support 3.1, 3.2
 */

import type { GameSystem } from './game-system-detector';

/**
 * Formats a currency value for display using the system-appropriate unit.
 *
 * Pathfinder: "10.50 gp" (2 decimal places)
 * Starfinder: "105 Credits" (whole number, no decimals)
 *
 * @param value - Numeric currency value
 * @param gameSystem - The active game system
 * @returns Formatted display string
 */
export function formatCurrency(value: number, gameSystem: GameSystem): string {
  if (gameSystem === 'sf2e') {
    return `${Math.round(value)} Credits`;
  }
  return `${value.toFixed(2)} gp`;
}

/**
 * Returns the currency unit label for the active game system.
 *
 * Pathfinder: "gp"
 * Starfinder: "Credits"
 */
export function getCurrencyLabel(gameSystem: GameSystem): string {
  return gameSystem === 'sf2e' ? 'Credits' : 'gp';
}

/**
 * Returns the zero-value display string for the active game system.
 *
 * Pathfinder: "0.00 gp"
 * Starfinder: "0 Credits"
 */
export function getZeroCurrencyDisplay(gameSystem: GameSystem): string {
  return gameSystem === 'sf2e' ? '0 Credits' : '0.00 gp';
}
