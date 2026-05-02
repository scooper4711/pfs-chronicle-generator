/**
 * Shared Rewards Display Handlers
 *
 * Functions that update the shared rewards section of the party chronicle form:
 * treasure bundle displays, credits awarded, downtime days, XP-for-season
 * defaults, and earned income displays.
 *
 * Extracted from party-chronicle-handlers.ts to keep files under 500 lines.
 *
 * Requirements: treasure-bundle-calculation 5.1–5.4, earned-income-calculation 2.4–2.5, 7.3,
 *               starfinder-support 5.2, 7.5, slow-track 8.1–8.6
 */

import { debug, warn } from '../utils/logger.js';
import { calculateTreasureBundleValue, formatCurrencyValue, getCreditsAwarded } from '../utils/treasure-bundle-calculator.js';
import { calculateDowntimeDays, calculateEarnedIncome, formatIncomeValue } from '../utils/earned-income-calculator.js';
import { getGameSystem } from '../utils/game-system-detector.js';
import { formatCurrency } from '../utils/currency-formatter.js';
import { updateSectionSummary } from './collapsible-section-handlers.js';
import { CHARACTER_FIELD_SELECTORS } from '../constants/dom-selectors.js';

/**
 * Updates the displayed treasure bundle value for a specific character.
 *
 * Calculates the gold/credit value from treasure bundles based on the
 * character's level and updates the display element.
 *
 * @param characterId - Actor ID of the character
 * @param treasureBundles - Number of treasure bundles
 * @param characterLevel - Character level
 * @param container - Container element for the form
 *
 * Requirements: treasure-bundle-calculation 5.1, 5.2, 5.3, 5.4
 */
export function updateTreasureBundleDisplay(
  characterId: string,
  treasureBundles: number,
  characterLevel: number,
  container: HTMLElement
): void {
  const displayElement = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] .treasure-bundle-value`
  );

  if (displayElement) {
    const treasureBundleValue = calculateTreasureBundleValue(treasureBundles, characterLevel);
    displayElement.textContent = formatCurrencyValue(treasureBundleValue, getGameSystem());
  }
}

/**
 * Updates treasure bundle displays for all characters.
 *
 * Iterates through all party members and updates their treasure bundle
 * displays based on their current level.
 *
 * @param treasureBundles - Number of treasure bundles
 * @param container - Container element for the form
 *
 * Requirements: treasure-bundle-calculation 5.1, 5.2, 5.3, 5.4
 */
export function updateAllTreasureBundleDisplays(
  treasureBundles: number,
  container: HTMLElement
): void {
  const memberActivities = container.querySelectorAll('.member-activity');

  memberActivities.forEach((activity) => {
    const characterId = (activity as HTMLElement).dataset.characterId;
    const levelInput = activity.querySelector<HTMLInputElement>('input[name$=".level"]');

    if (characterId && levelInput) {
      const characterLevel = Number.parseInt(levelInput.value, 10);
      updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
    }
  });
}

/**
 * Updates Credits Awarded displays for all characters in Starfinder mode.
 *
 * Iterates through all party member sections and sets the credits awarded
 * value from `getCreditsAwarded(level)` formatted via `formatCurrency`.
 *
 * @param container - Container element for the form
 *
 * Requirements: starfinder-support 5.2, 7.5
 */
export function updateAllCreditsAwardedDisplays(container: HTMLElement): void {
  const memberActivities = container.querySelectorAll('.member-activity');

  memberActivities.forEach((activity) => {
    const levelInput = activity.querySelector<HTMLInputElement>('input[name$=".level"]');
    const displayElement = activity.querySelector('.credits-awarded-value');

    if (levelInput && displayElement) {
      const characterLevel = Number.parseInt(levelInput.value, 10);
      const credits = getCreditsAwarded(characterLevel);
      displayElement.textContent = formatCurrency(credits, 'sf2e');
    }
  });
}

/**
 * Updates the displayed earned income value for a specific character.
 *
 * Calculates the earned income based on the character's task level, success
 * level, proficiency rank, and downtime days, then updates the display
 * element and hidden input.
 *
 * @param characterId - Actor ID of the character
 * @param taskLevel - Task level (0-20 or "-")
 * @param successLevel - Success level (critical_failure, failure, success, critical_success)
 * @param proficiencyRank - Proficiency rank (trained, expert, master, legendary)
 * @param downtimeDays - Number of downtime days (0-8)
 * @param container - Container element for the form
 *
 * Requirements: earned-income-calculation 2.5, 7.3
 */
export function updateEarnedIncomeDisplay(
  characterId: string,
  taskLevel: number | string,
  successLevel: string,
  proficiencyRank: string,
  downtimeDays: number,
  container: HTMLElement
): void {
  debug('updateEarnedIncomeDisplay called:', {
    characterId,
    taskLevel,
    successLevel,
    proficiencyRank,
    downtimeDays
  });

  const displayElement = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] .earned-income-value`
  );

  const hiddenInput = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] input[name="characters.${characterId}.earnedIncome"]`
  ) as HTMLInputElement;

  debug('Display element found:', !!displayElement);

  if (displayElement) {
    const gameSystem = getGameSystem();
    const earnedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays, gameSystem);
    const formattedValue = formatIncomeValue(earnedIncome, gameSystem);
    debug('Calculated earned income:', earnedIncome, 'formatted:', formattedValue);
    displayElement.textContent = formattedValue;

    // Update hidden input field for form submission and validation
    if (hiddenInput) {
      hiddenInput.value = earnedIncome.toString();
      debug('Hidden input updated to:', hiddenInput.value);
    }

    debug('Display element updated to:', displayElement.textContent);
  } else {
    warn('Display element not found for character:', characterId);
  }
}

/**
 * Updates earned income displays for all characters.
 *
 * Iterates through all party members and updates their earned income
 * displays based on their current task level, success level, and
 * proficiency rank.
 *
 * @param downtimeDays - Number of downtime days (0-8)
 * @param container - Container element for the form
 *
 * Requirements: earned-income-calculation 2.5, 7.3
 */
export function updateAllEarnedIncomeDisplays(
  downtimeDays: number,
  container: HTMLElement
): void {
  debug('updateAllEarnedIncomeDisplays called with downtimeDays:', downtimeDays);
  const memberActivities = container.querySelectorAll('.member-activity');
  debug('Found member activities:', memberActivities.length);

  memberActivities.forEach((activity) => {
    const characterId = (activity as HTMLElement).dataset.characterId;
    const taskLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
    const successLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
    const proficiencyRankSelect = activity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');

    debug('Processing character:', characterId, {
      hasTaskLevel: !!taskLevelSelect,
      hasSuccessLevel: !!successLevelSelect,
      hasProficiencyRank: !!proficiencyRankSelect,
      taskLevelValue: taskLevelSelect?.value,
      successLevelValue: successLevelSelect?.value,
      proficiencyRankValue: proficiencyRankSelect?.value
    });

    if (characterId && taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
      const taskLevel = taskLevelSelect.value;
      const successLevel = successLevelSelect.value;
      const proficiencyRank = proficiencyRankSelect.value;

      updateEarnedIncomeDisplay(characterId, taskLevel, successLevel, proficiencyRank, downtimeDays, container);
    } else {
      warn('Skipping character due to missing elements:', characterId);
    }
  });
}

/**
 * Updates the downtime days display based on XP earned and treasure bundles.
 *
 * Calculates downtime days using the formula: XP × 2 for Quests/Scenarios,
 * 0 for Bounties, with a special case for Series 1 Quests (1 XP + 2.5 TB = 2 days).
 * After updating the display, triggers a recalculation of all character earned
 * income displays.
 *
 * @param xpEarned - XP earned from the adventure
 * @param container - Container element for the form
 *
 * Requirements: earned-income-calculation 2.4, 2.5, 7.3
 */
export function updateDowntimeDaysDisplay(
  xpEarned: number,
  container: HTMLElement
): void {
  const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
  const treasureBundles = Number.parseFloat(treasureBundlesSelect?.value || '0');

  const downtimeDays = calculateDowntimeDays(xpEarned, treasureBundles, getGameSystem());

  const displayElement = container.querySelector('.downtime-days-value');
  if (displayElement) {
    displayElement.textContent = downtimeDays.toString();
  }

  const hiddenInput = container.querySelector<HTMLInputElement>('#downtimeDays');
  if (hiddenInput) {
    hiddenInput.value = downtimeDays.toString();
  }

  updateAllEarnedIncomeDisplays(downtimeDays, container);
}

/**
 * Returns the default treasure bundles for a given XP earned value.
 *
 * Mapping:
 * - 1 XP (Bounty) → 2 TB
 * - 2 XP (Quest)  → 4 TB
 * - 4 XP (Scenario) → 8 TB
 *
 * @param xpEarned - XP earned from the adventure
 * @returns Default number of treasure bundles
 */
export function getDefaultTreasureBundles(xpEarned: number): number {
  const xpToTreasure: Record<number, number> = { 1: 2, 2: 4, 4: 8 };
  return xpToTreasure[xpEarned] ?? 8;
}

/**
 * Updates the treasure bundles dropdown to the default value for the given XP
 * and triggers downstream display updates (per-character treasure values).
 *
 * @param xpEarned - XP earned from the adventure
 * @param container - Container element for the form
 */
export function updateTreasureBundlesForXp(xpEarned: number, container: HTMLElement): void {
  const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
  if (!treasureBundlesSelect) return;

  const defaultBundles = getDefaultTreasureBundles(xpEarned);
  treasureBundlesSelect.value = defaultBundles.toString();
  debug(`Auto-selected treasure bundles: ${defaultBundles} for XP ${xpEarned}`);

  updateAllTreasureBundleDisplays(defaultBundles, container);
}

/**
 * Determines the default XP earned for a season and updates the XP dropdown,
 * treasure bundles, and downtime days display accordingly.
 *
 * Season directory naming convention:
 * - "bounties" → 1 XP
 * - "quests"   → 2 XP (series 2 quests, q14+)
 * - anything else (seasonN) → 4 XP (standard scenario)
 *
 * @param seasonId - The season directory name (e.g. "bounties", "quests", "season5")
 * @param container - Container element for the form
 */
export function updateXpForSeason(seasonId: string, container: HTMLElement): void {
  const dirName = seasonId.includes('/') ? seasonId.split('/').pop()! : seasonId;
  const normalizedSeason = dirName.toLowerCase();
  let defaultXp: number;

  if (normalizedSeason === 'bounties') {
    defaultXp = 1;
  } else if (normalizedSeason === 'quests') {
    defaultXp = 2;
  } else {
    defaultXp = 4;
  }

  const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
  if (xpSelect) {
    xpSelect.value = defaultXp.toString();
    debug(`Auto-selected XP earned: ${defaultXp} for season "${seasonId}"`);
  }

  updateTreasureBundlesForXp(defaultXp, container);
  updateDowntimeDaysDisplay(defaultXp, container);
  updateSectionSummary('shared-rewards', container);
}

/**
 * Updates XP label, earned income, and treasure bundle/gold displays for a
 * single character based on the current slow track state.
 *
 * Reads the shared XP, downtime days, treasure bundles, and the character's
 * slow track checkbox from the DOM, then recalculates and updates:
 * - XP label: halved when slow track is active (and XP override is not)
 * - Earned income: calculated with halved downtime days when slow track is active
 * - Treasure bundle gold: halved total when slow track is active (and currency override is not)
 *
 * @param characterId - Actor ID of the character
 * @param container - Container element for the form
 *
 * Requirements: slow-track 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export function updateSlowTrackDisplays(
  characterId: string,
  container: HTMLElement
): void {
  const slowTrackCheckbox = container.querySelector<HTMLInputElement>(
    `input[name="characters.${characterId}.slowTrack"]`
  );
  const isSlowTrack = slowTrackCheckbox?.checked ?? false;

  updateSlowTrackXpLabel(characterId, isSlowTrack, container);
  updateSlowTrackEarnedIncome(characterId, isSlowTrack, container);
  updateSlowTrackTreasureBundleGold(characterId, isSlowTrack, container);
  updateSlowTrackNotesAnnotation(characterId, isSlowTrack, container);
}

/**
 * Updates the XP label for a character based on slow track state.
 *
 * When slow track is active and XP override is not checked, the label shows
 * the halved XP value. Otherwise it shows the standard shared XP value.
 *
 * Requirements: slow-track 8.1, 8.2
 */
function updateSlowTrackXpLabel(
  characterId: string,
  isSlowTrack: boolean,
  container: HTMLElement
): void {
  const overrideXpCheckbox = container.querySelector<HTMLInputElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_XP(characterId)
  );
  const isOverrideXp = overrideXpCheckbox?.checked ?? false;

  // When XP override is active, the override input controls the display — skip
  if (isOverrideXp) return;

  const xpSelect = container.querySelector<HTMLSelectElement>('#xpEarned');
  const xpEarned = Number.parseInt(xpSelect?.value || '0', 10);

  const displayXp = isSlowTrack ? xpEarned / 2 : xpEarned;

  const xpLabel = container.querySelector<HTMLElement>(
    CHARACTER_FIELD_SELECTORS.CALCULATED_XP_LABEL(characterId)
  );
  if (xpLabel) {
    xpLabel.textContent = `${displayXp} XP`;
  }
}

/**
 * Updates the earned income display for a character based on slow track state.
 *
 * When slow track is active, downtime days are halved before calculating
 * earned income. This naturally produces reduced earned income.
 *
 * Requirements: slow-track 8.3, 8.4
 */
function updateSlowTrackEarnedIncome(
  characterId: string,
  isSlowTrack: boolean,
  container: HTMLElement
): void {
  const downtimeDaysInput = container.querySelector<HTMLInputElement>('#downtimeDays');
  const downtimeDays = Number.parseInt(downtimeDaysInput?.value || '0', 10);
  const effectiveDays = isSlowTrack ? downtimeDays / 2 : downtimeDays;

  const memberActivity = container.querySelector(
    `.member-activity[data-character-id="${characterId}"]`
  );
  if (!memberActivity) return;

  const taskLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
  const successLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
  const proficiencyRankSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');

  if (taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
    updateEarnedIncomeDisplay(
      characterId,
      taskLevelSelect.value,
      successLevelSelect.value,
      proficiencyRankSelect.value,
      effectiveDays,
      container
    );
  }
}

/**
 * Updates the treasure bundle gold display for a character based on slow track state.
 *
 * When slow track is active and currency override is not checked, the displayed
 * gold value is halved. When currency override is active, the override value
 * controls the display — this function does nothing.
 *
 * Requirements: slow-track 8.5, 8.6
 */
function updateSlowTrackTreasureBundleGold(
  characterId: string,
  isSlowTrack: boolean,
  container: HTMLElement
): void {
  const overrideCurrencyCheckbox = container.querySelector<HTMLInputElement>(
    CHARACTER_FIELD_SELECTORS.OVERRIDE_CURRENCY(characterId)
  );
  const isOverrideCurrency = overrideCurrencyCheckbox?.checked ?? false;

  // When currency override is active, the override input controls the display — skip
  if (isOverrideCurrency) return;

  const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
  const treasureBundles = Number.parseFloat(treasureBundlesSelect?.value || '0');

  const memberActivity = container.querySelector(
    `.member-activity[data-character-id="${characterId}"]`
  );
  if (!memberActivity) return;

  const levelInput = memberActivity.querySelector<HTMLInputElement>('input[name$=".level"]');
  if (!levelInput) return;

  const characterLevel = Number.parseInt(levelInput.value, 10);
  const treasureBundleValue = calculateTreasureBundleValue(treasureBundles, characterLevel);
  const displayValue = isSlowTrack ? treasureBundleValue / 2 : treasureBundleValue;

  const displayElement = memberActivity.querySelector('.treasure-bundle-value');
  if (displayElement) {
    displayElement.textContent = formatCurrencyValue(displayValue, getGameSystem());
  }
}

const SLOW_ADVANCEMENT_NOTE = 'Slow Advancement';

/**
 * Toggles the "Slow Advancement" annotation in a character's notes textarea.
 *
 * When slow track is enabled, appends "Slow Advancement" as the last line
 * (if not already present). When disabled, removes any line that contains
 * only the words "Slow Advancement".
 *
 * @param characterId - Actor ID of the character
 * @param isSlowTrack - Whether slow track is currently active
 * @param container - Container element for the form
 */
function updateSlowTrackNotesAnnotation(
  characterId: string,
  isSlowTrack: boolean,
  container: HTMLElement
): void {
  const notesTextarea = container.querySelector<HTMLTextAreaElement>(
    `textarea[name="characters.${characterId}.notes"]`
  );
  if (!notesTextarea) return;

  const currentNotes = notesTextarea.value;

  if (isSlowTrack) {
    const alreadyPresent = currentNotes
      .split('\n')
      .some((line) => line.trim() === SLOW_ADVANCEMENT_NOTE);

    if (!alreadyPresent) {
      const separator = currentNotes.length > 0 && !currentNotes.endsWith('\n') ? '\n' : '';
      notesTextarea.value = currentNotes + separator + SLOW_ADVANCEMENT_NOTE;
    }
  } else {
    notesTextarea.value = currentNotes
      .split('\n')
      .filter((line) => line.trim() !== SLOW_ADVANCEMENT_NOTE)
      .join('\n');
  }
}
