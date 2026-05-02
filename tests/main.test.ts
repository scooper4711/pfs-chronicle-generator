/**
 * Unit tests for main.ts
 *
 * Tests settings registration, Handlebars helper registration,
 * Hooks.on('init'), Hooks.on('ready'), and renderPartyChronicleForm.
 *
 * @jest-environment jsdom
 */

// --- Capture Hooks callbacks ---

type HookCallback = (...args: unknown[]) => void;
const hooksCallbacks: Record<string, HookCallback[]> = {};

(global as any).Hooks = {
  on: jest.fn((event: string, callback: HookCallback) => {
    if (!hooksCallbacks[event]) hooksCallbacks[event] = [];
    hooksCallbacks[event].push(callback);
  }),
};

// --- Foundry globals ---

const mockRegister = jest.fn();
const mockRegisterMenu = jest.fn();
const mockSettingsGet = jest.fn();
const mockSettingsHas = jest.fn().mockReturnValue(false);
const mockRenderTemplate = jest.fn().mockResolvedValue('<div id="layout"><option value="layout-a">A</option></div>');

(global as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (base: any) => base,
      DialogV2: { confirm: jest.fn() },
    },
    apps: { FilePicker: { implementation: jest.fn() } },
    handlebars: { renderTemplate: mockRenderTemplate },
  },
  utils: { saveDataToFile: jest.fn() },
};

(global as any).game = {
  settings: {
    register: mockRegister,
    registerMenu: mockRegisterMenu,
    get: mockSettingsGet,
    settings: { has: mockSettingsHas },
  },
  modules: {
    get: jest.fn().mockReturnValue({ api: {} }),
  },
  user: { isGM: true },
};

(global as any).ui = {
  notifications: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
};

(global as any).Handlebars = {
  registerHelper: jest.fn(),
};

(global as any).$ = jest.fn();

// --- Module mocks ---

const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockGetSeasons = jest.fn().mockReturnValue([
  { id: 'pfs2-season6', name: 'Season 6' },
  { id: 'pfs2-season7', name: 'Season 7' },
]);

jest.mock('../scripts/LayoutStore', () => ({
  layoutStore: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    getSeasons: (...args: unknown[]) => mockGetSeasons(...args),
    getLayoutsByParent: jest.fn().mockReturnValue([]),
    getLayout: jest.fn().mockResolvedValue({}),
  },
}));


jest.mock('../scripts/PartyChronicleApp', () => ({
  PartyChronicleApp: jest.fn().mockImplementation(() => ({
    _prepareContext: jest.fn().mockResolvedValue({
      partyMembers: [],
      seasons: [],
      layouts: [],
      shared: {},
      chroniclePathExists: false,
    }),
  })),
}));

jest.mock('../scripts/utils/filename-utils', () => ({
  generateChronicleFilename: jest.fn().mockReturnValue('chronicle.pdf'),
}));

jest.mock('../scripts/utils/layout-utils', () => ({
  updateLayoutSpecificFields: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../scripts/handlers/validation-display', () => ({
  updateValidationDisplay: jest.fn(),
}));

jest.mock('../scripts/utils/earned-income-calculator', () => ({
  calculateTaskLevelOptions: jest.fn().mockReturnValue([
    { value: 1, label: 'Level 1' },
    { value: 2, label: 'Level 2' },
  ]),
}));

jest.mock('../scripts/handlers/party-chronicle-handlers', () => ({
  extractFormData: jest.fn().mockReturnValue({ shared: {}, characters: {} }),
  saveFormData: jest.fn().mockResolvedValue(undefined),
  updateAllTreasureBundleDisplays: jest.fn(),
  updateAllCreditsAwardedDisplays: jest.fn(),
  updateDowntimeDaysDisplay: jest.fn(),
  updateAllEarnedIncomeDisplays: jest.fn(),
  updateSlowTrackDisplays: jest.fn(),
}));

jest.mock('../scripts/handlers/collapsible-section-handlers', () => ({
  initializeCollapseSections: jest.fn(),
  updateAllSectionSummaries: jest.fn(),
}));

jest.mock('../scripts/handlers/event-listener-helpers', () => ({
  attachSeasonAndLayoutListeners: jest.fn(),
  attachFormFieldListeners: jest.fn(),
  attachTreasureBundleListeners: jest.fn(),
  attachDowntimeDaysListeners: jest.fn(),
  attachEarnedIncomeListeners: jest.fn(),
  attachSaveButtonListener: jest.fn(),
  attachClearButtonListener: jest.fn(),
  attachGenerateButtonListener: jest.fn(),
  attachCopySessionReportListener: jest.fn(),
  attachExportButtonListener: jest.fn(),
  attachPortraitListeners: jest.fn(),
  attachFilePickerListener: jest.fn(),
  attachCollapsibleSectionListeners: jest.fn(),
  attachGmCharacterListeners: jest.fn(),
  attachOverrideListeners: jest.fn(),
  attachSidebarResizeListener: jest.fn(),
  restoreSidebarWidth: jest.fn(),
}));

jest.mock('../scripts/handlers/override-handlers', () => ({
  initializeOverrideStates: jest.fn(),
}));

jest.mock('../scripts/handlers/character-sheet-handlers', () => ({
  handleCharacterSheetRender: jest.fn(),
}));

jest.mock('../scripts/handlers/party-sheet-tab-handlers', () => ({
  handlePartySheetRender: jest.fn(),
}));

jest.mock('../scripts/utils/treasure-bundle-calculator', () => ({
  getCreditsAwarded: jest.fn().mockReturnValue(100),
  getTreasureBundleValue: jest.fn().mockReturnValue(10),
}));

jest.mock('../scripts/utils/currency-formatter', () => ({
  getZeroCurrencyDisplay: jest.fn().mockReturnValue('0 gp'),
  getCurrencyLabel: jest.fn().mockReturnValue('Gold Pieces'),
}));

jest.mock('../scripts/utils/game-system-detector', () => ({
  getGameSystemRoot: jest.fn().mockReturnValue('pfs2'),
  isStarfinder: jest.fn().mockReturnValue(false),
}));

// Suppress console noise
jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

// --- Import after mocks ---

import { renderPartyChronicleForm } from '../scripts/main';
import { calculateTaskLevelOptions } from '../scripts/utils/earned-income-calculator';
import {
  attachSeasonAndLayoutListeners,
  attachFormFieldListeners,
  attachSaveButtonListener,
  attachGenerateButtonListener,
  attachOverrideListeners,
} from '../scripts/handlers/event-listener-helpers';
import { initializeOverrideStates } from '../scripts/handlers/override-handlers';
import { updateValidationDisplay } from '../scripts/handlers/validation-display';
import {
  updateAllTreasureBundleDisplays,
  updateDowntimeDaysDisplay,
  updateAllEarnedIncomeDisplays,
} from '../scripts/handlers/party-chronicle-handlers';
import {
  initializeCollapseSections,
  updateAllSectionSummaries,
} from '../scripts/handlers/collapsible-section-handlers';
import { handleCharacterSheetRender } from '../scripts/handlers/character-sheet-handlers';
import { handlePartySheetRender } from '../scripts/handlers/party-sheet-tab-handlers';

// --- Helper to fire a captured hook ---

async function fireHook(name: string, ...args: unknown[]): Promise<void> {
  const callbacks = hooksCallbacks[name] || [];
  for (const cb of callbacks) {
    await cb(...args);
  }
}

// --- Tests ---

describe('main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsHas.mockReturnValue(false);
  });

  describe('Hooks.on("init")', () => {
    it('registers one visible world setting', async () => {
      await fireHook('init');

      const visibleCalls = mockRegister.mock.calls.filter(
        (call: unknown[]) => (call[2] as Record<string, unknown>).config === true
      );
      expect(visibleCalls).toHaveLength(1);

      const keys = visibleCalls.map((call: unknown[]) => call[1]);
      expect(keys).toEqual(['debugMode']);
    });

    it('registers the hidden partyChronicleData setting', async () => {
      await fireHook('init');

      const hiddenCall = mockRegister.mock.calls.find(
        (call: unknown[]) => call[1] === 'partyChronicleData'
      );
      expect(hiddenCall).toBeDefined();
      expect((hiddenCall[2] as Record<string, unknown>).config).toBe(false);
    });

    it('registers the calculateTaskLevelOptions Handlebars helper', async () => {
      await fireHook('init');

      const helperCalls = (Handlebars.registerHelper as jest.Mock).mock.calls;
      const taskLevelCall = helperCalls.find(
        (call: unknown[]) => call[0] === 'calculateTaskLevelOptions'
      );
      expect(taskLevelCall).toBeDefined();

      // Invoke the helper and verify it delegates to calculateTaskLevelOptions
      const helperFn = taskLevelCall[1];
      const result = helperFn(5, 2);

      expect(calculateTaskLevelOptions).toHaveBeenCalledWith(5);
      expect(result).toEqual([
        { value: 1, label: 'Level 1', selected: false },
        { value: 2, label: 'Level 2', selected: true },
      ]);
    });

    it('registers the getTreasureBundleValue Handlebars helper', async () => {
      await fireHook('init');

      const helperCalls = (Handlebars.registerHelper as jest.Mock).mock.calls;
      const tbCall = helperCalls.find(
        (call: unknown[]) => call[0] === 'getTreasureBundleValue'
      );
      expect(tbCall).toBeDefined();
    });

    it('registers and invokes the getCreditsAwarded Handlebars helper', async () => {
      await fireHook('init');

      const helperCalls = (Handlebars.registerHelper as jest.Mock).mock.calls;
      const call = helperCalls.find((c: unknown[]) => c[0] === 'getCreditsAwarded');
      expect(call).toBeDefined();

      const helperFn = call[1];
      helperFn(5);
    });

    it('registers and invokes the getZeroCurrencyDisplay Handlebars helper', async () => {
      await fireHook('init');

      const helperCalls = (Handlebars.registerHelper as jest.Mock).mock.calls;
      const call = helperCalls.find((c: unknown[]) => c[0] === 'getZeroCurrencyDisplay');
      expect(call).toBeDefined();

      const helperFn = call[1];
      helperFn('pf2e');
    });

    it('registers and invokes the getCurrencyLabel Handlebars helper', async () => {
      await fireHook('init');

      const helperCalls = (Handlebars.registerHelper as jest.Mock).mock.calls;
      const call = helperCalls.find((c: unknown[]) => c[0] === 'getCurrencyLabel');
      expect(call).toBeDefined();

      const helperFn = call[1];
      helperFn('pf2e');
    });
  });

  describe('Hooks.on("ready")', () => {
    it('initializes the layout store', async () => {
      await fireHook('ready');

      expect(mockInitialize).toHaveBeenCalled();
    });

    it('does not register any settings', async () => {
      await fireHook('ready');

      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('renderPartyChronicleForm', () => {
    let container: HTMLElement;
    const partyActors = [{ id: 'a1', name: 'Hero', type: 'character' }];

    beforeEach(() => {
      container = document.createElement('div');
    });

    it('renders the template into the container', async () => {
      await renderPartyChronicleForm(container, partyActors as any, {});

      expect(mockRenderTemplate).toHaveBeenCalledWith(
        'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs',
        expect.any(Object)
      );
      // Container should have the rendered HTML
      expect(container.innerHTML).toBeTruthy();
    });

    it('attaches event listeners after rendering', async () => {
      await renderPartyChronicleForm(container, partyActors as any, {});

      expect(attachSeasonAndLayoutListeners).toHaveBeenCalledWith(container, partyActors);
      expect(attachFormFieldListeners).toHaveBeenCalledWith(container, partyActors);
      expect(attachSaveButtonListener).toHaveBeenCalledWith(container, partyActors);
      expect(attachGenerateButtonListener).toHaveBeenCalledWith(container, partyActors, undefined);
      expect(attachOverrideListeners).toHaveBeenCalledWith(container);
    });

    it('initializes form state after rendering', async () => {
      await renderPartyChronicleForm(container, partyActors as any, {});

      expect(updateAllTreasureBundleDisplays).toHaveBeenCalled();
      expect(updateDowntimeDaysDisplay).toHaveBeenCalled();
      expect(updateAllEarnedIncomeDisplays).toHaveBeenCalled();
      expect(initializeCollapseSections).toHaveBeenCalledWith(container);
      expect(updateAllSectionSummaries).toHaveBeenCalledWith(container);
      expect(initializeOverrideStates).toHaveBeenCalledWith(container);
      expect(updateValidationDisplay).toHaveBeenCalled();
    });

    it('shows error message when rendering fails', async () => {
      mockRenderTemplate.mockRejectedValueOnce(new Error('Template not found'));

      await renderPartyChronicleForm(container, partyActors as any, {});

      expect(container.innerHTML).toContain('Error loading party chronicle form');
      expect(container.innerHTML).toContain('Template not found');
    });

    it('shows generic error message for non-Error throws', async () => {
      mockRenderTemplate.mockRejectedValueOnce('string error');

      await renderPartyChronicleForm(container, partyActors as any, {});

      expect(container.innerHTML).toContain('Unknown error');
    });
  });

  describe('Hooks registration count', () => {
    it('registers callbacks for init, ready, PF2e and SF2e character/party sheet hooks', () => {
      const registeredHooks = Object.keys(hooksCallbacks);
      expect(registeredHooks).toContain('init');
      expect(registeredHooks).toContain('ready');
      expect(registeredHooks).toContain('renderCharacterSheetPF2e');
      expect(registeredHooks).toContain('renderCharacterSheetSF2e');
      expect(registeredHooks).toContain('renderPartySheetPF2e');
      expect(registeredHooks).toContain('renderPartySheetSF2e');
      expect(registeredHooks).toHaveLength(6);
    });
  });

  describe('render hook callbacks', () => {
    it('delegates renderCharacterSheetPF2e to handleCharacterSheetRender', async () => {
      const mockSheet = { actor: { name: 'Test' } };
      const mockHtml = { find: jest.fn() };
      await fireHook('renderCharacterSheetPF2e', mockSheet, mockHtml, {});

      expect(handleCharacterSheetRender).toHaveBeenCalledWith(mockSheet, mockHtml);
    });

    it('delegates renderCharacterSheetSF2e to handleCharacterSheetRender', async () => {
      const mockSheet = { actor: { name: 'Test' } };
      const mockHtml = { find: jest.fn() };
      await fireHook('renderCharacterSheetSF2e', mockSheet, mockHtml, {});

      expect(handleCharacterSheetRender).toHaveBeenCalledWith(mockSheet, mockHtml);
    });

    it('delegates renderPartySheetPF2e to handlePartySheetRender', async () => {
      const mockApp = { actor: { members: [] } };
      const mockHtml = { find: jest.fn() };
      await fireHook('renderPartySheetPF2e', mockApp, mockHtml, {});

      expect(handlePartySheetRender).toHaveBeenCalledWith(mockApp, mockHtml);
    });

    it('delegates renderPartySheetSF2e to handlePartySheetRender', async () => {
      const mockApp = { actor: { members: [] } };
      const mockHtml = { find: jest.fn() };
      await fireHook('renderPartySheetSF2e', mockApp, mockHtml, {});

      expect(handlePartySheetRender).toHaveBeenCalledWith(mockApp, mockHtml);
    });
  });
});
