# Spec 02: Migration Guide & README

## Problem

Users evaluating `ngx-component-meta` need:
1. A clear README explaining what it is and why it exists
2. A migration guide showing exactly how to replace Compodoc in each use case
3. API documentation for the programmatic interface
4. Examples for common scenarios

## Deliverables

### 1. README.md (project root)

Structure:

```
# ngx-component-meta

> Lightweight Angular component metadata extractor — like react-docgen-typescript, but for Angular.

## Why

[3-4 sentences: Compodoc is 43 deps and a full doc site generator. Most tooling just needs the JSON.
This library does one thing: extract inputs, outputs, models, methods, types from Angular source files.
Zero runtime deps. Handles both decorator and signal APIs. Storybook-compatible.]

## Quick Start

### Programmatic
[3-line code example using parse()]

### CLI
[2 CLI invocations showing json and compodoc output]

### Storybook
[Mode A and Mode B examples]

## What it extracts

[Table showing: inputs, outputs, models, properties, methods, queries, pipes
with columns: Feature | Decorator API | Signal API | Example output]

## Comparison with Compodoc

| | ngx-component-meta | Compodoc |
|---|---|---|
| Dependencies | 0 (typescript peer) | 43 |
| Signal inputs | Full support | Broken (10+ open bugs) |
| model() signals | Full support | No support |
| Output | Structured JSON | JSON + full HTML site |
| Storybook compat | Drop-in | Native |
| Install size | ~50KB | ~15MB |

## API Reference

### parse(files, options?)
### createParser(tsconfigPath, options?)
### createParserFromOptions(compilerOptions, options?)

[Brief description + link to types]

### ParserOptions
[Table of all options with defaults]

### Output Types
[Link to types.ts or inline the key interfaces]

### CLI
[Full --help output]

### Storybook Integration
[toCompodocJson() and createArgTypesExtractor() with examples]

## License
MIT
```

### 2. docs/migration-from-compodoc.md

Cover these migration scenarios with before/after code:

#### Scenario A: Storybook (manual wiring)

Before:
```bash
npx compodoc -p tsconfig.json -e json -d .
```
```ts
// preview.ts
import docJson from "../documentation.json";
setCompodocJson(docJson);
```

After (Mode A — drop-in):
```ts
import { parse } from "ngx-component-meta";
import { toCompodocJson } from "ngx-component-meta/storybook";
setCompodocJson(toCompodocJson(parse(["src/**/*.component.ts"])));
```

After (Mode B — direct):
```ts
import { createArgTypesExtractor } from "ngx-component-meta/storybook";
export default {
  parameters: {
    docs: { extractArgTypes: createArgTypesExtractor("./tsconfig.json") }
  }
};
```

#### Scenario B: Storybook (angular.json builder)

Before:
```json
{ "compodoc": true, "compodocArgs": [...] }
```

After:
```json
{ "compodoc": false }
```
+ add `ngx-component-meta-storybook` preset (link to Spec 01)

#### Scenario C: CI/CD pipeline generating documentation.json

Before:
```bash
npx compodoc -p tsconfig.json -e json -d docs/
```

After:
```bash
npx ngx-component-meta -p tsconfig.json -f compodoc -o docs/documentation.json
```

#### Scenario D: Custom doc site reading documentation.json

Before:
```ts
import docs from './documentation.json';
const comp = docs.components.find(c => c.name === 'MyComponent');
comp.inputsClass.forEach(input => { /* render */ });
```

After (compat mode — zero changes needed):
```bash
# Generate Compodoc-compatible JSON
npx ngx-component-meta -f compodoc -o documentation.json "src/**/*.ts"
```
Existing code continues to work. For new code, use the native format directly:
```ts
import { parse } from 'ngx-component-meta';
const docs = parse(['src/my.component.ts']);
docs[0].inputs.forEach(input => { /* render */ });
```

#### Scenario E: IDE/language server consuming metadata

```ts
import { createParser } from 'ngx-component-meta';
const parser = createParser('./tsconfig.json');
// Parser reuses ts.Program across calls — fast for repeated lookups
const docs = parser.parse(['src/button/button.component.ts']);
```

#### Compodoc CLI flag mapping

| Compodoc flag | ngx-component-meta equivalent |
|---|---|
| `-p tsconfig.json` | `-p tsconfig.json` |
| `-e json` | `-f json` (default) |
| `-d outputDir` | `-o outputDir/documentation.json` |
| `--disablePrivate` | Default behavior (private members always excluded) |
| `--disableInternal` | Default behavior (@internal always excluded) |
| `--disableLifeCycleHooks` | Default behavior (lifecycle hooks always excluded) |
| `--disableProtected` | Use `propFilter` to exclude protected members |
| `--disableRoutesGraph` | N/A (no route analysis — this is a focused metadata tool) |
| `-s` / `--serve` | N/A (no built-in server — use any static server) |
| `-w` / `--watch` | `--watch` (Spec 03) |

### 3. docs/signal-support.md

A focused document showing how `ngx-component-meta` handles every Angular signal pattern, with input source code and expected JSON output side by side. This is the key differentiator vs Compodoc.

Cover:
- `input<T>()` — optional, no default
- `input<T>(defaultValue)` — optional with default
- `input.required<T>()` — required
- `input<T>(defaultValue, { alias, transform })` — full options
- `output<T>()` — basic output
- `output<T>({ alias })` — aliased output
- `model<T>()` — two-way binding
- `model<T>(defaultValue)` — with default
- `model.required<T>()` — required model
- `viewChild()`, `viewChild.required()`, `viewChildren()`, `contentChild()`, `contentChildren()`
- Mixed decorator + signal in the same class

### 4. CHANGELOG.md

Start with:
```
# Changelog

## 0.1.0 (unreleased)

Initial release.

- Extract component/directive/pipe metadata from TypeScript source
- Support for both decorator (@Input, @Output) and signal (input(), output(), model()) APIs
- JSDoc extraction (description, tags)
- Storybook compatibility: toCompodocJson(), createArgTypesExtractor()
- CLI with json and compodoc output formats
- Zero runtime dependencies
```

## Implementation notes

- README should be concise — under 300 lines. Link to docs/ for details.
- Use real code examples from the test fixtures — they're known to work.
- Include badges: npm version, license, test status.
- Migration guide should be copy-paste ready — no "adjust to your setup" hand-waving.
