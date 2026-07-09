import ts from '@typescript/typescript6';
import type { FunctionDoc } from '../types.js';
import { extractParams, getReturnTypeString } from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';

/**
 * Extract an exported function declaration into a FunctionDoc.
 */
export function extractFunction(
  checker: ts.TypeChecker,
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
): FunctionDoc | null {
  const symbol = node.name ? checker.getSymbolAtLocation(node.name) : undefined;
  if (!symbol) return null;
  if (isInternal(symbol)) return null;

  const signature = checker.getSignatureFromDeclaration(node);
  const params = extractParams(checker, node.parameters, sourceFile, symbol);
  const returnType = getReturnTypeString(checker, signature, node);

  return {
    name: symbol.getName(),
    filePath: sourceFile.fileName,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
    params,
    returnType,
  };
}
