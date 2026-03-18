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

/**
 * Minimal actor shape required by the session report builder.
 *
 * Extends the base PartyActor with PFS-specific fields needed to
 * populate SignUp entries (orgPlayNumber, characterNumber, currentFaction).
 */
export interface SessionReportActor {
  id: string;
  name: string;
  system?: {
    pfs?: {
      orgPlayNumber?: number;
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
}

/**
 * Builds a SignUp entry for a single party member.
 *
 * @param actor - Party actor with PFS data
 * @param characterFields - Per-character unique fields (name, consumeReplay)
 * @param chosenFactionReputation - Shared reputation value for the chosen faction
 * @returns A SignUp entry for the session report
 *
 * Requirements: paizo-session-reporting 4.9, 4.10
 */
function buildSignUp(
  actor: SessionReportActor,
  characterFields: UniqueFields,
  chosenFactionReputation: number
): SignUp {
  const currentFaction = actor.system?.pfs?.currentFaction ?? '';
  const factionFullName = FACTION_NAMES[currentFaction] ?? currentFaction;

  return {
    isGM: false,
    orgPlayNumber: actor.system?.pfs?.orgPlayNumber ?? 0,
    characterNumber: actor.system?.pfs?.characterNumber ?? 0,
    characterName: characterFields.characterName,
    consumeReplay: characterFields.consumeReplay,
    repEarned: chosenFactionReputation,
    faction: factionFullName,
  };
}

/**
 * Assembles the bonusRepEarned array from shared reputation values.
 *
 * Includes an entry for each faction that has a non-zero reputation value
 * and is not the chosen faction. Uses full faction names from FACTION_NAMES.
 *
 * @param reputationValues - Faction-keyed reputation values from shared fields
 * @param chosenFaction - Abbreviation code of the chosen faction to exclude
 * @returns Array of BonusRep entries
 *
 * Requirements: paizo-session-reporting 4.11, 9.1–9.6
 */
function buildBonusReputation(
  reputationValues: SharedFields['reputationValues'],
  chosenFaction: string
): BonusRep[] {
  const factionCodes = Object.keys(FACTION_NAMES);

  return factionCodes
    .filter((code) => code !== chosenFaction && (reputationValues[code as keyof typeof reputationValues] ?? 0) !== 0)
    .map((code) => ({
      faction: FACTION_NAMES[code],
      reputation: reputationValues[code as keyof typeof reputationValues] ?? 0,
    }));
}

/**
 * Assembles a SessionReport from form data, party actors, and layout metadata.
 *
 * Constant fields (gameSystem, generateGmChronicle, repEarned) are set to their
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
  const { shared, characters, partyActors, layoutId } = params;

  const signUps = partyActors
    .filter((actor) => characters[actor.id] !== undefined)
    .map((actor) => buildSignUp(actor, characters[actor.id], shared.chosenFactionReputation));

  return {
    gameDate: shared.eventDate,
    gameSystem: 'PFS2E',
    generateGmChronicle: false,
    gmOrgPlayNumber: Number.parseInt(shared.gmPfsNumber, 10) || 0,
    repEarned: 0,
    reportingA: shared.reportingA,
    reportingB: shared.reportingB,
    reportingC: shared.reportingC,
    reportingD: shared.reportingD,
    scenario: buildScenarioIdentifier(layoutId),
    signUps,
    bonusRepEarned: buildBonusReputation(shared.reputationValues, shared.chosenFaction),
  };
}
