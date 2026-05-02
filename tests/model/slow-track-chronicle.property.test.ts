/**
 * Property-based and unit tests for slow track halving logic in mapToCharacterData().
 *
 * Tests cover XP halving, reputation halving, currency halving (including
 * downtime-day propagation), and override interactions.
 *
 * Library: fast-check (minimum 100 iterations per property)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { mapToCharacterData } from '../../scripts/model/party-chronicle-mapper';
import { SharedFields, UniqueFields } from '../../scripts/model/party-chronicle-types';
import { calculateEarnedIncome } from '../../scripts/utils/earned-income-calculator';
import { calculateTreasureBundleValue, calculateCurrencyGained } from '../../scripts/utils/treasure-bundle-calculator';
import { calculateReputation } from '../../scripts/model/reputation-calculator';
import type { PartyActor } from '../../scripts/handlers/event-listener-helpers';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const FACTION_CODES = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'] as const;

function createMockActor(currentFaction: string | null = 'EA'): PartyActor {
  return {
    id: 'test-actor',
    system: { pfs: { currentFaction } },
  } as unknown as PartyActor;
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

const factionArb = fc.constantFrom(...FACTION_CODES);

const taskLevelArb = fc.integer({ min: 0, max: 20 });
const successLevelArb = fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success');
const proficiencyRankArb = fc.constantFrom('trained', 'expert', 'master', 'legendary');


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
// Task 5.2 — Property 1: XP halving in chronicle generation
// ===========================================================================

describe('Feature: slow-track, Property 1: XP halving in chronicle generation respects slow track and override states', () => {
  /**
   * Validates: Requirements 2.1, 2.2, 2.3
   *
   * For any valid SharedFields.xpEarned and UniqueFields with slowTrack,
   * overrideXp, and overrideXpValue, the xp_gained field must equal:
   *   - overrideXpValue          when overrideXp is true
   *   - xpEarned / 2             when slowTrack && !overrideXp
   *   - xpEarned                 when !slowTrack && !overrideXp
   */
  it('should produce the correct xp_gained for all slow track / override combinations', () => {
    const uniqueArb = fc.record({
      characterName: fc.constant('Test'),
      playerNumber: fc.constant('12345'),
      characterNumber: fc.constant('2001'),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.constant('-' as string | number),
      successLevel: fc.constant('success'),
      proficiencyRank: fc.constant('trained'),
      earnedIncome: fc.constant(0),
      currencySpent: fc.constant(0),
      notes: fc.constant(''),
      consumeReplay: fc.constant(false),
      overrideXp: fc.boolean(),
      overrideXpValue: fc.integer({ min: 0, max: 100 }),
      overrideCurrency: fc.constant(false),
      overrideCurrencyValue: fc.constant(0),
      slowTrack: fc.boolean(),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueArb, factionArb, (shared, unique, faction) => {
        const actor = createMockActor(faction);
        const result = mapToCharacterData(shared, unique, actor);

        const expectedXp = unique.overrideXp
          ? unique.overrideXpValue
          : unique.slowTrack
            ? shared.xpEarned / 2
            : shared.xpEarned;

        expect(result.xp_gained).toBe(expectedXp);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Task 5.3 — Property 2: Reputation halving in chronicle generation
// ===========================================================================

describe('Feature: slow-track, Property 2: Reputation halving in chronicle generation', () => {
  /**
   * Validates: Requirements 3.1, 3.2, 3.3
   *
   * For any valid SharedFields with chosenFactionReputation and reputationValues,
   * and any UniqueFields with slowTrack, the reputation lines produced by
   * mapToCharacterData should reflect halved values when slowTrack is true and
   * standard values when slowTrack is false.
   */
  it('should halve reputation values when slowTrack is true and leave them unchanged when false', () => {
    const uniqueArb = fc.record({
      characterName: fc.constant('Test'),
      playerNumber: fc.constant('12345'),
      characterNumber: fc.constant('2001'),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.constant('-' as string | number),
      successLevel: fc.constant('success'),
      proficiencyRank: fc.constant('trained'),
      earnedIncome: fc.constant(0),
      currencySpent: fc.constant(0),
      notes: fc.constant(''),
      consumeReplay: fc.constant(false),
      overrideXp: fc.constant(false),
      overrideXpValue: fc.constant(0),
      overrideCurrency: fc.constant(false),
      overrideCurrencyValue: fc.constant(0),
      slowTrack: fc.boolean(),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueArb, factionArb, (shared, unique, faction) => {
        const actor = createMockActor(faction);
        const result = mapToCharacterData(shared, unique, actor);

        // Compute expected reputation by replicating the halving logic
        const expectedShared: SharedFields = unique.slowTrack
          ? {
              ...shared,
              chosenFactionReputation: shared.chosenFactionReputation / 2,
              reputationValues: {
                EA: shared.reputationValues.EA / 2,
                GA: shared.reputationValues.GA / 2,
                HH: shared.reputationValues.HH / 2,
                VS: shared.reputationValues.VS / 2,
                RO: shared.reputationValues.RO / 2,
                VW: shared.reputationValues.VW / 2,
              },
            }
          : shared;

        const expectedLines = calculateReputation(expectedShared, actor);
        expect(result.reputation).toEqual(expectedLines);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Task 5.4 — Property 3: Currency halving in chronicle generation
// ===========================================================================

describe('Feature: slow-track, Property 3: Currency halving in chronicle generation respects slow track, downtime, and override states', () => {
  /**
   * Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4
   *
   * For any valid inputs the currency_gained field must equal:
   *   - overrideCurrencyValue                          when overrideCurrency is true
   *   - (treasureBundleValue + earnedIncome) / 2       when slowTrack && !overrideCurrency
   *     where earnedIncome uses downtimeDays / 2
   *   - treasureBundleValue + earnedIncome             when !slowTrack && !overrideCurrency
   */
  it('should produce the correct currency_gained for all slow track / override combinations', () => {
    const uniqueArb = fc.record({
      characterName: fc.constant('Test'),
      playerNumber: fc.constant('12345'),
      characterNumber: fc.constant('2001'),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: taskLevelArb,
      successLevel: successLevelArb,
      proficiencyRank: proficiencyRankArb,
      earnedIncome: fc.constant(0),
      currencySpent: fc.constant(0),
      notes: fc.constant(''),
      consumeReplay: fc.constant(false),
      overrideXp: fc.constant(false),
      overrideXpValue: fc.constant(0),
      overrideCurrency: fc.boolean(),
      overrideCurrencyValue: fc.double({ min: 0, max: 10000, noNaN: true }),
      slowTrack: fc.boolean(),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueArb, factionArb, (shared, unique, faction) => {
        const actor = createMockActor(faction);
        const result = mapToCharacterData(shared, unique, actor);

        if (unique.overrideCurrency) {
          expect(result.currency_gained).toBe(unique.overrideCurrencyValue);
        } else {
          const effectiveDowntime = unique.slowTrack
            ? shared.downtimeDays / 2
            : shared.downtimeDays;

          const earnedIncome = calculateEarnedIncome(
            unique.taskLevel,
            unique.successLevel,
            unique.proficiencyRank,
            effectiveDowntime,
            'pf2e',
          );

          const treasureBundleValue = calculateTreasureBundleValue(
            shared.treasureBundles,
            unique.level,
          );

          const expectedCurrency = unique.slowTrack
            ? (treasureBundleValue + earnedIncome) / 2
            : calculateCurrencyGained(treasureBundleValue, earnedIncome, 'pf2e');

          expect(result.currency_gained).toBeCloseTo(expectedCurrency, 10);
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ===========================================================================
// Task 5.5 — Unit tests for slow track halving in mapToCharacterData()
// ===========================================================================

describe('mapToCharacterData - slow track halving unit tests', () => {
  const actor = createMockActor('EA');

  // --- XP halving ---

  it('should halve XP when slowTrack is true and overrideXp is false', () => {
    const shared = createSharedFields({ xpEarned: 4 });
    const unique = createUniqueFields({ slowTrack: true, overrideXp: false });
    const result = mapToCharacterData(shared, unique, actor);
    expect(result.xp_gained).toBe(2);
  });

  it('should use override XP as-is when overrideXp is true regardless of slowTrack', () => {
    const shared = createSharedFields({ xpEarned: 4 });
    const unique = createUniqueFields({
      slowTrack: true,
      overrideXp: true,
      overrideXpValue: 10,
    });
    const result = mapToCharacterData(shared, unique, actor);
    expect(result.xp_gained).toBe(10);
  });

  it('should leave XP unchanged when slowTrack is false', () => {
    const shared = createSharedFields({ xpEarned: 4 });
    const unique = createUniqueFields({ slowTrack: false, overrideXp: false });
    const result = mapToCharacterData(shared, unique, actor);
    expect(result.xp_gained).toBe(4);
  });

  // --- Reputation halving ---

  it('should halve reputation values when slowTrack is true', () => {
    const shared = createSharedFields({
      chosenFactionReputation: 4,
      reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    });
    const unique = createUniqueFields({ slowTrack: true });
    const result = mapToCharacterData(shared, unique, actor);

    // EA total = (2 / 2) + (4 / 2) = 1 + 2 = 3  →  "Envoy's Alliance: +3"
    expect(result.reputation).toEqual(["Envoy's Alliance: +3"]);
  });

  it('should leave reputation values unchanged when slowTrack is false', () => {
    const shared = createSharedFields({
      chosenFactionReputation: 4,
      reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    });
    const unique = createUniqueFields({ slowTrack: false });
    const result = mapToCharacterData(shared, unique, actor);

    // EA total = 2 + 4 = 6  →  "Envoy's Alliance: +6"
    expect(result.reputation).toEqual(["Envoy's Alliance: +6"]);
  });

  // --- Downtime / earned income halving ---

  it('should halve downtime days before earned income calculation when slowTrack is true', () => {
    // Level 3 trained success: 0.5 gp/day
    // 8 downtime days → halved to 4 → 0.5 × 4 = 2 gp
    const shared = createSharedFields({ downtimeDays: 8, treasureBundles: 0 });
    const unique = createUniqueFields({
      slowTrack: true,
      level: 5,
      taskLevel: 3,
      successLevel: 'success',
      proficiencyRank: 'trained',
      overrideCurrency: false,
    });
    const result = mapToCharacterData(shared, unique, actor);

    // Earned income with halved downtime
    const expectedIncome = calculateEarnedIncome(3, 'success', 'trained', 4, 'pf2e');
    expect(result.income_earned).toBe(expectedIncome);
    expect(result.income_earned).toBe(2);
  });

  // --- Currency halving ---

  it('should halve currency_gained (total, not components) when slowTrack is true and overrideCurrency is false', () => {
    // Level 5: treasure bundle value = 2 × 10 = 20
    // Level 3 trained success, 4 halved downtime days: 0.5 × 4 = 2 gp
    // currency_gained = (20 + 2) / 2 = 11
    const shared = createSharedFields({ treasureBundles: 2, downtimeDays: 8 });
    const unique = createUniqueFields({
      slowTrack: true,
      level: 5,
      taskLevel: 3,
      successLevel: 'success',
      proficiencyRank: 'trained',
      overrideCurrency: false,
    });
    const result = mapToCharacterData(shared, unique, actor);
    expect(result.currency_gained).toBe(11);
  });

  it('should use override currency as-is when overrideCurrency is true regardless of slowTrack', () => {
    const shared = createSharedFields({ treasureBundles: 2, downtimeDays: 8 });
    const unique = createUniqueFields({
      slowTrack: true,
      overrideCurrency: true,
      overrideCurrencyValue: 42.5,
    });
    const result = mapToCharacterData(shared, unique, actor);
    expect(result.currency_gained).toBe(42.5);
  });

  // --- Fractional values preserved ---

  it('should preserve fractional XP: 1 XP → 0.5 XP', () => {
    const shared = createSharedFields({ xpEarned: 1 });
    const unique = createUniqueFields({ slowTrack: true, overrideXp: false });
    const result = mapToCharacterData(shared, unique, actor);
    expect(result.xp_gained).toBe(0.5);
  });

  it('should preserve fractional reputation: 3 reputation → 1.5', () => {
    const shared = createSharedFields({
      chosenFactionReputation: 3,
      reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    });
    const unique = createUniqueFields({ slowTrack: true });
    const result = mapToCharacterData(shared, unique, actor);

    // EA total = 0 + (3 / 2) = 1.5  →  "Envoy's Alliance: +1.5"
    expect(result.reputation).toEqual(["Envoy's Alliance: +1.5"]);
  });

  it('should preserve fractional downtime: 7 downtime days → 3.5', () => {
    // Level 3 trained success: 0.5 gp/day × 3.5 days = 1.75 gp
    const shared = createSharedFields({ downtimeDays: 7, treasureBundles: 0 });
    const unique = createUniqueFields({
      slowTrack: true,
      level: 5,
      taskLevel: 3,
      successLevel: 'success',
      proficiencyRank: 'trained',
      overrideCurrency: false,
    });
    const result = mapToCharacterData(shared, unique, actor);

    const expectedIncome = calculateEarnedIncome(3, 'success', 'trained', 3.5, 'pf2e');
    expect(result.income_earned).toBe(expectedIncome);
    // 0.5 × 3.5 = 1.75 → halved total = (0 + 1.75) / 2 = 0.875
    expect(result.currency_gained).toBe(0.875);
  });
});
