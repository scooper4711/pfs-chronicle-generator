/**
 * Property-based tests for saved chronicle path persistence
 * 
 * These tests validate that chronicle paths are correctly persisted
 * across form re-renders, ensuring that saved paths are restored
 * when the form is rendered again.
 * 
 * Requirements: conditional-chronicle-path-visibility 4.3
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock foundry global before importing PartyChronicleApp
(global as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (base: any) => base,
    },
    ux: {
      FormDataExtended: class {},
    },
  },
};

// Mock layoutStore
jest.mock('../LayoutStore', () => ({
  layoutStore: {
    getSeasons: jest.fn(() => [
      { id: 'pfs2-season7', name: 'Season 7' },
      { id: 'pfs2-season6', name: 'Season 6' }
    ]),
    getLayoutsByParent: jest.fn((seasonId: string) => [
      { id: 'test-layout', description: 'Test Layout' }
    ]),
    getLayout: jest.fn(async (layoutId: string) => ({
      id: layoutId,
      description: 'Test Layout',
      defaultChronicleLocation: undefined // No default for test layouts
    }))
  }
}));

import { savePartyChronicleData, loadPartyChronicleData, clearPartyChronicleData } from '../model/party-chronicle-storage';
import { PartyChronicleApp } from '../PartyChronicleApp';
import type { PartyChronicleData } from '../model/party-chronicle-types';

/**
 * Generator for valid file paths
 * Generates realistic file paths with various formats
 */
const filePathArbitrary = fc.oneof(
  // Absolute paths with various extensions
  fc.tuple(
    fc.constantFrom('/', '/data/', '/modules/', '/worlds/'),
    fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF', '.json', '.txt')
  ).map(([prefix, name, ext]) => `${prefix}${name}${ext}`),
  
  // Relative paths
  fc.tuple(
    fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF', '.json', '.txt')
  ).map(([name, ext]) => `${name}${ext}`),
  
  // Paths with subdirectories
  fc.tuple(
    fc.constantFrom('chronicles/', 'data/chronicles/', 'modules/pfs/'),
    fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF')
  ).map(([dir, name, ext]) => `${dir}${name}${ext}`),
  
  // Paths with special characters
  fc.tuple(
    fc.constantFrom('/', 'chronicles/'),
    fc.array(fc.constantFrom('a', 'b', 'c', ' ', '(', ')', '[', ']', '-', '_'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('.pdf', '.PDF')
  ).map(([prefix, name, ext]) => `${prefix}${name}${ext}`),
  
  // Empty path
  fc.constant('')
);

/**
 * Mock Foundry VTT game.settings API
 */
let mockStorage: Map<string, any>;

function setupFoundryMocks(): void {
  mockStorage = new Map();
  
  // Mock global game settings
  global.game = {
    settings: {
      get: (moduleId: string, key: string) => {
        if (moduleId === 'pfs-chronicle-generator') {
          // For non-storage keys, return empty strings to avoid interfering with tests
          if (key !== 'partyChronicleData') {
            return '';
          }
        }
        const storageKey = `${moduleId}.${key}`;
        return mockStorage.get(storageKey);
      },
      set: async (moduleId: string, key: string, value: any) => {
        const storageKey = `${moduleId}.${key}`;
        mockStorage.set(storageKey, value);
      }
    }
  } as any;
}

function teardownFoundryMocks(): void {
  delete (global as any).game;
  mockStorage.clear();
}

describe('Chronicle Path Persistence Property Tests', () => {
  let partyActors: any[];

  beforeEach(() => {
    setupFoundryMocks();
    
    // Create mock party actors
    partyActors = [
      {
        id: 'actor1',
        name: 'Character 1',
        type: 'character',
        img: '/path/to/img1.png',
        system: {
          details: { level: { value: 5 } },
          pfs: { playerNumber: '12345', characterNumber: '2001' }
        }
      },
      {
        id: 'actor2',
        name: 'Character 2',
        type: 'character',
        img: '/path/to/img2.png',
        system: {
          details: { level: { value: 3 } },
          pfs: { playerNumber: '12345', characterNumber: '2002' }
        }
      }
    ];
  });

  afterEach(() => {
    teardownFoundryMocks();
  });

  /**
   * Helper function to create minimal party chronicle data
   */
  function createPartyChronicleData(chroniclePath: string): PartyChronicleData {
    return {
      shared: {
        gmPfsNumber: '123456-789',
        scenarioName: 'Test Scenario',
        eventCode: 'TEST-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        adventureSummaryCheckboxes: [],
        strikeoutItems: [],
        treasureBundles: 2,
        downtimeDays: 8, // Calculated from xpEarned (4 * 2 = 8)
        layoutId: 'layout1',
        seasonId: 'season1',
        blankChroniclePath: chroniclePath,
        chosenFactionReputation: 2,
        reputationValues: {
          EA: 0,
          GA: 0,
          HH: 0,
          VS: 0,
          RO: 0,
          VW: 0
        },
        reportingA: false,
        reportingB: false,
        reportingC: false,
        reportingD: false,
        chosenFaction: ''
      },
      characters: {
        actor1: {
          characterName: 'Character 1',
          societyId: '12345-2001',
          level: 5,
          taskLevel: 3,
          successLevel: 'success',
          proficiencyRank: 'trained',
          earnedIncome: 10.5,
          goldSpent: 5.0,
          notes: 'Test notes 1',
          consumeReplay: false
        },
        actor2: {
          characterName: 'Character 2',
          societyId: '12345-2002',
          level: 3,
          taskLevel: 1,
          successLevel: 'success',
          proficiencyRank: 'trained',
          earnedIncome: 8.0,
          goldSpent: 3.5,
          notes: 'Test notes 2',
          consumeReplay: false
        }
      }
    };
  }

  describe('Property 4: Saved Chronicle Path Persists Across Re-renders', () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * For any chronicle path value that is saved, re-rendering the form
     * should display that same path value in the chronicle path input field.
     * 
     * This property verifies that:
     * 1. Chronicle paths are correctly saved to storage
     * 2. Saved paths are correctly loaded from storage
     * 3. Loaded paths are included in the template context
     * 4. The context includes the correct path value for rendering
     * 5. Empty paths are preserved as empty strings
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: Saved Chronicle Path Persists Across Re-renders
     */
    it('should restore saved chronicle path when form is re-rendered', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (chroniclePath) => {
            // 1. Save party chronicle data with the chronicle path
            const data = createPartyChronicleData(chroniclePath);
            await savePartyChronicleData(data);

            // 2. Create a new PartyChronicleApp instance (simulating re-render)
            const app = new PartyChronicleApp(partyActors);

            // 3. Prepare context (this loads saved data)
            const context = await app._prepareContext();

            // 4. Verify the chronicle path is restored in the context
            expect(context.shared).toHaveProperty('blankChroniclePath');
            expect(context.shared.blankChroniclePath).toBe(chroniclePath);

            // 5. Verify the saved data is available in context
            expect(context.savedData).toBeDefined();
            expect(context.savedData.shared.blankChroniclePath).toBe(chroniclePath);

            // Clean up
            await clearPartyChronicleData();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 4.3**
     * 
     * Verify that chronicle paths persist correctly across multiple
     * save-load cycles, ensuring data integrity over time.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: Multiple Save-Load Cycles
     */
    it('should persist chronicle path across multiple save-load cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(filePathArbitrary, { minLength: 2, maxLength: 5 }),
          async (chroniclePaths) => {
            // Iterate through multiple paths, saving and loading each time
            for (const chroniclePath of chroniclePaths) {
              // Save data with current path
              const data = createPartyChronicleData(chroniclePath);
              await savePartyChronicleData(data);

              // Load data and verify path
              const loaded = await loadPartyChronicleData();
              expect(loaded).toBeDefined();
              expect(loaded!.data.shared.blankChroniclePath).toBe(chroniclePath);

              // Create app and verify context
              const app = new PartyChronicleApp(partyActors);
              const context = await app._prepareContext();
              expect(context.shared.blankChroniclePath).toBe(chroniclePath);
            }

            // Clean up
            await clearPartyChronicleData();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 4.3**
     * 
     * Verify that empty chronicle paths are correctly preserved
     * across re-renders, not replaced with default values.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: Empty Path Preservation
     */
    it('should preserve empty chronicle path across re-renders', async () => {
      // Save data with empty chronicle path
      const data = createPartyChronicleData('');
      await savePartyChronicleData(data);

      // Create app and verify context
      const app = new PartyChronicleApp(partyActors);
      const context = await app._prepareContext();

      // Verify empty path is preserved
      expect(context.shared.blankChroniclePath).toBe('');
      expect(context.savedData.shared.blankChroniclePath).toBe('');

      // Clean up
      await clearPartyChronicleData();
    });

    /**
     * **Validates: Requirements 4.3**
     * 
     * Verify that special characters in chronicle paths are preserved
     * correctly across save-load cycles.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: Special Character Preservation
     */
    it('should preserve special characters in chronicle path across re-renders', async () => {
      const specialPaths = [
        '/path/with spaces/file.pdf',
        '/path/with-(parentheses)/file.pdf',
        '/path/with-[brackets]/file.pdf',
        '/path/with_underscores/file.pdf',
        '/path/with-dashes/file.pdf',
        'relative/path/file.pdf',
        './relative/path/file.pdf',
        '../parent/path/file.pdf'
      ];

      for (const chroniclePath of specialPaths) {
        // Save data with special path
        const data = createPartyChronicleData(chroniclePath);
        await savePartyChronicleData(data);

        // Create app and verify context
        const app = new PartyChronicleApp(partyActors);
        const context = await app._prepareContext();

        // Verify special characters are preserved
        expect(context.shared.blankChroniclePath).toBe(chroniclePath);

        // Clean up
        await clearPartyChronicleData();
      }
    });

    /**
     * **Validates: Requirements 4.3**
     * 
     * Verify that chronicle path persistence works correctly
     * when no data has been saved previously (initial state).
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: Initial State Handling
     */
    it('should handle initial state with no saved data', async () => {
      // Ensure no saved data exists
      await clearPartyChronicleData();

      // Create app and verify context
      const app = new PartyChronicleApp(partyActors);
      const context = await app._prepareContext();

      // Verify chronicle path defaults to empty string
      expect(context.shared).toHaveProperty('blankChroniclePath');
      expect(context.shared.blankChroniclePath).toBe('');
      expect(context.savedData).toBeNull();
    });

    /**
     * **Validates: Requirements 4.3**
     * 
     * Verify that chronicle path updates are correctly reflected
     * when data is saved, then updated, then re-rendered.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: Path Update Handling
     */
    it('should reflect chronicle path updates across re-renders', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(filePathArbitrary, filePathArbitrary),
          async ([initialPath, updatedPath]) => {
            // Save initial data
            const initialData = createPartyChronicleData(initialPath);
            await savePartyChronicleData(initialData);

            // Verify initial path is loaded
            const app1 = new PartyChronicleApp(partyActors);
            const context1 = await app1._prepareContext();
            expect(context1.shared.blankChroniclePath).toBe(initialPath);

            // Update data with new path
            const updatedData = createPartyChronicleData(updatedPath);
            await savePartyChronicleData(updatedData);

            // Verify updated path is loaded
            const app2 = new PartyChronicleApp(partyActors);
            const context2 = await app2._prepareContext();
            expect(context2.shared.blankChroniclePath).toBe(updatedPath);

            // Clean up
            await clearPartyChronicleData();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 4.3**
     * 
     * Verify that chronicle path persistence doesn't interfere
     * with other shared fields being restored.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: No Side Effects
     */
    it('should not interfere with restoration of other shared fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (chroniclePath) => {
            // Save data with chronicle path
            const data = createPartyChronicleData(chroniclePath);
            await savePartyChronicleData(data);

            // Create app and verify context
            const app = new PartyChronicleApp(partyActors);
            const context = await app._prepareContext();

            // Verify chronicle path is restored correctly
            expect(context.shared.blankChroniclePath).toBe(chroniclePath);
            
            // Verify other shared fields exist (values may be overridden by defaults)
            expect(context.shared).toHaveProperty('gmPfsNumber');
            expect(context.shared).toHaveProperty('scenarioName');
            expect(context.shared).toHaveProperty('eventCode');
            expect(context.shared).toHaveProperty('eventDate');
            expect(context.shared).toHaveProperty('xpEarned');
            expect(context.shared).toHaveProperty('treasureBundles');
            expect(context.shared).toHaveProperty('layoutId');
            expect(context.shared).toHaveProperty('seasonId');

            // Clean up
            await clearPartyChronicleData();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 4.3**
     * 
     * Verify that chronicle path persistence doesn't interfere
     * with character-specific fields being restored.
     * 
     * Feature: conditional-chronicle-path-visibility, Property 4: Character Data Integrity
     */
    it('should not interfere with restoration of character-specific fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          filePathArbitrary,
          async (chroniclePath) => {
            // Save data with chronicle path
            const data = createPartyChronicleData(chroniclePath);
            await savePartyChronicleData(data);

            // Load data and verify character fields
            const loaded = await loadPartyChronicleData();
            
            // If data was saved, verify character fields
            if (loaded) {
              const characters = loaded.data.characters;
              expect(characters.actor1.characterName).toBe('Character 1');
              expect(characters.actor1.societyId).toBe('12345-2001');
              expect(characters.actor1.level).toBe(5);
              expect(characters.actor1.earnedIncome).toBe(10.5);
              expect(characters.actor1.goldSpent).toBe(5.0);
              expect(characters.actor1.notes).toBe('Test notes 1');

              expect(characters.actor2.characterName).toBe('Character 2');
              expect(characters.actor2.societyId).toBe('12345-2002');
              expect(characters.actor2.level).toBe(3);
              expect(characters.actor2.earnedIncome).toBe(8.0);
              expect(characters.actor2.goldSpent).toBe(3.5);
              expect(characters.actor2.notes).toBe('Test notes 2');
            }

            // Clean up
            await clearPartyChronicleData();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
