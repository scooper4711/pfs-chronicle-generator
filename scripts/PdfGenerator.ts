import { PDFDocument, PDFPage } from 'pdf-lib';
import { Layout, ContentElement } from './model/layout';
import { getFont, getColor, getCanvasRect } from './utils/pdf-utils';
import { 
    ResolvedElement, 
    resolvePresets, 
    resolveValue 
} from './utils/pdf-element-utils';
import { debug } from './utils/logger.js';

export class PdfGenerator {
    private readonly pdfDoc: PDFDocument;
    private readonly layout: Layout;
    private readonly data: any;
    private readonly page: PDFPage;

    constructor(pdfDoc: PDFDocument, layout: Layout, data: any) {
        this.pdfDoc = pdfDoc;
        this.layout = layout;
        this.data = data;
        this.page = this.pdfDoc.getPages()[0];
    }

    /**
     * Resolves a canvas name to absolute page coordinates.
     *
     * If a canvas name is provided, resolves it through the layout's canvas
     * configuration. Otherwise returns a rect covering the full page.
     */
    private resolveCanvasRect(canvasName: string | undefined): { x: number; y: number; width: number; height: number } {
        if (canvasName) {
            const { width: pageWidth, height: pageHeight } = this.page.getSize();
            return getCanvasRect(canvasName, this.layout.canvas!, pageWidth, pageHeight);
        }
        const { width, height } = this.page.getSize();
        return { x: 0, y: 0, width, height };
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
    private async drawElement(element: ContentElement) {
            const props: ResolvedElement = resolvePresets(element, this.layout.presets);
            debug('Drawing element:', { type: props.type, choices: props.choices });

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
            debug('Split choices:', { value, choices });
            debug('Processing choices:', { 
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
        const canvasRect = this.resolveCanvasRect(canvas);

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
        const canvasRect = this.resolveCanvasRect(canvas);

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
        const canvasRect = this.resolveCanvasRect(canvas);

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
            debug("Value is undefined:", { 
                requestedValue: props.value,
                resolvedValue: resolveValue(props.value, this.data, 'text'),
                allData: this.data
            });
            return;
        }

        const { canvas, x = 0, y = 0, x2 = 0, y2, align, font, fontweight, fontstyle, fontsize, color } = props;
        const canvasRect = this.resolveCanvasRect(canvas);

        const boxX = canvasRect.x + (x / 100) * canvasRect.width;
        const boxWidth = ((x2 - x) / 100) * canvasRect.width;

        const pdfFont = await getFont(this.pdfDoc, font, fontweight, fontstyle);
        const textSize = fontsize || 12;
        const textWidth = pdfFont.widthOfTextAtSize(String(value), textSize);

        let textX = boxX;
        if (align?.includes('C')) {
            textX = boxX + (boxWidth - textWidth) / 2;
        } else if (align?.includes('R')) {
            textX = boxX + boxWidth - textWidth;
        }

        let finalY;
        if (y2 !== undefined) { // y2 is defined, so we have a box
            const boxYFromTop = (y / 100) * canvasRect.height;
            const boxHeight = ((y2 - y) / 100) * canvasRect.height;
            const textHeight = pdfFont.heightAtSize(textSize);
            let textYFromBaselineFromTop = boxYFromTop + textHeight; // Default to top alignment
            if (align?.includes('M')) {
                textYFromBaselineFromTop = boxYFromTop + boxHeight / 2 + textHeight / 2;
            } else if (align?.includes('B')) {
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
        const canvasRect = this.resolveCanvasRect(canvas);

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
            if (align?.includes('C')) {
                textX = boxX + (boxWidth - textWidth) / 2;
            } else if (align?.includes('R')) {
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
