# Item Strikeout Format

The chronicle layout system now supports text-based item strikeouts, making it easier to understand and maintain the strikeout choices. This document describes the new format and provides migration guidance from the old numeric format.

## New Format

In the new format, items that can be struck out are identified by their full text description rather than a numeric index. This provides several benefits:

1. Self-documenting choices that clearly indicate what is being struck out
2. Resilience to item order changes in the source PDF
3. Better user experience in the Chronicle Generator UI

### Example Layout Format

```json
{
    "parameters": {
        "Items": {
            "strikeout_item_lines": {
                "type": "choice",
                "description": "Items to strike out",
                "choices": [
                    "dragon's crest (Item 1, 10 gp, Pathfinder Lost Omens Grand Bazaar 104)",
                    "vexing vapor (lesser) (Item 1, 4 gp, Pathfinder Lost Omens Grand Bazaar 27)",
                    "vexing vapor (moderate) (Item 3, 12 gp, Pathfinder Lost Omens Grand Bazaar 27)"
                ],
                "example": "dragon's crest (Item 1, 10 gp, Pathfinder Lost Omens Grand Bazaar 104)"
            }
        }
    },
    "presets": {
        "strikeout_item": {
            "canvas": "items",
            "color": "black",
            "linewidth": 11,
            "x": 0.5,
            "x2": 95
        },
        "item.line.dragons_crest": {
            "y": 15.7,
            "y2": 23.8
        }
        // ... additional presets for each item
    },
    "content": [
        {
            "type": "choice",
            "choices": "param:strikeout_item_lines",
            "content": {
                "dragon's crest (Item 1, 10 gp, Pathfinder Lost Omens Grand Bazaar 104)": [{
                    "type": "line",
                    "presets": ["strikeout_item", "item.line.dragons_crest"]
                }]
                // ... additional content entries for each item
            }
        }
    ]
}
```

## Migrating from Numeric Format

To migrate an existing layout from numeric to text-based format:

1. Use the `chronicle2layout.py` script with the source PDF:
   ```bash
   python3 -m src.chronicle2layout --skip-checkboxes "path/to/chronicle.pdf"
   ```

2. Copy the generated JSON sections into your layout file:
   - Replace the entire `strikeout_item_lines` parameter
   - Update the presets section with the new text-based presets
   - Replace the content section with the new text-based version

3. Verify the changes:
   - Check that the presets properly align with the items in the PDF
   - Test the layout in the Chronicle Generator to ensure items can be struck out
   - Verify that saved chronicles still load correctly

## Automatic Layout Generation

The `chronicle2layout.py` script can now automatically generate the correct layout format from a chronicle PDF:

1. Detects item text and positions
2. Generates unique identifiers for each item
3. Creates the necessary parameters, presets, and content sections

### Options
- `--skip-checkboxes`: Focus only on item strikeouts (recommended)
- `--debug-dir`: Output debug images to help verify item detection

## Future Considerations

- Support for multi-line items
- Integration with checkbox detection for comprehensive layout generation
- Automatic validation of generated layouts
