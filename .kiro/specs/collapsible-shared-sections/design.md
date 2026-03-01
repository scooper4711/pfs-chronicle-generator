# Design Document: Collapsible Shared Sections

## Overview

This feature adds collapsible functionality to the five shared sections in the party chronicle form's sidebar. The design follows the hybrid ApplicationV2 pattern established in the codebase, where event listeners are attached manually in `main.ts` and handler logic is extracted to dedicated modules.

The collapsible sections provide:
- Visual collapse/expand indicators (chevron icons)
- Summary text for sections with data (Event Details, Reputation, Shared Rewards)
- Persistent collapse state stored in browser localStorage
- Dynamic summary updates when field values change
- Full keyboard accessibility with ARIA attributes

This feature reduces visual clutter and allows GMs to focus on the sections they're actively editing while maintaining awareness of values in collapsed sections through summary text.

## Architecture

### Component Structure

The collapsible sections feature consists of four main components:

1. **Template Structure** (`templates/party-chronicle-filling.hbs`)
   - Section headers with chevron indicators and summary text containers
   - Collapsible content wrappers around existing form fields
   - ARIA attributes for accessibility

2. **Event Handlers** (`scripts/handlers/collapsible-section-handlers.ts`)
   - Click handlers for section header interactions
   - Keyboard handlers for Enter/Space key support
   - Field change handlers to update summary text
   - Storage integration for persistence

3. **Summary Generation** (`scripts/utils/summary-utils.ts`)
   - Functions to generate summary text for each section type
   - Formatting logic for reputation values, XP, treasure bundles
   - Handling of empty/default values

4. **Storage Integration** (`scripts/model/collapse-state-storage.ts`)
   - Save/load collapse state to/from localStorage
   - Default state configuration per section
   - Storage key management

### Integration Points

The feature integrates with existing code at these points:

- **`main.ts`**: Event listener attachment in `renderPartyChronicleForm()`
- **`party-chronicle-handlers.ts`**: Field change handlers trigger summary updates
- **`style.css`**: Styling for collapsed/expanded states, chevron indicators, summary text

### Data Flow

```
User clicks header
  ↓
Click handler in main.ts
  ↓
Toggle collapse state (handlers/collapsible-section-handlers.ts)
  ↓
Update DOM (add/remove 'collapsed' class)
  ↓
Save state to localStorage (model/collapse-state-storage.ts)
  ↓
Update ARIA attributes

User changes field value
  ↓
Field change handler (handlers/party-chronicle-handlers.ts)
  ↓
Update summary text (utils/summary-utils.ts)
  ↓
Update DOM (summary text element)
```

## Components and Interfaces

### Template Changes

The template structure for each collapsible section follows this pattern:

```handlebars
<li class="box summary collapsible-section" data-section-id="event-details">
    <header class="collapsible-header" role="button" tabindex="0" 
            aria-expanded="false" aria-controls="event-details-content">
        <span class="chevron">▶</span>
        <span class="section-title">Event Details</span>
        <span class="section-summary"></span>
    </header>
    <div class="summary-data collapsible-content" id="event-details-content">
        <!-- Existing form fields -->
    </div>
</li>
```

Key attributes:
- `data-section-id`: Unique identifier for the section (used for storage keys)
- `role="button"`: Indicates the header is interactive
- `tabindex="0"`: Makes the header keyboard focusable
- `aria-expanded`: Reflects current collapse state
- `aria-controls`: References the collapsible content element ID

### Handler Functions

**`scripts/handlers/collapsible-section-handlers.ts`**:

```typescript
/**
 * Handles click events on collapsible section headers
 */
export function handleSectionHeaderClick(
  event: MouseEvent, 
  container: HTMLElement
): void;

/**
 * Handles keyboard events on collapsible section headers
 */
export function handleSectionHeaderKeydown(
  event: KeyboardEvent, 
  container: HTMLElement
): void;

/**
 * Toggles the collapse state of a section
 */
export function toggleSectionCollapse(
  sectionId: string, 
  container: HTMLElement
): void;

/**
 * Updates the summary text for a specific section
 */
export function updateSectionSummary(
  sectionId: string, 
  container: HTMLElement
): void;

/**
 * Updates all section summaries
 */
export function updateAllSectionSummaries(container: HTMLElement): void;

/**
 * Initializes collapse states from storage when form is rendered
 */
export function initializeCollapseSections(container: HTMLElement): void;
```

### Summary Generation Functions

**`scripts/utils/summary-utils.ts`**:

```typescript
/**
 * Generates summary text for Event Details section
 */
export function generateEventDetailsSummary(container: HTMLElement): string;

/**
 * Generates summary text for Reputation section
 */
export function generateReputationSummary(container: HTMLElement): string;

/**
 * Generates summary text for Shared Rewards section
 */
export function generateSharedRewardsSummary(container: HTMLElement): string;
```

### Storage Functions

**`scripts/model/collapse-state-storage.ts`**:

```typescript
/**
 * Storage structure for collapse states
 */
interface CollapseStateStorage {
  [sectionId: string]: boolean; // true = collapsed, false = expanded
}

/**
 * Saves collapse state for a section to localStorage
 */
export function saveCollapseState(sectionId: string, isCollapsed: boolean): void;

/**
 * Loads collapse state for a section from localStorage
 */
export function loadCollapseState(sectionId: string): boolean | null;

/**
 * Gets the default collapse state for a section
 */
export function getDefaultCollapseState(sectionId: string): boolean;

/**
 * Loads all collapse states from localStorage
 */
export function loadAllCollapseStates(): CollapseStateStorage;
```

## Data Models

### Section Identifiers

The following section IDs are used throughout the feature:

- `event-details`: Event Details section
- `reputation`: Reputation section
- `shared-rewards`: Shared Rewards section
- `adventure-summary`: Adventure Summary section
- `items-to-strike-out`: Items to Strike Out section

### Default Collapse States

```typescript
const DEFAULT_COLLAPSE_STATES: CollapseStateStorage = {
  'event-details': true,      // collapsed by default
  'reputation': true,          // collapsed by default
  'shared-rewards': true,      // collapsed by default
  'adventure-summary': false,  // expanded by default
  'items-to-strike-out': false // expanded by default
};
```

### Storage Key

Collapse states are stored in localStorage under the key:
```
pfs-chronicle-generator.collapseSections
```

### Summary Text Formats

**Event Details**:
- With scenario name: `"Event Details - {scenario name}"`
- Without scenario name: `"Event Details - (No scenario name)"`

**Reputation**:
- With faction reputations: `"Reputation - +{chosen} ; EA: +{ea} ; GA: +{ga}"`
- Without faction reputations: `"Reputation - +{chosen}"`
- Only non-zero faction values are included
- Semicolons separate multiple values

**Shared Rewards**:
- Format: `"Shared Rewards - {xp} XP; {tb} TB"`
- Example: `"Shared Rewards - 4 XP; 3 TB"`



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following patterns of redundancy:

1. **Chevron display properties (1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 4.3, 4.4, 5.3, 5.4)**: These can be combined into a single property that states "for any section and any collapse state, the chevron indicator matches the state"

2. **Field visibility properties (1.8, 1.9, 2.10, 2.11, 3.7, 3.8, 4.5, 4.6, 5.5, 5.6)**: These can be combined into a single property that states "for any section, collapsed state determines field visibility"

3. **Header click toggle properties (1.2, 2.2, 3.2, 4.2, 5.2)**: These can be combined into a single property that states "for any section, clicking the header toggles collapse state"

4. **Summary update properties (7.1, 7.2, 7.3)**: These are section-specific and should remain separate as they test different summary generation logic

5. **Keyboard interaction properties (8.2, 8.3)**: These can be combined into a single property that states "for any section, Enter or Space key toggles collapse state"

This reflection reduces 40+ potential properties to approximately 15 unique, non-redundant properties.

### Property 1: Section headers contain chevron indicators

*For any* collapsible section, the section header should contain a chevron indicator element.

**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**

### Property 2: Chevron indicator reflects collapse state

*For any* collapsible section, when the section is collapsed, the chevron indicator should display "▶", and when the section is expanded, the chevron indicator should display "▼".

**Validates: Requirements 1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 4.3, 4.4, 5.3, 5.4**

### Property 3: Header click toggles collapse state

*For any* collapsible section and any initial collapse state, clicking the section header should toggle the collapse state to the opposite value.

**Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2**

### Property 4: Collapse state determines field visibility

*For any* collapsible section, when the section is collapsed, all form fields within the section should be hidden, and when the section is expanded, all form fields should be visible.

**Validates: Requirements 1.8, 1.9, 2.10, 2.11, 3.7, 3.8, 4.5, 4.6, 5.5, 5.6**

### Property 5: Event Details summary contains scenario name

*For any* non-empty scenario name value, when the Event Details section is collapsed, the summary text should contain the scenario name in the format "Event Details - {scenario name}".

**Validates: Requirements 1.5**

### Property 6: Reputation summary contains chosen faction value

*For any* chosen faction reputation value, when the Reputation section is collapsed, the summary text should contain the chosen faction value in the format "Reputation - +{value}".

**Validates: Requirements 2.5**

### Property 7: Reputation summary includes non-zero faction values

*For any* set of faction reputation values where at least one faction has a non-zero value, when the Reputation section is collapsed, the summary text should include all non-zero faction values in the format "FACTION: +{value}" separated by semicolons.

**Validates: Requirements 2.6**

### Property 8: Shared Rewards summary contains XP and treasure bundles

*For any* XP earned value and treasure bundles value, when the Shared Rewards section is collapsed, the summary text should contain both values in the format "Shared Rewards - {xp} XP; {tb} TB".

**Validates: Requirements 3.5**

### Property 9: Collapse state persists to storage

*For any* collapsible section and any collapse state change, the new collapse state should be saved to browser localStorage.

**Validates: Requirements 6.1**

### Property 10: Collapse state restores from storage

*For any* set of saved collapse states, when the form is rendered, each section's collapse state should match the saved state from localStorage.

**Validates: Requirements 6.2**

### Property 11: Event Details summary updates on field change

*For any* scenario name field value change, the Event Details section summary text should update to reflect the new scenario name value.

**Validates: Requirements 7.1**

### Property 12: Reputation summary updates on field change

*For any* reputation field value change (chosen faction or individual faction), the Reputation section summary text should update to reflect the new reputation values.

**Validates: Requirements 7.2**

### Property 13: Shared Rewards summary updates on field change

*For any* XP earned or treasure bundles field value change, the Shared Rewards section summary text should update to reflect the new values.

**Validates: Requirements 7.3**

### Property 14: Summary updates regardless of collapse state

*For any* collapsible section with summary text and any field value change, the summary text should update regardless of whether the section is currently collapsed or expanded.

**Validates: Requirements 7.4**

### Property 15: Keyboard interaction toggles collapse state

*For any* collapsible section with focus and any initial collapse state, pressing the Enter key or Space key should toggle the collapse state to the opposite value.

**Validates: Requirements 8.2, 8.3**

### Property 16: ARIA expanded attribute reflects collapse state

*For any* collapsible section and any collapse state, the section header's aria-expanded attribute should be "true" when expanded and "false" when collapsed.

**Validates: Requirements 8.4**

### Property 17: Section headers are keyboard focusable

*For any* collapsible section, the section header should be keyboard focusable (either naturally focusable or have tabindex="0").

**Validates: Requirements 8.1**

### Property 18: Section headers have required ARIA attributes

*For any* collapsible section, the section header should have role="button" and an aria-controls attribute that references the collapsible content element.

**Validates: Requirements 8.5, 8.6**

## Error Handling

### Invalid Section IDs

If a section ID is not recognized, the collapse/expand operation should fail gracefully:
- Log a warning to the console
- Do not modify any DOM elements
- Do not save any state to storage

### Missing DOM Elements

If expected DOM elements are missing (header, content, chevron, summary):
- Log a warning to the console
- Skip the operation for that section
- Continue processing other sections

### Storage Failures

If localStorage is unavailable or quota exceeded:
- Log a warning to the console
- Continue with in-memory state only
- Use default collapse states on next render

### Invalid Field Values

If field values cannot be read or are invalid:
- Use default/empty values in summary text
- Log a warning to the console
- Do not prevent collapse/expand operations

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

### Unit Testing Focus

Unit tests should cover:

1. **Specific examples**:
   - Initial render with default collapse states
   - Section headers contain required elements
   - ARIA attributes are present and correct

2. **Edge cases**:
   - Empty scenario name displays "(No scenario name)"
   - All faction reputations are zero (only chosen faction shown)
   - Default collapse states when no saved state exists

3. **Error conditions**:
   - Invalid section IDs
   - Missing DOM elements
   - localStorage unavailable
   - Invalid field values

4. **Integration points**:
   - Event listener attachment in main.ts
   - Field change handlers trigger summary updates
   - Storage integration with existing party chronicle storage

### Property-Based Testing Configuration

Property tests should use a property-based testing library (e.g., fast-check for TypeScript) and:

- Run minimum 100 iterations per test
- Generate random section IDs, collapse states, field values
- Tag each test with a comment referencing the design property

**Tag format**: `// Feature: collapsible-shared-sections, Property {number}: {property_text}`

### Property Test Implementation

Each correctness property should be implemented as a single property-based test:

1. **Property 2**: Generate random collapse states, verify chevron matches
2. **Property 3**: Generate random initial states, click header, verify toggle
3. **Property 4**: Generate random collapse states, verify field visibility
4. **Property 5**: Generate random scenario names, verify summary format
5. **Property 6**: Generate random reputation values, verify summary format
6. **Property 7**: Generate random faction reputation combinations, verify summary includes non-zero values
7. **Property 8**: Generate random XP and TB values, verify summary format
8. **Property 9**: Generate random state changes, verify storage called
9. **Property 10**: Generate random saved states, render form, verify restoration
10. **Property 11**: Generate random scenario name changes, verify summary updates
11. **Property 12**: Generate random reputation changes, verify summary updates
12. **Property 13**: Generate random XP/TB changes, verify summary updates
13. **Property 14**: Generate random collapse states and field changes, verify summary updates in both states
14. **Property 15**: Generate random initial states, press Enter/Space, verify toggle
15. **Property 16**: Generate random collapse states, verify aria-expanded matches

### Test Organization

Tests should be organized in the following files:

- `scripts/handlers/collapsible-section-handlers.test.ts`: Handler function unit tests
- `scripts/utils/summary-utils.test.ts`: Summary generation unit tests
- `scripts/model/collapse-state-storage.test.ts`: Storage function unit tests
- `scripts/collapsible-sections-integration.test.ts`: Integration tests and property-based tests

### Manual Testing Checklist

After implementation, manually verify:

1. All five sections have chevron indicators
2. Clicking headers toggles collapse state
3. Chevron changes between ▶ and ▼
4. Summary text displays correctly for each section
5. Summary text updates when field values change
6. Collapse state persists across form re-renders
7. Default collapse states are correct
8. Keyboard navigation works (Tab to header, Enter/Space to toggle)
9. Screen reader announces collapse state changes
10. CSS truncation works for long summary text
