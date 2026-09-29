/**
 * Playwright script for first-time Foundry VTT setup.
 *
 * Handles:
 * 1. License key entry (if on /license page)
 * 2. EULA agreement
 * 3. Admin login to setup page
 * 4. Dismiss tour/dialogs
 * 5. Game system installation (PF2e and/or Starfinder, via FOUNDRY_SYSTEM_IDS)
 * 6. Test world creation (using FOUNDRY_WORLD_SYSTEM)
 * 7. Launch world and log in as Gamemaster
 * 8. Enable module
 * 9. Create a Player user for testing
 *
 * Run via the setup shell script, or standalone:
 *   FOUNDRY_LICENSE_KEY=... npx playwright test scripts/setup-foundry.spec.ts --config=scripts/playwright-setup.config.mts
 *
 * Test both systems, then create each world, with e.g.:
 *   FOUNDRY_SYSTEM_IDS=pf2e,sf2e FOUNDRY_WORLD_SYSTEM=pf2e ./scripts/foundry.sh test start
 *   FOUNDRY_SYSTEM_IDS=pf2e,sf2e FOUNDRY_WORLD_SYSTEM=sf2e ./scripts/foundry.sh test start --world sfs-test --world-title "SFS Test"
 */
import { test, expect } from "@playwright/test";
import { dismissOverlays, dismissTours, ensureAdminAccess, joinAsGamemaster } from "../tests/integration/helpers.js";

const PORT = process.env.FOUNDRY_PORT ?? "30000";
const BASE_URL = `http://localhost:${PORT}`;
const LICENSE_KEY = process.env.FOUNDRY_LICENSE_KEY ?? "";
const ADMIN_PASSWORD = process.env.FOUNDRY_ADMIN_PASSWORD ?? "test-admin";
// Comma-separated game system package ids to install (e.g. "pf2e" or "pf2e,sf2e").
const SYSTEM_IDS = (process.env.FOUNDRY_SYSTEM_IDS ?? process.env.FOUNDRY_SYSTEM_ID ?? "pf2e")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
// System used for the created world (must be one of SYSTEM_IDS).
const WORLD_SYSTEM = process.env.FOUNDRY_WORLD_SYSTEM ?? SYSTEM_IDS[0] ?? "pf2e";
// Overridable for version smoke runs; the dev setup default creates the
// "PFS Test" world as before.
const WORLD_TITLE = process.env.SMOKE_WORLD_TITLE ?? "PFS Test";
const MODULE_ID = "pfs-chronicle-generator";
const PLAYER_NAME = "TestPlayer";

/** Display names as shown in the Foundry setup package/world lists. */
const SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  pf2e: "Pathfinder Second Edition",
  sf2e: "Starfinder Second Edition",
};

function displayName(systemId: string): string {
  return SYSTEM_DISPLAY_NAMES[systemId] ?? systemId;
}

test("complete Foundry VTT setup with game systems, world, and users", async ({ page }) => {
  // First-run system downloads plus world migration can take well over
  // ten minutes on a busy machine; the phases below are idempotent, so
  // a timeout retries the remainder instead of starting over.
  test.setTimeout(1_200_000);

  if (!LICENSE_KEY) {
    throw new Error("FOUNDRY_LICENSE_KEY env var is required (format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)");
  }

  // ========== PHASE 1: License & Admin Setup ==========

  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);

  // Keep trying until we reach /setup — handle license, EULA, and auth pages in a loop
  let licensed = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const url = page.url();

    if (url.includes("/setup") || url.includes("/game") || url.includes("/join")) {
      break;
    }

    if (url.includes("/license")) {
      // Check if there's a license key input
      const keyInput = page.getByPlaceholder("XXXX-XXXX-XXXX-XXXX-XXXX-XXXX");
      if (await keyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log("-> Entering license key...");
        await keyInput.fill(LICENSE_KEY);
        await page.getByRole("button", { name: "Submit Key" }).click();
        await keyInput.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
        licensed = true;
        continue;
      }

      // Check if EULA is showing
      const eulaCheckbox = page.getByRole("checkbox", {
        name: "I agree to these terms",
      });
      if (await eulaCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log("-> Accepting EULA...");
        await eulaCheckbox.click();
        await page.getByRole("button", { name: "Agree" }).click();
        await eulaCheckbox.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
        licensed = true;
        continue;
      }

      // Neither key input nor EULA visible on /license — wait and retry
      console.log("-> On /license but no actionable element found, waiting...");
      await page.waitForTimeout(5000);
      await page.reload();
      await page.waitForTimeout(3000);
      continue;
    }

    if (url.includes("/auth")) {
      console.log("-> Logging in as admin...");
      const passwordField = page.getByRole("textbox", { name: "Administrator Password" });
      await passwordField.fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Log In" }).click();
      await passwordField.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
      continue;
    }

    // Unknown page — wait and reload
    await page.waitForTimeout(3000);
  }

  await expect(page).toHaveURL(/\/(setup|game|join)/, { timeout: 30_000 });
  console.log("-> Reached: " + page.url());
  console.log(licensed ? ">>> License installed" : ">>> License already installed");

  // Administrator access can arrive as the /auth page (handled above)
  // or as a dialog over setup itself — poll for either explicitly.
  await ensureAdminAccess(page, ADMIN_PASSWORD);

  // First-run tours (e.g. Backups Overview) render a beat after setup
  // loads — after an initial dismiss that finds nothing. Let them appear,
  // then clear before touching the setup UI. Each pass can take up to
  // ~25s on a loaded machine; the logging below marks progress.
  console.log("-> Clearing first-run dialogs (pass 1)...");
  await dismissOverlays(page);
  console.log("-> Waiting for late popups...");
  await page.waitForTimeout(500);
  console.log("-> Clearing first-run dialogs (pass 2)...");
  await dismissOverlays(page);
  console.log("-> Dialogs clear.");

  // If we ended up at /setup, proceed. If /game or /join, world already launched.
  if (page.url().includes("/setup")) {
    // The admin prompt can pop late, after the passes above — check again
    // before touching setup UI it could be covering.
    await ensureAdminAccess(page, ADMIN_PASSWORD);
    await dismissOverlays(page);

    // ========== PHASE 2: Install Game Systems ==========
    for (const systemId of SYSTEM_IDS) {
      const systemName = displayName(systemId);
      console.log(`-> Checking for ${systemName} system...`);
      await page.getByRole("heading", { name: "Game Systems" }).click();
      await page.waitForTimeout(1000);

      const systemInstalled = await page
        .locator("article", { hasText: systemName })
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!systemInstalled) {
        console.log(`>>> Downloading ${systemName} system (this may take a few minutes)...`);
        // Tours only here: a broad dismiss could click the installer dialog's
        // own Close button and kill it.
        await dismissTours(page);
        await page.getByRole("button", { name: "Install System" }).click({ timeout: 30_000 });
        await page.waitForTimeout(2000);
        await dismissTours(page);

        await page.getByRole("searchbox", { name: "Filter" }).fill(systemId);

        // The remote list resolves asynchronously — wait for the article
        // itself, not a fixed sleep, or the Install click races the render.
        console.log(`[setup] expecting package article [data-package-id='${systemId}'] to become visible`);
        const systemArticle = page.locator(`[data-package-id='${systemId}']`);
        await systemArticle.waitFor({ state: "visible", timeout: 60_000 });
        const installBtn = systemArticle.getByRole("button", { name: "Install" });

        if (await installBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Listen before clicking: the install reports "was installed
          // successfully" on the console. Race it against the Installed
          // button in case the message only reaches the server log.
          // Either signal means the download finished.
          const quiet = (p: Promise<string>) => p.catch(() => "missed");
          const installedMsg = quiet(
            page
              .waitForEvent("console", {
                predicate: (msg) => /installed successfully/i.test(msg.text()),
                timeout: 300_000,
              })
              .then(() => "console")
          );
          const installedBtn = quiet(
            systemArticle
              .getByRole("button", { name: "Installed" })
              .waitFor({ timeout: 300_000 })
              .then(() => "button")
          );
          // Overlays can cover the button mid-render — dismiss tours and retry
          // the click rather than hanging on a stale element.
          let installed = false;
          for (let attempt = 0; attempt < 3 && !installed; attempt++) {
            console.log(`[setup] expecting Install button clickable (attempt ${attempt + 1}/3)`);
            await dismissTours(page);
            installed = await installBtn
              .click({ timeout: 30_000 })
              .then(() => true)
              .catch(() => false);
          }
          if (!installed) {
            throw new Error(`could not click the ${systemName} Install button (covered or detached)`);
          }
          console.log(`-> ${systemName} download started (this may take a few minutes)...`);

          if ((await Promise.race([installedMsg, installedBtn])) === "missed") {
            throw new Error(`${systemName} install reported neither console success nor Installed button`);
          }
          console.log(`>>> ${systemName} system ready.`);
          await dismissTours(page);
        } else {
          console.log(`-> ${systemName} already installed (in dialog).`);
        }

        // Close install dialog: it is form#install-package (neither
        // .window-app nor dialog), whose header close is a real button with
        // data-action="close". Verify it actually went away, since a missed
        // close blocks everything after it.
        const installer = page.locator(
          "form#install-package, .window-app:has([data-package-id]), dialog:has([data-package-id])"
        );
        let installerOpen = true;
        for (let attempt = 0; attempt < 3 && installerOpen; attempt++) {
          // A tour can pop over the installer at any point — clear it first
          // so the X below is actually clickable.
          await dismissTours(page);
          const structuralClose = page
            .locator(
              'form#install-package header button[data-action="close"], ' +
                ".window-app .window-header a.header-button:has(i.fa-xmark), " +
                ".window-app .window-header a.header-button:has(i.fa-times), " +
                ".window-app .header-control.fa-xmark, dialog .header-control"
            )
            .first();
          if (await structuralClose.isVisible({ timeout: 2000 }).catch(() => false)) {
            await structuralClose.click().catch(() => {});
            await page.waitForTimeout(1000);
          }
          const labeledClose = installer.getByRole("button", { name: /^(Done|Close|OK|Finished)$/ }).first();
          if (await labeledClose.isVisible({ timeout: 2000 }).catch(() => false)) {
            await labeledClose.click().catch(() => {});
            await page.waitForTimeout(1000);
          }
          installerOpen = await installer.isVisible({ timeout: 2000 }).catch(() => false);
        }
        if (installerOpen) {
          // Self-diagnosing failure: dump the dialog markup so the selectors
          // can be fixed to match reality instead of guessing again.
          const markup = await page
            .evaluate(() =>
              [...document.querySelectorAll("dialog, .window-app, form.application")]
                .map((el) => el.outerHTML.slice(0, 1500))
                .join("\n---\n")
            )
            .catch(() => "<unreadable>");
          console.log(`Installer dialog markup:\n${markup}`);
          throw new Error("installer dialog did not close after system install (markup dumped above)");
        }
      } else {
        console.log(`>>> ${systemName} system already installed.`);
      }
    }

    // ========== PHASE 3: Create Test World ==========
    const worldSystemName = displayName(WORLD_SYSTEM);
    console.log(`>>> Creating world "${WORLD_TITLE}" (${worldSystemName})...`);
    await page.getByRole("heading", { name: "Game Worlds" }).click();
    await page.waitForTimeout(1000);

    const worldExists = await page
      .locator("article", { hasText: WORLD_TITLE })
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!worldExists) {
      await page.getByRole("button", { name: "Create World" }).click();
      await page.waitForTimeout(2000);

      // The setup form uses plain divs as captions, so getByLabel() cannot
      // associate them — anchor on the caption text instead. Systems are
      // picked from the list beside the form, then Continue creates it.
      const titleField = page.getByText("World Title", { exact: true }).locator("xpath=..").getByRole("textbox");
      await titleField.fill(WORLD_TITLE, { timeout: 30_000 });
      await page.getByRole("listitem").filter({ hasText: worldSystemName }).click({ timeout: 30_000 });
      await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30_000 });

      // Creation can land on a template picker (/create) instead of the
      // worlds list. Pick the blank template and continue (up to twice),
      // then verify we actually got a world.
      for (let i = 0; i < 2; i++) {
        if (!page.url().includes("/create")) break;
        console.log("[setup] on template picker, choosing Blank World");
        const picked = await page
          .evaluate(() => {
            const heading = [...document.querySelectorAll("h1, h2, h3, h4")].find(
              (el) => (el.textContent ?? "").trim() === "Blank World"
            );
            let node = heading?.parentElement ?? null;
            while (node && node !== document.body) {
              if (node.matches("button, a, [data-action], article, li")) {
                (node as HTMLElement).click();
                return `clicked:${node.tagName}`;
              }
              node = node.parentElement;
            }
            return heading ? "no-clickable-ancestor" : "no-heading";
          })
          .catch(() => "evaluate-failed");
        console.log(`[setup] template pick: ${picked}`);
        await page.waitForTimeout(3000);
      }

      await page.waitForTimeout(3000);

      // Submitting creation kicks off a data migration that can take
      // minutes on a fresh world — wait for setup to actually leave
      // /create instead of assuming a fixed delay. Log migration progress
      // so a slow run doesn't look hung.
      console.log("[setup] waiting for world creation + migration...");
      const createDeadline = Date.now() + 300_000;
      for (;;) {
        const notes = await page
          .evaluate(() =>
            [...document.querySelectorAll("#notifications li")].map((el) => (el.textContent ?? "").slice(0, 120))
          )
          .catch(() => [] as string[]);
        const migrating = notes.find((t) => /migrat/i.test(t));
        if (migrating) console.log(`[setup] ${migrating}`);
        if (!page.url().includes("/create")) break;
        // Creation may finish into user management (same URL) — phase 4
        // handles the save from there.
        const movedOn =
          (await page
            .getByRole("heading", { name: "Game Worlds" })
            .isVisible({ timeout: 2000 })
            .catch(() => false)) ||
          (await page
            .getByRole("button", { name: "Save and Continue" })
            .isVisible({ timeout: 2000 })
            .catch(() => false));
        if (movedOn) break;
        if (Date.now() > createDeadline) {
          throw new Error("world creation did not finish (still on /create after 5 minutes)");
        }
        await page.waitForTimeout(10_000);
      }
      console.log(">>> World created.");
    } else {
      console.log(">>> World already exists.");
    }

    // ========== PHASE 4: Launch World ==========
    // First entry to a brand-new world can land straight in /game — and a
    // save click can navigate there mid-flow — so never decide the branch
    // on a single URL read. Wait for either destination, then act.
    if (!page.url().includes("/game")) {
      // Creating a world can advance setup into User Management
      // (form#manage-players) with no sidebar — save through it if present.
      const saveBtn = page.getByRole("button", { name: "Save and Continue" });
      if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("[setup] saving user management, expecting worlds list or game");
        await saveBtn.click({ timeout: 30_000 });
        await page.waitForTimeout(3000);
      }
      const arrived = await page
        .waitForFunction(
          () =>
            location.href.includes("/game") ||
            [...document.querySelectorAll("h1, h2, h3")].some((el) => (el.textContent ?? "").trim() === "Game Worlds"),
          { timeout: 60_000 }
        )
        .then(() => true)
        .catch(() => false);
      if (!arrived) {
        const state = await page
          .evaluate(() => ({
            url: location.href,
            headings: [...document.querySelectorAll("h1, h2, h3, h4")]
              .map((el) => (el.textContent ?? "").trim())
              .filter(Boolean)
              .slice(0, 10),
            forms: [...document.querySelectorAll("form")]
              .map((el) => (el as HTMLFormElement).id || (el as HTMLElement).className)
              .slice(0, 5),
          }))
          .catch(() => null);
        console.log(`[setup] reached neither game nor worlds list; page state: ${JSON.stringify(state)}`);
        throw new Error("Setup went nowhere after user management save");
      }
    }
    if (page.url().includes("/game")) {
      console.log("-> Already in game after creation.");
      // First entry starts another tour (welcome/sidebar) a beat after
      // load — dismiss twice with a gap so late starters are caught too.
      await dismissOverlays(page);
      await page.waitForTimeout(5000);
      await dismissOverlays(page);
    } else {
      const worldsHeading = page.getByRole("heading", { name: "Game Worlds" });
      console.log("-> Launching test world...");
      await worldsHeading.click({ timeout: 30_000 });
      await page.waitForTimeout(2000);
      const worldArticle = page.locator("article", { hasText: WORLD_TITLE });
      const launchBtn = worldArticle.locator("[data-action='worldLaunch'], button:has-text('Launch')");
      await launchBtn.first().click({ timeout: 60_000 });

      await page.waitForURL(/\/(join|game)/, { timeout: 60_000 });
      console.log("-> World launched.");
    }
  }

  // ========== PHASE 5: Log in as Gamemaster ==========
  if (page.url().includes("/join")) {
    console.log("-> Joining as Gamemaster...");
    await joinAsGamemaster(page);
  }

  await page.waitForTimeout(8000); // Let the system finish initializing
  console.log("-> Logged in as Gamemaster.");
  await dismissOverlays(page);

  // ========== PHASE 6: Enable Module ==========
  console.log("-> Enabling module...");
  const moduleEnabled = await page.evaluate(async (moduleId) => {
    const mod = game.modules.get(moduleId);
    if (!mod) return "not_found";
    if (mod.active) return "already_active";
    const config = game.settings.get("core", "moduleConfiguration") as Record<string, boolean>;
    config[moduleId] = true;
    await game.settings.set("core", "moduleConfiguration", config);
    return "activated";
  }, MODULE_ID);

  console.log("-> Module status: " + moduleEnabled);

  if (moduleEnabled === "activated") {
    // Need to reload for module to take effect
    await page.reload();

    // May need to re-join
    if (page.url().includes("/join")) {
      await joinAsGamemaster(page);
    }
    // World-scoped writes below (token, player user) throw before the game
    // is ready — wait explicitly instead of a fixed sleep, whichever path
    // the reload took.
    await page.waitForFunction(() => (globalThis as unknown as { game: { ready: boolean } }).game?.ready === true, {
      timeout: 90_000,
    });
    await dismissOverlays(page);
  }

  if (moduleEnabled === "not_found") {
    console.log("   WARNING: Module not found. Is it symlinked into Data/modules?");
  }

  // ========== PHASE 7: Create Player User ==========
  console.log("-> Creating player user...");
  const playerResult = await page.evaluate(async (playerName) => {
    const existing = game.users.find((u: { name: string }) => u.name === playerName);
    if (existing) return "exists";
    // @ts-expect-error Foundry global
    await User.create({ name: playerName, role: 1, password: "" });
    return "created";
  }, PLAYER_NAME);

  console.log("-> Player user: " + playerResult);

  // ========== Done ==========
  console.log("");
  console.log("=== Setup Complete ===");
  console.log("  Systems: " + SYSTEM_IDS.join(", "));
  console.log("  World: " + WORLD_TITLE + ` (${displayName(WORLD_SYSTEM)})`);
  console.log("  Module: " + MODULE_ID + " (" + moduleEnabled + ")");
  console.log("  Users: Gamemaster (no password), " + PLAYER_NAME + " (no password)");
  console.log("  URL: " + BASE_URL);
});
