import { PFSChronicleGeneratorApp } from './PFSChronicleGeneratorApp.js';

Hooks.on('init', () => {
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
  game.settings.register('pfs-chronicle-generator','eventCode', {
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
  // Register the settings submenu
  /* game.settings.registerMenu('pfs-chronicle-generator', 'pfscgSettings', {
      name: 'PFS Chronicle Generator Settings',
      label: 'PFS Chronicle Generator Settings',
      hint: 'Configure default settings for PFS Chronicle Sheets.',
      icon: 'fas fa-cog',
      restricted: true, // Only GMs can access this
  }); */

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
            const url = URL.createObjectURL(blob);
        
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sheet.actor.name}_chronicle.pdf`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
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
