# Coding Standards

## Clean Code Principles

This project follows the principles from Robert C. Martin's "Clean Code". These are fundamental guidelines that apply to all code:

**Meaningful Names**:
- Use intention-revealing names that explain why something exists and what it does
- Avoid abbreviations and single-letter variables (except loop counters in small scopes)
- Use pronounceable, searchable names
- Class names should be nouns (`ChronicleValidator`, `LayoutStore`)
- Function names should be verbs (`validateFields`, `generatePdf`, `handleClick`)
- Be consistent - use one word per concept (don't mix `fetch`, `retrieve`, and `get`)

**Functions**:
- Functions should do ONE thing and do it well (Single Responsibility Principle)
- Keep functions small - ideally under 20 lines, definitely under 50
- Function arguments: 0 is ideal, 1-2 is good, 3 requires justification, 4+ needs refactoring
- Avoid flag arguments (boolean parameters that change behavior) - split into separate functions
- No side effects - functions should do what their name says and nothing else
- Use descriptive names - long descriptive names are better than short enigmatic ones

**Comments**:
- Strive for self-explanatory code, but use comments liberally when they add value
- Good comments explain WHY, not WHAT - the code shows what it does, comments explain the reasoning
- Encouraged comments:
  - Legal comments (copyright, licenses)
  - Explanatory comments for complex algorithms, regex patterns, or business logic
  - Warning of consequences (e.g., "This test takes 10 minutes to run")
  - TODO comments (but address them promptly)
  - JSDoc for public APIs
  - Context comments explaining architectural decisions or constraints
  - Clarifying comments for non-obvious code that can't be easily refactored
- Avoid these comment types:
  - Redundant comments that merely repeat what code already says clearly
  - Misleading or outdated comments (keep comments in sync with code changes)
  - Noise comments that add no information ("// Constructor", "// Returns the value")
- Commented-out code:
  - Prefer version control over commented-out code for long-term storage
  - Temporary commented-out code during active development is acceptable
  - If keeping commented code, add a comment explaining why it's preserved

**Formatting**:
- Vertical formatting: Related concepts should be close together
- Use blank lines to separate concepts
- Variables should be declared close to their usage
- Dependent functions should be vertically close (caller above callee)
- Horizontal formatting: Keep lines short (under 120 characters)
- Use consistent indentation (this project uses 2 spaces for TypeScript)

**Error Handling**:
- Use exceptions rather than return codes
- Write try-catch-finally first when writing code that could throw
- Provide context with exceptions - include operation name and failure type
- Don't return null - return empty objects, arrays, or use Optional pattern
- Don't pass null - avoid null parameters in function signatures

**Objects and Data Structures**:
- Objects hide data and expose operations (methods)
- Data structures expose data and have no meaningful operations
- Don't create hybrid structures that are half object, half data structure
- Follow the Law of Demeter: a method should only call methods on:
  - Itself
  - Objects passed as parameters
  - Objects it creates
  - Its direct properties
- Avoid "train wrecks": `a.getB().getC().doSomething()` - use intermediate variables

**Classes**:
- Classes should be small - measured by responsibilities, not lines
- Single Responsibility Principle: a class should have one reason to change
- High cohesion: methods and variables should be interdependent
- Low coupling: minimize dependencies between classes
- Organize from high-level to low-level (public methods first, private helpers below)

**Tests**:
- Tests should be FIRST:
  - Fast: Tests should run quickly
  - Independent: Tests should not depend on each other
  - Repeatable: Tests should work in any environment
  - Self-Validating: Tests should have boolean output (pass/fail)
  - Timely: Write tests before production code (TDD)
- One assert per test (or one concept per test)
- Test code is as important as production code - keep it clean
- Use descriptive test names that explain what is being tested

**General Rules**:
- Follow the Boy Scout Rule: "Leave the code cleaner than you found it"
- Use consistent conventions throughout the codebase
- Replace magic numbers with named constants
- Be precise - don't use `any` type in TypeScript without good reason
- **TypeScript Type Safety**:
  - Do NOT use the `any` type except when interfacing with libraries which lack TypeScript definitions
  - When `any` is necessary, add a comment explaining why and document the expected shape
  - Prefer `unknown` over `any` when the type is truly unknown - it forces type checking before use
  - Use proper type definitions or interfaces instead of `any` whenever possible
- **Prefer `Number` methods over global equivalents**:
  - Use `Number.parseInt()` instead of `parseInt()`
  - Use `Number.isNaN()` instead of `isNaN()`
  - Use `Number.parseFloat()` instead of `parseFloat()`
- **Prefer `String#codePointAt()` over `String#charCodeAt()`** for proper Unicode support
- **Prefer `String.fromCodePoint()` over `String.fromCharCode()`** for proper Unicode support
- **Prefer `.dataset` over `getAttribute('data-...')`** for accessing data attributes (SonarCloud S7761)
- **Prefer `String#replaceAll()` over `String#replace()` with global regex** (SonarCloud S7781)
- Encapsulate conditionals: `if (isValid())` is better than `if (value > 0 && value < 100)`
- Avoid negative conditionals: `if (isValid())` is clearer than `if (!isInvalid())`
- Don't repeat yourself (DRY) - avoid repeated code and duplication
- **Parameter Management**:
  - When dealing with large groups of parameters (4+), create structures (interfaces or types)
  - Group related parameters into objects for better maintainability
  - Example: Instead of `function createUser(name: string, email: string, age: number, address: string, phone: string)`, use `function createUser(userData: UserData)`

## DRY Principle (Don't Repeat Yourself)

The DRY principle states that "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system." Code duplication is one of the most common sources of bugs and maintenance issues.

**Core Tenets of DRY**:

1. **Single Source of Truth**
   - Each piece of logic should exist in exactly one place
   - When logic needs to change, there should be only one place to change it
   - Duplication means multiple places to update, increasing the risk of inconsistency

2. **Abstraction Over Duplication**
   - When you find yourself copying code, create an abstraction instead
   - Extract repeated logic into functions, classes, or modules
   - Use parameters to handle variations rather than duplicating code

3. **Knowledge Representation**
   - DRY applies to more than just code - it includes:
     - Business logic and algorithms
     - Data structures and schemas
     - Configuration and constants
     - Documentation and comments
   - If the same concept appears in multiple places, consolidate it

**Identifying Code Duplication**:

**Exact Duplication** (easiest to spot):
```typescript
// BAD - Exact duplication
function calculatePriceA(quantity: number): number {
  const basePrice = 10;
  const tax = 0.08;
  return quantity * basePrice * (1 + tax);
}

function calculatePriceB(quantity: number): number {
  const basePrice = 10;
  const tax = 0.08;
  return quantity * basePrice * (1 + tax);
}

// GOOD - Single source of truth
function calculatePrice(quantity: number, basePrice: number): number {
  const tax = 0.08;
  return quantity * basePrice * (1 + tax);
}
```

**Structural Duplication** (same pattern, different details):
```typescript
// BAD - Structural duplication
taskLevelSelects.forEach((select) => {
  select.addEventListener('change', (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const characterId = extractCharacterIdFromFieldName(selectElement.name);
    if (characterId) {
      const params = extractEarnedIncomeParams(characterId, container);
      updateEarnedIncomeDisplay(params.characterId, params.taskLevel, 
        params.successLevel, params.proficiencyRank, params.downtimeDays, container);
    }
  });
});

successLevelSelects.forEach((select) => {
  select.addEventListener('change', (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const characterId = extractCharacterIdFromFieldName(selectElement.name);
    if (characterId) {
      const params = extractEarnedIncomeParams(characterId, container);
      updateEarnedIncomeDisplay(params.characterId, params.taskLevel, 
        params.successLevel, params.proficiencyRank, params.downtimeDays, container);
    }
  });
});

// GOOD - Extract common handler
function createEarnedIncomeChangeHandler(container: HTMLElement) {
  return (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const characterId = extractCharacterIdFromFieldName(selectElement.name);
    if (characterId) {
      const params = extractEarnedIncomeParams(characterId, container);
      updateEarnedIncomeDisplay(params.characterId, params.taskLevel, 
        params.successLevel, params.proficiencyRank, params.downtimeDays, container);
    }
  };
}

taskLevelSelects.forEach(select => 
  select.addEventListener('change', createEarnedIncomeChangeHandler(container)));
successLevelSelects.forEach(select => 
  select.addEventListener('change', createEarnedIncomeChangeHandler(container)));
```

**Semantic Duplication** (same concept, different implementation):
```typescript
// BAD - Same concept implemented differently
function isValidEmailA(email: string): boolean {
  return email.includes('@') && email.includes('.');
}

function checkEmailB(email: string): boolean {
  const parts = email.split('@');
  return parts.length === 2 && parts[1].includes('.');
}

// GOOD - Single validation function
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

**When to Apply DRY**:

✅ **DO apply DRY when**:
- The same logic appears in 2+ places
- Changes to one instance would require changing others
- The duplication represents the same concept or knowledge
- The code is stable and unlikely to diverge

❌ **DON'T apply DRY when**:
- Code looks similar but represents different concepts (coincidental duplication)
- The duplication is temporary during active development
- Abstracting would make the code harder to understand
- The code is likely to diverge in the future (premature abstraction)

**DRY Refactoring Strategies**:

1. **Extract Function**
   - Pull repeated code into a named function
   - Use parameters for variations

2. **Extract Data Structure**
   - When passing the same group of parameters repeatedly, create an interface or type
   - Example: `EarnedIncomeParams` interface instead of 5 separate parameters

3. **Extract Constant**
   - Replace magic numbers and strings with named constants
   - Define once, reference everywhere

4. **Use Higher-Order Functions**
   - Create functions that return functions (factories)
   - Example: `createEarnedIncomeChangeHandler()` returns an event handler

5. **Template Method Pattern**
   - Define algorithm structure in base, let subclasses fill in details
   - Useful for similar workflows with variations

6. **Configuration Over Code**
   - Use data structures to drive behavior instead of duplicating code
   - Example: Lookup tables instead of long if-else chains

**Measuring Code Duplication**:

Tools like `jscpd` (JavaScript Copy/Paste Detector) can automatically detect duplicated code blocks. This project uses automated duplication detection in CI to catch violations.

**Acceptable Duplication Threshold**:
- **0-5% duplication**: Excellent
- **5-10% duplication**: Acceptable
- **10-20% duplication**: Needs attention
- **>20% duplication**: Requires immediate refactoring

**Rule of Three**:
- First time: Write the code
- Second time: Duplicate with a comment noting the duplication
- Third time: Refactor to eliminate duplication

This prevents premature abstraction while ensuring duplication doesn't spread.

## File Size and Complexity

To maintain code quality and readability, all production code must adhere to these standards:

**File Size Limit**:
- Production class files SHOULD be kept under 300 lines
- Production class files MUST be kept under 500 lines
- If a file exceeds 300 lines, consider refactoring by:
  - Extracting helper functions into separate utility modules
  - Splitting large classes into smaller, focused classes
  - Moving related functionality into dedicated modules
- If a file approaches 500 lines, refactoring is mandatory

**Cyclomatic Complexity**:
- Functions SHOULD maintain cyclomatic complexity below 5
- Functions MUST maintain cyclomatic complexity below 15
- Cyclomatic complexity measures the number of independent paths through code
- High complexity (≥15) indicates code that is:
  - Difficult to test thoroughly
  - Hard to understand and maintain
  - More prone to bugs

**Important Nuance**:
- CCN is a **guideline, not an absolute rule**
- Simple, repetitive patterns are acceptable even if they increase CCN:
  - Null-coalescing operators (`value || defaultValue`)
  - Optional chaining (`obj?.prop ?? default`)
  - Simple switch statements with straightforward cases
  - Flat validation checks without nesting
- **Focus on cognitive complexity** - how hard is the code to understand?
- A function with CCN of 10 from null-coalescing is often clearer than CCN of 4 with nested conditionals
- **When high CCN is acceptable**: Suppress linter warnings with an explanatory comment:
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

**How to Reduce Complexity**:
1. Extract complex conditionals into well-named helper functions
2. Use early returns to reduce nesting
3. Replace nested if-else chains with guard clauses
4. Use lookup tables or strategy patterns instead of long switch statements
5. Break down complex functions into smaller, single-purpose functions
6. **Note**: Don't refactor simple null-coalescing patterns just to reduce CCN

**What Actually Needs Refactoring**:
- Nested conditionals (if inside if inside if)
- Complex boolean expressions with multiple && and ||
- Long chains of if-else with different logic in each branch
- Functions that do multiple different things based on conditions

**What Doesn't Need Refactoring**:
- Flat lists of assignments with `|| defaultValue`
- Simple switch statements with straightforward cases
- Validation functions with flat, repetitive checks
- Optional chaining patterns

**Example - High Complexity (BAD)**:
```typescript
function processData(data: any, type: string, options: any) {
  if (type === 'A') {
    if (options.flag1) {
      if (data.value > 10) {
        return data.value * 2;
      } else {
        return data.value + 5;
      }
    } else {
      return data.value;
    }
  } else if (type === 'B') {
    // ... more nested logic
  }
  // Cyclomatic complexity: 6+
}
```

**Example - Low Complexity (GOOD)**:
```typescript
function processData(data: any, type: string, options: any) {
  if (type === 'A') return processTypeA(data, options);
  if (type === 'B') return processTypeB(data, options);
  return data.value;
}

function processTypeA(data: any, options: any) {
  if (!options.flag1) return data.value;
  return data.value > 10 ? data.value * 2 : data.value + 5;
}
// Cyclomatic complexity: 2-3 per function
```

**Enforcement**:
- Use ESLint with complexity rules configured
- Review file sizes during code review
- Refactor proactively when approaching limits
- Consider complexity during design phase

**Exceptions**:
- Test files are exempt from these limits (they often need to be longer)
- Configuration files and type definition files are exempt
- Generated code is exempt
- If an exception is truly necessary, document the reason in comments

## Pre-Push Testing Requirements

Before any `git push`, all tests MUST pass. Do NOT push code with failing tests.

**Required steps before pushing**:
1. Run `npm run lint` and verify no lint errors
2. Run `npx jest --silent` and verify all tests pass
3. If lint or tests fail, fix them before committing/pushing
4. Only push when both lint and the full test suite are green

**This is a hard rule** — no exceptions. Broken tests on main break CI for everyone.

## Git Commit Standards

This project follows [Conventional Commits](https://www.conventionalcommits.org/) combined with the [seven rules of a great Git commit message](https://cbea.ms/git-commit/).

**Commit Message Format**:
```
<type>: <subject>

[optional body]
```

**Type Prefixes** (Conventional Commits):
- `feat:` — A new feature
- `fix:` — A bug fix
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `docs:` — Documentation only changes
- `chore:` — Maintenance tasks (dependency updates, file cleanup, etc.)
- `test:` — Adding or updating tests
- `style:` — Formatting, whitespace, etc. (no code logic change)

**Subject Line Rules**:
1. Capitalize the first word after the type prefix
2. Use the imperative mood ("Add feature" not "Added feature")
3. Do not end with a period
4. Limit to 72 characters (aim for 50)
5. The subject should complete: "If applied, this commit will ___"

**Body Rules** (when needed):
1. Separate from subject with a blank line
2. Wrap at 72 characters
3. Explain what and why, not how
4. Use bullet points if listing multiple changes

**Branch Naming**:
- Feature work: `feat/<feature-name>`
- Refactoring: `refactor/<scope>`
- Bugfixes: `fix/<bug-name>`

**Merge Strategy**:
- Use merge commits (`git merge --no-ff`) when integrating feature, refactor, and bugfix branches into main
- Do NOT use fast-forward merges — branches should be preserved in the commit graph so their history is visible
- The merge commit message should follow Conventional Commits format and reference the branch purpose
- Example: `Merge branch 'refactor/chronicle2layout'`
- This preserves the context of grouped work (e.g., a multi-commit refactoring) and makes `git log --graph` useful

**Examples**:

Good:
```
refactor: Extract shared utilities into common module

Move find_layout_file and transform_canvas_coordinates into
a shared layout_utils module to eliminate duplication between
chronicle2layout.py and clip_canvas.py.
```

```
chore: Remove obsolete Season 4 content extraction script
```

```
docs: Update README to reflect refactored module structure
```

Bad:
```
updated files          ❌ Not imperative, no type, vague
refactor: updated files.  ❌ Not imperative, ends with period
REFACTOR: EXTRACT UTILS   ❌ All caps
```
