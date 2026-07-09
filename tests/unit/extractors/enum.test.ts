import { describe, it, expect } from 'vitest';
import ts from '@typescript/typescript6';
import { extractEnum } from '../../../src/extractors/enum.js';

describe('extractEnum', () => {
  function setup(sourceCode: string) {
    const filename = 'test.ts';
    const compilerHost = ts.createCompilerHost({});
    compilerHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (fileName === filename) {
        return ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true);
      }
      return ts.createSourceFile(fileName, '', ts.ScriptTarget.Latest, true);
    };

    const program = ts.createProgram([filename], {}, compilerHost);
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(filename)!;

    let enumNode: ts.EnumDeclaration | undefined;
    ts.forEachChild(sourceFile, node => {
      if (ts.isEnumDeclaration(node)) {
        enumNode = node;
      }
    });

    if (!enumNode) throw new Error("No enum found in source code");

    return { checker, enumNode, sourceFile };
  }

  it('should extract a simple enum with string initializers', () => {
    const { checker, enumNode, sourceFile } = setup(`
      export enum Theme {
        Light = 'light',
        Dark = "dark"
      }
    `);

    const doc = extractEnum(checker, enumNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('Theme');
    expect(doc?.members).toHaveLength(2);
    expect(doc?.members[0].name).toBe('Light');
    expect(doc?.members[0].value).toBe('light'); // quotes stripped
    expect(doc?.members[1].name).toBe('Dark');
    expect(doc?.members[1].value).toBe('dark'); // quotes stripped
  });

  it('should extract an enum with numeric initializers', () => {
    const { checker, enumNode, sourceFile } = setup(`
      export enum Status {
        Ok = 200,
        NotFound = 404
      }
    `);

    const doc = extractEnum(checker, enumNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('Status');
    expect(doc?.members).toHaveLength(2);
    expect(doc?.members[0].name).toBe('Ok');
    expect(doc?.members[0].value).toBe('200');
    expect(doc?.members[1].name).toBe('NotFound');
    expect(doc?.members[1].value).toBe('404');
  });

  it('should extract an enum without explicit initializers', () => {
    const { checker, enumNode, sourceFile } = setup(`
      export enum Direction {
        Up,
        Down,
        Left,
        Right
      }
    `);

    const doc = extractEnum(checker, enumNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('Direction');
    expect(doc?.members).toHaveLength(4);
    expect(doc?.members[0].name).toBe('Up');
    expect(doc?.members[0].value).toBe('0');
    expect(doc?.members[1].name).toBe('Down');
    expect(doc?.members[1].value).toBe('1');
    expect(doc?.members[2].name).toBe('Left');
    expect(doc?.members[2].value).toBe('2');
    expect(doc?.members[3].name).toBe('Right');
    expect(doc?.members[3].value).toBe('3');
  });

  it('should extract descriptions and tags from enum and members', () => {
    const { checker, enumNode, sourceFile } = setup(`
      /**
       * The user role
       * @since 1.0.0
       */
      export enum Role {
        /** Administrator role */
        Admin = 'admin',
        /** Standard user */
        User = 'user'
      }
    `);

    const doc = extractEnum(checker, enumNode, sourceFile);

    expect(doc).toBeDefined();
    expect(doc?.name).toBe('Role');
    expect(doc?.description).toBe('The user role');
    expect(doc?.rawDescription).toBe('The user role');
    expect(doc?.tags).toBeDefined();
    expect(doc?.tags?.['since']).toBe('1.0.0');

    expect(doc?.members).toHaveLength(2);
    expect(doc?.members[0].name).toBe('Admin');
    expect(doc?.members[0].description).toBe('Administrator role');
    expect(doc?.members[1].name).toBe('User');
    expect(doc?.members[1].description).toBe('Standard user');
  });

  it('should skip internal enums', () => {
    const { checker, enumNode, sourceFile } = setup(`
      /**
       * @internal
       */
      export enum InternalEnum {
        A, B
      }
    `);

    const doc = extractEnum(checker, enumNode, sourceFile);

    expect(doc).toBeNull();
  });

  it('should return null if symbol cannot be resolved', () => {
    const { checker, enumNode, sourceFile } = setup(`
      export enum MyEnum { A }
    `);

    // Create a fake node without a name
    const fakeNode = {
      ...enumNode,
      name: undefined
    } as unknown as ts.EnumDeclaration;

    const doc = extractEnum(checker, fakeNode, sourceFile);
    expect(doc).toBeNull();
  });
});
