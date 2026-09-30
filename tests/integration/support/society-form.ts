/**
 * Page object for the party sheet's Society tab (the party chronicle form).
 *
 * Text inputs save on `change`, so every text entry blurs the field to
 * commit it the way a GM tabbing through the form would.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { layoutInfo } from './layout-catalog.js';

import { renderActorSheet } from '@scooper4711/foundry-test-kit';

export interface EventDetails {
  gmPfsNumber: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
}

export const DEFAULT_EVENT: EventDetails = {
  gmPfsNumber: '1234567',
  eventName: 'Integration Con',
  eventCode: '990001',
  // Not today: the form fills a blank date with today, so a past date
  // tells "kept" apart from "reset".
  eventDate: '2026-08-15',
};

const GENERATION_TIMEOUT_MS = 120_000;

export class SocietyForm {
  readonly root: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('.tab[data-tab="pfs"]:has(#gmPfsNumber)');
  }

  /**
   * Opens the party sheet on its Society tab, by default with every
   * section expanded so all fields are reachable.
   */
  async open(partyId: string, { expandSections = true } = {}): Promise<void> {
    await renderActorSheet(this.page, partyId);
    await this.page.locator('a[data-tab="pfs"]', { hasText: 'Society' }).first().click();
    await expect(this.root).toBeVisible();
    if (expandSections) await this.expandAllSections();
  }

  async expandAllSections(): Promise<void> {
    const collapsed = this.root.locator(".collapsible-header[aria-expanded='false']");
    while ((await collapsed.count()) > 0) {
      const before = await collapsed.count();
      await collapsed.first().click();
      await expect(collapsed).toHaveCount(before - 1);
    }
  }

  field(selector: string): Locator {
    return this.root.locator(selector);
  }

  /** Types into a text input and commits it with a change event. */
  async setText(selector: string, value: string): Promise<void> {
    const input = this.field(selector);
    await input.fill(value);
    await input.dispatchEvent('change');
  }

  async fillEventDetails(details: EventDetails = DEFAULT_EVENT): Promise<void> {
    await this.setText('#gmPfsNumber', details.gmPfsNumber);
    await this.setText('#scenarioName', details.eventName);
    await this.setText('#eventCode', details.eventCode);
    await this.setText('#eventDate', details.eventDate);
  }

  /**
   * Selects a season, then a scenario within it, waiting after each for
   * the layout-driven parts of the form (PDF path, checkboxes) to settle.
   */
  async chooseScenario(seasonId: string, layoutId: string): Promise<void> {
    await this.chooseSeason(seasonId);
    if ((await this.field('#layout').inputValue()) !== layoutId) {
      await this.field('#layout').selectOption(layoutId);
      await this.waitForLayoutToSettle();
    }
    await expect(this.field('#layout')).toHaveValue(layoutId);
  }

  /** Selects a season and waits for its first scenario to load. */
  async chooseSeason(seasonId: string): Promise<void> {
    await this.field('#season').selectOption(seasonId);
    await this.waitForLayoutToSettle();
  }

  /** Waits until the PDF path and choice lists match the selected layout. */
  async waitForLayoutToSettle(): Promise<void> {
    await expect
      .poll(async () => {
        const selected = layoutInfo(await this.field('#layout').inputValue());
        const path = await this.field('#blankChroniclePath').inputValue();
        const checkboxes = await this.root.locator('.checkbox-choices input').count();
        return path === selected.defaultChronicleLocation && checkboxes === selected.checkboxes.length;
      })
      .toBe(true);
  }

  async checkAdventureSummary(choice: string): Promise<void> {
    await this.root.locator('.checkbox-choices').getByLabel(choice, { exact: true }).check();
  }

  async strikeOut(item: string): Promise<void> {
    await this.root.locator('.strikeout-choices').getByLabel(item, { exact: true }).check();
  }

  async fillIn(name: string, value: string): Promise<void> {
    await this.setText(`input[name="shared.fillIns.${name}"]`, value);
  }

  /** The character card for an actor on the form. */
  member(actorId: string): Locator {
    return this.root.locator(`.member-activity[data-character-id="${actorId}"]`);
  }

  memberField(actorId: string, field: string): Locator {
    return this.root.locator(`[name="characters.${actorId}.${field}"]`);
  }

  /** Selects the "(PFS default)" task level (character level - 2, min 0). */
  async selectDefaultTaskLevel(actorId: string): Promise<void> {
    const select = this.memberField(actorId, 'taskLevel');
    const value = await select.locator('option', { hasText: '(PFS default)' }).getAttribute('value');
    await select.selectOption(value ?? '-');
  }

  button(name: string): Locator {
    return this.root.getByRole('button', { name, exact: true });
  }

  /** Drags an actor from the Actors sidebar onto the GM character drop target. */
  async dragActorToGmCharacter(actorId: string): Promise<void> {
    await this.page.locator('#sidebar [data-tab="actors"]').first().click();
    const entry = this.page.locator(`#actors .directory-item[data-entry-id="${actorId}"]`);
    if (!(await entry.isVisible())) {
      // Party members are listed inside their party's collapsed folder.
      const member = this.page.locator(`[data-entry-id="${actorId}"]`);
      await this.page.locator('#actors li[data-party]', { has: member }).locator('.folder-header').first().click();
    }
    const target = this.root.locator('#gmCharacterDropZone, #gmCharacterSection');
    await entry.dragTo(target);
  }

  /** Clicks Generate Chronicles and waits for the outcome notification. */
  async generate(): Promise<string> {
    await this.button('Generate Chronicles').click();
    const outcome = this.page.locator('#notifications li', { hasText: /generated \d+ chronicle|Validation failed/ });
    await expect(outcome.first()).toBeVisible({ timeout: GENERATION_TIMEOUT_MS });
    return (await outcome.first().textContent())?.trim() ?? '';
  }

  /** Clicks Clear Data and confirms the dialog. */
  async clear(): Promise<void> {
    await this.button('Clear Data').click();
    await this.page.getByRole('button', { name: 'Yes' }).click();
    await expectNotification(this.page, 'Chronicle data cleared and defaults set');
    await expect(this.root).toBeVisible();
    await this.expandAllSections();
  }
}

/** Asserts a Foundry toast notification containing the text appears. */
export async function expectNotification(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.locator('#notifications li', { hasText: text }).first()).toBeVisible({
    timeout: GENERATION_TIMEOUT_MS,
  });
}
