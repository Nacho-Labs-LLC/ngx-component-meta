import ts from '@typescript/typescript6';
import type { DecoratorInfo } from '../types.js';
import {
  getDecoratorObjectArg,
  getStringProperty,
  getBooleanProperty,
} from '../utils/ast-helpers.js';

export interface ComponentMetadata {
  kind: 'component' | 'directive';
  selector: string | null;
  standalone: boolean;
  exportAs: string | null;
}

/**
 * Extract @Component or @Directive decorator metadata.
 */
export function extractComponentMetadata(
  decorator: DecoratorInfo,
): ComponentMetadata {
  const kind = decorator.name === 'Component' ? 'component' : 'directive';
  const obj = getDecoratorObjectArg(decorator);

  if (!obj) {
    return { kind, selector: null, standalone: true, exportAs: null };
  }

  return {
    kind,
    selector: getStringProperty(obj, 'selector') ?? null,
    // Angular 19+ defaults to standalone: true when omitted
    standalone: getBooleanProperty(obj, 'standalone') ?? true,
    exportAs: getStringProperty(obj, 'exportAs') ?? null,
  };
}
