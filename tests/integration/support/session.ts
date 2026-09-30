/**
 * Foundry session helpers: joining the world as a given user and waiting
 * for the game to become ready.
 */
import type { Page } from '@playwright/test';
import { dismissOverlays, joinAsGamemaster } from '../helpers.js';

export const TEST_PLAYER = 'TestPlayer';

const GAME_READY_TIMEOUT_MS = 90_000;

/** Resolves once `game.ready` is true on the page. */
export async function waitForGameReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (globalThis as unknown as { game?: { ready?: boolean } }).game?.ready === true, {
    timeout: GAME_READY_TIMEOUT_MS,
  });
}

/**
 * Opens /game on a context that already carries a Gamemaster session
 * cookie, falling back to the join form when the session has expired
 * (for example after a server restart).
 */
export async function enterGameAsGamemaster(page: Page): Promise<void> {
  await page.goto('/game');
  if (page.url().includes('/join')) {
    await joinAsGamemaster(page);
    return;
  }
  await waitForGameReady(page);
}

/** Joins the world as a passwordless non-GM user. */
export async function joinAsPlayer(page: Page, userName: string): Promise<void> {
  await page.goto('/join');
  const userSelect = page.getByRole('textbox', { name: 'Select User' });
  await userSelect.fill(userName);
  await page.locator('#autocomplete li', { hasText: new RegExp(`^${userName}$`) }).click();
  await Promise.all([
    page.waitForURL(/\/game/, { waitUntil: 'commit' }),
    page.getByRole('button', { name: 'Join Game Session' }).click(),
  ]);
  await waitForGameReady(page);
  await dismissOverlays(page);
}
