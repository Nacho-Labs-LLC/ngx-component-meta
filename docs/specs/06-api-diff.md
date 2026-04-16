# Spec 06: API Diff Tool

## Problem

Design system and library maintainers need to know when component APIs change between versions — new inputs added, inputs removed, types changed, required flag changed, defaults changed. This is currently a manual review process. Having structured metadata makes automatic diffing possible.

## Solution

Add an `ngx-component-meta diff` CLI subcommand and a `diff()` programmatic function that compares two metadata snapshots and reports breaking/non-breaking changes.

## CLI usage

```bash
# Compare current branch to main
ngx-component-meta diff --base main --head HEAD

# Compare two JSON files
ngx-component-meta diff --base docs/api-v1.json --head docs/api-v2.json

# Compare with specific file patterns
ngx-component-meta diff --base main --head HEAD -- "src/**/*.component.ts"

# Output formats
ngx-component-meta diff --base main --format json    # machine-readable
ngx-component-meta diff --base main --format text    # human-readable (default)
ngx-component-meta diff --base main --format markdown # for PR comments
```

## Output format

### Text (default)

```
ngx-component-meta API diff: 3 breaking, 2 non-breaking changes

BREAKING:
  ButtonComponent
    ✗ input removed: variant (type: 'primary' | 'secondary' | 'danger')
    ✗ input type changed: disabled (boolean → string)

  CardComponent  
    ✗ input became required: title (was optional)

NON-BREAKING:
  ButtonComponent
    + input added: size (type: 'sm' | 'md' | 'lg', default: 'md')

  CardComponent
    + output added: closed (type: void)
```

### JSON

```json
{
  "breaking": [
    {
      "component": "ButtonComponent",
      "change": "input-removed",
      "name": "variant",
      "details": { "type": "'primary' | 'secondary' | 'danger'" }
    },
    {
      "component": "ButtonComponent", 
      "change": "input-type-changed",
      "name": "disabled",
      "details": { "before": "boolean", "after": "string" }
    },
    {
      "component": "CardComponent",
      "change": "input-became-required",
      "name": "title",
      "details": { "before": { "required": false }, "after": { "required": true } }
    }
  ],
  "nonBreaking": [
    {
      "component": "ButtonComponent",
      "change": "input-added",
      "name": "size",
      "details": { "type": "'sm' | 'md' | 'lg'", "required": false, "default": "'md'" }
    },
    {
      "component": "CardComponent",
      "change": "output-added",
      "name": "closed",
      "details": { "type": "void" }
    }
  ],
  "summary": { "breaking": 3, "nonBreaking": 2 }
}
```

### Markdown (for PR comments / CI output)

```markdown
## API Diff: 3 breaking, 2 non-breaking changes

### Breaking Changes

| Component | Change | Name | Details |
|-----------|--------|------|---------|
| `ButtonComponent` | Input removed | `variant` | type: `'primary' \| 'secondary' \| 'danger'` |
| `ButtonComponent` | Input type changed | `disabled` | `boolean` → `string` |
| `CardComponent` | Input became required | `title` | was optional |

### Non-Breaking Changes

| Component | Change | Name | Details |
|-----------|--------|------|---------|
| `ButtonComponent` | Input added | `size` | type: `'sm' \| 'md' \| 'lg'`, default: `'md'` |
| `CardComponent` | Output added | `closed` | type: `void` |
```

## Change classification

### Breaking changes
- Input removed
- Output removed
- Model removed
- Component/directive removed
- Input type changed (narrowing is non-breaking, widening/replacing is breaking)
- Input became required (was optional)
- Input default removed (was present)
- Output type changed
- Selector changed
- Method removed
- Method parameter added (required)
- Method parameter type changed
- Method return type changed

### Non-breaking changes
- Input added (optional)
- Input added (required) — debatable, flagged as "potentially breaking"
- Output added
- Model added
- Component/directive added
- Input became optional (was required)
- Input default added
- Input default changed
- Method added
- Method parameter added (optional)
- Property added/removed/changed
- Description/JSDoc changed

## Programmatic API

```typescript
// New export from 'ngx-component-meta'
export interface ApiDiff {
  breaking: ApiChange[];
  nonBreaking: ApiChange[];
  summary: { breaking: number; nonBreaking: number };
}

export interface ApiChange {
  component: string;
  change: string;
  name: string;
  details: Record<string, any>;
}

export function diff(
  base: (ComponentDoc | PipeDoc)[],
  head: (ComponentDoc | PipeDoc)[],
): ApiDiff;
```

## Implementation

### Files to create

- `src/diff.ts` — Core diff logic
- `src/cli/diff-command.ts` — CLI subcommand handling
- `src/cli/diff-formatters.ts` — text, json, markdown formatters for diff output

### How git-based diffing works

When `--base main` is specified:
1. Run `git stash` (if uncommitted changes) or use a temp worktree
2. `git show main:tsconfig.json` → parse base tsconfig
3. `git ls-tree -r main --name-only '*.component.ts'` → get base file list
4. For each file: `git show main:<file>` → write to temp dir
5. Parse temp dir files with base tsconfig
6. Parse current working tree files
7. Diff the two result sets

Alternative (simpler): require pre-generated JSON files and diff those.
**Recommendation:** Support both. `--base main` for git-based, `--base file.json` for pre-generated.

## Testing

- Test each change type with fixture components
- Test breaking vs non-breaking classification
- Test all output formats
- Test git-based diffing with a test repo

## CI integration example

```yaml
# .github/workflows/api-diff.yml
- name: Check for breaking API changes
  run: |
    npx ngx-component-meta diff --base origin/main --format json > api-diff.json
    BREAKING=$(jq '.summary.breaking' api-diff.json)
    if [ "$BREAKING" -gt "0" ]; then
      echo "::warning::$BREAKING breaking API changes detected"
      npx ngx-component-meta diff --base origin/main --format markdown >> $GITHUB_STEP_SUMMARY
    fi
```

## Dependencies on other specs

None.
