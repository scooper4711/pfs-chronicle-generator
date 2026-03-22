/**
 * Unit tests for layout-utils module
 *
 * Tests checkbox and strikeout choice extraction from layout definitions.
 */

import { findCheckboxChoices, findStrikeoutChoices } from '../../scripts/utils/layout-utils';
import { Layout } from '../../scripts/model/layout';

// Mock dependencies that are not needed for pure function tests
jest.mock('../../scripts/LayoutStore', () => ({
  layoutStore: {
    getLayout: jest.fn(),
  },
}));

jest.mock('../../scripts/model/party-chronicle-storage', () => ({
  loadPartyChronicleData: jest.fn(),
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
