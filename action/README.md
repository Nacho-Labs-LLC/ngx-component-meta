# ngx-component-meta/diff Action

A GitHub Action that detects breaking changes in Angular component APIs using [`@nacho-labs/ngx-component-meta`](https://github.com/Nacho-Labs-LLC/ngx-component-meta).

For external workflows, use an immutable semver tag like `Nacho-Labs-LLC/ngx-component-meta/action@v1.0.0` or the moving major tag `Nacho-Labs-LLC/ngx-component-meta/action@v1` once that major release exists on GitHub. If you are working inside this repository, you can also reference the action by local path.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `base` | Yes | | Path to baseline JSON file |
| `head` | No | | Path to head JSON file. If omitted, parses live source via `project` |
| `project` | No | | Path to tsconfig.json (used when `head` is omitted) |
| `format` | No | `markdown` | Output format: `text`, `json`, `markdown` |
| `fail-on-breaking` | No | `true` | Fail the action when breaking changes are found |
| `comment-on-pr` | No | `true` | Post/update a PR comment with the diff |

## Outputs

| Output | Description |
|--------|-------------|
| `breaking-count` | Number of breaking changes |
| `non-breaking-count` | Number of non-breaking changes |
| `has-breaking` | `'true'` or `'false'` |
| `diff-output` | The formatted diff output string |

## Usage

For teams that only need a simple CI gate, the CLI is still the leanest default:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm ci
- run: npx ngx-component-meta diff --base baseline.json -p tsconfig.json
```

### Remote GitHub Action ref

```yaml
- uses: Nacho-Labs-LLC/ngx-component-meta/action@v1
  with:
    base: baseline.json
    project: tsconfig.lib.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Use `@v1.0.0` when you want an immutable release pin instead of the moving major tag.

If you are working inside this repository or have vendored the `action/` directory into your own repository, you can reference it by local path.

### Basic: compare two pre-built JSON files

```yaml
- uses: ./action
  with:
    base: docs/baseline.json
    head: docs/head.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Live parsing: compare baseline against current source

```yaml
- uses: ./action
  with:
    base: docs/baseline.json
    project: tsconfig.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Full workflow example

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

      # Generate baseline docs from main branch
      - uses: actions/checkout@v4
        with:
          ref: main
          path: base-ref

      - run: |
          cd base-ref
          npm ci
          npm run build
          npx ngx-component-meta -p tsconfig.lib.json -f json -o ../baseline.json "src/**/*.ts"

      # Run the diff against current source
      - uses: Nacho-Labs-LLC/ngx-component-meta/action@v1
        id: diff
        with:
          base: baseline.json
          project: tsconfig.lib.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - run: echo "Breaking changes - ${{ steps.diff.outputs.breaking-count }}"
```

The release workflow keeps the moving major tag aligned with the latest semver tag for that major line, so `@v1` stays usable after each tagged release.
