/**
 * Unit tests for summary text generation utilities
 * @jest-environment jsdom
 */

import {
  generateEventDetailsSummary,
  generateReputationSummary,
  generateSharedRewardsSummary
} from './summary-utils';

describe('summary-utils', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  describe('generateEventDetailsSummary', () => {
    it('should return formatted summary with layout/scenario name from dropdown', () => {
      container.innerHTML = `
        <select id="layout">
          <option value="1" selected>5-05 The Island of the Vibrant Dead</option>
        </select>
      `;
      const summary = generateEventDetailsSummary(container);
      // This exceeds 60 characters so it will be truncated
      expect(summary).toHaveLength(60);
      expect(summary).toMatch(/^<i class="fas fa-calendar-alt"><\/i> Session Reporting - 5/);
      expect(summary).toMatch(/\.\.\.$/);
    });

    it('should return default text when no layout is selected', () => {
      container.innerHTML = '<select id="layout"></select>';
      const summary = generateEventDetailsSummary(container);
      expect(summary).toBe('<i class="fas fa-calendar-alt"></i> Session Reporting (No scenario)');
    });

    it('should return default text when layout select is missing', () => {
      container.innerHTML = '';
      const summary = generateEventDetailsSummary(container);
      expect(summary).toBe('<i class="fas fa-calendar-alt"></i> Session Reporting (No scenario)');
    });

    it('should truncate long layout names with ellipsis', () => {
      const longName = 'A'.repeat(100);
      container.innerHTML = `
        <select id="layout">
          <option value="1" selected>${longName}</option>
        </select>
      `;
      const summary = generateEventDetailsSummary(container);
      expect(summary).toHaveLength(60);
      expect(summary).toMatch(/\.\.\.$/);
      expect(summary).toContain('<i class="fas fa-calendar-alt"></i> Session Reporting - A');
    });

    it('should not truncate layout names at exactly 60 characters', () => {
      // Icon + "Session Reporting - " is 56 characters, so 4 character name = 60 total
      const exactName = 'A'.repeat(4);
      container.innerHTML = `
        <select id="layout">
          <option value="1" selected>${exactName}</option>
        </select>
      `;
      const summary = generateEventDetailsSummary(container);
      expect(summary).toHaveLength(60);
      expect(summary).not.toMatch(/\.\.\.$/);
    });
  });

  describe('generateReputationSummary', () => {
    it('should return summary with only chosen faction when all factions are zero', () => {
      container.innerHTML = `
        <input id="chosenFactionReputation" value="2" />
        <input id="reputation-EA" value="0" />
        <input id="reputation-GA" value="0" />
        <input id="reputation-HH" value="0" />
        <input id="reputation-VS" value="0" />
        <input id="reputation-RO" value="0" />
        <input id="reputation-VW" value="0" />
      `;
      const summary = generateReputationSummary(container);
      expect(summary).toBe('<i class="fas fa-star"></i> Reputation - +2');
    });

    it('should include non-zero faction values in summary', () => {
      container.innerHTML = `
        <input id="chosenFactionReputation" value="2" />
        <input id="reputation-EA" value="1" />
        <input id="reputation-GA" value="0" />
        <input id="reputation-HH" value="0" />
        <input id="reputation-VS" value="0" />
        <input id="reputation-RO" value="0" />
        <input id="reputation-VW" value="0" />
      `;
      const summary = generateReputationSummary(container);
      expect(summary).toBe('<i class="fas fa-star"></i> Reputation - +2 ; EA: +1');
    });

    it('should include multiple non-zero faction values separated by semicolons', () => {
      container.innerHTML = `
        <input id="chosenFactionReputation" value="2" />
        <input id="reputation-EA" value="1" />
        <input id="reputation-GA" value="2" />
        <input id="reputation-HH" value="0" />
        <input id="reputation-VS" value="3" />
        <input id="reputation-RO" value="0" />
        <input id="reputation-VW" value="0" />
      `;
      const summary = generateReputationSummary(container);
      // This exceeds 60 characters so it will be truncated
      expect(summary).toHaveLength(60);
      expect(summary).toMatch(/^<i class="fas fa-star"><\/i> Reputation - \+2 ; EA: \+1 ; GA/);
      expect(summary).toMatch(/\.\.\.$/);
    });

    it('should use default chosen faction value of 2 when input is missing', () => {
      container.innerHTML = `
        <input id="reputation-EA" value="0" />
        <input id="reputation-GA" value="0" />
        <input id="reputation-HH" value="0" />
        <input id="reputation-VS" value="0" />
        <input id="reputation-RO" value="0" />
        <input id="reputation-VW" value="0" />
      `;
      const summary = generateReputationSummary(container);
      expect(summary).toBe('<i class="fas fa-star"></i> Reputation - +2');
    });

    it('should use default chosen faction value of 2 when input is invalid', () => {
      container.innerHTML = `
        <input id="chosenFactionReputation" value="invalid" />
        <input id="reputation-EA" value="0" />
        <input id="reputation-GA" value="0" />
        <input id="reputation-HH" value="0" />
        <input id="reputation-VS" value="0" />
        <input id="reputation-RO" value="0" />
        <input id="reputation-VW" value="0" />
      `;
      const summary = generateReputationSummary(container);
      expect(summary).toBe('<i class="fas fa-star"></i> Reputation - +2');
    });

    it('should treat missing faction inputs as zero', () => {
      container.innerHTML = `
        <input id="chosenFactionReputation" value="2" />
      `;
      const summary = generateReputationSummary(container);
      expect(summary).toBe('<i class="fas fa-star"></i> Reputation - +2');
    });

    it('should truncate long reputation summaries with ellipsis', () => {
      // Create a scenario with many non-zero factions to exceed 60 characters
      container.innerHTML = `
        <input id="chosenFactionReputation" value="2" />
        <input id="reputation-EA" value="10" />
        <input id="reputation-GA" value="10" />
        <input id="reputation-HH" value="10" />
        <input id="reputation-VS" value="10" />
        <input id="reputation-RO" value="10" />
        <input id="reputation-VW" value="10" />
      `;
      const summary = generateReputationSummary(container);
      expect(summary).toHaveLength(60);
      expect(summary).toMatch(/\.\.\.$/);
    });
  });

  describe('generateSharedRewardsSummary', () => {
    it('should return formatted summary with XP and treasure bundles', () => {
      container.innerHTML = `
        <input id="xpEarned" value="4" />
        <input id="treasureBundles" value="3" />
      `;
      const summary = generateSharedRewardsSummary(container);
      expect(summary).toBe('<i class="fas fa-gift"></i> Shared Rewards - 4 XP; 3 TB');
    });

    it('should use zero for XP when input is missing', () => {
      container.innerHTML = `
        <input id="treasureBundles" value="3" />
      `;
      const summary = generateSharedRewardsSummary(container);
      expect(summary).toBe('<i class="fas fa-gift"></i> Shared Rewards - 0 XP; 3 TB');
    });

    it('should use zero for treasure bundles when input is missing', () => {
      container.innerHTML = `
        <input id="xpEarned" value="4" />
      `;
      const summary = generateSharedRewardsSummary(container);
      expect(summary).toBe('<i class="fas fa-gift"></i> Shared Rewards - 4 XP; 0 TB');
    });

    it('should use zero for both when inputs are missing', () => {
      container.innerHTML = '';
      const summary = generateSharedRewardsSummary(container);
      expect(summary).toBe('<i class="fas fa-gift"></i> Shared Rewards - 0 XP; 0 TB');
    });

    it('should use zero for invalid XP value', () => {
      container.innerHTML = `
        <input id="xpEarned" value="invalid" />
        <input id="treasureBundles" value="3" />
      `;
      const summary = generateSharedRewardsSummary(container);
      expect(summary).toBe('<i class="fas fa-gift"></i> Shared Rewards - 0 XP; 3 TB');
    });

    it('should use zero for invalid treasure bundles value', () => {
      container.innerHTML = `
        <input id="xpEarned" value="4" />
        <input id="treasureBundles" value="invalid" />
      `;
      const summary = generateSharedRewardsSummary(container);
      expect(summary).toBe('<i class="fas fa-gift"></i> Shared Rewards - 4 XP; 0 TB');
    });

    it('should handle large XP and treasure bundle values', () => {
      container.innerHTML = `
        <input id="xpEarned" value="999" />
        <input id="treasureBundles" value="999" />
      `;
      const summary = generateSharedRewardsSummary(container);
      expect(summary).toBe('<i class="fas fa-gift"></i> Shared Rewards - 999 XP; 999 TB');
    });

    it('should truncate if summary exceeds maximum length', () => {
      // This is unlikely with normal values, but test the truncation logic
      container.innerHTML = `
        <input id="xpEarned" value="99999999999999999999" />
        <input id="treasureBundles" value="99999999999999999999" />
      `;
      const summary = generateSharedRewardsSummary(container);
      expect(summary.length).toBeLessThanOrEqual(60);
      if (summary.length === 60) {
        expect(summary).toMatch(/\.\.\.$/);
      }
    });
  });
});
