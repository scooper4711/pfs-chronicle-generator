/**
 * Bug condition exploration tests for chosen faction dropdown removal.
 *
 * These tests encode the EXPECTED (correct) behavior: all non-zero
 * reputations should appear in bonusRepEarned, including the chosen
 * faction. On UNFIXED code, these tests FAIL — confirming the bug exists.
 *
 * Bugfix: chosen-faction-dropdown-removal
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { buildSessionReport, SessionReportActor, SessionReportBuildParams } from '../../scripts/model/session-report-builder';
import { createSharedFields, createUniqueFields } from './test-helpers';
import { FACTION_NAMES } from '../../scripts/model/faction-names';

/** Arbitrary for a valid faction abbreviation code. */
const factionCodeArbitrary = fc.constantFrom(...Object.keys(FACTION_NAMES));

/** Arbitrary for reputation values keyed by faction code (0–6 per faction). */
const reputationValuesArbitrary = fc.record({
  EA: fc.integer({ min: 0, max: 6 }),
  GA: fc.integer({ min: 0, max: 6 }),
  HH: fc.integer({ min: 0, max: 6 }),
  VS: fc.integer({ min: 0, max: 6 }),
  RO: fc.integer({ min: 0, max: 6 }),
  VW: fc.integer({ min: 0, max: 6 }),
});

type ReputationValues = { EA: number; GA: number; HH: number; VS: number; RO: number; VW: number };

/**
 * Builds valid SessionReportBuildParams with a single actor.
 *
 * Mirrors the buildParams helper from the existing property tests,
 * accepting overrides for reputation values.
 */
function buildParams(overrides: {
  reputationValues?: ReputationValues;
}): SessionReportBuildParams {
  const actorId = 'actor-1';
  const actor: SessionReportActor = {
    id: actorId,
    name: 'Test Character',
    system: { pfs: { playerNumber: 12345, characterNumber: 1, currentFaction: 'EA' } },
  };

  return {
    shared: createSharedFields({
      reputationValues: overrides.reputationValues ?? { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    }),
    characters: { [actorId]: createUniqueFields() },
    partyActors: [actor],
    layoutId: 'pfs2.s5-18',
  };
}

describe('Bug Condition: Chosen Faction Excluded From Bonus Reputation', () => {

  /**
   * When a faction is chosen and has a non-zero reputation value,
   * it SHOULD appear in bonusRepEarned. On unfixed code, the chosen
   * faction is excluded by the filter in buildBonusReputation.
   *
   * Validates: Requirements 1.1, 2.1
   */
  it('chosen faction with non-zero reputation appears in bonusRepEarned', () => {
    fc.assert(
      fc.property(
        reputationValuesArbitrary,
        factionCodeArbitrary,
        (reputationValues, chosenFaction) => {
          const chosenFactionValue = reputationValues[chosenFaction as keyof ReputationValues];
          fc.pre(chosenFactionValue > 0);

          const params = buildParams({ reputationValues });
          const report = buildSessionReport(params);

          const chosenFactionFullName = FACTION_NAMES[chosenFaction];
          const chosenEntry = report.bonusRepEarned.find((b) => b.faction === chosenFactionFullName);

          expect(chosenEntry).toBeDefined();
          expect(chosenEntry!.reputation).toBe(chosenFactionValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * The total number of bonusRepEarned entries should equal the count
   * of ALL factions with non-zero reputation — not excluding the chosen
   * faction. On unfixed code, the count is short by one when the chosen
   * faction has a non-zero value.
   *
   * Validates: Requirements 1.1, 2.1
   */
  it('bonusRepEarned length equals count of all non-zero factions', () => {
    fc.assert(
      fc.property(
        reputationValuesArbitrary,
        factionCodeArbitrary,
        (reputationValues, chosenFaction) => {
          const chosenFactionValue = reputationValues[chosenFaction as keyof ReputationValues];
          fc.pre(chosenFactionValue > 0);

          const params = buildParams({ reputationValues });
          const report = buildSessionReport(params);

          const expectedCount = Object.keys(FACTION_NAMES)
            .filter((code) => (reputationValues[code as keyof ReputationValues] ?? 0) !== 0)
            .length;

          expect(report.bonusRepEarned).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/** Arbitrary for chosenFactionReputation (0–9). */
const chosenFactionReputationArbitrary = fc.integer({ min: 0, max: 9 });

/** Arbitrary for a single party member's actor data. */
const partyMemberArbitrary = fc.record({
  actorId: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
  playerNumber: fc.integer({ min: 1, max: 9999999 }),
  characterNumber: fc.integer({ min: 1, max: 99 }),
  characterName: fc.string({ minLength: 1, maxLength: 40 }),
  currentFaction: factionCodeArbitrary,
  consumeReplay: fc.boolean(),
});

describe('Preservation: Non-Bug-Condition Behavior Unchanged', () => {

  /**
   * 2a: For any reputation values with chosenFaction = '' (the default,
   * non-buggy path), factions with zero reputation are excluded from
   * bonusRepEarned. This preserves the existing zero-filtering behavior.
   *
   * Validates: Requirements 3.2
   */
  it('zero-value factions excluded from bonusRepEarned when chosenFaction is empty', () => {
    fc.assert(
      fc.property(
        reputationValuesArbitrary,
        (reputationValues) => {
          const params = buildParams({ reputationValues });
          const report = buildSessionReport(params);

          const nonZeroCodes = Object.keys(FACTION_NAMES)
            .filter((code) => (reputationValues[code as keyof ReputationValues] ?? 0) !== 0);

          expect(report.bonusRepEarned).toHaveLength(nonZeroCodes.length);

          for (const entry of report.bonusRepEarned) {
            expect(entry.reputation).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 2b: For any valid build params, report.repEarned equals
   * shared.chosenFactionReputation and each SignUp entry's repEarned
   * equals shared.chosenFactionReputation. This preserves the existing
   * chosenFactionReputation usage which is unrelated to the dropdown.
   *
   * Validates: Requirements 3.1
   */
  it('chosenFactionReputation usage preserved in repEarned fields', () => {
    fc.assert(
      fc.property(
        chosenFactionReputationArbitrary,
        reputationValuesArbitrary,
        (chosenFactionReputation, reputationValues) => {
          const params = buildParams({ reputationValues });
          params.shared.chosenFactionReputation = chosenFactionReputation;

          const report = buildSessionReport(params);

          expect(report.repEarned).toBe(chosenFactionReputation);

          for (const signUp of report.signUps) {
            expect(signUp.repEarned).toBe(chosenFactionReputation);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 2c: For any valid party of actors, SignUp entries have correct
   * isGM, orgPlayNumber, characterNumber, characterName, consumeReplay,
   * repEarned, and faction fields sourced from actor data. SignUp
   * assembly does not depend on chosenFaction.
   *
   * Validates: Requirements 3.6
   */
  it('SignUp assembly unchanged for any valid party', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(partyMemberArbitrary, {
          minLength: 1,
          maxLength: 6,
          selector: (member) => member.actorId,
        }),
        chosenFactionReputationArbitrary,
        (partyMembers, chosenFactionReputation) => {
          const partyActors: SessionReportActor[] = partyMembers.map((member) => ({
            id: member.actorId,
            name: member.characterName,
            system: {
              pfs: {
                playerNumber: member.playerNumber,
                characterNumber: member.characterNumber,
                currentFaction: member.currentFaction,
              },
            },
          }));

          const characters: Record<string, import('../../scripts/model/party-chronicle-types').UniqueFields> = {};
          for (const member of partyMembers) {
            characters[member.actorId] = createUniqueFields({
              characterName: member.characterName,
              consumeReplay: member.consumeReplay,
            });
          }

          const params: SessionReportBuildParams = {
            shared: createSharedFields({ chosenFactionReputation }),
            characters,
            partyActors,
            layoutId: 'pfs2.s5-18',
          };

          const report = buildSessionReport(params);

          expect(report.signUps).toHaveLength(partyMembers.length);

          for (let i = 0; i < partyMembers.length; i++) {
            const member = partyMembers[i];
            const signUp = report.signUps[i];

            expect(signUp.isGM).toBe(false);
            expect(signUp.orgPlayNumber).toBe(member.playerNumber);
            expect(signUp.characterNumber).toBe(member.characterNumber);
            expect(signUp.characterName).toBe(member.characterName);
            expect(signUp.consumeReplay).toBe(member.consumeReplay);
            expect(signUp.repEarned).toBe(chosenFactionReputation);
            expect(signUp.faction).toBe(FACTION_NAMES[member.currentFaction]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 2d: Every bonusRepEarned entry uses a full faction name from
   * FACTION_NAMES, not an abbreviation code. This preserves the
   * existing name-mapping behavior.
   *
   * Validates: Requirements 3.5
   */
  it('full faction names from FACTION_NAMES used in bonusRepEarned', () => {
    fc.assert(
      fc.property(
        reputationValuesArbitrary,
        (reputationValues) => {
          const params = buildParams({ reputationValues });
          const report = buildSessionReport(params);

          const validFullNames = Object.values(FACTION_NAMES);

          for (const entry of report.bonusRepEarned) {
            expect(validFullNames).toContain(entry.faction);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
