import ts from 'typescript';
import type { MethodDoc } from '../types.js';
import { isPrivateMember, isProtectedMember, getMemberName, extractParams, getReturnTypeString } from '../utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, isInternal } from '../utils/jsdoc.js';

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
  const params = extractParams(checker, method.parameters, sourceFile, symbol);
  const returnType = getReturnTypeString(checker, signature, method);

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
