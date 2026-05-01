/**
 * Unit tests for override UX template structure changes
 * 
 * Validates the DOM structure of the redesigned override layout including
 * checkbox column positioning, input labels, tooltips, step values,
 * Consume Replay relocation, and Advanced section removal.
 * 
 * Requirements: override-ux-redesign 1.1, 1.2, 1.3, 1.5, 2.5, 2.6, 2.8,
 *   3.5, 3.7, 4.5, 4.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 9.3
 * 
 * @jest-environment jsdom
 */

import { isValidSectionId } from '../../scripts/handlers/collapsible-section-handlers';

jest.mock('../../scripts/model/collapse-state-storage', () => ({
  saveCollapseState: jest.fn(),
  loadCollapseState: jest.fn(() => null),
  getDefaultCollapseState: jest.fn(() => false)
}));

jest.mock('../../scripts/utils/summary-utils', () => ({
  generateEventDetailsSummary: jest.fn(() => ''),
  generateReputationSummary: jest.fn(() => ''),
  generateSharedRewardsSummary: jest.fn(() => '')
}));

/**
 * Builds a PF2e party member character card matching the template structure.
 */
function buildPf2ePartyMemberCard(characterId: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'member-activity';
  section.dataset.characterId = characterId;

  section.innerHTML = `
    <div class="character-info">
      <div class="actor-image"><img src="test.png" alt="Test Character"></div>
      <div class="character-identity">
        <div class="character-name">Test Character</div>
        <div class="character-society-id">12345-2001</div>
        <div class="character-level">Level 5</div>
        <div class="character-faction" id="factionDisplay-${characterId}">Horizon Hunters</div>
      </div>
      <input type="hidden" name="characters.${characterId}.characterName" value="Test Character">
      <input type="hidden" name="characters.${characterId}.level" value="5">
    </div>
    <div class="character-fields">
      <fieldset class="currency-fieldset">
        <legend>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideCurrency"
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
            <input type="hidden" name="characters.${characterId}.earnedIncome" value="0" class="earned-income-hidden">
          </div>
        </div>
        <div class="form-group treasure-bundle-row">
          <label>Treasure Bundles</label>
          <div class="treasure-bundle-value calculated-currency-label">0.00 gp</div>
        </div>
        <div class="form-group override-currency-input-row override-hidden">
          <label><i class="fas fa-coins"></i> GP Gained</label>
          <input type="number" class="override-currency-input" name="characters.${characterId}.overrideCurrencyValue"
                 value="0" min="0" step="0.01"
                 data-tooltip="Manual override value for total currency gained.">
        </div>
      </fieldset>
      <div class="form-group calculated-xp-row">
        <label>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideXp"
                 data-tooltip="Override XP">
          XP Earned
        </label>
        <div class="calculated-xp-label">4 XP</div>
        <input type="number" class="override-xp-input override-hidden" name="characters.${characterId}.overrideXpValue"
               value="0" min="0" step="1"
               data-tooltip="Manual override value for XP earned. This replaces the shared XP value for this character.">
      </div>
      <div class="form-group">
        <label class="checkbox-label" data-tooltip="Check this if the player has already played this scenario and is using a replay credit.">
          <input type="checkbox" name="characters.${characterId}.consumeReplay">
          Consume Replay
        </label>
      </div>
      <div class="form-group full-width">
        <label><i class="fas fa-note-sticky"></i> Notes:</label>
        <textarea name="characters.${characterId}.notes" rows="3"></textarea>
      </div>
    </div>
  `;

  return section;
}

/**
 * Builds an SF2e party member character card matching the template structure.
 */
function buildSf2ePartyMemberCard(characterId: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'member-activity';
  section.dataset.characterId = characterId;

  section.innerHTML = `
    <div class="character-info">
      <div class="actor-image"><img src="test.png" alt="Test Character"></div>
      <div class="character-identity">
        <div class="character-name">Test Character</div>
      </div>
    </div>
    <div class="character-fields">
      <fieldset class="currency-fieldset">
        <legend>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideCurrency"
                 data-tooltip="Override Credits">
          <i class="fas fa-coins"></i> Credits Earned
        </legend>
        <div class="form-group credits-awarded-row">
          <label>Credits Awarded</label>
          <div class="credits-awarded-value calculated-currency-label">100 Credits</div>
        </div>
        <div class="form-group override-currency-input-row override-hidden">
          <label><i class="fas fa-coins"></i> Credits Gained</label>
          <input type="number" class="override-currency-input" name="characters.${characterId}.overrideCurrencyValue"
                 value="0" min="0" step="1"
                 data-tooltip="Manual override value for total currency gained.">
        </div>
      </fieldset>
      <div class="form-group calculated-xp-row">
        <label>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideXp"
                 data-tooltip="Override XP">
          XP Earned
        </label>
        <div class="calculated-xp-label">4 XP</div>
        <input type="number" class="override-xp-input override-hidden" name="characters.${characterId}.overrideXpValue"
               value="0" min="0" step="1"
               data-tooltip="Manual override value for XP earned.">
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" name="characters.${characterId}.consumeReplay">
          Consume Replay
        </label>
      </div>
      <div class="form-group full-width">
        <label>Notes:</label>
        <textarea name="characters.${characterId}.notes" rows="3"></textarea>
      </div>
    </div>
  `;

  return section;
}

/**
 * Builds a GM character card matching the template structure.
 */
function buildGmCharacterCard(characterId: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'member-activity gm-character-section';
  section.id = 'gmCharacterSection';
  section.dataset.characterId = characterId;

  section.innerHTML = `
    <div class="character-info">
      <div class="actor-image"><img src="test.png" alt="GM Character"></div>
      <div class="character-identity">
        <div class="character-name">GM Character <span class="gm-credit-label">GM Credit</span></div>
      </div>
      <button type="button" id="clearGmCharacter" class="gm-clear-button"><i class="fas fa-trash-can"></i></button>
      <input type="hidden" id="gmCharacterActorId" name="shared.gmCharacterActorId" value="${characterId}">
    </div>
    <div class="character-fields">
      <fieldset class="currency-fieldset">
        <legend>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideCurrency"
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
            <input type="hidden" name="characters.${characterId}.earnedIncome" value="0" class="earned-income-hidden">
          </div>
        </div>
        <div class="form-group treasure-bundle-row">
          <label>Treasure Bundles</label>
          <div class="treasure-bundle-value calculated-currency-label">0.00 gp</div>
        </div>
        <div class="form-group override-currency-input-row override-hidden">
          <label><i class="fas fa-coins"></i> GP Gained</label>
          <input type="number" class="override-currency-input" name="characters.${characterId}.overrideCurrencyValue"
                 value="0" min="0" step="0.01">
        </div>
      </fieldset>
      <div class="form-group calculated-xp-row">
        <label>
          <input type="checkbox" class="override-icon-checkbox" name="characters.${characterId}.overrideXp"
                 data-tooltip="Override XP">
          XP Earned
        </label>
        <div class="calculated-xp-label">4 XP</div>
        <input type="number" class="override-xp-input override-hidden" name="characters.${characterId}.overrideXpValue"
               value="0" min="0" step="1">
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" name="characters.${characterId}.consumeReplay">
          Consume Replay
        </label>
      </div>
      <div class="form-group full-width">
        <label>Notes:</label>
        <textarea name="characters.${characterId}.notes" rows="3"></textarea>
      </div>
    </div>
  `;

  return section;
}

describe('override template structure', () => {
  describe('Override checkboxes in currency fieldset', () => {
    it('currency checkbox is in the fieldset legend in party member cards', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const fieldset = card.querySelector('.currency-fieldset');
      expect(fieldset).not.toBeNull();

      const legend = fieldset!.querySelector('legend');
      expect(legend).not.toBeNull();

      const currencyCheckbox = legend!.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrency"]'
      );
      expect(currencyCheckbox).not.toBeNull();
      expect(currencyCheckbox!.classList.contains('override-icon-checkbox')).toBe(true);

      // Must NOT be inside the earned-income-section
      const earnedIncomeSection = card.querySelector('.earned-income-section');
      expect(earnedIncomeSection!.querySelector('input[name="characters.actor-1.overrideCurrency"]')).toBeNull();
    });

    it('earned-income-section is inside the currency fieldset', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const fieldset = card.querySelector('.currency-fieldset');
      const earnedIncomeSection = fieldset!.querySelector('.earned-income-section');
      expect(earnedIncomeSection).not.toBeNull();
    });

    it('treasure-bundle-row is inside the currency fieldset', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const fieldset = card.querySelector('.currency-fieldset');
      const treasureBundleRow = fieldset!.querySelector('.treasure-bundle-row');
      expect(treasureBundleRow).not.toBeNull();
    });

    it('override-currency-input-row is inside the currency fieldset', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const fieldset = card.querySelector('.currency-fieldset');
      const overrideRow = fieldset!.querySelector('.override-currency-input-row');
      expect(overrideRow).not.toBeNull();
    });

    it('XP checkbox is in the .calculated-xp-row composite form-group in party member cards', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const compositeRow = card.querySelector('.calculated-xp-row');
      expect(compositeRow).not.toBeNull();

      const xpCheckbox = compositeRow!.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXp"]'
      );
      expect(xpCheckbox).not.toBeNull();
      expect(xpCheckbox!.classList.contains('override-icon-checkbox')).toBe(true);
    });

    it('currency checkbox is in the fieldset legend in GM character card', () => {
      const card = buildGmCharacterCard('gm-actor-1');
      const fieldset = card.querySelector('.currency-fieldset');
      expect(fieldset).not.toBeNull();

      const legend = fieldset!.querySelector('legend');
      expect(legend).not.toBeNull();

      const currencyCheckbox = legend!.querySelector<HTMLInputElement>(
        'input[name="characters.gm-actor-1.overrideCurrency"]'
      );
      expect(currencyCheckbox).not.toBeNull();
      expect(currencyCheckbox!.classList.contains('override-icon-checkbox')).toBe(true);

      // Must NOT be inside the earned-income-section
      const earnedIncomeSection = card.querySelector('.earned-income-section');
      expect(earnedIncomeSection!.querySelector('input[name="characters.gm-actor-1.overrideCurrency"]')).toBeNull();
    });

    it('XP checkbox is in the .calculated-xp-row composite form-group in GM character card', () => {
      const card = buildGmCharacterCard('gm-actor-1');
      const compositeRow = card.querySelector('.calculated-xp-row');
      expect(compositeRow).not.toBeNull();

      const xpCheckbox = compositeRow!.querySelector<HTMLInputElement>(
        'input[name="characters.gm-actor-1.overrideXp"]'
      );
      expect(xpCheckbox).not.toBeNull();
      expect(xpCheckbox!.classList.contains('override-icon-checkbox')).toBe(true);
    });

    it('no override-checkbox-column exists in party member cards', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      expect(card.querySelector('.override-checkbox-column')).toBeNull();
    });

    it('no override-checkbox-column exists in GM character card', () => {
      const card = buildGmCharacterCard('gm-actor-1');
      expect(card.querySelector('.override-checkbox-column')).toBeNull();
    });
  });

  describe('Override XP Input', () => {
    it('has label "XP Earned" and override tooltip', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const compositeRow = card.querySelector('.calculated-xp-row') as HTMLElement;
      const label = compositeRow.querySelector('label') as HTMLElement;
      const input = compositeRow.querySelector('input[type="number"]') as HTMLInputElement;

      expect(label.textContent).toContain('XP Earned');
      expect(input.dataset.tooltip).toContain('override');
    });
  });

  describe('Override Currency Input labels and step values', () => {
    it('has label "GP Gained" for PF2e', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const overrideRow = card.querySelector('.override-currency-input-row') as HTMLElement;
      const label = overrideRow.querySelector('label') as HTMLElement;

      expect(label.textContent).toContain('GP Gained');
    });

    it('has label "Credits Gained" for SF2e', () => {
      const card = buildSf2ePartyMemberCard('actor-1');
      const overrideRow = card.querySelector('.override-currency-input-row') as HTMLElement;
      const label = overrideRow.querySelector('label') as HTMLElement;

      expect(label.textContent).toContain('Credits Gained');
    });

    it('has step 0.01 for PF2e', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const input = card.querySelector(
        '.override-currency-input-row input[type="number"]'
      ) as HTMLInputElement;

      expect(input.step).toBe('0.01');
    });

    it('has step 1 for SF2e', () => {
      const card = buildSf2ePartyMemberCard('actor-1');
      const input = card.querySelector(
        '.override-currency-input-row input[type="number"]'
      ) as HTMLInputElement;

      expect(input.step).toBe('1');
    });
  });

  describe('Checkbox tooltips', () => {
    it('Override Currency tooltip is "Override GP" for PF2e', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const currencyCheckbox = card.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrency"]'
      );

      expect(currencyCheckbox!.dataset.tooltip).toBe('Override GP');
    });

    it('Override Currency tooltip is "Override Credits" for SF2e', () => {
      const card = buildSf2ePartyMemberCard('actor-1');
      const currencyCheckbox = card.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideCurrency"]'
      );

      expect(currencyCheckbox!.dataset.tooltip).toBe('Override Credits');
    });

    it('Override XP tooltip is "Override XP"', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const xpCheckbox = card.querySelector<HTMLInputElement>(
        'input[name="characters.actor-1.overrideXp"]'
      );

      expect(xpCheckbox!.dataset.tooltip).toBe('Override XP');
    });

    it('override checkboxes are in fieldset legend, not inside hideable sections', () => {
      const card = buildPf2ePartyMemberCard('actor-1');

      // No override-checkbox-column should exist
      expect(card.querySelector('.override-checkbox-column')).toBeNull();

      // Currency checkbox is in the fieldset legend
      const legend = card.querySelector('.currency-fieldset legend');
      const currencyCheckbox = legend?.querySelector('input[name="characters.actor-1.overrideCurrency"]');
      expect(currencyCheckbox).not.toBeNull();

      // XP checkbox is in the .calculated-xp-row composite row
      const xpComposite = card.querySelector('.calculated-xp-row');
      const xpCheckbox = xpComposite?.querySelector('input[name="characters.actor-1.overrideXp"]');
      expect(xpCheckbox).not.toBeNull();

      // Currency checkbox is not inside the earned-income-section
      expect(card.querySelector('.earned-income-section')?.querySelector('input[name="characters.actor-1.overrideCurrency"]')).toBeNull();
      expect(xpComposite?.closest('.earned-income-section')).toBeNull();
    });
  });

  describe('Consume Replay relocation', () => {
    it('is above Notes and not in a collapsible section', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const characterFields = card.querySelector('.character-fields') as HTMLElement;
      const formGroups = Array.from(characterFields.querySelectorAll(':scope > .form-group, :scope > .currency-fieldset'));

      // Find the Consume Replay form group and Notes form group
      const consumeReplayIndex = formGroups.findIndex(
        fg => fg.querySelector('input[name="characters.actor-1.consumeReplay"]') !== null
      );
      const notesIndex = formGroups.findIndex(
        fg => fg.querySelector('textarea[name="characters.actor-1.notes"]') !== null
      );

      expect(consumeReplayIndex).toBeGreaterThan(-1);
      expect(notesIndex).toBeGreaterThan(-1);
      expect(consumeReplayIndex).toBeLessThan(notesIndex);

      // Verify it's not inside a collapsible section
      const consumeReplayInput = card.querySelector('input[name="characters.actor-1.consumeReplay"]') as HTMLElement;
      const closestCollapsible = consumeReplayInput.closest('.collapsible-section');
      expect(closestCollapsible).toBeNull();
    });
  });

  describe('Advanced section removal', () => {
    it('no Advanced section exists in party member cards', () => {
      const card = buildPf2ePartyMemberCard('actor-1');
      const advancedSection = card.querySelector('.advanced-section');

      expect(advancedSection).toBeNull();
    });

    it('no Advanced section exists in GM character card', () => {
      const card = buildGmCharacterCard('gm-actor-1');
      const advancedSection = card.querySelector('.advanced-section');

      expect(advancedSection).toBeNull();
    });
  });

  describe('isValidSectionId rejects advanced patterns', () => {
    it('rejects advanced-{characterId} patterns', () => {
      expect(isValidSectionId('advanced-actor-123')).toBe(false);
      expect(isValidSectionId('advanced-abc')).toBe(false);
      expect(isValidSectionId('advanced-gm-char-456')).toBe(false);
    });
  });

  describe('GM character card override controls', () => {
    it('has same override controls as party member cards', () => {
      const gmCard = buildGmCharacterCard('gm-actor-1');
      const partyCard = buildPf2ePartyMemberCard('party-actor-1');

      // Both should have override currency and XP checkboxes
      expect(gmCard.querySelector('input[name="characters.gm-actor-1.overrideCurrency"]')).not.toBeNull();
      expect(gmCard.querySelector('input[name="characters.gm-actor-1.overrideXp"]')).not.toBeNull();
      expect(partyCard.querySelector('input[name="characters.party-actor-1.overrideCurrency"]')).not.toBeNull();
      expect(partyCard.querySelector('input[name="characters.party-actor-1.overrideXp"]')).not.toBeNull();

      // Both should have currency fieldset with override input row
      expect(gmCard.querySelector('.currency-fieldset .override-currency-input-row .override-currency-input')).not.toBeNull();
      expect(gmCard.querySelector('.calculated-xp-row .override-xp-input')).not.toBeNull();

      // Both should have calculated rows inside fieldset
      expect(gmCard.querySelector('.currency-fieldset .earned-income-section')).not.toBeNull();
      expect(gmCard.querySelector('.currency-fieldset .treasure-bundle-row')).not.toBeNull();

      // Neither should have override-checkbox-column
      expect(gmCard.querySelector('.override-checkbox-column')).toBeNull();
      expect(partyCard.querySelector('.override-checkbox-column')).toBeNull();

      // Neither should have currency-override-composite
      expect(gmCard.querySelector('.currency-override-composite')).toBeNull();
      expect(partyCard.querySelector('.currency-override-composite')).toBeNull();
    });
  });
});
