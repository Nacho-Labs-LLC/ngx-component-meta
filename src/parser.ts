import ts from 'typescript';
import type {
  ComponentDoc,
  PipeDoc,
  InputDoc,
  OutputDoc,
  ModelDoc,
  PropertyDoc,
  MethodDoc,
  QueryDoc,
  ParserOptions,
  Parser,
} from './types.js';
import { findDecorator, hasDecorator, getDecorators, isPrivateMember, getMemberName, getCallExpressionInitializer, getNewExpressionName } from './utils/ast-helpers.js';
import { getDescription, getRawDescription, getTags, isInternal } from './utils/jsdoc.js';
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

      // Check for @Pipe
      const pipeDecorator = findDecorator(node, 'Pipe');
      if (pipeDecorator) {
        const pipeDoc = extractPipe(checker, node, pipeDecorator, sourceFile);
        if (pipeDoc) results.push(pipeDoc);
        return;
      }

      // Check for @Component or @Directive
      const componentDecorator = findDecorator(node, 'Component');
      const directiveDecorator = findDecorator(node, 'Directive');
      const decorator = componentDecorator ?? directiveDecorator;
      if (!decorator) return;

      const doc = extractComponentDoc(checker, node, decorator, sourceFile, program, options);
      if (doc) results.push(doc);
    });
  }

  return results;
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

  const inputs: InputDoc[] = [];
  const outputs: OutputDoc[] = [];
  const models: ModelDoc[] = [];
  const properties: PropertyDoc[] = [];
  const methods: MethodDoc[] = [];
  const queries: QueryDoc[] = [];

  // Process class members
  for (const member of classDecl.members) {
    if (isPrivateMember(member)) continue;

    // Methods
    if (ts.isMethodDeclaration(member)) {
      if (options?.shouldIncludeMethods !== false) {
        const methodDoc = extractMethod(checker, member, sourceFile);
        if (methodDoc) methods.push(methodDoc);
      }
      continue;
    }

    // Properties
    if (ts.isPropertyDeclaration(member)) {
      extractPropertyMember(
        checker, member, sourceFile, options,
        inputs, outputs, models, properties, queries,
      );
    }
  }

  // Resolve inheritance
  if (options?.shouldIncludeInherited !== false) {
    resolveInheritance(
      checker, classDecl, sourceFile, program, options,
      inputs, outputs, models, properties, methods, queries,
    );
  }

  // Resolve implements
  const implementsList = classDecl.heritageClauses
    ?.filter(h => h.token === ts.SyntaxKind.ImplementsKeyword)
    .flatMap(h => h.types.map(t => t.getText(sourceFile)))
    ?? [];

  // Resolve extends
  const extendsClause = classDecl.heritageClauses?.find(
    h => h.token === ts.SyntaxKind.ExtendsKeyword,
  );
  const extendsName = extendsClause?.types[0]?.getText(sourceFile) ?? null;

  // Apply name resolver
  let name = classSymbol.getName();
  if (options?.componentNameResolver) {
    const resolved = options.componentNameResolver(classSymbol, sourceFile);
    if (resolved) name = resolved;
  }

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
    inputs,
    outputs,
    models,
    properties,
    methods,
    queries,
    implements: implementsList,
    extends: extendsName,
  };

  // Apply prop filter
  if (options?.propFilter) {
    doc.inputs = doc.inputs.filter(p => options.propFilter!(p, doc));
    doc.outputs = doc.outputs.filter(p => options.propFilter!(p, doc));
    doc.models = doc.models.filter(p => options.propFilter!(p, doc));
    doc.properties = doc.properties.filter(p => options.propFilter!(p, doc));
    doc.methods = doc.methods.filter(p => options.propFilter!(p, doc));
    doc.queries = doc.queries.filter(p => options.propFilter!(p, doc));
  }

  return doc;
}

/**
 * Classify and extract a property declaration into the right bucket.
 */
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

  // 2. Check for decorator-based @Input
  const inputDecorator = findDecorator(prop, 'Input');
  if (inputDecorator) {
    inputs.push(extractDecoratorInput(checker, prop, inputDecorator, sourceFile));
    return;
  }

  // 3. Check for decorator-based @Output
  const outputDecorator = findDecorator(prop, 'Output');
  if (outputDecorator) {
    outputs.push(extractDecoratorOutput(checker, prop, outputDecorator));
    return;
  }

  // 4. Check for decorator-based queries
  if (options?.shouldIncludeQueries) {
    for (const [decoratorName, queryKind] of Object.entries(QUERY_DECORATORS)) {
      const qDecorator = findDecorator(prop, decoratorName);
      if (qDecorator) {
        const queryDoc = extractDecoratorQuery(checker, prop, qDecorator, queryKind, sourceFile);
        if (queryDoc) queries.push(queryDoc);
        return;
      }
    }
  }

  // 5. Otherwise it's a plain property
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
  const existingNames = new Set<string>();
  for (const list of [inputs, outputs, models, properties, methods, queries]) {
    for (const item of list) {
      existingNames.add(item.name);
    }
  }

  // Extract base class members
  for (const member of baseDecl.members) {
    if (isPrivateMember(member)) continue;

    const name = getMemberName(member);
    if (!name || existingNames.has(name)) continue;

    if (ts.isMethodDeclaration(member)) {
      if (options?.shouldIncludeMethods !== false) {
        const methodDoc = extractMethod(checker, member, baseSourceFile);
        if (methodDoc) methods.push(methodDoc);
      }
    } else if (ts.isPropertyDeclaration(member)) {
      extractPropertyMember(
        checker, member, baseSourceFile, options,
        inputs, outputs, models, properties, queries,
      );
    }
  }

  // Recurse into grandparent
  resolveInheritance(
    checker, baseDecl, baseSourceFile, program, options,
    inputs, outputs, models, properties, methods, queries,
  );
}
