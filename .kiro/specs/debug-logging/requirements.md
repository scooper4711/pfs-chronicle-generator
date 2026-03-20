# Requirements Document

## Introduction

The PFS Chronicle Generator module currently uses `console.log`, `console.warn`, and `console.error` calls scattered throughout the codebase for debugging purposes. These messages are always visible in the browser console, which clutters the output for end users and provides no way to toggle debug output on or off.

This feature introduces a centralized debug logging utility controlled by a FoundryVTT module setting. When debug mode is disabled (the default), only warnings and errors are emitted. When debug mode is enabled, all debug trace messages become visible. All existing `console.log` calls used for debug tracing are replaced with the new utility; `console.warn` and `console.error` calls used for genuine warnings and errors are routed through the utility as well for consistent formatting.

## Glossary

- **Logger**: A centralized logging utility module (exported as `PfsChronicleLogger` when exposed globally) that provides `debug`, `warn`, and `error` functions. It reads the debug mode setting to decide whether debug-level messages are emitted to the browser console.
- **Module_Settings**: The FoundryVTT `game.settings` API used to register and retrieve world-scoped configuration values for the module.
- **Debug_Mode_Setting**: A boolean world-scoped FoundryVTT setting (registered via `game.settings.register`) that controls whether debug-level log messages are emitted.
- **MODULE_ID**: The string constant `'pfs-chronicle-generator'` used as the module identifier for FoundryVTT APIs.
- **Log_Prefix**: The string `'[PFS Chronicle]'` prepended to all log messages for consistent identification in the browser console.

## Requirements

### Requirement 1: Logger Module

**User Story:** As a developer, I want a single logging utility module, so that all log output flows through one place and can be controlled centrally.

#### Acceptance Criteria

1. THE Logger SHALL export a `debug` function that accepts a message string and optional additional arguments
2. THE Logger SHALL export a `warn` function that accepts a message string and optional additional arguments
3. THE Logger SHALL export an `error` function that accepts a message string and optional additional arguments
4. THE Logger SHALL prepend the Log_Prefix to all messages emitted by the `debug`, `warn`, and `error` functions
5. WHEN the `warn` function is called, THE Logger SHALL emit the message via `console.warn` regardless of the Debug_Mode_Setting value
6. WHEN the `error` function is called, THE Logger SHALL emit the message via `console.error` regardless of the Debug_Mode_Setting value
7. IF the Logger is exposed as a globally scoped variable, THEN THE Logger SHALL use the namespaced identifier `PfsChronicleLogger` to avoid collisions with other modules or libraries

### Requirement 2: Debug Mode Setting Registration

**User Story:** As a GM, I want a module setting to enable or disable debug logging, so that I can turn on verbose output only when troubleshooting.

#### Acceptance Criteria

1. WHEN the module initializes, THE Module_Settings SHALL register a boolean setting with key `'debugMode'` under MODULE_ID
2. THE Debug_Mode_Setting SHALL have scope `'world'` so that it applies to all users in the world
3. THE Debug_Mode_Setting SHALL have `config: true` so that it appears in the module settings UI
4. THE Debug_Mode_Setting SHALL default to `false`
5. THE Debug_Mode_Setting SHALL have a descriptive name and hint visible in the FoundryVTT settings panel

### Requirement 3: Debug Message Gating

**User Story:** As a GM, I want debug messages to appear only when I enable debug mode, so that the console stays clean during normal use.

#### Acceptance Criteria

1. WHILE the Debug_Mode_Setting is `false`, THE Logger `debug` function SHALL suppress the message and produce no console output
2. WHILE the Debug_Mode_Setting is `true`, THE Logger `debug` function SHALL emit the message via `console.log`
3. WHEN the Debug_Mode_Setting value changes, THE Logger SHALL use the updated value for subsequent calls without requiring a page reload

### Requirement 4: Replace Existing Console Calls

**User Story:** As a developer, I want all existing `console.log`, `console.warn`, and `console.error` calls replaced with Logger calls, so that logging behavior is consistent and controllable.

#### Acceptance Criteria

1. THE codebase SHALL contain zero direct `console.log` calls in production source files (excluding test files)
2. THE codebase SHALL contain zero direct `console.warn` calls in production source files (excluding test files)
3. THE codebase SHALL contain zero direct `console.error` calls in production source files (excluding test files)
4. WHEN a former `console.log` call was used for debug tracing, THE replacement SHALL use the Logger `debug` function
5. WHEN a former `console.warn` call was used for a non-critical warning, THE replacement SHALL use the Logger `warn` function
6. WHEN a former `console.error` call was used for an error condition, THE replacement SHALL use the Logger `error` function
7. THE replacement calls SHALL preserve the original message content and any additional arguments

### Requirement 5: No Behavioral Regression

**User Story:** As a GM, I want the module to behave identically after the logging refactor, so that no existing functionality is broken.

#### Acceptance Criteria

1. WHILE the Debug_Mode_Setting is `true`, THE module SHALL produce the same console output as the current implementation (same messages, same severity levels)
2. THE Logger module SHALL be importable by all existing source files that currently use `console` calls
3. IF an error occurs during Logger initialization, THEN THE Logger SHALL fall back to direct `console` calls to avoid silent failures
