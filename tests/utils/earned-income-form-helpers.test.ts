/**
 * Unit tests for earned-income-form-helpers module
 *
 * Tests parameter extraction and character ID parsing from form fields.
 *
 * @jest-environment jsdom
 */

import { extractCharacterIdFromFieldName, extractEarnedIncomeParams, createEarnedIncomeChangeHandler } from '../../scripts/utils/earned-income-form-helpers';

// Mock the earned-income-calculator
jest.mock('../../scripts/utils/earned-income-calculator', () => ({
  calculateDowntimeDays: jest.fn((xp: number, _tb: number) => xp * 2),
  calculateEarnedIncome: jest.fn(() => 5),
  formatIncomeValue: jest.fn(() => '5 gp'),
}));

// Mock the party-chronicle-handlers
jest.mock('../../scripts/handlers/party-chronicle-handlers', () => ({
  updateEarnedIncomeDisplay: jest.fn(),
}));

describe('extractCharacterIdFromFieldName', () => {
  it('should extract character ID from a valid field name', () => {
    expect(extractCharacterIdFromFieldName('characters.abc123.taskLevel')).toBe('abc123');
  });

  it('should extract character ID from level field', () => {
    expect(extractCharacterIdFromFieldName('characters.xyz789.level')).toBe('xyz789');
  });

  it('should extract character ID from successLevel field', () => {
    expect(extractCharacterIdFromFieldName('characters.char1.successLevel')).toBe('char1');
  });

  it('should return null for non-character field names', () => {
    expect(extractCharacterIdFromFieldName('shared.gmPfsNumber')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractCharacterIdFromFieldName('')).toBeNull();
  });

  it('should return null for field name without dot after character ID', () => {
    expect(extractCharacterIdFromFieldName('characters')).toBeNull();
  });

  it('should handle character IDs with special characters', () => {
    expect(extractCharacterIdFromFieldName('characters.abc-123_def.taskLevel')).toBe('abc-123_def');
  });
});


function createFormContainer(characterId: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <select id="xpEarned"><option value="4" selected>4</option></select>
    <select id="treasureBundles"><option value="3" selected>3</option></select>
    <select name="characters.${characterId}.taskLevel"><option value="5" selected>5</option></select>
    <select name="characters.${characterId}.successLevel"><option value="success" selected>success</option></select>
    <select name="characters.${characterId}.proficiencyRank"><option value="trained" selected>trained</option></select>
  `;
  return container;
}

describe('extractEarnedIncomeParams', () => {
  it('should extract all earned income parameters from the form', () => {
    const container = createFormContainer('char1');
    const params = extractEarnedIncomeParams('char1', container);

    expect(params.characterId).toBe('char1');
    expect(params.taskLevel).toBe(5);
    expect(params.successLevel).toBe('success');
    expect(params.proficiencyRank).toBe('trained');
    expect(params.downtimeDays).toBe(8); // 4 * 2
  });

  it('should handle dash task level value', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <select id="xpEarned"><option value="4" selected>4</option></select>
      <select id="treasureBundles"><option value="0" selected>0</option></select>
      <select name="characters.char1.taskLevel"><option value="-" selected>-</option></select>
      <select name="characters.char1.successLevel"><option value="success" selected>success</option></select>
      <select name="characters.char1.proficiencyRank"><option value="trained" selected>trained</option></select>
    `;
    const params = extractEarnedIncomeParams('char1', container);

    expect(params.taskLevel).toBe('-');
  });

  it('should use defaults when form elements are missing', () => {
    const container = document.createElement('div');
    const params = extractEarnedIncomeParams('char1', container);

    expect(params.characterId).toBe('char1');
    expect(params.taskLevel).toBe(0);
    expect(params.successLevel).toBe('success');
    expect(params.proficiencyRank).toBe('trained');
  });
});

describe('createEarnedIncomeChangeHandler', () => {
  it('should create a handler that extracts params and updates display', () => {
    const { updateEarnedIncomeDisplay } = require('../../scripts/handlers/party-chronicle-handlers');
    const container = createFormContainer('char1');
    const handler = createEarnedIncomeChangeHandler(container);

    const select = document.createElement('select');
    select.name = 'characters.char1.taskLevel';
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: select });

    handler(event);

    expect(updateEarnedIncomeDisplay).toHaveBeenCalled();
  });

  it('should not update display when character ID cannot be extracted', () => {
    const { updateEarnedIncomeDisplay } = require('../../scripts/handlers/party-chronicle-handlers');
    updateEarnedIncomeDisplay.mockClear();

    const container = createFormContainer('char1');
    const handler = createEarnedIncomeChangeHandler(container);

    const select = document.createElement('select');
    select.name = 'shared.xpEarned';
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: select });

    handler(event);

    expect(updateEarnedIncomeDisplay).not.toHaveBeenCalled();
  });
});
