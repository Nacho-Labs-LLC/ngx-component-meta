import ts from '@typescript/typescript6';
import type { InjectableDoc, DecoratorInfo } from '../types.js';
import {
  getDecoratorObjectArg,
  getStringProperty,
  isPrivateMember,
} from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';
import { extractMethod } from './method.js';
import { extractProperty } from './property.js';

/**
 * Extract an @Injectable() class into an InjectableDoc.
 */
export function extractInjectable(
  checker: ts.TypeChecker,
  classDecl: ts.ClassDeclaration,
  decorator: DecoratorInfo,
  sourceFile: ts.SourceFile,
): InjectableDoc | null {
  const classSymbol = classDecl.name ? checker.getSymbolAtLocation(classDecl.name) : undefined;
  if (!classSymbol) return null;

  if (isInternal(classSymbol)) return null;

  const obj = getDecoratorObjectArg(decorator);
  const providedInRaw = obj ? getStringProperty(obj, 'providedIn') : undefined;
  const providedIn = (providedInRaw === 'root' || providedInRaw === 'platform' || providedInRaw === 'any')
    ? providedInRaw
    : null;

  const methods: InjectableDoc['methods'] = [];
  const properties: InjectableDoc['properties'] = [];

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

  return {
    name: classSymbol.getName(),
    filePath: sourceFile.fileName,
    providedIn,
    description: getDescription(checker, classSymbol),
    rawDescription: getRawDescription(classSymbol),
    tags: getTags(classSymbol),
    methods,
    properties,
  };
}
