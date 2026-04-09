/**
 * Property-based tests for Chronicle Exporter
 *
 * These tests verify universal properties that should hold across all valid inputs,
 * complementing the unit tests which focus on specific examples and edge cases.
 *
 * Requirements: chronicle-export 1.3
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import JSZip from 'jszip';
import { createArchive, addPdfToArchive, deduplicateFilename, generateZipFilename, hasArchive, storeArchive, clearArchive, FlagActor } from '../../scripts/handlers/chronicle-exporter';
import { sanitizeFilename, generateChronicleFilename } from '../../scripts/utils/filename-utils';

// Feature: chronicle-export, Property 2: Filename deduplication produces unique names
// **Validates: Requirements 1.3**
describe('Property 2: Filename deduplication produces unique names', () => {
  const baseFilenameArbitrary = fc.stringMatching(/^[A-Za-z0-9_-]{1,30}$/);
  const duplicateCountArbitrary = fc.integer({ min: 2, max: 20 });

  it('should produce unique filenames for any base name and N duplicate insertions', () => {
    fc.assert(
      fc.property(
        baseFilenameArbitrary,
        duplicateCountArbitrary,
        (baseName, duplicateCount) => {
          const filename = `${baseName}.pdf`;
          const existingFilenames = new Set<string>();
          const producedFilenames: string[] = [];

          for (let i = 0; i < duplicateCount; i++) {
            const result = deduplicateFilename(filename, existingFilenames);
            producedFilenames.push(result);
            existingFilenames.add(result);
          }

          // All produced filenames are unique
          const uniqueFilenames = new Set(producedFilenames);
          expect(uniqueFilenames.size).toBe(producedFilenames.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve the .pdf extension on all deduplicated filenames', () => {
    fc.assert(
      fc.property(
        baseFilenameArbitrary,
        duplicateCountArbitrary,
        (baseName, duplicateCount) => {
          const filename = `${baseName}.pdf`;
          const existingFilenames = new Set<string>();

          for (let i = 0; i < duplicateCount; i++) {
            const result = deduplicateFilename(filename, existingFilenames);
            expect(result).toMatch(/\.pdf$/);
            existingFilenames.add(result);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should follow {base}_N.pdf pattern for duplicates starting at _2', () => {
    fc.assert(
      fc.property(
        baseFilenameArbitrary,
        duplicateCountArbitrary,
        (baseName, duplicateCount) => {
          const filename = `${baseName}.pdf`;
          const existingFilenames = new Set<string>();
          const producedFilenames: string[] = [];

          for (let i = 0; i < duplicateCount; i++) {
            const result = deduplicateFilename(filename, existingFilenames);
            producedFilenames.push(result);
            existingFilenames.add(result);
          }

          // First filename is the original
          expect(producedFilenames[0]).toBe(filename);

          // Subsequent filenames follow {base}_N.pdf pattern starting at _2
          for (let i = 1; i < producedFilenames.length; i++) {
            const expectedSuffix = i + 1;
            expect(producedFilenames[i]).toBe(`${baseName}_${expectedSuffix}.pdf`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: chronicle-export, Property 5: Zip filename format
// **Validates: Requirements 3.2**
describe('Property 5: Zip filename format', () => {
  // Generator produces names with at least one alphanumeric character
  // so sanitizeFilename produces a non-empty result after trim
  const scenarioNameArbitrary = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 _'-]{0,49}$/);
  const eventDateArbitrary = fc.date({
    min: new Date('2000-01-01'),
    max: new Date('2099-12-31'),
  }).map(date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  it('should produce a filename where the name portion equals sanitizeFilename(scenarioName)', () => {
    fc.assert(
      fc.property(
        scenarioNameArbitrary,
        eventDateArbitrary,
        (scenarioName, eventDate) => {
          const result = generateZipFilename(scenarioName, eventDate);
          // The function trims the name before sanitizing
          const sanitizedName = sanitizeFilename(scenarioName.trim());

          expect(result).toMatch(/\.zip$/);

          // The filename should start with the sanitized scenario name
          expect(result.startsWith(`${sanitizedName}_`)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should match the pattern {sanitized_name}_{date}_{HHMM}.zip', () => {
    fc.assert(
      fc.property(
        scenarioNameArbitrary,
        eventDateArbitrary,
        (scenarioName, eventDate) => {
          const result = generateZipFilename(scenarioName, eventDate);
          // The function trims the name before sanitizing
          const sanitizedName = sanitizeFilename(scenarioName.trim());

          // Strip the sanitized name prefix and .zip suffix to get {date}_{HHMM}
          const expectedPrefix = `${sanitizedName}_`;
          const middle = result.slice(expectedPrefix.length, -'.zip'.length);

          // The date contains hyphens, so split on the last underscore to get time
          const lastUnderscoreIndex = middle.lastIndexOf('_');
          const datePart = middle.slice(0, lastUnderscoreIndex);
          const timePart = middle.slice(lastUnderscoreIndex + 1);

          expect(datePart).toBe(eventDate);
          expect(timePart).toMatch(/^\d{4}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});



// Feature: chronicle-export, Property 4: hasArchive reflects flag presence
// **Validates: Requirements 2.2, 2.3**
describe('Property 4: hasArchive reflects flag presence', () => {
  function createMockActor(flagValue: unknown): FlagActor {
    return {
      getFlag: (_scope: string, _key: string) => flagValue,
      setFlag: async () => {},
      unsetFlag: async () => {},
      update: async () => {},
    };
  }

  const nonEmptyStringArbitrary = fc.string({ minLength: 1, maxLength: 200 });

  it('should return true for any non-empty string flag value', () => {
    fc.assert(
      fc.property(nonEmptyStringArbitrary, (zipValue) => {
        const actor = createMockActor(zipValue);
        expect(hasArchive(actor)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  const nonStringArbitrary = fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.constant(''),
    fc.integer(),
    fc.boolean(),
    fc.constant(0),
    fc.array(fc.anything()),
    fc.dictionary(fc.string(), fc.anything())
  );

  it('should return false for undefined, null, empty string, and non-string values', () => {
    fc.assert(
      fc.property(nonStringArbitrary, (flagValue) => {
        const actor = createMockActor(flagValue);
        expect(hasArchive(actor)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: chronicle-export, Property 1: PDF added to zip with correct filename
// **Validates: Requirements 1.2**
describe('Property 1: PDF added to zip with correct filename', () => {
  const actorNameArbitrary = fc.stringMatching(/^[A-Za-z0-9 _-]{1,30}$/);
  const chroniclePathArbitrary = fc.stringMatching(
    /^modules\/[a-z0-9-]{1,20}\/[a-z0-9-]{1,20}\.pdf$/
  );

  // Minimal PDF byte array — JSZip doesn't validate PDF content
  const MINIMAL_PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

  it('should add exactly one file whose name equals generateChronicleFilename output', () => {
    fc.assert(
      fc.property(
        actorNameArbitrary,
        chroniclePathArbitrary,
        (actorName, blankChroniclePath) => {
          const archive = createArchive();
          const existingFilenames = new Set<string>();
          const expectedFilename = generateChronicleFilename(actorName, blankChroniclePath);

          addPdfToArchive(archive, MINIMAL_PDF_BYTES, expectedFilename, existingFilenames);

          const filesInArchive = Object.keys(archive.files);
          expect(filesInArchive).toHaveLength(1);
          expect(filesInArchive[0]).toBe(expectedFilename);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: chronicle-export, Property 3: Zip archive base64 round trip
// **Validates: Requirements 1.5, 3.1**
describe('Property 3: Zip archive base64 round trip', () => {
  const filenameArbitrary = fc.stringMatching(/^[A-Za-z0-9_-]{1,20}\.pdf$/);
  const contentArbitrary = fc.uint8Array({ minLength: 1, maxLength: 200 });

  const zipEntryArbitrary = fc.record({
    filename: filenameArbitrary,
    content: contentArbitrary,
  });

  const zipEntriesArbitrary = fc.uniqueArray(zipEntryArbitrary, {
    minLength: 1,
    maxLength: 5,
    selector: (entry) => entry.filename,
  });

  it('should produce byte-identical content after base64 round trip', async () => {
    await fc.assert(
      fc.asyncProperty(zipEntriesArbitrary, async (entries) => {
        const archive = createArchive();
        const existingFilenames = new Set<string>();

        for (const entry of entries) {
          addPdfToArchive(archive, entry.content, entry.filename, existingFilenames);
        }

        // Store archive as base64 on a mock actor
        let storedBase64 = '';
        const mockActor: FlagActor = {
          getFlag: () => storedBase64,
          setFlag: async (_scope: string, _key: string, value: unknown) => {
            storedBase64 = value as string;
          },
          unsetFlag: async () => {},
          update: async () => {},
        };

        await storeArchive(archive, mockActor);

        // Decode the stored base64 back into a zip
        const decodedZip = await JSZip.loadAsync(storedBase64, { base64: true });

        // Verify each entry's content matches the original
        for (const entry of entries) {
          const fileData = await decodedZip.file(entry.filename)?.async('uint8array');
          expect(fileData).toBeDefined();
          expect(Array.from(fileData!)).toEqual(Array.from(entry.content));
        }

        // Verify the zip contains exactly the expected number of entries
        const decodedFileCount = Object.keys(decodedZip.files).length;
        expect(decodedFileCount).toBe(entries.length);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: chronicle-export, Property 7: storeArchive replaces previous archive
// **Validates: Requirements 5.3**
describe('Property 7: storeArchive replaces previous archive', () => {
  const filenameArbitrary = fc.stringMatching(/^[A-Za-z0-9_-]{1,20}\.pdf$/);
  const contentArbitrary = fc.uint8Array({ minLength: 1, maxLength: 200 });

  function createMockFlagActor(): FlagActor & { storedValue: string } {
    const actor = {
      storedValue: '',
      getFlag(_scope: string, _key: string): unknown {
        return actor.storedValue;
      },
      async setFlag(_scope: string, _key: string, value: unknown): Promise<void> {
        actor.storedValue = value as string;
      },
      async unsetFlag(_scope: string, _key: string): Promise<void> {
        actor.storedValue = '';
      },
      async update(): Promise<void> {},
    };
    return actor;
  }

  it('should replace the stored base64 with the new archive content', async () => {
    await fc.assert(
      fc.asyncProperty(
        filenameArbitrary,
        contentArbitrary,
        filenameArbitrary,
        contentArbitrary,
        async (filename1, content1, filename2, content2) => {
          const mockActor = createMockFlagActor();

          // Build and store the first archive
          const firstArchive = createArchive();
          const firstFilenames = new Set<string>();
          addPdfToArchive(firstArchive, content1, filename1, firstFilenames);
          await storeArchive(firstArchive, mockActor);

          const firstStoredBase64 = mockActor.storedValue;
          expect(firstStoredBase64.length).toBeGreaterThan(0);

          // Build and store a second (replacement) archive
          const secondArchive = createArchive();
          const secondFilenames = new Set<string>();
          addPdfToArchive(secondArchive, content2, filename2, secondFilenames);
          await storeArchive(secondArchive, mockActor);

          const secondStoredBase64 = mockActor.storedValue;

          // The stored value should be the second archive's base64
          // Verify by decoding and checking the second archive's content
          const decodedZip = await JSZip.loadAsync(secondStoredBase64, { base64: true });
          const deduplicatedFilename2 = deduplicateFilename(filename2, new Set<string>());
          const fileData = await decodedZip.file(deduplicatedFilename2)?.async('uint8array');
          expect(fileData).toBeDefined();
          expect(Array.from(fileData!)).toEqual(Array.from(content2));

          // The decoded zip should contain exactly one file (the second archive's entry)
          expect(Object.keys(decodedZip.files)).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: chronicle-export, Property 6: clearArchive removes the archive
// **Validates: Requirements 5.1**
describe('Property 6: clearArchive removes the archive', () => {
  const nonEmptyStringArbitrary = fc.string({ minLength: 1, maxLength: 200 });

  function createMockFlagActorWithZip(initialZip: string): FlagActor {
    let storedValue: string | undefined = initialZip;
    return {
      getFlag(_scope: string, _key: string): unknown {
        return storedValue;
      },
      async setFlag(_scope: string, _key: string, value: unknown): Promise<void> {
        storedValue = value as string;
      },
      async unsetFlag(_scope: string, _key: string): Promise<void> {
        storedValue = undefined;
      },
      async update(): Promise<void> {},
    };
  }

  it('should result in hasArchive returning false after clearArchive is called', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyStringArbitrary, async (zipValue) => {
        const actor = createMockFlagActorWithZip(zipValue);

        // Verify the archive exists before clearing
        expect(hasArchive(actor)).toBe(true);

        await clearArchive(actor);

        // After clearing, hasArchive must return false
        expect(hasArchive(actor)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
