# Layout File Format

The layout files are written in YAML and describe the structure and content of a chronicle sheet. This document explains the different sections of a layout file.

## Root Properties

-   `id` (string, required): A unique identifier for the layout.
-   `description` (string, required): A human-readable description of the layout.
-   `parent` (string, optional): The ID of a parent layout. The current layout will inherit all properties from the parent layout.
-   `aspectratio` (string, optional): The aspect ratio of the PDF page, e.g., `603:783`.

## `parameters`

This section defines the parameters that can be filled in by the user when generating a chronicle. Each parameter has a type and a description.

```yaml
parameters:
  "Event Info":
    event:
      type: text
      description: Event name
      example: PaizoCon
```

## `canvas`

This section defines the different areas on the PDF page where content can be drawn. Each canvas has a name and a set of coordinates (`x`, `y`, `x2`, `y2`) that are percentages of the parent canvas or the page.

```yaml
canvas:
  page:
    x:    0.0
    y:    0.0
    x2: 100.0
    y2: 100.0

  main:
    parent: page
    x:   6.20
    y:  10.50
    x2: 94.00
    y2: 95.40
```

## `presets`

This section defines reusable sets of properties that can be applied to content elements. This helps to avoid repetition and to maintain a consistent style.

```yaml
presets:
  defaultfont:
    font: Helvetica
    fontsize: 14

  player.infoline:
    presets: [defaultfont]
    canvas: main
    y:  5.5
    align: CB
```

## `content`

This section defines the actual content to be drawn on the PDF. It is an array of content elements.

### Content Element Properties

-   `type` (string, required): The type of the content element. Can be `text`, `multiline`, `trigger`, `choice`, `strikeout`, or `line`.
-   `value` (string, optional): The value of the element. For `text` and `multiline` elements, this is the text to be drawn. For other elements, it can be a parameter name (e.g., `param:player`).
-   `presets` (array of strings, optional): A list of preset names to apply to the element.
-   Other properties depend on the element type and the presets used.

### Element Types

-   **`text`**: A single line of text.
-   **`multiline`**: Multiple lines of text.
-   **`trigger`**: A conditional element. Its content is only drawn if the specified `trigger` parameter has a value.
-   **`choice`**: A conditional element that depends on the value of a `choices` parameter. The content of the matching choice is drawn.
-   **`strikeout`**: A horizontal line. Used for checkboxes.
-   **`line`**: A horizontal line. Used for separating sections.

```yaml
content:
  - value: param:char
    type: text
    presets: [player.infoline]
    fontweight: bold
    align: LB
    x:   1.5
    x2: 63.5

  - type: choice
    choices: param:summary_checkbox
    content:
      1:
        - type: strikeout
          presets: [checkbox, checkbox.1]
```
