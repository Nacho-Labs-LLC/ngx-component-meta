import ts from '@typescript/typescript6';
import type { EnumDoc, EnumMemberDoc } from '../types.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';

/**
 * Extract an exported enum declaration into an EnumDoc.
 */
export function extractEnum(
  checker: ts.TypeChecker,
  node: ts.EnumDeclaration,
  sourceFile: ts.SourceFile,
): EnumDoc | null {
  const symbol = node.name ? checker.getSymbolAtLocation(node.name) : undefined;
  if (!symbol) return null;
  if (isInternal(symbol)) return null;

  const members: EnumMemberDoc[] = [];
  for (const member of node.members) {
    const memberSymbol = member.name ? checker.getSymbolAtLocation(member.name) : undefined;
    const name = member.name ? member.name.getText(sourceFile) : '';

    let value = '';
    if (member.initializer) {
      value = member.initializer.getText(sourceFile);
      // Strip quotes for string literals to give a clean value
      if (ts.isStringLiteral(member.initializer)) {
        value = member.initializer.text;
      }
    } else {
      // Numeric enums without explicit initializer: use the constant value
      const constantValue = checker.getConstantValue(member);
      if (constantValue !== undefined) {
        value = String(constantValue);
      }
    }

    const memberDescription = memberSymbol ? getDescription(checker, memberSymbol) : '';

    members.push({ name, value, description: memberDescription });
  }

  return {
    name: symbol.getName(),
    filePath: sourceFile.fileName,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
    members,
  };
}
