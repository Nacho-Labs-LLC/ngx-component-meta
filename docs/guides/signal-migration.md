# Tracking Signal Migration

Angular is moving from decorator-based APIs (`@Input()`, `@Output()`) to signal-based APIs (`input()`, `output()`, `model()`). This is not a flag-day migration -- teams adopt signals incrementally, component by component. The `stats` command gives you a clear picture of where you are.

## Why Track This

Without measurement, signal migration stalls. A team of ten engineers working across 200 components needs to know:

- What percentage of bindings use signals today?
- Which components are fully migrated, partially migrated, or untouched?
- Is the trend going up or down week over week?

The `stats` command answers all three.

## CLI Usage

```bash
ngx-component-meta stats "src/**/*.ts"
```

Or with a specific tsconfig:

```bash
ngx-component-meta stats -p tsconfig.lib.json "src/**/*.ts"
```

### Example Output (text format)

```
Signal Migration: 62.5% (25/40 bindings)

Inputs:   58.3% signal (14/24)
Outputs:  66.7% signal (6/9)
Models:   5

Components: 18 total
  Fully migrated:     8
  Partially migrated: 4
  Legacy:             3
  No bindings:        3

Legacy components (migrate these next):
  - DataTableComponent (src/lib/data-table/data-table.component.ts) — 5 decorator inputs, 2 decorator outputs
  - FileUploadComponent (src/lib/file-upload/file-upload.component.ts) — 3 decorator inputs, 1 decorator output
  - TreeViewComponent (src/lib/tree-view/tree-view.component.ts) — 4 decorator inputs

Partially migrated components:
  - DialogComponent (src/lib/dialog/dialog.component.ts) — 2 decorator inputs
  - TabsComponent (src/lib/tabs/tabs.component.ts) — 1 decorator input, 1 decorator output
  - FormFieldComponent (src/lib/form-field/form-field.component.ts) — 1 decorator output
  - ChipListComponent (src/lib/chip-list/chip-list.component.ts) — 2 decorator inputs
```

### JSON Format

```bash
ngx-component-meta stats -f json "src/**/*.ts"
```

Returns a structured `MigrationStats` object:

```json
{
  "signalAdoption": 62.5,
  "inputs": {
    "total": 24,
    "decorator": 10,
    "signal": 14,
    "percentage": 58.3
  },
  "outputs": {
    "total": 9,
    "decorator": 3,
    "signal": 6,
    "percentage": 66.7
  },
  "models": {
    "total": 5
  },
  "components": [
    {
      "name": "DataTableComponent",
      "filePath": "src/lib/data-table/data-table.component.ts",
      "status": "legacy",
      "inputs": { "decorator": 5, "signal": 0 },
      "outputs": { "decorator": 2, "signal": 0 },
      "models": 0
    },
    {
      "name": "DialogComponent",
      "filePath": "src/lib/dialog/dialog.component.ts",
      "status": "partially-migrated",
      "inputs": { "decorator": 2, "signal": 3 },
      "outputs": { "decorator": 0, "signal": 1 },
      "models": 1
    }
  ],
  "componentSummary": {
    "fullyMigrated": 8,
    "partiallyMigrated": 4,
    "legacy": 3,
    "noBindings": 3,
    "total": 18
  }
}
```

### Markdown Format

```bash
ngx-component-meta stats -f markdown -o migration-report.md "src/**/*.ts"
```

Produces a Markdown report with tables -- useful for posting in PRs or team dashboards.

## Programmatic Usage

```typescript
import { createParser, computeStats, formatStatsText } from 'ngx-component-meta';

const parser = createParser('./tsconfig.lib.json');
const result = parser.parseAll(['src/**/*.ts']);
const stats = computeStats(result);

console.log(formatStatsText(stats));
console.log(`Signal adoption: ${stats.signalAdoption}%`);
```

## Understanding Component Statuses

Each component is classified into one of four statuses:

| Status | Meaning |
|--------|---------|
| `fully-migrated` | All inputs and outputs use signals. Zero decorator bindings. |
| `partially-migrated` | Mix of decorator and signal bindings. Migration in progress. |
| `legacy` | All inputs and outputs use decorators. No signals adopted yet. |
| `no-bindings` | Component has no inputs, outputs, or models (e.g., a layout wrapper). |

Models (`model()`) are always signal-based, so they always count toward signal adoption.

Components are sorted with `legacy` first, then `partially-migrated`, then `fully-migrated`, then `no-bindings`. This puts the most actionable items at the top.

## CI Integration: Fail if Adoption Drops

You can enforce that signal adoption never regresses. This is useful during a migration sprint to prevent new decorator-based inputs from being added:

```bash
#!/bin/bash
# scripts/check-signal-adoption.sh

STATS=$(npx ngx-component-meta stats -f json "src/**/*.ts")
ADOPTION=$(echo "$STATS" | node -e "
  const stats = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
  console.log(stats.signalAdoption);
")

THRESHOLD=60

if (( $(echo "$ADOPTION < $THRESHOLD" | bc -l) )); then
  echo "Signal adoption is ${ADOPTION}%, below threshold of ${THRESHOLD}%"
  exit 1
fi

echo "Signal adoption: ${ADOPTION}% (threshold: ${THRESHOLD}%)"
```

### GitHub Actions Workflow

```yaml
name: Signal Migration Check
on:
  pull_request:
    branches: [main]

jobs:
  signal-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: Check signal adoption
        run: |
          npx ngx-component-meta stats -f json -o stats.json "src/**/*.ts"
          ADOPTION=$(node -e "const s = require('./stats.json'); console.log(s.signalAdoption)")
          echo "Signal adoption: ${ADOPTION}%"
          if (( $(echo "$ADOPTION < 60" | bc -l) )); then
            echo "::error::Signal adoption dropped below 60%"
            exit 1
          fi

      - name: Post stats to PR
        if: always()
        run: |
          npx ngx-component-meta stats -f markdown -o stats.md "src/**/*.ts"
          # Use gh CLI or a comment action to post stats.md to the PR
```

## Per-Component Breakdown

To find exactly which components need work, filter the JSON output:

```typescript
import { createParser, computeStats } from 'ngx-component-meta';

const parser = createParser('./tsconfig.lib.json');
const result = parser.parseAll(['src/**/*.ts']);
const stats = computeStats(result);

// Components that need migration, sorted by most decorator bindings
const needsWork = stats.components
  .filter(c => c.status === 'legacy' || c.status === 'partially-migrated')
  .sort((a, b) => {
    const aTotal = a.inputs.decorator + a.outputs.decorator;
    const bTotal = b.inputs.decorator + b.outputs.decorator;
    return bTotal - aTotal;
  });

for (const comp of needsWork) {
  const decoratorCount = comp.inputs.decorator + comp.outputs.decorator;
  console.log(`${comp.name} — ${decoratorCount} decorator bindings (${comp.filePath})`);
}
```

Example output:

```
DataTableComponent — 7 decorator bindings (src/lib/data-table/data-table.component.ts)
FileUploadComponent — 4 decorator bindings (src/lib/file-upload/file-upload.component.ts)
TreeViewComponent — 4 decorator bindings (src/lib/tree-view/tree-view.component.ts)
DialogComponent — 2 decorator bindings (src/lib/dialog/dialog.component.ts)
TabsComponent — 2 decorator bindings (src/lib/tabs/tabs.component.ts)
ChipListComponent — 2 decorator bindings (src/lib/chip-list/chip-list.component.ts)
FormFieldComponent — 1 decorator bindings (src/lib/form-field/form-field.component.ts)
```

## Tracking Trends Over Time

Save the JSON output from each CI run as an artifact. Then build a simple dashboard:

```bash
# In CI, after running stats
npx ngx-component-meta stats -f json -o "stats-$(date +%Y-%m-%d).json" "src/**/*.ts"
```

Or append to a JSONL file:

```bash
npx ngx-component-meta stats -f json "src/**/*.ts" | \
  node -e "
    const stats = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    const entry = {
      date: new Date().toISOString().split('T')[0],
      adoption: stats.signalAdoption,
      legacy: stats.componentSummary.legacy,
      partial: stats.componentSummary.partiallyMigrated,
      migrated: stats.componentSummary.fullyMigrated,
    };
    console.log(JSON.stringify(entry));
  " >> migration-history.jsonl
```

This gives you a line-per-day record you can chart in any tool.
