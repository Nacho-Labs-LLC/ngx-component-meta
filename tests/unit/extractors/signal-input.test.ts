import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { tryExtractSignalInput } from '../../../src/extractors/signal-input.js';

describe('tryExtractSignalInput', () => {
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
      return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest, true); // Empty placeholders for stdlib to not block vitest
    };

    program = ts.createProgram([filename], {}, compilerHost);
    checker = program.getTypeChecker();
    sourceFile = program.getSourceFile(filename)!;

    let propNode: ts.PropertyDeclaration | undefined;
    let callExprNode: ts.CallExpression | undefined;

    ts.forEachChild(sourceFile, node => {
      if (ts.isClassDeclaration(node)) {
        node.members.forEach(member => {
          if (ts.isPropertyDeclaration(member) && member.initializer && ts.isCallExpression(member.initializer)) {
            propNode = member;
            callExprNode = member.initializer;
          }
        });
      }
    });

    if (!propNode || !callExprNode) throw new Error("No signal input property found in source code");

    return { checker, propNode, callExprNode, sourceFile };
  }

  it('should extract a basic signal input', () => {
    const { checker, propNode, callExprNode, sourceFile } = setup(`
      import { input } from '@angular/core';
      class MyComponent {
        myProp = input('default');
      }
    `);

    const doc = tryExtractSignalInput(checker, propNode, callExprNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myProp');
    expect(doc?.bindingName).toBe('myProp');
    expect(doc?.required).toBe(false);
    expect(doc?.source).toBe('signal');
    expect(doc?.transform).toBeNull();
    expect(doc?.defaultValue).toBe("'default'");
  });

  it('should extract a required signal input', () => {
    const { checker, propNode, callExprNode, sourceFile } = setup(`
      import { input } from '@angular/core';
      class MyComponent {
        myProp = input.required<string>();
      }
    `);

    const doc = tryExtractSignalInput(checker, propNode, callExprNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myProp');
    expect(doc?.required).toBe(true);
    expect(doc?.defaultValue).toBeUndefined();
  });

  it('should extract an input with an alias', () => {
    const { checker, propNode, callExprNode, sourceFile } = setup(`
      import { input } from '@angular/core';
      class MyComponent {
        myProp = input('default', { alias: 'myAlias' });
      }
    `);

    const doc = tryExtractSignalInput(checker, propNode, callExprNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myProp');
    expect(doc?.bindingName).toBe('myAlias');
  });

  it('should extract a required input with an alias', () => {
    const { checker, propNode, callExprNode, sourceFile } = setup(`
      import { input } from '@angular/core';
      class MyComponent {
        myProp = input.required<string>({ alias: 'myAlias' });
      }
    `);

    const doc = tryExtractSignalInput(checker, propNode, callExprNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myProp');
    expect(doc?.bindingName).toBe('myAlias');
    expect(doc?.required).toBe(true);
  });

  it('should extract an input with a transform function', () => {
    const { checker, propNode, callExprNode, sourceFile } = setup(`
      import { input, booleanAttribute } from '@angular/core';
      class MyComponent {
        myProp = input(false, { transform: booleanAttribute });
      }
    `);

    const doc = tryExtractSignalInput(checker, propNode, callExprNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.transform).toBe('booleanAttribute');
  });

  it('should extract description and tags from JSDoc', () => {
    const { checker, propNode, callExprNode, sourceFile } = setup(`
      import { input } from '@angular/core';
      class MyComponent {
        /**
         * The best property
         * @since 1.0.0
         * @deprecated Use something else
         */
        myProp = input();
      }
    `);

    const doc = tryExtractSignalInput(checker, propNode, callExprNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.description).toBe('The best property');
    expect(doc?.rawDescription).toBe('The best property');
    expect(doc?.tags).toBeDefined();
    expect(doc?.tags?.['since']).toBe('1.0.0');
    expect(doc?.tags?.['deprecated']).toBe('Use something else');
  });

  it('should return null when the baseName is not input', () => {
    const { checker, propNode, callExprNode, sourceFile } = setup(`
      import { model } from '@angular/core';
      class MyComponent {
        myProp = model();
      }
    `);

    const doc = tryExtractSignalInput(checker, propNode, callExprNode, sourceFile);

    expect(doc).toBeNull();
  });
});
