import ts from 'typescript';

/**
 * Verify that a symbol originates from a specific module (e.g., '@angular/core').
 * Checks both the original import module specifier AND the resolved file path.
 * This handles tsconfig `paths` mappings where the resolved path differs from the import.
 */
export function isImportFrom(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  moduleName: string,
): boolean {
  // First check: does the symbol come from an import with the expected module specifier?
  if (symbol.declarations) {
    for (const decl of symbol.declarations) {
      const importModuleSpecifier = getImportModuleSpecifier(decl);
      if (importModuleSpecifier && importModuleSpecifier.includes(moduleName)) {
        return true;
      }
    }
  }

  // Second check: follow aliases and check resolved file paths
  const resolved = resolveAliasedSymbol(checker, symbol);
  if (!resolved.declarations?.length) return false;

  for (const decl of resolved.declarations) {
    const sourceFile = decl.getSourceFile();
    if (sourceFile.fileName.includes(moduleName)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the module specifier string from an import declaration.
 * `import { input } from '@angular/core'` → '@angular/core'
 */
function getImportModuleSpecifier(decl: ts.Declaration): string | undefined {
  // ImportSpecifier → NamedImports → ImportClause → ImportDeclaration
  if (ts.isImportSpecifier(decl)) {
    const importDecl = decl.parent?.parent?.parent;
    if (importDecl && ts.isImportDeclaration(importDecl) && ts.isStringLiteral(importDecl.moduleSpecifier)) {
      return importDecl.moduleSpecifier.text;
    }
  }
  // NamespaceImport: import * as core from '@angular/core'
  if (ts.isNamespaceImport(decl)) {
    const importDecl = decl.parent?.parent;
    if (importDecl && ts.isImportDeclaration(importDecl) && ts.isStringLiteral(importDecl.moduleSpecifier)) {
      return importDecl.moduleSpecifier.text;
    }
  }
  return undefined;
}

/**
 * Check if a call expression's callee is imported from a given module.
 * Handles:
 *   - Direct calls: input(), output(), model()
 *   - Property access: input.required(), model.required()
 *   - Namespace: core.input()
 */
export function isAngularCoreCall(
  checker: ts.TypeChecker,
  callExpr: ts.CallExpression,
): boolean {
  return isCallFrom(checker, callExpr, '@angular/core');
}

export function isCallFrom(
  checker: ts.TypeChecker,
  callExpr: ts.CallExpression,
  moduleName: string,
): boolean {
  const callee = callExpr.expression;
  const baseIdentifier = getBaseIdentifier(callee);
  if (!baseIdentifier) return false;

  const symbol = checker.getSymbolAtLocation(baseIdentifier);
  if (!symbol) return false;

  return isImportFrom(checker, symbol, moduleName);
}

/**
 * Get the leftmost identifier from an expression.
 * - `input` → `input`
 * - `input.required` → `input`
 * - `core.input.required` → `core`
 */
function getBaseIdentifier(node: ts.Expression): ts.Identifier | undefined {
  if (ts.isIdentifier(node)) return node;
  if (ts.isPropertyAccessExpression(node)) return getBaseIdentifier(node.expression);
  return undefined;
}

/**
 * Get the function/property name from a call expression.
 * - `input()` → 'input'
 * - `input.required()` → 'required'
 * - `output()` → 'output'
 */
export function getCallName(callExpr: ts.CallExpression): string | undefined {
  const callee = callExpr.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return undefined;
}

/**
 * Get the base function name for signal calls.
 * - `input()` → 'input'
 * - `input.required()` → 'input'
 * - `model.required()` → 'model'
 */
export function getSignalBaseName(callExpr: ts.CallExpression): string | undefined {
  const callee = callExpr.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return callee.expression.text;
  }
  return undefined;
}

function resolveAliasedSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  while (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
}
