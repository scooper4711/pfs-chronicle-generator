/**
 * Unit tests for ChronicleExporter
 *
 * Tests the core archive functions: createArchive, addPdfToArchive,
 * deduplicateFilename, generateZipFilename, downloadArchive, and clearArchive.
 *
 * Requirements: chronicle-export 1.1, 1.2, 1.3, 1.4, 3.3, 4.1, 4.2, 5.1
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// --- FoundryVTT global mocks ---

const mockNotifications = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

(globalThis as Record<string, unknown>).ui = { notifications: mockNotifications };

// --- file-saver mock ---

const mockSaveAs = jest.fn();
jest.mock('file-saver', () => ({ saveAs: mockSaveAs }));

import {
  createArchive,
  addPdfToArchive,
  deduplicateFilename,
  generateZipFilename,
  downloadArchive,
  clearArchive,
  FlagActor,
} from '../../scripts/handlers/chronicle-exporter';

// --- Helpers ---

function createMockActor(flagValue: unknown): FlagActor {
  return {
    getFlag: jest.fn<() => unknown>().mockReturnValue(flagValue),
    setFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    unsetFlag: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    update: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

/** Minimal PDF-like bytes for testing. */
const SAMPLE_PDF_BYTES = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]);

describe('ChronicleExporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createArchive', () => {
    it('returns an empty archive with no files', () => {
      const archive = createArchive();

      expect(archive.files).toBeInstanceOf(Map);
      expect(archive.files.size).toBe(0);
    });
  });

  describe('addPdfToArchive', () => {
    it('adds a file with the correct filename', () => {
      const archive = createArchive();
      const existingFilenames = new Set<string>();

      const actualFilename = addPdfToArchive(
        archive, SAMPLE_PDF_BYTES, 'Valeros_1-01.pdf', existingFilenames
      );

      expect(actualFilename).toBe('Valeros_1-01.pdf');
      expect(archive.files.has('Valeros_1-01.pdf')).toBe(true);
      expect(existingFilenames.has('Valeros_1-01.pdf')).toBe(true);
    });

    it('deduplicates when the same filename is added twice', () => {
      const archive = createArchive();
      const existingFilenames = new Set<string>();

      addPdfToArchive(archive, SAMPLE_PDF_BYTES, 'Valeros_1-01.pdf', existingFilenames);
      const secondFilename = addPdfToArchive(
        archive, SAMPLE_PDF_BYTES, 'Valeros_1-01.pdf', existingFilenames
      );

      expect(secondFilename).toBe('Valeros_1-01_2.pdf');
      expect(archive.files.has('Valeros_1-01_2.pdf')).toBe(true);
    });
  });

  describe('deduplicateFilename', () => {
    it('returns the original name when there is no collision', () => {
      const existingFilenames = new Set<string>();

      const result = deduplicateFilename('Valeros_1-01.pdf', existingFilenames);

      expect(result).toBe('Valeros_1-01.pdf');
    });

    it('returns _2 suffix when there is one collision', () => {
      const existingFilenames = new Set<string>(['Valeros_1-01.pdf']);

      const result = deduplicateFilename('Valeros_1-01.pdf', existingFilenames);

      expect(result).toBe('Valeros_1-01_2.pdf');
    });

    it('returns _3 suffix when _2 is also taken', () => {
      const existingFilenames = new Set<string>([
        'Valeros_1-01.pdf',
        'Valeros_1-01_2.pdf',
      ]);

      const result = deduplicateFilename('Valeros_1-01.pdf', existingFilenames);

      expect(result).toBe('Valeros_1-01_3.pdf');
    });

    it('handles filenames without .pdf extension', () => {
      const existingFilenames = new Set<string>(['readme']);

      const result = deduplicateFilename('readme', existingFilenames);

      expect(result).toBe('readme_2');
    });
  });

  describe('generateZipFilename', () => {
    it('falls back to chronicles.zip when both inputs are empty', () => {
      const result = generateZipFilename('', '');

      expect(result).toBe('chronicles.zip');
    });

    it('falls back to chronicles.zip when both inputs are whitespace', () => {
      const result = generateZipFilename('   ', '   ');

      expect(result).toBe('chronicles.zip');
    });

    it('includes sanitized scenario name and event date', () => {
      const result = generateZipFilename('Test Scenario', '2025-01-15');

      expect(result).toMatch(/^Test_Scenario_2025-01-15_\d{4}\.zip$/);
    });

    it('works with only scenario name provided', () => {
      const result = generateZipFilename('Test Scenario', '');

      expect(result).toMatch(/^Test_Scenario_\d{4}\.zip$/);
    });

    it('works with only event date provided', () => {
      const result = generateZipFilename('', '2025-01-15');

      expect(result).toMatch(/^2025-01-15_\d{4}\.zip$/);
    });
  });

  describe('downloadArchive', () => {
    it('shows error notification when base64 decode fails', () => {
      // atob will throw on invalid base64
      const actor = createMockActor('!!!invalid-base64!!!');

      downloadArchive(actor, 'Test', '2025-01-15');

      expect(mockNotifications.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to download chronicle archive')
      );
    });

    it('shows error notification when no archive is stored', () => {
      const actor = createMockActor(undefined);

      downloadArchive(actor, 'Test', '2025-01-15');

      expect(mockNotifications.error).toHaveBeenCalledWith(
        'No chronicle archive found to download.'
      );
    });

    it('shows success notification on successful download', () => {
      // Create a valid base64 string (small zip-like content)
      const content = 'hello zip content';
      const base64 = Buffer.from(content, 'binary').toString('base64');
      const actor = createMockActor(base64);

      downloadArchive(actor, 'Test Scenario', '2025-01-15');

      expect(mockSaveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/^Test_Scenario_2025-01-15_\d{4}\.zip$/)
      );
      expect(mockNotifications.info).toHaveBeenCalledWith(
        'Chronicle archive downloaded successfully.'
      );
    });

    it('shows error notification when saveAs throws', () => {
      const base64 = Buffer.from('content', 'binary').toString('base64');
      const actor = createMockActor(base64);
      mockSaveAs.mockImplementationOnce(() => {
        throw new Error('Save failed');
      });

      downloadArchive(actor, 'Test', '2025-01-15');

      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Failed to download chronicle archive: Save failed'
      );
    });
  });

  describe('clearArchive', () => {
    it('calls unsetFlag with the correct scope and key', async () => {
      const actor = createMockActor('some-base64');

      await clearArchive(actor);

      expect(actor.unsetFlag).toHaveBeenCalledWith(
        'pfs-chronicle-generator',
        'chronicleZip'
      );
    });
  });
});
