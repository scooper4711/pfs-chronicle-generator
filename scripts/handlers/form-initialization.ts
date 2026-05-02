/**
 * Form Initialization
 *
 * Orchestrates event listener attachment and post-render initialization
 * for the party chronicle form. Also contains renderPartyChronicleForm,
 * the main entry point for rendering the Society tab content.
 *
 * Extracted from main.ts to keep files under 500 lines.
 *
 * Requirements: party-chronicle-filling 1.1, 1.2, 1.3, 1.4,
 *   multi-line-reputation-tracking 7.1, 7.2, 7.3, 7.4,
 *   code-standards-refactoring 1.1, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { debug, error } from '../utils/logger.js';
import { PartyChronicleApp } from '../PartyChronicleApp.js';
import { updateLayoutSpecificFields } from '../utils/layout-utils.js';
import { updateValidationDisplay } from './validation-display.js';
import { isStarfinder } from '../utils/game-system-detector.js';
import type { PartyChronicleContext } from '../model/party-chronicle-types.js';
import {
    extractFormData,
    saveFormData,
    updateAllTreasureBundleDisplays,
    updateAllCreditsAwardedDisplays,
    updateDowntimeDaysDisplay,
    updateAllEarnedIncomeDisplays,
    updateSlowTrackDisplays
} from './party-chronicle-handlers.js';
import {
    initializeCollapseSections,
    updateAllSectionSummaries
} from './collapsible-section-handlers.js';
import {
    attachSeasonAndLayoutListeners,
    attachFormFieldListeners,
    attachTreasureBundleListeners,
    attachDowntimeDaysListeners,
    attachEarnedIncomeListeners,
    attachSaveButtonListener,
    attachClearButtonListener,
    attachGenerateButtonListener,
    attachCopySessionReportListener,
    attachExportButtonListener,
    attachPortraitListeners,
    attachFilePickerListener,
    attachCollapsibleSectionListeners,
    attachGmCharacterListeners,
    attachOverrideListeners,
    attachSidebarResizeListener,
    restoreSidebarWidth
} from './event-listener-helpers.js';
import type { PartyActor, PartySheetApp } from './event-listener-helpers.js';
import { initializeOverrideStates } from './override-handlers.js';

/**
 * Attaches all event listeners to the party chronicle form.
 *
 * CRITICAL: Event listeners MUST be attached here, not in
 * PartyChronicleApp._onRender, due to the hybrid ApplicationV2 pattern.
 * See architecture.md for details.
 *
 * Requirements: code-standards-refactoring 4.1, 4.2, 4.3, 4.4, 4.5
 */
function attachEventListeners(
    container: HTMLElement,
    partyActors: PartyActor[],
    partySheet: PartySheetApp
): void {
    attachSeasonAndLayoutListeners(container, partyActors);
    attachFormFieldListeners(container, partyActors);
    attachTreasureBundleListeners(container);
    attachDowntimeDaysListeners(container);
    attachEarnedIncomeListeners(container);
    attachSaveButtonListener(container, partyActors);

    const partyActor = partySheet?.actor;
    attachClearButtonListener(container, partyActors, partySheet, partyActor!);
    attachGenerateButtonListener(container, partyActors, partyActor!);
    attachCopySessionReportListener(container, partyActors);
    attachExportButtonListener(container, partyActor!);
    
    attachPortraitListeners(container, partyActors);
    attachFilePickerListener(container, partyActors);
    attachCollapsibleSectionListeners(container);
    attachOverrideListeners(container);
    attachGmCharacterListeners(container, partyActors, partySheet);
    attachSidebarResizeListener(container);
}

/**
 * Initializes slow track display adjustments for all characters that have
 * the slow track checkbox checked on load.
 */
function initializeSlowTrackDisplays(container: HTMLElement): void {
    const slowTrackCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'input[name$=".slowTrack"]:checked'
    );
    for (const checkbox of slowTrackCheckboxes) {
        const match = checkbox.name.match(/characters\.([^.]+)\.slowTrack/);
        if (match) {
            updateSlowTrackDisplays(match[1], container);
        }
    }
}

/**
 * Performs post-render initialization: populates layout-specific fields,
 * initializes displays, and runs initial validation.
 *
 * Requirements: code-standards-refactoring 4.1, 4.2, 4.3, 4.4, 4.5
 */
async function initializeForm(
    container: HTMLElement,
    partyActors: PartyActor[]
): Promise<void> {
    const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
    const layoutId = layoutSelect?.value || '';
    if (layoutId) {
        await updateLayoutSpecificFields(container, layoutId, async () => {
            await saveFormData(container, partyActors);
        });
    }
    
    // Requirements: starfinder-support 5.2
    if (isStarfinder()) {
        updateAllCreditsAwardedDisplays(container);
    } else {
        const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
        const initialTreasureBundles = Number.parseFloat(treasureBundlesSelect?.value || '0');
        updateAllTreasureBundleDisplays(initialTreasureBundles, container);
    }
    
    // Requirements: earned-income-calculation 2.4, 2.5, 7.3
    const xpEarnedSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    const initialXpEarned = Number.parseInt(xpEarnedSelect?.value || '0', 10);
    updateDowntimeDaysDisplay(initialXpEarned, container);
    
    // Requirements: earned-income-calculation 7.3
    debug('Initializing earned income displays...');
    const downtimeDaysSelect = container.querySelector<HTMLSelectElement>('#downtimeDays');
    const initialDowntimeDays = Number.parseInt(downtimeDaysSelect?.value || '1', 10);
    debug('Initial downtime days:', initialDowntimeDays, 'from select:', downtimeDaysSelect?.value);
    updateAllEarnedIncomeDisplays(initialDowntimeDays, container);
    
    initializeCollapseSections(container);
    updateAllSectionSummaries(container);
    restoreSidebarWidth(container);
    
    // Requirements: gm-override-values 6.2
    initializeOverrideStates(container);
    initializeSlowTrackDisplays(container);
    
    updateValidationDisplay(container, partyActors, extractFormData);
}

/**
 * Renders the party chronicle form directly into a container element.
 *
 * Uses the hybrid ApplicationV2 pattern where PartyChronicleApp is used
 * only for context preparation (_prepareContext), not for rendering.
 * Event listeners are attached manually after template rendering.
 * See architecture.md for details.
 *
 * Requirements: party-chronicle-filling 1.1, 1.2, 1.3, 1.4,
 *   multi-line-reputation-tracking 7.1, 7.2, 7.3, 7.4,
 *   code-standards-refactoring 1.1, 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function renderPartyChronicleForm(
    container: HTMLElement, 
    partyActors: PartyActor[], 
    partySheet: PartySheetApp
): Promise<void> {
    try {
        const partyActor = partySheet?.actor;
        const chronicleApp = new PartyChronicleApp(partyActors, {}, partyActor);
        const context: PartyChronicleContext = await chronicleApp._prepareContext();
        
        const template = 'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs';
        const html = await foundry.applications.handlebars.renderTemplate(template, context as any);
        container.innerHTML = html;
        
        attachEventListeners(container, partyActors, partySheet);
        await initializeForm(container, partyActors);
    } catch (renderError) {
        error('Error rendering form:', renderError);
        const errorMessage = renderError instanceof Error ? renderError.message : 'Unknown error';
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: red;">
                <p>Error loading party chronicle form. Check console for details.</p>
                <p>${errorMessage}</p>
            </div>
        `;
    }
}
