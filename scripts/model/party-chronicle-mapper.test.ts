/**
 * Unit tests for party chronicle data mapping functions
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { mapToCharacterData } from './party-chronicle-mapper';
import { SharedFields, UniqueFields } from './party-chronicle-types';

describe('mapToCharacterData', () => {
  const createMockActor = (actorId: string, currentFaction: string | null = null) => ({
    id: actorId,
    system: {
      pfs: {
        currentFaction
      }
    }
  });

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
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 2,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const unique: UniqueFields = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldSpent: 10,
      notes: 'Saved the village from bandits'
    };

    const actor = createMockActor('actor-1', 'EA');
    const result = mapToCharacterData(shared, unique, actor);

    // Character identification
    expect(result.char).toBe('Valeros');
    expect(result.societyid).toBe('12345-01');
    expect(result.level).toBe(3);

    // Event details
    expect(result.gmid).toBe('12345');
    expect(result.event).toBe('The Blackwood Lost');
    expect(result.eventcode).toBe('PFS-001');
    expect(result.date).toBe('2024-01-15');

    // Rewards - calculated values
    expect(result.xp_gained).toBe(4);
    expect(result.income_earned).toBe(8);
    // Level 3 treasure bundle value is 3.8, so 2 × 3.8 = 7.6
    expect(result.treasure_bundles_gp).toBe(7.6);
    // gp_gained = treasure_bundles_gp + income_earned = 7.6 + 8 = 15.6
    expect(result.gp_gained).toBe(15.6);
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
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const unique: UniqueFields = {
      characterName: 'Seoni',
      societyId: '67890-02',
      level: 5,
      incomeEarned: 12,
      goldSpent: 0,
      notes: ''
    };

    const actor = createMockActor('actor-2', null);
    const result = mapToCharacterData(shared, unique, actor);

    expect(result.summary_checkbox).toEqual([]);
    expect(result.strikeout_item_lines).toEqual([]);
    expect(result.treasure_bundles).toBe('0');
    expect(result.notes).toBe('');
    expect(result.reputation).toEqual([]); // No reputation since all values are 0
    // With 0 treasure bundles, treasure_bundles_gp should be 0
    expect(result.treasure_bundles_gp).toBe(0);
    // gp_gained = 0 + 12 = 12
    expect(result.gp_gained).toBe(12);
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
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const unique: UniqueFields = {
      characterName: 'Kyra',
      societyId: '11111-03',
      level: 1,
      incomeEarned: 0,
      goldSpent: 0,
      notes: ''
    };

    const actor = createMockActor('actor-3', null);
    const result = mapToCharacterData(shared, unique, actor);

    expect(result.xp_gained).toBe(0);
    expect(result.income_earned).toBe(0);
    expect(result.treasure_bundles_gp).toBe(0);
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
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const unique: UniqueFields = {
      characterName: 'O\'Brien',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldSpent: 10,
      notes: 'Notes with "quotes" & special chars'
    };

    const actor = createMockActor('actor-4', null);
    const result = mapToCharacterData(shared, unique, actor);

    expect(result.char).toBe('O\'Brien');
    expect(result.event).toBe('The Dragon\'s "Lair" & More');
    expect(result.notes).toBe('Notes with "quotes" & special chars');
    expect(result.summary_checkbox).toEqual(['Choice with "quotes"']);
    expect(result.strikeout_item_lines).toEqual(['Item with \'apostrophe\'']);
  });

  it('should calculate treasure_bundles_gp correctly for various levels', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      treasureBundles: 3,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 0,
      reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
    };

    const actor = createMockActor('actor-test', null);

    // Test level 1: 3 × 1.4 = 4.2
    const unique1: UniqueFields = {
      characterName: 'Test1',
      societyId: '12345-01',
      level: 1,
      incomeEarned: 0,
      goldSpent: 0,
      notes: ''
    };
    const result1 = mapToCharacterData(shared, unique1, actor);
    expect(result1.treasure_bundles_gp).toBe(4.2);
    expect(result1.gp_gained).toBe(4.2);

    // Test level 10: 3 × 60 = 180
    const unique10: UniqueFields = {
      characterName: 'Test10',
      societyId: '12345-02',
      level: 10,
      incomeEarned: 0,
      goldSpent: 0,
      notes: ''
    };
    const result10 = mapToCharacterData(shared, unique10, actor);
    expect(result10.treasure_bundles_gp).toBe(180);
    expect(result10.gp_gained).toBe(180);

    // Test level 20: 3 × 3680 = 11040
    const unique20: UniqueFields = {
      characterName: 'Test20',
      societyId: '12345-03',
      level: 20,
      incomeEarned: 0,
      goldSpent: 0,
      notes: ''
    };
    const result20 = mapToCharacterData(shared, unique20, actor);
    expect(result20.treasure_bundles_gp).toBe(11040);
    expect(result20.gp_gained).toBe(11040);
  });

  it('should calculate gp_gained as treasure_bundles_gp + income_earned', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      treasureBundles: 2,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 0,
      reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
    };

    const unique: UniqueFields = {
      characterName: 'Test',
      societyId: '12345-01',
      level: 5,
      incomeEarned: 15.5,
      goldSpent: 0,
      notes: ''
    };

    const actor = createMockActor('actor-test', null);
    const result = mapToCharacterData(shared, unique, actor);

    // Level 5: 2 × 10 = 20
    expect(result.treasure_bundles_gp).toBe(20);
    // gp_gained = 20 + 15.5 = 35.5
    expect(result.gp_gained).toBe(35.5);
    expect(result.income_earned).toBe(15.5);
  });

  it('should use exact parameter names for PDF compatibility', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      treasureBundles: 1,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 0,
      reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
    };

    const unique: UniqueFields = {
      characterName: 'Test',
      societyId: '12345-01',
      level: 1,
      incomeEarned: 5,
      goldSpent: 0,
      notes: ''
    };

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
      })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.string({ maxLength: 500 }),
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

        // Verify all unique fields are present in the result
        expect(result.char).toBe(unique.characterName);
        expect(result.societyid).toBe(unique.societyId);
        expect(result.level).toBe(unique.level);
        expect(result.income_earned).toBe(unique.incomeEarned);
        expect(result.gp_spent).toBe(unique.goldSpent);
        expect(result.notes).toBe(unique.notes);
        
        // Verify calculated fields exist and are numbers
        expect(typeof result.treasure_bundles_gp).toBe('number');
        expect(typeof result.gp_gained).toBe('number');
        expect(result.gp_gained).toBeGreaterThanOrEqual(unique.incomeEarned);
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
      })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.string({ maxLength: 500 }),
    });

    fc.assert(
      fc.property(sharedFieldsArb, uniqueFieldsArb, (shared, unique) => {
        const mockActor = { id: 'test-actor-id', system: { pfs: { currentFaction: 'EA' } } };
        const result = mapToCharacterData(shared, unique, mockActor);

        // Verify no data transformation or loss occurs
        // String fields should be identical
        expect(result.gmid).toStrictEqual(shared.gmPfsNumber);
        expect(result.event).toStrictEqual(shared.scenarioName);
        expect(result.eventcode).toStrictEqual(shared.eventCode);
        expect(result.date).toStrictEqual(shared.eventDate);
        expect(result.char).toStrictEqual(unique.characterName);
        expect(result.societyid).toStrictEqual(unique.societyId);
        expect(result.notes).toStrictEqual(unique.notes);
        expect(result.reputation).toBeDefined();
        expect(result.treasure_bundles).toStrictEqual(shared.treasureBundles.toString());

        // Numeric fields should be identical
        expect(result.xp_gained).toStrictEqual(shared.xpEarned);
        expect(result.level).toStrictEqual(unique.level);
        expect(result.income_earned).toStrictEqual(unique.incomeEarned);
        expect(result.gp_spent).toStrictEqual(unique.goldSpent);
        
        // Calculated fields should be numbers
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
      })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: fc.constant('')
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
        // gp_gained should equal income_earned when treasure bundles is 0
        expect(result.gp_gained).toBe(unique.incomeEarned);
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
      })
    });

    const uniqueFieldsArb = fc.record({
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.constant(0),
      goldSpent: fc.constant(0),
      notes: fc.string({ maxLength: 500 }),
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
      })
    });

    const uniqueFieldsArb = fc.record({
      characterName: stringArb,
      societyId: stringArb,
      level: fc.integer({ min: 1, max: 20 }),
      incomeEarned: fc.integer({ min: 0, max: 1000 }),
      goldSpent: fc.integer({ min: 0, max: 10000 }),
      notes: stringArb,
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
        expect(result.societyid).toBe(unique.societyId);
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
