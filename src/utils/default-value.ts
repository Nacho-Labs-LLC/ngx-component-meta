import ts from '@typescript/typescript6';

/**
 * Extract the default value as raw source text from a property initializer.
 * Returns undefined if no initializer is present.
 *
 * We intentionally return the raw source text rather than evaluating the expression.
 * This avoids ambiguity and matches react-docgen-typescript's behavior.
 * e.g., `'md'` → "'md'", `[1, 2, 3]` → "[1, 2, 3]", `true` → "true"
 */
export function getDefaultValue(
  prop: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
): string | undefined {
  if (!prop.initializer) return undefined;
  return prop.initializer.getText(sourceFile);
}

/**
 * Extract the default value from a signal input call expression.
 *
 * input('default') → "'default'"
 * input(42) → "42"
 * input([1, 2, 3]) → "[1, 2, 3]"
 * input() → undefined (no default for optional without value)
 * input.required() → undefined (required has no default)
 */
export function getSignalDefaultValue(
  callExpr: ts.CallExpression,
  sourceFile: ts.SourceFile,
  isRequired: boolean,
): string | undefined {
  if (isRequired) return undefined;

  const callee = callExpr.expression;

  // input() or model() — direct call
  if (ts.isIdentifier(callee)) {
    // If the function has arguments, first arg is the default value
    // input('hello') → "'hello'"
    if (callExpr.arguments.length > 0) {
      return callExpr.arguments[0].getText(sourceFile);
    }
    return undefined;
  }

  // input.required() — no default
  return undefined;
}

/**
 * Extract the default value from a parameter declaration.
 */
export function getParamDefaultValue(
  param: ts.ParameterDeclaration,
  sourceFile: ts.SourceFile,
): string | undefined {
  if (!param.initializer) return undefined;
  return param.initializer.getText(sourceFile);
}
