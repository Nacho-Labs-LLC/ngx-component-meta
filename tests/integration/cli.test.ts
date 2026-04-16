import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CLI_PATH = path.join(import.meta.dirname, '../../dist/cli/index.js');
const FIXTURES_DIR = path.join(import.meta.dirname, '../fixtures');
const STUBS_DIR = path.join(import.meta.dirname, '../stubs');

// Create a minimal tsconfig for CLI tests
const TEST_TSCONFIG = path.join(import.meta.dirname, 'tsconfig.test.json');

function setupTestTsconfig(): void {
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      experimentalDecorators: true,
      strict: true,
      paths: {
        '@angular/core': [path.join(STUBS_DIR, 'angular-core.d.ts')],
      },
      baseUrl: FIXTURES_DIR,
    },
    include: [FIXTURES_DIR + '/**/*.ts'],
  };
  fs.writeFileSync(TEST_TSCONFIG, JSON.stringify(config));
}

function runCli(args: string): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    encoding: 'utf-8',
    timeout: 30000,
  });
}

describe('CLI', () => {
  setupTestTsconfig();

  it('outputs JSON by default', () => {
    const output = runCli(`-p ${TEST_TSCONFIG} ${FIXTURES_DIR}/decorator-basic.component.ts`);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('ButtonComponent');
  });

  it('outputs Compodoc format with -f compodoc', () => {
    const output = runCli(`-p ${TEST_TSCONFIG} -f compodoc ${FIXTURES_DIR}/decorator-basic.component.ts`);
    const parsed = JSON.parse(output);
    expect(parsed.components).toBeDefined();
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].inputsClass).toBeDefined();
  });

  it('handles signal components', () => {
    const output = runCli(`-p ${TEST_TSCONFIG} ${FIXTURES_DIR}/signal-basic.component.ts`);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].inputs.length).toBeGreaterThan(0);
    expect(parsed[0].models.length).toBeGreaterThan(0);
  });

  it('handles pipes', () => {
    const output = runCli(`-p ${TEST_TSCONFIG} ${FIXTURES_DIR}/pipe-basic.ts`);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].pipeName).toBe('truncate');
  });

  it('respects --no-methods', () => {
    const output = runCli(`-p ${TEST_TSCONFIG} --no-methods ${FIXTURES_DIR}/decorator-basic.component.ts`);
    const parsed = JSON.parse(output);
    expect(parsed[0].methods).toHaveLength(0);
  });

  it('shows help with --help', () => {
    try {
      const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
      expect(output).toContain('ngx-component-meta');
      expect(output).toContain('--project');
    } catch (e: any) {
      // --help exits with 0, execSync should handle this
      expect(e.stdout).toContain('ngx-component-meta');
    }
  });
});
