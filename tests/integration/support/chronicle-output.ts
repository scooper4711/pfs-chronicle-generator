/**
 * Decoders for what the module produces: chronicle PDFs (to their visible
 * text) and the base64 UTF-16LE session report placed on the clipboard.
 */
import { resolve } from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// pdf.js needs its bundled standard fonts to read the chronicles' text.
const STANDARD_FONT_DATA_URL = `${resolve('node_modules/pdfjs-dist/standard_fonts')}/`;

/** Extracts the visible text of every page of a base64-encoded PDF. */
export async function pdfText(pdfBase64: string): Promise<string> {
  const data = new Uint8Array(Buffer.from(pdfBase64, 'base64'));
  const loadingTask = getDocument({ data, standardFontDataUrl: STANDARD_FONT_DATA_URL });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const content = await (await document.getPage(pageNumber)).getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  await loadingTask.destroy();
  return pages.join('\n');
}

/** Decodes the clipboard session report (base64 of UTF-16LE JSON). */
export function decodeSessionReport<T = SessionReport>(clipboard: string): T {
  return JSON.parse(Buffer.from(clipboard, 'base64').toString('utf16le')) as T;
}

export interface SessionReport {
  gameSystem: string;
  gameDate: string;
  generateGmChronicle: boolean;
  gmOrgPlayNumber: number;
  repEarned: number;
  reportingA: boolean;
  reportingB: boolean;
  reportingC: boolean;
  reportingD: boolean;
  scenario: string;
  signUps: SignUp[];
  bonusRepEarned: { faction: string; reputation: number }[];
}

export interface SignUp {
  isGM: boolean;
  orgPlayNumber: number;
  characterNumber: number;
  characterName: string;
  consumeReplay: boolean;
  repEarned: number;
  faction: string;
  slowTrack?: boolean;
}
