# Bugfix Requirements Document

## Introduction

When the "Generate Chronicles" button is clicked in the Party Chronicle Filling interface (Society tab), the party sheet is re-rendered using `partySheet.render(true)`, which causes the UI to reset focus to the first tab instead of retaining focus on the Society tab where the user was working. This disrupts the user workflow and forces them to manually navigate back to the Society tab after each chronicle generation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user clicks the "Generate Chronicles" button on the Society tab THEN the system calls `partySheet.render(true)` which re-renders the entire party sheet and switches focus to the first tab

1.2 WHEN the party sheet is re-rendered after chronicle generation THEN the system loses the active tab state and defaults to the first tab in the navigation

### Expected Behavior (Correct)

2.1 WHEN the user clicks the "Generate Chronicles" button on the Society tab THEN the system SHALL preserve the active tab state and keep the Society tab visible after re-rendering

2.2 WHEN the party sheet is re-rendered after chronicle generation THEN the system SHALL restore focus to the Society tab that was active before the re-render

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user manually switches between tabs THEN the system SHALL CONTINUE TO activate the selected tab correctly

3.2 WHEN the party sheet is initially rendered THEN the system SHALL CONTINUE TO display the default first tab

3.3 WHEN chronicles are successfully generated THEN the system SHALL CONTINUE TO update the download buttons on character sheets

3.4 WHEN the form data is saved or cleared THEN the system SHALL CONTINUE TO function correctly without affecting tab state
