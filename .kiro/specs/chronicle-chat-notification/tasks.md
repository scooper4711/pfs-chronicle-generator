# Implementation Plan: Chronicle Chat Notification

## Overview

Implement an automatic Foundry VTT chat message posted after chronicle generation completes. The feature is a single new module (`chat-notifier.ts`) with two pure functions and one async function, plus a one-line integration into `chronicle-generation.ts`. Pure functions are implemented and tested first, then the async function with mocks, then wired into the generation flow.

## Tasks

- [x] 1. Create chat-notifier module with pure functions
  - [x] 1.1 Create `scripts/handlers/chat-notifier.ts` with `extractSuccessfulCharacterNames`
    - Import `GenerationResult` from `../model/party-chronicle-types.js`
    - Implement `extractSuccessfulCharacterNames(results: GenerationResult[]): string[]`
    - Filter results where `success` is `true` and return their `characterName` values in order
    - Export the function
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 1.2 Write property test for `extractSuccessfulCharacterNames` (Property 1)
    - **Property 1: Successful name extraction preserves exactly the successful results**
    - Create `scripts/handlers/chat-notifier.pbt.test.ts`
    - Generate arrays of `GenerationResult` with arbitrary success/failure combinations
    - Assert returned names match exactly the `characterName` values where `success` is `true`, in input order
    - **Validates: Requirements 1.1, 1.3, 1.5**

  - [x] 1.3 Implement `buildChatMessageContent` in `chat-notifier.ts`
    - Implement `buildChatMessageContent(scenarioName: string, characterNames: string[]): string`
    - Return HTML string with scenario name in `<strong>`, character names in `<li>` elements, and download instructions in `<em>`
    - Follow the HTML template from the design document
    - Export the function
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 1.4 Write property test for `buildChatMessageContent` (Property 2)
    - **Property 2: Message content contains all required elements**
    - Add to `scripts/handlers/chat-notifier.pbt.test.ts`
    - For any non-empty scenario name and non-empty character names array, assert the HTML contains: scenario name inside `<strong>`, each character name inside `<li>`, download instructions inside `<em>`
    - **Validates: Requirements 1.2, 1.3, 1.4, 3.1, 3.2, 3.3**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement async `postChatNotification` and unit tests
  - [x] 3.1 Implement `postChatNotification` in `chat-notifier.ts`
    - Implement `async postChatNotification(results: GenerationResult[], scenarioName: string): Promise<void>`
    - Call `extractSuccessfulCharacterNames` to get successful names
    - If no successful names, return early without posting
    - Call `buildChatMessageContent` with scenario name and character names
    - Call `ChatMessage.create` with `content`, `speaker: { alias: 'PFS Chronicle Generator' }`, and `whisper: []`
    - Wrap `ChatMessage.create` in try/catch, log errors via `error()` from logger utility, do not re-throw
    - Export the function
    - _Requirements: 1.1, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_

  - [x] 3.2 Write property test for `postChatNotification` (Property 3)
    - **Property 3: Chat notification is posted if and only if successes exist**
    - Add to `scripts/handlers/chat-notifier.pbt.test.ts`
    - Mock `ChatMessage.create` globally
    - For any array of `GenerationResult`, assert `ChatMessage.create` is called exactly once when at least one success exists, and not called when all results have `success: false`
    - **Validates: Requirements 1.1, 1.5**

  - [x] 3.3 Write unit tests for `postChatNotification`
    - Create `scripts/handlers/chat-notifier.test.ts`
    - Test: empty results array does not call `ChatMessage.create`
    - Test: calls `ChatMessage.create` with `whisper: []` (Requirement 2.1)
    - Test: calls `ChatMessage.create` with `speaker.alias` set to `'PFS Chronicle Generator'` (Requirement 2.3)
    - Test: logs error via `console.error` when `ChatMessage.create` throws (Requirement 4.1)
    - Test: does not throw when `ChatMessage.create` throws (Requirement 4.2)
    - Test: does not call `ui.notifications` when `ChatMessage.create` throws (Requirement 4.3)
    - _Requirements: 1.5, 2.1, 2.3, 4.1, 4.2, 4.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate chat notification into chronicle generation
  - [x] 5.1 Wire `postChatNotification` into `generateChroniclesFromPartyData`
    - Import `postChatNotification` from `./chat-notifier.js` in `chronicle-generation.ts`
    - Add Step 5 after `displayGenerationResults(results)`: call `postChatNotification(results, data.shared.scenarioName)` wrapped in try/catch with `error()` logging
    - _Requirements: 1.1, 4.1, 4.2, 4.3_

  - [x] 5.2 Write unit test for the integration point
    - Add test to `scripts/handlers/chronicle-generation.test.ts`
    - Mock `postChatNotification` from `./chat-notifier`
    - Test: `generateChroniclesFromPartyData` calls `postChatNotification` with results and scenario name after successful generation
    - Test: `generateChroniclesFromPartyData` completes normally when `postChatNotification` throws
    - _Requirements: 1.1, 4.2_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add GM whisper pure functions
  - [x] 7.1 Add `game` type declaration and `getGmUserIds` to `chat-notifier.ts`
    - Add `declare const game: { users: Array<{ id: string; isGM: boolean }> }` alongside the existing `ChatMessage` declaration
    - Implement `getGmUserIds(): string[]` that filters `game.users` for `isGM === true` and returns their `id` values
    - Export the function
    - _Requirements: 5.1_

  - [x] 7.2 Implement `buildGmWhisperContent` in `chat-notifier.ts`
    - Implement `buildGmWhisperContent(): string`
    - Return HTML string with archive availability header in `<strong>` and Party sheet download instructions in `<em>`
    - Follow the GM Whisper HTML Template from the design document
    - Export the function
    - _Requirements: 5.2, 5.3, 5.5_

  - [x] 7.3 Write property test for `buildGmWhisperContent` (Property 4)
    - **Property 4: GM whisper content contains all required elements**
    - Add to `scripts/handlers/chat-notifier.pbt.test.ts`
    - Assert the HTML contains text about a zip archive being available, and instructions mentioning Party sheet, Society tab, and Download Archive of Party Chronicles
    - **Validates: Requirements 5.2, 5.3**

  - [x] 7.4 Write unit test for `getGmUserIds`
    - Add to `scripts/handlers/chat-notifier.test.ts`
    - Test: returns IDs of users where `isGM` is true
    - Test: returns empty array when no GM users exist
    - _Requirements: 5.1_

- [x] 8. Update `postChatNotification` to post GM whisper
  - [x] 8.1 Modify `postChatNotification` to post the GM whisper message
    - After the public `ChatMessage.create` call, add a second `ChatMessage.create` call with `content: buildGmWhisperContent()`, `speaker: { alias: 'PFS Chronicle Generator' }`, and `whisper: getGmUserIds()`
    - Wrap the whisper `ChatMessage.create` in its own try/catch with `error()` logging (independent of the public message error handling)
    - _Requirements: 5.1, 5.4, 5.6_

  - [x] 8.2 Update Property 3 test for two `ChatMessage.create` calls
    - Modify the existing Property 3 test in `chat-notifier.pbt.test.ts`
    - Assert `ChatMessage.create` is called exactly twice (public + whisper) when successes exist, and not called at all when all results fail
    - **Validates: Requirements 1.1, 1.5, 5.1**

  - [x] 8.3 Write unit tests for GM whisper behavior in `postChatNotification`
    - Add to `scripts/handlers/chat-notifier.test.ts`
    - Test: calls `ChatMessage.create` with GM user IDs in `whisper` array
    - Test: uses `speaker.alias` of `'PFS Chronicle Generator'` for whisper message
    - Test: logs error when whisper `ChatMessage.create` throws but public message succeeds
    - Test: does not throw when whisper `ChatMessage.create` throws
    - _Requirements: 5.1, 5.4, 5.6_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, so all tasks use TypeScript
