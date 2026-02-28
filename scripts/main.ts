import { PFSChronicleGeneratorApp } from './PFSChronicleGeneratorApp.js';
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
    updateTreasureBundleDisplay
} from './handlers/party-chronicle-handlers.js';

Hooks.on('init', async () => {
  game.settings.register('pfs-chronicle-generator','gmName', {
        name: 'GM Name',
        hint: 'The name of the Game Master.',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  game.settings.register('pfs-chronicle-generator','gmPfsNumber', {
        name: 'GM PFS Number',
        hint: 'The Pathfinder Society number of the Game Master.',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  game.settings.register('pfs-chronicle-generator','eventName', {
        name: 'Event Name',
        hint: 'The name of the event.',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  game.settings.register('pfs-chronicle-generator','eventcode', {
        name: 'Event Code',
        hint: 'The event code.',
        scope: 'world',
        config: true,
        type: String,
        default: '',
  });
  game.settings.register('pfs-chronicle-generator','eventDate', {
        name: 'Event Date',
        hint: 'The default date for events.',
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

    // --- Generate Chronicle Button (GM only) ---
    if (game.user.isGM) {
        const blankChroniclePath = game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');

        const header = document.createElement('header');
        header.innerHTML = "PFS Chronicle Generator";
        header.classList.add('pfs-chronicle-generator-header');
        header.setAttribute('data-group-id', 'pfs-chronicle-generator');

        const generateButton = document.createElement('button');
        generateButton.innerHTML = '<section class="generate-chronicle"><i class="fas fa-file-pdf"></i> Generate Chronicle</section>';
        generateButton.classList.add('pfs-chronicle-generator-button');
        generateButton.disabled = !blankChroniclePath;
        generateButton.addEventListener('click', (event) => {
            event.preventDefault();
            new PFSChronicleGeneratorApp(sheet.actor).render({force:true});
        });

        pfsTab.append(header);
        pfsTab.append(generateButton);
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
            const confirmed = await Dialog.confirm({
                title: "Delete Chronicle",
                content: "<p>Are you sure you want to delete this chronicle and all saved form data? This action cannot be undone.</p>",
                yes: () => true,
                no: () => false,
                defaultYes: false
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
 * Requirements: 1.1, 1.2
 */
Hooks.on('renderPartySheetPF2e' as any, (app: any, html: any, data: any) => {
    console.log('[PFS Chronicle] renderPartySheetPF2e hook fired!');
    console.log('[PFS Chronicle] Is GM?', game.user.isGM);

    // Only show PFS tab to GMs
    if (!game.user.isGM) {
        console.log('[PFS Chronicle] User is not GM, skipping tab injection');
        return;
    }

    // Wait for content to be fully rendered
    setTimeout(() => {
        console.log('[PFS Chronicle] Attempting to inject PFS tab');
        
        // Find the sub-nav (tab navigation) - matches sheet.hbs structure
        const subNav = html.find('nav.sub-nav');
        console.log('[PFS Chronicle] Found sub-nav:', subNav.length);
        
        if (subNav.length === 0) {
            console.log('[PFS Chronicle] No sub-nav found, cannot inject tab');
            return;
        }

        // Check if PFS tab already exists
        if (subNav.find('[data-tab="pfs"]').length > 0) {
            console.log('[PFS Chronicle] PFS tab already exists');
            return;
        }

        // Log existing tabs
        const existingTabs = subNav.find('a');
        console.log('[PFS Chronicle] Existing tabs:', existingTabs.length);
        existingTabs.each((i: number, tab: any) => {
            console.log('[PFS Chronicle] Tab', i, ':', $(tab).attr('data-tab'), $(tab).text().trim());
        });

        // Create the Society tab button (matches sheet.hbs structure with data-tab attribute)
        const pfsTabButton = $(`
            <a data-tab="pfs">Society</a>
        `);

        // Add the tab button to the navigation (after inventory tab)
        const inventoryTab = subNav.find('[data-tab="inventory"]');
        if (inventoryTab.length > 0) {
            inventoryTab.after(pfsTabButton);
            console.log('[PFS Chronicle] PFS tab button inserted after inventory tab');
        } else {
            subNav.append(pfsTabButton);
            console.log('[PFS Chronicle] PFS tab button appended to sub-nav');
        }

        // Find the container (where tab content goes) - matches sheet.hbs structure
        const container = html.find('section.container');
        console.log('[PFS Chronicle] Found container:', container.length);

        if (container.length === 0) {
            console.log('[PFS Chronicle] No container found');
            return;
        }

        // Create the Society tab content - will contain the party chronicle form
        const pfsTab = $(`
            <div class="tab" data-tab="pfs"></div>
        `);

        // Add the tab content to the container
        container.append(pfsTab);
        console.log('[PFS Chronicle] Society tab content added');

        // Get party actors from the party sheet
        const partyActors = app.actor?.members || [];
        // Filter to only include character actors (exclude null, familiars, NPCs, etc.)
        const characterActors = partyActors.filter((actor: any) => actor && actor.type === 'character');
        console.log('[PFS Chronicle] Party actors:', partyActors.length, 'Character actors:', characterActors.length);
        
        if (characterActors.length === 0) {
            pfsTab.html(`
                <div style="padding: 2rem; text-align: center;">
                    <p>No party members found. Add characters to the party first.</p>
                </div>
            `);
        } else {
            // Render the PartyChronicleApp form directly into the tab
            renderPartyChronicleForm(pfsTab[0], characterActors, app);
        }
        
        console.log('[PFS Chronicle] Society tab injection complete');
    }, 150); // Delay to ensure content is rendered
});

/**
 * Renders the party chronicle form directly into a container element
 * 
 * @param container - DOM element to render the form into
 * @param partyActors - Array of party member actors
 * @param partySheet - The party sheet app instance
 */
async function renderPartyChronicleForm(container: HTMLElement, partyActors: any[], partySheet: any) {
    console.log('[PFS Chronicle] Rendering party chronicle form into tab');
    console.log('[PFS Chronicle] Party actors:', partyActors);
    
    try {
        // Create a PartyChronicleApp instance to prepare context
        const chronicleApp = new PartyChronicleApp(partyActors);
        
        // Prepare the context data
        const context: PartyChronicleContext = await chronicleApp._prepareContext();
        console.log('[PFS Chronicle] Context prepared:', context);
        console.log('[PFS Chronicle] Party members count:', context.partyMembers?.length);
        console.log('[PFS Chronicle] Party members:', context.partyMembers);
        
        // Get the template path
        const template = 'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs';
        
        // Render the template using namespaced version
        const html = await foundry.applications.handlebars.renderTemplate(template, context as any);
        console.log('[PFS Chronicle] Template rendered, HTML length:', html.length);
        
        // Insert the rendered HTML into the container
        container.innerHTML = html;
        
        // Attach event listeners manually since we're not using the full ApplicationV2 lifecycle
        
        // Season change handler
        const seasonSelect = container.querySelector('#season') as HTMLSelectElement;
        seasonSelect?.addEventListener('change', async (event: Event) => {
            await handleSeasonChange(event, container, partyActors, extractFormData);
        });
        
        // Layout change handler
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
        if (treasureBundlesInput) {
            treasureBundlesInput.addEventListener('input', (event: Event) => {
                const input = event.target as HTMLInputElement;
                const treasureBundles = parseInt(input.value, 10) || 0;
                updateAllTreasureBundleDisplays(treasureBundles, container);
            });
        }
        
        // Character level input change handlers for reactive display updates
        const levelInputs = container.querySelectorAll<HTMLInputElement>('input[name$=".level"]');
        levelInputs.forEach((levelInput) => {
            levelInput.addEventListener('input', (event: Event) => {
                const input = event.target as HTMLInputElement;
                const fieldName = input.name;
                const match = fieldName.match(/characters\.([^.]+)\.level/);
                
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
            console.log('[PFS Chronicle] Save button clicked');
            await saveFormData(container, partyActors);
            ui.notifications?.info('Chronicle data saved successfully');
        });
        
        // Clear button handler
        const clearButton = container.querySelector('#clearData');
        clearButton?.addEventListener('click', async (event: Event) => {
            event.preventDefault();
            console.log('[PFS Chronicle] Clear button clicked');
            
            const confirmed = await Dialog.confirm({
                title: 'Clear Chronicle Data',
                content: '<p>Are you sure you want to clear all saved chronicle data? This cannot be undone.</p>',
            });

            if (confirmed) {
                await clearPartyChronicleData();
                ui.notifications?.info('Chronicle data cleared');
                // Re-render the form (which will reset event date to today)
                await renderPartyChronicleForm(container, partyActors, partySheet);
            }
        });
        
        // Generate Chronicles button handler
        const generateButton = container.querySelector('#generateChronicles');
        generateButton?.addEventListener('click', async (event: Event) => {
            event.preventDefault();
            console.log('[PFS Chronicle] Generate Chronicles button clicked');
            
            // Extract form data from the container
            const formData = extractFormData(container, partyActors);
            console.log('[PFS Chronicle] Extracted form data:', formData);
            
            // Call the extracted handler function
            await generateChroniclesFromPartyData(formData, partyActors);
        });
        
        // Portrait click handler
        const portraits = container.querySelectorAll('.actor-image img.actor-link');
        console.log('[PFS Chronicle] Found portrait images:', portraits.length);
        portraits.forEach((img, index) => {
            console.log(`[PFS Chronicle] Attaching click listener to portrait ${index}`);
            img.addEventListener('click', (event: Event) => {
                handlePortraitClick(event as MouseEvent, partyActors);
            });
        });
        
        // Reputation field change handlers (use native DOM APIs)
        const reputationInputs = container.querySelectorAll(
            'input[name^="shared.reputationValues"], input[name="shared.chosenFactionReputation"]'
        );
        console.log('[PFS Chronicle] Found reputation inputs:', reputationInputs.length);
        reputationInputs.forEach((input) => {
            input.addEventListener('change', async (event: Event) => {
                await handleFieldChange(event, container, partyActors, extractFormData);
            });
        });
        
        // Initial population of layout-specific fields
        const layoutId = layoutSelect?.value || '';
        if (layoutId) {
            await updateLayoutSpecificFields(container, layoutId, async () => {
                await saveFormData(container, partyActors);
            });
        }
        
        // Initialize treasure bundle displays on initial render
        const initialTreasureBundles = parseInt(treasureBundlesInput?.value || '0', 10);
        updateAllTreasureBundleDisplays(initialTreasureBundles, container);
        
        // Initial validation display and button state
        updateValidationDisplay(container, partyActors, extractFormData);
        
        console.log('[PFS Chronicle] Party chronicle form rendered and event listeners attached');
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
