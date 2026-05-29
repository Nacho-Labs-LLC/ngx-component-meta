import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  getDecorators,
  findDecorator,
  getStringProperty,
  getBooleanProperty,
  getDecoratorObjectArg,
  getDecoratorStringArg,
  isPrivateMember,
  isProtectedMember,
  isReadonlyMember,
  getMemberName,
  getCallExpressionInitializer,
  getExpressionProperty,
  extractParams,
  getReturnTypeString
} from '../../src/utils/ast-helpers.js';

// Helper to create TS nodes from a string
function createNode(sourceText: string) {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  // Return the first statement's expression or declaration to make targeting easier
  if (sourceFile.statements.length > 0) {
    const firstStatement = sourceFile.statements[0];
    if (ts.isClassDeclaration(firstStatement)) {
      return { sourceFile, node: firstStatement };
    }
    if (ts.isExpressionStatement(firstStatement)) {
       return { sourceFile, node: firstStatement.expression };
    }
    if (ts.isVariableStatement(firstStatement)) {
       return { sourceFile, node: firstStatement.declarationList.declarations[0] };
    }
  }
  return { sourceFile, node: sourceFile };
}


describe('Decorator Helpers', () => {
  it('getDecorators should extract decorators correctly', () => {
    const code = `@Component({ selector: 'app-root' }) @Injectable() class MyClass {}`;
    const { node } = createNode(code) as { node: ts.ClassDeclaration };
    const decorators = getDecorators(node);

    expect(decorators).toHaveLength(2);
    expect(decorators[0].name).toBe('Component');
    expect(decorators[1].name).toBe('Injectable');
  });

  it('getDecorators should return empty array if no decorators', () => {
    const code = `class MyClass {}`;
    const { node } = createNode(code) as { node: ts.ClassDeclaration };
    const decorators = getDecorators(node);
    expect(decorators).toEqual([]);
  });

  it('findDecorator should find a specific decorator by name', () => {
    const code = `@Component({ selector: 'app-root' }) @Injectable() class MyClass {}`;
    const { node } = createNode(code) as { node: ts.ClassDeclaration };

    const componentDecorator = findDecorator(node, 'Component');
    expect(componentDecorator).toBeDefined();
    expect(componentDecorator?.name).toBe('Component');

    const nonExistent = findDecorator(node, 'Directive');
    expect(nonExistent).toBeUndefined();
  });

  it('getDecoratorObjectArg should get the first object literal argument', () => {
    const code = `@Component({ selector: 'app-root' }) class MyClass {}`;
    const { node } = createNode(code) as { node: ts.ClassDeclaration };

    const componentDecorator = findDecorator(node, 'Component');
    const objArg = getDecoratorObjectArg(componentDecorator!);

    expect(objArg).toBeDefined();
    expect(ts.isObjectLiteralExpression(objArg!)).toBe(true);
  });

  it('getDecoratorObjectArg should return undefined if not an object literal', () => {
    const code = `@Injectable('providedIn') class MyClass {}`;
    const { node } = createNode(code) as { node: ts.ClassDeclaration };

    const injectableDecorator = findDecorator(node, 'Injectable');
    const objArg = getDecoratorObjectArg(injectableDecorator!);

    expect(objArg).toBeUndefined();
  });

  it('getDecoratorStringArg should get the first string argument', () => {
    const code = `@Input('aliasName') myInput: string;`;
    const { node } = createNode(code) as { node: ts.VariableDeclaration };
    const classCode = `class MyClass { ${code} }`;
    const { node: classNode } = createNode(classCode) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0];

    const inputDecorator = findDecorator(prop, 'Input');
    const strArg = getDecoratorStringArg(inputDecorator!);

    expect(strArg).toBe('aliasName');
  });

  it('getDecoratorStringArg should return undefined if not a string literal', () => {
    const code = `@Input({ alias: 'aliasName' }) myInput: string;`;
    const classCode = `class MyClass { ${code} }`;
    const { node: classNode } = createNode(classCode) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0];

    const inputDecorator = findDecorator(prop, 'Input');
    const strArg = getDecoratorStringArg(inputDecorator!);

    expect(strArg).toBeUndefined();
  });
});

describe('Class Member Modifiers', () => {
  it('isPrivateMember should return true for private modifier', () => {
    const code = `class MyClass { private myProp = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0];

    expect(isPrivateMember(prop)).toBe(true);
  });

  it('isPrivateMember should return true for # private identifier', () => {
    const code = `class MyClass { #myProp = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0];

    expect(isPrivateMember(prop)).toBe(true);
  });

  it('isPrivateMember should return false for public members', () => {
    const code = `class MyClass { public myProp = 1; myOtherProp = 2; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };

    expect(isPrivateMember(classNode.members[0])).toBe(false);
    expect(isPrivateMember(classNode.members[1])).toBe(false);
  });

  it('isProtectedMember should return true for protected modifier', () => {
    const code = `class MyClass { protected myProp = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0];

    expect(isProtectedMember(prop)).toBe(true);
  });

  it('isProtectedMember should return false for public/private members', () => {
    const code = `class MyClass { public myProp = 1; private myPrivate = 2; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };

    expect(isProtectedMember(classNode.members[0])).toBe(false);
    expect(isProtectedMember(classNode.members[1])).toBe(false);
  });

  it('isReadonlyMember should return true for readonly modifier', () => {
    const code = `class MyClass { readonly myProp = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0];

    expect(isReadonlyMember(prop)).toBe(true);
  });

  it('isReadonlyMember should return false for non-readonly members', () => {
    const code = `class MyClass { myProp = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };

    expect(isReadonlyMember(classNode.members[0])).toBe(false);
  });

  it('getMemberName should return name for identifier', () => {
    const code = `class MyClass { myProp = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };

    expect(getMemberName(classNode.members[0])).toBe('myProp');
  });

  it('getMemberName should return name for string literal', () => {
    const code = `class MyClass { 'my-prop' = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };

    expect(getMemberName(classNode.members[0])).toBe('my-prop');
  });

  it('getMemberName should return undefined for computed names without a simple literal', () => {
    const code = `const a = 'prop'; class MyClass { [a] = 1; }`;
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    const classNode = sourceFile.statements.find(ts.isClassDeclaration);

    expect(getMemberName(classNode!.members[0])).toBeUndefined();
  });
});

describe('Object and Expression Properties', () => {
  it('getStringProperty should get a string value from an object literal', () => {
    const code = `const obj = { prop1: 'value1', prop2: 123 };`;
    const { node } = createNode(code) as { node: ts.VariableDeclaration };
    const objLiteral = node.initializer as ts.ObjectLiteralExpression;

    expect(getStringProperty(objLiteral, 'prop1')).toBe('value1');
    expect(getStringProperty(objLiteral, 'prop2')).toBeUndefined();
    expect(getStringProperty(objLiteral, 'nonExistent')).toBeUndefined();
  });

  it('getBooleanProperty should get a boolean value from an object literal', () => {
    const code = `const obj = { propTrue: true, propFalse: false, propString: 'true' };`;
    const { node } = createNode(code) as { node: ts.VariableDeclaration };
    const objLiteral = node.initializer as ts.ObjectLiteralExpression;

    expect(getBooleanProperty(objLiteral, 'propTrue')).toBe(true);
    expect(getBooleanProperty(objLiteral, 'propFalse')).toBe(false);
    expect(getBooleanProperty(objLiteral, 'propString')).toBeUndefined();
    expect(getBooleanProperty(objLiteral, 'nonExistent')).toBeUndefined();
  });

  it('getExpressionProperty should get the initializer expression', () => {
    const code = `const obj = { prop1: myFunc() };`;
    const { node } = createNode(code) as { node: ts.VariableDeclaration };
    const objLiteral = node.initializer as ts.ObjectLiteralExpression;

    const expr = getExpressionProperty(objLiteral, 'prop1');
    expect(expr).toBeDefined();
    expect(ts.isCallExpression(expr!)).toBe(true);
  });

  it('getCallExpressionInitializer should return a call expression if present', () => {
    const code = `class MyClass { myProp = signal(1); }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0] as ts.PropertyDeclaration;

    const callExpr = getCallExpressionInitializer(prop);
    expect(callExpr).toBeDefined();
    expect(ts.isCallExpression(callExpr!)).toBe(true);
  });

  it('getCallExpressionInitializer should return undefined if not a call expression', () => {
    const code = `class MyClass { myProp = 1; }`;
    const { node: classNode } = createNode(code) as { node: ts.ClassDeclaration };
    const prop = classNode.members[0] as ts.PropertyDeclaration;

    const callExpr = getCallExpressionInitializer(prop);
    expect(callExpr).toBeUndefined();
  });
});

describe('Complex Helpers (TypeChecker required)', () => {
  // Helper to compile some code and get a checker
  function setupChecker(sourceText: string) {
    const filename = 'test.ts';
    const sourceFile = ts.createSourceFile(
      filename,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    // Create a real program so we have a functional type checker
    const compilerHost = ts.createCompilerHost({});
    const originalGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (fileName === filename) return sourceFile;
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    const program = ts.createProgram([filename], {}, compilerHost);
    const checker = program.getTypeChecker();
    return { checker, sourceFile, program };
  }

  it('extractParams should extract parameters with types and default values', () => {
    const code = `
      class MyClass {
        /**
         * @param param1 first param
         * @param param2 second param
         */
        myMethod(param1: string, param2: number = 42, param3?: boolean) {}
      }
    `;
    const { checker, sourceFile } = setupChecker(code);
    const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;
    const methodNode = classNode.members.find(ts.isMethodDeclaration)!;

    // Get symbol for the method (required for jsdoc descriptions)
    const methodSymbol = checker.getSymbolAtLocation(methodNode.name)!;

    const params = extractParams(checker, methodNode.parameters, sourceFile, methodSymbol);

    expect(params).toHaveLength(3);

    expect(params[0].name).toBe('param1');
    expect(params[0].type).toBe('string');
    expect(params[0].optional).toBe(false);
    expect(params[0].defaultValue).toBeUndefined();

    expect(params[1].name).toBe('param2');
    expect(params[1].type).toBe('number');
    expect(params[1].optional).toBe(true); // Has initializer
    expect(params[1].defaultValue).toBe('42');

    expect(params[2].name).toBe('param3');
    expect(params[2].type).toBe('boolean');
    expect(params[2].optional).toBe(true); // Has question token
    expect(params[2].defaultValue).toBeUndefined();
  });

  it('getReturnTypeString should get the return type of a method signature', () => {
    const code = `
      class MyClass {
        myMethod(): string { return 'hello'; }
      }
    `;
    const { checker, sourceFile } = setupChecker(code);
    const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;
    const methodNode = classNode.members.find(ts.isMethodDeclaration)!;

    const signature = checker.getSignatureFromDeclaration(methodNode);
    const returnTypeStr = getReturnTypeString(checker, signature, methodNode);

    expect(returnTypeStr).toBe('string');
  });

  it('getReturnTypeString should use fallback if signature is undefined', () => {
    const code = `class MyClass { }`;
    const { checker, sourceFile } = setupChecker(code);
    const classNode = sourceFile.statements.find(ts.isClassDeclaration)!;

    const returnTypeStr = getReturnTypeString(checker, undefined, classNode, 'any');
    expect(returnTypeStr).toBe('any');
  });
});
