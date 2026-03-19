/**
 * Session Report Click Handler
 *
 * Orchestrates the Copy Session Report workflow: validate form data,
 * build the session report, serialize it, copy to clipboard, and notify.
 * Detects Option/Alt key on click to toggle raw JSON (skip base64).
 *
 * Requirements: paizo-session-reporting 4.1, 6.5, 7.1, 7.2, 7.3, 7.4, 8.5
 */

import { extractFormData } from './form-data-extraction.js';
import { validateSessionReportFields } from '../model/party-chronicle-validator.js';
import { buildSessionReport } from '../model/session-report-builder.js';
import { serializeSessionReport } from '../model/session-report-serializer.js';
import type { PartyActor } from './event-listener-helpers.js';

/**
 * Displays validation errors in the #validationErrors panel.
 *
 * @param container - Form container element
 * @param errors - Array of validation error messages
 */
function displayValidationErrors(container: HTMLElement, errors: string[]): void {
  const errorPanel = container.querySelector('#validationErrors') as HTMLElement;
  const errorList = container.querySelector('#validationErrorList') as HTMLElement;

  if (!errorPanel || !errorList) return;

  errorList.innerHTML = '';
  for (const error of errors) {
    const li = document.createElement('li');
    li.textContent = error;
    errorList.appendChild(li);
  }
  errorPanel.style.display = 'block';
}

/**
 * Handles the Copy Session Report button click.
 *
 * Orchestrates: validate → build → serialize → clipboard copy → notify.
 * Holds Option/Alt key to skip base64 encoding (copies raw JSON).
 *
 * @param container - Form container element
 * @param partyActors - Array of party member actors
 * @param layoutId - Currently selected layout ID
 * @param event - The mouse click event (used to detect Alt/Option key)
 *
 * Requirements: paizo-session-reporting 4.1, 6.5, 7.1, 7.2, 7.3, 7.4, 8.5
 */
export async function handleCopySessionReport(
  container: HTMLElement,
  partyActors: PartyActor[],
  layoutId: string,
  event: MouseEvent
): Promise<void> {
  const formData = extractFormData(container, partyActors);

  // Step 1: Validate
  const validation = validateSessionReportFields({
    shared: formData.shared,
    partyActors,
  });

  if (!validation.valid) {
    displayValidationErrors(container, validation.errors);
    return;
  }

  // Step 2: Build
  const report = buildSessionReport({
    shared: formData.shared,
    characters: formData.characters,
    partyActors,
    layoutId,
  });

  // Step 3: Serialize (Alt/Option key skips base64)
  const skipBase64 = event.altKey;
  const serialized = serializeSessionReport(report, skipBase64);

  // Step 4: Clipboard copy and notify
  try {
    await navigator.clipboard.writeText(serialized);
    const format = skipBase64 ? 'raw JSON' : 'base64';
    ui.notifications?.info(`Session report copied to clipboard (${format}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.notifications?.error(`Failed to copy session report to clipboard: ${message}`);
  }
}
