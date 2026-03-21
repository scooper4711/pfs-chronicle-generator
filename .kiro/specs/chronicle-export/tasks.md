# Implementation Plan: Chronicle Export

## Overview

Add bulk chronicle export to the PFS Chronicle Generator. During chronicle generation, each filled PDF is added to a JSZip archive stored on the Party actor's flags. A new Export button on the Society tab downloads the zip. The implementation integrates with the existing generation pipeline in `chronicle-generation.ts`, the download pattern in `main.ts`, and the clear-data flow in `event-listener-helpers.ts`.

## Tasks

- [ ] 1. Add JSZip dependency and create the ChronicleExporter module
  - [x] 1.1 Install `jszip` as a production dependency
    - Run `npm install jszip` and `npm install --save-dev @types/jszip`
    - Verify it appears in `package.json` under `dependencies`
    - Verify esbuild bundles it (existing build pipeline handles node_modules)
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 1.2 Create `scripts/handlers/chronicle-exporter.ts` with core archive functions
    - Implement `createArchive()` returning a new empty JSZip instance
    - Implement `deduplicateFilename(filename, existingFilenames)` that appends `_2`, `_3`, etc. before the `.pdf` extension for collisions
    - Implement `addPdfToArchive(archive, pdfBytes, filename, existingFilenames)` that calls `deduplicateFilename`, adds the PDF via `archive.file()`, adds the used filename to the set, and returns the actual filename
    - Implement `hasArchive(partyActor)` returning `true` if a non-empty `chronicleZip` flag exists
    - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3_

  - [x] 1.3 Implement `storeArchive`, `clearArchive`, and `downloadArchive` in `chronicle-exporter.ts`
    - Implement `storeArchive(archive, partyActor)` that calls `archive.generateAsync({type: 'base64'})` and stores the result via `partyActor.setFlag('pfs-chronicle-generator', 'chronicleZip', base64)`
    - Implement `clearArchive(partyActor)` that calls `partyActor.unsetFlag('pfs-chronicle-generator', 'chronicleZip')`
    - Implement `generateZipFilename(scenarioName, eventDate)` using `sanitizeFilename` from `filename-utils.ts`, appending current time as HHMM, falling back to `chronicles.zip` when both inputs are empty
    - Implement `downloadArchive(partyActor, scenarioName, eventDate)` using the existing `atob → Uint8Array → Blob → FileSaver.saveAs` pattern with MIME type `application/zip`
    - Show `ui.notifications.info` on success, `ui.notifications.error` on failure
    - _Requirements: 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1_

  - [x] 1.4 Write property test: Filename deduplication produces unique names
    - **Property 2: Filename deduplication produces unique names**
    - Test in `scripts/handlers/chronicle-exporter.pbt.test.ts`
    - For any base filename and N duplicate insertions (2+), all produced filenames are unique, preserve `.pdf` extension, and follow `{base}_N.pdf` pattern
    - **Validates: Requirements 1.3**

  - [x] 1.5 Write property test: Zip filename format
    - **Property 5: Zip filename format**
    - Test in `scripts/handlers/chronicle-exporter.pbt.test.ts`
    - For any non-empty scenario name and event date, `generateZipFilename` produces a filename matching `{sanitized_name}_{date}_{HHMM}.zip` where the name portion equals `sanitizeFilename(scenarioName)`
    - **Validates: Requirements 3.2**

  - [x] 1.6 Write property test: hasArchive reflects flag presence
    - **Property 4: hasArchive reflects flag presence**
    - Test in `scripts/handlers/chronicle-exporter.pbt.test.ts`
    - For any Party actor mock, `hasArchive` returns `true` iff the actor has a non-empty string under `pfs-chronicle-generator.chronicleZip`
    - **Validates: Requirements 2.2, 2.3**

  - [x] 1.7 Write unit tests for ChronicleExporter (`scripts/handlers/chronicle-exporter.test.ts`)
    - Test `createArchive` returns an empty JSZip instance
    - Test `addPdfToArchive` adds a file with the correct filename
    - Test `addPdfToArchive` skips empty/null PDF bytes
    - Test `deduplicateFilename` with no collision returns original name
    - Test `deduplicateFilename` with 1 collision returns `_2` suffix
    - Test `generateZipFilename` falls back to `chronicles.zip` when both inputs are empty
    - Test `downloadArchive` shows error notification on decode failure
    - Test `downloadArchive` shows success notification on completion
    - Test `clearArchive` calls `unsetFlag`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.3, 4.1, 4.2, 5.1_

- [ ] 2. Checkpoint - Verify ChronicleExporter module
  - [x] 2.1 Ensure all tests pass, ask the user if questions arise
  - [x] 2.2 Git commit: `feat: Add ChronicleExporter module with zip archive functions`
    - Stage `package.json`, `package-lock.json`, `scripts/handlers/chronicle-exporter.ts`, and all new test files
    - Commit on branch `feat/chronicle-export`

- [ ] 3. Integrate zip building into chronicle generation pipeline
  - [x] 3.1 Modify `processAllPartyMembers` in `chronicle-generation.ts` to accept a `partyActor` parameter and build the zip
    - Add `partyActor` parameter to `processAllPartyMembers` signature
    - Import `createArchive`, `addPdfToArchive`, `storeArchive` from `chronicle-exporter.ts`
    - Call `createArchive()` before the per-actor loop
    - Track filenames in a `Set<string>`
    - After each successful `pdfDoc.save()`, call `addPdfToArchive` with the `modifiedPdfBytes` and the filename from `generateChronicleFilename(actor.name, blankChroniclePath)`
    - Skip adding to zip when generation fails or produces empty bytes
    - After the loop, if at least one PDF was added, call `storeArchive(archive, partyActor)`
    - Do not store an empty zip if all generations failed
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 5.3_

  - [x] 3.2 Update `generateChroniclesFromPartyData` to pass the Party actor to `processAllPartyMembers`
    - Add `partyActor` parameter to `generateChroniclesFromPartyData`
    - Pass it through to `processAllPartyMembers`
    - Update the call site in `attachGenerateButtonListener` in `event-listener-helpers.ts` to resolve and pass the Party actor
    - _Requirements: 1.1, 1.5_

  - [x] 3.3 Write property test: PDF added to zip with correct filename
    - **Property 1: PDF added to zip with correct filename**
    - Test in `scripts/handlers/chronicle-exporter.pbt.test.ts`
    - For any valid actor name and blank chronicle path, adding a PDF to the archive results in the archive containing exactly one file whose name equals `generateChronicleFilename(actorName, blankChroniclePath)`
    - **Validates: Requirements 1.2**

  - [x] 3.4 Write property test: Zip archive base64 round trip
    - **Property 3: Zip archive base64 round trip**
    - Test in `scripts/handlers/chronicle-exporter.pbt.test.ts`
    - For any valid zip archive with one or more entries, storing as base64 and decoding produces byte-identical content
    - **Validates: Requirements 1.5, 3.1**

  - [x] 3.5 Write property test: storeArchive replaces previous archive
    - **Property 7: storeArchive replaces previous archive**
    - Test in `scripts/handlers/chronicle-exporter.pbt.test.ts`
    - For any Party actor with an existing zip, calling `storeArchive` with a new archive results in the stored value being the new base64 string
    - **Validates: Requirements 5.3**

  - [x] 3.6 Write property test: clearArchive removes the archive
    - **Property 6: clearArchive removes the archive**
    - Test in `scripts/handlers/chronicle-exporter.pbt.test.ts`
    - For any Party actor with a stored zip, calling `clearArchive` results in `hasArchive` returning `false`
    - **Validates: Requirements 5.1**

- [ ] 4. Checkpoint - Verify generation pipeline integration
  - [x] 4.1 Ensure all tests pass, ask the user if questions arise
  - [x] 4.2 Git commit: `feat: Integrate zip archive building into chronicle generation pipeline`
    - Stage modified `chronicle-generation.ts`, `event-listener-helpers.ts`, and any new/updated test files
    - Commit on branch `feat/chronicle-export`

- [ ] 5. Add Export button to the UI and wire up event listeners
  - [x] 5.1 Add `EXPORT_CHRONICLES` selector to `dom-selectors.ts`
    - Add `EXPORT_CHRONICLES: '#exportChronicles'` to `BUTTON_SELECTORS`
    - _Requirements: 2.1_

  - [x] 5.2 Add `hasChronicleZip` field to `PartyChronicleContext` in `party-chronicle-types.ts`
    - Add `hasChronicleZip: boolean` to the `PartyChronicleContext` interface
    - _Requirements: 2.2, 2.3_

  - [x] 5.3 Add Export button to `templates/party-chronicle-filling.hbs`
    - Add a `<button>` with `id="exportChronicles"`, `class="icon fa-solid fa-file-zipper"`, `data-tooltip`, `aria-label="Export Chronicles"`, and `{{#unless hasChronicleZip}}disabled{{/unless}}`
    - Place it adjacent to the existing Clear Data, Generate Chronicles, and Copy Session Report buttons in the actions section
    - _Requirements: 2.1_

  - [x] 5.4 Set `hasChronicleZip` in the template context
    - In the code that builds the `PartyChronicleContext` (likely in `PartyChronicleApp.ts` or `party-chronicle-handlers.ts`), call `hasArchive(partyActor)` and set the result on the context
    - _Requirements: 2.2, 2.3_

  - [x] 5.5 Create `attachExportButtonListener` in `event-listener-helpers.ts`
    - Import `downloadArchive` and `hasArchive` from `chronicle-exporter.ts`
    - Attach click handler to the Export button that reads scenario name and event date from the form, resolves the Party actor, and calls `downloadArchive`
    - Include defensive check: if `hasArchive` returns false, show error notification and return early
    - Wire the new listener into the existing listener setup flow
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 6.2_

  - [x] 5.6 Update Export button enabled state after chronicle generation
    - After `storeArchive` completes in the generation pipeline, enable the Export button by removing the `disabled` attribute
    - _Requirements: 2.4_

  - [x] 5.7 Integrate `clearArchive` into `handleClearButtonConfirmed` in `event-listener-helpers.ts`
    - Import `clearArchive` from `chronicle-exporter.ts`
    - Call `clearArchive(partyActor)` during the clear flow
    - The Export button will be disabled on re-render since `hasChronicleZip` will be false
    - _Requirements: 5.1, 5.2_

  - [x] 5.8 Write unit tests for Export button UI integration
    - Test Export button exists in rendered template
    - Test Export button is disabled when no zip archive exists
    - Test Export button is enabled when zip archive exists
    - Test Export button state updates after generation completes
    - Test Export button state updates after clear data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.2_

- [-] 6. Final checkpoint - Ensure all tests pass
  - [x] 6.1 Ensure all tests pass, ask the user if questions arise
  - [x] 6.2 Verify `npm run lint` passes with no errors
  - [x] 6.3 Verify all requirements are covered by implementation tasks
  - [x] 6.4 Git commit: `feat: Add Export Chronicles button and wire up UI`
    - Stage modified `dom-selectors.ts`, `party-chronicle-types.ts`, `party-chronicle-filling.hbs`, `event-listener-helpers.ts`, and any new/updated test files
    - Commit on branch `feat/chronicle-export`

## Notes

- All tasks are mandatory, including property-based tests
- Each task references specific requirements for traceability
- Property tests validate the seven correctness properties from the design document
- The ChronicleExporter module lives in `scripts/handlers/chronicle-exporter.ts` alongside existing handler modules
- All property-based tests use `fast-check` and live in `scripts/handlers/chronicle-exporter.pbt.test.ts`
- Unit tests live in `scripts/handlers/chronicle-exporter.test.ts`
- Checkpoints ensure incremental validation after each major integration step
