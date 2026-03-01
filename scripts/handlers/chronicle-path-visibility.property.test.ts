/**
 * Property-based tests for chronicle path visibility logic
 * 
 * These tests validate that the chronicle path field visibility correctly
 * responds to file existence checks, hiding the field when a valid file
 * exists and showing it when the file is missing or the path is empty.
 * 
 * Requirements: conditional-chronicle-path-visibility 5.1, 5.2, 6.1, 6.2
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock foundry global before importing handlers
(global as any).foundry = {
  applications: {
    apps: {
      FilePicker: {
        implementation: jest.fn()
      }
    }
  }
};

// Mock fetch for file existence checks
global.fetch = jest.fn<typeof fetch>() as jest.MockedFunction<typeof fetch>;

// Mock console.log to avoid noise in test output
global.console.log = jest.fn();
global.console.error = jest.fn();

// Mock ui.notifications
(global as any).ui = {
  notifications: {
    warn: jest.fn()
  }
};

// Mock party chronicle storage
jest.mock('../model/party-chronicle-storage', () => ({
  savePartyChronicleData: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

// Mock form data extraction
jest.mock('./form-data-extraction', () => ({
  extractFormData: jest.fn(() => ({
    shared: {
      blankChroniclePath: '/path/to/chronicle.pdf'
    },
    characters: {}
  }))
}));

// Now import the handlers after mocks are set up
import { updateChroniclePathVisibility } from './party-chronicle-handlers';

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
  ).map(([prefix, name, ext]) => `${prefix}${name}${ext}`)
);

describe('Chronicle Path Visibility Property Tests', () => {
  let container: HTMLElement;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mock container with the chronicle path form group
    container = document.createElement('div');
    container.innerHTML = `
      <div class="form-group chronicle-path-visible" id="chroniclePathGroup">
        <label for="blankChroniclePath">Chronicle Path</label>
        <div class="form-fields">
          <input type="text" id="blankChroniclePath" name="shared.blankChroniclePath" value="" readonly>
          <button type="button" class="file-picker-button" id="chroniclePathFilePicker">
            <i class="fas fa-folder-open"></i>
          </button>
        </div>
      </div>
    `;

    // Reset fetch mock
    mockFetch.mockReset();
  });

  describe('Property 5: Field Hidden When Valid File Exists', () => {
    /**
     * **Validates: Requirements 5.1, 6.1**
     * 
     * For any chronicle path where the file exists and is accessible,
     * the chronicle path field and file picker button should be hidden
     * when the form is rendered.
     * 
     * This property verifies that:
     * 1. A HEAD request is made to check file existence
     * 2. When the response is successful (ok: true), the field is hidden
     * 3. The 'chronicle-path-visible' class is removed from the form group
     * 
     * Feature: conditional-chronicle-path-visibility, Property 5: Field Hidden When Valid File Exists
     */
    it('should hide field when file exists for any valid path', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (filePath) => {
            // Reset container state before each iteration
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.add('chronicle-path-visible');
            
            // Mock fetch to return success (file exists)
            mockFetch.mockResolvedValue({ ok: true } as Response);

            // Call the visibility update function
            await updateChroniclePathVisibility(filePath, container);

            // Verify HEAD request was made
            expect(mockFetch).toHaveBeenCalledWith(filePath, { method: 'HEAD' });

            // Verify field is hidden (chronicle-path-visible class removed)
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.1, 6.1**
     * 
     * Verify that the field remains hidden across multiple checks
     * when the file continues to exist.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 5: Field Hidden When Valid File Exists (stability)
     */
    it('should keep field hidden across multiple checks when file exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (filePath) => {
            // Reset container state
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.add('chronicle-path-visible');
            
            // Mock fetch to return success
            mockFetch.mockResolvedValue({ ok: true } as Response);

            // Call visibility update multiple times
            await updateChroniclePathVisibility(filePath, container);
            const firstCheck = !formGroup?.classList.contains('chronicle-path-visible');
            
            await updateChroniclePathVisibility(filePath, container);
            const secondCheck = !formGroup?.classList.contains('chronicle-path-visible');
            
            await updateChroniclePathVisibility(filePath, container);
            const thirdCheck = !formGroup?.classList.contains('chronicle-path-visible');

            // All checks should show field is hidden
            expect(firstCheck).toBe(true);
            expect(secondCheck).toBe(true);
            expect(thirdCheck).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.1, 6.1**
     * 
     * Verify that the field is hidden regardless of its initial state
     * when a valid file exists.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 5: Field Hidden When Valid File Exists (initial state)
     */
    it('should hide field when file exists regardless of initial visibility state', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          fc.boolean(), // Random initial visibility state
          async (filePath, initiallyVisible) => {
            // Set initial state
            const formGroup = container.querySelector('#chroniclePathGroup');
            if (initiallyVisible) {
              formGroup?.classList.add('chronicle-path-visible');
            } else {
              formGroup?.classList.remove('chronicle-path-visible');
            }
            
            // Mock fetch to return success
            mockFetch.mockResolvedValue({ ok: true } as Response);

            // Call visibility update
            await updateChroniclePathVisibility(filePath, container);

            // Field should be hidden regardless of initial state
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.1, 6.1**
     * 
     * Verify that different HTTP success status codes (200, 204, etc.)
     * all result in the field being hidden.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 5: Field Hidden When Valid File Exists (status codes)
     */
    it('should hide field for any successful HTTP response', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          fc.constantFrom(200, 201, 204, 206), // Various success status codes
          async (filePath, statusCode) => {
            // Reset container state
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.add('chronicle-path-visible');
            
            // Mock fetch to return success with specific status code
            mockFetch.mockResolvedValue({ 
              ok: true, 
              status: statusCode 
            } as Response);

            // Call visibility update
            await updateChroniclePathVisibility(filePath, container);

            // Field should be hidden for any success status
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.1, 6.1**
     * 
     * Verify that the visibility update completes successfully
     * even when the form group element is missing (defensive programming).
     * 
     * Feature: conditional-chronicle-path-visibility, Property 5: Field Hidden When Valid File Exists (missing element)
     */
    it('should handle missing form group gracefully when file exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (filePath) => {
            // Remove the form group
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.remove();
            
            // Mock fetch to return success
            mockFetch.mockResolvedValue({ ok: true } as Response);

            // Should not throw
            await expect(updateChroniclePathVisibility(filePath, container)).resolves.not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Field Shown When File Missing or Path Empty', () => {
    /**
     * **Validates: Requirements 5.2, 6.2**
     * 
     * For any chronicle path that is empty or where the file does not exist,
     * the chronicle path field and file picker button should be visible
     * when the form is rendered.
     * 
     * This property verifies that:
     * 1. Empty paths immediately show the field without making a request
     * 2. When a file doesn't exist (fetch returns ok: false), the field is shown
     * 3. The 'chronicle-path-visible' class is added to the form group
     * 
     * Feature: conditional-chronicle-path-visibility, Property 6: Field Shown When File Missing or Path Empty
     */
    it('should show field when path is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(''), // Only truly empty string, not whitespace
          async (emptyPath) => {
            // Reset container state - start with field hidden
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.remove('chronicle-path-visible');
            
            // Call the visibility update function with empty path
            await updateChroniclePathVisibility(emptyPath, container);

            // Verify NO fetch request was made for empty paths
            expect(mockFetch).not.toHaveBeenCalled();

            // Verify field is shown (chronicle-path-visible class added)
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.2, 6.2**
     * 
     * Verify that the field is shown when the file doesn't exist
     * (fetch returns ok: false).
     * 
     * Feature: conditional-chronicle-path-visibility, Property 6: Field Shown When File Missing
     */
    it('should show field when file does not exist for any path', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (filePath) => {
            // Reset container state - start with field hidden
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.remove('chronicle-path-visible');
            
            // Mock fetch to return failure (file doesn't exist)
            mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);

            // Call the visibility update function
            await updateChroniclePathVisibility(filePath, container);

            // Verify HEAD request was made
            expect(mockFetch).toHaveBeenCalledWith(filePath, { method: 'HEAD' });

            // Verify field is shown (chronicle-path-visible class added)
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.2, 6.2**
     * 
     * Verify that the field is shown when fetch throws an error
     * (network error, CORS error, etc.).
     * 
     * Feature: conditional-chronicle-path-visibility, Property 6: Field Shown When File Check Fails
     */
    it('should show field when file existence check fails with error', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          fc.constantFrom(
            new Error('Network error'),
            new Error('CORS error'),
            new Error('Timeout'),
            new TypeError('Failed to fetch')
          ),
          async (filePath, error) => {
            // Reset container state - start with field hidden
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.remove('chronicle-path-visible');
            
            // Mock fetch to throw an error
            mockFetch.mockRejectedValue(error);

            // Call the visibility update function
            await updateChroniclePathVisibility(filePath, container);

            // Verify HEAD request was attempted
            expect(mockFetch).toHaveBeenCalledWith(filePath, { method: 'HEAD' });

            // Verify field is shown (chronicle-path-visible class added)
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.2, 6.2**
     * 
     * Verify that different HTTP error status codes (404, 403, 500, etc.)
     * all result in the field being shown.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 6: Field Shown for HTTP Errors
     */
    it('should show field for any HTTP error status code', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          fc.constantFrom(400, 401, 403, 404, 500, 502, 503), // Various error status codes
          async (filePath, statusCode) => {
            // Reset container state - start with field hidden
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.remove('chronicle-path-visible');
            
            // Mock fetch to return error with specific status code
            mockFetch.mockResolvedValue({ 
              ok: false, 
              status: statusCode 
            } as Response);

            // Call visibility update
            await updateChroniclePathVisibility(filePath, container);

            // Field should be shown for any error status
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.2, 6.2**
     * 
     * Verify that the field remains visible across multiple checks
     * when the file continues to not exist.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 6: Field Shown Stability
     */
    it('should keep field visible across multiple checks when file missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (filePath) => {
            // Reset container state - start with field hidden
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.classList.remove('chronicle-path-visible');
            
            // Mock fetch to return failure
            mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);

            // Call visibility update multiple times
            await updateChroniclePathVisibility(filePath, container);
            const firstCheck = formGroup?.classList.contains('chronicle-path-visible');
            
            await updateChroniclePathVisibility(filePath, container);
            const secondCheck = formGroup?.classList.contains('chronicle-path-visible');
            
            await updateChroniclePathVisibility(filePath, container);
            const thirdCheck = formGroup?.classList.contains('chronicle-path-visible');

            // All checks should show field is visible
            expect(firstCheck).toBe(true);
            expect(secondCheck).toBe(true);
            expect(thirdCheck).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.2, 6.2**
     * 
     * Verify that the field is shown regardless of its initial state
     * when the file doesn't exist.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 6: Field Shown Regardless of Initial State
     */
    it('should show field when file missing regardless of initial visibility state', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          fc.boolean(), // Random initial visibility state
          async (filePath, initiallyVisible) => {
            // Set initial state
            const formGroup = container.querySelector('#chroniclePathGroup');
            if (initiallyVisible) {
              formGroup?.classList.add('chronicle-path-visible');
            } else {
              formGroup?.classList.remove('chronicle-path-visible');
            }
            
            // Mock fetch to return failure
            mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);

            // Call visibility update
            await updateChroniclePathVisibility(filePath, container);

            // Field should be visible regardless of initial state
            expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 5.2, 6.2**
     * 
     * Verify that the visibility update completes successfully
     * even when the form group element is missing (defensive programming).
     * 
     * Feature: conditional-chronicle-path-visibility, Property 6: Field Shown with Missing Element
     */
    it('should handle missing form group gracefully when file missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (filePath) => {
            // Remove the form group
            const formGroup = container.querySelector('#chroniclePathGroup');
            formGroup?.remove();
            
            // Mock fetch to return failure
            mockFetch.mockResolvedValue({ ok: false, status: 404 } as Response);

            // Should not throw
            await expect(updateChroniclePathVisibility(filePath, container)).resolves.not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
