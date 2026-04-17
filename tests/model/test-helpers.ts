/**
 * Test helper functions for creating valid test data
 * 
 * This module provides helper functions to create test data that conforms
 * to the current type definitions, including all required reputation fields.
 */

import { SharedFields, UniqueFields, PartyChronicleData } from '../../scripts/model/party-chronicle-types';

/**
 * Creates valid SharedFields with all required fields including reputation
 * 
 * @param overrides - Partial SharedFields to override defaults
 * @returns Complete SharedFields object
 */
export function createSharedFields(overrides: Partial<SharedFields> = {}): SharedFields {
  return {
    gmPfsNumber: '12345-2001',
    scenarioName: 'Test Scenario',
    eventCode: 'TEST-001',
    eventDate: '2024-01-15',
    xpEarned: 4,
    adventureSummaryCheckboxes: [],
    strikeoutItems: [],
    treasureBundles: 2,
    layoutId: 'layout-1',
    seasonId: 'season-7',
    blankChroniclePath: '/path/to/chronicle.pdf',
    chosenFactionReputation: 4,
    reputationValues: {
      EA: 0,
      GA: 0,
      HH: 0,
      VS: 0,
      RO: 0,
      VW: 0
    },
    downtimeDays: 8,
    reportingA: false,
    reportingB: false,
    reportingC: false,
    reportingD: false,
    ...overrides
  };
}

/**
 * Creates valid UniqueFields with all required fields
 * 
 * @param overrides - Partial UniqueFields to override defaults
 * @returns Complete UniqueFields object
 */
export function createUniqueFields(overrides: Partial<UniqueFields> = {}): UniqueFields {
  return {
    characterName: 'Test Character',
    playerNumber: '12345',
    characterNumber: '2001',
    level: 5,
    taskLevel: 3,
    successLevel: 'success',
    proficiencyRank: 'trained',
    earnedIncome: 0,
    currencySpent: 5,
    notes: 'Test notes',
    consumeReplay: false,
    overrideXp: false,
    overrideXpValue: 0,
    overrideCurrency: false,
    overrideCurrencyValue: 0,
    ...overrides
  };
}

/**
 * Creates a mock actor object for testing
 * 
 * @param actorId - The actor ID
 * @param chosenFaction - The chosen faction code (EA, GA, HH, VS, RO, VW)
 * @returns Mock actor object
 */
export function createMockActor(actorId: string, chosenFaction: string = 'EA'): any {
  return {
    id: actorId,
    name: 'Test Character',
    img: '/path/to/image.png',
    system: {
      details: {
        level: { value: 5 }
      },
      pfs: {
        playerNumber: '12345',
        characterNumber: '01'
      }
    },
    getFlag: jest.fn((module: string, key: string) => {
      if (key === 'chosenFaction') return chosenFaction;
      return undefined;
    }),
    update: jest.fn(async () => {})
  };
}

/**
 * Creates valid PartyChronicleData with all required fields
 * 
 * @param sharedOverrides - Partial SharedFields to override defaults
 * @param characters - Character data indexed by actor ID
 * @returns Complete PartyChronicleData object
 */
export function createPartyChronicleData(
  sharedOverrides: Partial<SharedFields> = {},
  characters: { [actorId: string]: Partial<UniqueFields> } = {}
): PartyChronicleData {
  const characterData: { [actorId: string]: UniqueFields } = {};
  
  for (const [actorId, overrides] of Object.entries(characters)) {
    characterData[actorId] = createUniqueFields(overrides);
  }
  
  return {
    shared: createSharedFields(sharedOverrides),
    characters: characterData
  };
}
