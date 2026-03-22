/**
 * Property-based tests for session report validation.
 *
 * Validates that validateSessionReportFields correctly rejects form states
 * where at least one required field is missing or invalid.
 *
 * Feature: paizo-session-reporting
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { validateSessionReportFields, SessionReportValidationParams } from '../../scripts/model/party-chronicle-validator';
import { FACTION_NAMES } from '../../scripts/model/faction-names';

/** Arbitrary for a valid faction abbreviation code. */
const factionCodeArbitrary = fc.constantFrom(...Object.keys(FACTION_NAMES));

/** Arbitrary for a non-empty string (valid field value). */
const nonEmptyStringArbitrary = fc.string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

/** Arbitrary for a valid party actor with faction data. */
const validActorArbitrary = fc.record({
  id: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
  name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  currentFaction: factionCodeArbitrary,
});

/** Builds a valid SessionReportValidationParams from generated values. */
function buildValidParams(overrides: {
  eventDate?: string;
  layoutId?: string;
  gmPfsNumber?: string;
  actors?: Array<{ id: string; name: string; currentFaction: string }>;
}): SessionReportValidationParams {
  const actors = overrides.actors ?? [{ id: 'actor-1', name: 'Test Character', currentFaction: 'EA' }];

  return {
    shared: {
      eventDate: overrides.eventDate ?? '2025-01-15',
      layoutId: overrides.layoutId ?? 'pfs2.s5-18',
      gmPfsNumber: overrides.gmPfsNumber ?? '12345',
    },
    partyActors: actors.map((a) => ({
      id: a.id,
      name: a.name,
      system: { pfs: { currentFaction: a.currentFaction } },
    })),
  };
}

describe('Property 7: Validation rejects missing required fields', () => {

  /**
   * For any valid form state, validation passes when all required fields
   * are populated and every actor has a faction.
   *
   * Feature: paizo-session-reporting, Property 7: Validation rejects missing required fields
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4
   */
  it('passes validation when all required fields are populated', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArbitrary,
        nonEmptyStringArbitrary,
        nonEmptyStringArbitrary,
        fc.uniqueArray(validActorArbitrary, {
          minLength: 1,
          maxLength: 6,
          selector: (a) => a.id,
        }),
        (eventDate, layoutId, gmPfsNumber, actors) => {
          const params = buildValidParams({ eventDate, layoutId, gmPfsNumber, actors });

          const result = validateSessionReportFields(params);

          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * When the event date is missing (empty string), validation fails
   * with at least one error mentioning Event Date.
   *
   * Feature: paizo-session-reporting, Property 7: Validation rejects missing required fields
   * Validates: Requirement 8.1
   */
  it('rejects missing event date', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArbitrary,
        nonEmptyStringArbitrary,
        fc.uniqueArray(validActorArbitrary, {
          minLength: 1,
          maxLength: 6,
          selector: (a) => a.id,
        }),
        (layoutId, gmPfsNumber, actors) => {
          const params = buildValidParams({ eventDate: '', layoutId, gmPfsNumber, actors });

          const result = validateSessionReportFields(params);

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('Event Date'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * When the scenario selection (layoutId) is missing, validation fails
   * with at least one error mentioning Scenario selection.
   *
   * Feature: paizo-session-reporting, Property 7: Validation rejects missing required fields
   * Validates: Requirement 8.2
   */
  it('rejects missing scenario selection', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArbitrary,
        nonEmptyStringArbitrary,
        fc.uniqueArray(validActorArbitrary, {
          minLength: 1,
          maxLength: 6,
          selector: (a) => a.id,
        }),
        (eventDate, gmPfsNumber, actors) => {
          const params = buildValidParams({ eventDate, layoutId: '', gmPfsNumber, actors });

          const result = validateSessionReportFields(params);

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('Scenario selection'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * When the GM PFS number is missing, validation fails with at least
   * one error mentioning GM PFS Number.
   *
   * Feature: paizo-session-reporting, Property 7: Validation rejects missing required fields
   * Validates: Requirement 8.3
   */
  it('rejects missing GM PFS number', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArbitrary,
        nonEmptyStringArbitrary,
        fc.uniqueArray(validActorArbitrary, {
          minLength: 1,
          maxLength: 6,
          selector: (a) => a.id,
        }),
        (eventDate, layoutId, actors) => {
          const params = buildValidParams({ eventDate, layoutId, gmPfsNumber: '', actors });

          const result = validateSessionReportFields(params);

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('GM PFS Number'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * When at least one party member is missing a faction value,
   * validation fails with at least one error mentioning Faction.
   *
   * Feature: paizo-session-reporting, Property 7: Validation rejects missing required fields
   * Validates: Requirement 8.4
   */
  it('rejects party member with missing faction', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArbitrary,
        nonEmptyStringArbitrary,
        nonEmptyStringArbitrary,
        fc.uniqueArray(validActorArbitrary, {
          minLength: 1,
          maxLength: 5,
          selector: (a) => a.id,
        }),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        (eventDate, layoutId, gmPfsNumber, validActors, missingFactionName) => {
          // Ensure the missing-faction actor has a unique ID
          const usedIds = new Set(validActors.map((a) => a.id));
          const missingFactionId = 'no-faction-actor';
          fc.pre(!usedIds.has(missingFactionId));

          const actorsWithMissing = [
            ...validActors,
            { id: missingFactionId, name: missingFactionName, currentFaction: '' },
          ];

          const params: SessionReportValidationParams = {
            shared: {
              eventDate,
              layoutId,
              gmPfsNumber,
            },
            partyActors: actorsWithMissing.map((a) => ({
              id: a.id,
              name: a.name,
              system: a.currentFaction
                ? { pfs: { currentFaction: a.currentFaction } }
                : { pfs: { currentFaction: '' } },
            })),
          };

          const result = validateSessionReportFields(params);

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('Faction'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * When multiple required fields are missing simultaneously, validation
   * collects all errors (at least one per missing field).
   *
   * Feature: paizo-session-reporting, Property 7: Validation rejects missing required fields
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4
   */
  it('collects errors for all missing fields simultaneously', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        (actorName) => {
          const params: SessionReportValidationParams = {
            shared: {
              eventDate: '',
              layoutId: '',
              gmPfsNumber: '',
            },
            partyActors: [{
              id: 'actor-1',
              name: actorName,
              system: { pfs: { currentFaction: '' } },
            }],
          };

          const result = validateSessionReportFields(params);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThanOrEqual(4);
          expect(result.errors.some((e) => e.includes('Event Date'))).toBe(true);
          expect(result.errors.some((e) => e.includes('Scenario selection'))).toBe(true);
          expect(result.errors.some((e) => e.includes('GM PFS Number'))).toBe(true);
          expect(result.errors.some((e) => e.includes('Faction'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
