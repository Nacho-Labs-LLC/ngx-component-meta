import { describe, it, expect } from 'vitest';
import path from 'path';
import ts from '@typescript/typescript6';
import { createParserFromOptions } from '../../src/parser.js';
import { computeStats } from '../../src/stats.js';
import { formatStatsText, formatStatsJson, formatStatsMarkdown } from '../../src/stats-formatters.js';
import { parseAllFixture } from '../helpers.js';
import type { ParseResult, ComponentDoc } from '../../src/types.js';

const STUBS_DIR = path.join(import.meta.dirname, '..', 'stubs');
const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures');

const BASE_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  experimentalDecorators: true,
  emitDecoratorMetadata: false,
  strict: true,
  paths: {
    '@angular/core': [path.join(STUBS_DIR, 'angular-core.d.ts')],
  },
  baseUrl: FIXTURES_DIR,
};

function parseMultipleFixtures(...fixtureNames: string[]): ParseResult {
  const filePaths = fixtureNames.map(name => path.join(FIXTURES_DIR, name));
  const parser = createParserFromOptions(BASE_COMPILER_OPTIONS);
  return parser.parseAll(filePaths);
}

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

describe('computeStats', () => {
  describe('signal-basic.component.ts (all signals)', () => {
    it('reports fully-migrated with 100% adoption', () => {
      const result = parseAllFixture('signal-basic.component.ts');
      const stats = computeStats(result);

      expect(stats.signalAdoption).toBe(100);
      expect(stats.inputs.signal).toBe(3);
      expect(stats.inputs.decorator).toBe(0);
      expect(stats.inputs.total).toBe(3);
      expect(stats.inputs.percentage).toBe(100);
      expect(stats.outputs.signal).toBe(2);
      expect(stats.outputs.decorator).toBe(0);
      expect(stats.outputs.total).toBe(2);
      expect(stats.outputs.percentage).toBe(100);
      expect(stats.models.total).toBe(2);

      expect(stats.components).toHaveLength(1);
      expect(stats.components[0].status).toBe('fully-migrated');
      expect(stats.components[0].name).toBe('CardComponent');

      expect(stats.componentSummary.fullyMigrated).toBe(1);
      expect(stats.componentSummary.partiallyMigrated).toBe(0);
      expect(stats.componentSummary.legacy).toBe(0);
      expect(stats.componentSummary.noBindings).toBe(0);
      expect(stats.componentSummary.total).toBe(1);
    });
  });

  describe('decorator-basic.component.ts (all decorators)', () => {
    it('reports legacy with 0% adoption', () => {
      const result = parseAllFixture('decorator-basic.component.ts');
      const stats = computeStats(result);

      expect(stats.signalAdoption).toBe(0);
      expect(stats.inputs.signal).toBe(0);
      expect(stats.inputs.decorator).toBe(3);
      expect(stats.inputs.total).toBe(3);
      expect(stats.inputs.percentage).toBe(0);
      expect(stats.outputs.signal).toBe(0);
      expect(stats.outputs.decorator).toBe(2);
      expect(stats.outputs.total).toBe(2);
      expect(stats.outputs.percentage).toBe(0);
      expect(stats.models.total).toBe(0);

      expect(stats.components).toHaveLength(1);
      expect(stats.components[0].status).toBe('legacy');
      expect(stats.components[0].name).toBe('ButtonComponent');

      expect(stats.componentSummary.fullyMigrated).toBe(0);
      expect(stats.componentSummary.legacy).toBe(1);
      expect(stats.componentSummary.total).toBe(1);
    });
  });

  describe('mixed.component.ts (both)', () => {
    it('reports partially-migrated with correct counts', () => {
      const result = parseAllFixture('mixed.component.ts');
      const stats = computeStats(result);

      // MixedComponent: 1 decorator input, 1 signal input, 1 decorator output, 1 signal output, 1 model
      expect(stats.inputs.decorator).toBe(1);
      expect(stats.inputs.signal).toBe(1);
      expect(stats.outputs.decorator).toBe(1);
      expect(stats.outputs.signal).toBe(1);
      expect(stats.models.total).toBe(1);

      // signalAdoption = (1 + 1 + 1) / (2 + 2 + 1) * 100 = 60%
      expect(stats.signalAdoption).toBe(60);
      expect(stats.inputs.percentage).toBe(50);
      expect(stats.outputs.percentage).toBe(50);

      expect(stats.components).toHaveLength(1);
      expect(stats.components[0].status).toBe('partially-migrated');

      expect(stats.componentSummary.partiallyMigrated).toBe(1);
    });
  });

  describe('multiple files aggregated', () => {
    it('computes correct aggregate stats across files', () => {
      const result = parseMultipleFixtures(
        'signal-basic.component.ts',
        'decorator-basic.component.ts',
        'mixed.component.ts',
      );
      const stats = computeStats(result);

      // signal-basic: 3 signal inputs, 2 signal outputs, 2 models
      // decorator-basic: 3 decorator inputs, 2 decorator outputs
      // mixed: 1 decorator input + 1 signal input, 1 decorator output + 1 signal output, 1 model
      expect(stats.inputs.decorator).toBe(4);   // 3 + 1
      expect(stats.inputs.signal).toBe(4);       // 3 + 1
      expect(stats.inputs.total).toBe(8);
      expect(stats.outputs.decorator).toBe(3);   // 2 + 1
      expect(stats.outputs.signal).toBe(3);       // 2 + 1
      expect(stats.outputs.total).toBe(6);
      expect(stats.models.total).toBe(3);         // 2 + 1

      // signalAdoption = (4 + 3 + 3) / (8 + 6 + 3) * 100 = 10/17 * 100 = 58.8%
      expect(stats.signalAdoption).toBe(58.8);

      expect(stats.componentSummary.fullyMigrated).toBe(1);
      expect(stats.componentSummary.partiallyMigrated).toBe(1);
      expect(stats.componentSummary.legacy).toBe(1);
      expect(stats.componentSummary.total).toBe(3);
    });

    it('sorts components: legacy first, then partially-migrated, then fully-migrated', () => {
      const result = parseMultipleFixtures(
        'signal-basic.component.ts',
        'decorator-basic.component.ts',
        'mixed.component.ts',
      );
      const stats = computeStats(result);

      expect(stats.components[0].status).toBe('legacy');
      expect(stats.components[1].status).toBe('partially-migrated');
      expect(stats.components[2].status).toBe('fully-migrated');
    });
  });

  describe('no-bindings component', () => {
    it('classifies component with no inputs/outputs/models as no-bindings', () => {
      const result: ParseResult = {
        ...emptyResult(),
        components: [{
          name: 'EmptyComponent',
          filePath: '/empty.ts',
          description: '',
          rawDescription: '',
          kind: 'component',
          selector: 'app-empty',
          standalone: true,
          exportAs: null,
          tags: {},
          inputs: [],
          outputs: [],
          models: [],
          properties: [],
          methods: [],
          queries: [],
          hostBindings: [],
          hostListeners: [],
          implements: [],
          extends: null,
        }],
      };
      const stats = computeStats(result);

      expect(stats.components).toHaveLength(1);
      expect(stats.components[0].status).toBe('no-bindings');
      expect(stats.signalAdoption).toBe(0);
      expect(stats.componentSummary.noBindings).toBe(1);
      expect(stats.componentSummary.total).toBe(1);
    });

    it('does not affect adoption percentages', () => {
      const result = parseMultipleFixtures(
        'signal-basic.component.ts',
        'decorator-basic.component.ts',
      );
      // Add a synthetic no-bindings component
      result.components.push({
        name: 'EmptyComponent',
        filePath: '/empty.ts',
        description: '',
        rawDescription: '',
        kind: 'component',
        selector: 'app-empty',
        standalone: true,
        exportAs: null,
        tags: {},
        inputs: [],
        outputs: [],
        models: [],
        properties: [],
        methods: [],
        queries: [],
        hostBindings: [],
        hostListeners: [],
        implements: [],
        extends: null,
      });

      const stats = computeStats(result);

      // The no-bindings component should not change bindings counts
      // signal-basic: 3 signal inputs, 2 signal outputs, 2 models = 7 signal
      // decorator-basic: 3 decorator inputs, 2 decorator outputs = 5 decorator
      // Total: 12 bindings, 7 signal => 58.3%
      expect(stats.signalAdoption).toBe(58.3);
      expect(stats.componentSummary.noBindings).toBe(1);
    });
  });

  describe('empty ParseResult', () => {
    it('handles empty result without division by zero', () => {
      const stats = computeStats(emptyResult());

      expect(stats.signalAdoption).toBe(0);
      expect(stats.inputs.total).toBe(0);
      expect(stats.inputs.percentage).toBe(0);
      expect(stats.outputs.total).toBe(0);
      expect(stats.outputs.percentage).toBe(0);
      expect(stats.models.total).toBe(0);
      expect(stats.components).toHaveLength(0);
      expect(stats.componentSummary.total).toBe(0);
      expect(stats.componentSummary.fullyMigrated).toBe(0);
      expect(stats.componentSummary.legacy).toBe(0);
    });
  });

  describe('component sort order', () => {
    it('sorts legacy, partially-migrated, fully-migrated, no-bindings', () => {
      const makeComp = (name: string, overrides: Partial<ComponentDoc> = {}): ComponentDoc => ({
        name,
        filePath: `/${name}.ts`,
        description: '',
        rawDescription: '',
        kind: 'component',
        selector: `app-${name.toLowerCase()}`,
        standalone: true,
        exportAs: null,
        tags: {},
        inputs: [],
        outputs: [],
        models: [],
        properties: [],
        methods: [],
        queries: [],
        hostBindings: [],
        hostListeners: [],
        implements: [],
        extends: null,
        ...overrides,
      });

      const result: ParseResult = {
        ...emptyResult(),
        components: [
          // no-bindings first in source order
          makeComp('Empty'),
          // fully-migrated
          makeComp('Signal', {
            inputs: [{ name: 'a', bindingName: 'a', type: 'string', required: false, defaultValue: undefined, description: '', rawDescription: '', tags: {}, source: 'signal', transform: null }],
          }),
          // legacy
          makeComp('Legacy', {
            inputs: [{ name: 'b', bindingName: 'b', type: 'string', required: false, defaultValue: undefined, description: '', rawDescription: '', tags: {}, source: 'decorator', transform: null }],
          }),
          // partially-migrated
          makeComp('Partial', {
            inputs: [
              { name: 'c', bindingName: 'c', type: 'string', required: false, defaultValue: undefined, description: '', rawDescription: '', tags: {}, source: 'decorator', transform: null },
              { name: 'd', bindingName: 'd', type: 'string', required: false, defaultValue: undefined, description: '', rawDescription: '', tags: {}, source: 'signal', transform: null },
            ],
          }),
        ],
      };

      const stats = computeStats(result);

      expect(stats.components.map(c => c.status)).toEqual([
        'legacy',
        'partially-migrated',
        'fully-migrated',
        'no-bindings',
      ]);
      expect(stats.components.map(c => c.name)).toEqual([
        'Legacy',
        'Partial',
        'Signal',
        'Empty',
      ]);
    });
  });

  describe('fully-migrated with only models', () => {
    it('classifies a component with only models as fully-migrated', () => {
      const result: ParseResult = {
        ...emptyResult(),
        components: [{
          name: 'ModelOnly',
          filePath: '/model-only.ts',
          description: '',
          rawDescription: '',
          kind: 'component',
          selector: 'app-model-only',
          standalone: true,
          exportAs: null,
          tags: {},
          inputs: [],
          outputs: [],
          models: [{ name: 'm', bindingName: 'm', type: 'string', required: false, defaultValue: undefined, description: '', rawDescription: '', tags: {} }],
          properties: [],
          methods: [],
          queries: [],
          hostBindings: [],
          hostListeners: [],
          implements: [],
          extends: null,
        }],
      };

      const stats = computeStats(result);

      expect(stats.components[0].status).toBe('fully-migrated');
      expect(stats.signalAdoption).toBe(100);
    });
  });
});

describe('formatStatsText', () => {
  it('produces human-readable output', () => {
    const result = parseMultipleFixtures(
      'signal-basic.component.ts',
      'decorator-basic.component.ts',
      'mixed.component.ts',
    );
    const stats = computeStats(result);
    const text = formatStatsText(stats);

    expect(text).toContain('Signal Migration:');
    expect(text).toContain('58.8%');
    expect(text).toContain('Inputs:');
    expect(text).toContain('Outputs:');
    expect(text).toContain('Models:');
    expect(text).toContain('Components: 3 total');
    expect(text).toContain('Fully migrated:');
    expect(text).toContain('Partially migrated:');
    expect(text).toContain('Legacy:');
    expect(text).toContain('Legacy components (migrate these next):');
    expect(text).toContain('ButtonComponent');
    expect(text).toContain('Partially migrated components:');
    expect(text).toContain('MixedComponent');
  });

  it('handles empty stats without errors', () => {
    const stats = computeStats(emptyResult());
    const text = formatStatsText(stats);

    expect(text).toContain('Signal Migration: 0%');
    expect(text).toContain('Components: 0 total');
    expect(text).not.toContain('Legacy components');
  });
});

describe('formatStatsJson', () => {
  it('produces valid JSON matching MigrationStats', () => {
    const result = parseAllFixture('mixed.component.ts');
    const stats = computeStats(result);
    const json = formatStatsJson(stats);
    const parsed = JSON.parse(json);

    expect(parsed.signalAdoption).toBe(stats.signalAdoption);
    expect(parsed.inputs.total).toBe(stats.inputs.total);
    expect(parsed.outputs.total).toBe(stats.outputs.total);
    expect(parsed.models.total).toBe(stats.models.total);
    expect(parsed.components).toHaveLength(1);
    expect(parsed.componentSummary.total).toBe(1);
  });
});

describe('formatStatsMarkdown', () => {
  it('produces markdown with tables', () => {
    const result = parseMultipleFixtures(
      'signal-basic.component.ts',
      'decorator-basic.component.ts',
    );
    const stats = computeStats(result);
    const md = formatStatsMarkdown(stats);

    expect(md).toContain('## Signal Migration:');
    expect(md).toContain('### Summary');
    expect(md).toContain('| Metric | Signal | Total | Percentage |');
    expect(md).toContain('### Component Summary');
    expect(md).toContain('### All Components');
    expect(md).toContain('`CardComponent`');
    expect(md).toContain('`ButtonComponent`');
    expect(md).toContain('Fully migrated');
    expect(md).toContain('Legacy');
  });

  it('handles empty stats without errors', () => {
    const stats = computeStats(emptyResult());
    const md = formatStatsMarkdown(stats);

    expect(md).toContain('## Signal Migration: 0%');
    expect(md).not.toContain('### All Components');
  });
});
