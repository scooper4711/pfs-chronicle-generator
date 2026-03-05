/**
 * Property-based bug condition exploration test for Strikeout Items Not Passed to PDF Generation
 * 
 * This test validates the bug condition: when strikeout items are selected in the form
 * and Generate Chronicles is clicked, the strikeout items should be passed through the
 * complete data flow (extractFormData → SharedFields → mapToCharacterData → ChronicleData → PDF).
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code - failure confirms
 * the bug exists. The test encodes the EXPECTED (correct) behavior.
 * 
 * **Validates: Requirements 2.7, 2.8, 2.9, 2.10**
 * 
 * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { mapToCharacterData } from './model/party-chronicle-mapper';
import { SharedFields, UniqueFields } from './model/party-chronicle-types';

/**
 * Property 1: Fault Condition - Strikeout Items Passed to PDF Generation
 * 
 * **Validates: Requirements 2.7, 2.8, 2.9, 2.10**
 * 
 * For any form submission where strikeout items are selected, the fixed code SHALL:
 * 1. Extract the strikeout items from the form (extractFormData)
 * 2. Include them in the SharedFields structure
 * 3. Map them to the strikeout_item_lines field in ChronicleData (mapToCharacterData)
 * 4. Pass them to the PDF generator for rendering
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: This test will FAIL, proving the bug exists.
 * The failure will show that strikeout items are extracted but not mapped to
 * strikeout_item_lines in ChronicleData.
 * 
 * Feature: party-chronicle-form-bugs, Property 1: Fault Condition
 */
describe('Strikeout Items Bug Condition Exploration', () => {
  describe('Property 1: Fault Condition - Strikeout Items Passed Through Data Flow', () => {
    
    /**
     * Test that a single strikeout item is passed through the complete data flow
     * 
     * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
     */
    it('passes single strikeout item through extractFormData → SharedFields → ChronicleData', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Potion of Healing', 'Scroll of Magic Missile', 'Wand of Detect Magic'),
          (strikeoutItem) => {
            // Step 1: Simulate extractFormData extracting strikeout items from form
            // In the actual code, this reads from:
            // Array.from(container.querySelectorAll('input[name="shared.strikeoutItems"]:checked'))
            const extractedStrikeoutItems = [strikeoutItem];
            
            // Step 2: Verify strikeout items are included in SharedFields
            const sharedFields: SharedFields = {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'PFS-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              adventureSummaryCheckboxes: [],
              strikeoutItems: extractedStrikeoutItems, // Should be included
              treasureBundles: 2,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays: 8
            };
            
            // Step 3: Map to ChronicleData using mapToCharacterData
            const uniqueFields: UniqueFields = {
              characterName: 'Valeros',
              societyId: '12345-01',
              level: 3,
              taskLevel: 1,
              successLevel: 'success',
              proficiencyRank: 'trained',
              earnedIncome: 8,
              goldSpent: 10,
              notes: 'Test notes'
            };
            
            const mockActor = {
              id: 'actor-1',
              name: 'Valeros',
              system: { pfs: { currentFaction: 'EA' } }
            };
            
            const chronicleData = mapToCharacterData(sharedFields, uniqueFields, mockActor);
            
            // Step 4: Verify strikeout items are mapped to strikeout_item_lines
            // **CRITICAL**: This assertion will FAIL on unfixed code if the mapping is missing
            expect(chronicleData.strikeout_item_lines).toBeDefined();
            expect(Array.isArray(chronicleData.strikeout_item_lines)).toBe(true);
            expect(chronicleData.strikeout_item_lines).toContain(strikeoutItem);
            expect(chronicleData.strikeout_item_lines.length).toBe(1);
          }
        ),
        { numRuns: 10 }
      );
    });
    
    /**
     * Test that multiple strikeout items are passed through the complete data flow
     * 
     * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
     */
    it('passes multiple strikeout items through extractFormData → SharedFields → ChronicleData', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              'Potion of Healing',
              'Scroll of Magic Missile',
              'Wand of Detect Magic',
              'Ring of Protection',
              'Cloak of Resistance'
            ),
            { minLength: 2, maxLength: 5 }
          ).map(arr => [...new Set(arr)]), // Remove duplicates
          (strikeoutItems) => {
            // Step 1: Simulate extractFormData extracting strikeout items from form
            const extractedStrikeoutItems = strikeoutItems;
            
            // Step 2: Verify strikeout items are included in SharedFields
            const sharedFields: SharedFields = {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'PFS-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              adventureSummaryCheckboxes: [],
              strikeoutItems: extractedStrikeoutItems, // Should be included
              treasureBundles: 2,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays: 8
            };
            
            // Step 3: Map to ChronicleData using mapToCharacterData
            const uniqueFields: UniqueFields = {
              characterName: 'Valeros',
              societyId: '12345-01',
              level: 3,
              taskLevel: 1,
              successLevel: 'success',
              proficiencyRank: 'trained',
              earnedIncome: 8,
              goldSpent: 10,
              notes: 'Test notes'
            };
            
            const mockActor = {
              id: 'actor-1',
              name: 'Valeros',
              system: { pfs: { currentFaction: 'EA' } }
            };
            
            const chronicleData = mapToCharacterData(sharedFields, uniqueFields, mockActor);
            
            // Step 4: Verify strikeout items are mapped to strikeout_item_lines
            // **CRITICAL**: This assertion will FAIL on unfixed code if the mapping is missing
            expect(chronicleData.strikeout_item_lines).toBeDefined();
            expect(Array.isArray(chronicleData.strikeout_item_lines)).toBe(true);
            expect(chronicleData.strikeout_item_lines.length).toBe(strikeoutItems.length);
            
            // Verify all strikeout items are present
            for (const item of strikeoutItems) {
              expect(chronicleData.strikeout_item_lines).toContain(item);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
    
    /**
     * Test that empty strikeout items array is handled correctly
     * 
     * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
     */
    it('handles empty strikeout items array correctly', () => {
      // When no strikeout items are selected, the array should be empty
      const sharedFields: SharedFields = {
        gmPfsNumber: '12345',
        scenarioName: 'Test Scenario',
        eventCode: 'PFS-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        adventureSummaryCheckboxes: [],
        strikeoutItems: [], // No items selected
        treasureBundles: 2,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 2,
        reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
        downtimeDays: 8
      };
      
      const uniqueFields: UniqueFields = {
        characterName: 'Valeros',
        societyId: '12345-01',
        level: 3,
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'trained',
        earnedIncome: 8,
        goldSpent: 10,
        notes: 'Test notes'
      };
      
      const mockActor = {
        id: 'actor-1',
        name: 'Valeros',
        system: { pfs: { currentFaction: 'EA' } }
      };
      
      const chronicleData = mapToCharacterData(sharedFields, uniqueFields, mockActor);
      
      // Verify empty array is mapped correctly
      expect(chronicleData.strikeout_item_lines).toBeDefined();
      expect(Array.isArray(chronicleData.strikeout_item_lines)).toBe(true);
      expect(chronicleData.strikeout_item_lines.length).toBe(0);
    });
    
    /**
     * Test that strikeout items are preserved exactly as extracted from form
     * 
     * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
     */
    it('preserves strikeout item values exactly without modification', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }),
            { minLength: 1, maxLength: 5 }
          ),
          (strikeoutItems) => {
            // Test with arbitrary string values to ensure no transformation occurs
            const sharedFields: SharedFields = {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'PFS-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              adventureSummaryCheckboxes: [],
              strikeoutItems: strikeoutItems,
              treasureBundles: 2,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays: 8
            };
            
            const uniqueFields: UniqueFields = {
              characterName: 'Valeros',
              societyId: '12345-01',
              level: 3,
              taskLevel: 1,
              successLevel: 'success',
              proficiencyRank: 'trained',
              earnedIncome: 8,
              goldSpent: 10,
              notes: 'Test notes'
            };
            
            const mockActor = {
              id: 'actor-1',
              name: 'Valeros',
              system: { pfs: { currentFaction: 'EA' } }
            };
            
            const chronicleData = mapToCharacterData(sharedFields, uniqueFields, mockActor);
            
            // Verify values are preserved exactly
            expect(chronicleData.strikeout_item_lines).toEqual(strikeoutItems);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    /**
     * Test the bug condition explicitly: strikeout items selected but not in PDF data
     * 
     * This test explicitly checks the bug condition from the design document:
     * Bug condition: strikeoutItems.length > 0 AND pdfGenerated == true 
     *                AND pdfContainsStrikeoutItems == false
     * 
     * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
     */
    it('verifies bug condition: strikeout items selected but not mapped to ChronicleData', () => {
      fc.assert(
        fc.property(
          fc.record({
            strikeoutItems: fc.array(
              fc.constantFrom('Item 1', 'Item 2', 'Item 3'),
              { minLength: 1, maxLength: 3 }
            ),
            pdfGenerated: fc.constant(true)
          }),
          (bugCondition) => {
            // Verify we're testing the exact bug condition
            expect(bugCondition.strikeoutItems.length).toBeGreaterThan(0);
            expect(bugCondition.pdfGenerated).toBe(true);
            
            // Simulate the data flow
            const sharedFields: SharedFields = {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'PFS-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              adventureSummaryCheckboxes: [],
              strikeoutItems: bugCondition.strikeoutItems,
              treasureBundles: 2,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays: 8
            };
            
            const uniqueFields: UniqueFields = {
              characterName: 'Valeros',
              societyId: '12345-01',
              level: 3,
              taskLevel: 1,
              successLevel: 'success',
              proficiencyRank: 'trained',
              earnedIncome: 8,
              goldSpent: 10,
              notes: 'Test notes'
            };
            
            const mockActor = {
              id: 'actor-1',
              name: 'Valeros',
              system: { pfs: { currentFaction: 'EA' } }
            };
            
            const chronicleData = mapToCharacterData(sharedFields, uniqueFields, mockActor);
            
            // **CRITICAL**: This assertion will FAIL on unfixed code
            // The bug is that strikeout_item_lines is missing or empty even though
            // strikeoutItems were selected in the form
            expect(chronicleData.strikeout_item_lines).toBeDefined();
            expect(chronicleData.strikeout_item_lines.length).toBe(bugCondition.strikeoutItems.length);
            expect(chronicleData.strikeout_item_lines).toEqual(bugCondition.strikeoutItems);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    /**
     * Test that strikeout items work alongside adventure summary checkboxes
     * 
     * Both fields use similar checkbox patterns and should work independently
     * 
     * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
     */
    it('handles strikeout items independently from adventure summary checkboxes', () => {
      fc.assert(
        fc.property(
          fc.record({
            adventureSummaryCheckboxes: fc.array(
              fc.constantFrom('Found artifact', 'Saved village', 'Defeated boss'),
              { minLength: 0, maxLength: 3 }
            ),
            strikeoutItems: fc.array(
              fc.constantFrom('Potion', 'Scroll', 'Wand'),
              { minLength: 0, maxLength: 3 }
            )
          }),
          (checkboxData) => {
            const sharedFields: SharedFields = {
              gmPfsNumber: '12345',
              scenarioName: 'Test Scenario',
              eventCode: 'PFS-001',
              eventDate: '2024-01-15',
              xpEarned: 4,
              adventureSummaryCheckboxes: checkboxData.adventureSummaryCheckboxes,
              strikeoutItems: checkboxData.strikeoutItems,
              treasureBundles: 2,
              layoutId: 'layout-1',
              seasonId: 'season-5',
              blankChroniclePath: '/path/to/chronicle.pdf',
              chosenFactionReputation: 2,
              reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays: 8
            };
            
            const uniqueFields: UniqueFields = {
              characterName: 'Valeros',
              societyId: '12345-01',
              level: 3,
              taskLevel: 1,
              successLevel: 'success',
              proficiencyRank: 'trained',
              earnedIncome: 8,
              goldSpent: 10,
              notes: 'Test notes'
            };
            
            const mockActor = {
              id: 'actor-1',
              name: 'Valeros',
              system: { pfs: { currentFaction: 'EA' } }
            };
            
            const chronicleData = mapToCharacterData(sharedFields, uniqueFields, mockActor);
            
            // Verify both fields are mapped correctly and independently
            expect(chronicleData.summary_checkbox).toEqual(checkboxData.adventureSummaryCheckboxes);
            expect(chronicleData.strikeout_item_lines).toEqual(checkboxData.strikeoutItems);
            
            // Verify they don't interfere with each other
            expect(chronicleData.summary_checkbox.length).toBe(checkboxData.adventureSummaryCheckboxes.length);
            expect(chronicleData.strikeout_item_lines.length).toBe(checkboxData.strikeoutItems.length);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    /**
     * Documents the expected counterexample for Bug 3
     * 
     * Requirements: party-chronicle-form-bugs 2.7, 2.8, 2.9, 2.10
     */
    it('documents the expected counterexample', () => {
      const bugScenario = {
        strikeoutItemsSelected: ['Potion of Healing', 'Scroll of Magic Missile'],
        extractedCorrectly: true,
        includedInSharedFields: true,
        mappedToChronicleData: true, // This is the fix!
        appearsInPdf: true // This is the expected outcome
      };
      
      // Simulate the complete data flow
      const sharedFields: SharedFields = {
        gmPfsNumber: '12345',
        scenarioName: 'Test Scenario',
        eventCode: 'PFS-001',
        eventDate: '2024-01-15',
        xpEarned: 4,
        adventureSummaryCheckboxes: [],
        strikeoutItems: bugScenario.strikeoutItemsSelected,
        treasureBundles: 2,
        layoutId: 'layout-1',
        seasonId: 'season-5',
        blankChroniclePath: '/path/to/chronicle.pdf',
        chosenFactionReputation: 2,
        reputationValues: { EA: 2, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
        downtimeDays: 8
      };
      
      const uniqueFields: UniqueFields = {
        characterName: 'Valeros',
        societyId: '12345-01',
        level: 3,
        taskLevel: 1,
        successLevel: 'success',
        proficiencyRank: 'trained',
        earnedIncome: 8,
        goldSpent: 10,
        notes: 'Test notes'
      };
      
      const mockActor = {
        id: 'actor-1',
        name: 'Valeros',
        system: { pfs: { currentFaction: 'EA' } }
      };
      
      const chronicleData = mapToCharacterData(sharedFields, uniqueFields, mockActor);
      
      // Verify the fix: strikeout items are mapped to strikeout_item_lines
      expect(chronicleData.strikeout_item_lines).toEqual(bugScenario.strikeoutItemsSelected);
      
      // When this test passes, it proves:
      // - Fix works: strikeout items are mapped to ChronicleData
      // - Root cause addressed: mapToCharacterData includes strikeout_item_lines mapping
      // - PDF generator will receive strikeout items for rendering
    });
  });
});

