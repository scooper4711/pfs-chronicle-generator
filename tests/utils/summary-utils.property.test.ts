/**
 * Property-based tests for summary text generation utilities
 * @jest-environment jsdom
 */

import * as fc from 'fast-check';
import {
  generateEventDetailsSummary,
  generateReputationSummary,
  generateSharedRewardsSummary
} from '../../scripts/utils/summary-utils';

describe('summary-utils property tests', () => {
  describe('generateEventDetailsSummary', () => {
    // Feature: collapsible-shared-sections, Property 5: Session Reporting summary contains scenario name
    it('should format summary with layout/scenario name for any non-empty layout name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0)
            // eslint-disable-next-line no-control-regex -- Intentionally filtering control characters from test input
            .filter(s => !/[\x00-\x1F\x7F-\x9F]/.test(s)), // Filter out control characters
          (layoutName) => {
            const container = document.createElement('div');
            container.innerHTML = `
              <select id="layout">
                <option value="1" selected>${layoutName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>
              </select>
            `;
            
            const summary = generateEventDetailsSummary(container);
            
            // The DOM normalizes whitespace: trim + collapse internal runs of whitespace to single spaces
            const trimmedLayoutName = layoutName.trim().replace(/\s+/g, ' ');
            
            // Summary should start with icon and "Session Reporting - "
            expect(summary).toMatch(/^<i class="fas fa-calendar-alt"><\/i> Session Reporting - /);
            
            // Summary should contain the trimmed layout name (or truncated version)
            if (trimmedLayoutName.length <= 4) {
              // Icon (36 chars) + "Session Reporting - " (20 chars) + 4 chars name = 60 total
              expect(summary).toBe(`<i class="fas fa-calendar-alt"></i> Session Reporting - ${trimmedLayoutName}`);
            } else {
              // Should be truncated to 60 characters with ellipsis
              expect(summary).toHaveLength(60);
              expect(summary).toMatch(/\.\.\.$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default text for any empty or whitespace-only layout name', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.string().filter(s => s.trim().length === 0)
          ),
          (layoutName) => {
            const container = document.createElement('div');
            if (layoutName) {
              container.innerHTML = `
                <select id="layout">
                  <option value="1" selected>${layoutName}</option>
                </select>
              `;
            } else {
              container.innerHTML = '<select id="layout"></select>';
            }
            
            const summary = generateEventDetailsSummary(container);
            
            expect(summary).toBe('<i class="fas fa-calendar-alt"></i> Session Reporting (No scenario)');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('generateReputationSummary', () => {
    // Feature: collapsible-shared-sections, Property 6: Reputation summary contains chosen faction value
    it('should include chosen faction value for any chosen faction reputation value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Start from 1 since 0 defaults to 2
          (chosenValue) => {
            const container = document.createElement('div');
            container.innerHTML = `
              <input id="chosenFactionReputation" value="${chosenValue}" />
              <input id="reputation-EA" value="0" />
              <input id="reputation-GA" value="0" />
              <input id="reputation-HH" value="0" />
              <input id="reputation-VS" value="0" />
              <input id="reputation-RO" value="0" />
              <input id="reputation-VW" value="0" />
            `;
            
            const summary = generateReputationSummary(container);
            
            // Summary should start with icon and "Reputation - +{chosen}"
            expect(summary).toMatch(new RegExp(`^<i class="fas fa-star"><\\/i> Reputation - \\+${chosenValue}`));
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: collapsible-shared-sections, Property 7: Reputation summary includes non-zero faction values
    it('should include non-zero faction values with semicolon separation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Start from 1 since 0 defaults to 2
          fc.record({
            EA: fc.integer({ min: -2, max: 2 }), // Smaller range to avoid truncation
            GA: fc.integer({ min: -2, max: 2 }),
            HH: fc.integer({ min: -2, max: 2 }),
            VS: fc.integer({ min: -2, max: 2 }),
            RO: fc.integer({ min: -2, max: 2 }),
            VW: fc.integer({ min: -2, max: 2 })
          }),
          (chosenValue, factionValues) => {
            const container = document.createElement('div');
            container.innerHTML = `
              <input id="chosenFactionReputation" value="${chosenValue}" />
              <input id="reputation-EA" value="${factionValues.EA}" />
              <input id="reputation-GA" value="${factionValues.GA}" />
              <input id="reputation-HH" value="${factionValues.HH}" />
              <input id="reputation-VS" value="${factionValues.VS}" />
              <input id="reputation-RO" value="${factionValues.RO}" />
              <input id="reputation-VW" value="${factionValues.VW}" />
            `;
            
            const summary = generateReputationSummary(container);
            
            // Summary should start with icon and chosen faction value
            expect(summary).toMatch(new RegExp(`^<i class="fas fa-star"><\\/i> Reputation - \\+${chosenValue}`));
            
            // Check that non-zero faction values are included (if not truncated)
            const factions = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'];
            const isTruncated = summary.endsWith('...');
            
            for (const faction of factions) {
              const value = factionValues[faction as keyof typeof factionValues];
              if (value !== 0) {
                // Only check if the summary is not truncated or if this faction appears before truncation
                if (!isTruncated) {
                  expect(summary).toContain(`${faction}: +${value}`);
                }
              } else {
                // Zero values should not be included
                const regex = new RegExp(`${faction}: \\+0`);
                expect(summary).not.toMatch(regex);
              }
            }
            
            // If there are non-zero factions, check semicolon separation
            const nonZeroFactions = factions.filter(f => factionValues[f as keyof typeof factionValues] !== 0);
            if (nonZeroFactions.length > 0) {
              expect(summary).toContain(' ; ');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only show chosen faction when all faction reputations are zero', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Start from 1 since 0 defaults to 2
          (chosenValue) => {
            const container = document.createElement('div');
            container.innerHTML = `
              <input id="chosenFactionReputation" value="${chosenValue}" />
              <input id="reputation-EA" value="0" />
              <input id="reputation-GA" value="0" />
              <input id="reputation-HH" value="0" />
              <input id="reputation-VS" value="0" />
              <input id="reputation-RO" value="0" />
              <input id="reputation-VW" value="0" />
            `;
            
            const summary = generateReputationSummary(container);
            
            // Summary should be exactly icon + "Reputation - +{chosen}"
            expect(summary).toBe(`<i class="fas fa-star"></i> Reputation - +${chosenValue}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('generateSharedRewardsSummary', () => {
    // Feature: collapsible-shared-sections, Property 8: Shared Rewards summary contains XP and treasure bundles
    it('should format summary with XP and treasure bundles for any values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (xpValue, tbValue) => {
            const container = document.createElement('div');
            container.innerHTML = `
              <input id="xpEarned" value="${xpValue}" />
              <input id="treasureBundles" value="${tbValue}" />
            `;
            
            const summary = generateSharedRewardsSummary(container);
            
            // Summary should match the format with icon "Shared Rewards - {xp} XP; {tb} TB"
            expect(summary).toBe(`<i class="fas fa-gift"></i> Shared Rewards - ${xpValue} XP; ${tbValue} TB`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle any valid integer values for XP and treasure bundles', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999 }),
          fc.integer({ min: 0, max: 999 }),
          (xpValue, tbValue) => {
            const container = document.createElement('div');
            container.innerHTML = `
              <input id="xpEarned" value="${xpValue}" />
              <input id="treasureBundles" value="${tbValue}" />
            `;
            
            const summary = generateSharedRewardsSummary(container);
            
            // Summary should contain both values
            expect(summary).toContain(`${xpValue} XP`);
            expect(summary).toContain(`${tbValue} TB`);
            
            // Summary should start with icon and "Shared Rewards - "
            expect(summary).toMatch(/^<i class="fas fa-gift"><\/i> Shared Rewards - /);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
