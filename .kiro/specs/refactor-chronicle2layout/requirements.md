# Requirements Document

## Introduction

The `chronicle2layout` directory contains Python scripts that extract checkboxes and text from PDF chronicle sheets (Pathfinder Society RPG) and generate layout JSON files describing form field positions. The code was "vibe coded" and needs refactoring to meet the project's coding standards for file size, complexity, DRY, type safety, and maintainability. All existing functionality must be preserved.

## Glossary

- **Chronicle2Layout**: The main Python module (`chronicle2layout.py`) that detects checkboxes and extracts text from PDF chronicle sheets to produce layout JSON
- **Layout_JSON**: A JSON configuration file describing where form fields, items, and checkboxes are positioned on a chronicle PDF
- **Canvas**: A named rectangular region within a layout, defined as percentage coordinates of the page
- **Generate_Layouts**: The batch processing script (`generate_layouts.py`) that runs Chronicle2Layout across multiple seasons of chronicle PDFs
- **Season4_Tools**: A set of scripts in the `tools/` directory specific to Season 4 chronicle processing (canvas extraction, content detection, layout building)
- **Shared_Utilities**: Common functions used across multiple scripts (layout file resolution, canvas coordinate transformation)
- **Item_Segmenter**: The logic within Chronicle2Layout that splits extracted text lines into individual item entries using parenthesis-based heuristics
- **Checkbox_Extractor**: The logic within Chronicle2Layout that detects checkbox characters in PDF text and extracts their associated labels

## Requirements

### Requirement 1: Extract Shared Utilities into a Common Module

**User Story:** As a developer, I want shared utility functions to exist in a single module, so that I can maintain them in one place and avoid bugs from divergent copies.

#### Acceptance Criteria

1. THE Shared_Utilities module SHALL contain the `find_layout_file` function as the single source of truth for layout file resolution
2. THE Shared_Utilities module SHALL contain the `transform_canvas_coordinates` function as the single source of truth for canvas coordinate transformation
3. WHEN Chronicle2Layout imports `find_layout_file`, THE Chronicle2Layout module SHALL use the function from Shared_Utilities
4. WHEN clip_canvas imports `find_layout_file`, THE clip_canvas module SHALL use the function from Shared_Utilities
5. WHEN Generate_Layouts or Season4_Tools import shared functions, THE importing module SHALL use the function from Shared_Utilities
6. THE `find_layout_file` function SHALL include type hints for all parameters and the return type
7. THE `transform_canvas_coordinates` function SHALL include type hints for all parameters and the return type
8. THE `find_layout_file` function SHALL move the `import re` statement to module level
9. FOR ALL valid layout IDs, calling `find_layout_file` from Shared_Utilities SHALL produce the same file path as the original duplicated implementations

### Requirement 2: Split chronicle2layout.py Below the File Size Limit

**User Story:** As a developer, I want `chronicle2layout.py` to be under 300 lines, so that the file is easy to navigate and understand.

#### Acceptance Criteria

1. THE Chronicle2Layout module SHALL contain fewer than 300 lines of code
2. THE Item_Segmenter SHALL be extracted into a separate module containing the item segmentation logic (token streaming, parenthesis tracking, `finalize_buffer`)
3. THE Checkbox_Extractor SHALL be extracted into a separate module containing `image_checkboxes` and `extract_checkbox_labels`
4. THE `generate_layout_json` function SHALL be extracted into a separate layout generation module
5. THE `clean_text` and `has_unmatched_parens` functions SHALL be promoted to module-level functions in their respective modules instead of being nested inside `generate_layout_json`
6. WHEN the refactored modules are used via the CLI entry point, THE Chronicle2Layout module SHALL produce identical JSON output to the original implementation for any given PDF input

### Requirement 3: Reduce Function Cyclomatic Complexity

**User Story:** As a developer, I want each function to have low cyclomatic complexity, so that the code is easy to test and reason about.

#### Acceptance Criteria

1. THE `generate_layout_json` function SHALL have cyclomatic complexity below 15 after extracting helper functions
2. THE `extract_text_lines` function SHALL have cyclomatic complexity below 15 after extracting the word-grouping logic
3. THE `extract_checkbox_labels` function SHALL have cyclomatic complexity below 15 after extracting label-parsing logic
4. WHEN a function exceeds cyclomatic complexity of 5, THE function SHALL use early returns, guard clauses, or extracted helper functions to reduce nesting depth

### Requirement 4: Eliminate Magic Numbers

**User Story:** As a developer, I want all threshold values and hardcoded coordinates to be named constants, so that I can understand their purpose and tune them easily.

#### Acceptance Criteria

1. THE Chronicle2Layout module SHALL define named constants for the default region coordinates `[0.5, 50.8, 40.0, 83.0]`
2. THE Chronicle2Layout module SHALL define a named constant for the y-coordinate grouping tolerance value `2.0`
3. THE Item_Segmenter SHALL define a named constant for the maximum parenthesis groups per item (`2`)
4. THE Checkbox_Extractor SHALL define named constants for the checkbox Unicode characters (`□`, `☐`, `☑`, `☒`)
5. THE `generate_layout_json` function SHALL define named constants for preset coordinate values (e.g., strikeout x-coordinates `0.5` and `95`)
6. WHEN a numeric literal appears in conditional logic or coordinate calculations, THE containing module SHALL replace the literal with a named constant that explains its purpose

### Requirement 5: Add Type Hints to All Functions

**User Story:** As a developer, I want all function signatures to have complete type hints, so that I can catch type errors early and understand the expected data shapes.

#### Acceptance Criteria

1. THE `find_layout_file` function SHALL have type hints for `layout_dir` (str) and `layout_id` (str) parameters and return type (Path)
2. THE `transform_canvas_coordinates` function SHALL have type hints for `layout_json` (dict) and `canvas_name` (str) parameters and return type (list[float])
3. THE `extract_text_lines` function SHALL have type hints for all parameters including `region_pct` (list[float] | None) and return type (list[dict])
4. THE `generate_layout_json` function SHALL have type hints for all parameters and return type (dict)
5. WHEN a function accepts optional parameters, THE function signature SHALL use `Optional[]` or the `X | None` union syntax
6. THE `image_checkboxes` function SHALL remove unused parameters that are documented as "kept for API compatibility" and add a comment explaining the simplified signature

### Requirement 6: Remove Hardcoded Paths from Generate_Layouts

**User Story:** As a developer, I want `generate_layouts.py` to work on any machine, so that other contributors can run the batch processing without editing source code.

#### Acceptance Criteria

1. THE Generate_Layouts module SHALL accept a `--base-dir` command-line argument for the project root directory instead of using a hardcoded absolute path
2. THE Generate_Layouts module SHALL derive `MODULES_DIR`, `LAYOUTS_DIR`, and `DEBUG_DIR` from the provided base directory
3. THE Generate_Layouts module SHALL accept a `--python` command-line argument for the Python executable path instead of using a hardcoded absolute path
4. IF the `--base-dir` argument is not provided, THEN THE Generate_Layouts module SHALL default to the parent directory of the `chronicle2layout` directory
5. IF the `--python` argument is not provided, THEN THE Generate_Layouts module SHALL default to `sys.executable` (the currently running Python interpreter)

### Requirement 7: Clean Up tools/ Directory

**User Story:** As a developer, I want the tools directory to contain only maintained scripts with proper documentation, so that I know which tools are safe to use.

#### Acceptance Criteria

1. THE `temp_reputation.py` file SHALL be removed from the repository since it is a throwaway debug script
2. THE `extract_season4_content.py` file SHALL be deleted and `extract_season4_content_v2.py` SHALL be renamed to `extract_season4_content.py`
3. WHEN a Season4_Tools script uses `render_page_to_image` or `words_positions`, THE script SHALL import the function from Shared_Utilities instead of defining a local copy
4. THE `build_season4_layout.py` script SHALL move the TEMPLATE dict literal into a separate JSON data file to reduce script size
5. WHEN a Season4_Tools script uses hardcoded paths, THE script SHALL derive paths relative to the script location using `Path(__file__)`

### Requirement 8: Add Docstrings and Module Documentation

**User Story:** As a developer, I want every module and public function to have clear documentation, so that I can understand the purpose and usage without reading the implementation.

#### Acceptance Criteria

1. THE Shared_Utilities module SHALL have a module-level docstring explaining its purpose and listing the public functions
2. THE Item_Segmenter module SHALL have a module-level docstring explaining the segmentation algorithm and its heuristics
3. THE Checkbox_Extractor module SHALL have a module-level docstring explaining the checkbox detection approach
4. WHEN a function has parameters with non-obvious semantics, THE function docstring SHALL include an Args section with descriptions for each parameter
5. WHEN a function returns a complex data structure, THE function docstring SHALL include a Returns section describing the structure
6. THE `README.md` SHALL be updated to reflect the refactored module structure and current functionality

### Requirement 9: Update requirements.txt and Remove Unused Dependencies

**User Story:** As a developer, I want the dependency list to accurately reflect what the code actually uses, so that I can set up the environment without installing unnecessary packages.

#### Acceptance Criteria

1. THE `requirements.txt` SHALL list only packages that are actually imported by the source code
2. IF `PyPDF2` is not imported by any source file, THEN THE `requirements.txt` SHALL remove the `PyPDF2` dependency
3. THE `requirements.txt` SHALL include `Pillow` and `PyYAML` if they are used by tools scripts
4. WHEN a new shared utility module is created, THE `requirements.txt` SHALL include any dependencies the module requires

### Requirement 10: Move Module-Level Imports Out of Functions

**User Story:** As a developer, I want all imports at the top of each module, so that dependencies are visible at a glance and import errors surface immediately.

#### Acceptance Criteria

1. THE `find_layout_file` function SHALL NOT contain an `import re` statement inside the function body
2. THE `clean_text` function SHALL NOT contain an `import re` statement inside the function body
3. WHEN a module uses the `re` standard library module, THE module SHALL import `re` at the top of the file alongside other imports
4. WHEN any function contains a function-level import, THE import SHALL be moved to module level unless there is a documented circular dependency reason

### Requirement 11: Git Workflow and Commit Standards

**User Story:** As a developer, I want all refactoring work done on a dedicated git branch with well-structured commits, so that the changes are reviewable, revertible, and the project history remains clean.

#### Acceptance Criteria

1. ALL refactoring work SHALL be performed on a dedicated git branch named `refactor/chronicle2layout`
2. EACH completed task SHALL be committed as a separate atomic commit on the branch
3. EACH commit message subject line SHALL use Conventional Commits format with an appropriate type prefix (e.g., `refactor:`, `chore:`, `docs:`)
4. EACH commit message subject line SHALL be written in the imperative mood (e.g., "Extract shared utilities" not "Extracted shared utilities")
5. EACH commit message subject line SHALL be capitalized after the type prefix
6. EACH commit message subject line SHALL NOT end with a period
7. EACH commit message subject line SHALL be limited to 72 characters
8. WHEN a commit requires additional context, THE commit message body SHALL be separated from the subject by a blank line and wrapped at 72 characters
9. WHEN a commit message body is present, THE body SHALL explain what changed and why, not how
