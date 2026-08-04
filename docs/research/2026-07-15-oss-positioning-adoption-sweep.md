# OSS Positioning And Adoption Sweep

Date: 2026-07-15
Issue: NAC-234
Package: `@nacho-labs/ngx-component-meta`

## Research question

How should `ngx-component-meta` position itself in the 2026 Angular tooling ecosystem so it aligns with real adoption seams instead of competing on the wrong axis?

## Executive recommendation

Position `ngx-component-meta` as an Angular component API metadata layer for CI, Storybook, and custom docs pipelines, not as a generic "documentation site generator killer."

The strongest wedge is still API governance:

- breaking-change detection in CI
- signal migration visibility
- machine-readable metadata for Storybook and custom docs

The right comparison is not "can we replace every Compodoc feature?" The better question is "where does the ecosystem still lack reliable Angular-aware metadata that other tools can consume?"

## Ecosystem snapshot

### Angular has standardized on signal-era component APIs

Angular's current docs are built at v22.0.6, and the official migration guide says signal inputs were considered production-ready as of Angular v19. Angular also ships a first-party migration for converting `@Input()` to `input()`.

Implication:

- signal-aware extraction is no longer a niche feature
- Angular-aware metadata quality is now table stakes
- the value is in correctness, downstream integrations, and governance workflows

### Storybook still exposes a live metadata seam in Angular

Storybook 10.5's Angular docs still document Compodoc setup for Angular and Angular-Vite. Storybook 10.4.1 added explicit Angular `model()` signal output detection, which shows the Storybook team is still patching Angular metadata behavior at the integration layer. There are also still open Angular/Compodoc issues, including a Windows process termination bug opened on 2026-01-30 when Compodoc is enabled.

Implication:

- Storybook remains a high-value adoption surface
- the pain is no longer just "signals unsupported"
- the deeper opportunity is a cleaner metadata path that reduces Compodoc coupling

### Compodoc is still the incumbent, but the gap narrowed

`@compodoc/compodoc` is at version `2.0.0`, and its current repo positioning includes standalone APIs, signal inputs and aliases, route graphs, coverage, JSON export, and Markdown output. The old broad claim that Compodoc simply does not support modern Angular is no longer defensible.

What still appears true:

- Compodoc is optimized for full documentation generation, not lean metadata workflows
- Storybook Angular still inherits Compodoc-related friction
- some Angular signal/default-value edge cases remain open

Implication:

- avoid stale anti-Compodoc messaging
- compete on scope, output quality, workflow fit, and composability

### Adjacent ecosystems have converged on machine-readable component metadata

Other ecosystems reinforce the same pattern:

- `react-docgen` positions itself as structured machine-readable JSON for downstream docs generation
- `vue-docgen-api` turns Vue components into documentation objects
- Custom Elements Manifest is explicitly a file format for tooling and IDEs to consume

Implication:

- Nacho Labs is aligned with a healthy OSS pattern
- the missing piece for Angular is not "docgen exists"
- it is "Angular-specific metadata is still fragmented and under-standardized"

## Competitive read

### Where `ngx-component-meta` is strongest

- Angular-aware extraction for signal-era APIs
- CI-friendly API diffing
- migration tracking as a timely adoption wedge
- structured outputs for Storybook and custom doc sites
- small footprint and focused scope

### Where the current messaging is weak

- "Compodoc is broken" is too coarse in 2026
- "drop-in replacement" is useful tactically, but too narrow strategically
- README copy leans toward feature inventory more than a crisp product thesis

### Where not to compete

- full static documentation site generation
- route graph visualization
- broad "all Angular project documentation" positioning
- parity-chasing every Compodoc surface

## Recommended positioning

Use this thesis:

`ngx-component-meta` is the Angular component API metadata layer for teams that need reliable signal-aware extraction, CI contract enforcement, and structured outputs for Storybook and custom docs.

Translate that into three audience-specific messages:

### 1. Design system maintainers

Primary value:

- detect breaking component API changes before release
- generate clean component metadata for docs and Storybook

Why this fits:

- these teams treat component APIs as contracts
- they already have CI and docs surfaces that need machine-readable inputs

### 2. Storybook Angular teams

Primary value:

- reduce dependence on Compodoc-specific behavior
- get better signal/model metadata into docs and controls workflows

Why this fits:

- Storybook remains the largest practical integration seam
- Angular-Vite is growing, which increases demand for lighter metadata flows

### 3. Angular teams migrating to signals

Primary value:

- measure migration progress
- use migration reporting as a low-friction trial path into the package

Why this fits:

- Angular itself is pushing migrations
- this is a timely wedge, even if not the long-term whole product

## Standards and product implications

### 1. Treat the output schema as a product surface

Adjacent ecosystems win when metadata formats become stable contracts. `ngx-component-meta` should move in that direction:

- version the schema explicitly
- document stability guarantees for core fields
- add adapter layers rather than changing raw output casually

Recommendation:

- define a public schema version policy before `1.0`

### 2. Prefer adapters over monolithic docs features

The ecosystem pattern is:

- one metadata producer
- multiple downstream consumers

Recommendation:

- keep investing in adapters such as Storybook and props-table outputs
- avoid turning the package into a full docs site generator

### 3. Consider a plugin/config story for output transforms

Custom Elements Manifest leans on a plugin-based analyzer model. `ngx-component-meta` does not need that complexity immediately, but the pattern is directionally useful for:

- custom output transforms
- org-specific lint rules
- framework integration adapters

Recommendation:

- prioritize config and custom lint rules before a full plugin API
- leave room for adapter hooks in the architecture

## Portfolio implications for Nacho Labs OSS

### Repo implications

- tighten public positioning around "component API metadata" and "CI contract enforcement"
- de-emphasize broad "Compodoc replacement" messaging except where it helps Storybook adoption
- audit docs for stale ecosystem claims before wider launch

### Roadmap implications

Prioritize:

1. stronger Storybook integration paths that minimize Compodoc dependency
2. schema/versioning clarity
3. config file support and custom rules
4. more examples aimed at design-system CI workflows

Deprioritize:

1. full documentation-site feature parity
2. route/documentation-portal features outside component API metadata
3. churny compatibility claims that require constant competitor bashing

## Suggested follow-up actions

### CEO

- evaluate `ngx-component-meta` as a wedge product for Angular design-system governance, not general Angular documentation
- use CI contract enforcement as the lead narrative in portfolio positioning

### CTO

- define output schema versioning before `1.0`
- review whether Storybook integration should become a first-class package boundary or adapter module

### Chief of Staff

- convert this memo into backlog items for README refresh, positioning cleanup, and Storybook-first examples
- remove or rewrite stale competitive claims before the next release push

## Recommended immediate backlog

1. Refresh README positioning with a sharper thesis and fewer stale Compodoc claims.
2. Add a dedicated "API contract enforcement in CI" guide and example baseline workflow.
3. Add a Storybook-focused migration guide that frames Compodoc compatibility as an adoption bridge, not the whole story.
4. Publish schema/versioning expectations for JSON output before expanding integrations.

## Sources

- Angular signal input migration: https://angular.dev/reference/migrations/signal-inputs
- Storybook Angular framework docs: https://storybook.js.org/docs/get-started/frameworks/angular
- Storybook Angular-Vite docs: https://storybook.js.org/docs/10.5/get-started/frameworks/angular-vite
- Storybook 10.4.1 / 10.5 release notes: https://github.com/storybookjs/storybook/releases
- Storybook Angular + Compodoc Windows issue #33715: https://github.com/storybookjs/storybook/issues/33715
- Storybook Angular signals issue #28412: https://github.com/storybookjs/storybook/issues/28412
- Storybook Angular required inputs issue #28706: https://github.com/storybookjs/storybook/issues/28706
- Compodoc repository: https://github.com/compodoc/compodoc
- Compodoc releases: https://github.com/compodoc/compodoc/releases
- `@compodoc/compodoc` package: https://www.npmjs.com/package/@compodoc/compodoc
- react-docgen: https://react-docgen.dev/
- vue-docgen-api: https://vue-styleguidist.github.io/docs/Docgen.html
- Custom Elements Manifest analyzer: https://custom-elements-manifest.open-wc.org/analyzer/getting-started/
