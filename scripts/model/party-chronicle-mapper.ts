/**
 * Data mapping functions for Party Chronicle Filling feature
 * 
 * This module provides functions to map party chronicle data structures
 * to the format expected by PdfGenerator for individual chronicle generation.
 * 
 * Requirements: party-chronicle-filling 4.3, 5.2
 */

import { SharedFields, UniqueFields } from './party-chronicle-types.js';
import { calculateReputation } from './reputation-calculator.js';
import { calculateTreasureBundlesGp, calculateGpGained } from '../utils/treasure-bundle-calculator.js';

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
  treasure_bundles_gp: number;
  gp_gained: number;
  gp_spent: number;
  
  // Notes and reputation
  notes: string;
  reputation: string[];
  
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
 * @param actor - Actor object to read chosen faction from
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
 *   treasureBundles: 2,
 *   layoutId: 'layout-1',
 *   seasonId: 'season-5',
 *   blankChroniclePath: '/path/to/chronicle.pdf',
 *   chosenFactionReputation: 2,
 *   reputationValues: { EA: 2, GA: 1, HH: 0, VS: 0, RO: 0, VW: 0 }
 * };
 * 
 * const unique: UniqueFields = {
 *   characterName: 'Valeros',
 *   societyId: '12345-01',
 *   level: 3,
 *   incomeEarned: 8,
 *   goldSpent: 10,
 *   notes: 'Saved the village'
 * };
 * 
 * const actor = { system: { pfs: { currentFaction: 'EA' } } };
 * 
 * const chronicleData = mapToCharacterData(shared, unique, actor);
 * // chronicleData.treasure_bundles_gp is calculated as 2 × 3.8 = 7.6
 * // chronicleData.gp_gained is calculated as 7.6 + 8 = 15.6
 * // chronicleData.reputation is ["Envoy's Alliance: +4", "Grand Archive: +1"]
 * ```
 * 
 * Validates: Requirements party-chronicle-filling 5.1, 5.2, 5.3, 5.5, treasure-bundle-calculation 7.1, 7.2, 7.3, 7.4, 7.5, multi-line-reputation-tracking 5.1, 5.2
 */
export function mapToCharacterData(
  shared: SharedFields,
  unique: UniqueFields,
  actor: any
): ChronicleData {
  // Calculate treasure bundle gold based on character level
  const treasureBundlesGp = calculateTreasureBundlesGp(
    shared.treasureBundles,
    unique.level
  );
  
  // Calculate total gold gained
  const gpGained = calculateGpGained(treasureBundlesGp, unique.incomeEarned);
  
  // Calculate reputation using the reputation calculator
  const reputationLines = calculateReputation(shared, actor);
  
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
    
    // Character-specific rewards - calculated values
    income_earned: unique.incomeEarned,
    treasure_bundles_gp: treasureBundlesGp,
    gp_gained: gpGained,
    gp_spent: unique.goldSpent,
    
    // Character-specific notes from unique fields
    notes: unique.notes,
    reputation: reputationLines,
    
    // Layout-dependent selections from shared fields
    summary_checkbox: shared.adventureSummaryCheckboxes,
    strikeout_item_lines: shared.strikeoutItems,
    
    // Treasure bundles from shared fields (convert number to string)
    treasure_bundles: shared.treasureBundles.toString(),
  };
}
