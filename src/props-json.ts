import type {
  ParseResult,
  ComponentDoc,
  PipeDoc,
  MethodDoc,
  MethodParamDoc,
} from './types.js';

// =============================================================================
// Public output types
// =============================================================================

export interface PropsJsonComponent {
  /** Component/directive class name. */
  name: string;
  /** The kind of entity. */
  kind: 'component' | 'directive' | 'pipe';
  /** JSDoc description. */
  description: string;
  /** CSS selector for use in templates. */
  selector: string | null;
  /** Props grouped by category. Only categories with items are included. */
  props?: PropsJsonProp[];
  /** Events/outputs. */
  events?: PropsJsonEvent[];
  /** Two-way bindings. */
  models?: PropsJsonModel[];
  /** Public methods. */
  methods?: PropsJsonMethod[];
  /** Pipe-specific: transform signature. Only present for pipes. */
  transform?: {
    signature: string;
    params: { name: string; type: string; optional: boolean; description: string }[];
    returnType: string;
  };
}

export interface PropsJsonProp {
  name: string;
  /** Template binding name if different from property name. */
  bindingName?: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
  /** Whether this is a modern signal input or legacy decorator. */
  signal: boolean;
}

export interface PropsJsonEvent {
  name: string;
  bindingName?: string;
  type: string;
  description: string;
  signal: boolean;
}

export interface PropsJsonModel {
  name: string;
  bindingName?: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface PropsJsonMethod {
  name: string;
  signature: string;
  description: string;
}

export interface PropsJsonOutput {
  components: PropsJsonComponent[];
  /** ISO 8601 generation timestamp. */
  generatedAt: string;
  /** Generator version. */
  version: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatMethodSignature(method: MethodDoc): string {
  const params = method.params
    .map((p) => {
      const opt = p.optional ? '?' : '';
      return `${p.name}${opt}: ${p.type}`;
    })
    .join(', ');
  return `(${params}) => ${method.returnType}`;
}

function formatPipeSignature(params: MethodParamDoc[], returnType: string): string {
  const paramStr = params
    .map((p) => {
      const opt = p.optional ? '?' : '';
      return `${p.name}${opt}: ${p.type}`;
    })
    .join(', ');
  return `(${paramStr}) => ${returnType}`;
}

function optionalBindingName(name: string, bindingName: string): string | undefined {
  return bindingName !== name ? bindingName : undefined;
}

function mapComponent(comp: ComponentDoc): PropsJsonComponent {
  const result: PropsJsonComponent = {
    name: comp.name,
    kind: comp.kind,
    description: comp.description,
    selector: comp.selector,
  };

  if (comp.inputs.length > 0) {
    result.props = comp.inputs.map((inp) => {
      const prop: PropsJsonProp = {
        name: inp.name,
        type: inp.type,
        required: inp.required,
        description: inp.description,
        signal: inp.source === 'signal',
      };
      const bn = optionalBindingName(inp.name, inp.bindingName);
      if (bn !== undefined) prop.bindingName = bn;
      if (inp.defaultValue !== undefined) prop.defaultValue = inp.defaultValue;
      return prop;
    });
  }

  if (comp.outputs.length > 0) {
    result.events = comp.outputs.map((out) => {
      const event: PropsJsonEvent = {
        name: out.name,
        type: out.type,
        description: out.description,
        signal: out.source === 'signal',
      };
      const bn = optionalBindingName(out.name, out.bindingName);
      if (bn !== undefined) event.bindingName = bn;
      return event;
    });
  }

  if (comp.models.length > 0) {
    result.models = comp.models.map((m) => {
      const model: PropsJsonModel = {
        name: m.name,
        type: m.type,
        required: m.required,
        description: m.description,
      };
      const bn = optionalBindingName(m.name, m.bindingName);
      if (bn !== undefined) model.bindingName = bn;
      if (m.defaultValue !== undefined) model.defaultValue = m.defaultValue;
      return model;
    });
  }

  if (comp.methods.length > 0) {
    result.methods = comp.methods.map((m) => ({
      name: m.name,
      signature: formatMethodSignature(m),
      description: m.description,
    }));
  }

  return result;
}

function mapPipe(pipe: PipeDoc): PropsJsonComponent {
  const result: PropsJsonComponent = {
    name: pipe.name,
    kind: 'pipe',
    description: pipe.description,
    selector: null,
    transform: {
      signature: formatPipeSignature(pipe.transform.params, pipe.transform.returnType),
      params: pipe.transform.params.map((p) => ({
        name: p.name,
        type: p.type,
        optional: p.optional,
        description: p.description,
      })),
      returnType: pipe.transform.returnType,
    },
  };

  return result;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Converts a ParseResult into a simplified, framework-agnostic JSON format
 * optimized for rendering prop tables in static documentation sites.
 */
export function toPropsJson(
  result: ParseResult,
  options?: { version?: string },
): PropsJsonOutput {
  const components: PropsJsonComponent[] = [
    ...result.components.map(mapComponent),
    ...result.pipes.map(mapPipe),
  ];

  components.sort((a, b) => a.name.localeCompare(b.name));

  return {
    components,
    generatedAt: new Date().toISOString(),
    version: options?.version ?? '0.0.0',
  };
}

/**
 * Generates the PropsJson and returns it as a formatted JSON string.
 */
export function toPropsJsonString(
  result: ParseResult,
  options?: { version?: string; pretty?: boolean },
): string {
  const output = toPropsJson(result, { version: options?.version });
  const indent = options?.pretty ? 2 : undefined;
  return JSON.stringify(output, null, indent);
}
