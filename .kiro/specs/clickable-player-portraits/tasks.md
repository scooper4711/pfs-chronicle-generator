# Implementation Plan: Clickable Player Portraits

## Overview

This implementation adds click event handling to player portraits in the Party Chronicle Filling interface. The approach is minimal - we'll add a single click handler method to PartyChronicleApp, attach event listeners during the render lifecycle, and add CSS for cursor feedback. The implementation leverages Foundry VTT's native actor sheet API to open character sheets.

## Tasks

- [x] 1. CSS styling for clickable portraits (already implemented)
  - The PFS system already has cursor pointer styling for `.actor-link` elements
  - No additional CSS changes needed
  - _Requirements: 1.2, 2.4_

- [x] 2. Implement portrait click handler in PartyChronicleApp
  - [x] 2.1 Create `_onPortraitClick` method
    - Extract character ID from the clicked element's parent `.member-activity` data attribute
    - Find the corresponding actor in `this.partyActors` array
    - Call `actor.sheet.render(true, { focus: true })` if actor exists
    - Use optional chaining to handle missing actor data gracefully
    - Prevent default event behavior
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3_
  
  - [ ]* 2.2 Write property test for portrait click opens actor sheet
    - **Property 1: Portrait Click Opens Actor Sheet**
    - **Validates: Requirements 1.1, 1.4**
  
  - [ ]* 2.3 Write property test for form state preservation
    - **Property 3: Form State Preservation**
    - **Validates: Requirements 1.3**
  
  - [ ]* 2.4 Write unit tests for edge cases
    - Test missing actor data handling
    - Test actor ID extraction from DOM
    - Test actor lookup in partyActors array
    - _Requirements: 3.1_

- [x] 3. Attach event listeners during render lifecycle
  - [x] 3.1 Modify `_onRender` method to attach click listeners
    - Use `html.find('.actor-image img.actor-link').on('click', this._onPortraitClick.bind(this))`
    - Ensure listeners are attached after the template is rendered
    - _Requirements: 1.1, 1.4_
  
  - [ ]* 3.2 Write unit test for event listener registration
    - Verify click listeners are attached to all portrait images
    - _Requirements: 1.1, 1.4_

- [ ] 4. Verify visual properties and cursor behavior
  - [ ]* 4.1 Write property test for cursor indicates clickability
    - **Property 2: Cursor Indicates Clickability**
    - **Validates: Requirements 1.2**
  
  - [ ]* 4.2 Write property test for visual properties preserved
    - **Property 4: Visual Properties Preserved**
    - **Validates: Requirements 2.1, 2.2**

- [ ] 5. Test duplicate sheet handling
  - [ ]* 5.1 Write property test for single sheet instance
    - **Property 5: Single Sheet Instance**
    - **Validates: Requirements 3.2**
  
  - [ ]* 5.2 Write property test for focus existing sheet
    - **Property 6: Focus Existing Sheet**
    - **Validates: Requirements 3.3**

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation is minimal - only one new method and event listener attachment
- CSS styling is already implemented by the PFS system (no changes needed)
- Property tests use fast-check library with minimum 100 iterations
- Foundry VTT's actor sheet API automatically handles duplicate prevention
- No changes to data models or storage mechanisms are required
