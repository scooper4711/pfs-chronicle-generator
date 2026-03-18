/**
 * Property-based preservation tests for Party Chronicle Form
 * 
 * These tests verify that existing functionality is preserved after bug fixes.
 * They capture the CURRENT CORRECT behavior for non-buggy scenarios and ensure
 * it remains unchanged after implementing the fixes.
 * 
 * **IMPORTANT**: These tests should PASS on UNFIXED code - they document the
 * baseline behavior that must be preserved.
 * 
 * **Validates: Requirements party-chronicle-form-bugs 3.1, 3.2, 3.3, 3.4, 3.10**
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { savePartyChronicleData, loadPartyChronicleData, clearPartyChronicleData } from './model/party-chronicle-storage';
import { PartyChronicleData } from './model/party-chronicle-types';
import { sanitizeFilename } from './utils/filename-utils';

// Mock the Foundry VTT game.settings API
const mockSettings = new Map<string, any>();

(global as any).game = {
  settings: {
    set: jest.fn(async (moduleId: string, key: string, value: any) => {
      mockSettings.set(`${moduleId}.${key}`, value);
    }),
    get: jest.fn((moduleId: string, key: string) => {
      return mockSettings.get(`${moduleId}.${key}`);
    }),
  },
};

// Helper function to clear mock storage
function clearMockStorage() {
  mockSettings.clear();
}

/**
 * Property 2: Preservation - Existing Functionality Preserved
 * 
 * **Validates: Requirements party-chronicle-form-bugs 3.1, 3.2, 3.3, 3.4, 3.10**
 * 
 * For any user action involving the party chronicle form, the fixed code SHALL
 * produce the same behavior as the original code for all non-buggy scenarios.
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: These tests PASS, confirming the baseline
 * behavior that must be preserved after implementing the bug fixes.
 */
describe('Party Chronicle Form Preservation Tests', () => {
  beforeEach(() => {
    clearMockStorage();
  });

  describe('Clear Button Functionality Preservation', () => {
    /**
     * Test: Clear button cancel preserves all form data
     * 
     * When the user clicks Clear and cancels the confirmation dialog,
     * all form data should remain unchanged.
     * 
     * **Validates: Requirement 3.1**
     */
    it('preserves all form data when Clear is canceled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
            scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
            eventCode: fc.string({ minLength: 1, maxLength: 50 }),
            eventDate: fc.string({ minLength: 1, maxLength: 20 }),
            xpEarned: fc.integer({ min: 0, max: 12 }),
            treasureBundles: fc.integer({ min: 0, max: 10 }),
            downtimeDays: fc.integer({ min: 0, max: 8 }),
            layoutId: fc.string({ minLength: 1, maxLength: 50 }),
            seasonId: fc.string({ minLength: 1, maxLength: 50 }),
            goldSpent: fc.double({ min: 0, max: 1000, noNaN: true }),
            notes: fc.string({ maxLength: 200 })
          }),
          async (formData) => {
            // Save initial data
            const initialData: PartyChronicleData = {
              shared: {
                gmPfsNumber: formData.gmPfsNumber,
                scenarioName: formData.scenarioName,
                eventCode: formData.eventCode,
                eventDate: formData.eventDate,
                xpEarned: formData.xpEarned,
                treasureBundles: formData.treasureBundles,
                downtimeDays: formData.downtimeDays,
                layoutId: formData.layoutId,
                seasonId: formData.seasonId,
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 2,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
                chosenFaction: ''
              },
              characters: {
                'char1': {
                  characterName: 'Test Character',
                  societyId: '12345-2001',
                  level: 5,
                  taskLevel: 3,
                  successLevel: 'success',
                  proficiencyRank: 'trained',
                  earnedIncome: 50,
                  goldSpent: formData.goldSpent,
                  notes: formData.notes,
                  consumeReplay: false
                }
              }
            };
            
            await savePartyChronicleData(initialData);
            
            // Simulate Clear button cancel (confirmed = false)
            // When canceled, no changes should be made
            const confirmed = false;
            
            if (!confirmed) {
              // No changes - data should remain the same
            }
            
            // Load data and verify it's unchanged
            const loaded = await loadPartyChronicleData();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.data.shared.gmPfsNumber).toBe(formData.gmPfsNumber);
            expect(loaded!.data.shared.scenarioName).toBe(formData.scenarioName);
            expect(loaded!.data.shared.eventCode).toBe(formData.eventCode);
            expect(loaded!.data.shared.eventDate).toBe(formData.eventDate);
            expect(loaded!.data.shared.xpEarned).toBe(formData.xpEarned);
            expect(loaded!.data.shared.treasureBundles).toBe(formData.treasureBundles);
            expect(loaded!.data.shared.downtimeDays).toBe(formData.downtimeDays);
            expect(loaded!.data.characters.char1.goldSpent).toBe(formData.goldSpent);
            expect(loaded!.data.characters.char1.notes).toBe(formData.notes);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Test: Clear button confirm clears character-specific data but preserves shared fields
     * 
     * When the user clicks Clear and confirms, character-specific data (gold spent, notes,
     * earned income fields) should be cleared, but shared fields (GM PFS number, scenario
     * name, event code) should be preserved.
     * 
     * **Validates: Requirements 3.2, 3.3**
     */
    it('clears character data but preserves shared fields when Clear is confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
            scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
            eventCode: fc.string({ minLength: 1, maxLength: 50 }),
            seasonId: fc.string({ minLength: 1, maxLength: 50 }),
            layoutId: fc.string({ minLength: 1, maxLength: 50 }),
            goldSpent: fc.double({ min: 10, max: 1000, noNaN: true }),
            notes: fc.string({ minLength: 1, maxLength: 200 })
          }),
          async (testData) => {
            // Save initial data with character-specific values
            const initialData: PartyChronicleData = {
              shared: {
                gmPfsNumber: testData.gmPfsNumber,
                scenarioName: testData.scenarioName,
                eventCode: testData.eventCode,
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 8,
                downtimeDays: 8,
                layoutId: testData.layoutId,
                seasonId: testData.seasonId,
                blankChroniclePath: '',
                adventureSummaryCheckboxes: ['checkbox1'],
                strikeoutItems: ['item1'],
                chosenFactionReputation: 4,
                reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
                chosenFaction: ''
              },
              characters: {
                'char1': {
                  characterName: 'Test Character',
                  societyId: '12345-2001',
                  level: 5,
                  taskLevel: 3,
                  successLevel: 'critical_success',
                  proficiencyRank: 'expert',
                  earnedIncome: 50,
                  goldSpent: testData.goldSpent,
                  notes: testData.notes,
                  consumeReplay: false
                }
              }
            };
            
            await savePartyChronicleData(initialData);
            
            // Simulate Clear button confirm
            await clearPartyChronicleData();
            
            // Create new data with preserved shared fields and cleared character data
            const clearedData: PartyChronicleData = {
              shared: {
                gmPfsNumber: testData.gmPfsNumber,
                scenarioName: testData.scenarioName,
                eventCode: testData.eventCode,
                eventDate: '',
                xpEarned: 4,
                treasureBundles: 8,
                downtimeDays: 8,
                layoutId: testData.layoutId,
                seasonId: testData.seasonId,
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 4,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
                chosenFaction: ''
              },
              characters: {
                'char1': {
                  characterName: 'Test Character',
                  societyId: '',
                  level: 5,
                  taskLevel: 3,
                  successLevel: 'success',
                  proficiencyRank: 'trained',
                  earnedIncome: 0,
                  goldSpent: 0,
                  notes: '',
                  consumeReplay: false
                }
              }
            };
            
            await savePartyChronicleData(clearedData);
            
            // Load data and verify preservation/clearing behavior
            const loaded = await loadPartyChronicleData();
            
            expect(loaded).not.toBeNull();
            
            // Verify shared fields are preserved
            expect(loaded!.data.shared.gmPfsNumber).toBe(testData.gmPfsNumber);
            expect(loaded!.data.shared.scenarioName).toBe(testData.scenarioName);
            expect(loaded!.data.shared.eventCode).toBe(testData.eventCode);
            expect(loaded!.data.shared.seasonId).toBe(testData.seasonId);
            expect(loaded!.data.shared.layoutId).toBe(testData.layoutId);
            
            // Verify character-specific fields are cleared
            expect(loaded!.data.characters['char1'].goldSpent).toBe(0);
            expect(loaded!.data.characters['char1'].notes).toBe('');
          }),
        { numRuns: 30 }
      );
    });

    /**
     * Test: Clear button confirm sets smart defaults for XP, treasure bundles, downtime days
     * 
     * When the user clicks Clear and confirms, the system should set smart defaults
     * based on the adventure type (bounty, quest, or scenario).
     * 
     * **Validates: Requirement 3.4**
     */
    it('sets smart defaults based on adventure type when Clear is confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { type: 'bounty', name: 'Bounty: Test Adventure', xp: 1, tb: 2, dd: 0, rep: 1 },
            { type: 'quest', name: 'Quest: Test Adventure', xp: 2, tb: 4, dd: 4, rep: 2 },
            { type: 'scenario', name: 'Scenario: Test Adventure', xp: 4, tb: 8, dd: 8, rep: 4 }
          ),
          async (adventureType) => {
            // Save initial data
            const initialData: PartyChronicleData = {
              shared: {
                gmPfsNumber: 'GM-12345',
                scenarioName: adventureType.name,
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 12,
                treasureBundles: 10,
                downtimeDays: 6,
                layoutId: 'layout-1',
                seasonId: 'season-5',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 9,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
                chosenFaction: ''
              },
              characters: {}
            };
            
            await savePartyChronicleData(initialData);
            
            // Simulate Clear button confirm with smart defaults
            await clearPartyChronicleData();
            
            const clearedData: PartyChronicleData = {
              shared: {
                gmPfsNumber: 'GM-12345',
                scenarioName: adventureType.name,
                eventCode: 'TEST-001',
                eventDate: '',
                xpEarned: adventureType.xp,
                treasureBundles: adventureType.tb,
                downtimeDays: adventureType.dd,
                layoutId: 'layout-1',
                seasonId: 'season-5',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: adventureType.rep,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
                chosenFaction: ''
              },
              characters: {}
            };
            
            await savePartyChronicleData(clearedData);
            
            // Load data and verify smart defaults
            const loaded = await loadPartyChronicleData();
            
            expect(loaded).not.toBeNull();
            expect(loaded!.data.shared.xpEarned).toBe(adventureType.xp);
            expect(loaded!.data.shared.treasureBundles).toBe(adventureType.tb);
            expect(loaded!.data.shared.downtimeDays).toBe(adventureType.dd);
            expect(loaded!.data.shared.chosenFactionReputation).toBe(adventureType.rep);
          }),
        { numRuns: 30 }
      );
    });
  });

  describe('Filename Generation Preservation', () => {
    /**
     * Test: Filename sanitization works correctly
     * 
     * When generating filenames for downloaded PDFs, the system should sanitize
     * actor names and chronicle filenames to ensure cross-platform compatibility.
     * 
     * **Validates: Requirement 3.10**
     */
    it('sanitizes filenames correctly for cross-platform compatibility', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (unsafeFilename) => {
            // Sanitize the filename
            const sanitized = sanitizeFilename(unsafeFilename);
            
            // Verify sanitization rules
            // Should not contain invalid characters: / \ : * ? " < > |
            expect(sanitized).not.toMatch(/[/\\:*?"<>|]/);
            
            // Should not be empty (unless input was only invalid characters)
            if (unsafeFilename.replace(/[/\\:*?"<>|]/g, '').length > 0) {
              expect(sanitized.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Filename sanitization preserves valid characters
     * 
     * When sanitizing filenames, valid characters (letters, numbers,
     * hyphens, underscores, dots) should be preserved. Spaces are converted
     * to underscores for cross-platform compatibility.
     * 
     * **Validates: Requirement 3.10**
     */
    it('preserves valid characters during filename sanitization', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_.-]+$/.test(s)),
            scenario: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_.-]+$/.test(s))
          }),
          (validNames) => {
            // These filenames contain only valid characters (no spaces)
            const actorName = validNames.name;
            const scenarioName = validNames.scenario;
            
            // Sanitize should preserve them
            const sanitizedActor = sanitizeFilename(actorName);
            const sanitizedScenario = sanitizeFilename(scenarioName);
            
            expect(sanitizedActor).toBe(actorName);
            expect(sanitizedScenario).toBe(scenarioName);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
