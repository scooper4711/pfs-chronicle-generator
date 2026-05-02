/**
 * Property-based, unit, and integration tests for slow track halving logic
 * in the session report builder.
 *
 * Since buildSignUp and buildGmSignUp are private, all tests exercise them
 * through the exported buildSessionReport().
 *
 * Library: fast-check (minimum 100 iterations per property)
 *
 * Requirements: slow-track 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import {
  buildSessionReport,
  SessionReportActor,
  SessionReportBuildParams,
} from '../../scripts/model/session-report-builder';
import type { SharedFields, UniqueFields } from '../../scripts/model/party-chronicle-types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const FACTION_CODES = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;

const FIXED_NOW = new Date('2025-06-15T14:10:00Z');

function createActor(
  id: string,
  faction: string = 'EA',
  playerNumber: number = 12345,
  characterNumber: number = 1,
): SessionReportActor {
  return {
    id,
    name: `Actor ${id}`,
    system: {
      pfs: { playerNumber, characterNumber, currentFaction: faction },
    },
  };
}

function createSharedFields(overrides: Partial<SharedFields> = {}): SharedFields {
  return {
    gmPfsNumber: '12345',
    scenarioName: 'Test Scenario',
    eventCode: 'TEST-001',
    eventDate: '2024-01-15',
    xpEarned: 4,
    adventureSummaryCheckboxes: [],
    strikeoutItems: [],
    treasureBundles: 2,
    layoutId: 'layout-1',
    seasonId: 'season-7',
    blankChroniclePath: '/path/to/chronicle.pdf',
    chosenFactionReputation: 4,
    reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    downtimeDays: 8,
    reportingA: false,
    reportingB: false,
    reportingC: false,
    reportingD: false,
    ...overrides,
  };
}

function createUniqueFields(overrides: Partial<UniqueFields> = {}): UniqueFields {
  return {
    characterName: 'Test Character',
    playerNumber: '12345',
    characterNumber: '2001',
    level: 5,
    taskLevel: 3,
    successLevel: 'success',
    proficiencyRank: 'trained',
    earnedIncome: 0,
    currencySpent: 5,
    notes: '',
    consumeReplay: false,
    overrideXp: false,
    overrideXpValue: 0,
    overrideCurrency: false,
    overrideCurrencyValue: 0,
    slowTrack: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

const reputationValuesArb = fc.record({
  EA: fc.integer({ min: 0, max: 9 }),
  GA: fc.integer({ min: 0, max: 9 }),
  HH: fc.integer({ min: 0, max: 9 }),
  VS: fc.integer({ min: 0, max: 9 }),
  RO: fc.integer({ min: 0, max: 9 }),
  VW: fc.integer({ min: 0, max: 9 }),
});

const sharedFieldsArb = fc.record({
  gmPfsNumber: fc.constant('12345'),
  scenarioName: fc.constant('Test Scenario'),
  eventCode: fc.constant('TEST-001'),
  eventDate: fc.constant('2024-01-15'),
  xpEarned: fc.integer({ min: 0, max: 20 }),
  adventureSummaryCheckboxes: fc.constant([] as string[]),
  strikeoutItems: fc.constant([] as string[]),
  treasureBundles: fc.integer({ min: 0, max: 10 }),
  layoutId: fc.constant('layout-1'),
  seasonId: fc.constant('season-7'),
  blankChroniclePath: fc.constant('/path/to/chronicle.pdf'),
  chosenFactionReputation: fc.integer({ min: 0, max: 9 }),
  reputationValues: reputationValuesArb,
  downtimeDays: fc.integer({ min: 0, max: 8 }),
  reportingA: fc.constant(false),
  reportingB: fc.constant(false),
  reportingC: fc.constant(false),
  reportingD: fc.constant(false),
});

const taskLevelArb = fc.integer({ min: 0, max: 20 });
const successLevelArb = fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success');
const proficiencyRankArb = fc.constantFrom('trained', 'expert', 'master', 'legendary');
const factionArb = fc.constantFrom(...FACTION_CODES);

const uniqueFieldsArb = fc.record({
  characterName: fc.constant('Test'),
  playerNumber: fc.constant('12345'),
  characterNumber: fc.constant('2001'),
  level: fc.integer({ min: 1, max: 20 }),
  taskLevel: taskLevelArb as fc.Arbitrary<number | string>,
  successLevel: successLevelArb,
  proficiencyRank: proficiencyRankArb,
  earnedIncome: fc.constant(0),
  currencySpent: fc.constant(0),
  notes: fc.constant(''),
  consumeReplay: fc.constant(false),
  overrideXp: fc.boolean(),
  overrideXpValue: fc.integer({ min: 0, max: 100 }),
  overrideCurrency: fc.boolean(),
  overrideCurrencyValue: fc.double({ min: 0, max: 10000, noNaN: true }),
  slowTrack: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Game system setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
});

afterAll(() => {
  delete (globalThis as any).game;
});

// ===========================================================================
// Task 7.3 — Property 6: Session report reward halving respects slow track
//            and override states
// ===========================================================================

describe('Feature: slow-track, Property 6: Session report reputation halving respects slow track', () => {
  /**
   * Validates: Requirements 7.4
   *
   * For any valid SharedFields and UniqueFields with slowTrack,
   * the SignUp produced via buildSessionReport should have:
   *   - repEarned = chosenFactionReputation/2 when slowTrack, else chosenFactionReputation
   */
  it('should produce correct repEarned for party member SignUp across slow track states', () => {
    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, factionArb, (shared, unique, faction) => {
        const actor = createActor('a1', faction);
        const params: SessionReportBuildParams = {
          shared,
          characters: { a1: unique },
          partyActors: [actor],
          layoutId: 'pfs2.s5-18',
          now: FIXED_NOW,
        };

        const report = buildSessionReport(params);
        expect(report.signUps).toHaveLength(1);
        const signUp = report.signUps[0];

        const expectedRep = unique.slowTrack
          ? shared.chosenFactionReputation / 2
          : shared.chosenFactionReputation;
        expect(signUp.repEarned).toBe(expectedRep);
      }),
      { numRuns: 100 },
    );
  });

  it('should produce correct repEarned for GM character SignUp across slow track states', () => {
    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, factionArb, (shared, unique, faction) => {
        const gmActor = createActor('gm1', faction, 54321, 2003);
        const params: SessionReportBuildParams = {
          shared,
          characters: {},
          partyActors: [],
          layoutId: 'pfs2.s5-18',
          now: FIXED_NOW,
          gmCharacterActor: gmActor,
          gmCharacterFields: unique,
        };

        const report = buildSessionReport(params);
        expect(report.signUps).toHaveLength(1);
        const signUp = report.signUps[0];

        expect(signUp.isGM).toBe(true);

        const expectedRep = unique.slowTrack
          ? shared.chosenFactionReputation / 2
          : shared.chosenFactionReputation;
        expect(signUp.repEarned).toBe(expectedRep);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Task 7.5 — Unit tests for slow track in session report builder
// ===========================================================================

describe('Session report builder - slow track unit tests', () => {
  const actor = createActor('p1', 'EA', 11111, 1);

  it('should halve repEarned when slowTrack is true', () => {
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ chosenFactionReputation: 4 }),
      characters: { p1: createUniqueFields({ slowTrack: true }) },
      partyActors: [actor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);
    expect(report.signUps[0].repEarned).toBe(2);
  });

  it('should apply slow track reputation halving to GM character SignUp', () => {
    const gmActor = createActor('gm1', 'GA', 54321, 2003);
    const params: SessionReportBuildParams = {
      shared: createSharedFields({ chosenFactionReputation: 4 }),
      characters: {},
      partyActors: [],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
      gmCharacterActor: gmActor,
      gmCharacterFields: createUniqueFields({
        characterName: 'GM Character',
        slowTrack: true,
      }),
    };

    const report = buildSessionReport(params);
    const gmSignUp = report.signUps.find((s) => s.isGM);
    expect(gmSignUp).toBeDefined();
    expect(gmSignUp!.isGM).toBe(true);
    expect(gmSignUp!.repEarned).toBe(2);
  });
});

// ===========================================================================
// Task 7.6 — Integration test for buildSessionReport() with slow track
// ===========================================================================

describe('buildSessionReport() integration - slow track mixed party', () => {
  const slowTrackActor = createActor('slow1', 'EA', 11111, 1);
  const standardActor = createActor('std1', 'VS', 22222, 2);
  const gmActor = createActor('gm1', 'GA', 54321, 2003);

  const shared = createSharedFields({
    xpEarned: 4,
    chosenFactionReputation: 4,
    treasureBundles: 2,
    downtimeDays: 8,
    reputationValues: { EA: 2, GA: 1, HH: 0, VS: 0, RO: 0, VW: 0 },
  });

  // Level 5: treasure = 2 × 10 = 20, income = 0.5 × 8 = 4, total = 24
  const baseCharacterFields: Partial<UniqueFields> = {
    level: 5,
    taskLevel: 3,
    successLevel: 'success',
    proficiencyRank: 'trained',
    overrideXp: false,
    overrideCurrency: false,
  };

  it('should correctly halve values for slow track character and leave standard character unmodified', () => {
    const params: SessionReportBuildParams = {
      shared,
      characters: {
        slow1: createUniqueFields({
          ...baseCharacterFields,
          characterName: 'Slow Char',
          slowTrack: true,
        }),
        std1: createUniqueFields({
          ...baseCharacterFields,
          characterName: 'Standard Char',
          slowTrack: false,
        }),
      },
      partyActors: [slowTrackActor, standardActor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
      gmCharacterActor: gmActor,
      gmCharacterFields: createUniqueFields({
        ...baseCharacterFields,
        characterName: 'GM Char',
        slowTrack: true,
      }),
    };

    const report = buildSessionReport(params);
    expect(report.signUps).toHaveLength(3);

    // Slow track character: halved rep
    const slowSignUp = report.signUps.find((s) => s.characterName === 'Slow Char')!;
    expect(slowSignUp.repEarned).toBe(2);       // 4 / 2

    // Standard character: unmodified rep
    const stdSignUp = report.signUps.find((s) => s.characterName === 'Standard Char')!;
    expect(stdSignUp.repEarned).toBe(4);

    // GM character on slow track: halved rep with isGM: true
    const gmSignUp = report.signUps.find((s) => s.isGM)!;
    expect(gmSignUp.isGM).toBe(true);
    expect(gmSignUp.repEarned).toBe(2);
  });

  it('should leave bonusRepEarned unaffected by per-character slow track', () => {
    const params: SessionReportBuildParams = {
      shared,
      characters: {
        slow1: createUniqueFields({
          ...baseCharacterFields,
          characterName: 'Slow Char',
          slowTrack: true,
        }),
      },
      partyActors: [slowTrackActor],
      layoutId: 'pfs2.s5-18',
      now: FIXED_NOW,
    };

    const report = buildSessionReport(params);

    // bonusRepEarned is session-level, not per-character — should be unmodified
    expect(report.bonusRepEarned).toEqual(
      expect.arrayContaining([
        { faction: "Envoy's Alliance", reputation: 2 },
        { faction: 'Grand Archive', reputation: 1 },
      ]),
    );
    expect(report.bonusRepEarned).toHaveLength(2);
  });

});
