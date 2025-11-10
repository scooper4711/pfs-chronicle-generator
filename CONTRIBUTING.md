# Contributing

We welcome contributions to the Pathfinder Society Chronicle Generator! Whether you're fixing a bug, adding a feature, or creating a new layout, your help is appreciated.

## Prerequisites

- Python 3.8+ with a virtual environment at `.venv` in the project root
- Required Python packages: `PyMuPDF` (fitz)
- Node.js and npm for the TypeScript tools

Install Python dependencies:
```bash
pip install PyMuPDF
```

## Generating Layouts from Chronicle PDFs

Layouts are now stored as JSON files (not YAML) and are generated automatically from chronicle PDFs using Python scripts.

### Automated Batch Generation

To regenerate layout files for entire seasons, use `generate_layouts.py`:

#### Generate all seasons:
```bash
python chronicle2layout/src/generate_layouts.py
```

#### Generate specific season(s):
```bash
# Single season
python chronicle2layout/src/generate_layouts.py --season 6

# Multiple seasons
python chronicle2layout/src/generate_layouts.py --season 5 6 7
```

The script will:
- Find chronicle PDFs in `modules/pf2e-pfs0X-year-of-*/assets/chronicles-1/` and `chronicles-2/`
- Extract items and checkboxes using text and position analysis
- Generate layout JSON files in `layouts/pfs2/sX/`
- Include `defaultChronicleLocation` pointing to the source PDF

### Manual Single-File Generation

To generate or update a single layout file, use `chronicle2layout.py`:

```bash
python chronicle2layout/src/chronicle2layout.py \
  modules/pf2e-pfs06-year-of-immortal-influence/assets/chronicles-1/6-06-RottenApples.pdf \
  --layout-dir layouts \
  --parent pfs2.season6 \
  --id pfs2.s6-06 \
  --description "6-06 Rotten Apples" \
  --default-chronicle "modules/pf2e-pfs06-year-of-immortal-influence/assets/chronicles-1/6-06-RottenApples.pdf" \
  --output layouts/pfs2/s6/6-06-RottenApples.json
```

Parameters:
- `--layout-dir`: Base layouts directory (e.g., `layouts`)
- `--parent`: Parent layout ID (e.g., `pfs2.season6`)
- `--id`: Layout ID for this scenario (e.g., `pfs2.s6-06`)
- `--description`: Human-readable description
- `--default-chronicle`: Path to the chronicle PDF in the module
- `--output`: Where to save the generated JSON
- `--item-canvas`: (Optional) Canvas name for items (default: `items`)
- `--checkbox-canvas`: (Optional) Canvas name for checkboxes (default: `summary`)

### How Layout Generation Works

1. **Text Extraction**: Uses PyMuPDF to extract words with coordinates from the PDF
2. **Y-Coordinate Grouping**: Groups words by vertical position (not relying on PyMuPDF's line numbers)
3. **Item Detection**: 
   - Identifies item lines in the "items" canvas region
   - Merges multi-line items by tracking unbalanced parentheses
   - Splits when two complete parenthesis groups are detected
4. **Checkbox Detection**: Finds `□` characters and extracts adjacent labels
5. **JSON Generation**: Creates layout with strikeout presets and choices

### Layout File Structure

Generated layouts follow this structure:
```json
{
  "id": "pfs2.s6-06",
  "description": "6-06 Rotten Apples",
  "parent": "pfs2.season6",
  "defaultChronicleLocation": "modules/pf2e-pfs06-year-of-immortal-influence/assets/chronicles-1/6-06-RottenApples.pdf",
  "parameters": {
    "Items": {
      "strikeout_item_lines": {
        "type": "choice",
        "choices": ["item 1", "item 2", ...]
      }
    }
  },
  "presets": { ... },
  "content": [ ... ]
}
```

## Finding Coordinates with the Layout Designer

To help you define or verify coordinates for canvas areas and common fields, use the **Layout Designer** available in Foundry VTT:

1. Open Foundry VTT with the PFS Chronicle Generator module enabled
2. Go to **Module Settings** → **PFS Chronicle Generator** → **Select Layout**
3. Choose the season you want to work with
4. Click **Layout Design** to open the designer

The Layout Designer allows you to:
- **View the blank chronicle PDF** with overlay grids
- **Define canvas regions** (items, summary, rewards, etc.) with visual feedback
- **Set common parameters** that apply to all scenarios in a season
- **Generate preview PDFs** with grid overlays to verify coordinates
- **Save changes** directly to the parent layout file (e.g., `Season 6.json`)

### Canvas Types

Common canvases in PFS chronicles:
- `items`: Region where purchasable items are listed
- `summary`: Region with checkboxes for adventure decisions
- `rewards`: Region for XP and gold tracking
- `boons`: Region for earned boons

### Using the Designer for Parent Layouts

The Layout Designer is ideal for creating or modifying **parent layouts** (e.g., `Season 5.json`, `Season 6.json`) that define:
- Canvas boundaries shared by all scenarios in that season
- Common text fields (character name, player name, event info)
- Standard preset definitions

**Individual scenario layouts** (e.g., `6-06-RottenApples.json`) should be generated using the Python scripts (see below) to automatically extract:
- Specific strikeout item choices for that scenario
- Checkbox labels in the adventure summary
- Scenario-specific coordinates derived from the PDF

## Manual Layout Adjustments

After automatic generation, you may need to manually edit layout JSON files for:
- Edge cases like items without balanced parentheses
- Items with special formatting (e.g., "limit 1" annotations)
- Adjusting y-coordinates for better visual alignment

## Testing and Validation

After generating or modifying layouts:

1. **Check item extraction quality**:
```bash
# View extracted items
jq '.parameters.Items.strikeout_item_lines.choices' layouts/pfs2/s6/6-06-RottenApples.json

# Count items
jq '.parameters.Items.strikeout_item_lines.choices | length' layouts/pfs2/s6/6-06-RottenApples.json
```

2. **Find longest items** (potential parsing issues):
```bash
for file in layouts/pfs2/s6/*.json; do
  jq -r --arg file "$(basename "$file")" '.parameters.Items.strikeout_item_lines.choices[]? | "\(length)|\($file)|\(.)"' "$file"
done | sort -t'|' -k1 -rn | head -10
```

3. **Test with the fill-fields tool** (see below)

## Using the Chronicle Generator in Foundry VTT

Once layouts are generated, you can use them in Foundry VTT:

1. Enable the **PFS Chronicle Generator** module
2. Go to **Module Settings** → **Select Layout**
3. Choose your season and specific scenario
4. If configured, the blank chronicle PDF will auto-populate in the file picker
5. Fill in character details and select items to strike out
6. Click **Generate Chronicle** to create a filled PDF

## Submitting Changes

Once your layout or fix is complete, please submit a pull request to this repository. We'll review it and merge it as soon as possible.

Thank you for your contributions!
