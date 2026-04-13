/**
 * Scenario Identifier Module
 *
 * Constructs a Paizo scenario identifier string from a layout ID.
 * Standard layout IDs follow the format "pfs2.sN-MM" or "sfs2.sN-MM"
 * and are transformed to "PFS2E N-MM" or "SFS2E N-MM" respectively.
 *
 * Non-standard layout IDs (bounties, quests, specials) do not match the
 * season-scenario pattern and fall back to the raw suffix after the prefix.
 *
 * Requirements: paizo-session-reporting 5.1, 5.2, 4.8
 * Requirements: starfinder-support 8.3, 8.4
 */

const SF_SCENARIO_PATTERN = /^sfs2\.s(\d+-\d+)$/;
const PF_SCENARIO_PATTERN = /^pfs2\.s(\d+-\d+)$/;

/**
 * Builds a Paizo scenario identifier from a layout ID.
 *
 * Checks Starfinder pattern first, then Pathfinder pattern, then falls
 * back to stripping known prefixes.
 *
 * @param layoutId - The layout ID string (e.g., "pfs2.s5-18" or "sfs2.s1-01")
 * @returns The scenario identifier (e.g., "PFS2E 5-18" or "SFS2E 1-01"),
 *          or a fallback using the raw suffix for non-standard layout IDs
 *
 * Requirements: paizo-session-reporting 5.1, 5.2, 4.8
 * Requirements: starfinder-support 8.3, 8.4
 */
export function buildScenarioIdentifier(layoutId: string): string {
  const sfMatch = SF_SCENARIO_PATTERN.exec(layoutId);
  if (sfMatch) {
    return `SFS2E ${sfMatch[1]}`;
  }

  const pfMatch = PF_SCENARIO_PATTERN.exec(layoutId);
  if (pfMatch) {
    return `PFS2E ${pfMatch[1]}`;
  }

  // Fallback: strip known prefixes if present, return as-is otherwise
  if (layoutId.startsWith('sfs2.')) {
    return layoutId.substring(5);
  }
  if (layoutId.startsWith('pfs2.')) {
    return layoutId.substring(5);
  }

  return layoutId;
}
