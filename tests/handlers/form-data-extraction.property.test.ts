/**
 * Property-based tests for form data extraction
 * 
 * These tests validate that form data extraction correctly includes
 * the chronicle path in the shared fields, regardless of whether the
 * chronicle path field is visible or hidden in the UI.
 * 
 * Requirements: conditional-chronicle-path-visibility 3.3, 5.5
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { extractFormData } from './form-data-extraction';

/**
 * Generator for valid file paths
 * Generates realistic file paths with various formats
 */
const filePathArbitrary = fc.oneof(
  // Absolute paths with various extensions
  fc.tuple(
    fc.constantFrom('/', '/data/', '/modules/', '/worlds/'),
    fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF', '.json', '.txt')
  ).map(([prefix, name, ext]) => `${prefix}${name}${ext}`),
  
  // Relative paths
  fc.tuple(
    fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF', '.json', '.txt')
  ).map(([name, ext]) => `${name}${ext}`),
  
  // Paths with subdirectories
  fc.tuple(
    fc.constantFrom('chronicles/', 'data/chronicles/', 'modules/pfs/'),
    fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF')
  ).map(([dir, name, ext]) => `${dir}${name}${ext}`),
  
  // Paths with special characters
  fc.tuple(
    fc.constantFrom('/', 'chronicles/'),
    fc.array(fc.constantFrom('a', 'b', 'c', ' ', '(', ')', '[', ']', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF')
  ).map(([prefix, name, ext]) => `${prefix}${name}${ext}`),
  
  // Empty path
  fc.constant('')
);

describe('Form Data Extraction Property Tests', () => {
  let container: HTMLElement;
  let partyActors: any[];

  beforeEach(() => {
    // Create a mock container with the party chronicle form
    container = document.createElement('div');
    
    // Create mock party actors
    partyActors = [
      { id: 'actor1', name: 'Character 1', level: 5 },
      { id: 'actor2', name: 'Character 2', level: 3 }
    ];
  });

  /**
   * Helper function to create a complete form with all required fields
   */
  function createFormWithChroniclePath(chroniclePath: string, isVisible: boolean): void {
    const visibilityClass = isVisible ? 'chronicle-path-visible' : '';
    
    const formHtml = `
      <!-- Shared fields -->
      <input type="text" id="gmPfsNumber" value="123456-789">
      <input type="text" id="scenarioName" value="Test Scenario">
      <input type="text" id="eventCode" value="TEST-001">
      <input type="text" id="eventDate" value="2024-01-15">
      <input type="number" id="xpEarned" value="4">
      <input type="number" id="treasureBundles" value="2">
      <input type="number" id="downtimeDays" value="0">
      <select id="layout"><option value="layout1" selected>Layout 1</option></select>
      <select id="season"><option value="season1" selected>Season 1</option></select>
      
      <!-- Chronicle path field (may be hidden) -->
      <div class="form-group ${visibilityClass}" id="chroniclePathGroup">
        <label for="blankChroniclePath">Chronicle Path</label>
        <div class="form-fields">
          <input type="text" id="blankChroniclePath" name="shared.blankChroniclePath" value="${chroniclePath}" readonly>
          <button type="button" class="file-picker-button" id="chroniclePathFilePicker">
            <i class="fas fa-folder-open"></i>
          </button>
        </div>
      </div>
      
      <!-- Reputation fields -->
      <input type="number" id="chosenFactionReputation" value="2">
      <input type="number" id="reputation-EA" value="0">
      <input type="number" id="reputation-GA" value="0">
      <input type="number" id="reputation-HH" value="0">
      <input type="number" id="reputation-VS" value="0">
      <input type="number" id="reputation-RO" value="0">
      <input type="number" id="reputation-VW" value="0">
      
      <!-- Session reporting fields -->
      <input type="checkbox" id="reportingA">
      <input type="checkbox" id="reportingB">
      <input type="checkbox" id="reportingC">
      <input type="checkbox" id="reportingD">
      <select id="chosenFaction"><option value="" selected></option></select>
      
      <!-- Character-specific fields -->
      <input type="text" name="characters.actor1.characterName" value="Character 1">
      <input type="text" name="characters.actor1.societyId" value="12345-2001">
      <input type="number" name="characters.actor1.level" value="5">
      <select name="characters.actor1.taskLevel"><option value="3" selected>3</option></select>
      <select name="characters.actor1.successLevel"><option value="success" selected>Success</option></select>
      <select name="characters.actor1.proficiencyRank"><option value="trained" selected>Trained</option></select>
      <input type="number" id="earnedIncome-actor1" value="10.5">
      <input type="number" id="goldSpent-actor1" value="5.0">
      <textarea id="notes-actor1">Test notes 1</textarea>
      <input type="checkbox" name="characters.actor1.consumeReplay">
      
      <input type="text" name="characters.actor2.characterName" value="Character 2">
      <input type="text" name="characters.actor2.societyId" value="12345-2002">
      <input type="number" name="characters.actor2.level" value="3">
      <select name="characters.actor2.taskLevel"><option value="3" selected>3</option></select>
      <select name="characters.actor2.successLevel"><option value="success" selected>Success</option></select>
      <select name="characters.actor2.proficiencyRank"><option value="trained" selected>Trained</option></select>
      <input type="number" id="earnedIncome-actor2" value="8.0">
      <input type="number" id="goldSpent-actor2" value="3.5">
      <textarea id="notes-actor2">Test notes 2</textarea>
      <input type="checkbox" name="characters.actor2.consumeReplay">
    `;
    
    container.innerHTML = formHtml;
  }

  describe('Property 3: Chronicle Path Persists in Form Data', () => {
    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * For any chronicle path value set in the form, extracting the form data
     * should include that path in the shared fields, regardless of whether
     * the field is visible or hidden.
     * 
     * This property verifies that:
     * 1. The chronicle path is always extracted from the form
     * 2. The extracted path matches the value in the input field
     * 3. Visibility state does not affect data extraction
     * 4. Empty paths are preserved as empty strings
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: Chronicle Path Persists in Form Data
     */
    it('should include chronicle path in extracted data when field is visible', () => {
      fc.assert(
        fc.property(
          filePathArbitrary,
          (chroniclePath) => {
            // Create form with visible chronicle path field
            createFormWithChroniclePath(chroniclePath, true);

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Verify chronicle path is included in shared fields
            expect(formData.shared).toHaveProperty('blankChroniclePath');
            expect(formData.shared.blankChroniclePath).toBe(chroniclePath);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * Verify that the chronicle path is included in extracted data
     * even when the field is hidden (when a valid file exists).
     * 
     * This is critical because the hidden field still needs to be
     * used for chronicle generation.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: Chronicle Path Persists When Hidden
     */
    it('should include chronicle path in extracted data when field is hidden', () => {
      fc.assert(
        fc.property(
          filePathArbitrary,
          (chroniclePath) => {
            // Create form with hidden chronicle path field
            createFormWithChroniclePath(chroniclePath, false);

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Verify chronicle path is included in shared fields
            expect(formData.shared).toHaveProperty('blankChroniclePath');
            expect(formData.shared.blankChroniclePath).toBe(chroniclePath);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * Verify that the extracted chronicle path value is identical
     * regardless of the field's visibility state.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: Chronicle Path Extraction Consistency
     */
    it('should extract same chronicle path value regardless of visibility', () => {
      fc.assert(
        fc.property(
          filePathArbitrary,
          (chroniclePath) => {
            // Extract data with visible field
            createFormWithChroniclePath(chroniclePath, true);
            const visibleData = extractFormData(container, partyActors);

            // Extract data with hidden field
            createFormWithChroniclePath(chroniclePath, false);
            const hiddenData = extractFormData(container, partyActors);

            // Both should have the same chronicle path
            expect(visibleData.shared.blankChroniclePath).toBe(chroniclePath);
            expect(hiddenData.shared.blankChroniclePath).toBe(chroniclePath);
            expect(visibleData.shared.blankChroniclePath).toBe(hiddenData.shared.blankChroniclePath);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * Verify that empty chronicle paths are correctly preserved
     * as empty strings in the extracted data.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: Empty Path Preservation
     */
    it('should preserve empty chronicle path as empty string', () => {
      // Create form with empty chronicle path
      createFormWithChroniclePath('', true);

      // Extract form data
      const formData = extractFormData(container, partyActors);

      // Verify empty path is preserved
      expect(formData.shared.blankChroniclePath).toBe('');
    });

    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * Verify that the chronicle path is extracted correctly
     * even when the input element is missing from the DOM.
     * 
     * This tests defensive programming - the function should
     * handle missing elements gracefully.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: Missing Element Handling
     */
    it('should handle missing chronicle path input gracefully', () => {
      fc.assert(
        fc.property(
          filePathArbitrary,
          (chroniclePath) => {
            // Create form without chronicle path field
            createFormWithChroniclePath(chroniclePath, true);
            const chroniclePathInput = container.querySelector('#blankChroniclePath');
            chroniclePathInput?.remove();

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Should have blankChroniclePath property with empty string
            expect(formData.shared).toHaveProperty('blankChroniclePath');
            expect(formData.shared.blankChroniclePath).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * Verify that special characters in file paths are preserved
     * correctly during extraction.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: Special Character Preservation
     */
    it('should preserve special characters in chronicle path', () => {
      const specialPaths = [
        '/path/with spaces/file.pdf',
        '/path/with-(parentheses)/file.pdf',
        '/path/with-[brackets]/file.pdf',
        '/path/with_underscores/file.pdf',
        '/path/with-dashes/file.pdf',
        'relative/path/file.pdf',
        './relative/path/file.pdf',
        '../parent/path/file.pdf'
      ];

      specialPaths.forEach(chroniclePath => {
        createFormWithChroniclePath(chroniclePath, true);
        const formData = extractFormData(container, partyActors);
        expect(formData.shared.blankChroniclePath).toBe(chroniclePath);
      });
    });

    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * Verify that the chronicle path extraction doesn't interfere
     * with extraction of other shared fields.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: No Side Effects
     */
    it('should not interfere with extraction of other shared fields', () => {
      fc.assert(
        fc.property(
          filePathArbitrary,
          (chroniclePath) => {
            createFormWithChroniclePath(chroniclePath, true);
            const formData = extractFormData(container, partyActors);

            // Verify all shared fields are present
            expect(formData.shared.gmPfsNumber).toBe('123456-789');
            expect(formData.shared.scenarioName).toBe('Test Scenario');
            expect(formData.shared.eventCode).toBe('TEST-001');
            expect(formData.shared.eventDate).toBe('2024-01-15');
            expect(formData.shared.xpEarned).toBe(4);
            expect(formData.shared.treasureBundles).toBe(2);
            expect(formData.shared.layoutId).toBe('layout1');
            expect(formData.shared.seasonId).toBe('season1');
            expect(formData.shared.blankChroniclePath).toBe(chroniclePath);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.3, 5.5**
     * 
     * Verify that the chronicle path extraction doesn't interfere
     * with extraction of character-specific fields.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 3: Character Data Integrity
     */
    it('should not interfere with extraction of character-specific fields', () => {
      fc.assert(
        fc.property(
          filePathArbitrary,
          (chroniclePath) => {
            createFormWithChroniclePath(chroniclePath, true);
            const formData = extractFormData(container, partyActors);

            // Verify character fields are present and correct
            expect(formData.characters.actor1.characterName).toBe('Character 1');
            expect(formData.characters.actor1.societyId).toBe('12345-2001');
            expect(formData.characters.actor1.level).toBe(5);
            expect(formData.characters.actor1.taskLevel).toBe(3);
            expect(formData.characters.actor1.successLevel).toBe('success');
            expect(formData.characters.actor1.proficiencyRank).toBe('trained');
            expect(formData.characters.actor1.goldSpent).toBe(5.0);
            expect(formData.characters.actor1.notes).toBe('Test notes 1');

            expect(formData.characters.actor2.characterName).toBe('Character 2');
            expect(formData.characters.actor2.societyId).toBe('12345-2002');
            expect(formData.characters.actor2.level).toBe(3);
            expect(formData.characters.actor2.taskLevel).toBe(3);
            expect(formData.characters.actor2.successLevel).toBe('success');
            expect(formData.characters.actor2.proficiencyRank).toBe('trained');
            expect(formData.characters.actor2.goldSpent).toBe(3.5);
            expect(formData.characters.actor2.notes).toBe('Test notes 2');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
