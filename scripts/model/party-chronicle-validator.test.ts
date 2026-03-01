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
    const unique: UniqueFields = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      goldSpent: 10,
      notes: 'Saved the village'
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
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
    };

    const result1 = validateUniqueFields(unique1);
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('Level must be between 1 and 20');

    const unique2: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 21,
      incomeEarned: 8,
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Income Earned cannot be negative');
  });

  it('should fail validation when Gold Spent is missing', () => {
    const unique: Partial<UniqueFields> = {
      characterName: 'Valeros',
      societyId: '12345-01',
      level: 3,
      incomeEarned: 8,
      notes: ''
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
      goldSpent: 0,
      notes: ''
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
      goldSpent: 10,
      notes: ''
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
      goldSpent: 10,
      notes: ''
    };

    const result = validateUniqueFields(unique, 'Valeros');

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('Valeros:'))).toBe(true);
  });

  it('should collect multiple errors', () => {
    const unique: Partial<UniqueFields> = {
      characterName: '',
      societyId: '',
      notes: ''
    };

    const result = validateUniqueFields(unique);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
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
        societyId: '12345-01',
        level: 3,
        incomeEarned: 8,
        goldSpent: 10,
        notes: ''
      } as UniqueFields,
      'actor-2': {
        characterName: 'Seoni',
        societyId: '67890-02',
        level: 5,
        incomeEarned: 12,
        goldSpent: 0,
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
        societyId: '',
        level: 3,
        incomeEarned: 8,
        goldSpent: 10,
        notes: ''
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
        societyId: '',
        level: 3,
        incomeEarned: 8,
        goldSpent: 10,
        notes: ''
      } as Partial<UniqueFields>,
      'actor-2': {
        characterName: 'Seoni',
        societyId: '',
        level: 5,
        incomeEarned: 12,
        goldSpent: 0,
        notes: ''
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
        societyId: '',
        level: 3,
        incomeEarned: 8,
        goldSpent: 10,
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
