---
inclusion: fileMatch
fileMatchPattern: "scripts/**,templates/**,css/**"
---

# Foundry VTT Architecture

## CRITICAL: Hybrid ApplicationV2 Pattern

The PFS system hasn't fully migrated to ApplicationV2. The Party Chronicle form is injected into the PFS party sheet's "Society" tab via manual DOM manipulation.

- `PartyChronicleApp.ts` extends ApplicationV2 but only `_prepareContext()` is used
- `_onRender` is NEVER called — do NOT put event listeners there
- `main.ts` → `renderPartyChronicleForm()` does all rendering and event listener attachment
- Uses `foundry.applications.handlebars.renderTemplate()` + manual HTML injection

## Event Listener Rules

- ❌ NEVER add listeners in `PartyChronicleApp._onRender()` — it's never called
- ✅ Attach listeners in `main.ts` → `renderPartyChronicleForm()` after template renders
- ✅ Extract handler logic into `handlers/` modules for testability
- ✅ Use native DOM APIs (`querySelector`, `addEventListener`)
- ❌ Do NOT introduce jQuery — the codebase has been fully migrated to native DOM

## Where to Make Changes

| Change Type | Location |
|---|---|
| Event listener attachment | `main.ts` → `renderPartyChronicleForm()` |
| Event handler logic | `handlers/party-chronicle-handlers.ts` |
| Party chronicle context | `PartyChronicleApp._prepareContext()` |
| Single chronicle context | `PFSChronicleGeneratorApp._prepareContext()` |
| Shared field validation | `model/party-chronicle-validator.ts` → `validateSharedFields()` |
| Character field validation | `model/party-chronicle-validator.ts` → `validateUniqueFields()` |
| New validation helpers | `model/validation-helpers.ts` |
| Validation UI | `handlers/validation-display.ts` |
| Form layout | `templates/party-chronicle-filling.hbs` |
| Styling | `css/style.css` |
| Layout field utilities | `utils/layout-utils.ts` |
| PDF rendering | `PdfGenerator.ts`, `utils/pdf-utils.ts`, `utils/pdf-element-utils.ts` |
| Filename operations | `utils/filename-utils.ts` |
| Chronicle generation workflow | `handlers/chronicle-generation.ts` |
| Single chronicle generation | `handlers/single-chronicle-handlers.ts` |
| Form data extraction | `handlers/form-data-extraction.ts` |

## Directory Structure

```
scripts/
├── main.ts                    # Entry point, tab injection, ALL event listener attachments
├── PartyChronicleApp.ts       # ApplicationV2 context prep only (not rendering)
├── PFSChronicleGeneratorApp.ts # Single-character chronicle context prep
├── PdfGenerator.ts            # PDF rendering engine (pdf-lib)
├── LayoutStore.ts             # Layout configuration management
├── handlers/                  # Handler logic called from main.ts
├── utils/                     # Shared utilities (filename, layout, pdf)
└── model/                     # Types, storage, validation, mapping, business logic
```

## Future Migration (when PFS system adopts ApplicationV2)

1. Remove `renderPartyChronicleForm()` and tab injection from `main.ts`
2. Use `PartyChronicleApp` as proper ApplicationV2 (`.render(true)`)
3. Move event listeners to `_onRender()` using native DOM
4. Verify: all listeners, auto-save, form state preservation

## References

- [ApplicationV2 Docs](https://foundryvtt.wiki/en/development/api/applicationv2)
- [ApplicationV2 Conversion Guide](https://foundryvtt.wiki/en/development/guides/applicationV2-conversion-guide)
