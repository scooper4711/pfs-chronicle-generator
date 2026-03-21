# Requirements Document

## Introduction

After the GM generates chronicles, there is no in-game notification to players. Players may not realize their chronicles are ready, or may not know where to find them in the Foundry UI. The GM must manually tell each player to open their actor sheet, navigate to the Society tab, and press the Download Chronicle button.

This feature adds an automatic chat message posted to the Foundry chat log when chronicle generation completes. The message notifies all players that chronicles are available and includes instructions on how to download them. This provides immediate visibility without manual GM communication and creates a persistent record in the chat log.

## Glossary

- **Chat_Notifier**: The module responsible for constructing and posting a Foundry ChatMessage to the chat log after chronicle generation completes.
- **Chronicle_Generation**: The existing process in `chronicle-generation.ts` that validates fields, loads layouts, generates filled PDFs for each party member, and displays result notifications via `ui.notifications`.
- **Party_Actor_Member**: A FoundryVTT actor that is a member of the current party and has had a Chronicle_PDF generated for them.
- **Chat_Message**: A Foundry VTT `ChatMessage` document posted to the chat sidebar, visible to all connected users and persisted in the chat log.
- **Generation_Results**: The array of `GenerationResult` objects returned by `processAllPartyMembers`, containing the character name and success/failure status for each party member.
- **Whispered_Chat_Message**: A Foundry VTT `ChatMessage` with a `whisper` array containing GM user IDs, making the message visible only to GM users in the chat sidebar.
- **Chronicle_Archive**: A zip file containing all generated Chronicle_PDFs, created by the chronicle-exporter module and stored on the Party actor for download via the Society tab.

## Requirements

### Requirement 1: Post Chat Message on Successful Generation

**User Story:** As a GM, I want a chat message to be automatically posted when chronicles are generated, so that players are immediately notified without me having to tell them manually.

#### Acceptance Criteria

1. WHEN chronicle generation completes with at least one successful Chronicle_PDF, THE Chat_Notifier SHALL post a single Chat_Message to the Foundry chat log
2. THE Chat_Message SHALL include the scenario name from the shared form fields
3. THE Chat_Message SHALL list the character names of all Party_Actor_Members whose chronicles were successfully generated
4. THE Chat_Message SHALL include instructions telling players to open their character sheet, navigate to the Society tab, and click the Download Chronicle button
5. IF all chronicle generations fail (zero successes), THEN THE Chat_Notifier SHALL not post a Chat_Message

### Requirement 2: Chat Message Visibility

**User Story:** As a player, I want to see the chronicle notification in chat regardless of when I connect, so that I can find my chronicle even if I was not online when the GM generated it.

#### Acceptance Criteria

1. THE Chat_Message SHALL be visible to all users (GM and players)
2. THE Chat_Message SHALL persist in the Foundry chat log so that players who connect later can see the notification
3. THE Chat_Message SHALL identify the speaker as the pfs-chronicle-generator module (not as the GM's user identity)

### Requirement 3: Chat Message Formatting

**User Story:** As a player, I want the chat notification to be clear and easy to read, so that I can quickly understand what happened and what to do next.

#### Acceptance Criteria

1. THE Chat_Message content SHALL use HTML formatting for readability
2. THE Chat_Message SHALL visually distinguish the scenario name from the download instructions
3. THE Chat_Message SHALL present the list of character names as a readable list
4. THE Chat_Message content SHALL remain readable when the chat sidebar is at its default width

### Requirement 4: Error Resilience

**User Story:** As a GM, I want chronicle generation to succeed even if the chat notification fails, so that a chat posting error does not prevent players from getting their chronicles.

#### Acceptance Criteria

1. IF posting the Chat_Message fails, THEN THE Chat_Notifier SHALL log the error to the browser console
2. IF posting the Chat_Message fails, THEN THE Chat_Notifier SHALL not prevent the chronicle generation process from completing successfully
3. IF posting the Chat_Message fails, THEN THE Chat_Notifier SHALL not display an error notification to the GM (the generation itself succeeded)

### Requirement 5: Whisper Archive Download Availability to GM

**User Story:** As a GM, I want to receive a private whisper after chronicles are generated, so that I know I can download a zip archive of all chronicle sheets without players seeing this GM-only information.

#### Acceptance Criteria

1. WHEN chronicle generation completes with at least one successful Chronicle_PDF, THE Chat_Notifier SHALL post a whispered Chat_Message visible only to GM users
2. THE whispered Chat_Message SHALL inform the GM that a zip archive of all generated chronicle sheets is available for download
3. THE whispered Chat_Message SHALL instruct the GM to open the Party sheet, navigate to the Society tab, and click the Download Archive of Party Chronicles button
4. THE whispered Chat_Message SHALL identify the speaker as the pfs-chronicle-generator module (not as the GM's user identity)
5. THE whispered Chat_Message SHALL use HTML formatting consistent with the public Chat_Message style
6. IF posting the whispered Chat_Message fails, THEN THE Chat_Notifier SHALL log the error to the browser console without preventing chronicle generation from completing
