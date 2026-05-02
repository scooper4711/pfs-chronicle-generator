/**
 * Property-based tests for slow track persistence, clear behavior,
 * and per-character independence.
 *
 * Library: fast-check (minimum 100 iterations per property)
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import {
  savePartyChronicleData,
  loadPartyChronicleData,
} from '../scripts/model/party-chronicle-storage';
import type { PartyChronicleData, UniqueFields } from '../scripts/model/party-chronicle-types';
import { buildDefaultCharacterFields } from '../scripts/handlers/clear-button-handlers';
import { mapToCharacterData } from '../scripts/model/party-chronicle-mapper';
import type { PartyActor } from '../scripts/handlers/event-listener-helpers';

// ---------------------------------------------------------------------------
// Mock Foundry VTT game.settings API (same pattern as party-chronicle-storage.test.ts)
// ---------------------------------------------------------------------------

const mockSettings = new Map<string, unknown>();

const mockGameSettings = {
  set: jest.fn(async (_module: string, key: string, value: unknown): Promise<void> => {
    mockSettings.set(`pfs-chronicle-generator.${key}`, value);
  }),
  get: jest.fn((_module: string, key: string): unknown => {
    return mockSettings.get(`pfs-chronicle-generator.${key}`);
  }),
};

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

const uniqueFieldsArb: fc.Arbitrary<UniqueFields> = fc.record({
  characterName: fc.string({ minLength: 1, maxLength: 50 }),
  playerNumber: fc.stringMatching(/^\d{1,10}$/),
  characterNumber: fc.stringMatching(/^2\d{1,5}$/),
  level: fc.integer({ min: 1, max: 20 }),
  taskLevel: fc.oneof(
    fc.constant('-' as string | number),
    fc.integer({ min: 0, max: 20 }),
  ),
  successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
  proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
  earnedIncome: fc.constant(0),
  currencySpent: fc.integer({ min: 0, max: 10000 }),
  notes: fc.string({ maxLength: 200 }),
  consumeReplay: fc.boolean(),
  overrideXp: fc.boolean(),
  overrideXpValue: fc.integer({ min: 0, max: 100 }),
  overrideCurrency: fc.boolean(),
  overrideCurrencyValue: fc.double({ min: 0, max: 10000, noNaN: true }),
  slowTrack: fc.boolean(),
});

const sharedFieldsArb = fc.record({
  gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
  scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
  eventCode: fc.string({ minLength: 1, maxLength: 50 }),
  eventDate: fc.string({ minLength: 1, maxLength: 20 }),
  xpEarned: fc.integer({ min: 0, max: 20 }),
  adventureSummaryCheckboxes: fc.array(fc.string(), { maxLength: 10 }),
  strikeoutItems: fc.array(fc.string(), { maxLength: 20 }),
  treasureBundles: fc.integer({ min: 0, max: 10 }),
  layoutId: fc.string({ minLength: 1, maxLength: 50 }),
  seasonId: fc.string({ minLength: 1, maxLength: 50 }),
  blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 }),
  chosenFactionReputation: fc.integer({ min: 0, max: 9 }),
  reputationValues: reputationValuesArb,
  downtimeDays: fc.integer({ min: 0, max: 8 }),
  reportingA: fc.boolean(),
  reportingB: fc.boolean(),
  reportingC: fc.boolean(),
  reportingD: fc.boolean(),
});

const partyChronicleDataArb: fc.Arbitrary<PartyChronicleData> = fc.record({
  shared: sharedFieldsArb,
  characters: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    uniqueFieldsArb,
    { minKeys: 1, maxKeys: 6 },
  ),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPartyActor(id: string, level: number = 5, name: string = 'Test'): PartyActor {
  return {
    id,
    name,
    img: '/path/to/image.png',
    type: 'character',
    render: jest.fn(),
    system: {
      details: { level: { value: level } },
      pfs: { playerNumber: 12345, characterNumber: 2001, currentFaction: 'EA' },
    },
    getFlag: jest.fn(),
    setFlag: jest.fn(),
    unsetFlag: jest.fn(),
  } as unknown as PartyActor;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  (globalThis as any).game = {
    system: { id: 'pf2e' },
    modules: new Map(),
    settings: mockGameSettings,
  };
});

afterAll(() => {
  delete (globalThis as any).game;
});

beforeEach(() => {
  mockSettings.clear();
  jest.clearAllMocks();
});

// ===========================================================================
// Task 9.1 — Property 4: Slow track persistence round-trip
// ===========================================================================

describe('Feature: slow-track, Property 4: Slow track persistence round-trip', () => {
  /**
   * Validates: Requirements 6.1, 6.2
   *
   * For any valid PartyChronicleData containing characters with any
   * combination of slowTrack boolean values, saving the data and then
   * loading it should produce identical slowTrack values for each character.
   */
  it('should preserve slowTrack values through a save/load cycle', async () => {
    await fc.assert(
      fc.asyncProperty(partyChronicleDataArb, async (chronicleData) => {
        mockSettings.clear();

        await savePartyChronicleData(chronicleData);
        const loaded = await loadPartyChronicleData();

        expect(loaded).not.toBeNull();

        for (const [actorId, fields] of Object.entries(chronicleData.characters)) {
          expect(loaded!.data.characters[actorId].slowTrack).toBe(fields.slowTrack);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Task 9.2 — Property 5: Clear resets all slow track states
// ===========================================================================

describe('Feature: slow-track, Property 5: Clear resets all slow track states', () => {
  /**
   * Validates: Requirements 6.3
   *
   * For any set of party actors, buildDefaultCharacterFields should
   * produce UniqueFields with slowTrack set to false for every character.
   */
  it('should reset slowTrack to false for all characters after clear', () => {
    const partyActorsArb = fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        level: fc.integer({ min: 1, max: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
      }),
      { minLength: 1, maxLength: 8 },
    );

    fc.assert(
      fc.property(partyActorsArb, (actorSpecs) => {
        const actors = actorSpecs.map((spec) =>
          createMockPartyActor(spec.id, spec.level, spec.name),
        );

        const defaults = buildDefaultCharacterFields(actors);

        for (const actorSpec of actorSpecs) {
          const fields = defaults[actorSpec.id];
          expect(fields).toBeDefined();
          expect(fields.slowTrack).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Task 9.3 — Property 8: Per-character slow track independence
// ===========================================================================

describe('Feature: slow-track, Property 8: Per-character slow track independence', () => {
  /**
   * Validates: Requirements 9.1, 9.2, 9.4
   *
   * For any set of 2+ characters with different slowTrack states,
   * mapToCharacterData called for each character should reflect only
   * that character's slowTrack state. Enabling slow track for one
   * character must not affect the rewards calculated for any other.
   */
  it('should produce independent results for each character regardless of other characters slow track states', () => {
    const sharedArb = fc.record({
      gmPfsNumber: fc.constant('12345'),
      scenarioName: fc.constant('Test Scenario'),
      eventCode: fc.constant('TEST-001'),
      eventDate: fc.constant('2024-01-15'),
      xpEarned: fc.integer({ min: 1, max: 20 }),
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

    // Generate 2-5 characters with explicitly different slowTrack states
    const characterArb = fc.record({
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.integer({ min: 0, max: 20 }),
      successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
      proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
      slowTrack: fc.boolean(),
      overrideXp: fc.constant(false),
      overrideCurrency: fc.constant(false),
    });

    const charactersArb = fc.array(characterArb, { minLength: 2, maxLength: 5 });

    fc.assert(
      fc.property(sharedArb, charactersArb, (shared, characters) => {
        // Map each character independently and collect results
        const results = characters.map((charSpec, index) => {
          const unique: UniqueFields = {
            characterName: `Character ${index}`,
            playerNumber: '12345',
            characterNumber: `200${index}`,
            level: charSpec.level,
            taskLevel: charSpec.taskLevel,
            successLevel: charSpec.successLevel,
            proficiencyRank: charSpec.proficiencyRank,
            earnedIncome: 0,
            currencySpent: 0,
            notes: '',
            consumeReplay: false,
            overrideXp: charSpec.overrideXp,
            overrideXpValue: 0,
            overrideCurrency: charSpec.overrideCurrency,
            overrideCurrencyValue: 0,
            slowTrack: charSpec.slowTrack,
          };

          const actor = createMockPartyActor(`actor-${index}`) as unknown as PartyActor;
          (actor as any).system.pfs.currentFaction = 'EA';

          return { spec: charSpec, result: mapToCharacterData(shared, unique, actor) };
        });

        // Verify each character's output reflects only its own slowTrack state
        for (const { spec, result } of results) {
          if (spec.slowTrack) {
            expect(result.xp_gained).toBe(shared.xpEarned / 2);
          } else {
            expect(result.xp_gained).toBe(shared.xpEarned);
          }
        }

        // Verify independence: map the same character twice — once with
        // slowTrack true and once with false — using the same shared fields.
        // The results must differ when xpEarned > 0.
        if (shared.xpEarned > 0) {
          const baseUnique: UniqueFields = {
            characterName: 'Independence Check',
            playerNumber: '12345',
            characterNumber: '2099',
            level: 5,
            taskLevel: 3,
            successLevel: 'success',
            proficiencyRank: 'trained',
            earnedIncome: 0,
            currencySpent: 0,
            notes: '',
            consumeReplay: false,
            overrideXp: false,
            overrideXpValue: 0,
            overrideCurrency: false,
            overrideCurrencyValue: 0,
            slowTrack: false,
          };

          const actor = createMockPartyActor('independence-actor') as unknown as PartyActor;
          (actor as any).system.pfs.currentFaction = 'EA';

          const resultStandard = mapToCharacterData(shared, { ...baseUnique, slowTrack: false }, actor);
          const resultSlow = mapToCharacterData(shared, { ...baseUnique, slowTrack: true }, actor);

          expect(resultStandard.xp_gained).toBe(shared.xpEarned);
          expect(resultSlow.xp_gained).toBe(shared.xpEarned / 2);
          expect(resultStandard.xp_gained).not.toBe(resultSlow.xp_gained);
        }
      }),
      { numRuns: 100 },
    );
  });
});
