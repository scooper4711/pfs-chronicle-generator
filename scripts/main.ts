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
  // Register the settings submenu
  game.settings.registerMenu('pfs-chronicle-generator', 'pfscgSettings', {
      name: 'PFS Chronicle Generator Settings',
      label: 'PFS Chronicle Generator Settings',
      hint: 'Configure default settings for PFS Chronicle Sheets.',
      icon: 'fas fa-cog',
      restricted: true, // Only GMs can access this
  });

});

Hooks.on('renderCharacterSheetPF2e' as any, (sheet: any, html: any, data: any) => {
    if (!game.user.isGM) return;
    console.log("Rendering character sheet")
    console.log(sheet.actor);
    console.log(sheet.actor.system.pfs);
    const playerNumber = sheet.actor.system.pfs.playerNumber;
    const characterNumber = sheet.actor.system.pfs.characterNumber;
    const characterName = sheet.actor.name;
    const currentFaction = sheet.actor.system.pfs.currentFaction;
    const level = sheet.actor.system.details.level.value;
    console.log("Player Number", playerNumber)
    console.log("Character Number", characterNumber)
    console.log("Character Name", characterName)

    const pfsTab = html.find('.tab[data-tab="pfs"]');
    if (pfsTab.length === 0) {
        console.log("No PFS tab found")
        return;
    }

    const header = document.createElement('header');
    header.innerHTML = "PFS Chronicle Generator";
    header.classList.add('pfs-chronicle-generator-header');
    // Add data-group-id="pfs-chronicle-generator" as an attribute to the header
    header.setAttribute('data-group-id', 'pfs-chronicle-generator');
    const button = document.createElement('button');
    button.innerHTML = '<section class="generate-chronicle"><i class="fas fa-file-pdf"></i> Generate Chronicle</section>';
    button.classList.add('pfs-chronicle-generator-button');

    button.addEventListener('click', (event) => {
        event.preventDefault();
        new PFSChronicleGeneratorApp(playerNumber, characterNumber, characterName, currentFaction, level).render({force:true});
    });

    // append first the header, then the button, after each other
    pfsTab.append(header);
    pfsTab.append(button);
});
