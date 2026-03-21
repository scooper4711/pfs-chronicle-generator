/**
 * Property-based tests for chat-notifier module
 *
 * These tests verify universal correctness properties for the chat notification
 * functions, complementing unit tests with randomized input generation.
 *
 * Requirements: chronicle-chat-notification 1.1, 1.3, 1.5, 2.1
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import {
  extractSuccessfulCharacterNames,
  buildChatMessageContent,
  buildGmWhisperContent,
  postChatNotification,
} from './chat-notifier';
import { GenerationResult } from '../model/party-chronicle-types';

const generationResultArbitrary = fc.record({
  characterId: fc.string({ minLength: 1 }),
  characterName: fc.string({ minLength: 1, maxLength: 50 }),
  success: fc.boolean(),
});

const resultsArrayArbitrary = fc.array(generationResultArbitrary, {
  minLength: 1,
  maxLength: 10,
});

// Feature: chronicle-chat-notification, Property 1: Successful name extraction preserves exactly the successful results
describe('Property 1: Successful name extraction preserves exactly the successful results', () => {
  /** **Validates: Requirements 1.1, 1.3, 1.5** */
  it('should return exactly the characterName values where success is true, in input order', () => {
    fc.assert(
      fc.property(
        resultsArrayArbitrary,
        (results: GenerationResult[]) => {
          const actual = extractSuccessfulCharacterNames(results);
          const expected = results
            .filter(r => r.success)
            .map(r => r.characterName);

          expect(actual).toEqual(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

const safeScenarioNameArbitrary = fc.stringMatching(/^[A-Za-z0-9 ]{1,100}$/);

const safeCharacterNameArbitrary = fc.stringMatching(/^[A-Za-z0-9 ]{1,50}$/);

const safeCharacterNamesArbitrary = fc.array(safeCharacterNameArbitrary, {
  minLength: 1,
  maxLength: 10,
});

// Feature: chronicle-chat-notification, Property 2: Message content contains all required elements
describe('Property 2: Message content contains all required elements', () => {
  /** **Validates: Requirements 1.2, 1.3, 1.4, 3.1, 3.2, 3.3** */
  it('should contain scenario name in <strong>, each character name in <li>, and download instructions in <em>', () => {
    fc.assert(
      fc.property(
        safeScenarioNameArbitrary,
        safeCharacterNamesArbitrary,
        (scenarioName: string, characterNames: string[]) => {
          const html = buildChatMessageContent(scenarioName, characterNames);

          expect(html).toContain(`<strong>Chronicles generated for: ${scenarioName}</strong>`);

          for (const name of characterNames) {
            expect(html).toContain(`<li>${name}</li>`);
          }

          expect(html).toMatch(/<em>.*character sheet.*Society tab.*Download Chronicle.*<\/em>/);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Global mocks for postChatNotification tests
// ChatMessage is a Foundry VTT global accessed via `declare const ChatMessage`
const mockCreate = jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined);
(global as any).ChatMessage = { create: mockCreate };

// Logger module reads game.settings; provide a minimal stub to prevent throws
(global as any).game = { settings: { get: jest.fn() }, users: [{ id: 'gm-1', isGM: true }] };

// Feature: chronicle-chat-notification, Property 3: Chat notification is posted if and only if successes exist
describe('Property 3: Chat notification is posted if and only if successes exist', () => {
  /** **Validates: Requirements 1.1, 1.5, 5.1** */

  beforeEach(() => {
    mockCreate.mockClear();
  });

  it('should call ChatMessage.create exactly twice when successes exist, and not at all otherwise', async () => {
    await fc.assert(
      fc.asyncProperty(
        resultsArrayArbitrary,
        async (results: GenerationResult[]) => {
          mockCreate.mockClear();
          await postChatNotification(results, 'Test Scenario');

          const hasSuccesses = results.some(r => r.success);
          if (hasSuccesses) {
            expect(mockCreate).toHaveBeenCalledTimes(2);
          } else {
            expect(mockCreate).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: chronicle-chat-notification, Property 4: GM whisper content contains all required elements
describe('Property 4: GM whisper content contains all required elements', () => {
  /** **Validates: Requirements 5.2, 5.3** */
  it('should contain zip archive text and Party sheet download instructions', () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        () => {
          const html = buildGmWhisperContent();

          expect(html).toContain('zip archive');
          expect(html).toContain('Party sheet');
          expect(html).toContain('Society tab');
          expect(html).toContain('Download Archive of Party Chronicles');
          expect(html).toContain('<strong>');
          expect(html).toContain('<em>');
        }
      ),
      { numRuns: 100 }
    );
  });
});

