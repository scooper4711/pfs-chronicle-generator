/**
 * Property-based tests for Earned Income PDF Generation Integration
 * 
 * These tests verify that the earned income calculation is correctly passed
 * to the PDF generator through the data mapper.
 * 
 * Requirements: earned-income-calculation 12.1, 12.2, 12.3
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { mapToCharacterData } from './model/party-chronicle-mapper';
import { SharedFields, UniqueFields } from './model/party-chronicle-types';
import { calculateEarnedIncome } from './utils/earned-income-calculator';
import { createSharedFields, createUniqueFields } from './model/test-helpers';

describe('Earned Income PDF Generation Integration - Property-Based Tests', () => {
  const createMockActor = (actorId: string, currentFaction: string | null = null) => ({
    id: actorId,
    system: {
      pfs: {
        currentFaction
      }
    }
  });

  // Feature: earned-income-calculation, Property 12: PDF Generation Integration
  // **Validates: Requirements 12.1, 12.2, 12.3**
  describe('Property 12: PDF Generation Integration', () => {
    it('should pass calculated earned income to PDF generator for any valid earned income inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }), // downtimeDays
          fc.integer({ min: 1, max: 20 }), // characterLevel
          fc.oneof(fc.constant('-'), fc.integer({ min: 0, max: 20 })), // taskLevel
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'), // successLevel
          fc.constantFrom('trained', 'expert', 'master', 'legendary'), // proficiencyRank
          fc.integer({ min: 0, max: 10 }), // treasureBundles
          (downtimeDays, characterLevel, taskLevel, successLevel, proficiencyRank, treasureBundles) => {
            // Create shared fields with downtime days
            const shared: SharedFields = createSharedFields({
              treasureBundles,
              chosenFactionReputation: 0,
              reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays
            });

            // Create unique fields with earned income inputs
            const unique: UniqueFields = createUniqueFields({
              level: characterLevel,
              taskLevel,
              successLevel,
              proficiencyRank,
              earnedIncome: 0,
              goldSpent: 0,
              notes: ''
            });

            const actor = createMockActor('test-actor', 'EA');
            const result = mapToCharacterData(shared, unique, actor);

            // Calculate expected earned income using the calculator
            const expectedIncome = calculateEarnedIncome(
              taskLevel,
              successLevel,
              proficiencyRank,
              downtimeDays
            );

            // Verify PDF generator receives the calculated earned income value
            // Requirement 12.1: Include Total_Income value when generating PDF
            expect(result.income_earned).toBe(expectedIncome);
            
            // Requirement 12.2: Write Total_Income to appropriate field on chronicle template
            expect(result).toHaveProperty('income_earned');
            expect(typeof result.income_earned).toBe('number');
            
            // Requirement 12.3: Format Total_Income consistently with other currency fields
            expect(result.income_earned).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(result.income_earned)).toBe(true);
            
            // Verify the value is rounded to 2 decimal places
            const decimalPlaces = (result.income_earned.toString().split('.')[1] || '').length;
            expect(decimalPlaces).toBeLessThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include earned income in gp_gained calculation for PDF generation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }), // downtimeDays
          fc.integer({ min: 1, max: 20 }), // characterLevel
          fc.oneof(fc.constant('-'), fc.integer({ min: 0, max: 20 })), // taskLevel
          fc.constantFrom('critical_failure', 'failure', 'success', 'critical_success'), // successLevel
          fc.constantFrom('trained', 'expert', 'master', 'legendary'), // proficiencyRank
          fc.integer({ min: 0, max: 10 }), // treasureBundles
          (downtimeDays, characterLevel, taskLevel, successLevel, proficiencyRank, treasureBundles) => {
            const shared: SharedFields = createSharedFields({
              treasureBundles,
              chosenFactionReputation: 0,
              reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays
            });

            const unique: UniqueFields = createUniqueFields({
              level: characterLevel,
              taskLevel,
              successLevel,
              proficiencyRank,
              earnedIncome: 0,
              goldSpent: 0,
              notes: ''
            });

            const actor = createMockActor('test-actor', 'EA');
            const result = mapToCharacterData(shared, unique, actor);

            // Calculate expected values
            const expectedIncome = calculateEarnedIncome(
              taskLevel,
              successLevel,
              proficiencyRank,
              downtimeDays
            );

            // Verify gp_gained includes both treasure_bundles_gp and income_earned
            // Requirement 12.2, 12.3: Total gold gained should include earned income
            expect(result.gp_gained).toBeGreaterThanOrEqual(result.income_earned);
            expect(result.gp_gained).toBeGreaterThanOrEqual(result.treasure_bundles_gp);
            
            // Verify the calculation is correct
            const expectedGpGained = Math.round((result.treasure_bundles_gp + expectedIncome) * 100) / 100;
            expect(result.gp_gained).toBe(expectedGpGained);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use exact parameter name "income_earned" for PDF compatibility', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }), // downtimeDays
          fc.integer({ min: 1, max: 20 }), // characterLevel
          fc.integer({ min: 0, max: 20 }), // taskLevel (numeric only for this test)
          fc.constantFrom('failure', 'success', 'critical_success'), // successLevel (no critical_failure)
          fc.constantFrom('trained', 'expert', 'master', 'legendary'), // proficiencyRank
          (downtimeDays, characterLevel, taskLevel, successLevel, proficiencyRank) => {
            const shared: SharedFields = createSharedFields({
              treasureBundles: 0,
              chosenFactionReputation: 0,
              reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays
            });

            const unique: UniqueFields = createUniqueFields({
              level: characterLevel,
              taskLevel,
              successLevel,
              proficiencyRank,
              earnedIncome: 0,
              goldSpent: 0,
              notes: ''
            });

            const actor = createMockActor('test-actor', 'EA');
            const result = mapToCharacterData(shared, unique, actor);

            // Requirement 12.1, 12.2: Verify exact parameter name for PDF compatibility
            expect(result).toHaveProperty('income_earned');
            
            // Verify no alternative parameter names exist
            expect(result).not.toHaveProperty('incomeEarned');
            expect(result).not.toHaveProperty('earnedIncome');
            expect(result).not.toHaveProperty('income');
            
            // Verify the parameter name is exactly as specified (snake_case)
            const keys = Object.keys(result);
            expect(keys).toContain('income_earned');
            expect(keys).not.toContain('incomeEarned');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero earned income correctly in PDF generation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // characterLevel
          fc.integer({ min: 0, max: 10 }), // treasureBundles
          (characterLevel, treasureBundles) => {
            // Test with task level "-" (opt-out)
            const shared: SharedFields = createSharedFields({
              treasureBundles,
              chosenFactionReputation: 0,
              reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays: 4
            });

            const unique: UniqueFields = createUniqueFields({
              level: characterLevel,
              taskLevel: '-',
              earnedIncome: 0,
              goldSpent: 0,
              notes: ''
            });

            const actor = createMockActor('test-actor', 'EA');
            const result = mapToCharacterData(shared, unique, actor);

            // Verify earned income is 0 when task level is "-"
            expect(result.income_earned).toBe(0);
            
            // Verify gp_gained only includes treasure bundles
            expect(result.gp_gained).toBe(result.treasure_bundles_gp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle critical success correctly in PDF generation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }), // downtimeDays
          fc.integer({ min: 1, max: 19 }), // characterLevel (0-19 for standard critical success)
          fc.constantFrom('trained', 'expert', 'master', 'legendary'), // proficiencyRank
          (downtimeDays, characterLevel, proficiencyRank) => {
            // Use character level as task level for simplicity
            const taskLevel = characterLevel;
            
            const shared: SharedFields = createSharedFields({
              treasureBundles: 0,
              chosenFactionReputation: 0,
              reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays
            });

            const unique: UniqueFields = createUniqueFields({
              level: characterLevel,
              taskLevel,
              successLevel: 'critical_success',
              proficiencyRank,
              earnedIncome: 0,
              goldSpent: 0,
              notes: ''
            });

            const actor = createMockActor('test-actor', 'EA');
            const result = mapToCharacterData(shared, unique, actor);

            // Calculate expected income (critical success uses level + 1)
            const expectedIncome = calculateEarnedIncome(
              taskLevel,
              'critical_success',
              proficiencyRank,
              downtimeDays
            );

            // Verify PDF generator receives correct critical success income
            expect(result.income_earned).toBe(expectedIncome);
            expect(result.income_earned).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle level 20 critical success special case in PDF generation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }), // downtimeDays
          fc.constantFrom('trained', 'expert', 'master', 'legendary'), // proficiencyRank
          (downtimeDays, proficiencyRank) => {
            const shared: SharedFields = createSharedFields({
              treasureBundles: 0,
              chosenFactionReputation: 0,
              reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays
            });

            const unique: UniqueFields = createUniqueFields({
              level: 20,
              taskLevel: 20,
              successLevel: 'critical_success',
              proficiencyRank,
              earnedIncome: 0,
              goldSpent: 0,
              notes: ''
            });

            const actor = createMockActor('test-actor', 'EA');
            const result = mapToCharacterData(shared, unique, actor);

            // Calculate expected income (level 20 critical success uses special values)
            const expectedIncome = calculateEarnedIncome(
              20,
              'critical_success',
              proficiencyRank,
              downtimeDays
            );

            // Verify PDF generator receives correct level 20 critical success income
            expect(result.income_earned).toBe(expectedIncome);
            
            // Verify it's using the special critical success values
            const specialValues: Record<string, number> = {
              trained: 35,
              expert: 40,
              master: 50,
              legendary: 60
            };
            
            if (downtimeDays > 0) {
              const expectedPerDay = specialValues[proficiencyRank];
              expect(result.income_earned).toBe(expectedPerDay * downtimeDays);
            } else {
              expect(result.income_earned).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain calculation consistency across multiple calls for PDF generation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 8 }), // downtimeDays
          fc.integer({ min: 1, max: 20 }), // characterLevel
          fc.integer({ min: 0, max: 20 }), // taskLevel
          fc.constantFrom('failure', 'success', 'critical_success'), // successLevel
          fc.constantFrom('trained', 'expert', 'master', 'legendary'), // proficiencyRank
          (downtimeDays, characterLevel, taskLevel, successLevel, proficiencyRank) => {
            const shared: SharedFields = createSharedFields({
              treasureBundles: 2,
              chosenFactionReputation: 0,
              reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 },
              downtimeDays
            });

            const unique: UniqueFields = createUniqueFields({
              level: characterLevel,
              taskLevel,
              successLevel,
              proficiencyRank,
              earnedIncome: 0,
              goldSpent: 0,
              notes: ''
            });

            const actor = createMockActor('test-actor', 'EA');
            
            // Call mapToCharacterData multiple times with same inputs
            const result1 = mapToCharacterData(shared, unique, actor);
            const result2 = mapToCharacterData(shared, unique, actor);
            const result3 = mapToCharacterData(shared, unique, actor);

            // Verify all results are identical (deterministic calculation)
            expect(result1.income_earned).toBe(result2.income_earned);
            expect(result2.income_earned).toBe(result3.income_earned);
            expect(result1.gp_gained).toBe(result2.gp_gained);
            expect(result2.gp_gained).toBe(result3.gp_gained);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
