/**
 * Unit tests for collapse-state-storage module
 *
 * Tests localStorage persistence of collapsible section states.
 *
 * @jest-environment jsdom
 */

import {
  saveCollapseState,
  loadCollapseState,
  getDefaultCollapseState,
  loadAllCollapseStates,
} from './collapse-state-storage';

const STORAGE_KEY = 'pfs-chronicle-generator.collapseSections';

describe('collapse-state-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveCollapseState', () => {
    it('should save a collapse state to localStorage', () => {
      saveCollapseState('event-details', true);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored['event-details']).toBe(true);
    });

    it('should preserve existing states when saving a new one', () => {
      saveCollapseState('event-details', true);
      saveCollapseState('reputation', false);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored['event-details']).toBe(true);
      expect(stored['reputation']).toBe(false);
    });

    it('should overwrite an existing state for the same section', () => {
      saveCollapseState('event-details', true);
      saveCollapseState('event-details', false);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored['event-details']).toBe(false);
    });

    it('should handle localStorage errors gracefully', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });

      saveCollapseState('event-details', true);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save collapse state'),
        expect.any(Error)
      );

      warnSpy.mockRestore();
      jest.restoreAllMocks();
    });
  });

  describe('loadCollapseState', () => {
    it('should return the saved state for a section', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'event-details': true }));

      expect(loadCollapseState('event-details')).toBe(true);
    });

    it('should return null for a section not in storage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'event-details': true }));

      expect(loadCollapseState('reputation')).toBeNull();
    });

    it('should return null when localStorage is empty', () => {
      expect(loadCollapseState('event-details')).toBeNull();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, 'not-valid-json');

      expect(loadCollapseState('event-details')).toBeNull();

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('getDefaultCollapseState', () => {
    it('should return true for event-details (collapsed by default)', () => {
      expect(getDefaultCollapseState('event-details')).toBe(true);
    });

    it('should return true for reputation (collapsed by default)', () => {
      expect(getDefaultCollapseState('reputation')).toBe(true);
    });

    it('should return true for shared-rewards (collapsed by default)', () => {
      expect(getDefaultCollapseState('shared-rewards')).toBe(true);
    });

    it('should return false for adventure-summary (expanded by default)', () => {
      expect(getDefaultCollapseState('adventure-summary')).toBe(false);
    });

    it('should return false for items-to-strike-out (expanded by default)', () => {
      expect(getDefaultCollapseState('items-to-strike-out')).toBe(false);
    });

    it('should return false for unknown section IDs', () => {
      expect(getDefaultCollapseState('unknown-section')).toBe(false);
    });
  });

  describe('loadAllCollapseStates', () => {
    it('should return all saved states', () => {
      const states = { 'event-details': true, 'reputation': false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));

      expect(loadAllCollapseStates()).toEqual(states);
    });

    it('should return empty object when localStorage is empty', () => {
      expect(loadAllCollapseStates()).toEqual({});
    });

    it('should return empty object for invalid JSON', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, '{invalid');

      expect(loadAllCollapseStates()).toEqual({});
      warnSpy.mockRestore();
    });

    it('should return empty object for non-object stored value', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, JSON.stringify('a string'));

      expect(loadAllCollapseStates()).toEqual({});

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid collapse state data')
      );
      warnSpy.mockRestore();
    });

    it('should return empty object for null stored value', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, JSON.stringify(null));

      expect(loadAllCollapseStates()).toEqual({});
      warnSpy.mockRestore();
    });
  });
});
