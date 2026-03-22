# Code Quality Standards and Automated Checks

This document describes the automated code quality checks enforced in this project and how to use them.

## Overview

This project enforces four key code quality metrics:

1. **Cyclomatic Complexity (CCN)** - Measures code complexity
2. **File Size** - Limits file length for maintainability
3. **Code Duplication (DRY)** - Detects repeated code
4. **Code Coverage** - Enforces minimum 80% test coverage

All checks are automated and can be run via npm scripts.

## Quick Start

```bash
# Run all quality checks (lint + duplication)
npm run check:quality

# Run tests and quality checks together
npm run test:all

# Run individual checks
npm run lint                # ESLint (includes complexity and file size checks)
npm run check:duplication   # Check code duplication
```

## Cyclomatic Complexity (CCN)

### What is CCN?

Cyclomatic Complexity measures the number of independent paths through code. Higher complexity means:
- More difficult to test thoroughly
- Harder to understand and maintain
- More prone to bugs

### Standards

- **Functions SHOULD** maintain CCN below 5
- **Functions MUST** maintain CCN below 15
- Violations of CCN ≥15 will cause build failures

### Important Nuance

CCN is a **guideline, not an absolute rule**. Simple, repetitive patterns are acceptable even if they increase CCN:

✅ **Acceptable high CCN**:
- Null-coalescing operators (`value || defaultValue`)
- Optional chaining (`obj?.prop ?? default`)
- Simple switch statements with straightforward cases
- Flat validation checks without nesting

❌ **Unacceptable high CCN**:
- Nested conditionals (if inside if inside if)
- Complex boolean expressions with multiple && and ||
- Long chains of if-else with different logic in each branch
- Functions that do multiple different things based on conditions

### How to Fix High Complexity

1. Extract complex conditionals into well-named helper functions
2. Use early returns to reduce nesting
3. Replace nested if-else chains with guard clauses
4. Use lookup tables or strategy patterns instead of long switch statements
5. Break down complex functions into smaller, single-purpose functions

### Suppressing Warnings

When high CCN is justified (e.g., flat null-coalescing patterns), suppress with a comment:

```typescript
// eslint-disable-next-line complexity -- Flat null-coalescing pattern is clearer than extraction
function initializeDefaults(config: Config): Config {
  return {
    value1: config.value1 || DEFAULT_VALUE1,
    value2: config.value2 || DEFAULT_VALUE2,
    // ... many more similar assignments
  };
}
```

## File Size Limits

### Standards

- **Production files SHOULD** be kept under 300 lines
- **Production files MUST** be kept under 500 lines
- Test files are exempt from these limits

### How to Fix Large Files

1. Extract helper functions into separate utility modules
2. Split large classes into smaller, focused classes
3. Move related functionality into dedicated modules

## TypeScript `any` Type

The `@typescript-eslint/no-explicit-any` ESLint rule is currently disabled (`'off'`) due to existing `any` usage in the codebase. It will be enabled as `'warn'` in a future cleanup pass.

All new code should be written as if the rule is already active:
- Use proper type definitions or interfaces instead of `any`
- Prefer `unknown` over `any` when the type is truly unknown
- When `any` is unavoidable (e.g., interfacing with untyped libraries), add a comment explaining why

## Code Duplication (DRY Principle)

### What is DRY?

DRY (Don't Repeat Yourself) states that "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."

### Standards

- **0-5% duplication**: Excellent ✓
- **5-10% duplication**: Acceptable ✓
- **10-20% duplication**: Needs attention ⚠️
- **>20% duplication**: Requires immediate refactoring ❌

### How Duplication is Measured

The `jscpd` tool detects:
- **Exact duplication**: Identical code blocks
- **Structural duplication**: Same pattern, different details
- **Semantic duplication**: Same concept, different implementation

Minimum thresholds:
- 5 lines minimum
- 50 tokens minimum

### How to Fix Duplication

1. **Extract Function** - Pull repeated code into a named function
2. **Extract Data Structure** - Create interfaces/types for repeated parameter groups
3. **Extract Constant** - Replace magic numbers/strings with named constants
4. **Use Higher-Order Functions** - Create functions that return functions (factories)
5. **Template Method Pattern** - Define algorithm structure in base, let subclasses fill in details
6. **Configuration Over Code** - Use data structures to drive behavior

### Rule of Three

- **First time**: Write the code
- **Second time**: Duplicate with a comment noting the duplication
- **Third time**: Refactor to eliminate duplication

This prevents premature abstraction while ensuring duplication doesn't spread.

## Running Quality Checks

### Individual Checks

```bash
# Check complexity and file size (via ESLint)
npm run lint

# Check code duplication only
npm run check:duplication
```

### Combined Checks

```bash
# Run all quality checks (lint + duplication)
npm run check:quality

# Run tests + quality checks
npm run test:all
```

### In CI/CD

Add to your CI pipeline:

```yaml
- name: Run tests and quality checks
  run: npm run test:all
```

## Understanding Reports

### Complexity Report

```
scripts/handlers/form-data-extraction.ts
  64:38  error  Arrow function has a complexity of 21. Maximum allowed is 15  complexity
```

This indicates:
- File: `scripts/handlers/form-data-extraction.ts`
- Line 64, column 38
- Function has CCN of 21 (exceeds limit of 15)

### Duplication Report

```
============================================================
CODE DUPLICATION REPORT
============================================================
Total Lines:       6056
Duplicated Lines:  107
Duplication:       1.77%
============================================================

✓ EXCELLENT: Duplication (1.77%) is minimal.
```

The report shows:
- Total lines of code analyzed
- Number of duplicated lines
- Percentage of duplication
- Status (Excellent/Acceptable/Warning/Failed)

Detailed clone information is saved to `debug/jscpd-report/jscpd-report.json`.

## Configuration Files

### ESLint Configuration

File: `eslint.config.mjs`

Complexity and file size are enforced via ESLint rules on production files (`scripts/**/*.ts`, excluding test files):

```javascript
rules: {
  // MUST rules (error) — hard limits
  'complexity': ['error', { max: 15 }],
  'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  }],

  // SHOULD rules (warn) — soft limits
  'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
  'no-console': ['warn', { allow: ['warn', 'error'] }],

  // Currently disabled — will be enabled as 'warn' in a future cleanup pass.
  // All new code should avoid `any` as if this rule were active.
  // '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-explicit-any': 'off',
}
```

Test files (`tests/**/*.ts`) are exempt from file size and function length limits.

### jscpd Configuration

File: `.jscpd.json`

```json
{
  "threshold": 10,
  "reporters": ["console", "json"],
  "minLines": 5,
  "minTokens": 50,
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/debug/**"
  ],
  "format": ["typescript", "javascript"],
  "output": "./debug/jscpd-report",
  "exitCode": 0,
  "absolute": true
}
```

### Jest Coverage Threshold

File: `jest.config.js`

Jest enforces a 75% minimum coverage threshold across all metrics:

```javascript
coverageThreshold: {
  global: {
    branches: 75,
    functions: 75,
    lines: 75,
    statements: 75,
  },
},
```

Run with `--coverage` to check:

```bash
npx jest --coverage --silent
```

If coverage drops below 75% on any metric, the test run will fail.

## Best Practices

1. **Run checks before committing**
   ```bash
   npm run check:quality
   ```

2. **Fix issues incrementally**
   - Don't try to fix all issues at once
   - Focus on new code first
   - Refactor existing code gradually

3. **Understand the "why"**
   - Don't just reduce numbers
   - Ensure refactoring improves code clarity
   - Sometimes higher CCN is acceptable (see nuance section)

4. **Use automated checks in CI**
   - Prevent quality regressions
   - Catch issues early
   - Maintain consistent standards

## Troubleshooting

### "Too many warnings" error

If you see many warnings but want to proceed:

```bash
# Run without max-warnings restriction
npx eslint scripts/**/*.ts
```

Then fix issues one by one.

### "jscpd report not found" error

Ensure the debug directory exists:

```bash
mkdir -p debug/jscpd-report
```

### False positive duplications

Some duplication is acceptable (e.g., similar test setup code). If jscpd reports false positives, you can:

1. Add to `.jscpd.json` ignore patterns
2. Increase `minLines` or `minTokens` thresholds
3. Document why duplication is acceptable

## References

- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Cyclomatic Complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [ESLint Complexity Rule](https://eslint.org/docs/latest/rules/complexity)
- [jscpd Documentation](https://github.com/kucherenko/jscpd)

## See Also

- `.kiro/steering/coding-standards.md` - Full coding standards documentation
- `eslint.config.mjs` - ESLint configuration
- `.jscpd.json` - Duplication detection configuration
- `jest.config.js` - Test and coverage configuration
- `scripts-build/check-duplication.js` - Custom duplication checker
