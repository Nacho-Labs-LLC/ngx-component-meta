import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { extractTypeAlias } from '../../../src/extractors/type-alias.js';

describe('extractTypeAlias', () => {
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
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    program = ts.createProgram([filename], {}, compilerHost);
    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile(filename)!;

    // Find the TypeAliasDeclaration
    let typeAliasNode: ts.TypeAliasDeclaration | undefined;
    ts.forEachChild(sourceFile, node => {
      if (ts.isTypeAliasDeclaration(node)) {
        typeAliasNode = node;
      }
    });

    if (!typeAliasNode) throw new Error("No type alias found in source code");

    return { checker, typeAliasNode, sourceFile };
  }

  it('should extract a simple type alias', () => {
    const { checker, typeAliasNode, sourceFile } = setup(`
      export type MyType = string;
    `);

    const doc = extractTypeAlias(checker, typeAliasNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('MyType');
    expect(doc?.type).toBe('string');
  });

  it('should extract a union type alias', () => {
    const { checker, typeAliasNode, sourceFile } = setup(`
      export type ButtonVariant = 'primary' | 'secondary' | 'danger';
    `);

    const doc = extractTypeAlias(checker, typeAliasNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('ButtonVariant');
    expect(doc?.type).toBe("'primary' | 'secondary' | 'danger'");
  });

  it('should extract descriptions and tags', () => {
    const { checker, typeAliasNode, sourceFile } = setup(`
      /**
       * This is a description
       * @since 1.0.0
       * @deprecated Use something else
       */
      export type ComplexType = { a: string, b: number };
    `);

    const doc = extractTypeAlias(checker, typeAliasNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('ComplexType');
    expect(doc?.type).toBe('{ a: string, b: number }');
    expect(doc?.description).toBe('This is a description');
    expect(doc?.rawDescription).toBe('This is a description');
    expect(doc?.tags).toBeDefined();
    expect(doc?.tags?.['since']).toBe('1.0.0');
    expect(doc?.tags?.['deprecated']).toBe('Use something else');
  });

  it('should skip internal type aliases', () => {
    const { checker, typeAliasNode, sourceFile } = setup(`
      /**
       * @internal
       */
      export type InternalType = string;
    `);

    const doc = extractTypeAlias(checker, typeAliasNode, sourceFile);

    expect(doc).toBeNull();
  });

  it('should return null if symbol cannot be resolved', () => {
    // This is hard to trigger with valid TS, but let's try to pass a node without a name
    const { checker, typeAliasNode, sourceFile } = setup(`
      export type MyType = string;
    `);

    // Create a fake node without a name
    const fakeNode = {
      ...typeAliasNode,
      name: undefined
    } as unknown as ts.TypeAliasDeclaration;

    const doc = extractTypeAlias(checker, fakeNode, sourceFile);
    expect(doc).toBeNull();
  });
});
