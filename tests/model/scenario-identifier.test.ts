/**
 * Unit tests for scenario identifier construction edge cases.
 *
 * Tests specific layout ID examples and non-standard layout IDs
 * (bounties, quests, adventure paths, generic) with fallback behavior.
 *
 * Requirements: paizo-session-reporting 5.1, 5.2
 */

import { describe, it, expect } from '@jest/globals';
import { buildScenarioIdentifier } from '../../scripts/model/scenario-identifier';

describe('buildScenarioIdentifier', () => {
  describe('standard scenario layout IDs', () => {
    it('transforms "pfs2.s5-18" to "PFS2E 5-18"', () => {
      expect(buildScenarioIdentifier('pfs2.s5-18')).toBe('PFS2E 5-18');
    });

    it('transforms "pfs2.s7-03" to "PFS2E 7-03"', () => {
      expect(buildScenarioIdentifier('pfs2.s7-03')).toBe('PFS2E 7-03');
    });

    it('transforms "pfs2.s6-09" to "PFS2E 6-09"', () => {
      expect(buildScenarioIdentifier('pfs2.s6-09')).toBe('PFS2E 6-09');
    });

    it('transforms single-digit season and scenario "pfs2.s1-01" to "PFS2E 1-01"', () => {
      expect(buildScenarioIdentifier('pfs2.s1-01')).toBe('PFS2E 1-01');
    });

    it('transforms double-digit season "pfs2.s10-05" to "PFS2E 10-05"', () => {
      expect(buildScenarioIdentifier('pfs2.s10-05')).toBe('PFS2E 10-05');
    });
  });

  describe('non-standard layout IDs with pfs2 prefix', () => {
    it('falls back to raw suffix for bounty layout IDs', () => {
      expect(buildScenarioIdentifier('pfs2.b01')).toBe('b01');
      expect(buildScenarioIdentifier('pfs2.b04')).toBe('b04');
    });

    it('falls back to raw suffix for quest layout IDs', () => {
      expect(buildScenarioIdentifier('pfs2.q06')).toBe('q06');
      expect(buildScenarioIdentifier('pfs2.q13')).toBe('q13');
    });

    it('falls back to raw suffix for adventure path layout IDs', () => {
      expect(buildScenarioIdentifier('pfs2.ashes3')).toBe('ashes3');
      expect(buildScenarioIdentifier('pfs2.ashes5')).toBe('ashes5');
    });

    it('falls back to raw suffix for generic layout ID', () => {
      expect(buildScenarioIdentifier('pfs2.generic')).toBe('generic');
    });

    it('falls back to raw suffix for season parent layout IDs', () => {
      expect(buildScenarioIdentifier('pfs2.season6')).toBe('season6');
      expect(buildScenarioIdentifier('pfs2.season4a')).toBe('season4a');
    });

    it('falls back to raw suffix for bounties parent layout ID', () => {
      expect(buildScenarioIdentifier('pfs2.bounties')).toBe('bounties');
    });

    it('falls back to raw suffix for quests parent layout ID', () => {
      expect(buildScenarioIdentifier('pfs2.quests')).toBe('quests');
    });

    it('falls back to raw suffix for layout format IDs', () => {
      expect(buildScenarioIdentifier('pfs2.layout1')).toBe('layout1');
    });
  });

  describe('layout IDs without pfs2 prefix', () => {
    it('returns the raw string when no pfs2 prefix is present', () => {
      expect(buildScenarioIdentifier('unknown-layout')).toBe('unknown-layout');
    });

    it('returns an empty string when given an empty string', () => {
      expect(buildScenarioIdentifier('')).toBe('');
    });
  });
});
