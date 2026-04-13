/**
 * Unit tests for Starfinder session report builder.
 *
 * Tests that the gameSystem field is set correctly based on the
 * detected game system (sf2e → SFS2E, pf2e → PFS2E).
 *
 * Requirements: starfinder-support 8.1, 8.2
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { buildSessionReport, SessionReportBuildParams } from '../../scripts/model/session-report-builder';
import { createSharedFields, createUniqueFields } from './test-helpers';

/** Fixed time for deterministic gameDate output */
const FIXED_NOW = new Date('2025-06-15T14:10:00Z');

function setupGameGlobal(systemId: string, anachronismActive?: boolean): void {
  const modules = new Map<string, { active: boolean }>();
  if (anachronismActive !== undefined) {
    modules.set('sf2e-anachronism', { active: anachronismActive });
  }

  (globalThis as any).game = {
    system: { id: systemId },
    modules,
  };
}

function buildMinimalParams(layoutId = 'pfs2.s5-18'): SessionReportBuildParams {
  return {
    shared: createSharedFields({ eventDate: '2025-01-01' }),
    characters: { a1: createUniqueFields({ characterName: 'Test' }) },
    partyActors: [{ id: 'a1', name: 'Test' }],
    layoutId,
    now: FIXED_NOW,
  };
}

describe('Starfinder session report gameSystem field', () => {
  beforeEach(() => {
    delete (globalThis as any).game;
  });

  it('sets gameSystem to "SFS2E" when detector returns sf2e (system ID)', () => {
    setupGameGlobal('sf2e');
    const report = buildSessionReport(buildMinimalParams('sfs2.s1-01'));
    expect(report.gameSystem).toBe('SFS2E');
  });

  it('sets gameSystem to "SFS2E" when anachronism module is active', () => {
    setupGameGlobal('pf2e', true);
    const report = buildSessionReport(buildMinimalParams('sfs2.s1-01'));
    expect(report.gameSystem).toBe('SFS2E');
  });

  it('sets gameSystem to "PFS2E" when detector returns pf2e', () => {
    setupGameGlobal('pf2e', false);
    const report = buildSessionReport(buildMinimalParams());
    expect(report.gameSystem).toBe('PFS2E');
  });

  it('sets gameSystem to "PFS2E" when game global is empty (default)', () => {
    (globalThis as any).game = {};
    const report = buildSessionReport(buildMinimalParams());
    expect(report.gameSystem).toBe('PFS2E');
  });
});
