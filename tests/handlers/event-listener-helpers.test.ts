/**
 * Unit tests for event-listener-helpers
 *
 * Tests the clear button flow (handleClearButtonConfirmed) and
 * createDefaultChronicleData to cover the Logger debug() calls
 * introduced by the debug-logging feature.
 *
 * @jest-environment jsdom
 */

import {
  attachClearButtonListener,
  attachOverrideListeners,
  attachCollapsibleSectionListeners,
  attachSeasonAndLayoutListeners,
  attachFormFieldListeners,
  attachTreasureBundleListeners,
  attachDowntimeDaysListeners,
  attachEarnedIncomeListeners,
  attachSaveButtonListener,
  attachGenerateButtonListener,
  attachCopySessionReportListener,
  attachExportButtonListener,
  attachPortraitListeners,
  attachFilePickerListener,
  attachGmCharacterListeners,
  PartyActor,
  PartySheetApp,
} from '../../scripts/handlers/event-listener-helpers';

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
  updateTreasureBundlesForXp: jest.fn(),
  updateChroniclePathVisibility: (...args: unknown[]) => mockUpdateChroniclePathVisibility(...args),
}));

jest.mock('../../scripts/handlers/collapsible-section-handlers', () => ({
  handleSectionHeaderClick: jest.fn(),
  handleSectionHeaderKeydown: jest.fn(),
}));

jest.mock('../../scripts/utils/earned-income-form-helpers', () => ({
  createEarnedIncomeChangeHandler: jest.fn(() => jest.fn()),
}));

const mockHandleOverrideXpChange = jest.fn();
const mockHandleOverrideCurrencyChange = jest.fn();
jest.mock('../../scripts/handlers/override-handlers', () => ({
  handleOverrideXpChange: (...args: unknown[]) => mockHandleOverrideXpChange(...args),
  handleOverrideCurrencyChange: (...args: unknown[]) => mockHandleOverrideCurrencyChange(...args),
}));

jest.mock('../../scripts/handlers/session-report-handler', () => ({
  handleCopySessionReport: jest.fn(),
}));

const mockHandleGmCharacterDrop = jest.fn().mockResolvedValue(undefined);
const mockHandleGmCharacterClear = jest.fn().mockResolvedValue(undefined);
jest.mock('../../scripts/handlers/gm-character-handlers', () => ({
  handleGmCharacterDrop: (...args: unknown[]) => mockHandleGmCharacterDrop(...args),
  handleGmCharacterClear: (...args: unknown[]) => mockHandleGmCharacterClear(...args),
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
  actors: {
    get: jest.fn(),
  },
};

(global as any).ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
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

  describe('attachOverrideListeners', () => {
    it('attaches change listeners to XP override checkboxes that call handleOverrideXpChange', () => {
      container.innerHTML = `
        <input type="checkbox" name="characters.actor-1.overrideXp">
        <input type="checkbox" name="characters.actor-2.overrideXp">
      `;

      attachOverrideListeners(container);

      const checkboxes = container.querySelectorAll<HTMLInputElement>('input[name$=".overrideXp"]');
      checkboxes[0].dispatchEvent(new Event('change'));

      expect(mockHandleOverrideXpChange).toHaveBeenCalledWith('actor-1', container);
    });

    it('attaches change listeners to currency override checkboxes that call handleOverrideCurrencyChange', () => {
      container.innerHTML = `
        <input type="checkbox" name="characters.actor-1.overrideCurrency">
      `;

      attachOverrideListeners(container);

      const checkbox = container.querySelector<HTMLInputElement>('input[name$=".overrideCurrency"]')!;
      checkbox.dispatchEvent(new Event('change'));

      expect(mockHandleOverrideCurrencyChange).toHaveBeenCalledWith('actor-1', container);
    });

    it('handles empty container with no override checkboxes', () => {
      container.innerHTML = '';

      expect(() => attachOverrideListeners(container)).not.toThrow();
      expect(mockHandleOverrideXpChange).not.toHaveBeenCalled();
      expect(mockHandleOverrideCurrencyChange).not.toHaveBeenCalled();
    });
  });

  describe('attachCollapsibleSectionListeners', () => {
    it('attaches click and keydown listeners to collapsible section headers', () => {
      container.innerHTML = `
        <div class="collapsible-section" data-section-id="event-details">
          <header class="collapsible-header" role="button" tabindex="0">
            <span class="section-title">Event Details</span>
          </header>
        </div>
      `;

      attachCollapsibleSectionListeners(container);

      const header = container.querySelector('.collapsible-header') as HTMLElement;
      header.click();

      const { handleSectionHeaderClick } = require('../../scripts/handlers/collapsible-section-handlers');
      expect(handleSectionHeaderClick).toHaveBeenCalled();
    });
  });

  describe('attachSeasonAndLayoutListeners', () => {
    it('attaches change listeners to season and layout selects', async () => {
      container.innerHTML = `
        <select id="season"><option value="s1" selected>Season 1</option></select>
        <select id="layout"><option value="layout1" selected>Layout 1</option></select>
      `;

      attachSeasonAndLayoutListeners(container, partyActors);

      const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
      seasonSelect.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, 10));

      const { handleSeasonChange } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(handleSeasonChange).toHaveBeenCalled();

      const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
      layoutSelect.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, 10));

      const { handleLayoutChange } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(handleLayoutChange).toHaveBeenCalled();
    });

    it('handles missing season and layout selects gracefully', () => {
      container.innerHTML = '';

      expect(() => attachSeasonAndLayoutListeners(container, partyActors)).not.toThrow();
    });
  });

  describe('attachFormFieldListeners', () => {
    it('attaches change listeners to all form elements', async () => {
      container.innerHTML = `
        <input type="text" name="test" value="hello" />
        <select name="testSelect"><option value="a">A</option></select>
      `;

      attachFormFieldListeners(container, partyActors);

      const input = container.querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, 10));

      const { handleFieldChange } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(handleFieldChange).toHaveBeenCalled();
    });
  });

  describe('attachTreasureBundleListeners', () => {
    it('attaches change listener to treasure bundles select', () => {
      container.innerHTML = `
        <select id="treasureBundles"><option value="8" selected>8</option></select>
      `;

      attachTreasureBundleListeners(container);

      const select = container.querySelector('#treasureBundles') as HTMLSelectElement;
      select.dispatchEvent(new Event('change'));

      const { updateAllTreasureBundleDisplays } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(updateAllTreasureBundleDisplays).toHaveBeenCalledWith(8, container);
    });

    it('attaches input listener to character level inputs for treasure bundle updates', () => {
      container.innerHTML = `
        <select id="treasureBundles"><option value="8" selected>8</option></select>
        <input name="characters.actor-1.level" value="5" />
      `;

      attachTreasureBundleListeners(container);

      const levelInput = container.querySelector('input[name="characters.actor-1.level"]') as HTMLInputElement;
      levelInput.dispatchEvent(new Event('input'));

      const { updateTreasureBundleDisplay } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(updateTreasureBundleDisplay).toHaveBeenCalledWith('actor-1', 8, 5, container);
    });
  });

  describe('attachDowntimeDaysListeners', () => {
    it('attaches change listener to XP earned select for downtime days updates', () => {
      container.innerHTML = `
        <select id="xpEarned"><option value="4" selected>4</option></select>
        <select id="treasureBundles"><option value="8" selected>8</option></select>
      `;

      attachDowntimeDaysListeners(container);

      const xpSelect = container.querySelector('#xpEarned') as HTMLSelectElement;
      xpSelect.dispatchEvent(new Event('change'));

      const { updateDowntimeDaysDisplay, updateTreasureBundlesForXp } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(updateTreasureBundlesForXp).toHaveBeenCalledWith(4, container);
      expect(updateDowntimeDaysDisplay).toHaveBeenCalledWith(4, container);
    });

    it('attaches change listener to treasure bundles select for downtime days updates', () => {
      container.innerHTML = `
        <select id="xpEarned"><option value="1" selected>1</option></select>
        <select id="treasureBundles"><option value="2.5" selected>2.5</option></select>
      `;

      attachDowntimeDaysListeners(container);

      const tbSelect = container.querySelector('#treasureBundles') as HTMLSelectElement;
      tbSelect.dispatchEvent(new Event('change'));

      const { updateDowntimeDaysDisplay } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(updateDowntimeDaysDisplay).toHaveBeenCalledWith(1, container);
    });
  });

  describe('attachEarnedIncomeListeners', () => {
    it('attaches change listener to downtime days select', () => {
      container.innerHTML = `
        <select id="downtimeDays"><option value="8" selected>8</option></select>
        <select name="characters.actor-1.taskLevel"><option value="3">3</option></select>
        <select name="characters.actor-1.successLevel"><option value="success">Success</option></select>
        <select name="characters.actor-1.proficiencyRank"><option value="trained">Trained</option></select>
      `;

      attachEarnedIncomeListeners(container);

      const downtimeSelect = container.querySelector('#downtimeDays') as HTMLSelectElement;
      downtimeSelect.dispatchEvent(new Event('change'));

      const { updateAllEarnedIncomeDisplays } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(updateAllEarnedIncomeDisplays).toHaveBeenCalledWith(8, container);
    });

    it('attaches change listeners to task level, success level, and proficiency rank selects', () => {
      container.innerHTML = `
        <select id="downtimeDays"><option value="8" selected>8</option></select>
        <select name="characters.actor-1.taskLevel"><option value="3">3</option></select>
        <select name="characters.actor-1.successLevel"><option value="success">Success</option></select>
        <select name="characters.actor-1.proficiencyRank"><option value="trained">Trained</option></select>
      `;

      attachEarnedIncomeListeners(container);

      const { createEarnedIncomeChangeHandler } = require('../../scripts/utils/earned-income-form-helpers');
      expect(createEarnedIncomeChangeHandler).toHaveBeenCalledWith(container);

      const taskSelect = container.querySelector('select[name$=".taskLevel"]') as HTMLSelectElement;
      taskSelect.dispatchEvent(new Event('change'));

      // The handler returned by createEarnedIncomeChangeHandler should have been called
      const mockHandler = createEarnedIncomeChangeHandler.mock.results[0].value;
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('attachSaveButtonListener', () => {
    it('attaches click listener to save button that calls saveFormData', async () => {
      container.innerHTML = `<button id="saveData">Save</button>`;

      attachSaveButtonListener(container, partyActors);

      const saveButton = container.querySelector('#saveData') as HTMLButtonElement;
      saveButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const { saveFormData } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(saveFormData).toHaveBeenCalledWith(container, partyActors);
      expect(ui.notifications?.info).toHaveBeenCalledWith('Chronicle data saved successfully');
    });
  });

  describe('attachPortraitListeners', () => {
    it('attaches click listeners to actor portrait images', () => {
      container.innerHTML = `
        <div class="actor-image"><img class="actor-link" /></div>
        <div class="actor-image"><img class="actor-link" /></div>
      `;

      attachPortraitListeners(container, partyActors);

      const img = container.querySelector('.actor-link') as HTMLImageElement;
      img.click();

      const { handlePortraitClick } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(handlePortraitClick).toHaveBeenCalled();
    });
  });

  describe('attachFilePickerListener', () => {
    it('attaches click listener to file picker button', async () => {
      container.innerHTML = `<button id="chroniclePathFilePicker">Browse</button>`;

      attachFilePickerListener(container, partyActors);

      const button = container.querySelector('#chroniclePathFilePicker') as HTMLButtonElement;
      button.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const { handleChroniclePathFilePicker } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(handleChroniclePathFilePicker).toHaveBeenCalled();
    });
  });

  describe('attachGenerateButtonListener', () => {
    it('attaches click listener to generate button that calls generateChroniclesFromPartyData', async () => {
      container.innerHTML = `<button id="generateChronicles">Generate</button>`;

      attachGenerateButtonListener(container, partyActors, mockPartyActor);

      const button = container.querySelector('#generateChronicles') as HTMLButtonElement;
      button.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const { generateChroniclesFromPartyData, extractFormData } = require('../../scripts/handlers/party-chronicle-handlers');
      expect(extractFormData).toHaveBeenCalledWith(container, partyActors);
      expect(generateChroniclesFromPartyData).toHaveBeenCalled();
    });
  });

  describe('attachCopySessionReportListener', () => {
    it('attaches click listener to copy session report button', async () => {
      container.innerHTML = `
        <button id="copySessionReport">Copy</button>
        <select id="layout"><option value="layout1" selected>Layout 1</option></select>
      `;

      attachCopySessionReportListener(container, partyActors);

      const button = container.querySelector('#copySessionReport') as HTMLButtonElement;
      button.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      const { handleCopySessionReport } = require('../../scripts/handlers/session-report-handler');
      expect(handleCopySessionReport).toHaveBeenCalledWith(container, partyActors, 'layout1', expect.any(MouseEvent));
    });
  });

  describe('attachExportButtonListener', () => {
    it('shows error notification when no archive is available', () => {
      container.innerHTML = `<button id="exportChronicles">Export</button>`;

      attachExportButtonListener(container, mockPartyActor);

      const button = container.querySelector('#exportChronicles') as HTMLButtonElement;
      button.click();

      expect(ui.notifications?.error).toHaveBeenCalledWith('No chronicle archive available to export.');
    });
  });

  describe('attachGmCharacterListeners', () => {
    it('attaches dragover, dragleave, and drop listeners to the drop zone', async () => {
      container.innerHTML = `
        <div id="gmCharacterDropZone"></div>
        <div id="gmCharacterSection"></div>
        <button id="clearGmCharacter">Clear</button>
      `;

      const partySheet: PartySheetApp = { actor: undefined };
      attachGmCharacterListeners(container, partyActors, partySheet);

      const dropZone = container.querySelector('#gmCharacterDropZone') as HTMLElement;

      // Test dragover adds class
      dropZone.dispatchEvent(new Event('dragover'));
      expect(dropZone.classList.contains('dragover')).toBe(true);

      // Test dragleave removes class
      dropZone.dispatchEvent(new Event('dragleave'));
      expect(dropZone.classList.contains('dragover')).toBe(false);
    });

    it('attaches click listener to clear GM character button', async () => {
      container.innerHTML = `
        <div id="gmCharacterDropZone"></div>
        <button id="clearGmCharacter">Clear</button>
      `;

      const partySheet: PartySheetApp = { actor: undefined };
      attachGmCharacterListeners(container, partyActors, partySheet);

      const clearButton = container.querySelector('#clearGmCharacter') as HTMLButtonElement;
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockHandleGmCharacterClear).toHaveBeenCalledWith(container, partyActors, partySheet);
    });

    it('handles missing drop zone and clear button gracefully', () => {
      container.innerHTML = '';

      const partySheet: PartySheetApp = { actor: undefined };
      expect(() => attachGmCharacterListeners(container, partyActors, partySheet)).not.toThrow();
    });
  });
});
