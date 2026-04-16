# Spec 01: Storybook Builder Plugin

## Problem

Today, Angular Storybook projects configure Compodoc in `angular.json`:

```json
"storybook": {
  "options": {
    "compodoc": true,
    "compodocArgs": ["-p", "tsconfig.json", "-e", "json",
      "--disableInternal", "--disableLifeCycleHooks",
      "--disablePrivate", "--disableProtected",
      "--disableRoutesGraph"]
  }
}
```

Storybook's `@storybook/angular` builder detects `compodoc: true`, spawns Compodoc as a child process, waits for `documentation.json`, then loads it via `setCompodocJson()`. There's no way to swap in a different extractor at the builder level.

Users who want to use `ngx-component-meta` must currently:
1. Disable `compodoc: true` in angular.json
2. Manually wire up `toCompodocJson()` or `createArgTypesExtractor()` in preview.ts
3. Either call `parse()` at import time (slow cold start) or run the CLI as a prebuild script

We want a **drop-in replacement** that works at the builder level.

## Solution

Create a Storybook preset package: `ngx-component-meta-storybook`

This preset:
1. Provides a `previewAnnotations` hook that auto-wires `extractArgTypes`
2. Runs `ngx-component-meta` parsing once at Storybook startup
3. Watches for file changes in dev mode and re-parses incrementally (depends on Spec 03)

## Approach

### Package structure

```
packages/storybook/
  package.json
  src/
    preset.ts         — Storybook preset entry
    preview.ts        — Preview annotations (wires extractArgTypes)
    manager.ts        — (empty, required by Storybook convention)
    extract.ts        — Wrapper around ngx-component-meta parser
  tsconfig.json
```

### How Storybook presets work

A preset is an npm package that exports from `preset.js`:
- `previewAnnotations` — array of file paths injected into the preview iframe
- `viteFinal` / `webpackFinal` — config transforms (not needed for this)

The preset's `preview.ts` runs in the browser context and can set `parameters.docs.extractArgTypes`.

### Implementation plan

#### 1. `packages/storybook/src/extract.ts`

Server-side module that runs during Storybook's Node.js startup:

```typescript
import { parse } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';
import type { CompodocJson } from 'ngx-component-meta/storybook';

export interface ExtractOptions {
  tsconfig?: string;           // default: './tsconfig.json'
  include?: string[];          // default: ['src/**/*.component.ts', 'src/**/*.directive.ts', 'src/**/*.pipe.ts']
  disablePrivate?: boolean;    // default: true
  disableInternal?: boolean;   // default: true
  disableMethods?: boolean;    // default: false
}

export function extractDocumentation(options: ExtractOptions = {}): CompodocJson {
  const files = options.include ?? ['src/**/*.component.ts', 'src/**/*.directive.ts', 'src/**/*.pipe.ts'];
  
  const docs = parse(files, {
    shouldIncludeMethods: !options.disableMethods,
    // propFilter handles disablePrivate/disableInternal
    // (already the default behavior of ngx-component-meta)
  });

  return toCompodocJson(docs);
}
```

#### 2. `packages/storybook/src/preset.ts`

```typescript
import type { PresetProperty } from '@storybook/types';
import path from 'path';

export const previewAnnotations: PresetProperty<'previewAnnotations'> = (
  entries = [],
  options,
) => {
  return [...entries, path.join(__dirname, 'preview.js')];
};

// Optionally: hook into viteFinal to define a virtual module
// that exposes the extracted JSON to the browser
export const viteFinal: PresetProperty<'viteFinal'> = async (config, options) => {
  const { extractDocumentation } = await import('./extract.js');
  
  // Read user options from main.ts
  const userOptions = (options as any).ngxComponentMeta ?? {};
  const docJson = extractDocumentation(userOptions);
  
  // Inject as a virtual module so preview.ts can import it
  config.define = {
    ...config.define,
    '__NGX_COMPONENT_META_JSON__': JSON.stringify(JSON.stringify(docJson)),
  };
  
  return config;
};
```

#### 3. `packages/storybook/src/preview.ts`

```typescript
import { setCompodocJson } from '@storybook/angular';

// Injected at build time by the preset's viteFinal hook
declare const __NGX_COMPONENT_META_JSON__: string;

try {
  const docJson = JSON.parse(__NGX_COMPONENT_META_JSON__);
  setCompodocJson(docJson);
} catch {
  console.warn('[ngx-component-meta] Failed to load component metadata');
}
```

#### 4. User configuration in `.storybook/main.ts`

```typescript
export default {
  // ... other config
  addons: [
    'ngx-component-meta-storybook',
    // ... other addons
  ],
  // Optional configuration
  ngxComponentMeta: {
    tsconfig: './tsconfig.json',
    include: ['src/**/*.component.ts'],
  },
};
```

### package.json

```json
{
  "name": "ngx-component-meta-storybook",
  "version": "0.1.0",
  "description": "Storybook preset for ngx-component-meta — replaces Compodoc",
  "type": "module",
  "exports": {
    ".": "./dist/preset.js",
    "./preview": "./dist/preview.js",
    "./manager": "./dist/manager.js",
    "./preset": "./dist/preset.js"
  },
  "peerDependencies": {
    "ngx-component-meta": ">=0.1.0",
    "@storybook/angular": ">=8.0.0",
    "typescript": ">=5.0.0"
  }
}
```

## Migration for users

### Before (Compodoc)

```json
// angular.json
"storybook": {
  "options": {
    "compodoc": true,
    "compodocArgs": ["-p", "tsconfig.json", "-e", "json", "--disableInternal", "--disablePrivate"]
  }
}
```

### After (ngx-component-meta)

```json
// angular.json — remove compodoc
"storybook": {
  "options": {
    "compodoc": false
  }
}
```

```typescript
// .storybook/main.ts — add the preset
export default {
  addons: ['ngx-component-meta-storybook'],
};
```

## Testing

1. Create a minimal Angular + Storybook test project in `packages/storybook/tests/`
2. Write a story for a fixture component with both decorator and signal inputs
3. Assert that Storybook's Controls panel shows the correct inputs, outputs, types, and defaults
4. Assert that models appear as both input controls and output actions
5. Test with `compodoc: false` in angular.json to verify no Compodoc dependency

## Dependencies on other specs

- **Spec 03 (Watch Mode)**: For dev-mode hot reload of metadata when source files change. Without this, users must restart Storybook after changing component inputs/outputs. Non-blocking for v1 — Compodoc has the same limitation in most setups.

## Open questions

- Should the preset support Webpack in addition to Vite? Storybook 8+ defaults to Vite for Angular, but some projects still use Webpack. The `define` approach would need to be replaced with `DefinePlugin`.
- Should we also provide a **Storybook framework** (like `@storybook/angular` but with built-in extraction)? That's higher effort but would be the cleanest integration long-term.
