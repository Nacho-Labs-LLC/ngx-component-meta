import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ts from 'typescript';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extractVariable } from '../../../src/extractors/variable.js';

describe('extractVariable', () => {
  let program: ts.Program;
  let checker: ts.TypeChecker;
  let sourceFile: ts.SourceFile;
  let tmpDir: string;

  beforeAll(() => {
    const sourceCode = `
      /**
       * My awesome variable
       * @deprecated Use something else
       */
      export const MY_VAR = 42;

      /** A let variable */
      export let myLet = 'hello';

      /**
       * @internal
       */
      export const internalVar = 'secret';

      export let noInitVar: number;

      export const complexVar: { a: string, b: number[] } = { a: 'a', b: [1, 2] };

      export const { destructuredVar } = { destructuredVar: 'value' };
    `;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngx-meta-var-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(tmpFile, sourceCode, 'utf-8');

    program = ts.createProgram([tmpFile], {});
    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile(tmpFile)!;
  });

  afterAll(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function getVariableDeclaration(name: string): { decl: ts.VariableDeclaration, isConst: boolean } | null {
    let result: { decl: ts.VariableDeclaration, isConst: boolean } | null = null;

    function visit(node: ts.Node) {
      if (ts.isVariableStatement(node)) {
        const isConst = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === name) {
            result = { decl, isConst };
            return;
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return result;
  }

  it('extracts a simple const variable', () => {
    const match = getVariableDeclaration('MY_VAR');
    expect(match).not.toBeNull();
    const doc = extractVariable(checker, match!.decl, match!.isConst, sourceFile);

    expect(doc).not.toBeNull();
    expect(doc?.name).toBe('MY_VAR');
    expect(doc?.isConst).toBe(true);
    expect(doc?.type).toBe('42');
    expect(doc?.defaultValue).toBe('42');
    expect(doc?.description).toBe('My awesome variable');
    expect(doc?.tags).toEqual({ deprecated: 'Use something else' });
  });

  it('extracts a let variable', () => {
    const match = getVariableDeclaration('myLet');
    expect(match).not.toBeNull();
    const doc = extractVariable(checker, match!.decl, match!.isConst, sourceFile);

    expect(doc).not.toBeNull();
    expect(doc?.name).toBe('myLet');
    expect(doc?.isConst).toBe(false);
    expect(doc?.type).toBe('string');
    expect(doc?.defaultValue).toBe("'hello'");
    expect(doc?.description).toBe('A let variable');
  });

  it('returns null for an internal variable', () => {
    const match = getVariableDeclaration('internalVar');
    expect(match).not.toBeNull();
    const doc = extractVariable(checker, match!.decl, match!.isConst, sourceFile);

    expect(doc).toBeNull();
  });

  it('handles variable with no initializer', () => {
    const match = getVariableDeclaration('noInitVar');
    expect(match).not.toBeNull();
    const doc = extractVariable(checker, match!.decl, match!.isConst, sourceFile);

    expect(doc).not.toBeNull();
    expect(doc?.name).toBe('noInitVar');
    expect(doc?.defaultValue).toBeUndefined();
    expect(doc?.type).toBe('number');
  });

  it('handles a variable with a complex type', () => {
    const match = getVariableDeclaration('complexVar');
    expect(match).not.toBeNull();
    const doc = extractVariable(checker, match!.decl, match!.isConst, sourceFile);

    expect(doc).not.toBeNull();
    expect(doc?.name).toBe('complexVar');
    expect(doc?.type).toBe('{ a: string; b: number[]; }');
    expect(doc?.defaultValue).toBe("{ a: 'a', b: [1, 2] }");
  });

  it('returns null for a destructured variable', () => {
    // Array destructuring or object destructuring
    let result: ts.VariableDeclaration | null = null;
    let isConst = false;

    function visit(node: ts.Node) {
      if (ts.isVariableStatement(node)) {
        isConst = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;
        for (const decl of node.declarationList.declarations) {
          if (ts.isObjectBindingPattern(decl.name)) {
            result = decl;
            return;
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    expect(result).not.toBeNull();
    const doc = extractVariable(checker, result!, isConst, sourceFile);
    expect(doc).toBeNull();
  });
});
