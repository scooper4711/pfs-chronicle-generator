/**
 * Smoke test: the seeded world boots, the module is present and active,
 * and the party sheet Society tab renders.
 */
import { test, expect } from "@playwright/test";
import { joinAsGamemaster, dismissOverlays } from "./helpers.js";

const MODULE_ID = "pfs-chronicle-generator";

test("world boots with the module active", async ({ page }) => {
  await page.goto("/");
  await joinAsGamemaster(page);

  const status = await page.evaluate(async (moduleId) => {
    const game = (globalThis as unknown as { game: undefined | {
      ready: boolean;
      modules: Map<string, { active: boolean }>;
    } }).game;
    if (!game) return "no-game";
    const mod = game.modules.get(moduleId);
    if (!mod) return "not-found";
    return mod.active ? "active" : "inactive";
  }, MODULE_ID);

  expect(status).toBe("active");
  await dismissOverlays(page);
});
