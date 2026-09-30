/**
 * Browser context setup shared by every context the suite opens: the same
 * base URL and viewport as playwright.config, and Foundry's no-canvas mode.
 *
 * No-canvas mode matters: headless Chromium renders the WebGL scene in
 * software, which keeps the main thread so busy that every click takes
 * seconds. The module never touches the canvas.
 */
import type { BrowserContext, BrowserContextOptions } from '@playwright/test';

export const TEST_BASE_URL = `http://localhost:${process.env.FOUNDRY_TEST_PORT ?? '30001'}`;

/** Same base URL and viewport as the configured `page` fixture. */
export function suiteContextOptions(storageState?: string): BrowserContextOptions {
  return { baseURL: TEST_BASE_URL, viewport: { width: 1600, height: 900 }, storageState };
}

/** Boots Foundry without its scene canvas in every page of the context. */
export async function disableSceneCanvas(context: BrowserContext): Promise<void> {
  // Client-scoped settings are read from localStorage as JSON.
  await context.addInitScript(() => window.localStorage.setItem('core.noCanvas', 'true'));
}
