# API Reference

## Parsing

### `parse(filePathOrPaths, options?)`

One-shot parse. Auto-detects `tsconfig.json` by walking up from the first file path. Falls back to sensible compiler defaults if no tsconfig is found.

```ts
function parse(
  filePathOrPaths: string | string[],
  options?: ParserOptions,
): (ComponentDoc | PipeDoc)[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePathOrPaths` | `string \| string[]` | Absolute path(s) to `.ts` files to parse |
| `options` | `ParserOptions` | Optional parser configuration |

**Returns:** `(ComponentDoc | PipeDoc)[]`

```ts
import { parse } from 'ngx-component-meta';

const docs = parse('./src/app/button.component.ts');
console.log(docs[0].name); // 'ButtonComponent'
```

### `parseAll(filePathOrPaths, options?)`

One-shot parse returning the full `ParseResult`, including injectables, interfaces, type aliases, enums, classes, functions, and variables. Auto-detects tsconfig like `parse()`.

```ts
function parseAll(
  filePathOrPaths: string | string[],
  options?: ParserOptions,
): ParseResult
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePathOrPaths` | `string \| string[]` | Absolute path(s) to `.ts` files to parse |
| `options` | `ParserOptions` | Optional parser configuration |

**Returns:** `ParseResult`

```ts
import { parseAll } from 'ngx-component-meta';

const result = parseAll(['./src/app/button.component.ts', './src/app/types.ts']);
console.log(result.components.length, result.interfaces.length);
```

### `createParser(tsconfigPath, options?)`

Creates a reusable parser that shares a `ts.Program` across calls. Use this when parsing multiple files to avoid repeated program creation.

```ts
function createParser(tsconfigPath: string, options?: ParserOptions): Parser
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tsconfigPath` | `string` | Path to `tsconfig.json` |
| `options` | `ParserOptions` | Optional parser configuration |

**Returns:** `Parser`

```ts
import { createParser } from 'ngx-component-meta';

const parser = createParser('./tsconfig.json');
const docs = parser.parse('./src/app/button.component.ts');
const result = parser.parseAll(['./src/app/button.component.ts']);
```

### `createParserFromOptions(compilerOptions, options?)`

Creates a parser with explicit TypeScript compiler options instead of reading from a tsconfig file.

```ts
function createParserFromOptions(
  compilerOptions: ts.CompilerOptions,
  options?: ParserOptions,
): Parser
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `compilerOptions` | `ts.CompilerOptions` | TypeScript compiler options |
| `options` | `ParserOptions` | Optional parser configuration |

**Returns:** `Parser`

```ts
import ts from 'typescript';
import { createParserFromOptions } from 'ngx-component-meta';

const parser = createParserFromOptions({
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  experimentalDecorators: true,
});
```

### `createWatchParser(tsconfigPath, options?)`

Creates an incremental watch-mode parser that re-parses automatically when `.ts` files change. Uses `fs.watch` with a 150ms debounce.

```ts
function createWatchParser(
  tsconfigPath: string,
  options?: ParserOptions & {
    onUpdate?: (docs: (ComponentDoc | PipeDoc)[]) => void;
    watchDir?: string;
  },
): WatchParser
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tsconfigPath` | `string` | Path to `tsconfig.json` |
| `options.onUpdate` | `(docs) => void` | Callback invoked after each rebuild |
| `options.watchDir` | `string` | Directory to watch (defaults to tsconfig directory) |
| `options.*` | `ParserOptions` | All standard parser options also accepted |

**Returns:** `WatchParser`

```ts
import { createWatchParser } from 'ngx-component-meta';

const watcher = createWatchParser('./tsconfig.json', {
  onUpdate: (docs) => console.log(`Rebuilt: ${docs.length} docs`),
});
watcher.start();
// watcher.getLatest() returns cached docs
// watcher.stop() to clean up
```

### `Parser` interface

```ts
interface Parser {
  parse(filePathOrPaths: string | string[]): (ComponentDoc | PipeDoc)[];
  parseAll(filePathOrPaths: string | string[]): ParseResult;
  parseWithProgram(filePathOrPaths: string | string[], program: ts.Program): (ComponentDoc | PipeDoc)[];
  getProgram(): ts.Program;
}
```

### `WatchParser` interface

Extends `Parser` with:

```ts
interface WatchParser extends Parser {
  start(): void;
  stop(): void;
  getLatest(): (ComponentDoc | PipeDoc)[];
}
```

---

## ParserOptions

```ts
interface ParserOptions {
  propFilter?: (prop: MemberDoc, component: ComponentDoc) => boolean;
  componentNameResolver?: (symbol: ts.Symbol, source: ts.SourceFile) => string | undefined;
  shouldExtractLiteralValuesFromEnum?: boolean;
  shouldIncludeInherited?: boolean;
  shouldIncludeMethods?: boolean;
  shouldIncludeQueries?: boolean;
  compilerOptions?: ts.CompilerOptions;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `propFilter` | `(prop, component) => boolean` | Include all non-private, non-`@internal` members | Filter which members to include in output. Return `true` to include. |
| `componentNameResolver` | `(symbol, source) => string \| undefined` | Uses the class name | Custom name resolver for components/directives. |
| `shouldExtractLiteralValuesFromEnum` | `boolean` | `true` | Extract enum literal values into type strings. |
| `shouldIncludeInherited` | `boolean` | `true` | Include members inherited from base classes. |
| `shouldIncludeMethods` | `boolean` | `true` | Include methods in the output. |
| `shouldIncludeQueries` | `boolean` | `false` | Include `@ViewChild`/`@ContentChild` and signal queries. |
| `compilerOptions` | `ts.CompilerOptions` | From tsconfig | Merge/override TypeScript compiler options. |

`MemberDoc` is the union: `InputDoc | OutputDoc | ModelDoc | PropertyDoc | MethodDoc | QueryDoc | HostBindingDoc | HostListenerDoc`

---

## Output Types

### Container

#### `ParseResult`

Top-level result from `parseAll()`.

| Field | Type | Description |
|-------|------|-------------|
| `components` | `ComponentDoc[]` | Components and directives |
| `pipes` | `PipeDoc[]` | Pipes |
| `injectables` | `InjectableDoc[]` | `@Injectable` classes |
| `interfaces` | `InterfaceDoc[]` | Exported interfaces |
| `typeAliases` | `TypeAliasDoc[]` | Exported type aliases |
| `enums` | `EnumDoc[]` | Exported enums |
| `classes` | `ClassDoc[]` | Exported classes (non-Angular) |
| `functions` | `FunctionDoc[]` | Exported functions |
| `variables` | `VariableDoc[]` | Exported variables |

### Component / Directive

#### `ComponentDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Class name |
| `filePath` | `string` | Absolute file path |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw (unprocessed) JSDoc text |
| `kind` | `'component' \| 'directive'` | Angular entity kind |
| `selector` | `string \| null` | CSS selector from decorator metadata |
| `standalone` | `boolean` | Whether standalone |
| `exportAs` | `string \| null` | `exportAs` from decorator metadata |
| `tags` | `Record<string, string>` | All JSDoc tags |
| `inputs` | `InputDoc[]` | Both `@Input()` and signal `input()` |
| `outputs` | `OutputDoc[]` | Both `@Output()` and signal `output()` |
| `models` | `ModelDoc[]` | Two-way bindings via `model()` |
| `properties` | `PropertyDoc[]` | Other public properties |
| `methods` | `MethodDoc[]` | Public methods |
| `queries` | `QueryDoc[]` | View and content queries |
| `hostBindings` | `HostBindingDoc[]` | `@HostBinding` properties |
| `hostListeners` | `HostListenerDoc[]` | `@HostListener` methods |
| `implements` | `string[]` | Implemented interfaces |
| `extends` | `string \| null` | Superclass name |

### Pipe

#### `PipeDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Class name |
| `filePath` | `string` | Absolute file path |
| `pipeName` | `string` | Template name from `@Pipe({ name })` |
| `standalone` | `boolean` | Whether standalone |
| `pure` | `boolean` | Whether pure (default `true`) |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `transform` | `{ params: MethodParamDoc[]; returnType: string }` | The `transform()` method signature |

### Input / Output / Model

#### `InputDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name in the class |
| `bindingName` | `string` | Template binding name (alias or property name) |
| `type` | `string` | Unwrapped type (e.g., `string`, not `InputSignal<string>`) |
| `required` | `boolean` | Whether the input is required |
| `defaultValue` | `string \| undefined` | Default value as source text |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `source` | `'decorator' \| 'signal'` | Declaration style |
| `transform` | `string \| null` | Transform function name, if specified |

#### `OutputDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name in the class |
| `bindingName` | `string` | Template binding name |
| `type` | `string` | Emitted event type (the `T` in `EventEmitter<T>`) |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `source` | `'decorator' \| 'signal'` | Declaration style |

#### `ModelDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name in the class |
| `bindingName` | `string` | Template binding name |
| `type` | `string` | Model value type |
| `required` | `boolean` | Whether `model.required()` was used |
| `defaultValue` | `string \| undefined` | Default value, if provided |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

### Members

#### `PropertyDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name |
| `type` | `string` | TypeScript type |
| `defaultValue` | `string \| undefined` | Default value as source text |
| `optional` | `boolean` | Whether optional |
| `modifier` | `'public' \| 'protected' \| 'readonly'` | Visibility modifier |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

#### `MethodDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Method name |
| `params` | `MethodParamDoc[]` | Parameters |
| `returnType` | `string` | Return type |
| `modifier` | `'public' \| 'protected'` | Visibility modifier |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

#### `MethodParamDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Parameter name |
| `type` | `string` | Parameter type |
| `optional` | `boolean` | Whether optional |
| `defaultValue` | `string \| undefined` | Default value |
| `description` | `string` | JSDoc `@param` description |

#### `QueryDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name |
| `kind` | `'viewChild' \| 'viewChildren' \| 'contentChild' \| 'contentChildren'` | Query kind |
| `selector` | `string` | Template ref string or component class name |
| `type` | `string` | Resolved type |
| `required` | `boolean` | Whether `.required()` was used |
| `source` | `'decorator' \| 'signal'` | Declaration style |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

#### `HostBindingDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name in the class |
| `hostPropertyName` | `string` | Host property name (e.g., `class.active`, `attr.role`) |
| `type` | `string` | TypeScript type |
| `defaultValue` | `string \| undefined` | Default value as source text |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

#### `HostListenerDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Method name in the class |
| `eventName` | `string` | DOM event name (e.g., `click`, `window:resize`) |
| `args` | `string[]` | Arg expressions from decorator (e.g., `['$event']`) |
| `params` | `MethodParamDoc[]` | Method parameters |
| `returnType` | `string` | Return type |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

### Non-Angular Types

#### `InjectableDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Class name |
| `filePath` | `string` | Absolute file path |
| `providedIn` | `'root' \| 'platform' \| 'any' \| null` | `providedIn` value from `@Injectable` |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `methods` | `MethodDoc[]` | Public methods |
| `properties` | `PropertyDoc[]` | Public properties |

#### `InterfaceDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Interface name |
| `filePath` | `string` | Absolute file path |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `properties` | `InterfacePropertyDoc[]` | Interface properties |
| `methods` | `InterfaceMethodDoc[]` | Interface methods |
| `extends` | `string[]` | Extended interfaces |

#### `InterfacePropertyDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name |
| `type` | `string` | Type |
| `optional` | `boolean` | Whether optional |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

#### `InterfaceMethodDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Method name |
| `params` | `MethodParamDoc[]` | Parameters |
| `returnType` | `string` | Return type |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

#### `TypeAliasDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Type alias name |
| `filePath` | `string` | Absolute file path |
| `type` | `string` | Resolved type as a string |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

#### `EnumDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Enum name |
| `filePath` | `string` | Absolute file path |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `members` | `EnumMemberDoc[]` | Enum members |

#### `EnumMemberDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Member name |
| `value` | `string` | Member value |
| `description` | `string` | JSDoc description |

#### `ClassDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Class name |
| `filePath` | `string` | Absolute file path |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `methods` | `MethodDoc[]` | Public methods |
| `properties` | `PropertyDoc[]` | Public properties |
| `extends` | `string \| null` | Extended class name |
| `implements` | `string[]` | Implemented interfaces |

#### `FunctionDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Function name |
| `filePath` | `string` | Absolute file path |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |
| `params` | `MethodParamDoc[]` | Parameters |
| `returnType` | `string` | Return type |

#### `VariableDoc`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Variable name |
| `filePath` | `string` | Absolute file path |
| `type` | `string` | Type |
| `defaultValue` | `string \| undefined` | Default value as source text |
| `isConst` | `boolean` | Whether declared with `const` |
| `description` | `string` | JSDoc description |
| `rawDescription` | `string` | Raw JSDoc text |
| `tags` | `Record<string, string>` | JSDoc tags |

---

## API Diffing

### `diff(base, head)`

Compares two sets of parsed docs and returns a structured diff of breaking and non-breaking changes.

```ts
function diff(
  base: (ComponentDoc | PipeDoc)[],
  head: (ComponentDoc | PipeDoc)[],
): ApiDiff
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `base` | `(ComponentDoc \| PipeDoc)[]` | Baseline docs (e.g., previous version) |
| `head` | `(ComponentDoc \| PipeDoc)[]` | Updated docs (e.g., current version) |

**Returns:** `ApiDiff`

```ts
import { parse, diff } from 'ngx-component-meta';

const base = parse('./v1/button.component.ts');
const head = parse('./v2/button.component.ts');
const result = diff(base, head);
console.log(result.summary); // { breaking: 1, nonBreaking: 3 }
```

### `ApiDiff`

| Field | Type | Description |
|-------|------|-------------|
| `breaking` | `ApiChange[]` | Breaking changes |
| `nonBreaking` | `ApiChange[]` | Non-breaking changes |
| `summary` | `{ breaking: number; nonBreaking: number }` | Counts |

### `ApiChange`

| Field | Type | Description |
|-------|------|-------------|
| `component` | `string` | Component/pipe name |
| `change` | `string` | Change type identifier |
| `name` | `string` | Affected member name |
| `details` | `Record<string, any>` | Change-specific details (before/after values, types, etc.) |

### Change Types

#### Breaking

| Change | Description |
|--------|-------------|
| `component-removed` | Component/directive was removed |
| `selector-changed` | CSS selector was changed |
| `input-removed` | Input was removed |
| `input-type-changed` | Input type was changed |
| `input-became-required` | Input changed from optional to required |
| `input-default-removed` | Input default value was removed |
| `input-added-required` | New required input was added |
| `output-removed` | Output was removed |
| `output-type-changed` | Output type was changed |
| `model-removed` | Model was removed |
| `model-type-changed` | Model type was changed |
| `model-became-required` | Model changed from optional to required |
| `model-default-removed` | Model default value was removed |
| `method-removed` | Public method was removed |
| `method-return-type-changed` | Method return type was changed |
| `method-param-type-changed` | Method parameter type was changed |
| `method-param-added-required` | New required parameter was added to method |
| `pipe-removed` | Pipe was removed |
| `pipe-transform-changed` | Pipe `transform()` signature was changed |

#### Non-Breaking

| Change | Description |
|--------|-------------|
| `component-added` | New component/directive was added |
| `input-added` | New optional input was added |
| `input-became-optional` | Input changed from required to optional |
| `input-default-added` | Default value was added to input |
| `default-changed` | Default value was changed |
| `description-changed` | JSDoc description was updated |
| `output-added` | New output was added |
| `model-added` | New model was added |
| `model-became-optional` | Model changed from required to optional |
| `model-default-added` | Default value was added to model |
| `model-default-changed` | Model default value was changed |
| `method-added` | New public method was added |
| `method-param-added` | New optional parameter was added to method |
| `property-added` | New property was added |
| `property-removed` | Property was removed |
| `property-changed` | Property type was changed |
| `pipe-added` | New pipe was added |

### Diff Formatters

#### `formatDiffText(result)`

Plain text output, grouped by component. Breaking changes prefixed with `x`, non-breaking with `+`.

```ts
function formatDiffText(result: ApiDiff): string
```

#### `formatDiffJson(result)`

`JSON.stringify` with 2-space indentation.

```ts
function formatDiffJson(result: ApiDiff): string
```

#### `formatDiffMarkdown(result)`

Markdown with header and tables for breaking/non-breaking changes.

```ts
function formatDiffMarkdown(result: ApiDiff): string
```

---

## Linting

### `lint(docs, options?)`

Runs lint rules against parsed docs and returns violations.

```ts
function lint(docs: ParseResult, options?: Partial<LintOptions>): LintResult
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `docs` | `ParseResult` | Output from `parseAll()` |
| `options` | `Partial<LintOptions>` | Override rule severities |

**Returns:** `LintResult`

```ts
import { parseAll, lint } from 'ngx-component-meta';

const result = parseAll('./src/app/button.component.ts');
const lintResult = lint(result, {
  rules: { 'no-any-inputs': 'error' },
});
console.log(lintResult.summary); // { errors: 0, warnings: 1, components: 1, passed: 0 }
```

### `LintOptions`

```ts
interface LintOptions {
  rules: LintRuleConfig;
}
```

### `LintRuleConfig`

| Rule | Description | Default |
|------|-------------|---------|
| `require-input-description` | Every `@Input` must have a JSDoc description | `'error'` |
| `require-output-description` | Every `@Output` must have a JSDoc description | `'error'` |
| `require-component-description` | Every component/directive/pipe must have a JSDoc description | `'warn'` |
| `no-any-inputs` | No inputs with type `any` | `'warn'` |
| `no-any-outputs` | No outputs with type `any` | `'warn'` |
| `no-required-with-default` | Required inputs must not have default values | `'warn'` |
| `require-selector` | Component must have a selector defined | `'error'` |

Each rule accepts `'error' | 'warn' | 'off'`.

### `LintResult`

| Field | Type | Description |
|-------|------|-------------|
| `violations` | `LintViolation[]` | All violations found |
| `summary.errors` | `number` | Number of errors |
| `summary.warnings` | `number` | Number of warnings |
| `summary.components` | `number` | Total components + pipes checked |
| `summary.passed` | `number` | Components with zero violations |

### `LintViolation`

| Field | Type | Description |
|-------|------|-------------|
| `rule` | `string` | Rule name |
| `severity` | `'error' \| 'warn'` | Severity level |
| `component` | `string` | Component/pipe name |
| `member` | `string \| undefined` | Affected member name (if applicable) |
| `message` | `string` | Human-readable message |
| `filePath` | `string` | File path |

### `LintRule`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique rule name |
| `description` | `string` | Human-readable description |
| `severity` | `'error' \| 'warn'` | Severity |

### Lint Formatters

#### `formatLintText(result)`

One line per violation. Example: `ERROR require-input-description: ButtonComponent.variant -- Input is missing a description (src/button.component.ts)`

```ts
function formatLintText(result: LintResult): string
```

#### `formatLintJson(result)`

`JSON.stringify` with 2-space indentation.

```ts
function formatLintJson(result: LintResult): string
```

#### `formatLintStylish(result)`

ESLint-style output grouped by file path.

```ts
function formatLintStylish(result: LintResult): string
```

---

## Migration Statistics

### `computeStats(result)`

Computes signal migration statistics from a `ParseResult`, showing adoption percentage and per-component breakdown.

```ts
function computeStats(result: ParseResult): MigrationStats
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | `ParseResult` | Output from `parseAll()` |

**Returns:** `MigrationStats`

```ts
import { parseAll, computeStats } from 'ngx-component-meta';

const result = parseAll('./src/**/*.component.ts');
const stats = computeStats(result);
console.log(`Signal adoption: ${stats.signalAdoption}%`);
```

### `MigrationStats`

| Field | Type | Description |
|-------|------|-------------|
| `signalAdoption` | `number` | Overall signal adoption percentage (0--100) |
| `inputs.total` | `number` | Total inputs |
| `inputs.decorator` | `number` | Decorator-based inputs |
| `inputs.signal` | `number` | Signal-based inputs |
| `inputs.percentage` | `number` | Signal input percentage |
| `outputs.total` | `number` | Total outputs |
| `outputs.decorator` | `number` | Decorator-based outputs |
| `outputs.signal` | `number` | Signal-based outputs |
| `outputs.percentage` | `number` | Signal output percentage |
| `models.total` | `number` | Total models (always signals) |
| `components` | `ComponentMigrationStats[]` | Per-component breakdown, sorted by status |
| `componentSummary.fullyMigrated` | `number` | All inputs+outputs use signals |
| `componentSummary.partiallyMigrated` | `number` | Mix of decorator and signal |
| `componentSummary.legacy` | `number` | All inputs+outputs use decorators |
| `componentSummary.noBindings` | `number` | No inputs or outputs |
| `componentSummary.total` | `number` | Total components |

### `ComponentMigrationStats`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Component name |
| `filePath` | `string` | File path |
| `status` | `'fully-migrated' \| 'partially-migrated' \| 'legacy' \| 'no-bindings'` | Migration status |
| `inputs.decorator` | `number` | Decorator-based input count |
| `inputs.signal` | `number` | Signal-based input count |
| `outputs.decorator` | `number` | Decorator-based output count |
| `outputs.signal` | `number` | Signal-based output count |
| `models` | `number` | Model count |

### Stats Formatters

#### `formatStatsText(stats)`

Human-readable summary with percentages and lists of legacy/partially-migrated components.

```ts
function formatStatsText(stats: MigrationStats): string
```

#### `formatStatsJson(stats)`

`JSON.stringify` with 2-space indentation.

```ts
function formatStatsJson(stats: MigrationStats): string
```

#### `formatStatsMarkdown(stats)`

Markdown with summary table, component summary table, and full component breakdown.

```ts
function formatStatsMarkdown(stats: MigrationStats): string
```

---

## Props JSON

### `toPropsJson(result, options?)`

Converts a `ParseResult` into a simplified, framework-agnostic JSON format for rendering prop tables in documentation sites.

```ts
function toPropsJson(
  result: ParseResult,
  options?: { version?: string },
): PropsJsonOutput
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | `ParseResult` | Output from `parseAll()` |
| `options.version` | `string` | Version string (defaults to `'0.0.0'`) |

**Returns:** `PropsJsonOutput`

```ts
import { parseAll, toPropsJson } from 'ngx-component-meta';

const result = parseAll('./src/app/button.component.ts');
const json = toPropsJson(result, { version: '1.0.0' });
```

### `toPropsJsonString(result, options?)`

Convenience wrapper that returns a JSON string.

```ts
function toPropsJsonString(
  result: ParseResult,
  options?: { version?: string; pretty?: boolean },
): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `result` | `ParseResult` | Output from `parseAll()` |
| `options.version` | `string` | Version string (defaults to `'0.0.0'`) |
| `options.pretty` | `boolean` | Pretty-print with 2-space indentation |

### `PropsJsonOutput`

| Field | Type | Description |
|-------|------|-------------|
| `components` | `PropsJsonComponent[]` | All components, directives, and pipes (sorted by name) |
| `generatedAt` | `string` | ISO 8601 generation timestamp |
| `version` | `string` | Generator version |

### `PropsJsonComponent`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Class name |
| `kind` | `'component' \| 'directive' \| 'pipe'` | Entity kind |
| `description` | `string` | JSDoc description |
| `selector` | `string \| null` | CSS selector (`null` for pipes) |
| `props` | `PropsJsonProp[]` | Inputs (omitted if empty) |
| `events` | `PropsJsonEvent[]` | Outputs (omitted if empty) |
| `models` | `PropsJsonModel[]` | Two-way bindings (omitted if empty) |
| `methods` | `PropsJsonMethod[]` | Public methods (omitted if empty) |
| `transform` | `object` | Pipe transform signature (pipes only) |

### `PropsJsonProp`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name |
| `bindingName` | `string` | Template binding name (only if different from `name`) |
| `type` | `string` | Type |
| `required` | `boolean` | Whether required |
| `defaultValue` | `string` | Default value (omitted if none) |
| `description` | `string` | JSDoc description |
| `signal` | `boolean` | Whether this is a signal input |

### `PropsJsonEvent`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name |
| `bindingName` | `string` | Template binding name (only if different from `name`) |
| `type` | `string` | Emitted event type |
| `description` | `string` | JSDoc description |
| `signal` | `boolean` | Whether this is a signal output |

### `PropsJsonModel`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name |
| `bindingName` | `string` | Template binding name (only if different from `name`) |
| `type` | `string` | Model value type |
| `required` | `boolean` | Whether required |
| `defaultValue` | `string` | Default value (omitted if none) |
| `description` | `string` | JSDoc description |

### `PropsJsonMethod`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Method name |
| `signature` | `string` | Formatted signature string, e.g. `(value: string) => void` |
| `description` | `string` | JSDoc description |

---

## Storybook Integration

Import from `ngx-component-meta/storybook`.

### `toCompodocJson(docs)`

Converts parsed docs to Compodoc JSON format for use with Storybook's `setCompodocJson()`. Accepts either the legacy array format or a full `ParseResult`.

```ts
function toCompodocJson(
  docs: (ComponentDoc | PipeDoc)[] | ParseResult,
): CompodocJson
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `docs` | `(ComponentDoc \| PipeDoc)[] \| ParseResult` | Parsed docs or full parse result |

**Returns:** `CompodocJson`

When a `ParseResult` is passed, the output also includes `injectables`, `classes`, and `miscellaneous` (type aliases, enums, functions, variables).

```ts
import { parseAll } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';
import { setCompodocJson } from '@storybook/addon-docs/angular';

const result = parseAll('./src/app/button.component.ts');
setCompodocJson(toCompodocJson(result));
```

### `createArgTypesExtractor(tsconfigPath, options?)`

Creates a Storybook `extractArgTypes` function that bypasses Compodoc entirely. Uses `createParser` internally and caches results by component name.

```ts
function createArgTypesExtractor(
  tsconfigPath: string,
  options?: ParserOptions,
): (component: any) => Record<string, StrictInputType> | null
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tsconfigPath` | `string` | Path to `tsconfig.json` |
| `options` | `ParserOptions` | Optional parser configuration |

**Returns:** A function compatible with Storybook's `parameters.docs.extractArgTypes`.

```ts
// .storybook/preview.ts
import { createArgTypesExtractor } from 'ngx-component-meta/storybook';

export default {
  parameters: {
    docs: {
      extractArgTypes: createArgTypesExtractor('./tsconfig.json'),
    },
  },
};
```

### `CompodocJson`

| Field | Type | Description |
|-------|------|-------------|
| `components` | `CompodocComponent[]` | Components |
| `directives` | `CompodocDirective[]` | Directives |
| `pipes` | `CompodocPipe[]` | Pipes |
| `injectables` | `CompodocInjectable[]` | Injectables |
| `classes` | `CompodocClass[]` | Classes |
| `miscellaneous` | `object` | Contains `typealiases`, `enumerations`, `functions`, `variables` |
