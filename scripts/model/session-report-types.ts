/**
 * Type definitions for Paizo session reporting.
 *
 * These interfaces define the JSON structure expected by browser plugins
 * that automate the Paizo.com session reporting form. The SessionReport
 * is assembled from Party Chronicle form data, serialized to JSON,
 * base64-encoded, and copied to the clipboard.
 *
 * Requirements: 4.1–4.11
 */

/**
 * A single player entry in the session report.
 *
 * Each party member produces one SignUp containing their character
 * details and the shared reputation earned for the chosen faction.
 */
export interface SignUp {
  /** Whether this sign-up is the GM's character */
  isGM: boolean;

  /** Player's Paizo organized play number from actor.system.pfs.playerNumber */
  orgPlayNumber: number;

  /** Character number under the player's org play number */
  characterNumber: number;

  /** Character name as displayed in the form */
  characterName: string;

  /** Whether the player is consuming a replay for this session */
  consumeReplay: boolean;

  /** Reputation earned, read from the shared "Chosen Faction" reputation field */
  repEarned: number;

  /** Full faction name from actor.system.pfs.currentFaction */
  faction: string;
}

/**
 * A bonus reputation entry for a non-chosen faction with a non-zero value.
 *
 * Assembled at the session level from the shared Reputation section.
 */
export interface BonusRep {
  /** Full faction name from FACTION_NAMES */
  faction: string;

  /** Non-zero reputation value for this faction */
  reputation: number;
}

/**
 * The top-level session report structure sent to Paizo.com via browser plugins.
 *
 * Assembled from the Party Chronicle form state when the GM clicks
 * "Copy Session Report".
 */
export interface SessionReport {
  /** ISO 8601 date from the Event Date field */
  gameDate: string;

  /** Constant identifying Pathfinder Society 2nd Edition */
  gameSystem: 'PFS2E';

  /** Always false — GM chronicle generation is not included */
  generateGmChronicle: false;

  /** GM's Paizo organized play number */
  gmOrgPlayNumber: number;

  /** Chosen faction reputation value from the shared Reputation section */
  repEarned: number;

  /** Reporting flag A checkbox */
  reportingA: boolean;

  /** Reporting flag B checkbox */
  reportingB: boolean;

  /** Reporting flag C checkbox */
  reportingC: boolean;

  /** Reporting flag D checkbox */
  reportingD: boolean;

  /** Scenario identifier, e.g. "PFS2E 5-18" */
  scenario: string;

  /** One entry per party member */
  signUps: SignUp[];

  /** Bonus reputation for non-chosen factions with non-zero values */
  bonusRepEarned: BonusRep[];
}
