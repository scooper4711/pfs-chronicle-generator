# Design Document: Treasure Bundle Calculation

## Overview

The Treasure Bundle Calculation feature automates the conversion of treasure bundles (shared party rewards) into character-specific gold values based on character level. This eliminates manual calculation errors and streamlines chronicle generation by automatically computing gold values from treasure bundles and income earned.

### Current State

The party chronicle form currently requires manual entry of "Gold Earned" for each character. GMs must:
1. Look up the treasure bundle value for each character's level in external tables
2. Multiply treasure bundles by the treasure bundle value
3. Add income earned to get total gold
4. Manually enter the calculated value into the form

The treasure bundles field is currently a numeric input, which requires GMs to remember that Series 1 quests award 2.5 treasure bundles.

This manual process is error-prone and time-consuming, especially for parties with characters at different levels.

### Proposed Solution

The system will:
1. Replace the treasure bundles numeric input with a dropdown selector containing standard values (-, 2.5 TB for Series 1 quests, 3-10 TB)
2. Maintain a lookup table mapping character levels (1-20) to treasure bundle values
3. Automatically calculate `treasure_bundles_gp` (treasure bundles × treasure bundle value for character level)
4. Automatically calculate `gp_gained` (treasure_bundles_gp + income_earned)
5. Display the calculated treasure bundle value as read-only text in the form
6. Remove the manual "Gold Earned" input field
7. Pass the correct calculated values to PDF generation using the required parameter names

### Parameter Naming Constraint

This feature MUST use the exact parameter names `treasure_bundles_gp`, `gp_gained`, and `income_earned` for compatibility with the existing PDF generation system. These parameter names are already defined in the PDF layouts used by the single-character chronicle functionality. Changing these names would break PDF generation across all existing chronicle layouts.

## Architecture

### Component Overview

The implementation follows the existing modular architecture:

```
scripts/
├── utils/
│   └── treasure-bundle-calculator.ts    [NEW] - Lookup table and calculation functions
├── model/
│   ├── party-chronicle-types.ts         [MODIFIED] - Update UniqueFields interface
│   ├── party-chronicle-mapper.ts        [MODIFIED] - Calculate treasure_bundles_gp and gp_gained
│   └── party-chronicle-validator.ts     [MODIFIED] - Remove goldEarned validation
├── handlers/
│   └── party-chronicle-handlers.ts      [MODIFIED] - Add reactive update handlers
├── main.ts                              [MODIFIED] - Add event listeners for reactive updates
└── templates/
    └── party-chronicle-filling.hbs      [MODIFIED] - Replace Gold Earned input with Treasure Bundle Value display
```

### Data Flow

1. **User Input**: GM selects treasure bundles from dropdown (shared field) and enters income earned (per-character field)
2. **Reactive Update**: When treasure bundles dropdown selection or character level changes, the form updates the displayed treasure bundle value
3. **Auto-Save**: Changes to treasure bundles dropdown or income earned trigger auto-save
4. **PDF Generation**: When generating PDFs, the mapper calculates `treasure_bundles_gp` and `gp_gained` and passes them to PdfGenerator

### Hybrid ApplicationV2 Pattern

Following the existing architecture (see `architecture.md`):
- Event listeners MUST be attached in `main.ts` → `renderPartyChronicleForm()`
- Handler logic MUST be in `handlers/party-chronicle-handlers.ts`
- The `PartyChronicleApp._onRender()` method is NOT called during normal operation
- All interactive features require manual event listener attachment

## Components and Interfaces

### 1. Treasure Bundle Calculator (NEW)

**File**: `scripts/utils/treasure-bundle-calculator.ts`

**Purpose**: Provides the treasure bundle value lookup table and calculation functions.

**Exports**:

```typescript
/**
 * Lookup table mapping character levels (1-20) to treasure bundle values in gold pieces.
 * Source: Pathfinder Society Guide
 */
export const TREASURE_BUNDLE_VALUES: Record<number, number> = {
  1: 1.4,
  2: 2.2,
  3: 3.8,
  4: 6.4,
  5: 10,
  6: 15,
  7: 22,
  8: 30,
  9: 44,
  10: 60,
  11: 86,
  12: 124,
  13: 188,
  14: 274,
  15: 408,
  16: 620,
  17: 960,
  18: 1560,
  19: 2660,
  20: 3680
};

/**
 * Gets the treasure bundle value for a specific character level.
 * 
 * @param level - Character level (1-20)
 * @returns Treasure bundle value in gold pieces, or 0 if level is out of range
 */
export function getTreasureBundleValue(level: number): number;

/**
 * Calculates the total gold from treasure bundles for a character.
 * 
 * @param treasureBundles - Number of treasure bundles (0, 2.5, or 3-10)
 * @param characterLevel - Character level (1-20)
 * @returns Total gold from treasure bundles, rounded to 2 decimal places
 */
export function calculateTreasureBundlesGp(
  treasureBundles: number,
  characterLevel: number
): number;

/**
 * Calculates the total gold gained (treasure bundles + income earned).
 * 
 * @param treasureBundlesGp - Gold from treasure bundles
 * @param incomeEarned - Gold from income earned
 * @returns Total gold gained, rounded to 2 decimal places
 */
export function calculateGpGained(
  treasureBundlesGp: number,
  incomeEarned: number
): number;
```

**Defensive Programming**:
- Returns 0 for invalid levels (defensive programming)
- The module has no dependencies on other modules (pure utility)

### 2. Treasure Bundle Dropdown Selector (NEW)

**File**: `templates/party-chronicle-filling.hbs`

**Purpose**: Provides a user-friendly dropdown selector for treasure bundles with predefined options.

**Design Rationale**:
- Dropdown prevents invalid values (e.g., 1 TB, 11 TB)
- Makes Series 1 Quest value (2.5 TB) discoverable without requiring GMs to remember it
- Reduces cognitive load by showing only valid options
- Aligns with Pathfinder Society rules where treasure bundles are fixed values, not arbitrary numbers

**Options**:
```typescript
[
  { label: "-", value: 0 },                          // Default: no treasure bundles
  { label: "2.5 TB (Series 1 Quest)", value: 2.5 }, // Special case for early quests
  { label: "3 TB", value: 3 },                       // Standard quest minimum
  { label: "4 TB", value: 4 },
  { label: "5 TB", value: 5 },
  { label: "6 TB", value: 6 },
  { label: "7 TB", value: 7 },
  { label: "8 TB", value: 8 },
  { label: "9 TB", value: 9 },
  { label: "10 TB", value: 10 }                      // Standard adventure maximum
]
```

**Behavior**:
- Default selection: "-" (value 0)
- When "-" is selected, treasure bundle calculations treat it as 0
- When "2.5 TB (Series 1 Quest)" is selected, calculations use 2.5
- All other options use integer values 3-10
- Selection triggers auto-save and reactive display updates

**Integration**:
- Replaces the current `<input type="number">` for treasure bundles
- Uses same field name: `shared.treasureBundles`
- Event listeners use `change` event instead of `input` event
- Value extraction uses `parseFloat()` instead of `parseInt()` to support 2.5

### 3. Type Definitions (MODIFIED)

**File**: `scripts/model/party-chronicle-types.ts`

**Changes to `UniqueFields` interface**:

```typescript
export interface UniqueFields {
  /** Character name (editable, may differ from actor name) */
  characterName: string;
  
  /** Society ID in format "playerNumber-characterNumber" */
  societyId: string;
  
  /** Character level */
  level: number;
  
  /** Income earned during the adventure */
  incomeEarned: number;
  
  /** Gold spent during the adventure */
  goldSpent: number;
  
  /** Additional notes for this character */
  notes: string;
  
  // REMOVED: goldEarned field (now calculated, not stored)
}
```

**Rationale**: The `goldEarned` field is removed because it's now a calculated value, not user input. This prevents data inconsistency where stored `goldEarned` doesn't match the calculated value.

### 4. Data Mapper (MODIFIED)

**File**: `scripts/model/party-chronicle-mapper.ts`

**Changes to `ChronicleData` interface**:

```typescript
export interface ChronicleData {
  // ... existing fields ...
  
  // Rewards - MODIFIED parameter names
  xp_gained: number;
  income_earned: number;        // Unchanged - user input
  treasure_bundles_gp: number;  // NEW - calculated from treasure bundles × level
  gp_gained: number;            // MODIFIED - now treasure_bundles_gp + income_earned
  gp_spent: number;
  
  // ... existing fields ...
}
```

**Changes to `mapToCharacterData` function**:

```typescript
import { calculateTreasureBundlesGp, calculateGpGained } from '../utils/treasure-bundle-calculator.js';

export function mapToCharacterData(
  shared: SharedFields,
  unique: UniqueFields,
  actor: any
): ChronicleData {
  // Calculate treasure bundle gold based on character level
  const treasureBundlesGp = calculateTreasureBundlesGp(
    shared.treasureBundles,
    unique.level
  );
  
  // Calculate total gold gained
  const gpGained = calculateGpGained(treasureBundlesGp, unique.incomeEarned);
  
  // Calculate reputation using the reputation calculator
  const reputationLines = calculateReputation(shared, actor);
  
  return {
    // Character identification from unique fields
    char: unique.characterName,
    societyid: unique.societyId,
    level: unique.level,
    
    // Event details from shared fields
    gmid: shared.gmPfsNumber,
    event: shared.scenarioName,
    eventcode: shared.eventCode,
    date: shared.eventDate,
    
    // XP from shared fields
    xp_gained: shared.xpEarned,
    
    // Character-specific rewards - MODIFIED
    income_earned: unique.incomeEarned,
    treasure_bundles_gp: treasureBundlesGp,  // NEW - calculated
    gp_gained: gpGained,                     // MODIFIED - calculated
    gp_spent: unique.goldSpent,
    
    // Character-specific notes from unique fields
    notes: unique.notes,
    reputation: reputationLines,
    
    // Layout-dependent selections from shared fields
    summary_checkbox: shared.adventureSummaryCheckboxes,
    strikeout_item_lines: shared.strikeoutItems,
    
    // Treasure bundles from shared fields (convert number to string)
    treasure_bundles: shared.treasureBundles.toString(),
  };
}
```

**Backward Compatibility**: The mapper ignores any legacy `goldEarned` values in saved data and recalculates from treasure bundles and level.

### 5. Validator (MODIFIED)

**File**: `scripts/model/party-chronicle-validator.ts`

**Changes to `validateUniqueFields` function**:

Remove the validation for `goldEarned` field:

```typescript
export function validateUniqueFields(
  unique: Partial<UniqueFields>,
  characterName?: string
): ValidationResult {
  const errors: string[] = [];
  const prefix = characterName ? `${characterName}: ` : '';
  
  // ... existing validations for characterName, societyId, level ...
  
  // Validate Income Earned
  errors.push(...validateNumberField(unique.incomeEarned, 'Income Earned', { 
    min: 0 
  }, prefix));
  
  // REMOVED: Validate Gold Earned (field no longer exists)
  
  // Validate Gold Spent
  errors.push(...validateNumberField(unique.goldSpent, 'Gold Spent', { 
    min: 0 
  }, prefix));
  
  // ... rest of function ...
}
```

### 6. Event Handlers (MODIFIED)

**File**: `scripts/handlers/party-chronicle-handlers.ts`

**New Handler Functions**:

```typescript
import { calculateTreasureBundlesGp, formatGoldValue } from '../utils/treasure-bundle-calculator.js';

/**
 * Updates the displayed treasure bundle value for a specific character.
 * Called when treasure bundles or character level changes.
 * 
 * @param characterId - Actor ID of the character
 * @param treasureBundles - Number of treasure bundles
 * @param characterLevel - Character level
 * @param container - Container element for the form
 */
export function updateTreasureBundleDisplay(
  characterId: string,
  treasureBundles: number,
  characterLevel: number,
  container: HTMLElement
): void {
  const displayElement = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] .treasure-bundle-value`
  );
  
  if (displayElement) {
    const treasureBundlesGp = calculateTreasureBundlesGp(treasureBundles, characterLevel);
    displayElement.textContent = formatGoldValue(treasureBundlesGp);
  }
}

/**
 * Updates treasure bundle displays for all characters.
 * Called when the shared treasure bundles field changes.
 * 
 * @param treasureBundles - Number of treasure bundles
 * @param container - Container element for the form
 */
export function updateAllTreasureBundleDisplays(
  treasureBundles: number,
  container: HTMLElement
): void {
  const memberActivities = container.querySelectorAll('.member-activity');
  
  memberActivities.forEach((activity) => {
    const characterId = activity.getAttribute('data-character-id');
    const levelInput = activity.querySelector<HTMLInputElement>('input[name$=".level"]');
    
    if (characterId && levelInput) {
      const characterLevel = parseInt(levelInput.value, 10);
      updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
    }
  });
}
```

**Modified Handler Functions**:

Update `handleFieldChange` to trigger treasure bundle display updates:

```typescript
export function handleFieldChange(event: Event, container: HTMLElement): void {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  const fieldName = input.name;
  
  // Trigger auto-save
  savePartyChronicleData(container);
  
  // If treasure bundles dropdown changed, update all treasure bundle displays
  if (fieldName === 'shared.treasureBundles') {
    const treasureBundles = parseFloat((input as HTMLSelectElement).value) || 0;
    updateAllTreasureBundleDisplays(treasureBundles, container);
  }
  
  // If a character's level changed, update that character's treasure bundle display
  if (fieldName.includes('.level')) {
    const match = fieldName.match(/characters\.([^.]+)\.level/);
    if (match) {
      const characterId = match[1];
      const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
      const treasureBundles = parseFloat(treasureBundlesSelect?.value || '0');
      const characterLevel = parseInt((input as HTMLInputElement).value, 10);
      updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
    }
  }
  
  // Trigger validation update
  updateValidationDisplay(container);
}
```

### 7. Main Entry Point (MODIFIED)

**File**: `scripts/main.ts`

**Changes to `renderPartyChronicleForm` function**:

Add event listeners for reactive treasure bundle display updates:

```typescript
async function renderPartyChronicleForm(
  container: HTMLElement,
  partyActors: any[],
  partySheet: any
): Promise<void> {
  // ... existing template rendering code ...
  
  // Existing event listeners ...
  
  // NEW: Event listener for treasure bundles dropdown changes
  const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
  if (treasureBundlesSelect) {
    treasureBundlesSelect.addEventListener('change', (event: Event) => {
      const select = event.target as HTMLSelectElement;
      const treasureBundles = parseFloat(select.value) || 0;
      updateAllTreasureBundleDisplays(treasureBundles, container);
    });
  }
  
  // NEW: Event listeners for character level changes
  const levelInputs = container.querySelectorAll<HTMLInputElement>('input[name$=".level"]');
  levelInputs.forEach((levelInput) => {
    levelInput.addEventListener('input', (event: Event) => {
      const input = event.target as HTMLInputElement;
      const fieldName = input.name;
      const match = fieldName.match(/characters\.([^.]+)\.level/);
      
      if (match) {
        const characterId = match[1];
        const treasureBundlesSelect = container.querySelector<HTMLSelectElement>('#treasureBundles');
        const treasureBundles = parseFloat(treasureBundlesSelect?.value || '0');
        const characterLevel = parseInt(input.value, 10);
        updateTreasureBundleDisplay(characterId, treasureBundles, characterLevel, container);
      }
    });
  });
  
  // Initialize treasure bundle displays on initial render
  const initialTreasureBundles = parseFloat(treasureBundlesSelect?.value || '0');
  updateAllTreasureBundleDisplays(initialTreasureBundles, container);
  
  // ... rest of function ...
}
```

### 8. Template (MODIFIED)

**File**: `templates/party-chronicle-filling.hbs`

**Changes to shared fields section**:

Replace the treasure bundles numeric input with a dropdown selector:

```handlebars
<div class="form-group">
    <label for="treasureBundles">Treasure Bundles</label>
    <select id="treasureBundles" name="shared.treasureBundles">
        <option value="0" {{#if (eq savedData.shared.treasureBundles 0)}}selected{{/if}}>-</option>
        <option value="2.5" {{#if (eq savedData.shared.treasureBundles 2.5)}}selected{{/if}}>2.5 TB (Series 1 Quest)</option>
        <option value="3" {{#if (eq savedData.shared.treasureBundles 3)}}selected{{/if}}>3 TB</option>
        <option value="4" {{#if (eq savedData.shared.treasureBundles 4)}}selected{{/if}}>4 TB</option>
        <option value="5" {{#if (eq savedData.shared.treasureBundles 5)}}selected{{/if}}>5 TB</option>
        <option value="6" {{#if (eq savedData.shared.treasureBundles 6)}}selected{{/if}}>6 TB</option>
        <option value="7" {{#if (eq savedData.shared.treasureBundles 7)}}selected{{/if}}>7 TB</option>
        <option value="8" {{#if (eq savedData.shared.treasureBundles 8)}}selected{{/if}}>8 TB</option>
        <option value="9" {{#if (eq savedData.shared.treasureBundles 9)}}selected{{/if}}>9 TB</option>
        <option value="10" {{#if (eq savedData.shared.treasureBundles 10)}}selected{{/if}}>10 TB</option>
    </select>
</div>
```

**Changes to character-specific fields section**:

Replace the "Gold Earned" input with a "Treasure Bundle Value" read-only display:

```handlebars
<div class="character-fields">
    <div class="form-group">
        <label for="incomeEarned-{{this.id}}">Income Earned</label>
        <input type="number" id="incomeEarned-{{this.id}}" name="characters.{{this.id}}.incomeEarned" value="{{#if (lookup ../savedData.characters this.id)}}{{lookup (lookup ../savedData.characters this.id) 'incomeEarned'}}{{else}}0{{/if}}" step="0.01">
    </div>
    
    {{!-- NEW: Treasure Bundle Value display (read-only) --}}
    <div class="form-group">
        <label>Treasure Bundle Value</label>
        <div class="treasure-bundle-value">0.00 gp</div>
    </div>
    
    {{!-- REMOVED: Gold Earned input field --}}
    
    <div class="form-group">
        <label for="goldSpent-{{this.id}}">Gold Spent</label>
        <input type="number" id="goldSpent-{{this.id}}" name="characters.{{this.id}}.goldSpent" value="{{#if (lookup ../savedData.characters this.id)}}{{lookup (lookup ../savedData.characters this.id) 'goldSpent'}}{{else}}0{{/if}}" step="0.01">
    </div>
    
    <div class="form-group full-width">
        <label for="notes-{{this.id}}">Notes</label>
        <textarea id="notes-{{this.id}}" name="characters.{{this.id}}.notes" rows="3">{{#if (lookup ../savedData.characters this.id)}}{{lookup (lookup ../savedData.characters this.id) 'notes'}}{{/if}}</textarea>
    </div>
</div>
```

**CSS Styling** (add to `css/style.css`):

```css
.treasure-bundle-value {
  padding: 0.5rem;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-family: monospace;
  font-size: 1rem;
  color: #333;
  text-align: right;
}

/* Style the treasure bundles dropdown to match other form inputs */
#treasureBundles {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 1rem;
}
```

## Data Models

### Treasure Bundle Value Lookup Table

The lookup table is a simple key-value mapping:

```typescript
{
  1: 1.4,    // Level 1 characters get 1.4 gp per treasure bundle
  2: 2.2,    // Level 2 characters get 2.2 gp per treasure bundle
  // ... etc ...
  20: 3680   // Level 20 characters get 3680 gp per treasure bundle
}
```

**Properties**:
- Immutable constant (exported as `const`)
- O(1) lookup time
- Covers all valid character levels (1-20)
- Values are from official Pathfinder Society Guide

### Data Structure Changes

**Before** (current `UniqueFields`):
```typescript
{
  characterName: string;
  societyId: string;
  level: number;
  incomeEarned: number;
  goldEarned: number;      // User input (manual calculation)
  goldSpent: number;
  notes: string;
}
```

**After** (modified `UniqueFields`):
```typescript
{
  characterName: string;
  societyId: string;
  level: number;
  incomeEarned: number;
  // goldEarned removed - now calculated, not stored
  goldSpent: number;
  notes: string;
}
```

**ChronicleData** (passed to PDF generator):
```typescript
{
  // ... other fields ...
  income_earned: number;        // From UniqueFields.incomeEarned
  treasure_bundles_gp: number;  // Calculated: treasureBundles × getTreasureBundleValue(level)
  gp_gained: number;            // Calculated: treasure_bundles_gp + income_earned
  gp_spent: number;             // From UniqueFields.goldSpent
  // ... other fields ...
}
```

### Backward Compatibility Strategy

**Loading Legacy Data**:
1. When loading saved `PartyChronicleData`, check if `characters[actorId].goldEarned` exists
2. If it exists, ignore it (don't use it for any calculations)
3. Recalculate `treasure_bundles_gp` from `shared.treasureBundles` and `unique.level`
4. Use stored `incomeEarned` value

**Saving New Data**:
1. Do not include `goldEarned` in the saved `UniqueFields` structure
2. Only save `incomeEarned` (user input)
3. `treasure_bundles_gp` and `gp_gained` are calculated at PDF generation time

**Migration Path**:
- No explicit migration needed
- Legacy data continues to work (goldEarned is simply ignored)
- Next save will persist data without goldEarned field
- Gradual migration as users save their chronicles

