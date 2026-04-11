import { layoutStore } from './LayoutStore.js';
import { debug, error } from './utils/logger.js';
import { PartyChronicleApp } from './PartyChronicleApp.js';
import { generateChronicleFilename } from './utils/filename-utils.js';
import { updateLayoutSpecificFields } from './utils/layout-utils.js';
import { updateValidationDisplay } from './handlers/validation-display.js';
import { PartyChronicleContext } from './model/party-chronicle-types.js';
import { calculateTaskLevelOptions } from './utils/earned-income-calculator.js';
import { 
    extractFormData,
    saveFormData,
    updateAllTreasureBundleDisplays,
    updateDowntimeDaysDisplay,
    updateAllEarnedIncomeDisplays
} from './handlers/party-chronicle-handlers.js';
import {
    initializeCollapseSections,
    updateAllSectionSummaries
} from './handlers/collapsible-section-handlers.js';
import {
    PartyActor,
    CharacterSheetApp,
    PartySheetApp,
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
    attachGmCharacterListeners
} from './handlers/event-listener-helpers.js';

/** Registers world-scoped Foundry settings shown in the module config. */
function registerSettings(): void {
  const MODULE_ID = 'pfs-chronicle-generator';

  const visibleSettings: Array<{ key: string; name: string; hint: string }> = [
    { key: 'gmName', name: 'Default GM Name', hint: 'The default name of the Game Master (can be overridden when generating chronicles).' },
    { key: 'gmPfsNumber', name: 'Default GM PFS Number', hint: 'The default Pathfinder Society number of the Game Master (can be overridden when generating chronicles).' },
    { key: 'eventName', name: 'Default Event Name', hint: 'The default name of the event (can be overridden when generating chronicles).' },
    { key: 'eventcode', name: 'Default Event Code', hint: 'The default event code (can be overridden when generating chronicles).' },
  ];

  for (const setting of visibleSettings) {
    game.settings.register(MODULE_ID, setting.key, {
      name: setting.name, hint: setting.hint,
      scope: 'world', config: true, type: String, default: '',
    });
  }

  game.settings.register(MODULE_ID, 'debugMode', {
    name: 'Enable Debug Logging',
    hint: 'When enabled, verbose debug messages are printed to the browser console. Useful for troubleshooting.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  // Hidden setting for party chronicle data storage
  game.settings.register(MODULE_ID, 'partyChronicleData', {
    name: 'Party Chronicle Data',
    hint: 'Temporary storage for party chronicle data being filled out.',
    scope: 'world', config: false, type: Object, default: undefined,
  });
}

/** Registers Handlebars helpers used by party chronicle templates. */
function registerHandlebarsHelpers(): void {
  // Requirements: earned-income-calculation 1.1, 1.2, 1.4, 1.5, 1.8, 1.9
  Handlebars.registerHelper('calculateTaskLevelOptions', function(characterLevel: number, savedTaskLevel: unknown) {
    const options = calculateTaskLevelOptions(characterLevel);
    return options.map(opt => ({
      ...opt,
      selected: opt.value === savedTaskLevel || (typeof opt.value === 'number' && opt.value === Number(savedTaskLevel)),
    }));
  });

  Handlebars.registerHelper('getTreasureBundleValue', function(level: number) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Synchronous require needed inside Handlebars helper (no top-level await)
    const { getTreasureBundleValue } = require('./utils/treasure-bundle-calculator.js');
    return getTreasureBundleValue(level);
  });
}

Hooks.on('init', async () => {
  registerSettings();
  registerHandlebarsHelpers();
});

// Hidden settings registered and initialized on ready
Hooks.on('ready', async () => {
    await layoutStore.initialize();
    registerPartySheetTab();
    const seasons = layoutStore.getSeasons();
    const seasonChoices: Record<string, string> = Object.fromEntries(
        seasons.map(season => [season.id, season.name])
    );

    // Hidden settings managed via Select Layout menu
    if (!game.settings.settings.has('pfs-chronicle-generator.blankChroniclePath')) {
      game.settings.register('pfs-chronicle-generator', 'blankChroniclePath', {
        name: 'Blank Adventure Chronicle Path',
        hint: 'The path to the blank adventure chronicle PDF.',
        scope: 'world',
        config: false,
        restricted: true,
        type: String,
        filePicker: 'any',
        default: '',
      });
    }

    if (!game.settings.settings.has('pfs-chronicle-generator.season')) {
      game.settings.register('pfs-chronicle-generator', 'season', {
          name: 'Season',
          hint: 'The season to filter chronicle layouts.',
          scope: 'world',
          config: false,
          restricted: true,
          type: String,
          choices: seasonChoices,
          default: seasons[0]?.id || ''
      });
    }

    if (!game.settings.settings.has('pfs-chronicle-generator.layout')) {
      game.settings.register('pfs-chronicle-generator', 'layout', {
          name: 'Chronicle Layout',
          hint: 'The layout to use when generating the chronicle.',
          scope: 'world',
          config: false,
          restricted: true,
          type: String,
          default: '',
      });
    }
});

Hooks.on('renderCharacterSheetPF2e' as any, (sheet: CharacterSheetApp, html: JQuery, _data: any) => {
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) {
        return;
    }

    // --- Download and Delete Buttons ---
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
            // Check actor flags first, fall back to module setting for backward compatibility
            const chronicleData = sheet.actor.getFlag('pfs-chronicle-generator', 'chronicleData') as Record<string, string> | undefined;
            const blankChroniclePath = chronicleData?.blankChroniclePath 
                || game.settings.get('pfs-chronicle-generator', 'blankChroniclePath') as string;
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
                sheet.render(true); // Re-render to update button states
            }
        });
        pfsTab.append(deleteButton);
    }
});

/**
 * Whether the module registered with the new region-based callback API.
 * When true, the renderPartySheetPF2e hook skips form rendering (the system handles it).
 */
let usingRegionCallbacks = false;

/**
 * Attempts to register the Society tab via the pf2e system's registerModuleTab API.
 * 
 * If the system supports registerModuleTab with render callbacks, registers with
 * renderCallback and activateListeners so the system manages rendering through its
 * region-based lifecycle. This eliminates the setTimeout hack and enables automatic
 * re-rendering when party membership changes.
 * 
 * Falls back to the legacy renderPartySheetPF2e hook approach when registerModuleTab
 * is unavailable.
 */
function registerPartySheetTab(): void {
  const sheetClass = (globalThis as any).CONFIG?.Actor?.sheetClasses?.party?.['pf2e.PartySheetPF2e']?.cls;
  if (!sheetClass || typeof sheetClass.registerModuleTab !== 'function') return;

  sheetClass.registerModuleTab('pfs', 'Society', {
    renderCallback: regionRenderCallback,
    activateListeners: regionActivateListeners,
  });
  usingRegionCallbacks = true;
  debug('Registered Society tab with region render callbacks');
}

/**
 * Region render callback invoked by the PF2e system's #renderRegions lifecycle.
 * 
 * Returns the rendered HTML string for the Society tab content. The system
 * sets the tab element's innerHTML to this string, then calls activateListeners.
 * 
 * @param app - The PartySheetPF2e app instance
 * @param element - The tab content div element
 * @param _data - The sheet data object from getData()
 * @returns The rendered HTML string for the tab content
 */
async function regionRenderCallback(app: PartySheetApp, _element: HTMLElement, _data: object): Promise<string> {
  const partyActors = (app.actor?.members || [])
    .filter((actor: PartyActor) => actor?.type === 'character');

  if (partyActors.length === 0) {
    return `
      <div style="padding: 2rem; text-align: center;">
        <p>No party members found. Add characters to the party first.</p>
      </div>
    `;
  }

  const chronicleApp = new PartyChronicleApp(partyActors, {}, app.actor);
  const context: PartyChronicleContext = await chronicleApp._prepareContext();

  const template = 'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs';
  return foundry.applications.handlebars.renderTemplate(template, context as any);
}

/**
 * Region activateListeners callback invoked by the PF2e system after rendering.
 * 
 * Attaches all event listeners and initializes form state. Called after the system
 * sets innerHTML from the renderCallback result.
 * 
 * @param app - The PartySheetPF2e app instance
 * @param element - The tab content div element with rendered HTML
 */
function regionActivateListeners(app: PartySheetApp, element: HTMLElement): void {
  const partyActors = (app.actor?.members || [])
    .filter((actor: PartyActor) => actor?.type === 'character');

  if (partyActors.length === 0) return;

  attachEventListeners(element, partyActors, app);
  initializeForm(element, partyActors);
}

/**
 * Hook: renderPartySheetPF2e
 * 
 * When using the region callback API, this hook only captures the app reference
 * for use by the render callbacks. The system handles rendering via #renderRegions.
 * 
 * When using the legacy path (no callback API), this hook injects the GM-only
 * "PFS" tab and renders the form directly, with a setTimeout to wait for DOM readiness.
 * 
 * Requirements: party-chronicle-filling 1.1, 1.2
 */
Hooks.on('renderPartySheetPF2e' as any, (app: PartySheetApp, html: JQuery, _data: any) => {
    // Only show PFS tab to GMs
    if (!game.user.isGM) return;

    // When using region callbacks, the system handles rendering — nothing else to do
    if (usingRegionCallbacks) return;

    // Legacy path: manual DOM injection with setTimeout
    setTimeout(() => {
        const container = html.find('section.container');
        if (container.length === 0) return;

        // Check if the system already rendered the tab via registerModuleTab
        let pfsTab = container.find('> .tab[data-tab="pfs"]');

        if (pfsTab.length === 0) {
            // Fallback: manually inject the tab nav link and content div
            const subNav = html.find('nav.sub-nav');
            if (subNav.length === 0) return;
            if (subNav.find('[data-tab="pfs"]').length > 0) return;

            const pfsTabButton = $(`<a data-tab="pfs">Society</a>`);
            const inventoryTab = subNav.find('[data-tab="inventory"]');
            if (inventoryTab.length > 0) {
                inventoryTab.after(pfsTabButton);
            } else {
                subNav.append(pfsTabButton);
            }

            pfsTab = $(`<div class="tab" data-tab="pfs"></div>`);
            container.append(pfsTab);
        }

        // Get party actors and filter to character actors only
        const partyActors = app.actor?.members || [];
        const characterActors = partyActors.filter((actor: PartyActor) => actor?.type === 'character');
        
        if (characterActors.length === 0) {
            pfsTab.html(`
                <div style="padding: 2rem; text-align: center;">
                    <p>No party members found. Add characters to the party first.</p>
                </div>
            `);
        } else {
            renderPartyChronicleForm(pfsTab[0], characterActors, app);
        }
    }, 150); // Delay to ensure content is rendered
});

/**
 * Attaches all event listeners to the party chronicle form
 * 
 * This helper function attaches all event listeners to form elements after the
 * template has been rendered. It delegates to specialized helper functions to
 * maintain low complexity and improve type safety.
 * 
 * CRITICAL: Event listeners MUST be attached here in main.ts, not in
 * PartyChronicleApp._onRender, due to the hybrid ApplicationV2 pattern.
 * See architecture.md for details.
 * 
 * @param container - DOM element containing the rendered form
 * @param partyActors - Array of party member actors
 * @param partySheet - The party sheet app instance
 * 
 * Requirements: code-standards-refactoring 4.1, 4.2, 4.3, 4.4, 4.5
 */
function attachEventListeners(
    container: HTMLElement,
    partyActors: PartyActor[],
    partySheet: PartySheetApp
): void {
    // Season and layout change handlers
    attachSeasonAndLayoutListeners(container, partyActors);
    
    // Auto-save and validation for all form fields
    attachFormFieldListeners(container, partyActors);
    
    // Treasure bundle related listeners
    attachTreasureBundleListeners(container);
    
    // Downtime days related listeners
    attachDowntimeDaysListeners(container);
    
    // Earned income related listeners
    attachEarnedIncomeListeners(container);
    
    // Button listeners
    attachSaveButtonListener(container, partyActors);

    // Resolve the Party actor from the party sheet for zip archive storage
    const partyActor = partySheet?.actor;
    attachClearButtonListener(container, partyActors, partySheet, partyActor!);
    attachGenerateButtonListener(container, partyActors, partyActor!);
    attachCopySessionReportListener(container, partyActors);
    attachExportButtonListener(container, partyActor!);
    
    // Portrait and file picker listeners
    attachPortraitListeners(container, partyActors);
    attachFilePickerListener(container, partyActors);
    
    // Collapsible section listeners
    attachCollapsibleSectionListeners(container);
    
    // GM character drop zone and clear button listeners
    attachGmCharacterListeners(container, partyActors, partySheet);
}

/**
 * Initializes the form after rendering
 * 
 * This helper function performs initialization tasks after the template has been
 * rendered and event listeners have been attached. It populates layout-specific
 * fields, initializes treasure bundle displays, and updates validation display.
 * 
 * @param container - DOM element containing the rendered form
 * @param partyActors - Array of party member actors
 * 
 * Requirements: code-standards-refactoring 4.1, 4.2, 4.3, 4.4, 4.5
 */
async function initializeForm(
    container: HTMLElement,
    partyActors: PartyActor[]
): Promise<void> {
    // Initial population of layout-specific fields
    const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
    const layoutId = layoutSelect?.value || '';
    if (layoutId) {
        await updateLayoutSpecificFields(container, layoutId, async () => {
            await saveFormData(container, partyActors);
        });
    }
    
    // Initialize treasure bundle displays on initial render
    const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
    const initialTreasureBundles = Number.parseFloat(treasureBundlesSelect?.value || '0');
    updateAllTreasureBundleDisplays(initialTreasureBundles, container);
    
    // Initialize downtime days display based on XP earned
    // Requirements: earned-income-calculation 2.4, 2.5, 7.3
    const xpEarnedSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
    const initialXpEarned = Number.parseInt(xpEarnedSelect?.value || '0', 10);
    updateDowntimeDaysDisplay(initialXpEarned, container);
    
    // Initialize earned income displays on initial render
    // Requirements: earned-income-calculation 7.3
    debug('Initializing earned income displays...');
    const downtimeDaysSelect = container.querySelector<HTMLSelectElement>('#downtimeDays');
    const initialDowntimeDays = Number.parseInt(downtimeDaysSelect?.value || '1', 10);
    debug('Initial downtime days:', initialDowntimeDays, 'from select:', downtimeDaysSelect?.value);
    updateAllEarnedIncomeDisplays(initialDowntimeDays, container);
    
    // Initialize collapsible sections
    initializeCollapseSections(container);
    updateAllSectionSummaries(container);
    
    // Initial validation display and button state
    updateValidationDisplay(container, partyActors, extractFormData);
}

/**
 * Renders the party chronicle form directly into a container element
 * 
 * This function manually renders the party chronicle form template and attaches
 * all event listeners. It's called from the renderPartySheetPF2e hook to inject
 * the form into the PFS party sheet's "Society" tab.
 * 
 * Architecture Note:
 * This function uses the hybrid ApplicationV2 pattern where PartyChronicleApp
 * is used only for context preparation (_prepareContext), not for rendering.
 * Event listeners are attached manually in this function, not in _onRender.
 * See architecture.md for details.
 * 
 * @param container - DOM element to render the form into
 * @param partyActors - Array of party member actors
 * @param partySheet - The party sheet app instance
 * 
 * Requirements: party-chronicle-filling 1.1, 1.2, 1.3, 1.4, multi-line-reputation-tracking 7.1, 7.2, 7.3, 7.4, code-standards-refactoring 1.1, 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function renderPartyChronicleForm(
    container: HTMLElement, 
    partyActors: PartyActor[], 
    partySheet: PartySheetApp
): Promise<void> {
    try {
        // Resolve the Party actor from the party sheet for zip archive storage
        const partyActor = partySheet?.actor;

        // Prepare context using PartyChronicleApp
        const chronicleApp = new PartyChronicleApp(partyActors, {}, partyActor);
        const context: PartyChronicleContext = await chronicleApp._prepareContext();
        
        // Render template
        const template = 'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs';
        const html = await foundry.applications.handlebars.renderTemplate(template, context as any);
        container.innerHTML = html;
        
        // Attach event listeners (hybrid ApplicationV2 pattern)
        attachEventListeners(container, partyActors, partySheet);
        
        // Initialize form state
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
