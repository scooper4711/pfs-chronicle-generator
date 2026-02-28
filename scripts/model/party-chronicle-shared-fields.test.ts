/**
 * Property-based tests for shared field propagation in Party Chronicle Filling
 * 
 * These tests validate that shared field values are correctly applied to all
 * party members and not applied to characters outside the party.
 * 
 * **Validates: Requirements 2.2**
 */

import fc from 'fast-check';

// Mock the PFSChronicleGeneratorApp module to avoid Foundry dependencies
jest.mock('../PFSChronicleGeneratorApp', () => ({
  FACTION_NAMES: {
    'EA': 'Envoy\'s Alliance',
    'GA': 'Grand Archive',
    'HH': 'Horizon Hunters',
    'VS': 'Vigilant Seal',
    'RO': 'Radiant Oath',
    'VW': 'Verdant Wheel'
  }
}));

// Import after mocking
import { PartyChronicleData, SharedFields, UniqueFields } from './party-chronicle-types';
import { mapToCharacterData } from './party-chronicle-mapper';

/**
 * Generator for shared field values
 * Creates realistic shared data that applies to all party members
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
  chosenFactionReputation: fc.integer({ min: 0, max: 9 }),
  reputationValues: fc.record({
    EA: fc.integer({ min: 0, max: 9 }),
    GA: fc.integer({ min: 0, max: 9 }),
    HH: fc.integer({ min: 0, max: 9 }),
    VS: fc.integer({ min: 0, max: 9 }),
    RO: fc.integer({ min: 0, max: 9 }),
    VW: fc.integer({ min: 0, max: 9 })
  })
});

/**
 * Generator for unique field values
 * Creates character-specific data
 */
const uniqueFieldsArbitrary = fc.record({
  characterName: fc.string({ minLength: 1, maxLength: 30 }),
  societyId: fc.string({ minLength: 5, maxLength: 15 }),
  level: fc.integer({ min: 1, max: 20 }),
  incomeEarned: fc.integer({ min: 0, max: 100 }),
  goldEarned: fc.integer({ min: 0, max: 1000 }),
  goldSpent: fc.integer({ min: 0, max: 1000 }),
  notes: fc.string({ maxLength: 200 }),
});

/**
 * Generator for actor IDs
 */
const actorIdArbitrary = fc.uuid();

describe('Party Chronicle Shared Field Property Tests', () => {
  describe('Property 2: Shared Field Propagation', () => {
    /**
     * **Validates: Requirements 2.2**
     * 
     * For any shared field value and any party composition, when a value is entered
     * in a shared field, that value SHALL be applied to all player characters in the
     * party and to no characters outside the party.
     * 
     * Feature: party-chronicle-filling, Property 2: Shared field values apply to all characters
     */
    it('applies shared field values to all party members', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          async (shared, characterPairs) => {
            // Create party chronicle data with multiple characters
            const partyData: PartyChronicleData = {
              shared,
              characters: Object.fromEntries(
                characterPairs.map(([actorId, unique]) => [actorId, unique])
              )
            };

            // Map each character to chronicle data
            const chronicleDataList = characterPairs.map(([actorId, unique]) => ({
              actorId,
              unique,
              chronicleData: mapToCharacterData(shared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            }));

            // Property: All characters should have the same shared field values
            chronicleDataList.forEach(({ chronicleData }) => {
              // Verify shared fields are applied to this character
              expect(chronicleData.gmid).toBe(shared.gmPfsNumber);
              expect(chronicleData.event).toBe(shared.scenarioName);
              expect(chronicleData.eventcode).toBe(shared.eventCode);
              expect(chronicleData.date).toBe(shared.eventDate);
              expect(chronicleData.xp_gained).toBe(shared.xpEarned);
              expect(chronicleData.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
              expect(chronicleData.strikeout_item_lines).toEqual(shared.strikeoutItems);
              expect(chronicleData.treasure_bundles).toBe(shared.treasureBundles.toString());
            });

            // Property: All characters should have identical shared field values
            if (chronicleDataList.length > 1) {
              const firstChronicle = chronicleDataList[0].chronicleData;
              
              chronicleDataList.slice(1).forEach(({ chronicleData }) => {
                expect(chronicleData.gmid).toBe(firstChronicle.gmid);
                expect(chronicleData.event).toBe(firstChronicle.event);
                expect(chronicleData.eventcode).toBe(firstChronicle.eventcode);
                expect(chronicleData.date).toBe(firstChronicle.date);
                expect(chronicleData.xp_gained).toBe(firstChronicle.xp_gained);
                expect(chronicleData.summary_checkbox).toEqual(firstChronicle.summary_checkbox);
                expect(chronicleData.strikeout_item_lines).toEqual(firstChronicle.strikeout_item_lines);
                expect(chronicleData.treasure_bundles).toBe(firstChronicle.treasure_bundles);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not apply shared field values to characters outside the party', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 1, maxLength: 5 }
          ),
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 1, maxLength: 5 }
          ),
          async (partyShared, outsideShared, partyCharacters, outsideCharacters) => {
            // Ensure the shared fields are different
            fc.pre(partyShared.gmPfsNumber !== outsideShared.gmPfsNumber ||
                   partyShared.scenarioName !== outsideShared.scenarioName ||
                   partyShared.eventCode !== outsideShared.eventCode);

            // Create party data with party-specific shared fields
            const partyData: PartyChronicleData = {
              shared: partyShared,
              characters: Object.fromEntries(
                partyCharacters.map(([actorId, unique]) => [actorId, unique])
              )
            };

            // Map party characters to chronicle data
            const partyChronicles = partyCharacters.map(([actorId, unique]) => ({
              actorId,
              chronicleData: mapToCharacterData(partyShared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            }));

            // Map outside characters with different shared fields
            const outsideChronicles = outsideCharacters.map(([actorId, unique]) => ({
              actorId,
              chronicleData: mapToCharacterData(outsideShared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            }));

            // Property: Party characters should have party shared fields
            partyChronicles.forEach(({ chronicleData }) => {
              expect(chronicleData.gmid).toBe(partyShared.gmPfsNumber);
              expect(chronicleData.event).toBe(partyShared.scenarioName);
              expect(chronicleData.eventcode).toBe(partyShared.eventCode);
              expect(chronicleData.date).toBe(partyShared.eventDate);
              expect(chronicleData.xp_gained).toBe(partyShared.xpEarned);
            });

            // Property: Outside characters should have outside shared fields (not party fields)
            outsideChronicles.forEach(({ chronicleData }) => {
              expect(chronicleData.gmid).toBe(outsideShared.gmPfsNumber);
              expect(chronicleData.event).toBe(outsideShared.scenarioName);
              expect(chronicleData.eventcode).toBe(outsideShared.eventCode);
              expect(chronicleData.date).toBe(outsideShared.eventDate);
              expect(chronicleData.xp_gained).toBe(outsideShared.xpEarned);

              // Verify outside characters don't have party shared fields
              expect(chronicleData.gmid).not.toBe(partyShared.gmPfsNumber);
              expect(chronicleData.event).not.toBe(partyShared.scenarioName);
              expect(chronicleData.eventcode).not.toBe(partyShared.eventCode);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles edge case: single character party receives shared fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          actorIdArbitrary,
          uniqueFieldsArbitrary,
          async (shared, actorId, unique) => {
            const partyData: PartyChronicleData = {
              shared,
              characters: {
                [actorId]: unique
              }
            };

            const chronicleData = mapToCharacterData(shared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } });

            // Property: Single character should receive all shared field values
            expect(chronicleData.gmid).toBe(shared.gmPfsNumber);
            expect(chronicleData.event).toBe(shared.scenarioName);
            expect(chronicleData.eventcode).toBe(shared.eventCode);
            expect(chronicleData.date).toBe(shared.eventDate);
            expect(chronicleData.xp_gained).toBe(shared.xpEarned);
            expect(chronicleData.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
            expect(chronicleData.strikeout_item_lines).toEqual(shared.strikeoutItems);
            expect(chronicleData.treasure_bundles).toBe(shared.treasureBundles.toString());
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles edge case: large party (10 characters) all receive shared fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 10, maxLength: 10 }
          ),
          async (shared, characterPairs) => {
            const partyData: PartyChronicleData = {
              shared,
              characters: Object.fromEntries(
                characterPairs.map(([actorId, unique]) => [actorId, unique])
              )
            };

            // Map all 10 characters
            const chronicleDataList = characterPairs.map(([actorId, unique]) =>
              mapToCharacterData(shared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            );

            // Property: All 10 characters should have identical shared field values
            chronicleDataList.forEach(chronicleData => {
              expect(chronicleData.gmid).toBe(shared.gmPfsNumber);
              expect(chronicleData.event).toBe(shared.scenarioName);
              expect(chronicleData.eventcode).toBe(shared.eventCode);
              expect(chronicleData.date).toBe(shared.eventDate);
              expect(chronicleData.xp_gained).toBe(shared.xpEarned);
              expect(chronicleData.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
              expect(chronicleData.strikeout_item_lines).toEqual(shared.strikeoutItems);
              expect(chronicleData.treasure_bundles).toBe(shared.treasureBundles.toString());
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('preserves shared field values when unique fields differ', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 2, maxLength: 10 }
          ),
          async (shared, characterPairs) => {
            // Map all characters to chronicle data
            const chronicleDataList = characterPairs.map(([actorId, unique]) => ({
              actorId,
              unique,
              chronicleData: mapToCharacterData(shared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            }));

            // Property: Even though unique fields differ, shared fields remain consistent
            const firstChronicle = chronicleDataList[0];
            
            chronicleDataList.slice(1).forEach(({ unique, chronicleData }) => {
              // Verify unique fields are different (if they are)
              if (unique.characterName !== firstChronicle.unique.characterName) {
                expect(chronicleData.char).not.toBe(firstChronicle.chronicleData.char);
              }
              
              // But shared fields should always be the same
              expect(chronicleData.gmid).toBe(firstChronicle.chronicleData.gmid);
              expect(chronicleData.event).toBe(firstChronicle.chronicleData.event);
              expect(chronicleData.eventcode).toBe(firstChronicle.chronicleData.eventcode);
              expect(chronicleData.date).toBe(firstChronicle.chronicleData.date);
              expect(chronicleData.xp_gained).toBe(firstChronicle.chronicleData.xp_gained);
              expect(chronicleData.summary_checkbox).toEqual(firstChronicle.chronicleData.summary_checkbox);
              expect(chronicleData.strikeout_item_lines).toEqual(firstChronicle.chronicleData.strikeout_item_lines);
              expect(chronicleData.treasure_bundles).toBe(firstChronicle.chronicleData.treasure_bundles);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('applies updated shared field values to all party members', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 2, maxLength: 10 }
          ),
          async (initialShared, updatedShared, characterPairs) => {
            // Ensure shared fields are different
            fc.pre(initialShared.gmPfsNumber !== updatedShared.gmPfsNumber ||
                   initialShared.scenarioName !== updatedShared.scenarioName);

            // Map characters with initial shared fields
            const initialChronicles = characterPairs.map(([actorId, unique]) =>
              mapToCharacterData(initialShared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            );

            // Map characters with updated shared fields
            const updatedChronicles = characterPairs.map(([actorId, unique]) =>
              mapToCharacterData(updatedShared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            );

            // Property: All characters should have initial shared values
            initialChronicles.forEach(chronicleData => {
              expect(chronicleData.gmid).toBe(initialShared.gmPfsNumber);
              expect(chronicleData.event).toBe(initialShared.scenarioName);
              expect(chronicleData.eventcode).toBe(initialShared.eventCode);
            });

            // Property: After update, all characters should have updated shared values
            updatedChronicles.forEach(chronicleData => {
              expect(chronicleData.gmid).toBe(updatedShared.gmPfsNumber);
              expect(chronicleData.event).toBe(updatedShared.scenarioName);
              expect(chronicleData.eventcode).toBe(updatedShared.eventCode);
              
              // Verify they don't have the old values
              expect(chronicleData.gmid).not.toBe(initialShared.gmPfsNumber);
              expect(chronicleData.event).not.toBe(initialShared.scenarioName);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles all shared field types correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          sharedFieldsArbitrary,
          fc.array(
            fc.tuple(actorIdArbitrary, uniqueFieldsArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          async (shared, characterPairs) => {
            // Map all characters
            const chronicleDataList = characterPairs.map(([actorId, unique]) =>
              mapToCharacterData(shared, unique, { id: 'test-actor', system: { pfs: { currentFaction: 'EA' } } })
            );

            // Property: All shared field types are correctly propagated
            chronicleDataList.forEach(chronicleData => {
              // String fields
              expect(typeof chronicleData.gmid).toBe('string');
              expect(chronicleData.gmid).toBe(shared.gmPfsNumber);
              
              expect(typeof chronicleData.event).toBe('string');
              expect(chronicleData.event).toBe(shared.scenarioName);
              
              expect(typeof chronicleData.eventcode).toBe('string');
              expect(chronicleData.eventcode).toBe(shared.eventCode);
              
              expect(typeof chronicleData.date).toBe('string');
              expect(chronicleData.date).toBe(shared.eventDate);
              
              expect(typeof chronicleData.treasure_bundles).toBe('string');
              expect(chronicleData.treasure_bundles).toBe(shared.treasureBundles.toString());
              
              // Number fields
              expect(typeof chronicleData.xp_gained).toBe('number');
              expect(chronicleData.xp_gained).toBe(shared.xpEarned);
              
              // Array fields
              expect(Array.isArray(chronicleData.summary_checkbox)).toBe(true);
              expect(chronicleData.summary_checkbox).toEqual(shared.adventureSummaryCheckboxes);
              
              expect(Array.isArray(chronicleData.strikeout_item_lines)).toBe(true);
              expect(chronicleData.strikeout_item_lines).toEqual(shared.strikeoutItems);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
