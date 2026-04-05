/**
 * Type definitions for Party Chronicle Filling feature
 * 
 * This module defines the data structures used for filling out chronicle sheets
 * for all party members at once through the Party sheet interface.
 */

/**
 * Shared fields that apply to all party members
 * These fields are entered once and propagated to all characters
 */
export interface SharedFields {
  /** GM's PFS number */
  gmPfsNumber: string;
  
  /** Name of the scenario/adventure */
  scenarioName: string;
  
  /** Event code for the session */
  eventCode: string;
  
  /** Date the event took place */
  eventDate: string;
  
  /** XP earned by all characters */
  xpEarned: number;
  
  /** Adventure summary checkboxes selected (layout-dependent) */
  adventureSummaryCheckboxes: string[];
  
  /** Items to strike out on chronicles (layout-dependent) */
  strikeoutItems: string[];
  
  /** Treasure bundles (integer from 0-10) */
  treasureBundles: number;
  
  /** Selected layout ID for chronicle generation */
  layoutId: string;
  
  /** Selected season ID */
  seasonId: string;
  
  /** Path to the blank chronicle PDF */
  blankChroniclePath: string;
  
  /** Reputation bonus for character's chosen faction (0-9) */
  chosenFactionReputation: number; // multi-line-reputation-tracking 1.2, 1.4, 4.2
  
  /** Faction-specific reputation bonuses (0-9 each) */
  reputationValues: { // multi-line-reputation-tracking 1.3, 1.5, 4.1
    EA: number;
    GA: number;
    HH: number;
    VS: number;
    RO: number;
    VW: number;
  };
  
  /** Number of downtime days granted by the scenario (0-8) */
  downtimeDays: number;

  /** Reporting flag A checkbox (paizo-session-reporting 10.1, 1.2) */
  reportingA: boolean;

  /** Reporting flag B checkbox (paizo-session-reporting 10.1, 1.2) */
  reportingB: boolean;

  /** Reporting flag C checkbox (paizo-session-reporting 10.1, 1.2) */
  reportingC: boolean;

  /** Reporting flag D checkbox (paizo-session-reporting 10.1, 1.2) */
  reportingD: boolean;
}

/**
 * Character-specific fields that are unique per party member
 * These fields are entered separately for each character
 * 
 * Note: The goldEarned field has been removed as of the Treasure Bundle Calculation feature.
 * Gold earned is now calculated automatically at PDF generation time using the formula:
 * treasure_bundles_gp = treasureBundles × getTreasureBundleValue(level)
 * gp_gained = treasure_bundles_gp + incomeEarned
 * 
 * This prevents data inconsistency where stored goldEarned values don't match the
 * calculated values. The calculation is performed in party-chronicle-mapper.ts using
 * functions from utils/treasure-bundle-calculator.ts.
 */
export interface UniqueFields {
  /** Character name (editable, may differ from actor name) */
  characterName: string;
  
  /** Society ID in format "playerNumber-characterNumber" */
  societyId: string;
  
  /** Character level */
  level: number;
  
  /** Task level for Earn Income (number 0-20 or "-" for opt-out) */
  taskLevel: number | string;
  
  /** Success level for Earn Income check (critical_failure, failure, success, or critical_success) */
  successLevel: string;
  
  /** Proficiency rank in the skill used (trained, expert, master, or legendary) */
  proficiencyRank: string;
  
  /** Calculated earned income in gold pieces (stored for display, recalculated for PDF) */
  earnedIncome: number;
  
  /** Gold spent during the adventure */
  goldSpent: number;
  
  /** Additional notes for this character */
  notes: string;

  /** Whether the player is consuming a replay for this session (paizo-session-reporting 10.2, 3.2) */
  consumeReplay: boolean;
}

/**
 * Complete party chronicle data structure
 * Combines shared fields with per-character unique fields
 */
export interface PartyChronicleData {
  /** Shared fields that apply to all characters */
  shared: SharedFields;
  
  /** Character-specific fields indexed by actor ID */
  characters: {
    [actorId: string]: UniqueFields;
  };
}

/**
 * Party member information for display in the UI
 */
export interface PartyMember {
  /** Actor ID */
  id: string;
  
  /** Character name */
  name: string;
  
  /** Character image path */
  img: string;
  
  /** Character level */
  level: number;
  
  /** Society ID */
  societyId: string;

  /** Faction full name from actor.system.pfs.currentFaction */
  faction: string;
}

/**
 * Expanded form data structure containing shared fields and per-character fields.
 * Returned by extractFormData() and consumed by chronicle generation/validation.
 */
export interface ChronicleFormData {
  shared: SharedFields;
  characters: Record<string, UniqueFields>;
}

/** A season entry from the layout store. */
export interface LayoutSeason {
  id: string;
  name: string;
}

/** A layout entry from the layout store. */
export interface LayoutEntry {
  id: string;
  description: string;
}

/**
 * Context data prepared for the Handlebars template
 */
export interface PartyChronicleContext {
  /** List of party members */
  partyMembers: PartyMember[];
  
  /** Shared fields context */
  shared: Partial<SharedFields>;
  
  /** Available seasons for selection */
  seasons: LayoutSeason[];
  
  /** Layouts available in the selected season */
  layoutsInSeason: LayoutEntry[];
  
  /** Currently selected season ID */
  selectedSeasonId: string;
  
  /** Currently selected layout ID */
  selectedLayoutId: string;
  
  /** Previously saved party chronicle data */
  savedData: PartyChronicleData | null;
  
  /** Whether a zip archive of chronicles is stored on the Party actor (chronicle-export 2.2, 2.3) */
  hasChronicleZip: boolean;

  /** Action buttons for the form */
  buttons: Array<{ type: string; icon: string; label: string }>;
}

/**
 * Result of validation checks
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Array of error messages (empty if valid) */
  errors: string[];
}

/**
 * Result of chronicle generation for a single character
 */
export interface GenerationResult {
  /** Character's actor ID */
  characterId: string;
  
  /** Character name for display */
  characterName: string;
  
  /** Whether generation succeeded for this character */
  success: boolean;
  
  /** Error message if generation failed */
  error?: string;

  /** Raw PDF bytes when generation succeeds (used for zip archive) */
  pdfBytes?: Uint8Array;
}
