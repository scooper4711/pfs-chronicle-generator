/**
 * Unit tests for chronicle generation orchestrator.
 *
 * Tests the generateChroniclesFromPartyData function through its public API,
 * covering validation, layout loading, PDF generation, and result notifications.
 *
 * Requirements: code-standards-refactoring 2.6, 2.7, 2.8, 3.1, 3.6
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// --- FoundryVTT global mocks ---

const mockNotifications = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

(global as any).ui = { notifications: mockNotifications };

(global as any).game = {
  settings: {
    get: jest.fn(),
  },
};

// --- Module mocks ---

const mockGetLayout = jest.fn<(id: string) => Promise<any>>();
jest.mock('../LayoutStore', () => ({
  layoutStore: { getLayout: (id: string) => mockGetLayout(id) },
}));

const mockMapToCharacterData = jest.fn<(...args: any[]) => any>();
jest.mock('../model/party-chronicle-mapper', () => ({
  mapToCharacterData: (...args: any[]) => mockMapToCharacterData(...args),
}));

const mockValidateSharedFields = jest.fn<(...args: any[]) => any>();
const mockValidateUniqueFields = jest.fn<(...args: any[]) => any>();
jest.mock('../model/party-chronicle-validator', () => ({
  validateSharedFields: (...args: any[]) => mockValidateSharedFields(...args),
  validateUniqueFields: (...args: any[]) => mockValidateUniqueFields(...args),
}));

const mockPdfGenerate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.mock('../PdfGenerator', () => ({
  PdfGenerator: jest.fn().mockImplementation(() => ({
    generate: mockPdfGenerate,
  })),
}));

const mockPdfDocLoad = jest.fn<(bytes: ArrayBuffer) => Promise<any>>();
const mockPdfDocSave = jest.fn<() => Promise<Uint8Array>>();
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: (bytes: ArrayBuffer) => mockPdfDocLoad(bytes),
  },
}));

jest.mock('@pdf-lib/fontkit', () => ({}));

jest.mock('./chronicle-exporter', () => ({
  createArchive: jest.fn(() => ({ file: jest.fn() })),
  addPdfToArchive: jest.fn(
    (_archive: unknown, _bytes: unknown, filename: string, filenames: Set<string>) => {
      filenames.add(filename);
      return filename;
    }
  ),
  storeArchive: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

// Suppress console noise during tests
global.console.log = jest.fn();
global.console.error = jest.fn();

import { generateChroniclesFromPartyData } from './chronicle-generation';
import { FlagActor } from './chronicle-exporter';

// --- Helpers ---

/** Creates a mock Party actor for zip archive storage. */
function createMockPartyActor(): FlagActor {
  return {
    getFlag: jest.fn(() => undefined),
    setFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    unsetFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

function validSharedData() {
  return {
    gmPfsNumber: '12345-2001',
    scenarioName: 'Test Scenario',
    eventCode: 'TEST-001',
    eventDate: '2025-01-15',
    xpEarned: 4,
    adventureSummaryCheckboxes: [],
    strikeoutItems: [],
    treasureBundles: 2,
    layoutId: 'pfs2.s5-18',
    seasonId: 'season-7',
    blankChroniclePath: '/path/to/chronicle.pdf',
    chosenFactionReputation: 4,
    reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    downtimeDays: 8,
    reportingA: false,
    reportingB: false,
    reportingC: false,
    reportingD: false,
    chosenFaction: '',
  };
}

function createActor(id: string, name: string) {
  return {
    id,
    name,
    system: { details: { level: { value: 5 } }, pfs: { playerNumber: '12345', characterNumber: '01' } },
    setFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

function setupSuccessfulPipeline() {
  mockValidateSharedFields.mockReturnValue({ valid: true, errors: [] });
  mockValidateUniqueFields.mockReturnValue({ valid: true, errors: [] });

  mockGetLayout.mockResolvedValue({ id: 'pfs2.s5-18', description: 'Test Layout', content: [] });

  mockMapToCharacterData.mockReturnValue({
    char: 'Test Character',
    societyid: '12345-01',
    level: 5,
    gmid: '12345-2001',
    event: 'Test Scenario',
    eventcode: 'TEST-001',
    date: '2025-01-15',
    xp_gained: 4,
    income_earned: 0,
    treasure_bundles_gp: 0,
    gp_gained: 0,
    gp_spent: 0,
    notes: '',
    reputation: [],
    summary_checkbox: [],
    strikeout_item_lines: [],
    treasure_bundles: '2',
  });

  const pdfBytes = new Uint8Array([37, 80, 68, 70]); // %PDF
  mockPdfDocSave.mockResolvedValue(pdfBytes);
  mockPdfDocLoad.mockResolvedValue({
    registerFontkit: jest.fn(),
    save: mockPdfDocSave,
  });

  (global as any).fetch = jest.fn<() => Promise<any>>().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
  });

  (global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}

describe('Chronicle Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validation', () => {
    it('shows error notification when shared field validation fails', async () => {
      mockValidateSharedFields.mockReturnValue({ valid: false, errors: ['Event date is required'] });
      mockValidateUniqueFields.mockReturnValue({ valid: true, errors: [] });

      const data = { shared: validSharedData(), characters: {} };
      await generateChroniclesFromPartyData(data, [], createMockPartyActor());

      expect(mockNotifications.error).toHaveBeenCalledWith(
        expect.stringContaining('Event date is required')
      );
    });

    it('shows error notification when unique field validation fails', async () => {
      mockValidateSharedFields.mockReturnValue({ valid: true, errors: [] });
      mockValidateUniqueFields.mockReturnValue({ valid: false, errors: ['Society ID is required'] });

      const actor = createActor('actor-1', 'Valeros');
      const data = {
        shared: validSharedData(),
        characters: { 'actor-1': { characterName: 'Valeros' } },
      };

      await generateChroniclesFromPartyData(data, [actor], createMockPartyActor());

      expect(mockNotifications.error).toHaveBeenCalledWith(
        expect.stringContaining('Society ID is required')
      );
    });

    it('does not proceed to layout loading when validation fails', async () => {
      mockValidateSharedFields.mockReturnValue({ valid: false, errors: ['Missing field'] });

      await generateChroniclesFromPartyData({ shared: {}, characters: {} }, [], createMockPartyActor());

      expect(mockGetLayout).not.toHaveBeenCalled();
    });
  });

  describe('layout loading', () => {
    it('shows error notification when layout loading fails', async () => {
      mockValidateSharedFields.mockReturnValue({ valid: true, errors: [] });
      mockValidateUniqueFields.mockReturnValue({ valid: true, errors: [] });
      mockGetLayout.mockRejectedValue(new Error('Layout not found'));

      const data = { shared: validSharedData(), characters: {} };
      await generateChroniclesFromPartyData(data, [], createMockPartyActor());

      expect(mockNotifications.error).toHaveBeenCalledWith(
        expect.stringContaining('Layout not found')
      );
    });

    it('shows error notification when blank chronicle path is missing', async () => {
      mockValidateSharedFields.mockReturnValue({ valid: true, errors: [] });
      mockValidateUniqueFields.mockReturnValue({ valid: true, errors: [] });
      mockGetLayout.mockResolvedValue({ id: 'test', description: 'Test' });

      (global as any).game.settings.get = jest.fn().mockReturnValue(undefined);

      const shared = validSharedData();
      shared.blankChroniclePath = '';
      const data = { shared, characters: {} };

      await generateChroniclesFromPartyData(data, [], createMockPartyActor());

      expect(mockNotifications.error).toHaveBeenCalledWith('Blank chronicle PDF path is not set.');
    });
  });

  describe('successful generation', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('generates chronicle for a single party member and shows success', async () => {
      const actor = createActor('actor-1', 'Valeros');
      const data = {
        shared: validSharedData(),
        characters: { 'actor-1': { characterName: 'Valeros', societyId: '12345-01' } },
      };

      await generateChroniclesFromPartyData(data, [actor], createMockPartyActor());

      expect(mockNotifications.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully generated 1 chronicle(s)')
      );
    });

    it('saves chronicle data and PDF to actor flags', async () => {
      const actor = createActor('actor-1', 'Valeros');
      const data = {
        shared: validSharedData(),
        characters: { 'actor-1': { characterName: 'Valeros' } },
      };

      await generateChroniclesFromPartyData(data, [actor], createMockPartyActor());

      expect(actor.setFlag).toHaveBeenCalledWith(
        'pfs-chronicle-generator',
        'chronicleData',
        expect.objectContaining({ char: 'Test Character' })
      );
      expect(actor.setFlag).toHaveBeenCalledWith(
        'pfs-chronicle-generator',
        'chroniclePdf',
        expect.any(String)
      );
    });

    it('generates chronicles for multiple party members', async () => {
      const actor1 = createActor('actor-1', 'Valeros');
      const actor2 = createActor('actor-2', 'Seelah');
      const data = {
        shared: validSharedData(),
        characters: {
          'actor-1': { characterName: 'Valeros' },
          'actor-2': { characterName: 'Seelah' },
        },
      };

      await generateChroniclesFromPartyData(data, [actor1, actor2], createMockPartyActor());

      expect(mockNotifications.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully generated 2 chronicle(s)')
      );
    });
  });

  describe('partial failure', () => {
    it('shows warning when some characters fail PDF generation', async () => {
      setupSuccessfulPipeline();

      // Make fetch fail for the second call (second character's PDF load)
      let callCount = 0;
      (global as any).fetch = jest.fn<() => Promise<any>>().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({ ok: false, statusText: 'Not Found' });
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
        });
      });

      const actor1 = createActor('actor-1', 'Valeros');
      const actor2 = createActor('actor-2', 'Seelah');
      const data = {
        shared: validSharedData(),
        characters: {
          'actor-1': { characterName: 'Valeros' },
          'actor-2': { characterName: 'Seelah' },
        },
      };

      await generateChroniclesFromPartyData(data, [actor1, actor2], createMockPartyActor());

      expect(mockNotifications.warn).toHaveBeenCalledWith(
        expect.stringContaining('1 failed')
      );
    });
  });

  describe('result display', () => {
    it('does not show warning when all characters succeed', async () => {
      setupSuccessfulPipeline();

      const actor = createActor('actor-1', 'Valeros');
      const data = {
        shared: validSharedData(),
        characters: { 'actor-1': { characterName: 'Valeros' } },
      };

      await generateChroniclesFromPartyData(data, [actor], createMockPartyActor());

      expect(mockNotifications.warn).not.toHaveBeenCalled();
    });
  });
});
