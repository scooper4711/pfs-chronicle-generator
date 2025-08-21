import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import { PdfGenerator } from './PdfGenerator';
import { StandaloneLayoutStore } from './StandaloneLayoutStore';

async function main() {
    const args = process.argv.slice(2);
    const pdfPathIndex = args.indexOf('--pdf');
    const layoutDirIndex = args.indexOf('--layout-dir');
    const layoutNameIndex = args.indexOf('--layout-name');

    if (pdfPathIndex === -1 || layoutDirIndex === -1 || layoutNameIndex === -1) {
        console.error('Usage: npm run fill-fields -- --pdf <path_to_pdf> --layout-dir <path_to_layout_dir> --layout-name <layout_name> --parameter <key=value> ...');
        process.exit(1);
    }

    const pdfPath = args[pdfPathIndex + 1];
    const layoutDir = args[layoutDirIndex + 1];
    const layoutName = args[layoutNameIndex + 1];

    const parameters: { [key: string]: string } = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--parameter') {
            const param = args[i + 1];
            const [key, value] = param.split('=');
            parameters[key] = value;
            i++;
        }
    }

    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const layoutStore = new StandaloneLayoutStore();
    await layoutStore.initialize(layoutDir);
    const layout = await layoutStore.getLayout(layoutName);

    // Pre-process parameters
    if (parameters.charactername) {
        parameters.char = parameters.charactername;
        delete parameters.charactername;
    }
    if (parameters.societyid) {
        const parts = parameters.societyid.split('-');
        if (parts.length === 2) {
            parameters['societyid.player'] = parts[0];
            parameters['societyid.char_without_first_digit'] = parts[1].substring(1);
        }
    }

    const generator = new PdfGenerator(pdfDoc, layout, parameters);
    await generator.generate();

    const outputPdfBytes = await pdfDoc.save();
    await fs.writeFile('filled-output.pdf', outputPdfBytes);

    console.log('PDF fields filled and saved to filled-output.pdf');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
