/**
 * Unit tests for party chronicle data mapping functions
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { mapToCharacterData } from './party-chronicle-mapper';
import { SharedFields, UniqueFields } from './party-chronicle-types';

describe('mapToCharacterData', () => {
  it('should correctly map shared and unique fields to ChronicleData format', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'The Blackwood Lost',
      eventCode: 'PFS-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: ['Found the artifact', 'Saved the village'],
      strikeoutItems: ['Potion of Healing'],
      treasureBundles: 2,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const unique: UniqueFields = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: 'Saved the village from bandits',
      reputation: 'Envoy\'s Alliance: +2'
    };

    const result = mapToCharacterData(shared, unique);

    // Character identification
    expect(result.char).toBe('Valeros');
    expect(result.societyid).toBe('12345-01');
    expect(result.level).toBe(3);

    // Event details
    expect(result.gmid).toBe('12345');
    expect(result.event).toBe('The Blackwood Lost');
    expect(result.eventcode).toBe('PFS-001');
    expect(result.date).toBe('2024-01-15');

    // Rewards
    expect(result.xp_gained).toBe(4);
    expect(result.income_earned).toBe(8);
    expect(result.gp_gained).toBe(24);
    expect(result.gp_spent).toBe(10);

    // Notes and reputation
    expect(result.notes).toBe('Saved the village from bandits');
    expect(result.reputation).toBe('Envoy\'s Alliance: +2');

    // Layout-dependent selections
    expect(result.summary_checkbox).toEqual(['Found the artifact', 'Saved the village']);
    expect(result.strikeout_item_lines).toEqual(['Potion of Healing']);

    // Treasure bundles
    expect(result.treasure_bundles).toBe('2');
  });

  it('should handle empty arrays for checkboxes and strikeouts', () => {
    const shared: SharedFields = {
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
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const unique: UniqueFields = {
      characterName: 'Seoni',
      societyId: '67890-02',
      level: 5,
      incomeEarned: 12,
      goldEarned: 36,
      goldSpent: 0,
      notes: '',
      reputation: ''
    };

    const result = mapToCharacterData(shared, unique);

    expect(result.summary_checkbox).toEqual([]);
    expect(result.strikeout_item_lines).toEqual([]);
    expect(result.treasure_bundles).toBe('0');
    expect(result.notes).toBe('');
    expect(result.reputation).toBe('');
  });

  it('should handle zero values correctly', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'Test Scenario',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 0,
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      treasureBundles: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const unique: UniqueFields = {
      characterName: 'Kyra',
      societyId: '11111-03',
      level: 1,
      incomeEarned: 0,
      goldEarned: 0,
      goldSpent: 0,
      notes: '',
      reputation: ''
    };

    const result = mapToCharacterData(shared, unique);

    expect(result.xp_gained).toBe(0);
    expect(result.income_earned).toBe(0);
    expect(result.gp_gained).toBe(0);
    expect(result.gp_spent).toBe(0);
  });

  it('should preserve special characters in text fields', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'The Dragon\'s "Lair" & More',
      eventCode: 'PFS-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: ['Choice with "quotes"'],
      strikeoutItems: ['Item with \'apostrophe\''],
      treasureBundles: 3,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const unique: UniqueFields = {
      characterName: 'O\'Brien',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: 'Notes with "quotes" & special chars',
      reputation: 'Faction: +2'
    };

    const result = mapToCharacterData(shared, unique);

    expect(result.char).toBe('O\'Brien');
    expect(result.event).toBe('The Dragon\'s "Lair" & More');
    expect(result.notes).toBe('Notes with "quotes" & special chars');
    expect(result.summary_checkbox).toEqual(['Choice with "quotes"']);
    expect(result.strikeout_item_lines).toEqual(['Item with \'apostrophe\'']);
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
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldEarned: fc.integer({ min: 0, max: 10000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.string({ maxLength: 500 }),
      reputation: fc.string({ maxLength: 100 })
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const result = mapToCharacterData(shared, unique);

        // Verify all shared fields are present in the result
        expect(result.gmid).toBe(shared.gmPfsNumber);
        expect(result.event).toBe(shared.scenarioName);
        expect(result.eventcode).toBe(shared.eventCode);
        expect(result.date).toBe(shared.eventDate);
        expect(result.xp_gained).toBe(shared.xpEarned);
        expect(result.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
        expect(result.strikeout_item_lines).toEqual(shared.strikeoutItems);
        expect(result.treasure_bundles).toBe(shared.treasureBundles.toString());

        // Verify all unique fields are present in the result
        expect(result.char).toBe(unique.characterName);
        expect(result.societyid).toBe(unique.societyId);
        expect(result.level).toBe(unique.level);
        expect(result.income_earned).toBe(unique.incomeEarned);
        expect(result.gp_gained).toBe(unique.goldEarned);
        expect(result.gp_spent).toBe(unique.goldSpent);
        expect(result.notes).toBe(unique.notes);
        expect(result.reputation).toBe(unique.reputation);
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
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldEarned: fc.integer({ min: 0, max: 10000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.string({ maxLength: 500 }),
      reputation: fc.string({ maxLength: 100 })
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const result = mapToCharacterData(shared, unique);

        // Verify no data transformation or loss occurs
        // String fields should be identical
        expect(result.gmid).toStrictEqual(shared.gmPfsNumber);
        expect(result.event).toStrictEqual(shared.scenarioName);
        expect(result.eventcode).toStrictEqual(shared.eventCode);
        expect(result.date).toStrictEqual(shared.eventDate);
        expect(result.char).toStrictEqual(unique.characterName);
        expect(result.societyid).toStrictEqual(unique.societyId);
        expect(result.notes).toStrictEqual(unique.notes);
        expect(result.reputation).toStrictEqual(unique.reputation);
        expect(result.treasure_bundles).toStrictEqual(shared.treasureBundles.toString());

        // Numeric fields should be identical
        expect(result.xp_gained).toStrictEqual(shared.xpEarned);
        expect(result.level).toStrictEqual(unique.level);
        expect(result.income_earned).toStrictEqual(unique.incomeEarned);
        expect(result.gp_gained).toStrictEqual(unique.goldEarned);
        expect(result.gp_spent).toStrictEqual(unique.goldSpent);

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
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldEarned: fc.integer({ min: 0, max: 10000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.constant(''),
      reputation: fc.constant('')
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const result = mapToCharacterData(shared, unique);

        // Verify empty arrays are preserved
        expect(result.summary_checkbox).toEqual([]);
        expect(result.strikeout_item_lines).toEqual([]);

        // Verify zero value is converted to string
        expect(result.treasure_bundles).toBe('0');
        expect(result.notes).toBe('');
        expect(result.reputation).toBe('');
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
      blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.constant(0),
      goldEarned: fc.constant(0),
      goldSpent: fc.constant(0),
      notes: fc.string({ maxLength: 500 }),
      reputation: fc.string({ maxLength: 100 })
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const result = mapToCharacterData(shared, unique);

        // Verify zero values are preserved (not treated as falsy)
        expect(result.xp_gained).toBe(0);
        expect(result.income_earned).toBe(0);
        expect(result.gp_gained).toBe(0);
        expect(result.gp_spent).toBe(0);
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
      blankChroniclePath: stringArb
    });

    const uniqueFieldsArb = fc.record({
      characterName: stringArb,
      societyId: stringArb,
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldEarned: fc.integer({ min: 0, max: 10000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: stringArb,
      reputation: stringArb
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const result = mapToCharacterData(shared, unique);

        // Verify all string fields preserve special characters and unicode
        expect(result.gmid).toBe(shared.gmPfsNumber);
        expect(result.event).toBe(shared.scenarioName);
        expect(result.eventcode).toBe(shared.eventCode);
        expect(result.date).toBe(shared.eventDate);
        expect(result.char).toBe(unique.characterName);
        expect(result.societyid).toBe(unique.societyId);
        expect(result.notes).toBe(unique.notes);
        expect(result.reputation).toBe(unique.reputation);
        expect(result.treasure_bundles).toBe(shared.treasureBundles.toString());

        // Verify array elements preserve special characters
        expect(result.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
        expect(result.strikeout_item_lines).toEqual(shared.strikeoutItems);
      }),
      { numRuns: 100 }
    );
  });
});
