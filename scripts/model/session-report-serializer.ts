import type { SessionReport } from './session-report-types';

/**
 * Serialize a SessionReport to a JSON string, optionally base64-encoded.
 *
 * By default the JSON is base64-encoded for consumption by browser plugins
 * that automate the Paizo.com reporting form. When {@link skipBase64} is
 * true the raw JSON string is returned instead (useful for debugging via
 * Option/Alt-click).
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
  return btoa(json);
}
