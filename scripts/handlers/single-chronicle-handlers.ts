import { layoutStore } from '../LayoutStore.js';
import { PdfGenerator } from '../PdfGenerator.js';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import FormDataExtended = foundry.applications.ux.FormDataExtended;

/**
 * Generates a single chronicle PDF for an actor.
 * 
 * This function handles the complete workflow of generating a chronicle PDF:
 * 1. Processes form data (strikeout lines and checkboxes)
 * 2. Saves chronicle data to actor flags
 * 3. Loads the blank chronicle PDF template
 * 4. Fills the PDF using the configured layout
 * 5. Saves the generated PDF to actor flags
 * 
 * @param actor - The actor for whom the chronicle is being generated
 * @param event - The form submit event
 * @param form - The HTML form element containing chronicle data
 * @param formData - The extended form data object
 * @returns Promise that resolves when PDF generation is complete
 * 
 * @throws Will show error notification if:
 * - Blank chronicle PDF path is not configured
 * - PDF fetch fails
 * - PDF generation encounters an error
 */
export async function generateSingleChronicle(
    actor: any,
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: FormDataExtended
): Promise<void> {
    const data: any = foundry.utils.expandObject(formData.object);
    console.log('[PFS Chronicle] Raw form data:', formData);
    console.log('[PFS Chronicle] Expanded form data:', data);

    if (!actor) {
        console.error('[PFS Chronicle] No actor provided for chronicle generation');
        return;
    }

    // Convert form data array into strikeout_item_lines array
    data.strikeout_item_lines = Array.isArray(data.strikeout_item_lines)
        ? data.strikeout_item_lines
        : (data.strikeout_item_lines ? [data.strikeout_item_lines] : []);
    console.log('[PFS Chronicle] Processed strikeout lines:', data.strikeout_item_lines);

    // Convert form data array into summary_checkbox array
    data.summary_checkbox = Array.isArray(data.summary_checkbox)
        ? data.summary_checkbox
        : (data.summary_checkbox ? [data.summary_checkbox] : []);
    console.log('[PFS Chronicle] Processed checkboxes:', data.summary_checkbox);

    await actor.setFlag('pfs-chronicle-generator', 'chronicleData', data);

    try {
        const layoutId = game.settings.get('pfs-chronicle-generator', 'layout');
        const layout = await layoutStore.getLayout(layoutId as string);

        const pdfPath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');
        if (pdfPath && typeof pdfPath === 'string') {
            const response = await fetch(pdfPath);
            if (response.ok) {
                const pdfBytes = await response.arrayBuffer();
                const pdfDoc = await PDFDocument.load(pdfBytes);
                pdfDoc.registerFontkit(fontkit);

                const generator = new PdfGenerator(pdfDoc, layout, data);
                await generator.generate();

                const modifiedPdfBytes = await pdfDoc.save();
                let binary = '';
                const len = modifiedPdfBytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(modifiedPdfBytes[i]);
                }
                const base64String = btoa(binary);

                await actor.setFlag('pfs-chronicle-generator', 'chroniclePdf', base64String);
                ui.notifications?.info("Chronicle PDF generated and attached to actor.");
            } else {
                ui.notifications?.error("Failed to fetch the blank chronicle PDF. Check the path in the settings.");
            }
        } else {
            ui.notifications?.error("Blank chronicle PDF path is not set in the settings.");
        }
    } catch (e) {
        console.error(e);
        ui.notifications?.error("An error occurred during chronicle generation.");
    }
}
