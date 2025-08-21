# Contributing

We welcome contributions to the Pathfinder Society Chronicle Generator! Whether you're fixing a bug, adding a feature, or creating a new layout, your help is appreciated.

## New Layouts

One of the best ways to contribute is by adding new layouts for chronicles that are not yet supported. Here's how you can do it:

### 1. Create a new layout file

Start by creating a new `.yml` file in the `layouts` directory. You can use one of the existing layouts as a template.

### 2. Finding Coordinates with the Grid Tool

To help you define the coordinates for your canvas areas, you can use the built-in grid tool. This tool will draw a grid over a canvas on your PDF, making it much easier to determine the `x`, `y`, `x2`, and `y2` values for your layout elements.

The grid lines are drawn at 2%, 5%, or 10% increments, depending on the size of the canvas.

To use the tool, run the following command from the root of the project:

```bash
npm run draw-grid -- --pdf path/to/your/chronicle.pdf --layout-dir layouts --layout-name <layout_name> --canvas <canvas_name> --content <content_name>
```

-   `--pdf`: The path to the blank chronicle PDF.
-   `--layout-dir`: The directory where your layouts are stored.
-   `--layout-name`: The `id` of the layout you want to use.
-   `--canvas`: The name of the canvas you want to draw the grid on.
-   `--content`: (Optional) The name of a content element to highlight with a grey box.

After running the command, a new file named `grid-output.pdf` will be created in the project root. Open this file to see the grid and find the coordinates for your layout elements.

### 3. Submit a Pull Request

Once your layout is complete, please submit a pull request to this repository. We'll review it and merge it as soon as possible.

## Filling Fields

To fill in the fields of a chronicle, you can use the `fill-fields` command. This command takes a PDF file, a layout, and a set of parameters, and it will generate a new PDF with the fields filled in.

To use the tool, run the following command from the root of the project:

```bash
npm run fill-fields -- --pdf path/to/your/chronicle.pdf --layout-dir layouts --layout-name <layout_name> --parameter <key=value> --parameter <key2=value2>
```

-   `--pdf`: The path to the blank chronicle PDF.
-   `--layout-dir`: The directory where your layouts are stored.
-   `--layout-name`: The `id` of the layout you want to use.
-   `--parameter`: A key-value pair for a parameter to be filled in the chronicle. You can specify this argument multiple times for multiple parameters.

After running the command, a new file named `filled-output.pdf` will be created in the project root.

Thank you for your contributions!
