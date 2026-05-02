/**
 * Character Sheet Handlers
 *
 * Adds Download/Delete Chronicle buttons to the PFS tab on individual
 * character sheets (both PF2e and SF2e).
 *
 * Extracted from main.ts to keep files under 500 lines.
 *
 * Requirements: starfinder-support 2.3
 */

import { generateChronicleFilename } from '../utils/filename-utils.js';
import type { CharacterSheetApp } from './event-listener-helpers.js';

/**
 * Handles character sheet rendering for both PF2e and SF2e systems.
 * Adds Download/Delete Chronicle buttons to the PFS tab.
 *
 * Requirements: starfinder-support 2.3
 */
export function handleCharacterSheetRender(sheet: CharacterSheetApp, html: JQuery): void {
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) {
        return;
    }

    const chroniclePdf = sheet.actor.getFlag('pfs-chronicle-generator', 'chroniclePdf') as string | undefined;

    const downloadButton = document.createElement('button');
    downloadButton.innerHTML = '<i class="fas fa-download"></i> Download Chronicle';
    downloadButton.disabled = !chroniclePdf;
    downloadButton.addEventListener('click', (event) => {
        event.preventDefault();
        if (chroniclePdf) {
            const byteCharacters = atob(chroniclePdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.codePointAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: 'application/pdf'});
            const chronicleData = sheet.actor.getFlag('pfs-chronicle-generator', 'chronicleData') as Record<string, string> | undefined;
            const blankChroniclePath = chronicleData?.blankChroniclePath || '';
            const filename = generateChronicleFilename(sheet.actor.name, blankChroniclePath);
            // eslint-disable-next-line @typescript-eslint/no-require-imports -- Synchronous require needed inside click handler (dynamic import not viable here)
            const FileSaver = require('file-saver');
            FileSaver.saveAs(blob, filename);
        }
    });

    pfsTab.append(downloadButton);

    if (game.user.isGM) {
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete Chronicle';
        deleteButton.disabled = !chroniclePdf;
        deleteButton.addEventListener('click', async (event) => {
            event.preventDefault();
            const confirmed = await foundry.applications.api.DialogV2.confirm({
                window: { title: "Delete Chronicle" },
                content: "<p>Are you sure you want to delete this chronicle and all saved form data? This action cannot be undone.</p>",
                rejectClose: false,
                modal: true
            });
            if (confirmed) {
                await sheet.actor.unsetFlag('pfs-chronicle-generator', 'chroniclePdf');
                await sheet.actor.unsetFlag('pfs-chronicle-generator', 'chronicleData');
                sheet.render(true);
            }
        });
        pfsTab.append(deleteButton);
    }
}
