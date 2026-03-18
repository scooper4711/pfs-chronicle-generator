/**
 * Property-based test for scenario identifier construction.
 *
 * Validates that buildScenarioIdentifier correctly transforms layout IDs
 * in the format "pfs2.sN-MM" into scenario identifiers "PFS2E N-MM".
 *
 * Feature: paizo-session-reporting, Property 1: Scenario identifier construction
 * Validates: Requirements 5.1, 4.8
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { buildScenarioIdentifier } from './scenario-identifier';

describe('Scenario Identifier Construction', () => {
  describe('Property 1: Scenario identifier construction', () => {

    /**
     * For any valid layout ID in the format "pfs2.sN-MM" (where N is a season
     * number and MM is a scenario number), buildScenarioIdentifier produces
     * a string in the format "PFS2E N-MM".
     *
     * Feature: paizo-session-reporting, Property 1: Scenario identifier construction
     * Validates: Requirements 5.1, 4.8
     */
    it('transforms "pfs2.sN-MM" layout IDs into "PFS2E N-MM" identifiers', () => {
      const seasonArbitrary = fc.integer({ min: 1, max: 99 });
      const scenarioArbitrary = fc.integer({ min: 1, max: 99 });

      fc.assert(
        fc.property(seasonArbitrary, scenarioArbitrary, (season, scenario) => {
          const scenarioStr = String(scenario).padStart(2, '0');
          const layoutId = `pfs2.s${season}-${scenarioStr}`;

          const result = buildScenarioIdentifier(layoutId);

          expect(result).toBe(`PFS2E ${season}-${scenarioStr}`);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * The output always starts with the "PFS2E " prefix for standard layout IDs.
     *
     * Feature: paizo-session-reporting, Property 1: Scenario identifier construction
     * Validates: Requirements 5.1, 4.8
     */
    it('always produces a result starting with "PFS2E " for standard layout IDs', () => {
      const seasonArbitrary = fc.integer({ min: 1, max: 99 });
      const scenarioArbitrary = fc.integer({ min: 1, max: 99 });

      fc.assert(
        fc.property(seasonArbitrary, scenarioArbitrary, (season, scenario) => {
          const scenarioStr = String(scenario).padStart(2, '0');
          const layoutId = `pfs2.s${season}-${scenarioStr}`;

          const result = buildScenarioIdentifier(layoutId);

          expect(result.startsWith('PFS2E ')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * The season-scenario portion of the output preserves the original
     * numeric values from the layout ID without modification.
     *
     * Feature: paizo-session-reporting, Property 1: Scenario identifier construction
     * Validates: Requirements 5.1, 4.8
     */
    it('preserves the season-scenario numbers from the layout ID', () => {
      const seasonArbitrary = fc.integer({ min: 1, max: 99 });
      const scenarioArbitrary = fc.integer({ min: 1, max: 99 });

      fc.assert(
        fc.property(seasonArbitrary, scenarioArbitrary, (season, scenario) => {
          const scenarioStr = String(scenario).padStart(2, '0');
          const layoutId = `pfs2.s${season}-${scenarioStr}`;

          const result = buildScenarioIdentifier(layoutId);
          const suffix = result.replace('PFS2E ', '');

          expect(suffix).toBe(`${season}-${scenarioStr}`);
        }),
        { numRuns: 100 }
      );
    });
  });
});
