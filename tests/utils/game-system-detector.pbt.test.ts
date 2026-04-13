/**
 * Property-based tests for game system detector
 *
 * Feature: starfinder-support, Property 1: Anachronism Module Triggers Starfinder Detection
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { getGameSystem } from '../../scripts/utils/game-system-detector';

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

describe('Game System Detector Property-Based Tests', () => {
  beforeEach(() => {
    delete (globalThis as any).game;
  });

  // Feature: starfinder-support, Property 1: Anachronism Module Triggers Starfinder Detection
  // **Validates: Requirements 1.1, 1.2, 1.3**
  describe('Property 1: Anachronism Module Triggers Starfinder Detection', () => {
    it('should return sf2e for any system ID when anachronism module is active', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (systemId) => {
            setupGameGlobal(systemId, true);
            expect(getGameSystem()).toBe('sf2e');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return pf2e when system ID is not sf2e and anachronism module is not active', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s !== 'sf2e'),
          (systemId) => {
            setupGameGlobal(systemId, false);
            expect(getGameSystem()).toBe('pf2e');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return sf2e when system ID is sf2e regardless of anachronism module state', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (anachronismActive) => {
            setupGameGlobal('sf2e', anachronismActive);
            expect(getGameSystem()).toBe('sf2e');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
