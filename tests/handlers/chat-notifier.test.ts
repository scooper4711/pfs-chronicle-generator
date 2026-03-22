/**
 * Unit tests for chat-notifier module
 *
 * Tests specific examples and edge cases for postChatNotification,
 * complementing property-based tests with targeted scenario coverage.
 *
 * Requirements: chronicle-chat-notification 1.5, 2.1, 2.3, 4.1, 4.2, 4.3
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { postChatNotification, getGmUserIds } from '../../scripts/handlers/chat-notifier';
import { GenerationResult } from '../../scripts/model/party-chronicle-types';

const mockCreate = jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined);

(global as any).ChatMessage = { create: mockCreate };

(global as any).ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
};

(global as any).game = {
  settings: { get: jest.fn() },
  users: [{ id: 'gm-1', isGM: true }],
};

function createResult(characterName: string, success: boolean): GenerationResult {
  return { characterId: `id-${characterName}`, characterName, success };
}

describe('postChatNotification', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockCreate.mockResolvedValue(undefined);
    const uiNotifications = (global as any).ui.notifications;
    uiNotifications.info.mockClear();
    uiNotifications.warn.mockClear();
    uiNotifications.error.mockClear();
  });

  it('does not call ChatMessage.create when results array is empty', async () => {
    await postChatNotification([], 'The Mosquito Witch');

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not call ChatMessage.create when all results are failures', async () => {
    const results = [
      createResult('Valeros', false),
      createResult('Seelah', false),
    ];

    await postChatNotification(results, 'The Mosquito Witch');

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('calls ChatMessage.create with whisper set to empty array for public message', async () => {
    const results = [createResult('Valeros', true)];

    await postChatNotification(results, 'The Mosquito Witch');

    expect(mockCreate).toHaveBeenCalledTimes(2);
    const firstCallArgs = (mockCreate.mock.calls[0] as any[])[0];
    expect(firstCallArgs).toEqual(
      expect.objectContaining({ whisper: [] })
    );
  });

  it('calls ChatMessage.create with speaker.alias set to PFS Chronicle Generator', async () => {
    const results = [createResult('Valeros', true)];

    await postChatNotification(results, 'The Mosquito Witch');

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        speaker: { alias: 'PFS Chronicle Generator' },
      })
    );
  });

  it('logs error via console.error when ChatMessage.create throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('Chat service unavailable'));
    const results = [createResult('Valeros', true)];

    await postChatNotification(results, 'The Mosquito Witch');

    expect(consoleErrorSpy).toHaveBeenCalled();
    const callArgs = consoleErrorSpy.mock.calls[0];
    expect(callArgs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Failed to post chat notification'),
      ])
    );

    consoleErrorSpy.mockRestore();
  });

  it('does not throw when ChatMessage.create throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('Chat service unavailable'));
    const results = [createResult('Valeros', true)];

    await expect(
      postChatNotification(results, 'The Mosquito Witch')
    ).resolves.toBeUndefined();

    jest.restoreAllMocks();
  });

  it('does not call ui.notifications when ChatMessage.create throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('Chat service unavailable'));
    const results = [createResult('Valeros', true)];

    await postChatNotification(results, 'The Mosquito Witch');

    const uiNotifications = (global as any).ui.notifications;
    expect(uiNotifications.info).not.toHaveBeenCalled();
    expect(uiNotifications.warn).not.toHaveBeenCalled();
    expect(uiNotifications.error).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('calls ChatMessage.create with GM user IDs in whisper array', async () => {
    const results = [createResult('Valeros', true)];

    await postChatNotification(results, 'The Mosquito Witch');

    expect(mockCreate).toHaveBeenCalledTimes(2);
    const whisperCallArgs = (mockCreate.mock.calls[1] as any[])[0];
    expect(whisperCallArgs).toEqual(
      expect.objectContaining({ whisper: ['gm-1'] })
    );
  });

  it('uses speaker.alias of PFS Chronicle Generator for whisper message', async () => {
    const results = [createResult('Valeros', true)];

    await postChatNotification(results, 'The Mosquito Witch');

    expect(mockCreate).toHaveBeenCalledTimes(2);
    const whisperCallArgs = (mockCreate.mock.calls[1] as any[])[0];
    expect(whisperCallArgs).toEqual(
      expect.objectContaining({
        speaker: { alias: 'PFS Chronicle Generator' },
      })
    );
  });

  it('logs error when whisper ChatMessage.create throws but public message succeeds', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Whisper failed'));
    const results = [createResult('Valeros', true)];

    await postChatNotification(results, 'The Mosquito Witch');

    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorCalls = consoleErrorSpy.mock.calls;
    const whisperErrorCall = errorCalls.find(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('whisper'))
    );
    expect(whisperErrorCall).toBeDefined();

    consoleErrorSpy.mockRestore();
  });

  it('does not throw when whisper ChatMessage.create throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Whisper failed'));
    const results = [createResult('Valeros', true)];

    await expect(
      postChatNotification(results, 'The Mosquito Witch')
    ).resolves.toBeUndefined();

    jest.restoreAllMocks();
  });
});

describe('getGmUserIds', () => {
  it('returns IDs of users where isGM is true', () => {
    (global as any).game.users = [
      { id: 'user-1', isGM: true },
      { id: 'user-2', isGM: false },
      { id: 'user-3', isGM: true },
      { id: 'user-4', isGM: false },
    ];

    const result = getGmUserIds();

    expect(result).toEqual(['user-1', 'user-3']);
  });

  it('returns empty array when no GM users exist', () => {
    (global as any).game.users = [
      { id: 'user-1', isGM: false },
      { id: 'user-2', isGM: false },
    ];

    const result = getGmUserIds();

    expect(result).toEqual([]);
  });
});
