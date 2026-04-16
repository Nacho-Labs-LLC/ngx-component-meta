# Spec 03: Watch Mode

## Problem

In dev workflows (Storybook dev server, custom doc sites), component metadata changes when source files change. Currently users must restart the process to pick up new inputs/outputs. Compodoc supports `--watch` via file system watchers, though it's buggy (Storybook issue #24130: Compodoc JSON not regenerated on component changes).

## Solution

Add `--watch` flag to the CLI and a `createWatchParser()` function to the programmatic API.

## Approach

### CLI: `--watch` flag

```bash
ngx-component-meta --watch -p tsconfig.json -f compodoc -o documentation.json "src/**/*.ts"
```

Behavior:
1. Initial parse → write output
2. Watch all matched `.ts` files using `fs.watch` (or `chokidar` if we want cross-platform reliability)
3. On change: re-parse only the changed file(s) using an incremental `ts.Program`
4. Re-write output
5. Log: `[ngx-component-meta] Rebuilt — 42 components (changed: button.component.ts)`

### Programmatic API

```typescript
// New export from 'ngx-component-meta'
export function createWatchParser(
  tsconfigPath: string,
  options?: ParserOptions & {
    onUpdate?: (docs: (ComponentDoc | PipeDoc)[]) => void;
    include?: string[];
  },
): WatchParser;

export interface WatchParser extends Parser {
  /** Start watching for file changes. */
  start(): void;
  /** Stop watching. */
  stop(): void;
  /** Get the latest parsed docs (cached). */
  getLatest(): (ComponentDoc | PipeDoc)[];
}
```

### Implementation details

#### Incremental program updates

The TypeScript compiler API supports incremental program creation:

```typescript
// Create a new program that reuses structure from the old one
const newProgram = ts.createProgram({
  rootNames: allFiles,
  options: compilerOptions,
  oldProgram: previousProgram,  // reuses unchanged source files
});
```

This is significantly faster than creating a fresh program — only changed files are re-parsed.

#### File watching strategy

Option A: Node.js `fs.watch` (zero deps)
- Works on macOS (FSEvents), Linux (inotify), Windows (ReadDirectoryChangesW)
- Known quirks: may fire multiple events per save, doesn't support recursive on all platforms
- Requires debouncing (100ms) to coalesce rapid saves

Option B: `chokidar` (battle-tested, but adds a dependency)
- Used by Vite, Webpack, Storybook itself
- Handles cross-platform edge cases
- ~50KB dep

**Recommendation:** Use `fs.watch` with recursive option (Node 18+) and debouncing. Keep zero runtime deps. If users report platform issues, we can add chokidar as an optional peer dep.

#### Debouncing

File saves often trigger multiple fs events. Debounce with a 150ms window:

```typescript
let debounceTimer: NodeJS.Timeout | undefined;
const DEBOUNCE_MS = 150;

watcher.on('change', (filename) => {
  changedFiles.add(filename);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    rebuild(changedFiles);
    changedFiles.clear();
  }, DEBOUNCE_MS);
});
```

### Files to modify

- `src/parser.ts` — Add `createWatchParser()` export
- `src/index.ts` — Re-export `createWatchParser` and `WatchParser` type
- `src/cli/options.ts` — Add `--watch` flag
- `src/cli/index.ts` — Implement watch loop when `--watch` is set

### Testing

- Unit test: verify that `createWatchParser` detects file changes and re-emits docs
- Use `fs.writeFileSync` to modify a fixture file, assert `onUpdate` fires with new metadata
- Test debouncing: rapid writes should result in a single rebuild
- CLI test: start `--watch`, write a file, verify output file is updated

### Edge cases

- New file added (not in original glob) — re-scan glob on each rebuild? Or only watch initially matched files?
  - Recommendation: re-scan glob on rebuild. Simple and correct.
- File deleted — remove from docs, don't error
- Syntax error in changed file — log warning, keep previous docs for that file
- tsconfig.json changed — full rebuild (new compiler options)

## Dependencies on other specs

None — this is standalone.

## Open questions

- Should the watcher emit events for individual changed components, or just the full doc array? Full array is simpler and matches the CLI's "rewrite the file" model.
- Should we support `SIGINT` / graceful shutdown? Yes — clean up watchers on process exit.
