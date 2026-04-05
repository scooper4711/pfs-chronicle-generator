/**
 * Integration tests for party-chronicle-handlers functions that require
 * mocked module dependencies (layoutStore, storage, etc.).
 *
 * Covers the Logger debug/warn/error calls introduced by the debug-logging
 * feature in handlePortraitClick, handleSeasonChange, handleLayoutChange,
 * saveFormData, and updateChroniclePathVisibility.
 *
 * @jest-environment jsdom
 */

import {
  handlePortraitClick,
  handleSeasonChange,
  handleLayoutChange,
  saveFormData,
  updateChroniclePathVisibility,
} from '../../scripts/handlers/party-chronicle-handlers';
import type { PartyActor } from '../../scripts/handlers/event-listener-helpers';
import type { ChronicleFormData } from '../../scripts/model/party-chronicle-types';

const mockGetLayoutsByParent = jest.fn().mockReturnValue([]);
const mockGetLayout = jest.fn().mockResolvedValue(null);

jest.mock('../../scripts/LayoutStore', () => ({
  layoutStore: {
    getLayoutsByParent: (...args: unknown[]) => mockGetLayoutsByParent(...args),
    getLayout: (...args: unknown[]) => mockGetLayout(...args),
  },
}));

const mockSavePartyChronicleData = jest.fn().mockResolvedValue(undefined);
jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  savePartyChronicleData: (...args: unknown[]) => mockSavePartyChronicleData(...args),
}));

jest.mock('../../scripts/utils/layout-utils', () => ({
  updateLayoutSpecificFields: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../scripts/handlers/validation-display', () => ({
  updateValidationDisplay: jest.fn(),
}));

jest.mock('../../scripts/handlers/collapsible-section-handlers', () => ({
  updateSectionSummary: jest.fn(),
}));

jest.mock('../../scripts/handlers/form-data-extraction', () => ({
  extractFormData: jest.fn(() => ({ shared: {}, characters: {} }) as unknown as ChronicleFormData),
}));

jest.mock('../../scripts/handlers/chronicle-generation', () => ({
  generateChroniclesFromPartyData: jest.fn(),
}));

(global as any).game = {
  settings: { get: jest.fn().mockReturnValue(true) },
};

(global as any).ui = {
  notifications: { info: jest.fn(), warn: jest.fn() },
};

describe('party-chronicle-handlers — Logger coverage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
  });

  describe('handlePortraitClick', () => {
    it('should open actor sheet when portrait is clicked with valid character ID', () => {
      const mockRender = jest.fn();
      const partyActors = [
        { id: 'actor-1', name: 'Valeros', sheet: { render: mockRender } },
      ] as unknown as PartyActor[];

      container.innerHTML = `
        <div class="member-activity" data-character-id="actor-1">
          <div class="actor-image"><img class="actor-link" /></div>
        </div>
      `;
      const img = container.querySelector('img.actor-link') as HTMLElement;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: img });

      handlePortraitClick(event, partyActors);

      expect(mockRender).toHaveBeenCalledWith(true, { focus: true });
    });

    it('should warn when no character ID is found', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      container.innerHTML = '<div><img class="actor-link" /></div>';
      const img = container.querySelector('img.actor-link') as HTMLElement;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: img });

      handlePortraitClick(event, []);

      expect(spy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Portrait clicked but no character ID found'
      );
      spy.mockRestore();
    });

    it('should warn when actor sheet is not found', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const partyActors = [{ id: 'actor-1', name: 'Valeros' }] as unknown as PartyActor[];
      container.innerHTML = `
        <div class="member-activity" data-character-id="actor-1">
          <img class="actor-link" />
        </div>
      `;
      const img = container.querySelector('img.actor-link') as HTMLElement;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: img });

      handlePortraitClick(event, partyActors);

      expect(spy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Actor or actor sheet not found'
      );
      spy.mockRestore();
    });
  });

  describe('handleSeasonChange', () => {
    it('should update layout dropdown and auto-save on season change', async () => {
      mockGetLayoutsByParent.mockReturnValue([
        { id: 'layout-a', description: 'Layout A' },
      ]);
      container.innerHTML = `
        <select id="season"><option value="s2" selected>Season 2</option></select>
        <select id="layout"></select>
      `;
      const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: seasonSelect });
      const mockExtract = jest.fn(() => ({ shared: {}, characters: {} }) as unknown as ChronicleFormData);

      await handleSeasonChange(event, container, [], mockExtract);

      const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
      expect(layoutSelect.options.length).toBe(1);
      expect(layoutSelect.options[0].value).toBe('layout-a');
      expect(mockSavePartyChronicleData).toHaveBeenCalled();
    });

    it('should handle empty layouts for season', async () => {
      mockGetLayoutsByParent.mockReturnValue([]);
      container.innerHTML = `
        <select id="season"><option value="s3" selected>Season 3</option></select>
        <select id="layout"></select>
      `;
      const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: seasonSelect });
      const mockExtract = jest.fn(() => ({ shared: {}, characters: {} }) as unknown as ChronicleFormData);

      await handleSeasonChange(event, container, [], mockExtract);

      const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
      expect(layoutSelect.options.length).toBe(0);
    });
  });

  describe('handleLayoutChange', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
    });

    it('should clear path when layout has no default chronicle location', async () => {
      mockGetLayout.mockResolvedValue({ id: 'layout-1' });
      container.innerHTML = `
        <select id="layout"><option value="layout-1" selected>Layout 1</option></select>
        <input id="blankChroniclePath" value="old/path.pdf" />
        <div id="chroniclePathGroup"></div>
      `;
      const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: layoutSelect });
      const mockExtract = jest.fn(() => ({ shared: {}, characters: {} }) as unknown as ChronicleFormData);

      await handleLayoutChange(event, container, [], mockExtract);

      const pathInput = container.querySelector('#blankChroniclePath') as HTMLInputElement;
      expect(pathInput.value).toBe('');
    });

    it('should set path when layout has accessible default chronicle location', async () => {
      mockGetLayout.mockResolvedValue({
        id: 'layout-2',
        defaultChronicleLocation: '/default/chronicle.pdf',
      });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      container.innerHTML = `
        <select id="layout"><option value="layout-2" selected>Layout 2</option></select>
        <input id="blankChroniclePath" value="" />
        <div id="chroniclePathGroup"></div>
      `;
      const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: layoutSelect });
      const mockExtract = jest.fn(() => ({ shared: {}, characters: {} }) as unknown as ChronicleFormData);

      await handleLayoutChange(event, container, [], mockExtract);

      const pathInput = container.querySelector('#blankChroniclePath') as HTMLInputElement;
      expect(pathInput.value).toBe('/default/chronicle.pdf');
    });

    it('should clear path when default chronicle location is not accessible', async () => {
      mockGetLayout.mockResolvedValue({
        id: 'layout-3',
        defaultChronicleLocation: '/missing/chronicle.pdf',
      });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      container.innerHTML = `
        <select id="layout"><option value="layout-3" selected>Layout 3</option></select>
        <input id="blankChroniclePath" value="old.pdf" />
        <div id="chroniclePathGroup"></div>
      `;
      const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: layoutSelect });
      const mockExtract = jest.fn(() => ({ shared: {}, characters: {} }) as unknown as ChronicleFormData);

      await handleLayoutChange(event, container, [], mockExtract);

      const pathInput = container.querySelector('#blankChroniclePath') as HTMLInputElement;
      expect(pathInput.value).toBe('');
    });
  });

  describe('saveFormData', () => {
    it('should save form data successfully', async () => {
      await saveFormData(container, []);
      expect(mockSavePartyChronicleData).toHaveBeenCalled();
    });

    it('should warn user when auto-save fails', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSavePartyChronicleData.mockRejectedValueOnce(new Error('Save failed'));

      await saveFormData(container, []);

      expect(spy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Auto-save failed:',
        expect.any(Error)
      );
      expect((ui as any).notifications.warn).toHaveBeenCalledWith(
        'Failed to auto-save chronicle data'
      );
      spy.mockRestore();
    });
  });

  describe('updateChroniclePathVisibility', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
    });

    it('should show field when file does not exist', async () => {
      container.innerHTML = '<div id="chroniclePathGroup"></div>';
      await updateChroniclePathVisibility('/missing.pdf', container);
      const group = container.querySelector('#chroniclePathGroup') as HTMLElement;
      expect(group.classList.contains('chronicle-path-visible')).toBe(true);
    });

    it('should show field when path is empty', async () => {
      container.innerHTML = '<div id="chroniclePathGroup"></div>';
      await updateChroniclePathVisibility('', container);
      const group = container.querySelector('#chroniclePathGroup') as HTMLElement;
      expect(group.classList.contains('chronicle-path-visible')).toBe(true);
    });

    it('should hide field when layout has default and file exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      mockGetLayout.mockResolvedValue({
        id: 'layout-1',
        defaultChronicleLocation: '/default.pdf',
      });
      container.innerHTML =
        '<div id="chroniclePathGroup" class="chronicle-path-visible"></div>';

      await updateChroniclePathVisibility('/default.pdf', container, 'layout-1');

      const group = container.querySelector('#chroniclePathGroup') as HTMLElement;
      expect(group.classList.contains('chronicle-path-visible')).toBe(false);
    });

    it('should show field when layout has no default even if file exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      mockGetLayout.mockResolvedValue({ id: 'layout-2' });
      container.innerHTML = '<div id="chroniclePathGroup"></div>';

      await updateChroniclePathVisibility('/some.pdf', container, 'layout-2');

      const group = container.querySelector('#chroniclePathGroup') as HTMLElement;
      expect(group.classList.contains('chronicle-path-visible')).toBe(true);
    });

    it('should handle fetch error gracefully and show field', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      container.innerHTML = '<div id="chroniclePathGroup"></div>';

      await updateChroniclePathVisibility('/error.pdf', container);

      const group = container.querySelector('#chroniclePathGroup') as HTMLElement;
      expect(group.classList.contains('chronicle-path-visible')).toBe(true);
    });
  });
});
