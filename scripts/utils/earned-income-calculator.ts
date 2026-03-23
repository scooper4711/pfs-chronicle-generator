/**
 * Earned Income Calculator
 * 
 * Provides income table, DC lookup table, and calculation functions for
 * Pathfinder Society Earn Income downtime activity.
 * 
 * Requirements: earned-income-calculation 1.1, 1.2, 1.4, 1.5, 1.8, 1.9, 3.5, 4.3,
 *               5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7,
 *               6.8, 8.1, 8.2, 8.3, 8.4
 */

/**
 * DC by level lookup table for Pathfinder 2e
 * Maps task levels 0-20 to their corresponding DCs
 * 
 * Requirements: earned-income-calculation 8.1, 8.2
 */
export const DC_BY_LEVEL: Record<number, number> = {
  0: 14,
  1: 15,
  2: 16,
  3: 18,
  4: 19,
  5: 20,
  6: 22,
  7: 23,
  8: 24,
  9: 26,
  10: 27,
  11: 28,
  12: 30,
  13: 31,
  14: 32,
  15: 34,
  16: 35,
  17: 36,
  18: 38,
  19: 39,
  20: 40
};

/**
 * Income table mapping task levels and proficiency ranks to income per day in gold pieces
 * All values pre-converted from cp/sp to gp (1 cp = 0.01 gp, 1 sp = 0.1 gp)
 * 
 * Structure: INCOME_TABLE[taskLevel][proficiencyRank] = income in gp
 * Special: INCOME_TABLE[20]['critical'] contains critical success values for level 20
 * 
 * Requirements: earned-income-calculation 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export const INCOME_TABLE: Record<number, Record<string, number | Record<string, number>>> = {
  0: { failure: 0.01, trained: 0.05, expert: 0.05, master: 0.05, legendary: 0.05 },
  1: { failure: 0.02, trained: 0.2, expert: 0.2, master: 0.2, legendary: 0.2 },
  2: { failure: 0.04, trained: 0.3, expert: 0.3, master: 0.3, legendary: 0.3 },
  3: { failure: 0.08, trained: 0.5, expert: 0.5, master: 0.5, legendary: 0.5 },
  4: { failure: 0.1, trained: 0.8, expert: 1, master: 1, legendary: 1 },
  5: { failure: 0.2, trained: 1, expert: 1.3, master: 1.3, legendary: 1.3 },
  6: { failure: 0.3, trained: 1.5, expert: 2, master: 2, legendary: 2 },
  7: { failure: 0.4, trained: 2, expert: 2.5, master: 2.5, legendary: 2.5 },
  8: { failure: 0.5, trained: 2.5, expert: 3, master: 3, legendary: 3 },
  9: { failure: 0.6, trained: 3, expert: 4, master: 4, legendary: 4 },
  10: { failure: 0.8, trained: 4, expert: 5, master: 6, legendary: 6 },
  11: { failure: 1, trained: 5, expert: 6, master: 8, legendary: 8 },
  12: { failure: 1.3, trained: 6, expert: 8, master: 10, legendary: 10 },
  13: { failure: 1.5, trained: 7, expert: 10, master: 15, legendary: 15 },
  14: { failure: 2, trained: 8, expert: 15, master: 20, legendary: 20 },
  15: { failure: 2.5, trained: 10, expert: 20, master: 28, legendary: 28 },
  16: { failure: 3, trained: 13, expert: 25, master: 36, legendary: 40 },
  17: { failure: 4, trained: 15, expert: 30, master: 45, legendary: 55 },
  18: { failure: 5, trained: 20, expert: 45, master: 70, legendary: 90 },
  19: { failure: 6, trained: 30, expert: 60, master: 100, legendary: 130 },
  20: {
    failure: 0.3,
    trained: 30,
    expert: 35,
    master: 40,
    legendary: 50,
    critical: {
      trained: 35,
      expert: 40,
      master: 50,
      legendary: 60
    }
  }
};

/**
 * Gets the DC for a specific task level
 * 
 * @param level - Task level (0-20)
 * @returns DC for the task level, or 14 (level 0 DC) if level is out of range
 * 
 * Requirements: earned-income-calculation 8.2, 8.4
 */
export function getDCForLevel(level: number): number {
  if (level < 0 || level > 20) {
    return DC_BY_LEVEL[0];
  }
  return DC_BY_LEVEL[level];
}

/**
 * Calculates downtime days based on XP earned and treasure bundles
 * 
 * PFS Rule: "Scenarios and Quests grant two days of Downtime per XP earned.
 * Bounties are missions the PC undertakes during their Downtime and thus grant no Downtime."
 * 
 * Special Case: Series 1 Quests (1 XP + 2.5 TB) grant 2 downtime days
 * 
 * Formula: 
 * - Series 1 Quest (1 XP + 2.5 TB): 2 downtime days
 * - Bounty (1 XP): 0 downtime days
 * - Quest (2 XP): 4 downtime days
 * - Scenario (4 XP): 8 downtime days
 * 
 * @param xpEarned - XP earned from the adventure (1 for Bounty/Series 1 Quest, 2 for Quest, 4 for Scenario)
 * @param treasureBundles - Number of treasure bundles (2.5 indicates Series 1 Quest)
 * @returns Number of downtime days
 * 
 * Requirements: earned-income-calculation 2.1, 2.4
 */
export function calculateDowntimeDays(xpEarned: number, treasureBundles?: number): number {
  // Series 1 Quest: 1 XP + 2.5 TB = 2 downtime days
  if (xpEarned === 1 && treasureBundles === 2.5) {
    return 2;
  }
  
  // Bounty: 1 XP = 0 downtime days
  // Quest: 2 XP = 4 downtime days
  // Scenario: 4 XP = 8 downtime days
  return xpEarned === 1 ? 0 : xpEarned * 2;
}

/**
 * Task level option structure
 */
export interface TaskLevelOption {
  value: string | number;
  label: string;
  dc?: number;
}

/**
 * Calculates task level options for a character
 * Returns array of up to 5 options: ["-", level-3, level-2, level-1, level]
 * All numeric options are floored at 0, duplicates are removed
 * The level-2 option is marked as "(PFS default)"
 * 
 * @param characterLevel - Character level (1-20)
 * @returns Array of task level options with labels and DCs (duplicates removed)
 * 
 * Requirements: earned-income-calculation 1.1, 1.2, 1.4, 1.5, 1.8, 1.9, 8.1, 8.4
 */
export function calculateTaskLevelOptions(characterLevel: number): TaskLevelOption[] {
  const options: TaskLevelOption[] = [];
  
  // First option is always "-" (opt-out)
  options.push({ value: '-', label: '-' });
  
  // Calculate the four character-relative task levels, floored at 0
  const taskLevels = [
    Math.max(characterLevel - 3, 0),  // Infamy
    Math.max(characterLevel - 2, 0),  // Default (PFS default)
    Math.max(characterLevel - 1, 0),  // Feat/boon
    characterLevel                     // Feat/boon
  ];
  
  // Track which task levels we've already added to avoid duplicates
  const addedLevels = new Set<number>();
  
  // Track which task level value should get the PFS default label
  const pfsDefaultLevel = Math.max(characterLevel - 2, 0);
  
  // Add each task level with its DC, skipping duplicates
  for (const taskLevel of taskLevels) {
   
    // Skip if we've already added this level
    if (addedLevels.has(taskLevel)) {
      continue;
    }
    
    addedLevels.add(taskLevel);
    const dc = getDCForLevel(taskLevel);
    
    // Add PFS default label if this is the level-2 option
    const isPfsDefault = taskLevel === pfsDefaultLevel;
    const defaultLabel = isPfsDefault ? ' (PFS default)' : '';
    
    options.push({
      value: taskLevel,
      label: `Level ${taskLevel} (DC ${dc})${defaultLabel}`,
      dc: dc
    });
  }
  
  return options;
}

/**
 * Gets income per day from the income table
 * Handles critical success by treating task level as 1 higher (clamped to 0-20 range)
 * Handles level 20 critical success special case
 * 
 * PFS Rule: "On a critical success, treat your task level as 1 higher to determine results"
 * 
 * @param taskLevel - Task level (0-20 or "-")
 * @param successLevel - Success level (critical_failure, failure, success, critical_success)
 * @param proficiencyRank - Proficiency rank (trained, expert, master, legendary)
 * @returns Income per day in gold pieces
 * 
 * Requirements: earned-income-calculation 3.5, 4.3, 5.1, 5.2, 5.3, 6.2, 6.4, 6.5, 6.6
 */
export function getIncomePerDay(
  taskLevel: number | string,
  successLevel: string,
  proficiencyRank: string
): number {
  // Task level "-" means opt-out, return 0
  if (taskLevel === '-') {
    return 0;
  }
  
  // Critical failure always returns 0
  if (successLevel === 'critical_failure') {
    return 0;
  }
  
  const level = typeof taskLevel === 'string' ? Number.parseInt(taskLevel, 10) : taskLevel;
  
  // Validate task level range
  if (Number.isNaN(level) || level < 0 || level > 20) {
    return 0;
  }
  
  // Handle critical success
  if (successLevel === 'critical_success') {
    // Level 20 critical success has special values
    if (level === 20) {
      const criticalTable = INCOME_TABLE[20].critical as Record<string, number>;
      return criticalTable[proficiencyRank] || 0;
    }
    
    // For other levels, use task level + 1 (clamped to valid range)
    const effectiveLevel = Math.min(level + 1, 20);
    const levelData = INCOME_TABLE[effectiveLevel];
    return (levelData[proficiencyRank] as number) || 0;
  }
  
  // Handle failure
  if (successLevel === 'failure') {
    const levelData = INCOME_TABLE[level];
    return (levelData.failure as number) || 0;
  }
  
  // Handle success (default)
  const levelData = INCOME_TABLE[level];
  return (levelData[proficiencyRank] as number) || 0;
}

/**
 * Calculates total earned income
 * Formula: income per day × downtime days, rounded to 2 decimal places
 * 
 * @param taskLevel - Task level (0-20 or "-")
 * @param successLevel - Success level (critical_failure, failure, success, critical_success)
 * @param proficiencyRank - Proficiency rank (trained, expert, master, legendary)
 * @param downtimeDays - Number of downtime days (0-8)
 * @returns Total earned income in gold pieces, rounded to 2 decimal places
 * 
 * Requirements: earned-income-calculation 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export function calculateEarnedIncome(
  taskLevel: number | string,
  successLevel: string,
  proficiencyRank: string,
  downtimeDays: number
): number {
  // Get income per day
  const incomePerDay = getIncomePerDay(taskLevel, successLevel, proficiencyRank);
  
  // Calculate total income
  const totalIncome = incomePerDay * downtimeDays;
  
  // Round to 2 decimal places
  return Math.round(totalIncome * 100) / 100;
}

/**
 * Formats income value for display
 * 
 * @param value - Income value in gold pieces
 * @returns Formatted string with 2 decimal places and "gp" suffix
 * 
 * Requirements: earned-income-calculation 6.8
 */
export function formatIncomeValue(value: number): string {
  return `${value.toFixed(2)} gp`;
}
