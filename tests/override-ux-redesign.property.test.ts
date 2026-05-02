/**
 * Property-based tests for override UX redesign
 *
 * Validates correctness properties for the override visibility toggle behavior,
 * default value calculation, state restoration, and per-character independence.
 *
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import {
  handleOverrideXpChange,
  handleOverrideCurrencyChange,
  initializeOverrideStates
} from '../scripts/handlers/override-handlers';

jest.mock('../scripts/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// ── Generators ──────────────────────────────────────────────────────

/**
 * Generates a safe character ID string without dots, brackets, or quotes
 * (used in CSS selectors and name attributes).
 */
const safeCharacterId = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{0,19}$/)
  .filter(s => s.length >= 2);

/** Generates a non-negative currency value with up to two decimal places. */
const currencyValue = fc.float({ min: 0, max: 10000, noNaN: true })
  .map(v => Math.round(v * 100) / 100);

// ── DOM Builders ────────────────────────────────────────────────────

/**
 * Creates a PF2e character card DOM structure for property testing.
 */
function buildPf2eCard(
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
    <div class="character-fields">
      <fieldset class="currency-fieldset">
        <legend>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideCurrency"
                 ${options.currencyChecked ? 'checked' : ''}>
          <i class="fas fa-coins"></i> Gold Earned
        </legend>
        <div class="earned-income-section">
          <div class="form-group">
            <label class="earned-income-label"><i class="fas fa-coins"></i> Earned Income</label>
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
                 value="${options.currencyValue ?? 0}" min="0" step="0.01">
        </div>
      </fieldset>
      <div class="form-group calculated-xp-row">
        <label>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideXp"
                 ${options.xpChecked ? 'checked' : ''}>
          XP Earned
        </label>
        <div class="calculated-xp-label">4 XP</div>
        <input type="number" class="override-xp-input override-hidden" name="characters.${characterId}.overrideXpValue"
               value="${options.xpValue ?? 0}" min="0" step="1">
      </div>
    </div>
  `;

  return section;
}

/**
 * Creates a SF2e character card DOM structure for property testing.
 */
function buildSf2eCard(
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
    <div class="character-fields">
      <fieldset class="currency-fieldset">
        <legend>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideCurrency"
                 ${options.currencyChecked ? 'checked' : ''}>
          <i class="fas fa-coins"></i> Credits Earned
        </legend>
        <div class="form-group credits-awarded-row">
          <label>Credits Awarded</label>
          <div class="credits-awarded-value calculated-currency-label">${options.creditsAwarded ?? '100'} Credits</div>
        </div>
        <div class="form-group override-currency-input-row override-hidden">
          <label><i class="fas fa-coins"></i> Credits Gained</label>
          <input type="number" class="override-currency-input" name="characters.${characterId}.overrideCurrencyValue"
                 value="${options.currencyValue ?? 0}" min="0" step="1">
        </div>
      </fieldset>
      <div class="form-group calculated-xp-row">
        <label>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideXp"
                 ${options.xpChecked ? 'checked' : ''}>
          XP Earned
        </label>
        <div class="calculated-xp-label">4 XP</div>
        <input type="number" class="override-xp-input override-hidden" name="characters.${characterId}.overrideXpValue"
               value="${options.xpValue ?? 0}" min="0" step="1">
      </div>
    </div>
  `;

  return section;
}

/** Returns whether an element has the override-hidden class. */
function isHidden(element: Element | null): boolean {
  return element?.classList.contains('override-hidden') ?? false;
}

// ── Property Tests ──────────────────────────────────────────────────

describe('Feature: override-ux-redesign property tests', () => {

  // ── Property 1: XP override visibility toggle consistency ─────────

  describe('Property 1: XP override visibility toggle consistency', () => {
    /**
     * Feature: override-ux-redesign, Property 1: XP override visibility toggle consistency
     *
     * For any character card and any Override XP checkbox state, the Calculated XP Row
     * should be visible iff the checkbox is unchecked, and the Override XP Input row
     * should be visible iff the checkbox is checked.
     *
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**
     */
    it('calculated XP label visible iff unchecked, override XP input visible iff checked', () => {
      fc.assert(
        fc.property(
          safeCharacterId,
          fc.boolean(),
          (characterId, xpChecked) => {
            const container = document.createElement('div');
            const card = buildPf2eCard(characterId, { xpChecked });
            container.appendChild(card);

            handleOverrideXpChange(characterId, container);

            const calculatedXpLabel = card.querySelector('.calculated-xp-label');
            const overrideXpInput = card.querySelector('.override-xp-input');
            const xpInput = container.querySelector<HTMLInputElement>(
              `input[name="characters.${characterId}.overrideXpValue"]`
            );

            // Calculated XP label: visible when unchecked, hidden when checked
            expect(isHidden(calculatedXpLabel)).toBe(xpChecked);
            // Override XP input: hidden when unchecked, visible when checked
            expect(isHidden(overrideXpInput)).toBe(!xpChecked);
            // Input enabled iff checked
            expect(xpInput!.disabled).toBe(!xpChecked);
            // Value reset to zero when unchecked
            if (!xpChecked) {
              expect(xpInput!.value).toBe('0');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 2: Currency override visibility toggle (Pathfinder) ──

  describe('Property 2: Currency override visibility toggle consistency (Pathfinder)', () => {
    /**
     * Feature: override-ux-redesign, Property 2: Currency override visibility toggle consistency (Pathfinder)
     *
     * For any PF2e character card and any Override Currency checkbox state, the Earned
     * Income Row and Treasure Bundles Row should be visible iff the checkbox is unchecked,
     * and the Override Currency Input row should be visible iff the checkbox is checked.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8**
     */
    it('earned income and treasure bundles visible iff unchecked, override currency input visible iff checked', () => {
      fc.assert(
        fc.property(
          safeCharacterId,
          fc.boolean(),
          (characterId, currencyChecked) => {
            const container = document.createElement('div');
            const card = buildPf2eCard(characterId, { currencyChecked });
            container.appendChild(card);

            handleOverrideCurrencyChange(characterId, container);

            const earnedIncomeSection = card.querySelector('.earned-income-section');
            const treasureBundleRow = card.querySelector('.treasure-bundle-row');
            const overrideCurrencyInput = card.querySelector('.override-currency-input-row');
            const currencyInput = container.querySelector<HTMLInputElement>(
              `input[name="characters.${characterId}.overrideCurrencyValue"]`
            );

            // Original rows: visible when unchecked, hidden when checked
            expect(isHidden(earnedIncomeSection)).toBe(currencyChecked);
            expect(isHidden(treasureBundleRow)).toBe(currencyChecked);
            // Override input: hidden when unchecked, visible when checked
            expect(isHidden(overrideCurrencyInput)).toBe(!currencyChecked);
            // Input enabled iff checked
            expect(currencyInput!.disabled).toBe(!currencyChecked);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 3: Currency override visibility toggle (Starfinder) ──

  describe('Property 3: Currency override visibility toggle consistency (Starfinder)', () => {
    /**
     * Feature: override-ux-redesign, Property 3: Currency override visibility toggle consistency (Starfinder)
     *
     * For any SF2e character card and any Override Currency checkbox state, the Credits
     * Awarded Row should be visible iff the checkbox is unchecked, and the Override
     * Currency Input row should be visible iff the checkbox is checked.
     *
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.8**
     */
    it('credits awarded row visible iff unchecked, override currency input visible iff checked', () => {
      fc.assert(
        fc.property(
          safeCharacterId,
          fc.boolean(),
          (characterId, currencyChecked) => {
            const container = document.createElement('div');
            const card = buildSf2eCard(characterId, { currencyChecked });
            container.appendChild(card);

            handleOverrideCurrencyChange(characterId, container);

            const creditsAwardedRow = card.querySelector('.credits-awarded-row');
            const overrideCurrencyInput = card.querySelector('.override-currency-input-row');
            const currencyInput = container.querySelector<HTMLInputElement>(
              `input[name="characters.${characterId}.overrideCurrencyValue"]`
            );

            // Credits awarded row: visible when unchecked, hidden when checked
            expect(isHidden(creditsAwardedRow)).toBe(currencyChecked);
            // Override input: hidden when unchecked, visible when checked
            expect(isHidden(overrideCurrencyInput)).toBe(!currencyChecked);
            // Input enabled iff checked
            expect(currencyInput!.disabled).toBe(!currencyChecked);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 4: Currency override default value equals sum ────────

  describe('Property 4: Currency override default value equals sum of calculated values', () => {
    /**
     * Feature: override-ux-redesign, Property 4: Currency override default value equals sum of calculated values
     *
     * For any PF2e character with any treasure bundle gold value (≥0) and any earned
     * income value (≥0), when the Override Currency checkbox is checked, the override
     * input value should equal the sum. When unchecked, the value should be zero.
     *
     * **Validates: Requirements 3.6, 8.1, 8.3, 8.4**
     */
    it('override input equals treasure bundle + earned income when checked, zero when unchecked', () => {
      fc.assert(
        fc.property(
          safeCharacterId,
          currencyValue,
          currencyValue,
          fc.boolean(),
          (characterId, treasureBundle, earnedIncome, currencyChecked) => {
            const container = document.createElement('div');
            const card = buildPf2eCard(characterId, {
              currencyChecked,
              treasureBundleGp: treasureBundle.toFixed(2),
              earnedIncome: earnedIncome.toFixed(2)
            });
            container.appendChild(card);

            handleOverrideCurrencyChange(characterId, container);

            const input = container.querySelector<HTMLInputElement>(
              `input[name="characters.${characterId}.overrideCurrencyValue"]`
            );
            const actualValue = Number.parseFloat(input!.value);

            if (currencyChecked) {
              const expectedSum = treasureBundle + earnedIncome;
              expect(actualValue).toBeCloseTo(expectedSum, 1);
            } else {
              expect(actualValue).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 5: Override state restoration on form load ───────────

  describe('Property 5: Override state restoration on form load', () => {
    /**
     * Feature: override-ux-redesign, Property 5: Override state restoration on form load
     *
     * For any saved override state (XP checked/unchecked, Currency checked/unchecked,
     * with any override values), loading the form should produce the correct visibility
     * configuration.
     *
     * **Validates: Requirements 7.4**
     */
    it('initializeOverrideStates produces correct visibility for any saved state', () => {
      fc.assert(
        fc.property(
          safeCharacterId,
          fc.boolean(),
          fc.boolean(),
          (characterId, xpChecked, currencyChecked) => {
            const container = document.createElement('div');
            const card = buildPf2eCard(characterId, { xpChecked, currencyChecked });
            container.appendChild(card);

            initializeOverrideStates(container);

            const calculatedXpLabel = card.querySelector('.calculated-xp-label');
            const overrideXpInput = card.querySelector('.override-xp-input');
            const earnedIncomeSection = card.querySelector('.earned-income-section');
            const treasureBundleRow = card.querySelector('.treasure-bundle-row');
            const overrideCurrencyInput = card.querySelector('.override-currency-input-row');

            // XP visibility
            expect(isHidden(calculatedXpLabel)).toBe(xpChecked);
            expect(isHidden(overrideXpInput)).toBe(!xpChecked);

            // Currency visibility
            expect(isHidden(earnedIncomeSection)).toBe(currencyChecked);
            expect(isHidden(treasureBundleRow)).toBe(currencyChecked);
            expect(isHidden(overrideCurrencyInput)).toBe(!currencyChecked);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 6: Per-character override independence ───────────────

  describe('Property 6: Per-character override independence', () => {
    /**
     * Feature: override-ux-redesign, Property 6: Per-character override independence
     *
     * For any two distinct characters in the same form, changing one character's
     * override checkbox should not modify the other character's override state,
     * field visibility, or override input value.
     *
     * **Validates: Requirements 9.1, 9.2**
     */
    it('toggling one character override does not affect another character', () => {
      fc.assert(
        fc.property(
          safeCharacterId,
          safeCharacterId,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (idA, idB, xpA, currA, xpB, currB) => {
            // Ensure distinct character IDs
            fc.pre(idA !== idB);

            const container = document.createElement('div');
            const cardA = buildPf2eCard(idA, { xpChecked: xpA, currencyChecked: currA });
            const cardB = buildPf2eCard(idB, { xpChecked: xpB, currencyChecked: currB });
            container.appendChild(cardA);
            container.appendChild(cardB);

            // Initialize both characters
            initializeOverrideStates(container);

            // Capture character B's state before toggling A
            const bXpInput = container.querySelector<HTMLInputElement>(
              `input[name="characters.${idB}.overrideXpValue"]`
            );
            const bCurrInput = container.querySelector<HTMLInputElement>(
              `input[name="characters.${idB}.overrideCurrencyValue"]`
            );
            const bXpValueBefore = bXpInput!.value;
            const bCurrValueBefore = bCurrInput!.value;
            const bCalcXpLabelHiddenBefore = isHidden(cardB.querySelector('.calculated-xp-label'));
            const bOverrideXpInputHiddenBefore = isHidden(cardB.querySelector('.override-xp-input'));
            const bEarnedIncomeHiddenBefore = isHidden(cardB.querySelector('.earned-income-section'));
            const bTreasureHiddenBefore = isHidden(cardB.querySelector('.treasure-bundle-row'));
            const bOverrideCurrInputHiddenBefore = isHidden(cardB.querySelector('.override-currency-input-row'));

            // Toggle character A's XP override
            const aXpCheckbox = container.querySelector<HTMLInputElement>(
              `input[name="characters.${idA}.overrideXp"]`
            );
            aXpCheckbox!.checked = !aXpCheckbox!.checked;
            handleOverrideXpChange(idA, container);

            // Toggle character A's currency override
            const aCurrCheckbox = container.querySelector<HTMLInputElement>(
              `input[name="characters.${idA}.overrideCurrency"]`
            );
            aCurrCheckbox!.checked = !aCurrCheckbox!.checked;
            handleOverrideCurrencyChange(idA, container);

            // Verify character B's state is unchanged
            expect(bXpInput!.value).toBe(bXpValueBefore);
            expect(bCurrInput!.value).toBe(bCurrValueBefore);
            expect(isHidden(cardB.querySelector('.calculated-xp-label'))).toBe(bCalcXpLabelHiddenBefore);
            expect(isHidden(cardB.querySelector('.override-xp-input'))).toBe(bOverrideXpInputHiddenBefore);
            expect(isHidden(cardB.querySelector('.earned-income-section'))).toBe(bEarnedIncomeHiddenBefore);
            expect(isHidden(cardB.querySelector('.treasure-bundle-row'))).toBe(bTreasureHiddenBefore);
            expect(isHidden(cardB.querySelector('.override-currency-input-row'))).toBe(bOverrideCurrInputHiddenBefore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
