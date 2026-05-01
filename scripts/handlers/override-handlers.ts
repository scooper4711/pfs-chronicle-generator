/**
 * Override Handlers
 * 
 * Event handlers for XP and currency override checkboxes in each character card.
 * Manages the toggle logic for enabling/disabling override inputs and toggling
 * visibility between calculated display rows and override input rows.
 * 
 * Requirements: override-ux-redesign 2.1–2.4, 2.7, 3.1–3.4, 3.6, 3.8, 4.1–4.4, 4.6, 4.8, 7.4, 8.1–8.4
 */

import {
  CHARACTER_FIELD_SELECTORS,
  CHARACTER_FIELD_PATTERNS,
  CSS_CLASSES
} from '../constants/dom-selectors.js';
import { debug } from '../utils/logger.js';

/**
 * Handles the Override XP checkbox change for a specific character.
 * 
 * The checkbox, label, calculated display, and override input all live in
 * ONE composite row (.calculated-xp-row). When checked: hides the
 * .calculated-xp-label, shows the .override-xp-input, and enables it.
 * When unchecked: shows the .calculated-xp-label, hides the
 * .override-xp-input, disables it, and resets its value to zero.
 * The row itself is never hidden.
 * 
 * @param characterId - The actor ID of the character
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: override-ux-redesign 2.1, 2.2, 2.3, 2.4, 2.7
 */
export function handleOverrideXpChange(
  characterId: string,
  container: HTMLElement
): void {
  const checkbox = container.querySelector<HTMLInputElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_XP(characterId)
  );
  const input = container.querySelector<HTMLInputElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_XP_VALUE(characterId)
  );
  const calculatedXpLabel = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.CALCULATED_XP_LABEL(characterId)
  );
  const overrideXpInput = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_XP_INPUT(characterId)
  );

  if (!checkbox || !input) {
    debug(`Override XP elements not found for character: ${characterId}`);
    return;
  }

  const isChecked = checkbox.checked;

  input.disabled = !isChecked;

  if (isChecked) {
    if (calculatedXpLabel) { hideElement(calculatedXpLabel); }
    if (overrideXpInput) { showElement(overrideXpInput); }
    input.value = String(parseCalculatedXpValue(calculatedXpLabel));
  } else {
    if (calculatedXpLabel) { showElement(calculatedXpLabel); }
    if (overrideXpInput) { hideElement(overrideXpInput); }
    input.value = '0';
  }

  debug(`Override XP ${isChecked ? 'enabled' : 'disabled'} for character: ${characterId}`);
}

/**
 * Handles the Override Currency checkbox change for a specific character.
 * 
 * When checked: hides the Earned Income Section and Treasure Bundles Row (PF2e)
 * or Credits Awarded Row (SF2e), shows the Override Currency Row, enables the
 * Override Currency Input, and calculates a default value from current DOM values.
 * When unchecked: restores original rows, hides the Override Currency Row,
 * disables the Override Currency Input, and resets its value to zero.
 * 
 * @param characterId - The actor ID of the character
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: override-ux-redesign 3.1–3.4, 3.6, 3.8, 4.1–4.4, 4.6, 4.8, 8.1–8.4
 */
export function handleOverrideCurrencyChange(
  characterId: string,
  container: HTMLElement
): void {
  const checkbox = container.querySelector<HTMLInputElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_CURRENCY(characterId)
  );
  const input = container.querySelector<HTMLInputElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_CURRENCY_VALUE(characterId)
  );

  if (!checkbox || !input) {
    debug(`Override Currency elements not found for character: ${characterId}`);
    return;
  }

  const isChecked = checkbox.checked;
  input.disabled = !isChecked;

  const isStarfinder = applyCurrencyVisibility(characterId, container, isChecked);

  input.value = isChecked
    ? String(calculateDefaultCurrencyValue(characterId, container, isStarfinder))
    : '0';

  debug(`Override Currency ${isChecked ? 'enabled' : 'disabled'} for character: ${characterId}`);
}

/**
 * Applies visibility states to currency-related rows based on override state.
 * 
 * The currency override checkbox and input live in ONE composite row
 * (.currency-override-composite). When override is active, the earned income
 * section and treasure bundles/credits awarded rows are hidden, and the
 * .override-currency-input within the composite row is shown. The composite
 * row itself is never hidden.
 * 
 * @returns Whether the character is in a Starfinder game (detected from DOM)
 */
function applyCurrencyVisibility(
  characterId: string,
  container: HTMLElement,
  isOverrideActive: boolean
): boolean {
  const earnedIncomeSection = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.EARNED_INCOME_SECTION(characterId)
  );
  const treasureBundlesRow = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.TREASURE_BUNDLES_ROW(characterId)
  );
  const creditsAwardedRow = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.CREDITS_AWARDED_ROW(characterId)
  );
  const overrideCurrencyInput = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_CURRENCY_INPUT(characterId)
  );

  const isStarfinder = creditsAwardedRow !== null;

  // Original calculated rows: visible when override is inactive
  const originalRows = isStarfinder
    ? [creditsAwardedRow]
    : [earnedIncomeSection, treasureBundlesRow];

  for (const row of originalRows) {
    if (row) {
      if (isOverrideActive) {
        hideElement(row);
      } else {
        showElement(row);
      }
    }
  }

  // Override input within composite row: visible when override is active
  if (overrideCurrencyInput) {
    if (isOverrideActive) {
      showElement(overrideCurrencyInput);
    } else {
      hideElement(overrideCurrencyInput);
    }
  }

  return isStarfinder;
}

/**
 * Calculates the default currency override value from current DOM display values.
 * 
 * For PF2e: sums the treasure bundle gold value and earned income value.
 * For SF2e: reads the credits awarded value.
 * 
 * @param characterId - The actor ID of the character
 * @param container - HTMLElement wrapping the form container
 * @param isStarfinder - Whether the character is in a Starfinder game
 * @returns The calculated default currency value
 */
function calculateDefaultCurrencyValue(
  characterId: string,
  container: HTMLElement,
  isStarfinder: boolean
): number {
  if (isStarfinder) {
    return parseCreditsAwardedValue(characterId, container);
  }
  return parseTreasureBundleValue(characterId, container) +
    parseEarnedIncomeValue(characterId, container);
}

/**
 * Parses the treasure bundle gold value from the display element.
 * Expects text like "12.50 gp" and extracts the numeric portion.
 * Uses class-based selector scoped to the character's section.
 */
function parseTreasureBundleValue(characterId: string, container: HTMLElement): number {
  const selector = `.member-activity[data-character-id="${characterId}"] .treasure-bundle-value`;
  const displayElement = container.querySelector<HTMLElement>(selector);
  if (!displayElement) {
    debug(`Treasure bundle display not found for character: ${characterId}`);
    return 0;
  }
  return parseNumericFromText(displayElement.textContent ?? '');
}

/**
 * Parses the earned income value from the hidden input element.
 */
function parseEarnedIncomeValue(characterId: string, container: HTMLElement): number {
  const hiddenInput = container.querySelector<HTMLInputElement>(
    CHARACTER_FIELD_SELECTORS.EARNED_INCOME_HIDDEN(characterId)
  );
  if (!hiddenInput) {
    debug(`Earned income hidden input not found for character: ${characterId}`);
    return 0;
  }
  const value = Number.parseFloat(hiddenInput.value);
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Parses the credits awarded value from the display element.
 * Expects text like "100 Credits" and extracts the numeric portion.
 */
function parseCreditsAwardedValue(characterId: string, container: HTMLElement): number {
  const displayElement = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.CREDITS_AWARDED_DISPLAY(characterId)
  );
  if (!displayElement) {
    debug(`Credits awarded display not found for character: ${characterId}`);
    return 0;
  }
  return parseNumericFromText(displayElement.textContent ?? '');
}

/**
 * Parses the calculated XP value from the display element.
 * Expects text like "4 XP" and extracts the numeric portion.
 * Returns 0 if the element is null or text cannot be parsed.
 */
function parseCalculatedXpValue(displayElement: HTMLElement | null): number {
  if (!displayElement) {
    return 0;
  }
  return parseNumericFromText(displayElement.textContent ?? '');
}

/**
 * Extracts a numeric value from display text by stripping non-numeric characters.
 * Handles formats like "12.50 gp", "100 Credits", etc.
 * 
 * @returns The parsed number, or 0 if parsing fails
 */
function parseNumericFromText(text: string): number {
  const cleaned = text.replaceAll(/[^0-9.]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Shows an element by removing the override-hidden CSS class.
 */
function showElement(element: HTMLElement): void {
  element.classList.remove(CSS_CLASSES.OVERRIDE_HIDDEN);
}

/**
 * Hides an element by adding the override-hidden CSS class.
 */
function hideElement(element: HTMLElement): void {
  element.classList.add(CSS_CLASSES.OVERRIDE_HIDDEN);
}

/**
 * Initializes override states from saved data on form load.
 * 
 * Reads all override checkboxes in the container and applies the correct
 * visibility states based on their checked state. For currency overrides,
 * the handler calculates a default value, so saved non-zero values are
 * restored after the handler runs.
 * 
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: override-ux-redesign 7.4
 */
export function initializeOverrideStates(container: HTMLElement): void {
  initializeXpOverrideStates(container);
  initializeCurrencyOverrideStates(container);
  debug('Initialized override states from saved data');
}

/**
 * Initializes XP override visibility states for all characters.
 * Preserves saved non-zero override values that would otherwise be
 * overwritten by the default value calculation in handleOverrideXpChange.
 */
function initializeXpOverrideStates(container: HTMLElement): void {
  const xpCheckboxes = container.querySelectorAll<HTMLInputElement>(
    CHARACTER_FIELD_PATTERNS.OVERRIDE_XP_ALL
  );
  for (const checkbox of xpCheckboxes) {
    const characterId = extractCharacterIdFromName(checkbox.name);
    if (!characterId) {
      continue;
    }

    const input = container.querySelector<HTMLInputElement>(
      CHARACTER_FIELD_SELECTORS.OVERRIDE_XP_VALUE(characterId)
    );
    const savedValue = input ? Number.parseFloat(input.value) : 0;
    const hasSavedValue = !Number.isNaN(savedValue) && savedValue !== 0;

    handleOverrideXpChange(characterId, container);

    if (hasSavedValue && input) {
      input.value = String(savedValue);
    }
  }
}

/**
 * Initializes currency override visibility states for all characters.
 * Preserves saved non-zero override values that would otherwise be
 * overwritten by the default value calculation in handleOverrideCurrencyChange.
 */
function initializeCurrencyOverrideStates(container: HTMLElement): void {
  const currencyCheckboxes = container.querySelectorAll<HTMLInputElement>(
    CHARACTER_FIELD_PATTERNS.OVERRIDE_CURRENCY_ALL
  );
  for (const checkbox of currencyCheckboxes) {
    const characterId = extractCharacterIdFromName(checkbox.name);
    if (!characterId) {
      continue;
    }

    const input = container.querySelector<HTMLInputElement>(
      CHARACTER_FIELD_SELECTORS.OVERRIDE_CURRENCY_VALUE(characterId)
    );
    const savedValue = input ? Number.parseFloat(input.value) : 0;
    const hasSavedValue = !Number.isNaN(savedValue) && savedValue !== 0;

    handleOverrideCurrencyChange(characterId, container);

    if (hasSavedValue && input) {
      input.value = String(savedValue);
    }
  }
}

/**
 * Extracts the character ID from a form field name attribute.
 * 
 * @param name - The name attribute value (e.g., "characters.actor-123.overrideXp")
 * @returns The character ID, or null if the name doesn't match the expected pattern
 */
function extractCharacterIdFromName(name: string): string | null {
  const match = /^characters\.([^.]+)\./.exec(name);
  return match ? match[1] : null;
}
