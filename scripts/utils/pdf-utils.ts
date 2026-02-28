import { PDFDocument, PDFFont, RGB, rgb, StandardFonts } from 'pdf-lib';
import { Canvas } from '../model/layout';

/**
 * Resolves a font name, weight, and style to a PDFFont object.
 * Supports both standard PDF fonts (Helvetica, Times, Courier) and web fonts
 * (Noto Sans, Eczar, Gelasio, Roboto Condensed, Tauri) loaded from CDN.
 * 
 * @param pdfDoc - The PDF document to embed the font in
 * @param fontName - The name of the font (e.g., 'helvetica', 'times', 'noto sans')
 * @param fontWeight - The font weight ('normal' or 'bold')
 * @param fontStyle - The font style ('normal' or 'italic')
 * @returns A promise that resolves to the embedded PDFFont
 */
export async function getFont(
    pdfDoc: PDFDocument,
    fontName: string | undefined,
    fontWeight: 'normal' | 'bold' = 'normal',
    fontStyle: 'normal' | 'italic' = 'normal'
): Promise<PDFFont> {
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
        return pdfDoc.embedFont(fontBytes);
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

    return pdfDoc.embedFont(finalFont);
}

/**
 * Resolves a color name to an RGB color object.
 * Supports basic color names: black, white, red, green, blue.
 * Defaults to black if the color name is not recognized.
 * 
 * @param colorName - The name of the color (e.g., 'black', 'red')
 * @returns An RGB color object
 */
export function getColor(colorName: string | undefined): RGB {
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

/**
 * Calculates the absolute position and dimensions of a canvas on the PDF page.
 * Handles both root canvases (positioned relative to the page) and nested canvases
 * (positioned relative to their parent canvas).
 * 
 * @param canvasName - The name of the canvas to resolve
 * @param canvasConfig - The canvas configuration object from the layout
 * @param pageWidth - The width of the PDF page
 * @param pageHeight - The height of the PDF page
 * @returns An object containing the x, y, width, and height of the canvas in absolute coordinates
 * @throws Error if the canvas is not found in the configuration
 */
export function getCanvasRect(
    canvasName: string,
    canvasConfig: Record<string, Canvas>,
    pageWidth: number,
    pageHeight: number
): { x: number, y: number, width: number, height: number } {
    const canvas = canvasConfig[canvasName];
    if (!canvas) {
        throw new Error(`Canvas with name ${canvasName} not found.`);
    }

    if (canvas.parent) {
        const parentRect = getCanvasRect(canvas.parent, canvasConfig, pageWidth, pageHeight);
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
