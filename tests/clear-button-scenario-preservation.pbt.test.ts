/**
 * Property-based bug condition exploration test for Clear Button Scenario Reset Bug
 * 
 * This test validates the bug condition: when the Clear button is clicked and confirmed,
 * the selected scenario (layout) resets to the first scenario of the season instead of
 * being preserved (bug behavior).
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code - failure confirms
 * the bug exists. The test encodes the EXPECTED (correct) behavior.
 * 
 * **Validates: Requirements party-chronicle-form-bugs 2.1, 2.2, 2.3**
 */

import fc from 'fast-check';

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

// Mock Foundry VTT game global with proper storage
const mockGameSettings: Record<string, any> = {
  'season': 'season-6',
  'layout': '6-01'
};

(global as any).game = {
  settings: {
    get: (module: string, key: string) => {
      return mockGameSettings[key];
    },
    set: async (module: string, key: string, value: any) => {
      mockGameSettings[key] = value;
      return Promise.resolve();
    }
  },
  world: {
    id: 'test-world'
  }
};

// Mock localStorage for storage tests
const mockStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }
};

// Helper function to clear mock storage
function clearMockStorage() {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
}

// Helper function to reset mock game settings
function resetMockGameSettings() {
  Object.keys(mockGameSettings).forEach(key => delete mockGameSettings[key]);
  mockGameSettings['season'] = 'season-6';
  mockGameSettings['layout'] = '6-01';
}

// Mock layoutStore before importing
jest.mock('../scripts/LayoutStore', () => ({
  layoutStore: {
    getSeasons: jest.fn(() => [
      { id: 'season-4', name: 'Season 4' },
      { id: 'season-5', name: 'Season 5' },
      { id: 'season-6', name: 'Season 6' }
    ]),
    getLayoutsByParent: jest.fn((seasonId: string) => {
      const seasonNumber = seasonId.replace('season-', '');
      // Return 12 scenarios for each season
      return Array.from({ length: 12 }, (_, i) => ({
        id: `${seasonNumber}-${String(i + 1).padStart(2, '0')}`,
        description: `Scenario ${seasonNumber}-${String(i + 1).padStart(2, '0')}`
      }));
    }),
    getLayout: jest.fn(async (layoutId: string) => ({
      id: layoutId,
      description: `Scenario ${layoutId}`,
      defaultChronicleLocation: undefined // No default for test layouts
    }))
  }
}));

// Mock party chronicle storage
jest.mock('../scripts/model/party-chronicle-storage', () => {
  const actualStorage = jest.requireActual('../scripts/model/party-chronicle-storage');
  return {
    ...actualStorage,
    // Use actual implementations but they'll use our mocked localStorage
  };
});

// Now import after mocking
import { PartyChronicleApp } from '../scripts/PartyChronicleApp';
import { savePartyChronicleData, clearPartyChronicleData } from '../scripts/model/party-chronicle-storage';
import { PartyActor } from '../scripts/handlers/event-listener-helpers';

/**
 * Property 1: Fault Condition - Clear Button Preserves Scenario Selection
 * 
 * **Validates: Requirements party-chronicle-form-bugs 2.1, 2.2, 2.3**
 * 
 * For any Clear button click event where the user confirms the clear action,
 * the fixed code SHALL preserve the selected season and scenario (layoutId) values,
 * and the re-rendered form SHALL display the correct scenario in the layout dropdown
 * and the correct chronicle path.
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: This test will FAIL, proving the bug exists.
 * The failure will show that the selected scenario resets to the first scenario of
 * the season after clearing.
 * 
 * Feature: party-chronicle-form-bugs, Property 1: Fault Condition
 */
describe('Clear Button Scenario Preservation Bug Condition Exploration', () => {
  beforeEach(() => {
    // Clear storage before each test
    clearMockStorage();
    resetMockGameSettings();
  });

  describe('Property 1: Fault Condition - Clear Button Preserves Scenario Selection', () => {
    /**
     * Test that Clear button preserves scenario selection across multiple seasons
     * 
     * This test uses property-based testing to verify the fix works for various
     * season and scenario combinations (Season 4-6, various scenarios within each season).
     */
    it('preserves selected scenario when Clear button is clicked and confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test cases for Season 4, 5, and 6 with multiple scenarios
          fc.record({
            seasonId: fc.constantFrom('season-4', 'season-5', 'season-6'),
            scenarioIndex: fc.integer({ min: 0, max: 11 }), // 0-11 for scenarios 01-12
            confirmed: fc.constant(true)
          }),
          async (input) => {
            // Generate scenario ID based on season and index
            // Season 4: 4-01 through 4-12
            // Season 5: 5-01 through 5-12
            // Season 6: 6-01 through 6-12
            const seasonNumber = input.seasonId.replace('season-', '');
            const scenarioNumber = String(input.scenarioIndex + 1).padStart(2, '0');
            const layoutId = `${seasonNumber}-${scenarioNumber}`;
            const scenarioName = `Scenario ${seasonNumber}-${scenarioNumber}`;
            const chroniclePath = `chronicles/season-${seasonNumber}/${layoutId}.pdf`;
            
            // Step 1: Save initial data with a specific scenario selected
            const initialData = {
              shared: {
                gmPfsNumber: 'GM-12345',
                scenarioName: scenarioName,
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 8,
                downtimeDays: 8,
                layoutId: layoutId,
                seasonId: input.seasonId,
                blankChroniclePath: chroniclePath,
                adventureSummaryCheckboxes: ['checkbox1', 'checkbox2'],
                strikeoutItems: ['item1'],
                chosenFactionReputation: 4,
                reputationValues: {
                  EA: 1,
                  GA: 2,
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
                'char1': {
                  characterName: 'Test Character',
                  playerNumber: '12345', characterNumber: '2001',
                  level: 5,
                  taskLevel: 3,
                  successLevel: 'success',
                  proficiencyRank: 'trained',
                  earnedIncome: 50,
                  currencySpent: 10,
                  notes: 'Test notes',
                  consumeReplay: false
                }
              }
            };
            
            await savePartyChronicleData(initialData);
            
            // Step 2: Simulate the Clear button handler behavior
            // The Clear button handler preserves these values:
            const preservedValues = {
              gmPfsNumber: initialData.shared.gmPfsNumber,
              scenarioName: initialData.shared.scenarioName,
              eventCode: initialData.shared.eventCode,
              chroniclePath: initialData.shared.blankChroniclePath,
              seasonId: initialData.shared.seasonId,
              layoutId: initialData.shared.layoutId
            };
            
            // Clear all data
            await clearPartyChronicleData();
            
            // Create new data with preserved values and smart defaults
            const clearedData = {
              shared: {
                gmPfsNumber: preservedValues.gmPfsNumber,
                scenarioName: preservedValues.scenarioName,
                eventCode: preservedValues.eventCode,
                eventDate: '',
                xpEarned: 4, // Smart default for scenario
                treasureBundles: 8, // Smart default for scenario
                downtimeDays: 8, // Smart default for scenario
                layoutId: preservedValues.layoutId, // SHOULD BE PRESERVED
                seasonId: preservedValues.seasonId, // SHOULD BE PRESERVED
                blankChroniclePath: preservedValues.chroniclePath, // SHOULD BE PRESERVED
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 4,
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
                'char1': {
                  characterName: 'Test Character',
                  playerNumber: '', characterNumber: '',
                  level: 5,
                  taskLevel: 3,
                  successLevel: 'success',
                  proficiencyRank: 'trained',
                  earnedIncome: 0,
                  currencySpent: 0,
                  notes: '',
                  consumeReplay: false
                }
              }
            };
            
            // Save the cleared data with preserved values
            await savePartyChronicleData(clearedData);
            
            // Step 3: Simulate form re-render by calling _prepareContext
            // This is what renderPartyChronicleForm does after clearing
            const mockPartyActors = [
              {
                id: 'char1',
                name: 'Test Character',
                type: 'character',
                img: 'icons/svg/mystery-man.svg',
                system: {
                  details: {
                    level: { value: 5 }
                  },
                  pfs: {
                    playerNumber: '12345',
                    characterNumber: '2001'
                  }
                }
              }
            ] as unknown as PartyActor[];
            
            const chronicleApp = new PartyChronicleApp(mockPartyActors);
            const context = await chronicleApp._prepareContext();
            
            // Step 4: Verify the context has the correct selectedLayoutId
            // This is what the template uses to mark the selected option
            
            // Property 1: The selectedLayoutId should match the original layoutId
            // This is the EXPECTED (correct) behavior
            // On unfixed code, this will FAIL because selectedLayoutId resets to first scenario
            expect(context.selectedLayoutId).toBe(layoutId);
            
            // Property 2: The saved data should contain the preserved layoutId
            expect(context.savedData?.shared?.layoutId).toBe(layoutId);
            
            // Property 3: The saved data should contain the preserved seasonId
            expect(context.savedData?.shared?.seasonId).toBe(input.seasonId);
            
            // Property 4: The chronicle path should match the original scenario
            expect(context.savedData?.shared?.blankChroniclePath).toBe(chroniclePath);
            
            // When this test FAILS on unfixed code, it will show:
            // Expected: "6-03" (or other non-first scenario)
            // Received: "6-01" (first scenario of the season)
            // This proves the bug exists
          }
        ),
        { numRuns: 30 } // Test with 30 different season/scenario combinations
      );
    });

    /**
     * Test that demonstrates the bug with specific counterexamples
     * 
     * This test explicitly checks known problematic scenarios that are likely
     * to trigger the bug (non-first scenarios in each season).
     */
    it('documents expected counterexamples for non-first scenarios', async () => {
      // Test specific scenarios that are NOT the first scenario of their season
      const testCases = [
        { seasonId: 'season-6', layoutId: '6-03', scenarioName: 'Scenario 6-03', chroniclePath: 'chronicles/season-6/6-03.pdf' },
        { seasonId: 'season-5', layoutId: '5-12', scenarioName: 'Scenario 5-12', chroniclePath: 'chronicles/season-5/5-12.pdf' },
        { seasonId: 'season-4', layoutId: '4-05', scenarioName: 'Scenario 4-05', chroniclePath: 'chronicles/season-4/4-05.pdf' }
      ];
      
      for (const testCase of testCases) {
        // Clear storage for each test case
        clearMockStorage();
        resetMockGameSettings();
        
        // Step 1: Save initial data with specific scenario
        const initialData = {
          shared: {
            gmPfsNumber: 'GM-12345',
            scenarioName: testCase.scenarioName,
            eventCode: 'TEST-001',
            eventDate: '',
            layoutId: testCase.layoutId,
            seasonId: testCase.seasonId,
            blankChroniclePath: testCase.chroniclePath,
            xpEarned: 4,
            treasureBundles: 8,
            downtimeDays: 8,
            adventureSummaryCheckboxes: [],
            strikeoutItems: [],
            chosenFactionReputation: 4,
            reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
            reportingA: false,
            reportingB: false,
            reportingC: false,
            reportingD: false,
            chosenFaction: ''
          },
          characters: {}
        };
        
        await savePartyChronicleData(initialData);
        
        // Step 2: Simulate Clear button handler
        const preservedLayoutId = initialData.shared.layoutId;
        const preservedSeasonId = initialData.shared.seasonId;
        const preservedChroniclePath = initialData.shared.blankChroniclePath;
        const preservedScenarioName = initialData.shared.scenarioName;
        
        await clearPartyChronicleData();
        
        const clearedData = {
          shared: {
            layoutId: preservedLayoutId,
            seasonId: preservedSeasonId,
            blankChroniclePath: preservedChroniclePath,
            scenarioName: preservedScenarioName,
            gmPfsNumber: 'GM-12345',
            eventCode: 'TEST-001',
            eventDate: '',
            xpEarned: 4,
            treasureBundles: 8,
            downtimeDays: 8,
            adventureSummaryCheckboxes: [],
            strikeoutItems: [],
            chosenFactionReputation: 4,
            reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
            reportingA: false,
            reportingB: false,
            reportingC: false,
            reportingD: false,
            chosenFaction: ''
          },
          characters: {}
        };
        
        await savePartyChronicleData(clearedData);
        
        // Step 3: Simulate form re-render
        const mockPartyActors: any[] = [];
        const chronicleApp = new PartyChronicleApp(mockPartyActors);
        const context = await chronicleApp._prepareContext();
        
        // Property: selectedLayoutId should match the preserved layoutId
        // This is the EXPECTED (correct) behavior
        expect(context.selectedLayoutId).toBe(testCase.layoutId);
        
        // This test documents the EXPECTED behavior:
        // - Season 6, Scenario 6-03 should remain 6-03 after clearing (not reset to 6-01)
        // - Season 5, Scenario 5-12 should remain 5-12 after clearing (not reset to 5-01)
        // - Season 4, Scenario 4-05 should remain 4-05 after clearing (not reset to 4-01)
      }
    });

    /**
     * Test that verifies the bug condition from the design document
     * 
     * Bug condition: isBugCondition_ClearResetScenario(input) where:
     * - input.action == 'clear'
     * - input.confirmed == true
     * - input.layoutId != ''
     * - afterClear_selectedLayoutId != input.layoutId
     */
    it('verifies bug condition: Clear confirmed AND layoutId preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            action: fc.constant('clear'),
            confirmed: fc.constant(true),
            seasonId: fc.constantFrom('season-4', 'season-5', 'season-6'),
            scenarioIndex: fc.integer({ min: 1, max: 11 }) // 1-11 to avoid first scenario
          }),
          async (bugCondition) => {
            // Clear storage for each test
            clearMockStorage();
            resetMockGameSettings();
            
            // Verify we're testing the exact bug condition
            expect(bugCondition.action).toBe('clear');
            expect(bugCondition.confirmed).toBe(true);
            
            // Generate layoutId from season and scenario index
            const seasonNumber = bugCondition.seasonId.replace('season-', '');
            const scenarioNumber = String(bugCondition.scenarioIndex + 1).padStart(2, '0');
            const layoutId = `${seasonNumber}-${scenarioNumber}`;
            
            expect(layoutId).not.toBe(''); // layoutId is not empty
            
            // Step 1: Save initial data
            const initialData = {
              shared: {
                layoutId: layoutId,
                seasonId: bugCondition.seasonId,
                gmPfsNumber: 'GM-12345',
                scenarioName: `Scenario ${layoutId}`,
                eventCode: 'TEST-001',
                eventDate: '',
                blankChroniclePath: `chronicles/season-${seasonNumber}/${layoutId}.pdf`,
                xpEarned: 4,
                treasureBundles: 8,
                downtimeDays: 8,
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 4,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
                chosenFaction: ''
              },
              characters: {}
            };
            
            await savePartyChronicleData(initialData);
            
            // Step 2: Simulate Clear button handler
            const preservedLayoutId = layoutId;
            const preservedSeasonId = bugCondition.seasonId;
            
            await clearPartyChronicleData();
            
            const clearedData = {
              shared: {
                layoutId: preservedLayoutId,
                seasonId: preservedSeasonId,
                gmPfsNumber: 'GM-12345',
                scenarioName: `Scenario ${layoutId}`,
                eventCode: 'TEST-001',
                eventDate: '',
                blankChroniclePath: `chronicles/season-${seasonNumber}/${layoutId}.pdf`,
                xpEarned: 4,
                treasureBundles: 8,
                downtimeDays: 8,
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 4,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
                chosenFaction: ''
              },
              characters: {}
            };
            
            await savePartyChronicleData(clearedData);
            
            // Step 3: Simulate form re-render
            const mockPartyActors: any[] = [];
            const chronicleApp = new PartyChronicleApp(mockPartyActors);
            const context = await chronicleApp._prepareContext();
            
            // Property: afterClear_selectedLayoutId SHOULD EQUAL input.layoutId
            // This is the EXPECTED (correct) behavior
            // On unfixed code, this will FAIL because selectedLayoutId resets to first scenario
            expect(context.selectedLayoutId).toBe(layoutId);
            
            // When this test FAILS on unfixed code, it will show:
            // Expected: "6-03" (or other non-first scenario)
            // Received: "6-01" (first scenario of the season)
            // This proves the bug exists
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
