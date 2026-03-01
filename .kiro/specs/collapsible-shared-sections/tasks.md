# Implementation Plan: Collapsible Shared Sections

## Overview

This feature adds collapsible functionality to five shared sections in the party chronicle form's sidebar. The implementation follows the hybrid ApplicationV2 pattern where event listeners are attached in `main.ts` and handler logic is extracted to dedicated modules. The feature includes chevron indicators, summary text generation, persistent collapse state, and full keyboard accessibility.

## Tasks

- [x] 1. Create collapse state storage module
  - Create `scripts/model/collapse-state-storage.ts`
  - Implement `CollapseStateStorage` interface
  - Implement `saveCollapseState()` function to save state to localStorage
  - Implement `loadCollapseState()` function to load state from localStorage
  - Implement `getDefaultCollapseState()` function with default states per section
  - Implement `loadAllCollapseStates()` function to load all states
  - Use storage key: `pfs-chronicle-generator.collapseSections`
  - _Requirements: collapsible-shared-sections 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ]* 1.1 Write property test for collapse state persistence
  - **Property 9: Collapse state persists to storage**
  - **Validates: Requirements 6.1**
  - Generate random section IDs and collapse states
  - Verify state is saved to localStorage
  - _Requirements: collapsible-shared-sections 6.1_

- [ ]* 1.2 Write property test for collapse state restoration
  - **Property 10: Collapse state restores from storage**
  - **Validates: Requirements 6.2**
  - Generate random saved states
  - Verify states are correctly loaded from localStorage
  - _Requirements: collapsible-shared-sections 6.2_

- [ ]* 1.3 Write unit tests for storage module
  - Test default collapse states for each section
  - Test localStorage unavailable scenario
  - Test invalid section IDs
  - _Requirements: collapsible-shared-sections 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 2. Create summary text generation utilities
  - Create `scripts/utils/summary-utils.ts`
  - Implement `generateEventDetailsSummary()` function
  - Implement `generateReputationSummary()` function
  - Implement `generateSharedRewardsSummary()` function
  - Handle empty/default values appropriately
  - Implement text truncation for long summaries
  - _Requirements: collapsible-shared-sections 1.5, 1.6, 1.7, 2.5, 2.6, 2.7, 2.8, 2.9, 3.5, 3.6_

- [x] 2.1 Write property test for Event Details summary format
  - **Property 5: Event Details summary contains scenario name**
  - **Validates: Requirements 1.5**
  - Generate random scenario names
  - Verify summary format matches "Event Details - {scenario name}"
  - _Requirements: collapsible-shared-sections 1.5_

- [x] 2.2 Write property test for Reputation summary format
  - **Property 6: Reputation summary contains chosen faction value**
  - **Validates: Requirements 2.5**
  - Generate random chosen faction reputation values
  - Verify summary format matches "Reputation - +{value}"
  - _Requirements: collapsible-shared-sections 2.5_

- [x] 2.3 Write property test for Reputation summary with faction values
  - **Property 7: Reputation summary includes non-zero faction values**
  - **Validates: Requirements 2.6**
  - Generate random faction reputation combinations
  - Verify non-zero values are included with semicolon separation
  - _Requirements: collapsible-shared-sections 2.6_

- [x] 2.4 Write property test for Shared Rewards summary format
  - **Property 8: Shared Rewards summary contains XP and treasure bundles**
  - **Validates: Requirements 3.5**
  - Generate random XP and treasure bundle values
  - Verify summary format matches "Shared Rewards - {xp} XP; {tb} TB"
  - _Requirements: collapsible-shared-sections 3.5_

- [ ]* 2.5 Write unit tests for summary utilities
  - Test empty scenario name displays "(No scenario name)"
  - Test all faction reputations are zero (only chosen faction shown)
  - Test text truncation for long summaries
  - Test invalid field values
  - _Requirements: collapsible-shared-sections 1.6, 1.7, 2.7, 2.9, 3.6_

- [x] 3. Create collapsible section event handlers
  - Create `scripts/handlers/collapsible-section-handlers.ts`
  - Implement `handleSectionHeaderClick()` function
  - Implement `handleSectionHeaderKeydown()` function for Enter/Space keys
  - Implement `toggleSectionCollapse()` function
  - Implement `updateSectionSummary()` function
  - Implement `updateAllSectionSummaries()` function
  - Implement `initializeCollapseSections()` function
  - Integrate with storage module for persistence
  - Integrate with summary utilities for text generation
  - _Requirements: collapsible-shared-sections 1.2, 2.2, 3.2, 4.2, 5.2, 7.1, 7.2, 7.3, 7.4, 8.2, 8.3_

- [ ]* 3.1 Write property test for header click toggle
  - **Property 3: Header click toggles collapse state**
  - **Validates: Requirements 1.2, 2.2, 3.2, 4.2, 5.2**
  - Generate random section IDs and initial collapse states
  - Simulate header click
  - Verify collapse state toggles to opposite value
  - _Requirements: collapsible-shared-sections 1.2, 2.2, 3.2, 4.2, 5.2_

- [ ]* 3.2 Write property test for keyboard toggle
  - **Property 15: Keyboard interaction toggles collapse state**
  - **Validates: Requirements 8.2, 8.3**
  - Generate random section IDs and initial collapse states
  - Simulate Enter and Space key presses
  - Verify collapse state toggles for both keys
  - _Requirements: collapsible-shared-sections 8.2, 8.3_

- [x] 3.3 Write property test for summary updates on field change
  - **Property 14: Summary updates regardless of collapse state**
  - **Validates: Requirements 7.4**
  - Generate random collapse states and field value changes
  - Verify summary updates in both collapsed and expanded states
  - _Requirements: collapsible-shared-sections 7.4_

- [ ]* 3.4 Write unit tests for handler functions
  - Test invalid section IDs
  - Test missing DOM elements
  - Test error handling for storage failures
  - Test integration with existing field change handlers
  - _Requirements: collapsible-shared-sections 1.2, 2.2, 3.2, 4.2, 5.2, 7.1, 7.2, 7.3_

- [x] 4. Update template with collapsible structure
  - Modify `templates/party-chronicle-filling.hbs`
  - Add collapsible structure to Event Details section
  - Add collapsible structure to Reputation section
  - Add collapsible structure to Shared Rewards section
  - Add collapsible structure to Adventure Summary section
  - Add collapsible structure to Items to Strike Out section
  - Add chevron indicator elements to each section header
  - Add summary text containers to sections with summaries
  - Add collapsible content wrappers around existing form fields
  - Add ARIA attributes: role="button", tabindex="0", aria-expanded, aria-controls
  - Add data-section-id attributes for each section
  - _Requirements: collapsible-shared-sections 1.1, 1.3, 1.4, 2.1, 2.3, 2.4, 3.1, 3.3, 3.4, 4.1, 4.3, 4.4, 5.1, 5.3, 5.4, 8.1, 8.4, 8.5, 8.6_

- [ ]* 4.1 Write property test for section header structure
  - **Property 1: Section headers contain chevron indicators**
  - **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**
  - Verify all collapsible sections have chevron indicator elements
  - _Requirements: collapsible-shared-sections 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ]* 4.2 Write property test for ARIA attributes
  - **Property 16: ARIA expanded attribute reflects collapse state**
  - **Validates: Requirements 8.4**
  - Generate random collapse states
  - Verify aria-expanded is "true" when expanded, "false" when collapsed
  - _Requirements: collapsible-shared-sections 8.4_

- [ ]* 4.3 Write property test for keyboard focusability
  - **Property 17: Section headers are keyboard focusable**
  - **Validates: Requirements 8.1**
  - Verify all section headers are focusable via keyboard
  - _Requirements: collapsible-shared-sections 8.1_

- [ ]* 4.4 Write property test for required ARIA attributes
  - **Property 18: Section headers have required ARIA attributes**
  - **Validates: Requirements 8.5, 8.6**
  - Verify all section headers have role="button" and aria-controls
  - _Requirements: collapsible-shared-sections 8.5, 8.6_

- [x] 5. Add CSS styling for collapsible sections
  - Modify `css/style.css`
  - Add styles for `.collapsible-section` class
  - Add styles for `.collapsible-header` class with hover/focus states
  - Add styles for `.chevron` indicator
  - Add styles for `.section-summary` text with truncation
  - Add styles for `.collapsible-content` in collapsed state (display: none)
  - Add transition animations for smooth collapse/expand
  - Ensure keyboard focus indicators are visible
  - _Requirements: collapsible-shared-sections 1.3, 1.4, 1.6, 1.8, 1.9, 2.3, 2.4, 2.9, 2.10, 2.11, 3.3, 3.4, 3.6, 3.7, 3.8, 4.3, 4.4, 4.5, 4.6, 5.3, 5.4, 5.5, 5.6_

- [ ]* 5.1 Write property test for chevron indicator display
  - **Property 2: Chevron indicator reflects collapse state**
  - **Validates: Requirements 1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 4.3, 4.4, 5.3, 5.4**
  - Generate random collapse states
  - Verify chevron displays "▶" when collapsed, "▼" when expanded
  - _Requirements: collapsible-shared-sections 1.3, 1.4, 2.3, 2.4, 3.3, 3.4, 4.3, 4.4, 5.3, 5.4_

- [ ]* 5.2 Write property test for field visibility
  - **Property 4: Collapse state determines field visibility**
  - **Validates: Requirements 1.8, 1.9, 2.10, 2.11, 3.7, 3.8, 4.5, 4.6, 5.5, 5.6**
  - Generate random collapse states
  - Verify fields are hidden when collapsed, visible when expanded
  - _Requirements: collapsible-shared-sections 1.8, 1.9, 2.10, 2.11, 3.7, 3.8, 4.5, 4.6, 5.5, 5.6_

- [x] 6. Attach event listeners in main.ts
  - Modify `scripts/main.ts` in `renderPartyChronicleForm()` function
  - Import handler functions from `collapsible-section-handlers.ts`
  - Attach click event listeners to all section headers
  - Attach keydown event listeners to all section headers
  - Call `initializeCollapseSections()` after template rendering
  - Call `updateAllSectionSummaries()` after initialization
  - _Requirements: collapsible-shared-sections 1.2, 2.2, 3.2, 4.2, 5.2, 8.2, 8.3_

- [x] 7. Integrate summary updates with field change handlers
  - Modify `scripts/handlers/party-chronicle-handlers.ts`
  - Update `handleFieldChange()` to call `updateSectionSummary()` for relevant sections
  - Ensure Event Details fields trigger Event Details summary update
  - Ensure Reputation fields trigger Reputation summary update
  - Ensure Shared Rewards fields trigger Shared Rewards summary update
  - _Requirements: collapsible-shared-sections 7.1, 7.2, 7.3, 7.4_

- [ ]* 7.1 Write property test for Event Details summary updates
  - **Property 11: Event Details summary updates on field change**
  - **Validates: Requirements 7.1**
  - Generate random scenario name changes
  - Verify summary text updates to reflect new value
  - _Requirements: collapsible-shared-sections 7.1_

- [ ]* 7.2 Write property test for Reputation summary updates
  - **Property 12: Reputation summary updates on field change**
  - **Validates: Requirements 7.2**
  - Generate random reputation field changes
  - Verify summary text updates to reflect new values
  - _Requirements: collapsible-shared-sections 7.2_

- [ ]* 7.3 Write property test for Shared Rewards summary updates
  - **Property 13: Shared Rewards summary updates on field change**
  - **Validates: Requirements 7.3**
  - Generate random XP and treasure bundle changes
  - Verify summary text updates to reflect new values
  - _Requirements: collapsible-shared-sections 7.3_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- The checkpoint ensures incremental validation before completion
- Follow the hybrid ApplicationV2 pattern: event listeners in main.ts, handler logic in dedicated modules
- All new code must include JSDoc comments with requirement references (format: `Requirements: collapsible-shared-sections X.Y`)
- Maintain file size under 300 lines per file (extract to utilities if needed)
- Keep function cyclomatic complexity under 15 (preferably under 5)
