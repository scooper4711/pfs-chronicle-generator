/**
 * Per-spec party setup: imports pregenerated characters with Society IDs
 * into a fresh party, and tears everything down afterwards.
 */
import type { Browser, Page } from '@playwright/test';
import { disableSceneCanvas, suiteContextOptions } from './context-options.js';
import { enterGameAsGamemaster } from './session.js';
import {
  createParty,
  deleteChatMessages,
  deleteTestActors,
  importPregen,
  resetChronicleForm,
  type SocietyIdentity,
} from './world.js';

export interface MemberSpec {
  /** Compendium entry name, e.g. "Amiri (Level 1)". */
  entryName: string;
  /** Actor name (the suite prefixes it with "IT "). */
  name: string;
  society?: SocietyIdentity;
}

export interface TestParty {
  partyId: string;
  /** Actor ids in the order the members were given. */
  memberIds: string[];
}

/** Runs `action` on a fresh Gamemaster page, closing it afterwards. */
export async function withGamemaster<T>(
  browser: Browser,
  sessionPath: string,
  action: (page: Page) => Promise<T>
): Promise<T> {
  const context = await browser.newContext(suiteContextOptions(sessionPath));
  await disableSceneCanvas(context);
  try {
    const page = await context.newPage();
    await enterGameAsGamemaster(page);
    return await action(page);
  } finally {
    await context.close();
  }
}

/** Imports the members from `packId` and groups them into a new party. */
export async function createTestParty(
  page: Page,
  packId: string,
  partyName: string,
  members: MemberSpec[]
): Promise<TestParty> {
  const memberIds: string[] = [];
  for (const member of members) {
    memberIds.push(await importPregen(page, { packId, ...member }));
  }
  const partyId = await createParty(page, partyName, memberIds);
  return { partyId, memberIds };
}

/** Removes suite actors, chat messages, and the saved form. */
export async function cleanWorld(page: Page): Promise<void> {
  await deleteTestActors(page);
  await deleteChatMessages(page);
  await resetChronicleForm(page);
}
