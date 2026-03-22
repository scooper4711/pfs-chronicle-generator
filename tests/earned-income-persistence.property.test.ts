/**
 * Property-based tests for Earned Income Data Persistence
 * 
 * Property 11: Data Persistence Round-Trip
 * 
 * For any valid earned income inputs (downtime days, task level, success level,
 * proficiency rank), saving and then loading the form data should restore all
 * input values correctly.
 * 
 * Requirements: earned-income-calculation 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { savePartyChronicleData, loadPartyChronicleData } from '../scripts/model/party-chronicle-storage';
import { PartyChronicleData } from '../scripts/model/party-chronicle-types';

// Mock the Foundry VTT game.settings API
const mockSettings = new Map<string, any>();

(global as any).game = {
  settings: {
    set: jest.fn(async (moduleId: string, key: string, value: any) => {
      mockSettings.set(`${moduleId}.${key}`, value);
    }),
    get: jest.fn(async (moduleId: string, key: string) => {
      return mockSettings.get(`${moduleId}.${key}`);
    }),
  },
};

describe('Earned Income Data Persistence - Property Tests', () => {
  beforeEach(() => {
    // Clear mock settings before each test
    mockSettings.clear();
  });

  /**
   * Property 11: Data Persistence Round-Trip
   * 
   * For any valid earned income input values (downtime days, task level,
   * success level, proficiency rank), saving and then loading the form data
   * should restore all input values correctly.
   * 
   * This property verifies that:
   * 1. Downtime days (0-8) persists correctly
   * 2. Task level (0-20 or "-") persists correctly for each character
   * 3. Success level persists correctly for each character
   * 4. Proficiency rank persists correctly for each character
   * 5. All values are restored exactly as saved
   * 
   * Feature: earned-income-calculation, Property 11: Data Persistence Round-Trip
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
   */
  describe('Property 11: Data Persistence Round-Trip', () => {
    /**
     * Generator for valid downtime days (0-8)
     */
    const downtimeDaysArbitrary = fc.integer({ min: 0, max: 8 });

    /**
     * Generator for valid task levels (0-20 or "-")
     */
    const taskLevelArbitrary = fc.oneof(
      fc.integer({ min: 0, max: 20 }),
      fc.constant('-' as const)
    );

    /**
     * Generator for valid success levels
     */
    const successLevelArbitrary = fc.constantFrom(
      'critical_failure',
      'failure',
      'success',
      'critical_success'
    );

    /**
     * Generator for valid proficiency ranks
     */
    const proficiencyRankArbitrary = fc.constantFrom(
      'trained',
      'expert',
      'master',
      'legendary'
    );

    /**
     * Generator for character-specific earned income data
     */
    const characterEarnedIncomeArbitrary = fc.record({
      taskLevel: taskLevelArbitrary,
      successLevel: successLevelArbitrary,
      proficiencyRank: proficiencyRankArbitrary,
      characterName: fc.string({ minLength: 1, maxLength: 50 }),
      societyId: fc.string({ minLength: 1, maxLength: 20 }),
      level: fc.integer({ min: 1, max: 20 }),
      earnedIncome: fc.double({ min: 0, max: 1000, noNaN: true }),
      goldSpent: fc.double({ min: 0, max: 1000, noNaN: true }),
      notes: fc.string({ maxLength: 200 }),
      consumeReplay: fc.boolean(),
    });

    /**
     * Generator for complete party chronicle data with earned income fields
     */
    const partyChronicleDataArbitrary = fc.record({
      shared: fc.record({
        gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
        scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
        eventCode: fc.string({ minLength: 1, maxLength: 50 }),
        eventDate: fc.string({ minLength: 1, maxLength: 20 }),
        xpEarned: fc.integer({ min: 0, max: 12 }),
        treasureBundles: fc.integer({ min: 0, max: 10 }),
        downtimeDays: downtimeDaysArbitrary,
        layoutId: fc.string({ minLength: 1, maxLength: 50 }),
        seasonId: fc.string({ minLength: 1, maxLength: 50 }),
        blankChroniclePath: fc.string({ maxLength: 200 }),
        adventureSummaryCheckboxes: fc.array(fc.string(), { maxLength: 10 }),
        strikeoutItems: fc.array(fc.string(), { maxLength: 10 }),
        chosenFactionReputation: fc.integer({ min: 0, max: 9 }),
        reputationValues: fc.record({
          EA: fc.integer({ min: 0, max: 9 }),
          GA: fc.integer({ min: 0, max: 9 }),
          HH: fc.integer({ min: 0, max: 9 }),
          VS: fc.integer({ min: 0, max: 9 }),
          RO: fc.integer({ min: 0, max: 9 }),
          VW: fc.integer({ min: 0, max: 9 }),
        }),
        reportingA: fc.boolean(),
        reportingB: fc.boolean(),
        reportingC: fc.boolean(),
        reportingD: fc.boolean(),
      }),
      characters: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }), // actor IDs
        characterEarnedIncomeArbitrary,
        { minKeys: 1, maxKeys: 6 } // 1-6 party members
      ),
    });

    it('should persist and restore downtime days correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          downtimeDaysArbitrary,
          async (downtimeDays) => {
            // Create minimal party chronicle data with downtime days
            const data: PartyChronicleData = {
              shared: {
                gmPfsNumber: '123456-789',
                scenarioName: 'Test Scenario',
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 2,
                downtimeDays: downtimeDays,
                layoutId: 'layout1',
                seasonId: 'season1',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 2,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
              },
              characters: {
                actor1: {
                  characterName: 'Test Character',
                  societyId: '12345-2001',
                  level: 5,
                  taskLevel: 3,
                  successLevel: 'success',
                  proficiencyRank: 'trained',
                  earnedIncome: 0,
                  goldSpent: 0,
                  notes: '',
                  consumeReplay: false,
                },
              },
            };

            // Save the data
            await savePartyChronicleData(data);

            // Load the data
            const loaded = await loadPartyChronicleData();

            // Verify downtime days persisted correctly
            expect(loaded).not.toBeNull();
            expect(loaded!.data.shared.downtimeDays).toBe(downtimeDays);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist and restore task level correctly for all characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.record({
              actorId: fc.string({ minLength: 1, maxLength: 20 }),
              taskLevel: taskLevelArbitrary,
            }),
            { minLength: 1, maxLength: 6, selector: (r) => r.actorId }
          ),
          async (characters) => {
            // Create party chronicle data with multiple characters
            const charactersData: any = {};
            characters.forEach((char) => {
              charactersData[char.actorId] = {
                characterName: `Character ${char.actorId}`,
                societyId: '12345-2001',
                level: 5,
                taskLevel: char.taskLevel,
                successLevel: 'success',
                proficiencyRank: 'trained',
                earnedIncome: 0,
                goldSpent: 0,
                notes: '',
              };
            });

            const data: PartyChronicleData = {
              shared: {
                gmPfsNumber: '123456-789',
                scenarioName: 'Test Scenario',
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 2,
                downtimeDays: 0,
                layoutId: 'layout1',
                seasonId: 'season1',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 2,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
              },
              characters: charactersData,
            };

            // Save the data
            await savePartyChronicleData(data);

            // Load the data
            const loaded = await loadPartyChronicleData();

            // Verify task levels persisted correctly for all characters
            expect(loaded).not.toBeNull();
            characters.forEach((char) => {
              expect(loaded!.data.characters[char.actorId].taskLevel).toEqual(char.taskLevel);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist and restore success level correctly for all characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.record({
              actorId: fc.string({ minLength: 1, maxLength: 20 }),
              successLevel: successLevelArbitrary,
            }),
            { minLength: 1, maxLength: 6, selector: (r) => r.actorId }
          ),
          async (characters) => {
            // Create party chronicle data with multiple characters
            const charactersData: any = {};
            characters.forEach((char) => {
              charactersData[char.actorId] = {
                characterName: `Character ${char.actorId}`,
                societyId: '12345-2001',
                level: 5,
                taskLevel: 3,
                successLevel: char.successLevel,
                proficiencyRank: 'trained',
                earnedIncome: 0,
                goldSpent: 0,
                notes: '',
              };
            });

            const data: PartyChronicleData = {
              shared: {
                gmPfsNumber: '123456-789',
                scenarioName: 'Test Scenario',
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 2,
                downtimeDays: 0,
                layoutId: 'layout1',
                seasonId: 'season1',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 2,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
              },
              characters: charactersData,
            };

            // Save the data
            await savePartyChronicleData(data);

            // Load the data
            const loaded = await loadPartyChronicleData();

            // Verify success levels persisted correctly for all characters
            expect(loaded).not.toBeNull();
            characters.forEach((char) => {
              expect(loaded!.data.characters[char.actorId].successLevel).toBe(char.successLevel);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist and restore proficiency rank correctly for all characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.record({
              actorId: fc.string({ minLength: 1, maxLength: 20 }),
              proficiencyRank: proficiencyRankArbitrary,
            }),
            { minLength: 1, maxLength: 6, selector: (r) => r.actorId }
          ),
          async (characters) => {
            // Create party chronicle data with multiple characters
            const charactersData: any = {};
            characters.forEach((char) => {
              charactersData[char.actorId] = {
                characterName: `Character ${char.actorId}`,
                societyId: '12345-2001',
                level: 5,
                taskLevel: 3,
                successLevel: 'success',
                proficiencyRank: char.proficiencyRank,
                earnedIncome: 0,
                goldSpent: 0,
                notes: '',
              };
            });

            const data: PartyChronicleData = {
              shared: {
                gmPfsNumber: '123456-789',
                scenarioName: 'Test Scenario',
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 2,
                downtimeDays: 0,
                layoutId: 'layout1',
                seasonId: 'season1',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 2,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
              },
              characters: charactersData,
            };

            // Save the data
            await savePartyChronicleData(data);

            // Load the data
            const loaded = await loadPartyChronicleData();

            // Verify proficiency ranks persisted correctly for all characters
            expect(loaded).not.toBeNull();
            characters.forEach((char) => {
              expect(loaded!.data.characters[char.actorId].proficiencyRank).toBe(char.proficiencyRank);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist and restore all earned income fields together', async () => {
      await fc.assert(
        fc.asyncProperty(
          partyChronicleDataArbitrary,
          async (data) => {
            // Save the data
            await savePartyChronicleData(data as PartyChronicleData);

            // Load the data
            const loaded = await loadPartyChronicleData();

            // Verify all earned income fields persisted correctly
            expect(loaded).not.toBeNull();
            
            // Verify shared downtime days
            expect(loaded!.data.shared.downtimeDays).toBe(data.shared.downtimeDays);
            
            // Verify character-specific earned income fields
            Object.keys(data.characters).forEach((actorId) => {
              const originalChar = data.characters[actorId];
              const loadedChar = loaded!.data.characters[actorId];
              
              expect(loadedChar.taskLevel).toEqual(originalChar.taskLevel);
              expect(loadedChar.successLevel).toBe(originalChar.successLevel);
              expect(loadedChar.proficiencyRank).toBe(originalChar.proficiencyRank);
              expect(loadedChar.earnedIncome).toBeCloseTo(originalChar.earnedIncome, 2);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle task level "-" (opt-out) correctly in persistence', async () => {
      await fc.assert(
        fc.asyncProperty(
          downtimeDaysArbitrary,
          async (downtimeDays) => {
            const data: PartyChronicleData = {
              shared: {
                gmPfsNumber: '123456-789',
                scenarioName: 'Test Scenario',
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 2,
                downtimeDays: downtimeDays,
                layoutId: 'layout1',
                seasonId: 'season1',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 2,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
              },
              characters: {
                actor1: {
                  characterName: 'Test Character',
                  societyId: '12345-2001',
                  level: 5,
                  taskLevel: '-', // Opt-out
                  successLevel: 'success',
                  proficiencyRank: 'trained',
                  earnedIncome: 0,
                  goldSpent: 0,
                  notes: '',
                  consumeReplay: false,
                },
              },
            };

            // Save the data
            await savePartyChronicleData(data);

            // Load the data
            const loaded = await loadPartyChronicleData();

            // Verify task level "-" persisted correctly
            expect(loaded).not.toBeNull();
            expect(loaded!.data.characters.actor1.taskLevel).toBe('-');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve earned income data across multiple save/load cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(partyChronicleDataArbitrary, { minLength: 2, maxLength: 5 }),
          async (dataSequence) => {
            let lastLoaded: any = null;

            // Perform multiple save/load cycles
            for (const data of dataSequence) {
              // Save the data
              await savePartyChronicleData(data as PartyChronicleData);

              // Load the data
              lastLoaded = await loadPartyChronicleData();

              // Verify the loaded data matches what was saved
              expect(lastLoaded).not.toBeNull();
              expect(lastLoaded!.data.shared.downtimeDays).toBe(data.shared.downtimeDays);
              
              Object.keys(data.characters).forEach((actorId) => {
                const originalChar = data.characters[actorId];
                const loadedChar = lastLoaded!.data.characters[actorId];
                
                expect(loadedChar.taskLevel).toEqual(originalChar.taskLevel);
                expect(loadedChar.successLevel).toBe(originalChar.successLevel);
                expect(loadedChar.proficiencyRank).toBe(originalChar.proficiencyRank);
              });
            }
          }
        ),
        { numRuns: 50 } // Fewer runs since this tests multiple cycles
      );
    });

    it('should not lose earned income data when other fields are updated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            downtimeDays: downtimeDaysArbitrary,
            taskLevel: taskLevelArbitrary,
            successLevel: successLevelArbitrary,
            proficiencyRank: proficiencyRankArbitrary,
            // Other fields that might be updated
            gmPfsNumber: fc.string({ minLength: 1, maxLength: 20 }),
            scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
            goldSpent: fc.double({ min: 0, max: 1000, noNaN: true }),
          }),
          async (fields) => {
            // Save initial data with earned income fields
            const initialData: PartyChronicleData = {
              shared: {
                gmPfsNumber: '123456-789',
                scenarioName: 'Initial Scenario',
                eventCode: 'TEST-001',
                eventDate: '2024-01-15',
                xpEarned: 4,
                treasureBundles: 2,
                downtimeDays: fields.downtimeDays,
                layoutId: 'layout1',
                seasonId: 'season1',
                blankChroniclePath: '',
                adventureSummaryCheckboxes: [],
                strikeoutItems: [],
                chosenFactionReputation: 2,
                reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
                reportingA: false,
                reportingB: false,
                reportingC: false,
                reportingD: false,
              },
              characters: {
                actor1: {
                  characterName: 'Test Character',
                  societyId: '12345-2001',
                  level: 5,
                  taskLevel: fields.taskLevel,
                  successLevel: fields.successLevel,
                  proficiencyRank: fields.proficiencyRank,
                  earnedIncome: 0,
                  goldSpent: 0,
                  notes: '',
                  consumeReplay: false,
                },
              },
            };

            await savePartyChronicleData(initialData);

            // Update other fields
            const updatedData: PartyChronicleData = {
              ...initialData,
              shared: {
                ...initialData.shared,
                gmPfsNumber: fields.gmPfsNumber,
                scenarioName: fields.scenarioName,
              },
              characters: {
                actor1: {
                  ...initialData.characters.actor1,
                  goldSpent: fields.goldSpent,
                },
              },
            };

            await savePartyChronicleData(updatedData);

            // Load and verify earned income fields are preserved
            const loaded = await loadPartyChronicleData();

            expect(loaded).not.toBeNull();
            expect(loaded!.data.shared.downtimeDays).toBe(fields.downtimeDays);
            expect(loaded!.data.characters.actor1.taskLevel).toEqual(fields.taskLevel);
            expect(loaded!.data.characters.actor1.successLevel).toBe(fields.successLevel);
            expect(loaded!.data.characters.actor1.proficiencyRank).toBe(fields.proficiencyRank);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
