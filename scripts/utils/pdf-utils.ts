import { PDFDocument, PDFFont, RGB, rgb, StandardFonts } from 'pdf-lib';
import { Canvas } from '../model/layout';

/**
 * Resolves a web font name to its CDN URL and embeds it in the PDF document.
 * Supports Noto Sans, Eczar, Gelasio, Roboto Condensed, and Tauri.
 */
async function embedWebFont(pdfDoc: PDFDocument, font: string): Promise<PDFFont> {
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

/**
 * Resolves a standard PDF font name with weight and style to a StandardFonts enum value.
 */
/** Lookup table mapping font family → weight → style to StandardFonts values. */
const STANDARD_FONT_MAP: Record<string, Record<string, Record<string, string>>> = {
    helvetica: {
        bold:   { italic: StandardFonts.HelveticaBoldOblique, normal: StandardFonts.HelveticaBold },
        normal: { italic: StandardFonts.HelveticaOblique,     normal: StandardFonts.Helvetica },
    },
    times: {
        bold:   { italic: StandardFonts.TimesRomanBoldItalic, normal: StandardFonts.TimesRomanBold },
        normal: { italic: StandardFonts.TimesRomanItalic,     normal: StandardFonts.TimesRoman },
    },
    courier: {
        bold:   { italic: StandardFonts.CourierBoldOblique, normal: StandardFonts.CourierBold },
        normal: { italic: StandardFonts.CourierOblique,     normal: StandardFonts.Courier },
    },
};

/**
 * Resolves a standard PDF font name with weight and style to a StandardFonts enum value.
 */
function resolveStandardFont(
    font: string,
    fontWeight: 'normal' | 'bold',
    fontStyle: 'normal' | 'italic'
): string {
    return STANDARD_FONT_MAP[font]?.[fontWeight]?.[fontStyle] ?? StandardFonts.Helvetica;
}

const WEB_FONT_PREFIXES = ['noto', 'eczar', 'gelasio', 'roboto', 'tauri'];

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

    if (WEB_FONT_PREFIXES.some(prefix => font.startsWith(prefix))) {
        return embedWebFont(pdfDoc, font);
    }

    return pdfDoc.embedFont(resolveStandardFont(font, fontWeight, fontStyle));
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
