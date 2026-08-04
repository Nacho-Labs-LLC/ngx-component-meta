# OSS Positioning And Adoption Sweep

Date: 2026-07-29
Issue: NAC-249
Package: `@nacho-labs/ngx-component-meta`
Supersedes in part: `docs/research/2026-07-24-oss-positioning-adoption-sweep-refresh.md`

## Research question

As of July 29, 2026, what is the live OSS positioning seam for `ngx-component-meta`, what changed since the July 24 refresh, and which maintainer actions now have the clearest leverage?

## Executive recommendation

Keep positioning `ngx-component-meta` as Angular API metadata infrastructure, not as a general Angular documentation replacement.

The strongest 2026 thesis is still:

`ngx-component-meta` is the Angular API metadata layer for teams that need CI contract enforcement, Storybook-ready metadata adapters, and machine-readable outputs for custom docs and tooling.

That thesis remains credible on July 29 because:

- Angular v22 continues to push the ecosystem deeper into stable signal-era APIs.
- Storybook's current Angular docs still expose a Compodoc-first metadata seam.
- Compodoc 2.0.0 improved enough that broad anti-Compodoc claims now reduce credibility.
- Adjacent ecosystems still reward stable metadata producers more than monolithic docs generators.

## What changed since July 24

### 1. The seam is still live, and there is no near-term evidence that Storybook will close it for Angular

Storybook's current Angular docs still tell users to install `@compodoc/compodoc`, enable `compodoc: true`, and call `setCompodocJson(...)`. The Storybook 10 migration guide still frames the main platform shift around ESM and Node `20.19+` / `22.12+`, not a new Angular metadata strategy. Recent Storybook releases through `10.5.4` also do not show a first-party replacement for the Angular metadata path.

Inference from these sources:

- Storybook is still maintaining the Compodoc seam rather than replacing it.
- `toCompodocJson()` remains strategically relevant as an adoption bridge.
- `createArgTypesExtractor()` remains the more strategic long-term adapter surface.

### 2. Angular's platform direction strengthens the metadata-governance story

Angular's public surfaces as of July 29 still show the docs site built at `v22.0.8`. Angular v22 made Signal Forms, Angular Aria, and asynchronous reactivity APIs production ready. The Angular team is also explicitly investing in AI and MCP tooling for development workflows.

Implication:

- signal-awareness alone is no longer enough to differentiate
- structured output that can feed downstream tools, CI, and agentic workflows is becoming more valuable
- the package should lean harder into "metadata contract" language than "signal support" language

### 3. Compodoc is better positioned, but not better positioned for this exact job

Compodoc `2.0.0`, released on June 28, 2026, now explicitly markets modern Angular support including signal inputs, aliases, standalone metadata, richer docs, route graph generation, and other compiler/docs improvements.

That narrows the feature-gap argument. It does not erase the workflow-fit gap:

- Compodoc is still optimized around broad documentation generation
- Storybook still inherits Compodoc-specific friction in Angular setups
- `ngx-component-meta` still has the cleaner story for API diffing, linting, lean JSON, and downstream adapters

### 4. The repo still overstates the competitor gap in a few key docs

The current repo surface still contains claims that are now too absolute:

1. `README.md`
   The top-level Storybook framing is mostly credible, but "drop-in Compodoc replacement" is too strategically narrow if it remains the main message.

2. `docs/guides/storybook-setup.md`
   The guide still says Compodoc "does not understand signal-based APIs (`input()`, `output()`, `model()`)." That is stale after Compodoc 2.0.0 and Storybook 10.4.1.

3. `docs/signal-support.md`
   The July 24 memo already flagged this area. If it still uses "Compodoc has no support" style wording, that should be retired in favor of narrower coverage/quality comparisons.

Implication:

- the code surface is ahead of the messaging surface
- the next leverage is documentation accuracy, not a new feature sprint

## Current ecosystem read

### Angular

- Angular home currently shows the docs site built at `v22.0.8`.
- Angular v22 stabilized Signal Forms, Angular Aria, and asynchronous reactivity APIs.
- The signal input migration remains a first-party workflow supported by Angular tooling.
- Angular is also publicly investing in MCP and AI development workflows.

Implication for Nacho Labs OSS:

- Angular teams are moving toward richer framework-aware tooling, not away from it
- machine-readable Angular metadata is more valuable if it can feed CI, docs, and agentic tooling consistently

### Storybook

- Current Angular docs still document Compodoc manual setup and `setCompodocJson(...)`.
- Current Angular docs recommend `@storybook/angular-vite` for Angular `21+` teams wanting faster builds.
- Storybook 10 requires Node `20.19+` or `22.12+`, which matches this package's current `engines.node` floor of `>=20.19`.
- Storybook 10.4.1 added Angular `model()` signal output detection.
- Public Angular issues remain open around required inputs, host directive input mapping, and Windows termination when Compodoc is enabled.

Implication for Nacho Labs OSS:

- Storybook remains the best distribution channel
- the credible pitch is "better Angular metadata into Storybook with less Compodoc coupling"
- the package should not imply Storybook itself is behind; the seam is narrower and more specific than that

### Compodoc

- Current npm package version is `2.0.0`.
- The release and repo now explicitly position Compodoc around modern Angular support.

Implication for Nacho Labs OSS:

- do not compete by repeating outdated incompatibility claims
- compete on output quality, install/runtime footprint, CI workflows, and adapter composability

### Adjacent OSS standards and patterns

- `react-docgen` still positions itself as a structured machine-readable JSON producer, not a full docs site.
- `vue-docgen-api` still describes itself as turning components into documentation objects.
- Custom Elements Manifest still frames its format as something tooling and IDEs consume, and its analyzer still has a plugin model.

Implication for Nacho Labs OSS:

- the package is aligned with a durable OSS pattern
- the product opportunity is to become the trusted Angular metadata producer
- a future "Angular component manifest" or schema adapter could be valuable, but only after schema/versioning is explicit

## Recommendation by audience

### Recommendation to CEO

Position `ngx-component-meta` as Angular API governance infrastructure distributed through Storybook and CI use cases.

Rationale:

- this keeps the narrative differentiated even as Compodoc catches up on feature checklists
- it aligns with how design-system maintainers actually evaluate tooling risk
- it creates better optionality if Nacho Labs later layers policy or hosted workflows on top

### Recommendation to CTO

Treat the output schema and adapter boundaries as the next product surface.

Rationale:

- the ecosystem reward is in becoming the trusted producer
- that requires schema stability more than more feature inventory
- the repo already has the right architectural shape: one producer, multiple downstream adapters

Specific recommendation:

- publish a schema/versioning note before `1.0`
- preserve `toCompodocJson()` as a compatibility adapter
- keep direct Storybook extraction as the strategic path
- defer a plugin system until config and adapter hooks are clearer

### Recommendation to Chief of Staff

Prioritize messaging corrections and conversion assets over new extraction features.

Rationale:

- the repo already has enough surface to tell a strong story
- stale comparative copy is now the faster way to lose trust
- docs cleanup and one strong CI example are higher leverage than parity work

## Suggested maintainer actions

### Immediate

1. Refresh the first screen of `README.md` so it leads with Angular API metadata and CI governance, not "replacement" framing.
2. Update `docs/guides/storybook-setup.md` to say Compodoc is still the incumbent Storybook seam, while positioning `ngx-component-meta` as a leaner metadata path.
3. Clean up any remaining absolute signal-support comparisons in `docs/signal-support.md`.
4. Add a short comparison page: "When to use `ngx-component-meta` vs Compodoc."

### Next

1. Publish a schema/versioning note for JSON output.
2. Add a design-system CI example that shows baseline creation, PR diffing, and merge blocking.
3. Reframe Storybook docs so Compodoc compatibility is the bridge and direct extraction is the preferred end state.

### Later

1. Explore whether a documented schema adapter or manifest format should become a first-class public contract.
2. Revisit plugin/hooks architecture only after config and schema policy are stable.

## Implications for this repo

### What to keep

- `diff` as the lead differentiator
- Storybook integration as the main adoption path
- signal migration stats as a wedge, not the category
- lean structured JSON as a first-class output

### What to de-emphasize

- broad "Compodoc replacement" identity
- any claim that Compodoc simply does not support modern Angular
- parity-chasing route/docsite surfaces that move the package away from metadata infrastructure

### What to sharpen

- "component API contract" language
- "machine-readable Angular metadata" language
- "one metadata producer, multiple consumers" architecture story
- "works with CI, Storybook, and custom docs" as a coherent package thesis

## Final recommendation

This sweep does not support a strategy change. It supports a messaging correction and prioritization correction.

The live seam is still real:

- CI contract enforcement is the strongest wedge
- Storybook remains the best distribution channel
- Compodoc compatibility should be framed as a bridge
- schema stability is the next leverage point

## Final disposition for NAC-249

`done`

This heartbeat produced the updated research memo needed for OSS positioning and backlog prioritization. The next execution step belongs to product and backlog owners:

- CEO for portfolio-level positioning choice
- CTO for schema/versioning and adapter boundary decisions
- Chief of Staff for backlog conversion

## Sources

- Angular home, built at `v22.0.8`: https://angular.dev/
- Angular v22 release page: https://angular.dev/events/v22
- Angular v22 announcement: https://blog.angular.dev/announcing-angular-v22-c52bb83a4664
- Angular signal input migration post: https://blog.angular.dev/try-out-the-new-signal-input-migrations-80783969ac9d
- Storybook Angular framework docs: https://storybook.js.org/docs/get-started/frameworks/angular
- Storybook 10 migration guide: https://storybook.js.org/docs/releases/migration-guide
- Storybook changelog entry for Angular `model()` detection in 10.4.1: https://github.com/storybookjs/storybook/blob/next/CHANGELOG.md?plain=1
- Storybook releases page, including `10.5.4`: https://github.com/storybookjs/storybook/releases
- Storybook Angular + Compodoc Windows issue #33715: https://github.com/storybookjs/storybook/issues/33715
- Storybook Angular required inputs issue #28706: https://github.com/storybookjs/storybook/issues/28706
- Storybook Angular host directive inputs issue #30537: https://github.com/storybookjs/storybook/issues/30537
- `@compodoc/compodoc` npm package: https://www.npmjs.com/package/@compodoc/compodoc
- Compodoc releases: https://github.com/compodoc/compodoc/releases
- Compodoc repository: https://github.com/compodoc/compodoc
- react-docgen: https://react-docgen.dev/
- vue-docgen-api: https://vue-styleguidist.github.io/docs/Docgen.html
- Custom Elements Manifest analyzer: https://custom-elements-manifest.open-wc.org/analyzer/getting-started/
