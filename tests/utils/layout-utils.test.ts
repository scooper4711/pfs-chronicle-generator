/**
 * Unit tests for layout-utils module
 *
 * Tests checkbox and strikeout choice extraction from layout definitions,
 * and the updateLayoutSpecificFields DOM-updating function.
 *
 * @jest-environment jsdom
 */

import { findCheckboxChoices, findStrikeoutChoices, updateLayoutSpecificFields } from '../../scripts/utils/layout-utils';
import { Layout } from '../../scripts/model/layout';

const mockGetLayout = jest.fn();
const mockLoadPartyChronicleData = jest.fn();

jest.mock('../../scripts/LayoutStore', () => ({
  layoutStore: {
    getLayout: (...args: unknown[]) => mockGetLayout(...args),
  },
}));

jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  loadPartyChronicleData: (...args: unknown[]) => mockLoadPartyChronicleData(...args),
}));

describe('findCheckboxChoices', () => {
  it('should extract checkbox choices from layout parameters', () => {
    const layout: Layout = {
      id: 'test',
      description: 'Test',
      parameters: {
        Checkboxes: {
          summary_checkbox: {
            type: 'choice',
            description: 'Checkboxes',
            example: 'A',
            choices: ['Option A', 'Option B', 'Option C'],
          },
        },
      },
    };

    expect(findCheckboxChoices(layout)).toEqual(['Option A', 'Option B', 'Option C']);
  });

  it('should return empty array when no parameters exist', () => {
    const layout: Layout = { id: 'test', description: 'Test' };

    expect(findCheckboxChoices(layout)).toEqual([]);
  });

  it('should return empty array when Checkboxes group is missing', () => {
    const layout: Layout = {
      id: 'test',
      description: 'Test',
      parameters: { Other: {} },
    };

    expect(findCheckboxChoices(layout)).toEqual([]);
  });

  it('should return empty array when summary_checkbox has no choices', () => {
    const layout: Layout = {
      id: 'test',
      description: 'Test',
      parameters: {
        Checkboxes: {
          summary_checkbox: {
            type: 'choice',
            description: 'Checkboxes',
            example: 'A',
          },
        },
      },
    };

    expect(findCheckboxChoices(layout)).toEqual([]);
  });

  it('should return empty array for null layout', () => {
    expect(findCheckboxChoices(null as unknown as Layout)).toEqual([]);
  });
});

describe('findStrikeoutChoices', () => {
  it('should extract strikeout choices from layout parameters', () => {
    const layout: Layout = {
      id: 'test',
      description: 'Test',
      parameters: {
        Items: {
          strikeout_item_lines: {
            type: 'choice',
            description: 'Items',
            example: 'Item 1',
            choices: ['Item 1', 'Item 2'],
          },
        },
      },
    };

    expect(findStrikeoutChoices(layout)).toEqual(['Item 1', 'Item 2']);
  });

  it('should return empty array when no parameters exist', () => {
    const layout: Layout = { id: 'test', description: 'Test' };

    expect(findStrikeoutChoices(layout)).toEqual([]);
  });

  it('should return empty array when Items group is missing', () => {
    const layout: Layout = {
      id: 'test',
      description: 'Test',
      parameters: { Other: {} },
    };

    expect(findStrikeoutChoices(layout)).toEqual([]);
  });

  it('should return empty array when strikeout_item_lines has no choices', () => {
    const layout: Layout = {
      id: 'test',
      description: 'Test',
      parameters: {
        Items: {
          strikeout_item_lines: {
            type: 'choice',
            description: 'Items',
            example: 'Item 1',
          },
        },
      },
    };

    expect(findStrikeoutChoices(layout)).toEqual([]);
  });

  it('should return empty array for null layout', () => {
    expect(findStrikeoutChoices(null as unknown as Layout)).toEqual([]);
  });
});


describe('updateLayoutSpecificFields', () => {
  let container: HTMLElement;
  let onChangeCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    container.innerHTML = `
      <div id="adventure-summary-content">
        <div class="checkbox-choices"></div>
      </div>
      <div id="items-to-strike-out-content">
        <div class="strikeout-choices"></div>
      </div>
    `;
    onChangeCallback = jest.fn();
  });

  it('should return early when layoutId is empty', async () => {
    await updateLayoutSpecificFields(container, '', onChangeCallback);

    expect(mockGetLayout).not.toHaveBeenCalled();
  });

  it('should populate checkbox choices from layout and mark saved ones as checked', async () => {
    mockGetLayout.mockResolvedValue({
      id: 'test-layout',
      description: 'Test',
      parameters: {
        Checkboxes: {
          summary_checkbox: {
            type: 'choice',
            description: 'Checkboxes',
            example: 'A',
            choices: ['Rescued the hostage', 'Defeated the villain', 'Found the treasure'],
          },
        },
      },
    });
    mockLoadPartyChronicleData.mockResolvedValue({
      data: {
        shared: {
          adventureSummaryCheckboxes: ['Defeated the villain'],
          strikeoutItems: [],
        },
      },
    });

    await updateLayoutSpecificFields(container, 'test-layout', onChangeCallback);

    const checkboxContainer = container.querySelector('#adventure-summary-content .checkbox-choices')!;
    const checkboxes = checkboxContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[0].value).toBe('Rescued the hostage');
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[1].value).toBe('Defeated the villain');
    expect(checkboxes[2].checked).toBe(false);
    expect(checkboxes[2].value).toBe('Found the treasure');
  });

  it('should populate strikeout choices from layout and mark saved ones as checked', async () => {
    mockGetLayout.mockResolvedValue({
      id: 'test-layout',
      description: 'Test',
      parameters: {
        Items: {
          strikeout_item_lines: {
            type: 'choice',
            description: 'Items',
            example: 'Item 1',
            choices: ['Wand of Healing', 'Scroll of Fireball'],
          },
        },
      },
    });
    mockLoadPartyChronicleData.mockResolvedValue({
      data: {
        shared: {
          adventureSummaryCheckboxes: [],
          strikeoutItems: ['Scroll of Fireball'],
        },
      },
    });

    await updateLayoutSpecificFields(container, 'test-layout', onChangeCallback);

    const strikeoutContainer = container.querySelector('#items-to-strike-out-content .strikeout-choices')!;
    const checkboxes = strikeoutContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[0].value).toBe('Wand of Healing');
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[1].value).toBe('Scroll of Fireball');
  });

  it('should attach change listeners to newly created checkboxes', async () => {
    mockGetLayout.mockResolvedValue({
      id: 'test-layout',
      description: 'Test',
      parameters: {
        Checkboxes: {
          summary_checkbox: {
            type: 'choice',
            description: 'Checkboxes',
            example: 'A',
            choices: ['Option A'],
          },
        },
        Items: {
          strikeout_item_lines: {
            type: 'choice',
            description: 'Items',
            example: 'Item 1',
            choices: ['Item 1'],
          },
        },
      },
    });
    mockLoadPartyChronicleData.mockResolvedValue({
      data: { shared: { adventureSummaryCheckboxes: [], strikeoutItems: [] } },
    });

    await updateLayoutSpecificFields(container, 'test-layout', onChangeCallback);

    // Trigger change on the checkbox
    const checkbox = container.querySelector<HTMLInputElement>('#adventure-summary-content input')!;
    checkbox.dispatchEvent(new Event('change'));

    expect(onChangeCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle layout with no checkbox or strikeout choices', async () => {
    mockGetLayout.mockResolvedValue({
      id: 'empty-layout',
      description: 'Empty',
    });
    mockLoadPartyChronicleData.mockResolvedValue({
      data: { shared: {} },
    });

    await updateLayoutSpecificFields(container, 'empty-layout', onChangeCallback);

    const checkboxContainer = container.querySelector('#adventure-summary-content .checkbox-choices')!;
    const strikeoutContainer = container.querySelector('#items-to-strike-out-content .strikeout-choices')!;

    expect(checkboxContainer.children).toHaveLength(0);
    expect(strikeoutContainer.children).toHaveLength(0);
  });

  it('should handle null saved data gracefully', async () => {
    mockGetLayout.mockResolvedValue({
      id: 'test-layout',
      description: 'Test',
      parameters: {
        Checkboxes: {
          summary_checkbox: {
            type: 'choice',
            description: 'Checkboxes',
            example: 'A',
            choices: ['Option A'],
          },
        },
      },
    });
    mockLoadPartyChronicleData.mockResolvedValue(null);

    await updateLayoutSpecificFields(container, 'test-layout', onChangeCallback);

    const checkboxes = container.querySelectorAll<HTMLInputElement>('#adventure-summary-content input');
    expect(checkboxes).toHaveLength(1);
    expect(checkboxes[0].checked).toBe(false);
  });

  it('should handle missing checkbox and strikeout containers in DOM', async () => {
    container.innerHTML = '';
    mockGetLayout.mockResolvedValue({
      id: 'test-layout',
      description: 'Test',
      parameters: {
        Checkboxes: {
          summary_checkbox: {
            type: 'choice',
            description: 'Checkboxes',
            example: 'A',
            choices: ['Option A'],
          },
        },
        Items: {
          strikeout_item_lines: {
            type: 'choice',
            description: 'Items',
            example: 'Item 1',
            choices: ['Item 1'],
          },
        },
      },
    });
    mockLoadPartyChronicleData.mockResolvedValue({
      data: { shared: { adventureSummaryCheckboxes: [], strikeoutItems: [] } },
    });

    await expect(
      updateLayoutSpecificFields(container, 'test-layout', onChangeCallback)
    ).resolves.not.toThrow();
  });

  it('should set correct id, name, and label attributes on generated elements', async () => {
    mockGetLayout.mockResolvedValue({
      id: 'test-layout',
      description: 'Test',
      parameters: {
        Checkboxes: {
          summary_checkbox: {
            type: 'choice',
            description: 'Checkboxes',
            example: 'A',
            choices: ['First Choice', 'Second Choice'],
          },
        },
      },
    });
    mockLoadPartyChronicleData.mockResolvedValue({
      data: { shared: { adventureSummaryCheckboxes: [], strikeoutItems: [] } },
    });

    await updateLayoutSpecificFields(container, 'test-layout', onChangeCallback);

    const firstCheckbox = container.querySelector<HTMLInputElement>('#checkbox-0')!;
    expect(firstCheckbox.name).toBe('shared.adventureSummaryCheckboxes');
    expect(firstCheckbox.value).toBe('First Choice');

    const firstLabel = container.querySelector<HTMLLabelElement>('label[for="checkbox-0"]')!;
    expect(firstLabel.textContent).toBe('First Choice');

    const secondCheckbox = container.querySelector<HTMLInputElement>('#checkbox-1')!;
    expect(secondCheckbox.value).toBe('Second Choice');
  });
});
