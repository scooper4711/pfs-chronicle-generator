# Design Document: Party Chronicle Filling

## Overview

This feature adds party-level chronicle sheet filling functionality to the PFS Chronicle Generator module for Foundry VTT. It enables GMs to fill out chronicle information once for all party members through a new "PFS" tab on the Party sheet, significantly reducing repetitive data entry while maintaining support for character-specific information. The PFS tab is GM-only and will not be visible to players.

The design leverages the existing PDF generation infrastructure (PdfGenerator class) and extends the module's ApplicationV2-based UI pattern. The new PartyChronicleApp will be a separate application that collects both shared data (GM PFS Number, scenario name, XP, event details, treasure bundles) and character-specific data (character name, society ID, level, income, gold, notes, reputation) for each party member, then generates individual chronicles by combining the appropriate data for each character.

### Key Design Decisions

1. **Reuse Existing PDF Generation**: The PdfGenerator class and layout system will be reused without modification, ensuring consistency with individual chronicle generation.

2. **ApplicationV2 Architecture**: Following the established pattern from PFSChronicleGeneratorApp, the new PartyChronicleApp will extend ApplicationV2 with HandlebarsApplicationMixin.

3. **Tab Integration**: A new "PFS" tab will be added to the party sheet after the "stash" tab using Foundry's hook system. The tab will only be visible to GMs.

4. **Data Storage**: Party chronicle data will be stored as a world-level flag to persist across sessions and allow GMs to resume incomplete work.

5. **Style Consistency**: UI styling will follow the official Foundry VTT PF2E system conventions to maintain visual coherence.

## Architecture

### Component Structure

```
PartyChronicleApp (ApplicationV2)
├── Handlebars Template (party-chronicle-filling.hbs)
├── Data Model (PartyChronicleData)
├── Form Handler (generates PDFs via PdfGenerator)
└── Validation Logic

Integration Points:
├── renderPartySheet hook (adds PFS tab)
├── PdfGenerator (reused for PDF creation)
├── LayoutStore (reused for layout management)
└── World Flags (data persistence)
```

### Data Flow

1. GM opens Party sheet → clicks "PFS" tab
2. PartyChronicleApp renders with:
   - List of party members
   - Shared field inputs
   - Per-character unique field inputs
3. GM fills data → auto-saved to world flags
4. GM clicks "Generate Chronicles"
5. For each character:
   - Combine shared + unique data
   - Call PdfGenerator with character-specific data
   - Attach PDF to character's flags
6. Display success/failure notifications

### Hook Integration

The module will use the `renderApplication` hook to detect when the party sheet is rendered and inject the PFS tab. The tab will only be visible to users with GM permissions. This approach is compatible with ApplicationV2 and doesn't require modifying the PF2E system code.

## Components and Interfaces

### PartyChronicleApp Class

```typescript
export class PartyChronicleApp extends HandlebarsApplicationMixin(ApplicationV2) {
  partyActors: Actor[];
  
  constructor(partyActors: Actor[], options?: any);
  
  static DEFAULT_OPTIONS: {
    id: string;
    form: FormConfiguration;
    position: PositionConfiguration;
    window: WindowConfiguration;
  };
  
  static PARTS: {
    main: { template: string };
    footer: { template: string };
  };
  
  async _prepareContext(): Promise<PartyChronicleContext>;
  async _onRender(context: any, options: any): Promise<void>;
  
  private static async generateChronicles(
    event: SubmitEvent,
    form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void>;
  
  private validateSharedFields(data: any): ValidationResult;
  private validateUniqueFields(data: any): ValidationResult;
}
```

### Data Structures

```typescript
interface PartyChronicleData {
  // Shared fields (apply to all characters)
  shared: {
    gmPfsNumber: string;
    scenarioName: string;
    eventCode: string;
    eventDate: string;
    xpEarned: number;
    adventureSummaryCheckboxes: string[];
    strikeoutItems: string[];
    treasureBundles: number;  // Integer from 0-10
    layoutId: string;  // Selected layout from LayoutStore
    seasonId: string;  // Selected season from LayoutStore.getSeasons()
    blankChroniclePath: string;
  };
  
  // Character-specific fields (unique per character)
  characters: {
    [actorId: string]: {
      characterName: string;
      societyId: string;
      level: number;
      incomeEarned: number;
      goldEarned: number;
      goldSpent: number;
      notes: string;
      reputation: string;
    };
  };
}

interface PartyChronicleContext {
  partyMembers: Array<{
    id: string;
    name: string;
    level: number;
    societyId: string;
  }>;
  shared: SharedFieldsContext;
  seasons: Array<{ id: string; name: string }>;
  layoutsInSeason: Array<{ id: string; description: string }>;
  selectedSeasonId: string;
  selectedLayoutId: string;
  savedData: PartyChronicleData;
  buttons: Array<{ type: string; icon: string; label: string }>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### Template Structure

The Handlebars template will be organized into sections:

1. **Event Details Section** (shared fields)
   - GM PFS Number
   - Season selector (dropdown populated from LayoutStore.getSeasons())
   - Layout selector (dropdown populated from LayoutStore.getLayoutsByParent(selectedSeasonId))
   - Event date, code, name
   - Blank chronicle path display

2. **Shared Rewards Section**
   - XP earned
   - Treasure Bundles (integer input 0-10)
   - Adventure Summary Checkboxes (layout-dependent)
   - Items to strike out (layout-dependent)

3. **Character-Specific Section** (repeats for each party member)
   - Character header with editable fields:
     - Character name
     - Society ID
     - Level
   - Income Earned
   - Gold Earned
   - Gold Spent
   - Notes (textarea)
   - Reputation

4. **Action Buttons**
   - Generate Chronicles
   - Clear Data
   - Note: Manual Save button removed as auto-save handles persistence automatically on field changes

### Season and Layout Selection Logic

The season/layout selection follows the same pattern as PFSChronicleGeneratorApp:

1. **Season Selection**:
   - Seasons are retrieved from `LayoutStore.getSeasons()`, which returns an array of `{ id: string, name: string }` objects
   - Season IDs are directory names (e.g., "s5", "s6") and names are display names (e.g., "Season 5", "Season 6")
   - When a season is selected, the layout dropdown is updated to show only layouts in that season

2. **Layout Selection**:
   - Layouts for a season are retrieved using `LayoutStore.getLayoutsByParent(seasonId)`
   - This returns an array of `{ id: string, description: string }` objects
   - The layout ID is used to retrieve the actual layout configuration via `LayoutStore.getLayout(layoutId)`

3. **Season/Layout Synchronization**:
   - If a layout is selected that doesn't belong to the current season, the season is automatically adjusted to match the layout's parent season
   - If the current layout isn't in the newly selected season, the first layout in that season is automatically selected

4. **Event Handlers**:
   - Season change: Updates layout dropdown, selects first layout in season, triggers layout change, auto-saves
   - Layout change: Updates settings, re-renders form to show layout-specific fields (checkboxes, strikeout items), auto-saves
   - Field change: Auto-saves data to world flags (no manual save button needed)

## Data Models

### Storage Model

Party chronicle data will be stored as a world-level flag:

```typescript
// Storage location
game.settings.set('pfs-chronicle-generator', 'partyChronicleData', data);

// Flag structure
{
  timestamp: number;  // Last modified
  data: PartyChronicleData;
}
```

### Season and Layout Data Model

Seasons and layouts are managed by the LayoutStore singleton:

```typescript
// Get all available seasons
const seasons = layoutStore.getSeasons();
// Returns: Array<{ id: string, name: string }>
// Example: [{ id: "s5", name: "Season 5" }, { id: "s6", name: "Season 6" }]

// Get layouts for a specific season
const layouts = layoutStore.getLayoutsByParent(seasonId);
// Returns: Array<{ id: string, description: string }>
// Example: [
//   { id: "pfs2.s5.5-01", description: "5-01: Intro Year of Unfettered Exploration" },
//   { id: "pfs2.s5.5-02", description: "5-02: The Blackwood Lost" }
// ]

// Get a specific layout configuration
const layout = await layoutStore.getLayout(layoutId);
// Returns: Layout object with parameters, content, canvas, etc.
```

The season ID is used as a filter to show only relevant layouts. When the season changes, the layout dropdown is repopulated with layouts from that season.
```

### Character Data Mapping

When generating chronicles, the system maps party data to individual character data:

```typescript
function mapToCharacterData(
  shared: SharedFields,
  unique: UniqueFields,
  actor: Actor
): ChronicleData {
  return {
    // From character-specific fields
    char: unique.characterName,
    societyid: unique.societyId,
    level: unique.level,
    
    // From shared fields
    gmid: shared.gmPfsNumber,
    event: shared.scenarioName,
    eventcode: shared.eventCode,
    date: shared.eventDate,
    xp_gained: shared.xpEarned,
    summary_checkbox: shared.adventureSummaryCheckboxes,
    strikeout_item_lines: shared.strikeoutItems,
    treasure_bundles: shared.treasureBundles,
    
    // From character-specific fields
    income_earned: unique.incomeEarned,
    gp_gained: unique.goldEarned,
    gp_spent: unique.goldSpent,
    notes: unique.notes,
    reputation: unique.reputation,
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Party Member Listing Completeness

*For any* party composition, when the Party Chronicle Interface is rendered, the interface SHALL list all and only the player characters currently in the party.

**Validates: Requirements 1.3**

### Property 2: Shared Field Propagation

*For any* shared field value and any party composition, when a value is entered in a shared field, that value SHALL be applied to all player characters in the party and to no characters outside the party.

**Validates: Requirements 2.2**

### Property 3: Unique Field Isolation

*For any* unique field value and any player character, when a value is entered in a unique field for that character, the value SHALL be applied only to that specific character and SHALL NOT be applied to any other character.

**Validates: Requirements 3.2**

### Property 4: Per-Character Unique Field Provision

*For any* party composition, the Party Chronicle Interface SHALL provide unique field inputs for each player character in the party.

**Validates: Requirements 3.1**

### Property 5: Chronicle Generation Completeness

*For any* party composition and any valid chronicle data, when chronicle generation is triggered, a chronicle sheet SHALL be created for each player character using the entered data.

**Validates: Requirements 4.2**

### Property 6: Data Combination Correctness

*For any* player character, when their chronicle is generated, the chronicle SHALL contain both all shared field values and that character's specific unique field values.

**Validates: Requirements 4.3**

### Property 7: Generation Notification Completeness

*For any* chronicle generation attempt, when generation completes, the system SHALL notify the GM of success or failure status for each player character.

**Validates: Requirements 4.4**

### Property 8: Layout Processing Consistency

*For any* chronicle data and layout file, the PDF generated through the party interface SHALL be identical to a PDF generated through the individual character interface with the same data and layout.

**Validates: Requirements 5.2**

### Property 9: Missing Layout Error Handling

*For any* chronicle generation attempt, if a layout file is missing, the system SHALL display an error message to the GM and SHALL NOT generate a malformed chronicle.

**Validates: Requirements 5.3**

### Property 10: Shared Field Validation

*For any* chronicle data entry, when validation is performed, the system SHALL verify that all required shared fields are populated and SHALL report any missing required shared fields.

**Validates: Requirements 6.1**

### Property 11: Unique Field Validation

*For any* player character and any chronicle data entry, when validation is performed, the system SHALL verify that all required unique fields are populated for that character and SHALL report any missing required unique fields.

**Validates: Requirements 6.2**

### Property 12: Validation Error Reporting

*For any* validation failure, the system SHALL display error messages that specifically identify which fields need correction.

**Validates: Requirements 6.3**

### Property 13: Generation Blocking on Validation Errors

*For any* state where validation errors exist, the system SHALL prevent chronicle generation until all validation errors are resolved.

**Validates: Requirements 6.4**

### Property 14: Chronicle Attachment Correctness

*For any* chronicle generated from the party interface, the chronicle SHALL be attached to the corresponding player character's actor flags.

**Validates: Requirements 7.1**

### Property 15: Download Functionality Equivalence

*For any* chronicle (whether generated from party interface or individual interface), the download functionality SHALL behave identically, producing the same PDF file for the same chronicle data.

**Validates: Requirements 7.3**

### Property 16: Data Persistence Round-Trip

*For any* chronicle data entered in the Party Chronicle Interface, when the interface is closed and reopened, the system SHALL restore all previously entered data without loss or corruption.

**Validates: Requirements 8.2**

### Property 17: Data Cleanup After Generation

*For any* successful chronicle generation, when all chronicles are generated successfully, the system SHALL clear the saved party chronicle data.

**Validates: Requirements 8.3**

## Error Handling

### Validation Errors

The system will validate data at multiple points:

1. **Field-Level Validation** (on blur/change):
   - Required field presence
   - Data type correctness (numbers, dates)
   - Format validation (society IDs, event codes)

2. **Form-Level Validation** (on submit):
   - All required shared fields populated
   - All required unique fields populated for each character
   - Layout file exists and is accessible

Error Display Strategy:
- Inline errors next to invalid fields (red border + message)
- Summary error panel at top of form
- Disable "Generate Chronicles" button while errors exist
- Provide clear, actionable error messages

### PDF Generation Errors

Errors during PDF generation will be handled per-character:

```typescript
interface GenerationResult {
  characterId: string;
  characterName: string;
  success: boolean;
  error?: string;
}
```

Error scenarios:
- Layout file not found → Error notification, skip character
- PDF template not accessible → Error notification, skip character
- PDF generation failure → Error notification, skip character
- Actor flag update failure → Error notification, PDF generated but not attached

The system will continue processing remaining characters even if one fails, then display a summary of all results.

### Data Persistence Errors

If auto-save fails:
- Log error to console
- Display warning notification
- Continue allowing user to work
- Retry save on next change

If data restoration fails:
- Log error to console
- Start with empty form
- Notify user that previous data couldn't be loaded

## Testing Strategy

### Dual Testing Approach

This feature will employ both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests** will focus on:
- Specific UI interactions (button clicks, form submissions)
- Integration points (hook registration, tab injection)
- Edge cases (empty party, single character, missing data)
- Error conditions (missing layouts, invalid data)

**Property-Based Tests** will focus on:
- Universal properties across all inputs (data propagation, validation)
- Comprehensive input coverage through randomization
- Invariants that must hold regardless of party composition

### Property-Based Testing Configuration

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with reference to design property
- Tag format: `Feature: party-chronicle-filling, Property {number}: {property_text}`

**Test Structure**:
```typescript
import fc from 'fast-check';

// Example property test
describe('Property 2: Shared Field Propagation', () => {
  it('applies shared field values to all party members', () => {
    // Feature: party-chronicle-filling, Property 2: Shared field values apply to all characters
    fc.assert(
      fc.property(
        fc.array(fc.record({ /* actor generator */ }), { minLength: 1, maxLength: 10 }),
        fc.string(),
        fc.oneof(fc.string(), fc.integer(), fc.date()),
        (actors, fieldName, fieldValue) => {
          // Test that shared field applies to all actors
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Focus Areas

1. **UI Component Tests**:
   - Tab injection on party sheet render
   - Form rendering with party members
   - Button state management (enabled/disabled)

2. **Data Transformation Tests**:
   - Mapping party data to individual character data
   - Combining shared and unique fields
   - Data structure serialization/deserialization

3. **Integration Tests**:
   - Hook registration and execution
   - PdfGenerator integration
   - Flag storage and retrieval

4. **Edge Case Tests**:
   - Empty party (no characters)
   - Single character party
   - Large party (10+ characters)
   - Missing optional fields
   - Partial data entry

### Test Data Generators

For property-based tests, generators will create:
- Random party compositions (1-10 characters)
- Random actor data (names, levels, society IDs)
- Random chronicle data (shared and unique fields)
- Random layout configurations

### Mocking Strategy

Tests will mock:
- Foundry VTT game object and APIs
- Actor objects and their flags
- PdfGenerator (for unit tests, not integration tests)
- File system access (for layout loading)

### Coverage Goals

- Line coverage: >80%
- Branch coverage: >75%
- Property test coverage: All 17 correctness properties
- Unit test coverage: All UI interactions and edge cases
