import ts from '@typescript/typescript6';
import type { PipeDoc, MethodParamDoc, DecoratorInfo } from '../types.js';
import {
  getDecoratorObjectArg,
  getStringProperty,
  getBooleanProperty,
  extractParams,
  getReturnTypeString,
} from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags } from '../utils/jsdoc.js';

/**
 * Extract a @Pipe() class into a PipeDoc.
 */
export function extractPipe(
  checker: ts.TypeChecker,
  classDecl: ts.ClassDeclaration,
  decorator: DecoratorInfo,
  sourceFile: ts.SourceFile,
): PipeDoc | null {
  const classSymbol = classDecl.name ? checker.getSymbolAtLocation(classDecl.name) : undefined;
  if (!classSymbol) return null;

  const obj = getDecoratorObjectArg(decorator);
  const pipeName = obj ? getStringProperty(obj, 'name') : undefined;
  if (!pipeName) return null;

  const standalone = obj ? (getBooleanProperty(obj, 'standalone') ?? true) : true;
  const pure = obj ? (getBooleanProperty(obj, 'pure') ?? true) : true;

  // Find the transform() method
  const transformMethod = findTransformMethod(classDecl);
  const transformDoc = transformMethod
    ? extractTransformSignature(checker, transformMethod, classSymbol, sourceFile)
    : { params: [], returnType: 'any' };

  return {
    name: classSymbol.getName(),
    filePath: sourceFile.fileName,
    pipeName,
    standalone,
    pure,
    description: getDescription(checker, classSymbol),
    rawDescription: getRawDescription(classSymbol),
    tags: getTags(classSymbol),
    transform: transformDoc,
  };
}

function findTransformMethod(classDecl: ts.ClassDeclaration): ts.MethodDeclaration | undefined {
  return classDecl.members.find(
    (member) => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === 'transform'
  ) as ts.MethodDeclaration | undefined;
}

function extractTransformSignature(
  checker: ts.TypeChecker,
  method: ts.MethodDeclaration,
  classSymbol: ts.Symbol,
  sourceFile: ts.SourceFile,
): { params: MethodParamDoc[]; returnType: string } {
  const methodSymbol = method.name ? checker.getSymbolAtLocation(method.name) : undefined;
  const signature = checker.getSignatureFromDeclaration(method);
  const params = methodSymbol
    ? extractParams(checker, method.parameters, sourceFile, methodSymbol)
    : extractParams(checker, method.parameters, sourceFile, classSymbol);
  const returnType = getReturnTypeString(checker, signature, method, 'any');
  return { params, returnType };
}
