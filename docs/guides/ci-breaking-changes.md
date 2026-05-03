# Catching Breaking Changes in CI

Angular component libraries ship a public API surface: selectors, inputs, outputs, models, methods, and pipe transforms. When any of these change in an incompatible way, every consumer's template breaks at compile time. The `diff` command detects these changes automatically so you can catch them before they merge.

## How It Works

The diff engine compares two metadata snapshots (a baseline and a head) and classifies every change as either **breaking** or **non-breaking**. If any breaking changes are found, the CLI exits with code 1.

## Step 1: Generate a Baseline

On your main branch (or at release time), generate a JSON snapshot of your component API:

```bash
ngx-component-meta -f json -o baseline.json "src/**/*.ts"
```

Commit `baseline.json` to your repository. This is your contract with consumers.

If you have a library-specific tsconfig, point to it:

```bash
ngx-component-meta -p tsconfig.lib.json -f json -o baseline.json "src/**/*.ts"
```

## Step 2: Compare in a Pull Request

In CI, compare the committed baseline against the current source:

```bash
ngx-component-meta diff --base baseline.json -p tsconfig.lib.json
```

When `--head` is omitted, the tool parses the current project source to produce the head snapshot. The exit code tells you the result:

- **Exit 0** -- no breaking changes found.
- **Exit 1** -- breaking changes detected. The diff is printed to stdout.

For a human-readable report:

```bash
ngx-component-meta diff --base baseline.json -f text
```

For a structured report you can parse in scripts:

```bash
ngx-component-meta diff --base baseline.json -f json -o diff-report.json
```

## Step 3: Minimal CI Script

Add this to any CI system (GitHub Actions, GitLab CI, CircleCI, etc.):

```yaml
# .github/workflows/api-diff.yml
name: API Diff
on:
  pull_request:
    branches: [main]

jobs:
  api-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx ngx-component-meta diff --base baseline.json -p tsconfig.lib.json
```

This fails the job if any breaking changes are found. No action required -- just the CLI.

## Step 4: Using the GitHub Action

The `ngx-component-meta/diff` GitHub Action wraps the CLI and adds PR comments. It checks out your baseline, runs the diff, and posts a Markdown summary directly on the pull request.

```yaml
name: API Diff
on:
  pull_request:
    branches: [main]

jobs:
  api-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      # Generate baseline from the main branch
      - uses: actions/checkout@v4
        with:
          ref: main
          path: base-ref

      - run: |
          cd base-ref
          npm ci
          npx ngx-component-meta -p tsconfig.lib.json -f json -o ../baseline.json "src/**/*.ts"

      # Run the diff and post a PR comment
      - uses: nickcash/ngx-component-meta/action@v1
        id: diff
        with:
          base: baseline.json
          project: tsconfig.lib.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Use the outputs in subsequent steps
      - run: |
          echo "Breaking: ${{ steps.diff.outputs.breaking-count }}"
          echo "Non-breaking: ${{ steps.diff.outputs.non-breaking-count }}"
```

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `base` | Yes | | Path to baseline JSON file |
| `head` | No | | Path to head JSON file (omit to parse live source) |
| `project` | No | | Path to tsconfig.json (used when `head` is omitted) |
| `format` | No | `markdown` | Output format: `text`, `json`, `markdown` |
| `fail-on-breaking` | No | `true` | Fail the action when breaking changes are found |
| `comment-on-pr` | No | `true` | Post/update a PR comment with the diff |

### Action Outputs

| Output | Description |
|--------|-------------|
| `breaking-count` | Number of breaking changes |
| `non-breaking-count` | Number of non-breaking changes |
| `has-breaking` | `'true'` or `'false'` |
| `diff-output` | The formatted diff output string |

### What the PR Comment Looks Like

When `comment-on-pr` is enabled, the action posts (or updates) a comment on the pull request with a Markdown table. The comment starts with a heading like:

> **API Diff: 2 breaking, 3 non-breaking changes**

Below that, a **Breaking Changes** table lists each affected component, the change type, the member name, and details (e.g., `string -> number` for a type change). A separate **Non-Breaking Changes** table shows additions, description updates, and default value changes. If there are no breaking changes, the comment shows a green summary confirming the API is stable.

The comment is idempotent -- it updates in place on each push, so the PR never accumulates duplicate comments.

## What Counts as Breaking

These changes will fail CI when `fail-on-breaking` is true:

| Change | Example |
|--------|---------|
| `component-removed` | `ButtonComponent` deleted entirely |
| `selector-changed` | `app-button` changed to `ui-button` |
| `input-removed` | `@Input() variant` deleted |
| `input-type-changed` | `variant: string` changed to `variant: number` |
| `input-became-required` | Optional input is now `input.required<string>()` |
| `input-added-required` | New required input with no default |
| `input-default-removed` | Default value removed from an existing input |
| `output-removed` | `@Output() clicked` deleted |
| `output-type-changed` | `EventEmitter<void>` changed to `EventEmitter<MouseEvent>` |
| `model-removed` | `model()` binding deleted |
| `model-type-changed` | `model<string>()` changed to `model<number>()` |
| `model-became-required` | Optional model is now `model.required<string>()` |
| `model-default-removed` | Default value removed from a model |
| `method-removed` | Public method deleted |
| `method-return-type-changed` | Return type changed |
| `method-param-type-changed` | Parameter type changed |
| `method-param-added-required` | New required parameter added to existing method |
| `pipe-removed` | Pipe class deleted |
| `pipe-transform-changed` | Transform signature changed (params or return type) |

## What Counts as Non-Breaking

These are reported but do not fail CI:

| Change | Example |
|--------|---------|
| `component-added` | New component introduced |
| `input-added` | New optional input |
| `input-became-optional` | Required input is now optional |
| `input-default-added` | Default value added |
| `default-changed` | Default value changed |
| `description-changed` | JSDoc description updated |
| `output-added` | New output |
| `model-added` | New model binding |
| `model-became-optional` | Required model is now optional |
| `model-default-added` / `model-default-changed` | Model default changed |
| `method-added` | New public method |
| `method-param-added` (optional) | New optional parameter |
| `property-added` / `property-removed` / `property-changed` | Public property changes |
| `pipe-added` | New pipe introduced |

## Programmatic Usage

If you need custom logic (e.g., allowlisting certain changes or integrating with a different CI tool), use the API directly:

```typescript
import { parse, diff, formatDiffText, formatDiffMarkdown } from 'ngx-component-meta';
import { readFileSync } from 'fs';

const baseline = JSON.parse(readFileSync('baseline.json', 'utf-8'));
const current = parse('tsconfig.lib.json', ['src/**/*.ts']);

const result = diff(baseline, current);

if (result.summary.breaking > 0) {
  console.error(formatDiffText(result));
  process.exit(1);
}

console.log(formatDiffMarkdown(result));
```

## Keeping the Baseline Updated

After a release (or when you intentionally make a breaking change), regenerate the baseline:

```bash
ngx-component-meta -f json -o baseline.json -p tsconfig.lib.json "src/**/*.ts"
git add baseline.json
git commit -m "update API baseline for v2.0.0"
```

Some teams regenerate the baseline automatically on merge to main, storing it as a CI artifact rather than committing it. Either approach works -- the key is that the baseline represents the last published API contract.
