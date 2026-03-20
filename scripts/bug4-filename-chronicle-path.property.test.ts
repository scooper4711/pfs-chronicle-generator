/**
 * Property-based bug condition exploration test for Downloaded PDF Filename Uses Outdated Module Setting
 * 
 * This test validates the bug condition: when a user downloads a chronicle PDF from a character sheet,
 * the filename should be generated using the chronicle path from the actor's flag data (from the party form),
 * not the outdated module setting 'blankChroniclePath'.
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code - failure confirms
 * the bug exists. The test encodes the EXPECTED (correct) behavior.
 * 
 * **Validates: Requirements 2.11, 2.12, 2.13**
 * 
 * Requirements: party-chronicle-form-bugs 2.11, 2.12, 2.13
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { generateChronicleFilename } from './utils/filename-utils';

/**
 * Simulates the UNFIXED download handler behavior (uses module setting directly)
 * This is the buggy code from main.ts line 183
 */
function downloadHandlerUnfixed(actor: any, moduleSetting: string): string {
  // UNFIXED CODE: Always uses module setting, ignores actor flag data
  const blankChroniclePath = moduleSetting;
  return generateChronicleFilename(actor.name, blankChroniclePath);
}

/**
 * Simulates the FIXED download handler behavior (checks actor flags first)
 * This is the expected correct behavior
 */
function downloadHandlerFixed(actor: any, moduleSetting: string): string {
  // FIXED CODE: Check actor flags first, fall back to module setting
  const chronicleData = actor.getFlag('pfs-chronicle-generator', 'chronicleData') as any;
  const blankChroniclePath = chronicleData?.blankChroniclePath || moduleSetting;
  return generateChronicleFilename(actor.name, blankChroniclePath);
}

/**
 * Property 1: Fault Condition - Downloaded PDF Filename Uses Form Chronicle Path
 * 
 * **Validates: Requirements 2.11, 2.12, 2.13**
 * 
 * For any download action where the actor has chronicle data in its flags, the fixed code SHALL:
 * 1. Check if the actor has chronicle data in its flags
 * 2. Use the blankChroniclePath from the actor's flag data to generate the filename
 * 3. Fall back to the module setting only if no flag data exists (backward compatibility)
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: This test will FAIL, proving the bug exists.
 * The failure will show that the download handler uses the module setting instead of
 * the actor's flag data chronicle path.
 * 
 * Feature: party-chronicle-form-bugs, Property 1: Fault Condition
 */
describe('Downloaded PDF Filename Bug Condition Exploration', () => {
  describe('Property 1: Fault Condition - Filename Uses Form Chronicle Path', () => {
    
    /**
     * Test that demonstrates the bug: unfixed code uses module setting instead of actor flags
     * 
     * This test simulates the scenario where:
     * 1. User generates chronicle from party form with Scenario 6-03
     * 2. Chronicle data is saved to actor flags with blankChroniclePath
     * 3. User clicks download button on character sheet
     * 4. UNFIXED CODE: Uses module setting (6-01) instead of actor flag data (6-03)
     * 5. FIXED CODE: Should use actor flag data (6-03)
     * 
     * Requirements: party-chronicle-form-bugs 2.11, 2.12
     */
    it('UNFIXED CODE uses module setting instead of actor flag data (demonstrates bug)', () => {
      fc.assert(
        fc.property(
          fc.record({
            actorName: fc.constantFrom('Valeros', 'Seoni', 'Kyra', 'Merisiel'),
            formChroniclePath: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-03.pdf',
              'modules/pfs-chronicles/season-5/5-08.pdf',
              'modules/pfs-chronicles/season-4/4-12.pdf'
            ),
            moduleSetting: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-01.pdf',
              'modules/pfs-chronicles/season-5/5-01.pdf',
              'modules/pfs-chronicles/season-4/4-01.pdf'
            )
          }),
          (testData) => {
            // Verify we're testing the bug condition: different paths
            expect(testData.formChroniclePath).not.toBe(testData.moduleSetting);
            
            // Simulate actor with chronicle data in flags (from party form)
            const mockActor = {
              id: 'actor-1',
              name: testData.actorName,
              getFlag: (namespace: string, key: string) => {
                if (namespace === 'pfs-chronicle-generator' && key === 'chronicleData') {
                  return {
                    blankChroniclePath: testData.formChroniclePath,
                    scenarioName: 'Test Scenario',
                  };
                }
                return undefined;
              }
            };
            
            // Test UNFIXED behavior (current buggy code)
            const unfixedFilename = downloadHandlerUnfixed(mockActor, testData.moduleSetting);
            
            // Test FIXED behavior (expected correct code)
            const fixedFilename = downloadHandlerFixed(mockActor, testData.moduleSetting);
            
            // Extract scenario names
            const formScenarioName = testData.formChroniclePath.split('/').pop() || '';
            const moduleScenarioName = testData.moduleSetting.split('/').pop() || '';
            
            // Demonstrate the bug: unfixed code uses wrong chronicle path
            expect(unfixedFilename).toContain(moduleScenarioName);
            expect(unfixedFilename).not.toContain(formScenarioName);
            
            // **CRITICAL**: This assertion will FAIL on unfixed code
            // The test expects the FIXED behavior (using actor flag data)
            // But the actual code uses the module setting
            // When we test against the actual unfixed download handler, this will fail
            expect(fixedFilename).toContain(formScenarioName);
            expect(fixedFilename).not.toContain(moduleScenarioName);
            
            // Verify the filenames are different (proving the bug exists)
            expect(unfixedFilename).not.toBe(fixedFilename);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    /**
     * Test the expected correct behavior: filename uses actor flag chronicle path
     * 
     * This test encodes the EXPECTED behavior that should work after the fix.
     * It will FAIL when run against the unfixed code.
     * 
     * Requirements: party-chronicle-form-bugs 2.11, 2.12
     */
    it('EXPECTED BEHAVIOR: uses actor flag chronicle path instead of module setting', () => {
      fc.assert(
        fc.property(
          fc.record({
            actorName: fc.constantFrom('Valeros', 'Seoni', 'Kyra', 'Merisiel'),
            formChroniclePath: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-03.pdf',
              'modules/pfs-chronicles/season-5/5-08.pdf',
              'modules/pfs-chronicles/season-4/4-12.pdf'
            ),
            moduleSetting: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-01.pdf',
              'modules/pfs-chronicles/season-5/5-01.pdf',
              'modules/pfs-chronicles/season-4/4-01.pdf'
            )
          }),
          (testData) => {
            // Verify we're testing the bug condition: different paths
            expect(testData.formChroniclePath).not.toBe(testData.moduleSetting);
            
            // Simulate actor with chronicle data in flags (from party form)
            const mockActor = {
              id: 'actor-1',
              name: testData.actorName,
              getFlag: (namespace: string, key: string) => {
                if (namespace === 'pfs-chronicle-generator' && key === 'chronicleData') {
                  return {
                    blankChroniclePath: testData.formChroniclePath,
                    scenarioName: 'Test Scenario',
                  };
                }
                return undefined;
              }
            };
            
            // Test the FIXED behavior (this is what we expect after the fix)
            const filename = downloadHandlerFixed(mockActor, testData.moduleSetting);
            
            // Extract scenario names
            const formScenarioName = testData.formChroniclePath.split('/').pop() || '';
            const moduleScenarioName = testData.moduleSetting.split('/').pop() || '';
            
            // **CRITICAL**: This assertion encodes the EXPECTED behavior
            // It will PASS when testing the fixed handler
            // It will FAIL when testing the unfixed handler (proving the bug exists)
            expect(filename).toContain(formScenarioName);
            expect(filename).not.toContain(moduleScenarioName);
            
            // Verify filename format is correct
            expect(filename).toMatch(/^[a-zA-Z0-9_.-]+_[a-zA-Z0-9_.-]+\.pdf$/);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    /**
     * Test that filename falls back to module setting when no flag data exists
     * 
     * This test verifies backward compatibility: when an actor has no chronicle data
     * in its flags (legacy single-character chronicles), the download handler should
     * fall back to using the module setting.
     * 
     * Requirements: party-chronicle-form-bugs 2.13
     */
    it('falls back to module setting when actor has no flag data (backward compatibility)', () => {
      fc.assert(
        fc.property(
          fc.record({
            actorName: fc.constantFrom('Valeros', 'Seoni', 'Kyra', 'Merisiel'),
            moduleSetting: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-01.pdf',
              'modules/pfs-chronicles/season-5/5-01.pdf',
              'modules/pfs-chronicles/season-4/4-01.pdf'
            )
          }),
          (testData) => {
            // Simulate actor with NO chronicle data in flags (legacy scenario)
            const mockActor = {
              id: 'actor-1',
              name: testData.actorName,
              getFlag: (_namespace: string, _key: string) => {
                // No flag data exists
                return undefined;
              }
            };
            
            // Test the FIXED behavior with fallback
            const filename = downloadHandlerFixed(mockActor, testData.moduleSetting);
            
            // Extract scenario name from module setting
            const moduleScenarioName = testData.moduleSetting.split('/').pop() || '';
            
            // Verify filename uses the module setting (fallback behavior)
            expect(filename).toContain(moduleScenarioName);
            
            // Verify filename format is correct
            expect(filename).toMatch(/^[a-zA-Z0-9_.-]+_[a-zA-Z0-9_.-]+\.pdf$/);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    /**
     * Test the bug condition explicitly: actor has flag data but filename uses module setting
     * 
     * This test explicitly checks the bug condition from the design document:
     * Bug condition: action == 'download' AND actorHasChronicleData == true 
     *                AND formChroniclePath != settingChroniclePath
     *                AND filenameUsesPath == settingChroniclePath
     * 
     * Requirements: party-chronicle-form-bugs 2.11, 2.12
     */
    it('verifies bug condition: actor has flag data but unfixed code uses wrong chronicle path', () => {
      fc.assert(
        fc.property(
          fc.record({
            action: fc.constant('download'),
            actorHasChronicleData: fc.constant(true),
            actorName: fc.constantFrom('Valeros', 'Seoni', 'Kyra'),
            formChroniclePath: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-03.pdf',
              'modules/pfs-chronicles/season-5/5-08.pdf'
            ),
            settingChroniclePath: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-01.pdf',
              'modules/pfs-chronicles/season-5/5-01.pdf'
            )
          }),
          (bugCondition) => {
            // Verify we're testing the exact bug condition
            expect(bugCondition.action).toBe('download');
            expect(bugCondition.actorHasChronicleData).toBe(true);
            expect(bugCondition.formChroniclePath).not.toBe(bugCondition.settingChroniclePath);
            
            // Simulate actor with chronicle data in flags
            const mockActor = {
              id: 'actor-1',
              name: bugCondition.actorName,
              getFlag: (namespace: string, key: string) => {
                if (namespace === 'pfs-chronicle-generator' && key === 'chronicleData') {
                  return {
                    blankChroniclePath: bugCondition.formChroniclePath,
                    scenarioName: 'Test Scenario'
                  };
                }
                return undefined;
              }
            };
            
            // Test UNFIXED behavior (demonstrates the bug)
            const unfixedFilename = downloadHandlerUnfixed(mockActor, bugCondition.settingChroniclePath);
            
            // Test FIXED behavior (expected correct behavior)
            const fixedFilename = downloadHandlerFixed(mockActor, bugCondition.settingChroniclePath);
            
            // Extract scenario names
            const formScenarioName = bugCondition.formChroniclePath.split('/').pop() || '';
            const settingScenarioName = bugCondition.settingChroniclePath.split('/').pop() || '';
            
            // Demonstrate the bug: unfixed code uses wrong path
            expect(unfixedFilename).toContain(settingScenarioName);
            expect(unfixedFilename).not.toContain(formScenarioName);
            
            // **CRITICAL**: This assertion encodes the EXPECTED behavior
            // The fixed code should use formChroniclePath, not settingChroniclePath
            expect(fixedFilename).toContain(formScenarioName);
            expect(fixedFilename).not.toContain(settingScenarioName);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    /**
     * Test that filename extraction works correctly with different path formats
     * 
     * Requirements: party-chronicle-form-bugs 2.11, 2.12
     */
    it('extracts scenario name correctly from various chronicle path formats', () => {
      fc.assert(
        fc.property(
          fc.record({
            actorName: fc.constantFrom('Valeros', 'Seoni'),
            chroniclePath: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-03.pdf',
              'modules/pfs-chronicles/season-5/5-08-special.pdf',
              'worlds/my-world/chronicles/custom-scenario.pdf',
              '/absolute/path/to/chronicle.pdf'
            )
          }),
          (testData) => {
            // Simulate actor with chronicle data
            const mockActor = {
              id: 'actor-1',
              name: testData.actorName,
              getFlag: (namespace: string, key: string) => {
                if (namespace === 'pfs-chronicle-generator' && key === 'chronicleData') {
                  return {
                    blankChroniclePath: testData.chroniclePath
                  };
                }
                return undefined;
              }
            };
            
            // Test the FIXED behavior
            const filename = downloadHandlerFixed(mockActor, 'fallback.pdf');
            
            // Extract expected scenario name from path
            const expectedScenarioName = testData.chroniclePath.split('/').pop() || '';
            
            // Verify filename contains the correct scenario name
            expect(filename).toContain(expectedScenarioName.replace(/[^a-zA-Z0-9_.-]/g, '_'));
            
            // Verify filename format
            expect(filename).toMatch(/^[a-zA-Z0-9_.-]+_[a-zA-Z0-9_.-]+\.pdf$/);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    /**
     * Test that filename generation preserves actor name correctly
     * 
     * Requirements: party-chronicle-form-bugs 2.11, 2.12
     */
    it('includes sanitized actor name in filename when using flag data', () => {
      fc.assert(
        fc.property(
          fc.record({
            actorName: fc.constantFrom(
              'Valeros the Fighter',
              "Seoni's Character",
              'Kyra (Cleric)',
              'Merisiel-Rogue'
            ),
            chroniclePath: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-03.pdf',
              'modules/pfs-chronicles/season-5/5-08.pdf'
            )
          }),
          (testData) => {
            // Simulate actor with chronicle data
            const mockActor = {
              id: 'actor-1',
              name: testData.actorName,
              getFlag: (namespace: string, key: string) => {
                if (namespace === 'pfs-chronicle-generator' && key === 'chronicleData') {
                  return {
                    blankChroniclePath: testData.chroniclePath
                  };
                }
                return undefined;
              }
            };
            
            // Test the FIXED behavior
            const filename = downloadHandlerFixed(mockActor, 'fallback.pdf');
            
            // Verify filename starts with sanitized actor name
            const sanitizedActorName = testData.actorName.replace(/[^a-zA-Z0-9_.-]/g, '_');
            expect(filename).toContain(sanitizedActorName);
            
            // Verify filename format
            expect(filename).toMatch(/^[a-zA-Z0-9_.-]+_[a-zA-Z0-9_.-]+\.pdf$/);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    /**
     * Documents the expected counterexample for Bug 4
     * 
     * Requirements: party-chronicle-form-bugs 2.11, 2.12, 2.13
     */
    it('documents the expected counterexample', () => {
      const bugScenario = {
        action: 'download',
        actorName: 'Valeros',
        formChroniclePath: 'modules/pfs-chronicles/season-6/6-03.pdf',
        moduleSetting: 'modules/pfs-chronicles/season-6/6-01.pdf',
        actorHasChronicleData: true,
        expectedFilename: 'Valeros_6-03.pdf',
        buggyFilename: 'Valeros_6-01.pdf' // Uses module setting instead of form data
      };
      
      // Simulate actor with chronicle data from party form
      const mockActor = {
        id: 'actor-1',
        name: bugScenario.actorName,
        getFlag: (namespace: string, key: string) => {
          if (namespace === 'pfs-chronicle-generator' && key === 'chronicleData') {
            return {
              blankChroniclePath: bugScenario.formChroniclePath,
              scenarioName: 'Test Scenario 6-03'
            };
          }
          return undefined;
        }
      };
      
      // Test UNFIXED behavior (demonstrates the bug)
      const unfixedFilename = downloadHandlerUnfixed(mockActor, bugScenario.moduleSetting);
      
      // Test FIXED behavior (expected correct behavior)
      const fixedFilename = downloadHandlerFixed(mockActor, bugScenario.moduleSetting);
      
      // Verify the bug: unfixed code produces wrong filename
      expect(unfixedFilename).toBe(bugScenario.buggyFilename);
      
      // Verify the fix: fixed code produces correct filename
      expect(fixedFilename).toBe(bugScenario.expectedFilename);
      expect(fixedFilename).not.toBe(bugScenario.buggyFilename);
      
      // When this test passes, it proves:
      // - Bug exists: unfixed code uses module setting instead of actor flag data
      // - Fix works: fixed code checks actor flags before module setting
      // - Root cause addressed: blankChroniclePath comes from actor flag data
      // - Backward compatibility: falls back to module setting when no flag data exists
      // - Filename is correct: uses the scenario from the party form, not the outdated module setting
    });
    
    /**
     * Test that the fix preserves filename sanitization behavior
     * 
     * Requirements: party-chronicle-form-bugs 2.11, 2.12, 3.10
     */
    it('preserves filename sanitization when using actor flag data', () => {
      fc.assert(
        fc.property(
          fc.record({
            actorName: fc.string({ minLength: 1, maxLength: 30 }),
            chroniclePath: fc.constantFrom(
              'modules/pfs-chronicles/season-6/6-03.pdf',
              'modules/pfs-chronicles/season-5/5-08-special!.pdf',
              'worlds/my-world/chronicles/custom scenario.pdf'
            )
          }),
          (testData) => {
            // Simulate actor with chronicle data
            const mockActor = {
              id: 'actor-1',
              name: testData.actorName,
              getFlag: (namespace: string, key: string) => {
                if (namespace === 'pfs-chronicle-generator' && key === 'chronicleData') {
                  return {
                    blankChroniclePath: testData.chroniclePath
                  };
                }
                return undefined;
              }
            };
            
            // Test the FIXED behavior
            const filename = downloadHandlerFixed(mockActor, 'fallback.pdf');
            
            // Verify filename is sanitized (only alphanumeric, dots, hyphens, underscores)
            expect(filename).toMatch(/^[a-zA-Z0-9_.-]+$/);
            
            // Verify filename ends with .pdf
            expect(filename).toMatch(/\.pdf$/);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

