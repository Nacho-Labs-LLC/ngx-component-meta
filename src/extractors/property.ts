import ts from '@typescript/typescript6';
import type { PropertyDoc } from '../types.js';
import {
  isPrivateMember,
  isProtectedMember,
  isReadonlyMember,
  getMemberName,
} from '../utils/ast-helpers.js';
import { typeToString, isOptionalType } from '../utils/type-resolver.js';
import { getDefaultValue } from '../utils/default-value.js';
import { getDescription, getRawDescription, getTags } from '../utils/jsdoc.js';

/**
 * Extract a plain class property into a PropertyDoc.
 * Returns null for private properties or unnamed properties.
 */
export function extractProperty(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
): PropertyDoc | null {
  if (isPrivateMember(prop)) return null;

  const name = getMemberName(prop);
  if (!name) return null;

  // Skip underscore-prefixed properties (convention for internal)
  if (name.startsWith('_')) return null;

  const symbol = checker.getSymbolAtLocation(prop.name);
  if (!symbol) return null;

  const type = checker.getTypeOfSymbolAtLocation(symbol, prop);

  let modifier: PropertyDoc['modifier'] = 'public';
  if (isProtectedMember(prop)) modifier = 'protected';
  else if (isReadonlyMember(prop)) modifier = 'readonly';

  return {
    name,
    type: typeToString(checker, type, prop),
    defaultValue: getDefaultValue(prop, sourceFile),
    optional: !!prop.questionToken || isOptionalType(type),
    modifier,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}
