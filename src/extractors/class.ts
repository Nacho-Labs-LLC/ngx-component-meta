import ts from '@typescript/typescript6';
import type { ClassDoc } from '../types.js';
import { isPrivateMember } from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';
import { extractMethod } from './method.js';
import { extractProperty } from './property.js';

/**
 * Extract an exported class declaration (without Angular decorators) into a ClassDoc.
 */
export function extractClass(
  checker: ts.TypeChecker,
  classDecl: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): ClassDoc | null {
  const classSymbol = classDecl.name ? checker.getSymbolAtLocation(classDecl.name) : undefined;
  if (!classSymbol) return null;
  if (isInternal(classSymbol)) return null;

  const methods: ClassDoc['methods'] = [];
  const properties: ClassDoc['properties'] = [];

  for (const member of classDecl.members) {
    if (isPrivateMember(member)) continue;

    if (ts.isMethodDeclaration(member)) {
      const methodDoc = extractMethod(checker, member, sourceFile);
      if (methodDoc) methods.push(methodDoc);
    } else if (ts.isPropertyDeclaration(member)) {
      const propDoc = extractProperty(checker, member, sourceFile);
      if (propDoc) properties.push(propDoc);
    }
  }

  const implementsList = classDecl.heritageClauses
    ?.filter(h => h.token === ts.SyntaxKind.ImplementsKeyword)
    .flatMap(h => h.types.map(t => t.getText(sourceFile)))
    ?? [];

  const extendsClause = classDecl.heritageClauses?.find(
    h => h.token === ts.SyntaxKind.ExtendsKeyword,
  );
  const extendsName = extendsClause?.types[0]?.getText(sourceFile) ?? null;

  return {
    name: classSymbol.getName(),
    filePath: sourceFile.fileName,
    description: getDescription(checker, classSymbol),
    rawDescription: getRawDescription(classSymbol),
    tags: getTags(classSymbol),
    methods,
    properties,
    extends: extendsName,
    implements: implementsList,
  };
}
