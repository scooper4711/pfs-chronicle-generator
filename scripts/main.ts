import { PFSChronicleGeneratorApp } from './PFSChronicleGeneratorApp.js';

Hooks.on('init', () => {
  game.settings.register('hello-world', 'someSetting', {
    name: 'My Setting',
    hint: 'This is a setting for my module.',
    scope: 'world',
    config: true,
    type: String,
    default: 'Hello, world!',
  });
});

Hooks.on('getActorSheetHeaderButtons', (sheet: any, buttons: any) => {
  buttons.unshift({
    label: 'Chronicle Generator',
    class: 'pfs-chronicle-generator-button',
    icon: 'fas fa-dice-d20',
    onclick: () => {
      new PFSChronicleGeneratorApp().render({force: true});
    },
  });
});