# Design Document: Multi-Line Reputation Tracking

## Overview

This feature adds multi-line reputation tracking to the PFS Chronicle Generator's party chronicle filling interface. The design follows the existing architectural patterns where:

1. **Shared reputation values** are entered once in the sidebar (above Shared Rewards)
2. **Character's chosen faction** is read from actor data (`actor.system.pfs.currentFaction`)
3. **Reputation calculation** happens during PDF generation by combining:
   - The character's chosen faction bonus (from "Chosen Faction" field)
   - Any faction-specific bonuses (from individual faction fields)
4. **Multi-line reputation output** appears in the generated chronicle PDF

This design respects the hybrid ApplicationV2 architecture where:
- UI structure is defined in `templates/party-chronicle-filling.hbs`
- Context preparation happens in `PartyChronicleApp._prepareContext()`
- Event listeners are attached in `main.ts` → `renderPartyChronicleForm()`
- Data logic resides in `scripts/model/` modules

The reputation calculation is invisible to the GM during data entry and only executes during the mapping phase when generating PDFs.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Party Chronicle Form                      │
│  (templates/party-chronicle-filling.hbs)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Sidebar (Shared Fields)
                              │  └─ Shared Reputation Section (NEW)
                              │     ├─ Chosen Faction: [2]
                              │     ├─ Envoy's Alliance: [0]
                              │     ├─ Grand Archive: [0]
                              │     ├─ Horizon Hunters: [0]
                              │     ├─ Vigilant Seal: [0]
                              │     ├─ Radiant Oath: [0]
                              │     └─ Verdant Wheel: [0]
                              │
                              └─ Character Sections (Unique Fields)
                                 └─ NO reputation field (removed)
                                 
                              ↓ (on Generate Chronicles)
                              
┌─────────────────────────────────────────────────────────────┐
│              party-chronicle-mapper.ts                       │
│  mapToCharacterData(shared, unique, actor)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Calls calculateReputation()
                              │  ├─ Reads actor.system.pfs.currentFaction
                              │  ├─ Combines chosen faction bonus
                              │  ├─ Adds faction-specific bonuses
                              │  ├─ Filters zero values
                              │  ├─ Formats as "Faction: +X"
                              │  └─ Sorts alphabetically
                              │
                              └─ Returns ChronicleData with
                                 reputation: ["Envoy's Alliance: +4", "Grand Archive: +2"]
                                 
                              ↓
                              
┌─────────────────────────────────────────────────────────────┐
│                    PdfGenerator.ts                           │
│  Renders multi-line reputation to PDF                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input Phase** (GM enters data):
   - GM enters shared reputation values in sidebar
   - Auto-save persists to `SharedFields.reputationValues` and `SharedFields.chosenFactionReputation`
   - No per-character reputation field visible

2. **Storage Phase**:
   - Reputation data stored in world flags via `party-chronicle-storage`
   - Structure: `{ shared: { reputationValues: { EA: 2, GA: 1 }, chosenFactionReputation: 2 } }`

3. **Calculation Phase** (during PDF generation):
   - `party-chronicle-mapper` calls `calculateReputation(shared, actor)`
   - Reads `actor.system.pfs.currentFaction` (e.g., "EA")
   - Builds reputation map: `{ EA: 2 (faction-specific) + 2 (chosen) = 4, GA: 1 }`
   - Filters zeros, formats, sorts
   - Returns: `["Envoy's Alliance: +4", "Grand Archive: +1"]`

4. **Output Phase**:
   - Returns reputation as array: `["Envoy's Alliance: +4", "Grand Archive: +1"]`
   - Passes to `PdfGenerator` which renders each line to PDF


## Components and Interfaces

### 1. UI Components (Template Changes)

**File**: `templates/party-chronicle-filling.hbs`

**New Section**: Shared Reputation Section (inserted above "Shared Rewards")

```handlebars
<li class="box summary">
    <header>Reputation</header>
    <div class="summary-data">
        <div class="form-group">
            <label for="chosenFactionReputation">Chosen Faction</label>
            <input type="number" id="chosenFactionReputation" 
                   name="shared.chosenFactionReputation" 
                   value="{{shared.chosenFactionReputation}}" 
                   min="0" max="9">
        </div>
        
        <div class="form-group">
            <label for="reputation-EA">Envoy's Alliance</label>
            <input type="number" id="reputation-EA" 
                   name="shared.reputationValues.EA" 
                   value="{{lookup shared.reputationValues 'EA'}}" 
                   min="0" max="9">
        </div>
        
        {{!-- Similar inputs for GA, HH, VS, RO, VW --}}
    </div>
</li>
```

**Removed**: Reputation field from per-character section (currently at line ~120)

### 2. Data Model Changes

**File**: `scripts/model/party-chronicle-types.ts`

**Modified Interface**: `SharedFields`

```typescript
export interface SharedFields {
  // ... existing fields ...
  
  /** Reputation bonus for character's chosen faction (0-9) */
  chosenFactionReputation: number;
  
  /** Faction-specific reputation bonuses (0-9 each) */
  reputationValues: {
    EA: number;
    GA: number;
    HH: number;
    VS: number;
    RO: number;
    VW: number;
  };
}
```

**Modified Interface**: `UniqueFields`

```typescript
export interface UniqueFields {
  // ... existing fields ...
  
  // REMOVED: reputation: string;
  // Reputation is now calculated, not stored per-character
}
```

### 3. Reputation Calculator

**File**: `scripts/model/reputation-calculator.ts` (NEW)

**Purpose**: Calculate multi-line reputation for a character during PDF generation

```typescript
/**
 * Calculates multi-line reputation for a character
 * 
 * @param shared - Shared fields containing reputation values
 * @param actor - Actor object to read chosen faction from
 * @returns Array of reputation lines (e.g., ["Envoy's Alliance: +4"])
 */
export function calculateReputation(
  shared: SharedFields,
  actor: any
): string[] {
  // Implementation details in next section
}
```


**Algorithm**:

1. Create empty reputation map: `{ EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }`
2. For each faction code in `['EA', 'GA', 'HH', 'VS', 'RO', 'VW']`:
   - Add `shared.reputationValues[factionCode]` to the map
3. Read `actor.system.pfs.currentFaction` (e.g., "EA")
4. If chosen faction exists and is valid:
   - Add `shared.chosenFactionReputation` to that faction's total
5. Filter out factions with value === 0
6. Map remaining factions to formatted strings:
   - Use `FACTION_NAMES` constant for full names
   - Format: `"${fullName}: ${value >= 0 ? '+' : ''}${value}"`
7. Sort alphabetically by faction name
8. Return array of reputation lines

**Example**:
```typescript
// Input:
shared = {
  chosenFactionReputation: 2,
  reputationValues: { EA: 2, GA: 1, HH: 0, VS: 0, RO: 0, VW: 0 }
}
actor.system.pfs.currentFaction = "EA"

// Output:
["Envoy's Alliance: +4", "Grand Archive: +1"]
```

### 4. Mapper Integration

**File**: `scripts/model/party-chronicle-mapper.ts`

**Modified Function**: `mapToCharacterData`

```typescript
export function mapToCharacterData(
  shared: SharedFields,
  unique: UniqueFields,
  actor: any  // NEW parameter
): ChronicleData {
  // Calculate reputation using the calculator
  const reputationLines = calculateReputation(shared, actor);
  
  return {
    // ... existing mappings ...
    reputation: reputationLines,  // Array of strings, not joined
    // ... rest of mappings ...
  };
}
```

**Note**: The mapper now requires the `actor` parameter to read `currentFaction`. All call sites in `main.ts` and `PartyChronicleApp.ts` must be updated.

### 5. Validation Changes

**File**: `scripts/model/party-chronicle-validator.ts`

**Modified Function**: `validateSharedFields`

```typescript
export function validateSharedFields(shared: Partial<SharedFields>): ValidationResult {
  const errors: string[] = [];
  
  // ... existing validations ...
  
  // Validate chosen faction reputation
  if (shared.chosenFactionReputation === undefined || shared.chosenFactionReputation === null) {
    errors.push('Chosen Faction reputation is required');
  } else if (typeof shared.chosenFactionReputation !== 'number') {
    errors.push('Chosen Faction reputation must be a number');
  } else if (!Number.isInteger(shared.chosenFactionReputation)) {
    errors.push('Chosen Faction reputation must be a whole number');
  } else if (shared.chosenFactionReputation < 0 || shared.chosenFactionReputation > 9) {
    errors.push('Chosen Faction reputation must be between 0 and 9');
  } else if (shared.chosenFactionReputation === 0) {
    errors.push('Chosen Faction reputation must be greater than 0');
  }
  
  // Validate faction-specific reputation values
  if (shared.reputationValues) {
    const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'];
    for (const code of factionCodes) {
      const value = shared.reputationValues[code];
      if (value !== undefined && value !== null) {
        if (typeof value !== 'number') {
          errors.push(`${FACTION_NAMES[code]} reputation must be a number`);
        } else if (!Number.isInteger(value)) {
          errors.push(`${FACTION_NAMES[code]} reputation must be a whole number`);
        } else if (value < 0 || value > 9) {
          errors.push(`${FACTION_NAMES[code]} reputation must be between 0 and 9`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

**Modified Function**: `validateUniqueFields`

Remove reputation validation (no longer a unique field).


### 6. Event Handling

**File**: `scripts/main.ts`

**Location**: `renderPartyChronicleForm()` function

**New Event Listeners** (following architecture constraints):

```typescript
// Reputation field change handlers (use native DOM APIs)
const reputationInputs = container.querySelectorAll(
  'input[name^="shared.reputationValues"], input[name="shared.chosenFactionReputation"]'
);
reputationInputs.forEach((input) => {
  input.addEventListener('change', async () => {
    console.log('[PFS Chronicle] Reputation field changed');
    await saveFormData($container, partyActors);
    updateValidationDisplay($container, partyActors);
  });
});
```

**Note**: Following the hybrid architecture pattern:
- Event listeners MUST be added in `main.ts` → `renderPartyChronicleForm()`
- Use native DOM APIs (`querySelectorAll`, `addEventListener`)
- NOT in `PartyChronicleApp._onRender()` (it's never called)

### 7. Context Preparation

**File**: `scripts/PartyChronicleApp.ts`

**Modified Method**: `_prepareContext()`

```typescript
async _prepareContext(options?: any): Promise<object> {
  // ... existing code ...
  
  // Prepare shared fields context
  const shared: Partial<SharedFields> = {
    // ... existing fields ...
    chosenFactionReputation: savedData?.shared?.chosenFactionReputation ?? 2,
    reputationValues: savedData?.shared?.reputationValues ?? {
      EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0
    },
  };
  
  return {
    partyMembers,
    shared,
    // ... rest of context ...
  };
}
```

### 8. Form Data Extraction

**File**: `scripts/main.ts`

**Modified Function**: `extractFormData()`

```typescript
function extractFormData($container: any, partyActors: any[]): any {
  // ... existing code ...
  
  const shared: any = {
    // ... existing fields ...
    chosenFactionReputation: parseInt($container.find('#chosenFactionReputation').val() as string) || 2,
    reputationValues: {
      EA: parseInt($container.find('#reputation-EA').val() as string) || 0,
      GA: parseInt($container.find('#reputation-GA').val() as string) || 0,
      HH: parseInt($container.find('#reputation-HH').val() as string) || 0,
      VS: parseInt($container.find('#reputation-VS').val() as string) || 0,
      RO: parseInt($container.find('#reputation-RO').val() as string) || 0,
      VW: parseInt($container.find('#reputation-VW').val() as string) || 0,
    },
  };
  
  // Extract character-specific fields (reputation field removed)
  const characters: any = {};
  partyActors.forEach((actor: any) => {
    const actorId = actor.id;
    characters[actorId] = {
      // ... existing fields ...
      // REMOVED: reputation field
    };
  });
  
  return { shared, characters };
}
```


## Data Models

### SharedFields (Modified)

```typescript
export interface SharedFields {
  gmPfsNumber: string;
  scenarioName: string;
  eventCode: string;
  eventDate: string;
  xpEarned: number;
  adventureSummaryCheckboxes: string[];
  strikeoutItems: string[];
  treasureBundles: number;
  layoutId: string;
  seasonId: string;
  blankChroniclePath: string;
  
  // NEW: Reputation fields
  chosenFactionReputation: number;  // 0-9, default 2
  reputationValues: {
    EA: number;  // 0-9, default 0
    GA: number;
    HH: number;
    VS: number;
    RO: number;
    VW: number;
  };
}
```

### UniqueFields (Modified)

```typescript
export interface UniqueFields {
  characterName: string;
  societyId: string;
  level: number;
  incomeEarned: number;
  goldEarned: number;
  goldSpent: number;
  notes: string;
  
  // REMOVED: reputation: string;
  // Reputation is now calculated during mapping, not stored per-character
}
```

### ReputationMap (Internal)

```typescript
// Used internally by calculateReputation()
type ReputationMap = {
  [factionCode: string]: number;
};

// Example:
// { EA: 4, GA: 1, HH: 0, VS: 0, RO: 0, VW: 0 }
```

### FACTION_NAMES Constant

```typescript
// Already exists in PFSChronicleGeneratorApp.ts
// Will be imported and reused in reputation-calculator.ts
const FACTION_NAMES: Record<string, string> = {
  'EA': 'Envoy\'s Alliance',
  'GA': 'Grand Archive',
  'HH': 'Horizon Hunters',
  'VS': 'Vigilant Seal',
  'RO': 'Radiant Oath',
  'VW': 'Verdant Wheel'
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Reputation Input Validation

*For any* reputation input value (chosen faction or faction-specific), the validator should accept values that are integers between 0 and 9 (inclusive), and reject all other values.

**Validates: Requirements 1.4, 1.5, 6.1, 6.2**

### Property 2: Chosen Faction Reputation Non-Zero Validation

*For any* shared fields data where `chosenFactionReputation` is 0, the validator should reject the data and prevent chronicle generation.

**Validates: Requirements 6.3**

### Property 3: Auto-Save on Reputation Change

*For any* reputation input field change event, the form should trigger auto-save within 100ms and persist the updated reputation values to storage.

**Validates: Requirements 1.6, 7.1, 7.4, 4.3**

### Property 4: Reputation Data Persistence Round-Trip

*For any* valid reputation values (chosen faction and faction-specific), saving the data and then reloading the form should restore the exact same values to the input fields.

**Validates: Requirements 4.4**

### Property 5: Chosen Faction Not Stored

*For any* saved party chronicle data, the stored data should NOT contain a field for the character's chosen faction (it is read from actor data, not stored).

**Validates: Requirements 4.5**

### Property 6: Non-Zero Faction Inclusion

*For any* faction with a non-zero reputation value in the shared fields, that faction should appear in the calculated reputation map with its corresponding value.

**Validates: Requirements 2.2**

### Property 7: Zero Faction Exclusion

*For any* faction with a final reputation value of 0 (after combining faction-specific and chosen faction bonuses), that faction should NOT appear in the output reputation lines.

**Validates: Requirements 2.6**

### Property 8: Chosen Faction Bonus Addition

*For any* character with a valid chosen faction, the reputation calculator should add the `chosenFactionReputation` value to that faction's total in the reputation map.

**Validates: Requirements 2.3, 2.4**

### Property 9: Reputation Line Formatting

*For any* faction with non-zero reputation, the output reputation line should match the format `"{Faction_Full_Name}: {+/-}{value}"` where the faction name comes from the FACTION_NAMES constant.

**Validates: Requirements 2.5, 2.7, 8.2**

### Property 10: Reputation Line Sorting

*For any* set of reputation lines, the output array should be sorted alphabetically by faction full name.

**Validates: Requirements 2.8**

### Property 11: Reputation Mapping to ChronicleData

*For any* character, the reputation field in ChronicleData should contain the calculated reputation lines as an array of strings.

**Validates: Requirements 5.1, 5.2**

### Property 12: Empty Reputation Handling

*For any* character with no reputation (all factions have 0 value after calculation), the reputation field in ChronicleData should be an empty array.

**Validates: Requirements 5.3**

### Property 13: Validation Error UI Feedback

*For any* validation error in reputation fields, the form should display error messages in the validation panel and disable the "Generate Chronicles" button.

**Validates: Requirements 6.4**


## Error Handling

### Input Validation Errors

**Scenario**: User enters invalid reputation values

**Handling**:
1. Validator detects invalid values (non-integer, out of range, chosen faction = 0)
2. Validation errors added to error array
3. `updateValidationDisplay()` shows errors in validation panel
4. Generate Chronicles button disabled
5. User corrected values → validation re-runs → errors clear → button enabled

**Example Error Messages**:
- "Chosen Faction reputation must be between 0 and 9"
- "Chosen Faction reputation must be greater than 0"
- "Envoy's Alliance reputation must be a whole number"
- "Grand Archive reputation must be between 0 and 9"

### Missing Chosen Faction

**Scenario**: Character has no `currentFaction` set in actor data

**Handling**:
1. `calculateReputation()` reads `actor.system.pfs.currentFaction`
2. If undefined/null/empty, skip adding chosen faction bonus
3. Only faction-specific bonuses included in output
4. No error thrown (valid scenario for characters without faction affiliation)

**Example**:
```typescript
// Character has no chosen faction
actor.system.pfs.currentFaction = null

// Input:
shared = { chosenFactionReputation: 2, reputationValues: { EA: 3, GA: 0, ... } }

// Output: Only EA appears (no chosen faction bonus added)
["Envoy's Alliance: +3"]
```

### Invalid Faction Code

**Scenario**: Character has invalid faction code in actor data

**Handling**:
1. `calculateReputation()` checks if faction code exists in FACTION_NAMES
2. If not found, log warning and skip chosen faction bonus
3. Continue with faction-specific bonuses
4. No error thrown (defensive programming)

```typescript
if (chosenFaction && FACTION_NAMES[chosenFaction]) {
  reputationMap[chosenFaction] += shared.chosenFactionReputation;
} else if (chosenFaction) {
  console.warn(`[PFS Chronicle] Unknown faction code: ${chosenFaction}`);
}
```

### Auto-Save Failures

**Scenario**: Auto-save fails due to permission or storage issues

**Handling**:
1. `saveFormData()` catches errors from `savePartyChronicleData()`
2. Logs error to console
3. Shows warning notification: "Failed to auto-save chronicle data"
4. User can manually click Save button to retry
5. Data remains in form (not lost)

### PDF Generation with Missing Actor Data

**Scenario**: Actor object missing during PDF generation

**Handling**:
1. `generateChroniclesFromForm()` iterates through `partyActors`
2. If actor is null/undefined, skip that character
3. Record failure in results array
4. Continue with remaining characters
5. Show summary: "Generated X chronicles, but Y failed"


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Both are complementary and necessary. Unit tests catch concrete bugs, while property tests verify general correctness across a wide range of inputs.

### Unit Testing

**Focus Areas**:
1. Specific examples demonstrating correct behavior
2. Edge cases (empty reputation, missing faction, invalid codes)
3. Integration points between components
4. UI structure validation

**Example Unit Tests**:

```typescript
describe('Reputation Calculator', () => {
  it('should calculate reputation for character with chosen faction', () => {
    const shared = {
      chosenFactionReputation: 2,
      reputationValues: { EA: 2, GA: 1, HH: 0, VS: 0, RO: 0, VW: 0 }
    };
    const actor = { system: { pfs: { currentFaction: 'EA' } } };
    
    const result = calculateReputation(shared, actor);
    
    expect(result).toEqual(["Envoy's Alliance: +4", "Grand Archive: +1"]);
  });
  
  it('should handle character with no chosen faction', () => {
    const shared = {
      chosenFactionReputation: 2,
      reputationValues: { EA: 3, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
    };
    const actor = { system: { pfs: { currentFaction: null } } };
    
    const result = calculateReputation(shared, actor);
    
    expect(result).toEqual(["Envoy's Alliance: +3"]);
  });
  
  it('should return empty array when all factions are zero', () => {
    const shared = {
      chosenFactionReputation: 2,
      reputationValues: { EA: 0, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
    };
    const actor = { system: { pfs: { currentFaction: null } } };
    
    const result = calculateReputation(shared, actor);
    
    expect(result).toEqual([]);
  });
  
  it('should sort reputation lines alphabetically', () => {
    const shared = {
      chosenFactionReputation: 0,
      reputationValues: { EA: 0, GA: 0, HH: 0, VS: 2, RO: 0, VW: 1 }
    };
    const actor = { system: { pfs: { currentFaction: null } } };
    
    const result = calculateReputation(shared, actor);
    
    // Radiant Oath comes before Verdant Wheel alphabetically
    expect(result).toEqual(["Radiant Oath: +2", "Verdant Wheel: +1"]);
  });
});

describe('Reputation Validation', () => {
  it('should reject chosen faction reputation of 0', () => {
    const shared = { chosenFactionReputation: 0, reputationValues: { ... } };
    
    const result = validateSharedFields(shared);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Chosen Faction reputation must be greater than 0');
  });
  
  it('should reject faction reputation values outside 0-9 range', () => {
    const shared = {
      chosenFactionReputation: 2,
      reputationValues: { EA: 10, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
    };
    
    const result = validateSharedFields(shared);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Envoy's Alliance reputation must be between 0 and 9");
  });
});
```


### Property-Based Testing

**Property Testing Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**: Minimum 100 iterations per property test (due to randomization)

**Test Tagging**: Each property test must reference its design document property
- Format: `// Feature: multi-line-reputation-tracking, Property X: [property text]`

**Example Property Tests**:

```typescript
import fc from 'fast-check';

describe('Reputation Calculator Properties', () => {
  // Feature: multi-line-reputation-tracking, Property 6: Non-Zero Faction Inclusion
  it('should include all factions with non-zero values in output', () => {
    fc.assert(
      fc.property(
        fc.record({
          chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
          reputationValues: fc.record({
            EA: fc.integer({ min: 0, max: 9 }),
            GA: fc.integer({ min: 0, max: 9 }),
            HH: fc.integer({ min: 0, max: 9 }),
            VS: fc.integer({ min: 0, max: 9 }),
            RO: fc.integer({ min: 0, max: 9 }),
            VW: fc.integer({ min: 0, max: 9 }),
          }),
        }),
        fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW', null),
        (shared, chosenFaction) => {
          const actor = { system: { pfs: { currentFaction: chosenFaction } } };
          const result = calculateReputation(shared, actor);
          
          // Check that all non-zero factions appear in output
          const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'];
          for (const code of factionCodes) {
            let expectedValue = shared.reputationValues[code];
            if (code === chosenFaction) {
              expectedValue += shared.chosenFactionReputation;
            }
            
            if (expectedValue > 0) {
              const factionName = FACTION_NAMES[code];
              const found = result.some(line => line.startsWith(factionName));
              expect(found).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: multi-line-reputation-tracking, Property 7: Zero Faction Exclusion
  it('should exclude all factions with zero final value from output', () => {
    fc.assert(
      fc.property(
        fc.record({
          chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
          reputationValues: fc.record({
            EA: fc.integer({ min: 0, max: 9 }),
            GA: fc.integer({ min: 0, max: 9 }),
            HH: fc.integer({ min: 0, max: 9 }),
            VS: fc.integer({ min: 0, max: 9 }),
            RO: fc.integer({ min: 0, max: 9 }),
            VW: fc.integer({ min: 0, max: 9 }),
          }),
        }),
        fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW', null),
        (shared, chosenFaction) => {
          const actor = { system: { pfs: { currentFaction: chosenFaction } } };
          const result = calculateReputation(shared, actor);
          
          // Check that all zero-value factions are excluded
          const factionCodes = ['EA', 'GA', 'HH', 'VS', 'RO', 'VW'];
          for (const code of factionCodes) {
            let expectedValue = shared.reputationValues[code];
            if (code === chosenFaction) {
              expectedValue += shared.chosenFactionReputation;
            }
            
            if (expectedValue === 0) {
              const factionName = FACTION_NAMES[code];
              const found = result.some(line => line.startsWith(factionName));
              expect(found).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: multi-line-reputation-tracking, Property 9: Reputation Line Formatting
  it('should format all reputation lines correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
          reputationValues: fc.record({
            EA: fc.integer({ min: 0, max: 9 }),
            GA: fc.integer({ min: 0, max: 9 }),
            HH: fc.integer({ min: 0, max: 9 }),
            VS: fc.integer({ min: 0, max: 9 }),
            RO: fc.integer({ min: 0, max: 9 }),
            VW: fc.integer({ min: 0, max: 9 }),
          }),
        }),
        fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW', null),
        (shared, chosenFaction) => {
          const actor = { system: { pfs: { currentFaction: chosenFaction } } };
          const result = calculateReputation(shared, actor);
          
          // Check format: "{Faction_Full_Name}: {+/-}{value}"
          const formatRegex = /^[A-Za-z' ]+: [+-]\d+$/;
          for (const line of result) {
            expect(line).toMatch(formatRegex);
            
            // Verify faction name is from FACTION_NAMES
            const colonIndex = line.indexOf(':');
            const factionName = line.substring(0, colonIndex);
            const isValidFaction = Object.values(FACTION_NAMES).includes(factionName);
            expect(isValidFaction).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: multi-line-reputation-tracking, Property 10: Reputation Line Sorting
  it('should sort reputation lines alphabetically', () => {
    fc.assert(
      fc.property(
        fc.record({
          chosenFactionReputation: fc.integer({ min: 1, max: 9 }),
          reputationValues: fc.record({
            EA: fc.integer({ min: 0, max: 9 }),
            GA: fc.integer({ min: 0, max: 9 }),
            HH: fc.integer({ min: 0, max: 9 }),
            VS: fc.integer({ min: 0, max: 9 }),
            RO: fc.integer({ min: 0, max: 9 }),
            VW: fc.integer({ min: 0, max: 9 }),
          }),
        }),
        fc.constantFrom('EA', 'GA', 'HH', 'VS', 'RO', 'VW', null),
        (shared, chosenFaction) => {
          const actor = { system: { pfs: { currentFaction: chosenFaction } } };
          const result = calculateReputation(shared, actor);
          
          // Check that result is sorted alphabetically
          for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1];
            const curr = result[i];
            expect(prev.localeCompare(curr)).toBeLessThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Reputation Validation Properties', () => {
  // Feature: multi-line-reputation-tracking, Property 1: Reputation Input Validation
  it('should accept all valid reputation values (0-9 integers)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9 }),
        (value) => {
          const shared = {
            chosenFactionReputation: value === 0 ? 1 : value, // Avoid chosen=0 validation
            reputationValues: { EA: value, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
          };
          
          const result = validateSharedFields(shared);
          
          // Should not have errors about value being out of range
          const hasRangeError = result.errors.some(e => 
            e.includes('must be between 0 and 9') || 
            e.includes('must be a whole number')
          );
          expect(hasRangeError).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: multi-line-reputation-tracking, Property 1: Reputation Input Validation
  it('should reject all invalid reputation values (outside 0-9 or non-integer)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 10, max: 100 }),  // Too high
          fc.integer({ min: -100, max: -1 }), // Negative
          fc.double({ min: 0.1, max: 8.9 })   // Non-integer
        ),
        (value) => {
          const shared = {
            chosenFactionReputation: 2,
            reputationValues: { EA: value, GA: 0, HH: 0, VS: 0, RO: 0, VW: 0 }
          };
          
          const result = validateSharedFields(shared);
          
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Test Scenarios**:
1. End-to-end: Enter reputation → save → reload → generate PDF → verify output
2. Multi-character: Different chosen factions → verify each gets correct reputation
3. UI interaction: Change reputation field → verify auto-save → verify validation
4. Error recovery: Invalid input → error shown → correct input → error cleared

**Test Environment**: Use Foundry VTT test harness or mock Foundry APIs


## Implementation Notes

### Architecture Compliance

This design strictly follows the hybrid ApplicationV2 architecture:

1. **Template Changes** (`templates/party-chronicle-filling.hbs`):
   - Add Shared Reputation Section in sidebar
   - Remove reputation field from per-character section
   - Use Handlebars syntax for data binding

2. **Context Preparation** (`PartyChronicleApp._prepareContext()`):
   - Add `chosenFactionReputation` and `reputationValues` to shared context
   - Load saved values or use defaults
   - NO event listener attachment here

3. **Event Listeners** (`main.ts` → `renderPartyChronicleForm()`):
   - Attach change listeners to reputation inputs AFTER template rendering
   - Use native DOM APIs: `querySelectorAll()`, `addEventListener()`
   - Follow existing pattern of other field handlers
   - Trigger auto-save and validation on change

4. **Data Logic** (`scripts/model/`):
   - New file: `reputation-calculator.ts` for calculation logic
   - Modified: `party-chronicle-types.ts` for data structures
   - Modified: `party-chronicle-mapper.ts` to call calculator
   - Modified: `party-chronicle-validator.ts` for validation

### Code Reuse

**FACTION_NAMES Constant**:
- Already exists in `PFSChronicleGeneratorApp.ts`
- Export it for reuse in `reputation-calculator.ts`
- Ensures consistency between single-character and party forms

```typescript
// In PFSChronicleGeneratorApp.ts
export const FACTION_NAMES: Record<string, string> = {
  'EA': 'Envoy\'s Alliance',
  'GA': 'Grand Archive',
  'HH': 'Horizon Hunters',
  'VS': 'Vigilant Seal',
  'RO': 'Radiant Oath',
  'VW': 'Verdant Wheel'
};

// In reputation-calculator.ts
import { FACTION_NAMES } from '../PFSChronicleGeneratorApp.js';
```

### Migration from Per-Character Reputation

**Current State**: Reputation is a text field in UniqueFields, entered per-character

**New State**: Reputation is calculated from shared fields, not stored per-character

**Migration Strategy**:
1. Remove reputation input from template (per-character section)
2. Remove reputation field from UniqueFields interface
3. Remove reputation validation from validateUniqueFields
4. Add reputation calculation in mapper
5. Existing saved data with per-character reputation will be ignored (no migration needed)

**Backward Compatibility**:
- Old saved data with `characters[id].reputation` will be ignored
- New system reads from `shared.reputationValues` and `shared.chosenFactionReputation`
- No data migration required (GMs will re-enter reputation values)

### Performance Considerations

**Auto-Save Throttling**:
- Current implementation: Auto-save on every field change
- Reputation fields: 7 inputs (1 chosen + 6 factions)
- Risk: Rapid changes could trigger multiple saves
- Mitigation: Existing auto-save already handles this (async, non-blocking)
- Requirement: Auto-save completes within 100ms (Property 3)

**Calculation Performance**:
- Reputation calculation is O(n) where n = 6 factions
- Runs once per character during PDF generation
- Negligible performance impact (< 1ms per character)

**Validation Performance**:
- Validation runs on every field change
- Reputation validation: 7 fields × simple checks
- Negligible performance impact (< 1ms total)


### Call Site Updates

**mapToCharacterData() Signature Change**:

The mapper function now requires the `actor` parameter to read `currentFaction`. All call sites must be updated:

**Location 1**: `main.ts` → `generateChroniclesFromForm()`

```typescript
// BEFORE:
const chronicleData = mapToCharacterData(formData.shared, characterData);

// AFTER:
const chronicleData = mapToCharacterData(formData.shared, characterData, actor);
```

**Location 2**: `PartyChronicleApp.ts` → `#generateChronicles()`

```typescript
// BEFORE:
const chronicleData = mapToCharacterData(sharedFields, characterData);

// AFTER:
const chronicleData = mapToCharacterData(sharedFields, characterData, actor);
```

### Styling Considerations

**CSS Classes** (to be added to `css/style.css`):

```css
/* Reputation section styling */
.reputation-section {
  margin-bottom: 1rem;
}

.reputation-section .form-group {
  margin-bottom: 0.5rem;
}

.reputation-section label {
  font-weight: 500;
  color: var(--color-text-dark-primary);
}

.reputation-section input[type="number"] {
  width: 60px;
  text-align: center;
}

/* Validation error styling for reputation fields */
.reputation-section .form-group.has-error input {
  border-color: var(--color-border-error);
  background-color: var(--color-bg-error);
}

.reputation-section .field-error {
  color: var(--color-text-error);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

### Debugging and Logging

**Console Logging Strategy**:

```typescript
// In calculateReputation()
console.log('[PFS Chronicle] Calculating reputation for character:', actor.name);
console.log('[PFS Chronicle] Chosen faction:', actor.system.pfs.currentFaction);
console.log('[PFS Chronicle] Reputation map:', reputationMap);
console.log('[PFS Chronicle] Final reputation lines:', result);

// In event handlers (main.ts)
console.log('[PFS Chronicle] Reputation field changed');

// In validation
console.log('[PFS Chronicle] Reputation validation errors:', errors);
```

**Error Logging**:

```typescript
// In calculateReputation()
if (chosenFaction && !FACTION_NAMES[chosenFaction]) {
  console.warn(`[PFS Chronicle] Unknown faction code: ${chosenFaction}`);
}

// In auto-save
catch (error) {
  console.error('[PFS Chronicle] Auto-save failed:', error);
}
```


## Design Decisions and Rationale

### Decision 1: Shared vs Per-Character Reputation Entry

**Decision**: Reputation values are entered once in shared fields, not per-character

**Rationale**:
- PFS adventures award the same reputation to all characters
- Reduces data entry burden for GMs (enter once vs. N times)
- Aligns with existing pattern for XP and treasure bundles
- Character-specific reputation (chosen faction bonus) is automatic

**Trade-off**: Less flexibility for edge cases where characters earn different reputation
- Mitigation: GMs can adjust per-character in the generated PDF if needed

### Decision 2: Calculation During Mapping, Not During Entry

**Decision**: Reputation is calculated during PDF generation, not displayed during data entry

**Rationale**:
- Keeps UI simple (no live preview needed)
- Follows existing pattern (gold calculation happens during generation)
- Reduces complexity (no need to re-calculate on every change)
- Chosen faction is read from actor data, which may change between entry and generation

**Trade-off**: GM doesn't see final reputation until PDF is generated
- Mitigation: Reputation calculation is straightforward and predictable

### Decision 3: Chosen Faction Bonus as Separate Field

**Decision**: "Chosen Faction" bonus is a separate input field, not merged with faction-specific fields

**Rationale**:
- Clearly distinguishes between universal bonus (chosen faction) and adventure-specific bonuses
- Matches PFS rules where chosen faction bonus is always earned
- Makes it obvious to GMs that chosen faction gets extra reputation
- Default value of 2 matches typical PFS scenario rewards

**Trade-off**: One extra input field in the UI
- Benefit: Clarity and correctness outweigh the minor UI complexity

### Decision 4: Default Values

**Decision**: 
- Chosen Faction: default = 2
- Faction-specific: default = 0

**Rationale**:
- Most PFS scenarios award 2 reputation to chosen faction
- Faction-specific bonuses are less common (default to 0)
- Reduces data entry for typical scenarios
- GMs can adjust if scenario differs

### Decision 5: Validation Requirement (Chosen Faction > 0)

**Decision**: Chosen faction reputation must be greater than 0 to generate chronicles

**Rationale**:
- PFS scenarios always award reputation (minimum 1)
- Prevents accidental generation with no reputation
- If GM wants 0 reputation, they can set all faction-specific values to 0 and chosen faction to 1, then manually edit PDF

**Trade-off**: Slightly less flexible
- Benefit: Prevents common mistake of forgetting to set reputation

### Decision 6: Alphabetical Sorting

**Decision**: Reputation lines are sorted alphabetically by faction name

**Rationale**:
- Consistent, predictable output
- Easy to scan for specific factions
- Matches typical chronicle format
- No semantic ordering needed (all factions are equal)

### Decision 7: Native DOM APIs for New Code

**Decision**: Use native DOM APIs (`querySelectorAll`, `addEventListener`) for reputation field event listeners

**Rationale**:
- Aligns with Foundry VTT v12+ best practices
- Follows architecture guidance (use native DOM for new code)
- Existing jQuery code remains functional (no need to refactor)
- Future-proof for ApplicationV2 migration

### Decision 8: No Migration of Old Data

**Decision**: Don't migrate existing per-character reputation data to new shared format

**Rationale**:
- Old data structure is incompatible (text field vs. structured values)
- Migration would be complex and error-prone
- GMs will re-enter reputation when filling new chronicles
- Existing generated PDFs are unaffected (already have reputation baked in)

**Trade-off**: GMs lose in-progress reputation data
- Mitigation: This is acceptable since reputation entry is quick (7 fields)


## Security Considerations

### Input Validation

**Threat**: Malicious input in reputation fields

**Mitigation**:
- Client-side validation: Enforce 0-9 integer range
- Type checking: Ensure values are numbers, not strings or objects
- HTML input attributes: `type="number"`, `min="0"`, `max="9"`
- Validation before PDF generation: Reject invalid data

**Impact**: Low risk (single-player/trusted GM environment)

### Data Storage

**Threat**: Tampering with saved reputation data in world flags

**Mitigation**:
- Foundry VTT's permission system: Only GMs can modify world flags
- Validation on load: Check data types and ranges when loading saved data
- Sanitization: Parse integers, reject non-numeric values

**Impact**: Low risk (GM-only feature in trusted environment)

### Actor Data Access

**Threat**: Reading `actor.system.pfs.currentFaction` from untrusted actor

**Mitigation**:
- Defensive programming: Check if actor exists before accessing
- Null checks: Handle missing or invalid faction codes gracefully
- Validation: Verify faction code exists in FACTION_NAMES before using

```typescript
const chosenFaction = actor?.system?.pfs?.currentFaction;
if (chosenFaction && FACTION_NAMES[chosenFaction]) {
  // Safe to use
}
```

**Impact**: Low risk (actors are trusted game objects)

### PDF Generation

**Threat**: Injection of malicious content into PDF via reputation strings

**Mitigation**:
- Controlled formatting: Reputation strings are generated by code, not user input
- No HTML/script injection: PDF generator uses pdf-lib (binary format)
- Character escaping: pdf-lib handles text encoding safely

**Impact**: Very low risk (reputation values are numeric, faction names are constants)

## Accessibility Considerations

### Keyboard Navigation

**Requirement**: All reputation input fields must be keyboard-accessible

**Implementation**:
- Use semantic HTML: `<input type="number">` with `<label>`
- Tab order: Reputation fields follow natural document order
- Focus indicators: Browser default focus styles (can be enhanced with CSS)

### Screen Reader Support

**Requirement**: Screen readers must announce field labels and values

**Implementation**:
- Explicit labels: `<label for="reputation-EA">Envoy's Alliance</label>`
- ARIA attributes: Not needed (semantic HTML is sufficient)
- Error messages: Associate errors with fields using ARIA if needed

### Visual Clarity

**Requirement**: Reputation section must be visually distinct and easy to understand

**Implementation**:
- Clear section header: "Reputation"
- Grouped layout: All reputation fields in one section
- Consistent styling: Match existing form field styles
- Error highlighting: Red border and text for invalid fields

### Color Contrast

**Requirement**: Text and error messages must meet WCAG AA contrast ratios

**Implementation**:
- Use Foundry VTT's CSS variables for colors
- Error text: `var(--color-text-error)` (sufficient contrast)
- Labels: `var(--color-text-dark-primary)` (sufficient contrast)


## Future Enhancements

### Enhancement 1: Reputation Preview

**Description**: Show calculated reputation for each character in the UI before generating PDFs

**Benefits**:
- GM can verify reputation is correct before generation
- Reduces need to regenerate PDFs due to errors
- Provides immediate feedback

**Implementation**:
- Add read-only text field below each character's section
- Calculate reputation on field change (not just during generation)
- Update preview dynamically

**Complexity**: Medium (requires live calculation and UI updates)

### Enhancement 2: Reputation Templates

**Description**: Save and load reputation presets for common scenarios

**Benefits**:
- Faster data entry for repeated scenarios
- Consistency across sessions
- Useful for organized play

**Implementation**:
- Add "Save as Template" button
- Store templates in world flags or module settings
- Add dropdown to select and load templates

**Complexity**: Medium (requires template storage and UI)

### Enhancement 3: Negative Reputation

**Description**: Support negative reputation values (e.g., -2 for faction penalties)

**Benefits**:
- Handles edge cases where characters lose reputation
- More flexible for homebrew scenarios

**Implementation**:
- Change validation: Allow -9 to +9 range
- Update formatting: Already handles negative values (`${value >= 0 ? '+' : ''}${value}`)
- Update UI: Remove `min="0"` attribute

**Complexity**: Low (mostly validation changes)

### Enhancement 4: Faction-Specific Chosen Faction Bonus

**Description**: Allow different chosen faction bonuses per character (override shared value)

**Benefits**:
- Handles edge cases where characters earn different bonuses
- More flexible for complex scenarios

**Implementation**:
- Add optional per-character chosen faction bonus field
- Use per-character value if set, otherwise use shared value
- Update calculation logic

**Complexity**: Medium (requires UI and calculation changes)

**Trade-off**: Increases UI complexity, may confuse GMs

### Enhancement 5: Reputation History

**Description**: Track reputation changes over multiple sessions

**Benefits**:
- Useful for campaign play
- Helps GMs track long-term reputation trends

**Implementation**:
- Store reputation history in actor flags
- Add UI to view history
- Calculate cumulative reputation

**Complexity**: High (requires persistent storage and UI)

**Note**: This is beyond the scope of chronicle generation (more of a character sheet feature)


## Summary

This design document specifies the implementation of multi-line reputation tracking for the PFS Chronicle Generator's party chronicle filling feature. The key aspects are:

**Architecture Compliance**:
- Follows hybrid ApplicationV2 pattern strictly
- UI changes in template, event listeners in main.ts, data logic in model/
- Respects existing patterns and conventions

**Data Flow**:
- Shared reputation values entered once in sidebar
- Character's chosen faction read from actor data
- Reputation calculated during PDF generation (not during entry)
- Multi-line output formatted and sorted alphabetically

**Key Components**:
- New: `reputation-calculator.ts` for calculation logic
- Modified: `party-chronicle-types.ts`, `party-chronicle-mapper.ts`, `party-chronicle-validator.ts`
- Modified: Template, context preparation, event handlers, form extraction

**Testing Strategy**:
- Unit tests for specific examples and edge cases
- Property-based tests for universal correctness (100+ iterations)
- Integration tests for end-to-end workflows

**Design Decisions**:
- Shared entry reduces GM workload
- Calculation during mapping keeps UI simple
- Separate chosen faction field provides clarity
- Alphabetical sorting ensures consistency
- Native DOM APIs for future-proofing

The design is complete, testable, and ready for implementation.

