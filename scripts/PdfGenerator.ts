import { PDFDocument, PDFPage, rgb, degrees } from 'pdf-lib';
import { Layout, ContentElement } from './model/layout';
import { getFont, getColor, getCanvasRect } from './utils/pdf-utils';
import { 
    ResolvedElement, 
    resolvePresets, 
    resolveValue, 
    getAllContentElements, 
    findContentElement 
} from './utils/pdf-element-utils';

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

        if (this.layout.content) {
            for (const element of this.layout.content) {
                await this.drawElement(element);
            }
        }
    }

    public async drawGrid(canvasName: string) {
        const { width: pageWidth, height: pageHeight } = this.page.getSize();
        const canvasRect = getCanvasRect(canvasName, this.layout.canvas!, pageWidth, pageHeight);
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

        const font = await getFont(this.pdfDoc, 'helvetica');
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
                if (this.layout.content) {
                    const element = findContentElement(this.layout.content, contentToHighlight);
                    if (element) {
                        await this.highlightContentElement(element);
                    }
                }
            } else {
                const allElements = getAllContentElements(contentToHighlight);
                for (const element of allElements) {
                    await this.highlightContentElement(element);
                }
            }
        }
    }

    private async highlightContentElement(element: ContentElement) {
        const props = resolvePresets(element, this.layout.presets);
        const pageHeight = this.page.getHeight();
        const font = await getFont(this.pdfDoc, 'helvetica');
        if (!props.canvas) return;

        const { width: pageWidth, height: pageHeightSize } = this.page.getSize();
        const elementCanvasRect = getCanvasRect(props.canvas, this.layout.canvas!, pageWidth, pageHeightSize);
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



    private async drawElement(element: ContentElement) {
            const props: ResolvedElement = resolvePresets(element, this.layout.presets);
            console.log('[PFS Chronicle] Drawing element:', { type: props.type, choices: props.choices });

            switch (props.type) {
                case 'text':
                    await this.drawText(props);
                    break;
                case 'multiline':
                    await this.drawMultilineText(props);
                    break;
                case 'trigger':
                    await this.drawTriggerElement(props);
                    break;
                case 'choice':
                    await this.drawChoiceElement(props);
                    break;
                case 'strikeout':
                    await this.drawRedaction(props);
                    break;
                case 'checkbox':
                    await this.drawCheckbox(props);
                    break;
                case 'line':
                    await this.drawLineElement(props);
                    break;
                // TODO: Handle other element types
            }
        }

        /**
         * Draws all child content elements from a content structure.
         * Handles both array and object (keyed) content formats.
         */
        private async drawContentElements(content: ContentElement[] | Record<string, ContentElement[]> | undefined): Promise<void> {
            if (!content) return;

            const arrays = Array.isArray(content)
                ? [content]
                : Object.values(content);

            for (const array of arrays) {
                for (const contentElement of array) {
                    await this.drawElement(contentElement);
                }
            }
        }

        /**
         * Handles 'trigger' type elements: draws child content when the trigger param is truthy.
         */
        private async drawTriggerElement(props: ResolvedElement): Promise<void> {
            if (!props.trigger || !this.data[props.trigger.substring(6)]) return;
            await this.drawContentElements(props.content);
        }

        /**
         * Handles 'choice' type elements: resolves the choice value and draws matching content branches.
         */
        private async drawChoiceElement(props: ResolvedElement): Promise<void> {
            if (!props.choices || !props.content || Array.isArray(props.content) || typeof props.content !== 'object') return;

            const value = resolveValue(props.choices as string, this.data, 'choice');
            // Split on ||| delimiter (used for arrays), or treat as single value if no delimiter
            // DO NOT split on comma, as choice values may contain commas
            const choices = value?.includes('|||') ? value.split('|||') : (value ? [value] : []);
            console.log('[PFS Chronicle] Split choices:', { value, choices });
            console.log('[PFS Chronicle] Processing choices:', { 
                paramValue: resolveValue(props.choices as string, this.data, 'choice'),
                choices, 
                content: props.content,
                data: this.data
            });

            const contentMap = props.content as Record<string, ContentElement[]>;
            for (const choice of choices) {
                const contentElements = contentMap[choice];
                if (contentElements) {
                    for (const contentElement of contentElements) {
                        await this.drawElement(contentElement);
                    }
                }
            }
        }

    private async drawLineElement(props: ResolvedElement) {
        const { canvas, x = 0, y = 0, x2 = 0, linewidth = 1, color } = props;

        let canvasRect;
        if (canvas) {
            const { width: pageWidth, height: pageHeight } = this.page.getSize();
            canvasRect = getCanvasRect(canvas, this.layout.canvas!, pageWidth, pageHeight);
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
            color: getColor(color),
        });
    }

    private async drawRedaction(props: ResolvedElement) {
        const { canvas, x = 0, y = 0, x2 = 0, y2 = 0, color } = props;

        let canvasRect;
        if (canvas) {
            const { width: pageWidth, height: pageHeight } = this.page.getSize();
            canvasRect = getCanvasRect(canvas, this.layout.canvas!, pageWidth, pageHeight);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const rectX = canvasRect.x + (x / 100) * canvasRect.width;
        const rectY = this.page.getHeight() - (canvasRect.y + (y2 / 100) * canvasRect.height);
        const rectWidth = ((x2 - x) / 100) * canvasRect.width;
        const rectHeight = ((y2 - y) / 100) * canvasRect.height;

        // Draw a filled rectangle (for strikeouts, this fills the entire bounding box)
        this.page.drawRectangle({
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            color: getColor(color),
        });
    }

    private async drawCheckbox(props: ResolvedElement) {
        const { canvas, x = 0, y = 0, x2, y2, size = 1, linewidth = 1, color } = props;

        let canvasRect;
        if (canvas) {
            const { width: pageWidth, height: pageHeight } = this.page.getSize();
            canvasRect = getCanvasRect(canvas, this.layout.canvas!, pageWidth, pageHeight);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        // Calculate position
        const checkX = canvasRect.x + (x / 100) * canvasRect.width;
        const checkY = this.page.getHeight() - (canvasRect.y + (y / 100) * canvasRect.height);

        // Calculate size - if x2/y2 provided, use those for width/height, otherwise use size parameter
        let checkWidth: number;
        let checkHeight: number;
        
        if (x2 !== undefined && y2 !== undefined) {
            checkWidth = ((x2 - x) / 100) * canvasRect.width;
            checkHeight = ((y2 - y) / 100) * canvasRect.height;
        } else {
            // Use size parameter as a percentage of canvas width
            checkWidth = (size / 100) * canvasRect.width;
            checkHeight = checkWidth; // Square checkbox
        }

        // Draw checkmark using two lines forming an X
        const padding = checkWidth * 0.2; // 20% padding
        const innerX = checkX + padding;
        const innerY = checkY - padding;
        const innerWidth = checkWidth - (padding * 2);
        const innerHeight = checkHeight - (padding * 2);

        // Draw first diagonal (top-left to bottom-right)
        this.page.drawLine({
            start: { x: innerX, y: innerY },
            end: { x: innerX + innerWidth, y: innerY - innerHeight },
            thickness: linewidth,
            color: getColor(color),
        });

        // Draw second diagonal (bottom-left to top-right)
        this.page.drawLine({
            start: { x: innerX, y: innerY - innerHeight },
            end: { x: innerX + innerWidth, y: innerY },
            thickness: linewidth,
            color: getColor(color),
        });
    }



    private async drawText(props: ResolvedElement) {
        const value = resolveValue(props.value, this.data, 'text');
        if (!value) {
            console.log("[PFS Chronicle] Value is undefined:", { 
                requestedValue: props.value,
                resolvedValue: resolveValue(props.value, this.data, 'text'),
                allData: this.data
            });
            return;
        }

        const { canvas, x = 0, y = 0, x2 = 0, y2, align, font, fontweight, fontstyle, fontsize, color } = props;
        
        let canvasRect;
        if (canvas) {
            const { width: pageWidth, height: pageHeight } = this.page.getSize();
            canvasRect = getCanvasRect(canvas, this.layout.canvas!, pageWidth, pageHeight);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const boxX = canvasRect.x + (x / 100) * canvasRect.width;
        const boxWidth = ((x2 - x) / 100) * canvasRect.width;

        const pdfFont = await getFont(this.pdfDoc, font, fontweight, fontstyle);
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
            color: getColor(color),
        });
    }

    private async drawMultilineText(props: ResolvedElement) {
        const value = resolveValue(props.value, this.data, 'multiline');
        if (!value) {
            return;
        }

        const { canvas, x = 0, y = 0, x2 = 0, y2 = 0, align, font, fontweight, fontstyle, fontsize, color, lines } = props;
        
        let canvasRect;
        if (canvas) {
            const { width: pageWidth, height: pageHeight } = this.page.getSize();
            canvasRect = getCanvasRect(canvas, this.layout.canvas!, pageWidth, pageHeight);
        } else {
            const { width, height } = this.page.getSize();
            canvasRect = { x: 0, y: 0, width, height };
        }

        const boxX = canvasRect.x + (x / 100) * canvasRect.width;
        const boxYFromTop = (y / 100) * canvasRect.height;
        const boxWidth = ((x2 - x) / 100) * canvasRect.width;
        const boxHeight = ((y2 - y) / 100) * canvasRect.height;

        const pdfFont = await getFont(this.pdfDoc, font, fontweight, fontstyle);
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
                color: getColor(color),
            });
        }
    }

}
