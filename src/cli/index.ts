#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { parse, parseAll, createParser, createWatchParser } from '../parser.js';
import type { ComponentDoc, PipeDoc, ParserOptions } from '../types.js';
import { parseArgs, printHelp } from './options.js';
import type { ExtractCliOptions, DiffCliOptions, LintCliOptions, StatsCliOptions } from './options.js';
import { formatJson, formatCompodoc, formatMarkdown } from './formatters.js';
import { diff } from '../diff.js';
import { formatDiffText, formatDiffJson, formatDiffMarkdown } from '../diff-formatters.js';
import { lint } from '../lint.js';
import { formatLintText, formatLintJson, formatLintStylish } from '../lint-formatters.js';
import { computeStats } from '../stats.js';
import { formatStatsText, formatStatsJson, formatStatsMarkdown } from '../stats-formatters.js';
import { toPropsJsonString } from '../props-json.js';

function readJsonFile(filePath: string | URL): any {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      console.error(`Error: Failed to parse JSON in file: ${filePath}`);
      console.error(`Message: ${err.message}`);
    } else {
      console.error(`Error: Could not read file: ${filePath}`);
      if (err instanceof Error) {
        console.error(`Message: ${err.message}`);
      } else {
        console.error(`Message: ${String(err)}`);
      }
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    const pkgPath = new URL('../../package.json', import.meta.url);
    const pkg = readJsonFile(pkgPath);
    console.log(pkg.version);
    process.exit(0);
  }

  if (options.command === 'diff') {
    await runDiff(options);
    return;
  }

  if (options.command === 'lint') {
    await runLint(options);
    return;
  }

  if (options.command === 'stats') {
    await runStats(options);
    return;
  }

  await runExtract(options);
}

async function runDiff(options: DiffCliOptions): Promise<void> {
  if (!options.base) {
    console.error('Error: --base is required for the diff command. Use --help for usage information.');
    process.exit(1);
  }

  const basePath = path.resolve(options.base);
  if (!fs.existsSync(basePath)) {
    console.error(`Error: Base file not found: ${options.base}`);
    process.exit(1);
  }

  const baseDocs: (ComponentDoc | PipeDoc)[] = readJsonFile(basePath);

  let headDocs: (ComponentDoc | PipeDoc)[];

  if (options.head) {
    const headPath = path.resolve(options.head);
    if (!fs.existsSync(headPath)) {
      console.error(`Error: Head file not found: ${options.head}`);
      process.exit(1);
    }
    headDocs = readJsonFile(headPath);
  } else {
    if (!options.project) {
      console.error('Error: Either --head or --project (-p) must be specified when using diff without a head file.');
      process.exit(1);
    }

    const parserOptions: ParserOptions = {
      shouldIncludeMethods: !options.noMethods,
      shouldIncludeInherited: !options.noInherited,
    };

    const tsconfigPath = path.resolve(options.project);
    const parser = createParser(tsconfigPath, parserOptions);
    const program = parser.getProgram();
    const sourceFiles = program.getSourceFiles()
      .filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'))
      .map(sf => sf.fileName);
    headDocs = parser.parse(sourceFiles);
  }

  const result = diff(baseDocs, headDocs);

  let output: string;
  switch (options.format) {
    case 'json':
      output = formatDiffJson(result);
      break;
    case 'markdown':
      output = formatDiffMarkdown(result);
      break;
    case 'text':
    default:
      output = formatDiffText(result);
      break;
  }

  if (options.output) {
    const outputPath = path.resolve(options.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output + '\n', 'utf-8');
    console.error(`Wrote diff output to ${outputPath}`);
  } else {
    console.log(output);
  }

  if (result.summary.breaking > 0) {
    process.exit(1);
  }
}

async function resolveAndParse(options: {
  files: string[];
  project?: string;
  noMethods?: boolean;
  noInherited?: boolean;
}) {
  if (options.files.length === 0) {
    console.error('Error: No files specified. Use --help for usage information.');
    process.exit(1);
  }

  const resolvedFiles = await resolveGlobs(options.files);
  if (resolvedFiles.length === 0) {
    console.error('Error: No matching files found.');
    process.exit(1);
  }

  const parserOptions: ParserOptions = {
    shouldIncludeMethods: !options.noMethods,
    shouldIncludeInherited: !options.noInherited,
  };

  let parser: ReturnType<typeof createParser> | undefined;
  if (options.project) {
    parser = createParser(path.resolve(options.project), parserOptions);
  }

  return {
    resolvedFiles,
    parserOptions,
    parseResult: () => parser ? parser.parseAll(resolvedFiles) : parseAll(resolvedFiles, parserOptions),
    parseDocs: () => parser ? parser.parse(resolvedFiles) : parse(resolvedFiles, parserOptions),
  };
}

async function runExtract(options: ExtractCliOptions): Promise<void> {
  const { parserOptions, parseResult, parseDocs } = await resolveAndParse(options);

  // Parse
  let docs;
  if (options.format === 'props-json') {
    const result = parseResult();
    const output = toPropsJsonString(result, { pretty: options.pretty });
    writeRawOutput(output, options.output);
    return;
  }

  docs = parseDocs();

  // Format & Write
  writeOutput(docs, options);

  // Watch mode
  if (options.watch) {
    if (!options.project) {
      console.error('Error: --watch requires --project (-p) to be specified.');
      process.exit(1);
    }

    const tsconfigPath = path.resolve(options.project);
    const watchDir = path.dirname(tsconfigPath);

    const watcher = createWatchParser(tsconfigPath, {
      ...parserOptions,
      watchDir,
      onUpdate(updatedDocs) {
        writeOutput(updatedDocs, options);
        console.error(`[ngx-component-meta] Rebuilt — ${updatedDocs.length} entries`);
      },
    });

    watcher.start();
    console.error('[ngx-component-meta] Watching for changes...');

    process.on('SIGINT', () => {
      watcher.stop();
      process.exit(0);
    });

    return;
  }
}

function writeOutput(
  docs: (ComponentDoc | PipeDoc)[],
  options: { format: string; pretty: boolean; split: boolean; output: string | undefined },
): void {
  if (options.format === 'markdown') {
    if (options.split && options.output) {
      const outputDir = path.resolve(options.output);
      fs.mkdirSync(outputDir, { recursive: true });
      for (const doc of docs) {
        const content = formatMarkdown([doc]);
        const filePath = path.join(outputDir, `${doc.name}.md`);
        fs.writeFileSync(filePath, content + '\n', 'utf-8');
      }
      console.error(`Wrote ${docs.length} files to ${outputDir}`);
    } else {
      const output = formatMarkdown(docs);
      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, output + '\n', 'utf-8');
        console.error(`Wrote ${docs.length} entries to ${outputPath}`);
      } else {
        console.log(output);
      }
    }
  } else {
    const formatter = options.format === 'compodoc' ? formatCompodoc : formatJson;
    const output = formatter(docs, options.pretty);
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, output + '\n', 'utf-8');
      console.error(`Wrote ${docs.length} entries to ${outputPath}`);
    } else {
      console.log(output);
    }
  }
}

function writeRawOutput(content: string, outputPath: string | undefined): void {
  if (outputPath) {
    const resolved = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content + '\n', 'utf-8');
    console.error(`Wrote output to ${resolved}`);
  } else {
    console.log(content);
  }
}

async function runLint(options: LintCliOptions): Promise<void> {
  const { parseResult } = await resolveAndParse(options);
  const result = parseResult();

  const lintResult = lint(result);

  let output: string;
  switch (options.format) {
    case 'json':
      output = formatLintJson(lintResult);
      break;
    case 'text':
      output = formatLintText(lintResult);
      break;
    case 'stylish':
    default:
      output = formatLintStylish(lintResult);
      break;
  }

  writeRawOutput(output, options.output);

  if (lintResult.summary.errors > 0) {
    process.exit(1);
  }
}

async function runStats(options: StatsCliOptions): Promise<void> {
  const { parseResult } = await resolveAndParse(options);
  const result = parseResult();

  const stats = computeStats(result);

  let output: string;
  switch (options.format) {
    case 'json':
      output = formatStatsJson(stats);
      break;
    case 'markdown':
      output = formatStatsMarkdown(stats);
      break;
    case 'text':
    default:
      output = formatStatsText(stats);
      break;
  }

  writeRawOutput(output, options.output);
}

async function resolveGlobs(patterns: string[]): Promise<string[]> {
  const fileArrays = await Promise.all(
    patterns.map(async (pattern) => {
      if (pattern.includes('*')) {
        // Use fs.glob (Node 22+) or fall back to manual resolution
        try {
          const matches = await globPromise(pattern);
          return matches.map((f) => path.resolve(f));
        } catch {
          console.error(`Warning: Could not resolve glob pattern: ${pattern}`);
          return [];
        }
      } else {
        const resolved = path.resolve(pattern);
        if (fs.existsSync(resolved)) {
          return [resolved];
        } else {
          console.error(`Warning: File not found: ${pattern}`);
          return [];
        }
      }
    })
  );

  const files = fileArrays.flat();
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
