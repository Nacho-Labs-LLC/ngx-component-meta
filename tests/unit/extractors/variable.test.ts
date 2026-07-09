import { describe, it, expect } from 'vitest';
import ts from '@typescript/typescript6';
import { extractVariable } from '../../../src/extractors/variable.js';

describe('extractVariable', () => {
  let program: ts.Program;
  let checker: ts.TypeChecker;
  let sourceFile: ts.SourceFile;

  function setup(sourceCode: string) {
    const filename = 'test.ts';
    const sourceFileObj = ts.createSourceFile(filename, sourceCode, ts.ScriptTarget.Latest, true);

    const compilerHost: ts.CompilerHost = {
      getSourceFile: (fileName) => {
        if (fileName === filename) return sourceFileObj;
        return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest, true);
      },
      getDefaultLibFileName: () => 'lib.d.ts',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (fileName) => fileName === filename,
      readFile: (fileName) => fileName === filename ? sourceCode : '',
    };

    program = ts.createProgram([filename], {}, compilerHost);
    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile(filename)!;

    let varDeclNode: ts.VariableDeclaration | undefined;

    // Find a VariableDeclaration inside an exported VariableStatement
    ts.forEachChild(sourceFile, node => {
      if (ts.isVariableStatement(node)) {
        const hasExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        if (hasExport) {
          varDeclNode = node.declarationList.declarations[0];
        }
      }
    });

    if (!varDeclNode) throw new Error("No exported variable declaration found in source code");

    return { checker, varDeclNode, sourceFile };
  }

  it('should extract a simple const variable', () => {
    const { checker, varDeclNode, sourceFile } = setup(`
      export const myVar = 'hello';
    `);

    const doc = extractVariable(checker, varDeclNode, true, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myVar');
    expect(doc?.type).toBe('"hello"');
    expect(doc?.defaultValue).toBe("'hello'");
    expect(doc?.isConst).toBe(true);
  });

  it('should extract a simple let variable', () => {
    const { checker, varDeclNode, sourceFile } = setup(`
      export let myVar = 'hello';
    `);

    const doc = extractVariable(checker, varDeclNode, false, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myVar');
    expect(doc?.type).toBe('string');
    expect(doc?.defaultValue).toBe("'hello'");
    expect(doc?.isConst).toBe(false);
  });

  it('should extract an explicitly typed variable', () => {
    const { checker, varDeclNode, sourceFile } = setup(`
      export const myVar: string = 'hello';
    `);

    const doc = extractVariable(checker, varDeclNode, true, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myVar');
    expect(doc?.type).toBe('string');
    expect(doc?.defaultValue).toBe("'hello'");
  });

  it('should extract variable without default value', () => {
    const { checker, varDeclNode, sourceFile } = setup(`
      export let myVar: number;
    `);

    const doc = extractVariable(checker, varDeclNode, false, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myVar');
    expect(doc?.type).toBe('number');
    expect(doc?.defaultValue).toBeUndefined();
  });

  it('should extract descriptions and tags', () => {
    const { checker, varDeclNode, sourceFile } = setup(`
      /**
       * This is a description
       * @since 1.0.0
       * @deprecated Use something else
       */
      export const myVar = 42;
    `);

    const doc = extractVariable(checker, varDeclNode, true, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myVar');
    expect(doc?.description).toBe('This is a description');
    expect(doc?.rawDescription).toBe('This is a description');
    expect(doc?.tags).toBeDefined();
    expect(doc?.tags?.['since']).toBe('1.0.0');
    expect(doc?.tags?.['deprecated']).toBe('Use something else');
  });

  it('should skip internal variables', () => {
    const { checker, varDeclNode, sourceFile } = setup(`
      /**
       * @internal
       */
      export const myVar = 'hello';
    `);

    const doc = extractVariable(checker, varDeclNode, true, sourceFile);

    expect(doc).toBeNull();
  });

  it('should return null if symbol cannot be resolved', () => {
    const { checker, varDeclNode, sourceFile } = setup(`
      export const myVar = 'hello';
    `);

    // Create a fake node without a name
    const fakeNode = {
      ...varDeclNode,
      name: undefined
    } as unknown as ts.VariableDeclaration;

    const doc = extractVariable(checker, fakeNode, true, sourceFile);
    expect(doc).toBeNull();
  });
});
