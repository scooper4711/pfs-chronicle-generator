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

Hooks.on('getActorSheetHeaderButtons', (sheet: ActorSheet, buttons: any[]) => {
  buttons.unshift({
    label: 'Hello World',
    class: 'hello-world-button',
    icon: 'fas fa-dice-d20',
    onclick: async () => {
      const settingValue = game.settings.get('hello-world', 'someSetting');
      const content = await renderTemplate('modules/hello-world/templates/hello-world-dialog.hbs', { settingValue });
      new Dialog({
        title: 'Hello World',
        content,
        buttons: {
          ok: {
            label: 'OK',
            icon: '<i class="fas fa-check"></i>',
          },
        },
      }).render(true);
    },
  });
});