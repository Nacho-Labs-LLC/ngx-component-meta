import ts from 'typescript';
import type { OutputDoc } from '../types.js';
import { isAngularCoreCall, getSignalBaseName } from '../utils/import-tracker.js';
import { getUnwrappedReturnType } from '../utils/type-resolver.js';
import { getDescription, getRawDescription, getTags } from '../utils/jsdoc.js';
import { getStringProperty } from '../utils/ast-helpers.js';

/**
 * Try to extract a signal output() from a property declaration.
 * Returns null if the property is not a signal output.
 */
export function tryExtractSignalOutput(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  callExpr: ts.CallExpression,
): OutputDoc | null {
  if (!isAngularCoreCall(checker, callExpr)) return null;

  const baseName = getSignalBaseName(callExpr);
  if (baseName !== 'output') return null;

  const symbol = checker.getSymbolAtLocation(prop.name)!;
  const name = symbol.getName();

  // output<T>({ alias: 'myAlias' })
  const alias = extractOutputAlias(callExpr);

  return {
    name,
    bindingName: alias ?? name,
    type: getUnwrappedReturnType(checker, callExpr),
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
    source: 'signal',
  };
}

function extractOutputAlias(callExpr: ts.CallExpression): string | undefined {
  if (callExpr.arguments.length === 0) return undefined;
  const firstArg = callExpr.arguments[0];
  if (!ts.isObjectLiteralExpression(firstArg)) return undefined;
  return getStringProperty(firstArg, 'alias');
}
