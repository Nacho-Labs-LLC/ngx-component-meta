import ts from '@typescript/typescript6';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createParserFromOptions } from '../src/parser.js';
import type { ComponentDoc, PipeDoc, ParseResult, ParserOptions } from '../src/types.js';

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

/**
 * Parse a fixture using parseAll and return the full ParseResult.
 */
export function parseAllFixture(
  fixtureName: string,
  options?: ParserOptions,
): ParseResult {
  const filePath = path.join(FIXTURES_DIR, fixtureName);
  const parser = createParserFromOptions(BASE_COMPILER_OPTIONS, options);
  return parser.parseAll(filePath);
}

/**
 * Parse an inline component string and return the full ParseResult.
 * Writes a temp file, parses it, and cleans up.
 */
export function parseInlineAll(source: string, options?: ParserOptions): ParseResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngx-meta-lint-'));
  const tmpFile = path.join(tmpDir, 'inline.component.ts');
  fs.writeFileSync(tmpFile, source, 'utf-8');

  try {
    const parser = createParserFromOptions(BASE_COMPILER_OPTIONS, options);
    return parser.parseAll(tmpFile);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
