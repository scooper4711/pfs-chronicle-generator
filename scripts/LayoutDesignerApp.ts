import { layoutStore } from './LayoutStore.js';
import { PdfGenerator } from './PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;

export class LayoutDesignerApp extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "pfs-layout-designer",
        form: {
            handler: LayoutDesignerApp.#handleFormSubmit,
            closeOnSubmit: false,
        },
        tag: "form",
        window: {
            title: "Select Layout",
            contentClasses: ["standard-form", "pfs-layout-designer"],
        }
    }

    static PARTS = {
        main: {
            template: "modules/pfs-chronicle-generator/templates/layout-designer.hbs",
        }
    }

    async _prepareContext(): Promise<object> {
        const seasons = layoutStore.getSeasons();
        
        // Determine selected season and layout from settings
        const settingSeasonId = game.settings.get('pfs-chronicle-generator', 'season') as string;
        const currentLayoutId = game.settings.get('pfs-chronicle-generator', 'layout') as string;
        
        let selectedSeasonId = settingSeasonId || (seasons.length > 0 ? seasons[0].id : '');
        let selectedLayoutId = currentLayoutId || '';
        
        // If a layout is set but doesn't belong to the selected season, adjust season accordingly
        if (selectedLayoutId) {
            const seasonWithLayout = seasons.find(season => 
                layoutStore.getLayoutsByParent(season.id).some(layout => layout.id === selectedLayoutId)
            );
            if (seasonWithLayout) selectedSeasonId = seasonWithLayout.id;
        }
        
        // Get layouts for the selected season
        const layoutsInSeason = layoutStore.getLayoutsByParent(selectedSeasonId);
        
        // If current layout isn't in the season, select first layout in season
        const effectiveLayoutId = layoutsInSeason.some(l => l.id === selectedLayoutId) 
            ? selectedLayoutId 
            : (layoutsInSeason.length > 0 ? layoutsInSeason[0].id : undefined);
            
        const selectedLayout = effectiveLayoutId ? await layoutStore.getLayout(effectiveLayoutId) : undefined;
        const canvases = selectedLayout?.canvas ? Object.keys(selectedLayout.canvas) : [];
    const pdfPath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');

        return {
            seasons,
            selectedSeasonId,
            layoutsInSeason,
            selectedLayoutId: effectiveLayoutId,
            canvases,
            pdfPath,
            // Buttons rendered inside template
        };
    }

    async _onRender(context: any, options: any) : Promise<void>{
        super._onRender(context, options);
        const html = this.element;
        html.querySelector('#season')?.addEventListener('change', this._onSeasonChanged.bind(this));
        html.querySelector('#layout')?.addEventListener('change', this._onLayoutChanged.bind(this));
        html.querySelector('.file-picker-button')?.addEventListener('click', this._onFilePicker.bind(this));
        html.querySelector('#save-selection')?.addEventListener('click', this._onSaveSelection.bind(this));
    }

    async _onSeasonChanged(event: any) {
        const seasonId = event.target.value;
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
            // Trigger layout changed event with first layout
            layoutDropdown.value = layouts[0].id;
            this._onLayoutChanged({ target: layoutDropdown });
        } else {
            // Clear canvas dropdown if no layouts
            const canvasDropdown = this.element.querySelector('#canvas') as HTMLSelectElement;
            canvasDropdown.innerHTML = '';
        }
    }

    async _onFilePicker(event: any) {
        const filePicker = new foundry.applications.apps.FilePicker.implementation({
            type: 'any',
            callback: (path: string) => {
                (this.element.querySelector('#pdf-file') as HTMLInputElement).value = path;
                game.settings.set('pfs-chronicle-generator', 'blankChroniclePath', path);
            }
        });
        await filePicker.browse();
    }

    async _onLayoutChanged(event: any) {
        const layoutId = event.target.value;
        await game.settings.set('pfs-chronicle-generator', 'layout', layoutId);
        const layout = await layoutStore.getLayout(layoutId);
        const canvases = layout?.canvas ? Object.keys(layout.canvas) : [];
        
        const canvasDropdown = this.element.querySelector('#canvas') as HTMLSelectElement;
        canvasDropdown.innerHTML = '';
        for (const canvas of canvases) {
            const option = document.createElement('option');
            option.value = canvas;
            option.innerText = canvas;
            canvasDropdown.appendChild(option);
        }
        
        // Auto-populate blank chronicle path if defaultChronicleLocation exists and file is accessible
        if (layout?.defaultChronicleLocation) {
            try {
                const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
                if (response.ok) {
                    await game.settings.set('pfs-chronicle-generator', 'blankChroniclePath', layout.defaultChronicleLocation);
                    const pdfFileInput = this.element.querySelector('#pdf-file') as HTMLInputElement;
                    if (pdfFileInput) {
                        pdfFileInput.value = layout.defaultChronicleLocation;
                    }
                }
            } catch (error) {
                // File doesn't exist or isn't accessible, don't update the setting
                console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
            }
        }
    }

    async _onSaveSelection(event: Event) {
        event.preventDefault();
        // Values have already been persisted on change; just close the window
        this.close();
    }

    static async #handleFormSubmit(event: Event, form: HTMLFormElement, formData: any) : Promise<void> {
        const pdfPath = (form.elements.namedItem('pdfFile') as HTMLInputElement).value;
        const layoutId = (form.elements.namedItem('layout') as HTMLSelectElement).value;
        const drawBoxes = (form.elements.namedItem('drawBoxes') as HTMLInputElement).checked;
        const drawGrid = (form.elements.namedItem('drawGrid') as HTMLInputElement).checked;
        const canvasName = (form.elements.namedItem('canvas') as HTMLSelectElement).value;

        if (!pdfPath) {
            ui.notifications?.error("Please select a PDF file.");
            return;
        }

        const response = await fetch(pdfPath);
        if (!response.ok) {
            ui.notifications?.error("Failed to fetch the PDF file.");
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
        foundry.utils.saveDataToFile(outputPdfBytes as any, "application/pdf", "layout-preview.pdf");
    }
}
