import { PDFDocument, PDFPage, rgb, StandardFonts, PDFFont, RGB, degrees } from 'pdf-lib';
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

    public async drawGrid(canvasName: string) {
        const canvasRect = this.getCanvasRect(canvasName);
        const { x, y, width, height } = canvasRect;

        let spacing = 1;
        if (width < 200 || height < 200) {
            spacing = 5;
        }
        if (width < 100 || height < 100) {
            spacing = 10;
        }
        if (width < 50 || height < 50) {
            spacing = 20;
        }

        const pageHeight = this.page.getHeight();
        const font = await this.getFont('helvetica');
        const fontSize = 5;

        // Draw vertical lines
        for (let i = spacing; i < 100; i += spacing) {
            const lineX = x + (i / 100) * width;
            this.page.drawLine({
                start: { x: lineX, y: pageHeight - y },
                end: { x: lineX, y: pageHeight - (y + height) },
                thickness: i % 5 === 0 ? 0.5 : 0.1,
                color: rgb(0, 0, 1),
            });
            if (i % 5 === 0) {
                const text = String(i);
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                this.page.drawText(text, {
                    x: lineX - textWidth / 2,
                    y: pageHeight - y - 8,
                    font,
                    size: fontSize,
                    color: rgb(0, 0, 1),
                    rotate: degrees(-90),
                });
            }
        }

        // Draw horizontal lines
        for (let i = spacing; i < 100; i += spacing) {
            const lineY = y + (i / 100) * height;
            this.page.drawLine({
                start: { x, y: pageHeight - lineY },
                end: { x: x + width, y: pageHeight - lineY },
                thickness: i % 5 === 0 ? 0.5 : 0.1,
                color: rgb(0, 0, 1),
            });
            if (i % 5 === 0) {
                const text = String(i);
                this.page.drawText(text, {
                    x: x + 2,
                    y: pageHeight - lineY - (fontSize / 2),
                    font,
                    size: fontSize,
                    color: rgb(0, 0, 1),
                });
            }
        }
    }

    public async drawBoxes(contentToHighlight?: string | ContentElement[]) {
        if (contentToHighlight) {
            if (typeof contentToHighlight === 'string') {
                const element = this.findContentElement(this.layout.content, contentToHighlight);
                if (element) {
                    await this.highlightContentElement(element);
                }
            } else {
                const allElements = this.getAllContentElements(contentToHighlight);
                for (const element of allElements) {
                    await this.highlightContentElement(element);
                }
            }
        }
    }

    private async highlightContentElement(element: ContentElement) {
        const props = this.resolvePresets(element);
        const pageHeight = this.page.getHeight();
        const font = await this.getFont('helvetica');
        if (!props.canvas) return;

        const elementCanvasRect = this.getCanvasRect(props.canvas);
        const x = props.x || 0;
        const y = props.y || 0;

        let boxX, boxY, boxWidth, boxHeight;

        if (props.type === 'choice') {
            const size = props.size || 0;
            const linewidth = props.linewidth || 1;
            boxX = elementCanvasRect.x + (x / 100) * elementCanvasRect.width;
            boxY = elementCanvasRect.y + (y / 100) * elementCanvasRect.height;
            boxWidth = (size / 100) * elementCanvasRect.width;
            boxHeight = linewidth;
        } else {
            const x2 = props.x2 || 0;
            const y2 = props.y2 || 0;
            boxX = elementCanvasRect.x + (x / 100) * elementCanvasRect.width;
            boxY = elementCanvasRect.y + (y / 100) * elementCanvasRect.height;
            boxWidth = ((x2 - x) / 100) * elementCanvasRect.width;
            boxHeight = ((y2 - y) / 100) * elementCanvasRect.height;
        }

        this.page.drawRectangle({
            x: boxX,
            y: pageHeight - boxY - boxHeight,
            width: boxWidth,
            height: boxHeight,
            color: rgb(1, 0.71, 0.76),
            opacity: 0.5,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
        });

        const text = element.value || '';
        const textWidth = font.widthOfTextAtSize(text, 8);
        this.page.drawText(text, {
            x: boxX + (boxWidth - textWidth) / 2,
            y: pageHeight - boxY - boxHeight + (boxHeight - 8) / 2,
            font,
            size: 8,
            color: rgb(0, 0, 0),
        });
    }

    private getAllContentElements(elements: ContentElement[] | Record<string, ContentElement[]>): ContentElement[] {
        let allElements: ContentElement[] = [];
        if (Array.isArray(elements)) {
            for (const element of elements) {
                if (element.value || element.type) {
                    allElements.push(element);
                }
                if (element.content) {
                    allElements = allElements.concat(this.getAllContentElements(element.content));
                }
            }
        } else if (typeof elements === 'object') {
            for (const key in elements) {
                allElements = allElements.concat(this.getAllContentElements(elements[key]));
            }
        }
        return allElements;
    }

    private findContentElement(elements: ContentElement[] | Record<string, ContentElement[]>, name: string): ContentElement | undefined {
        if (Array.isArray(elements)) {
            for (const element of elements) {
                if (element.value === name) {
                    return element;
                }
                if (element.content) {
                    const found = this.findContentElement(element.content, name);
                    if (found) {
                        return found;
                    }
                }
            }
        } else if (typeof elements === 'object') {
            for (const key in elements) {
                const found = this.findContentElement(elements[key], name);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
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
            case 'trigger':
                if (props.trigger && this.data[props.trigger.substring(6)]) {
                    if (Array.isArray(props.content)) {
                        for (const contentElement of props.content) {
                            await this.drawElement(contentElement);
                        }
                    } else if (typeof props.content === 'object') {
                        for (const key in props.content) {
                            const contentElements = (props.content as Record<string, ContentElement[]>)[key];
                            for (const contentElement of contentElements) {
                                await this.drawElement(contentElement);
                            }
                        }
                    }
                }
                break;
            case 'choice':
                if (props.choices && props.content && typeof props.content === 'object' && !Array.isArray(props.content)) {
                    const choices = this.resolveValue(props.choices as string)?.split(',') || [];
                    for (const choice of choices) {
                        const contentElements = (props.content as Record<string, ContentElement[]>)[choice];
                        if (contentElements) {
                            for (const contentElement of contentElements) {
                                await this.drawElement(contentElement);
                            }
                        }
                    }
                }
                break;
            case 'strikeout':
                await this.drawRedaction(props);
                break;
            case 'line':
                await this.drawLineElement(props);
                break;
            // TODO: Handle other element types
        }
    }

    private async drawLineElement(props: ResolvedElement) {
        const { canvas, x = 0, y = 0, x2 = 0, linewidth = 1, color } = props;

        let canvasRect;
        if (canvas) {
            canvasRect = this.getCanvasRect(canvas);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const startX = canvasRect.x + (x / 100) * canvasRect.width;
        const endX = canvasRect.x + (x2 / 100) * canvasRect.width;
        let startY = this.page.getHeight() - (canvasRect.y + (y / 100) * canvasRect.height);

        startY -= linewidth / 2;

        this.page.drawLine({
            start: { x: startX, y: startY },
            end: { x: endX, y: startY },
            thickness: linewidth,
            color: this.getColor(color),
        });
    }

    private async drawRedaction(props: ResolvedElement) {
        const { canvas, x = 0, y = 0, x2 = 0, y2 = 0, color } = props;

        let canvasRect;
        if (canvas) {
            canvasRect = this.getCanvasRect(canvas);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const rectX = canvasRect.x + (x / 100) * canvasRect.width;
        const rectY = this.page.getHeight() - (canvasRect.y + (y2 / 100) * canvasRect.height);
        const rectWidth = ((x2 - x) / 100) * canvasRect.width;
        const rectHeight = ((y2 - y) / 100) * canvasRect.height;

        this.page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            color: this.getColor(color),
        });

        const xSize = Math.min(rectWidth, rectHeight);
        const numX = Math.ceil(rectWidth / xSize);

        for (let i = 0; i < numX; i++) {
            const currentX = rectX + i * xSize;
            this.page.drawLine({
                start: { x: currentX, y: rectY },
                end: { x: currentX + xSize, y: rectY + rectHeight },
                thickness: 1,
                color: rgb(1, 1, 1),
            });
            this.page.drawLine({
                start: { x: currentX, y: rectY + rectHeight },
                end: { x: currentX + xSize, y: rectY },
                thickness: 1,
                color: rgb(1, 1, 1),
            });
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

    private async getFont(fontName: string | undefined, fontWeight: 'normal' | 'bold' = 'normal', fontStyle: 'normal' | 'italic' = 'normal'): Promise<PDFFont> {
        const font = fontName?.toLowerCase() || 'helvetica';
        
        if (font.startsWith('noto') || font.startsWith('eczar') || font.startsWith('gelasio') || font.startsWith('roboto') || font.startsWith('tauri')) {
            let fontUrl = '';
            switch (font) {
                case 'noto sans':
                case 'noto':
                    fontUrl = `https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff`;
                    break;
                case 'eczar':
                    fontUrl = `https://cdn.jsdelivr.net/npm/@fontsource/eczar/files/eczar-latin-400-normal.woff`;
                    break;
                case 'gelasio':
                    fontUrl = `https://cdn.jsdelivr.net/npm/@fontsource/gelasio/files/gelasio-latin-400-normal.woff`;
                    break;
                case 'roboto condensed':
                case 'roboto':
                    fontUrl = `https://cdn.jsdelivr.net/npm/@fontsource/roboto-condensed/files/roboto-condensed-latin-400-normal.woff`;
                    break;
                case 'tauri':
                    fontUrl = `https://cdn.jsdelivr.net/npm/@fontsource/tauri/files/tauri-latin-400-normal.woff`;
                    break;
            }
            const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
            return this.pdfDoc.embedFont(fontBytes);
        }

        let finalFont: string = StandardFonts.Helvetica;

        if (font === 'helvetica') {
            if (fontWeight === 'bold' && fontStyle === 'italic') {
                finalFont = StandardFonts.HelveticaBoldOblique;
            } else if (fontWeight === 'bold') {
                finalFont = StandardFonts.HelveticaBold;
            } else if (fontStyle === 'italic') {
                finalFont = StandardFonts.HelveticaOblique;
            }
        } else if (font === 'times') {
            if (fontWeight === 'bold' && fontStyle === 'italic') {
                finalFont = StandardFonts.TimesRomanBoldItalic;
            } else if (fontWeight === 'bold') {
                finalFont = StandardFonts.TimesRomanBold;
            } else if (fontStyle === 'italic') {
                finalFont = StandardFonts.TimesRomanItalic;
            } else {
                finalFont = StandardFonts.TimesRoman;
            }
        } else if (font === 'courier') {
            if (fontWeight === 'bold' && fontStyle === 'italic') {
                finalFont = StandardFonts.CourierBoldOblique;
            } else if (fontWeight === 'bold') {
                finalFont = StandardFonts.CourierBold;
            } else if (fontStyle === 'italic') {
                finalFont = StandardFonts.CourierOblique;
            } else {
                finalFont = StandardFonts.Courier;
            }
        }

        return this.pdfDoc.embedFont(finalFont);
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
            console.log("Value is undefined:", props.value, this.data);
            return;
        }

        const { canvas, x = 0, y = 0, x2 = 0, y2, align, font, fontweight, fontstyle, fontsize, color } = props;
        
        let canvasRect;
        if (canvas) {
            canvasRect = this.getCanvasRect(canvas);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const boxX = canvasRect.x + (x / 100) * canvasRect.width;
        const boxWidth = ((x2 - x) / 100) * canvasRect.width;

        const pdfFont = await this.getFont(font, fontweight, fontstyle);
        const textSize = fontsize || 12;
        const textWidth = pdfFont.widthOfTextAtSize(String(value), textSize);

        let textX = boxX;
        if (align && align.includes('C')) {
            textX = boxX + (boxWidth - textWidth) / 2;
        } else if (align && align.includes('R')) {
            textX = boxX + boxWidth - textWidth;
        }

        let finalY;
        if (y2 !== undefined) { // y2 is defined, so we have a box
            const boxYFromTop = (y / 100) * canvasRect.height;
            const boxHeight = ((y2 - y) / 100) * canvasRect.height;
            const textHeight = pdfFont.heightAtSize(textSize);
            let textYFromBaselineFromTop = boxYFromTop + textHeight; // Default to top alignment
            if (align && align.includes('M')) {
                textYFromBaselineFromTop = boxYFromTop + boxHeight / 2 + textHeight / 2;
            } else if (align && align.includes('B')) {
                textYFromBaselineFromTop = boxYFromTop + boxHeight;
            }
            finalY = this.page.getHeight() - (canvasRect.y + textYFromBaselineFromTop);
        } else { // y2 is not defined, y is the baseline
            const textYFromTop = (y / 100) * canvasRect.height;
            finalY = this.page.getHeight() - (canvasRect.y + textYFromTop);
        }

        this.page.drawText(String(value), {
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

        const { canvas, x = 0, y = 0, x2 = 0, y2 = 0, align, font, fontweight, fontstyle, fontsize, color, lines } = props;
        
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

        const pdfFont = await this.getFont(font, fontweight, fontstyle);
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
            if (paramName === 'societyid.player') {
                const societyid = this.data['societyid'];
                if (societyid && typeof societyid === 'string') {
                    const parts = societyid.split('-');
                    if (parts.length === 2) {
                        return parts[0];
                    }
                }
                return '';
            }
            if (paramName === 'societyid.char_without_first_digit') {
                const societyid = this.data['societyid'];
                if (societyid && typeof societyid === 'string') {
                    const parts = societyid.split('-');
                    if (parts.length === 2) {
                        return parts[1].substring(1);
                    }
                }
                return '';
            }
            return this.data[paramName];
        }
        return value;
    }
}
