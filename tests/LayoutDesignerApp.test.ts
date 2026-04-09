/**
 * Unit tests for LayoutDesignerApp
 *
 * Tests context preparation, event listener attachment, dropdown
 * repopulation, auto-population of chronicle path, and form submission
 * (grid/box drawing).
 *
 * @jest-environment jsdom
 */

// --- Foundry global mocks ---

const mockSettingsGet = jest.fn();
const mockSettingsSet = jest.fn().mockResolvedValue(undefined);

(global as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class {
        element = document.createElement('div');
        _onRender() { /* base class no-op */ }
      },
      HandlebarsApplicationMixin: (base: any) => base,
    },
    apps: {
      FilePicker: {
        implementation: jest.fn(),
      },
    },
  },
  utils: {
    saveDataToFile: jest.fn(),
  },
};

(global as any).game = {
  settings: {
    get: mockSettingsGet,
    set: mockSettingsSet,
  },
};

(global as any).ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
};

// --- Module mocks ---

const mockGetSeasons = jest.fn();
const mockGetLayoutsByParent = jest.fn();
const mockGetLayout = jest.fn();

jest.mock('../scripts/LayoutStore', () => ({
  layoutStore: {
    getSeasons: (...args: unknown[]) => mockGetSeasons(...args),
    getLayoutsByParent: (...args: unknown[]) => mockGetLayoutsByParent(...args),
    getLayout: (...args: unknown[]) => mockGetLayout(...args),
  },
}));

const mockDrawGrid = jest.fn().mockResolvedValue(undefined);
const mockDrawBoxes = jest.fn().mockResolvedValue(undefined);

jest.mock('../scripts/PdfGenerator', () => ({
  PdfGenerator: jest.fn().mockImplementation(() => ({
    drawGrid: mockDrawGrid,
    drawBoxes: mockDrawBoxes,
  })),
}));

const mockPdfDocSave = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));

jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn().mockResolvedValue({
      save: mockPdfDocSave,
    }),
  },
}));


import { LayoutDesignerApp } from '../scripts/LayoutDesignerApp';
import { PdfGenerator } from '../scripts/PdfGenerator';
import { Layout } from '../scripts/model/layout';

// --- Test helpers ---

const SEASONS = [
  { id: 'pfs2-season6', name: 'Season 6' },
  { id: 'pfs2-season7', name: 'Season 7' },
];

const LAYOUTS_SEASON7 = [
  { id: 'layout-a', description: 'Layout A' },
  { id: 'layout-b', description: 'Layout B' },
];

const LAYOUTS_SEASON6 = [
  { id: 'layout-c', description: 'Layout C' },
];

function createMockLayout(overrides: Partial<Layout> = {}): Layout {
  return {
    id: 'layout-a',
    description: 'Layout A',
    canvas: { main: { x: 0, y: 0, x2: 100, y2: 100 } },
    content: [{ type: 'text', value: 'hello' }],
    ...overrides,
  };
}

/** Configures settings.get to return the given season, layout, and path. */
function setupSettings(season: string, layout: string, pdfPath = '/blank.pdf'): void {
  mockSettingsGet.mockImplementation((_module: string, key: string) => {
    const values: Record<string, string> = {
      season,
      layout,
      blankChroniclePath: pdfPath,
    };
    return values[key] ?? '';
  });
}

/** Configures layoutStore mocks for the standard two-season setup. */
function setupStandardLayoutStore(): void {
  mockGetSeasons.mockReturnValue(SEASONS);
  mockGetLayoutsByParent.mockImplementation((seasonId: string) => {
    if (seasonId === 'pfs2-season7') return LAYOUTS_SEASON7;
    if (seasonId === 'pfs2-season6') return LAYOUTS_SEASON6;
    return [];
  });
  mockGetLayout.mockResolvedValue(createMockLayout());
}

/** Builds a minimal DOM matching the layout-designer template. */
function buildDesignerDom(): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = `
    <select id="season"></select>
    <select id="layout"></select>
    <select id="canvas"></select>
    <input id="pdf-file" type="text" name="pdfFile" value="/blank.pdf" />
    <input type="checkbox" name="drawBoxes" />
    <input type="checkbox" name="drawGrid" />
    <button type="button" class="file-picker-button"></button>
  `;
  return form;
}

/** Sets the app's element property (read-only in Foundry, writable on our mock). */
function setAppElement(target: LayoutDesignerApp, element: HTMLElement): void {
  Object.defineProperty(target, 'element', { value: element, writable: true, configurable: true });
}

// --- Tests ---

describe('LayoutDesignerApp', () => {
  let app: LayoutDesignerApp;

  beforeEach(() => {
    jest.clearAllMocks();
    setupStandardLayoutStore();
    setupSettings('pfs2-season7', 'layout-a');
    app = new LayoutDesignerApp();
  });

  describe('_prepareContext', () => {
    it('returns seasons, selected season, layouts, selected layout, canvases, and pdfPath', async () => {
      const context = await app._prepareContext() as any;

      expect(context.seasons).toEqual(SEASONS);
      expect(context.selectedSeasonId).toBe('pfs2-season7');
      expect(context.layoutsInSeason).toEqual(LAYOUTS_SEASON7);
      expect(context.selectedLayoutId).toBe('layout-a');
      expect(context.canvases).toEqual(['main']);
      expect(context.pdfPath).toBe('/blank.pdf');
    });

    it('adjusts season when saved layout belongs to a different season', async () => {
      setupSettings('pfs2-season7', 'layout-c');

      const context = await app._prepareContext() as any;

      // layout-c belongs to season6, so season should adjust
      expect(context.selectedSeasonId).toBe('pfs2-season6');
      expect(context.layoutsInSeason).toEqual(LAYOUTS_SEASON6);
    });

    it('falls back to first layout when saved layout is not in the season', async () => {
      setupSettings('pfs2-season7', 'nonexistent-layout');

      const context = await app._prepareContext() as any;

      expect(context.selectedLayoutId).toBe('layout-a');
    });

    it('falls back to first season when no season is saved', async () => {
      setupSettings('', '');

      const context = await app._prepareContext() as any;

      expect(context.selectedSeasonId).toBe('pfs2-season6');
    });

    it('returns empty canvases when no layout is resolved', async () => {
      mockGetLayoutsByParent.mockReturnValue([]);
      setupSettings('pfs2-season7', '');

      const context = await app._prepareContext() as any;

      expect(context.selectedLayoutId).toBeUndefined();
      expect(context.canvases).toEqual([]);
    });

    it('returns empty canvases when layout has no canvas property', async () => {
      mockGetLayout.mockResolvedValue(createMockLayout({ canvas: undefined }));

      const context = await app._prepareContext() as any;

      expect(context.canvases).toEqual([]);
    });
  });

  describe('_onRender', () => {
    it('attaches change listeners to season and layout dropdowns and click to file picker', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const seasonSelect = form.querySelector('#season') as HTMLSelectElement;
      const layoutSelect = form.querySelector('#layout') as HTMLSelectElement;
      const filePickerButton = form.querySelector('.file-picker-button') as HTMLButtonElement;

      const seasonSpy = jest.spyOn(seasonSelect, 'addEventListener');
      const layoutSpy = jest.spyOn(layoutSelect, 'addEventListener');
      const filePickerSpy = jest.spyOn(filePickerButton, 'addEventListener');

      await app._onRender({}, {});

      expect(seasonSpy).toHaveBeenCalledWith('change', expect.any(Function));
      expect(layoutSpy).toHaveBeenCalledWith('change', expect.any(Function));
      expect(filePickerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('handleSeasonChanged', () => {
    it('persists the new season and repopulates the layout dropdown', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const layoutDropdown = form.querySelector('#layout') as HTMLSelectElement;

      // Simulate selecting season 7
      const event = { target: { value: 'pfs2-season7' } } as unknown as Event;
      await (app as any).handleSeasonChanged(event);

      expect(mockSettingsSet).toHaveBeenCalledWith('pfs-chronicle-generator', 'season', 'pfs2-season7');

      // Layout dropdown should have options for season 7
      const options = layoutDropdown.querySelectorAll('option');
      expect(options).toHaveLength(2);
      expect(options[0].value).toBe('layout-a');
      expect(options[1].value).toBe('layout-b');
    });

    it('clears canvas dropdown when season has no layouts', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      mockGetLayoutsByParent.mockReturnValue([]);

      const event = { target: { value: 'empty-season' } } as unknown as Event;
      await (app as any).handleSeasonChanged(event);

      const canvasDropdown = form.querySelector('#canvas') as HTMLSelectElement;
      expect(canvasDropdown.querySelectorAll('option')).toHaveLength(0);
    });

    it('triggers handleLayoutChanged for the first layout in the new season', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const layoutChangedSpy = jest.spyOn(app as any, 'handleLayoutChanged');

      const event = { target: { value: 'pfs2-season7' } } as unknown as Event;
      await (app as any).handleSeasonChanged(event);

      expect(layoutChangedSpy).toHaveBeenCalled();
      layoutChangedSpy.mockRestore();
    });
  });

  describe('handleLayoutChanged', () => {
    it('persists the new layout and repopulates the canvas dropdown', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const layout = createMockLayout({
        canvas: {
          main: { x: 0, y: 0, x2: 100, y2: 100 },
          detail: { x: 10, y: 10, x2: 50, y2: 50 },
        },
      });
      mockGetLayout.mockResolvedValue(layout);

      const event = { target: { value: 'layout-a' } } as unknown as Event;
      await (app as any).handleLayoutChanged(event);

      expect(mockSettingsSet).toHaveBeenCalledWith('pfs-chronicle-generator', 'layout', 'layout-a');

      const canvasDropdown = form.querySelector('#canvas') as HTMLSelectElement;
      const options = canvasDropdown.querySelectorAll('option');
      expect(options).toHaveLength(2);
      expect(options[0].value).toBe('main');
      expect(options[1].value).toBe('detail');
    });

    it('auto-populates chronicle path when layout has accessible defaultChronicleLocation', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const layout = createMockLayout({
        defaultChronicleLocation: '/chronicles/default.pdf',
      });
      mockGetLayout.mockResolvedValue(layout);

      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const event = { target: { value: 'layout-a' } } as unknown as Event;
      await (app as any).handleLayoutChanged(event);

      expect(global.fetch).toHaveBeenCalledWith('/chronicles/default.pdf', { method: 'HEAD' });
      expect(mockSettingsSet).toHaveBeenCalledWith(
        'pfs-chronicle-generator', 'blankChroniclePath', '/chronicles/default.pdf'
      );

      const pdfInput = form.querySelector('#pdf-file') as HTMLInputElement;
      expect(pdfInput.value).toBe('/chronicles/default.pdf');
    });

    it('does not auto-populate when defaultChronicleLocation is not accessible', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const layout = createMockLayout({
        defaultChronicleLocation: '/chronicles/missing.pdf',
      });
      mockGetLayout.mockResolvedValue(layout);

      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      const event = { target: { value: 'layout-a' } } as unknown as Event;
      await (app as any).handleLayoutChanged(event);

      // blankChroniclePath should NOT have been set to the default location
      const blankChroniclePathCalls = mockSettingsSet.mock.calls.filter(
        (call: string[]) => call[1] === 'blankChroniclePath'
      );
      expect(blankChroniclePathCalls).toHaveLength(0);
    });

    it('does not auto-populate when layout has no defaultChronicleLocation', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      mockGetLayout.mockResolvedValue(createMockLayout());

      global.fetch = jest.fn();

      const event = { target: { value: 'layout-a' } } as unknown as Event;
      await (app as any).handleLayoutChanged(event);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles fetch error gracefully during auto-populate', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const layout = createMockLayout({
        defaultChronicleLocation: '/chronicles/error.pdf',
      });
      mockGetLayout.mockResolvedValue(layout);

      // Enable debug mode so the logger emits via console.log
      mockSettingsGet.mockImplementation((_module: string, key: string) => {
        if (key === 'debugMode') return true;
        return '';
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const event = { target: { value: 'layout-a' } } as unknown as Event;
      await (app as any).handleLayoutChanged(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        'Default chronicle location not accessible: /chronicles/error.pdf'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('handleFilePicker', () => {
    it('creates a FilePicker and calls browse', async () => {
      const form = buildDesignerDom();
      setAppElement(app, form);

      const mockBrowse = jest.fn().mockResolvedValue(undefined);
      (foundry.applications.apps.FilePicker.implementation as unknown as jest.Mock).mockImplementation(
        (config: { callback: (path: string) => void }) => {
          // Simulate the user picking a file
          config.callback('/picked/file.pdf');
          return { browse: mockBrowse };
        }
      );

      await (app as any).handleFilePicker();

      expect(foundry.applications.apps.FilePicker.implementation).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'any' })
      );
      expect(mockBrowse).toHaveBeenCalled();

      // Callback should update the input and persist the setting
      const pdfInput = form.querySelector('#pdf-file') as HTMLInputElement;
      expect(pdfInput.value).toBe('/picked/file.pdf');
      expect(mockSettingsSet).toHaveBeenCalledWith(
        'pfs-chronicle-generator', 'blankChroniclePath', '/picked/file.pdf'
      );
    });
  });

  describe('#handleFormSubmit (static)', () => {
    let form: HTMLFormElement;
    let formHandler: (event: Event, form: HTMLFormElement) => Promise<void>;

    beforeEach(() => {
      form = buildDesignerDom();
      // Set values that the handler reads
      (form.querySelector('input[name="pdfFile"]') as HTMLInputElement).value = '/blank.pdf';

      const layoutSelect = form.querySelector('#layout') as HTMLSelectElement;
      const option = document.createElement('option');
      option.value = 'layout-a';
      layoutSelect.appendChild(option);
      layoutSelect.value = 'layout-a';

      const canvasSelect = form.querySelector('#canvas') as HTMLSelectElement;
      const canvasOption = document.createElement('option');
      canvasOption.value = 'main';
      canvasSelect.appendChild(canvasOption);
      canvasSelect.value = 'main';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      // Access the private static handler through DEFAULT_OPTIONS
      formHandler = (LayoutDesignerApp as any).DEFAULT_OPTIONS.form.handler;
    });

    it('shows error notification when no PDF path is provided', async () => {
      (form.querySelector('input[name="pdfFile"]') as HTMLInputElement).value = '';

      await formHandler(new Event('submit'), form);

      expect(ui.notifications?.error).toHaveBeenCalledWith('Please select a PDF file.');
    });

    it('shows error notification when PDF fetch fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      await formHandler(new Event('submit'), form);

      expect(ui.notifications?.error).toHaveBeenCalledWith('Failed to fetch the PDF file.');
    });

    it('calls drawGrid when drawGrid checkbox is checked', async () => {
      (form.querySelector('input[name="drawGrid"]') as HTMLInputElement).checked = true;
      (form.querySelector('input[name="drawBoxes"]') as HTMLInputElement).checked = false;

      await formHandler(new Event('submit'), form);

      expect(PdfGenerator).toHaveBeenCalled();
      expect(mockDrawGrid).toHaveBeenCalledWith('main');
      expect(mockDrawBoxes).not.toHaveBeenCalled();
    });

    it('calls drawBoxes when drawBoxes checkbox is checked', async () => {
      (form.querySelector('input[name="drawBoxes"]') as HTMLInputElement).checked = true;
      (form.querySelector('input[name="drawGrid"]') as HTMLInputElement).checked = false;

      const layout = createMockLayout();
      mockGetLayout.mockResolvedValue(layout);

      await formHandler(new Event('submit'), form);

      expect(mockDrawBoxes).toHaveBeenCalledWith(layout.content);
    });

    it('calls both drawGrid and drawBoxes when both are checked', async () => {
      (form.querySelector('input[name="drawGrid"]') as HTMLInputElement).checked = true;
      (form.querySelector('input[name="drawBoxes"]') as HTMLInputElement).checked = true;

      await formHandler(new Event('submit'), form);

      expect(mockDrawGrid).toHaveBeenCalledWith('main');
      expect(mockDrawBoxes).toHaveBeenCalled();
    });

    it('saves the output PDF via foundry.utils.saveDataToFile', async () => {
      (form.querySelector('input[name="drawBoxes"]') as HTMLInputElement).checked = true;

      await formHandler(new Event('submit'), form);

      expect(mockPdfDocSave).toHaveBeenCalled();
      expect(foundry.utils.saveDataToFile).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        'application/pdf',
        'layout-preview.pdf'
      );
    });
  });
});
