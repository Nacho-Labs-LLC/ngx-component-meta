# Spec 05: Vite/esbuild Plugin

## Problem

Some projects want metadata extraction integrated into their build pipeline rather than as a separate CLI step. This is common in:
- Custom documentation sites built with Vite (VitePress, Astro, etc.)
- Component catalogs that import metadata at build time
- Dev servers that need live metadata updates

## Solution

Create a Vite plugin package: `ngx-component-meta-vite`

The plugin:
1. Provides a virtual module `virtual:ngx-component-meta` that exports parsed metadata
2. Watches source files in dev mode and triggers HMR when metadata changes
3. Runs extraction once during production build

## API

### Plugin configuration

```typescript
// vite.config.ts
import { ngxComponentMeta } from 'ngx-component-meta-vite';

export default defineConfig({
  plugins: [
    ngxComponentMeta({
      tsconfig: './tsconfig.json',          // default: auto-detect
      include: ['src/**/*.component.ts'],   // default: auto from tsconfig
      format: 'native',                     // 'native' | 'compodoc'
    }),
  ],
});
```

### Virtual module usage

```typescript
// In your app code
import { components, pipes } from 'virtual:ngx-component-meta';
// components: ComponentDoc[]
// pipes: PipeDoc[]

// Or Compodoc format
import compodocJson from 'virtual:ngx-component-meta/compodoc';
```

### Type declarations

```typescript
// ngx-component-meta-vite/client.d.ts
declare module 'virtual:ngx-component-meta' {
  import type { ComponentDoc, PipeDoc } from 'ngx-component-meta';
  export const components: ComponentDoc[];
  export const pipes: PipeDoc[];
}

declare module 'virtual:ngx-component-meta/compodoc' {
  import type { CompodocJson } from 'ngx-component-meta/storybook';
  const json: CompodocJson;
  export default json;
}
```

## Implementation

### Package structure

```
packages/vite/
  package.json
  src/
    index.ts          — Plugin factory function
    virtual-module.ts — Resolves virtual module imports
  client.d.ts         — Type declarations for virtual modules
  tsconfig.json
```

### Plugin implementation

```typescript
import type { Plugin } from 'vite';
import { createParser, type ComponentDoc, type PipeDoc } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';

const VIRTUAL_ID = 'virtual:ngx-component-meta';
const VIRTUAL_COMPODOC_ID = 'virtual:ngx-component-meta/compodoc';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;
const RESOLVED_COMPODOC_ID = '\0' + VIRTUAL_COMPODOC_ID;

interface NgxComponentMetaOptions {
  tsconfig?: string;
  include?: string[];
  format?: 'native' | 'compodoc';
}

export function ngxComponentMeta(options: NgxComponentMetaOptions = {}): Plugin {
  let docs: (ComponentDoc | PipeDoc)[] = [];
  
  return {
    name: 'ngx-component-meta',
    
    buildStart() {
      const tsconfigPath = options.tsconfig ?? './tsconfig.json';
      const parser = createParser(tsconfigPath);
      const files = options.include ?? ['src/**/*.component.ts'];
      docs = parser.parse(files);
    },
    
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      if (id === VIRTUAL_COMPODOC_ID) return RESOLVED_COMPODOC_ID;
    },
    
    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        const components = docs.filter(d => 'kind' in d);
        const pipes = docs.filter(d => 'pipeName' in d);
        return `export const components = ${JSON.stringify(components)};
export const pipes = ${JSON.stringify(pipes)};`;
      }
      if (id === RESOLVED_COMPODOC_ID) {
        const json = toCompodocJson(docs);
        return `export default ${JSON.stringify(json)};`;
      }
    },
    
    // Dev mode: watch source files for changes
    configureServer(server) {
      // Watch component files and invalidate virtual module on change
      const files = options.include ?? ['src/**/*.component.ts'];
      // Use server.watcher to detect changes and trigger HMR
      server.watcher.on('change', (file) => {
        if (file.endsWith('.component.ts') || file.endsWith('.directive.ts') || file.endsWith('.pipe.ts')) {
          // Re-extract
          const tsconfigPath = options.tsconfig ?? './tsconfig.json';
          const parser = createParser(tsconfigPath);
          docs = parser.parse(files);
          
          // Invalidate virtual modules
          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
          const compodocMod = server.moduleGraph.getModuleById(RESOLVED_COMPODOC_ID);
          if (compodocMod) server.moduleGraph.invalidateModule(compodocMod);
          
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}
```

### package.json

```json
{
  "name": "ngx-component-meta-vite",
  "version": "0.1.0",
  "description": "Vite plugin for ngx-component-meta",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./client": "./client.d.ts"
  },
  "peerDependencies": {
    "ngx-component-meta": ">=0.1.0",
    "vite": ">=5.0.0",
    "typescript": ">=5.0.0"
  }
}
```

## Testing

- Test virtual module resolution (resolveId returns correct IDs)
- Test load returns valid JavaScript with correct data
- Test with a minimal Vite project that imports the virtual module
- Test HMR: change a component file, verify the virtual module is re-generated

## Dependencies on other specs

- Benefits from **Spec 03 (Watch Mode)** for incremental re-parsing, but can work without it by creating a fresh parser on each change.

## Open questions

- Should glob resolution happen in the plugin or delegated to the CLI's glob logic? Plugin should use its own glob resolution via Vite's `server.watcher` patterns.
- esbuild plugin: similar shape but uses `onResolve` / `onLoad` hooks. Could be a separate export from the same package or a separate package.
