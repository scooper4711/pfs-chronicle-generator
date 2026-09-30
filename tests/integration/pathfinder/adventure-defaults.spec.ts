/**
 * Pathfinder: reward defaults for Bounties, Quests, and Scenarios, set both
 * when the GM picks a season and when the form is cleared.
 */
import { test, expect } from '../support/test.js';
import { cleanWorld, createTestParty, withGamemaster, type TestParty } from '../support/party.js';
import { resetChronicleForm } from '../support/world.js';
import { DEFAULT_EVENT, type SocietyForm } from '../support/society-form.js';

interface AdventureDefaults {
  xp: string;
  treasureBundles: string;
  downtimeDays: string;
  reputation: string;
}

const BOUNTY: AdventureDefaults = { xp: '1', treasureBundles: '2', downtimeDays: '0', reputation: '1' };
const QUEST: AdventureDefaults = { xp: '2', treasureBundles: '4', downtimeDays: '4', reputation: '2' };
const SCENARIO: AdventureDefaults = { xp: '4', treasureBundles: '8', downtimeDays: '8', reputation: '4' };

let party: TestParty;

test.beforeAll(async ({ browser, gamemasterSession }) => {
  party = await withGamemaster(browser, gamemasterSession, async (page) => {
    await cleanWorld(page);
    return createTestParty(page, 'pf2e.iconics', 'Defaults Party', [
      {
        entryName: 'Seelah (Level 5)',
        name: 'Seelah',
        society: { playerNumber: 720001, characterNumber: 2001, faction: 'VS' },
      },
    ]);
  });
});

test.afterAll(async ({ browser, gamemasterSession }) => {
  await withGamemaster(browser, gamemasterSession, cleanWorld);
});

test.beforeEach(async ({ gmPage, form }) => {
  await resetChronicleForm(gmPage);
  await form.open(party.partyId);
});

test.describe('choosing a season', () => {
  test('Quests set 2 XP, 4 treasure bundles, and 4 downtime days', async ({ form }) => {
    await form.chooseSeason('pfs2/bounties');
    await form.chooseSeason('pfs2/quests');
    await expectSharedRewards(form, QUEST);
  });

  test('a numbered season sets 4 XP, 8 treasure bundles, and 8 downtime days', async ({ form }) => {
    await form.chooseSeason('pfs2/bounties');
    await form.chooseSeason('pfs2/season3');
    await expectSharedRewards(form, SCENARIO);
  });

  test('Bounties set 1 XP, 2 treasure bundles, and no downtime', async ({ form }) => {
    await form.chooseSeason('pfs2/season3');
    await form.chooseSeason('pfs2/bounties');
    await expectSharedRewards(form, BOUNTY);
  });

  test("character cards show the season's XP", async ({ form }) => {
    await form.chooseSeason('pfs2/season3');
    await form.chooseSeason('pfs2/quests');
    const label = form.member(party.memberIds[0]).locator('.calculated-xp-label');
    await expect(label).toHaveText(`${QUEST.xp} XP`);
  });

  test("slow track character cards show half the season's XP", async ({ form }) => {
    const [seelahId] = party.memberIds;
    await form.chooseSeason('pfs2/season3');
    await form.memberField(seelahId, 'slowTrack').check();
    await form.chooseSeason('pfs2/quests');
    await expect(form.member(seelahId).locator('.calculated-xp-label')).toHaveText('1 XP');
  });
});

test.describe('clearing the form', () => {
  test('keeps session identifiers and resets the date to today', async ({ form }) => {
    await form.fillEventDetails();
    await form.chooseScenario('pfs2/season3', 'pfs2.s3-02');

    await form.clear();

    await expect(form.field('#gmPfsNumber')).toHaveValue(DEFAULT_EVENT.gmPfsNumber);
    await expect(form.field('#scenarioName')).toHaveValue(DEFAULT_EVENT.eventName);
    await expect(form.field('#eventCode')).toHaveValue(DEFAULT_EVENT.eventCode);
    await expect(form.field('#layout')).toHaveValue('pfs2.s3-02');
    await expect(form.field('#eventDate')).toHaveValue(new Date().toISOString().slice(0, 10));
  });

  test('uses Quest defaults for an event named "Q<number> ..."', async ({ form }) => {
    await clearWithEventName(form, "Q14 The Swordlords' Challenge");
    await expectSharedRewards(form, QUEST);
    await expect(form.field('#chosenFactionReputation')).toHaveValue(QUEST.reputation);
  });

  test('uses Scenario defaults for any other event name', async ({ form }) => {
    await clearWithEventName(form, 'Grand Lodge Game Night');
    await expectSharedRewards(form, SCENARIO);
    await expect(form.field('#chosenFactionReputation')).toHaveValue(SCENARIO.reputation);
  });

  test('uses Bounty defaults for an event named "B<number> ..."', async ({ form }) => {
    await clearWithEventName(form, 'B12 The Stolen Shadow');
    await expectSharedRewards(form, BOUNTY);
    await expect(form.field('#chosenFactionReputation')).toHaveValue(BOUNTY.reputation);
  });

  test("selects each character's PFS default task level", async ({ form }) => {
    const [seelahId] = party.memberIds;
    await form.chooseScenario('pfs2/season3', 'pfs2.s3-02');
    await form.memberField(seelahId, 'successLevel').selectOption('critical_failure');

    await form.clear();

    // A level 5 character earns income at task level 3 (0.5 gp/day, 8 days).
    await expect(form.memberField(seelahId, 'taskLevel')).toHaveValue('3');
    await expect(form.memberField(seelahId, 'successLevel')).toHaveValue('success');
    await expect(form.member(seelahId).locator('.earned-income-value')).toHaveText('4.00 gp');
  });
});

/** Sets rewards away from every default, then clears with the event name. */
async function clearWithEventName(form: SocietyForm, eventName: string): Promise<void> {
  await form.fillEventDetails({ ...DEFAULT_EVENT, eventName });
  await form.chooseScenario('pfs2/season3', 'pfs2.s3-02');
  await form.field('#xpEarned').selectOption('2');
  await form.field('#treasureBundles').selectOption('10');
  await form.field('#chosenFactionReputation').selectOption('6');
  await form.clear();
}

async function expectSharedRewards(form: SocietyForm, expected: AdventureDefaults): Promise<void> {
  await expect(form.field('#xpEarned')).toHaveValue(expected.xp);
  await expect(form.field('#treasureBundles')).toHaveValue(expected.treasureBundles);
  await expect(form.field('.downtime-days-value')).toHaveText(expected.downtimeDays);
}
