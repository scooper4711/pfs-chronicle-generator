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
import { deduplicateFilename, generateZipFilename, hasArchive, FlagActor } from './chronicle-exporter';
import { sanitizeFilename } from '../utils/filename-utils';

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
