/**
 * Layout Designer Application
 *
 * Foundry VTT ApplicationV2 dialog that helps layout authors fine-tune
 * chronicle layout JSON files. It provides two visual debugging tools:
 *
 * - Draw Boxes: shades the bounding boxes of all content elements defined
 *   in the layout, making it easy to verify positioning.
 * - Draw Grid: overlays a percentage grid onto a selected canvas region,
 *   helping authors read coordinates for new content entries.
 *
 * The dialog also lets the user select a season, layout, and blank
 * chronicle PDF. These selections are persisted to Foundry world settings
 * on every change (no explicit save step needed) and serve as defaults
 * for the party chronicle form.
 */

import { layoutStore } from './LayoutStore.js';
import { PdfGenerator } from './PdfGenerator.js';
import { Layout } from './model/layout.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;


export class LayoutDesignerApp extends HandlebarsApplicationMixin(ApplicationV2) {

  static readonly DEFAULT_OPTIONS = {
    id: 'pfs-layout-designer',
    form: {
      handler: LayoutDesignerApp.#handleFormSubmit,
      closeOnSubmit: false,
    },
    tag: 'form',
    window: {
      title: 'Design Layout',
      contentClasses: ['standard-form', 'pfs-layout-designer'],
    },
  };

  static readonly PARTS = {
    main: {
      template: 'modules/pfs-chronicle-generator/templates/layout-designer.hbs',
    },
  };

  /**
   * Prepares the template context for the layout designer dialog.
   *
   * Resolves the currently selected season and layout from Foundry settings,
   * adjusting the season if the saved layout belongs to a different one.
   * Returns season/layout lists, canvas names, and the blank chronicle path.
   */
  async _prepareContext(): Promise<object> {
    const seasons = layoutStore.getSeasons();

    const settingSeasonId = game.settings.get('pfs-chronicle-generator', 'season') as string;
    const currentLayoutId = game.settings.get('pfs-chronicle-generator', 'layout') as string;

    let selectedSeasonId = settingSeasonId || (seasons.length > 0 ? seasons[0].id : '');
    let selectedLayoutId = currentLayoutId || '';

    // If a layout is set but doesn't belong to the selected season, adjust season
    if (selectedLayoutId) {
      const seasonWithLayout = seasons.find(season =>
        layoutStore.getLayoutsByParent(season.id).some(entry => entry.id === selectedLayoutId)
      );
      if (seasonWithLayout) selectedSeasonId = seasonWithLayout.id;
    }

    const layoutsInSeason = layoutStore.getLayoutsByParent(selectedSeasonId);

    // If current layout isn't in the season, fall back to first layout
    const effectiveLayoutId = layoutsInSeason.some(entry => entry.id === selectedLayoutId)
      ? selectedLayoutId
      : (layoutsInSeason.length > 0 ? layoutsInSeason[0].id : undefined);

    const selectedLayout = effectiveLayoutId
      ? await layoutStore.getLayout(effectiveLayoutId)
      : undefined;
    const canvases = selectedLayout?.canvas ? Object.keys(selectedLayout.canvas) : [];
    const pdfPath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath') as string;

    return {
      seasons,
      selectedSeasonId,
      layoutsInSeason,
      selectedLayoutId: effectiveLayoutId,
      canvases,
      pdfPath,
    };
  }

  /**
   * Attaches DOM event listeners after the dialog renders.
   */
  async _onRender(context: object, options: Record<string, unknown>): Promise<void> {
    super._onRender(context, options);
    const html = this.element;
    html.querySelector('#season')?.addEventListener('change', this.handleSeasonChanged.bind(this));
    html.querySelector('#layout')?.addEventListener('change', this.handleLayoutChanged.bind(this));
    html.querySelector('.file-picker-button')?.addEventListener('click', this.handleFilePicker.bind(this));
  }

  /**
   * Handles season dropdown changes.
   *
   * Persists the new season, repopulates the layout dropdown with layouts
   * for that season, and triggers a layout change for the first entry.
   */
  private async handleSeasonChanged(event: Event): Promise<void> {
    const selectElement = event.target as HTMLSelectElement;
    const seasonId = selectElement.value;
    await game.settings.set('pfs-chronicle-generator', 'season', seasonId);
    const layouts = layoutStore.getLayoutsByParent(seasonId);

    const layoutDropdown = this.element.querySelector('#layout') as HTMLSelectElement;
    layoutDropdown.innerHTML = '';
    for (const layout of layouts) {
      const option = document.createElement('option');
      option.value = layout.id;
      option.innerText = layout.description;
      layoutDropdown.appendChild(option);
    }

    if (layouts.length > 0) {
      layoutDropdown.value = layouts[0].id;
      this.handleLayoutChanged({ target: layoutDropdown } as unknown as Event);
    } else {
      const canvasDropdown = this.element.querySelector('#canvas') as HTMLSelectElement;
      canvasDropdown.innerHTML = '';
    }
  }

  /**
   * Opens the Foundry file picker for selecting a blank chronicle PDF.
   */
  private async handleFilePicker(): Promise<void> {
    const filePicker = new foundry.applications.apps.FilePicker.implementation({
      type: 'any',
      callback: (path: string) => {
        (this.element.querySelector('#pdf-file') as HTMLInputElement).value = path;
        game.settings.set('pfs-chronicle-generator', 'blankChroniclePath', path);
      },
    });
    await filePicker.browse();
  }

  /**
   * Handles layout dropdown changes.
   *
   * Persists the new layout, repopulates the canvas dropdown, and
   * auto-populates the blank chronicle path if the layout provides a
   * defaultChronicleLocation that is accessible.
   */
  private async handleLayoutChanged(event: Event): Promise<void> {
    const selectElement = event.target as HTMLSelectElement;
    const layoutId = selectElement.value;
    await game.settings.set('pfs-chronicle-generator', 'layout', layoutId);
    const layout = await layoutStore.getLayout(layoutId);

    this.repopulateCanvasDropdown(layout);
    await this.autoPopulateChroniclePath(layout);
  }

  /**
   * Repopulates the canvas dropdown from the given layout's canvas keys.
   */
  private repopulateCanvasDropdown(layout: Layout): void {
    const canvases = layout?.canvas ? Object.keys(layout.canvas) : [];
    const canvasDropdown = this.element.querySelector('#canvas') as HTMLSelectElement;
    canvasDropdown.innerHTML = '';
    for (const canvas of canvases) {
      const option = document.createElement('option');
      option.value = canvas;
      option.innerText = canvas;
      canvasDropdown.appendChild(option);
    }
  }

  /**
   * Auto-populates the blank chronicle path input if the layout has a
   * defaultChronicleLocation and the file is accessible via HEAD request.
   */
  private async autoPopulateChroniclePath(layout: Layout): Promise<void> {
    if (!layout?.defaultChronicleLocation) return;

    try {
      const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
      if (!response.ok) return;

      await game.settings.set('pfs-chronicle-generator', 'blankChroniclePath', layout.defaultChronicleLocation);
      const pdfFileInput = this.element.querySelector('#pdf-file') as HTMLInputElement;
      if (pdfFileInput) {
        pdfFileInput.value = layout.defaultChronicleLocation;
      }
    } catch {
      console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
    }
  }

  /**
   * Handles form submission for the layout preview (grid/box drawing).
   *
   * Loads the blank PDF, applies grid and/or bounding box overlays using
   * PdfGenerator, and saves the result as a downloadable PDF.
   */
  static async #handleFormSubmit(event: Event, form: HTMLFormElement): Promise<void> {
    const pdfPath = (form.elements.namedItem('pdfFile') as HTMLInputElement).value;
    const layoutId = (form.elements.namedItem('layout') as HTMLSelectElement).value;
    const drawBoxes = (form.elements.namedItem('drawBoxes') as HTMLInputElement).checked;
    const drawGrid = (form.elements.namedItem('drawGrid') as HTMLInputElement).checked;
    const canvasName = (form.elements.namedItem('canvas') as HTMLSelectElement).value;

    if (!pdfPath) {
      ui.notifications?.error('Please select a PDF file.');
      return;
    }

    const response = await fetch(pdfPath);
    if (!response.ok) {
      ui.notifications?.error('Failed to fetch the PDF file.');
      return;
    }

    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const layout = await layoutStore.getLayout(layoutId);

    const generator = new PdfGenerator(pdfDoc, layout, {});

    if (drawGrid && canvasName) {
      await generator.drawGrid(canvasName);
    }

    if (drawBoxes) {
      await generator.drawBoxes(layout.content);
    }

    const outputPdfBytes = await pdfDoc.save();
    foundry.utils.saveDataToFile(outputPdfBytes as unknown as string, 'application/pdf', 'layout-preview.pdf');
  }
}
