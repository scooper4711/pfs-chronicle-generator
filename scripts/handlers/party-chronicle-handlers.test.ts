/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for party chronicle event handlers
 * 
 * These tests verify that event handler functions correctly update the DOM
 * when inputs change, particularly for earned income calculations.
 * 
 * Requirements: earned-income-calculation 2.5, 7.3
 */

import {
  updateEarnedIncomeDisplay,
  updateAllEarnedIncomeDisplays,
  updateDowntimeDaysDisplay,
  handleFieldChange
} from './party-chronicle-handlers';

describe('Party Chronicle Event Handlers - Unit Tests', () => {
  let container: HTMLElement;
  let partyActors: any[];

  beforeEach(() => {
    // Create a fresh container for each test
    container = document.createElement('div');
    
    // Create mock party actors
    partyActors = [
      { id: 'actor1', name: 'Character 1' },
      { id: 'actor2', name: 'Character 2' }
    ];

    // Mock Foundry VTT globals
    (global as any).game = {
      settings: {
        set: jest.fn().mockResolvedValue(undefined)
      }
    };
    (global as any).ui = {
      notifications: {
        warn: jest.fn()
      }
    };
  });

  afterEach(() => {
    // Clean up globals
    delete (global as any).game;
    delete (global as any).ui;
  });

  /**
   * Helper function to create a member activity element with earned income fields
   */
  function createMemberActivity(characterId: string, taskLevel: string, successLevel: string, proficiencyRank: string): HTMLElement {
    const memberActivity = document.createElement('div');
    memberActivity.className = 'member-activity';
    memberActivity.setAttribute('data-character-id', characterId);
    
    // Create task level select with options
    const taskLevelSelect = document.createElement('select');
    taskLevelSelect.name = `characters.${characterId}.taskLevel`;
    const taskLevelOption = document.createElement('option');
    taskLevelOption.value = taskLevel;
    taskLevelOption.selected = true;
    taskLevelSelect.appendChild(taskLevelOption);
    memberActivity.appendChild(taskLevelSelect);
    
    // Create success level select with options
    const successLevelSelect = document.createElement('select');
    successLevelSelect.name = `characters.${characterId}.successLevel`;
    const successLevelOption = document.createElement('option');
    successLevelOption.value = successLevel;
    successLevelOption.selected = true;
    successLevelSelect.appendChild(successLevelOption);
    memberActivity.appendChild(successLevelSelect);
    
    // Create proficiency rank select with options
    const proficiencyRankSelect = document.createElement('select');
    proficiencyRankSelect.name = `characters.${characterId}.proficiencyRank`;
    const proficiencyRankOption = document.createElement('option');
    proficiencyRankOption.value = proficiencyRank;
    proficiencyRankOption.selected = true;
    proficiencyRankSelect.appendChild(proficiencyRankOption);
    memberActivity.appendChild(proficiencyRankSelect);
    
    // Create earned income display element
    const earnedIncomeDisplay = document.createElement('div');
    earnedIncomeDisplay.className = 'earned-income-value';
    earnedIncomeDisplay.textContent = '0.00 gp';
    memberActivity.appendChild(earnedIncomeDisplay);
    
    // Create hidden earned income input for form submission
    const earnedIncomeInput = document.createElement('input');
    earnedIncomeInput.type = 'hidden';
    earnedIncomeInput.name = `characters.${characterId}.earnedIncome`;
    earnedIncomeInput.value = '0';
    memberActivity.appendChild(earnedIncomeInput);
    
    return memberActivity;
  }

  /**
   * Helper function to create downtime days input
   */
  function createDowntimeDaysInput(value: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'downtimeDays';
    input.name = 'shared.downtimeDays';
    input.value = value.toString();
    return input;
  }

  /**
   * Helper function to create valid mock form data
   */
  function createMockFormData(characterData: Record<string, any> = {}): any {
    return {
      shared: {
        downtimeDays: 4,
        gmPfsNumber: '123456',
        scenarioName: 'Test Scenario',
        eventCode: 'TEST-001',
        eventDate: '2024-01-01',
        xpEarned: 4,
        treasureBundles: 0
      },
      characters: characterData
    };
  }

  describe('updateEarnedIncomeDisplay', () => {
    /**
     * Test that updateEarnedIncomeDisplay updates the correct DOM element
     * Requirements: earned-income-calculation 7.3
     */
    it('should update the correct DOM element for the specified character', () => {
      // Create two member activities
      const member1 = createMemberActivity('actor1', '3', 'success', 'trained');
      const member2 = createMemberActivity('actor2', '5', 'success', 'expert');
      container.appendChild(member1);
      container.appendChild(member2);

      // Update only actor1's display
      updateEarnedIncomeDisplay('actor1', 3, 'success', 'trained', 4, container);

      // Verify actor1's display was updated
      const display1 = member1.querySelector('.earned-income-value');
      expect(display1?.textContent).not.toBe('0.00 gp');

      // Verify actor2's display was NOT updated
      const display2 = member2.querySelector('.earned-income-value');
      expect(display2?.textContent).toBe('0.00 gp');
    });

    /**
     * Test that updateEarnedIncomeDisplay calculates the correct value
     * Requirements: earned-income-calculation 7.3
     */
    it('should calculate and display the correct earned income value', () => {
      // Create member activity
      const member = createMemberActivity('actor1', '3', 'success', 'trained');
      container.appendChild(member);

      // Update display with known values
      // Level 3, success, trained = 0.5 gp per day
      // 4 downtime days = 0.5 * 4 = 2.00 gp
      updateEarnedIncomeDisplay('actor1', 3, 'success', 'trained', 4, container);

      const display = member.querySelector('.earned-income-value');
      expect(display?.textContent).toBe('2.00 gp');
    });

    /**
     * Test that updateEarnedIncomeDisplay handles task level "-" (opt-out)
     * Requirements: earned-income-calculation 7.3
     */
    it('should display 0.00 gp when task level is "-"', () => {
      const member = createMemberActivity('actor1', '-', 'success', 'trained');
      container.appendChild(member);

      updateEarnedIncomeDisplay('actor1', '-', 'success', 'trained', 4, container);

      const display = member.querySelector('.earned-income-value');
      expect(display?.textContent).toBe('0.00 gp');
    });

    /**
     * Test that updateEarnedIncomeDisplay handles critical failure
     * Requirements: earned-income-calculation 7.3
     */
    it('should display 0.00 gp when success level is critical_failure', () => {
      const member = createMemberActivity('actor1', '3', 'critical_failure', 'trained');
      container.appendChild(member);

      updateEarnedIncomeDisplay('actor1', 3, 'critical_failure', 'trained', 4, container);

      const display = member.querySelector('.earned-income-value');
      expect(display?.textContent).toBe('0.00 gp');
    });

    /**
     * Test that updateEarnedIncomeDisplay handles 0 downtime days
     * Requirements: earned-income-calculation 7.3
     */
    it('should display 0.00 gp when downtime days is 0', () => {
      const member = createMemberActivity('actor1', '3', 'success', 'trained');
      container.appendChild(member);

      updateEarnedIncomeDisplay('actor1', 3, 'success', 'trained', 0, container);

      const display = member.querySelector('.earned-income-value');
      expect(display?.textContent).toBe('0.00 gp');
    });

    /**
     * Test that updateEarnedIncomeDisplay handles missing display element gracefully
     * Requirements: earned-income-calculation 7.3
     */
    it('should not throw error when display element is missing', () => {
      const member = document.createElement('div');
      member.className = 'member-activity';
      member.setAttribute('data-character-id', 'actor1');
      container.appendChild(member);

      // Should not throw
      expect(() => {
        updateEarnedIncomeDisplay('actor1', 3, 'success', 'trained', 4, container);
      }).not.toThrow();
    });
  });

  describe('updateAllEarnedIncomeDisplays', () => {
    /**
     * Test that updateAllEarnedIncomeDisplays updates all character displays
     * Requirements: earned-income-calculation 2.5, 7.3
     */
    it('should update earned income displays for all characters', () => {
      // Create multiple member activities
      const member1 = createMemberActivity('actor1', '3', 'success', 'trained');
      const member2 = createMemberActivity('actor2', '5', 'success', 'expert');
      const member3 = createMemberActivity('actor3', '7', 'critical_success', 'master');
      container.appendChild(member1);
      container.appendChild(member2);
      container.appendChild(member3);

      // Update all displays
      updateAllEarnedIncomeDisplays(4, container);

      // Verify all displays were updated
      const display1 = member1.querySelector('.earned-income-value');
      const display2 = member2.querySelector('.earned-income-value');
      const display3 = member3.querySelector('.earned-income-value');

      // Verify correct calculations
      // Level 3, success, trained = 0.5 gp/day * 4 days = 2.00 gp
      expect(display1?.textContent).toBe('2.00 gp');
      // Level 5, success, expert = 1.3 gp/day * 4 days = 5.20 gp
      expect(display2?.textContent).toBe('5.20 gp');
      // Level 7, critical success (uses level 8), master = 3 gp/day * 4 days = 12.00 gp
      expect(display3?.textContent).toBe('12.00 gp');
    });

    /**
     * Test that updateAllEarnedIncomeDisplays handles empty container
     * Requirements: earned-income-calculation 2.5, 7.3
     */
    it('should handle empty container without errors', () => {
      // Should not throw
      expect(() => {
        updateAllEarnedIncomeDisplays(4, container);
      }).not.toThrow();
    });

    /**
     * Test that updateAllEarnedIncomeDisplays handles missing select elements
     * Requirements: earned-income-calculation 2.5, 7.3
     */
    it('should skip characters with missing select elements', () => {
      // Create member activity without select elements
      const member = document.createElement('div');
      member.className = 'member-activity';
      member.setAttribute('data-character-id', 'actor1');
      const display = document.createElement('div');
      display.className = 'earned-income-value';
      display.textContent = '0.00 gp';
      member.appendChild(display);
      container.appendChild(member);

      // Should not throw
      expect(() => {
        updateAllEarnedIncomeDisplays(4, container);
      }).not.toThrow();

      // Display should remain unchanged
      expect(display.textContent).toBe('0.00 gp');
    });
  });

  describe('updateDowntimeDaysDisplay', () => {
    /**
     * Helper function to create downtime days display element
     */
    function createDowntimeDaysDisplay(): HTMLElement {
      const display = document.createElement('div');
      display.className = 'downtime-days-value';
      display.textContent = '0';
      return display;
    }

    /**
     * Test that updateDowntimeDaysDisplay updates the correct DOM element
     * Requirements: earned-income-calculation 2.4, 7.3
     */
    it('should update the downtime days display element', () => {
      // Create downtime days display
      const display = createDowntimeDaysDisplay();
      container.appendChild(display);

      // Update display with Scenario (4 XP = 8 downtime days)
      updateDowntimeDaysDisplay(4, container);

      // Verify display was updated
      expect(display.textContent).toBe('8');
    });

    /**
     * Test that updateDowntimeDaysDisplay calculates correct value for Bounty (0)
     * Requirements: earned-income-calculation 2.4
     */
    it('should calculate 0 downtime days for Bounty (1 XP)', () => {
      const display = createDowntimeDaysDisplay();
      container.appendChild(display);

      // Update display with Bounty (1 XP = 0 downtime days)
      updateDowntimeDaysDisplay(1, container);

      expect(display.textContent).toBe('0');
    });

    /**
     * Test that updateDowntimeDaysDisplay calculates correct value for Quest (4)
     * Requirements: earned-income-calculation 2.4
     */
    it('should calculate 4 downtime days for Quest (2 XP)', () => {
      const display = createDowntimeDaysDisplay();
      container.appendChild(display);

      // Update display with Quest (2 XP = 4 downtime days)
      updateDowntimeDaysDisplay(2, container);

      expect(display.textContent).toBe('4');
    });

    /**
     * Test that updateDowntimeDaysDisplay calculates correct value for Scenario (8)
     * Requirements: earned-income-calculation 2.4
     */
    it('should calculate 8 downtime days for Scenario (4 XP)', () => {
      const display = createDowntimeDaysDisplay();
      container.appendChild(display);

      // Update display with Scenario (4 XP = 8 downtime days)
      updateDowntimeDaysDisplay(4, container);

      expect(display.textContent).toBe('8');
    });

    /**
     * Test that updateDowntimeDaysDisplay triggers updateAllEarnedIncomeDisplays
     * Requirements: earned-income-calculation 2.5, 7.3
     */
    it('should trigger updateAllEarnedIncomeDisplays with calculated downtime days', () => {
      // Create downtime days display
      const display = createDowntimeDaysDisplay();
      container.appendChild(display);

      // Create member activities to verify earned income updates
      const member1 = createMemberActivity('actor1', '3', 'success', 'trained');
      const member2 = createMemberActivity('actor2', '5', 'success', 'expert');
      container.appendChild(member1);
      container.appendChild(member2);

      // Update display with Quest (2 XP = 4 downtime days)
      updateDowntimeDaysDisplay(2, container);

      // Verify downtime days display was updated
      expect(display.textContent).toBe('4');

      // Verify earned income displays were updated with 4 downtime days
      const earnedIncomeDisplay1 = member1.querySelector('.earned-income-value');
      const earnedIncomeDisplay2 = member2.querySelector('.earned-income-value');

      // Level 3, success, trained = 0.5 gp/day * 4 days = 2.00 gp
      expect(earnedIncomeDisplay1?.textContent).toBe('2.00 gp');
      // Level 5, success, expert = 1.3 gp/day * 4 days = 5.20 gp
      expect(earnedIncomeDisplay2?.textContent).toBe('5.20 gp');
    });

    /**
     * Test that updateDowntimeDaysDisplay handles missing display element gracefully
     * Requirements: earned-income-calculation 2.4, 7.3
     */
    it('should not throw error when display element is missing', () => {
      // Should not throw
      expect(() => {
        updateDowntimeDaysDisplay(4, container);
      }).not.toThrow();
    });

    /**
     * Test that updateDowntimeDaysDisplay updates earned income when changing from Bounty to Scenario
     * Requirements: earned-income-calculation 2.4, 2.5, 7.3
     */
    it('should update earned income from 0 to calculated value when changing from Bounty to Scenario', () => {
      // Create downtime days display
      const display = createDowntimeDaysDisplay();
      container.appendChild(display);

      // Create member activity
      const member = createMemberActivity('actor1', '3', 'success', 'trained');
      container.appendChild(member);

      // Start with Bounty (1 XP = 0 downtime days)
      updateDowntimeDaysDisplay(1, container);

      // Verify downtime days is 0
      expect(display.textContent).toBe('0');

      // Verify earned income is 0.00 gp
      const earnedIncomeDisplay = member.querySelector('.earned-income-value');
      expect(earnedIncomeDisplay?.textContent).toBe('0.00 gp');

      // Change to Scenario (4 XP = 8 downtime days)
      updateDowntimeDaysDisplay(4, container);

      // Verify downtime days is 8
      expect(display.textContent).toBe('8');

      // Verify earned income is calculated with 8 downtime days
      // Level 3, success, trained = 0.5 gp/day * 8 days = 4.00 gp
      expect(earnedIncomeDisplay?.textContent).toBe('4.00 gp');
    });
  });

  describe('handleFieldChange - Downtime Days', () => {
    /**
     * Test that handleFieldChange triggers updates when downtime days changes
     * Requirements: earned-income-calculation 2.5, 7.3
     */
    it('should trigger earned income updates when downtime days changes', async () => {
      // Create form structure
      const downtimeDaysInput = createDowntimeDaysInput(4);
      container.appendChild(downtimeDaysInput);

      const member1 = createMemberActivity('actor1', '3', 'success', 'trained');
      const member2 = createMemberActivity('actor2', '5', 'success', 'expert');
      container.appendChild(member1);
      container.appendChild(member2);

      // Create mock extractFormData function that returns valid data
      const mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 3,
          taskLevel: '3',
          successLevel: 'success',
          proficiencyRank: 'trained'
        },
        actor2: {
          characterName: 'Character 2',
          societyId: '123456-2002',
          level: 5,
          taskLevel: '5',
          successLevel: 'success',
          proficiencyRank: 'expert'
        }
      });

      // Verify the input has the correct name attribute
      expect(downtimeDaysInput.name).toBe('shared.downtimeDays');

      // Verify the select elements exist and have correct values
      const taskLevelSelect1 = member1.querySelector('select[name$=".taskLevel"]') as HTMLSelectElement;
      const taskLevelSelect2 = member2.querySelector('select[name$=".taskLevel"]') as HTMLSelectElement;
      expect(taskLevelSelect1).not.toBeNull();
      expect(taskLevelSelect2).not.toBeNull();
      expect(taskLevelSelect1?.value).toBe('3');
      expect(taskLevelSelect2?.value).toBe('5');

      // Trigger field change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: downtimeDaysInput, enumerable: true });

      await handleFieldChange(event, container, partyActors, mockExtractFormData);

      // Verify displays were updated
      const display1 = member1.querySelector('.earned-income-value');
      const display2 = member2.querySelector('.earned-income-value');

      expect(display1?.textContent).toBe('2.00 gp');
      expect(display2?.textContent).toBe('5.20 gp');
    });
  });

  describe('handleFieldChange - Task Level', () => {
    /**
     * Test that handleFieldChange triggers updates when task level changes
     * Requirements: earned-income-calculation 7.3
     */
    it('should trigger earned income update when task level changes', async () => {
      // Create form structure
      const downtimeDaysInput = createDowntimeDaysInput(4);
      container.appendChild(downtimeDaysInput);

      const member = createMemberActivity('actor1', '3', 'success', 'trained');
      container.appendChild(member);

      // Use only the actors that are in the DOM
      const testPartyActors = [{ id: 'actor1', name: 'Character 1' }];

      const taskLevelSelect = member.querySelector('select[name$=".taskLevel"]') as HTMLSelectElement;

      // Create mock extractFormData function
      const mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 5,
          taskLevel: '5',
          successLevel: 'success',
          proficiencyRank: 'trained'
        }
      });

      // Change task level
      taskLevelSelect.value = '5';
      // Need to add the new option
      const newOption = document.createElement('option');
      newOption.value = '5';
      newOption.selected = true;
      taskLevelSelect.appendChild(newOption);

      // Trigger field change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: taskLevelSelect, enumerable: true });

      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);

      // Verify display was updated with new task level
      const display = member.querySelector('.earned-income-value');
      // Level 5, success, trained = 1 gp/day * 4 days = 4.00 gp
      expect(display?.textContent).toBe('4.00 gp');
    });

    /**
     * Test that handleFieldChange handles task level "-" correctly
     * Requirements: earned-income-calculation 7.3
     */
    it('should display 0.00 gp when task level changes to "-"', async () => {
      // Create form structure
      const downtimeDaysInput = createDowntimeDaysInput(4);
      container.appendChild(downtimeDaysInput);

      const member = createMemberActivity('actor1', '3', 'success', 'trained');
      container.appendChild(member);

      // Use only the actors that are in the DOM
      const testPartyActors = [{ id: 'actor1', name: 'Character 1' }];

      const taskLevelSelect = member.querySelector('select[name$=".taskLevel"]') as HTMLSelectElement;

      // Create mock extractFormData function
      const mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 3,
          taskLevel: '-',
          successLevel: 'success',
          proficiencyRank: 'trained'
        }
      });

      // Change task level to "-"
      taskLevelSelect.value = '-';
      // Need to add the new option
      const newOption = document.createElement('option');
      newOption.value = '-';
      newOption.selected = true;
      taskLevelSelect.appendChild(newOption);

      // Trigger field change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: taskLevelSelect, enumerable: true });

      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);

      // Verify display shows 0.00 gp
      const display = member.querySelector('.earned-income-value');
      expect(display?.textContent).toBe('0.00 gp');
    });
  });

  describe('handleFieldChange - Success Level', () => {
    /**
     * Test that handleFieldChange triggers updates when success level changes
     * Requirements: earned-income-calculation 7.3
     */
    it('should trigger earned income update when success level changes', async () => {
      // Create form structure
      const downtimeDaysInput = createDowntimeDaysInput(4);
      container.appendChild(downtimeDaysInput);

      const member = createMemberActivity('actor1', '3', 'success', 'trained');
      container.appendChild(member);

      // Use only the actors that are in the DOM
      const testPartyActors = [{ id: 'actor1', name: 'Character 1' }];

      const successLevelSelect = member.querySelector('select[name$=".successLevel"]') as HTMLSelectElement;

      // Create mock extractFormData function
      const mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 3,
          taskLevel: '3',
          successLevel: 'critical_success',
          proficiencyRank: 'trained'
        }
      });

      // Change success level to critical_success
      // Clear existing options and add new one
      successLevelSelect.innerHTML = '';
      const newOption = document.createElement('option');
      newOption.value = 'critical_success';
      newOption.selected = true;
      successLevelSelect.appendChild(newOption);

      // Trigger field change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: successLevelSelect, enumerable: true });

      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);

      // Verify display was updated with critical success calculation
      const display = member.querySelector('.earned-income-value');
      // Level 3, critical success (uses level 4), trained = 0.8 gp/day * 4 days = 3.20 gp
      expect(display?.textContent).toBe('3.20 gp');
    });

    /**
     * Test that handleFieldChange handles critical failure correctly
     * Requirements: earned-income-calculation 7.3
     */
    it('should display 0.00 gp when success level changes to critical_failure', async () => {
      // Create form structure
      const downtimeDaysInput = createDowntimeDaysInput(4);
      container.appendChild(downtimeDaysInput);

      const member = createMemberActivity('actor1', '3', 'success', 'trained');
      container.appendChild(member);

      // Use only the actors that are in the DOM
      const testPartyActors = [{ id: 'actor1', name: 'Character 1' }];

      const successLevelSelect = member.querySelector('select[name$=".successLevel"]') as HTMLSelectElement;

      // Create mock extractFormData function
      const mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 3,
          taskLevel: '3',
          successLevel: 'critical_failure',
          proficiencyRank: 'trained'
        }
      });

      // Change success level to critical_failure
      successLevelSelect.value = 'critical_failure';
      // Need to add the new option
      const newOption = document.createElement('option');
      newOption.value = 'critical_failure';
      newOption.selected = true;
      successLevelSelect.appendChild(newOption);

      // Trigger field change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: successLevelSelect, enumerable: true });

      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);

      // Verify display shows 0.00 gp
      const display = member.querySelector('.earned-income-value');
      expect(display?.textContent).toBe('0.00 gp');
    });
  });

  describe('handleFieldChange - Proficiency Rank', () => {
    /**
     * Test that handleFieldChange triggers updates when proficiency rank changes
     * Requirements: earned-income-calculation 7.3
     */
    it('should trigger earned income update when proficiency rank changes', async () => {
      // Create form structure
      const downtimeDaysInput = createDowntimeDaysInput(4);
      container.appendChild(downtimeDaysInput);

      const member = createMemberActivity('actor1', '5', 'success', 'trained');
      container.appendChild(member);

      // Use only the actors that are in the DOM
      const testPartyActors = [{ id: 'actor1', name: 'Character 1' }];

      const proficiencyRankSelect = member.querySelector('select[name$=".proficiencyRank"]') as HTMLSelectElement;

      // Create mock extractFormData function
      const mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 5,
          taskLevel: '5',
          successLevel: 'success',
          proficiencyRank: 'expert'
        }
      });

      // Change proficiency rank to expert
      proficiencyRankSelect.value = 'expert';
      // Need to add the new option
      const newOption = document.createElement('option');
      newOption.value = 'expert';
      newOption.selected = true;
      proficiencyRankSelect.appendChild(newOption);

      // Trigger field change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: proficiencyRankSelect, enumerable: true });

      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);

      // Verify display was updated with new proficiency rank
      const display = member.querySelector('.earned-income-value');
      // Level 5, success, expert = 1.3 gp/day * 4 days = 5.20 gp
      expect(display?.textContent).toBe('5.20 gp');
    });

    /**
     * Test that handleFieldChange handles different proficiency ranks correctly
     * Requirements: earned-income-calculation 7.3
     */
    it('should calculate different values for different proficiency ranks', async () => {
      // Create form structure
      const downtimeDaysInput = createDowntimeDaysInput(4);
      container.appendChild(downtimeDaysInput);

      const member = createMemberActivity('actor1', '10', 'success', 'trained');
      container.appendChild(member);

      // Use only the actors that are in the DOM
      const testPartyActors = [{ id: 'actor1', name: 'Character 1' }];

      const proficiencyRankSelect = member.querySelector('select[name$=".proficiencyRank"]') as HTMLSelectElement;
      const display = member.querySelector('.earned-income-value');

      // Test trained
      proficiencyRankSelect.value = 'trained';
      let mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 10,
          taskLevel: '10',
          successLevel: 'success',
          proficiencyRank: 'trained'
        }
      });
      let event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: proficiencyRankSelect, enumerable: true });
      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);
      // Level 10, success, trained = 4 gp/day * 4 days = 16.00 gp
      expect(display?.textContent).toBe('16.00 gp');

      // Test expert
      proficiencyRankSelect.value = 'expert';
      // Need to add the new option
      let newOption = document.createElement('option');
      newOption.value = 'expert';
      newOption.selected = true;
      proficiencyRankSelect.appendChild(newOption);
      mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 10,
          taskLevel: '10',
          successLevel: 'success',
          proficiencyRank: 'expert'
        }
      });
      event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: proficiencyRankSelect, enumerable: true });
      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);
      // Level 10, success, expert = 5 gp/day * 4 days = 20.00 gp
      expect(display?.textContent).toBe('20.00 gp');

      // Test master
      proficiencyRankSelect.value = 'master';
      // Need to add the new option
      newOption = document.createElement('option');
      newOption.value = 'master';
      newOption.selected = true;
      proficiencyRankSelect.appendChild(newOption);
      mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 10,
          taskLevel: '10',
          successLevel: 'success',
          proficiencyRank: 'master'
        }
      });
      event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: proficiencyRankSelect, enumerable: true });
      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);
      // Level 10, success, master = 6 gp/day * 4 days = 24.00 gp
      expect(display?.textContent).toBe('24.00 gp');

      // Test legendary
      proficiencyRankSelect.value = 'legendary';
      // Need to add the new option
      newOption = document.createElement('option');
      newOption.value = 'legendary';
      newOption.selected = true;
      proficiencyRankSelect.appendChild(newOption);
      mockExtractFormData = () => createMockFormData({
        actor1: {
          characterName: 'Character 1',
          societyId: '123456-2001',
          level: 10,
          taskLevel: '10',
          successLevel: 'success',
          proficiencyRank: 'legendary'
        }
      });
      event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: proficiencyRankSelect, enumerable: true });
      await handleFieldChange(event, container, testPartyActors, mockExtractFormData);
      // Level 10, success, legendary = 6 gp/day * 4 days = 24.00 gp
      expect(display?.textContent).toBe('24.00 gp');
    });
  });
});
