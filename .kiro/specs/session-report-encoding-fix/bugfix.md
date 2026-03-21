# Bugfix Requirements Document

## Introduction

The "Copy Session Report" feature in the Foundry VTT module produces a base64-encoded session report that is incompatible with the RPG Chronicles browser extension. Three issues prevent interoperability:

1. The serializer encodes JSON as UTF-8 via `btoa()`, but RPG Chronicles expects UTF-16LE-encoded JSON before base64 encoding.
2. The top-level `repEarned` field is hardcoded to `0` with a literal type, preventing it from reflecting the actual chosen faction reputation value entered in the form.
3. The `gameDate` field only contains the date portion (e.g. `"2026-03-18"`) without a time component. RPG Chronicles expects a full ISO 8601 datetime with time rounded to the nearest half-hour (e.g. `"2026-03-18T22:00:00+00:00"`).

Together these bugs make the clipboard output unusable by the consuming browser extension.

**Tracks**: GitHub issue #11

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the GM clicks "Copy Session Report" THEN the system encodes the JSON string as UTF-8 via `btoa(JSON.stringify(report))`, producing a base64 string that RPG Chronicles cannot decode because it expects UTF-16LE-encoded bytes before base64 encoding.

1.2 WHEN the GM has entered a non-zero chosen faction reputation value (e.g. 4) THEN the system always sets the top-level `repEarned` field to `0` because the `SessionReport` interface defines `repEarned` as the literal type `0` and `buildSessionReport` hardcodes the value to `0`.

1.3 WHEN the GM clicks "Copy Session Report" THEN the `gameDate` field in the report contains only the date string from the Event Date form field (e.g. `"2026-03-18"`) without any time component, because `buildSessionReport` passes `shared.eventDate` directly without appending a timestamp. RPG Chronicles expects a full ISO 8601 datetime like `"2026-03-18T22:00:00+00:00"`.

### Expected Behavior (Correct)

2.1 WHEN the GM clicks "Copy Session Report" THEN the system SHALL convert the JSON string to UTF-16LE byte representation and then base64-encode those bytes, producing output that RPG Chronicles can decode by interpreting the base64-decoded bytes as UTF-16LE.

2.2 WHEN the GM has entered a chosen faction reputation value THEN the system SHALL set the top-level `repEarned` field to that value (from `shared.chosenFactionReputation`), matching the per-player `repEarned` values in the `signUps` array.

2.3 WHEN the GM clicks "Copy Session Report" THEN the system SHALL set the `gameDate` field to the Event Date value combined with the current time of day, rounded to the nearest half-hour, in full ISO 8601 format with UTC offset: `YYYY-MM-DDTHH:MM:00+00:00`. The minutes component SHALL be either `00` or `30`. Seconds SHALL always be `00`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `skipBase64` is true (Option/Alt-click debug mode) THEN the system SHALL CONTINUE TO return the raw JSON string without any base64 or UTF-16LE encoding.

3.2 WHEN the session report is serialized THEN the system SHALL CONTINUE TO produce valid JSON containing all existing fields (`gameDate`, `gameSystem`, `generateGmChronicle`, `gmOrgPlayNumber`, `reportingA`–`reportingD`, `scenario`, `signUps`, `bonusRepEarned`) with their current values and structure.

3.3 WHEN per-player `signUps` entries are built THEN the system SHALL CONTINUE TO set each player's `repEarned` to the shared `chosenFactionReputation` value as it does today.

3.4 WHEN `bonusRepEarned` entries are assembled THEN the system SHALL CONTINUE TO include only non-chosen factions with non-zero reputation values.

---

### Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type SessionReportInput
  OUTPUT: boolean

  // The encoding bug affects ALL base64-encoded outputs (skipBase64 = false).
  // The repEarned bug affects reports where chosenFactionReputation != 0.
  // The gameDate bug affects ALL reports (time component is always missing).
  RETURN X.skipBase64 = false OR X.shared.chosenFactionReputation != 0 OR true
END FUNCTION
```

### Fix Checking Property

```pascal
// Property: Fix Checking — UTF-16LE Encoding
FOR ALL X WHERE X.skipBase64 = false DO
  encoded ← serializeSessionReport'(X.report)
  decoded ← base64Decode(encoded)
  json ← utf16leDecode(decoded)
  ASSERT isValidJSON(json)
  ASSERT json = JSON.stringify(X.report)
END FOR

// Property: Fix Checking — Top-level repEarned
FOR ALL X DO
  report ← buildSessionReport'(X.params)
  ASSERT report.repEarned = X.params.shared.chosenFactionReputation
END FOR

// Property: Fix Checking — gameDate includes time rounded to nearest half-hour
FOR ALL X DO
  report ← buildSessionReport'(X.params)
  ASSERT report.gameDate MATCHES /^\d{4}-\d{2}-\d{2}T\d{2}:(00|30):00[+-]\d{2}:\d{2}$/
  ASSERT report.gameDate STARTS WITH X.params.shared.eventDate
END FOR
```

### Preservation Checking Property

```pascal
// Property: Preservation — skipBase64 mode unchanged
FOR ALL X WHERE X.skipBase64 = true DO
  ASSERT serializeSessionReport(X.report, true) = serializeSessionReport'(X.report, true)
END FOR

// Property: Preservation — JSON structure unchanged
FOR ALL X DO
  reportOld ← buildSessionReport(X.params)
  reportNew ← buildSessionReport'(X.params)
  // All fields except repEarned and gameDate remain identical
  ASSERT reportNew.gameDate STARTS WITH reportOld.gameDate
  ASSERT reportOld.gameSystem = reportNew.gameSystem
  ASSERT reportOld.signUps = reportNew.signUps
  ASSERT reportOld.bonusRepEarned = reportNew.bonusRepEarned
  ASSERT reportOld.scenario = reportNew.scenario
END FOR
```
