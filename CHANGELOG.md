# Changelog

## 0.1.0 (unreleased)

Initial release.

- Extract component/directive/pipe metadata from TypeScript source
- Support for both decorator (`@Input`, `@Output`) and signal (`input()`, `output()`, `model()`) APIs
- JSDoc extraction (description, tags)
- Storybook compatibility: `toCompodocJson()`, `createArgTypesExtractor()`
- CLI with `json`, `compodoc`, and `markdown` output formats
- `--watch` / `-w` CLI flag for automatic rebuild on file changes
- `--split` CLI flag for writing one file per component (with `markdown` format and `--output`)
- Zero runtime dependencies (typescript as peer dep)
- Inheritance resolution with child override precedence
- `propFilter` for custom member filtering
- View/content query extraction (decorator and signal)
- Pipe `transform()` signature extraction
- `parseAll()` top-level function and `parser.parseAll()` method returning `ParseResult` with all entity types
- `createWatchParser()` for file-watching with `start()`, `stop()`, and `getLatest()` methods
- Injectable extraction (`@Injectable()` classes with `providedIn`, methods, properties)
- Interface extraction (exported interfaces with properties, methods, extends)
- Type alias extraction (exported type aliases with resolved type)
- Enum extraction (exported enums with members and values)
- `ParseResult` type aggregating components, pipes, injectables, interfaces, typeAliases, enums
- Diff API: `diff()` to compare two sets of docs and detect breaking/non-breaking changes
- Diff formatters: `formatDiffText()`, `formatDiffJson()`, `formatDiffMarkdown()`
- `formatMarkdown()` for programmatic markdown output of parsed docs
- `toCompodocJson()` accepts either `(ComponentDoc | PipeDoc)[]` or `ParseResult`
