import ts from '@typescript/typescript6';

/** Known Angular signal wrapper type names that should be unwrapped. */
const SIGNAL_WRAPPER_TYPES = new Set([
  'InputSignal',
  'InputSignalWithTransform',
  'OutputEmitterRef',
  'ModelSignal',
  'Signal',
]);

/**
 * Resolve a type to a human-readable string.
 * Unwraps Angular signal wrapper types (InputSignal<T> → T).
 */
export function typeToString(
  checker: ts.TypeChecker,
  type: ts.Type,
  enclosingDecl?: ts.Node,
): string {
  const unwrapped = unwrapSignalType(checker, type);
  return checker.typeToString(
    unwrapped,
    enclosingDecl,
    ts.TypeFormatFlags.NoTruncation,
  );
}

/**
 * Unwrap Angular signal wrapper types:
 *   InputSignal<string> → string
 *   OutputEmitterRef<MouseEvent> → MouseEvent
 *   ModelSignal<boolean> → boolean
 */
function unwrapSignalType(checker: ts.TypeChecker, type: ts.Type): ts.Type {
  const typeName = type.symbol?.name ?? type.aliasSymbol?.name;
  if (!typeName || !SIGNAL_WRAPPER_TYPES.has(typeName)) return type;

  const typeArgs = getTypeArguments(checker, type);
  if (typeArgs.length === 0) return type;

  return typeArgs[0];
}

/**
 * Get type arguments from a generic type reference.
 */
function getTypeArguments(checker: ts.TypeChecker, type: ts.Type): readonly ts.Type[] {
  if (type.isUnionOrIntersection()) return [];
  return checker.getTypeArguments(type as ts.TypeReference);
}

/**
 * Get the return type of a call expression, then unwrap it.
 * Used for signal functions: input<string>() → string
 */
export function getUnwrappedReturnType(
  checker: ts.TypeChecker,
  callExpr: ts.CallExpression,
): string {
  const signature = checker.getResolvedSignature(callExpr);
  if (!signature) return 'unknown';

  const returnType = checker.getReturnTypeOfSignature(signature);
  return typeToString(checker, returnType, callExpr);
}

/**
 * Get the event type from an EventEmitter<T> or OutputEmitterRef<T>.
 * Falls back to the raw type string if not a recognized emitter.
 */
export function getEmitterEventType(
  checker: ts.TypeChecker,
  type: ts.Type,
  enclosingDecl?: ts.Node,
): string {
  const name = type.symbol?.name;
  if (name === 'EventEmitter' || name === 'OutputEmitterRef') {
    const typeArgs = getTypeArguments(checker, type);
    if (typeArgs.length > 0) {
      return checker.typeToString(typeArgs[0], enclosingDecl, ts.TypeFormatFlags.NoTruncation);
    }
    return 'void';
  }
  return checker.typeToString(type, enclosingDecl, ts.TypeFormatFlags.NoTruncation);
}

/**
 * Resolve the type of a class property symbol.
 */
export function getPropertyType(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  decl: ts.Declaration,
): ts.Type {
  return checker.getTypeOfSymbolAtLocation(symbol, decl);
}

/**
 * Check if a type includes `undefined` (i.e., is optional).
 */
export function isOptionalType(type: ts.Type): boolean {
  if (type.isUnion()) {
    return type.types.some(t => t.flags & ts.TypeFlags.Undefined);
  }
  return false;
}
