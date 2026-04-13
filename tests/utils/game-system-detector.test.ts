/**
 * Unit tests for game system detector
 *
 * Tests all detection branches: sf2e system ID, anachronism module active,
 * both conditions, neither condition.
 *
 * Requirements: starfinder-support 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getGameSystem, isStarfinder, isPathfinder } from '../../scripts/utils/game-system-detector';

function setupGameGlobal(systemId: string, anachronismActive?: boolean) {
  const modules = new Map<string, { active: boolean }>();
  if (anachronismActive !== undefined) {
    modules.set('sf2e-anachronism', { active: anachronismActive });
  }

  (globalThis as any).game = {
    system: { id: systemId },
    modules,
  };
}

describe('Game System Detector', () => {
  beforeEach(() => {
    delete (globalThis as any).game;
  });

  describe('getGameSystem', () => {
    it('should return sf2e when game.system.id is sf2e', () => {
      setupGameGlobal('sf2e');
      expect(getGameSystem()).toBe('sf2e');
    });

    it('should return sf2e when anachronism module is active', () => {
      setupGameGlobal('pf2e', true);
      expect(getGameSystem()).toBe('sf2e');
    });

    it('should return sf2e when both system ID is sf2e and anachronism is active', () => {
      setupGameGlobal('sf2e', true);
      expect(getGameSystem()).toBe('sf2e');
    });

    it('should return pf2e when system ID is pf2e and anachronism is not active', () => {
      setupGameGlobal('pf2e', false);
      expect(getGameSystem()).toBe('pf2e');
    });

    it('should return pf2e when system ID is pf2e and anachronism module is absent', () => {
      setupGameGlobal('pf2e');
      expect(getGameSystem()).toBe('pf2e');
    });

    it('should return pf2e when game.system.id is an unknown value and anachronism is not active', () => {
      setupGameGlobal('dnd5e', false);
      expect(getGameSystem()).toBe('pf2e');
    });

    it('should return pf2e when game global has no system property', () => {
      (globalThis as any).game = { modules: new Map() };
      expect(getGameSystem()).toBe('pf2e');
    });

    it('should return pf2e when game global is empty', () => {
      (globalThis as any).game = {};
      expect(getGameSystem()).toBe('pf2e');
    });
  });

  describe('isStarfinder', () => {
    it('should return true when system is sf2e', () => {
      setupGameGlobal('sf2e');
      expect(isStarfinder()).toBe(true);
    });

    it('should return true when anachronism module is active', () => {
      setupGameGlobal('pf2e', true);
      expect(isStarfinder()).toBe(true);
    });

    it('should return false when system is pf2e without anachronism', () => {
      setupGameGlobal('pf2e', false);
      expect(isStarfinder()).toBe(false);
    });
  });

  describe('isPathfinder', () => {
    it('should return true when system is pf2e without anachronism', () => {
      setupGameGlobal('pf2e', false);
      expect(isPathfinder()).toBe(true);
    });

    it('should return false when system is sf2e', () => {
      setupGameGlobal('sf2e');
      expect(isPathfinder()).toBe(false);
    });

    it('should return false when anachronism module is active', () => {
      setupGameGlobal('pf2e', true);
      expect(isPathfinder()).toBe(false);
    });
  });
});
