/**
 * Unit tests for Export button UI integration
 *
 * Tests the Export button's presence, disabled/enabled state based on
 * archive availability, and state transitions after generation and clear.
 *
 * Requirements: chronicle-export 2.1, 2.2, 2.3, 2.4, 5.2
 *
 * @jest-environment jsdom
 */

import {
  attachExportButtonListener,
  attachGenerateButtonListener,
  attachClearButtonListener,
  PartyActor,
} from './event-listener-helpers';

const mockClearPartyChronicleData = jest.fn().mockResolvedValue(undefined);
const mockSavePartyChronicleData = jest.fn().mockResolvedValue(undefined);

jest.mock('../model/party-chronicle-storage', () => ({
  clearPartyChronicleData: (...args: unknown[]) => mockClearPartyChronicleData(...args),
  savePartyChronicleData: (...args: unknown[]) => mockSavePartyChronicleData(...args),
}));

const mockGenerateChroniclesFromPartyData = jest.fn().mockResolvedValue(undefined);

jest.mock('./party-chronicle-handlers', () => ({
  handleSeasonChange: jest.fn(),
  handleLayoutChange: jest.fn(),
  handleFieldChange: jest.fn(),
  handlePortraitClick: jest.fn(),
  handleChroniclePathFilePicker: jest.fn(),
  extractFormData: jest.fn(() => ({ shared: {}, characters: {} })),
  saveFormData: jest.fn().mockResolvedValue(undefined),
  generateChroniclesFromPartyData: (...args: unknown[]) => mockGenerateChroniclesFromPartyData(...args),
  updateAllTreasureBundleDisplays: jest.fn(),
  updateTreasureBundleDisplay: jest.fn(),
  updateAllEarnedIncomeDisplays: jest.fn(),
  updateDowntimeDaysDisplay: jest.fn(),
  updateChroniclePathVisibility: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./collapsible-section-handlers', () => ({
  handleSectionHeaderClick: jest.fn(),
  handleSectionHeaderKeydown: jest.fn(),
}));

jest.mock('../utils/earned-income-form-helpers', () => ({
  createEarnedIncomeChangeHandler: jest.fn(() => jest.fn()),
}));

jest.mock('./session-report-handler', () => ({
  handleCopySessionReport: jest.fn(),
}));

const mockHasArchive = jest.fn().mockReturnValue(false);
const mockDownloadArchive = jest.fn();
const mockClearArchive = jest.fn().mockResolvedValue(undefined);

jest.mock('./chronicle-exporter', () => ({
  hasArchive: (...args: unknown[]) => mockHasArchive(...args),
  downloadArchive: (...args: unknown[]) => mockDownloadArchive(...args),
  clearArchive: (...args: unknown[]) => mockClearArchive(...args),
  FlagActor: {},
}));

const mockRenderPartyChronicleForm = jest.fn().mockResolvedValue(undefined);
jest.mock('../main.js', () => ({
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
    error: jest.fn(),
  },
};

// --- Helpers ---

function createMockPartyActor() {
  return {
    getFlag: jest.fn(),
    setFlag: jest.fn().mockResolvedValue(undefined),
    unsetFlag: jest.fn().mockResolvedValue(undefined),
  };
}

function createMinimalContainer(hasZip: boolean): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <input id="gmPfsNumber" value="12345" />
    <input id="scenarioName" value="Test Scenario" />
    <input id="eventCode" value="EVT-01" />
    <input id="eventDate" value="2025-06-15" />
    <input id="blankChroniclePath" value="/chronicles/test.pdf" />
    <select id="season"><option value="s1" selected>Season 1</option></select>
    <select id="layout"><option value="layout1" selected>Layout 1</option></select>
    <button id="clearData">Clear</button>
    <button id="generateChronicles">Generate</button>
    <button id="exportChronicles" ${hasZip ? '' : 'disabled'}>Export</button>
  `;
  return container;
}

const SETTLE_DELAY = 50;

describe('Export button UI integration', () => {
  let container: HTMLElement;
  let mockPartyActor: ReturnType<typeof createMockPartyActor>;
  const partyActors: PartyActor[] = [
    { id: 'actor-1', name: 'Valeros', type: 'character', system: { details: { level: { value: 5 } } } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPartyActor = createMockPartyActor();
  });

  describe('button presence and initial state', () => {
    it('renders the Export button in the container', () => {
      container = createMinimalContainer(false);

      const exportButton = container.querySelector('#exportChronicles');

      expect(exportButton).not.toBeNull();
    });

    it('is disabled when no zip archive exists', () => {
      container = createMinimalContainer(false);

      const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;

      expect(exportButton.disabled).toBe(true);
    });

    it('is enabled when a zip archive exists', () => {
      container = createMinimalContainer(true);

      const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;

      expect(exportButton.disabled).toBe(false);
    });
  });

  describe('state update after generation', () => {
    it('enables the Export button when generation produces an archive', async () => {
      container = createMinimalContainer(false);
      mockHasArchive.mockReturnValue(true);
      mockGenerateChroniclesFromPartyData.mockResolvedValue(undefined);

      attachGenerateButtonListener(container, partyActors, mockPartyActor);

      const generateButton = container.querySelector('#generateChronicles') as HTMLButtonElement;
      generateButton.click();
      await new Promise(resolve => setTimeout(resolve, SETTLE_DELAY));

      const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;
      expect(exportButton.disabled).toBe(false);
    });

    it('keeps the Export button disabled when generation produces no archive', async () => {
      container = createMinimalContainer(false);
      mockHasArchive.mockReturnValue(false);
      mockGenerateChroniclesFromPartyData.mockResolvedValue(undefined);

      attachGenerateButtonListener(container, partyActors, mockPartyActor);

      const generateButton = container.querySelector('#generateChronicles') as HTMLButtonElement;
      generateButton.click();
      await new Promise(resolve => setTimeout(resolve, SETTLE_DELAY));

      const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;
      expect(exportButton.disabled).toBe(true);
    });
  });

  describe('state update after clear data', () => {
    it('disables the Export button after clearing data via re-render', async () => {
      container = createMinimalContainer(true);

      // After clear, renderPartyChronicleForm re-renders the form.
      // The re-rendered form will have the button disabled because
      // hasChronicleZip will be false in the template context.
      // We simulate this by having the mock re-render replace the
      // container content with a disabled export button.
      mockRenderPartyChronicleForm.mockImplementation(async () => {
        const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;
        if (exportButton) {
          exportButton.setAttribute('disabled', '');
        }
      });

      attachClearButtonListener(container, partyActors, {}, mockPartyActor);

      const clearButton = container.querySelector('#clearData') as HTMLButtonElement;
      clearButton.click();
      await new Promise(resolve => setTimeout(resolve, SETTLE_DELAY));

      expect(mockClearArchive).toHaveBeenCalledWith(mockPartyActor);

      const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;
      expect(exportButton.disabled).toBe(true);
    });
  });

  describe('export button click behavior', () => {
    it('calls downloadArchive when archive exists', () => {
      container = createMinimalContainer(true);
      mockHasArchive.mockReturnValue(true);

      attachExportButtonListener(container, mockPartyActor);

      const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;
      exportButton.click();

      expect(mockDownloadArchive).toHaveBeenCalledWith(
        mockPartyActor,
        'Test Scenario',
        '2025-06-15'
      );
    });

    it('shows error notification when no archive exists on click', () => {
      container = createMinimalContainer(true);
      mockHasArchive.mockReturnValue(false);

      attachExportButtonListener(container, mockPartyActor);

      const exportButton = container.querySelector('#exportChronicles') as HTMLButtonElement;
      exportButton.click();

      expect(mockDownloadArchive).not.toHaveBeenCalled();
      expect(ui.notifications?.error).toHaveBeenCalledWith(
        'No chronicle archive available to export.'
      );
    });
  });
});
