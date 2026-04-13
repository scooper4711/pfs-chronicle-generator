/**
 * Property-based test for Starfinder scenario identifier construction.
 *
 * Validates that buildScenarioIdentifier correctly transforms Starfinder
 * layout IDs in the format "sfs2.sN-MM" into scenario identifiers "SFS2E N-MM".
 *
 * Feature: starfinder-support, Property 9: Starfinder Scenario Identifier Parsing
 * Validates: Requirements 8.3
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { buildScenarioIdentifier } from '../../scripts/model/scenario-identifier';

describe('Starfinder Scenario Identifier Parsing', () => {
  describe('Property 9: Starfinder Scenario Identifier Parsing', () => {

    /**
     * For any valid season number (1-99) and scenario number (01-99),
     * buildScenarioIdentifier("sfs2.s{season}-{scenario}") returns
     * "SFS2E {season}-{scenario}".
     *
     * Feature: starfinder-support, Property 9: Starfinder Scenario Identifier Parsing
     * Validates: Requirements 8.3
     */
    it('transforms "sfs2.sN-MM" layout IDs into "SFS2E N-MM" identifiers', () => {
      const seasonArbitrary = fc.integer({ min: 1, max: 99 });
      const scenarioArbitrary = fc.integer({ min: 1, max: 99 });

      fc.assert(
        fc.property(seasonArbitrary, scenarioArbitrary, (season, scenario) => {
          const scenarioStr = String(scenario).padStart(2, '0');
          const layoutId = `sfs2.s${season}-${scenarioStr}`;

          const result = buildScenarioIdentifier(layoutId);

          expect(result).toBe(`SFS2E ${season}-${scenarioStr}`);
        }),
        { numRuns: 100 }
      );
    });
  });
});
