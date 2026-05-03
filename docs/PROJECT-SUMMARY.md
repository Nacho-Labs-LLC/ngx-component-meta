# ngx-component-meta — Project Summary & Next Steps

## What this is

A zero-dependency Angular component API toolkit that extracts structured metadata from TypeScript source files using the TS compiler API. No Angular compiler needed. No runtime dependencies. TypeScript (>=5.0) is the only peer dep.

**Package:** `ngx-component-meta` (0.1.0, MIT)
**Codebase:** 38 source files, ~6,100 lines of TypeScript, 259 tests, 16 docs

---

## What it does today

### Core extraction
Parses Angular source files and produces structured JSON for:
- Components and directives (selector, standalone, exportAs)
- All input forms: `@Input()`, `input()`, `input.required()`, aliases, transforms
- All output forms: `@Output()`, `output()`, aliases
- Models: `model()`, `model.required()`
- `@HostBinding` (properties and getters), `@HostListener`
- Signal queries: `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()`
- Pipes: name, pure, transform signature
- Injectables: providedIn, methods, properties
- Interfaces, type aliases, enums, plain classes, functions, exported variables
- JSDoc descriptions and tags on all of the above
- Single-class inheritance with member merging
- Type unwrapping: `InputSignal<T>` → `T`, `EventEmitter<T>` → `T`, `ModelSignal<T>` → `T`

### CLI (4 subcommands)
```
ngx-component-meta "src/**/*.ts"                              # extract
ngx-component-meta diff --base v1.json --head v2.json         # breaking change detection
ngx-component-meta lint "src/**/*.ts"                          # quality gates
ngx-component-meta stats "src/**/*.ts"                         # signal migration tracking
```

### Programmatic API
```typescript
import { parse, parseAll, createParser, createWatchParser } from 'ngx-component-meta';
import { diff } from 'ngx-component-meta';
import { lint } from 'ngx-component-meta';
import { computeStats } from 'ngx-component-meta';
import { toPropsJson } from 'ngx-component-meta';
```

### Storybook integration
- `toCompodocJson()` — drop-in Compodoc replacement, zero Storybook config changes
- `createArgTypesExtractor()` — direct bypass for richer categories (models get their own section)
- Vite plugin with HMR (`packages/vite/`)
- Storybook preset (`packages/storybook/`)

### GitHub Action
- `action/` directory with PR comment support, fail-on-breaking, upsert comments
- Needs `@vercel/ncc` bundle step before first use

---

## Benchmarks (Deposco design system — 54 source files)

| Metric | ngx-component-meta | Compodoc |
|--------|-------------------|----------|
| Parse time | 1.2s | 1.1s |
| Output type quality | Unwrapped (`Event`) | Wrapper (`EventEmitter`) |
| JSON output size | 165KB | 5.1MB |
| Install size | 812KB | 13MB |
| Runtime dependencies | 0 | 43 |
| Signal input support | Full | Buggy |
| `model()` support | Full | None |
| Breaking change detection | Built-in | None |
| Lint rules | 7 built-in | None |
| Migration tracking | Built-in | None |

Parse speed is comparable. The differentiator is output quality, footprint, and the features Compodoc doesn't have.

---

## Use cases

### 1. CI breaking change detection (strongest pitch, highest urgency)

**Who:** Angular component library maintainers (internal design systems, open source libraries like PrimeNG, Spartan, Clarity)

**Problem:** No automated way to catch when a PR removes an input, changes a type, or adds a required param. Teams find out when consumers break.

**Solution:** `ngx-component-meta diff` in CI. Exit code 1 on breaking changes. GitHub Action posts a PR comment showing exactly what changed.

**Pitch:** "Your component API is a contract. Start enforcing it."

**Adoption path:**
1. Generate a baseline JSON on main
2. Add the GitHub Action to the PR workflow
3. PRs with breaking changes get flagged before merge

**What makes this unique:** Neither Compodoc, typedoc, nor any Angular tool does this. Vue and React don't have it either. This is greenfield.

### 2. Storybook Compodoc replacement (easiest adoption, largest audience)

**Who:** Any Angular team using Storybook (which means using Compodoc today)

**Problem:** Compodoc has 10+ open signal-related bugs, no `model()` support, freezes on some projects, 43 deps, slow builds. Every Angular 17+ team hits these issues.

**Solution:** Replace `@compodoc/compodoc` with `ngx-component-meta`. Two options:
- `toCompodocJson()` — zero Storybook config changes, just swap the JSON source
- `createArgTypesExtractor()` — richer categories, models get their own section

**Pitch:** "Drop-in Compodoc replacement. Zero deps. Signals just work."

**Adoption path:**
1. `npm install -D ngx-component-meta`
2. Remove `@compodoc/compodoc`
3. Update `.storybook/preview.ts` (5 lines of code)

### 3. Signal migration tracking (timely, wedge to get installed)

**Who:** Every Angular team — they're all in the middle of migrating from decorators to signals right now

**Problem:** No way to measure progress. "How far along are we?" is answered by manual counting.

**Solution:** `ngx-component-meta stats` gives per-component signal adoption percentages in one command.

**Pitch:** "Track your Angular signal migration. One command."

**Adoption path:**
1. `npx ngx-component-meta stats "src/**/*.ts"` — zero install needed to try
2. Add to CI for ongoing tracking
3. Once installed, team discovers diff and lint

### 4. Component quality gates (enterprise teams)

**Who:** Teams with documentation standards, large orgs with design system governance

**Problem:** "Every input should have a description" is a rule that's manually enforced in code review or not enforced at all.

**Solution:** `ngx-component-meta lint` with 7 built-in rules, configurable severity, ESLint-style output, CI integration with exit code 1 on errors.

**Rules:**
- `require-input-description` (error)
- `require-output-description` (error)
- `require-component-description` (warn)
- `no-any-inputs` (warn)
- `no-any-outputs` (warn)
- `no-required-with-default` (warn)
- `require-selector` (error)

**Pitch:** "Enforce component documentation standards in CI, not in code review."

### 5. Design system prop tables (design system teams)

**Who:** Teams building custom documentation sites with Docusaurus, Astro, VitePress

**Problem:** Hand-rolling prop tables or scraping Compodoc HTML output.

**Solution:** `ngx-component-meta -f props-json` produces clean, framework-agnostic JSON. A 50-line `<PropsTable>` component renders it in any framework.

**Pitch:** "Structured data, your renderer."

### 6. Storybook core integration (long-term, highest impact)

**Who:** Storybook maintainers themselves

**Problem:** Storybook's Angular support depends on Compodoc, which is single-maintainer and falling behind Angular's API evolution. The Storybook team has expressed interest in alternatives.

**Solution:** Propose `ngx-component-meta` as Compodoc's replacement inside Storybook's Angular framework package. The `createArgTypesExtractor()` API was designed specifically for this integration point.

**Path:** Open a discussion on the Storybook GitHub. Show the benchmark. Demonstrate signal/model support. The `toCompodocJson()` compat layer means they can adopt incrementally.

---

## Next actions

### Before public release

- [ ] **Initialize git repo** — `git init`, initial commit, push to GitHub
- [ ] **Choose GitHub org/user** — update badge URLs in README (currently `user/ngx-component-meta`)
- [ ] **Add LICENSE file** — MIT, already declared in package.json
- [ ] **Add .gitignore** — dist/, node_modules/, *.tsbuildinfo
- [ ] **Bundle the GitHub Action** — `cd action && npm install && npx ncc build src/index.ts -o dist`, commit `action/dist/`
- [ ] **Add CI workflow** — `.github/workflows/ci.yml` running `npm test` and `npx tsc --noEmit`
- [ ] **npm publish dry run** — `npm pack --dry-run` to verify the `files` field is correct
- [ ] **Tag v0.1.0** and publish to npm

### After initial publish

- [ ] **Blog post** — "Your Angular component API is a contract" — show the diff catching a breaking change in a PR, compare to Compodoc, show the GitHub Action. Target Angular community blogs (angular.dev blog, dev.to angular tag, Angular Discord).
- [ ] **Storybook discussion** — Open a discussion on `storybookjs/storybook` repo showing the Compodoc compat + signal support. Link the blog post.
- [ ] **Angular community** — Post in Angular Discord #tools channel, r/angular, Angular Twitter/X community
- [ ] **npx demo** — Make sure `npx ngx-component-meta stats "src/**/*.ts"` works as a zero-install first-touch experience

### v0.2.0 roadmap

- [ ] **Config file support** — `.ngx-component-meta.json` for lint rules, default CLI options
- [ ] **Custom lint rules** — User-defined rules via config (regex patterns on types, naming conventions)
- [ ] **`--threshold` flag for stats** — `ngx-component-meta stats --min-adoption 80` fails CI if below threshold
- [ ] **Markdown output for lint** — PR-friendly lint results
- [ ] **Incremental parsing** — Watch mode for extract (already built) extended to lint and stats
- [ ] **Template analysis** — `ng-content` slots, projected content (v2 territory)

### v1.0.0 criteria

- [ ] Stable public API (no breaking changes to output types)
- [ ] Used by at least 2 external projects
- [ ] Storybook integration tested against Storybook 8.x stable
- [ ] GitHub Action tested in real CI pipelines
- [ ] All lint rules have been validated against real codebases

---

## Documentation inventory

| Document | Location | Purpose |
|----------|----------|---------|
| README | `README.md` | Project homepage, quick start, feature overview |
| API Reference | `docs/api-reference.md` | Every public function and type |
| CI Breaking Changes | `docs/guides/ci-breaking-changes.md` | GitHub Action setup, workflow examples |
| Storybook Setup | `docs/guides/storybook-setup.md` | Both integration modes, Vite plugin |
| Signal Migration | `docs/guides/signal-migration.md` | Stats CLI and programmatic usage |
| Quality Gates | `docs/guides/quality-gates.md` | Lint rules, CI integration |
| Static Site Docs | `docs/guides/static-site-docs.md` | Props JSON for Docusaurus/Astro/VitePress |
| Migration from Compodoc | `docs/migration-from-compodoc.md` | Step-by-step replacement guide |
| Signal Support | `docs/signal-support.md` | What signal APIs are supported |

---

## Architecture (for contributors)

```
Source files → ts.createProgram → Symbol discovery → Member extraction → Inheritance resolution → ComponentDoc[]
```

No Angular compiler. Just `ts.createProgram` + `ts.TypeChecker` with `experimentalDecorators: true`.

```
src/
  parser.ts              — Orchestrator: parse(), parseAll(), createParser()
  types.ts               — All public types
  extractors/            — One file per entity type (16 extractors)
  utils/                 — AST helpers, import tracking, type resolution, JSDoc
  diff.ts                — API comparison engine
  lint.ts                — Quality rule engine
  stats.ts               — Migration statistics
  props-json.ts          — Simplified JSON for static sites
  storybook/             — Compodoc mapper, arg types extractor
  cli/                   — CLI entry point, options parsing, formatters
packages/
  storybook/             — Storybook preset
  vite/                  — Vite plugin with HMR
action/                  — GitHub Action
tests/
  fixtures/              — Real Angular component files
  stubs/                 — Minimal @angular/core type stubs
  unit/                  — Diff, lint, stats, props-json, watch, markdown
  integration/           — CLI, Storybook compat
```
