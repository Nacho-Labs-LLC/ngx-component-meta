import ts from 'typescript';
import path from 'path';
import { createParserFromOptions } from '../src/parser.js';
import type { ComponentDoc, PipeDoc, ParserOptions } from '../src/types.js';

const STUBS_DIR = path.join(import.meta.dirname, 'stubs');
const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');

const BASE_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  experimentalDecorators: true,
  emitDecoratorMetadata: false,
  strict: true,
  paths: {
    '@angular/core': [path.join(STUBS_DIR, 'angular-core.d.ts')],
  },
  baseUrl: FIXTURES_DIR,
};

/**
 * Parse a fixture file and return all extracted docs.
 */
export function parseFixture(
  fixtureName: string,
  options?: ParserOptions,
): (ComponentDoc | PipeDoc)[] {
  const filePath = path.join(FIXTURES_DIR, fixtureName);
  const parser = createParserFromOptions(BASE_COMPILER_OPTIONS, options);
  return parser.parse(filePath);
}

/**
 * Parse a fixture and return only ComponentDocs.
 */
export function parseComponents(
  fixtureName: string,
  options?: ParserOptions,
): ComponentDoc[] {
  return parseFixture(fixtureName, options).filter(
    (d): d is ComponentDoc => 'kind' in d && (d.kind === 'component' || d.kind === 'directive'),
  );
}

/**
 * Parse a fixture and return only PipeDocs.
 */
export function parsePipes(
  fixtureName: string,
  options?: ParserOptions,
): PipeDoc[] {
  return parseFixture(fixtureName, options).filter(
    (d): d is PipeDoc => 'pipeName' in d,
  );
}

/**
 * Parse a fixture and return the first ComponentDoc.
 */
export function parseFirstComponent(
  fixtureName: string,
  options?: ParserOptions,
): ComponentDoc {
  const docs = parseComponents(fixtureName, options);
  if (docs.length === 0) throw new Error(`No components found in fixture: ${fixtureName}`);
  return docs[0];
}
