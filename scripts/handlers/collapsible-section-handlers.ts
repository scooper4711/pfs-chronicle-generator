/**
 * Event handlers for collapsible shared sections in the party chronicle form.
 * 
 * This module provides handlers for collapsible section interactions including:
 * - Click handlers for section header interactions
 * - Keyboard handlers for Enter/Space key support
 * - Toggle logic for collapse/expand state
 * - Summary text updates when field values change
 * - Initialization of collapse states from storage
 * 
 * These handlers are called from event listeners attached in main.ts following
 * the hybrid ApplicationV2 pattern.
 * 
 * Requirements: collapsible-shared-sections 1.2, 2.2, 3.2, 4.2, 5.2, 7.1, 7.2, 7.3, 7.4, 8.2, 8.3
 */

import {
  saveCollapseState,
  loadCollapseState,
  getDefaultCollapseState
} from '../model/collapse-state-storage.js';

import {
  generateEventDetailsSummary,
  generateReputationSummary,
  generateSharedRewardsSummary
} from '../utils/summary-utils.js';

/**
 * Valid section IDs for collapsible sections
 */
const VALID_SECTION_IDS = [
  'event-details',
  'reputation',
  'shared-rewards',
  'adventure-summary',
  'items-to-strike-out'
] as const;

/**
 * Section IDs that have summary text
 */
const SECTIONS_WITH_SUMMARY = [
  'event-details',
  'reputation',
  'shared-rewards'
] as const;

/**
 * Handles click events on collapsible section headers.
 * 
 * Toggles the collapse state of the section when the header is clicked.
 * 
 * @param event - The mouse click event
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: collapsible-shared-sections 1.2, 2.2, 3.2, 4.2, 5.2
 */
export function handleSectionHeaderClick(
  event: MouseEvent,
  container: HTMLElement
): void {
  const header = (event.currentTarget as HTMLElement);
  const section = header.closest('.collapsible-section') as HTMLElement;
  
  if (!section) {
    console.warn('Section header click: could not find parent section element');
    return;
  }
  
  const sectionId = section.getAttribute('data-section-id');
  if (!sectionId) {
    console.warn('Section header click: section missing data-section-id attribute');
    return;
  }
  
  toggleSectionCollapse(sectionId, container);
}

/**
 * Handles keyboard events on collapsible section headers.
 * 
 * Toggles the collapse state when Enter or Space key is pressed.
 * 
 * @param event - The keyboard event
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: collapsible-shared-sections 8.2, 8.3
 */
export function handleSectionHeaderKeydown(
  event: KeyboardEvent,
  container: HTMLElement
): void {
  // Only handle Enter and Space keys
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }
  
  // Prevent default space key scrolling
  if (event.key === ' ') {
    event.preventDefault();
  }
  
  const header = (event.currentTarget as HTMLElement);
  const section = header.closest('.collapsible-section') as HTMLElement;
  
  if (!section) {
    console.warn('Section header keydown: could not find parent section element');
    return;
  }
  
  const sectionId = section.getAttribute('data-section-id');
  if (!sectionId) {
    console.warn('Section header keydown: section missing data-section-id attribute');
    return;
  }
  
  toggleSectionCollapse(sectionId, container);
}

/**
 * Toggles the collapse state of a section.
 * 
 * Updates the DOM to add/remove 'collapsed' class, updates chevron indicator,
 * updates ARIA attributes, and saves the new state to localStorage.
 * 
 * @param sectionId - The unique identifier for the section
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: collapsible-shared-sections 1.2, 2.2, 3.2, 4.2, 5.2
 */
export function toggleSectionCollapse(
  sectionId: string,
  container: HTMLElement
): void {
  // Validate section ID
  if (!VALID_SECTION_IDS.includes(sectionId as any)) {
    console.warn(`Invalid section ID: "${sectionId}"`);
    return;
  }
  
  // Find section element
  const section = container.querySelector(
    `.collapsible-section[data-section-id="${sectionId}"]`
  ) as HTMLElement;
  
  if (!section) {
    console.warn(`Could not find section element for ID: "${sectionId}"`);
    return;
  }
  
  // Find header element
  const header = section.querySelector('.collapsible-header') as HTMLElement;
  
  if (!header) {
    console.warn(`Could not find header element for section: "${sectionId}"`);
    return;
  }
  
  // Toggle collapsed class
  const isCurrentlyCollapsed = section.classList.contains('collapsed');
  const newCollapsedState = !isCurrentlyCollapsed;
  
  if (newCollapsedState) {
    section.classList.add('collapsed');
  } else {
    section.classList.remove('collapsed');
  }
  
  // Update ARIA expanded attribute
  header.setAttribute('aria-expanded', newCollapsedState ? 'false' : 'true');
  
  // Save state to localStorage
  saveCollapseState(sectionId, newCollapsedState);
}

/**
 * Updates the summary text for a specific section.
 * 
 * Generates new summary text based on current field values and updates the
 * summary text element in the section header. Only updates sections that have
 * summary text (Event Details, Reputation, Shared Rewards).
 * 
 * @param sectionId - The unique identifier for the section
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: collapsible-shared-sections 7.1, 7.2, 7.3, 7.4
 */
export function updateSectionSummary(
  sectionId: string,
  container: HTMLElement
): void {
  // Only update sections that have summary text
  if (!SECTIONS_WITH_SUMMARY.includes(sectionId as any)) {
    return;
  }
  
  // Find section element
  const section = container.querySelector(
    `.collapsible-section[data-section-id="${sectionId}"]`
  ) as HTMLElement;
  
  if (!section) {
    console.warn(`Could not find section element for ID: "${sectionId}"`);
    return;
  }
  
  // Find summary text element
  const summaryElement = section.querySelector('.section-summary') as HTMLElement;
  
  if (!summaryElement) {
    console.warn(`Could not find summary element for section: "${sectionId}"`);
    return;
  }
  
  // Generate summary text based on section type
  let summaryText = '';
  
  try {
    switch (sectionId) {
      case 'event-details':
        summaryText = generateEventDetailsSummary(container);
        break;
      case 'reputation':
        summaryText = generateReputationSummary(container);
        break;
      case 'shared-rewards':
        summaryText = generateSharedRewardsSummary(container);
        break;
      default:
        console.warn(`No summary generator for section: "${sectionId}"`);
        return;
    }
  } catch (error) {
    console.warn(`Failed to generate summary for section "${sectionId}":`, error);
    return;
  }
  
  // Update summary text element
  summaryElement.textContent = summaryText;
}

/**
 * Updates all section summaries.
 * 
 * Iterates through all sections with summary text and updates their summary
 * text based on current field values.
 * 
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: collapsible-shared-sections 7.4
 */
export function updateAllSectionSummaries(container: HTMLElement): void {
  for (const sectionId of SECTIONS_WITH_SUMMARY) {
    updateSectionSummary(sectionId, container);
  }
}

/**
 * Initializes collapse states from storage when form is rendered.
 * 
 * Loads saved collapse states from localStorage and applies them to all sections.
 * If no saved state exists for a section, uses the default collapse state.
 * Also initializes summary text for all sections with summaries.
 * 
 * @param container - HTMLElement wrapping the form container
 * 
 * Requirements: collapsible-shared-sections 1.9, 2.11, 3.9, 4.6, 5.6
 */
export function initializeCollapseSections(container: HTMLElement): void {
  // Initialize collapse state for each section
  for (const sectionId of VALID_SECTION_IDS) {
    // Find section element
    const section = container.querySelector(
      `.collapsible-section[data-section-id="${sectionId}"]`
    ) as HTMLElement;
    
    if (!section) {
      console.warn(`Could not find section element for ID: "${sectionId}"`);
      continue;
    }
    
    // Find header element
    const header = section.querySelector('.collapsible-header') as HTMLElement;
    
    if (!header) {
      console.warn(`Missing header for section: "${sectionId}"`);
      continue;
    }
    
    // Load collapse state from storage or use default
    const savedState = loadCollapseState(sectionId);
    const isCollapsed = savedState !== null ? savedState : getDefaultCollapseState(sectionId);
    
    // Apply collapse state to DOM
    if (isCollapsed) {
      section.classList.add('collapsed');
      header.setAttribute('aria-expanded', 'false');
    } else {
      section.classList.remove('collapsed');
      header.setAttribute('aria-expanded', 'true');
    }
  }
  
  // Initialize summary text for sections with summaries
  updateAllSectionSummaries(container);
}

