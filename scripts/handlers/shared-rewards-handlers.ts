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
 *               starfinder-support 5.2, 7.5
 */

import { debug, warn } from '../utils/logger.js';
import { calculateTreasureBundleValue, formatCurrencyValue, getCreditsAwarded } from '../utils/treasure-bundle-calculator.js';
import { calculateDowntimeDays, calculateEarnedIncome, formatIncomeValue } from '../utils/earned-income-calculator.js';
import { getGameSystem } from '../utils/game-system-detector.js';
import { formatCurrency } from '../utils/currency-formatter.js';
import { updateSectionSummary } from './collapsible-section-handlers.js';

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
