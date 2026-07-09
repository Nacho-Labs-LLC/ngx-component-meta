import ts from '@typescript/typescript6';
import type { TypeAliasDoc } from '../types.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';

/**
 * Extract an exported type alias declaration into a TypeAliasDoc.
 */
export function extractTypeAlias(
  checker: ts.TypeChecker,
  node: ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
): TypeAliasDoc | null {
  const symbol = node.name ? checker.getSymbolAtLocation(node.name) : undefined;
  if (!symbol) return null;
  if (isInternal(symbol)) return null;

  // Use the type node text directly — getDeclaredTypeOfSymbol returns the alias
  // name itself (e.g. 'ButtonSize'), not the expanded type ('sm' | 'md' | 'lg').
  const typeString = node.type.getText(sourceFile);

  return {
    name: symbol.getName(),
    filePath: sourceFile.fileName,
    type: typeString,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}
