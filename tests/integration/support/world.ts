/**
 * The chronicle generator's world conventions on top of the test kit:
 * suite actors are named "IT …" so cleanup can find them, and the module
 * stores its output as actor flags and its form in a world setting.
 */
import type { Page } from '@playwright/test';
import {
  createParty as kitCreateParty,
  importPregen as kitImportPregen,
  readActorFlag,
  setSetting,
  type PregenRequest,
} from '@scooper4711/foundry-test-kit';

const MODULE_ID = 'pfs-chronicle-generator';

/** Name prefix for every actor the suite creates, so cleanup can find them. */
export const TEST_ACTOR_PREFIX = 'IT ';

/** Prefixes of suite actors, including ones left by earlier drafts. */
export const TEST_ACTOR_PREFIXES = [TEST_ACTOR_PREFIX, 'Integ '];

export interface StoredChronicle {
  data: Record<string, unknown> | null;
  pdfBase64: string | null;
}

/** Imports a pregen as an "IT <name>" suite actor. */
export async function importPregen(page: Page, request: PregenRequest): Promise<string> {
  return kitImportPregen(page, { ...request, name: `${TEST_ACTOR_PREFIX}${request.name}` });
}

/** Creates an "IT <name>" party of the given members. */
export async function createParty(page: Page, name: string, memberIds: string[]): Promise<string> {
  return kitCreateParty(page, `${TEST_ACTOR_PREFIX}${name}`, memberIds);
}

/** Forgets the saved party chronicle form so each test starts blank. */
export async function resetChronicleForm(page: Page): Promise<void> {
  await setSetting(page, MODULE_ID, 'partyChronicleData', undefined);
}

/** Reads the chronicle data and PDF the module stored on an actor. */
export async function readStoredChronicle(page: Page, actorId: string): Promise<StoredChronicle> {
  const data = await readActorFlag(page, actorId, MODULE_ID, 'chronicleData');
  const pdfBase64 = await readActorFlag(page, actorId, MODULE_ID, 'chroniclePdf');
  return {
    data: (data as Record<string, unknown> | undefined) ?? null,
    pdfBase64: (pdfBase64 as string | undefined) ?? null,
  };
}

/** Reads the base64 zip archive stored on a party actor, if any. */
export async function readStoredArchive(page: Page, partyId: string): Promise<string | null> {
  return ((await readActorFlag(page, partyId, MODULE_ID, 'chronicleZip')) as string | undefined) ?? null;
}
