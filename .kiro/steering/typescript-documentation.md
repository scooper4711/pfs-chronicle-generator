---
inclusion: fileMatch
fileMatchPattern: "scripts/**,*.ts,*.tsx"
---

# TypeScript Documentation Standards

## JSDoc Requirement References

- When documenting functions, classes, or methods that implement specific requirements from a spec, include a "Requirements:" line in the JSDoc
- **CRITICAL**: Always prefix requirement numbers with the spec/feature name to avoid confusion
- Each spec restarts requirement numbering from 1, so the prefix is essential for clarity
- Format: `Requirements: spec-name requirement-numbers`

## Attribution Scope

- **Attribute at the method/class level, NOT individual lines of code**
- When a method is created or modified to support a requirement, update the method's JSDoc comment
- Do NOT add inline comments attributing individual lines to requirements
- If a method implements multiple requirements, list all relevant requirement numbers

## Examples

```typescript
/**
 * Calculates the total gold from treasure bundles for a character.
 * 
 * @param treasureBundles - Number of treasure bundles
 * @param characterLevel - Character level (1-20)
 * @returns Total gold from treasure bundles
 * 
 * Requirements: treasure-bundle-calculation 2.1, 2.2, 2.3, 2.4
 */
export function calculateTreasureBundlesGp(
  treasureBundles: number,
  characterLevel: number
): number {
  const bundleValue = getTreasureBundleValue(characterLevel);
  return Math.round(treasureBundles * bundleValue * 100) / 100;
}

/**
 * Handles portrait click events to open character sheets.
 * 
 * @param event - The mouse click event
 * @param partyActors - Array of party member actors
 * 
 * Requirements: clickable-player-portraits 1.1, 1.3, 1.4, 3.1, 3.2, 3.3
 */
export function handlePortraitClick(event: MouseEvent, partyActors: any[]): void {
  event.preventDefault();
  const characterId = (event.target as HTMLElement).closest('.member-activity')?.getAttribute('data-character-id');
  // ...
}
```

## Bad Example - Don't Do This

```typescript
export function extractFormData(container: HTMLElement, partyActors: any[]): any {
  const shared: any = {
    gmPfsNumber: (container.querySelector('#gmPfsNumber') as HTMLInputElement)?.value || '',
    // Requirements: multi-line-reputation-tracking 1.2, 4.2  ❌ DON'T attribute individual lines
    chosenFactionReputation: parseInt((container.querySelector('#chosenFactionReputation') as HTMLInputElement)?.value) || 2,
  };
}
```

## Good Example - Do This Instead

```typescript
/**
 * Extracts form data into PartyChronicleData structure.
 * 
 * @param container - HTMLElement wrapping the form container
 * @param partyActors - Array of party member actors
 * @returns Structured form data object
 * 
 * Requirements: party-chronicle-filling 4.5, multi-line-reputation-tracking 1.2, 1.3, 4.1, 4.2
 */
export function extractFormData(container: HTMLElement, partyActors: any[]): any {
  const shared: any = {
    gmPfsNumber: (container.querySelector('#gmPfsNumber') as HTMLInputElement)?.value || '',
    chosenFactionReputation: parseInt((container.querySelector('#chosenFactionReputation') as HTMLInputElement)?.value) || 2,
  };
}
```

## Spec Name Format

- Use the kebab-case directory name from `.kiro/specs/`
- Examples: `treasure-bundle-calculation`, `party-chronicle-filling`, `multi-line-reputation-tracking`
- For bugfix specs, use the directory name (e.g., `retain-society-tab-focus`)
