/**
 * Property-based test for Starfinder session report game system field.
 *
 * Validates that the gameSystem field in the session report matches the
 * detected game system for all valid build parameters.
 *
 * Feature: starfinder-support, Property 8: Session Report Game System Matches Detected System
 * Validates: Requirements 8.1, 8.2
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { buildSessionReport, SessionReportActor, SessionReportBuildParams } from '../../scripts/model/session-report-builder';
import { createSharedFields, createUniqueFields } from './test-helpers';

function setupGameGlobal(systemId: string, anachronismActive?: boolean): void {
  const modules = new Map<string, { active: boolean }>();
  if (anachronismActive !== undefined) {
    modules.set('sf2e-anachronism', { active: anachronismActive });
  }

  (globalThis as any).game = {
    system: { id: systemId },
    modules,
  };
}

/** Arbitrary for an ISO 8601 date string (YYYY-MM-DD). */
const eventDateArbitrary = fc.tuple(
  fc.integer({ min: 2000, max: 2099 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 })
).map(([y, m, d]) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
);

/** Arbitrary for a layout ID (either PF or SF format). */
const layoutIdArbitrary = fc.tuple(
  fc.constantFrom('pfs2', 'sfs2'),
  fc.integer({ min: 1, max: 99 }),
  fc.integer({ min: 1, max: 99 })
).map(([prefix, season, scenario]) =>
  `${prefix}.s${season}-${String(scenario).padStart(2, '0')}`
);

/** Arbitrary for a GM PFS number string. */
const gmPfsNumberArbitrary = fc.integer({ min: 1, max: 9999999 }).map(String);

/** Fixed time for deterministic gameDate output */
const FIXED_NOW = new Date('2025-06-15T14:10:00Z');

describe('Starfinder Session Report Game System Property', () => {
  beforeEach(() => {
    delete (globalThis as any).game;
  });

  describe('Property 8: Session Report Game System Matches Detected System', () => {

    /**
     * For any valid session report build parameters, when the detected
     * game system is 'sf2e' the gameSystem field SHALL be 'SFS2E'.
     *
     * Feature: starfinder-support, Property 8: Session Report Game System Matches Detected System
     * Validates: Requirements 8.1, 8.2
     */
    it('gameSystem is "SFS2E" when detected system is sf2e', () => {
      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, layoutId) => {
            setupGameGlobal('sf2e');

            const actor: SessionReportActor = {
              id: 'a1',
              name: 'Test',
              system: { pfs: { playerNumber: 12345, characterNumber: 1, currentFaction: 'EA' } },
            };

            const params: SessionReportBuildParams = {
              shared: createSharedFields({ eventDate, gmPfsNumber }),
              characters: { a1: createUniqueFields() },
              partyActors: [actor],
              layoutId,
              now: FIXED_NOW,
            };

            const report = buildSessionReport(params);
            expect(report.gameSystem).toBe('SFS2E');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * For any valid session report build parameters, when the detected
     * game system is 'pf2e' the gameSystem field SHALL be 'PFS2E'.
     *
     * Feature: starfinder-support, Property 8: Session Report Game System Matches Detected System
     * Validates: Requirements 8.1, 8.2
     */
    it('gameSystem is "PFS2E" when detected system is pf2e', () => {
      fc.assert(
        fc.property(
          eventDateArbitrary,
          gmPfsNumberArbitrary,
          layoutIdArbitrary,
          (eventDate, gmPfsNumber, layoutId) => {
            setupGameGlobal('pf2e', false);

            const actor: SessionReportActor = {
              id: 'a1',
              name: 'Test',
              system: { pfs: { playerNumber: 12345, characterNumber: 1, currentFaction: 'EA' } },
            };

            const params: SessionReportBuildParams = {
              shared: createSharedFields({ eventDate, gmPfsNumber }),
              characters: { a1: createUniqueFields() },
              partyActors: [actor],
              layoutId,
              now: FIXED_NOW,
            };

            const report = buildSessionReport(params);
            expect(report.gameSystem).toBe('PFS2E');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
