import ts from '@typescript/typescript6';
import type { OutputDoc, DecoratorInfo } from '../types.js';
import {
  getDecoratorObjectArg,
  getDecoratorStringArg,
  getStringProperty,
} from '../utils/ast-helpers.js';
import { getEmitterEventType, getPropertyType } from '../utils/type-resolver.js';
import { getDescription, getRawDescription, getTags } from '../utils/jsdoc.js';

/**
 * Extract an @Output() decorator property into an OutputDoc.
 */
export function extractDecoratorOutput(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  decorator: DecoratorInfo,
): OutputDoc {
  const symbol = checker.getSymbolAtLocation(prop.name)!;
  const name = symbol.getName();
  const type = getPropertyType(checker, symbol, prop);

  // Resolve alias from decorator options
  let alias: string | undefined;
  const objArg = getDecoratorObjectArg(decorator);
  if (objArg) {
    alias = getStringProperty(objArg, 'alias');
  } else {
    alias = getDecoratorStringArg(decorator);
  }

  return {
    name,
    bindingName: alias ?? name,
    type: getEmitterEventType(checker, type, prop),
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
    source: 'decorator',
  };
}
