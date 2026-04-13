/**
 * Unit tests for party chronicle validation functions
 */

import { describe, it, expect } from '@jest/globals';
import { validateSharedFields, validateUniqueFields, validateAllFields } from '../../scripts/model/party-chronicle-validator';
import { SharedFields, UniqueFields } from '../../scripts/model/party-chronicle-types';
import { createSharedFields, createUniqueFields } from './test-helpers';

describe('validateSharedFields', () => {
  it('should pass validation for valid shared fields', () => {
    const shared: SharedFields = createSharedFields({
      gmPfsNumber: '12345',
      scenarioName: 'The Blackwood Lost',
      eventCode: 'PFS-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: ['Found the artifact'],
      strikeoutItems: ['Potion of Healing'],
      treasureBundles: 2,
      downtimeDays: 0,
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
    });

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
    expect(result.errors).toContain('XP Earned must be 1 (Bounty), 2 (Quest), or 4 (Scenario)');
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

  it('should fail validation when Chronicle Path is missing', () => {
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
    expect(result.errors).toContain('Chronicle Path is required');
  });

  it('should reject zero XP', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 0,
      treasureBundles: 0,
      downtimeDays: 0,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('XP Earned must be 1 (Bounty), 2 (Quest), or 4 (Scenario)');
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
      downtimeDays: 0,
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

  it('should fail validation when chosen faction reputation is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chosen Faction reputation is required');
  });

  it('should fail validation when chosen faction reputation is 0', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 0,
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chosen Faction reputation must be greater than 0');
  });

  it('should fail validation when chosen faction reputation is out of range', () => {
    const shared1: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: -1,
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const result1 = validateSharedFields(shared1);
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('Chosen Faction reputation must be between 0 and 9');

    const shared2: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 10,
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const result2 = validateSharedFields(shared2);
    expect(result2.valid).toBe(false);
    expect(result2.errors).toContain('Chosen Faction reputation must be between 0 and 9');
  });

  it('should fail validation when chosen faction reputation is not an integer', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2.5,
      reputationValues: {
        EA: 0,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chosen Faction reputation must be a whole number');
  });

  it('should fail validation when faction-specific reputation is out of range', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 10,
        GA: 0,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Envoy's Alliance reputation must be between 0 and 9");
  });

  it('should fail validation when faction-specific reputation is not an integer', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 0,
        GA: 1.5,
        HH: 0,
        VS: 0,
        RO: 0,
        VW: 0
      }
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Grand Archive reputation must be a whole number');
  });

  it('should accept valid reputation values', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 0,
      layoutId: 'layout-1',
      seasonId: 'season-5',
      blankChroniclePath: '/path/to/chronicle.pdf',
      chosenFactionReputation: 2,
      reputationValues: {
        EA: 3,
        GA: 0,
        HH: 9,
        VS: 1,
        RO: 0,
        VW: 5
      }
    };

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  describe('reputation validation edge cases', () => {
    it('should accept boundary value 0 for faction-specific reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
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

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept boundary value 9 for all reputation fields', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 9,
        reputationValues: {
          EA: 9,
          GA: 9,
          HH: 9,
          VS: 9,
          RO: 9,
          VW: 9
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject boundary value 10 for chosen faction reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 10,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chosen Faction reputation must be between 0 and 9');
    });

    it('should reject boundary value 10 for faction-specific reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 2,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 10,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Horizon Hunters reputation must be between 0 and 9');
    });

    it('should reject boundary value -1 for chosen faction reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: -1,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chosen Faction reputation must be between 0 and 9');
    });

    it('should reject boundary value -1 for faction-specific reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 2,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: -1,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Vigilant Seal reputation must be between 0 and 9');
    });
  });

  describe('reputation validation error messages', () => {
    it('should provide specific error message for missing chosen faction reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chosen Faction reputation is required');
    });

    it('should provide specific error message for chosen faction reputation being 0', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 0,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chosen Faction reputation must be greater than 0');
    });

    it('should provide specific error message for non-integer chosen faction reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 2.5,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chosen Faction reputation must be a whole number');
    });

    it('should provide specific error message for out-of-range chosen faction reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 15,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chosen Faction reputation must be between 0 and 9');
    });

    it('should provide specific error messages for each faction with full faction names', () => {
      const testCases = [
        { code: 'EA', name: "Envoy's Alliance" },
        { code: 'GA', name: 'Grand Archive' },
        { code: 'HH', name: 'Horizon Hunters' },
        { code: 'VS', name: 'Vigilant Seal' },
        { code: 'RO', name: 'Radiant Oath' },
        { code: 'VW', name: 'Verdant Wheel' }
      ];

      for (const testCase of testCases) {
        const shared: Partial<SharedFields> = {
          gmPfsNumber: '12345',
          scenarioName: 'Test',
          eventCode: 'TEST-001',
          eventDate: '2024-01-15',
          xpEarned: 4,
          treasureBundles: 0,
      downtimeDays: 0,
          layoutId: 'layout-1',
          seasonId: 'season-5',
          blankChroniclePath: '/path/to/chronicle.pdf',
          chosenFactionReputation: 2,
          reputationValues: {
            EA: testCase.code === 'EA' ? 10 : 0,
            GA: testCase.code === 'GA' ? 10 : 0,
            HH: testCase.code === 'HH' ? 10 : 0,
            VS: testCase.code === 'VS' ? 10 : 0,
            RO: testCase.code === 'RO' ? 10 : 0,
            VW: testCase.code === 'VW' ? 10 : 0
          }
        };

        const result = validateSharedFields(shared);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`${testCase.name} reputation must be between 0 and 9`);
      }
    });

    it('should provide specific error message for non-integer faction-specific reputation', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 2,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 3.7,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Radiant Oath reputation must be a whole number');
    });
  });

  describe('multiple reputation validation errors', () => {
    it('should collect multiple reputation validation errors at once', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 0,
        reputationValues: {
          EA: 10,
          GA: -1,
          HH: 2.5,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors).toContain('Chosen Faction reputation must be greater than 0');
      expect(result.errors).toContain("Envoy's Alliance reputation must be between 0 and 9");
      expect(result.errors).toContain('Grand Archive reputation must be between 0 and 9');
      expect(result.errors).toContain('Horizon Hunters reputation must be a whole number');
    });

    it('should collect errors for all invalid faction-specific reputations', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '12345',
        scenarioName: 'Test',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 2,
        reputationValues: {
          EA: 10,
          GA: 11,
          HH: 12,
          VS: 13,
          RO: 14,
          VW: 15
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(6);
      expect(result.errors).toContain("Envoy's Alliance reputation must be between 0 and 9");
      expect(result.errors).toContain('Grand Archive reputation must be between 0 and 9');
      expect(result.errors).toContain('Horizon Hunters reputation must be between 0 and 9');
      expect(result.errors).toContain('Vigilant Seal reputation must be between 0 and 9');
      expect(result.errors).toContain('Radiant Oath reputation must be between 0 and 9');
      expect(result.errors).toContain('Verdant Wheel reputation must be between 0 and 9');
    });

    it('should collect both reputation and non-reputation errors', () => {
      const shared: Partial<SharedFields> = {
        gmPfsNumber: '',
        scenarioName: '',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        treasureBundles: 0,
      downtimeDays: 0,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 0,
        reputationValues: {
          EA: 10,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        }
      };

      const result = validateSharedFields(shared);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors).toContain('GM PFS Number is required');
      expect(result.errors).toContain('Scenario Name is required');
      expect(result.errors).toContain('Chosen Faction reputation must be greater than 0');
      expect(result.errors).toContain("Envoy's Alliance reputation must be between 0 and 9");
    });
  });
});

describe('validateUniqueFields', () => {
  it('should pass validation for valid unique fields', () => {
    const unique: UniqueFields = createUniqueFields({
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 3,
      currencySpent: 10,
      notes: 'Saved the village',
      taskLevel: 1,
      successLevel: 'success',
      proficiencyRank: 'trained',
      earnedIncome: 0.8
    });

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail validation when Character Name is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: '',
      playerNumber: '12345', characterNumber: '01',
      level: 3,
      currencySpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character Name is required');
  });

  it('should fail validation when Player Number is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      playerNumber: '', characterNumber: '',
      level: 3,
      currencySpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Player Number is required');
  });

  it('should fail validation when Character Number is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '',
      level: 3,
      currencySpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character Number is required');
  });

  it('should fail validation when Level is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      currencySpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Level is required');
  });

  it('should fail validation when Level is out of range', () => {
    const unique1: Partial<UniqueFields> = {
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 0,
      currencySpent: 10,
      notes: ''
    };

    const result1 = validateUniqueFields(unique1);
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('Level must be between 1 and 20');

    const unique2: Partial<UniqueFields> = {
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 21,
      currencySpent: 10,
      notes: ''
    };

    const result2 = validateUniqueFields(unique2);
    expect(result2.valid).toBe(false);
    expect(result2.errors).toContain('Level must be between 1 and 20');
  });

  it('should fail validation when Level is not an integer', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 3.5,
      currencySpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Level must be a whole number');
  });

  // Note: Income Earned validation tests removed - earned income is now calculated
  // from taskLevel, successLevel, and proficiencyRank (see earned-income-calculation spec)

  it('should fail validation when Gold Spent is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 3,
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Currency Spent is required');
  });

  it('should accept zero values for numeric fields', () => {
    const unique: UniqueFields = createUniqueFields({
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 1,
      currencySpent: 0,
      notes: '',
      taskLevel: '-',
      successLevel: 'success',
      proficiencyRank: 'trained',
      earnedIncome: 0
    });

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept empty strings for optional fields', () => {
    const unique: UniqueFields = createUniqueFields({
      characterName: 'Valeros',
      playerNumber: '12345', characterNumber: '01',
      level: 3,
      currencySpent: 10,
      notes: '',
      taskLevel: 1,
      successLevel: 'success',
      proficiencyRank: 'trained',
      earnedIncome: 0.8
    });

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should prefix errors with character name when provided', () => {
    const unique: Partial<UniqueFields> = {
      characterName: '',
      playerNumber: '', characterNumber: '',
      level: 3,
      currencySpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique, 'Valeros');

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('Valeros:'))).toBe(true);
  });

  it('should collect multiple errors', () => {
    const unique: Partial<UniqueFields> = {
      characterName: '',
      playerNumber: '', characterNumber: '',
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4); // Character Name, Player Number, Character Number, Level
  });
});

describe('validateAllFields', () => {
  it('should pass validation when all fields are valid', () => {
    const shared: SharedFields = createSharedFields({
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      treasureBundles: 0,
      downtimeDays: 0,
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
    });

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'trained',
        earnedIncome: 0.8
      } as UniqueFields,
      'actor-2': {
        characterName: 'Seoni',
        playerNumber: '67890', characterNumber: '02',
        level: 5,
        currencySpent: 0,
        notes: ''
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

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        playerNumber: '', characterNumber: '',
        level: 3,
        currencySpent: 10,
        notes: ''
      } as Partial<UniqueFields>
    };

    const result = validateAllFields(shared, characters);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('GM PFS Number'))).toBe(true);
    expect(result.errors.some(e => e.includes('Player Number'))).toBe(true);
  });

  it('should validate multiple characters', () => {
    const shared: SharedFields = createSharedFields({
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      treasureBundles: 0,
      downtimeDays: 0,
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
    });

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        playerNumber: '', characterNumber: '',
        level: 3,
        currencySpent: 10,
        notes: ''
      } as Partial<UniqueFields>,
      'actor-2': {
        characterName: 'Seoni',
        playerNumber: '', characterNumber: '',
        level: 5,
        currencySpent: 0,
        notes: ''
      } as Partial<UniqueFields>
    };

    const result = validateAllFields(shared, characters);

    expect(result.valid).toBe(false);
    expect(result.errors.filter(e => e.includes('Player Number')).length).toBe(2);
  });

  it('should use character names from map when provided', () => {
    const shared: SharedFields = createSharedFields({
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      adventureSummaryCheckboxes: [],
      strikeoutItems: [],
      treasureBundles: 0,
      downtimeDays: 0,
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
    });

    const characters = {
      'actor-1': {
        characterName: 'Valeros',
        playerNumber: '', characterNumber: '',
        level: 3,
        currencySpent: 10,
        notes: ''
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

describe('validateSharedFields - XP Earned', () => {
  /**
   * Tests for XP Earned validation
   * Requirements: earned-income-calculation 2.1, 9.1, 9.2, 9.3
   */

  it('should accept XP value of 1 (Bounty)', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 1,
      treasureBundles: 0,
      downtimeDays: 0,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept XP value of 2 (Quest)', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 2,
      treasureBundles: 0,
      downtimeDays: 4,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept XP value of 4 (Scenario)', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 4,
      treasureBundles: 0,
      downtimeDays: 8,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject XP value of 0', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 0,
      treasureBundles: 0,
      downtimeDays: 0,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('XP Earned must be 1 (Bounty), 2 (Quest), or 4 (Scenario)');
  });

  it('should reject XP value of 3', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: 3,
      treasureBundles: 0,
      downtimeDays: 6,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('XP Earned must be 1 (Bounty), 2 (Quest), or 4 (Scenario)');
  });

  it('should reject negative XP values', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      xpEarned: -1,
      treasureBundles: 0,
      downtimeDays: 0,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('XP Earned must be 1 (Bounty), 2 (Quest), or 4 (Scenario)');
  });

  it('should fail validation when XP is missing', () => {
    const shared: Partial<SharedFields> = {
      gmPfsNumber: '12345',
      scenarioName: 'Test',
      eventCode: 'TEST-001',
      eventDate: '2024-01-15',
      treasureBundles: 0,
      downtimeDays: 0,
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

    const result = validateSharedFields(shared);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('XP Earned is required');
  });
});


describe('validateUniqueFields - Earned Income', () => {
  /**
   * Tests for earned income validation
   * Requirements: earned-income-calculation 9.5, 9.6, 9.7
   */

  describe('Task Level Validation', () => {
    it('should accept task level "-" (opt-out)', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: '-'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept task level 0', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 0,
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept task level 20', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 20,
        currencySpent: 10,
        notes: '',
        taskLevel: 20,
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept all task levels from 0 to 20', () => {
      for (let level = 0; level <= 20; level++) {
        const unique: Partial<UniqueFields> = {
          characterName: 'Valeros',
          playerNumber: '12345', characterNumber: '01',
          level: Math.max(level, 1),
          currencySpent: 10,
          notes: '',
          taskLevel: level,
          successLevel: 'success',
          proficiencyRank: 'trained'
        };

        const result = validateUniqueFields(unique);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      }
    });

    it('should reject task level less than 0', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: -1,
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task Level must be between 0 and 20 or "-"');
    });

    it('should reject task level greater than 20', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 21,
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task Level must be between 0 and 20 or "-"');
    });

    it('should reject invalid task level string', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 'invalid' as any,
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Task Level must be between 0 and 20 or "-"');
    });
  });

  describe('Success Level Validation', () => {
    it('should accept success level "critical_failure"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'critical_failure',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept success level "failure"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'failure',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept success level "success"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept success level "critical_success"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'critical_success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid success level', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'invalid',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Success Level must be critical_failure, failure, success, or critical_success');
    });
  });

  describe('Proficiency Rank Validation', () => {
    it('should accept proficiency rank "trained"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept proficiency rank "expert"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'expert'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept proficiency rank "master"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'master'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept proficiency rank "legendary"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'legendary'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid proficiency rank', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'invalid'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proficiency Rank must be trained, expert, master, or legendary');
    });
  });

  describe('Conditional Validation', () => {
    it('should require success level when task level is not "-"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        proficiencyRank: 'trained'
        // successLevel is missing
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Success Level is required when Task Level is not "-"');
    });

    it('should require proficiency rank when task level is not "-"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        successLevel: 'success'
        // proficiencyRank is missing
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proficiency Rank is required when Task Level is not "-"');
    });

    it('should require both success level and proficiency rank when task level is not "-"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1
        // both successLevel and proficiencyRank are missing
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Success Level is required when Task Level is not "-"');
      expect(result.errors).toContain('Proficiency Rank is required when Task Level is not "-"');
    });

    it('should not require success level when task level is "-"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: '-'
        // successLevel and proficiencyRank are missing, but that's OK
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should not require proficiency rank when task level is "-"', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: '-'
        // successLevel and proficiencyRank are missing, but that's OK
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept success level and proficiency rank when task level is "-" (optional)', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: '-',
        successLevel: 'success',
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should prefix conditional validation errors with character name', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1
        // both successLevel and proficiencyRank are missing
      };

      const result = validateUniqueFields(unique, 'Valeros');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valeros: Success Level is required when Task Level is not "-"');
      expect(result.errors).toContain('Valeros: Proficiency Rank is required when Task Level is not "-"');
    });
  });

  describe('Combined Earned Income Validation', () => {
    it('should pass validation with all earned income fields valid', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 5,
        currencySpent: 10,
        notes: '',
        taskLevel: 3,
        successLevel: 'success',
        proficiencyRank: 'expert',
        earnedIncome: 2.5
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should collect multiple earned income validation errors', () => {
      const unique: Partial<UniqueFields> = {
        characterName: 'Valeros',
        playerNumber: '12345', characterNumber: '01',
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 25,  // Invalid
        successLevel: 'invalid',  // Invalid
        proficiencyRank: 'invalid'  // Invalid
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors).toContain('Task Level must be between 0 and 20 or "-"');
      expect(result.errors).toContain('Success Level must be critical_failure, failure, success, or critical_success');
      expect(result.errors).toContain('Proficiency Rank must be trained, expert, master, or legendary');
    });

    it('should validate earned income fields alongside other unique fields', () => {
      const unique: Partial<UniqueFields> = {
        characterName: '',  // Invalid
        playerNumber: '', characterNumber: '',  // Invalid
        level: 3,
        currencySpent: 10,
        notes: '',
        taskLevel: 1,
        // successLevel missing - Invalid
        proficiencyRank: 'trained'
      };

      const result = validateUniqueFields(unique);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors).toContain('Character Name is required');
      expect(result.errors).toContain('Player Number is required');
      expect(result.errors).toContain('Success Level is required when Task Level is not "-"');
    });
  });
});
