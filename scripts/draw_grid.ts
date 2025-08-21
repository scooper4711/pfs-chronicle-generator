import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import { PdfGenerator } from './PdfGenerator';
import { StandaloneLayoutStore } from './StandaloneLayoutStore';

async function main() {
    const args = process.argv.slice(2);
    const pdfPathIndex = args.indexOf('--pdf');
    const layoutDirIndex = args.indexOf('--layout-dir');
    const layoutNameIndex = args.indexOf('--layout-name');
    const canvasNameIndex = args.indexOf('--canvas');
    const contentNameIndex = args.indexOf('--content');
    const allContentIndex = args.indexOf('--all-content');

    if (pdfPathIndex === -1 || layoutDirIndex === -1 || layoutNameIndex === -1 || canvasNameIndex === -1) {
        console.error('Usage: npm run draw-grid -- --pdf <path_to_pdf> --layout-dir <path_to_layout_dir> --layout-name <layout_name> --canvas <canvas_name> [--content <content_name> | --all-content]');
        process.exit(1);
    }

    const pdfPath = args[pdfPathIndex + 1];
    const layoutDir = args[layoutDirIndex + 1];
    const layoutName = args[layoutNameIndex + 1];
    const canvasName = args[canvasNameIndex + 1];
    const contentName = contentNameIndex !== -1 ? args[contentNameIndex + 1] : undefined;
    const allContent = allContentIndex !== -1;

    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const layoutStore = new StandaloneLayoutStore();
    await layoutStore.initialize(layoutDir);
    const layout = await layoutStore.getLayout(layoutName);

    const generator = new PdfGenerator(pdfDoc, layout, {});
    if (allContent) {
        await generator.drawGrid(canvasName, layout.content);
    } else {
        await generator.drawGrid(canvasName, contentName);
    }

    const outputPdfBytes = await pdfDoc.save();
    await fs.writeFile('grid-output.pdf', outputPdfBytes);

    console.log('Grid drawn on canvas', canvasName, 'and saved to grid-output.pdf');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
