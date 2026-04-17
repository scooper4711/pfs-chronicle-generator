/**
 * Unit tests for the session report builder.
 *
 * Covers edge cases and fallback branches not exercised by property tests,
 * including actors with missing PFS data and actors not in the characters map.
 *
 * Requirements: paizo-session-reporting 4.1–4.11, 9.1–9.6
 */

import { buildSessionReport, buildGameDateTime, SessionReportActor, SessionReportBuildParams } from '../../scripts/model/session-report-builder';
import { createSharedFields, createUniqueFields } from './test-helpers';
import type { SharedFields } from '../../scripts/model/party-chronicle-types';

/** Fixed time for deterministic gameDate output: 2025-06-15T14:10:00Z → rounds to 14:00 */
const FIXED_NOW = new Date('2025-06-15T14:10:00Z');

/** Set up a minimal game global so getGameSystem() defaults to pf2e */
beforeEach(() => {
  (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
});

afterEach(() => {
  delete (globalThis as any).game;
});

describe('buildSessionReport edge cases', () => {
  it('defaults orgPlayNumber to 0 when actor has no system data', () => {
    const actor: SessionReportActor = { id: 'a1', name: 'No System' };
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ eventDate: '2025-01-01', gmPfsNumber: '99999' }),
      characters: { a1: createUniqueFields({ characterName: 'No System' }) },
      partyActors: [actor],
      layoutId: 'pfs2.s1-01',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);

    expect(report.signUps).toHaveLength(1);
    expect(report.signUps[0].orgPlayNumber).toBe(0);
    expect(report.signUps[0].characterNumber).toBe(0);
    expect(report.signUps[0].faction).toBe('');
  });

  it('defaults orgPlayNumber to 0 when actor has system but no pfs', () => {
    const actor: SessionReportActor = { id: 'a1', name: 'No PFS', system: {} };
    const params: SessionReportBuildParams = {
      shared: createSharedFields(),
      characters: { a1: createUniqueFields({ characterName: 'No PFS' }) },
      partyActors: [actor],
      layoutId: 'pfs2.s1-01',
    };

    const report = buildSessionReport(params);

    expect(report.signUps[0].orgPlayNumber).toBe(0);
    expect(report.signUps[0].characterNumber).toBe(0);
    expect(report.signUps[0].faction).toBe('');
  });

  it('defaults orgPlayNumber to 0 when pfs fields are undefined', () => {
    const actor: SessionReportActor = {
      id: 'a1',
      name: 'Empty PFS',
      system: { pfs: {} },
    };
    const params: SessionReportBuildParams = {
      shared: createSharedFields(),
      characters: { a1: createUniqueFields({ characterName: 'Empty PFS' }) },
      partyActors: [actor],
      layoutId: 'pfs2.s1-01',
    };

    const report = buildSessionReport(params);

    expect(report.signUps[0].orgPlayNumber).toBe(0);
    expect(report.signUps[0].characterNumber).toBe(0);
    expect(report.signUps[0].faction).toBe('');
  });

  it('uses raw faction string when currentFaction is not in FACTION_NAMES', () => {
    const actor: SessionReportActor = {
      id: 'a1',
      name: 'Unknown Faction',
      system: { pfs: { playerNumber: 12345, characterNumber: 1, currentFaction: 'XX' } },
    };
    const params: SessionReportBuildParams = {
      shared: createSharedFields(),
      characters: { a1: createUniqueFields() },
      partyActors: [actor],
      layoutId: 'pfs2.s1-01',
    };

    const report = buildSessionReport(params);

    expect(report.signUps[0].faction).toBe('XX');
  });

  it('excludes actors not present in the characters map', () => {
    const actor1: SessionReportActor = { id: 'a1', name: 'In Map', system: { pfs: { playerNumber: 111, characterNumber: 1, currentFaction: 'EA' } } };
    const actor2: SessionReportActor = { id: 'a2', name: 'Not In Map', system: { pfs: { playerNumber: 222, characterNumber: 2, currentFaction: 'GA' } } };
    const params: SessionReportBuildParams = {
      shared: createSharedFields(),
      characters: { a1: createUniqueFields({ characterName: 'In Map' }) },
      partyActors: [actor1, actor2],
      layoutId: 'pfs2.s1-01',
    };

    const report = buildSessionReport(params);

    expect(report.signUps).toHaveLength(1);
    expect(report.signUps[0].characterName).toBe('In Map');
  });

  it('defaults gmOrgPlayNumber to 0 for non-numeric GM PFS number', () => {
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ gmPfsNumber: 'not-a-number' }),
      characters: {},
      partyActors: [],
      layoutId: 'pfs2.s1-01',
    };

    const report = buildSessionReport(params);

    expect(report.gmOrgPlayNumber).toBe(0);
  });

  it('assembles a complete report with realistic data', () => {
    const actors: SessionReportActor[] = [
      { id: 'a1', name: 'Valeros', system: { pfs: { playerNumber: 12345, characterNumber: 2001, currentFaction: 'EA' } } },
      { id: 'a2', name: 'Kyra', system: { pfs: { playerNumber: 67890, characterNumber: 2002, currentFaction: 'VS' } } },
    ];
    const params: SessionReportBuildParams = {
      shared: createSharedFields({
        eventDate: '2025-03-15',
        gmPfsNumber: '99999',
        reportingA: true,
        reportingB: false,
        reportingC: true,
        reportingD: false,
        chosenFactionReputation: 4,
        reputationValues: { EA: 2, GA: 3, HH: 0, VS: 1, RO: 0, VW: 0 },
      }),
      characters: {
        a1: createUniqueFields({ characterName: 'Valeros', consumeReplay: false }),
        a2: createUniqueFields({ characterName: 'Kyra', consumeReplay: true }),
      },
      partyActors: actors,
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);

    expect(report.gameDate).toBe('2025-03-15T14:00:00+00:00');
    expect(report.gameSystem).toBe('PFS2E');
    expect(report.generateGmChronicle).toBe(false);
    expect(report.gmOrgPlayNumber).toBe(99999);
    expect(report.repEarned).toBe(4);
    expect(report.reportingA).toBe(true);
    expect(report.reportingC).toBe(true);
    expect(report.scenario).toBe('PFS2E 5-18');

    expect(report.signUps).toHaveLength(2);
    expect(report.signUps[0].orgPlayNumber).toBe(12345);
    expect(report.signUps[0].characterName).toBe('Valeros');
    expect(report.signUps[0].faction).toBe("Envoy's Alliance");
    expect(report.signUps[1].orgPlayNumber).toBe(67890);
    expect(report.signUps[1].consumeReplay).toBe(true);
    expect(report.signUps[1].faction).toBe('Vigilant Seal');

    // Bonus rep: EA=2, GA=3, VS=1 (all non-zero factions included, HH/RO/VW are 0)
    expect(report.bonusRepEarned).toHaveLength(3);
    expect(report.bonusRepEarned.find(b => b.faction === "Envoy's Alliance")?.reputation).toBe(2);
    expect(report.bonusRepEarned.find(b => b.faction === 'Grand Archive')?.reputation).toBe(3);
    expect(report.bonusRepEarned.find(b => b.faction === 'Vigilant Seal')?.reputation).toBe(1);
  });

  it('treats missing reputation keys as zero via nullish coalescing fallback', () => {
    // reputationValues is typed with all 6 keys required, but at runtime
    // a partial object could arrive. The ?? 0 fallback handles this defensively.
    const partialReputation = { EA: 3, GA: 0 } as SharedFields['reputationValues'];
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ reputationValues: partialReputation }),
      characters: {},
      partyActors: [],
      layoutId: 'pfs2.s1-01',
    };

    const report = buildSessionReport(params);

    // Only EA (value 3) should appear; GA is 0, and missing keys default to 0
    expect(report.bonusRepEarned).toHaveLength(1);
    expect(report.bonusRepEarned[0].faction).toBe("Envoy's Alliance");
    expect(report.bonusRepEarned[0].reputation).toBe(3);
  });
});

/**
 * GM character session reporting tests.
 *
 * Validates that the GM character is included in the session report
 * with isGM: true and correct field values.
 *
 * Requirements: gm-character-party-sheet 6.1, 6.2, 6.3
 */
describe('GM character session reporting', () => {
  const gmActor: SessionReportActor = {
    id: 'gm-char-1',
    name: 'GM Character',
    system: {
      pfs: {
        playerNumber: 54321,
        characterNumber: 2003,
        currentFaction: 'GA',
      },
    },
  };

  it('includes GM character SignUp with isGM: true (Req 6.1, 6.2)', () => {
    const partyActor: SessionReportActor = {
      id: 'p1',
      name: 'Valeros',
      system: { pfs: { playerNumber: 11111, characterNumber: 1, currentFaction: 'EA' } },
    };
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ chosenFactionReputation: 2 }),
      characters: { p1: createUniqueFields({ characterName: 'Valeros' }) },
      partyActors: [partyActor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
      gmCharacterActor: gmActor,
      gmCharacterFields: createUniqueFields({ characterName: 'GM Character', consumeReplay: true }),
    };

    const report = buildSessionReport(params);

    const gmSignUps = report.signUps.filter((s) => s.isGM);
    expect(gmSignUps).toHaveLength(1);
    expect(report.signUps.filter((s) => !s.isGM)).toHaveLength(1);
  });

  it('populates GM character SignUp with correct field values (Req 6.3)', () => {
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ chosenFactionReputation: 3 }),
      characters: {},
      partyActors: [],
      layoutId: 'pfs2.s1-01',
      now: FIXED_NOW,
      gmCharacterActor: gmActor,
      gmCharacterFields: createUniqueFields({ characterName: 'Zephyr', consumeReplay: true }),
    };

    const report = buildSessionReport(params);

    expect(report.signUps).toHaveLength(1);
    const gm = report.signUps[0];
    expect(gm.isGM).toBe(true);
    expect(gm.orgPlayNumber).toBe(54321);
    expect(gm.characterNumber).toBe(2003);
    expect(gm.characterName).toBe('Zephyr');
    expect(gm.faction).toBe('Grand Archive');
    expect(gm.repEarned).toBe(3);
    expect(gm.consumeReplay).toBe(true);
  });

  it('produces no isGM: true entries when GM character is not provided (Req 6.1)', () => {
    const partyActor: SessionReportActor = {
      id: 'p1',
      name: 'Seelah',
      system: { pfs: { playerNumber: 22222, characterNumber: 2, currentFaction: 'VS' } },
    };
    const params: SessionReportBuildParams = {
      shared: createSharedFields(),
      characters: { p1: createUniqueFields({ characterName: 'Seelah' }) },
      partyActors: [partyActor],
      layoutId: 'pfs2.s1-01',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);

    expect(report.signUps).toHaveLength(1);
    expect(report.signUps.every((s) => s.isGM === false)).toBe(true);
  });
});

describe('buildGameDateTime', () => {
  it('rounds minutes 0–14 down to :00', () => {
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T10:00:00Z'))).toBe('2025-03-15T10:00:00+00:00');
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T10:14:59Z'))).toBe('2025-03-15T10:00:00+00:00');
  });

  it('rounds minutes 15–44 to :30', () => {
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T10:15:00Z'))).toBe('2025-03-15T10:30:00+00:00');
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T10:44:59Z'))).toBe('2025-03-15T10:30:00+00:00');
  });

  it('rounds minutes 45–59 up to next hour :00', () => {
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T10:45:00Z'))).toBe('2025-03-15T11:00:00+00:00');
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T10:59:59Z'))).toBe('2025-03-15T11:00:00+00:00');
  });

  it('handles hour rollover at 23:45+ producing 00:00', () => {
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T23:45:00Z'))).toBe('2025-03-15T00:00:00+00:00');
    expect(buildGameDateTime('2025-03-15', new Date('2025-03-15T23:59:59Z'))).toBe('2025-03-15T00:00:00+00:00');
  });

  it('preserves eventDate in the output', () => {
    expect(buildGameDateTime('2026-12-31', new Date('2025-03-15T08:20:00Z'))).toBe('2026-12-31T08:30:00+00:00');
  });
});

/**
 * Override-aware session report tests.
 *
 * Validates that XP and currency overrides replace calculated values
 * in the session report when active, and that calculated values are
 * used when overrides are inactive.
 *
 * Requirements: gm-override-values 7.1, 7.2, 7.3
 */
describe('Override-aware session report', () => {
  const partyActor: SessionReportActor = {
    id: 'p1',
    name: 'Valeros',
    system: { pfs: { playerNumber: 11111, characterNumber: 1, currentFaction: 'EA' } },
  };

  /**
   * Requirements: gm-override-values 7.1
   */
  it('uses override XP when overrideXp is active', () => {
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ xpEarned: 4 }),
      characters: {
        p1: createUniqueFields({
          characterName: 'Valeros',
          overrideXp: true,
          overrideXpValue: 2,
          taskLevel: '-',
        }),
      },
      partyActors: [partyActor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);

    expect(report.signUps[0].xpEarned).toBe(2);
  });

  /**
   * Requirements: gm-override-values 7.2
   */
  it('uses override currency when overrideCurrency is active', () => {
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ treasureBundles: 2, downtimeDays: 4 }),
      characters: {
        p1: createUniqueFields({
          characterName: 'Valeros',
          overrideCurrency: true,
          overrideCurrencyValue: 150.5,
          level: 5,
          taskLevel: 3,
          successLevel: 'success',
          proficiencyRank: 'trained',
        }),
      },
      partyActors: [partyActor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);

    expect(report.signUps[0].currencyGained).toBe(150.5);
  });

  /**
   * Requirements: gm-override-values 7.3
   */
  it('uses calculated values when overrides are inactive', () => {
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ xpEarned: 4, treasureBundles: 2, downtimeDays: 4 }),
      characters: {
        p1: createUniqueFields({
          characterName: 'Valeros',
          overrideXp: false,
          overrideXpValue: 99,
          overrideCurrency: false,
          overrideCurrencyValue: 999,
          level: 5,
          taskLevel: 3,
          successLevel: 'success',
          proficiencyRank: 'trained',
        }),
      },
      partyActors: [partyActor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);

    expect(report.signUps[0].xpEarned).toBe(4);
    // Level 5: 2 × 10 = 20 (treasure bundles)
    // Level 3 trained success: 0.5 gp/day × 4 days = 2 gp (earned income)
    // Total: 20 + 2 = 22
    expect(report.signUps[0].currencyGained).toBe(22);
  });

  /**
   * Requirements: gm-override-values 7.1, 7.2 — GM character overrides
   */
  it('uses override values for GM character in session report', () => {
    const gmActor: SessionReportActor = {
      id: 'gm-char-1',
      name: 'GM Character',
      system: { pfs: { playerNumber: 54321, characterNumber: 2003, currentFaction: 'GA' } },
    };

    const params: SessionReportBuildParams = {
      shared: createSharedFields({ xpEarned: 4, treasureBundles: 2, downtimeDays: 4 }),
      characters: {
        p1: createUniqueFields({ characterName: 'Valeros' }),
      },
      partyActors: [partyActor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
      gmCharacterActor: gmActor,
      gmCharacterFields: createUniqueFields({
        characterName: 'GM Character',
        overrideXp: true,
        overrideXpValue: 6,
        overrideCurrency: true,
        overrideCurrencyValue: 300,
        level: 10,
        taskLevel: '-',
      }),
    };

    const report = buildSessionReport(params);

    const gmSignUp = report.signUps.find((s) => s.isGM);
    expect(gmSignUp).toBeDefined();
    expect(gmSignUp!.xpEarned).toBe(6);
    expect(gmSignUp!.currencyGained).toBe(300);
  });
});
