import type { SessionReport } from './session-report-types';

/**
 * Encode a string as UTF-16LE bytes and return the base64 representation.
 *
 * RPG Chronicles expects the base64 payload to decode to UTF-16LE bytes.
 * Each character is written as a 2-byte little-endian pair (low byte first,
 * high byte second) into a Uint8Array, which is then converted to a binary
 * string for btoa().
 */
export function encodeUtf16LeBase64(text: string): string {
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const codePoint = text.codePointAt(i) ?? 0;
    bytes[i * 2] = codePoint & 0xFF;
    bytes[i * 2 + 1] = codePoint >> 8;
  }
  const binaryString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join('');
  return btoa(binaryString);
}

/**
 * Serialize a SessionReport to a JSON string, optionally base64-encoded.
 *
 * By default the JSON is converted to UTF-16LE bytes and then
 * base64-encoded for consumption by browser plugins that automate the
 * Paizo.com reporting form. When {@link skipBase64} is true the raw JSON
 * string is returned instead (useful for debugging via Option/Alt-click).
 *
 * Requirements: 6.1, 6.2, 6.5
 */
export function serializeSessionReport(
  report: SessionReport,
  skipBase64?: boolean,
): string {
  const json = JSON.stringify(report);
  if (skipBase64) {
    return json;
  }
  return encodeUtf16LeBase64(json);
}
