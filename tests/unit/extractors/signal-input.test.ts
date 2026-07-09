import { describe, it, expect } from 'vitest';
import ts from '@typescript/typescript6';
import { tryExtractModel, tryExtractSignalInput } from '../../../src/extractors/signal-input.js';

describe('signal-input extractor', () => {
  function setupChecker(sourceText: string) {
    const filename = 'test.ts';
    const sourceFile = ts.createSourceFile(
      filename,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    const compilerHost: ts.CompilerHost = {
      getSourceFile: (fileName) => {
        if (fileName === filename) return sourceFile;
        // mock angular core types
        if (fileName === 'angular-core.d.ts') {
            return ts.createSourceFile(
                fileName,
                `export declare function model<T>(initialValue?: T, opts?: { alias?: string }): ModelSignal<T>;
                 export declare interface ModelSignal<T> { readonly value: T; }
                 export declare namespace model {
                     export function required<T>(opts?: { alias?: string }): ModelSignal<T>;
                 }
                 export declare function input<T>(initialValue?: T, opts?: { alias?: string, transform?: any }): InputSignal<T>;
                 export declare interface InputSignal<T> { readonly value: T; }
                 export declare namespace input {
                     export function required<T>(opts?: { alias?: string, transform?: any }): InputSignal<T>;
                 }`,
                ts.ScriptTarget.Latest,
                true
            );
        }
        return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest, true);
      },
      getDefaultLibFileName: () => 'lib.d.ts',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (fileName) => fileName === filename || fileName === 'angular-core.d.ts',
      readFile: (fileName) => {
          if (fileName === filename) return sourceText;
          return '';
      },
    };

    const program = ts.createProgram([filename], { paths: { '@angular/core': ['angular-core.d.ts'] }, baseUrl: '.' }, compilerHost);
    const checker = program.getTypeChecker();
    return { checker, sourceFile, program };
  }

  describe('tryExtractModel', () => {
    it('extracts optional model properties correctly', () => {
      const code = `
        import { model } from '@angular/core';
        class MyComponent {
          /** Some description */
          myModel = model<number>(42);
        }
      `;
      const { checker, sourceFile } = setupChecker(code);
      const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;
      const propNode = classNode.members.find(ts.isPropertyDeclaration)!;
      const callExpr = propNode.initializer as ts.CallExpression;

      const doc = tryExtractModel(checker, propNode, callExpr, sourceFile);
      expect(doc).not.toBeNull();
      expect(doc?.name).toBe('myModel');
      expect(doc?.bindingName).toBe('myModel');
      expect(doc?.type).toBe('number');
      expect(doc?.required).toBe(false);
      expect(doc?.defaultValue).toBe('42');
      expect(doc?.description).toBe('Some description');
    });

    it('extracts required model properties correctly', () => {
      const code = `
        import { model } from '@angular/core';
        class MyComponent {
          myModel = model.required<string>();
        }
      `;
      const { checker, sourceFile } = setupChecker(code);
      const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;
      const propNode = classNode.members.find(ts.isPropertyDeclaration)!;
      const callExpr = propNode.initializer as ts.CallExpression;

      const doc = tryExtractModel(checker, propNode, callExpr, sourceFile);
      expect(doc).not.toBeNull();
      expect(doc?.name).toBe('myModel');
      expect(doc?.bindingName).toBe('myModel');
      expect(doc?.type).toBe('string');
      expect(doc?.required).toBe(true);
      expect(doc?.defaultValue).toBeUndefined();
    });

    it('extracts alias correctly from model options', () => {
      const code = `
        import { model } from '@angular/core';
        class MyComponent {
          myModel = model('default', { alias: 'customAlias' });
          myRequiredModel = model.required<string>({ alias: 'customRequiredAlias' });
        }
      `;
      const { checker, sourceFile } = setupChecker(code);
      const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;

      const prop1 = classNode.members[0] as ts.PropertyDeclaration;
      const call1 = prop1.initializer as ts.CallExpression;
      const doc1 = tryExtractModel(checker, prop1, call1, sourceFile);

      expect(doc1?.name).toBe('myModel');
      expect(doc1?.bindingName).toBe('customAlias');
      expect(doc1?.type).toBe('string');
      expect(doc1?.defaultValue).toBe("'default'");

      const prop2 = classNode.members[1] as ts.PropertyDeclaration;
      const call2 = prop2.initializer as ts.CallExpression;
      const doc2 = tryExtractModel(checker, prop2, call2, sourceFile);

      expect(doc2?.name).toBe('myRequiredModel');
      expect(doc2?.bindingName).toBe('customRequiredAlias');
      expect(doc2?.type).toBe('string');
      expect(doc2?.required).toBe(true);
    });

    it('returns null if not a model signal', () => {
      const code = `
        import { input } from '@angular/core';
        class MyComponent {
          myInput = input<number>(42);
        }
      `;
      const { checker, sourceFile } = setupChecker(code);
      const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;
      const propNode = classNode.members.find(ts.isPropertyDeclaration)!;
      const callExpr = propNode.initializer as ts.CallExpression;

      const doc = tryExtractModel(checker, propNode, callExpr, sourceFile);
      expect(doc).toBeNull();
    });
  });

  describe('tryExtractSignalInput', () => {
    it('returns null if not an input signal', () => {
      const code = `
        import { model } from '@angular/core';
        class MyComponent {
          myModel = model<number>(42);
        }
      `;
      const { checker, sourceFile } = setupChecker(code);
      const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;
      const propNode = classNode.members.find(ts.isPropertyDeclaration)!;
      const callExpr = propNode.initializer as ts.CallExpression;

      const doc = tryExtractSignalInput(checker, propNode, callExpr, sourceFile);
      expect(doc).toBeNull();
    });
  });
});
