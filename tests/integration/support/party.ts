/**
 * Per-spec party setup: imports pregenerated characters with Society IDs
 * into a fresh party, and tears everything down afterwards.
 */
import type { Page } from '@playwright/test';
import { deleteActorsByPrefix, deleteChatMessages, type SocietyIdentity } from '@scooper4711/foundry-test-kit';
import { createParty, importPregen, resetChronicleForm, TEST_ACTOR_PREFIXES } from './world.js';

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
  await deleteActorsByPrefix(page, TEST_ACTOR_PREFIXES);
  await deleteChatMessages(page);
  await resetChronicleForm(page);
}
