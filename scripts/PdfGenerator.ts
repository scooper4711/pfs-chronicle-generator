import { PDFDocument, PDFPage, rgb, StandardFonts, PDFFont, RGB } from 'pdf-lib';
import { Layout, ContentElement, Preset, Canvas } from './model/layout';

type ResolvedElement = Partial<Preset> & ContentElement;

export class PdfGenerator {
    private pdfDoc: PDFDocument;
    private layout: Layout;
    private data: any;
    private page: PDFPage;

    constructor(pdfDoc: PDFDocument, layout: Layout, data: any) {
        this.pdfDoc = pdfDoc;
        this.layout = layout;
        this.data = data;
        this.page = this.pdfDoc.getPages()[0];
    }

    public async generate() {
        if (this.layout.aspectratio) {
            const [ratioWidth, ratioHeight] = this.layout.aspectratio.split(':').map(Number);
            const { height } = this.page.getSize();
            const newWidth = (height * ratioWidth) / ratioHeight;
            this.page.setSize(newWidth, height);
        }

        for (const element of this.layout.content) {
            await this.drawElement(element);
        }
    }

    private async drawElement(element: ContentElement) {
        const props: ResolvedElement = this.resolvePresets(element);

        switch (props.type) {
            case 'text':
                await this.drawText(props);
                break;
            case 'multiline':
                await this.drawMultilineText(props);
                break;
            // TODO: Handle other element types
        }
    }

    private resolvePresets(element: ContentElement): ResolvedElement {
        let resolved: Partial<Preset & ContentElement> = {};
        if (element.presets) {
            for (const presetName of element.presets) {
                const preset = this.layout.presets[presetName];
                if (preset) {
                    const parentPresets = this.resolvePresets({ presets: preset.presets } as ContentElement);
                    resolved = { ...resolved, ...parentPresets, ...preset };
                }
            }
        }
        return { ...resolved, ...element };
    }

    private getCanvasRect(canvasName: string): { x: number, y: number, width: number, height: number } {
        const canvas = this.layout.canvas[canvasName];
        if (!canvas) {
            throw new Error(`Canvas with name ${canvasName} not found.`);
        }

        const { width: pageWidth, height: pageHeight } = this.page.getSize();

        if (canvas.parent) {
            const parentRect = this.getCanvasRect(canvas.parent);
            const x = parentRect.x + (canvas.x / 100) * parentRect.width;
            const y = parentRect.y + (canvas.y / 100) * parentRect.height; // y from top
            const width = ((canvas.x2 - canvas.x) / 100) * parentRect.width;
            const height = ((canvas.y2 - canvas.y) / 100) * parentRect.height;
            return { x, y, width, height };
        } else {
            const x = (canvas.x / 100) * pageWidth;
            const y = (canvas.y / 100) * pageHeight; // y from top
            const width = ((canvas.x2 - canvas.x) / 100) * pageWidth;
            const height = ((canvas.y2 - canvas.y) / 100) * pageHeight;
            return { x, y, width, height };
        }
    }

    private async getFont(fontName: string | undefined): Promise<PDFFont> {
        if (!fontName) {
            return this.pdfDoc.embedFont(StandardFonts.Helvetica);
        }
        const fontMap: { [key: string]: string } = {
            "helvetica": StandardFonts.Helvetica,
            "times": StandardFonts.TimesRoman,
            "courier": StandardFonts.Courier,
        };
        const font = fontMap[fontName.toLowerCase()];
        if (font) {
            return this.pdfDoc.embedFont(font);
        }
        return this.pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    private getColor(colorName: string | undefined): RGB {
        if (!colorName) {
            return rgb(0, 0, 0); // black
        }
        const colorMap: { [key: string]: RGB } = {
            "black": rgb(0, 0, 0),
            "white": rgb(1, 1, 1),
            "red": rgb(1, 0, 0),
            "green": rgb(0, 1, 0),
            "blue": rgb(0, 0, 1),
        };
        const color = colorMap[colorName.toLowerCase()];
        if (color) {
            return color;
        }
        return rgb(0, 0, 0);
    }

    private async drawText(props: ResolvedElement) {
        const value = this.resolveValue(props.value);
        if (!value) {
            return;
        }

        const { canvas, x = 0, y = 0, x2 = 0, y2 = 0, align, font, fontsize, color } = props;
        
        let canvasRect;
        if (canvas) {
            canvasRect = this.getCanvasRect(canvas);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const boxX = canvasRect.x + (x / 100) * canvasRect.width;
        const boxYFromTop = (y / 100) * canvasRect.height;
        const boxWidth = ((x2 - x) / 100) * canvasRect.width;
        const boxHeight = ((y2 - y) / 100) * canvasRect.height;

        const pdfFont = await this.getFont(font);
        const textSize = fontsize || 12;
        const textWidth = pdfFont.widthOfTextAtSize(value, textSize);
        const textHeight = pdfFont.heightAtSize(textSize);

        let textX = boxX;
        if (align && align.includes('C')) {
            textX = boxX + (boxWidth - textWidth) / 2;
        } else if (align && align.includes('R')) {
            textX = boxX + boxWidth - textWidth;
        }

        let textYFromTop = boxYFromTop + textHeight;
        if (align && align.includes('M')) {
            textYFromTop = boxYFromTop + (boxHeight + textHeight) / 2;
        } else if (align && align.includes('B')) {
            textYFromTop = boxYFromTop + boxHeight;
        }

        const finalY = this.page.getHeight() - (canvasRect.y + textYFromTop);

        this.page.drawText(value, {
            x: textX,
            y: finalY,
            font: pdfFont,
            size: textSize,
            color: this.getColor(color),
        });
    }

    private async drawMultilineText(props: ResolvedElement) {
        const value = this.resolveValue(props.value);
        if (!value) {
            return;
        }

        const { canvas, x = 0, y = 0, x2 = 0, y2 = 0, align, font, fontsize, color, lines } = props;
        
        let canvasRect;
        if (canvas) {
            canvasRect = this.getCanvasRect(canvas);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const boxX = canvasRect.x + (x / 100) * canvasRect.width;
        const boxYFromTop = (y / 100) * canvasRect.height;
        const boxWidth = ((x2 - x) / 100) * canvasRect.width;
        const boxHeight = ((y2 - y) / 100) * canvasRect.height;

        const pdfFont = await this.getFont(font);
        const textSize = fontsize || 12;
        const textHeight = pdfFont.heightAtSize(textSize);
        const lineHeight = boxHeight / (lines || 1);

        const textLines = value.split('\n');

        for (let i = 0; i < Math.min(textLines.length, lines || textLines.length); i++) {
            const line = textLines[i];
            const textWidth = pdfFont.widthOfTextAtSize(line, textSize);

            let textX = boxX;
            if (align && align.includes('C')) {
                textX = boxX + (boxWidth - textWidth) / 2;
            } else if (align && align.includes('R')) {
                textX = boxX + boxWidth - textWidth;
            }

            const lineYFromTop = boxYFromTop + (i * lineHeight) + textHeight;
            
            const finalY = this.page.getHeight() - (canvasRect.y + lineYFromTop);

            this.page.drawText(line, {
                x: textX,
                y: finalY,
                font: pdfFont,
                size: textSize,
                color: this.getColor(color),
            });
        }
    }

    private resolveValue(value: string | undefined): string | undefined {
        if (!value) {
            return undefined;
        }
        if (value.startsWith('param:')) {
            const paramName = value.substring(6);
            return this.data[paramName];
        }
        return value;
    }
}
