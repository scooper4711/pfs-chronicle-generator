/**
 * Unit tests for pdf-element-utils module
 *
 * Tests preset resolution, value resolution, and content element traversal.
 */

import {
  resolvePresets,
  resolveValue,
  getAllContentElements,
  findContentElement,
  ResolvedElement,
} from './pdf-element-utils';
import { ContentElement, Preset } from '../model/layout';

jest.mock('./logger.js', () => ({
  debug: jest.fn(),
}));

describe('resolvePresets', () => {
  it('should return element properties when no presets are defined', () => {
    const element: ContentElement = { type: 'text', value: 'hello', x: 10, y: 20 };
    const result = resolvePresets(element, undefined);

    expect(result.type).toBe('text');
    expect(result.value).toBe('hello');
    expect(result.x).toBe(10);
  });

  it('should merge preset properties into the element', () => {
    const element: ContentElement = { type: 'text', presets: ['base'], x: 10, y: 20 };
    const presets: Record<string, Preset> = {
      base: { font: 'helvetica', fontsize: 12 },
    };

    const result = resolvePresets(element, presets);

    expect(result.font).toBe('helvetica');
    expect(result.fontsize).toBe(12);
    expect(result.x).toBe(10);
  });

  it('should let element properties override preset properties', () => {
    const element: ContentElement = { type: 'text', presets: ['base'], x: 10, y: 20, color: 'red' };
    const presets: Record<string, Preset> = {
      base: { color: 'blue', fontsize: 12 },
    };

    const result = resolvePresets(element, presets);

    expect(result.color).toBe('red');
    expect(result.fontsize).toBe(12);
  });

  it('should merge multiple presets in order', () => {
    const element: ContentElement = { type: 'text', presets: ['base', 'override'] };
    const presets: Record<string, Preset> = {
      base: { font: 'helvetica', fontsize: 10 },
      override: { fontsize: 16, color: 'red' },
    };

    const result = resolvePresets(element, presets);

    expect(result.font).toBe('helvetica');
    expect(result.fontsize).toBe(16);
    expect(result.color).toBe('red');
  });

  it('should resolve nested preset inheritance', () => {
    const element: ContentElement = { type: 'text', presets: ['child'] };
    const presets: Record<string, Preset> = {
      parent: { font: 'courier', fontsize: 8 },
      child: { presets: ['parent'], fontsize: 14 },
    };

    const result = resolvePresets(element, presets);

    expect(result.font).toBe('courier');
    expect(result.fontsize).toBe(14);
  });

  it('should skip unknown preset names gracefully', () => {
    const element: ContentElement = { type: 'text', presets: ['nonexistent'] };
    const presets: Record<string, Preset> = {};

    const result = resolvePresets(element, presets);

    expect(result.type).toBe('text');
  });

  it('should handle empty presets array', () => {
    const element: ContentElement = { type: 'text', presets: [] };
    const presets: Record<string, Preset> = { base: { fontsize: 12 } };

    const result = resolvePresets(element, presets);

    expect(result.type).toBe('text');
    expect(result.fontsize).toBeUndefined();
  });
});

describe('resolveValue', () => {
  it('should return undefined for undefined value', () => {
    expect(resolveValue(undefined, {})).toBeUndefined();
  });

  it('should return literal strings as-is', () => {
    expect(resolveValue('Hello World', {})).toBe('Hello World');
  });

  it('should resolve param: references from data', () => {
    const data = { characterName: 'Valeros' };
    expect(resolveValue('param:characterName', data)).toBe('Valeros');
  });

  it('should return undefined for missing param references', () => {
    expect(resolveValue('param:missing', {})).toBeUndefined();
  });

  it('should join array values with ||| for non-multiline elements', () => {
    const data = { items: ['sword', 'shield', 'potion'] };
    expect(resolveValue('param:items', data, 'choice')).toBe('sword|||shield|||potion');
  });

  it('should join array values with newlines for multiline elements', () => {
    const data = { notes: ['line1', 'line2', 'line3'] };
    expect(resolveValue('param:notes', data, 'multiline')).toBe('line1\nline2\nline3');
  });

  it('should extract player ID from societyid.player', () => {
    const data = { societyid: '12345-2001' };
    expect(resolveValue('param:societyid.player', data)).toBe('12345');
  });

  it('should extract character ID without first digit from societyid.char_without_first_digit', () => {
    const data = { societyid: '12345-2001' };
    expect(resolveValue('param:societyid.char_without_first_digit', data)).toBe('001');
  });

  it('should return empty string for malformed societyid (no dash)', () => {
    const data = { societyid: '12345' };
    expect(resolveValue('param:societyid.player', data)).toBe('');
  });

  it('should return empty string for missing societyid', () => {
    const data = {};
    expect(resolveValue('param:societyid.player', data)).toBe('');
  });

  it('should return empty string for non-string societyid', () => {
    const data = { societyid: 12345 };
    expect(resolveValue('param:societyid.player', data)).toBe('');
  });
});

describe('getAllContentElements', () => {
  it('should return elements from a flat array', () => {
    const elements: ContentElement[] = [
      { type: 'text', value: 'a' },
      { type: 'line', value: 'b' },
    ];

    const result = getAllContentElements(elements);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('a');
    expect(result[1].value).toBe('b');
  });

  it('should recursively collect nested content elements', () => {
    const elements: ContentElement[] = [
      {
        type: 'trigger',
        value: 'parent',
        content: [
          { type: 'text', value: 'child1' },
          { type: 'text', value: 'child2' },
        ],
      },
    ];

    const result = getAllContentElements(elements);

    expect(result).toHaveLength(3);
  });

  it('should collect elements from object-keyed content', () => {
    const elements: Record<string, ContentElement[]> = {
      groupA: [{ type: 'text', value: 'a1' }],
      groupB: [{ type: 'text', value: 'b1' }, { type: 'line', value: 'b2' }],
    };

    const result = getAllContentElements(elements);

    expect(result).toHaveLength(3);
  });

  it('should skip elements without value or type', () => {
    const elements: ContentElement[] = [
      { type: 'text', value: 'valid' },
      {} as ContentElement,
    ];

    const result = getAllContentElements(elements);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('valid');
  });

  it('should return empty array for empty input', () => {
    expect(getAllContentElements([])).toEqual([]);
    expect(getAllContentElements({})).toEqual([]);
  });
});

describe('findContentElement', () => {
  it('should find an element by value in a flat array', () => {
    const elements: ContentElement[] = [
      { type: 'text', value: 'target' },
      { type: 'line', value: 'other' },
    ];

    const result = findContentElement(elements, 'target');

    expect(result).toBeDefined();
    expect(result!.value).toBe('target');
  });

  it('should find an element in nested content', () => {
    const elements: ContentElement[] = [
      {
        type: 'trigger',
        value: 'parent',
        content: [{ type: 'text', value: 'nested-target' }],
      },
    ];

    const result = findContentElement(elements, 'nested-target');

    expect(result).toBeDefined();
    expect(result!.value).toBe('nested-target');
  });

  it('should find an element in object-keyed content', () => {
    const elements: Record<string, ContentElement[]> = {
      group: [{ type: 'text', value: 'in-group' }],
    };

    const result = findContentElement(elements, 'in-group');

    expect(result).toBeDefined();
    expect(result!.value).toBe('in-group');
  });

  it('should return undefined when element is not found', () => {
    const elements: ContentElement[] = [{ type: 'text', value: 'exists' }];

    expect(findContentElement(elements, 'missing')).toBeUndefined();
  });

  it('should return undefined for empty input', () => {
    expect(findContentElement([], 'anything')).toBeUndefined();
  });

  it('should find deeply nested elements through recursive content', () => {
    const elements: ContentElement[] = [
      {
        type: 'trigger',
        value: 'level1',
        content: [
          {
            type: 'trigger',
            value: 'level2',
            content: [{ type: 'text', value: 'deep-target' }],
          },
        ],
      },
    ];

    const result = findContentElement(elements, 'deep-target');

    expect(result).toBeDefined();
    expect(result!.value).toBe('deep-target');
  });
});
