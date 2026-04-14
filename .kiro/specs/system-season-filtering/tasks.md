# Implementation Plan: System Season Filtering

## Overview

Make the LayoutStore system-aware by tagging each season and layout entry with its `gameSystemRoot` during discovery, using composite season keys (`pfs2/season1`) to prevent collisions, fixing the `GAME_SYSTEM_ROOTS` constant, adding a `gameSystemRoot` filter parameter to `getSeasons()`, and providing a `getGameSystemRoot()` mapping utility. Callers are updated to pass the active game system root so that only relevant seasons and layouts appear.

## Tasks

- [x] 1. Fix GAME_SYSTEM_ROOTS and add gameSystemRoot tagging to LayoutStore
  - [x] 1.1 Fix `GAME_SYSTEM_ROOTS` constant: change `'sfs'` to `'sfs2'` in `scripts/LayoutStore.ts`
    - The Set should contain exactly `{'pfs2', 'sfs2'}`
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Update `detectSeason` to return composite season keys and gameSystemRoot
    - Change the return to include `gameSystemRoot: parentDir` and use `${parentDir}/${dirName}` as the composite season key
    - The composite key is stored as the key in `seasonDirectories` and as the `season` field in `layoutInfo`
    - Update `findAllLayouts` to pass `gameSystemRoot` through to `registerLayoutFile` and store it in `seasonDirectories` as `{ name, gameSystemRoot }`
    - Update `getDisplayNameForDirectory` call to extract the directory name portion from the composite key
    - _Requirements: 1.3, 2.1, 2.2, 2.3_

  - [x] 1.3 Add required `gameSystemRoot` parameter to `getSeasons()`
    - Change signature to `getSeasons(gameSystemRoot: string): Array<{ id: string, name: string }>`
    - Filter entries whose stored `gameSystemRoot` matches the provided value
    - The parameter is required — all callers must pass it explicitly
    - Sorting logic: extract the directory name portion from the composite key for numeric detection; numbered seasons first (ascending), then non-numbered alphabetically
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 1.4 Update `getLayoutsByParent()` to work with composite season keys
    - No signature change needed — it already does exact match on the `season` field
    - Since the `season` field now stores composite keys (e.g., `pfs2/season1`), callers pass composite keys from the dropdown value
    - _Requirements: 2.4, 4.1, 4.2, 4.3_

  - [x] 1.5 Write unit tests for LayoutStore changes (`tests/LayoutStore-system-filtering.test.ts`)
    - Test `GAME_SYSTEM_ROOTS` contains exactly `{'pfs2', 'sfs2'}`
    - Test `detectSeason` returns composite keys and gameSystemRoot (e.g., `pfs2/season1`)
    - Test `getSeasons('pfs2')` with mixed pfs2/sfs2 seasons returns only pfs2 seasons
    - Test `getSeasons('sfs2')` returns only sfs2 seasons
    - Test `getSeasons()` without parameter returns all seasons
    - Test `getLayoutsByParent('pfs2/season1')` returns only layouts from that composite season
    - Test same-named seasons under different roots are stored as distinct entries
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 2.4, 3.2, 4.1_

  - [x] 1.6 Write property tests for LayoutStore changes (`tests/LayoutStore-system-filtering.pbt.test.ts`)
    - **Property 1: Season detection tags with correct game system root**
    - **Property 2: Same-named seasons under different roots are distinct**
    - **Property 3: Layout entries are tagged with correct game system root**
    - **Property 4: getLayoutsByParent returns correct, filtered, sorted results**
    - **Property 5: getSeasons returns filtered, correctly sorted results**
    - **Validates: Requirements 1.3, 2.1, 2.2, 2.3, 2.4, 3.2, 3.5, 4.1, 4.2, 4.3**

- [x] 2. Implement getGameSystemRoot mapping utility
  - [x] 2.1 Add `getGameSystemRoot` function to `scripts/utils/game-system-detector.ts`
    - Export a function that maps `'pf2e'` → `'pfs2'` and `'sf2e'` → `'sfs2'`
    - Accept an optional `GameSystem` parameter; default to calling `getGameSystem()` when omitted
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 2.2 Write unit tests for `getGameSystemRoot`
    - Test `getGameSystemRoot('pf2e')` returns `'pfs2'`
    - Test `getGameSystemRoot('sf2e')` returns `'sfs2'`
    - Test `getGameSystemRoot()` without argument uses `getGameSystem()` result
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 3. Checkpoint
  - Ensure all tests pass (`npx jest --no-cache`), ask the user if questions arise.

- [x] 4. Update callers to pass game system root
  - [x] 4.1 Update `main.ts` ready hook
    - Import `getGameSystemRoot` from `./utils/game-system-detector.js`
    - Change `layoutStore.getSeasons()` to `layoutStore.getSeasons(getGameSystemRoot())`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 Update `PartyChronicleApp.loadPartyLayoutData`
    - Import `getGameSystemRoot` from `./utils/game-system-detector.js`
    - Change `layoutStore.getSeasons()` to `layoutStore.getSeasons(getGameSystemRoot())`
    - _Requirements: 6.1, 6.2_

  - [x] 4.3 Update `updateXpForSeason` in `scripts/handlers/party-chronicle-handlers.ts`
    - Extract the directory name from the composite season key before normalizing: `const dirName = seasonId.includes('/') ? seasonId.split('/').pop()! : seasonId;`
    - Use `dirName` instead of `seasonId` for the bounties/quests XP logic
    - _Requirements: 6.3_

  - [x] 4.4 Write unit tests for caller updates
    - Test that `updateXpForSeason` correctly extracts directory name from composite key (e.g., `pfs2/bounties` → XP 1, `sfs2/season1` → XP 4)
    - _Requirements: 6.3_

- [x] 5. Update existing LayoutStore tests for composite season keys
  - [x] 5.1 Update `tests/LayoutStore.test.ts` to use composite season keys
    - Update `getSeasons` test: verify composite keys like `pfs2/s1` instead of bare `s1`
    - Update `getLayoutsByParent` test: pass composite keys instead of bare directory names
    - Update `getDisplayNameForDirectory` test: verify display name is still `Special Events` even with composite key
    - Ensure mock browse results reflect the directory structure that produces composite keys
    - _Requirements: 2.1, 2.4, 3.2_

- [x] 6. Final checkpoint
  - Ensure all tests pass (`npx jest --no-cache`), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Layout IDs already encode the game system (e.g., `pfs2.s5-18`, `sfs2.s1-01`) — the composite season key leverages this existing convention
- The `seasonDirectories` map key changes from bare directory name to `gameSystemRoot/dirName` to prevent collisions
- The `layoutInfo` entries gain a `gameSystemRoot` field and their `season` field uses the composite key
- Test command: `npx jest --no-cache` from the `pfs-chronicle-generator` directory
