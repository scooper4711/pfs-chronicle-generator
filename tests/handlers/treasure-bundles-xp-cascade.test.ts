/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for the XP → Treasure Bundles → Downtime Days cascade
 *
 * When XP earned changes (manually or via season selection), the treasure
 * bundles dropdown should auto-select the appropriate default and trigger
 * downstream updates (per-character treasure displays, downtime days,
 * earned income).
 *
 * Mapping:
 * - 1 XP (Bounty)   → 2 TB, 0 downtime days
 * - 2 XP (Quest)    → 4 TB, 4 downtime days
 * - 4 XP (Scenario) → 8 TB, 8 downtime days
 */

import {
  getDefaultTreasureBundles,
  updateTreasureBundlesForXp,
  updateXpForSeason,
  updateDowntimeDaysDisplay
} from '../../scripts/handlers/party-chronicle-handlers';

describe('getDefaultTreasureBundles', () => {
  it('should return 2 TB for 1 XP (Bounty)', () => {
    expect(getDefaultTreasureBundles(1)).toBe(2);
  });

  it('should return 4 TB for 2 XP (Quest)', () => {
    expect(getDefaultTreasureBundles(2)).toBe(4);
  });

  it('should return 8 TB for 4 XP (Scenario)', () => {
    expect(getDefaultTreasureBundles(4)).toBe(8);
  });

  it('should default to 8 TB for unknown XP values', () => {
    expect(getDefaultTreasureBundles(3)).toBe(8);
    expect(getDefaultTreasureBundles(0)).toBe(8);
  });
});

describe('updateTreasureBundlesForXp', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');

    // Mock Foundry VTT globals
    (global as any).game = {
      system: { id: 'pf2e' },
      modules: { get: () => undefined },
      settings: { set: jest.fn().mockResolvedValue(undefined) }
    };

    // Create treasure bundles select with standard options
    const tbSelect = document.createElement('select');
    tbSelect.id = 'treasureBundles';
    for (const value of ['0', '2', '2.5', '3', '4', '5', '6', '7', '8', '9', '10']) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value === '0' ? '-' : `${value} TB`;
      tbSelect.appendChild(option);
    }
    container.appendChild(tbSelect);
  });

  afterEach(() => {
    delete (global as any).game;
  });

  it('should set treasure bundles to 2 when XP is 1 (Bounty)', () => {
    updateTreasureBundlesForXp(1, container);

    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    expect(tbSelect?.value).toBe('2');
  });

  it('should set treasure bundles to 4 when XP is 2 (Quest)', () => {
    updateTreasureBundlesForXp(2, container);

    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    expect(tbSelect?.value).toBe('4');
  });

  it('should set treasure bundles to 8 when XP is 4 (Scenario)', () => {
    updateTreasureBundlesForXp(4, container);

    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    expect(tbSelect?.value).toBe('8');
  });

  it('should not throw when treasure bundles select is missing', () => {
    const emptyContainer = document.createElement('div');
    expect(() => updateTreasureBundlesForXp(4, emptyContainer)).not.toThrow();
  });

  it('should update per-character treasure displays when treasure bundles change', () => {
    // Add a character with a level input and treasure display
    const memberActivity = document.createElement('div');
    memberActivity.className = 'member-activity';
    memberActivity.dataset.characterId = 'actor-1';

    const levelInput = document.createElement('input');
    levelInput.name = 'characters.actor-1.level';
    levelInput.value = '5';
    memberActivity.appendChild(levelInput);

    const treasureDisplay = document.createElement('div');
    treasureDisplay.className = 'treasure-bundle-value';
    treasureDisplay.textContent = '0';
    memberActivity.appendChild(treasureDisplay);

    container.appendChild(memberActivity);

    updateTreasureBundlesForXp(4, container);

    // 8 TB at level 5 = 8 × 5 gp = 40 gp (per treasure bundle table)
    expect(treasureDisplay.textContent).not.toBe('0');
  });
});

describe('updateXpForSeason — treasure bundles cascade', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');

    (global as any).game = {
      system: { id: 'pf2e' },
      modules: { get: () => undefined },
      settings: { set: jest.fn().mockResolvedValue(undefined) }
    };

    // XP earned select
    const xpSelect = document.createElement('select');
    xpSelect.id = 'xpEarned';
    for (const value of ['1', '2', '4']) {
      const option = document.createElement('option');
      option.value = value;
      xpSelect.appendChild(option);
    }
    container.appendChild(xpSelect);

    // Treasure bundles select
    const tbSelect = document.createElement('select');
    tbSelect.id = 'treasureBundles';
    for (const value of ['0', '2', '2.5', '3', '4', '5', '6', '7', '8', '9', '10']) {
      const option = document.createElement('option');
      option.value = value;
      tbSelect.appendChild(option);
    }
    container.appendChild(tbSelect);

    // Downtime days display + hidden input
    const downtimeDisplay = document.createElement('div');
    downtimeDisplay.className = 'downtime-days-value';
    downtimeDisplay.textContent = '0';
    container.appendChild(downtimeDisplay);

    const downtimeInput = document.createElement('input');
    downtimeInput.type = 'hidden';
    downtimeInput.id = 'downtimeDays';
    container.appendChild(downtimeInput);
  });

  afterEach(() => {
    delete (global as any).game;
  });

  it('should set treasure bundles to 2 when season is bounties', () => {
    updateXpForSeason('pfs2/bounties', container);

    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    expect(tbSelect?.value).toBe('2');
  });

  it('should set treasure bundles to 4 when season is quests', () => {
    updateXpForSeason('pfs2/quests', container);

    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    expect(tbSelect?.value).toBe('4');
  });

  it('should set treasure bundles to 8 when season is a standard season', () => {
    updateXpForSeason('pfs2/season5', container);

    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    expect(tbSelect?.value).toBe('8');
  });

  it('should update XP, treasure, and downtime together for bounties', () => {
    updateXpForSeason('bounties', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    const downtimeDisplay = container.querySelector('.downtime-days-value');

    expect(xpSelect?.value).toBe('1');
    expect(tbSelect?.value).toBe('2');
    expect(downtimeDisplay?.textContent).toBe('0');
  });

  it('should update XP, treasure, and downtime together for quests', () => {
    updateXpForSeason('quests', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    const downtimeDisplay = container.querySelector('.downtime-days-value');

    expect(xpSelect?.value).toBe('2');
    expect(tbSelect?.value).toBe('4');
    expect(downtimeDisplay?.textContent).toBe('4');
  });

  it('should update XP, treasure, and downtime together for scenarios', () => {
    updateXpForSeason('pfs2/season1', container);

    const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    const tbSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    const downtimeDisplay = container.querySelector('.downtime-days-value');

    expect(xpSelect?.value).toBe('4');
    expect(tbSelect?.value).toBe('8');
    expect(downtimeDisplay?.textContent).toBe('8');
  });
});

describe('XP change cascades to downtime days via treasure bundles', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');

    (global as any).game = {
      system: { id: 'pf2e' },
      modules: { get: () => undefined },
      settings: { set: jest.fn().mockResolvedValue(undefined) }
    };

    // Treasure bundles select (needed by updateDowntimeDaysDisplay for Series 1 Quest detection)
    const tbSelect = document.createElement('select');
    tbSelect.id = 'treasureBundles';
    for (const value of ['0', '2', '2.5', '3', '4', '5', '6', '7', '8', '9', '10']) {
      const option = document.createElement('option');
      option.value = value;
      tbSelect.appendChild(option);
    }
    container.appendChild(tbSelect);

    // Downtime days display + hidden input
    const downtimeDisplay = document.createElement('div');
    downtimeDisplay.className = 'downtime-days-value';
    downtimeDisplay.textContent = '0';
    container.appendChild(downtimeDisplay);

    const downtimeInput = document.createElement('input');
    downtimeInput.type = 'hidden';
    downtimeInput.id = 'downtimeDays';
    container.appendChild(downtimeInput);
  });

  afterEach(() => {
    delete (global as any).game;
  });

  it('should set 0 downtime days after treasure is set to 2 for bounty (1 XP)', () => {
    // Simulate the cascade: first set treasure, then calculate downtime
    updateTreasureBundlesForXp(1, container);
    updateDowntimeDaysDisplay(1, container);

    const downtimeDisplay = container.querySelector('.downtime-days-value');
    expect(downtimeDisplay?.textContent).toBe('0');
  });

  it('should set 4 downtime days after treasure is set to 4 for quest (2 XP)', () => {
    updateTreasureBundlesForXp(2, container);
    updateDowntimeDaysDisplay(2, container);

    const downtimeDisplay = container.querySelector('.downtime-days-value');
    expect(downtimeDisplay?.textContent).toBe('4');
  });

  it('should set 8 downtime days after treasure is set to 8 for scenario (4 XP)', () => {
    updateTreasureBundlesForXp(4, container);
    updateDowntimeDaysDisplay(4, container);

    const downtimeDisplay = container.querySelector('.downtime-days-value');
    expect(downtimeDisplay?.textContent).toBe('8');
  });
});
