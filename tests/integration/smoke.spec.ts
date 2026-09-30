/**
 * Smoke test: the seeded world boots with the module active.
 */
import { test, expect } from '@scooper4711/foundry-test-kit';

const MODULE_ID = 'pfs-chronicle-generator';

test('world boots with the module active', async ({ gmPage }) => {
  const active = await gmPage.evaluate(
    (moduleId) =>
      (globalThis as unknown as { game: { modules: Map<string, { active: boolean }> } }).game.modules.get(moduleId)
        ?.active ?? false,
    MODULE_ID
  );
  expect(active).toBe(true);
});
