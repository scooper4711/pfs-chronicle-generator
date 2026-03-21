# Requirements Document

## Introduction

Chronicle delivery currently depends on players being connected to the FoundryVTT server at the right time. In practice this is unreliable: GMs often generate chronicles after players have disconnected (late-night sessions), self-hosted servers are not always online, and some players are not comfortable navigating Foundry to retrieve their own chronicles. As a result, GMs frequently distribute chronicles manually via email, Discord, or other channels.

Additionally, GMs need to retain copies of all chronicles they issue for record-keeping and dispute resolution, and there is currently no built-in way to archive them.

This feature adds a bulk export capability. During chronicle generation, each PDF is added to a zip archive that is stored on the Party actor. The GM can then download the zip from the Society tab to distribute chronicles outside of Foundry and keep a local archive.

## Glossary

- **Chronicle_Exporter**: The module responsible for constructing the zip archive during chronicle generation and triggering its download.
- **Party_Actor**: The FoundryVTT party actor. The zip archive is stored in its flags under the key `pfs-chronicle-generator.chronicleZip`.
- **Party_Actor_Member**: A FoundryVTT actor that is a member of the current party and has a generated Chronicle_PDF stored in its actor flags.
- **Chronicle_PDF**: A filled PDF chronicle stored as a base64-encoded string in a Party_Actor_Member's flags under the key `pfs-chronicle-generator.chroniclePdf`.
- **Chronicle_Data**: The structured data stored in a Party_Actor_Member's flags under the key `pfs-chronicle-generator.chronicleData`, including the `blankChroniclePath` used for filename generation.
- **Export_Button**: A UI button on the Society tab of the Party sheet that triggers download of the stored zip archive.
- **Zip_Archive**: A zip file containing one PDF per party member, built incrementally during chronicle generation and stored as a base64-encoded string on the Party_Actor.
- **Zip_Filename**: The name of the downloaded zip file, derived from the scenario name and event date.

## Requirements

### Requirement 1: Zip Archive Construction During Generation

**User Story:** As a GM, I want chronicles to be automatically packaged into a zip file as they are generated, so that the archive is ready to download as soon as generation completes.

#### Acceptance Criteria

1. WHEN the chronicle generation process begins, THE Chronicle_Exporter SHALL create a new empty Zip_Archive
2. WHEN a Chronicle_PDF is successfully generated for a Party_Actor_Member, THE Chronicle_Exporter SHALL add the decoded PDF to the Zip_Archive with a filename generated using the existing `generateChronicleFilename` function
3. IF two or more Party_Actor_Members produce the same filename, THEN THE Chronicle_Exporter SHALL append a numeric suffix (e.g., `_2`, `_3`) to subsequent filenames to prevent overwriting
4. THE Chronicle_Exporter SHALL skip any Party_Actor_Member whose Chronicle_PDF generation failed or produced an empty result
5. WHEN the last Chronicle_PDF has been successfully generated and added, THE Chronicle_Exporter SHALL store the finalized Zip_Archive as a base64-encoded string in the Party_Actor's flags under the key `pfs-chronicle-generator.chronicleZip`
6. THE Chronicle_Exporter SHALL construct the Zip_Archive client-side without requiring a server round-trip

### Requirement 2: Export Button Availability

**User Story:** As a GM, I want an export button on the Society tab, so that I can download the zip archive of all generated chronicles.

#### Acceptance Criteria

1. THE Export_Button SHALL appear on the Society tab of the Party sheet, adjacent to the existing Clear Data and Generate Chronicles buttons (the Society tab is already restricted to GM visibility)
2. WHILE the Party_Actor does not have a Zip_Archive stored in its flags, THE Export_Button SHALL be disabled
3. WHEN the Party_Actor has a Zip_Archive stored in its flags, THE Export_Button SHALL be enabled
4. WHEN chronicles are successfully generated and the Zip_Archive is stored on the Party_Actor, THE Export_Button SHALL update its enabled state to reflect the newly available archive

### Requirement 3: Zip File Download

**User Story:** As a GM, I want the zip file to download with a meaningful name, so that I can easily identify and archive it.

#### Acceptance Criteria

1. WHEN the GM clicks the Export_Button, THE Chronicle_Exporter SHALL retrieve the base64-encoded Zip_Archive from the Party_Actor's flags, decode it, and trigger a browser download using the existing `file-saver` `saveAs` pattern (Blob → `FileSaver.saveAs`) already proven in `main.ts` for individual chronicle downloads
2. THE Zip_Filename SHALL follow the pattern `{sanitized_scenario_name}_{event_date}_{download_time}.zip` using the scenario name and event date from the shared form fields, and the current time of the download (e.g., `1430` for 2:30 PM) to disambiguate multiple exports of the same scenario on the same day
3. IF the scenario name or event date is empty, THEN THE Chronicle_Exporter SHALL use the fallback filename `chronicles.zip`
4. THE Chronicle_Exporter SHALL sanitize the Zip_Filename using the existing `sanitizeFilename` function to remove invalid filesystem characters

### Requirement 4: Export Feedback

**User Story:** As a GM, I want clear feedback when I download the archive, so that I know whether the download succeeded or failed.

#### Acceptance Criteria

1. IF an error occurs during zip download, THEN THE Chronicle_Exporter SHALL display a FoundryVTT error notification describing the failure
2. WHEN the download completes successfully, THE Chronicle_Exporter SHALL display a FoundryVTT notification confirming the download

### Requirement 5: Zip Archive Lifecycle

**User Story:** As a GM, I want the zip archive to stay in sync with the generated chronicles, so that I always download the most recent set.

#### Acceptance Criteria

1. WHEN the GM clicks the Clear Data button, THE Chronicle_Exporter SHALL remove the Zip_Archive from the Party_Actor's flags
2. WHEN the GM clicks the Clear Data button, THE Export_Button SHALL update to disabled state
3. WHEN new chronicles are generated (replacing previous ones), THE Chronicle_Exporter SHALL replace the existing Zip_Archive on the Party_Actor with a new one containing the newly generated chronicles

### Requirement 6: Zip Library Integration

**User Story:** As a developer, I want the zip functionality to use a well-maintained client-side library, so that the implementation is reliable and does not require server-side infrastructure.

#### Acceptance Criteria

1. THE Chronicle_Exporter SHALL use a client-side JavaScript zip library (such as JSZip) to construct the Zip_Archive
2. THE Chronicle_Exporter SHALL use the existing `file-saver` dependency to trigger the browser download of the Zip_Archive
3. THE zip library SHALL be added as a production dependency in `package.json`
4. THE zip library SHALL be bundled into the module's output via the existing esbuild build pipeline
