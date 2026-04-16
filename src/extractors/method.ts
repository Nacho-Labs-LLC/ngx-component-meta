import ts from 'typescript';
import type { MethodDoc, MethodParamDoc } from '../types.js';
import { isPrivateMember, isProtectedMember, getMemberName } from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, getParamDescription, isInternal } from '../utils/jsdoc.js';
import { getParamDefaultValue } from '../utils/default-value.js';

/** Angular lifecycle hook method names. Excluded from output by default. */
const LIFECYCLE_HOOKS = new Set([
  'ngOnInit',
  'ngOnDestroy',
  'ngOnChanges',
  'ngDoCheck',
  'ngAfterViewInit',
  'ngAfterViewChecked',
  'ngAfterContentInit',
  'ngAfterContentChecked',
]);

/**
 * Extract a public method into a MethodDoc.
 * Returns null for private methods, lifecycle hooks, or unnamed methods.
 */
export function extractMethod(
  checker: ts.TypeChecker,
  method: ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
): MethodDoc | null {
  if (isPrivateMember(method)) return null;

  const name = getMemberName(method);
  if (!name || LIFECYCLE_HOOKS.has(name)) return null;

  const symbol = method.name ? checker.getSymbolAtLocation(method.name) : undefined;
  if (!symbol) return null;

  if (isInternal(symbol)) return null;

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
      description: getParamDescription(checker, symbol, paramName),
    };
  });

  const returnType = signature
    ? checker.typeToString(
        checker.getReturnTypeOfSignature(signature),
        method,
        ts.TypeFormatFlags.NoTruncation,
      )
    : 'void';

  return {
    name,
    params,
    returnType,
    modifier: isProtectedMember(method) ? 'protected' : 'public',
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}
