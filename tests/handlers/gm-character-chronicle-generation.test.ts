/**
 * Unit tests for GM character chronicle generation.
 *
 * Tests that generateChroniclesFromPartyData correctly handles the optional
 * GM character actor: PDF generation, zip archive inclusion, chat notification,
 * and PFS ID mismatch validation.
 *
 * Requirements: gm-character-party-sheet 5.1, 5.2, 5.3, 5.4, 5.5
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
jest.mock('../../scripts/LayoutStore', () => ({
  layoutStore: { getLayout: (id: string) => mockGetLayout(id) },
}));

const mockMapToCharacterData = jest.fn<(...args: any[]) => any>();
jest.mock('../../scripts/model/party-chronicle-mapper', () => ({
  mapToCharacterData: (...args: any[]) => mockMapToCharacterData(...args),
}));

const mockValidateSharedFields = jest.fn<(...args: any[]) => any>();
const mockValidateUniqueFields = jest.fn<(...args: any[]) => any>();
jest.mock('../../scripts/model/party-chronicle-validator', () => ({
  validateSharedFields: (...args: any[]) => mockValidateSharedFields(...args),
  validateUniqueFields: (...args: any[]) => mockValidateUniqueFields(...args),
}));

const mockPdfGenerate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.mock('../../scripts/PdfGenerator', () => ({
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


const mockPostChatNotification = jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined);
jest.mock('../../scripts/handlers/chat-notifier', () => ({
  postChatNotification: (...args: any[]) => mockPostChatNotification(...args),
}));

const mockAddPdfToArchive = jest.fn(
  (_archive: unknown, _bytes: unknown, filename: string, filenames: Set<string>) => {
    filenames.add(filename);
    return filename;
  }
);
const mockStoreArchive = jest.fn<(a: unknown, b: unknown) => Promise<void>>().mockResolvedValue(undefined);

jest.mock('../../scripts/handlers/chronicle-exporter', () => ({
  createArchive: jest.fn(() => ({ files: new Map() })),
  addPdfToArchive: (a: unknown, b: unknown, c: string, d: Set<string>) => mockAddPdfToArchive(a, b, c, d),
  generateBase64Zip: jest.fn(() => 'mockBase64'),
}));

// Suppress console noise during tests
global.console.log = jest.fn();
global.console.error = jest.fn();

import { generateChroniclesFromPartyData } from '../../scripts/handlers/chronicle-generation';
import { FlagActor } from '../../scripts/handlers/chronicle-exporter';
import type { ChronicleFormData } from '../../scripts/model/party-chronicle-types';
import type { PartyActor } from '../../scripts/handlers/event-listener-helpers';

// --- Helpers ---

function createMockPartyActor(): FlagActor {
  return {
    getFlag: jest.fn(() => undefined),
    setFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    unsetFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    update: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

function validSharedData(overrides: Record<string, unknown> = {}) {
  return {
    gmPfsNumber: '12345',
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
    ...overrides,
  };
}

function createActor(id: string, name: string, playerNumber: string | number = '12345'): PartyActor {
  return {
    id,
    name,
    system: { details: { level: { value: 5 } }, pfs: { playerNumber, characterNumber: '01' } },
    setFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    update: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as PartyActor;
}

function setupSuccessfulPipeline() {
  mockValidateSharedFields.mockReturnValue({ valid: true, errors: [] });
  mockValidateUniqueFields.mockReturnValue({ valid: true, errors: [] });

  mockGetLayout.mockResolvedValue({ id: 'pfs2.s5-18', description: 'Test Layout', content: [] });

  mockMapToCharacterData.mockReturnValue({
    char: 'Test Character',
    societyid: '12345-01',
    level: 5,
    gmid: '12345',
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

describe('GM Character Chronicle Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PDF generation (Req 5.1, 5.3)', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('generates PDF for GM character alongside party members', async () => {
      const partyMember = createActor('actor-1', 'Valeros');
      const gmCharacter = createActor('gm-char-1', 'GM Hero');

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1' }),
        characters: {
          'actor-1': { characterName: 'Valeros' },
          'gm-char-1': { characterName: 'GM Hero' },
        },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [partyMember], createMockPartyActor(), gmCharacter);

      expect(mockNotifications.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully generated 2 chronicle(s)')
      );
    });

    it('saves chronicle data and PDF to GM character actor flags', async () => {
      const gmCharacter = createActor('gm-char-1', 'GM Hero');

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1' }),
        characters: {
          'gm-char-1': { characterName: 'GM Hero' },
        },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [], createMockPartyActor(), gmCharacter);

      expect(gmCharacter.update).toHaveBeenCalledWith({
        'flags.pfs-chronicle-generator.chronicleData': expect.objectContaining({ char: 'Test Character' }),
        'flags.pfs-chronicle-generator.chroniclePdf': expect.any(String),
      });
    });

    it('generates only party member chronicles when no GM character is provided', async () => {
      const partyMember = createActor('actor-1', 'Valeros');

      const data = {
        shared: validSharedData(),
        characters: { 'actor-1': { characterName: 'Valeros' } },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [partyMember], createMockPartyActor());

      expect(mockNotifications.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully generated 1 chronicle(s)')
      );
    });
  });

  describe('zip archive inclusion (Req 5.2)', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('includes GM character PDF in zip archive', async () => {
      const partyMember = createActor('actor-1', 'Valeros');
      const gmCharacter = createActor('gm-char-1', 'GM Hero');

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1' }),
        characters: {
          'actor-1': { characterName: 'Valeros' },
          'gm-char-1': { characterName: 'GM Hero' },
        },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [partyMember], createMockPartyActor(), gmCharacter);

      // addPdfToArchive should be called twice: once for party member, once for GM character
      expect(mockAddPdfToArchive).toHaveBeenCalledTimes(2);
    });

    it('stores archive when GM character is the only actor', async () => {
      const gmCharacter = createActor('gm-char-1', 'GM Hero');

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1' }),
        characters: { 'gm-char-1': { characterName: 'GM Hero' } },
      } as unknown as ChronicleFormData;

      const partyActor = createMockPartyActor();
      await generateChroniclesFromPartyData(data, [], partyActor, gmCharacter);

      expect(partyActor.update).toHaveBeenCalledWith(
        expect.objectContaining({ 'flags.pfs-chronicle-generator.chronicleZip': expect.any(String) })
      );
    });
  });

  describe('chat notification (Req 5.4)', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('includes GM character in chat notification results', async () => {
      const partyMember = createActor('actor-1', 'Valeros');
      const gmCharacter = createActor('gm-char-1', 'GM Hero');

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1' }),
        characters: {
          'actor-1': { characterName: 'Valeros' },
          'gm-char-1': { characterName: 'GM Hero' },
        },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [partyMember], createMockPartyActor(), gmCharacter);

      expect(mockPostChatNotification).toHaveBeenCalledTimes(1);
      expect(mockPostChatNotification).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ characterName: 'Valeros', success: true }),
          expect.objectContaining({ characterName: 'GM Hero', success: true }),
        ]),
        'Test Scenario'
      );
    });

    it('includes GM character in chat notification even when it is the only actor', async () => {
      const gmCharacter = createActor('gm-char-1', 'GM Hero');

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1' }),
        characters: { 'gm-char-1': { characterName: 'GM Hero' } },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [], createMockPartyActor(), gmCharacter);

      expect(mockPostChatNotification).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ characterName: 'GM Hero', success: true }),
        ]),
        'Test Scenario'
      );
    });
  });

  describe('validation errors (Req 5.5)', () => {
    it('reports PFS ID mismatch when GM character PFS ID does not match gmPfsNumber', async () => {
      mockValidateSharedFields.mockReturnValue({ valid: true, errors: [] });
      mockValidateUniqueFields.mockReturnValue({ valid: true, errors: [] });

      // GM character has playerNumber 99999, but gmPfsNumber is 12345
      const gmCharacter = createActor('gm-char-1', 'GM Hero', 99999);

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1', gmPfsNumber: '12345' }),
        characters: { 'gm-char-1': { characterName: 'GM Hero' } },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [], createMockPartyActor(), gmCharacter);

      expect(mockNotifications.error).toHaveBeenCalledWith(
        expect.stringContaining('does not match')
      );
      // Should not proceed to layout loading
      expect(mockGetLayout).not.toHaveBeenCalled();
    });

    it('does not report PFS ID mismatch when IDs match', async () => {
      setupSuccessfulPipeline();

      const gmCharacter = createActor('gm-char-1', 'GM Hero', 12345);

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1', gmPfsNumber: '12345' }),
        characters: { 'gm-char-1': { characterName: 'GM Hero' } },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [], createMockPartyActor(), gmCharacter);

      expect(mockNotifications.error).not.toHaveBeenCalled();
      expect(mockNotifications.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully generated 1 chronicle(s)')
      );
    });

    it('reports GM character unique field validation errors alongside party member errors', async () => {
      mockValidateSharedFields.mockReturnValue({ valid: true, errors: [] });
      mockValidateUniqueFields.mockReturnValue({ valid: false, errors: ['Society ID is required'] });

      const partyMember = createActor('actor-1', 'Valeros');
      const gmCharacter = createActor('gm-char-1', 'GM Hero');

      const data = {
        shared: validSharedData({ gmCharacterActorId: 'gm-char-1' }),
        characters: {
          'actor-1': { characterName: 'Valeros' },
          'gm-char-1': { characterName: 'GM Hero' },
        },
      } as unknown as ChronicleFormData;

      await generateChroniclesFromPartyData(data, [partyMember], createMockPartyActor(), gmCharacter);

      expect(mockNotifications.error).toHaveBeenCalledWith(
        expect.stringContaining('Society ID is required')
      );
    });
  });
});
