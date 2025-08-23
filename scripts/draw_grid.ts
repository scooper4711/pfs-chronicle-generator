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
    const boxesIndex = args.indexOf('--boxes');

    if (pdfPathIndex === -1 || layoutDirIndex === -1 || layoutNameIndex === -1) {
        console.error('Usage: npm run draw-grid -- --pdf <path_to_pdf> --layout-dir <path_to_layout_dir> --layout-name <layout_name> [--canvas <canvas_name>] [--content <content_name> | --boxes]');
        process.exit(1);
    }

    const pdfPath = args[pdfPathIndex + 1];
    const layoutDir = args[layoutDirIndex + 1];
    const layoutName = args[layoutNameIndex + 1];
    const canvasName = canvasNameIndex !== -1 ? args[canvasNameIndex + 1] : undefined;
    const contentName = contentNameIndex !== -1 ? args[contentNameIndex + 1] : undefined;
    const drawBoxes = boxesIndex !== -1;

    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const layoutStore = new StandaloneLayoutStore();
    await layoutStore.initialize(layoutDir);
    const layout = await layoutStore.getLayout(layoutName);

    const generator = new PdfGenerator(pdfDoc, layout, {});

    if (canvasName) {
        await generator.drawGrid(canvasName);
    }

    if (drawBoxes) {
        await generator.drawBoxes(layout.content);
    } else if (contentName) {
        await generator.drawBoxes(contentName);
    }

    const outputPdfBytes = await pdfDoc.save();
    await fs.writeFile('grid-output.pdf', outputPdfBytes);

    console.log('Processing complete. Output saved to grid-output.pdf');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
