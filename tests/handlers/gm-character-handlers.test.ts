/**
 * Unit tests for GM character handler functions.
 *
 * Tests handleGmCharacterDrop, handleGmCharacterClear, and
 * validateGmCharacterPfsId with concrete example-based scenarios.
 *
 * Feature: gm-character-party-sheet
 * Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4
 *
 * @jest-environment jsdom
 */

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

import {
  handleGmCharacterDrop,
  handleGmCharacterClear,
  validateGmCharacterPfsId,
} from '../../scripts/handlers/gm-character-handlers';
import { loadPartyChronicleData, savePartyChronicleData } from '../../scripts/model/party-chronicle-storage';
import type { PartyActor, PartySheetApp } from '../../scripts/handlers/event-listener-helpers';
import type { PartyChronicleData } from '../../scripts/model/party-chronicle-types';

// --- Foundry globals ---

const mockFromUuid = jest.fn<(uuid: string) => Promise<PartyActor | null>>();
(globalThis as any).fromUuid = mockFromUuid;

(globalThis as any).ui = {
  notifications: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
};

// --- Typed mock references ---

const mockLoad = loadPartyChronicleData as jest.MockedFunction<typeof loadPartyChronicleData>;
const mockSave = savePartyChronicleData as jest.MockedFunction<typeof savePartyChronicleData>;
const mockWarn = (ui as any).notifications.warn as jest.Mock;

// --- Helpers ---

function createActor(overrides: Partial<PartyActor> & { id: string }): PartyActor {
  return {
    name: 'Test Actor',
    img: '/icons/default.png',
    type: 'character',
    render: () => {},
    getFlag: () => undefined,
    setFlag: async () => {},
    unsetFlag: async () => {},
    update: async () => {},
    system: {
      details: { level: { value: 5 } },
      pfs: { playerNumber: 12345, characterNumber: 2001, currentFaction: 'EA' },
    },
    ...overrides,
  };
}

function createDragEvent(payload: string | object): DragEvent {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const event = new Event('drop') as unknown as DragEvent;
  Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
  Object.defineProperty(event, 'dataTransfer', {
    value: { getData: () => raw },
  });
  return event;
}

function createDragEventWithoutData(): DragEvent {
  const event = new Event('drop') as unknown as DragEvent;
  Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
  Object.defineProperty(event, 'dataTransfer', {
    value: { getData: () => '' },
  });
  return event;
}

function buildSavedData(overrides?: Partial<PartyChronicleData>): PartyChronicleData {
  return {
    shared: {
      gmPfsNumber: '12345',
      scenarioName: 'Test Scenario',
      eventCode: 'EVT001',
      eventDate: '2024-06-15',
      xpEarned: 4,
      treasureBundles: 8,
      downtimeDays: 8,
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
      ...overrides?.shared,
    },
    characters: { ...overrides?.characters },
  };
}

const mockContainer = document.createElement('div');
const mockPartySheet: PartySheetApp = {};

// --- Test suites ---

describe('handleGmCharacterDrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoad.mockResolvedValue(null);
    mockSave.mockResolvedValue(undefined);
  });

  it('assigns a valid character actor as GM character (Req 1.3, 3.3)', async () => {
    const actor = createActor({ id: 'actor-gm-001', name: 'Kyra', type: 'character' });
    mockFromUuid.mockResolvedValue(actor);

    const event = createDragEvent({ type: 'Actor', uuid: 'Actor.actor-gm-001' });
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).toHaveBeenCalledTimes(1);
    const saved = mockSave.mock.calls[0][0];
    expect(saved.shared.gmCharacterActorId).toBe('actor-gm-001');
    expect(saved.characters['actor-gm-001']).toBeDefined();
    expect(saved.characters['actor-gm-001'].characterName).toBe('Kyra');
  });

  it('rejects a familiar actor with notification (Req 1.4)', async () => {
    const familiar = createActor({ id: 'fam-001', name: 'Pip', type: 'familiar' });
    mockFromUuid.mockResolvedValue(familiar);

    const event = createDragEvent({ type: 'Actor', uuid: 'Actor.fam-001' });
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Only character actors')
    );
  });

  it('rejects an NPC actor with notification (Req 1.4)', async () => {
    const npc = createActor({ id: 'npc-001', name: 'Bandit', type: 'npc' });
    mockFromUuid.mockResolvedValue(npc);

    const event = createDragEvent({ type: 'Actor', uuid: 'Actor.npc-001' });
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalled();
  });

  it('rejects a vehicle actor with notification (Req 1.4)', async () => {
    const vehicle = createActor({ id: 'veh-001', name: 'Wagon', type: 'vehicle' });
    mockFromUuid.mockResolvedValue(vehicle);

    const event = createDragEvent({ type: 'Actor', uuid: 'Actor.veh-001' });
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalled();
  });

  it('rejects an actor already in the party member list (Req 1.5)', async () => {
    const partyMember = createActor({ id: 'party-001', name: 'Valeros' });
    mockFromUuid.mockResolvedValue(partyMember);

    const event = createDragEvent({ type: 'Actor', uuid: 'Actor.party-001' });
    await handleGmCharacterDrop(event, mockContainer, [partyMember], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('already a party member')
    );
  });

  it('silently ignores unparseable dataTransfer payload', async () => {
    const event = createDragEvent('not-valid-json{{{');
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('silently ignores empty dataTransfer', async () => {
    const event = createDragEventWithoutData();
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('silently ignores non-Actor drop payload', async () => {
    const event = createDragEvent({ type: 'Item', uuid: 'Item.sword-001' });
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockFromUuid).not.toHaveBeenCalled();
  });

  it('replaces existing GM character when dropping a new actor (Req 3.3)', async () => {
    const oldGmId = 'old-gm-actor';
    const newActor = createActor({ id: 'new-gm-actor', name: 'Seelah' });
    mockFromUuid.mockResolvedValue(newActor);

    const existingData = buildSavedData({
      shared: { gmCharacterActorId: oldGmId } as any,
      characters: {
        [oldGmId]: {
          characterName: 'Old GM Char',
          playerNumber: '99999',
          characterNumber: '2001',
          level: 3,
          taskLevel: 1,
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
        },
      },
    });
    mockLoad.mockResolvedValue({ timestamp: Date.now(), data: existingData });

    const event = createDragEvent({ type: 'Actor', uuid: 'Actor.new-gm-actor' });
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    expect(mockSave).toHaveBeenCalledTimes(1);
    const saved = mockSave.mock.calls[0][0];
    expect(saved.shared.gmCharacterActorId).toBe('new-gm-actor');
    expect(saved.characters['new-gm-actor']).toBeDefined();
    expect(saved.characters['new-gm-actor'].characterName).toBe('Seelah');
  });

  it('sets default UniqueFields with correct task level for the actor level', async () => {
    const actor = createActor({
      id: 'lvl10-actor',
      name: 'Amiri',
      system: {
        details: { level: { value: 10 } },
        pfs: { playerNumber: 55555, characterNumber: 2005, currentFaction: 'GA' },
      },
    });
    mockFromUuid.mockResolvedValue(actor);

    const event = createDragEvent({ type: 'Actor', uuid: 'Actor.lvl10-actor' });
    await handleGmCharacterDrop(event, mockContainer, [], mockPartySheet);

    const saved = mockSave.mock.calls[0][0];
    const fields = saved.characters['lvl10-actor'];
    expect(fields.level).toBe(10);
    expect(fields.taskLevel).toBe(8); // level - 2
    expect(fields.successLevel).toBe('success');
    expect(fields.proficiencyRank).toBe('trained');
  });
});

describe('handleGmCharacterClear', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  it('removes GM character assignment and character entry (Req 3.2, 3.4)', async () => {
    const gmActorId = 'gm-to-clear';
    const savedData = buildSavedData({
      shared: { gmCharacterActorId: gmActorId } as any,
      characters: {
        [gmActorId]: {
          characterName: 'Ezren',
          playerNumber: '11111',
          characterNumber: '2003',
          level: 7,
          taskLevel: 5,
          successLevel: 'success',
          proficiencyRank: 'expert',
          earnedIncome: 50,
          currencySpent: 10,
          notes: 'GM credit',
          consumeReplay: false,
          overrideXp: false,
          overrideXpValue: 0,
          overrideCurrency: false,
          overrideCurrencyValue: 0,
          slowTrack: false,
        },
        'party-member-1': {
          characterName: 'Valeros',
          playerNumber: '22222',
          characterNumber: '2001',
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
        },
      },
    });
    mockLoad.mockResolvedValue({ timestamp: Date.now(), data: savedData });

    await handleGmCharacterClear(mockContainer, [], mockPartySheet);

    expect(mockSave).toHaveBeenCalledTimes(1);
    const cleared = mockSave.mock.calls[0][0];
    expect(cleared.shared.gmCharacterActorId).toBeUndefined();
    expect(cleared.characters[gmActorId]).toBeUndefined();
    // Party member data should be preserved
    expect(cleared.characters['party-member-1']).toBeDefined();
    expect(cleared.characters['party-member-1'].characterName).toBe('Valeros');
  });

  it('does nothing when no saved data exists', async () => {
    mockLoad.mockResolvedValue(null);

    await handleGmCharacterClear(mockContainer, [], mockPartySheet);

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('handles clear when gmCharacterActorId is already absent', async () => {
    const savedData = buildSavedData();
    mockLoad.mockResolvedValue({ timestamp: Date.now(), data: savedData });

    await handleGmCharacterClear(mockContainer, [], mockPartySheet);

    expect(mockSave).toHaveBeenCalledTimes(1);
    const cleared = mockSave.mock.calls[0][0];
    expect(cleared.shared.gmCharacterActorId).toBeUndefined();
  });
});

describe('validateGmCharacterPfsId', () => {
  it('returns null when PFS IDs match (Req 7.3)', () => {
    const actor = createActor({
      id: 'match-actor',
      system: {
        details: { level: { value: 5 } },
        pfs: { playerNumber: 12345, characterNumber: 2001, currentFaction: 'EA' },
      },
    });

    const result = validateGmCharacterPfsId(actor, '12345');
    expect(result).toBeNull();
  });

  it('returns error with both IDs when they differ (Req 7.1, 7.2)', () => {
    const actor = createActor({
      id: 'mismatch-actor',
      system: {
        details: { level: { value: 5 } },
        pfs: { playerNumber: 99999, characterNumber: 2001, currentFaction: 'EA' },
      },
    });

    const result = validateGmCharacterPfsId(actor, '12345');
    expect(result).not.toBeNull();
    expect(result).toContain('99999');
    expect(result).toContain('12345');
  });

  it('handles actor with missing PFS data gracefully', () => {
    const actor = createActor({
      id: 'no-pfs-actor',
      system: { details: { level: { value: 1 } } },
    });

    const result = validateGmCharacterPfsId(actor, '12345');
    expect(result).not.toBeNull();
    expect(result).toContain('12345');
  });
});
