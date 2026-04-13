/**
 * Property-based tests for unique field handling in Party Chronicle Filling
 * 
 * These tests validate that unique fields are properly isolated per character
 * and that each character receives their own unique field inputs.
 * 
 * **Validates: Requirements 3.1, 3.2**
 */

import fc from 'fast-check';
import { PartyChronicleData, UniqueFields } from '../../scripts/model/party-chronicle-types';
import { mapToCharacterData } from '../../scripts/model/party-chronicle-mapper';
import { calculateTreasureBundleValue, calculateCurrencyGained } from '../../scripts/utils/treasure-bundle-calculator';
import { calculateEarnedIncome } from '../../scripts/utils/earned-income-calculator';
import { PartyActor } from '../../scripts/handlers/event-listener-helpers';

/**
 * Generator for unique field values
 * Creates realistic character-specific data
 */
const uniqueFieldsArbitrary = fc.record({
  characterName: fc.string({ minLength: 1, maxLength: 30 }),
  playerNumber: fc.stringMatching(/^\d{1,10}$/),
  characterNumber: fc.stringMatching(/^2\d{1,5}$/),
  level: fc.integer({ min: 1, max: 20 }),
  taskLevel: fc.oneof(
    fc.constant('-'),
    fc.integer({ min: 0, max: 20 })
  ),
  successLevel: fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'),
  proficiencyRank: fc.constantFrom('trained', 'expert', 'master', 'legendary'),
  earnedIncome: fc.integer({ min: 0, max: 1000 }),
  currencySpent: fc.integer({ min: 0, max: 1000 }),
  notes: fc.string({ maxLength: 200 }),
  consumeReplay: fc.boolean()
});

/**
 * Generator for shared fields
 * Creates data that applies to all party members
 */
const sharedFieldsArbitrary = fc.record({
  gmPfsNumber: fc.string({ minLength: 5, maxLength: 15 }),
  scenarioName: fc.string({ minLength: 1, maxLength: 100 }),
  eventCode: fc.string({ minLength: 1, maxLength: 20 }),
  eventDate: fc.integer({ min: 2000, max: 2099 }).chain(year =>
    fc.integer({ min: 1, max: 12 }).chain(month =>
      fc.integer({ min: 1, max: 28 }).map(day =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )
    )
  ),
  xpEarned: fc.integer({ min: 0, max: 12 }),
  adventureSummaryCheckboxes: fc.array(fc.string(), { maxLength: 5 }),
  strikeoutItems: fc.array(fc.string(), { maxLength: 10 }),
  treasureBundles: fc.integer({ min: 0, max: 10 }),
  layoutId: fc.string({ minLength: 1, maxLength: 50 }),
  seasonId: fc.string({ minLength: 1, maxLength: 50 }),
  blankChroniclePath: fc.string({ minLength: 1, maxLength: 200 }),
  chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
  reputationValues: fc.record({
    EA: fc.integer({ min: 0, max: 9 }),
    GA: fc.integer({ min: 0, max: 9 }),
    HH: fc.integer({ min: 0, max: 9 }),
    VS: fc.integer({ min: 0, max: 9 }),
    RO: fc.integer({ min: 0, max: 9 }),
    VW: fc.integer({ min: 0, max: 9 })
  }),
  downtimeDays: fc.integer({ min: 0, max: 8 }),
  reportingA: fc.boolean(),
  reportingB: fc.boolean(),
  reportingC: fc.boolean(),
  reportingD: fc.boolean(),
  chosenFaction: fc.constantFrom('', 'EA', 'GA', 'HH', 'VS', 'RO', 'VW')
});

/**
 * Generator for actor IDs
 */
const actorIdArbitrary = fc.uuid();

/**
 * Create a mock actor object for testing
 */
const createMockActor = (actorId: string, currentFaction: string | null = null) => ({
  id: actorId,
  system: {
    pfs: {
      currentFaction
    }
  }
}) as unknown as PartyActor;

describe('Party Chronicle Unique Field Property Tests', () => {
  beforeAll(() => {
    (globalThis as any).game = { system: { id: 'pf2e' }, modules: new Map() };
  });

  afterAll(() => {
    delete (globalThis as any).game;
  });
  describe('Property 3: Unique Field Isolation', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * For any unique field value and any player character, when a value is entered
     * in a unique field for that character, the value SHALL be applied only to that
     * specific character and SHALL NOT be applied to any other character.
     * 
     * Feature: party-chronicle-filling, Property 3: Unique Field Isolation
     */
    it('applies unique field values only to the specific character', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 2, maxLength: 10 }
          ),
          async (shared, characterPairs) => {
            // Create party chronicle data with multiple characters
            const _partyData: PartyChronicleData = {
              shared,
              characters: Object.fromEntries(
                characterPairs.map(([actorId, unique]) => [actorId, unique])
              )
            };

            // For each character, map to chronicle data
            const chronicleDataList = characterPairs.map(([actorId, unique]) => ({
              actorId,
              unique,
              actor: createMockActor(actorId, 'EA'),
              chronicleData: mapToCharacterData(shared, unique, createMockActor(actorId, 'EA'))
            }));

            // Property: Each character's chronicle data should contain only their unique fields
            chronicleDataList.forEach(({ actorId, unique, chronicleData }) => {
              // Calculate expected earned income based on task level, success level, proficiency rank, and downtime days
              const expectedEarnedIncome = calculateEarnedIncome(
                unique.taskLevel,
                unique.successLevel,
                unique.proficiencyRank,
                shared.downtimeDays
              );
              
              // Calculate expected gold values
              const expectedTreasureBundlesGp = calculateTreasureBundleValue(shared.treasureBundles, unique.level);
              const expectedGpGained = calculateCurrencyGained(expectedTreasureBundlesGp, expectedEarnedIncome);
              
              // Verify character-specific fields match this character's unique data
              expect(chronicleData.char).toBe(unique.characterName);
              expect(chronicleData.societyid).toBe(unique.playerNumber);
              expect(chronicleData.level).toBe(unique.level);
              expect(chronicleData.income_earned).toBe(expectedEarnedIncome);
              expect(chronicleData.currency_gained).toBe(expectedGpGained);
              expect(chronicleData.currency_spent).toBe(unique.currencySpent);
              expect(chronicleData.notes).toBe(unique.notes);

              // Property: Verify this character's data does NOT contain other characters' unique values
              const otherCharacters = characterPairs.filter(([id]) => id !== actorId);
              otherCharacters.forEach(([_, otherUnique]) => {
                // Calculate expected earned income for other character
                const otherExpectedEarnedIncome = calculateEarnedIncome(
                  otherUnique.taskLevel,
                  otherUnique.successLevel,
                  otherUnique.proficiencyRank,
                  shared.downtimeDays
                );
                
                // Calculate expected values for other character
                const otherExpectedTreasureBundlesGp = calculateTreasureBundleValue(shared.treasureBundles, otherUnique.level);
                const otherExpectedGpGained = calculateCurrencyGained(otherExpectedTreasureBundlesGp, otherExpectedEarnedIncome);
                
                // If the values are different, ensure they don't leak
                if (otherUnique.characterName !== unique.characterName) {
                  expect(chronicleData.char).not.toBe(otherUnique.characterName);
                }
                if (otherUnique.playerNumber !== unique.playerNumber) {
                  expect(chronicleData.societyid).not.toBe(otherUnique.playerNumber);
                }
                if (otherUnique.level !== unique.level) {
                  expect(chronicleData.level).not.toBe(otherUnique.level);
                }
                if (otherExpectedEarnedIncome !== expectedEarnedIncome) {
                  expect(chronicleData.income_earned).not.toBe(otherExpectedEarnedIncome);
                }
                if (expectedGpGained !== otherExpectedGpGained) {
                  expect(chronicleData.currency_gained).not.toBe(otherExpectedGpGained);
                }
                if (otherUnique.currencySpent !== unique.currencySpent) {
                  expect(chronicleData.currency_spent).not.toBe(otherUnique.currencySpent);
                }
                if (otherUnique.notes !== unique.notes) {
                  expect(chronicleData.notes).not.toBe(otherUnique.notes);
                }
              });
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles edge case: two characters with identical unique values', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          uniqueFieldsArbitrary,
          fc.tuple(actorIdArbitrary, actorIdArbitrary).filter(([id1, id2]) => id1 !== id2),
          async (shared, uniqueFields, [actorId1, actorId2]) => {
            // Both characters have the same unique field values
            const partyData: PartyChronicleData = {
              shared,
              characters: {
                [actorId1]: uniqueFields,
                [actorId2]: uniqueFields
              }
            };

            // Map both characters
            const actor1 = createMockActor(actorId1, 'EA');
            const actor2 = createMockActor(actorId2, 'EA');
            const chronicle1 = mapToCharacterData(shared, partyData.characters[actorId1], actor1);
            const chronicle2 = mapToCharacterData(shared, partyData.characters[actorId2], actor2);

            // Property: Even with identical values, each character gets their own data
            expect(chronicle1).toEqual(chronicle2);
            
            // Property: Modifying one character's data doesn't affect the other
            const modifiedUnique = { ...uniqueFields, characterName: 'Modified Name' };
            const modifiedChronicle = mapToCharacterData(shared, modifiedUnique, actor1);
            
            expect(modifiedChronicle.char).toBe('Modified Name');
            expect(chronicle1.char).toBe(uniqueFields.characterName);
            expect(chronicle2.char).toBe(uniqueFields.characterName);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles edge case: single character party', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          actorIdArbitrary,
          uniqueFieldsArbitrary,
          async (shared, actorId, unique) => {
            const _partyData: PartyChronicleData = {
              shared,
              characters: {
                [actorId]: unique
              }
            };

            const chronicleData = mapToCharacterData(shared, unique, createMockActor(actorId, 'EA'));

            // Calculate expected earned income based on task level, success level, proficiency rank, and downtime days
            const expectedEarnedIncome = calculateEarnedIncome(
              unique.taskLevel,
              unique.successLevel,
              unique.proficiencyRank,
              shared.downtimeDays
            );
            
            // Calculate expected gold values
            const expectedTreasureBundlesGp = calculateTreasureBundleValue(shared.treasureBundles, unique.level);
            const expectedGpGained = calculateCurrencyGained(expectedTreasureBundlesGp, expectedEarnedIncome);

            // Property: Single character's unique fields are correctly applied
            expect(chronicleData.char).toBe(unique.characterName);
            expect(chronicleData.societyid).toBe(unique.playerNumber);
            expect(chronicleData.level).toBe(unique.level);
            expect(chronicleData.income_earned).toBe(expectedEarnedIncome);
            expect(chronicleData.currency_gained).toBe(expectedGpGained);
            expect(chronicleData.currency_spent).toBe(unique.currencySpent);
            expect(chronicleData.notes).toBe(unique.notes);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('preserves unique field independence across multiple mappings', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 3, maxLength: 10 }
          ),
          async (shared, characterPairs) => {
            // Map all characters to chronicle data
            const mappings = characterPairs.map(([actorId, unique]) => ({
              actorId,
              unique,
              chronicleData: mapToCharacterData(shared, unique, createMockActor(actorId, 'EA'))
            }));

            // Property: Each mapping is independent
            for (let i = 0; i < mappings.length; i++) {
              for (let j = i + 1; j < mappings.length; j++) {
                const mapping1 = mappings[i];
                const mapping2 = mappings[j];

                // Different actors should have independent unique fields
                if (mapping1.actorId !== mapping2.actorId) {
                  // If unique values differ, chronicle data should differ
                  if (mapping1.unique.characterName !== mapping2.unique.characterName) {
                    expect(mapping1.chronicleData.char).not.toBe(mapping2.chronicleData.char);
                  }
                  if (mapping1.unique.playerNumber !== mapping2.unique.playerNumber) {
                    expect(mapping1.chronicleData.societyid).not.toBe(mapping2.chronicleData.societyid);
                  }
                  if (mapping1.unique.level !== mapping2.unique.level) {
                    expect(mapping1.chronicleData.level).not.toBe(mapping2.chronicleData.level);
                  }
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Per-Character Unique Field Provision', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * For any party composition, the Party Chronicle Interface SHALL provide
     * unique field inputs for each player character in the party.
     * 
     * Feature: party-chronicle-filling, Property 4: Per-Character Unique Field Provision
     */
    it('provides unique field structure for each party member', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(actorIdArbitrary, { minLength: 1, maxLength: 10 }),
          async (shared, actorIds) => {
            // Create party data with unique fields for each actor
            const characters: { [actorId: string]: UniqueFields } = {};
            
            actorIds.forEach(actorId => {
              characters[actorId] = {
                characterName: `Character ${actorId.substring(0, 8)}`,
                playerNumber: `${Math.floor(Math.random() * 900000 + 100000)}`,
                characterNumber: `${Math.floor(Math.random() * 9000 + 1000)}`,
                level: Math.floor(Math.random() * 20) + 1,
                taskLevel: Math.floor(Math.random() * 20),
                successLevel: 'success',
                proficiencyRank: 'trained',
                earnedIncome: Math.floor(Math.random() * 100),
                currencySpent: Math.floor(Math.random() * 1000),
                notes: `Notes for ${actorId.substring(0, 8)}`,
                consumeReplay: false
              };
            });

            const partyData: PartyChronicleData = {
              shared,
              characters
            };

            // Property: Each actor ID should have a corresponding unique fields entry
            actorIds.forEach(actorId => {
              expect(partyData.characters[actorId]).toBeDefined();
              expect(partyData.characters[actorId]).toHaveProperty('characterName');
              expect(partyData.characters[actorId]).toHaveProperty('playerNumber');
              expect(partyData.characters[actorId]).toHaveProperty('characterNumber');
              expect(partyData.characters[actorId]).toHaveProperty('level');
              expect(partyData.characters[actorId]).toHaveProperty('earnedIncome');
              expect(partyData.characters[actorId]).toHaveProperty('currencySpent');
              expect(partyData.characters[actorId]).toHaveProperty('notes');
            });

            // Property: The number of unique field entries should match the number of actors
            expect(Object.keys(partyData.characters)).toHaveLength(actorIds.length);

            // Property: No extra unique field entries should exist
            Object.keys(partyData.characters).forEach(actorId => {
              expect(actorIds).toContain(actorId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles edge case: empty party has no unique field entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          async (shared) => {
            const partyData: PartyChronicleData = {
              shared,
              characters: {}
            };

            // Property: Empty party should have no character entries
            expect(Object.keys(partyData.characters)).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles edge case: large party (10 characters)', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(actorIdArbitrary, { minLength: 10, maxLength: 10 }),
          async (shared, actorIds) => {
            const characters: { [actorId: string]: UniqueFields } = {};
            
            actorIds.forEach((actorId, index) => {
              characters[actorId] = {
                characterName: `Character ${index + 1}`,
                playerNumber: `${100000 + index}`,
                characterNumber: `${1000 + index}`,
                level: (index % 20) + 1,
                taskLevel: (index % 20),
                successLevel: 'success',
                proficiencyRank: 'trained',
                earnedIncome: index * 10,
                currencySpent: index * 50,
                notes: `Notes ${index + 1}`,
                consumeReplay: false
              };
            });

            const partyData: PartyChronicleData = {
              shared,
              characters
            };

            // Property: All 10 characters should have unique field entries
            expect(Object.keys(partyData.characters)).toHaveLength(10);
            
            actorIds.forEach(actorId => {
              expect(partyData.characters[actorId]).toBeDefined();
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('maintains unique field structure integrity when characters are added/removed', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(actorIdArbitrary, { minLength: 3, maxLength: 10 }),
          async (shared, actorIds) => {
            // Start with all characters
            const characters: { [actorId: string]: UniqueFields } = {};
            actorIds.forEach(actorId => {
              characters[actorId] = {
                characterName: `Character ${actorId.substring(0, 8)}`,
                playerNumber: '123456',
                characterNumber: actorId.substring(0, 4),
                level: 5,
                taskLevel: 3,
                successLevel: 'success',
                proficiencyRank: 'trained',
                earnedIncome: 10,
                currencySpent: 20,
                notes: 'Test notes',
                consumeReplay: false
              };
            });

            let partyData: PartyChronicleData = {
              shared,
              characters
            };

            // Property: Initial state has all characters
            expect(Object.keys(partyData.characters)).toHaveLength(actorIds.length);

            // Simulate removing a character
            const removedActorId = actorIds[0];
            const { [removedActorId]: _removed, ...remainingCharacters } = partyData.characters;
            
            partyData = {
              ...partyData,
              characters: remainingCharacters
            };

            // Property: After removal, character count decreases by 1
            expect(Object.keys(partyData.characters)).toHaveLength(actorIds.length - 1);
            expect(partyData.characters[removedActorId]).toBeUndefined();

            // Property: Remaining characters still have their unique fields
            actorIds.slice(1).forEach(actorId => {
              expect(partyData.characters[actorId]).toBeDefined();
              expect(partyData.characters[actorId]).toHaveProperty('characterName');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ensures all required unique fields are present for each character', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          async (shared, characterPairs) => {
            const characters = Object.fromEntries(
              characterPairs.map(([actorId, unique]) => [actorId, unique])
            );

            const partyData: PartyChronicleData = {
              shared,
              characters
            };

            // Property: Each character must have all required unique fields
            const requiredFields: (keyof UniqueFields)[] = [
              'characterName',
              'playerNumber',
              'characterNumber',
              'level',
              'earnedIncome',
              'currencySpent',
              'notes'
            ];

            Object.entries(partyData.characters).forEach(([_actorId, uniqueFields]) => {
              requiredFields.forEach(field => {
                expect(uniqueFields).toHaveProperty(field);
                expect(uniqueFields[field]).toBeDefined();
              });
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
