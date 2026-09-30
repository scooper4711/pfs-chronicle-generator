/**
 * Pathfinder: generating chronicles for a whole party from the Society tab.
 */
import { unzipSync } from 'fflate';
import { test, expect } from '../support/test.js';
import { cleanWorld, createTestParty, withGamemaster, type TestParty } from '../support/party.js';
import { pdfText } from '../support/chronicle-output.js';
import { readStoredArchive, readStoredChronicle, resetChronicleForm } from '../support/world.js';
import { DEFAULT_EVENT } from '../support/society-form.js';

const ICONICS = 'pf2e.iconics';

// Treasure bundle gp per level and trained earned income gp/day at task
// level (character level - 2), from the PFS2 tables.
const EXPECTED = {
  amiri: { level: 1, bundleValue: 1.4, incomePerDay: 0.05 },
  valeros: { level: 3, bundleValue: 3.8, incomePerDay: 0.2 },
  kyra: { level: 5, bundleValue: 10, incomePerDay: 0.5 },
};

let party: TestParty;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  party = await withGamemaster(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    return createTestParty(page, ICONICS, 'Generation Party', [
      {
        entryName: 'Amiri (Level 1)',
        name: 'Amiri',
        society: { playerNumber: 710001, characterNumber: 2001, faction: 'EA' },
      },
      {
        entryName: 'Valeros (Level 3)',
        name: 'Valeros',
        society: { playerNumber: 710002, characterNumber: 2002, faction: 'GA' },
      },
      {
        entryName: 'Kyra (Level 5)',
        name: 'Kyra',
        society: { playerNumber: 710003, characterNumber: 2003, faction: 'VW' },
      },
    ]);
  });
});

test.afterAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, cleanWorld);
});

test.beforeEach(async ({ gmPage }) => {
  await resetChronicleForm(gmPage);
});

test('generates a chronicle for every member with level-based rewards', async ({ gmPage, form }) => {
  const [amiriId, valerosId, kyraId] = party.memberIds;
  await form.open(party.partyId);
  await form.fillEventDetails();
  await form.chooseScenario('pfs2/season2', 'pfs2.s2-01');
  await form.field('#treasureBundles').selectOption('8');
  await form.field('#chosenFactionReputation').selectOption('4');
  await form.field('#reputation-EA').selectOption('2');
  for (const id of party.memberIds) {
    await form.selectDefaultTaskLevel(id);
  }
  await form.setText(`[name="characters.${amiriId}.notes"]`, 'Befriended the wyrmling');
  await form.setText(`[name="characters.${valerosId}.currencySpent"]`, '12.5');

  expect(await form.generate()).toBe('Successfully generated 3 chronicle(s) for all party members.');

  const amiri = await readStoredChronicle(gmPage, amiriId);
  expect(amiri.data).toMatchObject({
    char: 'IT Amiri',
    societyid: '710001',
    char_number: '2001',
    level: EXPECTED.amiri.level,
    gmid: DEFAULT_EVENT.gmPfsNumber,
    event: DEFAULT_EVENT.eventName,
    eventcode: DEFAULT_EVENT.eventCode,
    date: DEFAULT_EVENT.eventDate,
    xp_gained: 4,
    notes: 'Befriended the wyrmling',
    reputation: ["Envoy's Alliance: +6"],
  });
  expectRewards(amiri.data, EXPECTED.amiri);
  expect((await readStoredChronicle(gmPage, valerosId)).data).toMatchObject({ currency_spent: 12.5 });
  expectRewards((await readStoredChronicle(gmPage, valerosId)).data, EXPECTED.valeros);
  expectRewards((await readStoredChronicle(gmPage, kyraId)).data, EXPECTED.kyra);

  const text = await pdfText(amiri.pdfBase64 ?? '');
  for (const expected of ['IT Amiri', '710001', 'Befriended the wyrmling', DEFAULT_EVENT.eventName]) {
    expect(text).toContain(expected);
  }

  const archive = unzipSync(Buffer.from((await readStoredArchive(gmPage, party.partyId)) ?? '', 'base64'));
  expect(Object.keys(archive)).toHaveLength(3);
});

/** Checks the treasure, income, and total currency for 8 TB and 8 downtime days. */
function expectRewards(
  data: Record<string, unknown> | null,
  expected: { bundleValue: number; incomePerDay: number }
): void {
  const treasure = 8 * expected.bundleValue;
  const income = 8 * expected.incomePerDay;
  expect(data?.treasure_bundle_value).toBeCloseTo(treasure, 2);
  expect(data?.income_earned).toBeCloseTo(income, 2);
  expect(data?.currency_gained).toBeCloseTo(treasure + income, 2);
}

test('records adventure summary checkboxes, strike-outs, and fill-ins', async ({ gmPage, form }) => {
  const [amiriId] = party.memberIds;
  await form.open(party.partyId);
  await form.fillEventDetails();
  await form.chooseScenario('pfs2/season1', 'pfs2.s1-01');
  await form.checkAdventureSummary('recruited');
  await form.strikeOut('wand of heal (level 3; 60 gp)');
  await form.strikeOut('moderate mistform elixir (level 6; 56 gp)');
  await form.fillIn('task of level', 'Nineteen');

  expect(await form.generate()).toContain('Successfully generated 3 chronicle(s)');

  const chronicle = await readStoredChronicle(gmPage, amiriId);
  expect(chronicle.data).toMatchObject({
    summary_checkbox: ['recruited'],
    strikeout_item_lines: ['moderate mistform elixir (level 6; 56 gp)', 'wand of heal (level 3; 60 gp)'],
    fillIns: { 'task of level': 'Nineteen' },
  });
  expect(await pdfText(chronicle.pdfBase64 ?? '')).toContain('Nineteen');
});

test('halves XP, reputation, and currency on slow track', async ({ gmPage, form }) => {
  const [amiriId, valerosId] = party.memberIds;
  await form.open(party.partyId);
  await form.fillEventDetails();
  await form.chooseScenario('pfs2/season2', 'pfs2.s2-01');
  await form.field('#chosenFactionReputation').selectOption('4');
  for (const id of party.memberIds) {
    await form.selectDefaultTaskLevel(id);
  }
  await form.memberField(valerosId, 'slowTrack').check();
  await expect(form.member(valerosId).locator('.calculated-xp-label')).toHaveText('2 XP');

  expect(await form.generate()).toContain('Successfully generated 3 chronicle(s)');

  const slow = (await readStoredChronicle(gmPage, valerosId)).data;
  expect(slow).toMatchObject({ xp_gained: 2, reputation: ['Grand Archive: +2'] });
  // Per the slow-track spec, income is earned over halved downtime (4 days)
  // and the treasure + income total is then halved again (requirements 4, 5).
  expect(slow?.currency_gained).toBeCloseTo((8 * 3.8 + 4 * 0.2) / 2, 2);
  expect((await readStoredChronicle(gmPage, amiriId)).data).toMatchObject({ xp_gained: 4 });
});

test('uses per-character XP and currency overrides', async ({ gmPage, form }) => {
  const [, , kyraId] = party.memberIds;
  await form.open(party.partyId);
  await form.fillEventDetails();
  await form.chooseScenario('pfs2/season2', 'pfs2.s2-01');

  await form.memberField(kyraId, 'overrideXp').check();
  await expect(form.memberField(kyraId, 'overrideXpValue')).toBeVisible();
  await form.setText(`[name="characters.${kyraId}.overrideXpValue"]`, '3');
  await form.memberField(kyraId, 'overrideCurrency').check();
  await expect(form.member(kyraId).locator('.treasure-bundle-row')).toBeHidden();
  await form.setText(`[name="characters.${kyraId}.overrideCurrencyValue"]`, '123.45');

  expect(await form.generate()).toContain('Successfully generated 3 chronicle(s)');
  expect((await readStoredChronicle(gmPage, kyraId)).data).toMatchObject({ xp_gained: 3, currency_gained: 123.45 });

  await form.memberField(kyraId, 'overrideCurrency').uncheck();
  await expect(form.member(kyraId).locator('.treasure-bundle-row')).toBeVisible();
  await expect(form.memberField(kyraId, 'overrideCurrencyValue')).toHaveValue('0');
});
