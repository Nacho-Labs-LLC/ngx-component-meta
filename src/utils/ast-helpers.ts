import ts from 'typescript';
import type { DecoratorInfo, MethodParamDoc } from '../types.js';
import { getParamDefaultValue } from './default-value.js';
import { getParamDescription } from './jsdoc.js';

export function getDecorators(node: ts.HasDecorators): DecoratorInfo[] {
  const decorators = ts.getDecorators(node);
  if (!decorators) return [];

  return decorators
    .filter(d => ts.isCallExpression(d.expression))
    .map(d => {
      const call = d.expression as ts.CallExpression;
      const name = getDecoratorName(call);
      return {
        name: name ?? '',
        args: call.arguments,
        node: d,
      };
    })
    .filter(d => d.name !== '');
}

function getDecoratorName(call: ts.CallExpression): string | undefined {
  const expr = call.expression;
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return undefined;
}

export function findDecorator(node: ts.HasDecorators, name: string): DecoratorInfo | undefined {
  const decorators = ts.getDecorators(node);
  if (!decorators) return undefined;

  for (const d of decorators) {
    if (ts.isCallExpression(d.expression)) {
      const call = d.expression;
      const decoratorName = getDecoratorName(call);
      if (decoratorName === name) {
        return {
          name,
          args: call.arguments,
          node: d,
        };
      }
    }
  }
  return undefined;
}

function hasDecorator(node: ts.HasDecorators, name: string): boolean {
  return findDecorator(node, name) !== undefined;
}

export function getStringProperty(
  obj: ts.ObjectLiteralExpression,
  propertyName: string,
): string | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!ts.isIdentifier(prop.name) || prop.name.text !== propertyName) continue;
    if (ts.isStringLiteral(prop.initializer)) return prop.initializer.text;
  }
  return undefined;
}

export function getBooleanProperty(
  obj: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!ts.isIdentifier(prop.name) || prop.name.text !== propertyName) continue;
    if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (prop.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  }
  return undefined;
}

export function getDecoratorObjectArg(
  decorator: DecoratorInfo,
): ts.ObjectLiteralExpression | undefined {
  if (!decorator.args?.length) return undefined;
  const first = decorator.args[0];
  if (ts.isObjectLiteralExpression(first)) return first;
  return undefined;
}

export function getDecoratorStringArg(decorator: DecoratorInfo): string | undefined {
  if (!decorator.args?.length) return undefined;
  const first = decorator.args[0];
  if (ts.isStringLiteral(first)) return first.text;
  return undefined;
}

export function isPrivateMember(member: ts.ClassElement): boolean {
  if (ts.isPropertyDeclaration(member) || ts.isMethodDeclaration(member)) {
    // Check # private name
    if (member.name && ts.isPrivateIdentifier(member.name)) return true;
    // Check private modifier
    const modifiers = ts.getModifiers(member);
    return modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) ?? false;
  }
  return false;
}

export function isProtectedMember(member: ts.ClassElement): boolean {
  if (ts.isPropertyDeclaration(member) || ts.isMethodDeclaration(member)) {
    const modifiers = ts.getModifiers(member);
    return modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword) ?? false;
  }
  return false;
}

export function isReadonlyMember(member: ts.ClassElement): boolean {
  if (ts.isPropertyDeclaration(member)) {
    const modifiers = ts.getModifiers(member);
    return modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
  }
  return false;
}

export function getMemberName(member: ts.ClassElement): string | undefined {
  if (!member.name) return undefined;
  if (ts.isIdentifier(member.name)) return member.name.text;
  if (ts.isStringLiteral(member.name)) return member.name.text;
  return undefined;
}

export function getCallExpressionInitializer(
  prop: ts.PropertyDeclaration,
): ts.CallExpression | undefined {
  if (!prop.initializer) return undefined;
  if (ts.isCallExpression(prop.initializer)) return prop.initializer;
  return undefined;
}

function getNewExpressionName(
  prop: ts.PropertyDeclaration,
): string | undefined {
  if (!prop.initializer || !ts.isNewExpression(prop.initializer)) return undefined;
  const expr = prop.initializer.expression;
  if (ts.isIdentifier(expr)) return expr.text;
  return undefined;
}

export function getExpressionProperty(
  obj: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!ts.isIdentifier(prop.name) || prop.name.text !== propertyName) continue;
    return prop.initializer;
  }
  return undefined;
}

export function extractParams(
  checker: ts.TypeChecker,
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  sourceFile: ts.SourceFile,
  parentSymbol: ts.Symbol,
): MethodParamDoc[] {
  return parameters.map(param => {
    const paramName = ts.isIdentifier(param.name) ? param.name.text : param.name.getText(sourceFile);
    const paramSymbol = checker.getSymbolAtLocation(param.name);
    const paramType = paramSymbol
      ? checker.getTypeOfSymbolAtLocation(paramSymbol, param)
      : checker.getTypeAtLocation(param);

    return {
      name: paramName,
      type: checker.typeToString(paramType, param, ts.TypeFormatFlags.NoTruncation),
      optional: !!param.questionToken || !!param.initializer,
      defaultValue: getParamDefaultValue(param, sourceFile),
      description: getParamDescription(checker, parentSymbol, paramName),
    };
  });
}

export function getReturnTypeString(
  checker: ts.TypeChecker,
  signature: ts.Signature | undefined,
  node: ts.Node,
  fallback = 'void',
): string {
  if (!signature) return fallback;
  return checker.typeToString(
    checker.getReturnTypeOfSignature(signature),
    node,
    ts.TypeFormatFlags.NoTruncation,
  );
}
