/**
 * Unit tests for validation-display module
 *
 * Tests the display of validation errors in the Party Chronicle form.
 *
 * @jest-environment jsdom
 */

import { updateValidationDisplay } from '../../scripts/handlers/validation-display';

// Mock the validator module
jest.mock('../../scripts/model/party-chronicle-validator', () => ({
  validateSharedFields: jest.fn((shared: any) => {
    const errors: string[] = [];
    if (!shared?.gmPfsNumber) errors.push('GM PFS Number is required');
    if (!shared?.scenarioName) errors.push('Scenario Name is required');
    return { valid: errors.length === 0, errors };
  }),
  validateUniqueFields: jest.fn((unique: any, name: string) => {
    const errors: string[] = [];
    if (!unique?.playerNumber) errors.push(`${name}: Player Number is required`);
    if (!unique?.incomeEarned && unique?.incomeEarned !== 0) errors.push(`${name}: Income Earned is required`);
    return { valid: errors.length === 0, errors };
  }),
}));

function createFormContainer(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <div id="validationErrors" style="display: none;">
      <ul id="validationErrorList"></ul>
    </div>
    <button id="generateChronicles" data-tooltip="Generate Chronicles">Generate</button>
    <div class="form-group">
      <label for="gmPfsNumber">GM PFS Number</label>
      <input id="gmPfsNumber" />
    </div>
    <div class="form-group">
      <label for="scenarioName">Scenario Name</label>
      <input id="scenarioName" />
    </div>
    <div class="member-activity" data-character-id="actor1">
      <span class="character-society-id">12345-2001</span>
      <div class="form-group">
        <label for="incomeEarned-actor1">Income Earned</label>
        <input id="incomeEarned-actor1" />
      </div>
      <div class="form-group">
        <label for="goldEarned-actor1">Gold Earned</label>
        <input id="goldEarned-actor1" />
      </div>
      <div class="form-group">
        <label for="goldSpent-actor1">Gold Spent</label>
        <input id="goldSpent-actor1" />
      </div>
    </div>
  `;
  return container;
}

describe('updateValidationDisplay', () => {
  it('should show error panel when there are validation errors', () => {
    const container = createFormContainer();
    const partyActors = [{ id: 'actor1', name: 'Valeros' }];
    const extractFormData = () => ({
      shared: {},
      characters: { actor1: {} },
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const errorPanel = container.querySelector('#validationErrors') as HTMLElement;
    expect(errorPanel.style.display).toBe('block');
  });

  it('should hide error panel when there are no validation errors', () => {
    const container = createFormContainer();
    const partyActors = [{ id: 'actor1', name: 'Valeros' }];
    const extractFormData = () => ({
      shared: { gmPfsNumber: '12345', scenarioName: 'Test' },
      characters: { actor1: { playerNumber: '12345', characterNumber: '2001', incomeEarned: 10 } },
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const errorPanel = container.querySelector('#validationErrors') as HTMLElement;
    expect(errorPanel.style.display).toBe('none');
  });

  it('should disable generate button when there are errors', () => {
    const container = createFormContainer();
    const partyActors = [{ id: 'actor1', name: 'Valeros' }];
    const extractFormData = () => ({
      shared: {},
      characters: { actor1: {} },
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const button = container.querySelector('#generateChronicles') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.dataset.tooltip).toContain('correct validation errors');
  });

  it('should enable generate button when there are no errors', () => {
    const container = createFormContainer();
    const partyActors = [{ id: 'actor1', name: 'Valeros' }];
    const extractFormData = () => ({
      shared: { gmPfsNumber: '12345', scenarioName: 'Test' },
      characters: { actor1: { playerNumber: '12345', characterNumber: '2001', incomeEarned: 10 } },
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const button = container.querySelector('#generateChronicles') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('should add has-error class to shared fields with errors', () => {
    const container = createFormContainer();
    const partyActors: any[] = [];
    const extractFormData = () => ({
      shared: {},
      characters: {},
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const gmGroup = container.querySelector('#gmPfsNumber')?.closest('.form-group');
    expect(gmGroup?.classList.contains('has-error')).toBe(true);
  });

  it('should add field-error spans inside form-groups for errored fields', () => {
    const container = createFormContainer();
    const partyActors: any[] = [];
    const extractFormData = () => ({
      shared: {},
      characters: {},
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const errorSpans = container.querySelectorAll('.field-error');
    expect(errorSpans.length).toBeGreaterThan(0);
  });

  it('should clear previous field errors before rendering new ones', () => {
    const container = createFormContainer();
    const partyActors: any[] = [];

    // First call with errors
    updateValidationDisplay(container, partyActors, () => ({
      shared: {},
      characters: {},
    }));

    // Second call without errors
    updateValidationDisplay(container, partyActors, () => ({
      shared: { gmPfsNumber: '12345', scenarioName: 'Test' },
      characters: {},
    }));

    const errorSpans = container.querySelectorAll('.field-error');
    expect(errorSpans.length).toBe(0);
  });

  it('should highlight society ID for character errors', () => {
    const container = createFormContainer();
    const partyActors = [{ id: 'actor1', name: 'Valeros' }];
    const extractFormData = () => ({
      shared: { gmPfsNumber: '12345', scenarioName: 'Test' },
      characters: { actor1: {} },
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const societyId = container.querySelector('.character-society-id') as HTMLElement;
    expect(societyId.style.color).toBe('rgb(211, 47, 47)');
  });

  it('should populate error list items in the error panel', () => {
    const container = createFormContainer();
    const partyActors = [{ id: 'actor1', name: 'Valeros' }];
    const extractFormData = () => ({
      shared: {},
      characters: { actor1: {} },
    });

    updateValidationDisplay(container, partyActors, extractFormData);

    const errorList = container.querySelector('#validationErrorList') as HTMLElement;
    const items = errorList.querySelectorAll('li');
    expect(items.length).toBeGreaterThan(0);
  });
});
