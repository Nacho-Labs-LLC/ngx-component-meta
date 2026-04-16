#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'fs';
import { parse, createParser } from '../parser.js';
import type { ParserOptions } from '../types.js';
import { parseArgs, printHelp } from './options.js';
import { formatJson, formatCompodoc } from './formatters.js';

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    const pkgPath = new URL('../../package.json', import.meta.url);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    console.log(pkg.version);
    process.exit(0);
  }

  if (options.files.length === 0) {
    console.error('Error: No files specified. Use --help for usage information.');
    process.exit(1);
  }

  // Resolve glob patterns
  const resolvedFiles = await resolveGlobs(options.files);
  if (resolvedFiles.length === 0) {
    console.error('Error: No matching files found.');
    process.exit(1);
  }

  // Build parser options
  const parserOptions: ParserOptions = {
    shouldIncludeMethods: !options.noMethods,
    shouldIncludeInherited: !options.noInherited,
  };

  // Parse
  let docs;
  if (options.project) {
    const parser = createParser(path.resolve(options.project), parserOptions);
    docs = parser.parse(resolvedFiles);
  } else {
    docs = parse(resolvedFiles, parserOptions);
  }

  // Format
  const formatter = options.format === 'compodoc' ? formatCompodoc : formatJson;
  const output = formatter(docs, options.pretty);

  // Write
  if (options.output) {
    const outputPath = path.resolve(options.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output + '\n', 'utf-8');
    console.error(`Wrote ${docs.length} entries to ${outputPath}`);
  } else {
    console.log(output);
  }
}

async function resolveGlobs(patterns: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // Use fs.glob (Node 22+) or fall back to manual resolution
      try {
        const matches = await globPromise(pattern);
        files.push(...matches.map(f => path.resolve(f)));
      } catch {
        console.error(`Warning: Could not resolve glob pattern: ${pattern}`);
      }
    } else {
      const resolved = path.resolve(pattern);
      if (fs.existsSync(resolved)) {
        files.push(resolved);
      } else {
        console.error(`Warning: File not found: ${pattern}`);
      }
    }
  }

  return [...new Set(files)];
}

function globPromise(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const results: string[] = [];
    // Node 22+ fs.glob
    if (typeof (fs as any).glob === 'function') {
      (fs as any).glob(pattern, (err: Error | null, matches: string[]) => {
        if (err) reject(err);
        else resolve(matches);
      });
    } else {
      // Fallback: simple recursive file matching
      resolve(simpleGlob(pattern));
    }
  });
}

function simpleGlob(pattern: string): string[] {
  // Handle simple **/*.ts patterns
  const parts = pattern.split('**/');
  if (parts.length !== 2) return [];

  const baseDir = parts[0] || '.';
  const ext = parts[1].replace('*', '');

  const results: string[] = [];
  function walk(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          results.push(fullPath);
        }
      }
    } catch {
      // ignore permission errors
    }
  }

  walk(path.resolve(baseDir));
  return results;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
