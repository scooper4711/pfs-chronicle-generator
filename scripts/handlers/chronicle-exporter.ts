/**
 * Chronicle Exporter
 *
 * Encapsulates zip archive construction, storage, download, and lifecycle
 * management for bulk chronicle export. Each filled PDF is added to a JSZip
 * archive during generation; the finalized zip is stored as base64 on the
 * Party actor's flags and can be downloaded from the Society tab.
 */

import JSZip from 'jszip';
import { sanitizeFilename } from '../utils/filename-utils';

/** Minimal interface for a Foundry actor that supports flag operations. */
export interface FlagActor {
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<void>;
  unsetFlag(scope: string, key: string): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
}

const MODULE_ID = 'pfs-chronicle-generator';
const ZIP_FLAG_KEY = 'chronicleZip';

/**
 * Creates a new empty zip archive for chronicle collection.
 * Called at the start of chronicle generation.
 */
export function createArchive(): JSZip {
  return new JSZip();
}

/**
 * Deduplicates a filename by appending _2, _3, etc. before the .pdf
 * extension when the name already exists in the set.
 *
 * @param filename - The desired filename (e.g. "Valeros_1-01.pdf")
 * @param existingFilenames - Set of filenames already used
 * @returns A unique filename
 */
export function deduplicateFilename(
  filename: string,
  existingFilenames: Set<string>
): string {
  if (!existingFilenames.has(filename)) {
    return filename;
  }

  const extensionIndex = filename.lastIndexOf('.pdf');
  const baseName = extensionIndex >= 0 ? filename.slice(0, extensionIndex) : filename;
  const extension = extensionIndex >= 0 ? '.pdf' : '';

  let counter = 2;
  let candidate = `${baseName}_${counter}${extension}`;
  while (existingFilenames.has(candidate)) {
    counter++;
    candidate = `${baseName}_${counter}${extension}`;
  }

  return candidate;
}

/**
 * Adds a decoded PDF to the zip archive with a deduplicated filename.
 * Called after each successful PDF generation.
 *
 * @param archive - The JSZip instance
 * @param pdfBytes - The raw PDF bytes
 * @param filename - The desired filename (from generateChronicleFilename)
 * @param existingFilenames - Set of filenames already in the archive
 * @returns The actual filename used (may have a numeric suffix)
 */
export function addPdfToArchive(
  archive: JSZip,
  pdfBytes: Uint8Array,
  filename: string,
  existingFilenames: Set<string>
): string {
  const actualFilename = deduplicateFilename(filename, existingFilenames);
  archive.file(actualFilename, pdfBytes);
  existingFilenames.add(actualFilename);
  return actualFilename;
}

/**
 * Checks whether a zip archive exists on the Party actor's flags.
 *
 * @param partyActor - The Foundry Party actor
 * @returns true if a non-empty zip archive string is stored
 */
export function hasArchive(partyActor: FlagActor): boolean {
  const zipFlag = partyActor.getFlag(MODULE_ID, ZIP_FLAG_KEY);
  return typeof zipFlag === 'string' && zipFlag.length > 0;
}

/**
 * Finalizes the zip and stores it as base64 on the Party actor's flags.
 *
 * @param archive - The JSZip instance with all PDFs added
 * @param partyActor - The Foundry Party actor
 */
export async function storeArchive(
  archive: JSZip,
  partyActor: FlagActor
): Promise<void> {
  const base64 = await archive.generateAsync({ type: 'base64' });
  await partyActor.setFlag(MODULE_ID, ZIP_FLAG_KEY, base64);
}

/**
 * Removes the zip archive from the Party actor's flags.
 *
 * @param partyActor - The Foundry Party actor
 */
export async function clearArchive(partyActor: FlagActor): Promise<void> {
  await partyActor.unsetFlag(MODULE_ID, ZIP_FLAG_KEY);
}

/**
 * Generates the zip filename from scenario name, event date, and current time.
 * Falls back to "chronicles.zip" if both scenario name and event date are empty.
 *
 * @param scenarioName - Scenario name from shared fields
 * @param eventDate - Event date string (e.g. "2024-06-15")
 * @returns Sanitized zip filename
 */
export function generateZipFilename(
  scenarioName: string,
  eventDate: string
): string {
  const trimmedName = scenarioName.trim();
  const trimmedDate = eventDate.trim();

  if (trimmedName.length === 0 && trimmedDate.length === 0) {
    return 'chronicles.zip';
  }

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStamp = `${hours}${minutes}`;

  const sanitizedName = sanitizeFilename(trimmedName);
  const parts = [sanitizedName, trimmedDate, timeStamp]
    .filter(part => part.length > 0);

  return `${parts.join('_')}.zip`;
}

/**
 * Downloads the stored zip archive from the Party actor's flags.
 * Uses the existing atob → Uint8Array → Blob → FileSaver.saveAs pattern.
 *
 * @param partyActor - The Foundry Party actor
 * @param scenarioName - Scenario name from shared fields
 * @param eventDate - Event date from shared fields
 */
export function downloadArchive(
  partyActor: FlagActor,
  scenarioName: string,
  eventDate: string
): void {
  try {
    const base64Zip = partyActor.getFlag(MODULE_ID, ZIP_FLAG_KEY);
    if (typeof base64Zip !== 'string' || base64Zip.length === 0) {
      ui.notifications?.error('No chronicle archive found to download.');
      return;
    }

    const byteCharacters = atob(base64Zip);
    const byteNumbers = new Array<number>(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.codePointAt(i) ?? 0;
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/zip' });

    const filename = generateZipFilename(scenarioName, eventDate);

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Synchronous require needed inside click handler (dynamic import not viable here)
    const FileSaver = require('file-saver');
    FileSaver.saveAs(blob, filename);

    ui.notifications?.info('Chronicle archive downloaded successfully.');
  } catch (caughtError) {
    const message = caughtError instanceof Error
      ? caughtError.message
      : String(caughtError);
    ui.notifications?.error(`Failed to download chronicle archive: ${message}`);
  }
}

