import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { tryExtractSignalOutput } from '../../../src/extractors/signal-output.js';

describe('tryExtractSignalOutput', () => {
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
      // Return empty source files for stdlib to prevent synchronous blocking
      return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest, true);
    };

    program = ts.createProgram([filename], {}, compilerHost);
    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile(filename)!;

    let propertyNode: ts.PropertyDeclaration | undefined;
    let callExprNode: ts.CallExpression | undefined;

    // We'll assume the property is inside a class
    ts.forEachChild(sourceFile, node => {
      if (ts.isClassDeclaration(node)) {
        node.members.forEach(member => {
          if (ts.isPropertyDeclaration(member) && member.initializer && ts.isCallExpression(member.initializer)) {
            propertyNode = member;
            callExprNode = member.initializer;
          }
        });
      }
    });

    if (!propertyNode || !callExprNode) {
      throw new Error("No valid property with call expression found in source code");
    }

    return { checker, propertyNode, callExprNode, sourceFile };
  }

  it('should extract a simple signal output', () => {
    const { checker, propertyNode, callExprNode } = setup(`
      import { output } from '@angular/core';
      export class MyComponent {
        myOutput = output<string>();
      }
    `);

    const doc = tryExtractSignalOutput(checker, propertyNode, callExprNode);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myOutput');
    expect(doc?.bindingName).toBe('myOutput');
    // type might be 'any' due to empty stdlib, but should check it
    expect(doc?.type).toBeDefined();
    expect(doc?.source).toBe('signal');
  });

  it('should extract a signal output with an alias', () => {
    const { checker, propertyNode, callExprNode } = setup(`
      import { output } from '@angular/core';
      export class MyComponent {
        myOutput = output<string>({ alias: 'my-alias' });
      }
    `);

    const doc = tryExtractSignalOutput(checker, propertyNode, callExprNode);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myOutput');
    expect(doc?.bindingName).toBe('my-alias');
  });

  it('should extract descriptions and tags', () => {
    const { checker, propertyNode, callExprNode } = setup(`
      import { output } from '@angular/core';
      export class MyComponent {
        /**
         * This is a description
         * @since 1.0.0
         * @deprecated Use something else
         */
        myOutput = output<string>();
      }
    `);

    const doc = tryExtractSignalOutput(checker, propertyNode, callExprNode);

    expect(doc).toBeDefined();
    expect(doc?.description).toBe('This is a description');
    expect(doc?.rawDescription).toBe('This is a description');
    expect(doc?.tags).toBeDefined();
    expect(doc?.tags?.['since']).toBe('1.0.0');
    expect(doc?.tags?.['deprecated']).toBe('Use something else');
  });

  it('should return null for non-output signals (like input)', () => {
    const { checker, propertyNode, callExprNode } = setup(`
      import { input } from '@angular/core';
      export class MyComponent {
        myInput = input<string>();
      }
    `);

    const doc = tryExtractSignalOutput(checker, propertyNode, callExprNode);

    expect(doc).toBeNull();
  });

  it('should return null for normal properties', () => {
    const { checker, propertyNode, callExprNode } = setup(`
      export class MyComponent {
        myProp = someFunction();
      }
      function someFunction() { return null; }
    `);

    const doc = tryExtractSignalOutput(checker, propertyNode, callExprNode);

    expect(doc).toBeNull();
  });
});
