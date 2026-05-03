import { createParser } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';
import type { CompodocJson } from 'ngx-component-meta/storybook';
import { resolve } from 'path';
import ts from 'typescript';

export interface ExtractOptions {
  /** Path to tsconfig.json. Default: './tsconfig.json' */
  tsconfig?: string;
  /** Glob patterns for files to include. Default: common Angular file patterns */
  include?: string[];
  /** Skip extraction of methods. Default: false */
  disableMethods?: boolean;
  /** Skip extraction of private members. Default: true */
  disablePrivate?: boolean;
}

const DEFAULT_INCLUDE = [
  'src/**/*.component.ts',
  'src/**/*.directive.ts',
  'src/**/*.pipe.ts',
];

/**
 * Resolve glob patterns to absolute file paths using TypeScript's sys utilities.
 */
function resolveFilePatterns(patterns: string[], basePath: string): string[] {
  const files: string[] = [];

  for (const pattern of patterns) {
    // ts.sys.readDirectory supports glob-like extensions/include/exclude filtering
    // We split the pattern into a base directory and extension filter
    const matched = ts.sys.readDirectory(
      basePath,
      ['.ts'],
      ['node_modules', 'dist'],
      [pattern],
    );
    for (const file of matched) {
      files.push(resolve(file));
    }
  }

  // Deduplicate (overlapping patterns may match the same files)
  return [...new Set(files)];
}

/**
 * Extract Angular component metadata and return it in Compodoc JSON format.
 * Runs at Storybook startup (Node.js server side).
 */
export function extractDocumentation(options: ExtractOptions = {}): CompodocJson {
  const tsconfigPath = resolve(options.tsconfig ?? './tsconfig.json');
  const patterns = options.include ?? DEFAULT_INCLUDE;

  const parser = createParser(tsconfigPath, {
    shouldIncludeMethods: !options.disableMethods,
  });

  const files = resolveFilePatterns(patterns, process.cwd());

  if (files.length === 0) {
    return {
      components: [],
      directives: [],
      pipes: [],
      injectables: [],
      classes: [],
      miscellaneous: { typealiases: [], enumerations: [] },
    };
  }

  const result = parser.parseAll(files);
  return toCompodocJson(result);
}
