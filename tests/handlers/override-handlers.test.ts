/**
 * Unit tests for override handlers (visibility toggle redesign)
 * 
 * Tests the event handlers for XP and currency override checkboxes,
 * including visibility toggling, default value calculation, and initialization.
 * 
 * Requirements: override-ux-redesign 2.1–2.4, 2.7, 3.1–3.4, 3.6, 3.8, 4.1–4.4, 4.6, 4.8, 7.4, 8.1–8.3
 * 
 * @jest-environment jsdom
 */

import {
  handleOverrideXpChange,
  handleOverrideCurrencyChange,
  initializeOverrideStates
} from '../../scripts/handlers/override-handlers';

jest.mock('../../scripts/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

/**
 * Creates a mock PF2e character card DOM structure with override elements
 * using composite rows where checkbox, label, and value live in ONE row.
 */
function createPf2eCharacterCard(
  characterId: string,
  options: {
    xpChecked?: boolean;
    currencyChecked?: boolean;
    xpValue?: number;
    currencyValue?: number;
    treasureBundleGp?: string;
    earnedIncome?: string;
  } = {}
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'member-activity';
  section.dataset.characterId = characterId;

  section.innerHTML = `
    <div class="character-info">
      <div class="actor-image"><img src="test.png" alt="Test"></div>
      <div class="character-identity">
        <div class="character-name">Test Character</div>
      </div>
    </div>
    <div class="character-fields">
      <fieldset class="currency-fieldset">
        <legend>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideCurrency"
                 ${options.currencyChecked ? 'checked' : ''}
                 data-tooltip="Override GP">
          <i class="fas fa-coins"></i> Gold Earned
        </legend>
        <div class="earned-income-section">
          <div class="form-group">
            <label>Task Level</label>
            <select name="characters.${characterId}.taskLevel"><option value="0">0</option></select>
          </div>
          <div class="form-group">
            <label class="earned-income-label"><i class="fas fa-coins"></i> Earned Income</label>
            <div class="earned-income-value">0.00 gp</div>
            <input type="hidden" name="characters.${characterId}.earnedIncome"
                   value="${options.earnedIncome ?? '0'}" class="earned-income-hidden">
          </div>
        </div>
        <div class="form-group treasure-bundle-row">
          <label>Treasure Bundles</label>
          <div class="treasure-bundle-value calculated-currency-label">${options.treasureBundleGp ?? '0.00'} gp</div>
        </div>
        <div class="form-group override-currency-input-row override-hidden">
          <label><i class="fas fa-coins"></i> GP Gained</label>
          <input type="number" class="override-currency-input" name="characters.${characterId}.overrideCurrencyValue"
                 value="${options.currencyValue ?? 0}" min="0" step="0.01"
                 data-tooltip="Manual override value for total currency gained.">
        </div>
      </fieldset>
      <div class="form-group calculated-xp-row">
        <label>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideXp"
                 ${options.xpChecked ? 'checked' : ''}
                 data-tooltip="Override XP">
          XP Earned
        </label>
        <div class="calculated-xp-label">4 XP</div>
        <input type="number" class="override-xp-input override-hidden" name="characters.${characterId}.overrideXpValue"
               value="${options.xpValue ?? 0}" min="0" step="1"
               data-tooltip="Manual override value for XP earned.">
      </div>
    </div>
  `;

  return section;
}

/**
 * Creates a mock SF2e character card DOM structure with credits-awarded-row
 * and composite override rows.
 */
function createSf2eCharacterCard(
  characterId: string,
  options: {
    xpChecked?: boolean;
    currencyChecked?: boolean;
    xpValue?: number;
    currencyValue?: number;
    creditsAwarded?: string;
  } = {}
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'member-activity';
  section.dataset.characterId = characterId;

  section.innerHTML = `
    <div class="character-info">
      <div class="actor-image"><img src="test.png" alt="Test"></div>
      <div class="character-identity">
        <div class="character-name">Test Character</div>
      </div>
    </div>
    <div class="character-fields">
      <fieldset class="currency-fieldset">
        <legend>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideCurrency"
                 ${options.currencyChecked ? 'checked' : ''}
                 data-tooltip="Override Credits">
          <i class="fas fa-coins"></i> Credits Earned
        </legend>
        <div class="form-group credits-awarded-row">
          <label>Credits Awarded</label>
          <div class="credits-awarded-value calculated-currency-label">${options.creditsAwarded ?? '100'} Credits</div>
        </div>
        <div class="form-group override-currency-input-row override-hidden">
          <label><i class="fas fa-coins"></i> Credits Gained</label>
          <input type="number" class="override-currency-input" name="characters.${characterId}.overrideCurrencyValue"
                 value="${options.currencyValue ?? 0}" min="0" step="1"
                 data-tooltip="Manual override value for total currency gained.">
        </div>
      </fieldset>
      <div class="form-group calculated-xp-row">
        <label>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideXp"
                 ${options.xpChecked ? 'checked' : ''}
                 data-tooltip="Override XP">
          XP Earned
        </label>
        <div class="calculated-xp-label">4 XP</div>
        <input type="number" class="override-xp-input override-hidden" name="characters.${characterId}.overrideXpValue"
               value="${options.xpValue ?? 0}" min="0" step="1"
               data-tooltip="Manual override value for XP earned.">
      </div>
    </div>
  `;

  return section;
}

describe('override-handlers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  // ── Task 6.1: handleOverrideXpChange ──────────────────────────────

  describe('handleOverrideXpChange', () => {
    it('hides Calculated XP Label and shows Override XP Input when checked', () => {
      const card = createPf2eCharacterCard('actor-1', { xpChecked: true });
      container.appendChild(card);

      handleOverrideXpChange('actor-1', container);

      const calculatedXpLabel = card.querySelector('.calculated-xp-label') as HTMLElement;
      const overrideXpInput = card.querySelector('.override-xp-input') as HTMLElement;

      expect(calculatedXpLabel.classList.contains('override-hidden')).toBe(true);
      expect(overrideXpInput.classList.contains('override-hidden')).toBe(false);
    });

    it('restores Calculated XP Label, hides Override XP Input, and resets value when unchecked', () => {
      const card = createPf2eCharacterCard('actor-1', { xpChecked: false, xpValue: 8 });
      container.appendChild(card);

      // Simulate previously-active override state
      const calculatedXpLabel = card.querySelector('.calculated-xp-label') as HTMLElement;
      calculatedXpLabel.classList.add('override-hidden');
      const overrideXpInput = card.querySelector('.override-xp-input') as HTMLElement;
      overrideXpInput.classList.remove('override-hidden');

      handleOverrideXpChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );

      expect(calculatedXpLabel.classList.contains('override-hidden')).toBe(false);
      expect(overrideXpInput.classList.contains('override-hidden')).toBe(true);
      expect(input!.value).toBe('0');
    });

    it('enables Override XP Input when checked and disables when unchecked', () => {
      const card = createPf2eCharacterCard('actor-1', { xpChecked: true });
      container.appendChild(card);

      handleOverrideXpChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );
      expect(input!.disabled).toBe(false);

      // Now uncheck
      const checkbox = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXp"]'
      );
      checkbox!.checked = false;
      handleOverrideXpChange('actor-1', container);

      expect(input!.disabled).toBe(true);
    });

    it('handles missing elements gracefully', () => {
      expect(() => handleOverrideXpChange('nonexistent', container)).not.toThrow();
    });
  });

  // ── Task 6.2: handleOverrideCurrencyChange ────────────────────────

  describe('handleOverrideCurrencyChange (PF2e)', () => {
    it('hides Earned Income Section and Treasure Bundles Row, shows Override Currency Input when checked', () => {
      const card = createPf2eCharacterCard('actor-1', { currencyChecked: true });
      container.appendChild(card);

      handleOverrideCurrencyChange('actor-1', container);

      const earnedIncomeSection = card.querySelector('.earned-income-section') as HTMLElement;
      const treasureBundleRow = card.querySelector('.treasure-bundle-row') as HTMLElement;
      const overrideCurrencyInput = card.querySelector('.override-currency-input-row') as HTMLElement;

      expect(earnedIncomeSection.classList.contains('override-hidden')).toBe(true);
      expect(treasureBundleRow.classList.contains('override-hidden')).toBe(true);
      expect(overrideCurrencyInput.classList.contains('override-hidden')).toBe(false);
    });

    it('sets default value to sum of treasure bundle value + earned income when checked', () => {
      const card = createPf2eCharacterCard('actor-1', {
        currencyChecked: true,
        treasureBundleGp: '12.50',
        earnedIncome: '3.20'
      });
      container.appendChild(card);

      handleOverrideCurrencyChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );
      expect(Number.parseFloat(input!.value)).toBeCloseTo(15.7, 2);
    });

    it('restores original rows, hides Override Currency Input, and resets input to zero when unchecked', () => {
      const card = createPf2eCharacterCard('actor-1', { currencyChecked: false, currencyValue: 25 });
      container.appendChild(card);

      // Simulate previously-active override state
      const earnedIncomeSection = card.querySelector('.earned-income-section') as HTMLElement;
      const treasureBundleRow = card.querySelector('.treasure-bundle-row') as HTMLElement;
      const overrideCurrencyInput = card.querySelector('.override-currency-input-row') as HTMLElement;
      earnedIncomeSection.classList.add('override-hidden');
      treasureBundleRow.classList.add('override-hidden');
      overrideCurrencyInput.classList.remove('override-hidden');

      handleOverrideCurrencyChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );

      expect(earnedIncomeSection.classList.contains('override-hidden')).toBe(false);
      expect(treasureBundleRow.classList.contains('override-hidden')).toBe(false);
      expect(overrideCurrencyInput.classList.contains('override-hidden')).toBe(true);
      expect(input!.value).toBe('0');
    });

    it('handles missing elements gracefully', () => {
      expect(() => handleOverrideCurrencyChange('nonexistent', container)).not.toThrow();
    });
  });

  describe('handleOverrideCurrencyChange (SF2e)', () => {
    it('hides Credits Awarded Row and shows Override Currency Input when checked', () => {
      const card = createSf2eCharacterCard('actor-1', { currencyChecked: true });
      container.appendChild(card);

      handleOverrideCurrencyChange('actor-1', container);

      const creditsAwardedRow = card.querySelector('.credits-awarded-row') as HTMLElement;
      const overrideCurrencyInput = card.querySelector('.override-currency-input-row') as HTMLElement;

      expect(creditsAwardedRow.classList.contains('override-hidden')).toBe(true);
      expect(overrideCurrencyInput.classList.contains('override-hidden')).toBe(false);
    });

    it('sets default value to credits awarded value when checked', () => {
      const card = createSf2eCharacterCard('actor-1', {
        currencyChecked: true,
        creditsAwarded: '250'
      });
      container.appendChild(card);

      handleOverrideCurrencyChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );
      expect(Number.parseFloat(input!.value)).toBe(250);
    });

    it('restores Credits Awarded Row, hides Override Currency Input, and resets input to zero when unchecked', () => {
      const card = createSf2eCharacterCard('actor-1', { currencyChecked: false, currencyValue: 100 });
      container.appendChild(card);

      // Simulate previously-active override state
      const creditsAwardedRow = card.querySelector('.credits-awarded-row') as HTMLElement;
      const overrideCurrencyInput = card.querySelector('.override-currency-input-row') as HTMLElement;
      creditsAwardedRow.classList.add('override-hidden');
      overrideCurrencyInput.classList.remove('override-hidden');

      handleOverrideCurrencyChange('actor-1', container);

      const input = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );

      expect(creditsAwardedRow.classList.contains('override-hidden')).toBe(false);
      expect(overrideCurrencyInput.classList.contains('override-hidden')).toBe(true);
      expect(input!.value).toBe('0');
    });
  });

  // ── Task 6.3: initializeOverrideStates ────────────────────────────

  describe('initializeOverrideStates', () => {
    it('applies correct visibility when XP override is active', () => {
      const card = createPf2eCharacterCard('actor-1', { xpChecked: true });
      container.appendChild(card);

      initializeOverrideStates(container);

      const calculatedXpLabel = card.querySelector('.calculated-xp-label') as HTMLElement;
      const overrideXpInput = card.querySelector('.override-xp-input') as HTMLElement;
      const xpInput = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXpValue"]'
      );

      expect(calculatedXpLabel.classList.contains('override-hidden')).toBe(true);
      expect(overrideXpInput.classList.contains('override-hidden')).toBe(false);
      expect(xpInput!.disabled).toBe(false);
    });

    it('applies correct visibility when Currency override is active', () => {
      const card = createPf2eCharacterCard('actor-1', { currencyChecked: true });
      container.appendChild(card);

      initializeOverrideStates(container);

      const earnedIncomeSection = card.querySelector('.earned-income-section') as HTMLElement;
      const treasureBundleRow = card.querySelector('.treasure-bundle-row') as HTMLElement;
      const overrideCurrencyInput = card.querySelector('.override-currency-input-row') as HTMLElement;
      const currencyInput = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );

      expect(earnedIncomeSection.classList.contains('override-hidden')).toBe(true);
      expect(treasureBundleRow.classList.contains('override-hidden')).toBe(true);
      expect(overrideCurrencyInput.classList.contains('override-hidden')).toBe(false);
      expect(currencyInput!.disabled).toBe(false);
    });

    it('preserves saved override values (not overwritten by default calculation)', () => {
      const card = createPf2eCharacterCard('actor-1', {
        currencyChecked: true,
        currencyValue: 42.5,
        treasureBundleGp: '10.00',
        earnedIncome: '5.00'
      });
      container.appendChild(card);

      initializeOverrideStates(container);

      const currencyInput = container.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrencyValue"]'
      );
      // Saved value of 42.50 should be preserved, not overwritten by default (10 + 5 = 15)
      expect(Number.parseFloat(currencyInput!.value)).toBeCloseTo(42.5, 2);
    });

    it('leaves all original rows visible when no overrides are active', () => {
      const card = createPf2eCharacterCard('actor-1', {
        xpChecked: false,
        currencyChecked: false
      });
      container.appendChild(card);

      initializeOverrideStates(container);

      const calculatedXpLabel = card.querySelector('.calculated-xp-label') as HTMLElement;
      const earnedIncomeSection = card.querySelector('.earned-income-section') as HTMLElement;
      const treasureBundleRow = card.querySelector('.treasure-bundle-row') as HTMLElement;
      const overrideXpInput = card.querySelector('.override-xp-input') as HTMLElement;
      const overrideCurrencyInput = card.querySelector('.override-currency-input-row') as HTMLElement;

      expect(calculatedXpLabel.classList.contains('override-hidden')).toBe(false);
      expect(earnedIncomeSection.classList.contains('override-hidden')).toBe(false);
      expect(treasureBundleRow.classList.contains('override-hidden')).toBe(false);
      expect(overrideXpInput.classList.contains('override-hidden')).toBe(true);
      expect(overrideCurrencyInput.classList.contains('override-hidden')).toBe(true);
    });

    it('handles empty container gracefully', () => {
      expect(() => initializeOverrideStates(container)).not.toThrow();
    });
  });

  // ── Per-character independence (retained from original tests) ─────

  describe('per-character independence', () => {
    it('override controls are independent per character', () => {
      const card1 = createPf2eCharacterCard('actor-1', {
        xpChecked: true,
        currencyChecked: false
      });
      const card2 = createPf2eCharacterCard('actor-2', {
        xpChecked: false,
        currencyChecked: true
      });
      container.appendChild(card1);
      container.appendChild(card2);

      initializeOverrideStates(container);

      // Actor 1: XP override active, currency inactive
      expect(card1.querySelector('.calculated-xp-label')!.classList.contains('override-hidden')).toBe(true);
      expect(card1.querySelector('.override-xp-input')!.classList.contains('override-hidden')).toBe(false);
      expect(card1.querySelector('.earned-income-section')!.classList.contains('override-hidden')).toBe(false);
      expect(card1.querySelector('.treasure-bundle-row')!.classList.contains('override-hidden')).toBe(false);

      // Actor 2: XP override inactive, currency active
      expect(card2.querySelector('.calculated-xp-label')!.classList.contains('override-hidden')).toBe(false);
      expect(card2.querySelector('.override-xp-input')!.classList.contains('override-hidden')).toBe(true);
      expect(card2.querySelector('.earned-income-section')!.classList.contains('override-hidden')).toBe(true);
      expect(card2.querySelector('.treasure-bundle-row')!.classList.contains('override-hidden')).toBe(true);
    });
  });
});
