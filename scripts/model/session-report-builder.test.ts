/**
 * Unit tests for the session report builder.
 *
 * Covers edge cases and fallback branches not exercised by property tests,
 * including actors with missing PFS data and actors not in the characters map.
 *
 * Requirements: paizo-session-reporting 4.1–4.11, 9.1–9.6
 */

import { buildSessionReport, SessionReportActor, SessionReportBuildParams } from './session-report-builder';
import { createSharedFields, createUniqueFields } from './test-helpers';

describe('buildSessionReport edge cases', () => {
  it('defaults orgPlayNumber to 0 when actor has no system data', () => {
    const actor: SessionReportActor = { id: 'a1', name: 'No System' };
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ eventDate: '2025-01-01', gmPfsNumber: '99999' }),
      characters: { a1: createUniqueFields({ characterName: 'No System' }) },
      partyActors: [actor],
      layoutId: 'pfs2.s1-01',
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
        chosenFaction: 'EA',
        chosenFactionReputation: 4,
        reputationValues: { EA: 2, GA: 3, HH: 0, VS: 1, RO: 0, VW: 0 },
      }),
      characters: {
        a1: createUniqueFields({ characterName: 'Valeros', consumeReplay: false }),
        a2: createUniqueFields({ characterName: 'Kyra', consumeReplay: true }),
      },
      partyActors: actors,
      layoutId: 'pfs2.s5-18',
    };

    const report = buildSessionReport(params);

    expect(report.gameDate).toBe('2025-03-15');
    expect(report.gameSystem).toBe('PFS2E');
    expect(report.generateGmChronicle).toBe(false);
    expect(report.gmOrgPlayNumber).toBe(99999);
    expect(report.repEarned).toBe(0);
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

    // Bonus rep: GA=3, VS=1 (EA excluded as chosen, HH/RO/VW are 0)
    expect(report.bonusRepEarned).toHaveLength(2);
    expect(report.bonusRepEarned.find(b => b.faction === 'Grand Archive')?.reputation).toBe(3);
    expect(report.bonusRepEarned.find(b => b.faction === 'Vigilant Seal')?.reputation).toBe(1);
  });
});
