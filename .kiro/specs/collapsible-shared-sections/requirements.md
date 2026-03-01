# Requirements Document

## Introduction

This feature adds collapsible functionality to sections in the party chronicle form's shared sidebar. When collapsed, section headers display a summary of the values within that section, and a chevron indicator shows the collapse state. This reduces visual clutter and allows users to focus on the sections they're actively editing.

## Glossary

- **Shared_Section**: A section in the party chronicle form sidebar containing fields that apply to all party members
- **Collapse_State**: The visual state of a section, either expanded (showing all fields) or collapsed (showing only the header with summary)
- **Chevron_Indicator**: A visual symbol (▶ for collapsed, ▼ for expanded) that indicates whether a section can be expanded or collapsed
- **Summary_Text**: Text displayed in a collapsed section header that summarizes the values of fields within that section
- **Event_Details_Section**: The shared section containing GM PFS Number, Season, Layout, Event Name, Event Code, Event Date, and Chronicle Path
- **Reputation_Section**: The shared section containing Chosen Faction reputation and individual faction reputation values
- **Shared_Rewards_Section**: The shared section containing XP Earned and Treasure Bundles
- **Adventure_Summary_Section**: The shared section containing dynamically populated checkbox choices from the layout
- **Items_To_Strike_Out_Section**: The shared section containing dynamically populated strikeout choices from the layout

## Requirements

### Requirement 1: Collapsible Event Details Section

**User Story:** As a GM, I want to collapse the Event Details section, so that I can reduce visual clutter after entering the event information.

#### Acceptance Criteria

1. THE Event_Details_Section SHALL display a Chevron_Indicator in its header
2. WHEN the Event_Details_Section header is clicked, THE Event_Details_Section SHALL toggle its Collapse_State
3. WHEN the Event_Details_Section is collapsed, THE Chevron_Indicator SHALL display "▶"
4. WHEN the Event_Details_Section is expanded, THE Chevron_Indicator SHALL display "▼"
5. WHEN the Event_Details_Section is collapsed, THE Event_Details_Section SHALL display the scenario name in the Summary_Text formatted as "Event Details - {scenario name}"
6. WHEN the Event_Details_Section is collapsed AND the scenario name is too long to fit, THE Summary_Text SHALL truncate with ellipsis
7. WHEN the Event_Details_Section is collapsed AND the scenario name field is empty, THE Event_Details_Section SHALL display "Event Details - (No scenario name)" in the Summary_Text
7. WHEN the Event_Details_Section is collapsed, THE Event_Details_Section SHALL hide all form fields within the section
8. WHEN the Event_Details_Section is expanded, THE Event_Details_Section SHALL show all form fields within the section
9. WHEN the form is initially rendered, THE Event_Details_Section SHALL default to collapsed state

### Requirement 2: Collapsible Reputation Section

**User Story:** As a GM, I want to collapse the Reputation section, so that I can see a summary of reputation values without the full form fields.

#### Acceptance Criteria

1. THE Reputation_Section SHALL display a Chevron_Indicator in its header
2. WHEN the Reputation_Section header is clicked, THE Reputation_Section SHALL toggle its Collapse_State
3. WHEN the Reputation_Section is collapsed, THE Chevron_Indicator SHALL display "▶"
4. WHEN the Reputation_Section is expanded, THE Chevron_Indicator SHALL display "▼"
5. WHEN the Reputation_Section is collapsed, THE Reputation_Section SHALL display the chosen faction reputation value in the Summary_Text formatted as "Reputation - +N" where N is the reputation value
6. WHEN the Reputation_Section is collapsed, THE Reputation_Section SHALL display each non-zero faction reputation in the Summary_Text formatted as "Reputation - +N ; FACTION: +N" where FACTION is the two-letter faction code and N is the reputation value
7. WHEN the Reputation_Section is collapsed AND all faction reputations are zero, THE Summary_Text SHALL display "Reputation - +N" with only the chosen faction reputation value
8. WHEN the Reputation_Section is collapsed, THE Summary_Text SHALL separate multiple reputation values with semicolons and spaces
9. WHEN the Reputation_Section is collapsed AND the summary text is too long to fit, THE Summary_Text SHALL truncate with ellipsis
9. WHEN the Reputation_Section is collapsed, THE Reputation_Section SHALL hide all form fields within the section
10. WHEN the Reputation_Section is expanded, THE Reputation_Section SHALL show all form fields within the section
11. WHEN the form is initially rendered, THE Reputation_Section SHALL default to collapsed state

### Requirement 3: Collapsible Shared Rewards Section

**User Story:** As a GM, I want to collapse the Shared Rewards section, so that I can see a summary of XP and treasure bundles without the full form fields.

#### Acceptance Criteria

1. THE Shared_Rewards_Section SHALL display a Chevron_Indicator in its header
2. WHEN the Shared_Rewards_Section header is clicked, THE Shared_Rewards_Section SHALL toggle its Collapse_State
3. WHEN the Shared_Rewards_Section is collapsed, THE Chevron_Indicator SHALL display "▶"
4. WHEN the Shared_Rewards_Section is expanded, THE Chevron_Indicator SHALL display "▼"
5. WHEN the Shared_Rewards_Section is collapsed, THE Shared_Rewards_Section SHALL display the XP value in the Summary_Text formatted as "Shared Rewards - N XP; M TB" where N is the XP earned value and M is the treasure bundles value
6. WHEN the Shared_Rewards_Section is collapsed AND the summary text is too long to fit, THE Summary_Text SHALL truncate with ellipsis
7. WHEN the Shared_Rewards_Section is collapsed, THE Shared_Rewards_Section SHALL hide all form fields within the section
8. WHEN the Shared_Rewards_Section is expanded, THE Shared_Rewards_Section SHALL show all form fields within the section
9. WHEN the form is initially rendered, THE Shared_Rewards_Section SHALL default to collapsed state

### Requirement 4: Collapsible Adventure Summary Section

**User Story:** As a GM, I want to collapse the Adventure Summary section, so that I can reduce visual clutter when I'm not actively selecting checkboxes.

#### Acceptance Criteria

1. THE Adventure_Summary_Section SHALL display a Chevron_Indicator in its header
2. WHEN the Adventure_Summary_Section header is clicked, THE Adventure_Summary_Section SHALL toggle its Collapse_State
3. WHEN the Adventure_Summary_Section is collapsed, THE Chevron_Indicator SHALL display "▶"
4. WHEN the Adventure_Summary_Section is expanded, THE Chevron_Indicator SHALL display "▼"
5. WHEN the Adventure_Summary_Section is collapsed, THE Adventure_Summary_Section SHALL hide all checkbox choices within the section
6. WHEN the Adventure_Summary_Section is expanded, THE Adventure_Summary_Section SHALL show all checkbox choices within the section

### Requirement 5: Collapsible Items To Strike Out Section

**User Story:** As a GM, I want to collapse the Items to Strike Out section, so that I can reduce visual clutter when I'm not actively selecting items.

#### Acceptance Criteria

1. THE Items_To_Strike_Out_Section SHALL display a Chevron_Indicator in its header
2. WHEN the Items_To_Strike_Out_Section header is clicked, THE Items_To_Strike_Out_Section SHALL toggle its Collapse_State
3. WHEN the Items_To_Strike_Out_Section is collapsed, THE Chevron_Indicator SHALL display "▶"
4. WHEN the Items_To_Strike_Out_Section is expanded, THE Chevron_Indicator SHALL display "▼"
5. WHEN the Items_To_Strike_Out_Section is collapsed, THE Items_To_Strike_Out_Section SHALL hide all strikeout choices within the section
6. WHEN the Items_To_Strike_Out_Section is expanded, THE Items_To_Strike_Out_Section SHALL show all strikeout choices within the section

### Requirement 6: Persist Collapse State

**User Story:** As a GM, I want the collapse state of sections to be remembered, so that my preferred view is maintained when I reopen the form.

#### Acceptance Criteria

1. WHEN a section's Collapse_State changes, THE Form SHALL save the Collapse_State to browser storage
2. WHEN the form is rendered, THE Form SHALL restore each section's Collapse_State from browser storage
3. WHEN no saved Collapse_State exists for Event_Details_Section, THE section SHALL default to collapsed state
4. WHEN no saved Collapse_State exists for Reputation_Section, THE section SHALL default to collapsed state
5. WHEN no saved Collapse_State exists for Shared_Rewards_Section, THE section SHALL default to collapsed state
6. WHEN no saved Collapse_State exists for Adventure_Summary_Section, THE section SHALL default to expanded state
7. WHEN no saved Collapse_State exists for Items_To_Strike_Out_Section, THE section SHALL default to expanded state

### Requirement 7: Update Summary Text on Field Changes

**User Story:** As a GM, I want the summary text to update automatically when I change field values, so that the collapsed view always shows current information.

#### Acceptance Criteria

1. WHEN a field value changes in the Event_Details_Section, THE Event_Details_Section Summary_Text SHALL update to reflect the new scenario name
2. WHEN a field value changes in the Reputation_Section, THE Reputation_Section Summary_Text SHALL update to reflect the new reputation values
3. WHEN a field value changes in the Shared_Rewards_Section, THE Shared_Rewards_Section Summary_Text SHALL update to reflect the new XP and treasure bundle values
4. THE Summary_Text SHALL update regardless of whether the section is currently collapsed or expanded

### Requirement 8: Accessible Collapse Interaction

**User Story:** As a GM using assistive technology, I want collapsible sections to be keyboard accessible and properly announced, so that I can navigate and use the form effectively.

#### Acceptance Criteria

1. THE section header SHALL be keyboard focusable
2. WHEN the section header has focus AND the Enter key is pressed, THE section SHALL toggle its Collapse_State
3. WHEN the section header has focus AND the Space key is pressed, THE section SHALL toggle its Collapse_State
4. THE section header SHALL have an aria-expanded attribute that reflects the current Collapse_State
5. THE section header SHALL have an aria-controls attribute that references the collapsible content element
6. THE section header SHALL have role="button" to indicate it is interactive
