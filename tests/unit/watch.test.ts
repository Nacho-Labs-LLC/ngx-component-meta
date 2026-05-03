import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createWatchParser } from '../../src/parser.js';
import type { ComponentDoc, PipeDoc } from '../../src/types.js';

const STUBS_DIR = path.join(import.meta.dirname, '../stubs');

const INITIAL_COMPONENT = `
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: '<div></div>',
})
export class TestComponent {
  /** The label. */
  label = input.required<string>();
}
`;

const UPDATED_COMPONENT = `
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: '<div></div>',
})
export class TestComponent {
  /** The label. */
  label = input.required<string>();

  /** The count. */
  count = input(0);
}
`;

function createTempProject(): { tmpDir: string; componentPath: string; tsconfigPath: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngx-watch-test-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const componentPath = path.join(srcDir, 'test.component.ts');
  fs.writeFileSync(componentPath, INITIAL_COMPONENT, 'utf-8');

  const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      experimentalDecorators: true,
      strict: true,
      paths: {
        '@angular/core': [path.join(STUBS_DIR, 'angular-core.d.ts')],
      },
      baseUrl: srcDir,
    },
    include: [srcDir + '/**/*.ts'],
  };
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig), 'utf-8');

  return { tmpDir, componentPath, tsconfigPath };
}

function removeTempDir(dirPath: string): void {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

describe('createWatchParser', () => {
  let tmpDir: string | undefined;
  let stopFn: (() => void) | undefined;

  afterEach(() => {
    stopFn?.();
    stopFn = undefined;
    if (tmpDir) {
      removeTempDir(tmpDir);
      tmpDir = undefined;
    }
  });

  it('performs an initial parse and returns docs via getLatest()', () => {
    const project = createTempProject();
    tmpDir = project.tmpDir;

    const watcher = createWatchParser(project.tsconfigPath, {
      watchDir: project.tmpDir,
    });
    stopFn = () => watcher.stop();

    const docs = watcher.getLatest();
    expect(docs.length).toBe(1);

    const comp = docs[0] as ComponentDoc;
    expect(comp.name).toBe('TestComponent');
    expect(comp.selector).toBe('app-test');
    expect(comp.inputs).toHaveLength(1);
    expect(comp.inputs[0].name).toBe('label');
  });

  it('detects file changes and calls onUpdate with new docs', async () => {
    const project = createTempProject();
    tmpDir = project.tmpDir;

    let updatedDocs: (ComponentDoc | PipeDoc)[] | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      const watcher = createWatchParser(project.tsconfigPath, {
        watchDir: project.tmpDir,
        onUpdate(docs) {
          updatedDocs = docs;
          resolve();
        },
      });
      stopFn = () => watcher.stop();
      watcher.start();
    });

    // Wait a tick for the watcher to be ready, then write the updated file
    await new Promise(r => setTimeout(r, 100));
    fs.writeFileSync(project.componentPath, UPDATED_COMPONENT, 'utf-8');

    // Wait for the update callback (with a timeout)
    await Promise.race([
      updatePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('onUpdate not called within 5s')), 5000)),
    ]);

    expect(updatedDocs).toBeDefined();
    expect(updatedDocs!.length).toBe(1);

    const comp = updatedDocs![0] as ComponentDoc;
    expect(comp.inputs).toHaveLength(2);
    expect(comp.inputs.find(i => i.name === 'label')).toBeDefined();
    expect(comp.inputs.find(i => i.name === 'count')).toBeDefined();
    expect(comp.inputs.find(i => i.name === 'count')!.defaultValue).toBe('0');
  }, 10000);

  it('stop() prevents further callbacks', async () => {
    const project = createTempProject();
    tmpDir = project.tmpDir;

    let callCount = 0;
    const watcher = createWatchParser(project.tsconfigPath, {
      watchDir: project.tmpDir,
      onUpdate() {
        callCount++;
      },
    });
    stopFn = () => watcher.stop();

    watcher.start();
    watcher.stop();
    stopFn = undefined;

    // Write a change after stopping
    await new Promise(r => setTimeout(r, 50));
    fs.writeFileSync(project.componentPath, UPDATED_COMPONENT, 'utf-8');

    // Wait long enough for debounce + processing
    await new Promise(r => setTimeout(r, 400));
    expect(callCount).toBe(0);
  });

  it('start() is idempotent — calling multiple times does not create multiple watchers', () => {
    const project = createTempProject();
    tmpDir = project.tmpDir;

    const watcher = createWatchParser(project.tsconfigPath, {
      watchDir: project.tmpDir,
    });
    stopFn = () => watcher.stop();

    // Should not throw
    watcher.start();
    watcher.start();
    watcher.stop();
    stopFn = undefined;
  });

  it('survives a syntax error and recovers when valid code is restored', async () => {
    const project = createTempProject();
    tmpDir = project.tmpDir;

    const BROKEN_SYNTAX = `
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  template: '<div></div>',
})
export class TestComponent {
  label = input.required<string>(
  // missing closing paren and brace — invalid TS
`;

    let recoveredDocs: (ComponentDoc | PipeDoc)[] | undefined;
    let recoveryResolve: (() => void) | undefined;
    const recoveryPromise = new Promise<void>(resolve => { recoveryResolve = resolve; });

    const watcher = createWatchParser(project.tsconfigPath, {
      watchDir: project.tmpDir,
      onUpdate(docs) {
        // Resolve when we get valid docs with 2 inputs (the recovery write)
        if (docs.length === 1 && 'inputs' in docs[0] && (docs[0] as ComponentDoc).inputs.length === 2) {
          recoveredDocs = docs;
          recoveryResolve?.();
        }
      },
    });
    stopFn = () => watcher.stop();

    // Verify initial valid docs
    const initialDocs = watcher.getLatest();
    expect(initialDocs).toHaveLength(1);
    expect((initialDocs[0] as ComponentDoc).name).toBe('TestComponent');

    watcher.start();

    // Write broken file — the watcher should not crash
    await new Promise(r => setTimeout(r, 100));
    fs.writeFileSync(project.componentPath, BROKEN_SYNTAX, 'utf-8');

    // Wait for debounce + rebuild attempt
    await new Promise(r => setTimeout(r, 500));

    // The watcher is still alive — write valid content and verify it recovers
    fs.writeFileSync(project.componentPath, UPDATED_COMPONENT, 'utf-8');

    await Promise.race([
      recoveryPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('recovery not called within 5s')), 5000)),
    ]);

    expect(recoveredDocs).toBeDefined();
    expect(recoveredDocs!.length).toBe(1);
    expect((recoveredDocs![0] as ComponentDoc).inputs).toHaveLength(2);
  }, 10000);
});
