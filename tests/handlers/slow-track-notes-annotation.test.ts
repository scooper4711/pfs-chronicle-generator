/**
 * @jest-environment jsdom
 *
 * Tests for the slow track display updates triggered by updateSlowTrackDisplays():
 * - "Slow Advancement" notes annotation toggle
 * - XP label halving
 * - Earned income display with halved downtime days
 * - Treasure bundle gold display halving
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { updateSlowTrackDisplays } from '../../scripts/handlers/shared-rewards-handlers';

beforeAll(() => {
  (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
});

afterAll(() => {
  delete (globalThis as any).game;
});

interface ContainerOptions {
  slowTrack?: boolean;
  notes?: string;
  xpEarned?: number;
  overrideXp?: boolean;
  overrideCurrency?: boolean;
  treasureBundles?: number;
  downtimeDays?: number;
  characterLevel?: number;
  taskLevel?: string;
  successLevel?: string;
  proficiencyRank?: string;
}

/**
 * Builds a DOM container that mirrors the real template structure enough
 * for updateSlowTrackDisplays to exercise all its code paths.
 */
function buildContainer(characterId: string, opts: ContainerOptions = {}): HTMLElement {
  const container = document.createElement('div');

  // Slow track checkbox
  const slowTrackCb = document.createElement('input');
  slowTrackCb.type = 'checkbox';
  slowTrackCb.name = `characters.${characterId}.slowTrack`;
  slowTrackCb.checked = opts.slowTrack ?? false;
  container.appendChild(slowTrackCb);

  // Notes textarea
  const notes = document.createElement('textarea');
  notes.name = `characters.${characterId}.notes`;
  notes.value = opts.notes ?? '';
  container.appendChild(notes);

  // Shared XP earned select
  const xpSelect = document.createElement('select');
  xpSelect.id = 'xpEarned';
  const xpOpt = document.createElement('option');
  xpOpt.value = String(opts.xpEarned ?? 4);
  xpOpt.selected = true;
  xpSelect.appendChild(xpOpt);
  container.appendChild(xpSelect);

  // Override XP checkbox
  const overrideXpCb = document.createElement('input');
  overrideXpCb.type = 'checkbox';
  overrideXpCb.name = `characters.${characterId}.overrideXp`;
  overrideXpCb.checked = opts.overrideXp ?? false;
  container.appendChild(overrideXpCb);

  // Override currency checkbox
  const overrideCurrencyCb = document.createElement('input');
  overrideCurrencyCb.type = 'checkbox';
  overrideCurrencyCb.name = `characters.${characterId}.overrideCurrency`;
  overrideCurrencyCb.checked = opts.overrideCurrency ?? false;
  container.appendChild(overrideCurrencyCb);

  // Shared treasure bundles select
  const tbSelect = document.createElement('select');
  tbSelect.id = 'treasureBundles';
  const tbOpt = document.createElement('option');
  tbOpt.value = String(opts.treasureBundles ?? 2);
  tbOpt.selected = true;
  tbSelect.appendChild(tbOpt);
  container.appendChild(tbSelect);

  // Shared downtime days input
  const dtInput = document.createElement('input');
  dtInput.id = 'downtimeDays';
  dtInput.value = String(opts.downtimeDays ?? 8);
  container.appendChild(dtInput);

  // member-activity wrapper (required by all per-character display selectors)
  const memberActivity = document.createElement('div');
  memberActivity.classList.add('member-activity');
  memberActivity.dataset.characterId = characterId;

  // Calculated XP label
  const xpLabel = document.createElement('span');
  xpLabel.classList.add('calculated-xp-label');
  xpLabel.textContent = `${opts.xpEarned ?? 4} XP`;
  memberActivity.appendChild(xpLabel);

  // Character level input
  const levelInput = document.createElement('input');
  levelInput.name = `characters.${characterId}.level`;
  levelInput.value = String(opts.characterLevel ?? 5);
  memberActivity.appendChild(levelInput);

  // Task level select
  const taskLevelSelect = document.createElement('select');
  taskLevelSelect.name = `characters.${characterId}.taskLevel`;
  const tlOpt = document.createElement('option');
  tlOpt.value = opts.taskLevel ?? '3';
  tlOpt.selected = true;
  taskLevelSelect.appendChild(tlOpt);
  memberActivity.appendChild(taskLevelSelect);

  // Success level select
  const successLevelSelect = document.createElement('select');
  successLevelSelect.name = `characters.${characterId}.successLevel`;
  const slOpt = document.createElement('option');
  slOpt.value = opts.successLevel ?? 'success';
  slOpt.selected = true;
  successLevelSelect.appendChild(slOpt);
  memberActivity.appendChild(successLevelSelect);

  // Proficiency rank select
  const profRankSelect = document.createElement('select');
  profRankSelect.name = `characters.${characterId}.proficiencyRank`;
  const prOpt = document.createElement('option');
  prOpt.value = opts.proficiencyRank ?? 'trained';
  prOpt.selected = true;
  profRankSelect.appendChild(prOpt);
  memberActivity.appendChild(profRankSelect);

  // Earned income display elements
  const eiValue = document.createElement('div');
  eiValue.classList.add('earned-income-value');
  eiValue.textContent = '0 gp';
  memberActivity.appendChild(eiValue);

  const eiHidden = document.createElement('input');
  eiHidden.type = 'hidden';
  eiHidden.classList.add('earned-income-hidden');
  eiHidden.value = '0';
  memberActivity.appendChild(eiHidden);

  // Treasure bundle value display
  const tbValue = document.createElement('span');
  tbValue.classList.add('treasure-bundle-value');
  tbValue.textContent = '0 gp';
  memberActivity.appendChild(tbValue);

  container.appendChild(memberActivity);
  return container;
}

function getNotesValue(container: HTMLElement, characterId: string): string {
  return container.querySelector<HTMLTextAreaElement>(
    `textarea[name="characters.${characterId}.notes"]`
  )?.value ?? '';
}

function getXpLabelText(container: HTMLElement, characterId: string): string {
  return container.querySelector<HTMLElement>(
    `.member-activity[data-character-id="${characterId}"] .calculated-xp-label`
  )?.textContent ?? '';
}

function getTreasureBundleText(container: HTMLElement, characterId: string): string {
  return container.querySelector<HTMLElement>(
    `.member-activity[data-character-id="${characterId}"] .treasure-bundle-value`
  )?.textContent ?? '';
}

// =========================================================================
// Notes annotation tests
// =========================================================================

describe('Slow track notes annotation', () => {
  const id = 'actor-1';

  it('should append "Slow Advancement" when slow track is checked and notes are empty', () => {
    const c = buildContainer(id, { slowTrack: true, notes: '' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('Slow Advancement');
  });

  it('should append "Slow Advancement" as the last line when notes already have content', () => {
    const c = buildContainer(id, { slowTrack: true, notes: 'Found the artifact' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('Found the artifact\nSlow Advancement');
  });

  it('should not duplicate "Slow Advancement" if already present', () => {
    const c = buildContainer(id, { slowTrack: true, notes: 'GM Credit\nSlow Advancement' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('GM Credit\nSlow Advancement');
  });

  it('should remove "Slow Advancement" line when slow track is unchecked', () => {
    const c = buildContainer(id, { slowTrack: false, notes: 'GM Credit\nSlow Advancement' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('GM Credit');
  });

  it('should remove "Slow Advancement" even with surrounding whitespace on the line', () => {
    const c = buildContainer(id, { slowTrack: false, notes: 'GM Credit\n  Slow Advancement  ' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('GM Credit');
  });

  it('should leave other notes untouched when removing "Slow Advancement"', () => {
    const c = buildContainer(id, { slowTrack: false, notes: 'GM Credit\nSlow Advancement\nSaved the village' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('GM Credit\nSaved the village');
  });

  it('should not modify notes when unchecking if "Slow Advancement" is not present', () => {
    const c = buildContainer(id, { slowTrack: false, notes: 'GM Credit\nSome other note' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('GM Credit\nSome other note');
  });

  it('should not remove partial matches like "Slow Advancement Training"', () => {
    const c = buildContainer(id, { slowTrack: false, notes: 'Slow Advancement Training\nSlow Advancement' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('Slow Advancement Training');
  });

  it('should handle notes ending with a newline when adding', () => {
    const c = buildContainer(id, { slowTrack: true, notes: 'GM Credit\n' });
    updateSlowTrackDisplays(id, c);
    expect(getNotesValue(c, id)).toBe('GM Credit\nSlow Advancement');
  });
});

// =========================================================================
// XP label display tests
// =========================================================================

describe('Slow track XP label display', () => {
  const id = 'actor-xp';

  it('should halve XP label when slow track is checked', () => {
    const c = buildContainer(id, { slowTrack: true, xpEarned: 4 });
    updateSlowTrackDisplays(id, c);
    expect(getXpLabelText(c, id)).toBe('2 XP');
  });

  it('should show standard XP label when slow track is unchecked', () => {
    const c = buildContainer(id, { slowTrack: false, xpEarned: 4 });
    updateSlowTrackDisplays(id, c);
    expect(getXpLabelText(c, id)).toBe('4 XP');
  });

  it('should preserve fractional XP: 1 XP → 0.5 XP', () => {
    const c = buildContainer(id, { slowTrack: true, xpEarned: 1 });
    updateSlowTrackDisplays(id, c);
    expect(getXpLabelText(c, id)).toBe('0.5 XP');
  });

  it('should not update XP label when override XP is active', () => {
    const c = buildContainer(id, { slowTrack: true, xpEarned: 4, overrideXp: true });
    updateSlowTrackDisplays(id, c);
    // Label should remain at the original value since override is active
    expect(getXpLabelText(c, id)).toBe('4 XP');
  });
});

// =========================================================================
// Treasure bundle gold display tests
// =========================================================================

describe('Slow track treasure bundle gold display', () => {
  const id = 'actor-tb';

  it('should halve treasure bundle gold when slow track is checked', () => {
    // Level 5: treasure bundle value = 2 × 10 = 20, halved = 10
    const c = buildContainer(id, {
      slowTrack: true,
      treasureBundles: 2,
      characterLevel: 5,
    });
    updateSlowTrackDisplays(id, c);
    expect(getTreasureBundleText(c, id)).toBe('10.00 gp');
  });

  it('should show standard treasure bundle gold when slow track is unchecked', () => {
    const c = buildContainer(id, {
      slowTrack: false,
      treasureBundles: 2,
      characterLevel: 5,
    });
    updateSlowTrackDisplays(id, c);
    expect(getTreasureBundleText(c, id)).toBe('20.00 gp');
  });

  it('should not update treasure bundle gold when override currency is active', () => {
    const c = buildContainer(id, {
      slowTrack: true,
      treasureBundles: 2,
      characterLevel: 5,
      overrideCurrency: true,
    });
    updateSlowTrackDisplays(id, c);
    // Display should remain at original value since override is active
    expect(getTreasureBundleText(c, id)).toBe('0 gp');
  });
});

// =========================================================================
// Earned income display tests
// =========================================================================

describe('Slow track earned income display', () => {
  const id = 'actor-ei';

  it('should calculate earned income with halved downtime when slow track is checked', () => {
    // Level 3 trained success: 0.5 gp/day, 8 days halved to 4 → 2 gp
    const c = buildContainer(id, {
      slowTrack: true,
      downtimeDays: 8,
      taskLevel: '3',
      successLevel: 'success',
      proficiencyRank: 'trained',
    });
    updateSlowTrackDisplays(id, c);
    const eiValue = c.querySelector('.earned-income-value')?.textContent;
    expect(eiValue).toBe('2.00 gp');
  });

  it('should calculate earned income with standard downtime when slow track is unchecked', () => {
    // Level 3 trained success: 0.5 gp/day × 8 days = 4 gp
    const c = buildContainer(id, {
      slowTrack: false,
      downtimeDays: 8,
      taskLevel: '3',
      successLevel: 'success',
      proficiencyRank: 'trained',
    });
    updateSlowTrackDisplays(id, c);
    const eiValue = c.querySelector('.earned-income-value')?.textContent;
    expect(eiValue).toBe('4.00 gp');
  });

  it('should show 0 gp earned income when task level is "-"', () => {
    const c = buildContainer(id, {
      slowTrack: true,
      downtimeDays: 8,
      taskLevel: '-',
    });
    updateSlowTrackDisplays(id, c);
    const eiValue = c.querySelector('.earned-income-value')?.textContent;
    expect(eiValue).toBe('0.00 gp');
  });
});
