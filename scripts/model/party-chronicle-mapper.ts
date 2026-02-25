/**
 * Data mapping functions for Party Chronicle Filling feature
 * 
 * This module provides functions to map party chronicle data structures
 * to the format expected by PdfGenerator for individual chronicle generation.
 * 
 * Requirements: 4.3, 5.2
 */

import { SharedFields, UniqueFields } from './party-chronicle-types.js';

/**
 * Chronicle data format expected by PdfGenerator
 * This matches the format used in PFSChronicleGeneratorApp
 */
export interface ChronicleData {
  // Character identification
  char: string;
  societyid: string;
  level: number;
  
  // Event details
  gmid: string;
  event: string;
  eventcode: string;
  date: string;
  
  // Rewards
  xp_gained: number;
  income_earned: number;
  gp_gained: number;
  gp_spent: number;
  
  // Notes and reputation
  notes: string;
  reputation: string;
  
  // Layout-dependent selections
  summary_checkbox: string[];
  strikeout_item_lines: string[];
  
  // Treasure bundles
  treasure_bundles: string;
}

/**
 * Maps party chronicle data (shared + unique fields) to the ChronicleData format
 * expected by PdfGenerator for a single character.
 * 
 * This function combines shared fields that apply to all party members with
 * character-specific unique fields to create a complete chronicle data object
 * for PDF generation.
 * 
 * @param shared - Shared fields that apply to all party members
 * @param unique - Character-specific unique fields
 * @returns ChronicleData object ready for PdfGenerator
 * 
 * @example
 * ```typescript
 * const shared: SharedFields = {
 *   gmPfsNumber: '12345',
 *   scenarioName: 'The Blackwood Lost',
 *   eventCode: 'PFS-001',
 *   eventDate: '2024-01-15',
 *   xpEarned: 4,
 *   adventureSummaryCheckboxes: ['Found the artifact'],
 *   strikeoutItems: ['Potion of Healing'],
 *   treasureBundles: 'Bundle A, Bundle B',
 *   layoutId: 'layout-1',
 *   seasonId: 'season-5',
 *   blankChroniclePath: '/path/to/chronicle.pdf'
 * };
 * 
 * const unique: UniqueFields = {
 *   characterName: 'Valeros',
 *   societyId: '12345-01',
 *   level: 3,
 *   incomeEarned: 8,
 *   goldEarned: 24,
 *   goldSpent: 10,
 *   notes: 'Saved the village',
 *   reputation: 'Envoy\'s Alliance: +2'
 * };
 * 
 * const chronicleData = mapToCharacterData(shared, unique);
 * // chronicleData is now ready to pass to PdfGenerator
 * ```
 * 
 * Validates: Requirements 4.3, 5.2
 */
export function mapToCharacterData(
  shared: SharedFields,
  unique: UniqueFields
): ChronicleData {
  return {
    // Character identification from unique fields
    char: unique.characterName,
    societyid: unique.societyId,
    level: unique.level,
    
    // Event details from shared fields
    gmid: shared.gmPfsNumber,
    event: shared.scenarioName,
    eventcode: shared.eventCode,
    date: shared.eventDate,
    
    // XP from shared fields
    xp_gained: shared.xpEarned,
    
    // Character-specific rewards from unique fields
    income_earned: unique.incomeEarned,
    gp_gained: unique.goldEarned,
    gp_spent: unique.goldSpent,
    
    // Character-specific notes from unique fields
    notes: unique.notes,
    reputation: unique.reputation,
    
    // Layout-dependent selections from shared fields
    summary_checkbox: shared.adventureSummaryCheckboxes,
    strikeout_item_lines: shared.strikeoutItems,
    
    // Treasure bundles from shared fields (convert number to string)
    treasure_bundles: shared.treasureBundles.toString(),
  };
}
