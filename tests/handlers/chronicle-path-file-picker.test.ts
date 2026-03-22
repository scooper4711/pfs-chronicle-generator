/**
 * Unit tests for chronicle path file picker handler
 * 
 * Tests that the file picker handler correctly instantiates FilePicker,
 * updates the input field, triggers auto-save, and updates visibility.
 * 
 * Requirements: conditional-chronicle-path-visibility 2.3, 2.4, 3.1, 3.2, 4.1
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock foundry global before importing handlers
const mockFilePicker = {
  browse: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
};

const mockFilePickerImplementation = jest.fn<(config: any) => typeof mockFilePicker>(() => mockFilePicker);

(global as any).foundry = {
  applications: {
    apps: {
      FilePicker: {
        implementation: mockFilePickerImplementation
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
jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  savePartyChronicleData: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

// Mock form data extraction
jest.mock('../../scripts/handlers/form-data-extraction', () => ({
  extractFormData: jest.fn(() => ({
    shared: {
      blankChroniclePath: '/path/to/chronicle.pdf'
    },
    characters: {}
  }))
}));

// Now import the handlers after mocks are set up
import { handleChroniclePathFilePicker, updateChroniclePathVisibility } from '../../scripts/handlers/party-chronicle-handlers';
import { savePartyChronicleData } from '../../scripts/model/party-chronicle-storage';

describe('Chronicle Path File Picker Handler Tests', () => {
  let container: HTMLElement;
  let partyActors: any[];
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mock container with the chronicle path input field
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

    // Create mock party actors
    partyActors = [
      {
        id: 'actor-1',
        name: 'Test Character',
        type: 'character'
      }
    ];

    // Reset fetch mock
    mockFetch.mockReset();
  });

  describe('FilePicker Instantiation', () => {
    /**
     * Test that FilePicker is instantiated with correct configuration
     * 
     * Requirements: conditional-chronicle-path-visibility 2.4
     */
    it('should instantiate FilePicker using foundry.applications.apps.FilePicker.implementation', async () => {
      const event = new Event('click');
      
      await handleChroniclePathFilePicker(event, container, partyActors);

      expect(mockFilePickerImplementation).toHaveBeenCalled();
      expect(mockFilePickerImplementation).toHaveBeenCalledTimes(1);
    });

    /**
     * Test that FilePicker uses type: 'any'
     * 
     * Requirements: conditional-chronicle-path-visibility 2.3
     */
    it('should configure FilePicker with type "any"', async () => {
      const event = new Event('click');
      
      await handleChroniclePathFilePicker(event, container, partyActors);

      expect(mockFilePickerImplementation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'any'
        })
      );
    });

    it('should configure FilePicker with a callback function', async () => {
      const event = new Event('click');
      
      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      expect(config).toHaveProperty('callback');
      expect(typeof config.callback).toBe('function');
    });

    it('should call browse() on the FilePicker instance', async () => {
      const event = new Event('click');
      
      await handleChroniclePathFilePicker(event, container, partyActors);

      expect(mockFilePicker.browse).toHaveBeenCalled();
      expect(mockFilePicker.browse).toHaveBeenCalledTimes(1);
    });

    it('should prevent default event behavior', async () => {
      const event = new Event('click');
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      await handleChroniclePathFilePicker(event, container, partyActors);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('FilePicker Callback Behavior', () => {
    /**
     * Test that callback updates input field value
     * 
     * Requirements: conditional-chronicle-path-visibility 3.1
     */
    it('should update input field value when callback is invoked', async () => {
      const event = new Event('click');
      const testPath = '/path/to/selected/chronicle.pdf';
      
      // Mock fetch to return success for file existence check
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      // Get the callback function that was passed to FilePicker
      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      // Invoke the callback with a test path
      await callback(testPath);

      // Verify the input field was updated
      const input = container.querySelector('#blankChroniclePath') as HTMLInputElement;
      expect(input.value).toBe(testPath);
    });

    it('should handle callback with empty path', async () => {
      const event = new Event('click');
      const testPath = '';
      
      // Mock fetch to return failure for empty path
      mockFetch.mockResolvedValue({ ok: false } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      await callback(testPath);

      const input = container.querySelector('#blankChroniclePath') as HTMLInputElement;
      expect(input.value).toBe(testPath);
    });

    it('should handle callback with path containing special characters', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle (copy) [v2].pdf';
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      await callback(testPath);

      const input = container.querySelector('#blankChroniclePath') as HTMLInputElement;
      expect(input.value).toBe(testPath);
    });
  });

  describe('Auto-Save Triggering', () => {
    /**
     * Test that auto-save is triggered after file selection
     * 
     * Requirements: conditional-chronicle-path-visibility 3.2, 4.1
     */
    it('should trigger auto-save after file selection', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      await callback(testPath);

      // Verify savePartyChronicleData was called
      expect(savePartyChronicleData).toHaveBeenCalled();
      expect(savePartyChronicleData).toHaveBeenCalledTimes(1);
    });

    it('should trigger auto-save before visibility update', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      const callOrder: string[] = [];
      
      mockFetch.mockImplementation(() => {
        callOrder.push('fetch');
        return Promise.resolve({ ok: true } as Response);
      });

      (savePartyChronicleData as jest.Mock).mockImplementation(() => {
        callOrder.push('save');
        return Promise.resolve();
      });

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      await callback(testPath);

      // Verify save happens before fetch (which is part of visibility update)
      const saveIndex = callOrder.indexOf('save');
      const fetchIndex = callOrder.indexOf('fetch');
      expect(saveIndex).toBeGreaterThanOrEqual(0);
      expect(fetchIndex).toBeGreaterThan(saveIndex);
    });

    it('should not fail if auto-save encounters an error', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      // Mock savePartyChronicleData to throw an error
      (savePartyChronicleData as jest.Mock<() => Promise<void>>).mockRejectedValue(new Error('Save failed'));

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      // Should not throw - error is caught and logged
      await expect(callback(testPath)).resolves.not.toThrow();
      
      // Verify the error was logged (console.error was called)
      expect(console.error).toHaveBeenCalledWith('[PFS Chronicle]', 'Auto-save failed:', expect.any(Error));
    });
  });

  describe('Visibility Update', () => {
    /**
     * Test that visibility update is called after file selection
     * 
     * Requirements: conditional-chronicle-path-visibility 3.2, 4.1
     */
    it('should call updateChroniclePathVisibility after file selection', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      await callback(testPath);

      // Verify fetch was called (part of visibility update)
      expect(global.fetch).toHaveBeenCalledWith(testPath, { method: 'HEAD' });
    });

    it('should hide field when selected file exists', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      await callback(testPath);

      const formGroup = container.querySelector('#chroniclePathGroup');
      expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(false);
    });

    it('should show field when selected file does not exist', async () => {
      const event = new Event('click');
      const testPath = '/path/to/nonexistent.pdf';
      
      mockFetch.mockResolvedValue({ ok: false } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      await callback(testPath);

      const formGroup = container.querySelector('#chroniclePathGroup');
      expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
    });

    it('should handle network errors during visibility check', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      mockFetch.mockRejectedValue(new Error('Network error'));

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      // Should not throw
      await expect(callback(testPath)).resolves.not.toThrow();

      // Field should be visible when check fails
      const formGroup = container.querySelector('#chroniclePathGroup');
      expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing input field gracefully', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      // Remove the input field
      const input = container.querySelector('#blankChroniclePath');
      input?.remove();

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      // Should not throw
      await expect(callback(testPath)).resolves.not.toThrow();
    });

    it('should handle missing form group gracefully', async () => {
      const event = new Event('click');
      const testPath = '/path/to/chronicle.pdf';
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      // Remove the form group
      const formGroup = container.querySelector('#chroniclePathGroup');
      formGroup?.remove();

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      // Should not throw
      await expect(callback(testPath)).resolves.not.toThrow();
    });

    it('should handle callback invoked multiple times', async () => {
      const event = new Event('click');
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await handleChroniclePathFilePicker(event, container, partyActors);

      const config = mockFilePickerImplementation.mock.calls[0][0];
      const callback = config.callback;

      // Invoke callback multiple times
      await callback('/path/1.pdf');
      await callback('/path/2.pdf');
      await callback('/path/3.pdf');

      const input = container.querySelector('#blankChroniclePath') as HTMLInputElement;
      expect(input.value).toBe('/path/3.pdf');
      
      // Auto-save should be called 3 times
      expect(savePartyChronicleData).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateChroniclePathVisibility Direct Tests', () => {
    it('should hide field when file exists', async () => {
      const testPath = '/path/to/chronicle.pdf';
      
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await updateChroniclePathVisibility(testPath, container);

      const formGroup = container.querySelector('#chroniclePathGroup');
      expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(false);
    });

    it('should show field when file does not exist', async () => {
      const testPath = '/path/to/nonexistent.pdf';
      
      mockFetch.mockResolvedValue({ ok: false } as Response);

      await updateChroniclePathVisibility(testPath, container);

      const formGroup = container.querySelector('#chroniclePathGroup');
      expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
    });

    it('should show field when path is empty', async () => {
      await updateChroniclePathVisibility('', container);

      const formGroup = container.querySelector('#chroniclePathGroup');
      expect(formGroup?.classList.contains('chronicle-path-visible')).toBe(true);
      
      // Fetch should not be called for empty paths
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle missing form group gracefully', async () => {
      const testPath = '/path/to/chronicle.pdf';
      
      // Remove the form group
      const formGroup = container.querySelector('#chroniclePathGroup');
      formGroup?.remove();

      // Should not throw
      await expect(updateChroniclePathVisibility(testPath, container)).resolves.not.toThrow();
    });
  });
});
