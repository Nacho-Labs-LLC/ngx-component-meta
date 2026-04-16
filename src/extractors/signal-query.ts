import ts from 'typescript';
import type { QueryDoc } from '../types.js';
import { isAngularCoreCall, getCallName, getSignalBaseName } from '../utils/import-tracker.js';
import { getUnwrappedReturnType } from '../utils/type-resolver.js';
import { getDescription, getRawDescription, getTags } from '../utils/jsdoc.js';

type QueryKind = QueryDoc['kind'];

const QUERY_FUNCTIONS: Record<string, QueryKind> = {
  viewChild: 'viewChild',
  viewChildren: 'viewChildren',
  contentChild: 'contentChild',
  contentChildren: 'contentChildren',
};

/**
 * Try to extract a signal query (viewChild, viewChildren, contentChild, contentChildren)
 * from a property declaration.
 * Returns null if the property is not a signal query.
 */
export function tryExtractSignalQuery(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile,
): QueryDoc | null {
  if (!isAngularCoreCall(checker, callExpr)) return null;

  const baseName = getSignalBaseName(callExpr);
  if (!baseName || !(baseName in QUERY_FUNCTIONS)) return null;

  const kind = QUERY_FUNCTIONS[baseName];
  const callName = getCallName(callExpr);
  const isRequired = callName === 'required';

  const symbol = checker.getSymbolAtLocation(prop.name)!;
  const name = symbol.getName();

  // First argument is the selector (string ref or component class)
  const selector = extractQuerySelector(callExpr, sourceFile);

  return {
    name,
    kind,
    selector,
    type: getUnwrappedReturnType(checker, callExpr),
    required: isRequired,
    source: 'signal',
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}

function extractQuerySelector(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile,
): string {
  if (callExpr.arguments.length === 0) return '';

  const firstArg = callExpr.arguments[0];
  if (ts.isStringLiteral(firstArg)) return firstArg.text;

  // Component/Directive class reference
  return firstArg.getText(sourceFile);
}
