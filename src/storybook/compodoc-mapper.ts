import type { ComponentDoc, PipeDoc, InputDoc, OutputDoc, ModelDoc, PropertyDoc, MethodDoc } from '../types.js';
import type {
  CompodocJson,
  CompodocComponent,
  CompodocDirective,
  CompodocPipe,
  CompodocProperty,
  CompodocMethod,
  CompodocJsDocTag,
} from './compodoc-types.js';

/**
 * Convert ngx-component-meta output to CompodocJson format.
 * Drop-in replacement for Compodoc's documentation.json — use with setCompodocJson().
 */
export function toCompodocJson(docs: (ComponentDoc | PipeDoc)[]): CompodocJson {
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

function mapComponent(doc: ComponentDoc): CompodocComponent {
  return {
    name: doc.name,
    type: 'component',
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

function mapDirective(doc: ComponentDoc): CompodocDirective {
  return {
    name: doc.name,
    type: 'directive',
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
