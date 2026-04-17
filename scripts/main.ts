import { layoutStore } from './LayoutStore.js';
import { debug, error } from './utils/logger.js';
import { PartyChronicleApp } from './PartyChronicleApp.js';
import { generateChronicleFilename } from './utils/filename-utils.js';
import { updateLayoutSpecificFields } from './utils/layout-utils.js';
import { updateValidationDisplay } from './handlers/validation-display.js';
import { PartyChronicleContext } from './model/party-chronicle-types.js';
import { calculateTaskLevelOptions } from './utils/earned-income-calculator.js';
import { getCreditsAwarded } from './utils/treasure-bundle-calculator.js';
import { getZeroCurrencyDisplay, getCurrencyLabel } from './utils/currency-formatter.js';
import { isStarfinder, getGameSystemRoot } from './utils/game-system-detector.js';
import type { GameSystem } from './utils/game-system-detector.js';
import { 
    extractFormData,
    saveFormData,
    updateAllTreasureBundleDisplays,
    updateAllCreditsAwardedDisplays,
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
    attachGmCharacterListeners,
    attachOverrideListeners
} from './handlers/event-listener-helpers.js';
import { initializeOverrideStates } from './handlers/override-handlers.js';

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

  // Requirements: starfinder-support 3.5, 3.7, 5.2
  Handlebars.registerHelper('getCreditsAwarded', function(level: number) {
    return getCreditsAwarded(level);
  });

  Handlebars.registerHelper('getZeroCurrencyDisplay', function(gameSystem: string) {
    return getZeroCurrencyDisplay(gameSystem as GameSystem);
  });

  Handlebars.registerHelper('getCurrencyLabel', function(gameSystem: string) {
    return getCurrencyLabel(gameSystem as GameSystem);
  });
}

Hooks.on('init', async () => {
  registerSettings();
  registerHandlebarsHelpers();
});

// Hidden settings registered and initialized on ready
Hooks.on('ready', async () => {
    await layoutStore.initialize();
    const seasons = layoutStore.getSeasons(getGameSystemRoot());
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

/**
 * Handles character sheet rendering for both PF2e and SF2e systems.
 * Adds Download/Delete Chronicle buttons to the PFS tab.
 *
 * Requirements: starfinder-support 2.3
 */
function handleCharacterSheetRender(sheet: CharacterSheetApp, html: JQuery): void {
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
}

Hooks.on('renderCharacterSheetPF2e' as any, (sheet: CharacterSheetApp, html: JQuery, _data: any) => {
    handleCharacterSheetRender(sheet, html);
});

// Requirements: starfinder-support 2.3
Hooks.on('renderCharacterSheetSF2e' as any, (sheet: CharacterSheetApp, html: JQuery, _data: any) => {
    handleCharacterSheetRender(sheet, html);
});

/**
 * Hook: renderPartySheetPF2e
 * 
 * Detects when the party sheet is rendered and injects a GM-only "PFS" tab.
 * Matches the structure from templates/actors/party/sheet.hbs with data-tab attributes.
 * 
 * Requirements: party-chronicle-filling 1.1, 1.2
 */

/**
 * Tracks the last active tab on the party sheet so we can restore it across
 * re-renders. Foundry's Tabs controller resets to the `initial` tab ("overview")
 * whenever the sheet re-renders from template, because the injected "pfs" tab
 * doesn't exist in the template. We intercept tab clicks to remember the real
 * active tab and restore it after re-injection.
 */
let lastActivePartyTab: string | null = null;

/**
 * Saved scroll positions for the Society tab's scrollable elements.
 * Foundry's built-in _saveScrollPositions/_restoreScrollPositions can't help
 * here because our tab content is destroyed and recreated on each re-render.
 * We track the scroll top of the tab itself, the sidebar, and the content area.
 */
interface ScrollSnapshot {
    tab: number;
    sidebar: number;
    content: number;
}
let savedScrollPositions: ScrollSnapshot | null = null;

/**
 * Saved focus state for the Society tab. Tracks which element had focus
 * (by id) and the cursor/selection position so the GM doesn't lose their
 * place in a text field when a player update triggers a re-render.
 */
interface FocusSnapshot {
    elementId: string;
    selectionStart: number | null;
    selectionEnd: number | null;
}
let savedFocusState: FocusSnapshot | null = null;

/** Restores previously-saved scroll positions after the Society tab is rebuilt. */
function restoreScrollPositions(html: JQuery): void {
    if (!savedScrollPositions) return;

    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    pfsTab[0].scrollTop = savedScrollPositions.tab;

    const sidebar = pfsTab.find('.sidebar')[0];
    if (sidebar) sidebar.scrollTop = savedScrollPositions.sidebar;

    const content = pfsTab.find('.content')[0];
    if (content) content.scrollTop = savedScrollPositions.content;

    debug('Restored Society tab scroll positions');
}

/** Restores focus to the previously-focused element after the Society tab is rebuilt. */
function restoreFocusState(html: JQuery): void {
    if (!savedFocusState) return;

    const snapshot = savedFocusState;
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    // Defer focus restoration to after the browser completes its layout pass.
    // Without this, Foundry's own post-render focus management can steal focus
    // away from our element immediately after we set it.
    requestAnimationFrame(() => {
        const element = pfsTab[0].querySelector<HTMLElement>(`#${CSS.escape(snapshot.elementId)}`);
        if (!element) return;

        element.focus();

        // Restore cursor/selection position for text inputs and textareas
        if (
            (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
            snapshot.selectionStart !== null
        ) {
            element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
        }

        debug(`Restored focus to #${snapshot.elementId}`);
    });
}

/**
 * Re-binds the Foundry AppV1 Tabs controller after injecting a new tab,
 * then restores the tab the GM was actually on before the re-render.
 *
 * AppV1 sheets store an array of Tabs controllers in `_tabs`. Each controller
 * manages click handlers on `[data-tab]` elements inside its `navSelector` and
 * toggles the matching content panel inside `contentSelector`. When we inject a
 * new tab after initial render, the controller doesn't know about it. Calling
 * `bind(html)` re-scans the DOM and re-attaches click handlers, then
 * `activate(tab)` switches to the correct tab.
 *
 * Reference: PartySheetPF2e.defaultOptions.tabs defines a single controller
 * with navSelector "form > nav" and contentSelector ".container".
 */
function rebindTabController(app: PartySheetApp, html: JQuery): void {
    const tabControllers = (app as any)._tabs;
    if (!Array.isArray(tabControllers) || tabControllers.length === 0) {
        debug('No _tabs controllers found on party sheet app; skipping rebind.');
        return;
    }

    const tabController = tabControllers[0];

    // Re-scan the DOM for [data-tab] elements and attach click handlers
    tabController.bind(html[0]);

    // Restore the tab the GM was actually on. Foundry's controller will have
    // reset to "overview" because the fresh DOM didn't include our "pfs" tab.
    const tabToRestore = lastActivePartyTab || tabController.active;
    tabController.activate(tabToRestore);
    debug(`Rebound tab controller; active tab restored to "${tabToRestore}".`);
}

/**
 * Installs a click listener on the tab nav to track which tab the GM selects.
 */
function trackTabClicks(html: JQuery): void {
    const subNav = html.find('nav.sub-nav');
    subNav.on('click', '[data-tab]', function () {
        const tab = $(this).data('tab') as string;
        if (tab) {
            lastActivePartyTab = tab;
            debug(`Tracked active party tab: "${tab}"`);
        }
    });
}

/**
 * Installs scroll listeners on the Society tab's scrollable elements to
 * continuously track scroll positions. Called after content is rendered so
 * the sidebar and content elements exist in the DOM.
 */
function trackScrollPositions(html: JQuery): void {
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    pfsTab[0].addEventListener('scroll', () => {
        savedScrollPositions = savedScrollPositions || { tab: 0, sidebar: 0, content: 0 };
        savedScrollPositions.tab = pfsTab[0].scrollTop;
    });

    const sidebar = pfsTab.find('.sidebar')[0];
    if (sidebar) {
        sidebar.addEventListener('scroll', () => {
            savedScrollPositions = savedScrollPositions || { tab: 0, sidebar: 0, content: 0 };
            savedScrollPositions.sidebar = sidebar.scrollTop;
        });
    }

    const content = pfsTab.find('.content')[0];
    if (content) {
        content.addEventListener('scroll', () => {
            savedScrollPositions = savedScrollPositions || { tab: 0, sidebar: 0, content: 0 };
            savedScrollPositions.content = content.scrollTop;
        });
    }
}

/**
 * Installs focusin/focusout listeners on the Society tab to continuously
 * track which element has focus and the cursor position. Called after content
 * is rendered so form elements exist in the DOM.
 */
function trackFocusState(html: JQuery): void {
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) return;

    const updateSelection = (target: HTMLElement): void => {
        if (!target.id) return;
        savedFocusState = {
            elementId: target.id,
            selectionStart: (target as HTMLInputElement).selectionStart ?? null,
            selectionEnd: (target as HTMLInputElement).selectionEnd ?? null,
        };
    };

    pfsTab[0].addEventListener('focusin', (event: FocusEvent) => {
        updateSelection(event.target as HTMLElement);
    });

    // Track cursor movement continuously so the snapshot stays current
    for (const eventName of ['keyup', 'click', 'select'] as const) {
        pfsTab[0].addEventListener(eventName, (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.id && document.activeElement === target) {
                updateSelection(target);
            }
        });
    }

    // Note: we intentionally do NOT clear savedFocusState on focusout.
    // When a re-render destroys the DOM, focusout fires before our hook
    // runs, which would wipe the state we need to restore.
}
Hooks.on('renderPartySheetPF2e' as any, (app: PartySheetApp, html: JQuery, _data: any) => {
    handlePartySheetRender(app, html);
});

// Requirements: starfinder-support 2.2
Hooks.on('renderPartySheetSF2e' as any, (app: PartySheetApp, html: JQuery, _data: any) => {
    handlePartySheetRender(app, html);
});

/**
 * Handles party sheet rendering for both PF2e and SF2e systems.
 * Injects a GM-only "Society" tab into the party sheet.
 *
 * Requirements: party-chronicle-filling 1.1, 1.2, starfinder-support 2.2
 */
function handlePartySheetRender(app: PartySheetApp, html: JQuery): void {
    // Only show PFS tab to GMs
    if (!game.user.isGM) return;

    // Find the sub-nav (tab navigation)
    const subNav = html.find('nav.sub-nav');
    if (subNav.length === 0) return;

    // Check if PFS tab already exists
    if (subNav.find('[data-tab="pfs"]').length > 0) return;

    // Create the Society tab button
    const pfsTabButton = $(`<a data-tab="pfs">Society</a>`);

    // Add the tab button to the navigation (after inventory tab)
    const inventoryTab = subNav.find('[data-tab="inventory"]');
    if (inventoryTab.length > 0) {
        inventoryTab.after(pfsTabButton);
    } else {
        subNav.append(pfsTabButton);
    }

    // Find the container (where tab content goes)
    const container = html.find('section.container');
    if (container.length === 0) return;

    // Create the Society tab content
    const pfsTab = $(`<div class="tab" data-tab="pfs"></div>`);
    container.append(pfsTab);

    // Re-bind the Foundry Tabs controller so it recognizes the new "pfs" tab.
    rebindTabController(app, html);

    // Track tab clicks for tab preservation (works on the nav, doesn't need content)
    trackTabClicks(html);

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
        renderPartyChronicleForm(pfsTab[0], characterActors, app).then(() => {
            // Restore UI state, then attach listeners for continuous tracking.
            restoreScrollPositions(html);
            restoreFocusState(html);
            trackScrollPositions(html);
            trackFocusState(html);
        });
    }
}

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
    
    // Override checkbox listeners (XP and currency overrides)
    attachOverrideListeners(container);
    
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
    
    // Initialize treasure bundle / credits awarded displays on initial render
    // Requirements: starfinder-support 5.2
    if (isStarfinder()) {
        updateAllCreditsAwardedDisplays(container);
    } else {
        const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
        const initialTreasureBundles = Number.parseFloat(treasureBundlesSelect?.value || '0');
        updateAllTreasureBundleDisplays(initialTreasureBundles, container);
    }
    
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
    
    // Initialize override states from saved data
    // Requirements: gm-override-values 6.2
    initializeOverrideStates(container);
    
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
