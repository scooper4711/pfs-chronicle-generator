/**
 * Game System Detector
 *
 * Determines whether the active Foundry VTT game system is Pathfinder 2e or
 * Starfinder 2e by checking `game.system.id` and the `sf2e-anachronism` module.
 *
 * Requirements: starfinder-support 1.1, 1.2, 1.3, 1.4
 */

/** Supported game system identifiers */
export type GameSystem = 'pf2e' | 'sf2e';

/**
 * Returns the active game system.
 *
 * Returns 'sf2e' if `game.system.id === 'sf2e'` OR if the sf2e-anachronism
 * module is active. Otherwise returns 'pf2e'.
 *
 * Called at usage sites (not cached at module load) for testability.
 */
export function getGameSystem(): GameSystem {
  if ((game as any).system?.id === 'sf2e') {
    return 'sf2e';
  }

  const anachronismModule = (game as any).modules?.get?.('sf2e-anachronism');
  if (anachronismModule?.active === true) {
    return 'sf2e';
  }

  return 'pf2e';
}

/** Convenience predicate: true when running Starfinder 2e */
export function isStarfinder(): boolean {
  return getGameSystem() === 'sf2e';
}

/** Convenience predicate: true when running Pathfinder 2e */
export function isPathfinder(): boolean {
  return getGameSystem() === 'pf2e';
}

/** Maps game system IDs to layout directory root names. */
export function getGameSystemRoot(gameSystem?: GameSystem): string {
  const system = gameSystem ?? getGameSystem();
  return system === 'sf2e' ? 'sfs2' : 'pfs2';
}
