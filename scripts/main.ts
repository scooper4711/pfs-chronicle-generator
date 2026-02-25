import { PFSChronicleGeneratorApp } from './PFSChronicleGeneratorApp.js';
import { layoutStore } from './LayoutStore.js';
import { LayoutDesignerApp } from './LayoutDesignerApp.js';
import { PartyChronicleApp } from './PartyChronicleApp.js';
import { loadPartyChronicleData, savePartyChronicleData, clearPartyChronicleData } from './model/party-chronicle-storage.js';

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

    function sanitizeFilename(name: string) {
        return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
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
            const chronicleFileName = blankChroniclePath.split('/').pop() || 'chronicle.pdf';
            const sanitizedActorName = sanitizeFilename(sheet.actor.name);
            const sanitizedChronicleFileName = sanitizeFilename(chronicleFileName);
            var FileSaver = require('file-saver');
            FileSaver.saveAs(blob, `${sanitizedActorName}_${sanitizedChronicleFileName}`);
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
Hooks.on('renderPartySheetPF2e', (app: any, html: any, data: any) => {
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
        const context = await chronicleApp._prepareContext();
        console.log('[PFS Chronicle] Context prepared:', context);
        console.log('[PFS Chronicle] Party members count:', context.partyMembers?.length);
        console.log('[PFS Chronicle] Party members:', context.partyMembers);
        
        // Get the template path
        const template = 'modules/pfs-chronicle-generator/templates/party-chronicle-filling.hbs';
        
        // Render the template using namespaced version
        const html = await foundry.applications.handlebars.renderTemplate(template, context);
        console.log('[PFS Chronicle] Template rendered, HTML length:', html.length);
        
        // Insert the rendered HTML into the container
        container.innerHTML = html;
        
        // Attach event listeners manually since we're not using the full ApplicationV2 lifecycle
        const $container = $(container);
        
        // Season change handler
        $container.find('#season').on('change', async (event: any) => {
            console.log('[PFS Chronicle] Season changed');
            const seasonId = event.target.value;
            const layouts = layoutStore.getLayoutsByParent(seasonId);
            
            const layoutDropdown = $container.find('#layout');
            layoutDropdown.empty();
            for (const layout of layouts) {
                const option = document.createElement('option');
                option.value = layout.id;
                option.innerText = layout.description;
                layoutDropdown.append(option);
            }
            
            if (layouts.length > 0) {
                layoutDropdown.val(layouts[0].id);
                layoutDropdown.trigger('change');
            }
            
            // Auto-save
            await saveFormData($container, partyActors);
            
            // Update validation display
            updateValidationDisplay($container, partyActors);
        });
        
        // Layout change handler
        $container.find('#layout').on('change', async (event: any) => {
            console.log('[PFS Chronicle] Layout changed');
            const layoutId = event.target.value;
            
            // Update blank chronicle path if defaultChronicleLocation exists
            const layout = await layoutStore.getLayout(layoutId);
            if (layout?.defaultChronicleLocation) {
                try {
                    const response = await fetch(layout.defaultChronicleLocation, { method: 'HEAD' });
                    if (response.ok) {
                        $container.find('#blankChroniclePath').val(layout.defaultChronicleLocation);
                    }
                } catch (error) {
                    console.log(`Default chronicle location not accessible: ${layout.defaultChronicleLocation}`);
                }
            }
            
            // Update layout-specific fields (checkboxes and strikeout items)
            await updateLayoutSpecificFields($container, layoutId);
            
            // Auto-save
            await saveFormData($container, partyActors);
            
            // Update validation display
            updateValidationDisplay($container, partyActors);
        });
        
        // Field change handler for auto-save and validation
        $container.find('input, select, textarea').on('change', async (event: any) => {
            console.log('[PFS Chronicle] Field changed');
            await saveFormData($container, partyActors);
            // Update validation display and button state
            updateValidationDisplay($container, partyActors);
        });
        
        // Save button handler
        $container.find('#saveData').on('click', async (event: any) => {
            event.preventDefault();
            console.log('[PFS Chronicle] Save button clicked');
            await saveFormData($container, partyActors);
            ui.notifications?.info('Chronicle data saved successfully');
        });
        
        // Clear button handler
        $container.find('#clearData').on('click', async (event: any) => {
            event.preventDefault();
            console.log('[PFS Chronicle] Clear button clicked');
            
            const confirmed = await Dialog.confirm({
                title: 'Clear Chronicle Data',
                content: '<p>Are you sure you want to clear all saved chronicle data? This cannot be undone.</p>',
            });

            if (confirmed) {
                await clearPartyChronicleData();
                ui.notifications?.info('Chronicle data cleared');
                // Re-render the form
                await renderPartyChronicleForm(container, partyActors, partySheet);
            }
        });
        
        // Generate Chronicles button handler
        $container.find('#generateChronicles').on('click', async (event: any) => {
            event.preventDefault();
            console.log('[PFS Chronicle] Generate Chronicles button clicked');
            
            // Extract form data from the container
            const formData = extractFormData($container, partyActors);
            console.log('[PFS Chronicle] Extracted form data:', formData);
            
            // Call the generateChronicles method
            await generateChroniclesFromForm(formData, partyActors);
            
            // Re-render party sheet to update download buttons
            partySheet.render(true);
        });
        
        // Portrait click handler
        const portraits = container.querySelectorAll('.actor-image img.actor-link');
        console.log('[PFS Chronicle] Found portrait images:', portraits.length);
        portraits.forEach((img, index) => {
            console.log(`[PFS Chronicle] Attaching click listener to portrait ${index}`);
            img.addEventListener('click', (event: MouseEvent) => {
                console.log('[PFS Chronicle] Portrait clicked!', event.target);
                event.preventDefault();
                
                const memberActivity = (event.target as HTMLElement).closest('.member-activity');
                console.log('[PFS Chronicle] Member activity element:', memberActivity);
                
                const characterId = memberActivity?.getAttribute('data-character-id');
                console.log('[PFS Chronicle] Character ID:', characterId);
                
                if (!characterId) {
                    console.warn('[PFS Chronicle] Portrait clicked but no character ID found');
                    return;
                }
                
                const actor = partyActors.find(a => a?.id === characterId);
                console.log('[PFS Chronicle] Found actor:', actor);
                
                if (actor?.sheet) {
                    console.log('[PFS Chronicle] Opening actor sheet');
                    actor.sheet.render(true, { focus: true });
                } else {
                    console.warn('[PFS Chronicle] Actor or actor sheet not found');
                }
            });
        });
        
        // Initial population of layout-specific fields
        const layoutId = $container.find('#layout').val() as string;
        if (layoutId) {
            await updateLayoutSpecificFields($container, layoutId);
        }
        
        // Initial validation display and button state
        updateValidationDisplay($container, partyActors);
        
        console.log('[PFS Chronicle] Party chronicle form rendered and event listeners attached');
    } catch (error) {
        console.error('[PFS Chronicle] Error rendering form:', error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: red;">
                <p>Error loading party chronicle form. Check console for details.</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Updates layout-specific fields (checkboxes and strikeout items)
 */
async function updateLayoutSpecificFields($container: any, layoutId: string) {
    if (!layoutId) return;
    
    const layout = await layoutStore.getLayout(layoutId);
    
    // Get checkbox and strikeout choices from layout
    const checkboxChoices = findCheckboxChoices(layout);
    const strikeoutChoices = findStrikeoutChoices(layout);
    
    // Load saved data to determine which items are selected
    const savedStorage = await loadPartyChronicleData();
    const savedCheckboxes = savedStorage?.data?.shared?.adventureSummaryCheckboxes || [];
    const savedStrikeouts = savedStorage?.data?.shared?.strikeoutItems || [];
    
    // Update adventure summary checkboxes
    const checkboxContainer = $container.find('#adventureSummaryCheckboxes .checkbox-choices');
    checkboxContainer.empty();
    checkboxChoices.forEach((choice: string, index: number) => {
        const div = $('<div class="checkbox-choice"></div>');
        const checkbox = $(`<input type="checkbox" id="checkbox-${index}" name="shared.adventureSummaryCheckboxes" value="${choice}" ${savedCheckboxes.includes(choice) ? 'checked' : ''}>`);
        const label = $(`<label for="checkbox-${index}">${choice}</label>`);
        div.append(checkbox).append(label);
        checkboxContainer.append(div);
    });
    
    // Update strikeout items
    const strikeoutContainer = $container.find('#strikeoutItems .strikeout-choices');
    strikeoutContainer.empty();
    strikeoutChoices.forEach((choice: string, index: number) => {
        const div = $('<div class="item-choice"></div>');
        const checkbox = $(`<input type="checkbox" id="strikeout-${index}" name="shared.strikeoutItems" value="${choice}" ${savedStrikeouts.includes(choice) ? 'checked' : ''}>`);
        const label = $(`<label for="strikeout-${index}">${choice}</label>`);
        div.append(checkbox).append(label);
        strikeoutContainer.append(div);
    });
    
    // Re-attach change listeners to new checkboxes
    $container.find('#adventureSummaryCheckboxes input, #strikeoutItems input').on('change', async () => {
        await saveFormData($container, []);
    });
}

/**
 * Extracts checkbox choices from layout parameters
 */
function findCheckboxChoices(layout: any): string[] {
    const params = layout?.parameters?.Checkboxes?.summary_checkbox;
    if (params && params.choices && Array.isArray(params.choices)) {
        return params.choices as string[];
    }
    return [];
}

/**
 * Extracts strikeout item choices from layout parameters
 */
function findStrikeoutChoices(layout: any): string[] {
    const params = layout?.parameters?.Items?.strikeout_item_lines;
    if (params && params.choices && Array.isArray(params.choices)) {
        return params.choices as string[];
    }
    return [];
}

/**
 * Saves form data to world flags
 */
async function saveFormData($container: any, partyActors: any[]) {
    try {
        const formData = extractFormData($container, partyActors);
        await savePartyChronicleData(formData);
        console.log('[PFS Chronicle] Auto-saved party chronicle data');
    } catch (error) {
        console.error('[PFS Chronicle] Auto-save failed:', error);
        ui.notifications?.warn('Failed to auto-save chronicle data');
    }
}

/**
 * Extracts form data into PartyChronicleData structure
 */
function extractFormData($container: any, partyActors: any[]): any {
    const formElement = $container.closest('form')[0] || $container[0];
    const formData = new FormData(formElement);
    
    // Extract shared fields
    const shared: any = {
        gmPfsNumber: $container.find('#gmPfsNumber').val() || '',
        scenarioName: $container.find('#scenarioName').val() || '',
        eventCode: $container.find('#eventCode').val() || '',
        eventDate: $container.find('#eventDate').val() || '',
        xpEarned: parseInt($container.find('#xpEarned').val() as string) || 0,
        treasureBundles: parseInt($container.find('#treasureBundles').val() as string) || 0,
        layoutId: $container.find('#layout').val() || '',
        seasonId: $container.find('#season').val() || '',
        blankChroniclePath: $container.find('#blankChroniclePath').val() || '',
        adventureSummaryCheckboxes: $container.find('input[name="shared.adventureSummaryCheckboxes"]:checked').map(function() { return $(this).val(); }).get(),
        strikeoutItems: $container.find('input[name="shared.strikeoutItems"]:checked').map(function() { return $(this).val(); }).get(),
    };
    
    // Extract character-specific fields
    const characters: any = {};
    partyActors.forEach((actor: any) => {
        const actorId = actor.id;
        characters[actorId] = {
            // Read from hidden fields (non-editable)
            characterName: $container.find(`input[name="characters.${actorId}.characterName"]`).val() || actor.name,
            societyId: $container.find(`input[name="characters.${actorId}.societyId"]`).val() || '',
            level: parseInt($container.find(`input[name="characters.${actorId}.level"]`).val() as string) || actor.level || 1,
            // Read from visible editable fields
            incomeEarned: parseFloat($container.find(`#incomeEarned-${actorId}`).val() as string) || 0,
            goldEarned: parseFloat($container.find(`#goldEarned-${actorId}`).val() as string) || 0,
            goldSpent: parseFloat($container.find(`#goldSpent-${actorId}`).val() as string) || 0,
            notes: $container.find(`#notes-${actorId}`).val() || '',
            reputation: $container.find(`#reputation-${actorId}`).val() || '',
        };
    });
    
    return { shared, characters };
}

/**
 * Updates validation error display and button state
 * Shows inline errors and summary panel, disables generate button if errors exist
 * 
 * Requirements: 6.3, 6.4
 */
function updateValidationDisplay($container: any, partyActors: any[]): void {
    // Import validation functions
    const { validateSharedFields, validateUniqueFields } = require('./model/party-chronicle-validator.js');
    
    // Extract form data
    const formData = extractFormData($container, partyActors);
    
    // Validate shared fields
    const sharedValidation = validateSharedFields(formData.shared);
    
    // Validate unique fields for all characters
    const allErrors: string[] = [...sharedValidation.errors];
    for (const [actorId, unique] of Object.entries(formData.characters)) {
        const actor = partyActors.find(a => a.id === actorId);
        const characterName = actor?.name || actorId;
        const result = validateUniqueFields(unique as any, characterName);
        allErrors.push(...result.errors);
    }
    
    // Update validation error summary panel
    const errorPanel = $container.find('#validationErrors');
    const errorList = $container.find('#validationErrorList');
    
    if (allErrors.length > 0) {
        // Show error panel with errors
        errorList.empty();
        allErrors.forEach(error => {
            errorList.append(`<li>${error}</li>`);
        });
        errorPanel.show();
    } else {
        // Hide error panel
        errorPanel.hide();
    }
    
    // Update generate button state
    const generateButton = $container.find('#generateChronicles');
    if (allErrors.length > 0) {
        generateButton.prop('disabled', true);
        generateButton.attr('data-tooltip', 'Please correct validation errors before generating chronicles');
    } else {
        generateButton.prop('disabled', false);
        generateButton.attr('data-tooltip', 'Generate Chronicles');
    }
    
    // Clear all previous field error styling
    $container.find('.form-group').removeClass('has-error');
    $container.find('.field-error').remove();
    
    // Add inline error styling for specific fields
    // This is a simplified approach - we mark fields as invalid based on error messages
    if (sharedValidation.errors.length > 0) {
        sharedValidation.errors.forEach(error => {
            // Map error messages to field IDs
            if (error.includes('GM PFS Number')) {
                const formGroup = $container.find('#gmPfsNumber').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Required</span>');
            }
            if (error.includes('Scenario Name')) {
                const formGroup = $container.find('#scenarioName').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Required</span>');
            }
            if (error.includes('Event Code')) {
                const formGroup = $container.find('#eventCode').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Required</span>');
            }
            if (error.includes('Event Date')) {
                const formGroup = $container.find('#eventDate').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Invalid date</span>');
            }
            if (error.includes('XP Earned')) {
                const formGroup = $container.find('#xpEarned').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Invalid value</span>');
            }
            if (error.includes('Treasure Bundles')) {
                const formGroup = $container.find('#treasureBundles').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Must be 0-10</span>');
            }
            if (error.includes('Layout selection')) {
                const formGroup = $container.find('#layout').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Required</span>');
            }
            if (error.includes('Season selection')) {
                const formGroup = $container.find('#season').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Required</span>');
            }
            if (error.includes('Blank Chronicle Path')) {
                const formGroup = $container.find('#blankChroniclePath').closest('.form-group');
                formGroup.addClass('has-error');
                formGroup.find('label').after('<span class="field-error">Required</span>');
            }
        });
    }
    
    // Add inline error styling for character-specific fields
    partyActors.forEach((actor: any) => {
        const actorId = actor.id;
        const characterName = actor.name;
        const unique = formData.characters[actorId];
        const result = validateUniqueFields(unique as any, characterName);
        
        if (result.errors.length > 0) {
            result.errors.forEach(error => {
                // Map error messages to field IDs (remove character name prefix)
                const errorWithoutPrefix = error.replace(`${characterName}: `, '');
                
                if (errorWithoutPrefix.includes('Society ID')) {
                    const formGroup = $container.find(`#incomeEarned-${actorId}`).closest('.member-activity').find('.character-society-id');
                    formGroup.css('color', '#d32f2f');
                }
                if (errorWithoutPrefix.includes('Income Earned')) {
                    const formGroup = $container.find(`#incomeEarned-${actorId}`).closest('.form-group');
                    formGroup.addClass('has-error');
                }
                if (errorWithoutPrefix.includes('Gold Earned')) {
                    const formGroup = $container.find(`#goldEarned-${actorId}`).closest('.form-group');
                    formGroup.addClass('has-error');
                }
                if (errorWithoutPrefix.includes('Gold Spent')) {
                    const formGroup = $container.find(`#goldSpent-${actorId}`).closest('.form-group');
                    formGroup.addClass('has-error');
                }
            });
        }
    });
}


/**
 * Generates chronicles for all party members from form data
 * This is the main entry point for chronicle generation from the party interface
 */
async function generateChroniclesFromForm(formData: any, partyActors: any[]) {
    console.log('[PFS Chronicle] Starting chronicle generation for party');
    
    // Import required modules
    const { validateSharedFields, validateUniqueFields } = await import('./model/party-chronicle-validator.js');
    const { mapToCharacterData } = await import('./model/party-chronicle-mapper.js');
    const { clearPartyChronicleData } = await import('./model/party-chronicle-storage.js');
    const { PdfGenerator } = await import('./PdfGenerator.js');
    const { PDFDocument } = await import('pdf-lib');
    const fontkit = await import('@pdf-lib/fontkit');
    
    // Validate shared fields
    const sharedValidation = validateSharedFields(formData.shared);
    if (!sharedValidation.valid) {
        ui.notifications?.error(`Validation failed: ${sharedValidation.errors.join(', ')}`);
        return;
    }
    
    // Validate unique fields for all characters
    const allErrors: string[] = [];
    for (const [actorId, unique] of Object.entries(formData.characters)) {
        const actor = partyActors.find(a => a.id === actorId);
        const characterName = actor?.name || actorId;
        const result = validateUniqueFields(unique as any, characterName);
        allErrors.push(...result.errors);
    }
    
    if (allErrors.length > 0) {
        ui.notifications?.error(`Validation failed: ${allErrors.join(', ')}`);
        return;
    }
    
    // Collect generation results for all characters
    const results: any[] = [];
    let allSucceeded = true;
    
    // Get the selected layout
    const layoutId = formData.shared?.layoutId || game.settings.get('pfs-chronicle-generator', 'layout');
    let layout: any;
    try {
        layout = await layoutStore.getLayout(layoutId as string);
    } catch (error) {
        ui.notifications?.error(`Failed to load layout: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
    
    // Get the blank chronicle path
    const blankChroniclePath = formData.shared?.blankChroniclePath || game.settings.get('pfs-chronicle-generator', 'blankChroniclePath');
    if (!blankChroniclePath || typeof blankChroniclePath !== 'string') {
        ui.notifications?.error("Blank chronicle PDF path is not set.");
        return;
    }
    
    // Process each party member
    for (const actor of partyActors) {
        const characterId = actor.id;
        const characterName = actor.name;
        
        try {
            // Get character-specific data
            const characterData = formData.characters[characterId];
            
            // Map to chronicle data format
            const chronicleData = mapToCharacterData(formData.shared, characterData);
            
            // Save chronicle data to actor flags
            await actor.setFlag('pfs-chronicle-generator', 'chronicleData', chronicleData);
            
            // Generate PDF
            const response = await fetch(blankChroniclePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch blank chronicle PDF: ${response.statusText}`);
            }
            
            const pdfBytes = await response.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);
            pdfDoc.registerFontkit(fontkit.default);
            
            const generator = new PdfGenerator(pdfDoc, layout, chronicleData);
            await generator.generate();
            
            // Convert PDF to base64 and attach to actor
            const modifiedPdfBytes = await pdfDoc.save();
            let binary = '';
            const len = modifiedPdfBytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(modifiedPdfBytes[i]);
            }
            const base64String = btoa(binary);
            
            await actor.setFlag('pfs-chronicle-generator', 'chroniclePdf', base64String);
            
            // Record success
            results.push({
                characterId,
                characterName,
                success: true
            });
            
            console.log(`[PFS Chronicle] Successfully generated chronicle for ${characterName}`);
            
        } catch (error) {
            // Record failure
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({
                characterId,
                characterName,
                success: false,
                error: errorMessage
            });
            allSucceeded = false;
            console.error(`[PFS Chronicle] Failed to generate chronicle for ${characterName}:`, error);
        }
    }
    
    // Display summary notifications
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    if (allSucceeded) {
        ui.notifications?.info(`Successfully generated ${successCount} chronicle(s) for all party members.`);
        
        // Clear saved data after successful generation
        try {
            await clearPartyChronicleData();
            console.log('[PFS Chronicle] Cleared saved party chronicle data after successful generation');
        } catch (error) {
            console.error('[PFS Chronicle] Failed to clear saved data:', error);
            ui.notifications?.warn("Chronicles generated but failed to clear saved data.");
        }
    } else {
        const failedCharacters = results
            .filter(r => !r.success)
            .map(r => `${r.characterName}: ${r.error}`)
            .join('; ');
        
        ui.notifications?.warn(
            `Generated ${successCount} chronicle(s), but ${failureCount} failed: ${failedCharacters}`
        );
    }
}
