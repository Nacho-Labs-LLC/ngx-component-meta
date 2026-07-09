import ts from '@typescript/typescript6';
import type { InputDoc, ModelDoc } from '../types.js';
import { getCallName, getSignalBaseName } from '../utils/import-tracker.js';
import { getUnwrappedReturnType } from '../utils/type-resolver.js';
import { getSignalDefaultValue } from '../utils/default-value.js';
import { getDescription, getRawDescription, getTags } from '../utils/jsdoc.js';
import { getStringProperty, getExpressionProperty } from '../utils/ast-helpers.js';

/**
 * Try to extract a signal input() or model() from a property declaration.
 * Returns null if the property is not a signal input/model.
 */
export function tryExtractSignalInput(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile,
): InputDoc | null {
  const baseName = getSignalBaseName(callExpr);
  if (baseName !== 'input') return null;

  const callName = getCallName(callExpr);
  const isRequired = callName === 'required';

  const symbol = checker.getSymbolAtLocation(prop.name)!;
  const name = symbol.getName();

  // Resolve alias and transform from options
  const { alias, transform } = extractInputOptions(callExpr, sourceFile, isRequired);

  return {
    name,
    bindingName: alias ?? name,
    type: getUnwrappedReturnType(checker, callExpr),
    required: isRequired,
    defaultValue: getSignalDefaultValue(callExpr, sourceFile, isRequired),
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
    source: 'signal',
    transform,
  };
}

/**
 * Try to extract a model() signal from a property declaration.
 * Returns null if the property is not a model signal.
 */
export function tryExtractModel(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile,
): ModelDoc | null {
  const baseName = getSignalBaseName(callExpr);
  if (baseName !== 'model') return null;

  const callName = getCallName(callExpr);
  const isRequired = callName === 'required';

  const symbol = checker.getSymbolAtLocation(prop.name)!;
  const name = symbol.getName();

  const alias = extractModelAlias(callExpr, isRequired);

  return {
    name,
    bindingName: alias ?? name,
    type: getUnwrappedReturnType(checker, callExpr),
    required: isRequired,
    defaultValue: getSignalDefaultValue(callExpr, sourceFile, isRequired),
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}

/**
 * Extract alias and transform from signal input options.
 *
 * input('default', { alias: 'myAlias', transform: booleanAttribute })
 * input.required({ alias: 'myAlias', transform: numberAttribute })
 */
function extractInputOptions(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile,
  isRequired: boolean,
): { alias: string | undefined; transform: string | null } {
  const optionsArg = getOptionsArg(callExpr, isRequired);
  if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) {
    return { alias: undefined, transform: null };
  }

  const alias = getStringProperty(optionsArg, 'alias');
  const transformExpr = getExpressionProperty(optionsArg, 'transform');
  const transform = transformExpr ? transformExpr.getText(sourceFile) : null;

  return { alias, transform };
}

/**
 * Extract alias from model options.
 */
function extractModelAlias(
  callExpr: ts.CallExpression,
  isRequired: boolean,
): string | undefined {
  const optionsArg = getOptionsArg(callExpr, isRequired);
  if (!optionsArg || !ts.isObjectLiteralExpression(optionsArg)) return undefined;
  return getStringProperty(optionsArg, 'alias');
}

/**
 * Get the options argument from a signal call.
 * For input('default', opts) — options is arg[1]
 * For input.required(opts) — options is arg[0]
 * For input(opts) — if the first arg is an object literal, it could be options (no default)
 *   but actually input() with no type param and an object is ambiguous.
 *   In practice: input.required<T>({ alias }) or input<T>(defaultVal, { alias })
 */
function getOptionsArg(
  callExpr: ts.CallExpression,
  isRequired: boolean,
): ts.Expression | undefined {
  if (isRequired) {
    // input.required<T>({ alias: ..., transform: ... })
    return callExpr.arguments[0];
  }
  // input<T>(defaultValue, { alias: ..., transform: ... })
  if (callExpr.arguments.length >= 2) {
    return callExpr.arguments[1];
  }
  return undefined;
}
