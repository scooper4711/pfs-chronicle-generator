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
  OVERRIDE_XP: (characterId: string) => `input[name="characters.${characterId}.overrideXp"]`,
  OVERRIDE_XP_VALUE: (characterId: string) => `input[name="characters.${characterId}.overrideXpValue"]`,
  OVERRIDE_CURRENCY: (characterId: string) => `input[name="characters.${characterId}.overrideCurrency"]`,
  OVERRIDE_CURRENCY_VALUE: (characterId: string) => `input[name="characters.${characterId}.overrideCurrencyValue"]`,
  CALCULATED_XP_LABEL: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .calculated-xp-label`,
  CALCULATED_CURRENCY_LABEL: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .calculated-currency-label`,
  EARNED_INCOME_VALUE: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .earned-income-value`,
  EARNED_INCOME_SECTION: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .earned-income-section`,
  TREASURE_BUNDLES_ROW: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .treasure-bundle-row`,
  CREDITS_AWARDED_ROW: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .credits-awarded-row`,
  OVERRIDE_CURRENCY_INPUT: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .override-currency-input-row`,
  OVERRIDE_XP_INPUT: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .override-xp-input`,
  CURRENCY_OVERRIDE_COMPOSITE: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .currency-override-composite`,
  EARNED_INCOME_HIDDEN: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .earned-income-hidden`,
  CREDITS_AWARDED_DISPLAY: (characterId: string) => `.member-activity[data-character-id="${characterId}"] .credits-awarded-value`,
} as const;

/**
 * Character field selector patterns (for querySelectorAll)
 */
export const CHARACTER_FIELD_PATTERNS = {
  LEVEL_ALL: 'input[name$=".level"]',
  TASK_LEVEL_ALL: 'select[name$=".taskLevel"]',
  SUCCESS_LEVEL_ALL: 'select[name$=".successLevel"]',
  PROFICIENCY_RANK_ALL: 'select[name$=".proficiencyRank"]',
  OVERRIDE_XP_ALL: 'input[name$=".overrideXp"]',
  OVERRIDE_CURRENCY_ALL: 'input[name$=".overrideCurrency"]',
} as const;

/**
 * Button selectors
 */
export const BUTTON_SELECTORS = {
  SAVE_DATA: '#saveData',
  CLEAR_DATA: '#clearData',
  GENERATE_CHRONICLES: '#generateChronicles',
  COPY_SESSION_REPORT: '#copySessionReport',
  EXPORT_CHRONICLES: '#exportChronicles',
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
 * GM character selectors (drop zone, section, clear button, hidden actor ID input)
 */
export const GM_CHARACTER_SELECTORS = {
  DROP_ZONE: '#gmCharacterDropZone',
  SECTION: '#gmCharacterSection',
  CLEAR_BUTTON: '#clearGmCharacter',
  ACTOR_ID_INPUT: '#gmCharacterActorId',
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
  OVERRIDE_HIDDEN: 'override-hidden',
} as const;
