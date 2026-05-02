/**
 * GM Character Handler Functions
 *
 * This module provides handler functions for the GM Character drop zone,
 * clear button, and PFS ID validation on the party chronicle form.
 *
 * Requirements: gm-character-party-sheet 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3
 */

import type { PartyActor, PartySheetApp } from './event-listener-helpers.js';
import type { UniqueFields } from '../model/party-chronicle-types.js';
import { loadPartyChronicleData, savePartyChronicleData } from '../model/party-chronicle-storage.js';
import { debug } from '../utils/logger.js';

/**
 * Handles drop events on the GM Character Drop Zone.
 *
 * Parses the Foundry drag-and-drop JSON payload, resolves the actor via
 * `fromUuid()`, validates that the actor is a character and not already a
 * party member, then persists the assignment and re-renders the form.
 *
 * @param event - The native DragEvent from the drop zone
 * @param container - Form container element
 * @param partyActors - Array of current party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 *
 * Requirements: gm-character-party-sheet 1.3, 1.4, 1.5, 3.3
 */
export async function handleGmCharacterDrop(
  event: DragEvent,
  container: HTMLElement,
  partyActors: PartyActor[],
  partySheet: PartySheetApp
): Promise<void> {
  event.preventDefault();

  const rawData = event.dataTransfer?.getData('text/plain');
  if (!rawData) {
    return;
  }

  let dropData: { type?: string; uuid?: string };
  try {
    dropData = JSON.parse(rawData);
  } catch {
    debug('GM character drop: unparseable dataTransfer payload');
    return;
  }

  if (dropData.type !== 'Actor' || !dropData.uuid) {
    debug('GM character drop: not an Actor drop payload');
    return;
  }

  const actor = await (fromUuid as (uuid: string) => Promise<PartyActor | null>)(dropData.uuid);
  if (!actor) {
    ui.notifications?.warn('Could not resolve the dropped actor.');
    return;
  }

  if (actor.type !== 'character') {
    ui.notifications?.warn('Only character actors can be assigned as the GM character.');
    return;
  }

  const isPartyMember = partyActors.some((member) => member.id === actor.id);
  if (isPartyMember) {
    ui.notifications?.warn('This actor is already a party member. Drop a character that is not in the party.');
    return;
  }

  await saveGmCharacterAssignment(actor, container, partyActors, partySheet);
}

/**
 * Persists the GM character assignment to storage and re-renders the form.
 *
 * Loads existing saved data, sets `gmCharacterActorId` in shared fields,
 * creates a default `UniqueFields` entry for the GM character in the
 * characters map, saves, and triggers a form re-render.
 *
 * @param actor - The resolved character actor to assign as GM character
 * @param container - Form container element
 * @param partyActors - Array of current party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 */
async function saveGmCharacterAssignment(
  actor: PartyActor,
  container: HTMLElement,
  partyActors: PartyActor[],
  partySheet: PartySheetApp
): Promise<void> {
  const storage = await loadPartyChronicleData();
  const savedData = storage?.data ?? {
    shared: { gmPfsNumber: '', scenarioName: '', eventCode: '', eventDate: '', xpEarned: 0, treasureBundles: 0, downtimeDays: 0, layoutId: '', seasonId: '', blankChroniclePath: '', adventureSummaryCheckboxes: [], strikeoutItems: [], chosenFactionReputation: 2, reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }, reportingA: false, reportingB: false, reportingC: false, reportingD: false },
    characters: {}
  };

  savedData.shared.gmCharacterActorId = actor.id;

  const characterLevel = actor.system?.details?.level?.value ?? 1;
  const defaultTaskLevel = Math.max(0, characterLevel - 2);

  savedData.characters[actor.id] = buildDefaultUniqueFields(actor.name, characterLevel, defaultTaskLevel);

  await savePartyChronicleData(savedData);

  debug('GM character assigned:', actor.name, actor.id);

  const { renderPartyChronicleForm } = await import('../main.js');
  await renderPartyChronicleForm(container, partyActors, partySheet);
}

/**
 * Builds a default UniqueFields object for a newly assigned GM character.
 *
 * @param characterName - The actor's display name
 * @param characterLevel - The actor's level
 * @param defaultTaskLevel - The default task level (level - 2, min 0)
 * @returns A UniqueFields object with sensible defaults
 */
function buildDefaultUniqueFields(
  characterName: string,
  characterLevel: number,
  defaultTaskLevel: number
): UniqueFields {
  return {
    characterName,
    playerNumber: '',
    characterNumber: '',
    level: characterLevel,
    taskLevel: defaultTaskLevel,
    successLevel: 'success',
    proficiencyRank: 'trained',
    earnedIncome: 0,
    currencySpent: 0,
    notes: 'GM Credit',
    consumeReplay: false,
    overrideXp: false,
    overrideXpValue: 0,
    overrideCurrency: false,
    overrideCurrencyValue: 0,
    slowTrack: false
  };
}

/**
 * Handles the clear button click on the GM character section.
 *
 * Removes `gmCharacterActorId` from shared data, removes the GM character's
 * entry from the characters map, saves to storage, and re-renders the form.
 *
 * @param container - Form container element
 * @param partyActors - Array of current party member actors
 * @param partySheet - Party sheet app instance for re-rendering
 *
 * Requirements: gm-character-party-sheet 3.1, 3.2, 3.4
 */
export async function handleGmCharacterClear(
  container: HTMLElement,
  partyActors: PartyActor[],
  partySheet: PartySheetApp
): Promise<void> {
  const storage = await loadPartyChronicleData();
  if (!storage?.data) {
    return;
  }

  const savedData = storage.data;
  const gmActorId = savedData.shared.gmCharacterActorId;

  delete savedData.shared.gmCharacterActorId;

  if (gmActorId && savedData.characters[gmActorId]) {
    delete savedData.characters[gmActorId];
  }

  await savePartyChronicleData(savedData);

  debug('GM character cleared');

  const { renderPartyChronicleForm } = await import('../main.js');
  await renderPartyChronicleForm(container, partyActors, partySheet);
}

/**
 * Validates that the GM character's PFS ID matches the GM PFS Number.
 *
 * Compares the actor's `system.pfs.playerNumber` (a number) against the
 * `gmPfsNumber` string from shared fields. Both are compared as strings.
 *
 * @param gmCharacterActor - The GM character actor to validate
 * @param gmPfsNumber - The GM PFS Number from shared fields
 * @returns A descriptive error string if there is a mismatch, or null if they match
 *
 * Requirements: gm-character-party-sheet 7.1, 7.2, 7.3
 */
export function validateGmCharacterPfsId(
  gmCharacterActor: PartyActor,
  gmPfsNumber: string
): string | null {
  const actorPfsId = String(gmCharacterActor.system?.pfs?.playerNumber ?? '');

  if (actorPfsId === gmPfsNumber) {
    return null;
  }

  return `GM character PFS ID (${actorPfsId}) does not match GM PFS Number (${gmPfsNumber})`;
}
