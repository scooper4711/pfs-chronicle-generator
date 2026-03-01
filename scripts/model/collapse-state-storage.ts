/**
 * Collapse state storage module for collapsible shared sections.
 * 
 * This module manages the persistence of collapse states for sections in the
 * party chronicle form. States are stored in browser localStorage and restored
 * when the form is rendered.
 * 
 * Requirements: collapsible-shared-sections 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

/**
 * Storage structure for collapse states.
 * Maps section IDs to their collapse state (true = collapsed, false = expanded).
 */
export interface CollapseStateStorage {
  [sectionId: string]: boolean;
}

/**
 * Storage key for collapse states in localStorage.
 */
const STORAGE_KEY = 'pfs-chronicle-generator.collapseSections';

/**
 * Default collapse states for each section.
 * Event Details, Reputation, and Shared Rewards default to collapsed.
 * Adventure Summary and Items to Strike Out default to expanded.
 */
const DEFAULT_COLLAPSE_STATES: CollapseStateStorage = {
  'event-details': true,
  'reputation': true,
  'shared-rewards': true,
  'adventure-summary': false,
  'items-to-strike-out': false
};

/**
 * Saves collapse state for a section to localStorage.
 * 
 * @param sectionId - The unique identifier for the section
 * @param isCollapsed - The collapse state (true = collapsed, false = expanded)
 * 
 * Requirements: collapsible-shared-sections 6.1
 */
export function saveCollapseState(sectionId: string, isCollapsed: boolean): void {
  try {
    const allStates = loadAllCollapseStates();
    allStates[sectionId] = isCollapsed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStates));
  } catch (error) {
    console.warn(`Failed to save collapse state for section "${sectionId}":`, error);
  }
}

/**
 * Loads collapse state for a section from localStorage.
 * 
 * @param sectionId - The unique identifier for the section
 * @returns The collapse state, or null if not found in storage
 * 
 * Requirements: collapsible-shared-sections 6.2
 */
export function loadCollapseState(sectionId: string): boolean | null {
  try {
    const allStates = loadAllCollapseStates();
    return allStates[sectionId] ?? null;
  } catch (error) {
    console.warn(`Failed to load collapse state for section "${sectionId}":`, error);
    return null;
  }
}

/**
 * Gets the default collapse state for a section.
 * 
 * @param sectionId - The unique identifier for the section
 * @returns The default collapse state (true = collapsed, false = expanded)
 * 
 * Requirements: collapsible-shared-sections 6.3, 6.4, 6.5, 6.6, 6.7
 */
export function getDefaultCollapseState(sectionId: string): boolean {
  return DEFAULT_COLLAPSE_STATES[sectionId] ?? false;
}

/**
 * Loads all collapse states from localStorage.
 * 
 * If localStorage is unavailable or contains invalid data, returns an empty object.
 * Callers should use getDefaultCollapseState() for sections not found in the result.
 * 
 * @returns Object mapping section IDs to collapse states
 * 
 * Requirements: collapsible-shared-sections 6.2
 */
export function loadAllCollapseStates(): CollapseStateStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('Invalid collapse state data in localStorage, using defaults');
      return {};
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to load collapse states from localStorage:', error);
    return {};
  }
}
