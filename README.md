# Pathfinder Society Chronicle Generator

This module for Foundry VTT allows the GM to fill-in Pathfinder and Starfinder Society Chronicles directly within the application, and allows the players to download them directly from their character sheets.

## Features

- **Chronicle Generation:** Automatically generate PDF chronicles based on your character and event data.
- **Layout Designer:** A user-friendly interface to help you create and customize layouts for different chronicle sheets.
- **Dynamic Calculation:** Automatically converts Treasure Bundles to gold based on the character's level.
- **PDF Management:** Attach generated chronicles to actor sheets for the player to easily download them.

## How to Use

### For Players

1.  Navigate to the "PFS" tab on your character sheet.
2.  Fill in your chosen faction as well as your Pathfinder Society Id and character number
2.  The button to download the generated chronicle will be enabled as soon as your GM generates a chronicle for you.

![Player View PFS Chronicle Generator.png](docs/Player%20View%20PFS%20Chronicle%20Generator.png)

### For Game Masters
1.  **Settings:**
    -   In the settings view for the module, selelect or upload a single-page chronicle as a PDF for the adventure you're running.
        - If you're using one of the Paizo Foundry modules for this PFS season, they can be found in e.g. `modules/pf2e-pfs06-year-of-immortal-influence/assets/chronicles-1/6-01-IntrototheyearofImmortalInfluence.pdf`
    -   Layouts tell the module where to put what text. Select the layout that matches the chronicle you uploaded, or select the generic layout for your season.

    ![Settings view](docs/PFS%20Chronicle%20Generator%20Settings.png)

1.  **Generate a Chronicle:**
    -   Open a player's character sheet and navigate to the "PFS" tab.
    -   Click the "Generate Chronicle" button.
    -   Fill in the details in the dialog box and click "Generate".
    -   The generated chronicle will be attached to the character sheet.
    
    ![Chronicle form](docs/Chronicle%20Generation%20Form.png)

2.  **Layout Designer:**
    If there is no layout for your chosen chronicle, making one is easy with the layout designer. 

    It can draw boxes around all the existing fields so you can check that the whole box aligns where you expect it, or it can draw grids over the various sub-canvases to help you with placement.

    -   Go to the module settings and click "Open Layout Designer".
    -   This will open a dialog where you can:
        -   Select a blank chronicle PDF from your computer.
        -   Choose a layout to work with.
        -   Draw a grid on the PDF to help with coordinate placement.
        -   Draw boxes around content elements to visualize the layout.

    ![Layout Designer](docs/Layout%20Designer.png)



## Contributing

We welcome contributions! If you want to add a new layout or fix a bug, please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.
