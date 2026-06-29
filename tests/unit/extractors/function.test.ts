import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { extractFunction } from '../../../src/extractors/function.js';

describe('extractFunction', () => {
  let program: ts.Program;
  let checker: ts.TypeChecker;
  let sourceFile: ts.SourceFile;

  function setup(sourceCode: string) {
    const filename = 'test.ts';
    const compilerHost = ts.createCompilerHost({});
    const originalGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (fileName === filename) {
        return ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true);
      }
      // Return empty source files for non-test files to prevent timeouts
      if (fileName !== filename) {
        return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest, true);
      }
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    program = ts.createProgram([filename], {}, compilerHost);
    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile(filename)!;

    // Find the FunctionDeclaration
    let functionNode: ts.FunctionDeclaration | undefined;
    ts.forEachChild(sourceFile, node => {
      if (ts.isFunctionDeclaration(node)) {
        functionNode = node;
      }
    });

    if (!functionNode) throw new Error("No function found in source code");

    return { checker, functionNode, sourceFile };
  }

  it('should extract a simple function', () => {
    const { checker, functionNode, sourceFile } = setup(`
      export function mySimpleFunction() {}
    `);

    const doc = extractFunction(checker, functionNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('mySimpleFunction');
    expect(doc?.params).toEqual([]);
    expect(doc?.returnType).toBe('void');
  });

  it('should extract a function with parameters and return type', () => {
    const { checker, functionNode, sourceFile } = setup(`
      export function calculateArea(width: number, height: number): number {
        return width * height;
      }
    `);

    const doc = extractFunction(checker, functionNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('calculateArea');
    expect(doc?.returnType).toBe('number');
    expect(doc?.params.length).toBe(2);
    expect(doc?.params[0].name).toBe('width');
    expect(doc?.params[0].type).toBe('number');
    expect(doc?.params[1].name).toBe('height');
    expect(doc?.params[1].type).toBe('number');
  });

  it('should extract descriptions and tags', () => {
    const { checker, functionNode, sourceFile } = setup(`
      /**
       * Calculates something complex
       * @since 1.0.0
       * @deprecated Do not use
       * @param a The first param
       */
      export function myComplexFunction(a: string): void {}
    `);

    const doc = extractFunction(checker, functionNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myComplexFunction');
    expect(doc?.description).toBe('Calculates something complex');
    expect(doc?.rawDescription).toBe('Calculates something complex');
    expect(doc?.tags).toBeDefined();
    expect(doc?.tags?.['since']).toBe('1.0.0');
    expect(doc?.tags?.['deprecated']).toBe('Do not use');

    expect(doc?.params[0].description).toBe('The first param');
  });

  it('should skip internal functions', () => {
    const { checker, functionNode, sourceFile } = setup(`
      /**
       * @internal
       */
      export function internalFunc(): void {}
    `);

    const doc = extractFunction(checker, functionNode, sourceFile);

    expect(doc).toBeNull();
  });

  it('should return null if symbol cannot be resolved', () => {
    const { checker, functionNode, sourceFile } = setup(`
      export function mySimpleFunction() {}
    `);

    // Create a fake node without a name
    const fakeNode = {
      ...functionNode,
      name: undefined
    } as unknown as ts.FunctionDeclaration;

    const doc = extractFunction(checker, fakeNode, sourceFile);
    expect(doc).toBeNull();
  });
});
