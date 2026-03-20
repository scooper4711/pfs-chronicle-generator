/**
 * Property-based tests for PartyChronicleApp
 * 
 * These tests validate correctness properties across all valid inputs
 * using fast-check for property-based testing.
 */

import fc from 'fast-check';
import { PartyMember, PartyChronicleContext } from './model/party-chronicle-types';

// Mock foundry global before importing PartyChronicleApp
(global as any).foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (base: any) => base,
    },
    ux: {
      FormDataExtended: class {},
    },
  },
};

// Mock Foundry VTT game global
global.game = {
  settings: {
    get: jest.fn((module: string, key: string) => {
      const defaults: Record<string, any> = {
        gmPfsNumber: '123456',
        eventName: 'Test Event',
        eventcode: 'TEST-001',
        blankChroniclePath: '/path/to/blank.pdf',
        season: 'pfs2-season7',
        layout: 'test-layout'
      };
      return defaults[key] || '';
    })
  }
} as any;

// Mock layoutStore
jest.mock('./LayoutStore', () => ({
  layoutStore: {
    getSeasons: jest.fn(() => [
      { id: 'pfs2-season7', name: 'Season 7' },
      { id: 'pfs2-season6', name: 'Season 6' }
    ]),
    getLayoutsByParent: jest.fn((seasonId: string) => [
      { id: 'test-layout', description: 'Test Layout' }
    ]),
    getLayout: jest.fn(async (layoutId: string) => ({
      id: layoutId,
      description: 'Test Layout',
      defaultChronicleLocation: undefined // No default for test layouts
    }))
  }
}));

// Mock party chronicle storage
jest.mock('./model/party-chronicle-storage', () => ({
  loadPartyChronicleData: jest.fn(async () => null)
}));

// Now import PartyChronicleApp after mocks are set up
import { PartyChronicleApp } from './PartyChronicleApp';

/**
 * Generator for mock actor objects
 * Creates actors with realistic PFS character data
 */
const actorArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: fc.constant('character'), // Add type property to match filter in _prepareContext
  system: fc.record({
    details: fc.record({
      level: fc.record({
        value: fc.integer({ min: 1, max: 20 })
      })
    }),
    pfs: fc.option(
      fc.record({
        playerNumber: fc.integer({ min: 100000, max: 999999 }),
        characterNumber: fc.integer({ min: 1001, max: 9999 }),
        currentFaction: fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW')
      }),
      { nil: undefined }
    )
  })
});

describe('PartyChronicleApp Property Tests', () => {
  describe('Property 1: Party Member Listing Completeness', () => {
    /**
     * **Validates: Requirements 1.3**
     * 
     * For any party composition, when the Party Chronicle Interface is rendered,
     * the interface SHALL list all and only the player characters currently in the party.
     * 
     * Feature: party-chronicle-filling, Property 1: Party Member Listing Completeness
     */
    it('lists all and only the party members passed to the app', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(actorArbitrary, { minLength: 1, maxLength: 10 }),
          async (actors) => {
            // Create PartyChronicleApp with the generated actors
            const app = new PartyChronicleApp(actors);
            
            // Call _prepareContext to get the party members
            const context = await app._prepareContext() as PartyChronicleContext;
            
            // Property: The context should list exactly the same number of party members
            expect(context.partyMembers).toHaveLength(actors.length);
            
            // Property: Each actor should be represented in the party members list
            actors.forEach((actor, index) => {
              const member = context.partyMembers.find((m: PartyMember) => m.id === actor.id);
              
              // Each actor must be present
              expect(member).toBeDefined();
              
              // Each member must have the correct data from the actor
              expect(member!.name).toBe(actor.name);
              expect(member!.level).toBe(actor.system.details.level.value);
              
              // Society ID should be formatted correctly if PFS data exists
              if (actor.system.pfs) {
                const expectedSocietyId = `${actor.system.pfs.playerNumber}-${actor.system.pfs.characterNumber}`;
                expect(member!.societyId).toBe(expectedSocietyId);
              } else {
                expect(member!.societyId).toBe('');
              }
            });
            
            // Property: No extra members should be present
            context.partyMembers.forEach((member: PartyMember) => {
              const actor = actors.find(a => a.id === member.id);
              expect(actor).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles edge case: single character party', async () => {
      await fc.assert(
        fc.asyncProperty(
          actorArbitrary,
          async (actor) => {
            const app = new PartyChronicleApp([actor]);
            const context = await app._prepareContext() as PartyChronicleContext;
            
            expect(context.partyMembers).toHaveLength(1);
            expect(context.partyMembers[0].id).toBe(actor.id);
            expect(context.partyMembers[0].name).toBe(actor.name);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles edge case: large party (10 characters)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(actorArbitrary, { minLength: 10, maxLength: 10 }),
          async (actors) => {
            const app = new PartyChronicleApp(actors);
            const context = await app._prepareContext() as PartyChronicleContext;
            
            expect(context.partyMembers).toHaveLength(10);
            
            // All 10 actors should be present
            actors.forEach(actor => {
              const member = context.partyMembers.find((m: PartyMember) => m.id === actor.id);
              expect(member).toBeDefined();
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles characters without PFS data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 30 }),
              system: fc.record({
                details: fc.record({
                  level: fc.record({
                    value: fc.integer({ min: 1, max: 20 })
                  })
                }),
                pfs: fc.constant(undefined)
              })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (actors) => {
            const app = new PartyChronicleApp(actors);
            const context = await app._prepareContext() as PartyChronicleContext;
            
            // All members should have empty society IDs
            context.partyMembers.forEach((member: PartyMember) => {
              expect(member.societyId).toBe('');
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('preserves actor order in party member list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(actorArbitrary, { minLength: 2, maxLength: 10 }),
          async (actors) => {
            const app = new PartyChronicleApp(actors);
            const context = await app._prepareContext() as PartyChronicleContext;
            
            // The order of party members should match the order of actors
            actors.forEach((actor, index) => {
              expect(context.partyMembers[index].id).toBe(actor.id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('File Existence Check', () => {
    /**
     * **Validates: Requirements 5.3**
     * 
     * Tests the checkFileExists method to ensure it correctly verifies
     * file existence using HEAD requests and handles edge cases.
     * 
     * Feature: conditional-chronicle-path-visibility
     */
    
    beforeEach(() => {
      // Reset fetch mock before each test
      global.fetch = jest.fn();
    });

    it('returns false for empty paths', async () => {
      const app = new PartyChronicleApp([]);
      
      // Test empty string
      const result1 = await (app as any).checkFileExists('');
      expect(result1).toBe(false);
      
      // Verify fetch was not called for empty path
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('makes HEAD request for non-empty paths', async () => {
      const app = new PartyChronicleApp([]);
      const testPath = '/path/to/chronicle.pdf';
      
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });
      
      await (app as any).checkFileExists(testPath);
      
      // Verify HEAD request was made with correct path
      expect(global.fetch).toHaveBeenCalledWith(testPath, { method: 'HEAD' });
    });

    it('returns true for successful responses', async () => {
      const app = new PartyChronicleApp([]);
      const testPath = '/path/to/chronicle.pdf';
      
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });
      
      const result = await (app as any).checkFileExists(testPath);
      
      expect(result).toBe(true);
    });

    it('returns false for failed responses', async () => {
      const app = new PartyChronicleApp([]);
      const testPath = '/path/to/missing.pdf';
      
      // Mock failed response (404)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      });
      
      const result = await (app as any).checkFileExists(testPath);
      
      expect(result).toBe(false);
    });

    it('handles network errors gracefully and returns false', async () => {
      const app = new PartyChronicleApp([]);
      const testPath = '/path/to/chronicle.pdf';
      
      // Mock network error
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);
      
      // Enable debug mode so Logger emits debug messages
      (game.settings.get as jest.Mock).mockImplementation((_mod: string, key: string) => {
        if (key === 'debugMode') return true;
        return '';
      });
      
      // Mock console.log to verify error logging
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await (app as any).checkFileExists(testPath);
      
      expect(result).toBe(false);
      // Check that the error was logged via Logger (prefix is separate arg)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[PFS Chronicle]',
        `Chronicle path file not accessible: ${testPath}`,
        networkError
      );
      
      consoleLogSpy.mockRestore();
    });

    it('handles various error types gracefully', async () => {
      const app = new PartyChronicleApp([]);
      const testPath = '/path/to/chronicle.pdf';
      
      // Test with different error types
      const errors = [
        new Error('Network error'),
        new TypeError('Failed to fetch'),
        'String error',
        { message: 'Object error' }
      ];
      
      for (const error of errors) {
        (global.fetch as jest.Mock).mockRejectedValue(error);
        
        const result = await (app as any).checkFileExists(testPath);
        expect(result).toBe(false);
      }
    });
  });

  describe('Context Preparation with File Existence Check', () => {
    /**
     * **Validates: Requirements 5.1, 5.2, 6.4**
     * 
     * Tests that _prepareContext correctly checks file existence and includes
     * the chroniclePathExists boolean in the context.
     * 
     * Feature: conditional-chronicle-path-visibility
     */
    
    beforeEach(() => {
      // Reset fetch mock before each test
      global.fetch = jest.fn();
    });

    it('sets chroniclePathExists to false when layout has no default (even if file exists)', async () => {
      const { loadPartyChronicleData } = require('./model/party-chronicle-storage');
      
      // Mock saved data with a chronicle path
      loadPartyChronicleData.mockResolvedValue({
        data: {
          shared: {
            blankChroniclePath: '/path/to/existing.pdf'
          }
        }
      });
      
      // Mock successful file existence check
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });
      
      const app = new PartyChronicleApp([]);
      const context = await app._prepareContext();
      
      // Verify chroniclePathExists is false because layout has no default
      // (field should remain visible so user can change it)
      expect(context.chroniclePathExists).toBe(false);
      
      // Verify file existence check was called
      expect(global.fetch).toHaveBeenCalledWith('/path/to/existing.pdf', { method: 'HEAD' });
    });

    it('sets chroniclePathExists to false when file does not exist', async () => {
      const { loadPartyChronicleData } = require('./model/party-chronicle-storage');
      
      // Mock saved data with a chronicle path
      loadPartyChronicleData.mockResolvedValue({
        data: {
          shared: {
            blankChroniclePath: '/path/to/missing.pdf'
          }
        }
      });
      
      // Mock failed file existence check (404)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      });
      
      const app = new PartyChronicleApp([]);
      const context = await app._prepareContext();
      
      // Verify chroniclePathExists is false
      expect(context.chroniclePathExists).toBe(false);
      
      // Verify file existence check was called
      expect(global.fetch).toHaveBeenCalledWith('/path/to/missing.pdf', { method: 'HEAD' });
    });

    it('sets chroniclePathExists to false when path is empty', async () => {
      const { loadPartyChronicleData } = require('./model/party-chronicle-storage');
      
      // Mock saved data with empty chronicle path
      loadPartyChronicleData.mockResolvedValue({
        data: {
          shared: {
            blankChroniclePath: ''
          }
        }
      });
      
      const app = new PartyChronicleApp([]);
      const context = await app._prepareContext();
      
      // Verify chroniclePathExists is false
      expect(context.chroniclePathExists).toBe(false);
      
      // Verify fetch was not called for empty path
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sets chroniclePathExists to false when no saved data exists', async () => {
      const { loadPartyChronicleData } = require('./model/party-chronicle-storage');
      
      // Mock no saved data
      loadPartyChronicleData.mockResolvedValue(null);
      
      const app = new PartyChronicleApp([]);
      const context = await app._prepareContext();
      
      // Verify chroniclePathExists is false
      expect(context.chroniclePathExists).toBe(false);
      
      // Verify fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls checkFileExists during context preparation', async () => {
      const { loadPartyChronicleData } = require('./model/party-chronicle-storage');
      
      // Mock saved data with a chronicle path
      loadPartyChronicleData.mockResolvedValue({
        data: {
          shared: {
            blankChroniclePath: '/path/to/chronicle.pdf'
          }
        }
      });
      
      // Mock successful file existence check
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true
      });
      
      const app = new PartyChronicleApp([]);
      
      // Spy on checkFileExists method
      const checkFileExistsSpy = jest.spyOn(app as any, 'checkFileExists');
      
      await app._prepareContext();
      
      // Verify checkFileExists was called with the correct path
      expect(checkFileExistsSpy).toHaveBeenCalledWith('/path/to/chronicle.pdf');
      
      checkFileExistsSpy.mockRestore();
    });

    it('handles network errors during file existence check', async () => {
      const { loadPartyChronicleData } = require('./model/party-chronicle-storage');
      
      // Mock saved data with a chronicle path
      loadPartyChronicleData.mockResolvedValue({
        data: {
          shared: {
            blankChroniclePath: '/path/to/chronicle.pdf'
          }
        }
      });
      
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      // Mock console.log to suppress error logging
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const app = new PartyChronicleApp([]);
      const context = await app._prepareContext();
      
      // Verify chroniclePathExists is false when error occurs
      expect(context.chroniclePathExists).toBe(false);
      
      consoleLogSpy.mockRestore();
    });
  });
});
