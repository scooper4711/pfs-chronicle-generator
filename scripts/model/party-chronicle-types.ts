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
  chosenFactionReputation: number;
  
  /** Faction-specific reputation bonuses (0-9 each) */
  reputationValues: {
    EA: number;
    GA: number;
    HH: number;
    VS: number;
    RO: number;
    VW: number;
  };
}

/**
 * Character-specific fields that are unique per party member
 * These fields are entered separately for each character
 */
export interface UniqueFields {
  /** Character name (editable, may differ from actor name) */
  characterName: string;
  
  /** Society ID in format "playerNumber-characterNumber" */
  societyId: string;
  
  /** Character level */
  level: number;
  
  /** Income earned during the adventure */
  incomeEarned: number;
  
  /** Gold earned (calculated from treasure bundles + income) */
  goldEarned: number;
  
  /** Gold spent during the adventure */
  goldSpent: number;
  
  /** Additional notes for this character */
  notes: string;
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
  seasons: Array<{ id: string; name: string }>;
  
  /** Layouts available in the selected season */
  layoutsInSeason: Array<{ id: string; description: string }>;
  
  /** Currently selected season ID */
  selectedSeasonId: string;
  
  /** Currently selected layout ID */
  selectedLayoutId: string;
  
  /** Previously saved party chronicle data */
  savedData: PartyChronicleData | null;
  
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
}
