/**
 * Scenario Identifier Module
 *
 * Constructs a Paizo scenario identifier string from a layout ID.
 * Standard layout IDs follow the format "pfs2.sN-MM" (e.g., "pfs2.s5-18")
 * and are transformed to "PFS2E N-MM" (e.g., "PFS2E 5-18").
 *
 * Non-standard layout IDs (bounties, quests, specials) do not match the
 * season-scenario pattern and fall back to the raw suffix after "pfs2.".
 *
 * Requirements: paizo-session-reporting 5.1, 5.2, 4.8
 */

const SCENARIO_PATTERN = /^pfs2\.s(\d+-\d+)$/;

/**
 * Builds a Paizo scenario identifier from a layout ID.
 *
 * @param layoutId - The layout ID string (e.g., "pfs2.s5-18")
 * @returns The scenario identifier (e.g., "PFS2E 5-18"), or a fallback
 *          using the raw suffix for non-standard layout IDs
 *
 * Requirements: paizo-session-reporting 5.1, 5.2, 4.8
 */
export function buildScenarioIdentifier(layoutId: string): string {
  const match = layoutId.match(SCENARIO_PATTERN);
  if (match) {
    return `PFS2E ${match[1]}`;
  }

  // Fallback: strip the "pfs2." prefix if present, return as-is otherwise
  const prefix = 'pfs2.';
  if (layoutId.startsWith(prefix)) {
    return layoutId.substring(prefix.length);
  }

  return layoutId;
}
