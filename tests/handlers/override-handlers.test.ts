/**
 * Unit tests for override handlers
 * 
 * Tests the event handlers for XP and currency override checkboxes,
 * including toggle logic, strikethrough styling, and initialization.
 * 
 * Requirements: gm-override-values 3.3, 3.4, 3.5, 3.6, 4.5, 4.6, 4.7, 4.8, 6.2, 8.1, 8.2
 * 
 * @jest-environment jsdom
 */

import {
  handleOverrideXpChange,
  handleOverrideCurrencyChange,
  initializeOverrideStates
} from '../../scripts/handlers/override-handlers';

// Mock the logger to suppress debug output during tests
jest.mock('../../scripts/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

/**
 * Creates a mock character card DOM structure with override elements.
 * 
 * @param characterId - The character's actor ID
 * @param options - Configuration for the initial state of override elements
 * @returns An HTMLElement containing the character card structure
 */
function createCharacterCard(
  characterId: string,
  options: {
    xpChecked?: boolean;
    currencyChecked?: boolean;
    xpValue?: number;
    currencyValue?: number;
  } = {}
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'member-activity';
  card.setAttribute('data-character-id', characterId);

  card.innerHTML = `
    <div class="calculated-xp-label">4 XP</div>
    <div class="calculated-currency-label">25.5 GP</div>
    <div class="earned-income-value">0.00 gp</div>
    <input type="checkbox" name="characters.${characterId}.overrideXp"
           ${options.xpChecked ? 'checked' : ''}>
    <input type="number" name="characters.${characterId}.overrideXpValue"
           value="${options.xpValue ?? 0}" disabled>
    <input type="checkbox" name="characters.${characterId}.overrideCurrency"
           ${options.currencyChecked ? 'checked' : ''}>
    <input type="number" name="characters.${characterId}.overrideCurrencyValue"
           value="${options.currencyValue ?? 0}" disabled>
  `;

  return card;
}

describe('override-handlers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  describe('handleOverrideXpChange', () => {
    it('enables input and adds strikethrough when checkbox is checked', () => {
      const card = createCharacterCard('actor-1', { xpChecked: true });
      container.appendChild(card);

      handleOverrideXpChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );
      const label = container.querySelector('.calculated-xp-label');

      expect(input!.disabled).toBe(false);
      expect(label!.classList.contains('strikethrough-override')).toBe(true);
    });

    it('disables input and removes strikethrough when checkbox is unchecked', () => {
      const card = createCharacterCard('actor-1', { xpChecked: false });
      container.appendChild(card);

      // First add strikethrough to verify it gets removed
      const label = container.querySelector('.calculated-xp-label')!;
      label.classList.add('strikethrough-override');

      handleOverrideXpChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );

      expect(input!.disabled).toBe(true);
      expect(label.classList.contains('strikethrough-override')).toBe(false);
    });

    it('handles missing elements gracefully', () => {
      // Empty container — no elements to find
      expect(() => handleOverrideXpChange('nonexistent', container)).not.toThrow();
    });
  });

  describe('handleOverrideCurrencyChange', () => {
    it('enables input and adds strikethrough to currency label AND earned income value when checked', () => {
      const card = createCharacterCard('actor-1', { currencyChecked: true });
      container.appendChild(card);

      handleOverrideCurrencyChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );
      const currencyLabel = container.querySelector('.calculated-currency-label');
      const earnedIncomeValue = container.querySelector('.earned-income-value');

      expect(input!.disabled).toBe(false);
      expect(currencyLabel!.classList.contains('strikethrough-override')).toBe(true);
      expect(earnedIncomeValue!.classList.contains('strikethrough-override')).toBe(true);
    });

    it('disables input and removes strikethrough when checkbox is unchecked', () => {
      const card = createCharacterCard('actor-1', { currencyChecked: false });
      container.appendChild(card);

      // First add strikethrough to verify it gets removed
      const currencyLabel = container.querySelector('.calculated-currency-label')!;
      const earnedIncomeValue = container.querySelector('.earned-income-value')!;
      currencyLabel.classList.add('strikethrough-override');
      earnedIncomeValue.classList.add('strikethrough-override');

      handleOverrideCurrencyChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );

      expect(input!.disabled).toBe(true);
      expect(currencyLabel.classList.contains('strikethrough-override')).toBe(false);
      expect(earnedIncomeValue.classList.contains('strikethrough-override')).toBe(false);
    });

    it('handles missing elements gracefully', () => {
      expect(() => handleOverrideCurrencyChange('nonexistent', container)).not.toThrow();
    });
  });

  describe('initializeOverrideStates', () => {
    it('applies correct states from saved data when overrides are checked', () => {
      const card = createCharacterCard('actor-1', {
        xpChecked: true,
        currencyChecked: true
      });
      container.appendChild(card);

      initializeOverrideStates(container);

      const xpInput = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );
      const currencyInput = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );
      const xpLabel = container.querySelector('.calculated-xp-label');
      const currencyLabel = container.querySelector('.calculated-currency-label');
      const earnedIncomeValue = container.querySelector('.earned-income-value');

      expect(xpInput!.disabled).toBe(false);
      expect(currencyInput!.disabled).toBe(false);
      expect(xpLabel!.classList.contains('strikethrough-override')).toBe(true);
      expect(currencyLabel!.classList.contains('strikethrough-override')).toBe(true);
      expect(earnedIncomeValue!.classList.contains('strikethrough-override')).toBe(true);
    });

    it('applies correct states from saved data when overrides are unchecked', () => {
      const card = createCharacterCard('actor-1', {
        xpChecked: false,
        currencyChecked: false
      });
      container.appendChild(card);

      initializeOverrideStates(container);

      const xpInput = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );
      const currencyInput = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );
      const xpLabel = container.querySelector('.calculated-xp-label');
      const currencyLabel = container.querySelector('.calculated-currency-label');

      expect(xpInput!.disabled).toBe(true);
      expect(currencyInput!.disabled).toBe(true);
      expect(xpLabel!.classList.contains('strikethrough-override')).toBe(false);
      expect(currencyLabel!.classList.contains('strikethrough-override')).toBe(false);
    });

    it('handles empty container gracefully', () => {
      expect(() => initializeOverrideStates(container)).not.toThrow();
    });
  });

  describe('per-character independence', () => {
    it('override controls are independent per character', () => {
      const card1 = createCharacterCard('actor-1', {
        xpChecked: true,
        currencyChecked: false
      });
      const card2 = createCharacterCard('actor-2', {
        xpChecked: false,
        currencyChecked: true
      });
      container.appendChild(card1);
      container.appendChild(card2);

      initializeOverrideStates(container);

      // Actor 1: XP override enabled, currency override disabled
      const xpInput1 = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );
      const currencyInput1 = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );
      const xpLabel1 = card1.querySelector('.calculated-xp-label');
      const currencyLabel1 = card1.querySelector('.calculated-currency-label');

      expect(xpInput1!.disabled).toBe(false);
      expect(currencyInput1!.disabled).toBe(true);
      expect(xpLabel1!.classList.contains('strikethrough-override')).toBe(true);
      expect(currencyLabel1!.classList.contains('strikethrough-override')).toBe(false);

      // Actor 2: XP override disabled, currency override enabled
      const xpInput2 = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-2.overrideXpValue"]'
      );
      const currencyInput2 = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-2.overrideCurrencyValue"]'
      );
      const xpLabel2 = card2.querySelector('.calculated-xp-label');
      const currencyLabel2 = card2.querySelector('.calculated-currency-label');

      expect(xpInput2!.disabled).toBe(true);
      expect(currencyInput2!.disabled).toBe(false);
      expect(xpLabel2!.classList.contains('strikethrough-override')).toBe(false);
      expect(currencyLabel2!.classList.contains('strikethrough-override')).toBe(true);
    });
  });
});
