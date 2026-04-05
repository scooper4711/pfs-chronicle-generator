/**
 * Unit tests for party chronicle data mapping functions
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { mapToCharacterData } from '../../scripts/model/party-chronicle-mapper';
import { SharedFields, UniqueFields } from '../../scripts/model/party-chronicle-types';

describe('mapToCharacterData', () => {
  const createMockActor = (actorId: string, currentFaction: string | null = null) => ({
    id: actorId,
    system: {
      pfs: {
        currentFaction
      }
    }
  });

  // Helper to create SharedFields with default earned income fields
  const createSharedFields = (overrides: Partial<SharedFields> = {}): SharedFields => ({
    gmPfsNumber: '12345',
    scenarioName: 'Test Scenario',
    eventCode: 'TEST-001',
    eventDate: '2024-01-15',
    xpEarned: 4,
    adventureSummaryCheckboxes: [],
    strikeoutItems: [],
    treasureBundles: 0,
    layoutId: 'layout-1',
    seasonId: 'season-5',
    blankChroniclePath: '/path/to/chronicle.pdf',
    chosenFactionReputation: 0,
    reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    downtimeDays: 0,
    reportingA: false,
    reportingB: false,
    reportingC: false,
    reportingD: false,
    ...overrides
  });

  // Helper to create UniqueFields with default earned income fields
  const createUniqueFields = (overrides: Partial<UniqueFields> = {}): UniqueFields => ({
    characterName: 'Test Character',
    playerNumber: '12345', characterNumber: '01',
    level: 1,
    taskLevel: '-',
    successLevel: 'success',
    proficiencyRank: 'trained',
    earnedIncome: 0,
    goldSpent: 0,
    notes: '',
    consumeReplay: false,
    ...overrides
  });

  it('should correctly map shared and unique fields to ChronicleData format', () => {
    const shared = createSharedFields({
      gmPfsNumber: '12345',
      scenarioName: 'The Blackwood Lost',
      eventCode: 'PFS-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: ['Found the artifact', 'Saved the village'],
      strikeoutItems: ['Potion of Healing'],
      treasureBundles: 2,
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 2,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      },
      downtimeDays: 4
    });

    const unique = createUniqueFields({
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 3,
      taskLevel: 1,
      successLevel: 'success',
      proficiencyRank: 'trained',
      goldSpent: 10,
      notes: 'Saved the village from bandits'
    });

    const actor = createMockActor('actor-1', 'EA');
    const result = mapToCharacterData(shared, unique, actor);

    // Character identification
    expect(result.char).toBe('Valeros');
    expect(result.societyid).toBe('12345');
    expect(result.char_number).toBe('01');
    expect(result.char_number_short).toBe('1');
    expect(result.level).toBe(3);

    // Event details
    expect(result.gmid).toBe('12345');
    expect(result.event).toBe('The Blackwood Lost');
    expect(result.eventcode).toBe('PFS-001');
    expect(result.date).toBe('2024-01-15');

    // Rewards - calculated values
    expect(result.xp_gained).toBe(4);
    // Earned income: level 1 trained = 0.2 gp/day × 4 days = 0.8 gp
    expect(result.income_earned).toBe(0.8);
    // Level 3 treasure bundle value is 3.8, so 2 × 3.8 = 7.6
    expect(result.treasure_bundles_gp).toBe(7.6);
    // gp_gained = treasure_bundles_gp + income_earned = 7.6 + 0.8 = 8.4
    expect(result.gp_gained).toBe(8.4);
    expect(result.gp_spent).toBe(10);

    // Notes and reputation (reputation is now calculated)
    expect(result.notes).toBe('Saved the village from bandits');
    expect(result.reputation).toEqual(["Envoy's Alliance: +4"]); // 2 (faction-specific) + 2 (chosen)

    // Layout-dependent selections
    expect(result.summary_checkbox).toEqual(['Found the artifact', 'Saved the village']);
    expect(result.strikeout_item_lines).toEqual(['Potion of Healing']);

    // Treasure bundles
    expect(result.treasure_bundles).toBe('2');
  });

  it('should handle empty arrays for checkboxes and strikeouts', () => {
    const shared = createSharedFields({
      downtimeDays: 0
    });

    const unique = createUniqueFields({
      characterName: 'Seoni',
      playerNumber: '67890', characterNumber: '02',
      level: 5,
      taskLevel: '-',
      goldSpent: 0,
      notes: ''
    });

    const actor = createMockActor('actor-2', null);
    const result = mapToCharacterData(shared, unique, actor);

    expect(result.summary_checkbox).toEqual([]);
    expect(result.strikeout_item_lines).toEqual([]);
    expect(result.treasure_bundles).toBe('0');
    expect(result.notes).toBe('');
    expect(result.reputation).toEqual([]); // No reputation since all values are 0
    // With 0 treasure bundles, treasure_bundles_gp should be 0
    expect(result.treasure_bundles_gp).toBe(0);
    // With task level "-", income_earned should be 0
    expect(result.income_earned).toBe(0);
    // gp_gained = 0 + 0 = 0
    expect(result.gp_gained).toBe(0);
  });

  it('should handle zero values correctly', () => {
    const shared = createSharedFields({
      xpEarned: 0,
      downtimeDays: 0
    });

    const unique = createUniqueFields({
      characterName: 'Kyra',
      playerNumber: '11111', characterNumber: '03',
      level: 1,
      taskLevel: '-',
      goldSpent: 0,
      notes: ''
    });

    const actor = createMockActor('actor-3', null);
    const result = mapToCharacterData(shared, unique, actor);

    expect(result.xp_gained).toBe(0);
    expect(result.income_earned).toBe(0);
    expect(result.treasure_bundles_gp).toBe(0);
    expect(result.gp_gained).toBe(0);
    expect(result.gp_spent).toBe(0);
  });

  it('should preserve special characters in text fields', () => {
    const shared = createSharedFields({
      scenarioName: 'The Dragon\'s "Lair" & More',
      adventureSummaryCheckboxes: ['Choice with "quotes"'],
      strikeoutItems: ['Item with \'apostrophe\''],
      treasureBundles: 3,
      downtimeDays: 2
    });

    const unique = createUniqueFields({
      characterName: 'O\'Brien',
      playerNumber: '12345', characterNumber: '01',
      level: 3,
      taskLevel: 2,
      successLevel: 'success',
      proficiencyRank: 'trained',
      goldSpent: 10,
      notes: 'Notes with "quotes" & special chars'
    });

    const actor = createMockActor('actor-4', null);
    const result = mapToCharacterData(shared, unique, actor);

    expect(result.char).toBe('O\'Brien');
    expect(result.event).toBe('The Dragon\'s "Lair" & More');
    expect(result.notes).toBe('Notes with "quotes" & special chars');
    expect(result.summary_checkbox).toEqual(['Choice with "quotes"']);
    expect(result.strikeout_item_lines).toEqual(['Item with \'apostrophe\'']);
  });

  it('should calculate treasure_bundles_gp correctly for various levels', () => {
    const shared = createSharedFields({
      treasureBundles: 3,
      downtimeDays: 0
    });

    const actor = createMockActor('actor-test', null);

    // Test level 1: 3 × 1.4 = 4.2
    const unique1 = createUniqueFields({
      characterName: 'Test1',
      playerNumber: '12345', characterNumber: '01',
      level: 1,
      taskLevel: '-'
    });
    const result1 = mapToCharacterData(shared, unique1, actor);
    expect(result1.treasure_bundles_gp).toBe(4.2);
    expect(result1.gp_gained).toBe(4.2);

    // Test level 10: 3 × 60 = 180
    const unique10 = createUniqueFields({
      characterName: 'Test10',
      playerNumber: '12345', characterNumber: '02',
      level: 10,
      taskLevel: '-'
    });
    const result10 = mapToCharacterData(shared, unique10, actor);
    expect(result10.treasure_bundles_gp).toBe(180);
    expect(result10.gp_gained).toBe(180);

    // Test level 20: 3 × 3680 = 11040
    const unique20 = createUniqueFields({
      characterName: 'Test20',
      playerNumber: '12345', characterNumber: '03',
      level: 20,
      taskLevel: '-'
    });
    const result20 = mapToCharacterData(shared, unique20, actor);
    expect(result20.treasure_bundles_gp).toBe(11040);
    expect(result20.gp_gained).toBe(11040);
  });

  it('should calculate gp_gained as treasure_bundles_gp + income_earned', () => {
    const shared = createSharedFields({
      treasureBundles: 2,
      downtimeDays: 3
    });

    const unique = createUniqueFields({
      characterName: 'Test',
      playerNumber: '12345', characterNumber: '01',
      level: 5,
      taskLevel: 3,
      successLevel: 'success',
      proficiencyRank: 'trained',
      goldSpent: 0,
      notes: ''
    });

    const actor = createMockActor('actor-test', null);
    const result = mapToCharacterData(shared, unique, actor);

    // Level 5: 2 × 10 = 20
    expect(result.treasure_bundles_gp).toBe(20);
    // Level 3 trained success: 0.5 gp/day × 3 days = 1.5 gp
    expect(result.income_earned).toBe(1.5);
    // gp_gained = 20 + 1.5 = 21.5
    expect(result.gp_gained).toBe(21.5);
  });

  it('should use exact parameter names for PDF compatibility', () => {
    const shared = createSharedFields({
      treasureBundles: 1,
      downtimeDays: 2
    });

    const unique = createUniqueFields({
      characterName: 'Test',
      playerNumber: '12345', characterNumber: '01',
      level: 1,
      taskLevel: 0,
      successLevel: 'success',
      proficiencyRank: 'trained',
      goldSpent: 0,
      notes: ''
    });

    const actor = createMockActor('actor-test', null);
    const result = mapToCharacterData(shared, unique, actor);

    // Verify exact parameter names exist
    expect(result).toHaveProperty('treasure_bundles_gp');
    expect(result).toHaveProperty('gp_gained');
    expect(result).toHaveProperty('income_earned');
    
    // Verify no legacy goldEarned field
    expect(result).not.toHaveProperty('goldEarned');
  });
});

describe('mapToCharacterData - Earned Income Calculation', () => {
  const createMockActor = (actorId: string, currentFaction: string | null = null) => ({
    id: actorId,
    system: {
      pfs: {
        currentFaction
      }
    }
  });

  // Helper to create SharedFields with default earned income fields
  const createSharedFields = (overrides: Partial<SharedFields> = {}): SharedFields => ({
    gmPfsNumber: '12345',
    scenarioName: 'Test Scenario',
    eventCode: 'TEST-001',
    eventDate: '2024-01-15',
    xpEarned: 4,
    adventureSummaryCheckboxes: [],
    strikeoutItems: [],
    treasureBundles: 0,
    layoutId: 'layout-1',
    seasonId: 'season-5',
    blankChroniclePath: '/path/to/chronicle.pdf',
    chosenFactionReputation: 0,
    reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
    downtimeDays: 0,
    reportingA: false,
    reportingB: false,
    reportingC: false,
    reportingD: false,
    ...overrides
  });

  // Helper to create UniqueFields with default earned income fields
  const createUniqueFields = (overrides: Partial<UniqueFields> = {}): UniqueFields => ({
    characterName: 'Test Character',
    playerNumber: '12345', characterNumber: '01',
    level: 1,
    taskLevel: '-',
    successLevel: 'success',
    proficiencyRank: 'trained',
    earnedIncome: 0,
    goldSpent: 0,
    notes: '',
    consumeReplay: false,
    ...overrides
  });

  /**
   * Requirements: earned-income-calculation 6.1, 6.2, 6.3
   */
  it('should calculate correct income_earned for various input combinations', () => {
    const actor = createMockActor('actor-test', null);

    // Test case 1: Level 1 trained success, 4 downtime days
    // Expected: 0.2 gp/day × 4 days = 0.8 gp
    const shared1 = createSharedFields({ downtimeDays: 4 });
    const unique1 = createUniqueFields({
      level: 3,
      taskLevel: 1,
      successLevel: 'success',
      proficiencyRank: 'trained'
    });
    const result1 = mapToCharacterData(shared1, unique1, actor);
    expect(result1.income_earned).toBe(0.8);

    // Test case 2: Level 5 expert success, 3 downtime days
    // Expected: 1 gp/day × 3 days = 3 gp
    const shared2 = createSharedFields({ downtimeDays: 3 });
    const unique2 = createUniqueFields({
      level: 7,
      taskLevel: 5,
      successLevel: 'success',
      proficiencyRank: 'expert'
    });
    const result2 = mapToCharacterData(shared2, unique2, actor);
    expect(result2.income_earned).toBe(3);

    // Test case 3: Level 10 master success, 2 downtime days
    // Expected: 6 gp/day × 2 days = 12 gp
    const shared3 = createSharedFields({ downtimeDays: 2 });
    const unique3 = createUniqueFields({
      level: 12,
      taskLevel: 10,
      successLevel: 'success',
      proficiencyRank: 'master'
    });
    const result3 = mapToCharacterData(shared3, unique3, actor);
    expect(result3.income_earned).toBe(12);

    // Test case 4: Level 15 legendary success, 8 downtime days
    // Expected: 28 gp/day × 8 days = 224 gp
    const shared4 = createSharedFields({ downtimeDays: 8 });
    const unique4 = createUniqueFields({
      level: 17,
      taskLevel: 15,
      successLevel: 'success',
      proficiencyRank: 'legendary'
    });
    const result4 = mapToCharacterData(shared4, unique4, actor);
    expect(result4.income_earned).toBe(224);

    // Test case 5: Level 3 failure, 5 downtime days
    // Expected: 0.08 gp/day × 5 days = 0.4 gp
    const shared5 = createSharedFields({ downtimeDays: 5 });
    const unique5 = createUniqueFields({
      level: 5,
      taskLevel: 3,
      successLevel: 'failure',
      proficiencyRank: 'trained'
    });
    const result5 = mapToCharacterData(shared5, unique5, actor);
    expect(result5.income_earned).toBe(0.4);
  });

  /**
   * Requirements: earned-income-calculation 6.6
   */
  it('should produce income_earned = 0 when task level is "-"', () => {
    const actor = createMockActor('actor-test', null);

    // Test with various downtime days and proficiency ranks
    const testCases = [
      { downtimeDays: 0, proficiencyRank: 'trained' },
      { downtimeDays: 4, proficiencyRank: 'expert' },
      { downtimeDays: 8, proficiencyRank: 'master' },
      { downtimeDays: 5, proficiencyRank: 'legendary' }
    ];

    testCases.forEach(({ downtimeDays, proficiencyRank }) => {
      const shared = createSharedFields({ downtimeDays });
      const unique = createUniqueFields({
        level: 5,
        taskLevel: '-',
        successLevel: 'success',
        proficiencyRank
      });
      const result = mapToCharacterData(shared, unique, actor);
      expect(result.income_earned).toBe(0);
    });
  });

  /**
   * Requirements: earned-income-calculation 3.4, 6.2
   */
  it('should produce income_earned = 0 when success level is critical_failure', () => {
    const actor = createMockActor('actor-test', null);

    // Test with various task levels and downtime days
    const testCases = [
      { taskLevel: 0, downtimeDays: 4 },
      { taskLevel: 5, downtimeDays: 8 },
      { taskLevel: 10, downtimeDays: 2 },
      { taskLevel: 20, downtimeDays: 5 }
    ];

    testCases.forEach(({ taskLevel, downtimeDays }) => {
      const shared = createSharedFields({ downtimeDays });
      const unique = createUniqueFields({
        level: 10,
        taskLevel,
        successLevel: 'critical_failure',
        proficiencyRank: 'trained'
      });
      const result = mapToCharacterData(shared, unique, actor);
      expect(result.income_earned).toBe(0);
    });
  });

  /**
   * Requirements: earned-income-calculation 3.5, 6.4
   */
  it('should use task level + 1 for critical success', () => {
    const actor = createMockActor('actor-test', null);

    // Test case 1: Level 5 trained critical success, 4 downtime days
    // Should use level 6 income: 1.5 gp/day × 4 days = 6 gp
    const shared1 = createSharedFields({ downtimeDays: 4 });
    const unique1 = createUniqueFields({
      level: 7,
      taskLevel: 5,
      successLevel: 'critical_success',
      proficiencyRank: 'trained'
    });
    const result1 = mapToCharacterData(shared1, unique1, actor);
    expect(result1.income_earned).toBe(6);

    // Test case 2: Level 10 expert critical success, 3 downtime days
    // Should use level 11 income: 6 gp/day × 3 days = 18 gp
    const shared2 = createSharedFields({ downtimeDays: 3 });
    const unique2 = createUniqueFields({
      level: 12,
      taskLevel: 10,
      successLevel: 'critical_success',
      proficiencyRank: 'expert'
    });
    const result2 = mapToCharacterData(shared2, unique2, actor);
    expect(result2.income_earned).toBe(18);

    // Test case 3: Level 15 master critical success, 2 downtime days
    // Should use level 16 income: 36 gp/day × 2 days = 72 gp
    const shared3 = createSharedFields({ downtimeDays: 2 });
    const unique3 = createUniqueFields({
      level: 17,
      taskLevel: 15,
      successLevel: 'critical_success',
      proficiencyRank: 'master'
    });
    const result3 = mapToCharacterData(shared3, unique3, actor);
    expect(result3.income_earned).toBe(72);
  });

  /**
   * Requirements: earned-income-calculation 3.6, 6.5
   */
  it('should use special values for level 20 critical success', () => {
    const actor = createMockActor('actor-test', null);

    // Test all proficiency ranks with level 20 critical success
    const testCases = [
      { proficiencyRank: 'trained', expectedPerDay: 50, downtimeDays: 4, expectedTotal: 200 },
      { proficiencyRank: 'expert', expectedPerDay: 90, downtimeDays: 3, expectedTotal: 270 },
      { proficiencyRank: 'master', expectedPerDay: 175, downtimeDays: 2, expectedTotal: 350 },
      { proficiencyRank: 'legendary', expectedPerDay: 300, downtimeDays: 5, expectedTotal: 1500 }
    ];

    testCases.forEach(({ proficiencyRank, downtimeDays, expectedTotal }) => {
      const shared = createSharedFields({ downtimeDays });
      const unique = createUniqueFields({
        level: 20,
        taskLevel: 20,
        successLevel: 'critical_success',
        proficiencyRank
      });
      const result = mapToCharacterData(shared, unique, actor);
      expect(result.income_earned).toBe(expectedTotal);
    });
  });

  /**
   * Requirements: earned-income-calculation 12.1
   */
  it('should use parameter name exactly as income_earned', () => {
    const actor = createMockActor('actor-test', null);
    const shared = createSharedFields({ downtimeDays: 4 });
    const unique = createUniqueFields({
      level: 5,
      taskLevel: 3,
      successLevel: 'success',
      proficiencyRank: 'trained'
    });

    const result = mapToCharacterData(shared, unique, actor);

    // Verify the exact parameter name
    expect(result).toHaveProperty('income_earned');
    expect(typeof result.income_earned).toBe('number');
    
    // Verify no alternative names exist
    expect(result).not.toHaveProperty('incomeEarned');
    expect(result).not.toHaveProperty('earnedIncome');
    expect(result).not.toHaveProperty('income');
  });

  /**
   * Requirements: earned-income-calculation 12.2, 12.3
   */
  it('should include both treasure_bundles_gp and income_earned in gp_gained', () => {
    const actor = createMockActor('actor-test', null);

    // Test case 1: Both treasure bundles and earned income
    const shared1 = createSharedFields({
      treasureBundles: 2,
      downtimeDays: 4
    });
    const unique1 = createUniqueFields({
      level: 5,
      taskLevel: 3,
      successLevel: 'success',
      proficiencyRank: 'trained'
    });
    const result1 = mapToCharacterData(shared1, unique1, actor);
    // Level 5: 2 × 10 = 20 gp (treasure bundles)
    // Level 3 trained: 0.5 gp/day × 4 days = 2 gp (earned income)
    // Total: 20 + 2 = 22 gp
    expect(result1.treasure_bundles_gp).toBe(20);
    expect(result1.income_earned).toBe(2);
    expect(result1.gp_gained).toBe(22);

    // Test case 2: Only treasure bundles (task level "-")
    const shared2 = createSharedFields({
      treasureBundles: 3,
      downtimeDays: 4
    });
    const unique2 = createUniqueFields({
      level: 10,
      taskLevel: '-',
      successLevel: 'success',
      proficiencyRank: 'trained'
    });
    const result2 = mapToCharacterData(shared2, unique2, actor);
    // Level 10: 3 × 60 = 180 gp (treasure bundles)
    // Task level "-": 0 gp (earned income)
    // Total: 180 + 0 = 180 gp
    expect(result2.treasure_bundles_gp).toBe(180);
    expect(result2.income_earned).toBe(0);
    expect(result2.gp_gained).toBe(180);

    // Test case 3: Only earned income (no treasure bundles)
    const shared3 = createSharedFields({
      treasureBundles: 0,
      downtimeDays: 8
    });
    const unique3 = createUniqueFields({
      level: 15,
      taskLevel: 13,
      successLevel: 'success',
      proficiencyRank: 'master'
    });
    const result3 = mapToCharacterData(shared3, unique3, actor);
    // No treasure bundles: 0 gp
    // Level 13 master: 15 gp/day × 8 days = 120 gp (earned income)
    // Total: 0 + 120 = 120 gp
    expect(result3.treasure_bundles_gp).toBe(0);
    expect(result3.income_earned).toBe(120);
    expect(result3.gp_gained).toBe(120);

    // Test case 4: Neither (task level "-" and no treasure bundles)
    const shared4 = createSharedFields({
      treasureBundles: 0,
      downtimeDays: 4
    });
    const unique4 = createUniqueFields({
      level: 5,
      taskLevel: '-',
      successLevel: 'success',
      proficiencyRank: 'trained'
    });
    const result4 = mapToCharacterData(shared4, unique4, actor);
    // No treasure bundles: 0 gp
    // Task level "-": 0 gp (earned income)
    // Total: 0 + 0 = 0 gp
    expect(result4.treasure_bundles_gp).toBe(0);
    expect(result4.income_earned).toBe(0);
    expect(result4.gp_gained).toBe(0);
  });

  /**
   * Requirements: earned-income-calculation 6.7
   */
  it('should round income_earned to 2 decimal places', () => {
    const actor = createMockActor('actor-test', null);

    // Test case that would produce more than 2 decimal places
    // Level 0 trained: 0.05 gp/day × 3 days = 0.15 gp (exact)
    const shared1 = createSharedFields({ downtimeDays: 3 });
    const unique1 = createUniqueFields({
      level: 2,
      taskLevel: 0,
      successLevel: 'success',
      proficiencyRank: 'trained'
    });
    const result1 = mapToCharacterData(shared1, unique1, actor);
    expect(result1.income_earned).toBe(0.15);
    expect(result1.income_earned.toString()).toMatch(/^\d+\.\d{1,2}$/);

    // Test case with potential rounding
    // Level 1 trained: 0.2 gp/day × 3 days = 0.6 gp (exact)
    const shared2 = createSharedFields({ downtimeDays: 3 });
    const unique2 = createUniqueFields({
      level: 3,
      taskLevel: 1,
      successLevel: 'success',
      proficiencyRank: 'trained'
    });
    const result2 = mapToCharacterData(shared2, unique2, actor);
    expect(result2.income_earned).toBe(0.6);
    expect(result2.income_earned.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
  });
});

describe('Property 6: Data Combination Correctness', () => {
  // Feature: party-chronicle-filling, Property 6: Data combination correctness
  it('should contain both all shared field values and character-specific unique field values', () => {
    const sharedFieldsArb = fc.record({
      gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
      scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
      eventCode: fc.string({ minLength: 1, maxLength: 50 }),
      eventDate: fc.string({ minLength: 1, maxLength: 20 }),
      xpEarned: fc.integer({ min: 0, max: 20 }),
      adventureSummaryCheckboxes: fc.array(fc.string(), { maxLength: 10 }),
      strikeoutItems: fc.array(fc.string(), { maxLength: 20 }),
      treasureBundles: fc.integer({ min: 0, max: 10 }),
      layoutId: fc.string({ minLength: 1, maxLength: 50 }),
      seasonId: fc.string({ minLength: 1, maxLength: 50 }),
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 }),
      chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
      reputationValues: fc.record({
        EA: fc.integer({ min: 0, max: 9 }),
        GA: fc.integer({ min: 0, max: 9 }),
        HH: fc.integer({ min: 0, max: 9 }),
        VS: fc.integer({ min: 0, max: 9 }),
        RO: fc.integer({ min: 0, max: 9 }),
        VW: fc.integer({ min: 0, max: 9 })
      }),
      downtimeDays: fc.integer({ min: 0, max: 8 }),
      reportingA: fc.boolean(),
      reportingB: fc.boolean(),
      reportingC: fc.boolean(),
      reportingD: fc.boolean(),
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      playerNumber: fc.stringMatching(/^\d{1,10}$/),
      characterNumber: fc.stringMatching(/^2\d{1,5}$/),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.oneof(fc.constant('-'), fc.integer({ min: 0, max: 20 })),
      successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
      proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
      earnedIncome: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.string({ maxLength: 500 }),
      consumeReplay: fc.boolean(),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const mockActor = { id: 'test-actor-id', system: { pfs: { currentFaction: 'EA' } } };
        const result = mapToCharacterData(shared, unique, mockActor);

        // Verify all shared fields are present in the result
        expect(result.gmid).toBe(shared.gmPfsNumber);
        expect(result.event).toBe(shared.scenarioName);
        expect(result.eventcode).toBe(shared.eventCode);
        expect(result.date).toBe(shared.eventDate);
        expect(result.xp_gained).toBe(shared.xpEarned);
        expect(result.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
        expect(result.strikeout_item_lines).toEqual(shared.strikeoutItems);
        expect(result.treasure_bundles).toBe(shared.treasureBundles.toString());

        // Verify society ID fields are mapped correctly
        expect(result.societyid).toBe(unique.playerNumber);
        expect(result.char_number).toBe(unique.characterNumber);
        expect(result.char_number_short).toBe(unique.characterNumber.substring(1));
        expect(result.char).toBe(unique.characterName);
        expect(result.level).toBe(unique.level);
        expect(result.gp_spent).toBe(unique.goldSpent);
        expect(result.notes).toBe(unique.notes);
        
        // Verify calculated fields exist and are numbers
        expect(typeof result.income_earned).toBe('number');
        expect(typeof result.treasure_bundles_gp).toBe('number');
        expect(typeof result.gp_gained).toBe('number');
        expect(result.gp_gained).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve exact values without modification or loss', () => {
    // Feature: party-chronicle-filling, Property 6: Data combination correctness (value preservation)
    const sharedFieldsArb = fc.record({
      gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
      scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
      eventCode: fc.string({ minLength: 1, maxLength: 50 }),
      eventDate: fc.string({ minLength: 1, maxLength: 20 }),
      xpEarned: fc.integer({ min: 0, max: 20 }),
      adventureSummaryCheckboxes: fc.array(fc.string(), { maxLength: 10 }),
      strikeoutItems: fc.array(fc.string(), { maxLength: 20 }),
      treasureBundles: fc.integer({ min: 0, max: 10 }),
      layoutId: fc.string({ minLength: 1, maxLength: 50 }),
      seasonId: fc.string({ minLength: 1, maxLength: 50 }),
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 }),
      chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
      reputationValues: fc.record({
        EA: fc.integer({ min: 0, max: 9 }),
        GA: fc.integer({ min: 0, max: 9 }),
        HH: fc.integer({ min: 0, max: 9 }),
        VS: fc.integer({ min: 0, max: 9 }),
        RO: fc.integer({ min: 0, max: 9 }),
        VW: fc.integer({ min: 0, max: 9 })
      }),
      downtimeDays: fc.integer({ min: 0, max: 8 }),
      reportingA: fc.boolean(),
      reportingB: fc.boolean(),
      reportingC: fc.boolean(),
      reportingD: fc.boolean(),
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      playerNumber: fc.stringMatching(/^\d{1,10}$/),
      characterNumber: fc.stringMatching(/^2\d{1,5}$/),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.oneof(fc.constant('-'), fc.integer({ min: 0, max: 20 })),
      successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
      proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
      earnedIncome: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.string({ maxLength: 500 }),
      consumeReplay: fc.boolean(),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const mockActor = { id: 'test-actor-id', system: { pfs: { currentFaction: 'EA' } } };
        const result = mapToCharacterData(shared, unique, mockActor);

        // Verify no data transformation or loss occurs
        expect(result.gmid).toStrictEqual(shared.gmPfsNumber);
        expect(result.event).toStrictEqual(shared.scenarioName);
        expect(result.eventcode).toStrictEqual(shared.eventCode);
        expect(result.date).toStrictEqual(shared.eventDate);
        expect(result.char).toStrictEqual(unique.characterName);
        expect(result.societyid).toStrictEqual(unique.playerNumber);
        expect(result.char_number).toStrictEqual(unique.characterNumber);
        expect(result.char_number_short).toStrictEqual(unique.characterNumber.substring(1));
        expect(result.notes).toStrictEqual(unique.notes);
        expect(result.reputation).toBeDefined();
        expect(result.treasure_bundles).toStrictEqual(shared.treasureBundles.toString());

        // Numeric fields should be identical
        expect(result.xp_gained).toStrictEqual(shared.xpEarned);
        expect(result.level).toStrictEqual(unique.level);
        expect(result.gp_spent).toStrictEqual(unique.goldSpent);
        
        // Calculated fields should be numbers
        expect(typeof result.income_earned).toBe('number');
        expect(typeof result.treasure_bundles_gp).toBe('number');
        expect(typeof result.gp_gained).toBe('number');

        // Array fields should be identical (deep equality)
        expect(result.summary_checkbox).toStrictEqual(shared.adventureSummaryCheckboxes);
        expect(result.strikeout_item_lines).toStrictEqual(shared.strikeoutItems);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty arrays and empty strings correctly', () => {
    // Feature: party-chronicle-filling, Property 6: Data combination correctness (empty values)
    const sharedFieldsArb = fc.record({
      gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
      scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
      eventCode: fc.string({ minLength: 1, maxLength: 50 }),
      eventDate: fc.string({ minLength: 1, maxLength: 20 }),
      xpEarned: fc.integer({ min: 0, max: 20 }),
      adventureSummaryCheckboxes: fc.constant([] as string[]),
      strikeoutItems: fc.constant([] as string[]),
      treasureBundles: fc.constant(0),
      layoutId: fc.string({ minLength: 1, maxLength: 50 }),
      seasonId: fc.string({ minLength: 1, maxLength: 50 }),
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 }),
      chosenFactionReputation: fc.constant(0),
      reputationValues: fc.constant({
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }),
      downtimeDays: fc.integer({ min: 0, max: 8 }),
      reportingA: fc.boolean(),
      reportingB: fc.boolean(),
      reportingC: fc.boolean(),
      reportingD: fc.boolean(),
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      playerNumber: fc.stringMatching(/^\d{1,10}$/),
      characterNumber: fc.stringMatching(/^2\d{1,5}$/),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.constant('-'),
      successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
      proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
      earnedIncome: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.constant(''),
      consumeReplay: fc.boolean()
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const mockActor = { id: 'test-actor-id', system: { pfs: { currentFaction: 'EA' } } };
        const result = mapToCharacterData(shared, unique, mockActor);

        // Verify empty arrays are preserved
        expect(result.summary_checkbox).toEqual([]);
        expect(result.strikeout_item_lines).toEqual([]);

        // Verify zero value is converted to string
        expect(result.treasure_bundles).toBe('0');
        expect(result.notes).toBe('');
        expect(result.reputation).toEqual([]);
        
        // With 0 treasure bundles, treasure_bundles_gp should be 0
        expect(result.treasure_bundles_gp).toBe(0);
        // With task level "-", income_earned should be 0
        expect(result.income_earned).toBe(0);
        // gp_gained should be 0 when both are 0
        expect(result.gp_gained).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle zero values correctly', () => {
    // Feature: party-chronicle-filling, Property 6: Data combination correctness (zero values)
    const sharedFieldsArb = fc.record({
      gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
      scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
      eventCode: fc.string({ minLength: 1, maxLength: 50 }),
      eventDate: fc.string({ minLength: 1, maxLength: 20 }),
      xpEarned: fc.constant(0),
      adventureSummaryCheckboxes: fc.array(fc.string(), { maxLength: 10 }),
      strikeoutItems: fc.array(fc.string(), { maxLength: 20 }),
      treasureBundles: fc.integer({ min: 0, max: 10 }),
      layoutId: fc.string({ minLength: 1, maxLength: 50 }),
      seasonId: fc.string({ minLength: 1, maxLength: 50 }),
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 }),
      chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
      reputationValues: fc.record({
        EA: fc.integer({ min: 0, max: 9 }),
        GA: fc.integer({ min: 0, max: 9 }),
        HH: fc.integer({ min: 0, max: 9 }),
        VS: fc.integer({ min: 0, max: 9 }),
        RO: fc.integer({ min: 0, max: 9 }),
        VW: fc.integer({ min: 0, max: 9 })
      }),
      downtimeDays: fc.integer({ min: 0, max: 8 }),
      reportingA: fc.boolean(),
      reportingB: fc.boolean(),
      reportingC: fc.boolean(),
      reportingD: fc.boolean(),
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      playerNumber: fc.stringMatching(/^\d{1,10}$/),
      characterNumber: fc.stringMatching(/^2\d{1,5}$/),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.constant('-'),
      successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
      proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
      earnedIncome: fc.constant(0),
      goldSpent: fc.constant(0),
      notes: fc.string({ maxLength: 500 }),
      consumeReplay: fc.boolean(),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const mockActor = { id: 'test-actor-id', system: { pfs: { currentFaction: 'EA' } } };
        const result = mapToCharacterData(shared, unique, mockActor);

        // Verify zero values are preserved (not treated as falsy)
        expect(result.xp_gained).toBe(0);
        expect(result.income_earned).toBe(0);
        expect(result.gp_spent).toBe(0);
        
        // treasure_bundles_gp and gp_gained depend on treasure bundles
        expect(typeof result.treasure_bundles_gp).toBe('number');
        expect(typeof result.gp_gained).toBe('number');
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve special characters and unicode in all string fields', () => {
    // Feature: party-chronicle-filling, Property 6: Data combination correctness (special characters)
    const stringArb = fc.string({ minLength: 0, maxLength: 100 });

    const sharedFieldsArb = fc.record({
      gmPfsNumber: stringArb,
      scenarioName: stringArb,
      eventCode: stringArb,
      eventDate: stringArb,
      xpEarned: fc.integer({ min: 0, max: 20 }),
      adventureSummaryCheckboxes: fc.array(stringArb, { maxLength: 5 }),
      strikeoutItems: fc.array(stringArb, { maxLength: 5 }),
      treasureBundles: fc.integer({ min: 0, max: 10 }),
      layoutId: stringArb,
      seasonId: stringArb,
      blankChroniclePath: stringArb,
      chosenFactionReputation: fc.integer({ min: 0, max: 9 }),
      reputationValues: fc.record({
        EA: fc.integer({ min: 0, max: 9 }),
        GA: fc.integer({ min: 0, max: 9 }),
        HH: fc.integer({ min: 0, max: 9 }),
        VS: fc.integer({ min: 0, max: 9 }),
        RO: fc.integer({ min: 0, max: 9 }),
        VW: fc.integer({ min: 0, max: 9 })
      }),
      downtimeDays: fc.integer({ min: 0, max: 8 }),
      reportingA: fc.boolean(),
      reportingB: fc.boolean(),
      reportingC: fc.boolean(),
      reportingD: fc.boolean(),
    });

    const uniqueFieldsArb = fc.record({
      characterName: stringArb,
      playerNumber: fc.stringMatching(/^\d{1,10}$/),
      characterNumber: fc.stringMatching(/^2\d{1,5}$/),
      level: fc.integer({ min: 1, max: 20 }),
      taskLevel: fc.oneof(fc.constant('-'), fc.integer({ min: 0, max: 20 })),
      successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
      proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
      earnedIncome: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: stringArb,
      consumeReplay: fc.boolean(),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const mockActor = { id: 'test-actor-id', system: { pfs: { currentFaction: 'EA' } } };
        const result = mapToCharacterData(shared, unique, mockActor);

        // Verify all string fields preserve special characters and unicode
        expect(result.gmid).toBe(shared.gmPfsNumber);
        expect(result.event).toBe(shared.scenarioName);
        expect(result.eventcode).toBe(shared.eventCode);
        expect(result.date).toBe(shared.eventDate);
        expect(result.char).toBe(unique.characterName);
        expect(result.societyid).toBe(unique.playerNumber);
        expect(result.char_number).toBe(unique.characterNumber);
        expect(result.char_number_short).toBe(unique.characterNumber.substring(1));
        expect(result.notes).toBe(unique.notes);
        expect(result.treasure_bundles).toBe(shared.treasureBundles.toString());

        // Verify array elements preserve special characters
        expect(result.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
        expect(result.strikeout_item_lines).toEqual(shared.strikeoutItems);
      }),
      { numRuns: 100 }
    );
  });
});
