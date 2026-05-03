# ngx-component-meta

**Extract, diff, lint, and track Angular component APIs from source.**

[![npm version](https://img.shields.io/npm/v/ngx-component-meta)](https://www.npmjs.com/package/ngx-component-meta)
[![license](https://img.shields.io/npm/l/ngx-component-meta)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/user/ngx-component-meta/ci.yml?branch=main&label=CI)](https://github.com/user/ngx-component-meta/actions)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ngx-component-meta)](https://bundlephobia.com/package/ngx-component-meta)

---

## Why ngx-component-meta?

Angular has no lightweight metadata extraction tool. Compodoc is a full documentation site generator -- 43 dependencies, ~15MB install -- with multiple open bugs around signal inputs, no `model()` support, and known freezes on some projects. Typedoc doesn't understand Angular semantics: it sees `InputSignal<T>`, not a template binding.

`ngx-component-meta` understands Angular. Inputs, outputs, models, host bindings, signal queries -- all extracted with proper type unwrapping. Zero runtime dependencies. Structured JSON output. Build whatever you want on top: Storybook controls, custom doc sites, API diff checks in CI, migration dashboards.

## Quick Start

```bash
npm install -D ngx-component-meta
```

```bash
npx ngx-component-meta "src/**/*.component.ts"
```

Output for a simple component:

```json
[
  {
    "name": "ButtonComponent",
    "kind": "component",
    "selector": "app-button",
    "inputs": [
      {
        "name": "variant",
        "bindingName": "variant",
        "type": "\"primary\" | \"secondary\"",
        "required": false,
        "defaultValue": "'primary'",
        "description": "Visual style of the button.",
        "source": "signal"
      }
    ],
    "outputs": [
      {
        "name": "clicked",
        "bindingName": "clicked",
        "type": "MouseEvent",
        "description": "Emitted on button click.",
        "source": "signal"
      }
    ],
    "models": [],
    "methods": [],
    "properties": []
  }
]
```

TypeScript (`>=5.0.0`) is the only peer dependency.

## Features

| Feature | What it does |
|---------|-------------|
| **Extract** | Components, directives, pipes, injectables, interfaces, type aliases, enums, classes, functions, variables. Supports `@Input()`, `input()`, `input.required()`, `@Output()`, `output()`, `model()`, `model.required()`, `@HostBinding`, `@HostListener`, signal queries (`viewChild()`, `contentChildren()`, etc.). Full type unwrapping -- you get `string`, not `InputSignal<string>`. |
| **Diff** | Compare API snapshots across versions. Detects breaking vs non-breaking changes (removed inputs, type changes, new required params). CI-ready with exit code 1 on breaking changes. GitHub Action included. |
| **Lint** | Enforce documentation and quality rules. 7 built-in rules with configurable severity. ESLint-style output with `--format stylish`. |
| **Stats** | Track signal migration progress. Per-component breakdown of decorator vs signal bindings. "63% migrated" in one command. |
| **Storybook** | Drop-in Compodoc replacement via `toCompodocJson()`. Or bypass Compodoc entirely with `createArgTypesExtractor()` for richer categories (inputs, outputs, two-way bindings, methods). Vite plugin included. |
| **Props JSON** | Framework-agnostic prop tables for Docusaurus, Astro, VitePress, or any static site generator. |

## CLI Reference

### Extract (default command)

```bash
# JSON to stdout
ngx-component-meta "src/**/*.component.ts"

# Compodoc-compatible JSON for Storybook
ngx-component-meta -f compodoc "src/**/*.ts" > documentation.json

# Framework-agnostic props for static doc sites
ngx-component-meta -f props-json -o docs/api.json "src/**/*.ts"

# Markdown docs, one file per component
ngx-component-meta -f markdown -o docs/ --split "src/**/*.ts"

# Watch mode
ngx-component-meta -w "src/**/*.component.ts"
```

### Diff

```bash
# Compare two saved snapshots
ngx-component-meta diff --base v1.json --head v2.json

# Compare a saved baseline against current source
ngx-component-meta diff --base v1.json -p tsconfig.lib.json

# Markdown output for PR comments
ngx-component-meta diff --base v1.json --head v2.json -f markdown
```

Exits with code 1 when breaking changes are detected.

### Lint

```bash
ngx-component-meta lint "src/**/*.ts"

# ESLint-style grouped output
ngx-component-meta lint -f stylish "src/**/*.ts"
```

**Built-in rules:**

| Rule | Default | Description |
|------|---------|-------------|
| `require-input-description` | error | Every input must have a JSDoc description |
| `require-output-description` | error | Every output must have a JSDoc description |
| `require-component-description` | warn | Every component/directive must have a JSDoc description |
| `require-selector` | error | Components must have a selector defined |
| `no-any-inputs` | warn | Inputs should not use type `any` |
| `no-any-outputs` | warn | Outputs should not use type `any` |
| `no-required-with-default` | warn | Required inputs should not have default values |

### Stats

```bash
ngx-component-meta stats "src/**/*.ts"

# Markdown table for dashboards
ngx-component-meta stats -f markdown -o migration-report.md "src/**/*.ts"
```

Example output:

```
Signal Migration: 63.2% (31/49 bindings)

Inputs:   58.3% signal (14/24)
Outputs:  68% signal (17/25)
Models:   3

Components: 12 total
  Fully migrated:     5
  Partially migrated: 4
  Legacy:             2
  No bindings:        1
```

### Common Options

All commands support:

| Flag | Description |
|------|-------------|
| `-p, --project <path>` | Path to tsconfig.json (default: auto-detect) |
| `-o, --output <file>` | Write output to file instead of stdout |
| `-f, --format <fmt>` | Output format (varies by command) |
| `--no-methods` | Exclude methods from output |
| `--no-inherited` | Exclude inherited members |

## Programmatic API

Five entry points cover the full surface:

```typescript
import { parse, parseAll, createParser } from 'ngx-component-meta';
import { diff } from 'ngx-component-meta';
import { lint } from 'ngx-component-meta';
import { computeStats } from 'ngx-component-meta';
import { toPropsJson } from 'ngx-component-meta';
```

### Reusable parser (recommended for multiple files)

```typescript
import { createParser } from 'ngx-component-meta';

const parser = createParser('./tsconfig.json');

// Parse components and directives
const buttonDocs = parser.parse('src/button/button.component.ts');
const allDocs = parser.parse('src/**/*.component.ts');

// Parse everything: components, pipes, injectables, interfaces, enums...
const fullResult = parser.parseAll('src/**/*.ts');
console.log(fullResult.components);  // ComponentDoc[]
console.log(fullResult.injectables); // InjectableDoc[]
console.log(fullResult.interfaces);  // InterfaceDoc[]
```

The parser reuses its `ts.Program` across calls, so subsequent parses are fast.

### One-shot convenience functions

```typescript
import { parse, parseAll } from 'ngx-component-meta';

// Auto-detects tsconfig.json by walking up from the first file
const docs = parse(['src/button/button.component.ts']);
const result = parseAll(['src/**/*.ts']);
```

### API diff

```typescript
import { parse, diff, formatDiffMarkdown } from 'ngx-component-meta';

const base = parse(['src/**/*.component.ts']); // e.g., from main branch
const head = parse(['src/**/*.component.ts']); // e.g., from PR branch

const result = diff(base, head);

if (result.summary.breaking > 0) {
  console.error(formatDiffMarkdown(result));
  process.exit(1);
}
```

### Lint

```typescript
import { parseAll, lint, formatLintStylish } from 'ngx-component-meta';

const result = parseAll(['src/**/*.ts']);
const report = lint(result, {
  rules: {
    'require-input-description': 'error',
    'no-any-inputs': 'error',
  },
});

console.log(formatLintStylish(report));
```

### Migration stats

```typescript
import { parseAll, computeStats, formatStatsText } from 'ngx-component-meta';

const result = parseAll(['src/**/*.ts']);
const stats = computeStats(result);
console.log(formatStatsText(stats));
// Signal Migration: 63.2% (31/49 bindings)
```

## Storybook Integration

### Mode A: Drop-in Compodoc replacement

No Storybook config changes needed. Replace Compodoc's JSON with `ngx-component-meta` output:

```typescript
// .storybook/preview.ts
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { parse } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';

setCompodocJson(toCompodocJson(parse(['src/**/*.component.ts'])));
```

### Mode B: Direct arg types extraction

Bypasses Compodoc entirely. Gives you richer Storybook categories (inputs, outputs, two-way bindings, methods, properties):

```typescript
// .storybook/preview.ts
import { createArgTypesExtractor } from 'ngx-component-meta/storybook';

export default {
  parameters: {
    docs: {
      extractArgTypes: createArgTypesExtractor('./tsconfig.json'),
    },
  },
};
```

### Vite Plugin

For Storybook with Vite or standalone Vite builds, use the Vite plugin to serve metadata as virtual modules:

```typescript
// vite.config.ts
import { ngxComponentMeta } from 'ngx-component-meta/vite';

export default {
  plugins: [
    ngxComponentMeta({
      tsconfig: './tsconfig.json',
      include: ['src/**/*.component.ts'],
    }),
  ],
};
```

Import metadata from virtual modules in your app:

```typescript
import { components, pipes } from 'virtual:ngx-component-meta';
import compodocJson from 'virtual:ngx-component-meta/compodoc';
```

The plugin watches for changes to `.component.ts`, `.directive.ts`, and `.pipe.ts` files and triggers HMR automatically.

## GitHub Action

Detect breaking API changes on every pull request:

```yaml
- uses: user/ngx-component-meta/action@v1
  with:
    base: api-baseline.json
    fail-on-breaking: 'true'
    comment-on-pr: 'true'
```

Full options:

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `base` | Yes | -- | Path to baseline JSON file |
| `head` | No | -- | Path to head JSON file (omit to parse current source) |
| `project` | No | -- | Path to tsconfig.json (used when `head` is omitted) |
| `format` | No | `markdown` | Output format: text, json, markdown |
| `fail-on-breaking` | No | `true` | Fail the action on breaking changes |
| `comment-on-pr` | No | `true` | Post/update a PR comment with the diff |

Outputs: `breaking-count`, `non-breaking-count`, `has-breaking`, `diff-output`.

## Comparison

| Feature | ngx-component-meta | Compodoc | typedoc |
|---------|-------------------|----------|---------|
| Signal inputs (`input()`, `input.required()`) | Yes | Broken (10+ open bugs) | No (shows `InputSignal<T>`) |
| `model()` / `model.required()` | Yes | No | No |
| Type unwrapping | Yes (`string` not `InputSignal<string>`) | Partial | No |
| Breaking change detection | Yes | No | No |
| Lint rules | 7 built-in | No | No |
| Signal migration tracking | Yes | No | No |
| Structured JSON output | Yes | Yes (with HTML site) | Yes |
| Storybook integration | Drop-in + direct mode | Native | No |
| Props JSON for static sites | Yes | No | No |
| Dependencies | 0 (TypeScript peer) | 43 | 27 |
| Install size | ~50KB | ~15MB | ~8MB |

## What It Extracts

| Feature | Decorator API | Signal API | Output field |
|---------|--------------|------------|--------------|
| Inputs | `@Input()` | `input()`, `input.required()` | `inputs: InputDoc[]` |
| Outputs | `@Output()` | `output()` | `outputs: OutputDoc[]` |
| Two-way bindings | -- | `model()`, `model.required()` | `models: ModelDoc[]` |
| Properties | class fields | class fields | `properties: PropertyDoc[]` |
| Methods | class methods | class methods | `methods: MethodDoc[]` |
| Queries | `@ViewChild()` etc. | `viewChild()` etc. | `queries: QueryDoc[]` |
| Host bindings | `@HostBinding()` | -- | `hostBindings: HostBindingDoc[]` |
| Host listeners | `@HostListener()` | -- | `hostListeners: HostListenerDoc[]` |
| Pipes | `@Pipe()` | -- | `PipeDoc` |
| Injectables | `@Injectable()` | -- | `InjectableDoc` |
| Interfaces | exported interfaces | -- | `InterfaceDoc` |
| Type Aliases | exported type aliases | -- | `TypeAliasDoc` |
| Enums | exported enums | -- | `EnumDoc` |
| Classes | exported classes | -- | `ClassDoc` |
| Functions | exported functions | -- | `FunctionDoc` |
| Variables | exported variables | -- | `VariableDoc` |

Use `parseAll()` for the full result. The basic `parse()` returns only components, directives, and pipes.

Private members, `@internal`-tagged members, and lifecycle hooks are automatically excluded.

## Contributing

1. Fork and clone the repo
2. `npm install`
3. Create a feature branch
4. Make your changes, add tests
5. `npm test` to verify
6. Open a pull request

[Open an issue](https://github.com/user/ngx-component-meta/issues) for bugs or feature requests.

## License

MIT
