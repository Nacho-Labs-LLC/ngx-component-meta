import ts from 'typescript';
import type { DecoratorInfo } from '../types.js';

/**
 * Get all decorators from a class or class member declaration.
 * Uses ts.getDecorators (TS 5.0+) which reads from the modifiers array.
 */
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

/**
 * Find a specific decorator by name on a declaration.
 */
export function findDecorator(node: ts.HasDecorators, name: string): DecoratorInfo | undefined {
  return getDecorators(node).find(d => d.name === name);
}

/**
 * Check if a declaration has a specific decorator.
 */
export function hasDecorator(node: ts.HasDecorators, name: string): boolean {
  return findDecorator(node, name) !== undefined;
}

/**
 * Get the name of a decorator from its call expression.
 * @Component() → 'Component', @Input() → 'Input'
 */
function getDecoratorName(call: ts.CallExpression): string | undefined {
  const expr = call.expression;
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return undefined;
}

/**
 * Extract a string property from an object literal expression.
 * e.g., from `{ selector: 'app-button', standalone: true }` get 'selector' → 'app-button'
 */
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

/**
 * Extract a boolean property from an object literal expression.
 */
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

/**
 * Get the first argument of a decorator as an object literal.
 */
export function getDecoratorObjectArg(
  decorator: DecoratorInfo,
): ts.ObjectLiteralExpression | undefined {
  if (!decorator.args?.length) return undefined;
  const first = decorator.args[0];
  if (ts.isObjectLiteralExpression(first)) return first;
  return undefined;
}

/**
 * Get the first argument of a decorator as a string literal.
 * Used for @Input('aliasName') and @Output('aliasName').
 */
export function getDecoratorStringArg(decorator: DecoratorInfo): string | undefined {
  if (!decorator.args?.length) return undefined;
  const first = decorator.args[0];
  if (ts.isStringLiteral(first)) return first.text;
  return undefined;
}

/**
 * Check if a class member is private (private keyword or # prefix).
 */
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

/**
 * Check if a class member is protected.
 */
export function isProtectedMember(member: ts.ClassElement): boolean {
  if (ts.isPropertyDeclaration(member) || ts.isMethodDeclaration(member)) {
    const modifiers = ts.getModifiers(member);
    return modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword) ?? false;
  }
  return false;
}

/**
 * Check if a class member has the readonly modifier.
 */
export function isReadonlyMember(member: ts.ClassElement): boolean {
  if (ts.isPropertyDeclaration(member)) {
    const modifiers = ts.getModifiers(member);
    return modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
  }
  return false;
}

/**
 * Get the member name as a string.
 */
export function getMemberName(member: ts.ClassElement): string | undefined {
  if (!member.name) return undefined;
  if (ts.isIdentifier(member.name)) return member.name.text;
  if (ts.isStringLiteral(member.name)) return member.name.text;
  return undefined;
}

/**
 * Check if a property has a call expression initializer (e.g., input(), output()).
 */
export function getCallExpressionInitializer(
  prop: ts.PropertyDeclaration,
): ts.CallExpression | undefined {
  if (!prop.initializer) return undefined;
  if (ts.isCallExpression(prop.initializer)) return prop.initializer;
  return undefined;
}

/**
 * Get the expression name from a property's initializer if it's a `new` expression.
 * e.g., `new EventEmitter<T>()` → 'EventEmitter'
 */
export function getNewExpressionName(
  prop: ts.PropertyDeclaration,
): string | undefined {
  if (!prop.initializer || !ts.isNewExpression(prop.initializer)) return undefined;
  const expr = prop.initializer.expression;
  if (ts.isIdentifier(expr)) return expr.text;
  return undefined;
}

/**
 * Get an expression property from an object literal (returns the expression node).
 * Used for extracting transform functions.
 */
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
