import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { tryExtractSignalQuery } from '../../../src/extractors/signal-query.js';

describe('tryExtractSignalQuery', () => {
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

    // Find the class declaration to get the property declaration
    let classNode: ts.ClassDeclaration | undefined;
    ts.forEachChild(sourceFile, node => {
      if (ts.isClassDeclaration(node)) {
        classNode = node;
      }
    });

    if (!classNode) throw new Error("No class found in source code");

    let propNode: ts.PropertyDeclaration | undefined;
    for (const member of classNode.members) {
      if (ts.isPropertyDeclaration(member)) {
        propNode = member;
        break;
      }
    }

    if (!propNode) throw new Error("No property found in source code");

    let callExpr: ts.CallExpression | undefined;
    if (propNode.initializer && ts.isCallExpression(propNode.initializer)) {
      callExpr = propNode.initializer;
    }

    if (!callExpr) throw new Error("No call expression found in property initializer");

    return { checker, propNode, callExpr, sourceFile };
  }

  it('should extract a simple viewChild query with a string reference', () => {
    const { checker, propNode, callExpr, sourceFile } = setup(`
      import { viewChild, ElementRef } from '@angular/core';
      export class MyComponent {
        /**
         * The main wrapper
         * @since 1.2.0
         */
        myRef = viewChild<ElementRef>('myRef');
      }
    `);

    const doc = tryExtractSignalQuery(checker, propNode, callExpr, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myRef');
    expect(doc?.kind).toBe('viewChild');
    expect(doc?.selector).toBe('myRef');
    // type might be 'Signal<ElementRef | undefined>' or similar depending on the mock,
    // let's just check the basic properties for now.
    expect(doc?.required).toBe(false);
    expect(doc?.source).toBe('signal');
    expect(doc?.description).toBe('The main wrapper');
    expect(doc?.rawDescription).toBe('The main wrapper');
    expect(doc?.tags).toBeDefined();
    expect(doc?.tags?.['since']).toBe('1.2.0');
  });

  it('should extract a contentChild query with a class reference', () => {
    const { checker, propNode, callExpr, sourceFile } = setup(`
      import { contentChild } from '@angular/core';
      export class ChildComponent {}
      export class MyComponent {
        child = contentChild(ChildComponent);
      }
    `);

    const doc = tryExtractSignalQuery(checker, propNode, callExpr, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('child');
    expect(doc?.kind).toBe('contentChild');
    expect(doc?.selector).toBe('ChildComponent');
    expect(doc?.required).toBe(false);
  });

  it('should extract a required viewChild query', () => {
    const { checker, propNode, callExpr, sourceFile } = setup(`
      import { viewChild } from '@angular/core';
      export class MyComponent {
        myRef = viewChild.required('myRef');
      }
    `);

    const doc = tryExtractSignalQuery(checker, propNode, callExpr, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('myRef');
    expect(doc?.kind).toBe('viewChild');
    expect(doc?.selector).toBe('myRef');
    expect(doc?.required).toBe(true);
  });

  it('should extract a viewChildren query', () => {
    const { checker, propNode, callExpr, sourceFile } = setup(`
      import { viewChildren } from '@angular/core';
      export class MyComponent {
        items = viewChildren('item');
      }
    `);

    const doc = tryExtractSignalQuery(checker, propNode, callExpr, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('items');
    expect(doc?.kind).toBe('viewChildren');
    expect(doc?.selector).toBe('item');
    expect(doc?.required).toBe(false);
  });

  it('should extract a contentChildren query', () => {
    const { checker, propNode, callExpr, sourceFile } = setup(`
      import { contentChildren } from '@angular/core';
      export class ChildComponent {}
      export class MyComponent {
        children = contentChildren(ChildComponent);
      }
    `);

    const doc = tryExtractSignalQuery(checker, propNode, callExpr, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('children');
    expect(doc?.kind).toBe('contentChildren');
    expect(doc?.selector).toBe('ChildComponent');
    expect(doc?.required).toBe(false);
  });

  it('should return null for non-query signals', () => {
    const { checker, propNode, callExpr, sourceFile } = setup(`
      import { signal } from '@angular/core';
      export class MyComponent {
        mySignal = signal(0);
      }
    `);

    const doc = tryExtractSignalQuery(checker, propNode, callExpr, sourceFile);

    expect(doc).toBeNull();
  });
});
