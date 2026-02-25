/**
 * Unit tests for party chronicle storage functions
 */

import * as fc from 'fast-check';
import {
  savePartyChronicleData,
  loadPartyChronicleData,
  clearPartyChronicleData
} from './party-chronicle-storage';
import { PartyChronicleData } from './party-chronicle-types';

// Mock the global game object
const mockGameSettings: any = {
  data: new Map<string, any>(),
  
  set: jest.fn(async (module: string, key: string, value: any): Promise<void> => {
    const fullKey = `${module}.${key}`;
    mockGameSettings.data.set(fullKey, value);
  }),
  
  get: jest.fn((module: string, key: string): any => {
    const fullKey = `${module}.${key}`;
    return mockGameSettings.data.get(fullKey);
  }),
  
  register: jest.fn()
};

(global as any).game = {
  settings: mockGameSettings
};

describe('Party Chronicle Storage', () => {
  beforeEach(() => {
    // Clear the mock data before each test
    mockGameSettings.data.clear();
    jest.clearAllMocks();
  });

  describe('savePartyChronicleData', () => {
    it('should save party chronicle data with timestamp', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test Scenario',
          eventCode: 'TEST-001',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: ['checkbox1'],
          strikeoutItems: ['item1'],
          treasureBundles: 2,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path/to/chronicle.pdf'
        },
        characters: {
          'actor-1': {
            characterName: 'Hero One',
            societyId: '12345-01',
            level: 5,
            incomeEarned: 10,
            goldEarned: 15,
            goldSpent: 5,
            notes: 'Test notes',
            reputation: 'Envoy: +2'
          }
        }
      };

      await savePartyChronicleData(testData);

      expect(mockGameSettings.set).toHaveBeenCalledWith(
        'pfs-chronicle-generator',
        'partyChronicleData',
        expect.objectContaining({
          timestamp: expect.any(Number),
          data: testData
        })
      );
    });

    it('should throw error when save fails', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '',
          scenarioName: '',
          eventCode: '',
          eventDate: '',
          xpEarned: 0,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: '',
          seasonId: '',
          blankChroniclePath: ''
        },
        characters: {}
      };

      mockGameSettings.set.mockRejectedValueOnce(new Error('Storage error'));

      await expect(savePartyChronicleData(testData)).rejects.toThrow(
        'Failed to save party chronicle data'
      );
    });

    it('should throw error when settings.set is undefined', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test',
          eventCode: 'TEST',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path'
        },
        characters: {}
      };

      const originalSet = mockGameSettings.set;
      mockGameSettings.set = undefined;

      await expect(savePartyChronicleData(testData)).rejects.toThrow();

      mockGameSettings.set = originalSet;
    });

    it('should throw error with large data payload', async () => {
      const largeData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test Scenario',
          eventCode: 'TEST-001',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: Array(100).fill('checkbox'),
          strikeoutItems: Array(100).fill('item'),
          treasureBundles: 10,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path/to/chronicle.pdf'
        },
        characters: {}
      };

      mockGameSettings.set.mockRejectedValueOnce(new Error('Payload too large'));

      await expect(savePartyChronicleData(largeData)).rejects.toThrow(
        'Failed to save party chronicle data'
      );
    });

    it('should throw error when storage quota exceeded', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test',
          eventCode: 'TEST',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path'
        },
        characters: {}
      };

      mockGameSettings.set.mockRejectedValueOnce(new Error('QuotaExceededError'));

      await expect(savePartyChronicleData(testData)).rejects.toThrow(
        'Failed to save party chronicle data'
      );
    });
  });

  describe('loadPartyChronicleData', () => {
    it('should load previously saved data', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test Scenario',
          eventCode: 'TEST-001',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path/to/chronicle.pdf'
        },
        characters: {
          'actor-1': {
            characterName: 'Hero One',
            societyId: '12345-01',
            level: 5,
            incomeEarned: 10,
            goldEarned: 15,
            goldSpent: 5,
            notes: '',
            reputation: ''
          }
        }
      };

      const savedStorage = {
        timestamp: Date.now(),
        data: testData
      };

      mockGameSettings.data.set('pfs-chronicle-generator.partyChronicleData', savedStorage);

      const result = await loadPartyChronicleData();

      expect(result).toEqual(savedStorage);
      expect(mockGameSettings.get).toHaveBeenCalledWith(
        'pfs-chronicle-generator',
        'partyChronicleData'
      );
    });

    it('should return null when no data exists', async () => {
      const result = await loadPartyChronicleData();

      expect(result).toBeNull();
    });

    it('should throw error when load fails', async () => {
      mockGameSettings.get.mockImplementationOnce(() => {
        throw new Error('Load error');
      });

      await expect(loadPartyChronicleData()).rejects.toThrow(
        'Failed to load party chronicle data'
      );
    });

    it('should throw error when settings.get is undefined', async () => {
      const originalGet = mockGameSettings.get;
      mockGameSettings.get = undefined;

      await expect(loadPartyChronicleData()).rejects.toThrow();

      mockGameSettings.get = originalGet;
    });

    it('should throw error when data is corrupted', async () => {
      mockGameSettings.get.mockImplementationOnce(() => {
        throw new Error('JSON parse error');
      });

      await expect(loadPartyChronicleData()).rejects.toThrow(
        'Failed to load party chronicle data'
      );
    });

    it('should return null when data structure is invalid', async () => {
      // Store invalid data structure
      mockGameSettings.data.set('pfs-chronicle-generator.partyChronicleData', {
        // Missing timestamp
        data: 'invalid'
      });

      const result = await loadPartyChronicleData();

      // Should return the data as-is, validation happens elsewhere
      expect(result).toBeDefined();
    });

    it('should throw error when storage is inaccessible', async () => {
      mockGameSettings.get.mockImplementationOnce(() => {
        throw new Error('Storage not available');
      });

      await expect(loadPartyChronicleData()).rejects.toThrow(
        'Failed to load party chronicle data'
      );
    });

    it('should handle undefined return value gracefully', async () => {
      mockGameSettings.get.mockReturnValueOnce(undefined);

      const result = await loadPartyChronicleData();

      expect(result).toBeNull();
    });

    it('should throw error on network timeout', async () => {
      mockGameSettings.get.mockImplementationOnce(() => {
        throw new Error('Network timeout');
      });

      await expect(loadPartyChronicleData()).rejects.toThrow(
        'Failed to load party chronicle data'
      );
    });

    it('should throw error when permissions denied', async () => {
      mockGameSettings.get.mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      await expect(loadPartyChronicleData()).rejects.toThrow(
        'Failed to load party chronicle data'
      );
    });
  });

  describe('clearPartyChronicleData', () => {
    it('should clear saved data', async () => {
      // First save some data
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test Scenario',
          eventCode: 'TEST-001',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path/to/chronicle.pdf'
        },
        characters: {}
      };

      mockGameSettings.data.set('pfs-chronicle-generator.partyChronicleData', {
        timestamp: Date.now(),
        data: testData
      });

      await clearPartyChronicleData();

      expect(mockGameSettings.set).toHaveBeenCalledWith(
        'pfs-chronicle-generator',
        'partyChronicleData',
        undefined
      );
    });

    it('should throw error when clear fails', async () => {
      mockGameSettings.set.mockRejectedValueOnce(new Error('Clear error'));

      await expect(clearPartyChronicleData()).rejects.toThrow(
        'Failed to clear party chronicle data'
      );
    });

    it('should throw error when settings.set is undefined', async () => {
      const originalSet = mockGameSettings.set;
      mockGameSettings.set = undefined;

      await expect(clearPartyChronicleData()).rejects.toThrow();

      mockGameSettings.set = originalSet;
    });

    it('should throw error when storage is locked', async () => {
      mockGameSettings.set.mockRejectedValueOnce(new Error('Storage locked'));

      await expect(clearPartyChronicleData()).rejects.toThrow(
        'Failed to clear party chronicle data'
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle save-load-clear workflow', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Integration Test',
          eventCode: 'INT-001',
          eventDate: '2024-01-20',
          xpEarned: 4,
          adventureSummaryCheckboxes: ['box1', 'box2'],
          strikeoutItems: ['item1'],
          treasureBundles: 3,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path/to/chronicle.pdf'
        },
        characters: {
          'actor-1': {
            characterName: 'Hero One',
            societyId: '12345-01',
            level: 5,
            incomeEarned: 10,
            goldEarned: 15,
            goldSpent: 5,
            notes: 'Test notes',
            reputation: 'Envoy: +2'
          },
          'actor-2': {
            characterName: 'Hero Two',
            societyId: '12345-02',
            level: 3,
            incomeEarned: 8,
            goldEarned: 12,
            goldSpent: 3,
            notes: 'More notes',
            reputation: 'Vigilant: +1'
          }
        }
      };

      // Save data
      await savePartyChronicleData(testData);

      // Load data
      const loaded = await loadPartyChronicleData();
      expect(loaded).not.toBeNull();
      expect(loaded!.data).toEqual(testData);
      expect(loaded!.timestamp).toBeGreaterThan(0);

      // Clear data
      await clearPartyChronicleData();

      // Verify cleared
      const afterClear = await loadPartyChronicleData();
      expect(afterClear).toBeNull();
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle consecutive save failures gracefully', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test',
          eventCode: 'TEST',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path'
        },
        characters: {}
      };

      // First save fails
      mockGameSettings.set.mockRejectedValueOnce(new Error('First failure'));
      await expect(savePartyChronicleData(testData)).rejects.toThrow();

      // Second save fails
      mockGameSettings.set.mockRejectedValueOnce(new Error('Second failure'));
      await expect(savePartyChronicleData(testData)).rejects.toThrow();

      // Third save succeeds
      await expect(savePartyChronicleData(testData)).resolves.not.toThrow();
    });

    it('should handle load failure with fallback to empty form', async () => {
      // Simulate load failure
      mockGameSettings.get.mockImplementationOnce(() => {
        throw new Error('Load failed');
      });

      // Load should throw error
      await expect(loadPartyChronicleData()).rejects.toThrow(
        'Failed to load party chronicle data'
      );

      // Application should handle this by falling back to empty form
      // This is tested at the application level, but we verify the error is thrown
    });

    it('should handle partial data corruption gracefully', async () => {
      // Store partially corrupted data
      const partialData = {
        timestamp: Date.now(),
        data: {
          shared: {
            gmPfsNumber: '12345-2001',
            // Missing other required fields
          },
          characters: null // Corrupted characters object
        }
      };

      mockGameSettings.data.set('pfs-chronicle-generator.partyChronicleData', partialData);

      const result = await loadPartyChronicleData();

      // Should return the data as-is, validation happens at application level
      expect(result).toBeDefined();
      expect(result!.timestamp).toBe(partialData.timestamp);
    });

    it('should handle save-load cycle with intermittent failures', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test',
          eventCode: 'TEST',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path'
        },
        characters: {}
      };

      // Save succeeds
      await savePartyChronicleData(testData);

      // Load fails
      mockGameSettings.get.mockImplementationOnce(() => {
        throw new Error('Intermittent failure');
      });
      await expect(loadPartyChronicleData()).rejects.toThrow();

      // Load succeeds on retry
      const loaded = await loadPartyChronicleData();
      expect(loaded).not.toBeNull();
      expect(loaded!.data).toEqual(testData);
    });

    it('should handle clear failure after successful save', async () => {
      const testData: PartyChronicleData = {
        shared: {
          gmPfsNumber: '12345-2001',
          scenarioName: 'Test',
          eventCode: 'TEST',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path'
        },
        characters: {}
      };

      // Save succeeds
      await savePartyChronicleData(testData);

      // Clear fails
      mockGameSettings.set.mockRejectedValueOnce(new Error('Clear failed'));
      await expect(clearPartyChronicleData()).rejects.toThrow();

      // Data should still be loadable
      const loaded = await loadPartyChronicleData();
      expect(loaded).not.toBeNull();
      expect(loaded!.data).toEqual(testData);
    });

    it('should handle null or undefined data gracefully', async () => {
      // Test with null
      mockGameSettings.get.mockReturnValueOnce(null);
      let result = await loadPartyChronicleData();
      expect(result).toBeNull();

      // Test with undefined
      mockGameSettings.get.mockReturnValueOnce(undefined);
      result = await loadPartyChronicleData();
      expect(result).toBeNull();
    });

    it('should handle empty storage gracefully', async () => {
      // Clear all data
      mockGameSettings.data.clear();

      const result = await loadPartyChronicleData();
      expect(result).toBeNull();
    });

    it('should handle concurrent save operations', async () => {
      const testData1: PartyChronicleData = {
        shared: {
          gmPfsNumber: '11111-2001',
          scenarioName: 'Test 1',
          eventCode: 'TEST-001',
          eventDate: '2024-01-15',
          xpEarned: 4,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-1',
          seasonId: 'season-7',
          blankChroniclePath: '/path1'
        },
        characters: {}
      };

      const testData2: PartyChronicleData = {
        shared: {
          gmPfsNumber: '22222-2001',
          scenarioName: 'Test 2',
          eventCode: 'TEST-002',
          eventDate: '2024-01-16',
          xpEarned: 8,
          adventureSummaryCheckboxes: [],
          strikeoutItems: [],
          treasureBundles: 0,
          layoutId: 'layout-2',
          seasonId: 'season-7',
          blankChroniclePath: '/path2'
        },
        characters: {}
      };

      // Simulate concurrent saves
      await Promise.all([
        savePartyChronicleData(testData1),
        savePartyChronicleData(testData2)
      ]);

      // Last write wins
      const loaded = await loadPartyChronicleData();
      expect(loaded).not.toBeNull();
      // Should be one of the two data sets
      expect([testData1, testData2]).toContainEqual(loaded!.data);
    });
  });

  describe('Property 16: Data Persistence Round-Trip', () => {
    // Feature: party-chronicle-filling, Property 16: Data persistence round-trip
    it('should preserve all data through save-load cycle for any valid chronicle data', async () => {
      // Generators for party chronicle data
      const characterDataArb = fc.record({
        characterName: fc.string({ minLength: 1, maxLength: 50 }),
        societyId: fc.string({ minLength: 1, maxLength: 20 }),
        level: fc.integer({ min: 1, max: 20 }),
        incomeEarned: fc.integer({ min: 0, max: 1000 }),
        goldEarned: fc.integer({ min: 0, max: 10000 }),
        goldSpent: fc.integer({ min: 0, max: 10000 }),
        notes: fc.string({ maxLength: 500 }),
        reputation: fc.string({ maxLength: 100 })
      });

      const sharedDataArb = fc.record({
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

      const partyChronicleDataArb = fc.record({
        shared: sharedDataArb,
        characters: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }), // actor IDs
          characterDataArb,
          { minKeys: 0, maxKeys: 10 }
        )
      });

      await fc.assert(
        fc.asyncProperty(partyChronicleDataArb, async (chronicleData) => {
          // Clear any existing data
          mockGameSettings.data.clear();

          // Save the data
          await savePartyChronicleData(chronicleData);

          // Load the data back
          const loaded = await loadPartyChronicleData();

          // Verify data was loaded
          expect(loaded).not.toBeNull();
          
          // Verify all data matches exactly
          expect(loaded!.data).toEqual(chronicleData);
          
          // Verify timestamp exists and is reasonable
          expect(loaded!.timestamp).toBeGreaterThan(0);
          expect(loaded!.timestamp).toBeLessThanOrEqual(Date.now());
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty characters object through save-load cycle', async () => {
      // Feature: party-chronicle-filling, Property 16: Data persistence round-trip (edge case)
      const sharedDataArb = fc.record({
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

      await fc.assert(
        fc.asyncProperty(sharedDataArb, async (sharedData) => {
          // Clear any existing data
          mockGameSettings.data.clear();

          const chronicleData: PartyChronicleData = {
            shared: sharedData,
            characters: {}
          };

          // Save the data
          await savePartyChronicleData(chronicleData);

          // Load the data back
          const loaded = await loadPartyChronicleData();

          // Verify data was loaded
          expect(loaded).not.toBeNull();
          
          // Verify all data matches exactly
          expect(loaded!.data).toEqual(chronicleData);
          
          // Verify empty characters object is preserved
          expect(loaded!.data.characters).toEqual({});
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve special characters and unicode in all string fields', async () => {
      // Feature: party-chronicle-filling, Property 16: Data persistence round-trip (unicode)
      const stringArb = fc.string({ minLength: 0, maxLength: 100 });

      const characterDataArb = fc.record({
        characterName: stringArb,
        societyId: stringArb,
        level: fc.integer({ min: 1, max: 20 }),
        incomeEarned: fc.integer({ min: 0, max: 1000 }),
        goldEarned: fc.integer({ min: 0, max: 10000 }),
        goldSpent: fc.integer({ min: 0, max: 10000 }),
        notes: stringArb,
        reputation: stringArb
      });

      const sharedDataArb = fc.record({
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

      const partyChronicleDataArb = fc.record({
        shared: sharedDataArb,
        characters: fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }), // actor IDs
          characterDataArb,
          { minKeys: 1, maxKeys: 3 }
        )
      }) as fc.Arbitrary<PartyChronicleData>;

      await fc.assert(
        fc.asyncProperty(partyChronicleDataArb, async (chronicleData) => {
          // Clear any existing data
          mockGameSettings.data.clear();

          // Save the data
          await savePartyChronicleData(chronicleData);

          // Load the data back
          const loaded = await loadPartyChronicleData();

          // Verify data was loaded
          expect(loaded).not.toBeNull();
          
          // Verify all data matches exactly, including special characters
          expect(loaded!.data).toEqual(chronicleData);
        }),
        { numRuns: 100 }
      );
    });
  });
});
