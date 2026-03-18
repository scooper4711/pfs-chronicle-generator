/**
 * DOM Selector Constants
 * 
 * Centralized constants for all DOM selectors used in the party chronicle form.
 * Using constants instead of string literals prevents typos and provides compile-time checking.
 * 
 * Requirements: party-chronicle-form-bugs (selector typo prevention)
 */

/**
 * Shared field selectors (fields that apply to all party members)
 */
export const SHARED_FIELD_SELECTORS = {
  GM_PFS_NUMBER: '#gmPfsNumber',
  SCENARIO_NAME: '#scenarioName',
  EVENT_CODE: '#eventCode',
  EVENT_DATE: '#eventDate',
  BLANK_CHRONICLE_PATH: '#blankChroniclePath',
  CHRONICLE_PATH_GROUP: '#chroniclePathGroup',
  CHRONICLE_PATH_FILE_PICKER: '#chroniclePathFilePicker',
  SEASON: '#season',
  LAYOUT: '#layout',
  XP_EARNED: '#xpEarned',
  TREASURE_BUNDLES: '#treasureBundles',
  DOWNTIME_DAYS: '#downtimeDays',
  CHOSEN_FACTION_REPUTATION: '#chosenFactionReputation',
  REPORTING_A: '#reportingA',
  REPORTING_B: '#reportingB',
  REPORTING_C: '#reportingC',
  REPORTING_D: '#reportingD',
  CHOSEN_FACTION: '#chosenFaction',
} as const;

/**
 * Character-specific field selectors (fields that vary per character)
 * Use these as templates with character ID substitution
 */
export const CHARACTER_FIELD_SELECTORS = {
  LEVEL: (characterId: string) => `input[name="characters.${characterId}.level"]`,
  TASK_LEVEL: (characterId: string) => `select[name="characters.${characterId}.taskLevel"]`,
  SUCCESS_LEVEL: (characterId: string) => `select[name="characters.${characterId}.successLevel"]`,
  PROFICIENCY_RANK: (characterId: string) => `select[name="characters.${characterId}.proficiencyRank"]`,
  EARNED_INCOME_DISPLAY: (characterId: string) => `#earnedIncomeDisplay-${characterId}`,
  TREASURE_BUNDLE_DISPLAY: (characterId: string) => `#treasureBundleGpDisplay-${characterId}`,
  CONSUME_REPLAY: (characterId: string) => `input[name="characters.${characterId}.consumeReplay"]`,
  FACTION_DISPLAY: (characterId: string) => `#factionDisplay-${characterId}`,
} as const;

/**
 * Character field selector patterns (for querySelectorAll)
 */
export const CHARACTER_FIELD_PATTERNS = {
  LEVEL_ALL: 'input[name$=".level"]',
  TASK_LEVEL_ALL: 'select[name$=".taskLevel"]',
  SUCCESS_LEVEL_ALL: 'select[name$=".successLevel"]',
  PROFICIENCY_RANK_ALL: 'select[name$=".proficiencyRank"]',
} as const;

/**
 * Button selectors
 */
export const BUTTON_SELECTORS = {
  SAVE_DATA: '#saveData',
  CLEAR_DATA: '#clearData',
  GENERATE_CHRONICLES: '#generateChronicles',
  COPY_SESSION_REPORT: '#copySessionReport',
} as const;

/**
 * Reputation field selectors
 */
export const REPUTATION_SELECTORS = {
  EA: '#reputation-EA',
  GA: '#reputation-GA',
  HH: '#reputation-HH',
  VS: '#reputation-VS',
  RO: '#reputation-RO',
  VW: '#reputation-VW',
} as const;

/**
 * General selectors
 */
export const GENERAL_SELECTORS = {
  ALL_FORM_ELEMENTS: 'input, select, textarea',
  DOWNTIME_DAYS_DISPLAY: '#downtimeDaysDisplay',
} as const;

/**
 * CSS class names used for visibility and state management
 */
export const CSS_CLASSES = {
  CHRONICLE_PATH_VISIBLE: 'chronicle-path-visible',
  COLLAPSIBLE_SECTION: 'collapsible-section',
  COLLAPSED: 'collapsed',
} as const;
