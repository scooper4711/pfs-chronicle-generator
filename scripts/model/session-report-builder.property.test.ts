/**
 * Property-based tests for the session report builder.
 *
 * Validates correctness properties of buildSessionReport using fast-check
 * to generate arbitrary valid form states and verify invariants hold.
 *
 * Feature: paizo-session-reporting
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { buildSessionReport, SessionReportActor, SessionReportBuildParams } from './session-report-builder';
import { createSharedFields, createUniqueFields } from './test-helpers';
import { FACTION_NAMES } from './faction-names';
import type { UniqueFields } from './party-chronicle-types';

/** Arbitrary for a valid faction abbreviation code. */
const factionCodeArbitrary = fc.constantFrom(...Object.keys(FACTION_NAMES));

/** Arbitrary for reputation values keyed by faction code. */
const reputationValuesArbitrary = fc.record({
  EA: fc.integer({ min: 0, max: 6 }),
  GA: fc.integer({ min: 0, max: 6 }),
  HH: fc.integer({ min: 0, max: 6 }),
  VS: fc.integer({ min: 0, max: 6 }),
  RO: fc.integer({ min: 0, max: 6 }),
  VW: fc.integer({ min: 0, max: 6 }),
});

/** Arbitrary for a standard layout ID in "pfs2.sN-MM" format. */
const layoutIdArbitrary = fc.tuple(
  fc.integer({ min: 1, max: 99 }),
  fc.integer({ min: 1, max: 99 })
).map(([season, scenario]) => `pfs2.s${season}-${String(scenario).padStart(2, '0')}`);

/** Arbitrary for a GM PFS number string. */
const gmPfsNumberArbitrary = fc.integer({ min: 1, max: 9999999 }).map(String);

/** Arbitrary for an ISO 8601 date string (YYYY-MM-DD). */
const eventDateArbitrary = fc.tuple(
  fc.integer({ min: 2000, max: 2099 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 })
).map(([y, m, d]) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
);

/**
 * Builds valid SessionReportBuildParams from generated values.
 *
 * Creates a minimal but complete set of params with one actor so that
 * buildSessionReport can execute without errors.
 */
function buildParams(overrides: {
  eventDate?: string;
  gmPfsNumber?: string;
  reportingA?: boolean;
  reportingB?: boolean;
  reportingC?: boolean;
  reportingD?: boolean;
  reputationValues?: { EA: number; GA: number; HH: number; VS: number; RO: number; VW: number };
  layoutId?: string;
}): SessionReportBuildParams {
  const actorId = 'actor-1';
  const actor: SessionReportActor = {
    id: actorId,
    name: 'Test Character',
    system: { pfs: { playerNumber: 12345, characterNumber: 1, currentFaction: 'EA' } },
  };

  return {
    shared: createSharedFields({
      eventDate: overrides.eventDate ?? '2025-01-15',
      gmPfsNumber: overrides.gmPfsNumber ?? '12345',
      reportingA: overrides.reportingA ?? false,
      reportingB: overrides.reportingB ?? false,
      reportingC: overrides.reportingC ?? false,
      reportingD: overrides.reportingD ?? false,
      reputationValues: overrides.reputationValues ?? { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    }),
    characters: { [actorId]: createUniqueFields() },
    partyActors: [actor],
    layoutId: overrides.layoutId ?? 'pfs2.s5-18',
  };
}

describe('Session Report Builder Properties', () => {
  describe('Property 2: Session report constant fields invariant', () => {

    /**
     * For any valid form state, the assembled SessionReport always has
     * gameSystem === "PFS2E", generateGmChronicle === false, and
     * top-level repEarned === 0.
     *
     * Feature: paizo-session-reporting, Property 2: Session report constant fields invariant
     * Validates: Requirements 4.3, 4.4, 4.6
     */
    it('gameSystem is always "PFS2E"', () => {
      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          reputationValuesArbitrary,
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, repA, repB, repC, repD, repValues, layoutId) => {
            const params = buildParams({
              eventDate,
              gmPfsNumber,
              reportingA: repA,
              reportingB: repB,
              reportingC: repC,
              reportingD: repD,
              reputationValues: repValues,
              layoutId,
            });

            const report = buildSessionReport(params);

            expect(report.gameSystem).toBe('PFS2E');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: paizo-session-reporting, Property 2: Session report constant fields invariant
     * Validates: Requirements 4.3, 4.4, 4.6
     */
    it('generateGmChronicle is always false', () => {
      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          reputationValuesArbitrary,
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, repValues, layoutId) => {
            const params = buildParams({
              eventDate,
              gmPfsNumber,
              reputationValues: repValues,
              layoutId,
            });

            const report = buildSessionReport(params);

            expect(report.generateGmChronicle).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: paizo-session-reporting, Property 2: Session report constant fields invariant
     * Validates: Requirements 4.3, 4.4, 4.6
     */
    it('top-level repEarned equals chosenFactionReputation', () => {
      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          reputationValuesArbitrary,
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, repValues, layoutId) => {
            const params = buildParams({
              eventDate,
              gmPfsNumber,
              reputationValues: repValues,
              layoutId,
            });

            const report = buildSessionReport(params);

            expect(report.repEarned).toBe(params.shared.chosenFactionReputation);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: SignUp entry correctness', () => {

    /** Arbitrary for a single party member's actor data. */
    const partyMemberArbitrary = fc.record({
      actorId: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
      playerNumber: fc.integer({ min: 1, max: 9999999 }),
      characterNumber: fc.integer({ min: 1, max: 99 }),
      characterName: fc.string({ minLength: 1, maxLength: 40 }),
      currentFaction: factionCodeArbitrary,
      consumeReplay: fc.boolean(),
    });

    /**
     * For any valid party of 1–6 members, each with unique actor IDs,
     * the assembled signUps array has exactly one entry per party member,
     * and each entry has isGM === false, the correct playerNumber and
     * characterNumber from the actor, the correct characterName, the
     * correct consumeReplay flag, repEarned equal to the shared chosen
     * faction reputation value, and faction equal to the full faction
     * name from FACTION_NAMES.
     *
     * Feature: paizo-session-reporting, Property 4: SignUp entry correctness
     * Validates: Requirements 4.9, 4.10
     */
    it('signUps array has one correct entry per party member', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(partyMemberArbitrary, {
            minLength: 1,
            maxLength: 6,
            selector: (member) => member.actorId,
          }),
          fc.integer({ min: 0, max: 9 }),
          layoutIdArbitrary,
          (partyMembers, chosenFactionReputation, layoutId) => {
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

            const characters: Record<string, UniqueFields> = {};
            for (const member of partyMembers) {
              characters[member.actorId] = createUniqueFields({
                characterName: member.characterName,
                consumeReplay: member.consumeReplay,
              });
            }

            const params: SessionReportBuildParams = {
              shared: createSharedFields({
                chosenFactionReputation,
              }),
              characters,
              partyActors,
              layoutId,
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
  });

  describe('Property 3: Session report field mapping', () => {

    /**
     * For any valid form state with an event date, GM PFS number, and
     * reporting flag values, the assembled SessionReport has gameDate
     * starting with the input event date and including a rounded time
     * component, gmOrgPlayNumber equal to the numeric GM PFS number,
     * and reportingA–reportingD equal to the input flags.
     *
     * Feature: paizo-session-reporting, Property 3: Session report field mapping
     * Validates: Requirements 4.2, 4.5, 4.7
     */
    it('gameDate starts with the input event date and includes rounded time', () => {
      const gameDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00\+00:00$/;

      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, layoutId) => {
            const params = buildParams({ eventDate, gmPfsNumber, layoutId });

            const report = buildSessionReport(params);

            expect(report.gameDate.startsWith(eventDate)).toBe(true);
            expect(report.gameDate).toMatch(gameDatePattern);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: paizo-session-reporting, Property 3: Session report field mapping
     * Validates: Requirements 4.2, 4.5, 4.7
     */
    it('gmOrgPlayNumber equals the numeric GM PFS number', () => {
      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, layoutId) => {
            const params = buildParams({ eventDate, gmPfsNumber, layoutId });

            const report = buildSessionReport(params);

            expect(report.gmOrgPlayNumber).toBe(Number.parseInt(gmPfsNumber, 10));
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: paizo-session-reporting, Property 3: Session report field mapping
     * Validates: Requirements 4.2, 4.5, 4.7
     */
    it('reportingA through reportingD equal the input flag values', () => {
      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, repA, repB, repC, repD, layoutId) => {
            const params = buildParams({
              eventDate,
              gmPfsNumber,
              reportingA: repA,
              reportingB: repB,
              reportingC: repC,
              reportingD: repD,
              layoutId,
            });

            const report = buildSessionReport(params);

            expect(report.reportingA).toBe(repA);
            expect(report.reportingB).toBe(repB);
            expect(report.reportingC).toBe(repC);
            expect(report.reportingD).toBe(repD);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Property 5: Bonus reputation assembly', () => {

  /**
   * For any combination of faction reputation values (0–6 each), the
   * bonusRepEarned array contains exactly one entry for each faction
   * with a non-zero reputation value. Each entry uses the full faction
   * name from FACTION_NAMES and the correct reputation value.
   *
   * Feature: paizo-session-reporting, Property 5: Bonus reputation assembly
   * Validates: Requirements 4.11, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   */
  it('bonusRepEarned includes all non-zero factions with correct names and values', () => {
    fc.assert(
      fc.property(
        reputationValuesArbitrary,
        layoutIdArbitrary,
        (reputationValues, layoutId) => {
          const params = buildParams({
            reputationValues,
            layoutId,
          });

          const report = buildSessionReport(params);

          const expectedFactions = Object.keys(FACTION_NAMES)
            .filter((code) => reputationValues[code as keyof typeof reputationValues] !== 0);

          expect(report.bonusRepEarned).toHaveLength(expectedFactions.length);

          for (const code of expectedFactions) {
            const entry = report.bonusRepEarned.find((b) => b.faction === FACTION_NAMES[code]);
            expect(entry).toBeDefined();
            expect(entry!.reputation).toBe(reputationValues[code as keyof typeof reputationValues]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Factions with zero reputation are always excluded from bonusRepEarned.
   *
   * Feature: paizo-session-reporting, Property 5: Bonus reputation assembly
   * Validates: Requirements 9.5
   */
  it('factions with zero reputation are excluded from bonusRepEarned', () => {
    fc.assert(
      fc.property(
        reputationValuesArbitrary,
        layoutIdArbitrary,
        (reputationValues, layoutId) => {
          const params = buildParams({
            reputationValues,
            layoutId,
          });

          const report = buildSessionReport(params);

          for (const entry of report.bonusRepEarned) {
            expect(entry.reputation).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Every entry in bonusRepEarned uses a full faction name from FACTION_NAMES.
   *
   * Feature: paizo-session-reporting, Property 5: Bonus reputation assembly
   * Validates: Requirements 9.6
   */
  it('bonusRepEarned entries use full faction names from FACTION_NAMES', () => {
    fc.assert(
      fc.property(
        reputationValuesArbitrary,
        layoutIdArbitrary,
        (reputationValues, layoutId) => {
          const params = buildParams({
            reputationValues,
            layoutId,
          });

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

