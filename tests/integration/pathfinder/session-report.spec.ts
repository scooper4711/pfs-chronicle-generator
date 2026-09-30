/**
 * Pathfinder: "Copy Session Report" puts the Paizo reporting payload on the
 * clipboard (base64 UTF-16LE by default, raw JSON with Alt held).
 */
import type { Page } from '@playwright/test';
import { test, expect } from '../support/test.js';
import { cleanWorld, createTestParty, withGamemaster, type TestParty } from '../support/party.js';
import { decodeSessionReport, type SessionReport } from '../support/chronicle-output.js';
import { importPregen, resetChronicleForm, updateActor } from '../support/world.js';
import { DEFAULT_EVENT, expectNotification, type SocietyForm } from '../support/society-form.js';

const ICONICS = 'pf2e.iconics';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

let party: TestParty;
let gmCharacterId: string;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    party = await createTestParty(page, ICONICS, 'Report Party', [
      {
        entryName: 'Seoni (Level 3)',
        name: 'Seoni',
        society: { playerNumber: 750001, characterNumber: 2001, faction: 'EA' },
      },
      {
        entryName: 'Sajan (Level 3)',
        name: 'Sajan',
        society: { playerNumber: 750002, characterNumber: 2002, faction: 'VS' },
      },
    ]);
    gmCharacterId = await importPregen(page, {
      packId: ICONICS,
      entryName: 'Kyra (Level 3)',
      name: 'Kyra',
      society: { playerNumber: Number(DEFAULT_EVENT.gmPfsNumber), characterNumber: 2098, faction: 'GA' },
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
  await form.chooseScenario('pfs2/season3', 'pfs2.s3-05');
});

test("copies the party's session report as base64", async ({ gmPage, form }) => {
  const [seoniId, sajanId] = party.memberIds;
  await form.field('#chosenFactionReputation').selectOption('4');
  await form.field('#reputation-GA').selectOption('2');
  await form.field('#reportingA').check();
  await form.field('#reportingC').check();
  await form.memberField(seoniId, 'consumeReplay').check();
  await form.memberField(sajanId, 'slowTrack').check();

  const report = decodeSessionReport(await copySessionReport(gmPage, form));

  expect(report).toMatchObject({
    gameSystem: 'PFS2E',
    scenario: 'PFS2E 3-05',
    gmOrgPlayNumber: Number(DEFAULT_EVENT.gmPfsNumber),
    repEarned: 4,
    reportingA: true,
    reportingB: false,
    reportingC: true,
    reportingD: false,
    generateGmChronicle: false,
    bonusRepEarned: [{ faction: 'Grand Archive', reputation: 2 }],
  });
  expect(report.gameDate).toMatch(new RegExp(`^${DEFAULT_EVENT.eventDate}T\\d\\d:(00|30):00\\+00:00$`));
  // Sign-ups follow the party sheet's member order, which the test does not control.
  expect(report.signUps).toHaveLength(2);
  expect(report.signUps).toEqual(
    expect.arrayContaining([
      signUp({
        characterName: 'IT Seoni',
        orgPlayNumber: 750001,
        characterNumber: 2001,
        faction: "Envoy's Alliance",
        consumeReplay: true,
        repEarned: 4,
      }),
      signUp({
        characterName: 'IT Sajan',
        orgPlayNumber: 750002,
        characterNumber: 2002,
        faction: 'Vigilant Seal',
        repEarned: 2,
      }),
    ])
  );
});

test('includes the GM credit character as a GM sign-up', async ({ gmPage, form }) => {
  await form.dragActorToGmCharacter(gmCharacterId);
  await expect(form.field('#gmCharacterSection')).toBeVisible();

  const report = decodeSessionReport(await copySessionReport(gmPage, form));

  expect(report.generateGmChronicle).toBe(true);
  expect(report.signUps.find((entry) => entry.isGM)).toMatchObject({
    characterName: 'IT Kyra',
    orgPlayNumber: Number(DEFAULT_EVENT.gmPfsNumber),
    characterNumber: 2098,
    faction: 'Grand Archive',
  });
});

test('copies raw JSON when Alt is held', async ({ gmPage, form }) => {
  await form.button('Copy Session Report').click({ modifiers: ['Alt'] });
  await expectNotification(gmPage, 'Session report copied to clipboard (raw JSON).');

  const report = JSON.parse(await readClipboard(gmPage)) as SessionReport;
  expect(report.scenario).toBe('PFS2E 3-05');
  expect(report.signUps).toHaveLength(2);
});

test("asks for each character's faction before copying", async ({ gmPage, form }) => {
  const [seoniId] = party.memberIds;
  await updateActor(gmPage, seoniId, { 'system.pfs.currentFaction': '' });
  try {
    await form.button('Copy Session Report').click();
    await expect(form.field('#validationErrorList')).toContainText(
      'IT Seoni: Faction is required for session reporting'
    );
  } finally {
    await updateActor(gmPage, seoniId, { 'system.pfs.currentFaction': 'EA' });
  }
});

async function copySessionReport(page: Page, form: SocietyForm): Promise<string> {
  await form.button('Copy Session Report').click();
  await expectNotification(page, 'Session report copied to clipboard (base64).');
  return readClipboard(page);
}

async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

function signUp(fields: Partial<SessionReport['signUps'][number]>): SessionReport['signUps'][number] {
  return {
    isGM: false,
    orgPlayNumber: 0,
    characterNumber: 0,
    characterName: '',
    consumeReplay: false,
    repEarned: 0,
    faction: '',
    ...fields,
  };
}
