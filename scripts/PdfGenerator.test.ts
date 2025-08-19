import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { PdfGenerator } from './PdfGenerator';
import { Layout } from './model/layout';

describe('PdfGenerator', () => {
    let pdfDoc: PDFDocument;
    let page: PDFPage;
    let drawTextSpy: jest.SpyInstance;

    beforeEach(async () => {
        // Create a new PDF document for each test
        pdfDoc = await PDFDocument.create();
        page = pdfDoc.addPage();
        // Spy on the drawText method of the page
        drawTextSpy = jest.spyOn(page, 'drawText');
    });

    it('should draw a simple text element from parameters', async () => {
        const layout: Layout = {
            id: 'test-layout',
            description: 'A test layout',
            canvas: {},
            presets: {},
            content: [
                {
                    type: 'text',
                    value: 'param:characterName',
                    x: 10, y: 10, x2: 90, y2: 20,
                    align: 'C',
                    font: 'helvetica',
                    fontsize: 18,
                    color: 'red',
                }
            ]
        };

        const data = {
            characterName: 'Test Character'
        };

        const generator = new PdfGenerator(pdfDoc, layout, data);

        await generator.generate();

        expect(drawTextSpy).toHaveBeenCalledTimes(1);

        // Check the content and styling of the drawn text
        expect(drawTextSpy).toHaveBeenCalledWith('Test Character', expect.objectContaining({
            font: expect.objectContaining({ name: StandardFonts.Helvetica }),
            size: 18,
            color: rgb(1, 0, 0),
        }));
    });

    it('should resolve presets correctly', async () => {
        const layout: Layout = {
            id: 'preset-test',
            description: 'A test for presets',
            canvas: {},
            presets: {
                'title': {
                    font: 'times',
                    fontsize: 24,
                    align: 'C'
                },
                'red-text': {
                    color: 'red'
                }
            },
            content: [
                {
                    type: 'text',
                    presets: ['title', 'red-text'],
                    value: 'Hello World',
                    x: 0, y: 0, x2: 100, y2: 10,
                }
            ]
        };

        const generator = new PdfGenerator(pdfDoc, layout, {});

        await generator.generate();

        expect(drawTextSpy).toHaveBeenCalledWith('Hello World', expect.objectContaining({
            font: expect.objectContaining({ name: StandardFonts.TimesRoman }),
            size: 24,
            color: rgb(1, 0, 0)
        }));
    });
    
    it('should handle nested presets where properties are overridden', async () => {
        const layout: Layout = {
            id: 'nested-preset-test',
            description: 'A test for nested presets',
            canvas: {},
            presets: {
                'base-style': {
                    font: 'courier',
                    fontsize: 10
                },
                'header': {
                    presets: ['base-style'],
                    fontsize: 16, // This should override the fontsize from 'base-style'
                }
            },
            content: [
                { type: 'text', presets: ['header'], value: 'Nested Preset Text', x: 0, y: 0, x2: 100, y2: 10 }
            ]
        };

        const generator = new PdfGenerator(pdfDoc, layout, {});

        await generator.generate();

        expect(drawTextSpy).toHaveBeenCalledWith('Nested Preset Text', expect.objectContaining({
            font: expect.objectContaining({ name: StandardFonts.Courier }),
            size: 16, // The overridden value should be used
        }));
    });
});
