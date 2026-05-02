/**
 * Session Report Builder Module
 *
 * Assembles a SessionReport JSON object from Party Chronicle form data,
 * party actor information, and layout metadata. The assembled report is
 * consumed by the serializer for clipboard export.
 *
 * Requirements: paizo-session-reporting 4.1–4.11, 9.1–9.6
 */

import { FACTION_NAMES } from './faction-names.js';
import type { SharedFields, UniqueFields } from './party-chronicle-types.js';
import { buildScenarioIdentifier } from './scenario-identifier.js';
import type { BonusRep, SessionReport, SignUp } from './session-report-types.js';
import { getGameSystem } from '../utils/game-system-detector.js';
import { calculateTreasureBundleValue, calculateCurrencyGained, getCreditsAwarded } from '../utils/treasure-bundle-calculator.js';
import { calculateEarnedIncome } from '../utils/earned-income-calculator.js';

/**
 * Minimal actor shape required by the session report builder.
 *
 * Extends the base PartyActor with PFS-specific fields needed to
 * populate SignUp entries (playerNumber, characterNumber, currentFaction).
 */
export interface SessionReportActor {
  id: string;
  name: string;
  system?: {
    pfs?: {
      playerNumber?: number;
      characterNumber?: number;
      currentFaction?: string;
    };
  };
}

/**
 * Parameters for building a session report.
 *
 * Groups the four data sources needed to assemble the full SessionReport:
 * shared form fields, per-character unique fields, party actor data, and
 * the selected layout ID for scenario identification.
 */
export interface SessionReportBuildParams {
  shared: SharedFields;
  characters: Record<string, UniqueFields>;
  partyActors: SessionReportActor[];
  layoutId: string;
  /** Optional Date for deterministic testing of time-rounding logic */
  now?: Date;
  /** Optional GM character actor for GM credit SignUp entry */
  gmCharacterActor?: SessionReportActor;
  /** Optional GM character unique fields (required when gmCharacterActor is provided) */
  gmCharacterFields?: UniqueFields;
}

/**
 * Calculates XP and currency values for a character, applying slow track
 * halving and overrides when active.
 *
 * Override values bypass slow track halving — when an override is active,
 * the override value is used as-is. Only non-overridden values are halved.
 *
 * @param shared - Shared fields for calculated defaults
 * @param characterFields - Per-character unique fields with override and slow track flags
 * @returns Object with xpEarned and currencyGained values
 *
 * Requirements: gm-override-values 7.1, 7.2, 7.3, slow-track 7.2, 7.3, 7.5, 7.6
 */
function calculateCharacterRewards(
  shared: SharedFields,
  characterFields: UniqueFields
): { xpEarned: number; currencyGained: number } {
  const gameSystem = getGameSystem();
  const isSlowTrack = characterFields.slowTrack === true;

  // XP: override > slow track halving > standard (slow-track 7.2, 7.3)
  const xpEarned = characterFields.overrideXp === true
    ? characterFields.overrideXpValue
    : isSlowTrack ? shared.xpEarned / 2 : shared.xpEarned;

  // Currency: override > slow track halving > standard (slow-track 7.5, 7.6)
  let currencyGained: number;
  if (characterFields.overrideCurrency === true) {
    currencyGained = characterFields.overrideCurrencyValue;
  } else {
    const incomeEarned = calculateEarnedIncome(
      characterFields.taskLevel,
      characterFields.successLevel,
      characterFields.proficiencyRank,
      shared.downtimeDays,
      gameSystem
    );
    const treasureBundleValue = gameSystem === 'sf2e'
      ? getCreditsAwarded(characterFields.level)
      : calculateTreasureBundleValue(shared.treasureBundles, characterFields.level);
    const standardCurrency = calculateCurrencyGained(treasureBundleValue, incomeEarned, gameSystem);
    currencyGained = isSlowTrack ? standardCurrency / 2 : standardCurrency;
  }

  return { xpEarned, currencyGained };
}

/**
 * Builds a SignUp entry for a single party member.
 *
 * @param actor - Party actor with PFS data
 * @param characterFields - Per-character unique fields (name, consumeReplay, overrides, slowTrack)
 * @param shared - Shared fields for calculated defaults and override logic
 * @returns A SignUp entry for the session report
 *
 * Requirements: paizo-session-reporting 4.9, 4.10, gm-override-values 7.1, 7.2, 7.3, slow-track 7.1, 7.4
 */
function buildSignUp(
  actor: SessionReportActor,
  characterFields: UniqueFields,
  shared: SharedFields
): SignUp {
  const currentFaction = actor.system?.pfs?.currentFaction ?? '';
  const factionFullName = FACTION_NAMES[currentFaction] ?? currentFaction;
  const rewards = calculateCharacterRewards(shared, characterFields);
  const isSlowTrack = characterFields.slowTrack === true;

  return {
    isGM: false,
    orgPlayNumber: actor.system?.pfs?.playerNumber ?? 0,
    characterNumber: actor.system?.pfs?.characterNumber ?? 0,
    characterName: characterFields.characterName,
    consumeReplay: characterFields.consumeReplay,
    slowTrack: characterFields.slowTrack,
    repEarned: isSlowTrack ? shared.chosenFactionReputation / 2 : shared.chosenFactionReputation,
    faction: factionFullName,
    xpEarned: rewards.xpEarned,
    currencyGained: rewards.currencyGained,
  };
}

/**
 * Builds a SignUp entry for the GM character with `isGM: true`.
 *
 * @param actor - GM character actor with PFS data
 * @param characterFields - GM character's unique fields (name, consumeReplay, overrides, slowTrack)
 * @param shared - Shared fields for calculated defaults and override logic
 * @returns A SignUp entry with isGM set to true
 *
 * Requirements: gm-character-party-sheet 6.1, 6.2, 6.3, gm-override-values 7.1, 7.2, 7.3, slow-track 7.1, 7.4
 */
function buildGmSignUp(
  actor: SessionReportActor,
  characterFields: UniqueFields,
  shared: SharedFields
): SignUp {
  const currentFaction = actor.system?.pfs?.currentFaction ?? '';
  const factionFullName = FACTION_NAMES[currentFaction] ?? currentFaction;
  const rewards = calculateCharacterRewards(shared, characterFields);
  const isSlowTrack = characterFields.slowTrack === true;

  return {
    isGM: true,
    orgPlayNumber: actor.system?.pfs?.playerNumber ?? 0,
    characterNumber: actor.system?.pfs?.characterNumber ?? 0,
    characterName: characterFields.characterName,
    consumeReplay: characterFields.consumeReplay,
    slowTrack: characterFields.slowTrack,
    repEarned: isSlowTrack ? shared.chosenFactionReputation / 2 : shared.chosenFactionReputation,
    faction: factionFullName,
    xpEarned: rewards.xpEarned,
    currencyGained: rewards.currencyGained,
  };
}

/**
 * Assembles the bonusRepEarned array from shared reputation values.
 *
 * Includes an entry for each faction that has a non-zero reputation value.
 * Uses full faction names from FACTION_NAMES.
 *
 * @param reputationValues - Faction-keyed reputation values from shared fields
 * @returns Array of BonusRep entries
 *
 * Requirements: paizo-session-reporting 4.11, 9.1–9.6
 */
function buildBonusReputation(
  reputationValues: SharedFields['reputationValues']
): BonusRep[] {
  type ReputationKey = keyof typeof reputationValues;
  const factionCodes = Object.keys(FACTION_NAMES);

  return factionCodes.reduce<BonusRep[]>((entries, code) => {
    const reputation = reputationValues[code as ReputationKey] ?? 0;
    if (reputation !== 0) {
      entries.push({ faction: FACTION_NAMES[code], reputation });
    }
    return entries;
  }, []);
}

/**
 * Builds an ISO 8601 datetime string from an event date and current time.
 *
 * Appends the current time (rounded to the nearest half-hour) to the
 * event date string. Rounding rules:
 * - minutes >= 45 → round up to next hour with :00
 * - minutes >= 15 → round to :30
 * - otherwise → round to :00
 *
 * @param eventDate - Date string in YYYY-MM-DD format
 * @param now - Current time (defaults to new Date())
 * @returns ISO 8601 datetime string: YYYY-MM-DDTHH:MM:00+00:00
 *
 * Requirements: paizo-session-reporting 2.3
 */
export function buildGameDateTime(eventDate: string, now?: Date): string {
  const currentTime = now ?? new Date();
  let hours = currentTime.getUTCHours();
  const minutes = currentTime.getUTCMinutes();

  let roundedMinutes: number;
  if (minutes >= 45) {
    roundedMinutes = 0;
    hours = (hours + 1) % 24;
  } else if (minutes >= 15) {
    roundedMinutes = 30;
  } else {
    roundedMinutes = 0;
  }

  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(roundedMinutes).padStart(2, '0');

  return `${eventDate}T${hoursStr}:${minutesStr}:00+00:00`;
}

/**
 * Assembles a SessionReport from form data, party actors, and layout metadata.
 *
 * Constant fields (gameSystem, generateGmChronicle) are set to their
 * fixed values. Variable fields are mapped from shared fields, per-character
 * unique fields, and actor PFS data. The scenario identifier is constructed
 * from the layout ID.
 *
 * @param params - Build parameters grouping all data sources
 * @returns The assembled SessionReport ready for serialization
 *
 * Requirements: paizo-session-reporting 4.1–4.11, 9.1–9.6
 */
export function buildSessionReport(params: SessionReportBuildParams): SessionReport {
  const { shared, characters, partyActors, layoutId, gmCharacterActor, gmCharacterFields } = params;
  const gameSystem = getGameSystem() === 'sf2e' ? 'SFS2E' : 'PFS2E';

  const signUps = partyActors
    .filter((actor) => characters[actor.id] !== undefined)
    .map((actor) => buildSignUp(actor, characters[actor.id], shared));

  if (gmCharacterActor && gmCharacterFields) {
    signUps.push(buildGmSignUp(gmCharacterActor, gmCharacterFields, shared));
  }

  return {
    gameDate: buildGameDateTime(shared.eventDate, params.now),
    gameSystem,
    generateGmChronicle: signUps.some((s) => s.isGM),
    gmOrgPlayNumber: Number.parseInt(shared.gmPfsNumber, 10) || 0,
    repEarned: shared.chosenFactionReputation,
    reportingA: shared.reportingA,
    reportingB: shared.reportingB,
    reportingC: shared.reportingC,
    reportingD: shared.reportingD,
    scenario: buildScenarioIdentifier(layoutId),
    signUps,
    bonusRepEarned: buildBonusReputation(shared.reputationValues),
  };
}
