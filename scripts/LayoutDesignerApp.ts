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
            title: "Layout Designer",
            contentClasses: ["standard-form"],
        }
    }

    static PARTS = {
        main: {
            template: "modules/pfs-chronicle-generator/templates/layout-designer.hbs",
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    }

    async _prepareContext(): Promise<object> {
        const layouts = layoutStore.getLayouts();
        const selectedLayoutId = layouts.length > 0 ? layouts[0].id : undefined;
        const selectedLayout = selectedLayoutId ? await layoutStore.getLayout(selectedLayoutId) : undefined;
        const canvases = selectedLayout ? Object.keys(selectedLayout.canvas) : [];
        const pdfPath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');

        return {
            layouts: layouts,
            canvases: canvases,
            pdfPath: pdfPath,
            buttons: [
                { type: "submit", icon: "fas fa-cogs", label: "Generate" }
            ]
        };
    }

    async _onRender(context: any, options: any) : Promise<void>{
        super._onRender(context, options);
        const html = this.element;
        html.querySelector('#layout')?.addEventListener('change', this._onLayoutChanged.bind(this));
        html.querySelector('.file-picker-button')?.addEventListener('click', this._onFilePicker.bind(this));
    }

    async _onFilePicker(event: any) {
        const filePicker = new foundry.applications.apps.FilePicker.implementation({
            type: 'any',
            callback: (path: string) => {
                (this.element.querySelector('#pdf-file') as HTMLInputElement).value = path;
            }
        });
        await filePicker.browse();
    }

    async _onLayoutChanged(event: any) {
        const layoutId = event.target.value;
        const layout = await layoutStore.getLayout(layoutId);
        const canvases = layout ? Object.keys(layout.canvas) : [];
        
        const canvasDropdown = this.element.querySelector('#canvas') as HTMLSelectElement;
        canvasDropdown.innerHTML = '';
        for (const canvas of canvases) {
            const option = document.createElement('option');
            option.value = canvas;
            option.innerText = canvas;
            canvasDropdown.appendChild(option);
        }
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
