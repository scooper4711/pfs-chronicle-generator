# Design Document: Clickable Player Portraits

## Overview

This feature enhances the Party Chronicle Filling interface by making player portraits interactive. When a GM clicks on a player's portrait, the system will open that player's actor sheet, providing quick access to character details while filling out chronicles. The implementation leverages Foundry VTT's built-in actor sheet rendering system and maintains the existing visual design while adding cursor feedback for clickability.

The feature is minimal in scope - it adds a single click event handler to portrait images and uses Foundry's native `actor.sheet.render(true)` method to display the actor sheet. This approach ensures compatibility with the existing codebase and requires no changes to data structures or storage mechanisms.

## Architecture

### Rendering Architecture

**IMPORTANT**: This feature follows the hybrid ApplicationV2 pattern described in `.kiro/steering/architecture.md`. 

Key points:
- Event listeners must be added in `main.ts` in `renderPartyChronicleForm()`, NOT in `PartyChronicleApp._onRender()`
- The portrait click handler is implemented in `main.ts` using native DOM APIs
- See the architecture guide for full details on why this pattern exists and future migration path

### Component Overview

The implementation involves modifications to two components:

- **main.ts** (`scripts/main.ts`): Contains the `renderPartyChronicleForm()` function where event listeners are attached
  - Add portrait click event listeners after the template is rendered
  - Use native DOM APIs (`querySelectorAll`, `addEventListener`) for modern approach
  - Handle portrait clicks by calling the Foundry VTT actor sheet API

- **PartyChronicleApp** (`scripts/PartyChronicleApp.ts`): The main application class (used only for context preparation)
  - Contains the `_onPortraitClick` method for reference/documentation
  - This method is NOT used in the current implementation
  - Kept for potential future refactoring to full ApplicationV2 lifecycle

### Integration Points

1. **Foundry VTT Actor API**: The feature uses `actor.sheet.render(true, { focus: true })` to open or focus actor sheets
   - `render(true)` forces a re-render if the sheet is already open
   - `{ focus: true }` brings the window to the front
   - Foundry automatically handles duplicate prevention (only one sheet instance per actor)

2. **Handlebars Template** (`templates/party-chronicle-filling.hbs`): The portrait images are rendered with class `actor-link` inside `.actor-image` containers. The click handler will target these images.

3. **CSS Styling** (`css/style.css`): The styling already implemented by the PFS system is sufficient, as it already changes the pointer to a hand when hovered.

### Data Flow

```
User clicks portrait image
    ↓
Click event captured by PartyChronicleApp._onPortraitClick()
    ↓
Extract actor ID from parent element's data-character-id attribute
    ↓
Find actor object in this.partyActors array
    ↓
Call actor.sheet.render(true, { focus: true })
    ↓
Foundry VTT opens/focuses the actor sheet window
```

## Components and Interfaces

### Modified Components

#### main.ts - renderPartyChronicleForm()

**Portrait Click Handler (Added after Generate Chronicles button handler)**
- Location: In the `renderPartyChronicleForm()` function, after all other event listeners
- Implementation:
  ```typescript
  // Portrait click handler
  const portraits = container.querySelectorAll('.actor-image img.actor-link');
  portraits.forEach((img) => {
    img.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault();
      
      const memberActivity = (event.target as HTMLElement).closest('.member-activity');
      const characterId = memberActivity?.getAttribute('data-character-id');
      
      if (!characterId) return;
      
      const actor = partyActors.find(a => a?.id === characterId);
      actor?.sheet?.render(true, { focus: true });
    });
  });
  ```
- Uses native DOM APIs (`querySelectorAll`, `addEventListener`)
- Extracts character ID from `data-character-id` attribute
- Finds actor in `partyActors` array
- Opens actor sheet using Foundry's `actor.sheet.render(true, { focus: true })`

#### PartyChronicleApp (Reference Only)

**Method: `_onPortraitClick(event: MouseEvent)`**
- Purpose: Reference implementation of portrait click handler
- Status: NOT USED in current implementation (see Rendering Architecture above)
- Kept for documentation and potential future refactoring
- Contains the same logic as the handler in main.ts

### CSS Changes

Add to `css/style.css`:
```css
.sheet.party [data-tab=pfs] .activities .member-activity .actor-image img.actor-link {
    cursor: pointer;
}
```

## Data Models

No changes to data models are required. The feature uses existing data structures:
- `this.partyActors`: Array of actor objects passed to the constructor
- `data-character-id`: HTML attribute already present on `.member-activity` elements
- Actor objects have a `.sheet` property that provides access to the actor sheet instance

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Portrait Click Opens Actor Sheet

*For any* party member displayed in the Party Chronicle interface, clicking on their portrait image should result in their actor sheet being rendered.

**Validates: Requirements 1.1, 1.4**

### Property 2: Cursor Indicates Clickability

*For any* portrait image in the Party Chronicle interface, the computed cursor style should be 'pointer' to indicate clickability.

**Validates: Requirements 1.2**

### Property 3: Form State Preservation

*For any* form field state and any portrait click, the form field values should remain unchanged after the portrait click completes.

**Validates: Requirements 1.3**

### Property 4: Visual Properties Preserved

*For any* portrait image in the Party Chronicle interface, the computed width and height should be 64px, and the border-radius should be 4px.

**Validates: Requirements 2.1, 2.2**

### Property 5: Single Sheet Instance

*For any* actor, multiple rapid calls to render the actor sheet should result in only one sheet window instance being created.

**Validates: Requirements 3.2**

### Property 6: Focus Existing Sheet

*For any* actor with an already-open sheet, calling render on the actor sheet should bring the existing window to focus rather than creating a duplicate window.

**Validates: Requirements 3.3**

## Error Handling

### Missing Actor Data

When a portrait is clicked but the corresponding actor cannot be found in `this.partyActors`:
- The click handler will check if the actor exists before attempting to render the sheet
- If the actor is `null` or `undefined`, the handler will return early without action
- No error notification will be displayed to the user (silent failure)
- This handles the edge case where actor data becomes unavailable after the interface is rendered

### Foundry API Errors

If `actor.sheet.render()` throws an error:
- The error will be caught and logged to the console
- No user-facing error notification will be displayed
- The form state will remain unchanged
- This provides graceful degradation if the Foundry API encounters issues

### Event Handler Errors

The click event handler will:
- Use `event.preventDefault()` to prevent any default link behavior
- Use optional chaining (`actor?.sheet?.render()`) to safely access nested properties
- Validate that the actor has a sheet property before attempting to render

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

1. **Portrait Click Handler Registration**: Verify that click event listeners are attached to all portrait images during `_onRender`
2. **Actor ID Extraction**: Test that the handler correctly extracts the character ID from the `data-character-id` attribute
3. **Actor Lookup**: Test that the handler finds the correct actor in `this.partyActors` array
4. **Missing Actor Handling**: Test that clicking a portrait when the actor is not found results in no error and no sheet render call
5. **CSS Cursor Style**: Verify that the CSS rule for `.actor-link` sets `cursor: pointer`

### Property-Based Testing

Property-based tests will use the **fast-check** library for TypeScript to verify universal properties across randomized inputs. Each test will run a minimum of 100 iterations.

1. **Property 1: Portrait Click Opens Actor Sheet**
   - Generate: Random party member from the party actors array
   - Action: Simulate click on the portrait element
   - Verify: `actor.sheet.render` is called with `(true, { focus: true })`
   - Tag: **Feature: clickable-player-portraits, Property 1: For any party member displayed in the Party Chronicle interface, clicking on their portrait image should result in their actor sheet being rendered**

2. **Property 2: Cursor Indicates Clickability**
   - Generate: Random portrait image element
   - Action: Query computed style for cursor property
   - Verify: Cursor style equals 'pointer'
   - Tag: **Feature: clickable-player-portraits, Property 2: For any portrait image in the Party Chronicle interface, the computed cursor style should be 'pointer' to indicate clickability**

3. **Property 3: Form State Preservation**
   - Generate: Random form field values, random party member to click
   - Action: Set form values, capture state, simulate portrait click, capture state again
   - Verify: Form state before and after are identical
   - Tag: **Feature: clickable-player-portraits, Property 3: For any form field state and any portrait click, the form field values should remain unchanged after the portrait click completes**

4. **Property 4: Visual Properties Preserved**
   - Generate: Random portrait image element
   - Action: Query computed styles for width, height, border-radius
   - Verify: Width = 64px, height = 64px, border-radius = 4px
   - Tag: **Feature: clickable-player-portraits, Property 4: For any portrait image in the Party Chronicle interface, the computed width and height should be 64px, and the border-radius should be 4px**

5. **Property 5: Single Sheet Instance**
   - Generate: Random actor, random number of rapid clicks (2-10)
   - Action: Simulate multiple rapid clicks on the same portrait
   - Verify: Only one sheet window instance exists for the actor
   - Tag: **Feature: clickable-player-portraits, Property 5: For any actor, multiple rapid calls to render the actor sheet should result in only one sheet window instance being created**

6. **Property 6: Focus Existing Sheet**
   - Generate: Random actor
   - Action: Render actor sheet, then render again
   - Verify: Second render call focuses existing window (check window.bringToTop is called)
   - Tag: **Feature: clickable-player-portraits, Property 6: For any actor with an already-open sheet, calling render on the actor sheet should bring the existing window to focus rather than creating a duplicate window**

### Testing Balance

The testing strategy uses both unit tests and property-based tests:
- **Unit tests** focus on specific examples, edge cases (missing actor data), and integration points (event listener attachment, CSS rules)
- **Property tests** verify universal behaviors across all party members and all possible form states, ensuring the feature works correctly regardless of the specific data

This dual approach provides comprehensive coverage: unit tests catch concrete implementation bugs, while property tests verify that the general correctness properties hold across the full input space.

