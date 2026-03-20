# Implementation Plan: Debug Logging

## Overview

Introduce a centralized Logger utility module (`scripts/utils/logger.ts`) gated by a FoundryVTT `debugMode` setting, then replace all direct `console.log/warn/error` calls across 6 production files with Logger calls. Property-based tests verify the five correctness properties from the design; unit tests cover edge cases and setting registration.

## Tasks

- [x] 1. Create the Logger module and register the debug mode setting
  - [x] 1.1 Create `scripts/utils/logger.ts` with `debug`, `warn`, and `error` functions
    - Implement `isDebugEnabled()` reading `game.settings.get('pfs-chronicle-generator', 'debugMode')`
    - Implement `debug()` with setting gating and fallback on settings error
    - Implement `warn()` emitting unconditionally via `console.warn`
    - Implement `error()` emitting unconditionally via `console.error`
    - All functions prepend `[PFS Chronicle]` prefix
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 5.3_

  - [x] 1.2 Register the `debugMode` setting in `registerSettings()` in `main.ts`
    - Add `game.settings.register(MODULE_ID, 'debugMode', {...})` with scope `'world'`, `config: true`, `default: false`, `type: Boolean`
    - Include descriptive `name` and `hint` strings
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 1.3 Write property tests for the Logger (`scripts/utils/logger.pbt.test.ts`)
    - **Property 1: Log prefix is prepended to all output**
    - **Validates: Requirement 1.4**

  - [ ]* 1.4 Write property test for debug gating
    - **Property 2: Debug output is gated by the debugMode setting**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 1.5 Write property test for warn/error unconditional emission
    - **Property 3: Warn and error always emit regardless of debugMode**
    - **Validates: Requirements 1.5, 1.6**

  - [ ]* 1.6 Write property test for immediate setting changes
    - **Property 4: Setting changes take effect immediately**
    - **Validates: Requirement 3.3**

  - [ ]* 1.7 Write property test for argument forwarding
    - **Property 5: Additional arguments are forwarded to the console method**
    - **Validates: Requirement 4.7**

  - [x] 1.8 Write unit tests for the Logger (`scripts/utils/logger.test.ts`)
    - Test that `debug`, `warn`, `error` are exported functions
    - Test fallback behavior when `game.settings.get` throws
    - Test empty message string with debugMode true
    - _Requirements: 1.1, 1.2, 1.3, 5.3_

- [x] 2. Checkpoint - Verify Logger module and tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Replace console calls in `main.ts`
  - [x] 3.1 Replace 3× `console.log` → `debug` and 1× `console.error` → `error` in `main.ts`
    - Add `import { debug, error } from './utils/logger.js'`
    - Remove redundant `[PFS Chronicle]` prefix from message strings
    - _Requirements: 4.1, 4.3, 4.4, 4.6, 4.7_

- [x] 4. Replace console calls in `LayoutStore.ts`
  - [x] 4.1 Replace 3× `console.log` → `debug`, 2× `console.warn` → `warn`, 2× `console.error` → `error` in `LayoutStore.ts`
    - Add `import { debug, warn, error } from './utils/logger.js'`
    - Remove redundant `[PFS Chronicle]` prefix from message strings
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5. Replace console calls in `LayoutDesignerApp.ts`
  - [x] 5.1 Replace 1× `console.log` → `debug` in `LayoutDesignerApp.ts`
    - Add `import { debug } from './utils/logger.js'`
    - Remove redundant `[PFS Chronicle]` prefix from message strings
    - _Requirements: 4.1, 4.4, 4.7_

- [x] 6. Replace console calls in handler files
  - [x] 6.1 Replace 1× `console.log` → `debug` and 1× `console.error` → `error` in `handlers/chronicle-generation.ts`
    - Add `import { debug, error } from '../utils/logger.js'`
    - Remove redundant `[PFS Chronicle]` prefix from message strings
    - _Requirements: 4.1, 4.3, 4.4, 4.6, 4.7_

  - [x] 6.2 Replace 4× `console.log` → `debug` in `handlers/event-listener-helpers.ts`
    - Add `import { debug } from '../utils/logger.js'`
    - Remove redundant `[PFS Chronicle]` prefix from message strings
    - _Requirements: 4.1, 4.4, 4.7_

  - [x] 6.3 Replace 13× `console.warn` → `warn` in `handlers/collapsible-section-handlers.ts`
    - Add `import { warn } from '../utils/logger.js'`
    - Remove redundant `[PFS Chronicle]` prefix from message strings
    - _Requirements: 4.2, 4.5, 4.7_

- [x] 7. Checkpoint - Verify all replacements and no direct console calls remain
  - Ensure all tests pass, ask the user if questions arise.
  - Verify zero `console.log`, `console.warn`, `console.error` calls in production files (excluding `logger.ts` and test files)
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate the five correctness properties from the design document
- The Logger module uses TypeScript and lives in `scripts/utils/logger.ts` alongside existing utilities
- Checkpoints ensure incremental validation after the Logger is built and after all replacements are done
