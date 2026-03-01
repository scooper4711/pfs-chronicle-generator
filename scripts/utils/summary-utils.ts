/**
 * Summary text generation utilities for collapsible sections
 * 
 * This module provides functions to generate summary text for collapsible sections
 * in the party chronicle form. Summary text is displayed in collapsed section headers
 * to provide a quick overview of the values within each section.
 * 
 * Requirements: collapsible-shared-sections 1.5, 1.6, 1.7, 2.5, 2.6, 2.7, 2.8, 2.9, 3.5, 3.6
 */

/**
 * Maximum length for summary text before truncation
 */
const MAX_SUMMARY_LENGTH = 60;

/**
 * Truncates text with ellipsis if it exceeds the maximum length
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
function truncateText(text: string, maxLength: number = MAX_SUMMARY_LENGTH): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generates summary text for Event Details section
 * 
 * Format: "Event Details - {scenario name from layout dropdown}"
 * Empty scenario: "Event Details (No scenario)"
 * Truncates with ellipsis if too long
 * 
 * Note: This uses the layout/scenario name (e.g., "5-05 The Island of..."),
 * not the event name field (e.g., "GenCon", "Bradenton PFS").
 * 
 * @param container - HTMLElement wrapping the form container
 * @returns Formatted summary text
 * 
 * Requirements: collapsible-shared-sections 1.5, 1.6, 1.7
 */
export function generateEventDetailsSummary(container: HTMLElement): string {
  const layoutSelect = container.querySelector('#layout') as HTMLSelectElement;
  const selectedOption = layoutSelect?.options[layoutSelect.selectedIndex];
  const layoutName = selectedOption?.text?.trim() || '';
  
  if (!layoutName) {
    return 'Event Details (No scenario)';
  }
  
  const summary = `Event Details - ${layoutName}`;
  return truncateText(summary);
}

/**
 * Generates summary text for Reputation section
 * 
 * Format: "Reputation - +{chosen} ; EA: +{ea} ; GA: +{ga}"
 * Only includes non-zero faction values
 * Semicolons separate multiple values
 * If all factions zero: "Reputation - +{chosen}"
 * Truncates with ellipsis if too long
 * 
 * @param container - HTMLElement wrapping the form container
 * @returns Formatted summary text
 * 
 * Requirements: collapsible-shared-sections 2.5, 2.6, 2.7, 2.8, 2.9
 */
export function generateReputationSummary(container: HTMLElement): string {
  const chosenInput = container.querySelector('#chosenFactionReputation') as HTMLInputElement;
  const chosenValue = parseInt(chosenInput?.value) || 2;
  
  const parts: string[] = [`Reputation - +${chosenValue}`];
  
  // Faction codes to check
  const factions = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'];
  
  for (const faction of factions) {
    const factionInput = container.querySelector(`#reputation-${faction}`) as HTMLInputElement;
    const factionValue = parseInt(factionInput?.value) || 0;
    
    if (factionValue !== 0) {
      parts.push(`${faction}: +${factionValue}`);
    }
  }
  
  const summary = parts.join(' ; ');
  return truncateText(summary);
}

/**
 * Generates summary text for Shared Rewards section
 * 
 * Format: "Shared Rewards - {xp} XP; {tb} TB"
 * Example: "Shared Rewards - 4 XP; 3 TB"
 * Truncates with ellipsis if too long
 * 
 * @param container - HTMLElement wrapping the form container
 * @returns Formatted summary text
 * 
 * Requirements: collapsible-shared-sections 3.5, 3.6
 */
export function generateSharedRewardsSummary(container: HTMLElement): string {
  const xpInput = container.querySelector('#xpEarned') as HTMLInputElement;
  const tbInput = container.querySelector('#treasureBundles') as HTMLInputElement;
  
  const xpValue = parseInt(xpInput?.value) || 0;
  const tbValue = parseInt(tbInput?.value) || 0;
  
  const summary = `Shared Rewards - ${xpValue} XP; ${tbValue} TB`;
  return truncateText(summary);
}
