/**
 * Bug Condition Exploration Property-Based Tests
 *
 * These tests encode the EXPECTED (correct) behavior for three bugs in the
 * session report feature. They are designed to FAIL on unfixed code, proving
 * the bugs exist. Once the fix is applied, these same tests will PASS.
 *
 * Bug 1 (UTF-16LE): serializeSessionReport uses btoa(json) which encodes
 *   UTF-8 bytes. RPG Chronicles expects UTF-16LE bytes before base64.
 * Bug 2 (repEarned): buildSessionReport hardcodes repEarned to 0 instead
 *   of using shared.chosenFactionReputation.
 * Bug 3 (gameDate): buildSessionReport passes shared.eventDate directly
 *   without appending a time component.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { serializeSessionReport } from '../session-report-serializer';
import { buildSessionReport } from '../session-report-builder';
import type { SessionReportBuildParams } from '../session-report-builder';
import type { SessionReport } from '../session-report-types';

/**
 * Arbitrary for a valid SharedFields object with constrained values.
 */
const sharedFieldsArbitrary = fc.record({
  gmPfsNumber: fc.stringMatching(/^[1-9]\d{3,6}$/),
  scenarioName: fc.string({ minLength: 1, maxLength: 40 }),
  eventCode: fc.string({ minLength: 1, maxLength: 20 }),
  eventDate: fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
    noInvalidDate: true,
  }).map((d) => d.toISOString().slice(0, 10)),
  xpEarned: fc.constantFrom(1, 2, 4),
  adventureSummaryCheckboxes: fc.constant([] as string[]),
  strikeoutItems: fc.constant([] as string[]),
  treasureBundles: fc.integer({ min: 0, max: 10 }),
  layoutId: fc.constant('pfs2.s5-18'),
  seasonId: fc.constant('season-5'),
  blankChroniclePath: fc.constant('/path/to/chronicle.pdf'),
  chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
  reputationValues: fc.record({
    EA: fc.integer({ min: 0, max: 9 }),
    GA: fc.integer({ min: 0, max: 9 }),
    HH: fc.integer({ min: 0, max: 9 }),
    VS: fc.integer({ min: 0, max: 9 }),
    RO: fc.integer({ min: 0, max: 9 }),
    VW: fc.integer({ min: 0, max: 9 }),
  }),
  downtimeDays: fc.integer({ min: 0, max: 8 }),
  reportingA: fc.boolean(),
  reportingB: fc.boolean(),
  reportingC: fc.boolean(),
  reportingD: fc.boolean(),
});


/**
 * Arbitrary for a minimal SessionReportBuildParams with one actor.
 */
const buildParamsArbitrary = sharedFieldsArbitrary.chain((shared) =>
  fc.record({
    characterName: fc.string({ minLength: 1, maxLength: 30 }),
    consumeReplay: fc.boolean(),
    playerNumber: fc.integer({ min: 1000, max: 9999999 }),
    characterNumber: fc.integer({ min: 1, max: 99 }),
    currentFaction: fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW'),
    now: fc.date({
      min: new Date('2020-01-01T00:00:00Z'),
      max: new Date('2030-12-31T23:59:59Z'),
      noInvalidDate: true,
    }),
  }).map((char) => {
    const actorId = 'actor-1';
    const params: SessionReportBuildParams = {
      shared,
      characters: {
        [actorId]: {
          characterName: char.characterName,
          societyId: `${char.playerNumber}-${char.characterNumber}`,
          level: 5,
          taskLevel: 5,
          successLevel: 'success',
          proficiencyRank: 'trained',
          earnedIncome: 0,
          goldSpent: 0,
          notes: '',
          consumeReplay: char.consumeReplay,
        },
      },
      partyActors: [
        {
          id: actorId,
          name: char.characterName,
          system: {
            pfs: {
              playerNumber: char.playerNumber,
              characterNumber: char.characterNumber,
              currentFaction: char.currentFaction,
            },
          },
        },
      ],
      layoutId: shared.layoutId,
      now: char.now,
    };
    return params;
  })
);

/**
 * Decode a base64 string, interpret the bytes as UTF-16LE, and return
 * the resulting string. This is how RPG Chronicles decodes the payload.
 */
function decodeUtf16LeFromBase64(base64: string): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.codePointAt(i) ?? 0;
  }
  const decoder = new TextDecoder('utf-16le');
  return decoder.decode(bytes);
}

describe('Bug Condition Exploration: Session Report Encoding Fix', () => {
  /**
   * Property 1a: UTF-16LE Encoding Round-Trip
   *
   * Serialize any report with skipBase64 = false, base64-decode the output,
   * interpret as UTF-16LE, and assert the result is valid JSON matching
   * the original report.
   *
   * EXPECTED TO FAIL on unfixed code: btoa(json) encodes UTF-8 bytes,
   * so decoding as UTF-16LE produces garbled characters.
   *
   * **Validates: Requirements 1.1**
   */
  it('UTF-16LE: base64-decoded output interpreted as UTF-16LE yields valid JSON matching original', () => {
    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const report = buildSessionReport(params);
        const encoded = serializeSessionReport(report, false);

        const decoded = decodeUtf16LeFromBase64(encoded);
        const parsed = JSON.parse(decoded) as SessionReport;

        expect(parsed).toEqual(report);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 1b: Top-Level repEarned Reflects Chosen Faction Reputation
   *
   * Build a report with chosenFactionReputation in range 1–9 and assert
   * report.repEarned equals that value.
   *
   * EXPECTED TO FAIL on unfixed code: repEarned is hardcoded to 0.
   *
   * **Validates: Requirements 1.2**
   */
  it('repEarned: report.repEarned equals shared.chosenFactionReputation', () => {
    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const report = buildSessionReport(params);

        expect(report.repEarned).toBe(params.shared.chosenFactionReputation);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 1c: gameDate Includes Time Rounded to Nearest Half-Hour
   *
   * Build any report and assert gameDate matches the ISO 8601 datetime
   * pattern with minutes of 00 or 30 and starts with shared.eventDate.
   *
   * EXPECTED TO FAIL on unfixed code: gameDate is just the date string
   * without any time component.
   *
   * **Validates: Requirements 1.3**
   */
  it('gameDate: matches ISO 8601 datetime pattern with rounded time', () => {
    const gameDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00\+00:00$/;

    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const report = buildSessionReport(params);

        expect(report.gameDate).toMatch(gameDatePattern);
        expect(report.gameDate.startsWith(params.shared.eventDate)).toBe(true);
      }),
      { numRuns: 50 }
    );
  });
});

describe('Preservation: Unchanged Behaviors Across Fix', () => {
  /**
   * Property 4: skipBase64 Mode Returns Raw JSON
   *
   * For any valid SessionReport, calling serializeSessionReport with
   * skipBase64 = true returns the exact JSON.stringify output. This
   * behavior must be preserved after the encoding fix.
   *
   * **Validates: Requirements 3.1**
   */
  it('skipBase64 = true returns JSON.stringify(report)', () => {
    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const report = buildSessionReport(params);
        const serialized = serializeSessionReport(report, true);

        expect(serialized).toBe(JSON.stringify(report));
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: JSON Structure Fields Are Deterministic
   *
   * For any SessionReportBuildParams, the builder produces identical
   * values for gameSystem, generateGmChronicle, gmOrgPlayNumber,
   * reportingA–reportingD, scenario, signUps, and bonusRepEarned
   * across repeated calls with the same input.
   *
   * This establishes the baseline that these fields are purely
   * determined by the input params and must remain unchanged after
   * the fix modifies repEarned and gameDate.
   *
   * **Validates: Requirements 3.2, 3.3, 3.4**
   */
  it('builder output fields are deterministic for same input params', () => {
    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const reportA = buildSessionReport(params);
        const reportB = buildSessionReport(params);

        expect(reportA.gameSystem).toBe(reportB.gameSystem);
        expect(reportA.generateGmChronicle).toBe(reportB.generateGmChronicle);
        expect(reportA.gmOrgPlayNumber).toBe(reportB.gmOrgPlayNumber);
        expect(reportA.reportingA).toBe(reportB.reportingA);
        expect(reportA.reportingB).toBe(reportB.reportingB);
        expect(reportA.reportingC).toBe(reportB.reportingC);
        expect(reportA.reportingD).toBe(reportB.reportingD);
        expect(reportA.scenario).toBe(reportB.scenario);
        expect(reportA.signUps).toEqual(reportB.signUps);
        expect(reportA.bonusRepEarned).toEqual(reportB.bonusRepEarned);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5b: Builder Fields Match Expected Values From Params
   *
   * For any SessionReportBuildParams, the builder maps shared fields
   * to the correct report fields. This captures the exact current
   * mapping so the fix cannot accidentally alter it.
   *
   * **Validates: Requirements 3.2**
   */
  it('builder maps shared fields to correct report fields', () => {
    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const report = buildSessionReport(params);

        expect(report.gameSystem).toBe('PFS2E');
        expect(report.generateGmChronicle).toBe(false);
        expect(report.gmOrgPlayNumber).toBe(
          Number.parseInt(params.shared.gmPfsNumber, 10) || 0
        );
        expect(report.reportingA).toBe(params.shared.reportingA);
        expect(report.reportingB).toBe(params.shared.reportingB);
        expect(report.reportingC).toBe(params.shared.reportingC);
        expect(report.reportingD).toBe(params.shared.reportingD);
        expect(report.scenario).toBe('PFS2E 5-18');
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5c: Per-Player signUps repEarned Equals chosenFactionReputation
   *
   * Each player's signUp entry has repEarned set to the shared
   * chosenFactionReputation value. This behavior must be preserved.
   *
   * **Validates: Requirements 3.3**
   */
  it('signUps[].repEarned equals shared.chosenFactionReputation', () => {
    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const report = buildSessionReport(params);

        for (const signUp of report.signUps) {
          expect(signUp.repEarned).toBe(
            params.shared.chosenFactionReputation
          );
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5d: bonusRepEarned Contains All Non-Zero Factions
   *
   * The bonusRepEarned array includes entries for all factions that
   * have non-zero reputation values.
   *
   * **Validates: Requirements 3.4**
   */
  it('bonusRepEarned includes all factions with non-zero reputation', () => {
    fc.assert(
      fc.property(buildParamsArbitrary, (params) => {
        const report = buildSessionReport(params);
        const { reputationValues } = params.shared;

        // Every entry must have non-zero rep
        for (const entry of report.bonusRepEarned) {
          expect(entry.reputation).not.toBe(0);
        }

        // Count expected entries: all factions with non-zero rep
        const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;
        const expectedCount = factionCodes.filter(
          (code) => reputationValues[code] !== 0
        ).length;

        expect(report.bonusRepEarned).toHaveLength(expectedCount);
      }),
      { numRuns: 50 }
    );
  });
});
