import ts from 'typescript';
import type { InputDoc, DecoratorInfo } from '../types.js';
import {
  getDecoratorObjectArg,
  getDecoratorStringArg,
  getStringProperty,
  getBooleanProperty,
  getExpressionProperty,
} from '../utils/ast-helpers.js';
import { getDefaultValue } from '../utils/default-value.js';
import { typeToString } from '../utils/type-resolver.js';
import { getDescription, getRawDescription, getTags } from '../utils/jsdoc.js';

/**
 * Extract an @Input() decorator property into an InputDoc.
 */
export function extractDecoratorInput(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  decorator: DecoratorInfo,
  sourceFile: ts.SourceFile,
): InputDoc {
  const symbol = checker.getSymbolAtLocation(prop.name)!;
  const name = symbol.getName();
  const type = checker.getTypeOfSymbolAtLocation(symbol, prop);

  // Resolve alias and required from decorator options
  let alias: string | undefined;
  let required = false;
  let transform: string | null = null;

  const objArg = getDecoratorObjectArg(decorator);
  if (objArg) {
    alias = getStringProperty(objArg, 'alias');
    required = getBooleanProperty(objArg, 'required') ?? false;
    const transformExpr = getExpressionProperty(objArg, 'transform');
    if (transformExpr) {
      transform = transformExpr.getText(sourceFile);
    }
  } else {
    // @Input('aliasName') — string argument form
    alias = getDecoratorStringArg(decorator);
  }

  return {
    name,
    bindingName: alias ?? name,
    type: typeToString(checker, type, prop),
    required,
    defaultValue: getDefaultValue(prop, sourceFile),
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
    source: 'decorator',
    transform,
  };
}
