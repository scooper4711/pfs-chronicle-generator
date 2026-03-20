import { ContentElement, Preset } from '../model/layout';
import { debug } from './logger.js';

/**
 * A resolved element combines preset properties with the element's own properties.
 * This type represents an element after all preset inheritance has been applied.
 */
export type ResolvedElement = Partial<Preset> & ContentElement;

/**
 * Resolves preset inheritance for a content element.
 * Presets can inherit from other presets, creating a chain of property inheritance.
 * Properties are merged in order: parent presets → child presets → element properties.
 * Element properties always take precedence over preset properties.
 * 
 * @param element - The content element to resolve presets for
 * @param layoutPresets - The presets configuration from the layout
 * @returns A resolved element with all preset properties merged
 */
export function resolvePresets(element: ContentElement, layoutPresets: Record<string, Preset> | undefined): ResolvedElement {
    let resolved: Partial<Preset & ContentElement> = {};
    if (element.presets && layoutPresets) {
        for (const presetName of element.presets) {
            const preset = layoutPresets[presetName];
            if (preset) {
                const parentPresets = resolvePresets({ presets: preset.presets } as ContentElement, layoutPresets);
                resolved = { ...resolved, ...parentPresets, ...preset };
            }
        }
    }
    return { ...resolved, ...element };
}

/**
 * Extracts a part of a society ID string (format: "playerNumber-characterNumber").
 *
 * @param data - The data object containing the societyid field
 * @param extractor - Function to extract the desired part from the split parts
 * @returns The extracted part, or empty string if the society ID is missing or malformed
 */
function extractSocietyIdPart(data: any, extractor: (parts: string[]) => string): string {
    const societyid = data['societyid'];
    if (societyid && typeof societyid === 'string') {
        const parts = societyid.split('-');
        if (parts.length === 2) {
            return extractor(parts);
        }
    }
    return '';
}

/** Maps special society ID parameter names to their extraction logic. */
const SOCIETY_ID_EXTRACTORS: Record<string, (parts: string[]) => string> = {
    'societyid.player': (parts) => parts[0],
    'societyid.char_without_first_digit': (parts) => parts[1].substring(1),
};

/**
 * Joins an array value based on the element type.
 * Multiline elements use newlines; other elements use triple pipe delimiter.
 */
function joinArrayValue(paramValue: unknown[], elementType?: string): string {
    return elementType === 'multiline'
        ? paramValue.join('\n')
        : paramValue.join('|||');
}

/**
 * Resolves a value that may be a parameter reference or a literal string.
 * Parameter references start with 'param:' and are resolved from the data object.
 * Supports special parameter transformations:
 * - 'param:societyid.player' - Extracts the player ID from a society ID (before the dash)
 * - 'param:societyid.char_without_first_digit' - Extracts character ID without first digit (after dash, skip first char)
 *
 * Array values are joined differently based on element type:
 * - 'multiline' elements: joined with newlines (\n)
 * - Other elements (e.g., 'choice'): joined with triple pipe delimiter (|||)
 *
 * @param value - The value to resolve (may be a literal or 'param:' reference)
 * @param data - The data object containing parameter values
 * @param elementType - The type of element requesting the value (affects array joining)
 * @returns The resolved value, or undefined if the value cannot be resolved
 */
export function resolveValue(value: string | undefined, data: any, elementType?: string): string | undefined {
    if (!value) {
        return undefined;
    }
    if (!value.startsWith('param:')) {
        return value;
    }

    const paramName = value.substring(6);
    debug('Resolving param:', {
        paramName,
        value: data[paramName],
        isArray: Array.isArray(data[paramName]),
        elementType
    });

    const societyExtractor = SOCIETY_ID_EXTRACTORS[paramName];
    if (societyExtractor) {
        return extractSocietyIdPart(data, societyExtractor);
    }

    const paramValue = data[paramName];
    if (Array.isArray(paramValue)) {
        return joinArrayValue(paramValue, elementType);
    }
    return paramValue;
}

/**
 * Recursively collects all content elements from a content structure.
 * Content can be either an array of elements or an object mapping keys to element arrays.
 * This function flattens the structure and returns all elements that have a value or type.
 * 
 * @param elements - The content structure to collect elements from (array or object)
 * @returns A flat array of all content elements found in the structure
 */
export function getAllContentElements(elements: ContentElement[] | Record<string, ContentElement[]>): ContentElement[] {
    let allElements: ContentElement[] = [];
    if (Array.isArray(elements)) {
        for (const element of elements) {
            if (element.value || element.type) {
                allElements.push(element);
            }
            if (element.content) {
                allElements = allElements.concat(getAllContentElements(element.content));
            }
        }
    } else if (typeof elements === 'object') {
        for (const key in elements) {
            allElements = allElements.concat(getAllContentElements(elements[key]));
        }
    }
    return allElements;
}

/**
 * Finds a specific content element by its value (name) in a content structure.
 * Searches recursively through nested content structures.
 * 
 * @param elements - The content structure to search in (array or object)
 * @param name - The value (name) of the element to find
 * @returns The found content element, or undefined if not found
 */
export function findContentElement(elements: ContentElement[] | Record<string, ContentElement[]>, name: string): ContentElement | undefined {
    const arrays = Array.isArray(elements)
        ? [elements]
        : Object.values(elements);

    for (const array of arrays) {
        for (const element of array) {
            if (element.value === name) {
                return element;
            }
            if (element.content) {
                const found = findContentElement(element.content, name);
                if (found) return found;
            }
        }
    }
    return undefined;
}
