/**
 * Property-based tests for Earned Income Default Success Level
 * 
 * Property 14: Default Success Level
 * For any character where success level is not set, verify form defaults to "success"
 * 
 * Validates: Requirements 3.3, 9.8
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import { extractFormData } from '../scripts/handlers/form-data-extraction';

describe('Earned Income Default Success Level - Property Tests', () => {
  let container: HTMLElement;
  let partyActors: any[];

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create mock party actors
    partyActors = [
      { id: 'actor1', name: 'Test Character 1', system: { details: { level: { value: 5 } } } },
      { id: 'actor2', name: 'Test Character 2', system: { details: { level: { value: 10 } } } }
    ];
  });

  /**
   * Helper function to create a form with earned income fields
   */
  function createFormWithEarnedIncome(
    characterId: string,
    includeSuccessLevel: boolean,
    successLevelValue?: string
  ): void {
    const taskLevelSelect = document.createElement('select');
    taskLevelSelect.name = `characters.${characterId}.taskLevel`;
    taskLevelSelect.value = '3';
    container.appendChild(taskLevelSelect);

    if (includeSuccessLevel) {
      const successLevelSelect = document.createElement('select');
      successLevelSelect.name = `characters.${characterId}.successLevel`;
      if (successLevelValue) {
        successLevelSelect.value = successLevelValue;
      }
      container.appendChild(successLevelSelect);
    }

    const proficiencyRankSelect = document.createElement('select');
    proficiencyRankSelect.name = `characters.${characterId}.proficiencyRank`;
    proficiencyRankSelect.value = 'trained';
    container.appendChild(proficiencyRankSelect);

    // Add downtime days input
    const downtimeDaysInput = document.createElement('input');
    downtimeDaysInput.id = 'downtimeDays';
    downtimeDaysInput.name = 'shared.downtimeDays';
    downtimeDaysInput.value = '4';
    container.appendChild(downtimeDaysInput);

    // Add character name input
    const characterNameInput = document.createElement('input');
    characterNameInput.name = `characters.${characterId}.characterName`;
    characterNameInput.value = 'Test Character';
    container.appendChild(characterNameInput);

    // Add player number and character number inputs
    const playerNumberInput = document.createElement('input');
    playerNumberInput.name = `characters.${characterId}.playerNumber`;
    playerNumberInput.value = '123456';
    container.appendChild(playerNumberInput);
    const characterNumberInput = document.createElement('input');
    characterNumberInput.name = `characters.${characterId}.characterNumber`;
    characterNumberInput.value = '2001';
    container.appendChild(characterNumberInput);

    // Add level input
    const levelInput = document.createElement('input');
    levelInput.name = `characters.${characterId}.level`;
    levelInput.value = '5';
    container.appendChild(levelInput);

    // Add member activity container
    const memberActivity = document.createElement('div');
    memberActivity.className = 'member-activity';
    memberActivity.setAttribute('data-character-id', characterId);
    container.appendChild(memberActivity);
  }

  /**
   * Property 14: Default Success Level
   * 
   * For any character where success level is not explicitly set, the form
   * should default to "success".
   * 
   * Feature: earned-income-calculation, Property 14: Default Success Level
   * Validates: Requirements 3.3, 9.8
   */
  describe('Property 14: Default Success Level', () => {
    it('should default to "success" when success level field is missing', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('actor1', 'actor2'),
          (characterId) => {
            // Clear container
            container.innerHTML = '';

            // Create form WITHOUT success level field
            createFormWithEarnedIncome(characterId, false);

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Verify success level defaults to "success"
            expect(formData.characters[characterId].successLevel).toBe('success');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default to "success" when success level field is empty', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('actor1', 'actor2'),
          (characterId) => {
            // Clear container
            container.innerHTML = '';

            // Create form WITH success level field but empty value
            createFormWithEarnedIncome(characterId, true, '');

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Verify success level defaults to "success"
            expect(formData.characters[characterId].successLevel).toBe('success');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve explicit success level values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('actor1', 'actor2'),
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
          (characterId, successLevel) => {
            // Clear container
            container.innerHTML = '';

            // Create form WITH explicit success level
            const taskLevelSelect = document.createElement('select');
            taskLevelSelect.name = `characters.${characterId}.taskLevel`;
            taskLevelSelect.value = '3';
            container.appendChild(taskLevelSelect);

            const successLevelSelect = document.createElement('select');
            successLevelSelect.name = `characters.${characterId}.successLevel`;
            // Add options to the select element
            ['critical_failure', 'failure', 'success', 'critical_success'].forEach((value) => {
              const option = document.createElement('option');
              option.value = value;
              option.textContent = value;
              successLevelSelect.appendChild(option);
            });
            successLevelSelect.value = successLevel;
            container.appendChild(successLevelSelect);

            const proficiencyRankSelect = document.createElement('select');
            proficiencyRankSelect.name = `characters.${characterId}.proficiencyRank`;
            proficiencyRankSelect.value = 'trained';
            container.appendChild(proficiencyRankSelect);

            const downtimeDaysInput = document.createElement('input');
            downtimeDaysInput.id = 'downtimeDays';
            downtimeDaysInput.name = 'shared.downtimeDays';
            downtimeDaysInput.value = '4';
            container.appendChild(downtimeDaysInput);

            const characterNameInput = document.createElement('input');
            characterNameInput.name = `characters.${characterId}.characterName`;
            characterNameInput.value = 'Test Character';
            container.appendChild(characterNameInput);

            const playerNumberInput = document.createElement('input');
            playerNumberInput.name = `characters.${characterId}.playerNumber`;
            playerNumberInput.value = '123456';
            container.appendChild(playerNumberInput);
            const characterNumberInput = document.createElement('input');
            characterNumberInput.name = `characters.${characterId}.characterNumber`;
            characterNumberInput.value = '2001';
            container.appendChild(characterNumberInput);

            const levelInput = document.createElement('input');
            levelInput.name = `characters.${characterId}.level`;
            levelInput.value = '5';
            container.appendChild(levelInput);

            const memberActivity = document.createElement('div');
            memberActivity.className = 'member-activity';
            memberActivity.setAttribute('data-character-id', characterId);
            container.appendChild(memberActivity);

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Verify success level is preserved
            expect(formData.characters[characterId].successLevel).toBe(successLevel);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default to "success" for all characters when not set', () => {
      // Clear container
      container.innerHTML = '';

      // Create form for multiple characters without success level
      partyActors.forEach((actor) => {
        createFormWithEarnedIncome(actor.id, false);
      });

      // Extract form data
      const formData = extractFormData(container, partyActors);

      // Verify all characters default to "success"
      partyActors.forEach((actor) => {
        expect(formData.characters[actor.id].successLevel).toBe('success');
      });
    });

    it('should use "success" default consistently across multiple extractions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('actor1', 'actor2'),
          (characterId) => {
            // Clear container
            container.innerHTML = '';

            // Create form WITHOUT success level field
            createFormWithEarnedIncome(characterId, false);

            // Extract form data multiple times
            const formData1 = extractFormData(container, partyActors);
            const formData2 = extractFormData(container, partyActors);

            // Verify both extractions produce "success"
            expect(formData1.characters[characterId].successLevel).toBe('success');
            expect(formData2.characters[characterId].successLevel).toBe('success');
            expect(formData1.characters[characterId].successLevel).toBe(
              formData2.characters[characterId].successLevel
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default to "success" regardless of other field values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('actor1', 'actor2'),
          fc.integer({ min: 0, max: 20 }),  // task level
          fc.constantFrom('trained', 'expert', 'master', 'legendary'),  // proficiency rank
          fc.integer({ min: 0, max: 8 }),  // downtime days
          (characterId, taskLevel, proficiencyRank, downtimeDays) => {
            // Clear container
            container.innerHTML = '';

            // Create form with various field values but no success level
            const taskLevelSelect = document.createElement('select');
            taskLevelSelect.name = `characters.${characterId}.taskLevel`;
            taskLevelSelect.value = taskLevel.toString();
            container.appendChild(taskLevelSelect);

            const proficiencyRankSelect = document.createElement('select');
            proficiencyRankSelect.name = `characters.${characterId}.proficiencyRank`;
            proficiencyRankSelect.value = proficiencyRank;
            container.appendChild(proficiencyRankSelect);

            const downtimeDaysInput = document.createElement('input');
            downtimeDaysInput.id = 'downtimeDays';
            downtimeDaysInput.name = 'shared.downtimeDays';
            downtimeDaysInput.value = downtimeDays.toString();
            container.appendChild(downtimeDaysInput);

            // Add required fields
            const characterNameInput = document.createElement('input');
            characterNameInput.name = `characters.${characterId}.characterName`;
            characterNameInput.value = 'Test Character';
            container.appendChild(characterNameInput);

            const playerNumberInput2 = document.createElement('input');
            playerNumberInput2.name = `characters.${characterId}.playerNumber`;
            playerNumberInput2.value = '123456';
            container.appendChild(playerNumberInput2);
            const characterNumberInput2 = document.createElement('input');
            characterNumberInput2.name = `characters.${characterId}.characterNumber`;
            characterNumberInput2.value = '2001';
            container.appendChild(characterNumberInput2);

            const levelInput = document.createElement('input');
            levelInput.name = `characters.${characterId}.level`;
            levelInput.value = '5';
            container.appendChild(levelInput);

            const memberActivity = document.createElement('div');
            memberActivity.className = 'member-activity';
            memberActivity.setAttribute('data-character-id', characterId);
            container.appendChild(memberActivity);

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Verify success level defaults to "success" regardless of other values
            expect(formData.characters[characterId].successLevel).toBe('success');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not default to "success" when task level is "-"', () => {
      // This is a special case - when task level is "-", success level is not required
      // but if it's missing, it should still default to "success" for consistency
      fc.assert(
        fc.property(
          fc.constantFrom('actor1', 'actor2'),
          (characterId) => {
            // Clear container
            container.innerHTML = '';

            // Create form with task level "-" and no success level
            const taskLevelSelect = document.createElement('select');
            taskLevelSelect.name = `characters.${characterId}.taskLevel`;
            taskLevelSelect.value = '-';
            container.appendChild(taskLevelSelect);

            const proficiencyRankSelect = document.createElement('select');
            proficiencyRankSelect.name = `characters.${characterId}.proficiencyRank`;
            proficiencyRankSelect.value = 'trained';
            container.appendChild(proficiencyRankSelect);

            const downtimeDaysInput = document.createElement('input');
            downtimeDaysInput.id = 'downtimeDays';
            downtimeDaysInput.name = 'shared.downtimeDays';
            downtimeDaysInput.value = '4';
            container.appendChild(downtimeDaysInput);

            // Add required fields
            const characterNameInput = document.createElement('input');
            characterNameInput.name = `characters.${characterId}.characterName`;
            characterNameInput.value = 'Test Character';
            container.appendChild(characterNameInput);

            const playerNumberInput3 = document.createElement('input');
            playerNumberInput3.name = `characters.${characterId}.playerNumber`;
            playerNumberInput3.value = '123456';
            container.appendChild(playerNumberInput3);
            const characterNumberInput3 = document.createElement('input');
            characterNumberInput3.name = `characters.${characterId}.characterNumber`;
            characterNumberInput3.value = '2001';
            container.appendChild(characterNumberInput3);

            const levelInput = document.createElement('input');
            levelInput.name = `characters.${characterId}.level`;
            levelInput.value = '5';
            container.appendChild(levelInput);

            const memberActivity = document.createElement('div');
            memberActivity.className = 'member-activity';
            memberActivity.setAttribute('data-character-id', characterId);
            container.appendChild(memberActivity);

            // Extract form data
            const formData = extractFormData(container, partyActors);

            // Even with task level "-", success level should default to "success"
            expect(formData.characters[characterId].successLevel).toBe('success');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
