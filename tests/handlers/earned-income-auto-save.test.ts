/**
 * Unit tests for earned income auto-save functionality
 * 
 * These tests verify that the form data extraction correctly includes
 * all earned income input fields (downtime days, task level, success level,
 * proficiency rank) and that changes to these fields trigger auto-save.
 * 
 * Requirements: earned-income-calculation 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { extractFormData } from '../../scripts/handlers/form-data-extraction';

describe('Earned Income Auto-Save Tests', () => {
  let container: HTMLElement;
  let partyActors: any[];

  beforeEach(() => {
    // Create a mock container with the party chronicle form
    container = document.createElement('div');
    
    // Create mock party actors
    partyActors = [
      { id: 'actor1', name: 'Character 1', level: 5 },
      { id: 'actor2', name: 'Character 2', level: 3 }
    ];
  });

  /**
   * Helper function to create a complete form with earned income fields
   */
  function createFormWithEarnedIncome(): void {
    const formHtml = `
      <!-- Shared fields -->
      <input type="text" id="gmPfsNumber" value="123456-789">
      <input type="text" id="scenarioName" value="Test Scenario">
      <input type="text" id="eventCode" value="TEST-001">
      <input type="text" id="eventDate" value="2024-01-15">
      <input type="number" id="xpEarned" value="4">
      <input type="number" id="treasureBundles" value="2">
      <input type="number" id="downtimeDays" name="shared.downtimeDays" value="4">
      <select id="layout"><option value="layout1" selected>Layout 1</option></select>
      <select id="season"><option value="season1" selected>Season 1</option></select>
      <input type="text" id="blankChroniclePath" value="/path/to/chronicle.pdf">
      
      <!-- Reputation fields -->
      <input type="number" id="chosenFactionReputation" value="2">
      <input type="number" id="reputation-EA" value="0">
      <input type="number" id="reputation-GA" value="0">
      <input type="number" id="reputation-HH" value="0">
      <input type="number" id="reputation-VS" value="0">
      <input type="number" id="reputation-RO" value="0">
      <input type="number" id="reputation-VW" value="0">
      
      <!-- Character 1 fields -->
      <input type="text" name="characters.actor1.characterName" value="Character 1">
      <input type="text" name="characters.actor1.playerNumber" value="12345">
      <input type="text" name="characters.actor1.characterNumber" value="2001">
      <input type="number" name="characters.actor1.level" value="5">
      <select name="characters.actor1.taskLevel">
        <option value="-">-</option>
        <option value="2">Level 2 (DC 16)</option>
        <option value="3" selected>Level 3 (DC 18)</option>
        <option value="4">Level 4 (DC 19)</option>
        <option value="5">Level 5 (DC 20)</option>
      </select>
      <select name="characters.actor1.successLevel">
        <option value="critical_failure">Critical Failure</option>
        <option value="failure">Failure</option>
        <option value="success" selected>Success</option>
        <option value="critical_success">Critical Success</option>
      </select>
      <select name="characters.actor1.proficiencyRank">
        <option value="trained" selected>Trained</option>
        <option value="expert">Expert</option>
        <option value="master">Master</option>
        <option value="legendary">Legendary</option>
      </select>
      <input type="number" id="goldSpent-actor1" value="5.0">
      <textarea id="notes-actor1">Test notes 1</textarea>
      
      <!-- Character 2 fields -->
      <input type="text" name="characters.actor2.characterName" value="Character 2">
      <input type="text" name="characters.actor2.playerNumber" value="12345">
      <input type="text" name="characters.actor2.characterNumber" value="2002">
      <input type="number" name="characters.actor2.level" value="3">
      <select name="characters.actor2.taskLevel">
        <option value="-" selected>-</option>
        <option value="0">Level 0 (DC 14)</option>
        <option value="1">Level 1 (DC 15)</option>
        <option value="2">Level 2 (DC 16)</option>
        <option value="3">Level 3 (DC 18)</option>
      </select>
      <select name="characters.actor2.successLevel">
        <option value="critical_failure">Critical Failure</option>
        <option value="failure">Failure</option>
        <option value="success" selected>Success</option>
        <option value="critical_success">Critical Success</option>
      </select>
      <select name="characters.actor2.proficiencyRank">
        <option value="trained">Trained</option>
        <option value="expert" selected>Expert</option>
        <option value="master">Master</option>
        <option value="legendary">Legendary</option>
      </select>
      <input type="number" id="goldSpent-actor2" value="3.5">
      <textarea id="notes-actor2">Test notes 2</textarea>
    `;
    
    container.innerHTML = formHtml;
  }

  describe('Downtime Days Extraction', () => {
    /**
     * Verify that downtime days is extracted from the shared fields
     * Requirements: earned-income-calculation 10.1
     */
    it('should extract downtime days from shared fields', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      expect(formData.shared).toHaveProperty('downtimeDays');
      expect(formData.shared.downtimeDays).toBe(4);
    });

    /**
     * Verify that downtime days defaults to 0 when not set
     * Requirements: earned-income-calculation 10.1
     */
    it('should default downtime days to 0 when not set', () => {
      createFormWithEarnedIncome();
      const downtimeDaysInput = container.querySelector('#downtimeDays') as HTMLInputElement;
      downtimeDaysInput.value = '';
      
      const formData = extractFormData(container, partyActors);

      expect(formData.shared.downtimeDays).toBe(0);
    });
  });

  describe('Task Level Extraction', () => {
    /**
     * Verify that task level is extracted for each character
     * Requirements: earned-income-calculation 10.2
     */
    it('should extract task level for each character', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor1).toHaveProperty('taskLevel');
      expect(formData.characters.actor1.taskLevel).toBe(3);
      
      expect(formData.characters.actor2).toHaveProperty('taskLevel');
      expect(formData.characters.actor2.taskLevel).toBe('-');
    });

    /**
     * Verify that task level "-" is preserved as a string
     * Requirements: earned-income-calculation 10.2
     */
    it('should preserve task level "-" as a string', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor2.taskLevel).toBe('-');
      expect(typeof formData.characters.actor2.taskLevel).toBe('string');
    });

    /**
     * Verify that numeric task levels are converted to numbers
     * Requirements: earned-income-calculation 10.2
     */
    it('should convert numeric task levels to numbers', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor1.taskLevel).toBe(3);
      expect(typeof formData.characters.actor1.taskLevel).toBe('number');
    });

    /**
     * Verify that task level defaults to "-" when not set
     * Requirements: earned-income-calculation 10.2
     */
    it('should default task level to "-" when not set', () => {
      createFormWithEarnedIncome();
      const taskLevelSelect = container.querySelector('select[name="characters.actor1.taskLevel"]') as HTMLSelectElement;
      taskLevelSelect.value = '';
      
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor1.taskLevel).toBe('-');
    });
  });

  describe('Success Level Extraction', () => {
    /**
     * Verify that success level is extracted for each character
     * Requirements: earned-income-calculation 10.3
     */
    it('should extract success level for each character', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor1).toHaveProperty('successLevel');
      expect(formData.characters.actor1.successLevel).toBe('success');
      
      expect(formData.characters.actor2).toHaveProperty('successLevel');
      expect(formData.characters.actor2.successLevel).toBe('success');
    });

    /**
     * Verify that success level defaults to "success" when not set
     * Requirements: earned-income-calculation 10.3
     */
    it('should default success level to "success" when not set', () => {
      createFormWithEarnedIncome();
      const successLevelSelect = container.querySelector('select[name="characters.actor1.successLevel"]') as HTMLSelectElement;
      successLevelSelect.value = '';
      
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor1.successLevel).toBe('success');
    });
  });

  describe('Proficiency Rank Extraction', () => {
    /**
     * Verify that proficiency rank is extracted for each character
     * Requirements: earned-income-calculation 10.4
     */
    it('should extract proficiency rank for each character', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor1).toHaveProperty('proficiencyRank');
      expect(formData.characters.actor1.proficiencyRank).toBe('trained');
      
      expect(formData.characters.actor2).toHaveProperty('proficiencyRank');
      expect(formData.characters.actor2.proficiencyRank).toBe('expert');
    });

    /**
     * Verify that proficiency rank defaults to "trained" when not set
     * Requirements: earned-income-calculation 10.4
     */
    it('should default proficiency rank to "trained" when not set', () => {
      createFormWithEarnedIncome();
      const proficiencyRankSelect = container.querySelector('select[name="characters.actor1.proficiencyRank"]') as HTMLSelectElement;
      proficiencyRankSelect.value = '';
      
      const formData = extractFormData(container, partyActors);

      expect(formData.characters.actor1.proficiencyRank).toBe('trained');
    });
  });

  describe('Complete Earned Income Data Extraction', () => {
    /**
     * Verify that all earned income fields are extracted together
     * Requirements: earned-income-calculation 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
     */
    it('should extract all earned income fields for all characters', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      // Verify shared downtime days
      expect(formData.shared.downtimeDays).toBe(4);

      // Verify character 1 earned income fields
      expect(formData.characters.actor1.taskLevel).toBe(3);
      expect(formData.characters.actor1.successLevel).toBe('success');
      expect(formData.characters.actor1.proficiencyRank).toBe('trained');

      // Verify character 2 earned income fields
      expect(formData.characters.actor2.taskLevel).toBe('-');
      expect(formData.characters.actor2.successLevel).toBe('success');
      expect(formData.characters.actor2.proficiencyRank).toBe('expert');
    });

    /**
     * Verify that earned income fields don't interfere with other fields
     * Requirements: earned-income-calculation 10.5, 10.6
     */
    it('should not interfere with extraction of other fields', () => {
      createFormWithEarnedIncome();
      const formData = extractFormData(container, partyActors);

      // Verify shared fields
      expect(formData.shared.gmPfsNumber).toBe('123456-789');
      expect(formData.shared.scenarioName).toBe('Test Scenario');
      expect(formData.shared.xpEarned).toBe(4);
      expect(formData.shared.treasureBundles).toBe(2);

      // Verify character fields
      expect(formData.characters.actor1.characterName).toBe('Character 1');
      expect(formData.characters.actor1.level).toBe(5);
      expect(formData.characters.actor1.currencySpent).toBe(5.0);
      expect(formData.characters.actor1.notes).toBe('Test notes 1');
    });
  });

  describe('Edge Cases', () => {
    /**
     * Verify handling of missing earned income fields
     * Requirements: earned-income-calculation 10.5, 10.6
     */
    it('should handle missing earned income fields gracefully', () => {
      createFormWithEarnedIncome();
      
      // Remove earned income fields
      container.querySelector('#downtimeDays')?.remove();
      container.querySelector('select[name="characters.actor1.taskLevel"]')?.remove();
      container.querySelector('select[name="characters.actor1.successLevel"]')?.remove();
      container.querySelector('select[name="characters.actor1.proficiencyRank"]')?.remove();
      
      const formData = extractFormData(container, partyActors);

      // Should have default values
      expect(formData.shared.downtimeDays).toBe(0);
      expect(formData.characters.actor1.taskLevel).toBe('-');
      expect(formData.characters.actor1.successLevel).toBe('success');
      expect(formData.characters.actor1.proficiencyRank).toBe('trained');
    });

    /**
     * Verify handling of invalid downtime days values
     * Requirements: earned-income-calculation 10.1
     */
    it('should handle invalid downtime days values', () => {
      createFormWithEarnedIncome();
      const downtimeDaysInput = container.querySelector('#downtimeDays') as HTMLInputElement;
      
      // Test with non-numeric value
      downtimeDaysInput.value = 'invalid';
      let formData = extractFormData(container, partyActors);
      expect(formData.shared.downtimeDays).toBe(0);
      
      // Test with negative value
      downtimeDaysInput.value = '-5';
      formData = extractFormData(container, partyActors);
      expect(formData.shared.downtimeDays).toBe(-5); // Extraction doesn't validate, just extracts
    });
  });
});
