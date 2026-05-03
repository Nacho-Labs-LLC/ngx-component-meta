import type { ParseResult, ComponentDoc, PipeDoc } from './types.js';

export interface LintRule {
  /** Unique rule name, e.g. 'require-input-description' */
  name: string;
  /** Human-readable description */
  description: string;
  /** Severity: 'error' fails CI, 'warn' just reports */
  severity: 'error' | 'warn';
}

export interface LintViolation {
  rule: string;
  severity: 'error' | 'warn';
  component: string;
  member?: string;
  message: string;
  filePath: string;
}

export interface LintResult {
  violations: LintViolation[];
  summary: { errors: number; warnings: number; components: number; passed: number };
}

export interface LintOptions {
  rules: LintRuleConfig;
}

export interface LintRuleConfig {
  /** Every @Input must have a JSDoc description. Default: 'error' */
  'require-input-description'?: 'error' | 'warn' | 'off';
  /** Every @Output must have a JSDoc description. Default: 'error' */
  'require-output-description'?: 'error' | 'warn' | 'off';
  /** Every component/directive must have a JSDoc description. Default: 'warn' */
  'require-component-description'?: 'error' | 'warn' | 'off';
  /** No inputs with type 'any'. Default: 'warn' */
  'no-any-inputs'?: 'error' | 'warn' | 'off';
  /** No outputs with type 'any'. Default: 'warn' */
  'no-any-outputs'?: 'error' | 'warn' | 'off';
  /** Required inputs must not have default values (contradictory). Default: 'warn' */
  'no-required-with-default'?: 'error' | 'warn' | 'off';
  /** Component must have a selector defined. Default: 'error' */
  'require-selector'?: 'error' | 'warn' | 'off';
}

type Severity = 'error' | 'warn' | 'off';

const DEFAULT_RULES: Required<LintRuleConfig> = {
  'require-input-description': 'error',
  'require-output-description': 'error',
  'require-component-description': 'warn',
  'no-any-inputs': 'warn',
  'no-any-outputs': 'warn',
  'no-required-with-default': 'warn',
  'require-selector': 'error',
};

function resolveRules(userRules?: Partial<LintRuleConfig>): Required<LintRuleConfig> {
  return { ...DEFAULT_RULES, ...userRules };
}

function pushViolation(
  violations: LintViolation[],
  severity: Severity,
  rule: string,
  component: string,
  filePath: string,
  message: string,
  member?: string,
): void {
  if (severity === 'off') return;
  violations.push({ rule, severity, component, member, message, filePath });
}

function lintComponent(
  doc: ComponentDoc,
  rules: Required<LintRuleConfig>,
  violations: LintViolation[],
): boolean {
  const before = violations.length;

  // require-component-description
  if (rules['require-component-description'] !== 'off' && !doc.description.trim()) {
    pushViolation(
      violations, rules['require-component-description'],
      'require-component-description', doc.name, doc.filePath,
      `Component is missing a description`,
    );
  }

  // require-selector
  if (rules['require-selector'] !== 'off' && !doc.selector) {
    pushViolation(
      violations, rules['require-selector'],
      'require-selector', doc.name, doc.filePath,
      `Component must have a selector defined`,
    );
  }

  // Input rules
  for (const input of doc.inputs) {
    if (rules['require-input-description'] !== 'off' && !input.description.trim()) {
      pushViolation(
        violations, rules['require-input-description'],
        'require-input-description', doc.name, doc.filePath,
        `Input is missing a description`,
        input.name,
      );
    }

    if (rules['no-any-inputs'] !== 'off' && input.type === 'any') {
      pushViolation(
        violations, rules['no-any-inputs'],
        'no-any-inputs', doc.name, doc.filePath,
        `Input should not use type 'any'`,
        input.name,
      );
    }

    if (rules['no-required-with-default'] !== 'off' && input.required && input.defaultValue !== undefined) {
      pushViolation(
        violations, rules['no-required-with-default'],
        'no-required-with-default', doc.name, doc.filePath,
        `Required input should not have a default value`,
        input.name,
      );
    }
  }

  // Output rules
  for (const output of doc.outputs) {
    if (rules['require-output-description'] !== 'off' && !output.description.trim()) {
      pushViolation(
        violations, rules['require-output-description'],
        'require-output-description', doc.name, doc.filePath,
        `Output is missing a description`,
        output.name,
      );
    }

    if (rules['no-any-outputs'] !== 'off' && output.type === 'any') {
      pushViolation(
        violations, rules['no-any-outputs'],
        'no-any-outputs', doc.name, doc.filePath,
        `Output should not use type 'any'`,
        output.name,
      );
    }
  }

  return violations.length === before;
}

function lintPipe(
  doc: PipeDoc,
  rules: Required<LintRuleConfig>,
  violations: LintViolation[],
): boolean {
  const before = violations.length;

  if (rules['require-component-description'] !== 'off' && !doc.description.trim()) {
    pushViolation(
      violations, rules['require-component-description'],
      'require-component-description', doc.name, doc.filePath,
      `Pipe is missing a description`,
    );
  }

  return violations.length === before;
}

export function lint(docs: ParseResult, options?: Partial<LintOptions>): LintResult {
  const rules = resolveRules(options?.rules);
  const violations: LintViolation[] = [];
  let passed = 0;
  const totalEntities = docs.components.length + docs.pipes.length;

  for (const component of docs.components) {
    const clean = lintComponent(component, rules, violations);
    if (clean) passed++;
  }

  for (const pipe of docs.pipes) {
    const clean = lintPipe(pipe, rules, violations);
    if (clean) passed++;
  }

  const errors = violations.filter(v => v.severity === 'error').length;
  const warnings = violations.filter(v => v.severity === 'warn').length;

  return {
    violations,
    summary: {
      errors,
      warnings,
      components: totalEntities,
      passed,
    },
  };
}
