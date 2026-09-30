/**
 * The suite's `test`: records V8 coverage for every page (via the coverage
 * fixture) and hands each test a page already inside the world as the
 * Gamemaster. The GM logs in once per worker; tests reuse that session.
 */
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import type { Page } from '@playwright/test';
import { test as coverageTest, expect } from '../coverage-fixture.js';
import { joinAsGamemaster } from '../helpers.js';
import { enterGameAsGamemaster } from './session.js';
import { SocietyForm } from './society-form.js';
import { gameSystemId } from './world.js';
import { disableSceneCanvas, suiteContextOptions } from './context-options.js';

export { expect };

const SESSION_DIR = resolve('tmp/playwright-sessions');

interface TestFixtures {
  gmPage: Page;
  form: SocietyForm;
}

interface WorkerFixtures {
  gamemasterSession: string;
}

export const test = coverageTest.extend<TestFixtures, WorkerFixtures>({
  gamemasterSession: [
    async ({ browser }, use, workerInfo) => {
      mkdirSync(SESSION_DIR, { recursive: true });
      const statePath = resolve(SESSION_DIR, `gamemaster-${workerInfo.workerIndex}.json`);
      const context = await browser.newContext(suiteContextOptions());
      await disableSceneCanvas(context);
      const page = await context.newPage();
      await page.goto('/join');
      await joinAsGamemaster(page);
      await expectWorldSystem(await gameSystemId(page), workerInfo.project.name);
      await context.storageState({ path: statePath });
      await context.close();
      await use(statePath);
    },
    { scope: 'worker' },
  ],

  storageState: async ({ gamemasterSession }, use) => {
    await use(gamemasterSession);
  },

  context: async ({ context }, use) => {
    await disableSceneCanvas(context);
    await use(context);
  },

  gmPage: async ({ page }, use) => {
    await enterGameAsGamemaster(page);
    await use(page);
  },

  form: async ({ gmPage }, use) => {
    await use(new SocietyForm(gmPage));
  },
});

/** Fails fast when a project runs against a world of the wrong system. */
async function expectWorldSystem(worldSystem: string, projectName: string): Promise<void> {
  if (worldSystem === projectName) return;
  throw new Error(
    `The ${projectName} tests need a ${projectName} world, but the server is running a ${worldSystem} world. ` +
      'Start the matching world (scripts/foundry.sh test start --world <id>) or pick --project.'
  );
}
