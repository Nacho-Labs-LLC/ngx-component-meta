# ngx-component-meta/diff Action

A GitHub Action that detects breaking changes in Angular component APIs using [ngx-component-meta](https://github.com/nickcash/ngx-component-meta).

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

### Basic: compare two pre-built JSON files

```yaml
- uses: nickcash/ngx-component-meta/action@v1
  with:
    base: docs/baseline.json
    head: docs/head.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Live parsing: compare baseline against current source

```yaml
- uses: nickcash/ngx-component-meta/action@v1
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
          npx ngx-component-meta -p tsconfig.json 'src/**/*.ts' -o ../baseline.json

      # Run the diff against current source
      - uses: nickcash/ngx-component-meta/action@v1
        id: diff
        with:
          base: baseline.json
          project: tsconfig.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - run: echo "Breaking changes - ${{ steps.diff.outputs.breaking-count }}"
```
