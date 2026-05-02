/**
 * @jest-environment jsdom
 *
 * Tests for the "Slow Advancement" notes annotation toggled by the
 * slow track checkbox via updateSlowTrackDisplays().
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { updateSlowTrackDisplays } from '../../scripts/handlers/shared-rewards-handlers';

// Minimal game stub required by shared-rewards-handlers imports
beforeAll(() => {
  (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
});

afterAll(() => {
  delete (globalThis as any).game;
});

/**
 * Builds a minimal DOM container with a slow track checkbox and notes textarea
 * for a given character ID.
 */
function buildContainer(characterId: string, opts: {
  slowTrack?: boolean;
  notes?: string;
  xpEarned?: number;
} = {}): HTMLElement {
  const container = document.createElement('div');

  // Slow track checkbox
  const slowTrackCheckbox = document.createElement('input');
  slowTrackCheckbox.type = 'checkbox';
  slowTrackCheckbox.name = `characters.${characterId}.slowTrack`;
  slowTrackCheckbox.checked = opts.slowTrack ?? false;
  container.appendChild(slowTrackCheckbox);

  // Notes textarea
  const notesTextarea = document.createElement('textarea');
  notesTextarea.name = `characters.${characterId}.notes`;
  notesTextarea.value = opts.notes ?? '';
  container.appendChild(notesTextarea);

  // XP earned select (needed by updateSlowTrackXpLabel)
  const xpSelect = document.createElement('select');
  xpSelect.id = 'xpEarned';
  const option = document.createElement('option');
  option.value = String(opts.xpEarned ?? 4);
  option.selected = true;
  xpSelect.appendChild(option);
  container.appendChild(xpSelect);

  return container;
}

function getNotesValue(container: HTMLElement, characterId: string): string {
  const textarea = container.querySelector<HTMLTextAreaElement>(
    `textarea[name="characters.${characterId}.notes"]`
  );
  return textarea?.value ?? '';
}

describe('Slow track notes annotation', () => {
  const characterId = 'actor-1';

  it('should append "Slow Advancement" when slow track is checked and notes are empty', () => {
    const container = buildContainer(characterId, { slowTrack: true, notes: '' });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('Slow Advancement');
  });

  it('should append "Slow Advancement" as the last line when notes already have content', () => {
    const container = buildContainer(characterId, {
      slowTrack: true,
      notes: 'Found the artifact',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('Found the artifact\nSlow Advancement');
  });

  it('should not duplicate "Slow Advancement" if already present', () => {
    const container = buildContainer(characterId, {
      slowTrack: true,
      notes: 'GM Credit\nSlow Advancement',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('GM Credit\nSlow Advancement');
  });

  it('should remove "Slow Advancement" line when slow track is unchecked', () => {
    const container = buildContainer(characterId, {
      slowTrack: false,
      notes: 'GM Credit\nSlow Advancement',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('GM Credit');
  });

  it('should remove "Slow Advancement" even with surrounding whitespace on the line', () => {
    const container = buildContainer(characterId, {
      slowTrack: false,
      notes: 'GM Credit\n  Slow Advancement  ',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('GM Credit');
  });

  it('should leave other notes untouched when removing "Slow Advancement"', () => {
    const container = buildContainer(characterId, {
      slowTrack: false,
      notes: 'GM Credit\nSlow Advancement\nSaved the village',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('GM Credit\nSaved the village');
  });

  it('should not modify notes when unchecking slow track if "Slow Advancement" is not present', () => {
    const container = buildContainer(characterId, {
      slowTrack: false,
      notes: 'GM Credit\nSome other note',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('GM Credit\nSome other note');
  });

  it('should not remove partial matches like "Slow Advancement Training"', () => {
    const container = buildContainer(characterId, {
      slowTrack: false,
      notes: 'Slow Advancement Training\nSlow Advancement',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('Slow Advancement Training');
  });

  it('should handle notes ending with a newline when adding', () => {
    const container = buildContainer(characterId, {
      slowTrack: true,
      notes: 'GM Credit\n',
    });
    updateSlowTrackDisplays(characterId, container);
    expect(getNotesValue(container, characterId)).toBe('GM Credit\nSlow Advancement');
  });
});
