/**
 * Starfinder: chronicles for a Starfinder Society party — flat Credits
 * Awarded by level, fixed 4 XP, no Pathfinder-only fields, fill-ins, the
 * GM credit character, and an SFS2E session report.
 */
import { test, expect } from '../support/test.js';
import { cleanWorld, createTestParty, withGamemaster, type TestParty } from '../support/party.js';
import { decodeSessionReport, pdfText } from '../support/chronicle-output.js';
import { importPregen, readStoredChronicle, resetChronicleForm } from '../support/world.js';
import { DEFAULT_EVENT, expectNotification } from '../support/society-form.js';

const ICONICS = 'sf2e.iconics';

// Credits Awarded per level, and trained Earn Income in Credits per day at
// task level (character level - 2): the Pathfinder gp value x 10, rounded up.
const EXPECTED = {
  navasi: { level: 1, credits: 140, incomePerDay: 1 },
  obozaya: { level: 3, credits: 380, incomePerDay: 2 },
  iseph: { level: 5, credits: 1000, incomePerDay: 5 },
};

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

let party: TestParty;
let gmCharacterId: string;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    party = await createTestParty(page, ICONICS, 'Starfinder Party', [
      { entryName: 'Navasi (Level 1)', name: 'Navasi', society: { playerNumber: 810001, characterNumber: 7001 } },
      { entryName: 'Obozaya (Level 3)', name: 'Obozaya', society: { playerNumber: 810002, characterNumber: 7002 } },
      { entryName: 'Iseph (Level 5)', name: 'Iseph', society: { playerNumber: 810003, characterNumber: 7003 } },
    ]);
    gmCharacterId = await importPregen(page, {
      packId: ICONICS,
      entryName: 'Zemir (Level 3)',
      name: 'Zemir',
      society: { playerNumber: Number(DEFAULT_EVENT.gmPfsNumber), characterNumber: 7099 },
    });
  });
});

test.afterAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, cleanWorld);
});

test.beforeEach(async ({ gmPage, form }) => {
  await resetChronicleForm(gmPage);
  await form.open(party.partyId);
  await form.fillEventDetails();
});

test('shows only Starfinder Society fields', async ({ form }) => {
  const [navasiId] = party.memberIds;
  await form.chooseScenario('sfs2/season1', 'sfs2.s1-01');

  await expect(form.field('.xp-fixed-value')).toHaveText('4 XP');
  await expect(form.field('.downtime-days-value')).toHaveText('8');
  await expect(form.field('[data-section-id="reputation"]')).toHaveCount(0);
  await expect(form.field('#treasureBundles')).toHaveCount(0);
  await expect(form.memberField(navasiId, 'slowTrack')).toHaveCount(0);
  await expect(form.memberField(navasiId, 'consumeReplay')).toHaveCount(0);
  await expect(form.member(navasiId).locator('.credits-awarded-value')).toHaveText('140 Credits');
  await expect(form.field('#season option')).not.toContainText([/Bounties|Quests/]);
});

test('generates chronicles with Credits Awarded by level', async ({ gmPage, form }) => {
  await form.chooseScenario('sfs2/season1', 'sfs2.s1-01');
  for (const id of party.memberIds) {
    await form.selectDefaultTaskLevel(id);
  }

  expect(await form.generate()).toBe('Successfully generated 3 chronicle(s) for all party members.');

  const [navasiId, obozayaId, isephId] = party.memberIds;
  for (const [id, expected] of [
    [navasiId, EXPECTED.navasi],
    [obozayaId, EXPECTED.obozaya],
    [isephId, EXPECTED.iseph],
  ] as const) {
    const income = 8 * expected.incomePerDay;
    expect((await readStoredChronicle(gmPage, id)).data).toMatchObject({
      level: expected.level,
      xp_gained: 4,
      treasure_bundle_value: expected.credits,
      income_earned: income,
      currency_gained: expected.credits + income,
    });
  }
  // Starfinder chronicles have no reputation box, so none is printed.
  const text = await pdfText((await readStoredChronicle(gmPage, navasiId)).pdfBase64 ?? '');
  expect(text).toContain('IT Navasi');
  expect(text).not.toContain("Envoy's Alliance");
});

test("records Seize and Destroy's summary checkbox and fill-in", async ({ gmPage, form }) => {
  await form.chooseScenario('sfs2/season1', 'sfs2.s1-07');
  await form.checkAdventureSummary('discovered');
  await form.fillIn('% of data erased', 'Sixty');

  expect(await form.generate()).toContain('Successfully generated 3 chronicle(s)');

  const chronicle = await readStoredChronicle(gmPage, party.memberIds[0]);
  expect(chronicle.data).toMatchObject({ summary_checkbox: ['discovered'], fillIns: { '% of data erased': 'Sixty' } });
  expect(await pdfText(chronicle.pdfBase64 ?? '')).toContain('Sixty');
});

test('uses whole Credits for a currency override', async ({ gmPage, form }) => {
  const [, obozayaId] = party.memberIds;
  await form.chooseScenario('sfs2/season1', 'sfs2.s1-02');
  await form.memberField(obozayaId, 'overrideCurrency').check();
  await expect(form.member(obozayaId).locator('.credits-awarded-row')).toBeHidden();
  await form.setText(`[name="characters.${obozayaId}.overrideCurrencyValue"]`, '999');

  expect(await form.generate()).toContain('Successfully generated 3 chronicle(s)');
  expect((await readStoredChronicle(gmPage, obozayaId)).data).toMatchObject({ currency_gained: 999 });
});

test('generates a GM credit chronicle and reports it as an SFS2E session', async ({ gmPage, form }) => {
  await form.chooseScenario('sfs2/season1', 'sfs2.s1-07');
  await form.dragActorToGmCharacter(gmCharacterId);
  await expect(form.field('#gmCharacterSection')).toContainText('IT Zemir');
  await form.expandAllSections();

  expect(await form.generate()).toBe('Successfully generated 4 chronicle(s) for all party members.');
  expect((await readStoredChronicle(gmPage, gmCharacterId)).data).toMatchObject({
    char: 'IT Zemir',
    treasure_bundle_value: 380,
  });

  await form.button('Copy Session Report').click();
  await expectNotification(gmPage, 'Session report copied to clipboard (base64).');
  const report = decodeSessionReport(await gmPage.evaluate(() => navigator.clipboard.readText()));
  expect(report).toMatchObject({ gameSystem: 'SFS2E', scenario: 'SFS2E 1-07', generateGmChronicle: true });
  expect(report.signUps).toHaveLength(4);
});
