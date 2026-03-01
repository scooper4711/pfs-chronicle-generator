import { layoutStore } from './LayoutStore.js';
import { LayoutDesignerApp } from './LayoutDesignerApp.js';
import { PartyChronicleApp } from './PartyChronicleApp.js';
import { clearPartyChronicleData } from './model/party-chronicle-storage.js';
import { generateChronicleFilename } from './utils/filename-utils.js';
import { updateLayoutSpecificFields } from './utils/layout-utils.js';
import { updateValidationDisplay } from './handlers/validation-display.js';
import { PartyChronicleContext } from './model/party-chronicle-types.js';
import { 
    handlePortraitClick, 
    handleSeasonChange, 
    handleLayoutChange, 
    handleFieldChange,
    extractFormData,
    saveFormData,
    generateChroniclesFromPartyData,
    updateAllTreasureBundleDisplays,
    updateTreasureBundleDisplay,
    handleChroniclePathFilePicker
} from './handlers/party-chronicle-handlers.js';
import {
    handleSectionHeaderClick,
    handleSectionHeaderKeydown,
    initializeCollapseSections,
    updateAllSectionSummaries
} from './handlers/collapsible-section-handlers.js';

Hooks.on('init', async () => {
  // Register default settings for GM and event information
  game.settings.register('pfs-chronicle-generator','gmName', {
        name: 'Default GM Name',
        hint: 'The default name of the Game Master (can be overridden when generating chronicles).',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  game.settings.register('pfs-chronicle-generator','gmPfsNumber', {
        name: 'Default GM PFS Number',
        hint: 'The default Pathfinder Society number of the Game Master (can be overridden when generating chronicles).',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  game.settings.register('pfs-chronicle-generator','eventName', {
        name: 'Default Event Name',
        hint: 'The default name of the event (can be overridden when generating chronicles).',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  game.settings.register('pfs-chronicle-generator','eventcode', {
        name: 'Default Event Code',
        hint: 'The default event code (can be overridden when generating chronicles).',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  
  // Register party chronicle data storage (hidden setting)
  game.settings.register('pfs-chronicle-generator', 'partyChronicleData', {
        name: 'Party Chronicle Data',
        hint: 'Temporary storage for party chronicle data being filled out.',
        scope: 'world',
        config: false,
        type: Object,
        default: undefined,
  });
  
    // Hidden settings are registered on 'ready' (managed via Select Layout menu)

    game.settings.registerMenu("pfs-chronicle-generator", "layoutDesigner", {
        name: "Select Layout",
        label: "Select Layout",
    hint: "Open the layout designer to create and edit chronicle layouts.",
    icon: "fas fa-ruler-combined",
    type: LayoutDesignerApp,
    restricted: true,
  });

  game.modules.get('pfs-chronicle-generator').api = {
    LayoutDesignerApp
  };
});

// Hidden settings registered and initialized on ready
Hooks.on('ready', async () => {
    await layoutStore.initialize();
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

Hooks.on('renderCharacterSheetPF2e' as any, (sheet: any, html: any, data: any) => {
    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) {
        return;
    }

    // --- Download and Delete Buttons ---
    const chroniclePdf = sheet.actor.getFlag('pfs-chronicle-generator', 'chroniclePdf');

    const downloadButton = document.createElement('button');
    downloadButton.innerHTML = '<i class="fas fa-download"></i> Download Chronicle';
    downloadButton.disabled = !chroniclePdf;
    downloadButton.addEventListener('click', (event) => {
        event.preventDefault();
        if (chroniclePdf) {
            const byteCharacters = atob(chroniclePdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: 'application/pdf'});
            const blankChroniclePath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath') as string;
            const filename = generateChronicleFilename(sheet.actor.name, blankChroniclePath);
            var FileSaver = require('file-saver');
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
 * Hook: renderPartySheetPF2e
 * 
 * Detects when the party sheet is rendered and injects a GM-only "PFS" tab.
 * Matches the structure from templates/actors/party/sheet.hbs with data-tab attributes.
 * 
 * Requirements: party-chronicle-filling 1.1, 1.2
 */
Hooks.on('renderPartySheetPF2e' as any, (app: any, html: any, data: any) => {
    // Only show PFS tab to GMs
    if (!game.user.isGM) return;

    // Wait for content to be fully rendered
    setTimeout(() => {
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

        // Get party actors and filter to character actors only
        const partyActors = app.actor?.members || [];
        const characterActors = partyActors.filter((actor: any) => actor && actor.type === 'character');
        
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
 * template has been rendered. It's separated from renderPartyChronicleForm to
 * improve readability and maintainability.
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
    partyActors: any[],
    partySheet: any
): void {
    // Season and layout change handlers
    const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
    seasonSelect?.addEventListener('change', async (event: Event) => {
        await handleSeasonChange(event, container, partyActors, extractFormData);
    });
    
    const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
    layoutSelect?.addEventListener('change', async (event: Event) => {
        await handleLayoutChange(event, container, partyActors, extractFormData);
    });
    
    // Field change handler for auto-save and validation
    const formElements = container.querySelectorAll('input, select, textarea');
    formElements.forEach((element) => {
        element.addEventListener('change', async (event: Event) => {
            await handleFieldChange(event, container, partyActors, extractFormData);
        });
    });
    
    // Treasure bundles input change handler for reactive display updates
    const treasureBundlesInput = container.querySelector<HTMLInputElement>('#treasureBundles');
    treasureBundlesInput?.addEventListener('input', (event: Event) => {
        const input = event.target as HTMLInputElement;
        const treasureBundles = parseInt(input.value, 10) || 0;
        updateAllTreasureBundleDisplays(treasureBundles, container);
    });
    
    // Character level input change handlers for reactive display updates
    const levelInputs = container.querySelectorAll<HTMLInputElement>('input[name$=".level"]');
    levelInputs.forEach((levelInput) => {
        levelInput.addEventListener('input', (event: Event) => {
            const input = event.target as HTMLInputElement;
            const match = input.name.match(/characters\.([^.]+)\.level/);
            
            if (match) {
                const characterId = match[1];
                const treasureBundlesInput = container.querySelector<HTMLInputElement>('#treasureBundles');
                const treasureBundles = parseInt(treasureBundlesInput?.value || '0', 10);
                const characterLevel = parseInt(input.value, 10);
                updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
            }
        });
    });
    
    // Save button handler
    const saveButton = container.querySelector('#saveData');
    saveButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        await saveFormData(container, partyActors);
        ui.notifications?.info('Chronicle data saved successfully');
    });
    
    // Clear button handler
    const clearButton = container.querySelector('#clearData');
    clearButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Clear Chronicle Data' },
            content: '<p>Are you sure you want to clear all saved chronicle data? This cannot be undone.</p>',
            rejectClose: false,
            modal: true
        });

        if (confirmed) {
            await clearPartyChronicleData();
            ui.notifications?.info('Chronicle data cleared');
            await renderPartyChronicleForm(container, partyActors, partySheet);
        }
    });
    
    // Generate Chronicles button handler
    const generateButton = container.querySelector('#generateChronicles');
    generateButton?.addEventListener('click', async (event: Event) => {
        event.preventDefault();
        const formData = extractFormData(container, partyActors);
        await generateChroniclesFromPartyData(formData, partyActors);
    });
    
    // Portrait click handler
    const portraits = container.querySelectorAll('.actor-image img.actor-link');
    portraits.forEach((img) => {
        img.addEventListener('click', (event: Event) => {
            handlePortraitClick(event as MouseEvent, partyActors);
        });
    });
    
    // Chronicle path file picker button handler
    const filePickerButton = container.querySelector('#chroniclePathFilePicker');
    filePickerButton?.addEventListener('click', async (event: Event) => {
        await handleChroniclePathFilePicker(event, container, partyActors);
    });
    
    // Collapsible section header click handlers
    const collapsibleHeaders = container.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach((header) => {
        header.addEventListener('click', (event: Event) => {
            handleSectionHeaderClick(event as MouseEvent, container);
        });
        header.addEventListener('keydown', (event: Event) => {
            handleSectionHeaderKeydown(event as KeyboardEvent, container);
        });
    });
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
    partyActors: any[]
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
    const treasureBundlesInput = container.querySelector<HTMLInputElement>('#treasureBundles');
    const initialTreasureBundles = parseInt(treasureBundlesInput?.value || '0', 10);
    updateAllTreasureBundleDisplays(initialTreasureBundles, container);
    
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
async function renderPartyChronicleForm(container: HTMLElement, partyActors: any[], partySheet: any) {
    try {
        // Prepare context using PartyChronicleApp
        const chronicleApp = new PartyChronicleApp(partyActors);
        const context: PartyChronicleContext = await chronicleApp._prepareContext();
        
        // Render template
        const template = 'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs';
        const html = await foundry.applications.handlebars.renderTemplate(template, context as any);
        container.innerHTML = html;
        
        // Attach event listeners (hybrid ApplicationV2 pattern)
        attachEventListeners(container, partyActors, partySheet);
        
        // Initialize form state
        await initializeForm(container, partyActors);
    } catch (error) {
        console.error('[PFS Chronicle] Error rendering form:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: red;">
                <p>Error loading party chronicle form. Check console for details.</p>
                <p>${errorMessage}</p>
            </div>
        `;
    }
}
