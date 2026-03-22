/**
 * Unit tests for dom-selectors constants
 *
 * Tests the dynamic selector functions in CHARACTER_FIELD_SELECTORS.
 */

import {
  SHARED_FIELD_SELECTORS,
  CHARACTER_FIELD_SELECTORS,
  CHARACTER_FIELD_PATTERNS,
  BUTTON_SELECTORS,
  REPUTATION_SELECTORS,
  GENERAL_SELECTORS,
  CSS_CLASSES,
} from './dom-selectors';

describe('CHARACTER_FIELD_SELECTORS', () => {
  const characterId = 'abc123';

  it('should generate correct LEVEL selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.LEVEL(characterId))
      .toBe('input[name="characters.abc123.level"]');
  });

  it('should generate correct TASK_LEVEL selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.TASK_LEVEL(characterId))
      .toBe('select[name="characters.abc123.taskLevel"]');
  });

  it('should generate correct SUCCESS_LEVEL selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.SUCCESS_LEVEL(characterId))
      .toBe('select[name="characters.abc123.successLevel"]');
  });

  it('should generate correct PROFICIENCY_RANK selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.PROFICIENCY_RANK(characterId))
      .toBe('select[name="characters.abc123.proficiencyRank"]');
  });

  it('should generate correct EARNED_INCOME_DISPLAY selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.EARNED_INCOME_DISPLAY(characterId))
      .toBe('#earnedIncomeDisplay-abc123');
  });

  it('should generate correct TREASURE_BUNDLE_DISPLAY selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.TREASURE_BUNDLE_DISPLAY(characterId))
      .toBe('#treasureBundleGpDisplay-abc123');
  });

  it('should generate correct CONSUME_REPLAY selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.CONSUME_REPLAY(characterId))
      .toBe('input[name="characters.abc123.consumeReplay"]');
  });

  it('should generate correct FACTION_DISPLAY selector', () => {
    expect(CHARACTER_FIELD_SELECTORS.FACTION_DISPLAY(characterId))
      .toBe('#factionDisplay-abc123');
  });
});

describe('static selector constants', () => {
  it('should have expected SHARED_FIELD_SELECTORS', () => {
    expect(SHARED_FIELD_SELECTORS.GM_PFS_NUMBER).toBe('#gmPfsNumber');
    expect(SHARED_FIELD_SELECTORS.SCENARIO_NAME).toBe('#scenarioName');
    expect(SHARED_FIELD_SELECTORS.SEASON).toBe('#season');
    expect(SHARED_FIELD_SELECTORS.LAYOUT).toBe('#layout');
  });

  it('should have expected CHARACTER_FIELD_PATTERNS', () => {
    expect(CHARACTER_FIELD_PATTERNS.LEVEL_ALL).toBe('input[name$=".level"]');
    expect(CHARACTER_FIELD_PATTERNS.TASK_LEVEL_ALL).toBe('select[name$=".taskLevel"]');
  });

  it('should have expected BUTTON_SELECTORS', () => {
    expect(BUTTON_SELECTORS.SAVE_DATA).toBe('#saveData');
    expect(BUTTON_SELECTORS.GENERATE_CHRONICLES).toBe('#generateChronicles');
  });

  it('should have expected REPUTATION_SELECTORS', () => {
    expect(REPUTATION_SELECTORS.EA).toBe('#reputation-EA');
    expect(REPUTATION_SELECTORS.VS).toBe('#reputation-VS');
  });

  it('should have expected GENERAL_SELECTORS', () => {
    expect(GENERAL_SELECTORS.ALL_FORM_ELEMENTS).toBe('input, select, textarea');
  });

  it('should have expected CSS_CLASSES', () => {
    expect(CSS_CLASSES.COLLAPSED).toBe('collapsed');
    expect(CSS_CLASSES.COLLAPSIBLE_SECTION).toBe('collapsible-section');
  });
});
