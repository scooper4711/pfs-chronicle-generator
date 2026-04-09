/**
 * Unit tests for event-listener-helpers
 *
 * Tests the clear button flow (handleClearButtonConfirmed) and
 * createDefaultChronicleData to cover the Logger debug() calls
 * introduced by the debug-logging feature.
 *
 * @jest-environment jsdom
 */

import { attachClearButtonListener, PartyActor } from '../../scripts/handlers/event-listener-helpers';

// Track calls to clearPartyChronicleData and savePartyChronicleData
const mockClearPartyChronicleData = jest.fn().mockResolvedValue(undefined);
const mockSavePartyChronicleData = jest.fn().mockResolvedValue(undefined);

jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  clearPartyChronicleData: (...args: unknown[]) => mockClearPartyChronicleData(...args),
  savePartyChronicleData: (...args: unknown[]) => mockSavePartyChronicleData(...args),
}));

// Mock the handlers that are imported by event-listener-helpers
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

// Foundry VTT globals
(global as any).foundry = {
  applications: {
    api: {
      DialogV2: {
        confirm: jest.fn().mockResolvedValue(true),
      },
    },
  },
};

(global as any).game = {
  settings: {
    get: jest.fn().mockReturnValue(true),
  },
};

(global as any).ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
  },
};

describe('event-listener-helpers', () => {
  let container: HTMLElement;
  let partyActors: PartyActor[];
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

    // Build the minimal DOM the clear-button flow reads from
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
        system: {
          details: { level: { value: 5 } },
        },
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
        system: {
          details: { level: { value: 3 } },
        },
      },
    ];
  });

  describe('attachClearButtonListener — clear flow', () => {
    it('should clear data, save defaults, re-render, and update visibility', async () => {
      attachClearButtonListener(container, partyActors, {}, mockPartyActor);

      // Click the clear button
      const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
      clearButton.click();

      // Let all microtasks settle (confirm dialog + async handler)
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockClearPartyChronicleData).toHaveBeenCalledTimes(1);

      // savePartyChronicleData should have been called with the new defaults
      expect(mockSavePartyChronicleData).toHaveBeenCalledTimes(1);
      const savedData = mockSavePartyChronicleData.mock.calls[0][0];

      // Preserved fields
      expect(savedData.shared.gmPfsNumber).toBe('12345');
      expect(savedData.shared.scenarioName).toBe('Test Scenario');
      expect(savedData.shared.eventCode).toBe('EVT-01');
      expect(savedData.shared.blankChroniclePath).toBe('/chronicles/test.pdf');
      expect(savedData.shared.layoutId).toBe('layout1');
      expect(savedData.shared.seasonId).toBe('s1');

      // Scenario defaults (not bounty, not quest)
      expect(savedData.shared.xpEarned).toBe(4);
      expect(savedData.shared.treasureBundles).toBe(8);
      expect(savedData.shared.downtimeDays).toBe(8);
      expect(savedData.shared.chosenFactionReputation).toBe(4);

      // Character defaults
      expect(savedData.characters['actor-1'].characterName).toBe('Valeros');
      expect(savedData.characters['actor-1'].level).toBe(5);
      expect(savedData.characters['actor-1'].taskLevel).toBe(3); // max(0, 5-2)
      expect(savedData.characters['actor-2'].characterName).toBe('Merisiel');
      expect(savedData.characters['actor-2'].level).toBe(3);
      expect(savedData.characters['actor-2'].taskLevel).toBe(1); // max(0, 3-2)

      // Re-render and visibility update
      expect(mockRenderPartyChronicleForm).toHaveBeenCalledTimes(1);
      expect(mockUpdateChroniclePathVisibility).toHaveBeenCalledWith(
        '/chronicles/test.pdf',
        container,
        'layout1'
      );
    });

    it('should use bounty defaults when scenario name starts with Bxx', async () => {
      const scenarioInput = container.querySelector('#scenarioName') as HTMLInputElement;
      scenarioInput.value = 'B1 The Whitefang Wyrm';

      attachClearButtonListener(container, partyActors, {}, mockPartyActor);
      const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const savedData = mockSavePartyChronicleData.mock.calls[0][0];
      expect(savedData.shared.xpEarned).toBe(1);
      expect(savedData.shared.treasureBundles).toBe(2);
      expect(savedData.shared.downtimeDays).toBe(0);
      expect(savedData.shared.chosenFactionReputation).toBe(1);
    });

    it('should use quest defaults when scenario name starts with Qxx', async () => {
      const scenarioInput = container.querySelector('#scenarioName') as HTMLInputElement;
      scenarioInput.value = 'Q14 The Swordlords Challenge';

      attachClearButtonListener(container, partyActors, {}, mockPartyActor);
      const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const savedData = mockSavePartyChronicleData.mock.calls[0][0];
      expect(savedData.shared.xpEarned).toBe(2);
      expect(savedData.shared.treasureBundles).toBe(4);
      expect(savedData.shared.downtimeDays).toBe(4);
      expect(savedData.shared.chosenFactionReputation).toBe(2);
    });

    it('should handle actors without system data gracefully', async () => {
      const actorsNoSystem: PartyActor[] = [
        { id: 'actor-3', name: 'NoSystem', img: '', type: 'character', render: jest.fn(), getFlag: jest.fn(), setFlag: jest.fn(), unsetFlag: jest.fn(), update: jest.fn() },
      ];

      attachClearButtonListener(container, actorsNoSystem, {}, mockPartyActor);
      const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const savedData = mockSavePartyChronicleData.mock.calls[0][0];
      expect(savedData.characters['actor-3'].level).toBe(1);
      expect(savedData.characters['actor-3'].taskLevel).toBe(0); // max(0, 1-2) = 0
    });

    it('should not proceed when confirmation dialog is rejected', async () => {
      (foundry.applications.api.DialogV2.confirm as jest.Mock).mockResolvedValueOnce(false);

      attachClearButtonListener(container, partyActors, {}, mockPartyActor);
      const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockClearPartyChronicleData).not.toHaveBeenCalled();
      expect(mockSavePartyChronicleData).not.toHaveBeenCalled();
    });
  });
});
