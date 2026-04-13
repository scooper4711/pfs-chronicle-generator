/**
 * Unit tests for Starfinder scenario identifier construction.
 *
 * Tests SF layout ID parsing, fallback for non-standard SF IDs,
 * and verifies existing PF2e parsing is unchanged.
 *
 * Requirements: starfinder-support 8.3, 8.4
 */

import { describe, it, expect } from '@jest/globals';
import { buildScenarioIdentifier } from '../../scripts/model/scenario-identifier';

describe('buildScenarioIdentifier — Starfinder layout IDs', () => {
  describe('standard Starfinder scenario layout IDs', () => {
    it('transforms "sfs2.s1-01" to "SFS2E 1-01"', () => {
      expect(buildScenarioIdentifier('sfs2.s1-01')).toBe('SFS2E 1-01');
    });

    it('transforms "sfs2.s2-05" to "SFS2E 2-05"', () => {
      expect(buildScenarioIdentifier('sfs2.s2-05')).toBe('SFS2E 2-05');
    });

    it('transforms "sfs2.s10-12" to "SFS2E 10-12"', () => {
      expect(buildScenarioIdentifier('sfs2.s10-12')).toBe('SFS2E 10-12');
    });
  });

  describe('non-standard Starfinder layout IDs with sfs2 prefix', () => {
    it('falls back to raw suffix for non-scenario SF layout IDs', () => {
      expect(buildScenarioIdentifier('sfs2.generic')).toBe('generic');
    });

    it('falls back to raw suffix for SF season parent layout IDs', () => {
      expect(buildScenarioIdentifier('sfs2.season1')).toBe('season1');
    });
  });

  describe('existing PF2e parsing is unchanged', () => {
    it('transforms "pfs2.s5-18" to "PFS2E 5-18"', () => {
      expect(buildScenarioIdentifier('pfs2.s5-18')).toBe('PFS2E 5-18');
    });

    it('transforms "pfs2.s1-01" to "PFS2E 1-01"', () => {
      expect(buildScenarioIdentifier('pfs2.s1-01')).toBe('PFS2E 1-01');
    });

    it('falls back to raw suffix for PF bounty layout IDs', () => {
      expect(buildScenarioIdentifier('pfs2.b01')).toBe('b01');
    });

    it('returns raw string when no known prefix is present', () => {
      expect(buildScenarioIdentifier('unknown-layout')).toBe('unknown-layout');
    });
  });
});
