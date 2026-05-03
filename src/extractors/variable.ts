import ts from 'typescript';
import type { VariableDoc } from '../types.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';

/**
 * Extract an exported variable declaration into a VariableDoc.
 */
export function extractVariable(
  checker: ts.TypeChecker,
  decl: ts.VariableDeclaration,
  isConst: boolean,
  sourceFile: ts.SourceFile,
): VariableDoc | null {
  const symbol = decl.name && ts.isIdentifier(decl.name)
    ? checker.getSymbolAtLocation(decl.name)
    : undefined;
  if (!symbol) return null;
  if (isInternal(symbol)) return null;

  const type = checker.getTypeOfSymbolAtLocation(symbol, decl);

  const defaultValue = decl.initializer
    ? decl.initializer.getText(sourceFile)
    : undefined;

  return {
    name: symbol.getName(),
    filePath: sourceFile.fileName,
    type: checker.typeToString(type, decl, ts.TypeFormatFlags.NoTruncation),
    defaultValue,
    isConst,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}
