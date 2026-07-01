import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import type {
  ComponentDoc,
  PipeDoc,
  InputDoc,
  OutputDoc,
  ModelDoc,
  PropertyDoc,
  MethodDoc,
  QueryDoc,
  HostBindingDoc,
  HostListenerDoc,
  InjectableDoc,
  InterfaceDoc,
  TypeAliasDoc,
  EnumDoc,
  ClassDoc,
  FunctionDoc,
  VariableDoc,
  ParseResult,
  ParserOptions,
  Parser,
  WatchParser,
  MemberDoc,
} from './types.js';
import { findDecorator, getDecorators, getDecoratorStringArg, isPrivateMember, getMemberName, getCallExpressionInitializer, extractParams, getReturnTypeString } from './utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, isInternal } from './utils/jsdoc.js';
import { typeToString } from './utils/type-resolver.js';
import { getDefaultValue } from './utils/default-value.js';
import { extractComponentMetadata } from './extractors/component.js';
import { extractDecoratorInput } from './extractors/input.js';
import { extractDecoratorOutput } from './extractors/output.js';
import { extractPipe } from './extractors/pipe.js';
import { extractMethod } from './extractors/method.js';
import { extractProperty } from './extractors/property.js';
import { tryExtractSignalInput, tryExtractModel } from './extractors/signal-input.js';
import { tryExtractSignalOutput } from './extractors/signal-output.js';
import { tryExtractSignalQuery } from './extractors/signal-query.js';
import { isAngularCoreCall } from './utils/import-tracker.js';
import { extractInjectable } from './extractors/injectable.js';
import { extractInterface } from './extractors/interface.js';
import { extractTypeAlias } from './extractors/type-alias.js';
import { extractEnum } from './extractors/enum.js';
import { extractClass } from './extractors/class.js';
import { extractFunction } from './extractors/function.js';
import { extractVariable } from './extractors/variable.js';

/** Decorator query extractors (ViewChild, ContentChild, etc.) */
const QUERY_DECORATORS: Record<string, QueryDoc['kind']> = {
  ViewChild: 'viewChild',
  ViewChildren: 'viewChildren',
  ContentChild: 'contentChild',
  ContentChildren: 'contentChildren',
};

/**
 * Create a parser from a tsconfig.json path.
 */
export function createParser(tsconfigPath: string, options?: ParserOptions): Parser {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    ts.sys.resolvePath(tsconfigPath).replace(/[/\\][^/\\]+$/, ''),
  );

  const mergedOptions = {
    ...parsedConfig.options,
    ...options?.compilerOptions,
  };

  return createParserFromProgram(mergedOptions, parsedConfig.fileNames, options);
}

/**
 * Create a parser with explicit compiler options.
 */
export function createParserFromOptions(
  compilerOptions: ts.CompilerOptions,
  options?: ParserOptions,
): Parser {
  return createParserFromProgram(compilerOptions, [], options);
}

/**
 * One-shot parse: auto-detects tsconfig from the first file path.
 */
export function parse(
  filePathOrPaths: string | string[],
  options?: ParserOptions,
): (ComponentDoc | PipeDoc)[] {
  const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
  if (files.length === 0) return [];

  // Try to find tsconfig.json by walking up from the first file
  const tsconfigPath = ts.findConfigFile(files[0], ts.sys.fileExists, 'tsconfig.json');
  if (tsconfigPath) {
    const parser = createParser(tsconfigPath, options);
    return parser.parse(files);
  }

  // Fallback: use default compiler options
  const defaultOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    experimentalDecorators: true,
    strict: true,
    ...options?.compilerOptions,
  };

  const parser = createParserFromOptions(defaultOptions, options);
  return parser.parse(files);
}

/**
 * One-shot parseAll: auto-detects tsconfig from the first file path.
 * Returns the full structured ParseResult including injectables, interfaces, type aliases, and enums.
 */
export function parseAll(
  filePathOrPaths: string | string[],
  options?: ParserOptions,
): ParseResult {
  const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
  if (files.length === 0) {
    return { components: [], pipes: [], injectables: [], interfaces: [], typeAliases: [], enums: [], classes: [], functions: [], variables: [] };
  }

  const tsconfigPath = ts.findConfigFile(files[0], ts.sys.fileExists, 'tsconfig.json');
  if (tsconfigPath) {
    const parser = createParser(tsconfigPath, options);
    return parser.parseAll(files);
  }

  const defaultOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    experimentalDecorators: true,
    strict: true,
    ...options?.compilerOptions,
  };

  const parser = createParserFromOptions(defaultOptions, options);
  return parser.parseAll(files);
}

function createParserFromProgram(
  compilerOptions: ts.CompilerOptions,
  rootFileNames: string[],
  options?: ParserOptions,
): Parser {
  let program: ts.Program | undefined;

  function getOrCreateProgram(files: string[]): ts.Program {
    const allFiles = [...new Set([...rootFileNames, ...files])];
    program = ts.createProgram(allFiles, compilerOptions);
    return program;
  }

  return {
    parse(filePathOrPaths: string | string[]): (ComponentDoc | PipeDoc)[] {
      const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
      const prog = getOrCreateProgram(files);
      return extractFromProgram(prog, files, options);
    },

    parseAll(filePathOrPaths: string | string[]): ParseResult {
      const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
      const prog = getOrCreateProgram(files);
      return extractAllFromProgram(prog, files, options);
    },

    parseWithProgram(
      filePathOrPaths: string | string[],
      externalProgram: ts.Program,
    ): (ComponentDoc | PipeDoc)[] {
      const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
      return extractFromProgram(externalProgram, files, options);
    },

    getProgram(): ts.Program {
      if (!program) {
        program = ts.createProgram(rootFileNames, compilerOptions);
      }
      return program;
    },
  };
}

/**
 * Core extraction: iterate source files, find Angular classes, extract metadata.
 */
function extractFromProgram(
  program: ts.Program,
  filePaths: string[],
  options?: ParserOptions,
): (ComponentDoc | PipeDoc)[] {
  const checker = program.getTypeChecker();
  const results: (ComponentDoc | PipeDoc)[] = [];

  for (const filePath of filePaths) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) continue;

    ts.forEachChild(sourceFile, node => {
      if (!ts.isClassDeclaration(node) || !node.name) return;

      const decorators = getDecorators(node);

      // Check for @Pipe
      const pipeDecorator = decorators.find(d => d.name === 'Pipe');
      if (pipeDecorator) {
        const pipeDoc = extractPipe(checker, node, pipeDecorator, sourceFile);
        if (pipeDoc) results.push(pipeDoc);
        return;
      }

      // Check for @Component or @Directive
      const componentDecorator = decorators.find(d => d.name === 'Component');
      const directiveDecorator = decorators.find(d => d.name === 'Directive');
      const decorator = componentDecorator ?? directiveDecorator;
      if (!decorator) return;

      const doc = extractComponentDoc(checker, node, decorator, sourceFile, program, options);
      if (doc) results.push(doc);
    });
  }

  return results;
}

/**
 * Check if a declaration has the `export` keyword modifier.
 */
function isExported(node: ts.Declaration | ts.VariableStatement): boolean {
  const modifiers = ts.getModifiers(node as ts.HasModifiers);
  return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

/**
 * Full extraction: components, pipes, injectables, interfaces, type aliases, and enums.
 */
function extractAllFromProgram(
  program: ts.Program,
  filePaths: string[],
  options?: ParserOptions,
): ParseResult {
  const checker = program.getTypeChecker();
  const components: ComponentDoc[] = [];
  const pipes: PipeDoc[] = [];
  const injectables: InjectableDoc[] = [];
  const interfaces: InterfaceDoc[] = [];
  const typeAliases: TypeAliasDoc[] = [];
  const enums: EnumDoc[] = [];
  const classes: ClassDoc[] = [];
  const functions: FunctionDoc[] = [];
  const variables: VariableDoc[] = [];

  for (const filePath of filePaths) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) continue;

    ts.forEachChild(sourceFile, node => {
      // Class declarations: components, directives, pipes, injectables, or plain classes
      if (ts.isClassDeclaration(node) && node.name) {
        const decorators = getDecorators(node);

        const pipeDecorator = decorators.find(d => d.name === 'Pipe');
        if (pipeDecorator) {
          const pipeDoc = extractPipe(checker, node, pipeDecorator, sourceFile);
          if (pipeDoc) pipes.push(pipeDoc);
          return;
        }

        // Check Component/Directive before Injectable — a class with both
        // decorators should be treated as a component, not an injectable.
        const componentDecorator = decorators.find(d => d.name === 'Component');
        const directiveDecorator = decorators.find(d => d.name === 'Directive');
        const decorator = componentDecorator ?? directiveDecorator;
        if (decorator) {
          const doc = extractComponentDoc(checker, node, decorator, sourceFile, program, options);
          if (doc) components.push(doc);
          return;
        }

        const injectableDecorator = decorators.find(d => d.name === 'Injectable');
        if (injectableDecorator) {
          const injectableDoc = extractInjectable(checker, node, injectableDecorator, sourceFile);
          if (injectableDoc) injectables.push(injectableDoc);
          return;
        }

        // Exported class without Angular decorators
        if (isExported(node)) {
          const classDoc = extractClass(checker, node, sourceFile);
          if (classDoc) classes.push(classDoc);
        }
        return;
      }

      // Exported functions
      if (ts.isFunctionDeclaration(node) && isExported(node)) {
        const doc = extractFunction(checker, node, sourceFile);
        if (doc) functions.push(doc);
        return;
      }

      // Exported variable statements
      if (ts.isVariableStatement(node) && isExported(node)) {
        const isConst = !!(node.declarationList.flags & ts.NodeFlags.Const);
        for (const decl of node.declarationList.declarations) {
          const doc = extractVariable(checker, decl, isConst, sourceFile);
          if (doc) variables.push(doc);
        }
        return;
      }

      // Exported interfaces
      if (ts.isInterfaceDeclaration(node) && isExported(node)) {
        const doc = extractInterface(checker, node, sourceFile);
        if (doc) interfaces.push(doc);
        return;
      }

      // Exported type aliases
      if (ts.isTypeAliasDeclaration(node) && isExported(node)) {
        const doc = extractTypeAlias(checker, node, sourceFile);
        if (doc) typeAliases.push(doc);
        return;
      }

      // Exported enums
      if (ts.isEnumDeclaration(node) && isExported(node)) {
        const doc = extractEnum(checker, node, sourceFile);
        if (doc) enums.push(doc);
        return;
      }
    });
  }

  return { components, pipes, injectables, interfaces, typeAliases, enums, classes, functions, variables };
}

interface ComponentCollections {
  inputs: InputDoc[];
  outputs: OutputDoc[];
  models: ModelDoc[];
  properties: PropertyDoc[];
  methods: MethodDoc[];
  queries: QueryDoc[];
  hostBindings: HostBindingDoc[];
  hostListeners: HostListenerDoc[];
}

function extractComponentDoc(
  checker: ts.TypeChecker,
  classDecl: ts.ClassDeclaration,
  decorator: { name: string; args: ts.NodeArray<ts.Expression> | undefined; node: ts.Decorator },
  sourceFile: ts.SourceFile,
  program: ts.Program,
  options?: ParserOptions,
): ComponentDoc | null {
  const classSymbol = classDecl.name ? checker.getSymbolAtLocation(classDecl.name) : undefined;
  if (!classSymbol) return null;

  // Check for @internal
  if (isInternal(classSymbol)) return null;

  const meta = extractComponentMetadata(decorator);

  const collections: ComponentCollections = {
    inputs: [],
    outputs: [],
    models: [],
    properties: [],
    methods: [],
    queries: [],
    hostBindings: [],
    hostListeners: [],
  };

  // Process class members
  const leafNames = new Set<string>();
  extractMembersIntoCollections(checker, classDecl, sourceFile, options, collections, leafNames);

  // Resolve inheritance
  if (options?.shouldIncludeInherited !== false) {
    resolveInheritance(
      checker,
      classDecl,
      sourceFile,
      program,
      options,
      collections.inputs,
      collections.outputs,
      collections.models,
      collections.properties,
      collections.methods,
      collections.queries,
      collections.hostBindings,
      collections.hostListeners,
      leafNames,
    );
  }

  // Resolve heritage info (implements, extends)
  const { implements: implementsList, extends: extendsName } = getHeritageInfo(classDecl, sourceFile);

  // Apply name resolver
  const name = resolveComponentName(classSymbol, sourceFile, options);

  const doc: ComponentDoc = {
    name,
    filePath: sourceFile.fileName,
    description: getDescription(checker, classSymbol),
    rawDescription: getRawDescription(classSymbol),
    kind: meta.kind,
    selector: meta.selector,
    standalone: meta.standalone,
    exportAs: meta.exportAs,
    tags: getTags(classSymbol),
    ...collections,
    implements: implementsList,
    extends: extendsName,
  };

  // Apply prop filter
  if (options?.propFilter) {
    applyPropFilters(doc, options.propFilter);
  }

  return doc;
}

/**
 * Resolves the heritage information (implements and extends) for a class.
 */
function getHeritageInfo(classDecl: ts.ClassDeclaration, sourceFile: ts.SourceFile): { implements: string[]; extends: string | null } {
  const implementsList = classDecl.heritageClauses
    ?.filter(h => h.token === ts.SyntaxKind.ImplementsKeyword)
    .flatMap(h => h.types.map(t => t.getText(sourceFile)))
    ?? [];

  const extendsClause = classDecl.heritageClauses?.find(
    h => h.token === ts.SyntaxKind.ExtendsKeyword,
  );
  const extendsName = extendsClause?.types[0]?.getText(sourceFile) ?? null;

  return { implements: implementsList, extends: extendsName };
}

/**
 * Resolves the component name, potentially using a custom resolver.
 */
function resolveComponentName(classSymbol: ts.Symbol, sourceFile: ts.SourceFile, options: ParserOptions | undefined): string {
  let name = classSymbol.getName();
  if (options?.componentNameResolver) {
    const resolved = options.componentNameResolver(classSymbol, sourceFile);
    if (resolved) name = resolved;
  }
  return name;
}

/**
 * Applies property filters to all member collections in a ComponentDoc.
 */
function applyPropFilters(doc: ComponentDoc, filter: (prop: MemberDoc, doc: ComponentDoc) => boolean): void {
  doc.inputs = doc.inputs.filter(p => filter(p, doc));
  doc.outputs = doc.outputs.filter(p => filter(p, doc));
  doc.models = doc.models.filter(p => filter(p, doc));
  doc.properties = doc.properties.filter(p => filter(p, doc));
  doc.methods = doc.methods.filter(p => filter(p, doc));
  doc.queries = doc.queries.filter(p => filter(p, doc));
  doc.hostBindings = doc.hostBindings.filter(p => filter(p, doc));
  doc.hostListeners = doc.hostListeners.filter(p => filter(p, doc));
}

/**
 * Processes all members of a class declaration and populates the provided collections.
 */
function extractMembersIntoCollections(
  checker: ts.TypeChecker,
  classDecl: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  options: ParserOptions | undefined,
  collections: ComponentCollections,
  existingNames?: Set<string>,
): void {
  for (const member of classDecl.members) {
    if (isPrivateMember(member)) continue;

    const name = getMemberName(member);
    if (name && existingNames?.has(name)) continue;
    if (name) existingNames?.add(name);

    // Methods
    if (ts.isMethodDeclaration(member)) {
      // Check for @HostListener before falling through to regular method extraction
      const hostListenerDecorator = findDecorator(member, 'HostListener');
      if (hostListenerDecorator) {
        const listenerDoc = extractHostListener(checker, member, hostListenerDecorator, sourceFile);
        if (listenerDoc) collections.hostListeners.push(listenerDoc);
        continue;
      }

      if (options?.shouldIncludeMethods !== false) {
        const methodDoc = extractMethod(checker, member, sourceFile);
        if (methodDoc) collections.methods.push(methodDoc);
      }
      continue;
    }

    // Getters with @HostBinding
    if (ts.isGetAccessorDeclaration(member)) {
      const hostBindingDecorator = findDecorator(member, 'HostBinding');
      if (hostBindingDecorator) {
        const bindingDoc = extractHostBindingFromAccessor(checker, member, hostBindingDecorator, sourceFile);
        if (bindingDoc) collections.hostBindings.push(bindingDoc);
      }
      continue;
    }

    // Properties
    if (ts.isPropertyDeclaration(member)) {
      extractPropertyMember(
        checker,
        member,
        sourceFile,
        options,
        collections.inputs,
        collections.outputs,
        collections.models,
        collections.properties,
        collections.queries,
        collections.hostBindings,
      );
    }
  }
}

function extractPropertyMember(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
  options: ParserOptions | undefined,
  inputs: InputDoc[],
  outputs: OutputDoc[],
  models: ModelDoc[],
  properties: PropertyDoc[],
  queries: QueryDoc[],
  hostBindings?: HostBindingDoc[],
): void {
  const memberName = getMemberName(prop);
  if (!memberName) return;

  const symbol = checker.getSymbolAtLocation(prop.name);
  if (symbol && isInternal(symbol)) return;

  // 1. Check for signal call expressions: input(), output(), model(), viewChild(), etc.
  const callExpr = getCallExpressionInitializer(prop);
  if (callExpr && isAngularCoreCall(checker, callExpr)) {
    // Try signal input
    const signalInput = tryExtractSignalInput(checker, prop, callExpr, sourceFile);
    if (signalInput) { inputs.push(signalInput); return; }

    // Try model
    const modelDoc = tryExtractModel(checker, prop, callExpr, sourceFile);
    if (modelDoc) { models.push(modelDoc); return; }

    // Try signal output
    const signalOutput = tryExtractSignalOutput(checker, prop, callExpr);
    if (signalOutput) { outputs.push(signalOutput); return; }

    // Try signal query
    if (options?.shouldIncludeQueries) {
      const queryDoc = tryExtractSignalQuery(checker, prop, callExpr, sourceFile);
      if (queryDoc) { queries.push(queryDoc); return; }
    }
  }

  const decorators = getDecorators(prop);

  // 2. Check for @HostBinding before falling through to plain property
  if (hostBindings) {
    const hostBindingDecorator = decorators.find(d => d.name === 'HostBinding');
    if (hostBindingDecorator) {
      const bindingDoc = extractHostBindingFromProperty(checker, prop, hostBindingDecorator, sourceFile);
      if (bindingDoc) hostBindings.push(bindingDoc);
      return;
    }
  }

  // 3. Check for decorator-based @Input
  const inputDecorator = decorators.find(d => d.name === 'Input');
  if (inputDecorator) {
    inputs.push(extractDecoratorInput(checker, prop, inputDecorator, sourceFile));
    return;
  }

  // 4. Check for decorator-based @Output
  const outputDecorator = decorators.find(d => d.name === 'Output');
  if (outputDecorator) {
    outputs.push(extractDecoratorOutput(checker, prop, outputDecorator));
    return;
  }

  // 5. Check for decorator-based queries
  if (options?.shouldIncludeQueries) {
    const qDecorator = decorators.find(d => d.name in QUERY_DECORATORS);
    if (qDecorator) {
      const queryKind = QUERY_DECORATORS[qDecorator.name];
      const queryDoc = extractDecoratorQuery(checker, prop, qDecorator, queryKind, sourceFile);
      if (queryDoc) queries.push(queryDoc);
      return;
    }
  }

  // 6. Otherwise it's a plain property
  const propDoc = extractProperty(checker, prop, sourceFile);
  if (propDoc) properties.push(propDoc);
}

function extractDecoratorQuery(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  decorator: { name: string; args: ts.NodeArray<ts.Expression> | undefined; node: ts.Decorator },
  kind: QueryDoc['kind'],
  sourceFile: ts.SourceFile,
): QueryDoc | null {
  const symbol = checker.getSymbolAtLocation(prop.name);
  if (!symbol) return null;

  const selector = decorator.args?.[0]
    ? (ts.isStringLiteral(decorator.args[0])
        ? decorator.args[0].text
        : decorator.args[0].getText(sourceFile))
    : '';

  const type = checker.getTypeOfSymbolAtLocation(symbol, prop);

  return {
    name: symbol.getName(),
    kind,
    selector,
    type: checker.typeToString(type, prop, ts.TypeFormatFlags.NoTruncation),
    required: false,
    source: 'decorator',
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}

/**
 * Walk the extends chain and merge inherited members.
 */
function resolveInheritance(
  checker: ts.TypeChecker,
  classDecl: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  program: ts.Program,
  options: ParserOptions | undefined,
  inputs: InputDoc[],
  outputs: OutputDoc[],
  models: ModelDoc[],
  properties: PropertyDoc[],
  methods: MethodDoc[],
  queries: QueryDoc[],
  hostBindings?: HostBindingDoc[],
  hostListeners?: HostListenerDoc[],
  existingNames?: Set<string>,
): void {
  const extendsClause = classDecl.heritageClauses?.find(
    h => h.token === ts.SyntaxKind.ExtendsKeyword,
  );
  if (!extendsClause?.types.length) return;

  const baseType = checker.getTypeAtLocation(extendsClause.types[0]);
  const baseSymbol = baseType.symbol;
  if (!baseSymbol?.declarations?.length) return;

  const baseDecl = baseSymbol.declarations.find(ts.isClassDeclaration);
  if (!baseDecl) return;

  const baseSourceFile = baseDecl.getSourceFile();

  // Collect existing member names to avoid duplicates (child overrides parent)
  if (!existingNames) {
    existingNames = new Set<string>();
    for (const list of [inputs, outputs, models, properties, methods, queries, hostBindings ?? [], hostListeners ?? []]) {
      for (const item of list) {
        existingNames.add(item.name);
      }
    }
  }

  // Extract base class members
  extractMembersIntoCollections(
    checker,
    baseDecl,
    baseSourceFile,
    options,
    {
      inputs,
      outputs,
      models,
      properties,
      methods,
      queries,
      hostBindings: hostBindings ?? [],
      hostListeners: hostListeners ?? [],
    },
    existingNames,
  );

  // Recurse into grandparent
  resolveInheritance(
    checker,
    baseDecl,
    baseSourceFile,
    program,
    options,
    inputs,
    outputs,
    models,
    properties,
    methods,
    queries,
    hostBindings,
    hostListeners,
    existingNames,
  );
}

/**
 * Extract a @HostBinding from a property declaration.
 */
function extractHostBindingFromProperty(
  checker: ts.TypeChecker,
  prop: ts.PropertyDeclaration,
  decorator: { name: string; args: ts.NodeArray<ts.Expression> | undefined; node: ts.Decorator },
  sourceFile: ts.SourceFile,
): HostBindingDoc | null {
  const symbol = checker.getSymbolAtLocation(prop.name);
  if (!symbol) return null;

  const memberName = getMemberName(prop);
  if (!memberName) return null;

  const hostPropertyName = getDecoratorStringArg(decorator) ?? memberName;
  const type = checker.getTypeOfSymbolAtLocation(symbol, prop);

  return {
    name: memberName,
    hostPropertyName,
    type: typeToString(checker, type, prop),
    defaultValue: getDefaultValue(prop, sourceFile),
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}

/**
 * Extract a @HostBinding from a getter accessor declaration.
 */
function extractHostBindingFromAccessor(
  checker: ts.TypeChecker,
  accessor: ts.GetAccessorDeclaration,
  decorator: { name: string; args: ts.NodeArray<ts.Expression> | undefined; node: ts.Decorator },
  sourceFile: ts.SourceFile,
): HostBindingDoc | null {
  const symbol = accessor.name ? checker.getSymbolAtLocation(accessor.name) : undefined;
  if (!symbol) return null;

  const memberName = ts.isIdentifier(accessor.name) ? accessor.name.text : undefined;
  if (!memberName) return null;

  const hostPropertyName = getDecoratorStringArg(decorator) ?? memberName;

  const signature = checker.getSignatureFromDeclaration(accessor);
  const returnType = signature
    ? checker.typeToString(checker.getReturnTypeOfSignature(signature), accessor, ts.TypeFormatFlags.NoTruncation)
    : 'unknown';

  return {
    name: memberName,
    hostPropertyName,
    type: returnType,
    defaultValue: undefined,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}

/**
 * Extract a @HostListener from a method declaration.
 */
function extractHostListener(
  checker: ts.TypeChecker,
  method: ts.MethodDeclaration,
  decorator: { name: string; args: ts.NodeArray<ts.Expression> | undefined; node: ts.Decorator },
  sourceFile: ts.SourceFile,
): HostListenerDoc | null {
  const symbol = method.name ? checker.getSymbolAtLocation(method.name) : undefined;
  if (!symbol) return null;

  const memberName = getMemberName(method);
  if (!memberName) return null;

  // First arg is the event name (required string)
  const eventName = decorator.args?.[0] && ts.isStringLiteral(decorator.args[0])
    ? decorator.args[0].text
    : memberName;

  // Second arg is an optional array of arg expressions
  const args: string[] = [];
  if (decorator.args?.[1] && ts.isArrayLiteralExpression(decorator.args[1])) {
    for (const element of decorator.args[1].elements) {
      if (ts.isStringLiteral(element)) {
        args.push(element.text);
      } else {
        args.push(element.getText(sourceFile));
      }
    }
  }

  const params = extractParams(checker, method.parameters, sourceFile, symbol);
  const signature = checker.getSignatureFromDeclaration(method);
  const returnType = getReturnTypeString(checker, signature, method);

  return {
    name: memberName,
    eventName,
    args,
    params,
    returnType,
    description: getDescription(checker, symbol),
    rawDescription: getRawDescription(symbol),
    tags: getTags(symbol),
  };
}

const DEBOUNCE_MS = 150;

/**
 * Create a watch parser that detects file changes and re-parses automatically.
 */
export function createWatchParser(
  tsconfigPath: string,
  options?: ParserOptions & {
    onUpdate?: (docs: (ComponentDoc | PipeDoc)[]) => void;
    watchDir?: string;
  },
): WatchParser {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`);
  }

  const configDir = path.dirname(path.resolve(tsconfigPath));
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    configDir,
  );

  const compilerOptions = {
    ...parsedConfig.options,
    ...options?.compilerOptions,
  };

  const rootFileNames = parsedConfig.fileNames;
  const tsFiles = rootFileNames.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
  const watchDir = options?.watchDir ?? configDir;
  const onUpdate = options?.onUpdate;

  let currentProgram: ts.Program | undefined;
  let latestDocs: (ComponentDoc | PipeDoc)[] = [];
  let watcher: fs.FSWatcher | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function buildProgram(): ts.Program {
    currentProgram = ts.createProgram({
      rootNames: rootFileNames,
      options: compilerOptions,
      oldProgram: currentProgram,
    });
    return currentProgram;
  }

  function fullParse(): (ComponentDoc | PipeDoc)[] {
    const prog = buildProgram();
    latestDocs = extractFromProgram(prog, tsFiles, options);
    return latestDocs;
  }

  // Initial parse
  fullParse();

  const watchParser: WatchParser = {
    parse(filePathOrPaths: string | string[]): (ComponentDoc | PipeDoc)[] {
      const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
      const prog = buildProgram();
      return extractFromProgram(prog, files, options);
    },

    parseAll(filePathOrPaths: string | string[]): ParseResult {
      const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
      const prog = buildProgram();
      return extractAllFromProgram(prog, files, options);
    },

    parseWithProgram(
      filePathOrPaths: string | string[],
      externalProgram: ts.Program,
    ): (ComponentDoc | PipeDoc)[] {
      const files = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
      return extractFromProgram(externalProgram, files, options);
    },

    getProgram(): ts.Program {
      if (!currentProgram) {
        buildProgram();
      }
      return currentProgram!;
    },

    getLatest(): (ComponentDoc | PipeDoc)[] {
      return latestDocs;
    },

    start(): void {
      if (watcher) return;

      watcher = fs.watch(watchDir, { recursive: true }, (_eventType, filename) => {
        if (!filename || !filename.endsWith('.ts')) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            fullParse();
            onUpdate?.(latestDocs);
          } catch (err) {
            // Syntax errors or broken files should not crash the watcher.
            // Keep the previous docs intact.
            console.warn('[ngx-component-meta] Rebuild failed, keeping previous docs:', err instanceof Error ? err.message : err);
          }
        }, DEBOUNCE_MS);
      });

      watcher.on('error', (err) => {
        console.warn('[ngx-component-meta] File watcher error:', err instanceof Error ? err.message : err);
      });
    },

    stop(): void {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
      if (watcher) {
        watcher.close();
        watcher = undefined;
      }
    },
  };

  return watchParser;
}
