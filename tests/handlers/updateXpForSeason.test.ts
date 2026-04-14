/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for updateXpForSeason composite key handling
 *
 * Verifies that updateXpForSeason correctly extracts the directory name
 * from composite season keys (e.g., "pfs2/bounties" → "bounties") before
 * determining the default XP value.
 *
 * Requirements: system-season-filtering 6.3
 */

import { updateXpForSeason } from '../../scripts/handlers/party-chronicle-handlers';

describe('updateXpForSeason - Composite Key Handling', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');

    // Mock Foundry VTT globals required by downstream calls
    (global as any).game = {
      system: { id: 'pf2e' },
      modules: { get: () => undefined },
      settings: { set: jest.fn().mockResolvedValue(undefined) }
    };

    // Create XP earned select with standard options
    const xpSelect = document.createElement('select');
    xpSelect.id = 'xpEarned';
    for (const value of ['1', '2', '4']) {
      const option = document.createElement('option');
      option.value = value;
      xpSelect.appendChild(option);
    }
    container.appendChild(xpSelect);

    // Create downtime days display element
    const downtimeDisplay = document.createElement('div');
    downtimeDisplay.className = 'downtime-days-value';
    downtimeDisplay.textContent = '0';
    container.appendChild(downtimeDisplay);

    // Create hidden downtime days input
    const downtimeInput = document.createElement('input');
    downtimeInput.type = 'hidden';
    downtimeInput.id = 'downtimeDays';
    container.appendChild(downtimeInput);
  });

  afterEach(() => {
    delete (global as any).game;
  });

  it('should set XP to 1 for composite key "pfs2/bounties"', () => {
    updateXpForSeason('pfs2/bounties', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    expect(xpSelect?.value).toBe('1');
  });

  it('should set XP to 1 for composite key "sfs2/bounties"', () => {
    updateXpForSeason('sfs2/bounties', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    expect(xpSelect?.value).toBe('1');
  });

  it('should set XP to 2 for composite key "pfs2/quests"', () => {
    updateXpForSeason('pfs2/quests', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    expect(xpSelect?.value).toBe('2');
  });

  it('should set XP to 4 for composite key "pfs2/season1"', () => {
    updateXpForSeason('pfs2/season1', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    expect(xpSelect?.value).toBe('4');
  });

  it('should set XP to 4 for composite key "sfs2/season1"', () => {
    updateXpForSeason('sfs2/season1', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    expect(xpSelect?.value).toBe('4');
  });

  it('should handle bare season IDs without slash (backward compatibility)', () => {
    updateXpForSeason('bounties', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    expect(xpSelect?.value).toBe('1');
  });

  it('should handle bare "quests" without slash', () => {
    updateXpForSeason('quests', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    expect(xpSelect?.value).toBe('2');
  });
});
