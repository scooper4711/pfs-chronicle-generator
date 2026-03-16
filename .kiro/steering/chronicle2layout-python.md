---
inclusion: fileMatch
fileMatchPattern: "chronicle2layout/**"
---

# chronicle2layout Python Environment

## Virtual Environment

Python is installed under `chronicle2layout/.venv`. Activate it by sourcing the activate script — this only needs to be done once per terminal session:

```bash
source chronicle2layout/.venv/bin/activate
```

After activation, `python`, `python3`, `pip`, and `pip3` are all available on the PATH from `.venv/bin/`.

## Running Tests

Tests use `pytest` and `hypothesis` (property-based testing). Run from the `chronicle2layout` directory:

```bash
source .venv/bin/activate
python -m pytest
```

## Key Packages

The venv includes PyMuPDF (`fitz`), Pillow, numpy, pytest, and hypothesis.
