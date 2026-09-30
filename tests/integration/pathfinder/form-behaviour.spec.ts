/**
 * Pathfinder: how the Society form behaves while a GM fills it in — live
 * reward displays, auto-save, collapsible section summaries, portrait
 * links, and the resizable rewards sidebar.
 */
import { test, expect } from '../support/test.js';
import { withGamemasterPage } from '@scooper4711/foundry-test-kit';
import { cleanWorld, createTestParty, type TestParty } from '../support/party.js';
import { CharacterSheet } from '../support/character-sheet.js';
import { resetChronicleForm } from '../support/world.js';
import { closeAllSheets } from '@scooper4711/foundry-test-kit';
import { DEFAULT_EVENT, type SocietyForm } from '../support/society-form.js';

let party: TestParty;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  party = await withGamemasterPage(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    return createTestParty(page, 'pf2e.iconics', 'Form Party', [
      {
        entryName: 'Merisiel (Level 5)',
        name: 'Merisiel',
        society: { playerNumber: 770001, characterNumber: 2001, faction: 'GA' },
      },
    ]);
  });
});

test.afterAll(async ({ browser, gamemasterSession }) => {
  await withGamemasterPage(browser, gamemasterSession, cleanWorld);
});

test.beforeEach(async ({ gmPage, form }) => {
  await resetChronicleForm(gmPage);
  // Section collapse state is remembered per browser; start from none.
  await gmPage.evaluate(() => window.localStorage.removeItem('pfs-chronicle-generator.collapseSections'));
  await form.open(party.partyId);
  await form.chooseScenario('pfs2/season3', 'pfs2.s3-06');
});

test('recalculates earned income as the Earn Income check changes', async ({ form }) => {
  const [merisielId] = party.memberIds;
  const income = form.member(merisielId).locator('.earned-income-value');
  await form.selectDefaultTaskLevel(merisielId);

  // Task level 3 for 8 days: 0.5 gp/day trained; a critical success pays
  // as task level 4 (0.7 gp/day); a failure pays 0.08 gp/day.
  await expect(income).toHaveText('4.00 gp');
  await form.memberField(merisielId, 'successLevel').selectOption('critical_success');
  await expect(income).toHaveText('5.60 gp');
  await form.memberField(merisielId, 'successLevel').selectOption('failure');
  await expect(income).toHaveText('0.64 gp');
  await form.memberField(merisielId, 'successLevel').selectOption('critical_failure');
  await expect(income).toHaveText('0.00 gp');

  // At task level 5 an expert out-earns a trained character (1 vs 0.9 gp/day).
  await form.memberField(merisielId, 'successLevel').selectOption('success');
  await form.memberField(merisielId, 'taskLevel').selectOption('5');
  await expect(income).toHaveText('7.20 gp');
  await form.memberField(merisielId, 'proficiencyRank').selectOption('expert');
  await expect(income).toHaveText('8.00 gp');
});

test("shows each character's treasure for the chosen treasure bundles", async ({ form }) => {
  const treasure = form.member(party.memberIds[0]).locator('.treasure-bundle-value');
  // A level 5 treasure bundle is worth 10 gp.
  await form.field('#treasureBundles').selectOption('10');
  await expect(treasure).toHaveText('100.00 gp');
  await form.field('#treasureBundles').selectOption('2.5');
  await expect(treasure).toHaveText('25.00 gp');
});

test('keeps entered values after the sheet is closed and reopened', async ({ gmPage, form }) => {
  const [merisielId] = party.memberIds;
  await form.fillEventDetails();
  await form.field('#reputation-HH').selectOption('3');
  await form.memberField(merisielId, 'proficiencyRank').selectOption('master');
  await form.setText(`[name="characters.${merisielId}.notes"]`, 'Found the hidden archive');

  await closeAllSheets(gmPage);
  await form.open(party.partyId);

  await expect(form.field('#eventCode')).toHaveValue(DEFAULT_EVENT.eventCode);
  await expect(form.field('#eventDate')).toHaveValue(DEFAULT_EVENT.eventDate);
  await expect(form.field('#layout')).toHaveValue('pfs2.s3-06');
  await expect(form.field('#reputation-HH')).toHaveValue('3');
  await expect(form.memberField(merisielId, 'proficiencyRank')).toHaveValue('master');
  await expect(form.memberField(merisielId, 'notes')).toHaveValue('Found the hidden archive');
});

test('summarizes collapsed sections and remembers them collapsed', async ({ gmPage, form }) => {
  await form.field('#chosenFactionReputation').selectOption('4');
  await form.field('#reputation-GA').selectOption('2');

  await collapse(form, 'reputation');
  await collapse(form, 'shared-rewards');

  await expect(sectionHeader(form, 'reputation')).toContainText('Reputation - +4 ; GA: +2');
  await expect(sectionHeader(form, 'shared-rewards')).toContainText('Shared Rewards - 4 XP; 8 TB');

  await closeAllSheets(gmPage);
  await form.open(party.partyId, { expandSections: false });
  await expect(sectionHeader(form, 'reputation')).toHaveAttribute('aria-expanded', 'false');
  await expect(sectionHeader(form, 'reputation')).toContainText('Reputation - +4 ; GA: +2');
  await expect(sectionHeader(form, 'event-details')).toHaveAttribute('aria-expanded', 'true');
});

test("opens a character's sheet from their portrait", async ({ gmPage, form }) => {
  const [merisielId] = party.memberIds;
  await form.member(merisielId).locator('img.actor-link').click();
  await expect(new CharacterSheet(gmPage, merisielId).window).toBeVisible();
});

test('resizes the rewards sidebar and keeps the width across re-renders', async ({ gmPage, form }) => {
  const sidebar = form.field('.sidebar');
  const handle = form.field('.sidebar-resize-handle');
  const before = (await sidebar.boundingBox())?.width ?? 0;
  const grip = await handle.boundingBox();
  if (!grip) throw new Error('resize handle is not rendered');

  await gmPage.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await gmPage.mouse.down();
  await gmPage.mouse.move(grip.x + grip.width / 2 + 80, grip.y + grip.height / 2, { steps: 5 });
  await gmPage.mouse.up();

  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeCloseTo(before + 80, -1);
  await closeAllSheets(gmPage);
  await form.open(party.partyId);
  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeCloseTo(before + 80, -1);
});

function sectionHeader(form: SocietyForm, sectionId: string) {
  return form.field(`[data-section-id="${sectionId}"] .collapsible-header`);
}

async function collapse(form: SocietyForm, sectionId: string): Promise<void> {
  await sectionHeader(form, sectionId).click();
  await expect(sectionHeader(form, sectionId)).toHaveAttribute('aria-expanded', 'false');
}
