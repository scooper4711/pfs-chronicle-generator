/**
 * Property-based tests for PartyChronicleApp stale GM character actor ID handling.
 *
 * Tests the resolveGmCharacter private method indirectly through _prepareContext(),
 * verifying that stale actor IDs are gracefully cleared from saved data.
 *
 * Feature: gm-character-party-sheet
 *
 * @jest-environment node
 */

import fc from 'fast-check';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// --- Foundry globals (must be set before importing PartyChronicleApp) ---

(global as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (base: any) => base,
    },
    ux: {
      FormDataExtended: class {},
    },
  },
};

const mockActorsGet = jest.fn<(id: string) => any>();

global.game = {
  settings: {
    get: jest.fn((_module: string, key: string) => {
      const defaults: Record<string, any> = {
        gmPfsNumber: '123456',
        eventName: 'Test Event',
        eventcode: 'TEST-001',
        blankChroniclePath: '',
        season: 'pfs2-season7',
        layout: 'test-layout',
      };
      return defaults[key] ?? '';
    }),
  },
  actors: { get: mockActorsGet },
} as any;

// Mock fetch for checkFileExists (always returns ok: false)
global.fetch = jest.fn(async () => ({ ok: false })) as unknown as typeof fetch;

// Mock layoutStore
jest.mock('../scripts/LayoutStore', () => ({
  layoutStore: {
    getSeasons: jest.fn(() => [{ id: 'pfs2-season7', name: 'Season 7' }]),
    getLayoutsByParent: jest.fn(() => [{ id: 'test-layout', description: 'Test Layout' }]),
    getLayout: jest.fn(async () => ({ id: 'test-layout', description: 'Test Layout', defaultChronicleLocation: undefined })),
  },
}));

// Mock party chronicle storage
jest.mock('../scripts/model/party-chronicle-storage', () => ({
  loadPartyChronicleData: jest.fn(),
  savePartyChronicleData: jest.fn(),
}));

import { loadPartyChronicleData, savePartyChronicleData } from '../scripts/model/party-chronicle-storage';

const mockLoadPartyChronicleData = loadPartyChronicleData as jest.MockedFunction<typeof loadPartyChronicleData>;
const mockSavePartyChronicleData = savePartyChronicleData as jest.MockedFunction<typeof savePartyChronicleData>;

// Mock logger to suppress output
jest.mock('../scripts/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock chronicle-exporter to avoid import issues
jest.mock('../scripts/handlers/chronicle-exporter', () => ({
  hasArchive: jest.fn(() => false),
}));

import { PartyChronicleApp } from '../scripts/PartyChronicleApp';
import type { UniqueFields, PartyChronicleData } from '../scripts/model/party-chronicle-types';

// --- Arbitraries ---

/** Arbitrary for alphanumeric actor IDs (simulating Foundry actor IDs). */
const actorIdArbitrary = fc.stringMatching(/^[a-zA-Z0-9]{6,16}$/);

/** Arbitrary for a UniqueFields object with generated values. */
const uniqueFieldsArbitrary: fc.Arbitrary<UniqueFields> = fc.record({
  characterName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  playerNumber: fc.integer({ min: 1, max: 9999999 }).map(String),
  characterNumber: fc.integer({ min: 2001, max: 2999 }).map(String),
  level: fc.integer({ min: 1, max: 20 }),
  taskLevel: fc.oneof(fc.integer({ min: 0, max: 20 }), fc.constant('-' as string | number)),
  successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
  proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
  earnedIncome: fc.integer({ min: 0, max: 9999 }),
  currencySpent: fc.integer({ min: 0, max: 9999 }),
  notes: fc.string({ maxLength: 50 }),
  consumeReplay: fc.boolean(),
});

/**
 * Builds a PartyChronicleData object with the given GM character actor ID and fields.
 */
function buildSavedDataWithGmCharacter(gmActorId: string, gmFields: UniqueFields): PartyChronicleData {
  return {
    shared: {
      gmPfsNumber: '123456',
      scenarioName: 'Test Scenario',
      eventCode: 'EVT001',
      eventDate: '2024-01-01',
      xpEarned: 4,
      treasureBundles: 5,
      downtimeDays: 2,
      layoutId: 'test-layout',
      seasonId: 'pfs2-season7',
      blankChroniclePath: '',
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      chosenFactionReputation: 2,
      reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
      reportingA: false,
      reportingB: false,
      reportingC: false,
      reportingD: false,
      gmCharacterActorId: gmActorId,
    },
    characters: {
      [gmActorId]: gmFields,
    },
  };
}

describe('PartyChronicleApp Stale GM Character Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSavePartyChronicleData.mockResolvedValue(undefined);
    global.fetch = jest.fn(async () => ({ ok: false })) as unknown as typeof fetch;
  });

  /**
   * Property 9: Stale GM character actor ID is gracefully cleared
   *
   * For any actor ID string that cannot be resolved via game.actors.get()
   * (returns undefined), the context preparation should set gmCharacter
   * to null and clear the gmCharacterActorId from saved data.
   *
   * Feature: gm-character-party-sheet, Property 9: Stale GM character actor ID is gracefully cleared
   * **Validates: Requirements 8.3**
   */
  it('clears stale gmCharacterActorId and sets gmCharacter to null when actor cannot be resolved', async () => {
    await fc.assert(
      fc.asyncProperty(
        actorIdArbitrary,
        uniqueFieldsArbitrary,
        async (staleActorId, gmFields) => {
          // game.actors.get() returns undefined for any actor ID (stale)
          mockActorsGet.mockReturnValue(undefined);

          const savedData = buildSavedDataWithGmCharacter(staleActorId, gmFields);
          mockLoadPartyChronicleData.mockResolvedValue({
            timestamp: Date.now(),
            data: savedData,
          });
          mockSavePartyChronicleData.mockClear();

          const app = new PartyChronicleApp([]);
          const context = await app._prepareContext();

          // Context should have gmCharacter set to null
          expect(context.gmCharacter).toBeNull();

          // savePartyChronicleData should have been called to persist the cleanup
          expect(mockSavePartyChronicleData).toHaveBeenCalledTimes(1);

          const clearedData = mockSavePartyChronicleData.mock.calls[0][0];

          // gmCharacterActorId should be removed from shared fields
          expect(clearedData.shared.gmCharacterActorId).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
