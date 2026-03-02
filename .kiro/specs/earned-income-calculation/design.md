# Design Document: Earned Income Calculation

## Overview

The Earned Income Calculation feature automates the calculation of income earned during downtime days in Pathfinder Society scenarios. Players roll skill checks against task-level DCs to earn income, with the amount determined by their proficiency rank, success level, and number of downtime days.

### Current State

The party chronicle form currently requires manual entry of "Income Earned" for each character. GMs and players must:
1. Select an appropriate task level based on character level, feats, boons, or infamy
2. Roll a skill check against the task DC
3. Look up the income per day in external tables based on task level, proficiency rank, and success level
4. Multiply income per day by downtime days
5. Manually enter the calculated value into the form

This manual process is error-prone and time-consuming, especially when players have different proficiency ranks or success levels.

### Proposed Solution

The system will:
1. Provide an XP Earned dropdown with three options: "Bounty (1 XP)", "Quest (2 XP)", "Scenario (4 XP)"
2. Automatically calculate downtime days based on XP earned: Bounties grant 0 downtime days, Quests and Scenarios grant 2 days per XP (formula: XP × 2)
3. Display downtime days as a read-only calculated field
4. Provide a task level dropdown for each character with five options: "-" (opt-out), Character Level - 3 (infamy), Character Level - 2 (default), Character Level - 1 (feat/boon), Character Level (feat/boon)
5. Display the DC for each task level option to help players know what to roll
6. Provide success level selection (critical failure, failure, success, critical success) for each character
7. Provide proficiency rank selection (trained, expert, master, legendary) for each character
8. Maintain a pre-computed income table with all values in gold pieces
9. Automatically calculate income per day based on task level, success level, and proficiency rank
10. For critical success, treat PC level as 1 higher (minimum level 3) when looking up income
11. Automatically calculate total income (income per day × downtime days)
12. Display the calculated income as read-only text in the form
13. Pass the calculated income to PDF generation


### Design Rationale

**XP Earned Dropdown**: Provides the three standard PFS adventure types (Bounty, Quest, Scenario) with their corresponding XP values, making it clear which option to select based on the adventure type.

**Calculated Downtime Days**: Downtime days are determined by the adventure type according to PFS rules: "Scenarios and Quests grant two days of Downtime per XP earned. Bounties are missions the PC undertakes during their Downtime and thus grant no Downtime." This is calculated automatically (XP × 2 for Quests/Scenarios, 0 for Bounties) to prevent errors.

**Read-Only Downtime Display**: Since downtime days are calculated from XP, they should be displayed as read-only to prevent manual override and ensure consistency with PFS rules.

**Critical Success Adjustment**: According to PFS rules, "On a critical success, treat your PC level as 1 higher to determine results, to a minimum level of 3." This means we look up income using (task level + 1, minimum 3) for critical successes.

**Task Level Dropdown**: Provides exactly the options players need based on their character level, making it clear which option applies to their situation (infamy, default, or feat/boon). The "-" option allows players to opt out if they don't want to earn income.

**DC Display**: Showing the DC alongside each task level helps players know what they need to roll without consulting external tables.

**Pre-computed Income Table**: All currency values are converted to gold pieces at design time (1 cp = 0.01 gp, 1 sp = 0.1 gp), eliminating runtime conversion logic and potential errors.

**Character-Specific Inputs**: Task level, success level, and proficiency rank are character-specific because different characters may have different levels, proficiency ranks, and roll results.

## Architecture

### Component Overview

The implementation follows the existing modular architecture established by the treasure bundle calculation feature:

```
scripts/
├── utils/
│   └── earned-income-calculator.ts         [NEW] - Income table and calculation functions
├── model/
│   ├── party-chronicle-types.ts            [MODIFIED] - Update SharedFields and UniqueFields interfaces
│   ├── party-chronicle-mapper.ts           [MODIFIED] - Calculate earned income for PDF generation
│   └── party-chronicle-validator.ts        [MODIFIED] - Add earned income validation
├── handlers/
│   └── party-chronicle-handlers.ts         [MODIFIED] - Add reactive update handlers
├── main.ts                                 [MODIFIED] - Add event listeners for reactive updates
└── templates/
    └── party-chronicle-filling.hbs         [MODIFIED] - Add earned income UI fields
```

### Data Flow

1. **User Input**: GM enters downtime days (shared field); each player selects task level, success level, and proficiency rank
2. **Reactive Update**: When any input changes, the form updates the displayed earned income value
3. **Auto-Save**: Changes to earned income inputs trigger auto-save
4. **PDF Generation**: When generating PDFs, the mapper calculates earned income and passes it to PdfGenerator

### Hybrid ApplicationV2 Pattern

Following the existing architecture (see `architecture.md`):
- Event listeners MUST be attached in `main.ts` → `renderPartyChronicleForm()`
- Handler logic MUST be in `handlers/party-chronicle-handlers.ts`
- The `PartyChronicleApp._onRender()` method is NOT called during normal operation
- All interactive features require manual event listener attachment


## Components and Interfaces

### 1. Earned Income Calculator (NEW)

**File**: `scripts/utils/earned-income-calculator.ts`

**Purpose**: Provides the income table, DC lookup table, and calculation functions.

**Exports**:

```typescript
/**
 * DC by level lookup table for Pathfinder 2e
 * Maps task levels 0-20 to their corresponding DCs
 */
export const DC_BY_LEVEL: Record<number, number> = {
  0: 14, 1: 15, 2: 16, 3: 18, 4: 19, 5: 20, 6: 22, 7: 23, 8: 24, 9: 26, 10: 27,
  11: 28, 12: 30, 13: 31, 14: 32, 15: 34, 16: 35, 17: 36, 18: 38, 19: 39, 20: 40
};

/**
 * Income table mapping task levels and proficiency ranks to income per day in gold pieces
 * All values pre-converted from cp/sp to gp (1 cp = 0.01 gp, 1 sp = 0.1 gp)
 * 
 * Structure: INCOME_TABLE[taskLevel][proficiencyRank] = income in gp
 * Special: INCOME_TABLE[20]['critical'] contains critical success values for level 20
 */
export const INCOME_TABLE: Record<number, Record<string, number>> = {
  0: { failure: 0.01, trained: 0.05, expert: 0.05, master: 0.05, legendary: 0.05 },
  1: { failure: 0.02, trained: 0.2, expert: 0.2, master: 0.2, legendary: 0.2 },
  // ... (full table with all levels 0-20)
  20: { 
    failure: 0.3, trained: 30, expert: 35, master: 40, legendary: 50,
    critical: { trained: 35, expert: 40, master: 50, legendary: 60 }
  }
};

/**
 * Calculates downtime days based on XP earned
 * Formula: XP × 2 for Quests and Scenarios, 0 for Bounties
 * According to PFS rules: "Scenarios and Quests grant two days of Downtime per XP earned.
 * Bounties are missions the PC undertakes during their Downtime and thus grant no Downtime."
 */
export function calculateDowntimeDays(xpEarned: number): number;

/**
 * Gets the DC for a specific task level
 */
export function getDCForLevel(level: number): number;

/**
 * Calculates task level options for a character
 * Returns array of 5 options: ["-", level-3, level-2, level-1, level]
 * All numeric options are floored at 0
 */
export function calculateTaskLevelOptions(characterLevel: number): Array<{
  value: string | number;
  label: string;
  dc?: number;
}>;

/**
 * Gets income per day from the income table
 * Handles critical success by treating PC level as 1 higher (minimum level 3)
 * Handles level 20 critical success special case
 */
export function getIncomePerDay(
  taskLevel: number | string,
  successLevel: string,
  proficiencyRank: string
): number;

/**
 * Calculates total earned income
 * Formula: income per day × downtime days
 */
export function calculateEarnedIncome(
  taskLevel: number | string,
  successLevel: string,
  proficiencyRank: string,
  downtimeDays: number
): number;

/**
 * Formats income value for display
 */
export function formatIncomeValue(value: number): string;
```


### 2. Type Definitions (MODIFIED)

**File**: `scripts/model/party-chronicle-types.ts`

**Changes to `SharedFields` interface**:

```typescript
export interface SharedFields {
  // ... existing fields ...
  
  /** XP earned from the adventure (1 for Bounty, 2 for Quest, 4 for Scenario) */
  xpEarned: number;  // MODIFIED - now a dropdown selection
  
  /** Number of downtime days granted (calculated: XP × 2 for Quest/Scenario, 0 for Bounty) */
  downtimeDays: number;  // NEW - calculated field
}
```

**Changes to `UniqueFields` interface**:

```typescript
export interface UniqueFields {
  // ... existing fields ...
  
  /** Task level for Earn Income (number 0-20 or "-" for opt-out) */
  taskLevel: number | string;  // NEW
  
  /** Success level for Earn Income check (critical_failure, failure, success, critical_success) */
  successLevel: string;  // NEW
  
  /** Proficiency rank in the skill used (trained, expert, master, legendary) */
  proficiencyRank: string;  // NEW
  
  /** Calculated earned income (stored for display, recalculated for PDF) */
  earnedIncome: number;  // NEW (replaces incomeEarned)
}
```

**Rationale**: The `earnedIncome` field replaces `incomeEarned` to reflect that this is now a calculated value. The field is stored for display purposes but recalculated during PDF generation to ensure consistency. The `successLevel` field now includes `critical_failure` as an option.

### 3. Data Mapper (MODIFIED)

**File**: `scripts/model/party-chronicle-mapper.ts`

**Changes to `ChronicleData` interface**:

```typescript
export interface ChronicleData {
  // ... existing fields ...
  
  // Rewards
  xp_gained: number;
  income_earned: number;        // MODIFIED - now calculated from earned income inputs
  treasure_bundles_gp: number;
  gp_gained: number;            // treasure_bundles_gp + income_earned
  gp_spent: number;
  
  // ... existing fields ...
}
```

**Changes to `mapToCharacterData` function**:

```typescript
import { calculateEarnedIncome } from '../utils/earned-income-calculator.js';
import { calculateTreasureBundlesGp, calculateGpGained } from '../utils/treasure-bundle-calculator.js';

export function mapToCharacterData(
  shared: SharedFields,
  unique: UniqueFields,
  actor: any
): ChronicleData {
  // Calculate earned income based on inputs
  const incomeEarned = calculateEarnedIncome(
    unique.taskLevel,
    unique.successLevel,
    unique.proficiencyRank,
    shared.downtimeDays
  );
  
  // Calculate treasure bundle gold based on character level
  const treasureBundlesGp = calculateTreasureBundlesGp(
    shared.treasureBundles,
    unique.level
  );
  
  // Calculate total gold gained
  const gpGained = calculateGpGained(treasureBundlesGp, incomeEarned);
  
  // Calculate reputation using the reputation calculator
  const reputationLines = calculateReputation(shared, actor);
  
  return {
    // ... existing fields ...
    
    // Character-specific rewards - MODIFIED
    income_earned: incomeEarned,             // MODIFIED - calculated
    treasure_bundles_gp: treasureBundlesGp,
    gp_gained: gpGained,
    gp_spent: unique.goldSpent,
    
    // ... existing fields ...
  };
}
```


### 4. Validator (MODIFIED)

**File**: `scripts/model/party-chronicle-validator.ts`

**Changes to `validateSharedFields` function**:

Add validation for downtime days:

```typescript
export function validateSharedFields(shared: Partial<SharedFields>): ValidationResult {
  const errors: string[] = [];
  
  // ... existing validations ...
  
  // Validate Downtime Days
  errors.push(...validateNumberField(shared.downtimeDays, 'Downtime Days', { 
    min: 0,
    max: 8,
    integer: true
  }));
  
  // ... rest of function ...
}
```

**Changes to `validateUniqueFields` function**:

Add validation for earned income inputs:

```typescript
export function validateUniqueFields(
  unique: Partial<UniqueFields>,
  characterName?: string
): ValidationResult {
  const errors: string[] = [];
  const prefix = characterName ? `${characterName}: ` : '';
  
  // ... existing validations ...
  
  // Validate Task Level
  if (unique.taskLevel !== undefined && unique.taskLevel !== '-') {
    const taskLevelNum = typeof unique.taskLevel === 'number' ? unique.taskLevel : parseInt(unique.taskLevel);
    if (isNaN(taskLevelNum) || taskLevelNum < 0 || taskLevelNum > 20) {
      errors.push(`${prefix}Task Level must be between 0 and 20 or "-"`);
    }
    
    // If task level is not "-", require success level and proficiency rank
    if (!unique.successLevel) {
      errors.push(`${prefix}Success Level is required when Task Level is not "-"`);
    }
    if (!unique.proficiencyRank) {
      errors.push(`${prefix}Proficiency Rank is required when Task Level is not "-"`);
    }
  }
  
  // Validate Success Level (if provided)
  if (unique.successLevel && !['critical_failure', 'failure', 'success', 'critical_success'].includes(unique.successLevel)) {
    errors.push(`${prefix}Success Level must be critical_failure, failure, success, or critical_success`);
  }
  
  // Validate Proficiency Rank (if provided)
  if (unique.proficiencyRank && !['trained', 'expert', 'master', 'legendary'].includes(unique.proficiencyRank)) {
    errors.push(`${prefix}Proficiency Rank must be trained, expert, master, or legendary`);
  }
  
  // ... rest of function ...
}
```


### 5. Event Handlers (MODIFIED)

**File**: `scripts/handlers/party-chronicle-handlers.ts`

**New Handler Functions**:

```typescript
import { calculateEarnedIncome, formatIncomeValue } from '../utils/earned-income-calculator.js';

/**
 * Updates the displayed earned income for a specific character.
 * Called when task level, success level, proficiency rank, or downtime days changes.
 * 
 * @param characterId - Actor ID of the character
 * @param taskLevel - Selected task level (number or "-")
 * @param successLevel - Selected success level
 * @param proficiencyRank - Selected proficiency rank
 * @param downtimeDays - Number of downtime days
 * @param container - Container element for the form
 * 
 * Requirements: earned-income-calculation 7.3
 */
export function updateEarnedIncomeDisplay(
  characterId: string,
  taskLevel: number | string,
  successLevel: string,
  proficiencyRank: string,
  downtimeDays: number,
  container: HTMLElement
): void {
  const displayElement = container.querySelector(
    `.member-activity[data-character-id="${characterId}"] .earned-income-value`
  );
  
  if (displayElement) {
    const earnedIncome = calculateEarnedIncome(
      taskLevel,
      successLevel,
      proficiencyRank,
      downtimeDays
    );
    displayElement.textContent = formatIncomeValue(earnedIncome);
  }
}

/**
 * Updates earned income displays for all characters.
 * Called when the shared downtime days field changes.
 * 
 * @param downtimeDays - Number of downtime days
 * @param container - Container element for the form
 * 
 * Requirements: earned-income-calculation 2.5, 7.3
 */
export function updateAllEarnedIncomeDisplays(
  downtimeDays: number,
  container: HTMLElement
): void {
  const memberActivities = container.querySelectorAll('.member-activity');
  
  memberActivities.forEach((activity) => {
    const characterId = activity.getAttribute('data-character-id');
    const taskLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
    const successLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
    const proficiencyRankSelect = activity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
    
    if (characterId && taskLevelSelect && successLevelSelect && proficiencyRankSelect) {
      const taskLevel = taskLevelSelect.value === '-' ? '-' : parseInt(taskLevelSelect.value, 10);
      const successLevel = successLevelSelect.value;
      const proficiencyRank = proficiencyRankSelect.value;
      
      updateEarnedIncomeDisplay(
        characterId,
        taskLevel,
        successLevel,
        proficiencyRank,
        downtimeDays,
        container
      );
    }
  });
}
```

**Modified Handler Functions**:

Update `handleFieldChange` to trigger earned income display updates:

```typescript
export function handleFieldChange(event: Event, container: HTMLElement): void {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  const fieldName = input.name;
  
  // Trigger auto-save
  savePartyChronicleData(container);
  
  // ... existing treasure bundle update logic ...
  
  // If downtime days changed, update all earned income displays
  if (fieldName === 'shared.downtimeDays') {
    const downtimeDays = parseInt((input as HTMLInputElement).value, 10) || 0;
    updateAllEarnedIncomeDisplays(downtimeDays, container);
  }
  
  // If a character's earned income input changed, update that character's display
  if (fieldName.includes('.taskLevel') || fieldName.includes('.successLevel') || fieldName.includes('.proficiencyRank')) {
    const match = fieldName.match(/characters\.([^.]+)\./);
    if (match) {
      const characterId = match[1];
      const activity = container.querySelector(`.member-activity[data-character-id="${characterId}"]`);
      
      if (activity) {
        const taskLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
        const successLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
        const proficiencyRankSelect = activity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
        const downtimeDaysInput = container.querySelector<HTMLInputElement>('#downtimeDays');
        
        if (taskLevelSelect && successLevelSelect && proficiencyRankSelect && downtimeDaysInput) {
          const taskLevel = taskLevelSelect.value === '-' ? '-' : parseInt(taskLevelSelect.value, 10);
          const successLevel = successLevelSelect.value;
          const proficiencyRank = proficiencyRankSelect.value;
          const downtimeDays = parseInt(downtimeDaysInput.value, 10) || 0;
          
          updateEarnedIncomeDisplay(
            characterId,
            taskLevel,
            successLevel,
            proficiencyRank,
            downtimeDays,
            container
          );
        }
      }
    }
  }
  
  // Trigger validation update
  updateValidationDisplay(container);
}
```


### 6. Main Entry Point (MODIFIED)

**File**: `scripts/main.ts`

**Changes to `renderPartyChronicleForm` function**:

Add event listeners for reactive earned income display updates:

```typescript
async function renderPartyChronicleForm(
  container: HTMLElement,
  partyActors: any[],
  partySheet: any
): Promise<void> {
  // ... existing template rendering code ...
  
  // Existing event listeners ...
  
  // NEW: Event listener for downtime days changes
  const downtimeDaysInput = container.querySelector<HTMLInputElement>('#downtimeDays');
  if (downtimeDaysInput) {
    downtimeDaysInput.addEventListener('input', (event: Event) => {
      const input = event.target as HTMLInputElement;
      const downtimeDays = parseInt(input.value, 10) || 0;
      updateAllEarnedIncomeDisplays(downtimeDays, container);
    });
  }
  
  // NEW: Event listeners for earned income input changes
  const taskLevelSelects = container.querySelectorAll<HTMLSelectElement>('select[name$=".taskLevel"]');
  const successLevelSelects = container.querySelectorAll<HTMLSelectElement>('select[name$=".successLevel"]');
  const proficiencyRankSelects = container.querySelectorAll<HTMLSelectElement>('select[name$=".proficiencyRank"]');
  
  [taskLevelSelects, successLevelSelects, proficiencyRankSelects].forEach((selects) => {
    selects.forEach((select) => {
      select.addEventListener('change', (event: Event) => {
        const selectElement = event.target as HTMLSelectElement;
        const fieldName = selectElement.name;
        const match = fieldName.match(/characters\.([^.]+)\./);
        
        if (match) {
          const characterId = match[1];
          const activity = container.querySelector(`.member-activity[data-character-id="${characterId}"]`);
          
          if (activity) {
            const taskLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".taskLevel"]');
            const successLevelSelect = activity.querySelector<HTMLSelectElement>('select[name$=".successLevel"]');
            const proficiencyRankSelect = activity.querySelector<HTMLSelectElement>('select[name$=".proficiencyRank"]');
            const downtimeDaysInput = container.querySelector<HTMLInputElement>('#downtimeDays');
            
            if (taskLevelSelect && successLevelSelect && proficiencyRankSelect && downtimeDaysInput) {
              const taskLevel = taskLevelSelect.value === '-' ? '-' : parseInt(taskLevelSelect.value, 10);
              const successLevel = successLevelSelect.value;
              const proficiencyRank = proficiencyRankSelect.value;
              const downtimeDays = parseInt(downtimeDaysInput.value, 10) || 0;
              
              updateEarnedIncomeDisplay(
                characterId,
                taskLevel,
                successLevel,
                proficiencyRank,
                downtimeDays,
                container
              );
            }
          }
        }
      });
    });
  });
  
  // Initialize earned income displays on initial render
  const initialDowntimeDays = parseInt(downtimeDaysInput?.value || '0', 10);
  updateAllEarnedIncomeDisplays(initialDowntimeDays, container);
  
  // ... rest of function ...
}
```


### 7. Template (MODIFIED)

**File**: `templates/party-chronicle-filling.hbs`

**Changes to shared fields section**:

Add XP Earned dropdown and Downtime Days display:

```handlebars
<div class="form-group">
    <label for="xpEarned">XP Earned</label>
    <select id="xpEarned" name="shared.xpEarned">
        <option value="1" {{#if (eq shared.xpEarned 1)}}selected{{/if}}>Bounty (1 XP)</option>
        <option value="2" {{#if (eq shared.xpEarned 2)}}selected{{/if}}>Quest (2 XP)</option>
        <option value="4" {{#if (or (eq shared.xpEarned 4) (not shared.xpEarned))}}selected{{/if}}>Scenario (4 XP)</option>
    </select>
</div>

<div class="form-group">
    <label>Downtime Days</label>
    <div class="downtime-days-value">0</div>
</div>
```

**Changes to character-specific fields section**:

Add earned income inputs and display:

```handlebars
<div class="character-fields">
    {{!-- Existing fields (character name, society ID, level, etc.) --}}
    
    {{!-- NEW: Earned Income Section --}}
    <div class="earned-income-section">
        <h4>Earned Income</h4>
        
        <div class="form-group">
            <label for="taskLevel-{{this.id}}">Task Level</label>
            <select id="taskLevel-{{this.id}}" name="characters.{{this.id}}.taskLevel">
                {{#each (calculateTaskLevelOptions this.level)}}
                    <option value="{{this.value}}" 
                            {{#if (eq this.value (lookup (lookup (lookup ../../savedData.characters ../this.id) 'taskLevel') 'value'))}}selected{{/if}}>
                        {{this.label}}
                    </option>
                {{/each}}
            </select>
            <small class="help-text">
                "-" = no income | Level-3 = infamy | Level-2 = default | Level-1/Level = feat/boon
            </small>
        </div>
        
        <div class="form-group">
            <label for="successLevel-{{this.id}}">Success Level</label>
            <select id="successLevel-{{this.id}}" name="characters.{{this.id}}.successLevel">
                <option value="critical_failure" {{#if (eq (lookup (lookup ../savedData.characters this.id) 'successLevel') 'critical_failure')}}selected{{/if}}>Critical Failure</option>
                <option value="failure" {{#if (eq (lookup (lookup ../savedData.characters this.id) 'successLevel') 'failure')}}selected{{/if}}>Failure</option>
                <option value="success" {{#if (or (eq (lookup (lookup ../savedData.characters this.id) 'successLevel') 'success') (not (lookup (lookup ../savedData.characters this.id) 'successLevel')))}}selected{{/if}}>Success</option>
                <option value="critical_success" {{#if (eq (lookup (lookup ../savedData.characters this.id) 'successLevel') 'critical_success')}}selected{{/if}}>Critical Success</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="proficiencyRank-{{this.id}}">Proficiency Rank</label>
            <select id="proficiencyRank-{{this.id}}" name="characters.{{this.id}}.proficiencyRank">
                <option value="trained" {{#if (eq (lookup (lookup ../savedData.characters this.id) 'proficiencyRank') 'trained')}}selected{{/if}}>Trained</option>
                <option value="expert" {{#if (eq (lookup (lookup ../savedData.characters this.id) 'proficiencyRank') 'expert')}}selected{{/if}}>Expert</option>
                <option value="master" {{#if (eq (lookup (lookup ../savedData.characters this.id) 'proficiencyRank') 'master')}}selected{{/if}}>Master</option>
                <option value="legendary" {{#if (eq (lookup (lookup ../savedData.characters this.id) 'proficiencyRank') 'legendary')}}selected{{/if}}>Legendary</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Earned Income</label>
            <div class="earned-income-value">0.00 gp</div>
        </div>
    </div>
    
    {{!-- Existing fields (gold spent, notes, etc.) --}}
</div>
```

**CSS Styling** (add to `css/style.css`):

```css
.earned-income-section {
  display: contents; /* Remove visual container, keep logical grouping */
}

.earned-income-section h4 {
  display: none; /* Hide the "Earned Income" heading */
}

.earned-income-value {
  padding: 0.25rem 0.5rem;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-family: monospace;
  font-size: var(--font-size-12);
  color: #333;
  text-align: right;
  min-width: 80px;
  width: 100%;
  box-sizing: border-box;
}

.downtime-days-value {
  padding: 0.25rem 0.5rem;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-family: monospace;
  font-size: var(--font-size-12);
  color: #333;
  text-align: right;
  min-width: 80px;
  width: 55%;
  max-width: 280px;
  box-sizing: border-box;
}

.help-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}
```


## Data Models

### Income Table Structure

The income table is a nested object structure pre-computed with all values in gold pieces:

```typescript
{
  0: { 
    failure: 0.01,  // 1 cp = 0.01 gp
    trained: 0.05,  // 5 cp = 0.05 gp
    expert: 0.05,
    master: 0.05,
    legendary: 0.05
  },
  1: {
    failure: 0.02,  // 2 cp = 0.02 gp
    trained: 0.2,   // 2 sp = 0.2 gp
    expert: 0.2,
    master: 0.2,
    legendary: 0.2
  },
  // ... levels 2-19 ...
  20: {
    failure: 0.3,   // 3 sp = 0.3 gp
    trained: 30,    // 30 gp
    expert: 35,     // 35 gp
    master: 40,     // 40 gp
    legendary: 50,  // 50 gp
    critical: {     // Special critical success values for level 20
      trained: 35,
      expert: 40,
      master: 50,
      legendary: 60
    }
  }
}
```

**Properties**:
- Immutable constant (exported as `const`)
- O(1) lookup time for any task level and proficiency rank
- All values pre-converted to gold pieces
- Special handling for level 20 critical success

### DC by Level Table

Simple key-value mapping:

```typescript
{
  0: 14, 1: 15, 2: 16, 3: 18, 4: 19, 5: 20,
  6: 22, 7: 23, 8: 24, 9: 26, 10: 27, 11: 28,
  12: 30, 13: 31, 14: 32, 15: 34, 16: 35, 17: 36,
  18: 38, 19: 39, 20: 40
}
```

**Properties**:
- Immutable constant
- O(1) lookup time
- Covers all valid task levels (0-20)
- Values from official Pathfinder 2e rules

### Task Level Options Structure

Generated dynamically based on character level:

```typescript
[
  { value: '-', label: '-' },
  { value: 0, label: 'Level 0 (DC 14)', dc: 14 },  // max(characterLevel - 3, 0)
  { value: 1, label: 'Level 1 (DC 15)', dc: 15 },  // max(characterLevel - 2, 0)
  { value: 2, label: 'Level 2 (DC 16)', dc: 16 },  // max(characterLevel - 1, 0)
  { value: 3, label: 'Level 3 (DC 18)', dc: 18 }   // characterLevel
]
```

**Properties**:
- Dynamically generated for each character
- All numeric task levels floored at 0
- DC displayed alongside task level
- First option is always "-" (opt-out)


### Data Structure Changes

**Before** (current `UniqueFields`):
```typescript
{
  characterName: string;
  societyId: string;
  level: number;
  incomeEarned: number;  // Manual input
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
  taskLevel: number | string;      // NEW - selected task level or "-"
  successLevel: string;            // NEW - failure, success, or critical_success
  proficiencyRank: string;         // NEW - trained, expert, master, or legendary
  earnedIncome: number;            // MODIFIED - calculated value (replaces incomeEarned)
  goldSpent: number;
  notes: string;
}
```

**Before** (current `SharedFields`):
```typescript
{
  gmPfsNumber: string;
  scenarioName: string;
  eventCode: string;
  eventDate: string;
  xpEarned: number;
  treasureBundles: number;
  // ... other fields ...
}
```

**After** (modified `SharedFields`):
```typescript
{
  gmPfsNumber: string;
  scenarioName: string;
  eventCode: string;
  eventDate: string;
  xpEarned: number;
  treasureBundles: number;
  downtimeDays: number;  // NEW - shared field (0-8)
  // ... other fields ...
}
```

### Calculation Algorithm

**Step 1: Check for Zero Income Cases**
```
if taskLevel === "-" OR successLevel === "critical_failure":
  return 0 (opt-out or critical failure)
```

**Step 2: Determine Effective Task Level**
```
if successLevel === "critical_success":
  if taskLevel === 20:
    use special level 20 critical success table
  else:
    effectiveTaskLevel = max(taskLevel + 1, 3)  // Minimum level 3 for critical success
else:
  effectiveTaskLevel = taskLevel
```

**Step 3: Look Up Income Per Day**
```
if successLevel === "failure":
  incomePerDay = INCOME_TABLE[effectiveTaskLevel].failure
else:
  incomePerDay = INCOME_TABLE[effectiveTaskLevel][proficiencyRank]
```

**Step 4: Calculate Total Income**
```
totalIncome = incomePerDay × downtimeDays
totalIncome = round(totalIncome, 2)  // Round to 2 decimal places
```

**Step 5: Format for Display**
```
displayValue = totalIncome.toFixed(2) + " gp"
```

### Downtime Days Calculation

**Formula**: `downtimeDays = xpEarned × 2` for Quests and Scenarios, `0` for Bounties

**Implementation**:
```
if xpEarned === 1:  // Bounty
  downtimeDays = 0
else:  // Quest (2 XP) or Scenario (4 XP)
  downtimeDays = xpEarned × 2
```

**Examples**:
- Bounty (1 XP) → 0 downtime days
- Quest (2 XP) → 4 downtime days
- Scenario (4 XP) → 8 downtime days


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing the acceptance criteria, I identified several areas of redundancy:

1. **Task Level Options**: Requirements 1.2, 1.8, and 1.9 all relate to task level option generation and flooring at 0. These can be combined into a single comprehensive property.

2. **Critical Success Handling**: Requirements 3.3, 3.4, 6.4, and 6.5 all relate to critical success logic. The level 20 case is an edge case that will be handled by the generator.

3. **Validation**: Requirements 9.1, 9.2, and 9.3 all relate to downtime days validation. These can be combined into a single property about valid range.

4. **Conditional Validation**: Requirements 9.5, 9.6, 9.7, 9.8, and 9.9 all relate to conditional validation when task level is not "-". These can be combined.

5. **Data Persistence**: Requirements 10.1-10.6 all relate to data persistence round-trip. These can be combined into a single property.

6. **Display Formatting**: Requirements 6.7, 6.8, 7.2 all relate to formatting income values. These can be combined.

### Property 1: Task Level Options Generation

*For any* character level from 1 to 20, the generated task level options should contain exactly 5 options: "-" (opt-out), max(level - 3, 0), max(level - 2, 0), max(level - 1, 0), and level, with all numeric options floored at 0 and formatted as "Level X (DC Y)".

**Validates: Requirements 1.2, 1.4, 1.5, 1.8, 1.9, 8.1, 8.4**

### Property 2: Income Table Lookup

*For any* valid task level (0-20), proficiency rank (trained, expert, master, legendary), and success level (failure, success), the income table should return a non-negative gold value.

**Validates: Requirements 4.3, 5.1, 5.2, 5.3, 6.2**

### Property 3: Critical Success Calculation

*For any* task level from 0 to 19, when success level is critical success, the income calculator should use the income value from task level + 1.

**Validates: Requirements 3.5, 6.4**

### Property 4: Income Calculation Formula

*For any* valid income per day value and downtime days value (0-8), the total income should equal income per day × downtime days, rounded to 2 decimal places.

**Validates: Requirements 6.3, 6.7**

### Property 5: Zero Income Cases

*For any* character with task level set to "-" OR success level set to "critical_failure", the calculated earned income should be 0 regardless of other inputs.

**Validates: Requirements 3.4, 6.6**

### Property 6: Downtime Days Validation

*For any* downtime days value, the validator should accept values from 0 to 8 (inclusive) and reject negative values, non-integers, and values greater than 8.

**Validates: Requirements 2.2, 2.3, 9.1, 9.2, 9.3**

### Property 14: Default Success Level

*For any* character where success level is not explicitly set, the form should default to "success".

**Validates: Requirements 3.3, 9.8**

### Property 7: Conditional Validation

*For any* character with task level not equal to "-", the validator should require both success level and proficiency rank to be selected, and should not require them when task level is "-".

**Validates: Requirements 9.5, 9.6, 9.7**

### Property 8: Display Formatting

*For any* calculated earned income value, the formatted display should show the value in gold pieces with exactly 2 decimal places and a "gp" suffix.

**Validates: Requirements 6.8, 7.2**

### Property 9: Reactive Display Updates

*For any* change to task level, success level, proficiency rank, or downtime days, the earned income display should update to reflect the new calculated value.

**Validates: Requirements 7.3**

### Property 10: Shared Downtime Days Propagation

*For any* party with multiple characters, changing the shared downtime days field should update the earned income calculation for all characters.

**Validates: Requirements 2.5**

### Property 11: Data Persistence Round-Trip

*For any* valid earned income input values (downtime days, task level, success level, proficiency rank), saving and then loading the form data should restore all input values correctly.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

### Property 12: PDF Generation Integration

*For any* character with earned income inputs, the PDF generator should receive the calculated earned income value and write it to the appropriate field on the chronicle template.

**Validates: Requirements 12.1, 12.2, 12.3**

### Property 13: DC Lookup Accuracy

*For any* task level from 0 to 20, the DC lookup should return the correct DC value according to the Pathfinder 2e DC by level table.

**Validates: Requirements 8.2**


## Error Handling

### Input Validation Errors

**Invalid Downtime Days**:
- **Error**: Downtime days is not a number, is negative, or exceeds 8
- **Handling**: Display validation error message, prevent PDF generation
- **User Feedback**: "Downtime Days must be a number between 0 and 8"

**Missing Required Fields**:
- **Error**: Task level is not "-" but success level or proficiency rank is not selected
- **Handling**: Display validation error message, prevent PDF generation
- **User Feedback**: "{Character Name}: Success Level is required when Task Level is not '-'"

**Invalid Task Level**:
- **Error**: Task level is not a valid number (0-20) or "-"
- **Handling**: Display validation error message, prevent PDF generation
- **User Feedback**: "{Character Name}: Task Level must be between 0 and 20 or '-'"

### Calculation Errors

**Invalid Character Level**:
- **Error**: Character level is outside range 1-20 when generating task level options
- **Handling**: Floor all task level options at 0, log warning
- **User Feedback**: None (defensive programming handles edge case)

**Missing Income Table Entry**:
- **Error**: Income table lookup fails for a valid task level/proficiency combination
- **Handling**: Return 0, log error
- **User Feedback**: None (should never occur with complete table)

### Display Update Errors

**Missing Display Element**:
- **Error**: Earned income display element not found in DOM
- **Handling**: Log warning, skip update
- **User Feedback**: None (defensive programming)

**Invalid Input Values During Update**:
- **Error**: Input values are invalid when calculating display update
- **Handling**: Display "0.00 gp" as fallback
- **User Feedback**: None (validation will catch on save)

### PDF Generation Errors

**Missing Earned Income Data**:
- **Error**: Character data missing earned income inputs during PDF generation
- **Handling**: Use 0 as default value, log warning
- **User Feedback**: None (validation should prevent this)

**Layout Missing Income Field**:
- **Error**: Chronicle layout doesn't have an income_earned field
- **Handling**: Skip writing income field, log warning
- **User Feedback**: None (layout-specific behavior)


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Specific income table lookups (e.g., level 0 failure = 0.01 gp)
- Level 20 critical success special case
- Task level option generation for edge cases (level 1, level 2, level 3)
- DC lookup for specific levels
- Opt-out behavior (task level = "-")
- Zero downtime days edge case
- UI element existence and structure
- Event listener attachment
- Data persistence integration

**Property-Based Tests**: Verify universal properties across all inputs
- Task level options generation for all character levels 1-20
- Income table lookup for all valid combinations
- Critical success calculation for all task levels 0-19
- Income calculation formula for all valid inputs
- Downtime days validation for all possible values
- Conditional validation for all task level values
- Display formatting for all income values
- Data persistence round-trip for all valid inputs

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `// Feature: earned-income-calculation, Property {number}: {property_text}`

**Example Property Test Structure**:

```typescript
import fc from 'fast-check';

// Feature: earned-income-calculation, Property 1: Task Level Options Generation
test('task level options generation', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 20 }), // character level
      (characterLevel) => {
        const options = calculateTaskLevelOptions(characterLevel);
        
        // Should have exactly 5 options
        expect(options).toHaveLength(5);
        
        // First option should be "-"
        expect(options[0].value).toBe('-');
        
        // All numeric options should be >= 0
        for (let i = 1; i < options.length; i++) {
          expect(options[i].value).toBeGreaterThanOrEqual(0);
        }
        
        // Options should match expected values
        expect(options[1].value).toBe(Math.max(characterLevel - 3, 0));
        expect(options[2].value).toBe(Math.max(characterLevel - 2, 0));
        expect(options[3].value).toBe(Math.max(characterLevel - 1, 0));
        expect(options[4].value).toBe(characterLevel);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: earned-income-calculation, Property 4: Income Calculation Formula
test('income calculation formula', () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 1000 }), // income per day
      fc.integer({ min: 0, max: 8 }),   // downtime days
      (incomePerDay, downtimeDays) => {
        const expected = Math.round(incomePerDay * downtimeDays * 100) / 100;
        const actual = calculateEarnedIncome(5, 'success', 'trained', downtimeDays);
        
        // Should match formula: income per day × downtime days, rounded to 2 decimals
        expect(actual).toBeCloseTo(expected, 2);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Goals

**Calculator Module** (`earned-income-calculator.ts`):
- 100% coverage of all exported functions
- Property tests for all calculation functions
- Unit tests for edge cases (level 20 critical, opt-out, zero downtime)

**Validator Module** (`party-chronicle-validator.ts`):
- 100% coverage of earned income validation logic
- Property tests for validation rules
- Unit tests for error message formatting

**Handler Module** (`party-chronicle-handlers.ts`):
- Integration tests for display update functions
- Unit tests for event handler logic
- Mock DOM elements for testing

**Mapper Module** (`party-chronicle-mapper.ts`):
- Integration tests for earned income calculation during mapping
- Unit tests for data transformation

**Template**:
- UI structure tests (elements exist, correct attributes)
- Integration tests with event handlers

### Integration Testing

**Form Interaction Flow**:
1. Render form with test party data
2. Change downtime days input
3. Verify all earned income displays update
4. Change character-specific inputs
5. Verify individual earned income display updates
6. Save form data
7. Reload form
8. Verify all values restored correctly

**PDF Generation Flow**:
1. Create test party chronicle data with earned income inputs
2. Generate PDF
3. Verify income_earned field written to PDF
4. Verify value matches calculated income

**Validation Flow**:
1. Enter invalid downtime days
2. Verify validation error displayed
3. Enter valid downtime days
4. Verify validation error cleared
5. Set task level to non-"-" value
6. Leave success level blank
7. Verify validation error displayed


## Implementation Notes

### Income Table Data

The complete income table must be implemented with all values pre-converted to gold pieces. Here is the full table structure:

**Levels 0-10**:
```typescript
{
  0: { failure: 0.01, trained: 0.05, expert: 0.05, master: 0.05, legendary: 0.05 },
  1: { failure: 0.02, trained: 0.2, expert: 0.2, master: 0.2, legendary: 0.2 },
  2: { failure: 0.04, trained: 0.3, expert: 0.3, master: 0.3, legendary: 0.3 },
  3: { failure: 0.08, trained: 0.5, expert: 0.5, master: 0.5, legendary: 0.5 },
  4: { failure: 0.1, trained: 0.8, expert: 1, master: 1, legendary: 1 },
  5: { failure: 0.2, trained: 1, expert: 1.3, master: 1.3, legendary: 1.3 },
  6: { failure: 0.3, trained: 1.5, expert: 2, master: 2, legendary: 2 },
  7: { failure: 0.4, trained: 2, expert: 2.5, master: 2.5, legendary: 2.5 },
  8: { failure: 0.5, trained: 2.5, expert: 3, master: 3, legendary: 3 },
  9: { failure: 0.6, trained: 3, expert: 4, master: 4, legendary: 4 },
  10: { failure: 0.8, trained: 4, expert: 5, master: 6, legendary: 6 }
}
```

**Levels 11-20**:
```typescript
{
  11: { failure: 1, trained: 5, expert: 6, master: 8, legendary: 8 },
  12: { failure: 1.3, trained: 6, expert: 8, master: 10, legendary: 10 },
  13: { failure: 1.5, trained: 7, expert: 10, master: 15, legendary: 15 },
  14: { failure: 2, trained: 8, expert: 15, master: 20, legendary: 20 },
  15: { failure: 2.5, trained: 10, expert: 20, master: 28, legendary: 28 },
  16: { failure: 3, trained: 13, expert: 25, master: 36, legendary: 40 },
  17: { failure: 4, trained: 15, expert: 30, master: 45, legendary: 55 },
  18: { failure: 5, trained: 20, expert: 45, master: 70, legendary: 90 },
  19: { failure: 6, trained: 30, expert: 60, master: 100, legendary: 130 },
  20: { 
    failure: 0.3, 
    trained: 30, 
    expert: 35, 
    master: 40, 
    legendary: 50,
    critical: { 
      trained: 35, 
      expert: 40, 
      master: 50, 
      legendary: 60 
    }
  }
}
```

**Note**: Level 20 has special critical success values that differ from the standard "use next level" rule.

### Handlebars Helper

A Handlebars helper function is needed to generate task level options dynamically:

```typescript
Handlebars.registerHelper('calculateTaskLevelOptions', function(characterLevel: number) {
  return calculateTaskLevelOptions(characterLevel);
});
```

This helper should be registered in `main.ts` before rendering the template.

### Backward Compatibility

**Loading Legacy Data**:
- If saved data contains `incomeEarned` field, ignore it
- Initialize earned income inputs to default values (task level = level - 2, success level = success, proficiency rank = trained, downtime days = 0)
- Recalculate earned income from inputs

**Saving New Data**:
- Save all earned income inputs (taskLevel, successLevel, proficiencyRank)
- Save calculated earnedIncome for display purposes
- Do not save legacy incomeEarned field

### Performance Considerations

**Income Table Lookup**: O(1) constant time lookup using object keys

**Task Level Options Generation**: O(1) constant time (always generates exactly 5 options)

**Display Updates**: Minimize DOM queries by caching element references where possible

**Event Listeners**: Use event delegation where appropriate to reduce number of listeners

### Accessibility

**Form Labels**: All inputs must have associated labels with `for` attributes

**Help Text**: Provide explanatory text for task level options to guide users

**Keyboard Navigation**: Ensure all dropdowns are keyboard accessible

**Screen Readers**: Use semantic HTML and ARIA labels where appropriate

**Error Messages**: Associate validation errors with their corresponding form fields

