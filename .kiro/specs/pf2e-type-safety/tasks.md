# Implementation Plan: pf2e-type-safety

## Overview

Replace `any` types across the pfs-chronicle-generator codebase with proper TypeScript interfaces. The implementation is organized by file/module so each task produces a focused, committable unit of work. New type definitions come first since all other tasks depend on them. Property-based tests validate the three areas where runtime behavior could be affected.

## Tasks

- [x] 1. Define new type interfaces in party-chronicle-types.ts and pdf-element-utils.ts
  - [x] 1.1 Add `ChronicleFormData`, `LayoutSeason`, and `LayoutEntry` interfaces to `scripts/model/party-chronicle-types.ts`
    - Add `ChronicleFormData` with `shared: SharedFields` and `characters: Record<string, UniqueFields>` properties
    - Add `LayoutSeason` with `id: string` and `name: string` properties
    - Add `LayoutEntry` with `id: string` and `description: string` properties
    - Update `PartyChronicleContext.seasons` to use `LayoutSeason[]` and `PartyChronicleContext.layoutsInSeason` to use `LayoutEntry[]`
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 1.2 Add `PdfFieldData` type to `scripts/utils/pdf-element-utils.ts`
    - Define `PdfFieldData` as `Record<string, unknown>`
    - Export the type for use by other modules
    - _Requirements: 7.4, 7.5_

- [x] 2. Type PDF element utility functions in pdf-element-utils.ts
  - [x] 2.1 Replace `any` with `PdfFieldData` in `resolveValue` and `extractSocietyIdPart`
    - Change `data: any` to `data: PdfFieldData` in `resolveValue` signature
    - Change `data: any` to `data: PdfFieldData` in `extractSocietyIdPart` signature
    - Add explicit narrowing where property access returns `unknown` instead of `any` (e.g., `typeof societyid === 'string'` check already exists)
    - _Requirements: 5.1, 5.2_

  - [ ]* 2.2 Write property test for resolveValue with PdfFieldData
    - **Property 1: Parameter resolution preserves behavior with PdfFieldData**
    - Test that `resolveValue` with `Record<string, unknown>` data returns correct results for param references, society ID extraction, and array joining
    - Create `tests/utils/pdf-element-utils.property.test.ts`
    - **Validates: Requirements 5.1**

- [x] 3. Type collapsible section handlers in collapsible-section-handlers.ts
  - [x] 3.1 Replace `as any` casts with type-safe membership check functions
    - Add `isValidSectionId(id: string): id is typeof VALID_SECTION_IDS[number]` type guard using `(VALID_SECTION_IDS as readonly string[]).includes(id)`
    - Add `isSectionWithSummary(id: string): id is typeof SECTIONS_WITH_SUMMARY[number]` type guard using `(SECTIONS_WITH_SUMMARY as readonly string[]).includes(id)`
    - Replace `VALID_SECTION_IDS.includes(sectionId as any)` in `toggleSectionCollapse` with `isValidSectionId(sectionId)`
    - Replace `SECTIONS_WITH_SUMMARY.includes(sectionId as any)` in `updateSectionSummary` with `isSectionWithSummary(sectionId)`
    - _Requirements: 6.1, 6.2_

  - [ ]* 3.2 Write property test for type-safe membership checks
    - **Property 2: Type-safe membership check equivalence**
    - Test that `isValidSectionId` and `isSectionWithSummary` return `true` iff the string is a member of the corresponding tuple
    - Create `tests/handlers/collapsible-section-handlers.property.test.ts`
    - **Validates: Requirements 6.1, 6.2**

- [x] 4. Checkpoint - Verify compilation and tests
  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Type chronicle generation functions in chronicle-generation.ts
  - [x] 5.1 Replace `any` types in `generateChroniclesFromPartyData`, `validateAllCharacterFields`, `loadLayoutConfiguration`, and `processAllPartyMembers`
    - Change `data: any` to `data: ChronicleFormData` in `generateChroniclesFromPartyData`
    - Change `partyActors: any[]` to `partyActors: PartyActor[]` in `generateChroniclesFromPartyData`
    - Change `data: any` to `data: ChronicleFormData` in `validateAllCharacterFields`
    - Change `partyActors: any[]` to `partyActors: PartyActor[]` in `validateAllCharacterFields`
    - Change `unique as any` to `unique as UniqueFields` in the `validateAllCharacterFields` loop
    - Change `data: any` to `data: ChronicleFormData` in `loadLayoutConfiguration`
    - Change `data: any` to `data: ChronicleFormData` in `processAllPartyMembers`
    - Change `partyActors: any[]` to `partyActors: PartyActor[]` in `processAllPartyMembers`
    - Import `ChronicleFormData` and `PartyActor` from their respective modules
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.12, 3.13_

  - [x] 5.2 Replace `any` types in `extractSharedFields`, `extractUniqueFields`, `extractCharacterChronicleData`, and `generateSingleCharacterPdf`
    - Change `rawShared: any` to `rawShared: ChronicleFormData['shared']` or `Partial<SharedFields>` in `extractSharedFields`
    - Change `rawCharacters: any` to `rawCharacters: ChronicleFormData['characters']` or `Record<string, Partial<UniqueFields>>` in `extractUniqueFields`
    - Change `actor: any` to `actor: PartyActor` in `extractUniqueFields`
    - Change `data: any` to `data: ChronicleFormData` in `extractCharacterChronicleData`
    - Change `actor: any` to `actor: PartyActor` in `extractCharacterChronicleData`
    - Change return type of `extractCharacterChronicleData` from `any` to `ChronicleData`
    - Change `chronicleData: any` to `chronicleData: ChronicleData` in `generateSingleCharacterPdf`
    - Change `actor: any` to `actor: PartyActor` in `generateSingleCharacterPdf`
    - _Requirements: 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.14, 3.15_

  - [ ]* 5.3 Write property test for ChronicleFormData extraction round-trip
    - **Property 3: ChronicleFormData extraction round-trip**
    - Test that `extractSharedFields` and `extractUniqueFields` correctly extract and coerce fields from a `ChronicleFormData` object
    - Create `tests/handlers/chronicle-generation.property.test.ts`
    - **Validates: Requirements 7.1**

- [x] 6. Type form data extraction and party chronicle handlers
  - [x] 6.1 Replace `any` types in `scripts/handlers/form-data-extraction.ts`
    - Change `partyActors: any[]` to `partyActors: PartyActor[]` in `extractFormData`
    - Change `(actor: any)` to `(actor: PartyActor)` in the `partyActors.forEach` callback
    - Change return type annotation from `any` to `ChronicleFormData`
    - Change internal `shared: any` to `shared: SharedFields` (or `Partial<SharedFields>` if needed)
    - Change internal `characters: any` to `characters: Record<string, UniqueFields>`
    - Import `PartyActor` from `event-listener-helpers`, `ChronicleFormData`/`SharedFields`/`UniqueFields` from `party-chronicle-types`
    - _Requirements: 3.1, 3.2, 7.1_

  - [x] 6.2 Replace `any` types in `scripts/handlers/party-chronicle-handlers.ts`
    - Change `partyActors: any[]` to `partyActors: PartyActor[]` in `handlePortraitClick`
    - Change `partyActors: any[]` to `partyActors: PartyActor[]` in `saveFormData`
    - Change `partyActors: any[]` to `partyActors: PartyActor[]` in `handleSeasonChange`, `handleLayoutChange`, `handleFieldChange`
    - Update the `extractFormData` callback parameter type from `(container: HTMLElement, partyActors: any[]) => any` to `(container: HTMLElement, partyActors: PartyActor[]) => ChronicleFormData`
    - Import `PartyActor` from `event-listener-helpers` and `ChronicleFormData` from `party-chronicle-types`
    - _Requirements: 3.1, 3.2_

- [ ] 7. Type PartyChronicleApp class members and methods
  - [ ] 7.1 Replace `any` types in PartyChronicleApp constructor and members
    - Change `partyActors: any[]` member declaration to `partyActors: PartyActor[]`
    - Change constructor `partyActors: any[]` parameter to `partyActors: PartyActor[]`
    - Change constructor `options: any` parameter to `options: Partial<ApplicationConfiguration>` or `unknown`
    - Import `PartyActor` from `event-listener-helpers`
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 7.2 Replace `any` types in PartyChronicleApp methods
    - Change `_prepareContext(_options?: any)` return type from `Promise<any>` to `Promise<PartyChronicleContext>`
    - Change `_prepareContext` parameter from `any` to `unknown`
    - Change `loadPartyLayoutData` return type to use `LayoutSeason[]` and `LayoutEntry[]` instead of `any[]`
    - Change `validateSharedFields(data: any)` to `validateSharedFields(data: ChronicleFormData)`
    - Change `validateUniqueFields(data: any)` to `validateUniqueFields(data: ChronicleFormData)`
    - Change `unique as any` to `unique as UniqueFields` in `validateUniqueFields` loop
    - Change `data: any` in `#generateChronicles` to `data: ChronicleFormData`
    - Import `ChronicleFormData`, `LayoutSeason`, `LayoutEntry` from `party-chronicle-types`
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ] 8. Type party-chronicle-mapper.ts and reputation-calculator.ts
  - [ ] 8.1 Replace `actor: any` with `actor: PartyActor` in `mapToCharacterData` and `calculateReputation`
    - Change `actor: any` to `actor: PartyActor` in `mapToCharacterData` in `scripts/model/party-chronicle-mapper.ts`
    - Change `actor: any` to `actor: PartyActor` in `calculateReputation` in `scripts/model/reputation-calculator.ts`
    - Import `PartyActor` from `../handlers/event-listener-helpers`
    - _Requirements: 4.1, 4.2_

- [ ] 9. Checkpoint - Verify compilation and tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Type hook callbacks in main.ts
  - [ ] 10.1 Replace `any` types in `renderCharacterSheetPF2e` and `renderPartySheetPF2e` hook callbacks
    - Change `sheet: any` to `sheet: CharacterSheetApp` in `renderCharacterSheetPF2e` callback
    - Change `html: any` to `html: JQuery` in `renderCharacterSheetPF2e` callback
    - Change `app: any` to `app: PartySheetApp` in `renderPartySheetPF2e` callback
    - Change `html: any` to `html: JQuery` in `renderPartySheetPF2e` callback
    - Change `(actor: any)` to `(actor: PartyActor)` in the party actor filter callback
    - Retain `as any` casts on hook name strings (`'renderCharacterSheetPF2e' as any`, `'renderPartySheetPF2e' as any`)
    - Import `CharacterSheetApp`, `PartySheetApp` from `event-listener-helpers` (already imported: `PartyActor`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 10.2 Replace `as any` cast on `partySheet` in `renderPartyChronicleForm` and `attachEventListeners`
    - Change `partySheet: unknown` to `partySheet: PartySheetApp` in `renderPartyChronicleForm` and `attachEventListeners`
    - Replace `(partySheet as any)?.actor` with `partySheet.actor` using the `PartySheetApp` type
    - Retain `context as any` in the `renderTemplate` call (Requirement 8.3)
    - _Requirements: 2.7, 8.3_

- [ ] 11. Verify preserved `any` usages remain intact
  - Confirm `globals.d.ts` retains `declare var game: any`
  - Confirm hook name strings retain `as any` casts
  - Confirm `renderTemplate` call retains `context as any`
  - Confirm test files retain `(global as any)` casts
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 12. Final checkpoint - Compilation and full test suite verification
  - Run `npx tsc --noEmit` to verify zero new compile errors
  - Run `npx jest --run` to verify the full existing test suite passes
  - Verify no runtime behavior changes (compile-time only refactoring)
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 9.1, 9.2, 9.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the three correctness properties from the design document
- All changes are compile-time only — no runtime behavior changes
- The four preserved `any` usages (Requirement 8) are verified in task 11

