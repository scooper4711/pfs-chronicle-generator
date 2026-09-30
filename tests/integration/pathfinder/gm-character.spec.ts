/**
 * Pathfinder: GM credit character assigned by drag and drop, validated
 * against the GM PFS number, and included in generation.
 */
import { test, expect } from '../support/test.js';
import { cleanWorld, createTestParty, withGamemaster, type TestParty } from '../support/party.js';
import { importPregen, readStoredChronicle, resetChronicleForm } from '../support/world.js';
import { DEFAULT_EVENT, expectNotification } from '../support/society-form.js';

const ICONICS = 'pf2e.iconics';

let party: TestParty;
let gmCharacterId: string;
let npcId: string;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    party = await createTestParty(page, ICONICS, 'GM Credit Party', [
      {
        entryName: 'Harsk (Level 3)',
        name: 'Harsk',
        society: { playerNumber: 740001, characterNumber: 2001, faction: 'HH' },
      },
      {
        entryName: 'Lem (Level 3)',
        name: 'Lem',
        society: { playerNumber: 740002, characterNumber: 2002, faction: 'RO' },
      },
    ]);
    gmCharacterId = await importPregen(page, {
      packId: ICONICS,
      entryName: 'Lini (Level 3)',
      name: 'Lini',
      society: { playerNumber: Number(DEFAULT_EVENT.gmPfsNumber), characterNumber: 2099, faction: 'VW' },
    });
    npcId = await page.evaluate(async () => {
      const actor = await (
        globalThis as unknown as { Actor: { create(d: object): Promise<{ id: string }> } }
      ).Actor.create({ name: 'IT Goblin', type: 'npc' });
      return actor.id;
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
  await form.chooseScenario('pfs2/season3', 'pfs2.s3-04');
});

test('generates a GM credit chronicle for a dropped character', async ({ gmPage, form }) => {
  await form.dragActorToGmCharacter(gmCharacterId);

  const section = form.field('#gmCharacterSection');
  await expect(section).toContainText('IT Lini');
  await expect(section.locator('.gm-credit-label')).toHaveText('GM Credit');
  await form.expandAllSections();
  await form.selectDefaultTaskLevel(gmCharacterId);
  await form.setText(`[name="characters.${gmCharacterId}.notes"]`, 'Ran the table');

  expect(await form.generate()).toBe('Successfully generated 3 chronicle(s) for all party members.');
  expect((await readStoredChronicle(gmPage, gmCharacterId)).data).toMatchObject({
    char: 'IT Lini',
    societyid: DEFAULT_EVENT.gmPfsNumber,
    char_number: '2099',
    notes: 'Ran the table',
    xp_gained: 4,
  });
});

test("refuses to generate when the GM character's PFS ID differs from the GM PFS number", async ({ form }) => {
  await form.dragActorToGmCharacter(gmCharacterId);
  await expect(form.field('#gmCharacterSection')).toBeVisible();
  await form.setText('#gmPfsNumber', '7654321');

  expect(await form.generate()).toContain(
    `GM character PFS ID (${DEFAULT_EVENT.gmPfsNumber}) does not match GM PFS Number (7654321)`
  );
});

test('remembers the GM character until it is cleared', async ({ form }) => {
  await form.dragActorToGmCharacter(gmCharacterId);
  await expect(form.field('#gmCharacterSection')).toBeVisible();

  await form.open(party.partyId);
  await expect(form.field('#gmCharacterSection')).toContainText('IT Lini');

  await form.field('#clearGmCharacter').click();
  await expect(form.field('#gmCharacterDropZone')).toBeVisible();
  await expect(form.field('#gmCharacterSection')).toHaveCount(0);
});

test('refuses a party member as the GM character', async ({ gmPage, form }) => {
  await form.dragActorToGmCharacter(party.memberIds[0]);
  await expectNotification(gmPage, 'This actor is already a party member');
  await expect(form.field('#gmCharacterDropZone')).toBeVisible();
});

test('refuses a non-character actor as the GM character', async ({ gmPage, form }) => {
  await form.dragActorToGmCharacter(npcId);
  await expectNotification(gmPage, 'Only character actors can be assigned as the GM character');
  await expect(form.field('#gmCharacterDropZone')).toBeVisible();
});
