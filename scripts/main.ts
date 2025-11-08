import { PFSChronicleGeneratorApp } from './PFSChronicleGeneratorApp.js';
import { layoutStore } from './LayoutStore.js';
import { LayoutDesignerApp } from './LayoutDesignerApp.js';

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
  game.settings.register('pfs-chronicle-generator', 'blankChroniclePath', {
    name: 'Blank Adventure Chronicle Path',
    hint: 'The path to the blank adventure chronicle PDF.',
    scope: 'world',
    config: true,
    type: String,
    filePicker: 'any',
    default: '',
  });

  game.settings.register('pfs-chronicle-generator', 'layoutPath', {
    name: 'Layouts Directory',
    hint: 'The directory where the chronicle layouts are stored.',
    scope: 'world',
    config: true,
    type: String,
    filePicker: 'folder',
    default: 'modules/pfs-chronicle-generator/layouts/',
  });

  game.settings.registerMenu("pfs-chronicle-generator", "layoutDesigner", {
    name: "Layout Designer",
    label: "Open Layout Designer",
    hint: "Open the layout designer to create and edit chronicle layouts.",
    icon: "fas fa-ruler-combined",
    type: LayoutDesignerApp,
    restricted: true,
  });

  game.modules.get('pfs-chronicle-generator').api = {
    LayoutDesignerApp
  };
});

// Function to update layout choices based on selected season
async function updateLayoutChoices(seasons: Array<{id: string, name: string}>, seasonValue: any) {
    console.log('Season changed to:', seasonValue);
    
    // Extract the actual season value from the Document object or string
    let seasonId: string;
    if (typeof seasonValue === 'object' && seasonValue?.value) {
        // Handle Document object
        try {
            seasonId = JSON.parse(seasonValue.value);
            console.log('Parsed season ID:', seasonId);
        } catch (e) {
            console.error('Failed to parse season value:', e);
            return;
        }
    } else if (typeof seasonValue === 'string') {
        seasonId = seasonValue;
    } else {
        console.error('Unexpected season value type:', typeof seasonValue);
        return;
    }
    
    // Update layout choices when season changes
    const seasonName = seasons.find(s => s.id === seasonId)?.name;
    if (!seasonName) {
        console.error('Could not find season name for id:', seasonId);
        return;
    }
    console.log('Looking for layouts with parent:', seasonName);
    
    const layouts = layoutStore.getLayoutsByParent(seasonName);
    console.log('Found layouts:', layouts);
    
    if (layouts.length === 0) {
        console.warn('No layouts found for season:', seasonName);
        return;
    }
    
    const choices: Record<string, string> = Object.fromEntries(
        layouts.map(layout => [layout.id, layout.description])
    );
    console.log('New choices:', choices);
    
    // First, unregister the existing layout setting
    const settings = game.settings.settings;
    console.log('Current settings map:', settings);
    const oldSetting = settings.get('pfs-chronicle-generator.layout');
    settings.delete('pfs-chronicle-generator.layout');
    console.log('After delete:', settings);
    
    // Re-register with new choices
    game.settings.register('pfs-chronicle-generator', 'layout', {
        name: 'Chronicle Layout',
        hint: 'The layout to use when generating the chronicle.',
        scope: 'world',
        config: true,
        type: String,
        choices: choices,
        default: Object.keys(choices)[0] || ''
    });
    console.log('Re-registered layout setting');
    
    // Keep the previous layout if it's still valid, otherwise use the first available
    const currentSetting = game.settings.get('pfs-chronicle-generator', 'layout');
    console.log('Current layout setting:', currentSetting);
    
    let newValue: string;
    if (Object.keys(choices).includes(currentSetting)) {
        newValue = currentSetting;
    } else {
        newValue = Object.keys(choices)[0] || '';
    }
    
    console.log('Setting new layout value:', newValue);
    if (newValue) {
        await game.settings.set('pfs-chronicle-generator', 'layout', newValue);
        
        // Force a settings window refresh if it's open
        for (const app of Object.values(ui.windows)) {
            if (app instanceof SettingsConfig) {
                app.render(true);
                break;
            }
        }
    }
}

Hooks.on('ready', async () => {
    await layoutStore.initialize();
    const seasons = layoutStore.getSeasons();
    const seasonChoices: Record<string, string> = Object.fromEntries(
        seasons.map(season => [season.id, season.name])
    );
    game.settings.register('pfs-chronicle-generator', 'season', {
        name: 'Season',
        hint: 'The season to filter chronicle layouts.',
        scope: 'world',
        config: true,
        type: String,
        choices: seasonChoices,
        default: seasons[0]?.id || ''
    });

    // Register for settings changes
    Hooks.on('updateSetting', (setting: any, value: any) => {
        console.log('Setting updated:', setting, value);
        if (setting.key === 'pfs-chronicle-generator.season') {
            console.log('Season setting changed, updating layouts...');
            updateLayoutChoices(seasons, value);
        }
    });

    // Initial layout registration with current season
    const initialSeason = game.settings.get('pfs-chronicle-generator', 'season') as string;
    await updateLayoutChoices(seasons, initialSeason);

    const selectedSeason = game.settings.get('pfs-chronicle-generator', 'season') as string;
    const selectedSeasonName = seasons.find(s => s.id === selectedSeason)?.name || selectedSeason;
    const layouts = layoutStore.getLayoutsByParent(selectedSeasonName);
    const layoutChoices: Record<string, string> = Object.fromEntries(
        layouts.map(layout => [layout.id, layout.description])
    );
    game.settings.register('pfs-chronicle-generator', 'layout', {
        name: 'Chronicle Layout',
        hint: 'The layout to use when generating the chronicle.',
        scope: 'world',
        config: true,
        type: String,
        choices: layoutChoices,
        default: Object.keys(layoutChoices)[0] || '',
    });
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
                content: "<p>Are you sure you want to delete this chronicle? This action cannot be undone.</p>",
                yes: () => true,
                no: () => false,
                defaultYes: false
            });
            if (confirmed) {
                await sheet.actor.unsetFlag('pfs-chronicle-generator', 'chroniclePdf');
                sheet.render(true); // Re-render to update button states
            }
        });
        pfsTab.append(deleteButton);
    }
});
