/**
 * Pathfinder: getting generated chronicles out — the party zip archive,
 * the character sheet Download/Delete buttons, and a player's own download.
 */
import { readFileSync } from 'fs';
import { unzipSync } from 'fflate';
import { test, expect } from '../support/test.js';
import { cleanWorld, createTestParty, withGamemaster, type TestParty } from '../support/party.js';
import { CharacterSheet } from '../support/character-sheet.js';
import { disableSceneCanvas, suiteContextOptions } from '../support/context-options.js';
import { joinAsPlayer, TEST_PLAYER } from '../support/session.js';
import { assignCharacterToUser, readStoredChronicle } from '../support/world.js';
import { expectNotification, type SocietyForm } from '../support/society-form.js';

let party: TestParty;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  party = await withGamemaster(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    const created = await createTestParty(page, 'pf2e.iconics', 'Delivery Party', [
      {
        entryName: 'Quinn (Level 1)',
        name: 'Quinn',
        society: { playerNumber: 760001, characterNumber: 2001, faction: 'HH' },
      },
      {
        entryName: 'Yoon (Level 1)',
        name: 'Yoon',
        society: { playerNumber: 760002, characterNumber: 2002, faction: 'EA' },
      },
    ]);
    await assignCharacterToUser(page, created.memberIds[0], TEST_PLAYER);
    return created;
  });
});

test.afterAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, cleanWorld);
});

test.describe.configure({ mode: 'serial' });

test('offers no downloads before chronicles are generated', async ({ gmPage, form }) => {
  await form.open(party.partyId);
  await expect(form.button('Download Archive of Party Chronicles')).toBeDisabled();

  const sheet = new CharacterSheet(gmPage, party.memberIds[0]);
  await sheet.openPfsTab();
  await expect(sheet.downloadButton).toBeDisabled();
  await expect(sheet.deleteButton).toBeDisabled();
});

test("downloads a zip of the party's chronicles", async ({ gmPage, form }) => {
  await generateChronicles(form, party.partyId);
  await expect(form.button('Download Archive of Party Chronicles')).toBeEnabled();

  const downloadPromise = gmPage.waitForEvent('download');
  await form.button('Download Archive of Party Chronicles').click();
  const download = await downloadPromise;
  await expectNotification(gmPage, 'Chronicle archive downloaded successfully.');

  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const archive = unzipSync(readFileSync((await download.path()) ?? ''));
  expect(Object.keys(archive).sort()).toEqual([
    expect.stringMatching(/^IT_Quinn.*\.pdf$/),
    expect.stringMatching(/^IT_Yoon.*\.pdf$/),
  ]);
});

test('an assigned player downloads their own chronicle', async ({ browser }) => {
  const context = await browser.newContext(suiteContextOptions());
  await disableSceneCanvas(context);
  try {
    const page = await context.newPage();
    await joinAsPlayer(page, TEST_PLAYER);
    const sheet = new CharacterSheet(page, party.memberIds[0]);
    await sheet.openPfsTab();

    await expect(sheet.deleteButton).toHaveCount(0);
    const download = await sheet.downloadChronicle();
    expect(download.suggestedFilename()).toMatch(/^IT_Quinn.*\.pdf$/);
  } finally {
    await context.close();
  }
});

test("the GM deletes a character's chronicle from the character sheet", async ({ gmPage }) => {
  const [, yoonId] = party.memberIds;
  const sheet = new CharacterSheet(gmPage, yoonId);
  await sheet.openPfsTab();
  const download = await sheet.downloadChronicle();
  expect(download.suggestedFilename()).toMatch(/^IT_Yoon.*\.pdf$/);

  await sheet.deleteChronicle();

  await expect(sheet.downloadButton).toBeDisabled();
  expect(await readStoredChronicle(gmPage, yoonId)).toEqual({ data: null, pdfBase64: null });
});

async function generateChronicles(form: SocietyForm, partyId: string): Promise<void> {
  await form.open(partyId);
  await form.fillEventDetails();
  await form.chooseScenario('pfs2/season4', 'pfs2.s4-02');
  expect(await form.generate()).toContain('Successfully generated 2 chronicle(s)');
}
