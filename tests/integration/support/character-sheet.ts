/**
 * Page object for a character sheet's PFS tab, where the module adds the
 * Download Chronicle (everyone) and Delete Chronicle (GM only) buttons.
 */
import { expect, type Download, type Locator, type Page } from '@playwright/test';
import { renderActorSheet } from './world.js';

export class CharacterSheet {
  readonly window: Locator;
  readonly pfsTab: Locator;

  constructor(
    readonly page: Page,
    readonly actorId: string
  ) {
    this.window = page.locator(`[id$="-Actor-${actorId}"]`);
    this.pfsTab = this.window.locator('.tab[data-tab="pfs"]');
  }

  /** Opens the sheet and switches to its PFS tab. */
  async openPfsTab(): Promise<void> {
    await renderActorSheet(this.page, this.actorId);
    await this.window.locator('nav [data-tab="pfs"]').first().click();
    await expect(this.pfsTab).toBeVisible();
  }

  get downloadButton(): Locator {
    return this.pfsTab.getByRole('button', { name: /Download/ });
  }

  get deleteButton(): Locator {
    return this.pfsTab.getByRole('button', { name: /Delete/ });
  }

  /** Clicks Download Chronicle and returns the browser download. */
  async downloadChronicle(): Promise<Download> {
    const download = this.page.waitForEvent('download');
    await this.downloadButton.click();
    return download;
  }

  /** Clicks Delete Chronicle and confirms. */
  async deleteChronicle(): Promise<void> {
    await this.deleteButton.click();
    await this.page.getByRole('button', { name: 'Yes' }).click();
  }
}
