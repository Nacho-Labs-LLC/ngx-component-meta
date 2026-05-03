import type { ComponentDoc, PipeDoc, InputDoc, OutputDoc, ModelDoc, PropertyDoc, MethodDoc, ParseResult } from '../types.js';
import type {
  CompodocJson,
  CompodocComponent,
  CompodocDirective,
  CompodocPipe,
  CompodocProperty,
  CompodocMethod,
  CompodocJsDocTag,
  CompodocInjectable,
  CompodocClass,
  CompodocTypeAlias,
  CompodocEnum,
  CompodocFunction,
  CompodocVariable,
} from './compodoc-types.js';

/**
 * Convert ngx-component-meta output to CompodocJson format.
 * Accepts either the legacy array format or the full ParseResult.
 * Drop-in replacement for Compodoc's documentation.json — use with setCompodocJson().
 */
export function toCompodocJson(docs: (ComponentDoc | PipeDoc)[] | ParseResult): CompodocJson {
  if (isParseResult(docs)) {
    return toCompodocJsonFromParseResult(docs);
  }

  const components: CompodocComponent[] = [];
  const directives: CompodocDirective[] = [];
  const pipes: CompodocPipe[] = [];

  for (const doc of docs) {
    if ('pipeName' in doc) {
      pipes.push(mapPipe(doc));
    } else if (doc.kind === 'directive') {
      directives.push(mapDirective(doc));
    } else {
      components.push(mapComponent(doc));
    }
  }

  return {
    components,
    directives,
    pipes,
    injectables: [],
    classes: [],
    miscellaneous: {
      typealiases: [],
      enumerations: [],
    },
  };
}

function isParseResult(input: unknown): input is ParseResult {
  return input !== null && typeof input === 'object' && !Array.isArray(input) && 'components' in input;
}

function toCompodocJsonFromParseResult(result: ParseResult): CompodocJson {
  const components: CompodocComponent[] = [];
  const directives: CompodocDirective[] = [];
  const pipes: CompodocPipe[] = [];

  for (const doc of result.components) {
    if (doc.kind === 'directive') {
      directives.push(mapDirective(doc));
    } else {
      components.push(mapComponent(doc));
    }
  }

  for (const doc of result.pipes) {
    pipes.push(mapPipe(doc));
  }

  const injectables: CompodocInjectable[] = result.injectables.map(i => ({
    name: i.name,
    type: 'injectable' as const,
  }));

  const typealiases: CompodocTypeAlias[] = result.typeAliases.map(t => ({
    name: t.name,
    rawtype: t.type,
  }));

  const enumerations: CompodocEnum[] = result.enums.map(e => ({
    name: e.name,
    childs: e.members.map(m => ({ name: m.name, value: m.value })),
  }));

  const classes: CompodocClass[] = result.classes.map(c => ({
    name: c.name,
  }));

  const functions: CompodocFunction[] = result.functions.map(f => ({
    name: f.name,
    type: 'function' as const,
  }));

  const variables: CompodocVariable[] = result.variables.map(v => ({
    name: v.name,
    type: v.type,
  }));

  return {
    components,
    directives,
    pipes,
    injectables,
    classes,
    miscellaneous: {
      typealiases,
      enumerations,
      functions,
      variables,
    },
  };
}

function mapComponentOrDirective(doc: ComponentDoc, type: 'component' | 'directive'): CompodocComponent | CompodocDirective {
  return {
    name: doc.name,
    type,
    selector: doc.selector ?? '',
    exportAs: doc.exportAs ?? undefined,
    inputsClass: [
      ...doc.inputs.map(mapInputProperty),
      ...doc.models.map(mapModelAsInput),
    ],
    outputsClass: [
      ...doc.outputs.map(mapOutputProperty),
      ...doc.models.map(mapModelAsOutput),
    ],
    propertiesClass: doc.properties.map(mapProperty),
    methodsClass: doc.methods.map(mapMethod),
    description: doc.description || undefined,
    rawdescription: doc.rawDescription || undefined,
  };
}

function mapComponent(doc: ComponentDoc): CompodocComponent {
  return mapComponentOrDirective(doc, 'component') as CompodocComponent;
}

function mapDirective(doc: ComponentDoc): CompodocDirective {
  return mapComponentOrDirective(doc, 'directive') as CompodocDirective;
}

function mapPipe(doc: PipeDoc): CompodocPipe {
  return {
    name: doc.name,
    type: 'pipe',
    description: doc.description || undefined,
    rawdescription: doc.rawDescription || undefined,
  };
}

function mapInputProperty(input: InputDoc): CompodocProperty {
  return {
    name: input.bindingName,
    type: input.type,
    optional: !input.required,
    defaultValue: input.defaultValue,
    decorators: [{ name: 'Input' }],
    description: input.description || undefined,
    rawdescription: input.rawDescription || undefined,
    jsdoctags: tagsToJsDocTags(input.tags),
  };
}

function mapOutputProperty(output: OutputDoc): CompodocProperty {
  return {
    name: output.bindingName,
    type: output.type,
    optional: true,
    decorators: [{ name: 'Output' }],
    description: output.description || undefined,
    rawdescription: output.rawDescription || undefined,
    jsdoctags: tagsToJsDocTags(output.tags),
  };
}

function mapModelAsInput(model: ModelDoc): CompodocProperty {
  return {
    name: model.bindingName,
    type: model.type,
    optional: !model.required,
    defaultValue: model.defaultValue,
    decorators: [{ name: 'Input' }],
    description: model.description || undefined,
    rawdescription: model.rawDescription || undefined,
    jsdoctags: tagsToJsDocTags(model.tags),
  };
}

function mapModelAsOutput(model: ModelDoc): CompodocProperty {
  return {
    name: `${model.bindingName}Change`,
    type: model.type,
    optional: true,
    decorators: [{ name: 'Output' }],
    description: model.description ? `${model.description} (change event)` : undefined,
    rawdescription: model.rawDescription || undefined,
    jsdoctags: tagsToJsDocTags(model.tags),
  };
}

function mapProperty(prop: PropertyDoc): CompodocProperty {
  return {
    name: prop.name,
    type: prop.type,
    optional: prop.optional,
    defaultValue: prop.defaultValue,
    description: prop.description || undefined,
    rawdescription: prop.rawDescription || undefined,
    jsdoctags: tagsToJsDocTags(prop.tags),
  };
}

function mapMethod(method: MethodDoc): CompodocMethod {
  return {
    name: method.name,
    args: method.params.map(p => ({
      name: p.name,
      type: p.type,
      optional: p.optional || undefined,
      defaultValue: p.defaultValue,
    })),
    returnType: method.returnType,
    description: method.description || undefined,
    rawdescription: method.rawDescription || undefined,
  };
}

function tagsToJsDocTags(tags: Record<string, string>): CompodocJsDocTag[] | undefined {
  const entries = Object.entries(tags);
  if (entries.length === 0) return undefined;
  return entries.map(([name, comment]) => ({ name, comment: comment || undefined }));
}
