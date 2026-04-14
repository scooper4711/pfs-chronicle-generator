# Requirements Document

## Introduction

The PFS Chronicle Generator discovers seasons and chronicle layouts by recursively browsing the `assets/layouts/` directory tree. Game system roots (`pfs2` for Pathfinder, `sfs2` for Starfinder) contain season subdirectories (e.g., `season1`, `bounties`). Currently, all seasons from every game system root are mixed together in a single list — the `getSeasons()` method returns seasons from both PF2e and SF2e, and `getLayoutsByParent()` matches by bare directory name without considering which game system root the season belongs to. This causes two problems: (1) season ID collisions when both systems have identically-named directories (e.g., both `pfs2/season1` and `sfs2/season1` produce a single `season1` entry that overwrites the other), and (2) GMs see seasons and layouts from the wrong game system. Additionally, the `GAME_SYSTEM_ROOTS` constant contains `'sfs'` instead of the correct `'sfs2'`, preventing Starfinder season discovery entirely.

Layout IDs already encode the game system and season (e.g., `pfs2.s5-18`, `sfs2.s1-01`), so the system information is inherently available in the data. This feature leverages that existing structure to make the LayoutStore system-aware: each season and layout entry tracks which game system root it was discovered under, and the public query methods filter by the active game system. When running Pathfinder, only `pfs2` seasons and layouts appear; when running Starfinder, only `sfs2` seasons and layouts appear.

## Glossary

- **Layout_Store**: The singleton class (`scripts/LayoutStore.ts`) that discovers, caches, and serves chronicle layout metadata. It recursively browses the `assets/layouts/` directory tree, identifies season directories as immediate children of game system roots, and provides `getSeasons()` and `getLayoutsByParent()` for populating UI dropdowns.
- **Game_System_Root**: A top-level directory under `assets/layouts/` that corresponds to a game system. Current roots are `pfs2` (Pathfinder Society 2e) and `sfs2` (Starfinder Society 2e). The `GAME_SYSTEM_ROOTS` constant in the Layout_Store enumerates these directories.
- **Season_Directory**: An immediate child directory of a Game_System_Root (e.g., `pfs2/season1`, `sfs2/season1`, `pfs2/bounties`). Each Season_Directory groups related chronicle layouts for a particular season or category.
- **Season_Entry**: A record in the Layout_Store's `seasonDirectories` map representing a discovered Season_Directory. Contains an identifier, a display name, and the Game_System_Root it belongs to.
- **Layout_Entry**: A record in the Layout_Store's `layoutInfo` map representing a single chronicle layout JSON file. Contains the layout ID (e.g., `pfs2.s5-18`), description, file path, parent season, game system root, and hidden flag.
- **Game_System_Detector**: The utility (`scripts/utils/game-system-detector.ts`) that determines the active game system (`'pf2e'` or `'sf2e'`) at runtime by checking `game.system.id` and the `sf2e-anachronism` module.
- **Party_Chronicle_App**: The application class (`scripts/PartyChronicleApp.ts`) that prepares context for the party chronicle form, including season and layout dropdown data via `loadPartyLayoutData()`.
- **Season_Dropdown**: The HTML `<select>` element in the party chronicle form that lists available seasons for the GM to choose from.
- **Layout_Dropdown**: The HTML `<select>` element in the party chronicle form that lists available chronicle layouts within the selected season.

## Requirements

### Requirement 1: Fix Game System Roots Constant

**User Story:** As a GM running Starfinder, I want the Layout_Store to recognize the `sfs2` directory as a valid game system root, so that Starfinder seasons and layouts are discovered during initialization.

#### Acceptance Criteria

1. THE Layout_Store `GAME_SYSTEM_ROOTS` constant SHALL contain the value `'sfs2'` (not `'sfs'`)
2. THE Layout_Store `GAME_SYSTEM_ROOTS` constant SHALL contain both `'pfs2'` and `'sfs2'` as the complete set of recognized Game_System_Root directory names
3. WHEN the Layout_Store browses the `assets/layouts/sfs2/` directory tree, THE Layout_Store SHALL detect Season_Directories as immediate children of the `sfs2` root

### Requirement 2: System-Tagged Season and Layout Storage

**User Story:** As a developer, I want each Season_Entry and Layout_Entry to carry its Game_System_Root context, so that identically-named season directories from different game systems do not collide and can be filtered independently.

#### Acceptance Criteria

1. THE Layout_Store SHALL store each Season_Entry with a `gameSystemRoot` field indicating which Game_System_Root directory it was discovered under
2. THE Layout_Store SHALL store each Layout_Entry with a `gameSystemRoot` field indicating which Game_System_Root directory it was discovered under
3. WHEN two Game_System_Roots contain Season_Directories with the same directory name (e.g., `pfs2/season1` and `sfs2/season1`), THE Layout_Store SHALL treat the Season_Entries as distinct records with no data collision
4. THE Layout_Store `getLayoutsByParent()` method SHALL match layouts using both the season directory name AND the game system root, so that only layouts belonging to the requested season within the correct game system are returned

### Requirement 3: System-Filtered Season Retrieval

**User Story:** As a GM, I want the season dropdown to show only seasons from the game system I am currently running, so that I do not see irrelevant seasons from the other system.

#### Acceptance Criteria

1. THE Layout_Store `getSeasons()` method SHALL accept a `gameSystemRoot` parameter that specifies which Game_System_Root to filter by
2. WHEN `getSeasons()` is called with a `gameSystemRoot` value, THE Layout_Store SHALL return only Season_Entries whose `gameSystemRoot` field matches the specified value
3. WHILE the active game system is Pathfinder, THE callers of `getSeasons()` SHALL pass `'pfs2'` as the `gameSystemRoot` parameter
4. WHILE the active game system is Starfinder, THE callers of `getSeasons()` SHALL pass `'sfs2'` as the `gameSystemRoot` parameter
5. THE Layout_Store `getSeasons()` method SHALL continue to sort seasons with numbered seasons first (ascending) followed by non-numbered seasons in alphabetical order

### Requirement 4: System-Filtered Layout Retrieval

**User Story:** As a GM, I want the layout dropdown to show only chronicle layouts from the active game system's seasons, so that I cannot accidentally select a chronicle from the wrong system.

#### Acceptance Criteria

1. WHEN `getLayoutsByParent()` is called with a season identifier and game system root, THE Layout_Store SHALL return only Layout_Entries whose season and gameSystemRoot fields match
2. THE Layout_Store `getLayoutsByParent()` method SHALL continue to exclude hidden layouts from the returned results
3. THE Layout_Store `getLayoutsByParent()` method SHALL continue to sort returned layouts alphabetically by description

### Requirement 5: Caller Integration — Module Initialization

**User Story:** As a GM, I want the season setting choices registered at module startup to contain only seasons for the active game system, so that the stored setting value is always valid for the current system.

#### Acceptance Criteria

1. WHEN the module registers the `season` setting during the `ready` hook, THE main entry point SHALL call `getSeasons()` with the Game_System_Root corresponding to the active game system
2. THE season setting `choices` object SHALL contain only seasons from the active game system
3. THE season setting `default` value SHALL be the first season from the filtered list (or empty string if no seasons exist)

### Requirement 6: Caller Integration — Party Chronicle Form

**User Story:** As a GM, I want the party chronicle form's season and layout dropdowns to display only content from the active game system, so that the form is consistent with the system I am running.

#### Acceptance Criteria

1. WHEN the Party_Chronicle_App loads party layout data via `loadPartyLayoutData()`, THE Party_Chronicle_App SHALL call `getSeasons()` with the Game_System_Root corresponding to the active game system
2. WHEN the Party_Chronicle_App resolves layouts for a selected season, THE Party_Chronicle_App SHALL call `getLayoutsByParent()` with the season identifier from the filtered list
3. WHEN the GM changes the Season_Dropdown, THE season change handler SHALL call `getLayoutsByParent()` with the season identifier from the selected option's value
4. IF a previously saved season ID does not match any season in the filtered list, THEN THE Party_Chronicle_App SHALL fall back to the first available season in the filtered list

### Requirement 7: Game System Root Mapping

**User Story:** As a developer, I want a clear mapping between the Game_System_Detector output (`'pf2e'` / `'sf2e'`) and the corresponding Game_System_Root directory name (`'pfs2'` / `'sfs2'`), so that callers can translate the detected system into the correct filter parameter.

#### Acceptance Criteria

1. THE codebase SHALL provide a mapping function or constant that translates `'pf2e'` to `'pfs2'` and `'sf2e'` to `'sfs2'`
2. WHEN a caller needs to determine the Game_System_Root for filtering, THE caller SHALL use the mapping rather than hardcoding the translation inline
3. THE mapping SHALL be the single source of truth for the relationship between game system identifiers and layout directory root names
