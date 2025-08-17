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

Hooks.on('getActorSheetHeaderButtons', (sheet: any, buttons: any) => {
  buttons.unshift({
    label: 'Generate Chronicle',
    class: 'pfs-chronicle-generator-button',
    icon: 'fas fa-file-pdf',
    onclick: () => {
      new PFSChronicleGeneratorApp().render({force: true});
    },
  });
});
