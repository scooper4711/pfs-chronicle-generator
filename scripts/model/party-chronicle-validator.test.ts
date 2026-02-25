/**
 * Unit tests for party chronicle validation functions
 */

import { describe, it, expect } from '@jest/globals';
import { validateSharedFields, validateUniqueFields, validateAllFields } from './party-chronicle-validator';
import { SharedFields, UniqueFields } from './party-chronicle-types';

describe('validateSharedFields', () => {
  it('should pass validation for valid shared fields', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'The Blackwood Lost',
      eventCode: 'PFS-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: ['Found the artifact'],
      strikeoutItems: ['Potion of Healing'],
      treasureBundles: 2,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail validation when GM PFS Number is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GM PFS Number is required');
  });

  it('should fail validation when Scenario Name is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: '',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Scenario Name is required');
  });

  it('should fail validation when Event Code is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: '',
      eventDate: '2024-01-15',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Event Code is required');
  });

  it('should fail validation when Event Date is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Event Date is required');
  });

  it('should fail validation when Event Date has invalid format', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '01/15/2024',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Event Date must be in YYYY-MM-DD format');
  });

  it('should fail validation when Event Date is invalid calendar date', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-13-45',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Event Date is not a valid date');
  });

  it('should fail validation when XP Earned is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('XP Earned is required');
  });

  it('should fail validation when XP Earned is negative', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: -1,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('XP Earned cannot be negative');
  });

  it('should fail validation when Layout ID is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      layoutId: '',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Layout selection is required');
  });

  it('should fail validation when Season ID is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: '',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Season selection is required');
  });

  it('should fail validation when Blank Chronicle Path is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: ''
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Blank Chronicle Path is required');
  });

  it('should accept zero XP', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 0,
      treasureBundles: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept empty optional arrays', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should collect multiple errors', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '',
      scenarioName: '',
      eventCode: '',
      eventDate: '',
      layoutId: '',
      seasonId: '',
      blankChroniclePath: ''
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(5);
  });
});

describe('validateUniqueFields', () => {
  it('should pass validation for valid unique fields', () => {
    const unique: UniqueFields = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: 'Saved the village',
      reputation: 'Envoy\'s Alliance: +2'
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail validation when Character Name is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: '',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character Name is required');
  });

  it('should fail validation when Society ID is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Society ID is required');
  });

  it('should fail validation when Society ID has invalid format', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('playerNumber-characterNumber'))).toBe(true);
  });

  it('should fail validation when Level is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Level is required');
  });

  it('should fail validation when Level is out of range', () => {
    const unique1: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 0,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result1 = validateUniqueFields(unique1);
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('Level must be between 1 and 20');

    const unique2: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 21,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result2 = validateUniqueFields(unique2);
    expect(result2.valid).toBe(false);
    expect(result2.errors).toContain('Level must be between 1 and 20');
  });

  it('should fail validation when Level is not an integer', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3.5,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Level must be a whole number');
  });

  it('should fail validation when Income Earned is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Income Earned is required');
  });

  it('should fail validation when Income Earned is negative', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: -5,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Income Earned cannot be negative');
  });

  it('should fail validation when Gold Earned is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Gold Earned is required');
  });

  it('should fail validation when Gold Spent is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Gold Spent is required');
  });

  it('should accept zero values for numeric fields', () => {
    const unique: UniqueFields = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 1,
      incomeEarned: 0,
      goldEarned: 0,
      goldSpent: 0,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept empty strings for optional fields', () => {
    const unique: UniqueFields = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should prefix errors with character name when provided', () => {
    const unique: Partial<UniqueFields> = {
      characterName: '',
      societyId: '',
      level: 3,
      incomeEarned: 8,
      goldEarned: 24,
      goldSpent: 10,
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique, 'Valeros');

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('Valeros:'))).toBe(true);
  });

  it('should collect multiple errors', () => {
    const unique: Partial<UniqueFields> = {
      characterName: '',
      societyId: '',
      notes: '',
      reputation: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(5);
  });
});

describe('validateAllFields', () => {
  it('should pass validation when all fields are valid', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
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

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        societyId: '12345-01',
        level: 3,
        incomeEarned: 8,
        goldEarned: 24,
        goldSpent: 10,
        notes: '',
        reputation: ''
      } as UniqueFields,
      'actor-2': {
        characterName: 'Seoni',
        societyId: '67890-02',
        level: 5,
        incomeEarned: 12,
        goldEarned: 36,
        goldSpent: 0,
        notes: '',
        reputation: ''
      } as UniqueFields
    };

    const result = validateAllFields(shared, characters);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should collect errors from both shared and unique fields', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf'
    };

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        societyId: '',
        level: 3,
        incomeEarned: 8,
        goldEarned: 24,
        goldSpent: 10,
        notes: '',
        reputation: ''
      } as Partial<UniqueFields>
    };

    const result = validateAllFields(shared, characters);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('GM PFS Number'))).toBe(true);
    expect(result.errors.some(e => e.includes('Society ID'))).toBe(true);
  });

  it('should validate multiple characters', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
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

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        societyId: '',
        level: 3,
        incomeEarned: 8,
        goldEarned: 24,
        goldSpent: 10,
        notes: '',
        reputation: ''
      } as Partial<UniqueFields>,
      'actor-2': {
        characterName: 'Seoni',
        societyId: '',
        level: 5,
        incomeEarned: 12,
        goldEarned: 36,
        goldSpent: 0,
        notes: '',
        reputation: ''
      } as Partial<UniqueFields>
    };

    const result = validateAllFields(shared, characters);

    expect(result.valid).toBe(false);
    expect(result.errors.filter(e => e.includes('Society ID')).length).toBe(2);
  });

  it('should use character names from map when provided', () => {
    const shared: SharedFields = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
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

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        societyId: '',
        level: 3,
        incomeEarned: 8,
        goldEarned: 24,
        goldSpent: 10,
        notes: '',
        reputation: ''
      } as Partial<UniqueFields>
    };

    const names = {
      'actor-1': 'Valeros the Brave'
    };

    const result = validateAllFields(shared, characters, names);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Valeros the Brave:'))).toBe(true);
  });
});
