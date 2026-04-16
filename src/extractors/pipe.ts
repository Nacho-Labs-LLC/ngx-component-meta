import ts from 'typescript';
import type { PipeDoc, MethodParamDoc, DecoratorInfo } from '../types.js';
import {
  getDecoratorObjectArg,
  getStringProperty,
  getBooleanProperty,
} from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, getParamDescription } from '../utils/jsdoc.js';
import { getParamDefaultValue } from '../utils/default-value.js';

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
  for (const member of classDecl.members) {
    if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === 'transform') {
      return member;
    }
  }
  return undefined;
}

function extractTransformSignature(
  checker: ts.TypeChecker,
  method: ts.MethodDeclaration,
  classSymbol: ts.Symbol,
  sourceFile: ts.SourceFile,
): { params: MethodParamDoc[]; returnType: string } {
  const methodSymbol = method.name ? checker.getSymbolAtLocation(method.name) : undefined;
  const signature = checker.getSignatureFromDeclaration(method);

  const params: MethodParamDoc[] = method.parameters.map(param => {
    const paramName = ts.isIdentifier(param.name) ? param.name.text : param.name.getText(sourceFile);
    const paramSymbol = checker.getSymbolAtLocation(param.name);
    const paramType = paramSymbol
      ? checker.getTypeOfSymbolAtLocation(paramSymbol, param)
      : checker.getTypeAtLocation(param);

    return {
      name: paramName,
      type: checker.typeToString(paramType, param, ts.TypeFormatFlags.NoTruncation),
      optional: !!param.questionToken || !!param.initializer,
      defaultValue: getParamDefaultValue(param, sourceFile),
      description: methodSymbol ? getParamDescription(checker, methodSymbol, paramName) : '',
    };
  });

  const returnType = signature
    ? checker.typeToString(
        checker.getReturnTypeOfSignature(signature),
        method,
        ts.TypeFormatFlags.NoTruncation,
      )
    : 'any';

  return { params, returnType };
}
