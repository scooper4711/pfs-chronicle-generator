# Session Report Encoding Fix — Bugfix Design

## Overview

The "Copy Session Report" feature produces a base64-encoded JSON payload consumed by the RPG Chronicles browser extension. Three bugs prevent interoperability: (1) the serializer uses `btoa()` on UTF-8 JSON but RPG Chronicles expects UTF-16LE bytes before base64, (2) the top-level `repEarned` is hardcoded to `0` instead of reflecting the chosen faction reputation, and (3) `gameDate` lacks a time component that RPG Chronicles requires. The fix targets all three issues with minimal, isolated changes to the serializer, builder, and type definition.

## Glossary

- **Bug_Condition (C)**: Any session report generated with `skipBase64 = false` (encoding bug), or any report where `chosenFactionReputation != 0` (repEarned bug), or any report at all (gameDate bug). In practice, every non-debug report is affected.
- **Property (P)**: The serialized output uses UTF-16LE encoding before base64; `repEarned` equals `shared.chosenFactionReputation`; `gameDate` includes time rounded to nearest half-hour in ISO 8601.
- **Preservation**: `skipBase64` debug mode, JSON field structure, per-player `signUps[].repEarned`, and `bonusRepEarned` assembly must remain unchanged.
- **`serializeSessionReport`**: Function in `session-report-serializer.ts` that JSON-stringifies and base64-encodes the report.
- **`buildSessionReport`**: Function in `session-report-builder.ts` that assembles a `SessionReport` from form data and actor information.
- **`SessionReport`**: Interface in `session-report-types.ts` defining the JSON structure. Currently types `repEarned` as literal `0`.
- **UTF-16LE**: Little-endian UTF-16 encoding. Each code unit is 2 bytes, least significant byte first. RPG Chronicles decodes base64 output as UTF-16LE.

## Bug Details

### Bug Condition

The bugs manifest across three dimensions of every session report:

1. **Encoding**: `serializeSessionReport` calls `btoa(JSON.stringify(report))`, which base64-encodes UTF-8 bytes. RPG Chronicles decodes the base64 and interprets the bytes as UTF-16LE, producing garbled text.
2. **repEarned**: `buildSessionReport` hardcodes `repEarned: 0` and the `SessionReport` interface enforces the literal type `0`, so the chosen faction reputation value is discarded at the top level.
3. **gameDate**: `buildSessionReport` passes `shared.eventDate` directly (e.g. `"2026-03-18"`), which lacks the time component RPG Chronicles expects.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { skipBase64: boolean, shared: SharedFields }
  OUTPUT: boolean

  encodingBug   ← input.skipBase64 = false
  repEarnedBug  ← input.shared.chosenFactionReputation ≠ 0
  gameDateBug   ← true  // time component is always missing

  RETURN encodingBug OR repEarnedBug OR gameDateBug
END FUNCTION
```

### Examples

- **Encoding**: `serializeSessionReport({ gameDate: "2026-03-18", ... })` produces `btoa('{"gameDate":"2026-03-18",...}')`. RPG Chronicles decodes this as UTF-16LE and gets garbled characters instead of valid JSON.
- **repEarned**: GM enters `chosenFactionReputation = 4`. Built report has `repEarned: 0` instead of `repEarned: 4`. RPG Chronicles reads 0 reputation for the chosen faction.
- **gameDate**: Event date is `"2026-03-18"`, current time is 21:47 UTC. Built report has `gameDate: "2026-03-18"`. Expected: `gameDate: "2026-03-18T22:00:00+00:00"` (rounded to nearest half-hour).
- **Edge case — repEarned 0**: GM enters `chosenFactionReputation = 0`. Current and fixed behavior both produce `repEarned: 0`. No visible change.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `skipBase64` is true (Option/Alt-click debug mode), `serializeSessionReport` returns raw JSON without any encoding transformation.
- All existing `SessionReport` fields (`gameSystem`, `generateGmChronicle`, `gmOrgPlayNumber`, `reportingA`–`reportingD`, `scenario`, `signUps`, `bonusRepEarned`) retain their current values and structure.
- Per-player `signUps[].repEarned` continues to equal `shared.chosenFactionReputation`.
- `bonusRepEarned` continues to include only non-chosen factions with non-zero reputation values.

**Scope:**
All inputs where `skipBase64 = true` are completely unaffected by the encoding fix. All fields other than `repEarned` and `gameDate` are unaffected by the builder changes.

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **UTF-16LE Encoding — `btoa()` operates on UTF-8**: `serializeSessionReport` calls `btoa(json)` which treats the string as Latin-1/UTF-8 code points. RPG Chronicles expects the base64 payload to decode to UTF-16LE bytes. The fix requires converting each character to a 2-byte little-endian pair before base64 encoding.

2. **repEarned Literal Type Lock**: `SessionReport.repEarned` is typed as `0` (literal type), which prevents assigning any other number. `buildSessionReport` hardcodes `repEarned: 0` to satisfy this type. The type must be widened to `number` and the builder must read `shared.chosenFactionReputation`.

3. **gameDate Missing Time —
 yields the original JSON string.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Top-Level repEarned Reflects Chosen Faction

_For any_ `SessionReportBuildParams` input, the fixed `buildSessionReport` SHALL set `report.repEarned` equal to `params.shared.chosenFactionReputation`.

**Validates: Requirements 2.2**

Property 3: Bug Condition — gameDate Includes Rounded Time

_For any_ `SessionReportBuildParams` input, the fixed `buildSessionReport` SHALL produce a `gameDate` that starts with `shared.eventDate`, includes a time component with minutes of `00` or `30`, seconds of `00`, and matches the ISO 8601 pattern `YYYY-MM-DDTHH:MM:00+00:00`.

**Validates: Requirements 2.3**

Property 4: Preservation — skipBase64 Mode Unchanged

_For any_ valid `SessionReport` where `skipBase64` is true, the fixed `serializeSessionReport` SHALL return the same raw JSON string as the original function.

**Validates: Requirements 3.1**

Property 5: Preservation — JSON Structure Unchanged

_For any_ `SessionReportBuildParams` input, the fixed `buildSessionReport` SHALL produce identical values for `gameSystem`, `generateGmChronicle`, `gmOrgPlayNumber`, `reportingA`–`reportingD`, `scenario`, `signUps`, and `bonusRepEarned` compared to the original function.

**Validates: Requirements 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `scripts/model/session-report-serializer.ts`

**Function**: `serializeSessionReport`

**Specific Changes**:
1. **Replace `btoa(json)` with UTF-16LE encoding**: Convert each character of the JSON string to a 2-byte little-endian pair using a `Uint8Array`, then base64-encode the resulting binary string. This can be done by iterating over each character's code point, writing the low byte then high byte into the array, and converting the byte array to a binary string for `btoa()`.

**File**: `scripts/model/session-report-types.ts`

**Interface**: `SessionReport`

**Specific Changes**:
2. **Widen `repEarned` type**: Change `repEarned: 0` to `repEarned: number` so the field can hold any reputation value. Update the JSDoc comment to reflect that it carries the chosen faction reputation.

**File**: `scripts/model/session-report-builder.ts`

**Function**: `buildSessionReport`

**Specific Changes**:
3. **Set `repEarned` from shared fields**: Replace `repEarned: 0` with `repEarned: shared.chosenFactionReputation`.
4. **Append rounded time to `gameDate`**: Extract a helper function (e.g. `buildGameDateTime`) that takes the event date string and a `Date` (defaulting to `new Date()`) and appends the current time rounded to the nearest half-hour. The rounding logic: if minutes >= 45, round up to next hour with minutes 00; if minutes >= 15, round to 30; otherwise round to 00. Format as `YYYY-MM-DDTHH:MM:00+00:00`.
5. **Accept optional `now` parameter**: Add an optional `now?: Date` field to `SessionReportBuildParams` to allow deterministic testing of the time-rounding logic without mocking `Date`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that exercise the serializer and builder on the unfixed code and assert the expected (correct) behavior. These tests will fail, confirming the bugs exist.

**Test Cases**:
1. **UTF-16LE Encoding Test**: Serialize a report with `skipBase64 = false`, base64-decode the output, interpret as UTF-16LE, and assert it equals the original JSON. (Will fail on unfixed code — decoding as UTF-16LE produces garbled text.)
2. **repEarned Mapping Test**: Build a report with `chosenFactionReputation = 4` and assert `report.repEarned === 4`. (Will fail on unfixed code — always returns 0.)
3. **gameDate Time Test**: Build a report and assert `gameDate` matches the ISO 8601 datetime pattern. (Will fail on unfixed code — returns date-only string.)
4. **Edge Case — repEarned 0**: Build a report with `chosenFactionReputation = 0` and assert `report.repEarned === 0`. (Will pass on unfixed code — coincidentally correct.)

**Expected Counterexamples**:
- UTF-16LE decode of `btoa(json)` output produces garbled characters, not valid JSON
- `report.repEarned` is always `0` regardless of `chosenFactionReputation` input
- `report.gameDate` has no `T` separator or time component

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
// UTF-16LE round-trip
FOR ALL report WHERE skipBase64 = false DO
  encoded ← serializeSessionReport'(report)
  decoded ← base64Decode(encoded)
  json ← utf16leDecode(decoded)
  ASSERT isValidJSON(json)
  ASSERT json = JSON.stringify(report)
END FOR

// repEarned mapping
FOR ALL params DO
  report ← buildSessionReport'(params)
  ASSERT report.repEarned = params.shared.chosenFactionReputation
END FOR

// gameDate time rounding
FOR ALL params, now DO
  report ← buildSessionReport'(params, now)
  ASSERT report.gameDate MATCHES /^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00\+00:00$/
  ASSERT report.gameDate STARTS WITH params.shared.eventDate
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
// skipBase64 mode unchanged
FOR ALL report WHERE skipBase64 = true DO
  ASSERT serializeSessionReport(report, true) = serializeSessionReport'(report, true)
END FOR

// JSON structure unchanged (all fields except repEarned and gameDate)
FOR ALL params DO
  reportOld ← buildSessionReport(params)
  reportNew ← buildSessionReport'(params)
  ASSERT reportOld.gameSystem = reportNew.gameSystem
  ASSERT reportOld.generateGmChronicle = reportNew.generateGmChronicle
  ASSERT reportOld.gmOrgPlayNumber = reportNew.gmOrgPlayNumber
  ASSERT reportOld.scenario = reportNew.scenario
  ASSERT reportOld.signUps = reportNew.signUps
  ASSERT reportOld.bonusRepEarned = reportNew.bonusRepEarned
  ASSERT reportOld.reportingA = reportNew.reportingA
  ASSERT reportOld.reportingB = reportNew.reportingB
  ASSERT reportOld.reportingC = reportNew.reportingC
  ASSERT reportOld.reportingD = reportNew.reportingD
END FOR
```

**Testing Approach**: Property-based testing is recommended for both fix and preservation checking because:
- It generates many random `SessionReportBuildParams` and `Date` values automatically
- It catches edge cases in time rounding (e.g., minutes at 14, 15, 44, 45 boundaries)
- It provides strong guarantees that the encoding round-trip holds for arbitrary JSON content
- It verifies preservation across a wide range of inputs without hand-crafting each case

**Test Plan**: Observe behavior on UNFIXED code first for `skipBase64 = true` and non-affected fields, then write property-based tests capturing that behavior.

**Test Cases**:
1. **skipBase64 Preservation**: Verify `serializeSessionReport(report, true)` returns identical JSON on both old and new code
2. **Field Structure Preservation**: Verify all fields except `repEarned` and `gameDate` are identical between old and new builder output
3. **signUps Preservation**: Verify per-player `repEarned` still equals `chosenFactionReputation`
4. **bonusRepEarned Preservation**: Verify non-chosen factions with non-zero values are still included

### Unit Tests

- Test UTF-16LE encoding with known input/output pairs (e.g., ASCII-only JSON, JSON with Unicode characters)
- Test `buildGameDateTime` helper with specific minute values at rounding boundaries (14→00, 15→30, 44→30, 45→00 next hour)
- Test `buildGameDateTime` hour rollover at 23:45 (should produce next-day 00:00)
- Test `repEarned` mapping for values 0 through 9
- Test `skipBase64 = true` returns raw JSON unchanged

### Property-Based Tests

- Generate random `SessionReport` objects and verify UTF-16LE round-trip produces identical JSON
- Generate random `chosenFactionReputation` values (0–9) and verify `report.repEarned` matches
- Generate random `Date` objects and verify `gameDate` time component has minutes 00 or 30, seconds 00
- Generate random `SessionReportBuildParams` and verify all non-affected fields are identical to original builder output

### Integration Tests

- Test full "Copy Session Report" flow: build report → serialize → decode as UTF-16LE → parse JSON → verify all fields
- Test that `skipBase64` debug mode still returns parseable raw JSON
- Test with realistic scenario data (known layout IDs, faction codes, player numbers) to verify end-to-end compatibility
