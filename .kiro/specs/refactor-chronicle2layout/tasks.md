# Implementation Plan: Refactor chronicle2layout

## Overview

Refactor the `chronicle2layout` Python codebase to meet coding standards: extract shared utilities, split large files, reduce complexity, add type hints, eliminate magic numbers, clean up tools/, and add documentation. All work is performed on the `refactor/chronicle2layout` branch with atomic Conventional Commits. Each task produces identical functional behavior to the original code.

## Tasks

- [x] 1. Create git branch and extract shared utilities module
  - [x] 1.1 Create the `refactor/chronicle2layout` branch from main
    - Run `git checkout -b refactor/chronicle2layout`
    - _Requirements: 11.1_

  - [x] 1.2 Create `src/shared_utils.py` with `find_layout_file` and `transform_canvas_coordinates`
    - Extract `find_layout_file` from `clip_canvas.py` (superset version with `.generated.json` fallback)
    - Extract `transform_canvas_coordinates` from `clip_canvas.py`
    - Move `import re` to module level
    - Add complete type hints for all parameters and return types
    - Add module-level docstring and function docstrings with Args/Returns sections
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8, 5.1, 5.2, 8.1, 10.1_

  - [x] 1.3 Update `chronicle2layout.py` to import from `shared_utils`
    - Replace local `find_layout_file` and `transform_canvas_coordinates` with imports from `shared_utils`
    - Remove the duplicated function definitions
    - _Requirements: 1.3, 1.9_

  - [x] 1.4 Update `clip_canvas.py` to import from `shared_utils`
    - Replace local `find_layout_file` and `transform_canvas_coordinates` with imports from `shared_utils`
    - Remove the duplicated function definitions
    - _Requirements: 1.4_

  - [x] 1.5 Write property test for layout file resolution equivalence
    - **Property 1: Layout file resolution equivalence**
    - Generate valid layout ID strings matching known patterns (`pfs2`, `pfs2.season5`, `pfs2.season4a`, `pfs2.s5-07`)
    - Verify `shared_utils.find_layout_file()` returns the same Path as the original implementation
    - **Validates: Requirements 1.9**

  - [x] 1.6 Write unit tests for `find_layout_file` and `transform_canvas_coordinates`
    - Test edge cases: missing layout files (expect `ValueError`), single-part IDs, variant suffixes
    - Test `transform_canvas_coordinates`: missing canvas name (expect `ValueError`), nested parent chains
    - _Requirements: 1.6, 1.7, 1.9_

- [x] 2. Checkpoint - Verify shared utilities extraction
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `chronicle2layout.py` and `clip_canvas.py` still produce correct output using shared imports.
  - Commit: `refactor: Extract shared utilities into common module`

- [x] 3. Extract checkbox extractor module
  - [x] 3.1 Create `src/checkbox_extractor.py`
    - Extract `image_checkboxes` and `extract_checkbox_labels` from `chronicle2layout.py`
    - Define `CHECKBOX_CHARS` named constant for checkbox Unicode characters (`□`, `☐`, `☑`, `☒`)
    - Remove unused parameters from `image_checkboxes` (`zoom`, `min_box_size_pct`, `max_box_size_pct`, `max_fill_ratio`, `min_mean_inner`, `min_box_size_px`, `max_box_size_px`) with explanatory comment
    - Remove unused `zoom` parameter from `extract_checkbox_labels`
    - Add complete type hints for all parameters and return types
    - Add module-level docstring and function docstrings
    - _Requirements: 2.3, 4.4, 5.6, 8.3, 8.4, 8.5_

  - [x] 3.2 Update `chronicle2layout.py` to import from `checkbox_extractor`
    - Replace local `image_checkboxes` and `extract_checkbox_labels` with imports
    - Remove the extracted function definitions from `chronicle2layout.py`
    - _Requirements: 2.3, 2.6_

  - [x] 3.3 Write unit tests for `checkbox_extractor`
    - Test `image_checkboxes`: empty PDF, PDF with no checkbox characters in region
    - Test `extract_checkbox_labels`: basic label extraction, edge cases
    - _Requirements: 2.3_

- [ ] 4. Extract item segmenter module
  - [x] 4.1 Create `src/item_segmenter.py`
    - Extract `finalize_buffer` and item segmentation logic from `generate_layout_json` in `chronicle2layout.py`
    - Create `segment_items` function encapsulating the token streaming and parenthesis tracking loop
    - Define `MAX_PAREN_GROUPS_PER_ITEM` named constant (value: `2`)
    - Add complete type hints for all parameters and return types
    - Add module-level docstring explaining the segmentation algorithm and heuristics
    - _Requirements: 2.2, 4.3, 8.2, 8.4, 8.5_

  - [x] 4.2 Write unit tests for `item_segmenter`
    - Test `segment_items`: empty input, single-line items, multi-line items with unmatched parens, items with exactly 2 paren groups
    - Test `finalize_buffer`: empty buffer, buffer with content
    - _Requirements: 2.2_

- [x] 5. Checkpoint - Extract layout generator module
  - [x] 5.1 Create `src/layout_generator.py`
    - Extract `generate_layout_json` from `chronicle2layout.py`
    - Promote `clean_text` and `has_unmatched_parens` to module-level functions
    - Move `import re` to module level for `clean_text`
    - Define `STRIKEOUT_X_START` (0.5) and `STRIKEOUT_X_END` (95.0) named constants
    - Import `segment_items` from `item_segmenter` and `image_checkboxes`/`extract_checkbox_labels` from `checkbox_extractor`
    - Add complete type hints for all parameters and return types
    - Add module-level docstring and function docstrings
    - Reduce cyclomatic complexity of `generate_layout_json` using early returns and extracted helpers
    - _Requirements: 2.4, 2.5, 3.1, 4.5, 5.4, 8.4, 8.5, 10.2_

  - [x] 5.2 Update `chronicle2layout.py` to import from `layout_generator`
    - Replace local `generate_layout_json`, `clean_text`, `has_unmatched_parens` with imports
    - Remove the extracted function definitions
    - `chronicle2layout.py` should now contain only `extract_text_lines`, `main`, and named constants
    - Verify file is under 300 lines
    - _Requirements: 2.1, 2.6_

  - [x] 5.3 Write unit tests for `layout_generator` helper functions
    - Test `clean_text`: hair space removal, trailing artifact cleanup, empty string
    - Test `has_unmatched_parens`: balanced parens, unmatched open, no parens at all
    - _Requirements: 2.4, 2.5_

- [x] 6. Checkpoint - Add named constants and type hints to chronicle2layout.py
  - [x] 6.1 Define named constants in `chronicle2layout.py`
    - Add `DEFAULT_REGION_PCT` for `[0.5, 50.8, 40.0, 83.0]`
    - Add `Y_COORDINATE_GROUPING_TOLERANCE` for `2.0`
    - Replace all magic number usages with the named constants
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 6.2 Add complete type hints to `extract_text_lines`
    - Add type hints for all parameters including `region_pct: list[float] | None` and return type `list[dict]`
    - _Requirements: 5.3, 5.5_

  - [x] 6.3 Reduce cyclomatic complexity of `extract_text_lines`
    - Extract word-grouping logic into a helper function
    - Use early returns and guard clauses to reduce nesting depth
    - _Requirements: 3.2, 3.4_

- [x] 7. Checkpoint - Verify module extraction complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `chronicle2layout.py` is under 300 lines.
  - Verify all extracted modules have type hints and docstrings.
  - Commit each completed extraction as a separate atomic commit:
    - `refactor: Extract checkbox extractor into separate module`
    - `refactor: Extract item segmenter into separate module`
    - `refactor: Extract layout generator into separate module`
    - `refactor: Add named constants and type hints to chronicle2layout`

- [x] 7.1 Write property test for CLI output equivalence
  - **Property 2: CLI output equivalence after refactoring**
  - Run both original and refactored code on fixture PDFs and assert JSON equality
  - Use a small set of fixture PDFs covering multiple seasons and layout variants
  - **Validates: Requirements 2.6**

- [x] 8. Update generate_layouts.py with CLI arguments
  - [x] 8.1 Replace hardcoded paths with CLI arguments
    - Add `--base-dir` argument (default: parent of `chronicle2layout/` directory)
    - Add `--python` argument (default: `sys.executable`)
    - Derive `MODULES_DIR`, `LAYOUTS_DIR`, `DEBUG_DIR` from the provided base directory
    - Remove hardcoded `/Users/stephen/...` paths
    - Remove hardcoded python executable path
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.2 Update `generate_layouts.py` to import `find_layout_file` from `shared_utils` if used
    - Ensure any shared utility usage comes from `shared_utils`
    - _Requirements: 1.5_

  - [x] 8.3 Write property test for base directory path derivation
    - **Property 3: Base directory path derivation**
    - Generate random valid `Path` objects
    - Verify `MODULES_DIR == base_dir / "modules"`, `LAYOUTS_DIR == base_dir / "layouts" / "pfs2"`, `DEBUG_DIR == base_dir / "debug"`
    - **Validates: Requirements 6.2**

  - [x] 8.4 Write unit tests for generate_layouts CLI argument defaults
    - Verify `--base-dir` defaults to parent of `chronicle2layout/`
    - Verify `--python` defaults to `sys.executable`
    - _Requirements: 6.4, 6.5_

- [x] 9. Clean up tools/ directory
  - [x] 9.1 Delete throwaway and obsolete scripts
    - Delete `tools/temp_reputation.py`
    - Delete `tools/extract_season4_content.py` (old version)
    - Rename `tools/extract_season4_content_v2.py` to `tools/extract_season4_content.py`
    - _Requirements: 7.1, 7.2_

  - [x] 9.2 Add `render_page_to_image`, `words_positions`, and `find_grey_boxes` to `shared_utils.py`
    - Extract these functions from `extract_season4_canvases.py` and `extract_season4_content_v2.py`
    - Add type hints and docstrings
    - _Requirements: 7.3, 1.2, 5.1_

  - [x] 9.3 Update tools scripts to import from `shared_utils`
    - Update `extract_season4_canvases.py` to import `render_page_to_image` and `words_positions` from `shared_utils`
    - Update `extract_season4_content.py` (renamed) to import `render_page_to_image`, `words_positions`, and `find_grey_boxes` from `shared_utils`
    - Remove duplicated function definitions from both files
    - _Requirements: 7.3_

  - [x] 9.4 Extract TEMPLATE dict from `build_season4_layout.py` into JSON
    - Create `tools/season4_template.json` containing the TEMPLATE dict
    - Update `build_season4_layout.py` to load template from JSON file
    - Use `Path(__file__)` for relative path resolution
    - _Requirements: 7.4_

  - [x] 9.5 Replace hardcoded paths in tools scripts with `Path(__file__)`-relative paths
    - Update all tools scripts to derive paths relative to script location
    - _Requirements: 7.5_

- [-] 10. Checkpoint - Verify tools cleanup
  - Ensure all tests pass, ask the user if questions arise.
  - Verify deleted files are gone, renamed files are correct, imports work.
  - Commit:
    - `chore: Remove obsolete temp_reputation.py and old extract_season4_content.py`
    - `refactor: Extract shared image utilities into shared_utils`
    - `refactor: Update tools scripts to import from shared_utils`
    - `refactor: Extract TEMPLATE dict into season4_template.json`
    - `refactor: Replace hardcoded paths with Path(__file__)-relative paths`

- [ ] 11. Update requirements.txt and add documentation
  - [ ] 11.1 Update `requirements.txt`
    - Remove `PyPDF2` and `opencv-python-headless`
    - Add `Pillow>=9.0.0` and `PyYAML>=6.0`
    - Keep `PyMuPDF>=1.22.0` and `numpy>=1.21.0`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 11.2 Add docstrings to all modules and public functions
    - Ensure every new module has a module-level docstring
    - Ensure every public function has a docstring with Args/Returns sections where applicable
    - Review existing functions in `chronicle2layout.py` and add missing docstrings
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 11.3 Update `README.md` to reflect refactored module structure
    - Document the new module structure and file responsibilities
    - Update usage instructions if needed
    - _Requirements: 8.6_

  - [ ] 11.4 Create `chronicle2layout/ARCHITECTURE.md` documentation
    - Explain the overall purpose of chronicle2layout (PDF chronicle sheet → layout JSON)
    - Document the processing pipeline: PDF input → text extraction → item segmentation → checkbox detection → layout JSON output
    - Describe each module's role (`chronicle2layout.py`, `shared_utils.py`, `item_segmenter.py`, `checkbox_extractor.py`, `layout_generator.py`, `clip_canvas.py`)
    - Document the data flow between modules with a diagram
    - Explain key concepts: canvases, regions, coordinate systems (absolute vs percentage-based)
    - Document the CLI interface and common usage examples
    - Describe the tools/ directory scripts and when to use them
    - _Requirements: 8.6_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all files are under 300 lines.
  - Verify all functions have type hints and docstrings.
  - Verify no magic numbers remain in conditional logic or coordinate calculations.
  - Verify no function-level imports remain (except documented circular dependency cases).
  - Commit remaining changes:
    - `chore: Update requirements.txt to reflect actual dependencies`
    - `docs: Add docstrings to all modules and public functions`
    - `docs: Update README to reflect refactored module structure`
    - `docs: Add chronicle2layout architecture documentation`

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate behavioral equivalence (the core concern for a refactoring)
- Unit tests validate specific examples and edge cases
- All work is on the `refactor/chronicle2layout` branch per Requirement 11
- Each completed task should be committed as a separate atomic commit using Conventional Commits format
