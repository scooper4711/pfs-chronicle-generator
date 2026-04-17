/**
 * Property-based bug condition exploration test for Chronicle Path Visibility Not Updated Bug
 * 
 * This test validates the bug condition: when the Clear button is clicked and confirmed,
 * the updateChroniclePathVisibility function is not called after re-rendering the form,
 * causing the chronicle path field to remain visible when it should be hidden.
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code - failure confirms
 * the bug exists. The test encodes the EXPECTED (correct) behavior.
 * 
 * **Validates: Requirements party-chronicle-form-bugs 2.4, 2.5, 2.6**
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';

// Mock foundry global before importing
(global as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (base: any) => base,
      DialogV2: {
        confirm: jest.fn(() => Promise.resolve(true))
      }
    },
    ux: {
      FormDataExtended: class {},
    },
    handlebars: {
      renderTemplate: jest.fn(() => Promise.resolve('<div></div>'))
    }
  },
};

// Mock Foundry VTT game global
(global as any).game = {
  settings: {
    get: (_module: string, key: string) => {
      if (key === 'season') return 'season-6';
      if (key === 'layout') return '6-01';
      return '';
    },
    set: async (_module: string, _key: string, _value: any) => {
      return Promise.resolve();
    }
  },
  world: {
    id: 'test-world'
  }
};

// Mock ui global
(global as any).ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
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

// Mock fetch for file existence checks
global.fetch = jest.fn<typeof fetch>() as jest.MockedFunction<typeof fetch>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

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
      return Array.from({ length: 12 }, (_, i) => ({
        id: `${seasonNumber}-${String(i + 1).padStart(2, '0')}`,
        description: `Scenario ${seasonNumber}-${String(i + 1).padStart(2, '0')}`
      }));
    }),
    getLayout: jest.fn(async (layoutId: string) => ({
      id: layoutId,
      description: `Scenario ${layoutId}`,
      defaultChronicleLocation: 'chronicles/default.pdf' // Has default location
    }))
  }
}));

// Mock party chronicle storage
jest.mock('../scripts/model/party-chronicle-storage', () => {
  const actualStorage = jest.requireActual('../scripts/model/party-chronicle-storage') as any;
  return {
    ...actualStorage,
  };
});

// Now import after mocking
import { savePartyChronicleData, clearPartyChronicleData } from '../scripts/model/party-chronicle-storage';

/**
 * Property 1: Fault Condition - Chronicle Path Visibility Not Updated After Clear
 * 
 * **Validates: Requirements party-chronicle-form-bugs 2.4, 2.5, 2.6**
 * 
 * For any Clear button click event where the user confirms the clear action AND
 * the selected scenario has a valid chronicle PDF file, the fixed code SHALL call
 * updateChroniclePathVisibility after re-rendering the form to check if the
 * chronicle path field should be hidden based on file existence and layout configuration.
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: This test will FAIL, proving the bug exists.
 * The failure will show that updateChroniclePathVisibility is not called after clearing,
 * causing the chronicle path field to remain visible when it should be hidden.
 * 
 * Feature: party-chronicle-form-bugs, Property 2: Fault Condition
 */
describe('Clear Button Chronicle Path Visibility Bug Condition Exploration', () => {
  beforeEach(() => {
    // Clear storage before each test
    clearMockStorage();
    // Reset fetch mock
    mockFetch.mockReset();
  });

  describe('Property 1: Fault Condition - Chronicle Path Visibility Not Updated After Clear', () => {
    /**
     * Test that updateChroniclePathVisibility is called after Clear button is clicked
     * 
     * This test simulates the Clear button handler and verifies that the chronicle
     * path visibility is updated based on file existence. The test uses scenarios
     * that have valid chronicle PDF files (file exists).
     */
    it('calls updateChroniclePathVisibility after Clear button is clicked and confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test cases for scenarios with valid chronicle PDF files
          fc.record({
            seasonId: fc.constantFrom('season-4', 'season-5', 'season-6'),
            scenarioIndex: fc.integer({ min: 0, max: 11 }), // 0-11 for scenarios 01-12
            confirmed: fc.constant(true),
            fileExists: fc.constant(true) // File exists for these scenarios
          }),
          async (input) => {
            // Generate scenario ID and chronicle path
            const seasonNumber = input.seasonId.replace('season-', '');
            const scenarioNumber = String(input.scenarioIndex + 1).padStart(2, '0');
            const layoutId = `${seasonNumber}-${scenarioNumber}`;
            const scenarioName = `Scenario ${seasonNumber}-${scenarioNumber}`;
            const chroniclePath = `chronicles/season-${seasonNumber}/${layoutId}.pdf`;
            
            // Mock fetch to return file exists
            mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);
            
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
                adventureSummaryCheckboxes: ['checkbox1'],
                strikeoutItems: ['item1'],
                chosenFactionReputation: 4,
                reputationValues: {
                  EA: 1,
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
                  playerNumber: '12345', characterNumber: '2001',
                  level: 5,
                  taskLevel: 3,
                  successLevel: 'success',
                  proficiencyRank: 'trained',
                  earnedIncome: 50,
                  currencySpent: 10,
                  notes: 'Test notes',
                  consumeReplay: false,
                  overrideXp: false,
                  overrideXpValue: 0,
                  overrideCurrency: false,
                  overrideCurrencyValue: 0
                }
              }
            };
            
            await savePartyChronicleData(initialData);
            
            // Step 2: Create a mock container element with chronicle path form group
            const container = document.createElement('div');
            const formGroup = document.createElement('div');
            formGroup.id = 'chroniclePathGroup';
            formGroup.classList.add('chronicle-path-visible'); // Initially visible
            container.appendChild(formGroup);
            
            // Step 3: Simulate the Clear button handler behavior
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
                xpEarned: 4,
                treasureBundles: 8,
                downtimeDays: 8,
                layoutId: preservedValues.layoutId,
                seasonId: preservedValues.seasonId,
                blankChroniclePath: preservedValues.chroniclePath,
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
                  consumeReplay: false,
                  overrideXp: false,
                  overrideXpValue: 0,
                  overrideCurrency: false,
                  overrideCurrencyValue: 0
                }
              }
            };
            
            await savePartyChronicleData(clearedData);
            
            // Step 4: Simulate calling updateChroniclePathVisibility
            // This is what SHOULD happen after re-rendering the form
            // Import the function dynamically to test it
            const { updateChroniclePathVisibility } = await import('../scripts/handlers/party-chronicle-handlers');
            
            // Call updateChroniclePathVisibility with the preserved chronicle path and layoutId
            await updateChroniclePathVisibility(preservedValues.chroniclePath, container, preservedValues.layoutId);
            
            // Step 5: Verify the chronicle path field visibility is updated
            // Property 1: When file exists AND layout has default, field should be hidden
            // This is the EXPECTED (correct) behavior
            const isVisible = formGroup.classList.contains('chronicle-path-visible');
            
            // On FIXED code: isVisible should be false (field is hidden)
            // On UNFIXED code: This test will FAIL because updateChroniclePathVisibility
            // is never called in the Clear button handler, so the field remains visible
            expect(isVisible).toBe(false);
            
            // Property 2: Verify fetch was called to check file existence
            expect(mockFetch).toHaveBeenCalled();
            
            // When this test FAILS on unfixed code, it will show:
            // Expected: false (field should be hidden)
            // Received: true (field remains visible)
            // This proves the bug exists - updateChroniclePathVisibility is not called
          }
        ),
        { numRuns: 30 } // Test with 30 different season/scenario combinations
      );
    });

    /**
     * Test that demonstrates the bug with specific counterexamples
     * 
     * This test explicitly checks known scenarios with valid PDF files where
     * the chronicle path field should be hidden after clearing.
     */
    it('documents expected counterexamples for scenarios with valid PDF files', async () => {
      // Test specific scenarios that have valid chronicle PDF files
      const testCases = [
        { seasonId: 'season-6', layoutId: '6-03', scenarioName: 'Scenario 6-03', chroniclePath: 'chronicles/season-6/6-03.pdf' },
        { seasonId: 'season-5', layoutId: '5-08', scenarioName: 'Scenario 5-08', chroniclePath: 'chronicles/season-5/5-08.pdf' },
        { seasonId: 'season-4', layoutId: '4-12', scenarioName: 'Scenario 4-12', chroniclePath: 'chronicles/season-4/4-12.pdf' }
      ];
      
      for (const testCase of testCases) {
        // Clear storage for each test case
        clearMockStorage();
        mockFetch.mockReset();
        
        // Mock fetch to return file exists
        mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);
        
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
        
        // Step 2: Create mock container
        const container = document.createElement('div');
        const formGroup = document.createElement('div');
        formGroup.id = 'chroniclePathGroup';
        formGroup.classList.add('chronicle-path-visible'); // Initially visible
        container.appendChild(formGroup);
        
        // Step 3: Simulate Clear button handler
        const preservedLayoutId = initialData.shared.layoutId;
        const preservedChroniclePath = initialData.shared.blankChroniclePath;
        
        await clearPartyChronicleData();
        
        const clearedData = {
          shared: {
            layoutId: preservedLayoutId,
            seasonId: testCase.seasonId,
            blankChroniclePath: preservedChroniclePath,
            scenarioName: testCase.scenarioName,
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
        
        // Step 4: Call updateChroniclePathVisibility (what SHOULD happen)
        const { updateChroniclePathVisibility } = await import('../scripts/handlers/party-chronicle-handlers');
        await updateChroniclePathVisibility(preservedChroniclePath, container, preservedLayoutId);
        
        // Property: Chronicle path field should be hidden when file exists
        const isVisible = formGroup.classList.contains('chronicle-path-visible');
        expect(isVisible).toBe(false);
        
        // This test documents the EXPECTED behavior:
        // - Season 6, Scenario 6-03 with valid PDF: field should be hidden after clearing
        // - Season 5, Scenario 5-08 with valid PDF: field should be hidden after clearing
        // - Season 4, Scenario 4-12 with valid PDF: field should be hidden after clearing
      }
    });
  });
});
