# OSS Positioning And Adoption Sweep Refresh

Date: 2026-07-24
Issue: NAC-242
Package: `@nacho-labs/ngx-component-meta`
Supersedes in part: `docs/research/2026-07-15-oss-positioning-adoption-sweep.md`

## Research question

Given the Angular and Storybook ecosystem as of July 24, 2026, where is the live adoption seam for `ngx-component-meta`, and which current repo claims are now too stale or too broad to support credible OSS positioning?

## Bottom line

`ngx-component-meta` still has a real wedge, but the wedge is narrower and stronger than "Compodoc replacement."

The credible 2026 thesis is:

`ngx-component-meta` is the Angular API metadata layer for teams that need signal-aware extraction, CI contract enforcement, and machine-readable outputs for Storybook and custom docs surfaces.

That thesis still fits the market because:

- Angular has doubled down on signal-era APIs through Angular v22.
- Storybook 10 still routes Angular documentation through Compodoc-oriented seams.
- Compodoc improved materially in 2026, so broad "Compodoc is broken" messaging is now inaccurate.
- Adjacent ecosystems still converge on "metadata producer plus downstream adapters" rather than monolithic doc generators.

## What changed since the prior memo

### 1. Angular moved further into the signal era

Angular's official migration pages still state that signal inputs, outputs, and signal queries are production ready, and the Angular docs site is now built at v22.0.8 as of July 24, 2026.

Implication:

- signal support is not differentiating by itself anymore
- correctness and completeness across signal-era APIs is now table stakes
- the product value has to move up one layer into governance, adapters, and stable machine-readable output

### 2. Storybook 10 kept the Compodoc seam alive

Storybook's current Angular docs still recommend Compodoc integration for Angular and still document `setCompodocJson(...)` flows. Storybook's Angular docs also explicitly recommend Angular-Vite for Angular 21+ teams that want faster builds, while the Storybook 10 migration guide now requires Node `20.19+` or `22.12+`.

Implication:

- Storybook remains the best adoption surface
- the seam is not "replace Storybook"
- the seam is "feed Storybook better Angular metadata with less Compodoc friction"
- the package's current Node engine of `>=20.19` is aligned with Storybook 10's floor, which is strategically useful

### 3. Storybook fixed some signal support, but not the whole metadata path

Storybook 10.4.1 added Angular `model()` signal output detection. At the same time, current public issues still show Angular metadata friction around Compodoc-backed flows, including:

- Windows termination problems when Compodoc is enabled in Angular Storybook workflows, opened January 30, 2026 and still open on July 24, 2026
- required Angular inputs not being reflected correctly in Storybook, issue still open on July 24, 2026
- host directive input mapping gaps still open

Implication:

- "Storybook is unusable with signals" is too strong and now stale
- "Storybook Angular still has metadata edge cases and Compodoc coupling" remains defensible
- the best positioning is reliability and workflow fit, not competitor trashing

### 4. Compodoc narrowed the feature gap

Compodoc released `2.0.0` on June 28, 2026 with explicit positioning around modern Angular support, including signal inputs, signal aliases, standalone metadata, and route graph improvements.

Implication:

- claims like "no `model()` support" or "Compodoc simply does not support modern Angular" should not be used without qualification
- the repo should stop leading with stale incompatibility claims
- the comparison surface should shift to output quality, install footprint, CI diffing, linting, and metadata composability

## Current adoption seam

### Primary seam: CI contract enforcement for Angular component APIs

This remains the strongest wedge because it solves a problem that neither Storybook nor Compodoc is positioned to solve directly:

- detect breaking API changes in pull requests
- treat Angular component APIs as governed contracts
- produce diffs that can block merges or annotate review

Why this still matters now:

- Angular teams continue modernizing APIs during signal migrations
- API drift risk increases during that kind of migration
- OSS libraries and internal design systems both need contract discipline

Recommendation:

- make CI diffing the lead message
- treat Storybook compatibility as a secondary adoption bridge

### Secondary seam: Storybook metadata adapter for Angular teams

The package still has a good Storybook story, but the message should be:

- "use this to generate cleaner Angular metadata for Storybook"
- not "Compodoc is unusable"

This is especially true because Storybook still exposes the Compodoc JSON adapter seam directly in its docs. That keeps `toCompodocJson()` strategically relevant even if it is not the long-term end state.

Recommendation:

- keep `toCompodocJson()` as a compatibility bridge
- position `createArgTypesExtractor()` and similar direct integrations as the more strategic path

### Tertiary seam: signal migration visibility

This remains a good wedge for discovery, but it should not become the package identity.

Recommendation:

- keep stats as an easy first-touch command
- avoid making "signal migration tracker" the top-level product category

## Repo implications

### Claims that should be softened or retired

These are no longer strong enough to lead with as of July 24, 2026:

1. `README.md` (the "Why ngx-component-meta?" section)
   Current claim: Compodoc has multiple open signal bugs and no `model()` support.
   Why it should change: Compodoc 2.0.0 materially improved modern Angular support, and Storybook 10.4.1 added Angular `model()` signal detection on its side.

2. `docs/signal-support.md` (the "How This Differs from Compodoc" section)
   Current claim: Compodoc has known issues with signal APIs including no `model()` support.
   Why it should change: the package can still claim stronger coverage and cleaner metadata, but "no support" is now too absolute.

3. `README.md` (the Storybook integration section)
   Current framing: "Drop-in Compodoc replacement."
   Why it should change: keep it as a migration bridge, but not as the core strategic thesis.

### Claims that should be strengthened

1. CI contract enforcement
   This is still the most differentiated and defensible category.

2. Stable machine-readable metadata
   The package should present its JSON output as a product surface, not just a byproduct.

3. Adapter-based architecture
   Storybook, props tables, GitHub Action, and future custom consumers fit one coherent story: one Angular-aware metadata producer, many downstream consumers.

4. Output quality over feature parity
   Lead with unwrapped types, Angular-aware semantics, lean output, and workflow fit.

## Standards and adjacent ecosystem read

The adjacent pattern remains stable across ecosystems:

- `react-docgen` is still positioned around extracting machine-readable documentation data
- `vue-docgen-api` still describes itself as turning Vue components into documentation objects
- Custom Elements Manifest still frames its analyzer as a tooling and IDE-oriented metadata format

Implication:

- Nacho Labs is aligned with a proven OSS pattern
- the opportunity is not to build another docs site generator
- the opportunity is to become the reliable Angular metadata producer other tools can consume

## Maintainer recommendation

### Recommendation to CEO

Position `ngx-component-meta` as Angular API governance infrastructure, with Storybook integration as the distribution channel.

Rationale:

- stronger differentiation
- less exposed to competitor catch-up on feature checklists
- better OSS-to-commercial leverage if Nacho Labs later builds policy, dashboards, baselines, or hosted review workflows around the metadata

### Recommendation to CTO

Treat the output schema and adapter boundaries as first-class architecture surfaces before `1.0`.

Rationale:

- the ecosystem reward is in becoming the trusted producer
- that requires schema stability, versioning discipline, and adapter isolation

### Recommendation to Chief of Staff

Prioritize backlog items that improve positioning accuracy and adoption conversion, not parity churn.

Rationale:

- stale competitive copy will reduce trust with advanced users
- focused docs and examples are more leveraged than broad new feature claims

## Suggested follow-up actions

1. Refresh the README thesis so the first screen leads with API metadata and CI governance, not anti-Compodoc messaging.
2. Update `docs/signal-support.md` to compare on coverage quality and edge cases instead of absolute "Compodoc has no support" language.
3. Add one Storybook guide that explicitly frames Compodoc compatibility as a bridge and direct metadata extraction as the preferred long-term path.
4. Publish a schema/versioning note before broadening integrations further.
5. Add a design-system CI example that shows baseline generation, PR diffing, and merge blocking.
6. Consider a short comparison page titled "When to use ngx-component-meta vs Compodoc" with a narrow, credible decision framework.

## Suggested backlog ordering

1. README positioning refresh
2. CI contract enforcement example
3. schema/versioning policy
4. Storybook bridge-vs-direct integration guidance
5. signal-support doc cleanup

## Final disposition for this sweep

This research sweep is complete enough to unblock product positioning and backlog prioritization. The next owner should be the CEO for positioning decisions and the Chief of Staff for backlog conversion, with the CTO looped in on schema and adapter boundaries.

## Sources

- Angular migration to signal inputs: https://angular.dev/reference/migrations/signal-inputs
- Angular migrations overview: https://angular.dev/reference/migrations
- Angular version compatibility, built at v22.0.8 on July 24, 2026: https://angular.dev/reference/versions
- Angular v22 announcement: https://blog.angular.dev/announcing-angular-v22-c52bb83a4664
- Storybook Angular framework docs: https://storybook.js.org/docs/get-started/frameworks/angular
- Storybook 10 migration guide: https://storybook.js.org/docs/releases/migration-guide
- Storybook changelog entry for Angular `model()` detection in 10.4.1: https://github.com/storybookjs/storybook/blob/next/CHANGELOG.md?plain=1
- Storybook Windows + Compodoc issue #33715: https://github.com/storybookjs/storybook/issues/33715
- Storybook required inputs issue #28706: https://github.com/storybookjs/storybook/issues/28706
- Storybook host directive inputs issue #30537: https://github.com/storybookjs/storybook/issues/30537
- Compodoc releases: https://github.com/compodoc/compodoc/releases
- Compodoc repository: https://github.com/compodoc/compodoc
- `vue-docgen-api` docs: https://vue-styleguidist.github.io/docs/Docgen.html
- Angular v22 release page: https://angular.dev/events/v22
