// Public API
export { parse, parseAll, createParser, createParserFromOptions, createWatchParser } from './parser.js';
export { diff } from './diff.js';
export { formatDiffText, formatDiffJson, formatDiffMarkdown } from './diff-formatters.js';
export { formatMarkdown } from './cli/formatters.js';
export { toPropsJson, toPropsJsonString } from './props-json.js';
export { computeStats } from './stats.js';
export { formatStatsText, formatStatsJson, formatStatsMarkdown } from './stats-formatters.js';

// Types
export type {
  PropsJsonComponent,
  PropsJsonProp,
  PropsJsonEvent,
  PropsJsonModel,
  PropsJsonMethod,
  PropsJsonOutput,
} from './props-json.js';

export type {
  ComponentDoc,
  PipeDoc,
  InputDoc,
  OutputDoc,
  ModelDoc,
  PropertyDoc,
  MethodDoc,
  MethodParamDoc,
  QueryDoc,
  HostBindingDoc,
  HostListenerDoc,
  MemberDoc,
  InjectableDoc,
  InterfaceDoc,
  InterfacePropertyDoc,
  InterfaceMethodDoc,
  TypeAliasDoc,
  EnumDoc,
  EnumMemberDoc,
  ClassDoc,
  FunctionDoc,
  VariableDoc,
  ParseResult,
  ParserOptions,
  Parser,
  WatchParser,
} from './types.js';

export type { ApiDiff, ApiChange } from './diff.js';
export type { MigrationStats, ComponentMigrationStats } from './stats.js';

export { lint } from './lint.js';
export { formatLintText, formatLintJson, formatLintStylish } from './lint-formatters.js';
export type { LintRule, LintViolation, LintResult, LintOptions, LintRuleConfig } from './lint.js';
