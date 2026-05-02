/**
 * Module Entry Point
 *
 * Registers Foundry settings, Handlebars helpers, and hooks for the
 * PFS Chronicle Generator module. Rendering logic is delegated to
 * handler modules under scripts/handlers/.
 */

import { layoutStore } from './LayoutStore.js';
import { calculateTaskLevelOptions } from './utils/earned-income-calculator.js';
import { getCreditsAwarded } from './utils/treasure-bundle-calculator.js';
import { getZeroCurrencyDisplay, getCurrencyLabel } from './utils/currency-formatter.js';
import { getGameSystemRoot } from './utils/game-system-detector.js';
import type { GameSystem } from './utils/game-system-detector.js';
import { handleCharacterSheetRender } from './handlers/character-sheet-handlers.js';
import { handlePartySheetRender } from './handlers/party-sheet-tab-handlers.js';
import type { CharacterSheetApp, PartySheetApp } from './handlers/event-listener-helpers.js';

// Re-export for backward compatibility with existing tests and consumers
export { renderPartyChronicleForm } from './handlers/form-initialization.js';

/** Registers world-scoped Foundry settings shown in the module config. */
function registerSettings(): void {
  const MODULE_ID = 'pfs-chronicle-generator';

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

Hooks.on('renderCharacterSheetPF2e' as any, (sheet: CharacterSheetApp, html: JQuery, _data: any) => {
    handleCharacterSheetRender(sheet, html);
});

// Requirements: starfinder-support 2.3
Hooks.on('renderCharacterSheetSF2e' as any, (sheet: CharacterSheetApp, html: JQuery, _data: any) => {
    handleCharacterSheetRender(sheet, html);
});

Hooks.on('renderPartySheetPF2e' as any, (app: PartySheetApp, html: JQuery, _data: any) => {
    handlePartySheetRender(app, html);
});

// Requirements: starfinder-support 2.2
Hooks.on('renderPartySheetSF2e' as any, (app: PartySheetApp, html: JQuery, _data: any) => {
    handlePartySheetRender(app, html);
});
