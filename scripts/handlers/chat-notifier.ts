/**
 * Chat Notifier
 *
 * Posts a Foundry VTT chat message after chronicle generation completes,
 * notifying players that their chronicles are ready for download.
 * The message lists the scenario name, successful character names,
 * and download instructions.
 */

import { GenerationResult } from '../model/party-chronicle-types.js';
import { error } from '../utils/logger.js';

declare const ChatMessage: {
  create(data: {
    content: string;
    speaker: { alias: string };
    whisper: string[];
  }): Promise<unknown>;
};

declare const game: {
  users: Array<{ id: string; isGM: boolean }>;
};

/**
 * Extracts character names from successful generation results.
 * Returns names in the same order they appear in the input array.
 *
 * @param results - Array of GenerationResult from processAllPartyMembers
 * @returns Array of character names where generation succeeded
 */
export function extractSuccessfulCharacterNames(
  results: GenerationResult[]
): string[] {
  return results
    .filter(result => result.success)
    .map(result => result.characterName);
}

/**
 * Returns the user IDs of all GM users from the Foundry game.users global.
 *
 * @returns Array of user ID strings for GM users
 */
export function getGmUserIds(): string[] {
  return game.users
    .filter(user => user.isGM)
    .map(user => user.id);
}

/**
 * Builds the HTML content for the GM whisper message.
 *
 * The message informs the GM that a zip archive of all generated
 * chronicle sheets is available for download from the Party sheet's
 * Society tab.
 *
 * @returns HTML string for the whispered ChatMessage content
 */
export function buildGmWhisperContent(): string {
  return (
    '<div>' +
      '<p><strong>Chronicle archive available</strong></p>' +
      '<p><em>A zip archive of all generated chronicle sheets is ready for download. ' +
      'Open the Party sheet → Society tab → Download Archive of Party Chronicles button.</em></p>' +
    '</div>'
  );
}


/**
 * Builds the HTML content for the chat notification message.
 *
 * The message includes:
 * - A header with the scenario name
 * - A list of character names that received chronicles
 * - Download instructions for players
 *
 * @param scenarioName - The scenario name from shared form fields
 * @param characterNames - Array of successfully generated character names
 * @returns HTML string for the ChatMessage content
 */
export function buildChatMessageContent(
  scenarioName: string,
  characterNames: string[]
): string {
  const characterListItems = characterNames
    .map(name => `<li>${name}</li>`)
    .join('');

  return (
    '<div>' +
      `<p><strong>Chronicles generated for: ${scenarioName}</strong></p>` +
      '<p>The following characters have chronicles ready:</p>' +
      `<ul>${characterListItems}</ul>` +
      '<p><em>To download: Open your character sheet → Society tab → Download Chronicle button</em></p>' +
    '</div>'
  );
}

/**
 * Posts a chat notification after successful chronicle generation.
 *
 * Posts two messages:
 * 1. A public message visible to all users with scenario name,
 *    character names, and download instructions.
 * 2. A whispered message visible only to GMs about the archive download.
 *
 * Skips posting if there are zero successful results.
 * Each message has independent error handling — a failure in one
 * does not prevent the other from being attempted.
 *
 * @param results - Array of GenerationResult from processAllPartyMembers
 * @param scenarioName - The scenario name from shared form fields
 */
export async function postChatNotification(
  results: GenerationResult[],
  scenarioName: string
): Promise<void> {
  const characterNames = extractSuccessfulCharacterNames(results);

  if (characterNames.length === 0) {
    return;
  }

  const content = buildChatMessageContent(scenarioName, characterNames);

  try {
    await ChatMessage.create({
      content,
      speaker: { alias: 'PFS Chronicle Generator' },
      whisper: [],
    });
  } catch (err) {
    error('Failed to post chat notification', err);
  }

  try {
    await ChatMessage.create({
      content: buildGmWhisperContent(),
      speaker: { alias: 'PFS Chronicle Generator' },
      whisper: getGmUserIds(),
    });
  } catch (err) {
    error('Failed to post GM whisper notification', err);
  }
}

