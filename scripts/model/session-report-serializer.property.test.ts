/**
 * Property-based tests for the session report serializer.
 *
 * Validates the serialization round-trip property: serializing a
 * SessionReport to JSON, base64-encoding, then decoding and parsing
 * produces an object deeply equal to the original.
 *
 * Feature: paizo-session-reporting
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { serializeSessionReport } from './session-report-serializer';
import type { SessionReport, SignUp, BonusRep } from './session-report-types';
import { FACTION_NAMES } from './faction-names';

/** Arbitrary for a full faction name. */
const factionNameArbitrary = fc.constantFrom(...Object.values(FACTION_NAMES));

/** Arbitrary for an ISO 8601 date string (YYYY-MM-DD). */
const eventDateArbitrary = fc.tuple(
  fc.integer({ min: 2000, max: 2099 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 })
).map(([y, m, d]) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
);

/** Arbitrary for a scenario identifier string (e.g. "PFS2E 5-18"). */
const scenarioArbitrary = fc.tuple(
  fc.integer({ min: 1, max: 99 }),
  fc.integer({ min: 1, max: 99 })
).map(([season, scenario]) =>
  `PFS2E ${season}-${String(scenario).padStart(2, '0')}`
);

/** Arbitrary for a single SignUp entry. */
const signUpArbitrary: fc.Arbitrary<SignUp> = fc.record({
  isGM: fc.constant(false as const),
  orgPlayNumber: fc.integer({ min: 1, max: 9999999 }),
  characterNumber: fc.integer({ min: 1, max: 99 }),
  characterName: fc.string({ minLength: 1, maxLength: 40 }),
  consumeReplay: fc.boolean(),
  repEarned: fc.integer({ min: 0, max: 9 }),
  faction: factionNameArbitrary,
});

/** Arbitrary for a single BonusRep entry. */
const bonusRepArbitrary: fc.Arbitrary<BonusRep> = fc.record({
  faction: factionNameArbitrary,
  reputation: fc.integer({ min: 1, max: 6 }),
});

/** Arbitrary for a valid SessionReport object. */
const sessionReportArbitrary: fc.Arbitrary<SessionReport> = fc.record({
  gameDate: eventDateArbitrary,
  gameSystem: fc.constant('PFS2E' as const),
  generateGmChronicle: fc.constant(false as const),
  gmOrgPlayNumber: fc.integer({ min: 1, max: 9999999 }),
  repEarned: fc.constant(0 as const),
  reportingA: fc.boolean(),
  reportingB: fc.boolean(),
  reportingC: fc.boolean(),
  reportingD: fc.boolean(),
  scenario: scenarioArbitrary,
  signUps: fc.array(signUpArbitrary, { minLength: 0, maxLength: 6 }),
  bonusRepEarned: fc.array(bonusRepArbitrary, { minLength: 0, maxLength: 5 }),
});

describe('Session Report Serializer Properties', () => {
  describe('Property 6: Serialization round-trip', () => {

    /**
     * For any valid SessionReport object, serializing to JSON,
     * base64-encoding, then base64-decoding and JSON-parsing produces
     * an object deeply equal to the original.
     *
     * Feature: paizo-session-reporting, Property 6: Serialization round-trip
     * Validates: Requirements 6.1, 6.2, 6.3, 6.4
     */
    it('base64 round-trip preserves the SessionReport', () => {
      fc.assert(
        fc.property(sessionReportArbitrary, (report) => {
          const encoded = serializeSessionReport(report);
          const decoded = JSON.parse(atob(encoded));

          expect(decoded).toEqual(report);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * For any valid SessionReport object, serializing with skipBase64
     * then JSON-parsing produces an object deeply equal to the original.
     *
     * Feature: paizo-session-reporting, Property 6: Serialization round-trip
     * Validates: Requirements 6.1, 6.3
     */
    it('JSON round-trip preserves the SessionReport when base64 is skipped', () => {
      fc.assert(
        fc.property(sessionReportArbitrary, (report) => {
          const json = serializeSessionReport(report, true);
          const parsed = JSON.parse(json);

          expect(parsed).toEqual(report);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * For any valid SessionReport, the base64-encoded output decodes
     * to the same JSON string that skipBase64 mode produces.
     *
     * Feature: paizo-session-reporting, Property 6: Serialization round-trip
     * Validates: Requirements 6.2, 6.4
     */
    it('base64 decoding produces the same JSON as skipBase64 mode', () => {
      fc.assert(
        fc.property(sessionReportArbitrary, (report) => {
          const encoded = serializeSessionReport(report);
          const rawJson = serializeSessionReport(report, true);

          expect(atob(encoded)).toBe(rawJson);
        }),
        { numRuns: 100 }
      );
    });
  });
});
