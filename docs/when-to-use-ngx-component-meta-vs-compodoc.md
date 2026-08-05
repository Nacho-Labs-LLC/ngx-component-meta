# When to use ngx-component-meta vs Compodoc

Use this for quick positioning decisions on what to recommend to users.

## Decision guide

- Choose **Compodoc** when your goal is a full docs-site workflow: route graphs, route-level navigation, markdown pages, and broad output formats in one tool.
- Choose **ngx-component-meta** when your goal is API governance tooling and metadata adapters:
  - CI-ready snapshots for breaking-change detection
  - signal-aware API metadata with stable type mapping
  - Storybook metadata that is independent of Compodoc internals
  - lightweight JSON outputs for custom doc surfaces and automation

## Practical migration framing

- If a team already has tooling that consumes `documentation.json`, start with the Compodoc-compatible bridge (`toCompodocJson()` + `setCompodocJson()`). This keeps downstream contracts intact while removing the Compodoc generation step.
- If a team is building new docs/tooling flows, prefer the direct arg-types path (`createArgTypesExtractor()`) to avoid a docs-compatibility layer.
- If a team only needs legacy docs JSON and no downstream adapters, this is usually best handled by keeping Compodoc and adding `ngx-component-meta` only where stricter metadata contracts are needed.

## Compodoc comparison (shortform)

- `ngx-component-meta` is not positioned as a full docs generator replacement; it is positioned as a metadata-first producer.
- Compodoc remains the incumbent for broad documentation surface generation.
- `ngx-component-meta` focuses on small output contracts, downstream adapters, and governance workflows (diff/lint/stats).
- The strongest signal is not "feature parity" but "friction and trust" in metadata pipelines.

## Small schema/versioning note

- Public outputs are used in three layers:
  1. **Native parse output** (`parse`/`parseAll`): flexible internal format for tooling and adapters.
  2. **Compat bridge output** (`toCompodocJson`): adapter surface for existing Compodoc consumers.
  3. **Static-props output** (`toPropsJson`): framework-agnostic consumer format with explicit `version` metadata.

- Stability expectation:
  - Treat `toPropsJson(..., { version })` as the explicit stability contract when you publish output snapshots.
  - For native/adapter formats, treat each package major as the compatibility boundary and pin on both package and expected output shape in integration tests.
  - Any consumer relying on full-shape compatibility of `toCompodocJson` should validate against real snapshots on each dependency bump.

## One-line recommendation

If you need reliable Angular API metadata in CI and tooling, lead with `ngx-component-meta`; if you need a full documentation website generator, Compodoc can remain in that lane while `ngx-component-meta` feeds structured metadata upstream.
