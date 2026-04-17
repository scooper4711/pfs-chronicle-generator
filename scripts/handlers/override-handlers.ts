/**
 * Override Handlers
 * 
 * Event handlers for XP and currency override checkboxes in the Advanced section
 * of each character card. Manages the toggle logic for enabling/disabling override
 * inputs and applying/removing strikethrough styling on calculated labels.
 * 
 * Requirements: gm-override-values 3.3, 3.4, 3.5, 3.6, 4.5, 4.6, 4.7, 4.8, 6.2
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
 * When checked: enables the Override XP input and adds strikethrough to the
 * Calculated XP Label. When unchecked: disables the input and removes strikethrough.
 * 
 * @param characterId - The actor ID of the character
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: gm-override-values 3.3, 3.4, 3.5, 3.6
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
  const calculatedLabel = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.CALCULATED_XP_LABEL(characterId)
  );

  if (!checkbox || !input) {
    debug(`Override XP elements not found for character: ${characterId}`);
    return;
  }

  const isChecked = checkbox.checked;

  input.disabled = !isChecked;

  if (calculatedLabel) {
    if (isChecked) {
      calculatedLabel.classList.add(CSS_CLASSES.STRIKETHROUGH_OVERRIDE);
    } else {
      calculatedLabel.classList.remove(CSS_CLASSES.STRIKETHROUGH_OVERRIDE);
    }
  }

  debug(`Override XP ${isChecked ? 'enabled' : 'disabled'} for character: ${characterId}`);
}

/**
 * Handles the Override Currency checkbox change for a specific character.
 * 
 * When checked: enables the Override Currency input and adds strikethrough to both
 * the Calculated Currency Label and the Earned Income Value. When unchecked: disables
 * the input and removes strikethrough from both.
 * 
 * @param characterId - The actor ID of the character
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: gm-override-values 4.5, 4.6, 4.7, 4.8
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
  const calculatedLabel = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.CALCULATED_CURRENCY_LABEL(characterId)
  );
  const earnedIncomeValue = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.EARNED_INCOME_VALUE(characterId)
  );

  if (!checkbox || !input) {
    debug(`Override Currency elements not found for character: ${characterId}`);
    return;
  }

  const isChecked = checkbox.checked;

  input.disabled = !isChecked;

  const elements = [calculatedLabel, earnedIncomeValue].filter(
    (el): el is HTMLElement => el !== null
  );
  for (const element of elements) {
    if (isChecked) {
      element.classList.add(CSS_CLASSES.STRIKETHROUGH_OVERRIDE);
    } else {
      element.classList.remove(CSS_CLASSES.STRIKETHROUGH_OVERRIDE);
    }
  }

  debug(`Override Currency ${isChecked ? 'enabled' : 'disabled'} for character: ${characterId}`);
}

/**
 * Initializes override states from saved data on form load.
 * 
 * Reads all override checkboxes in the container and applies the correct
 * disabled/enabled and strikethrough states based on their checked state.
 * Called during form initialization after template rendering.
 * 
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: gm-override-values 6.2
 */
export function initializeOverrideStates(container: HTMLElement): void {
  // Initialize XP override states
  const xpCheckboxes = container.querySelectorAll<HTMLInputElement>(
    CHARACTER_FIELD_PATTERNS.OVERRIDE_XP_ALL
  );
  for (const checkbox of xpCheckboxes) {
    const characterId = extractCharacterIdFromName(checkbox.name);
    if (characterId) {
      handleOverrideXpChange(characterId, container);
    }
  }

  // Initialize Currency override states
  const currencyCheckboxes = container.querySelectorAll<HTMLInputElement>(
    CHARACTER_FIELD_PATTERNS.OVERRIDE_CURRENCY_ALL
  );
  for (const checkbox of currencyCheckboxes) {
    const characterId = extractCharacterIdFromName(checkbox.name);
    if (characterId) {
      handleOverrideCurrencyChange(characterId, container);
    }
  }

  debug('Initialized override states from saved data');
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
