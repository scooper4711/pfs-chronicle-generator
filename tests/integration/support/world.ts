/**
 * World fixtures driven through the live Foundry game API: pregenerated
 * characters with Society IDs, parties, player assignments, cleanup, and
 * reads of what the module stored on actors.
 *
 * Every function body passed to page.evaluate() runs in the browser, so it
 * may only use its serialized argument and browser globals.
 */
import type { Page } from '@playwright/test';

const MODULE_ID = 'pfs-chronicle-generator';

/** Name prefix for every actor the suite creates, so cleanup can find them. */
export const TEST_ACTOR_PREFIX = 'IT ';

/** Prefixes of actors left behind by earlier drafts of this suite. */
const STALE_ACTOR_PREFIXES = [TEST_ACTOR_PREFIX, 'Integ '];

export interface SocietyIdentity {
  playerNumber: number;
  characterNumber: number;
  faction?: string;
}

export interface PregenRequest {
  /** Compendium collection id, e.g. "pf2e.iconics". */
  packId: string;
  /** Exact compendium entry name, e.g. "Amiri (Level 3)". */
  entryName: string;
  /** Name for the imported actor (prefixed with TEST_ACTOR_PREFIX). */
  name: string;
  society?: SocietyIdentity;
}

export interface StoredChronicle {
  data: Record<string, unknown> | null;
  pdfBase64: string | null;
}

/**
 * Imports a pregenerated character from a compendium and fills in its
 * Society identity (pregens ship without one, and chronicles require it).
 *
 * @returns The new actor's id
 */
export async function importPregen(page: Page, request: PregenRequest): Promise<string> {
  return page.evaluate(
    async ({ packId, entryName, name, society }) => {
      const g = globalThis as unknown as PageGlobals;
      const pack = g.game.packs.get(packId);
      if (!pack) throw new Error(`importPregen: compendium ${packId} not found`);
      const index = await pack.getIndex();
      const entry = index.find((item) => item.name === entryName);
      if (!entry) throw new Error(`importPregen: ${entryName} not found in ${packId}`);
      const source = await pack.getDocument(entry._id);
      const data = source.toObject();
      data.name = name;
      const created = await g.Actor.create(data);
      if (society) {
        await created.update({
          'system.pfs.playerNumber': society.playerNumber,
          'system.pfs.characterNumber': society.characterNumber,
          ...(society.faction ? { 'system.pfs.currentFaction': society.faction } : {}),
        });
      }
      return created.id;
    },
    { ...request, name: `${TEST_ACTOR_PREFIX}${request.name}` }
  );
}

/** Creates a party actor containing the given member actors. */
export async function createParty(page: Page, name: string, memberIds: string[]): Promise<string> {
  return page.evaluate(
    async ({ partyName, ids }) => {
      const g = globalThis as unknown as PageGlobals;
      const members = ids.map((id) => ({ uuid: g.game.actors.get(id)?.uuid ?? `Actor.${id}` }));
      const party = await g.Actor.create({ name: partyName, type: 'party', system: { details: { members } } });
      return party.id;
    },
    { partyName: `${TEST_ACTOR_PREFIX}${name}`, ids: memberIds }
  );
}

/** Deletes every actor created by this suite (or its earlier drafts). */
export async function deleteTestActors(page: Page): Promise<void> {
  await page.evaluate(async (prefixes) => {
    const g = globalThis as unknown as PageGlobals;
    const ids = g.game.actors
      .filter((actor) => prefixes.some((prefix) => actor.name.startsWith(prefix)))
      .map((actor) => actor.id);
    if (ids.length > 0) await g.Actor.deleteDocuments(ids);
  }, STALE_ACTOR_PREFIXES);
}

/** Deletes every chat message (generation posts two per run). */
export async function deleteChatMessages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const g = globalThis as unknown as PageGlobals;
    const ids = g.game.messages.map((message) => message.id);
    if (ids.length > 0) await g.ChatMessage.deleteDocuments(ids);
  });
}

/** Forgets the saved party chronicle form so each test starts blank. */
export async function resetChronicleForm(page: Page): Promise<void> {
  await page.evaluate(async (moduleId) => {
    const g = globalThis as unknown as PageGlobals;
    await g.game.settings.set(moduleId, 'partyChronicleData', undefined);
  }, MODULE_ID);
}

/** Reads the chronicle data and PDF the module stored on an actor. */
export async function readStoredChronicle(page: Page, actorId: string): Promise<StoredChronicle> {
  return page.evaluate(
    ({ id, moduleId }) => {
      const g = globalThis as unknown as PageGlobals;
      const actor = g.game.actors.get(id);
      return {
        data: (actor?.getFlag(moduleId, 'chronicleData') as Record<string, unknown> | undefined) ?? null,
        pdfBase64: (actor?.getFlag(moduleId, 'chroniclePdf') as string | undefined) ?? null,
      };
    },
    { id: actorId, moduleId: MODULE_ID }
  );
}

/** Reads the base64 zip archive stored on a party actor, if any. */
export async function readStoredArchive(page: Page, partyId: string): Promise<string | null> {
  return page.evaluate(
    ({ id, moduleId }) => {
      const g = globalThis as unknown as PageGlobals;
      return (g.game.actors.get(id)?.getFlag(moduleId, 'chronicleZip') as string | undefined) ?? null;
    },
    { id: partyId, moduleId: MODULE_ID }
  );
}

/** Applies a Foundry document update to an actor. */
export async function updateActor(page: Page, actorId: string, data: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    async ({ id, changes }) => {
      const g = globalThis as unknown as PageGlobals;
      await g.game.actors.get(id)?.update(changes);
    },
    { id: actorId, changes: data }
  );
}

/** Makes a user the owner of an actor and sets it as their character. */
export async function assignCharacterToUser(page: Page, actorId: string, userName: string): Promise<void> {
  await page.evaluate(
    async ({ id, user }) => {
      const g = globalThis as unknown as PageGlobals;
      const player = g.game.users.getName(user);
      if (!player) throw new Error(`assignCharacterToUser: user ${user} not found`);
      await g.game.actors.get(id)?.update({ ownership: { default: 0, [player.id]: 3 } });
      await player.update({ character: id });
    },
    { id: actorId, user: userName }
  );
}

/** Opens an actor's sheet (party or character). */
export async function renderActorSheet(page: Page, actorId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const g = globalThis as unknown as PageGlobals;
    const actor = g.game.actors.get(id);
    if (!actor) throw new Error(`renderActorSheet: actor ${id} not found`);
    await actor.sheet.render(true);
  }, actorId);
}

/** Closes every open application window. */
export async function closeAllSheets(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const g = globalThis as unknown as PageGlobals;
    await Promise.all([...g.foundry.applications.instances.values()].map((app) => app.close()));
  });
}

/** The active game system id ("pf2e" or "sf2e"). */
export async function gameSystemId(page: Page): Promise<string> {
  return page.evaluate(() => (globalThis as unknown as PageGlobals).game.system.id);
}

/** Minimal shape of the Foundry globals these helpers touch. */
interface PageGlobals {
  game: {
    system: { id: string };
    packs: Map<string, CompendiumPack>;
    actors: FoundryCollection<GameActor>;
    users: FoundryCollection<GameUser> & { getName(name: string): GameUser | undefined };
    settings: { set(module: string, key: string, value: unknown): Promise<unknown> };
    messages: { map<T>(transform: (message: { id: string }) => T): T[] };
  };
  ChatMessage: { deleteDocuments(ids: string[]): Promise<unknown> };
  Actor: {
    create(data: Record<string, unknown>): Promise<GameActor>;
    deleteDocuments(ids: string[]): Promise<unknown>;
  };
  foundry: { applications: { instances: Map<string, { close(): Promise<unknown> }> } };
}

interface FoundryCollection<T> {
  get(id: string): T | undefined;
  filter(predicate: (item: T) => boolean): T[];
}

interface CompendiumPack {
  getIndex(): Promise<{
    find(predicate: (item: { _id: string; name: string }) => boolean): { _id: string } | undefined;
  }>;
  getDocument(id: string): Promise<{ toObject(): Record<string, unknown> }>;
}

interface GameActor {
  id: string;
  uuid: string;
  name: string;
  sheet: { render(force: boolean): Promise<unknown> };
  update(data: Record<string, unknown>): Promise<unknown>;
  getFlag(scope: string, key: string): unknown;
}

interface GameUser {
  id: string;
  update(data: Record<string, unknown>): Promise<unknown>;
}
