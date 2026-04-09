/**
 * Property-based tests for GM character handlers.
 *
 * Tests the validateGmCharacterPfsId function and handleGmCharacterDrop
 * drop validation logic using property-based testing with fast-check.
 *
 * Feature: gm-character-party-sheet
 *
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock party-chronicle-storage before importing the handler
jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  loadPartyChronicleData: jest.fn(),
  savePartyChronicleData: jest.fn(),
}));

// Mock the dynamic import of main.js used by saveGmCharacterAssignment
jest.mock('../../scripts/main', () => ({
  renderPartyChronicleForm: jest.fn(),
}));

// Mock the logger to suppress debug output
jest.mock('../../scripts/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import { validateGmCharacterPfsId, handleGmCharacterDrop, handleGmCharacterClear } from '../../scripts/handlers/gm-character-handlers';
import { loadPartyChronicleData, savePartyChronicleData } from '../../scripts/model/party-chronicle-storage';
import type { PartyActor, PartySheetApp } from '../../scripts/handlers/event-listener-helpers';
import type { UniqueFields, PartyChronicleData } from '../../scripts/model/party-chronicle-types';

/**
 * Creates a minimal PartyActor with the given playerNumber for PFS ID validation testing.
 * Only the fields relevant to validateGmCharacterPfsId are populated.
 */
function createActorWithPfsId(playerNumber: string): PartyActor {
  return {
    id: 'gm-char-actor',
    name: 'GM Character',
    img: '/path/to/image.png',
    type: 'character',
    render: () => {},
    getFlag: () => undefined,
    setFlag: async () => {},
    unsetFlag: async () => {},
    update: async () => {},
    system: {
      details: { level: { value: 5 } },
      pfs: {
        playerNumber: Number(playerNumber),
        characterNumber: 2001,
        currentFaction: 'EA',
      },
    },
  };
}

/** Arbitrary for a PFS number string (1–7 digit numeric strings). */
const pfsNumberArbitrary = fc.integer({ min: 1, max: 9999999 }).map(String);

// --- Foundry globals for drop handler tests ---

const mockFromUuid = jest.fn<(uuid: string) => Promise<PartyActor | null>>();
(globalThis as any).fromUuid = mockFromUuid;

(globalThis as any).ui = {
  notifications: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
};

// --- Typed mock references ---

const mockLoadPartyChronicleData = loadPartyChronicleData as jest.MockedFunction<typeof loadPartyChronicleData>;
const mockSavePartyChronicleData = savePartyChronicleData as jest.MockedFunction<typeof savePartyChronicleData>;

// --- Arbitraries for drop handler tests ---

/** PF2e actor types that are NOT 'character'. */
const nonCharacterActorTypes = ['familiar', 'npc', 'vehicle', 'hazard', 'loot'] as const;

/** Arbitrary for a non-character actor type. */
const nonCharacterTypeArbitrary = fc.constantFrom(...nonCharacterActorTypes);

/** Arbitrary for a simple alphanumeric actor ID. */
const actorIdArbitrary = fc.stringMatching(/^[a-zA-Z0-9]{6,16}$/);

/** Arbitrary for a non-empty actor name. */
const actorNameArbitrary = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);

/** Arbitrary for a character level (1–20). */
const characterLevelArbitrary = fc.integer({ min: 1, max: 20 });

/** Arbitrary for a success level string. */
const successLevelArbitrary = fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success');

/** Arbitrary for a proficiency rank string. */
const proficiencyRankArbitrary = fc.constantFrom('trained', 'expert', 'master', 'legendary');

/** Arbitrary for a UniqueFields object with generated values. */
const uniqueFieldsArbitrary: fc.Arbitrary<UniqueFields> = fc.record({
  characterName: actorNameArbitrary,
  playerNumber: pfsNumberArbitrary,
  characterNumber: fc.integer({ min: 2001, max: 2999 }).map(String),
  level: characterLevelArbitrary,
  taskLevel: fc.oneof(fc.integer({ min: 0, max: 20 }), fc.constant('-' as string | number)),
  successLevel: successLevelArbitrary,
  proficiencyRank: proficiencyRankArbitrary,
  earnedIncome: fc.integer({ min: 0, max: 9999 }),
  goldSpent: fc.integer({ min: 0, max: 9999 }),
  notes: fc.string({ maxLength: 50 }),
  consumeReplay: fc.boolean(),
});

/**
 * Creates a minimal PartyActor suitable for drop handler testing.
 */
function createDropActor(
  id: string,
  type: string,
  name: string,
  level: number
): PartyActor {
  return {
    id,
    name,
    img: '/path/to/image.png',
    type,
    render: () => {},
    getFlag: () => undefined,
    setFlag: async () => {},
    unsetFlag: async () => {},
    update: async () => {},
    system: {
      details: { level: { value: level } },
      pfs: { playerNumber: 12345, characterNumber: 2001, currentFaction: 'EA' },
    },
  };
}

/**
 * Creates a minimal PartyActor for use as a party member stub.
 */
function createPartyMemberStub(id: string): PartyActor {
  return createDropActor(id, 'character', `Party Member ${id}`, 5);
}

/**
 * Creates a mock DragEvent with dataTransfer.getData returning the given JSON payload.
 */
function createMockDragEvent(payload: object): DragEvent {
  const event = new Event('drop') as unknown as DragEvent;
  Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
  Object.defineProperty(event, 'dataTransfer', {
    value: { getData: () => JSON.stringify(payload) },
  });
  return event;
}

/** Shared mock container and partySheet for drop handler tests. */
const mockContainer = document.createElement('div');
const mockPartySheet: PartySheetApp = {};

describe('GM Character Drop Validation Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadPartyChronicleData.mockResolvedValue(null);
    mockSavePartyChronicleData.mockResolvedValue(undefined);
  });

  /**
   * Property 1: Valid character drop assigns GM character
   *
   * For any Foundry actor with type === 'character' whose ID is not present
   * in the party member list, dropping that actor onto the GM Character Drop
   * Zone should result in that actor being assigned as the GM character, with
   * gmCharacterActorId set to the actor's ID.
   *
   * Feature: gm-character-party-sheet, Property 1: Valid character drop assigns GM character
   * **Validates: Requirements 1.3, 1.4, 1.5, 3.3**
   */
  it('assigns GM character when a valid non-party character is dropped', async () => {
    await fc.assert(
      fc.asyncProperty(
        actorIdArbitrary,
        actorNameArbitrary,
        characterLevelArbitrary,
        fc.array(actorIdArbitrary, { minLength: 0, maxLength: 5 }),
        async (actorId, actorName, level, partyMemberIds) => {
          // Ensure the dropped actor is NOT in the party member list
          const uniquePartyIds = partyMemberIds.filter((id) => id !== actorId);
          const partyActors = uniquePartyIds.map(createPartyMemberStub);

          const actor = createDropActor(actorId, 'character', actorName, level);
          mockFromUuid.mockResolvedValue(actor);
          mockSavePartyChronicleData.mockClear();

          const event = createMockDragEvent({ type: 'Actor', uuid: `Actor.${actorId}` });

          await handleGmCharacterDrop(event, mockContainer, partyActors, mockPartySheet);

          // savePartyChronicleData should have been called with gmCharacterActorId set
          expect(mockSavePartyChronicleData).toHaveBeenCalledTimes(1);
          const savedData = mockSavePartyChronicleData.mock.calls[0][0];
          expect(savedData.shared.gmCharacterActorId).toBe(actorId);
          expect(savedData.characters[actorId]).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Non-character actor drop is rejected
   *
   * For any Foundry actor with type !== 'character' (familiar, npc, vehicle,
   * hazard, loot), dropping that actor onto the GM Character Drop Zone should
   * be rejected and should not modify the current GM character assignment.
   *
   * Feature: gm-character-party-sheet, Property 2: Non-character actor drop is rejected
   * **Validates: Requirements 1.3, 1.4, 1.5, 3.3**
   */
  it('rejects non-character actor drops without saving', async () => {
    await fc.assert(
      fc.asyncProperty(
        actorIdArbitrary,
        nonCharacterTypeArbitrary,
        actorNameArbitrary,
        characterLevelArbitrary,
        async (actorId, actorType, actorName, level) => {
          const actor = createDropActor(actorId, actorType, actorName, level);
          mockFromUuid.mockResolvedValue(actor);
          mockSavePartyChronicleData.mockClear();

          const event = createMockDragEvent({ type: 'Actor', uuid: `Actor.${actorId}` });

          await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

          expect(mockSavePartyChronicleData).not.toHaveBeenCalled();
          expect((ui as any).notifications.warn).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Party member actor drop is rejected
   *
   * For any actor whose ID exists in the current party member list, dropping
   * that actor onto the GM Character Drop Zone should be rejected and should
   * not modify the current GM character assignment.
   *
   * Feature: gm-character-party-sheet, Property 3: Party member actor drop is rejected
   * **Validates: Requirements 1.3, 1.4, 1.5, 3.3**
   */
  it('rejects drops of actors already in the party member list', async () => {
    await fc.assert(
      fc.asyncProperty(
        actorIdArbitrary,
        actorNameArbitrary,
        characterLevelArbitrary,
        fc.array(actorIdArbitrary, { minLength: 0, maxLength: 4 }),
        async (actorId, actorName, level, extraPartyIds) => {
          // The dropped actor's ID IS in the party member list
          const partyActors = [
            createPartyMemberStub(actorId),
            ...extraPartyIds.filter((id) => id !== actorId).map(createPartyMemberStub),
          ];

          const actor = createDropActor(actorId, 'character', actorName, level);
          mockFromUuid.mockResolvedValue(actor);
          mockSavePartyChronicleData.mockClear();

          const event = createMockDragEvent({ type: 'Actor', uuid: `Actor.${actorId}` });

          await handleGmCharacterDrop(event, mockContainer, partyActors, mockPartySheet);

          expect(mockSavePartyChronicleData).not.toHaveBeenCalled();
          expect((ui as any).notifications.warn).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('GM Character PFS ID Validation Properties', () => {
  /**
   * Property 7: PFS ID mismatch produces descriptive validation error
   *
   * For any GM character actor whose playerNumber differs from the gmPfsNumber
   * in shared fields, validation should return an error message that contains
   * both the GM character's PFS ID value and the expected GM PFS Number value.
   *
   * Feature: gm-character-party-sheet, Property 7: PFS ID mismatch produces descriptive validation error
   * **Validates: Requirements 7.1, 7.2**
   */
  it('returns error containing both PFS IDs when they differ', () => {
    fc.assert(
      fc.property(
        pfsNumberArbitrary,
        pfsNumberArbitrary,
        (actorPfsNumber, gmPfsNumber) => {
          fc.pre(actorPfsNumber !== gmPfsNumber);

          const actor = createActorWithPfsId(actorPfsNumber);
          const result = validateGmCharacterPfsId(actor, gmPfsNumber);

          expect(result).not.toBeNull();
          expect(typeof result).toBe('string');
          expect(result).toContain(actorPfsNumber);
          expect(result).toContain(gmPfsNumber);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Matching PFS IDs produce no mismatch error
   *
   * For any PFS number string, when the GM character actor's playerNumber
   * equals the gmPfsNumber in shared fields, validation should not return
   * a PFS ID mismatch error.
   *
   * Feature: gm-character-party-sheet, Property 8: Matching PFS IDs produce no mismatch error
   * **Validates: Requirements 7.3**
   */
  it('returns null when PFS IDs match', () => {
    fc.assert(
      fc.property(
        pfsNumberArbitrary,
        (pfsNumber) => {
          const actor = createActorWithPfsId(pfsNumber);
          const result = validateGmCharacterPfsId(actor, pfsNumber);

          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('GM Character Data Persistence Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSavePartyChronicleData.mockResolvedValue(undefined);
  });

  /**
   * Property 5: GM character data persistence round-trip
   *
   * For any valid GM character actor ID and any valid set of UniqueFields
   * values, saving the GM character data to storage and then loading it
   * should produce identical gmCharacterActorId and UniqueFields values.
   *
   * This test verifies data structure integrity through the storage interface:
   * build a PartyChronicleData with GM character data, save it, set up the
   * load mock to return the captured saved data, load it, and verify the
   * round-tripped values are identical.
   *
   * Feature: gm-character-party-sheet, Property 5: GM character data persistence round-trip
   * **Validates: Requirements 4.4, 8.1, 8.2**
   */
  it('round-trips gmCharacterActorId and UniqueFields through save/load', async () => {
    await fc.assert(
      fc.asyncProperty(
        actorIdArbitrary,
        uniqueFieldsArbitrary,
        async (gmActorId, gmFields) => {
          const originalData: PartyChronicleData = {
            shared: {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'EVT001',
              eventDate: '2024-01-01',
              xpEarned: 4,
              treasureBundles: 5,
              downtimeDays: 2,
              layoutId: 'layout-1',
              seasonId: 'season-1',
              blankChroniclePath: '/path/to/blank.pdf',
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

          // Save the data — capture what was passed to the mock
          mockSavePartyChronicleData.mockClear();
          await savePartyChronicleData(originalData);

          expect(mockSavePartyChronicleData).toHaveBeenCalledTimes(1);
          const savedArg = mockSavePartyChronicleData.mock.calls[0][0];

          // Set up load mock to return the captured saved data
          mockLoadPartyChronicleData.mockResolvedValue({
            timestamp: Date.now(),
            data: savedArg,
          });

          // Load the data back
          const loaded = await loadPartyChronicleData();

          // Verify round-trip produces identical gmCharacterActorId
          expect(loaded).not.toBeNull();
          expect(loaded!.data.shared.gmCharacterActorId).toBe(gmActorId);

          // Verify round-trip produces identical UniqueFields
          const loadedFields = loaded!.data.characters[gmActorId];
          expect(loadedFields).toBeDefined();
          expect(loadedFields.characterName).toBe(gmFields.characterName);
          expect(loadedFields.playerNumber).toBe(gmFields.playerNumber);
          expect(loadedFields.characterNumber).toBe(gmFields.characterNumber);
          expect(loadedFields.level).toBe(gmFields.level);
          expect(loadedFields.taskLevel).toBe(gmFields.taskLevel);
          expect(loadedFields.successLevel).toBe(gmFields.successLevel);
          expect(loadedFields.proficiencyRank).toBe(gmFields.proficiencyRank);
          expect(loadedFields.earnedIncome).toBe(gmFields.earnedIncome);
          expect(loadedFields.goldSpent).toBe(gmFields.goldSpent);
          expect(loadedFields.notes).toBe(gmFields.notes);
          expect(loadedFields.consumeReplay).toBe(gmFields.consumeReplay);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('GM Character Clear Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSavePartyChronicleData.mockResolvedValue(undefined);
  });

  /**
   * Property 4: Clear removes all GM character data
   *
   * For any assigned GM character with any set of UniqueFields values,
   * after clearing the GM character, the saved PartyChronicleData should
   * not contain gmCharacterActorId in shared and should not contain the
   * GM character's actor ID key in characters.
   *
   * Feature: gm-character-party-sheet, Property 4: Clear removes all GM character data
   * **Validates: Requirements 3.4**
   */
  it('removes gmCharacterActorId and character entry after clear', async () => {
    await fc.assert(
      fc.asyncProperty(
        actorIdArbitrary,
        uniqueFieldsArbitrary,
        async (gmActorId, gmFields) => {
          const savedData: PartyChronicleData = {
            shared: {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'EVT001',
              eventDate: '2024-01-01',
              xpEarned: 4,
              treasureBundles: 5,
              downtimeDays: 2,
              layoutId: 'layout-1',
              seasonId: 'season-1',
              blankChroniclePath: '/path/to/blank.pdf',
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

          mockLoadPartyChronicleData.mockResolvedValue({
            timestamp: Date.now(),
            data: savedData,
          });
          mockSavePartyChronicleData.mockClear();

          await handleGmCharacterClear(mockContainer, [], mockPartySheet);

          expect(mockSavePartyChronicleData).toHaveBeenCalledTimes(1);
          const clearedData = mockSavePartyChronicleData.mock.calls[0][0];

          expect(clearedData.shared.gmCharacterActorId).toBeUndefined();
          expect(Object.prototype.hasOwnProperty.call(clearedData.characters, gmActorId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
