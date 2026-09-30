/**
 * Pathfinder: inline validation keeps Generate disabled until the session
 * details and every character's Society ID are filled in.
 */
import { test, expect } from '../support/test.js';
import { cleanWorld, createTestParty, withGamemaster, type TestParty } from '../support/party.js';
import { resetChronicleForm, updateActor } from '../support/world.js';

let party: TestParty;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  party = await withGamemaster(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    return createTestParty(page, 'pf2e.iconics', 'Validation Party', [
      { entryName: 'Ezren (Level 1)', name: 'Ezren', society: { playerNumber: 730001, characterNumber: 2001 } },
      // Pregens ship without a Society ID; Merisiel keeps it that way.
      { entryName: 'Merisiel (Level 1)', name: 'Merisiel' },
    ]);
  });
});

test.afterAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, cleanWorld);
});

test.beforeEach(async ({ gmPage }) => {
  await resetChronicleForm(gmPage);
});

test('lists every problem and disables Generate on a blank form', async ({ form }) => {
  await form.open(party.partyId);
  await form.field('#gmPfsNumber').fill('');
  await form.field('#gmPfsNumber').dispatchEvent('change');

  await expect(form.button('Generate Chronicles')).toBeDisabled();
  const errors = form.field('#validationErrorList li');
  await expect(errors).toContainText([
    'GM PFS Number is required',
    'Event Code is required',
    'IT Merisiel: Player Number is required',
    'IT Merisiel: Character Number is required',
  ]);
  await expect(errors.filter({ hasText: 'IT Ezren' })).toHaveCount(0);
});

test('rejects negative currency spent for a character', async ({ form }) => {
  const [ezrenId] = party.memberIds;
  await form.open(party.partyId);
  await form.fillEventDetails();
  await form.setText(`[name="characters.${ezrenId}.currencySpent"]`, '-5');

  await expect(form.field('#validationErrorList')).toContainText('IT Ezren: Currency Spent cannot be negative');
  await expect(form.button('Generate Chronicles')).toBeDisabled();
});

test('enables Generate once every character has a Society ID', async ({ gmPage, form }) => {
  await form.open(party.partyId);
  await form.fillEventDetails();
  await form.chooseScenario('pfs2/season4', 'pfs2.s4-01');
  await expect(form.button('Generate Chronicles')).toBeDisabled();

  await updateActor(gmPage, party.memberIds[1], {
    'system.pfs.playerNumber': 730002,
    'system.pfs.characterNumber': 2002,
  });
  await form.open(party.partyId);

  await expect(form.field('#validationErrors')).toBeHidden();
  await expect(form.button('Generate Chronicles')).toBeEnabled();
  expect(await form.generate()).toContain('Successfully generated 2 chronicle(s)');
});
