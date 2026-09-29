/**
 * Shared Playwright helpers for integration tests.
 *
 * Generic Foundry UI utilities (tours, overlays, Gamemaster login).
 * Copied from the demiplane-pf2e setup, minus the Demiplane-specific API.
 */
import type { Page } from "@playwright/test";

/** Button labels that unambiguously dismiss (never accept) a popup. */
const DISMISS_BUTTON_NAMES = [
  "Close Window",
  "Close",
  "Dismiss",
  "Decline",
  "Decline Sharing",
  "No",
  "End Tour",
  "Got it",
  "Don't Show Again",
];

export async function dismissTours(page: Page): Promise<void> {
  // Any of these visible means a tour is up (tooltip, centered step, or dim
  // overlay). Checked separately because the tooltip container varies.
  const TOUR_SELECTORS = [".tour", ".tour-center-step", ".tour-overlay", "#tooltip.tour"];
  const deadline = Date.now() + 10_000;
  for (;;) {
    const apiResult = await page
      .evaluate(() => {
        const Ns = (globalThis as unknown as { foundry?: { nue?: { Tour?: unknown } } }).foundry?.nue?.Tour as
          { tourInProgress: boolean; activeTour?: { exit: () => void } | null } | undefined;
        if (!Ns) return "no-api";
        if (Ns.tourInProgress) {
          Ns.activeTour?.exit();
          return "exited";
        }
        return "none-active";
      })
      .catch((e) => `error:${String(e).slice(0, 80)}`);
    await page
      .evaluate(() => {
        document.querySelectorAll(".tour-overlay, .tour-center-step").forEach((el) => el.remove());
      })
      .catch(() => {});
    let matched = "";
    for (const sel of TOUR_SELECTORS) {
      if (
        await page
          .locator(sel)
          .first()
          .isVisible({ timeout: 250 })
          .catch(() => false)
      ) {
        matched = sel;
        break;
      }
    }
    if (!matched && apiResult !== "exited") return;
    const tourExit = page.locator('.tour [data-action="exit"], .tour-center-step [data-action="exit"]');
    if (await tourExit.isVisible({ timeout: 500 }).catch(() => false)) {
      await tourExit
        .first()
        .click()
        .catch(() => {});
      await page.waitForFunction(() => !document.querySelector(".tour"), { timeout: 1000 }).catch(() => {});
    }
    if (Date.now() > deadline) {
      return;
    }
    await page.waitForTimeout(100);
  }
}

/**
 * Clears first-run popups (NUE tours, welcome/what's-new dialogs, usage-data
 * prompts). These appear on a clean data dir but never on the second run,
 * which is the classic clean-checkout flake source. Only ever *dismisses* —
 * never clicks OK/Accept/Join — and is only used during login/setup, never
 * while a test dialog of our own might be open.
 */
export async function dismissOverlays(page: Page): Promise<void> {
  // Tours first: Escape reliably ends them, while DOM removal alone can
  // leave a live tour blocking behind an invisible tooltip.
  await dismissTours(page);
  const deadline = Date.now() + 15_000;
  for (;;) {
    await page
      .evaluate(() => {
        document.querySelectorAll("#notifications li").forEach((el) => el.remove());
      })
      .catch(() => {});

    let clicked = false;
    for (const name of DISMISS_BUTTON_NAMES) {
      const button = page.getByRole("button", { name, exact: true });
      if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
        await button.click().catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked) return;
    if (Date.now() > deadline) return;
    await page.waitForTimeout(100);
  }
}

export async function joinAsGamemaster(page: Page): Promise<void> {
  // Select Gamemaster from the autocomplete dropdown. The option is an
  // <li> inside #autocomplete (NOT the wrapping <menu>, whose text also
  // matches) — clicking the wrapper selects nothing and Join silently
  // does nothing.
  const userSelect = page.getByRole("textbox", { name: "Select User" });
  // waitFor (not isVisible): the form renders async after page load, and
  // isVisible() does not wait — gating on it skips user selection entirely.
  await userSelect.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  if (await userSelect.isVisible().catch(() => false)) {
    await userSelect.click().catch(() => {});
    await userSelect.fill("Gamemaster");
    // click() auto-waits for the suggestion; isVisible() would not.
    const selected = await page
      .locator("#autocomplete li", { hasText: /^Gamemaster$/ })
      .click({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!selected) {
      // Fallback: keyboard-select the highlighted suggestion.
      await userSelect.press("ArrowDown").catch(() => {});
      await userSelect.press("Enter").catch(() => {});
    }
  }

  // Click Join (waits for the button to actually enable)
  const joinButton = page.getByRole("button", { name: "Join Game Session" });
  await joinButton.waitFor({ state: "visible", timeout: 15_000 });
  await Promise.all([page.waitForURL(/\/game/, { timeout: 90_000, waitUntil: "commit" }), joinButton.click()]);
  // A passwordless Gamemaster is prompted to set one on first join, which
  // blocks game load — save through it empty, then wait for ready. Poll
  // because the prompt can appear at any point during load.
  const readyDeadline = Date.now() + 90_000;
  for (;;) {
    const saveContinue = page.getByRole("button", { name: "Save and Continue" });
    if (await saveContinue.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveContinue.click().catch(() => {});
      await saveContinue.waitFor({ state: "hidden", timeout: 2000 }).catch(() => {});
    }
    const ready = await page
      .waitForFunction(() => (globalThis as unknown as { game: { ready: boolean } }).game?.ready === true, {
        timeout: 3000,
      })
      .then(() => true)
      .catch(() => false);
    if (ready) break;
    if (Date.now() > readyDeadline) {
      throw new Error("game never became ready after joining");
    }
  }
  await dismissOverlays(page);
}
