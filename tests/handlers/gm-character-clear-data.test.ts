/**
 * Unit tests for Clear Data with GM character
 *
 * Verifies that the Clear Data button (handleClearButtonConfirmed) removes
 * the GM character assignment and its character data, leaving only party
 * actor entries in the saved data, and re-renders the form.
 *
 * Requirements: gm-character-party-sheet 3.4, 8.4
 *
 * @jest-environment jsdom
 */

import { attachClearButtonListener, PartyActor } from '../../scripts/handlers/event-listener-helpers';

// Track calls to storage functions
const mockClearPartyChronicleData = jest.fn().mockResolvedValue(undefined);
const mockSavePartyChronicleData = jest.fn().mockResolvedValue(undefined);

jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  clearPartyChronicleData: (...args: unknown[]) => mockClearPartyChronicleData(...args),
  savePartyChronicleData: (...args: unknown[]) => mockSavePartyChronicleData(...args),
}));

const mockUpdateChroniclePathVisibility = jest.fn().mockResolvedValue(undefined);

jest.mock('../../scripts/handlers/party-chronicle-handlers', () => ({
  handleSeasonChange: jest.fn(),
  handleLayoutChange: jest.fn(),
  handleFieldChange: jest.fn(),
  handlePortraitClick: jest.fn(),
  handleChroniclePathFilePicker: jest.fn(),
  extractFormData: jest.fn(() => ({ shared: {}, characters: {} })),
  saveFormData: jest.fn().mockResolvedValue(undefined),
  generateChroniclesFromPartyData: jest.fn(),
  updateAllTreasureBundleDisplays: jest.fn(),
  updateTreasureBundleDisplay: jest.fn(),
  updateAllEarnedIncomeDisplays: jest.fn(),
  updateDowntimeDaysDisplay: jest.fn(),
  updateChroniclePathVisibility: (...args: unknown[]) => mockUpdateChroniclePathVisibility(...args),
}));

jest.mock('../../scripts/handlers/collapsible-section-handlers', () => ({
  handleSectionHeaderClick: jest.fn(),
  handleSectionHeaderKeydown: jest.fn(),
}));

jest.mock('../../scripts/utils/earned-income-form-helpers', () => ({
  createEarnedIncomeChangeHandler: jest.fn(() => jest.fn()),
}));

jest.mock('../../scripts/handlers/session-report-handler', () => ({
  handleCopySessionReport: jest.fn(),
}));

const mockClearArchive = jest.fn().mockResolvedValue(undefined);
jest.mock('../../scripts/handlers/chronicle-exporter', () => ({
  clearArchive: (...args: unknown[]) => mockClearArchive(...args),
  downloadArchive: jest.fn(),
  hasArchive: jest.fn().mockReturnValue(false),
  FlagActor: {},
}));

// Mock the dynamic import of main.js
const mockRenderPartyChronicleForm = jest.fn().mockResolvedValue(undefined);
jest.mock('../../scripts/main.js', () => ({
  renderPartyChronicleForm: (...args: unknown[]) => mockRenderPartyChronicleForm(...args),
}));

jest.mock('../../scripts/handlers/gm-character-handlers', () => ({
  handleGmCharacterDrop: jest.fn(),
  handleGmCharacterClear: jest.fn(),
}));

// Foundry VTT globals
(globalThis as any).foundry = {
  applications: {
    api: {
      DialogV2: {
        confirm: jest.fn().mockResolvedValue(true),
      },
    },
  },
};

(globalThis as any).game = {
  settings: { get: jest.fn().mockReturnValue(true) },
};

(globalThis as any).ui = {
  notifications: { info: jest.fn(), warn: jest.fn() },
};

describe('Clear Data with GM character (Req 3.4, 8.4)', () => {
  let container: HTMLElement;
  let partyActors: PartyActor[];
  const gmCharacterActorId = 'gm-char-999';
  const mockPartyActor = {
    getFlag: jest.fn(),
    setFlag: jest.fn().mockResolvedValue(undefined),
    unsetFlag: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPartyActor.getFlag.mockReset();
    mockPartyActor.setFlag.mockReset().mockResolvedValue(undefined);
    mockPartyActor.unsetFlag.mockReset().mockResolvedValue(undefined);

    container = document.createElement('div');
    container.innerHTML = `
      <input id="gmPfsNumber" value="12345" />
      <input id="scenarioName" value="Test Scenario" />
      <input id="eventCode" value="EVT-01" />
      <input id="blankChroniclePath" value="/chronicles/test.pdf" />
      <select id="season"><option value="s1" selected>Season 1</option></select>
      <select id="layout"><option value="layout1" selected>Layout 1</option></select>
      <button id="clearData">Clear</button>
    `;

    partyActors = [
      {
        id: 'actor-1',
        name: 'Valeros',
        img: '',
        type: 'character',
        render: jest.fn(),
        getFlag: jest.fn(),
        setFlag: jest.fn(),
        unsetFlag: jest.fn(),
        update: jest.fn(),
        system: { details: { level: { value: 5 } } },
      },
      {
        id: 'actor-2',
        name: 'Merisiel',
        img: '',
        type: 'character',
        render: jest.fn(),
        getFlag: jest.fn(),
        setFlag: jest.fn(),
        unsetFlag: jest.fn(),
        update: jest.fn(),
        system: { details: { level: { value: 3 } } },
      },
    ];
  });

  it('should remove gmCharacterActorId from saved shared data after clear', async () => {
    attachClearButtonListener(container, partyActors, {}, mockPartyActor);

    const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
    clearButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockSavePartyChronicleData).toHaveBeenCalledTimes(1);
    const savedData = mockSavePartyChronicleData.mock.calls[0][0];

    // gmCharacterActorId should NOT be present in the new default data
    expect(savedData.shared.gmCharacterActorId).toBeUndefined();
  });

  it('should not include GM character in characters map after clear', async () => {
    attachClearButtonListener(container, partyActors, {}, mockPartyActor);

    const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
    clearButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    const savedData = mockSavePartyChronicleData.mock.calls[0][0];
    const characterIds = Object.keys(savedData.characters);

    // Only party actor IDs should be present
    expect(characterIds).toContain('actor-1');
    expect(characterIds).toContain('actor-2');
    expect(characterIds).not.toContain(gmCharacterActorId);
    expect(characterIds).toHaveLength(2);
  });

  it('should call renderPartyChronicleForm to re-render with empty drop zone after clear', async () => {
    const partySheet = {} as any;

    attachClearButtonListener(container, partyActors, partySheet, mockPartyActor);

    const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
    clearButton.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Re-render should be called so the form shows the empty drop zone
    expect(mockRenderPartyChronicleForm).toHaveBeenCalledTimes(1);
    expect(mockRenderPartyChronicleForm).toHaveBeenCalledWith(
      container,
      partyActors,
      partySheet
    );
  });
});
