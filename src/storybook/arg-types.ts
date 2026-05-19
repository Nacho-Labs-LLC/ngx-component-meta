import type { ParserOptions, ComponentDoc, InputDoc, OutputDoc, ModelDoc, PropertyDoc, MethodDoc } from '../types.js';
import { createParser } from '../parser.js';

interface StrictInputType {
  name: string;
  type?: { name: string; value?: any[] };
  description?: string;
  table?: {
    category?: string;
    type?: { summary: string; required?: boolean };
    defaultValue?: { summary: string };
  };
  control?: { type: string } | false;
  action?: string;
}

/**
 * Create a Storybook extractArgTypes function that bypasses Compodoc entirely.
 * Wire this into your .storybook/preview.ts:
 *
 * ```ts
 * import { createArgTypesExtractor } from 'ngx-component-meta/storybook';
 *
 * export default {
 *   parameters: {
 *     docs: {
 *       extractArgTypes: createArgTypesExtractor('./tsconfig.json'),
 *     },
 *   },
 * };
 * ```
 */
export function createArgTypesExtractor(
  tsconfigPath: string,
  options?: ParserOptions,
): (component: unknown) => Record<string, StrictInputType> | null {
  const parser = createParser(tsconfigPath, options);

  // Cache parsed results by component name
  const cache = new Map<string, Record<string, StrictInputType>>();

  return (component: unknown): Record<string, StrictInputType> | null => {
    if (!component) return null;

    const comp = component as { name?: string; __annotations__?: Array<{ name?: string }> };
    const name = comp.name ?? comp.__annotations__?.[0]?.name;
    if (!name || typeof name !== 'string') return null;

    if (cache.has(name)) return cache.get(name)!;

    // Find the component in the program's source files
    const program = parser.getProgram();
    const sourceFiles = program.getSourceFiles().filter(sf => !sf.isDeclarationFile);

    for (const sf of sourceFiles) {
      const docs = parser.parse(sf.fileName);
      for (const doc of docs) {
        if ('kind' in doc && doc.name === name) {
          const argTypes = componentDocToArgTypes(doc as ComponentDoc);
          cache.set(name, argTypes);
          return argTypes;
        }
      }
    }

    return null;
  };
}

function componentDocToArgTypes(doc: ComponentDoc): Record<string, StrictInputType> {
  const argTypes: Record<string, StrictInputType> = {};

  for (const input of doc.inputs) {
    argTypes[input.bindingName] = inputToArgType(input);
  }

  for (const output of doc.outputs) {
    argTypes[output.bindingName] = outputToArgType(output);
  }

  for (const model of doc.models) {
    argTypes[model.bindingName] = modelToArgType(model);
    argTypes[`${model.bindingName}Change`] = modelChangeToArgType(model);
  }

  for (const prop of doc.properties) {
    argTypes[prop.name] = propertyToArgType(prop);
  }

  for (const method of doc.methods) {
    argTypes[method.name] = methodToArgType(method);
  }

  return argTypes;
}

function inputToArgType(input: InputDoc): StrictInputType {
  return {
    name: input.bindingName,
    type: inferSBType(input.type),
    description: input.description,
    table: {
      category: 'inputs',
      type: { summary: input.type, required: input.required },
      defaultValue: input.defaultValue ? { summary: input.defaultValue } : undefined,
    },
    control: inferControl(input.type),
  };
}

function outputToArgType(output: OutputDoc): StrictInputType {
  return {
    name: output.bindingName,
    type: inferSBType(output.type),
    description: output.description,
    table: {
      category: 'outputs',
      type: { summary: output.type },
    },
    action: output.bindingName,
  };
}

function modelToArgType(model: ModelDoc): StrictInputType {
  return {
    name: model.bindingName,
    type: inferSBType(model.type),
    description: model.description,
    table: {
      category: 'two-way bindings',
      type: { summary: model.type, required: model.required },
      defaultValue: model.defaultValue ? { summary: model.defaultValue } : undefined,
    },
    control: inferControl(model.type),
  };
}

function modelChangeToArgType(model: ModelDoc): StrictInputType {
  return {
    name: `${model.bindingName}Change`,
    description: model.description ? `${model.description} (change event)` : '',
    table: {
      category: 'two-way bindings',
      type: { summary: model.type },
    },
    action: `${model.bindingName}Change`,
  };
}

function propertyToArgType(prop: PropertyDoc): StrictInputType {
  return {
    name: prop.name,
    type: inferSBType(prop.type),
    description: prop.description,
    table: {
      category: 'properties',
      type: { summary: prop.type },
      defaultValue: prop.defaultValue ? { summary: prop.defaultValue } : undefined,
    },
    control: false,
  };
}

function methodToArgType(method: MethodDoc): StrictInputType {
  const sig = `(${method.params.map(p => `${p.name}: ${p.type}`).join(', ')}) => ${method.returnType}`;
  return {
    name: method.name,
    description: method.description,
    table: {
      category: 'methods',
      type: { summary: sig },
    },
    control: false,
  };
}

function inferSBType(typeStr: string): { name: string; value?: any[] } {
  const trimmed = typeStr.trim();
  if (trimmed === 'string') return { name: 'string' };
  if (trimmed === 'number') return { name: 'number' };
  if (trimmed === 'boolean') return { name: 'boolean' };

  // Union of string literals: "a" | "b" | "c"
  const literalMatch = trimmed.match(/^"[^"]*"(\s*\|\s*"[^"]*")*$/);
  if (literalMatch) {
    const values = trimmed.split('|').map(s => s.trim().replace(/^"|"$/g, ''));
    return { name: 'enum', value: values };
  }

  return { name: 'other' };
}

function inferControl(typeStr: string): { type: string } | undefined {
  const trimmed = typeStr.trim();
  if (trimmed === 'string') return { type: 'text' };
  if (trimmed === 'number') return { type: 'number' };
  if (trimmed === 'boolean') return { type: 'boolean' };

  // Enum-like union
  if (/^"[^"]*"(\s*\|\s*"[^"]*")*$/.test(trimmed)) {
    return { type: 'select' };
  }

  return undefined;
}
