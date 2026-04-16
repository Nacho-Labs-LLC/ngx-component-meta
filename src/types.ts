import type ts from 'typescript';

// =============================================================================
// Public output types
// =============================================================================

export interface ComponentDoc {
  /** Class name of the component/directive. */
  name: string;
  /** Absolute file path where the component is declared. */
  filePath: string;
  /** JSDoc description. */
  description: string;
  /** Raw (unprocessed) JSDoc text. */
  rawDescription: string;
  /** The Angular entity kind. */
  kind: 'component' | 'directive';
  /** CSS selector from @Component/@Directive metadata. */
  selector: string | null;
  /** Whether the component is standalone. */
  standalone: boolean;
  /** exportAs from decorator metadata. */
  exportAs: string | null;
  /** All JSDoc tags on the class. */
  tags: Record<string, string>;
  /** Inputs — both @Input() and signal input(). */
  inputs: InputDoc[];
  /** Outputs — both @Output() and signal output(). */
  outputs: OutputDoc[];
  /** Two-way bindings — model() signals. */
  models: ModelDoc[];
  /** Other public properties (not inputs/outputs/models/queries). */
  properties: PropertyDoc[];
  /** Public methods. */
  methods: MethodDoc[];
  /** View and content queries. */
  queries: QueryDoc[];
  /** Implemented interfaces. */
  implements: string[];
  /** Superclass name, if any. */
  extends: string | null;
}

export interface PipeDoc {
  /** Class name. */
  name: string;
  /** Absolute file path. */
  filePath: string;
  /** The name used in templates (from @Pipe({ name })). */
  pipeName: string;
  /** Whether the pipe is standalone. */
  standalone: boolean;
  /** Whether the pipe is pure (default true). */
  pure: boolean;
  /** JSDoc description. */
  description: string;
  /** Raw JSDoc text. */
  rawDescription: string;
  /** JSDoc tags. */
  tags: Record<string, string>;
  /** The transform() method signature. */
  transform: {
    params: MethodParamDoc[];
    returnType: string;
  };
}

export interface InputDoc {
  /** Property name in the class. */
  name: string;
  /** Template binding name (alias or property name). */
  bindingName: string;
  /** TypeScript type as a string (unwrapped — `string`, not `InputSignal<string>`). */
  type: string;
  /** Whether the input is required. */
  required: boolean;
  /** Default value as source text, or undefined. */
  defaultValue: string | undefined;
  /** JSDoc description. */
  description: string;
  /** Raw JSDoc text. */
  rawDescription: string;
  /** JSDoc tags. */
  tags: Record<string, string>;
  /** How this input was declared. */
  source: 'decorator' | 'signal';
  /** Transform function name, if specified. */
  transform: string | null;
}

export interface OutputDoc {
  /** Property name in the class. */
  name: string;
  /** Template binding name (alias or property name). */
  bindingName: string;
  /** The emitted event type (the T in EventEmitter<T> or output<T>). */
  type: string;
  /** JSDoc description. */
  description: string;
  /** Raw JSDoc text. */
  rawDescription: string;
  /** JSDoc tags. */
  tags: Record<string, string>;
  /** How this output was declared. */
  source: 'decorator' | 'signal';
}

export interface ModelDoc {
  /** Property name in the class. */
  name: string;
  /** Template binding name (alias or property name). */
  bindingName: string;
  /** The model value type. */
  type: string;
  /** Whether model.required() was used. */
  required: boolean;
  /** Default value, if provided. */
  defaultValue: string | undefined;
  /** JSDoc description. */
  description: string;
  /** Raw JSDoc text. */
  rawDescription: string;
  /** JSDoc tags. */
  tags: Record<string, string>;
}

export interface PropertyDoc {
  /** Property name. */
  name: string;
  /** TypeScript type as a string. */
  type: string;
  /** Default value as source text. */
  defaultValue: string | undefined;
  /** Whether the type includes undefined / is optional. */
  optional: boolean;
  /** Visibility modifier. */
  modifier: 'public' | 'protected' | 'readonly';
  /** JSDoc description. */
  description: string;
  /** Raw JSDoc text. */
  rawDescription: string;
  /** JSDoc tags. */
  tags: Record<string, string>;
}

export interface MethodDoc {
  /** Method name. */
  name: string;
  /** Parameters. */
  params: MethodParamDoc[];
  /** Return type as a string. */
  returnType: string;
  /** Visibility modifier. */
  modifier: 'public' | 'protected';
  /** JSDoc description. */
  description: string;
  /** Raw JSDoc text. */
  rawDescription: string;
  /** JSDoc tags. */
  tags: Record<string, string>;
}

export interface MethodParamDoc {
  name: string;
  type: string;
  optional: boolean;
  defaultValue: string | undefined;
  description: string;
}

export interface QueryDoc {
  /** Property name. */
  name: string;
  /** Query kind. */
  kind: 'viewChild' | 'viewChildren' | 'contentChild' | 'contentChildren';
  /** The selector/locator: template ref string or component class name. */
  selector: string;
  /** Resolved type. */
  type: string;
  /** Whether .required() was used. */
  required: boolean;
  /** How declared. */
  source: 'decorator' | 'signal';
  /** JSDoc description. */
  description: string;
  /** Raw JSDoc text. */
  rawDescription: string;
  /** JSDoc tags. */
  tags: Record<string, string>;
}

// =============================================================================
// Parser options and interface
// =============================================================================

/** Union type for any member doc — used in propFilter. */
export type MemberDoc = InputDoc | OutputDoc | ModelDoc | PropertyDoc | MethodDoc | QueryDoc;

export interface ParserOptions {
  /**
   * Filter which properties to include. Return true to include.
   * Default: includes all non-private, non-internal members.
   */
  propFilter?: (prop: MemberDoc, component: ComponentDoc) => boolean;

  /**
   * Custom component name resolver.
   * Default: uses the class name.
   */
  componentNameResolver?: (
    symbol: ts.Symbol,
    source: ts.SourceFile,
  ) => string | undefined;

  /**
   * Extract enum literal values into the type string.
   * Default: true
   */
  shouldExtractLiteralValuesFromEnum?: boolean;

  /**
   * Include members inherited from base classes.
   * Default: true
   */
  shouldIncludeInherited?: boolean;

  /**
   * Include methods in the output.
   * Default: true
   */
  shouldIncludeMethods?: boolean;

  /**
   * Include view/content queries in the output.
   * Default: false
   */
  shouldIncludeQueries?: boolean;

  /**
   * Custom tsconfig compiler options to merge/override.
   */
  compilerOptions?: ts.CompilerOptions;
}

export interface Parser {
  /** Parse one or more files and return component/directive/pipe metadata. */
  parse(filePathOrPaths: string | string[]): (ComponentDoc | PipeDoc)[];

  /** Parse with an externally-provided ts.Program (for IDE integration). */
  parseWithProgram(
    filePathOrPaths: string | string[],
    program: ts.Program,
  ): (ComponentDoc | PipeDoc)[];

  /** Get the underlying ts.Program (for advanced consumers). */
  getProgram(): ts.Program;
}

// =============================================================================
// Internal types (not exported from public API, but used across modules)
// =============================================================================

/** @internal */
export interface DecoratorInfo {
  name: string;
  args: ts.NodeArray<ts.Expression> | undefined;
  node: ts.Decorator;
}
