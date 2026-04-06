# Requirements Document

## Introduction

The pfs-chronicle-generator codebase uses `any` types extensively when interacting with PF2e system objects (actors, sheets, party members, form data). This feature replaces those `any` types with proper type definitions, leveraging existing interfaces (`PartyActor`, `FlagActor`, `SessionReportActor`) and creating new ones where needed. The goal is to improve type safety, catch bugs at compile time, and make the codebase more maintainable without changing runtime behavior.

## Glossary

- **PartyActor**: Interface representing a PF2e character actor with properties accessed throughout the chronicle generator. Extends FlagActor. Defined in `event-listener-helpers.ts`.
- **FlagActor**: Minimal interface for a Foundry actor that supports flag operations (getFlag, setFlag, unsetFlag). Defined in `chronicle-exporter.ts`.
- **SessionReportActor**: Minimal actor shape required by the session report builder with PFS-specific fields. Defined in `session-report-builder.ts`.
- **PartySheetApp**: Minimal type for the PF2e Party Sheet app passed to the renderPartySheetPF2e hook. Defined in `event-listener-helpers.ts`.
- **CharacterSheetApp**: Minimal type for the PF2e Character Sheet app passed to the renderCharacterSheetPF2e hook. Defined in `event-listener-helpers.ts`.
- **PartyChronicleContext**: Context data prepared for the Handlebars template. Defined in `party-chronicle-types.ts`.
- **PartyChronicleData**: Complete party chronicle data structure combining shared and per-character fields. Defined in `party-chronicle-types.ts`.
- **SharedFields**: Shared fields that apply to all party members. Defined in `party-chronicle-types.ts`.
- **UniqueFields**: Character-specific fields unique per party member. Defined in `party-chronicle-types.ts`.
- **ChronicleData**: Chronicle data format expected by PdfGenerator. Defined in `party-chronicle-mapper.ts`.
- **ChronicleFormData**: New interface representing the expanded form data structure containing `shared` and `characters` properties, used by chronicle generation and validation functions.
- **LayoutSeason**: New interface representing a season entry with `id` and `name` properties, returned by `layoutStore.getSeasons()`.
- **LayoutEntry**: New interface representing a layout entry with `id` and `description` properties, returned by `layoutStore.getLayoutsByParent()`.
- **PdfFieldData**: New interface representing the data object passed to PDF element utility functions, containing chronicle field values keyed by field name.

## Requirements

### Requirement 1: Type PartyChronicleApp Constructor and Members

**User Story:** As a developer, I want the PartyChronicleApp class to use proper types for its constructor parameters and members, so that callers pass correct data and internal usage is type-checked.

#### Acceptance Criteria

1. THE PartyChronicleApp SHALL declare its `partyActors` member as `PartyActor[]` instead of `any[]`
2. THE PartyChronicleApp constructor SHALL accept `partyActors` as `PartyActor[]` instead of `any[]`
3. THE PartyChronicleApp constructor SHALL accept `options` with a specific type or a typed default instead of `any`
4. THE PartyChronicleApp `_prepareContext` method SHALL declare its return type as `Promise<PartyChronicleContext>` instead of `Promise<any>`
5. THE PartyChronicleApp `_prepareContext` method SHALL accept its parameter as `unknown` or a specific options type instead of `any`
6. THE PartyChronicleApp `loadPartyLayoutData` method SHALL return typed `LayoutSeason[]` and `LayoutEntry[]` arrays instead of `any[]`
7. THE PartyChronicleApp `validateSharedFields` method SHALL accept a `ChronicleFormData` parameter instead of `any`
8. THE PartyChronicleApp `validateUniqueFields` method SHALL accept a `ChronicleFormData` parameter instead of `any`
9. THE PartyChronicleApp `#generateChronicles` method SHALL type its `data` variable as `ChronicleFormData` instead of `any`
10. WHEN `validateUniqueFields` iterates over character entries, THE PartyChronicleApp SHALL cast `unique` to `UniqueFields` instead of `any`

### Requirement 2: Type Hook Callbacks in main.ts

**User Story:** As a developer, I want the Foundry hook callbacks to use proper PF2e types for their parameters, so that sheet and actor interactions are type-safe.

#### Acceptance Criteria

1. WHEN the `renderCharacterSheetPF2e` hook fires, THE Hook_Callback SHALL type the `sheet` parameter as `CharacterSheetApp` instead of `any`
2. WHEN the `renderCharacterSheetPF2e` hook fires, THE Hook_Callback SHALL type the `html` parameter as `JQuery` instead of `any`
3. WHEN the `renderPartySheetPF2e` hook fires, THE Hook_Callback SHALL type the `app` parameter as `PartySheetApp` instead of `any`
4. WHEN the `renderPartySheetPF2e` hook fires, THE Hook_Callback SHALL type the `html` parameter as `JQuery` instead of `any`
5. THE Hook registrations SHALL retain the `as any` cast on the hook event name string since fvtt-types does not define PF2e-specific hook names
6. WHEN filtering party actors in the `renderPartySheetPF2e` hook, THE Filter_Callback SHALL type the `actor` parameter as `PartyActor` instead of `any`
7. WHEN accessing `partySheet.actor` in `renderPartyChronicleForm` and `attachEventListeners`, THE Code SHALL use the `PartySheetApp` type instead of `as any` casts

### Requirement 3: Type Chronicle Generation Functions

**User Story:** As a developer, I want the chronicle generation functions to use proper types for their data and actor parameters, so that the generation pipeline is type-safe end to end.

#### Acceptance Criteria

1. THE `generateChroniclesFromPartyData` function SHALL type its `data` parameter as `ChronicleFormData` instead of `any`
2. THE `generateChroniclesFromPartyData` function SHALL type its `partyActors` parameter as `PartyActor[]` instead of `any[]`
3. THE `validateAllCharacterFields` function SHALL type its `data` parameter as `ChronicleFormData` instead of `any`
4. THE `validateAllCharacterFields` function SHALL type its `partyActors` parameter as `PartyActor[]` instead of `any[]`
5. THE `loadLayoutConfiguration` function SHALL type its `data` parameter as `ChronicleFormData` instead of `any`
6. THE `extractSharedFields` function SHALL type its `rawShared` parameter as `ChronicleFormData['shared']` or a specific raw type instead of `any`
7. THE `extractUniqueFields` function SHALL type its `rawCharacters` parameter as `ChronicleFormData['characters']` or a specific raw type instead of `any`
8. THE `extractUniqueFields` function SHALL type its `actor` parameter as `PartyActor` instead of `any`
9. THE `extractCharacterChronicleData` function SHALL type its `data` parameter as `ChronicleFormData` instead of `any`
10. THE `extractCharacterChronicleData` function SHALL type its `actor` parameter as `PartyActor` instead of `any`
11. THE `extractCharacterChronicleData` function SHALL declare a return type of `ChronicleData` instead of `any`
12. THE `processAllPartyMembers` function SHALL type its `data` parameter as `ChronicleFormData` instead of `any`
13. THE `processAllPartyMembers` function SHALL type its `partyActors` parameter as `PartyActor[]` instead of `any[]`
14. THE `generateSingleCharacterPdf` function SHALL type its `chronicleData` parameter as `ChronicleData` instead of `any`
15. THE `generateSingleCharacterPdf` function SHALL type its `actor` parameter as `PartyActor` instead of `any`

### Requirement 4: Type Party Chronicle Mapper and Reputation Calculator

**User Story:** As a developer, I want the data mapping and reputation calculation functions to use proper actor types, so that actor property access is validated at compile time.

#### Acceptance Criteria

1. THE `mapToCharacterData` function SHALL type its `actor` parameter as `PartyActor` instead of `any`
2. THE `calculateReputation` function SHALL type its `actor` parameter as `PartyActor` instead of `any`

### Requirement 5: Type PDF Element Utility Functions

**User Story:** As a developer, I want the PDF element utility functions to use a proper data type, so that field name access is validated.

#### Acceptance Criteria

1. THE `resolveValue` function SHALL type its `data` parameter as `PdfFieldData` (a `Record<string, unknown>` or equivalent) instead of `any`
2. THE `extractSocietyIdPart` function SHALL type its `data` parameter as `PdfFieldData` instead of `any`

### Requirement 6: Type Collapsible Section Handlers

**User Story:** As a developer, I want the collapsible section handlers to avoid `as any` casts for array includes checks, so that the type narrowing is explicit.

#### Acceptance Criteria

1. WHEN checking if a section ID is in `VALID_SECTION_IDS`, THE `toggleSectionCollapse` function SHALL use a type-safe membership check instead of casting to `any`
2. WHEN checking if a section ID is in `SECTIONS_WITH_SUMMARY`, THE `updateSectionSummary` function SHALL use a type-safe membership check instead of casting to `any`

### Requirement 7: Define New Shared Type Interfaces

**User Story:** As a developer, I want new type interfaces defined for data shapes that currently lack them, so that all `any` replacements have proper types to reference.

#### Acceptance Criteria

1. THE Codebase SHALL define a `ChronicleFormData` interface with `shared` and `characters` properties matching the expanded form data structure
2. THE Codebase SHALL define a `LayoutSeason` interface with `id: string` and `name: string` properties
3. THE Codebase SHALL define a `LayoutEntry` interface with `id: string` and `description: string` properties
4. THE Codebase SHALL define a `PdfFieldData` type as `Record<string, unknown>` or an interface with an index signature for string keys
5. THE new interfaces SHALL be defined in existing type files (`party-chronicle-types.ts` for form/layout types, `pdf-element-utils.ts` for PDF types) to avoid unnecessary new files

### Requirement 8: Preserve Acceptable any Usages

**User Story:** As a developer, I want certain `any` usages to be explicitly preserved where no better alternative exists, so that the refactoring scope is clear and pragmatic.

#### Acceptance Criteria

1. THE `globals.d.ts` file SHALL retain `declare var game: any` since fvtt-types does not fully type the Foundry `game` global
2. THE Hook registrations SHALL retain `as any` casts on PF2e-specific hook event name strings (e.g., `'renderCharacterSheetPF2e' as any`)
3. THE `renderTemplate` call in `renderPartyChronicleForm` SHALL retain `context as any` since the Foundry `renderTemplate` function expects an untyped context object
4. WHEN test files use `(global as any)` for Foundry mock setup, THE Test_Files SHALL retain those casts since global augmentation for test mocks is acceptable

### Requirement 9: Maintain Zero Runtime Behavior Change

**User Story:** As a developer, I want the type safety improvements to be purely compile-time changes, so that no runtime behavior is altered.

#### Acceptance Criteria

1. THE Codebase SHALL compile without new TypeScript errors after all type replacements
2. THE existing test suite SHALL pass without modification (except for type annotation changes in test files)
3. IF a type replacement causes a compile error, THEN THE Developer SHALL resolve the error by adjusting the type definition rather than adding a new `any` cast
