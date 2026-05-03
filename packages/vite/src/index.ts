import ts from 'typescript';
import { createParser } from 'ngx-component-meta';
import type { Parser } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';

// Inline Vite Plugin interface — vite is a peer dep, so we avoid importing from it.
interface VitePlugin {
  name: string;
  resolveId?(id: string, ...args: any[]): any;
  buildStart?(): any;
  load?(id: string, ...args: any[]): any;
  configureServer?(server: any): void;
}

const VIRTUAL_ID = 'virtual:ngx-component-meta';
const VIRTUAL_COMPODOC_ID = 'virtual:ngx-component-meta/compodoc';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;
const RESOLVED_COMPODOC_ID = '\0' + VIRTUAL_COMPODOC_ID;

export interface NgxComponentMetaOptions {
  /** Path to tsconfig.json. Default: './tsconfig.json' */
  tsconfig?: string;
  /** Glob patterns for files to parse. Default: ['src/**/*.component.ts'] */
  include?: string[];
}

/**
 * Resolve glob patterns to literal file paths using the TypeScript system API.
 */
function resolveGlobs(patterns: string[]): string[] {
  return ts.sys.readDirectory('.', ['.ts'], ['node_modules'], patterns);
}

export function ngxComponentMeta(options: NgxComponentMetaOptions = {}): VitePlugin {
  let components: any[] = [];
  let pipes: any[] = [];
  let allDocs: any[] = [];
  let parser: Parser | undefined;

  function extractMetadata() {
    const tsconfigPath = options.tsconfig ?? './tsconfig.json';

    if (!parser) {
      parser = createParser(tsconfigPath);
    }

    const patterns = options.include ?? ['src/**/*.component.ts'];
    const files = resolveGlobs(patterns);
    const docs = parser.parse(files);

    allDocs = docs;
    components = docs.filter((d: any) => 'kind' in d);
    pipes = docs.filter((d: any) => 'pipeName' in d);
  }

  return {
    name: 'ngx-component-meta',

    buildStart() {
      try {
        extractMetadata();
      } catch (err) {
        console.warn('[ngx-component-meta] Failed to extract metadata:', err);
        allDocs = [];
        components = [];
        pipes = [];
      }
    },

    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      if (id === VIRTUAL_COMPODOC_ID) return RESOLVED_COMPODOC_ID;
    },

    load(id: string) {
      if (id === RESOLVED_VIRTUAL_ID) {
        return `export const components = ${JSON.stringify(components)};\nexport const pipes = ${JSON.stringify(pipes)};`;
      }
      if (id === RESOLVED_COMPODOC_ID) {
        const json = toCompodocJson(allDocs);
        return `export default ${JSON.stringify(json)};`;
      }
    },

    configureServer(server: any) {
      server.watcher.on('change', (file: string) => {
        if (
          file.endsWith('.component.ts') ||
          file.endsWith('.directive.ts') ||
          file.endsWith('.pipe.ts')
        ) {
          try {
            extractMetadata();
          } catch (err) {
            console.warn('[ngx-component-meta] Failed to re-extract metadata on change:', err);
            allDocs = [];
            components = [];
            pipes = [];
          }

          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);

          const compodocMod = server.moduleGraph.getModuleById(RESOLVED_COMPODOC_ID);
          if (compodocMod) server.moduleGraph.invalidateModule(compodocMod);

          // Vite 6 removed server.ws; use server.hot (Vite 6+) with ws fallback (Vite 5)
          const hotChannel = server.hot ?? server.ws;
          hotChannel?.send?.({ type: 'full-reload' });
        }
      });
    },
  };
}
