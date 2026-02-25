/**
 * Storage functions for party chronicle data persistence
 * 
 * This module provides functions to save, load, and clear party chronicle data
 * using Foundry VTT's game.settings API for world-level storage.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { PartyChronicleData } from './party-chronicle-types.js';

/**
 * Storage structure for party chronicle data with timestamp
 */
interface PartyChronicleStorage {
  /** Timestamp of last modification */
  timestamp: number;
  
  /** The actual party chronicle data */
  data: PartyChronicleData;
}

/**
 * Setting key for party chronicle data storage
 */
const STORAGE_KEY = 'partyChronicleData';
const MODULE_ID = 'pfs-chronicle-generator';

/**
 * Saves party chronicle data to world-level storage with timestamp
 * 
 * This function stores the provided data with a timestamp to track when
 * it was last modified. The data persists across sessions and can be
 * retrieved later using loadPartyChronicleData().
 * 
 * @param data - The party chronicle data to save
 * @throws Error if the save operation fails
 * 
 * @example
 * ```typescript
 * const data: PartyChronicleData = {
 *   shared: { gmPfsNumber: '12345', ... },
 *   characters: { 'actor-id': { characterName: 'Hero', ... } }
 * };
 * await savePartyChronicleData(data);
 * ```
 * 
 * Validates: Requirement 8.1 - Save Chronicle_Data as GM enters it
 */
export async function savePartyChronicleData(data: PartyChronicleData): Promise<void> {
  try {
    const storage: PartyChronicleStorage = {
      timestamp: Date.now(),
      data: data
    };
    
    await game.settings.set(MODULE_ID, STORAGE_KEY, storage);
    console.log('[PFS Chronicle] Party chronicle data saved successfully', storage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PFS Chronicle] Failed to save party chronicle data:', error);
    throw new Error(`Failed to save party chronicle data: ${errorMessage}`);
  }
}

/**
 * Loads previously saved party chronicle data from world-level storage
 * 
 * This function retrieves party chronicle data that was previously saved
 * using savePartyChronicleData(). Returns null if no data has been saved.
 * 
 * @returns The saved party chronicle data, or null if none exists
 * @throws Error if the load operation fails
 * 
 * @example
 * ```typescript
 * const savedData = await loadPartyChronicleData();
 * if (savedData) {
 *   console.log('Last modified:', new Date(savedData.timestamp));
 *   console.log('Data:', savedData.data);
 * }
 * ```
 * 
 * Validates: Requirement 8.2 - Restore previously entered Chronicle_Data
 */
export async function loadPartyChronicleData(): Promise<PartyChronicleStorage | null> {
  try {
    const storage = await game.settings.get(MODULE_ID, STORAGE_KEY) as PartyChronicleStorage | undefined;
    
    if (!storage) {
      console.log('[PFS Chronicle] No saved party chronicle data found');
      return null;
    }
    
    console.log('[PFS Chronicle] Party chronicle data loaded successfully', storage);
    return storage;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PFS Chronicle] Failed to load party chronicle data:', error);
    throw new Error(`Failed to load party chronicle data: ${errorMessage}`);
  }
}

/**
 * Clears saved party chronicle data from world-level storage
 * 
 * This function removes all saved party chronicle data. It should be called
 * after chronicles are successfully generated to clean up the temporary data.
 * 
 * @throws Error if the clear operation fails
 * 
 * @example
 * ```typescript
 * // After successful chronicle generation
 * await clearPartyChronicleData();
 * console.log('Saved data cleared');
 * ```
 * 
 * Validates: Requirement 8.3 - Clear saved Chronicle_Data after successful generation
 */
export async function clearPartyChronicleData(): Promise<void> {
  try {
    await game.settings.set(MODULE_ID, STORAGE_KEY, undefined);
    console.log('[PFS Chronicle] Party chronicle data cleared successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PFS Chronicle] Failed to clear party chronicle data:', error);
    throw new Error(`Failed to clear party chronicle data: ${errorMessage}`);
  }
}
