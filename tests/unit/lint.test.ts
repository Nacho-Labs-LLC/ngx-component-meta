import { describe, it, expect } from 'vitest';
import { lint } from '../../src/lint.js';
import type { LintRuleConfig } from '../../src/lint.js';
import { formatLintText, formatLintJson, formatLintStylish } from '../../src/lint-formatters.js';
import { parseAllFixture, parseInlineAll } from '../helpers.js';
import type { ParseResult } from '../../src/types.js';

function emptyResult(): ParseResult {
  return {
    components: [],
    pipes: [],
    injectables: [],
    interfaces: [],
    typeAliases: [],
    enums: [],
    classes: [],
    functions: [],
    variables: [],
  };
}

describe('lint', () => {
  describe('require-input-description', () => {
    it('passes when all inputs have descriptions', () => {
      const docs = parseAllFixture('decorator-basic.component.ts');
      const result = lint(docs, { rules: { 'require-input-description': 'error' } });

      const inputDescViolations = result.violations.filter(v => v.rule === 'require-input-description');
      expect(inputDescViolations).toHaveLength(0);
    });

    it('reports a violation when an input has no description', () => {
      const docs = parseInlineAll(`
        import { Component, Input } from '@angular/core';

        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          @Input() name: string = '';
        }
      `);

      const result = lint(docs, { rules: { 'require-input-description': 'error' } });
      const violations = result.violations.filter(v => v.rule === 'require-input-description');

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
      expect(violations[0].component).toBe('TestComponent');
      expect(violations[0].member).toBe('name');
      expect(violations[0].message).toContain('missing a description');
    });
  });

  describe('require-output-description', () => {
    it('passes when all outputs have descriptions', () => {
      const docs = parseAllFixture('decorator-basic.component.ts');
      const result = lint(docs, { rules: { 'require-output-description': 'error' } });

      const outputDescViolations = result.violations.filter(v => v.rule === 'require-output-description');
      expect(outputDescViolations).toHaveLength(0);
    });

    it('reports a violation when an output has no description', () => {
      const docs = parseInlineAll(`
        import { Component, Output, EventEmitter } from '@angular/core';

        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          @Output() clicked = new EventEmitter<void>();
        }
      `);

      const result = lint(docs, { rules: { 'require-output-description': 'error' } });
      const violations = result.violations.filter(v => v.rule === 'require-output-description');

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
      expect(violations[0].member).toBe('clicked');
    });
  });

  describe('require-component-description', () => {
    it('passes when component has a description', () => {
      const docs = parseAllFixture('decorator-basic.component.ts');
      const result = lint(docs, { rules: { 'require-component-description': 'warn' } });

      const compDescViolations = result.violations.filter(
        v => v.rule === 'require-component-description' && v.component === 'ButtonComponent',
      );
      expect(compDescViolations).toHaveLength(0);
    });

    it('reports a violation when component has no description', () => {
      const docs = parseInlineAll(`
        import { Component } from '@angular/core';

        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {}
      `);

      const result = lint(docs, { rules: { 'require-component-description': 'warn' } });
      const violations = result.violations.filter(v => v.rule === 'require-component-description');

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('warn');
      expect(violations[0].message).toContain('Component is missing');
    });

    it('reports pipe missing description with "Pipe" in the message', () => {
      const docs = parseInlineAll(`
        import { Pipe, PipeTransform } from '@angular/core';

        @Pipe({ name: 'noop' })
        export class NoopPipe implements PipeTransform {
          transform(value: any): any { return value; }
        }
      `);

      const result = lint(docs, { rules: { 'require-component-description': 'warn' } });
      const violations = result.violations.filter(v => v.rule === 'require-component-description');

      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('Pipe is missing');
    });

    it('passes when pipe has a description', () => {
      const docs = parseAllFixture('pipe-basic.ts');
      const result = lint(docs, { rules: { 'require-component-description': 'warn' } });

      const pipeViolations = result.violations.filter(
        v => v.rule === 'require-component-description' && v.component === 'TruncatePipe',
      );
      expect(pipeViolations).toHaveLength(0);
    });
  });

  describe('no-any-inputs', () => {
    it('passes with typed inputs', () => {
      const docs = parseAllFixture('decorator-basic.component.ts');
      const result = lint(docs, { rules: { 'no-any-inputs': 'warn' } });

      const anyViolations = result.violations.filter(v => v.rule === 'no-any-inputs');
      expect(anyViolations).toHaveLength(0);
    });

    it('reports a violation for any-typed input', () => {
      const docs = parseInlineAll(`
        import { Component, Input } from '@angular/core';

        /** A test component. */
        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          /** Some data. */
          @Input() data: any;
        }
      `);

      const result = lint(docs, { rules: { 'no-any-inputs': 'error' } });
      const violations = result.violations.filter(v => v.rule === 'no-any-inputs');

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
      expect(violations[0].member).toBe('data');
    });
  });

  describe('no-any-outputs', () => {
    it('reports a violation for any-typed output', () => {
      const docs = parseInlineAll(`
        import { Component, Output, EventEmitter } from '@angular/core';

        /** A test component. */
        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          /** Emits something. */
          @Output() changed = new EventEmitter<any>();
        }
      `);

      const result = lint(docs, { rules: { 'no-any-outputs': 'error' } });
      const violations = result.violations.filter(v => v.rule === 'no-any-outputs');

      expect(violations).toHaveLength(1);
      expect(violations[0].member).toBe('changed');
    });
  });

  describe('require-selector', () => {
    it('passes when all fixtures have selectors', () => {
      const docs = parseAllFixture('decorator-basic.component.ts');
      const result = lint(docs, { rules: { 'require-selector': 'error' } });

      const selectorViolations = result.violations.filter(v => v.rule === 'require-selector');
      expect(selectorViolations).toHaveLength(0);
    });

    it('reports a violation when component has no selector', () => {
      const docs = parseInlineAll(`
        import { Component } from '@angular/core';

        /** A test component. */
        @Component({ template: '' })
        export class TestComponent {}
      `);

      const result = lint(docs, { rules: { 'require-selector': 'error' } });
      const violations = result.violations.filter(v => v.rule === 'require-selector');

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
      expect(violations[0].message).toContain('selector');
    });
  });

  describe('no-required-with-default', () => {
    it('reports a violation for required input with a default value', () => {
      const docs = parseInlineAll(`
        import { Component, Input } from '@angular/core';

        /** A test component. */
        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          /** The label. */
          @Input({ required: true }) label: string = 'default';
        }
      `);

      const result = lint(docs, { rules: { 'no-required-with-default': 'warn' } });
      const violations = result.violations.filter(v => v.rule === 'no-required-with-default');

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('warn');
      expect(violations[0].member).toBe('label');
    });

    it('passes when required input has no default', () => {
      const docs = parseAllFixture('decorator-basic.component.ts');
      const result = lint(docs, { rules: { 'no-required-with-default': 'warn' } });

      const violations = result.violations.filter(v => v.rule === 'no-required-with-default');
      expect(violations).toHaveLength(0);
    });
  });

  describe('severity overrides', () => {
    it('skips rules set to off', () => {
      const docs = parseInlineAll(`
        import { Component, Input } from '@angular/core';

        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          @Input() name: string = '';
        }
      `);

      const result = lint(docs, {
        rules: { 'require-input-description': 'off' },
      });

      const violations = result.violations.filter(v => v.rule === 'require-input-description');
      expect(violations).toHaveLength(0);
    });

    it('uses warn severity when configured', () => {
      const docs = parseInlineAll(`
        import { Component, Input } from '@angular/core';

        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          @Input() name: string = '';
        }
      `);

      const result = lint(docs, {
        rules: { 'require-input-description': 'warn' },
      });

      const violations = result.violations.filter(v => v.rule === 'require-input-description');
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('warn');
    });
  });

  describe('summary counts', () => {
    it('counts errors, warnings, components, and passed correctly', () => {
      const docs = parseInlineAll(`
        import { Component, Input, Output, EventEmitter } from '@angular/core';

        /** Good component. */
        @Component({ selector: 'app-good', template: '' })
        export class GoodComponent {
          /** A name. */
          @Input() name: string = '';
        }

        @Component({ selector: 'app-bad', template: '' })
        export class BadComponent {
          @Input() value: any;
          @Output() changed = new EventEmitter<void>();
        }
      `);

      const result = lint(docs, {
        rules: {
          'require-input-description': 'error',
          'require-output-description': 'error',
          'require-component-description': 'warn',
          'no-any-inputs': 'warn',
        },
      });

      expect(result.summary.components).toBe(2);
      expect(result.summary.passed).toBe(1);
      expect(result.summary.errors).toBeGreaterThan(0);
      expect(result.summary.warnings).toBeGreaterThan(0);
      expect(result.summary.errors + result.summary.warnings).toBe(result.violations.length);
    });
  });

  describe('clean result', () => {
    it('returns clean result when all rules pass', () => {
      const docs = parseAllFixture('decorator-basic.component.ts');

      // Turn off rules that the fixture might not satisfy
      const result = lint(docs, {
        rules: {
          'require-input-description': 'error',
          'require-output-description': 'error',
          'require-component-description': 'error',
          'require-selector': 'error',
          'no-any-inputs': 'error',
          'no-any-outputs': 'error',
          'no-required-with-default': 'error',
        },
      });

      expect(result.violations).toHaveLength(0);
      expect(result.summary.errors).toBe(0);
      expect(result.summary.warnings).toBe(0);
      expect(result.summary.passed).toBe(result.summary.components);
    });
  });

  describe('empty docs', () => {
    it('handles empty ParseResult gracefully', () => {
      const result = lint(emptyResult());

      expect(result.violations).toHaveLength(0);
      expect(result.summary).toEqual({ errors: 0, warnings: 0, components: 0, passed: 0 });
    });
  });

  describe('default options', () => {
    it('uses default severity levels when no options provided', () => {
      const docs = parseInlineAll(`
        import { Component, Input } from '@angular/core';

        @Component({ selector: 'app-test', template: '' })
        export class TestComponent {
          @Input() name: string = '';
        }
      `);

      const result = lint(docs);

      // require-input-description defaults to 'error'
      const inputViolations = result.violations.filter(v => v.rule === 'require-input-description');
      expect(inputViolations).toHaveLength(1);
      expect(inputViolations[0].severity).toBe('error');

      // require-component-description defaults to 'warn'
      const compViolations = result.violations.filter(v => v.rule === 'require-component-description');
      expect(compViolations).toHaveLength(1);
      expect(compViolations[0].severity).toBe('warn');
    });
  });
});

describe('lint formatters', () => {
  const docs = parseInlineAll(`
    import { Component, Input } from '@angular/core';

    @Component({ selector: 'app-test', template: '' })
    export class TestComponent {
      @Input() name: string = '';
    }
  `);
  const result = lint(docs);

  describe('formatLintText', () => {
    it('produces one-line-per-violation output', () => {
      const text = formatLintText(result);

      expect(text).toContain('ERROR');
      expect(text).toContain('require-input-description');
      expect(text).toContain('TestComponent.name');
      expect(text).toContain('missing a description');
    });

    it('produces clean message when no violations', () => {
      const cleanResult = lint(emptyResult());
      const text = formatLintText(cleanResult);
      expect(text).toContain('passed lint checks');
    });
  });

  describe('formatLintJson', () => {
    it('produces valid JSON matching LintResult', () => {
      const json = formatLintJson(result);
      const parsed = JSON.parse(json);

      expect(parsed.violations).toBeDefined();
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.errors).toBe(result.summary.errors);
      expect(parsed.summary.warnings).toBe(result.summary.warnings);
    });
  });

  describe('formatLintStylish', () => {
    it('groups violations by file and shows summary', () => {
      const text = formatLintStylish(result);

      expect(text).toContain('TestComponent');
      expect(text).toContain('require-input-description');
      // Should contain the summary line with error/warning counts
      expect(text).toMatch(/\d+ errors, \d+ warnings in \d+ components/);
    });

    it('produces clean message when no violations', () => {
      const cleanResult = lint(emptyResult());
      const text = formatLintStylish(cleanResult);
      expect(text).toContain('passed all checks');
    });
  });
});
