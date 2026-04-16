# ngx-component-meta — Implementation Specs

These specs describe features that need to be built to maximize Compodoc replacement coverage. Each spec is self-contained and can be delegated independently.

## Current state (v0.1.0)

The core library is complete and tested:
- Parses components, directives, and pipes
- Handles both decorator (`@Input`, `@Output`) and signal (`input()`, `output()`, `model()`) APIs
- Extracts JSDoc, types, defaults, aliases, transforms
- Storybook compat via `toCompodocJson()` and `createArgTypesExtractor()`
- CLI with `json` and `compodoc` output formats
- 53 tests passing, zero runtime deps

## Specs (ordered by priority)

| # | Spec | Priority | Estimated scope | Status |
|---|------|----------|-----------------|--------|
| 01 | [Storybook Builder Plugin](./01-storybook-builder-plugin.md) | P0 | ~300 LOC, new package | Not started |
| 02 | [Migration Guide & README](./02-migration-guide.md) | P0 | Docs only | Not started |
| 03 | [Watch Mode](./03-watch-mode.md) | P1 | ~200 LOC in core | Not started |
| 04 | [Markdown Output](./04-markdown-output.md) | P1 | ~150 LOC in cli/formatters | Not started |
| 05 | [Vite/esbuild Plugin](./05-vite-plugin.md) | P2 | ~200 LOC, new package | Not started |
| 06 | [API Diff Tool](./06-api-diff.md) | P2 | ~300 LOC, new CLI command | Not started |
| 07 | [Injectables & Interfaces](./07-injectables-interfaces.md) | P3 | ~200 LOC in extractors | Not started |

## Repo structure

```
ngx-component-meta/
  src/                    — Core library source
  tests/                  — Tests and fixtures
  docs/specs/             — These implementation specs
  dist/                   — Build output
  packages/               — (future) Storybook plugin, Vite plugin
```

## Key files for context

- `src/parser.ts` — Core orchestration, creates ts.Program, discovers classes, runs extractors
- `src/types.ts` — All public types (ComponentDoc, InputDoc, OutputDoc, etc.)
- `src/extractors/` — One file per extraction concern (input.ts, signal-input.ts, etc.)
- `src/utils/import-tracker.ts` — Verifies imports come from @angular/core
- `src/storybook/compodoc-mapper.ts` — Transforms ComponentDoc[] → CompodocJson
- `src/storybook/arg-types.ts` — Direct Storybook ArgTypes extractor (Mode B)
- `src/cli/` — CLI entry point, arg parsing, formatters
- `tests/stubs/angular-core.d.ts` — Minimal Angular type stubs for testing
- `tests/helpers.ts` — Test utilities (parseFixture, parseFirstComponent, etc.)
