/**
 * Property-based tests for party chronicle handlers - reactive updates
 * 
 * These tests verify universal properties for reactive display updates,
 * ensuring that earned income displays update correctly when inputs change.
 * 
 * Requirements: earned-income-calculation 2.5, 7.3
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from '@jest/globals';
import fc from 'fast-check';

// Mock the dependencies to avoid type errors in other modules
jest.mock('../../scripts/handlers/chronicle-generation', () => ({
  generateChroniclesFromPartyData: jest.fn()
}));

jest.mock('../../scripts/handlers/validation-display', () => ({
  updateValidationDisplay: jest.fn()
}));

jest.mock('../../scripts/handlers/collapsible-section-handlers', () => ({
  updateSectionSummary: jest.fn()
}));

jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  savePartyChronicleData: jest.fn()
}));

// Import after mocking
import {
  updateEarnedIncomeDisplay,
  updateAllEarnedIncomeDisplays
} from '../../scripts/handlers/party-chronicle-handlers';
import { calculateEarnedIncome, formatIncomeValue } from '../../scripts/utils/earned-income-calculator';

/**
 * Creates a mock DOM structure for testing reactive updates
 * 
 * @param characterIds - Array of character IDs to create member activities for
 * @returns Mock container element with member activities
 */
function createMockContainer(characterIds: string[]): HTMLElement {
  const container = document.createElement('div');
  
  characterIds.forEach((characterId) => {
    const memberActivity = document.createElement('div');
    memberActivity.className = 'member-activity';
    memberActivity.setAttribute('data-character-id', characterId);
    
    // Create task level select
    const taskLevelSelect = document.createElement('select');
    taskLevelSelect.name = `characters.${characterId}.taskLevel`;
    taskLevelSelect.value = '5'; // Default value
    memberActivity.appendChild(taskLevelSelect);
    
    // Create success level select
    const successLevelSelect = document.createElement('select');
    successLevelSelect.name = `characters.${characterId}.successLevel`;
    successLevelSelect.value = 'success'; // Default value
    memberActivity.appendChild(successLevelSelect);
    
    // Create proficiency rank select
    const proficiencyRankSelect = document.createElement('select');
    proficiencyRankSelect.name = `characters.${characterId}.proficiencyRank`;
    proficiencyRankSelect.value = 'trained'; // Default value
    memberActivity.appendChild(proficiencyRankSelect);
    
    // Create earned income display element
    const earnedIncomeDisplay = document.createElement('div');
    earnedIncomeDisplay.className = 'earned-income-value';
    earnedIncomeDisplay.textContent = '0.00 gp';
    memberActivity.appendChild(earnedIncomeDisplay);
    
    container.appendChild(memberActivity);
  });
  
  return container;
}

/**
 * Sets the input values for a character in the mock DOM
 * 
 * @param container - Mock container element
 * @param characterId - Character ID
 * @param taskLevel - Task level value
 * @param successLevel - Success level value
 * @param proficiencyRank - Proficiency rank value
 */
function setCharacterInputs(
  container: HTMLElement,
  characterId: string,
  taskLevel: string | number,
  successLevel: string,
  proficiencyRank: string
): void {
  const memberActivity = container.querySelector(`.member-activity[data-character-id="${characterId}"]`);
  if (!memberActivity) return;
  
  const taskLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
  const successLevelSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
  const proficiencyRankSelect = memberActivity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
  
  if (taskLevelSelect) taskLevelSelect.value = String(taskLevel);
  if (successLevelSelect) successLevelSelect.value = successLevel;
  if (proficiencyRankSelect) proficiencyRankSelect.value = proficiencyRank;
}

/**
 * Gets the displayed earned income value for a character
 * 
 * @param container - Mock container element
 * @param characterId - Character ID
 * @returns Displayed earned income text
 */
function getDisplayedIncome(container: HTMLElement, characterId: string): string {
  const displayElement = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] .earned-income-value`
  );
  return displayElement?.textContent || '';
}

describe('Party Chronicle Handlers Property-Based Tests - Reactive Updates', () => {
  beforeAll(() => {
    (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
  });

  afterAll(() => {
    delete (globalThis as any).game;
  });
  // Feature: earned-income-calculation, Property 9: Reactive Display Updates
  // **Validates: Requirements 7.3**
  describe('Property 9: Reactive Display Updates', () => {
    it('should update display when task level changes for any valid inputs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('0', '1', '2', '3', '4', '5', '10', '15', '20', '-'),
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, successLevel, proficiencyRank, downtimeDays) => {
            const characterId = 'test-char-1';
            const container = createMockContainer([characterId]);
            
            // Update the display
            updateEarnedIncomeDisplay(
              characterId,
              taskLevel,
              successLevel,
              proficiencyRank,
              downtimeDays,
              container
            );
            
            // Verify display matches calculated value
            const expectedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
            const expectedDisplay = formatIncomeValue(expectedIncome);
            const actualDisplay = getDisplayedIncome(container, characterId);
            
            expect(actualDisplay).toBe(expectedDisplay);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update display when success level changes for any valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, successLevel, proficiencyRank, downtimeDays) => {
            const characterId = 'test-char-2';
            const container = createMockContainer([characterId]);
            
            // Update the display
            updateEarnedIncomeDisplay(
              characterId,
              taskLevel,
              successLevel,
              proficiencyRank,
              downtimeDays,
              container
            );
            
            // Verify display matches calculated value
            const expectedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
            const expectedDisplay = formatIncomeValue(expectedIncome);
            const actualDisplay = getDisplayedIncome(container, characterId);
            
            expect(actualDisplay).toBe(expectedDisplay);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update display when proficiency rank changes for any valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('failure', 'success', 'critical_success'),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, successLevel, proficiencyRank, downtimeDays) => {
            const characterId = 'test-char-3';
            const container = createMockContainer([characterId]);
            
            // Update the display
            updateEarnedIncomeDisplay(
              characterId,
              taskLevel,
              successLevel,
              proficiencyRank,
              downtimeDays,
              container
            );
            
            // Verify display matches calculated value
            const expectedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
            const expectedDisplay = formatIncomeValue(expectedIncome);
            const actualDisplay = getDisplayedIncome(container, characterId);
            
            expect(actualDisplay).toBe(expectedDisplay);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update display when downtime days changes for any valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('failure', 'success', 'critical_success'),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, successLevel, proficiencyRank, downtimeDays) => {
            const characterId = 'test-char-4';
            const container = createMockContainer([characterId]);
            
            // Update the display
            updateEarnedIncomeDisplay(
              characterId,
              taskLevel,
              successLevel,
              proficiencyRank,
              downtimeDays,
              container
            );
            
            // Verify display matches calculated value
            const expectedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
            const expectedDisplay = formatIncomeValue(expectedIncome);
            const actualDisplay = getDisplayedIncome(container, characterId);
            
            expect(actualDisplay).toBe(expectedDisplay);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing display element gracefully for any inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.constantFrom('failure', 'success', 'critical_success'),
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),
          fc.integer({ min: 0, max: 8 }),
          (taskLevel, successLevel, proficiencyRank, downtimeDays) => {
            // Create container without earned income display element
            const container = document.createElement('div');
            const memberActivity = document.createElement('div');
            memberActivity.className = 'member-activity';
            memberActivity.setAttribute('data-character-id', 'test-char-5');
            container.appendChild(memberActivity);
            
            // Should not throw error
            expect(() => {
              updateEarnedIncomeDisplay(
                'test-char-5',
                taskLevel,
                successLevel,
                proficiencyRank,
                downtimeDays,
                container
              );
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: earned-income-calculation, Property 10: Shared Downtime Days Propagation
  // **Validates: Requirements 2.5**
  describe('Property 10: Shared Downtime Days Propagation', () => {
    it('should update all character displays when downtime days changes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }), // Number of characters
          fc.integer({ min: 0, max: 8 }), // Downtime days
          (numCharacters, downtimeDays) => {
            // Create character IDs
            const characterIds = Array.from({ length: numCharacters }, (_, i) => `char-${i}`);
            const container = createMockContainer(characterIds);
            
            // Set random inputs for each character
            characterIds.forEach((characterId, index) => {
              const taskLevel = (index % 20) + 1; // Vary task levels
              const successLevels = ['failure', 'success', 'critical_success'];
              const successLevel = successLevels[index % successLevels.length];
              const proficiencyRanks = ['trained', 'expert', 'master', 'legendary'];
              const proficiencyRank = proficiencyRanks[index % proficiencyRanks.length];
              
              setCharacterInputs(container, characterId, taskLevel, successLevel, proficiencyRank);
            });
            
            // Update all displays
            updateAllEarnedIncomeDisplays(downtimeDays, container);
            
            // Verify all displays were updated correctly
            characterIds.forEach((characterId) => {
              const memberActivity = container.querySelector(`.member-activity[data-character-id="${characterId}"]`);
              const taskLevelSelect = memberActivity?.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
              const successLevelSelect = memberActivity?.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
              const proficiencyRankSelect = memberActivity?.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
              
              if (taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
                const taskLevel = taskLevelSelect.value;
                const successLevel = successLevelSelect.value;
                const proficiencyRank = proficiencyRankSelect.value;
                
                const expectedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
                const expectedDisplay = formatIncomeValue(expectedIncome);
                const actualDisplay = getDisplayedIncome(container, characterId);
                
                expect(actualDisplay).toBe(expectedDisplay);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update all displays even when some characters have task level "-"', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 6 }), // Number of characters
          fc.integer({ min: 0, max: 8 }), // Downtime days
          (numCharacters, downtimeDays) => {
            // Create character IDs
            const characterIds = Array.from({ length: numCharacters }, (_, i) => `char-opt-${i}`);
            const container = createMockContainer(characterIds);
            
            // Set inputs for each character, with some opting out
            characterIds.forEach((characterId, index) => {
              const taskLevel = index % 2 === 0 ? '-' : String((index % 20) + 1);
              const successLevel = 'success';
              const proficiencyRank = 'trained';
              
              setCharacterInputs(container, characterId, taskLevel, successLevel, proficiencyRank);
            });
            
            // Update all displays
            updateAllEarnedIncomeDisplays(downtimeDays, container);
            
            // Verify all displays were updated correctly
            characterIds.forEach((characterId) => {
              const memberActivity = container.querySelector(`.member-activity[data-character-id="${characterId}"]`);
              const taskLevelSelect = memberActivity?.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
              const successLevelSelect = memberActivity?.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
              const proficiencyRankSelect = memberActivity?.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
              
              if (taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
                const taskLevel = taskLevelSelect.value;
                const successLevel = successLevelSelect.value;
                const proficiencyRank = proficiencyRankSelect.value;
                
                const expectedIncome = calculateEarnedIncome(taskLevel, successLevel, proficiencyRank, downtimeDays);
                const expectedDisplay = formatIncomeValue(expectedIncome);
                const actualDisplay = getDisplayedIncome(container, characterId);
                
                expect(actualDisplay).toBe(expectedDisplay);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty party gracefully', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }),
          (downtimeDays) => {
            const container = createMockContainer([]);
            
            // Should not throw error
            expect(() => {
              updateAllEarnedIncomeDisplays(downtimeDays, container);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing select elements gracefully', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }),
          (downtimeDays) => {
            // Create container with incomplete member activities
            const container = document.createElement('div');
            const memberActivity = document.createElement('div');
            memberActivity.className = 'member-activity';
            memberActivity.setAttribute('data-character-id', 'incomplete-char');
            
            // Only add display element, no select elements
            const earnedIncomeDisplay = document.createElement('div');
            earnedIncomeDisplay.className = 'earned-income-value';
            earnedIncomeDisplay.textContent = '0.00 gp';
            memberActivity.appendChild(earnedIncomeDisplay);
            
            container.appendChild(memberActivity);
            
            // Should not throw error
            expect(() => {
              updateAllEarnedIncomeDisplays(downtimeDays, container);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update displays consistently across multiple calls with same inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 4 }), // Number of characters
          fc.integer({ min: 0, max: 8 }), // Downtime days
          (numCharacters, downtimeDays) => {
            const characterIds = Array.from({ length: numCharacters }, (_, i) => `char-consistent-${i}`);
            const container = createMockContainer(characterIds);
            
            // Set inputs for each character
            characterIds.forEach((characterId, index) => {
              const taskLevel = (index % 10) + 5;
              const successLevel = 'success';
              const proficiencyRank = 'trained';
              
              setCharacterInputs(container, characterId, taskLevel, successLevel, proficiencyRank);
            });
            
            // Update displays twice
            updateAllEarnedIncomeDisplays(downtimeDays, container);
            const firstResults = characterIds.map(id => getDisplayedIncome(container, id));
            
            updateAllEarnedIncomeDisplays(downtimeDays, container);
            const secondResults = characterIds.map(id => getDisplayedIncome(container, id));
            
            // Results should be identical
            expect(secondResults).toEqual(firstResults);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
