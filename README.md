# Pathfinder Society Chronicle Generator

A Foundry VTT module that makes it easy for GMs to generate Pathfinder Society chronicles for their entire party at once. Fill out one form, generate chronicles for everyone!

## Features

- **Chronicle Generation**: Fill out one form for the entire party easily from the party sheet
- **Automatic Calculations**: Treasure bundles, earned income, and reputation are calculated automatically
- **Smart Defaults**: The module detects Bounties, Quests, and Scenarios and sets appropriate defaults
- **Pre-configured Layouts**: Includes layouts for many PFS scenarios - just select your scenario and go
- **Generic Layout Support**: Can generate chronicles for any scenario, even if there's no specific layout
- **Player Downloads**: Players can download their chronicles directly from their character sheets

## Quick Start for GMs

### 1. Make sure the players fill in their PFS ids on their character sheet

The Chronicle Generation process uses that information when filling out the chronicle.

### 2. Open the Party Sheet

Open your party sheet and click on the **Society** tab.

![Party Sheet Society Tab](docs/screenshots/party-sheet-society-tab.png)

### 3. Select Your Chronicle Layout

The module includes pre-configured layouts for many scenarios. When you select a scenario from the dropdown, the appropriate chronicle PDF is automatically selected.

If your scenario isn't in the list, you can:
- Use the **Generic** layout (works for any scenario, but doesn't support checkboxes or strikeouts)
- Browse for a chronicle PDF manually using the file picker

### 4. Fill Out the Form

The form has several sections:

**Event Information**
- GM PFS Number
- Season
- Scenario Name (e.g., "5-03: Heidmarch Heist")
- Event Code
- Event Date

![Event Details](docs/screenshots/layout-selection.png)

**Rewards** (automatically calculated based on scenario type)
- XP Earned
- Treasure Bundles
- Downtime Days

![Rewards](docs/screenshots/shared-rewards.png)

**Reputation** (automatically calculated)
- Base reputation for the player's chosen faction
- Bonus reputation for completing faction specific goals

![Reputation](docs/screenshots/reputation.png)


**Character-Specific Information**
- Society ID (entered on the Actor sheet)
- Level (entered on the Actor sheet)
- Earned Income (automatically calculated based on downtime activities)
- Gold Spent (optional)
- Notes (optional)

![Chronicle Form](docs/screenshots/chronicle-form.png)

**Adventure Summary**
- Fill in the checkboxes from the adventure summary to track what the party accomplished
- Only displayed if there are checkboxes to fill in
- Uses the lead text immediately following the checkbox

![Adventure Summary](docs/screenshots/adventure-summary.png)

**Items to Strike Out**
- Black out the items from the higher level tier if running on the lower level
- Black out items not encountered
- Only displayed if there are items that can be struk out
- Uses the text of the item on the form

![Items to Strike Out](docs/screenshots/strike-out.png)

### 5. Generate Chronicles

Click the **Generate Chronicles** button. The module will:
- Validate all required fields
- Generate a PDF chronicle for each party member
- Attach the chronicles to each character sheet

![Generate Button](docs/screenshots/generate-button.png)

### 6. Players Download Their Chronicles

Players can now open their character sheets, go to the **PFS** tab, and click **Download Chronicle** to get their PDF.

![Player Download](docs/screenshots/player-download.png)

## Automatic Calculations

The module automatically calculates several values to save you time:

### Treasure Bundles → Gold

Treasure bundles are automatically converted to gold based on each character's level. The conversion follows the official PFS guidelines.

### Earned Income

When players use downtime days to Earn Income:
1. Select the task level (usually character level - 2)
2. Select the success level (Critical Success, Success, Failure, Critical Failure)
3. Select proficiency rank (Trained, Expert, Master, Legendary)

The module automatically calculates the gold earned based on these selections and the number of downtime days.

### Reputation

Enter the reputation values for each faction, and the module will format them correctly on the chronicle. You can also select which faction gets the bonus reputation from the scenario.

## Scenario Types

The module detects the scenario type and sets smart defaults:

| Type | XP | Treasure Bundles | Downtime Days | Reputation |
|------|----|--------------------|---------------|------------|
| **Bounty** | 1 | 2 | 0 | 1 |
| **Quest** | 2 | 4 | 4 | 2 |
| **Scenario** | 4 | 8 | 8 | 4 |

The module detects the type by looking for "Bounty" or "Quest" in the scenario name.

## Generic Layout

If the module doesn't have a specific layout for your scenario, you can use the **Generic** layout. This works for any chronicle but has some limitations:

**Supported:**
- Character information (name, Society ID, level)
- Event information (GM, scenario name, event code, date)
- XP gained
- Gold gained and spent
- Treasure bundles
- Earned income
- Reputation
- Notes

**Not Supported:**
- Adventure summary checkboxes
- Strikeout items (boons, items, etc.)

To use the Generic layout:
1. Select "Generic" from the layout dropdown
2. Browse for your chronicle PDF using the file picker
3. Fill out the form and generate as normal

## Layout Designer (Advanced)

If you need to create a layout for a new chronicle, the module includes a Layout Designer tool. This is an advanced feature for users who want to add support for new scenarios.

To access it:
1. Go to **Configure Settings** → **Module Settings**
2. Find **PFS Chronicle Generator**
3. Click **Select Layout**

The Layout Designer lets you define where each field should appear on the chronicle PDF. You can draw grids and boxes to help with positioning.

## Tips and Tricks

### Collapsible Sections

Click on section headers to collapse/expand them. This makes it easier to focus on one section at a time.

### Auto-Save

The form automatically saves as you type, so you won't lose your work if you accidentally close the tab.

### Clear Button

The **Clear** button resets the form but preserves:
- GM PFS Number
- Scenario Name
- Event Code
- Chronicle Path
- Season and Layout selections

It also sets smart defaults based on the scenario type (Bounty, Quest, or Scenario).

### Portrait Clicks

Click on a character's portrait to open their character sheet.

## For Players

### Viewing Your Chronicle

1. Open your character sheet
2. Go to the **PFS** tab
3. Click **Download Chronicle** to save the PDF

### Deleting a Chronicle

If the GM needs to regenerate your chronicle (for example, if there was an error), they can click the **Delete Chronicle** button on your character sheet's PFS tab. This will remove the old chronicle so a new one can be generated.

## Troubleshooting

### "Blank chronicle PDF path is not set"

Make sure you've selected a layout with official module support, or browsed for a chronicle PDF using the file picker.

### "Validation failed"

Check that all required fields are filled out:
- GM PFS Number
- Scenario Name
- Event Code
- Event Date
- Character Name (for each character)
- Society ID (for each character)
- Level (for each character)

### Chronicles not generating

1. Check the browser console (F12) for error messages
2. Make sure the chronicle PDF file exists and is accessible
3. Try using the Generic layout to see if it's a layout-specific issue

## Contributing

We welcome contributions! If you want to add a new layout or fix a bug, please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for development setup, testing, and code quality standards.

## License

This module is licensed under the ISC License.
