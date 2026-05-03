import ts from 'typescript';
import type { FunctionDoc, MethodParamDoc } from '../types.js';
import { getDescription, getRawDescription, getTags, getParamDescription, isInternal } from '../utils/jsdoc.js';
import { getParamDefaultValue } from '../utils/default-value.js';

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

  const params: MethodParamDoc[] = node.parameters.map(param => {
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
      description: getParamDescription(checker, symbol, paramName),
    };
  });

  const returnType = signature
    ? checker.typeToString(
        checker.getReturnTypeOfSignature(signature),
        node,
        ts.TypeFormatFlags.NoTruncation,
      )
    : 'void';

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
