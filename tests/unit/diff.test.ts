import { describe, it, expect } from 'vitest';
import { diff } from '../../src/diff.js';
import { formatDiffText, formatDiffJson, formatDiffMarkdown } from '../../src/diff-formatters.js';
import type { ComponentDoc, PipeDoc, InputDoc, OutputDoc, ModelDoc, MethodDoc, MethodParamDoc, PropertyDoc } from '../../src/types.js';

function makeInput(overrides: Partial<InputDoc> = {}): InputDoc {
  return {
    name: 'testInput',
    bindingName: 'testInput',
    type: 'string',
    required: false,
    defaultValue: undefined,
    description: '',
    rawDescription: '',
    tags: {},
    source: 'decorator',
    transform: null,
    ...overrides,
  };
}

function makeOutput(overrides: Partial<OutputDoc> = {}): OutputDoc {
  return {
    name: 'testOutput',
    bindingName: 'testOutput',
    type: 'void',
    description: '',
    rawDescription: '',
    tags: {},
    source: 'decorator',
    ...overrides,
  };
}

function makeModel(overrides: Partial<ModelDoc> = {}): ModelDoc {
  return {
    name: 'testModel',
    bindingName: 'testModel',
    type: 'string',
    required: false,
    defaultValue: undefined,
    description: '',
    rawDescription: '',
    tags: {},
    ...overrides,
  };
}

function makeComponent(overrides: Partial<ComponentDoc> = {}): ComponentDoc {
  return {
    name: 'TestComponent',
    filePath: '/test.ts',
    description: '',
    rawDescription: '',
    kind: 'component',
    selector: 'app-test',
    standalone: true,
    exportAs: null,
    tags: {},
    inputs: [],
    outputs: [],
    models: [],
    properties: [],
    methods: [],
    queries: [],
    implements: [],
    extends: null,
    ...overrides,
  };
}

function makeMethod(overrides: Partial<MethodDoc> = {}): MethodDoc {
  return {
    name: 'testMethod',
    params: [],
    returnType: 'void',
    modifier: 'public',
    description: '',
    rawDescription: '',
    tags: {},
    ...overrides,
  };
}

function makeMethodParam(overrides: Partial<MethodParamDoc> = {}): MethodParamDoc {
  return {
    name: 'param',
    type: 'string',
    optional: false,
    defaultValue: undefined,
    description: '',
    ...overrides,
  };
}

function makeProperty(overrides: Partial<PropertyDoc> = {}): PropertyDoc {
  return {
    name: 'testProp',
    type: 'string',
    defaultValue: undefined,
    optional: false,
    modifier: 'public',
    description: '',
    rawDescription: '',
    tags: {},
    ...overrides,
  };
}

function makePipe(overrides: Partial<PipeDoc> = {}): PipeDoc {
  return {
    name: 'TestPipe',
    filePath: '/test-pipe.ts',
    pipeName: 'testPipe',
    standalone: true,
    pure: true,
    description: '',
    rawDescription: '',
    tags: {},
    transform: {
      params: [{ name: 'value', type: 'string', optional: false, defaultValue: undefined, description: '' }],
      returnType: 'string',
    },
    ...overrides,
  };
}

describe('diff', () => {
  describe('no changes', () => {
    it('returns empty diff when base and head are identical', () => {
      const comp = makeComponent({ inputs: [makeInput()] });
      const result = diff([comp], [comp]);

      expect(result.breaking).toEqual([]);
      expect(result.nonBreaking).toEqual([]);
      expect(result.summary).toEqual({ breaking: 0, nonBreaking: 0 });
    });

    it('returns empty diff when both are empty arrays', () => {
      const result = diff([], []);
      expect(result.breaking).toEqual([]);
      expect(result.nonBreaking).toEqual([]);
    });
  });

  describe('inputs', () => {
    it('classifies input removed as breaking', () => {
      const base = makeComponent({ inputs: [makeInput({ name: 'color', type: 'string' })] });
      const head = makeComponent({ inputs: [] });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'input-removed',
        name: 'color',
        details: { type: 'string' },
      });
    });

    it('classifies input added (optional) as non-breaking', () => {
      const base = makeComponent({ inputs: [] });
      const head = makeComponent({
        inputs: [makeInput({ name: 'size', type: 'string', required: false, defaultValue: "'md'" })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'input-added',
        name: 'size',
        details: { type: 'string', required: false, default: "'md'" },
      });
      expect(result.breaking).toHaveLength(0);
    });

    it('classifies input type changed as breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'disabled', type: 'boolean' })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'disabled', type: 'string' })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'input-type-changed',
        name: 'disabled',
        details: { before: 'boolean', after: 'string' },
      });
    });

    it('classifies input became required as breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'title', required: false })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'title', required: true })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'input-became-required',
        name: 'title',
        details: { before: { required: false }, after: { required: true } },
      });
    });

    it('classifies input became optional as non-breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'title', required: true })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'title', required: false })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'input-became-optional',
        name: 'title',
        details: { before: { required: true }, after: { required: false } },
      });
      expect(result.breaking).toHaveLength(0);
    });

    it('classifies default changed as non-breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: "'sm'" })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: "'md'" })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0].change).toBe('default-changed');
      expect(result.nonBreaking[0].details).toEqual({ before: "'sm'", after: "'md'" });
    });

    it('classifies description changed as non-breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'label', description: 'Old desc' })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'label', description: 'New desc' })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0].change).toBe('description-changed');
    });
  });

  describe('outputs', () => {
    it('classifies output removed as breaking', () => {
      const base = makeComponent({
        outputs: [makeOutput({ name: 'clicked', type: 'MouseEvent' })],
      });
      const head = makeComponent({ outputs: [] });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'output-removed',
        name: 'clicked',
        details: { type: 'MouseEvent' },
      });
    });

    it('classifies output added as non-breaking', () => {
      const base = makeComponent({ outputs: [] });
      const head = makeComponent({
        outputs: [makeOutput({ name: 'closed', type: 'void' })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'output-added',
        name: 'closed',
        details: { type: 'void' },
      });
    });
  });

  describe('models', () => {
    it('classifies model removed as breaking', () => {
      const base = makeComponent({
        models: [makeModel({ name: 'value', type: 'string' })],
      });
      const head = makeComponent({ models: [] });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'model-removed',
        name: 'value',
        details: { type: 'string' },
      });
    });

    it('classifies model added as non-breaking', () => {
      const base = makeComponent({ models: [] });
      const head = makeComponent({
        models: [makeModel({ name: 'value', type: 'number' })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'model-added',
        name: 'value',
        details: { type: 'number' },
      });
    });
  });

  describe('components', () => {
    it('classifies component added as non-breaking', () => {
      const head = makeComponent({ name: 'NewComponent' });
      const result = diff([], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'NewComponent',
        change: 'component-added',
        name: 'NewComponent',
        details: {},
      });
    });

    it('classifies component removed as breaking', () => {
      const base = makeComponent({ name: 'OldComponent' });
      const result = diff([base], []);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'OldComponent',
        change: 'component-removed',
        name: 'OldComponent',
        details: {},
      });
    });
  });

  describe('selector changed', () => {
    it('classifies selector changed as breaking', () => {
      const base = makeComponent({ selector: 'app-old' });
      const head = makeComponent({ selector: 'app-new' });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0].change).toBe('selector-changed');
      expect(result.breaking[0].details).toEqual({ before: 'app-old', after: 'app-new' });
    });
  });

  describe('output type changed', () => {
    it('classifies output type changed as breaking', () => {
      const base = makeComponent({
        outputs: [makeOutput({ name: 'clicked', type: 'MouseEvent' })],
      });
      const head = makeComponent({
        outputs: [makeOutput({ name: 'clicked', type: 'PointerEvent' })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'output-type-changed',
        name: 'clicked',
        details: { before: 'MouseEvent', after: 'PointerEvent' },
      });
    });
  });

  describe('methods', () => {
    it('classifies method added as non-breaking', () => {
      const base = makeComponent({ methods: [] });
      const head = makeComponent({
        methods: [makeMethod({ name: 'open', returnType: 'void' })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'method-added',
        name: 'open',
        details: { returnType: 'void' },
      });
    });

    it('classifies method removed as breaking', () => {
      const base = makeComponent({
        methods: [makeMethod({ name: 'close', returnType: 'void' })],
      });
      const head = makeComponent({ methods: [] });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'method-removed',
        name: 'close',
        details: { returnType: 'void' },
      });
    });

    it('classifies method param type changed as breaking', () => {
      const base = makeComponent({
        methods: [makeMethod({
          name: 'setLabel',
          params: [makeMethodParam({ name: 'label', type: 'string' })],
        })],
      });
      const head = makeComponent({
        methods: [makeMethod({
          name: 'setLabel',
          params: [makeMethodParam({ name: 'label', type: 'number' })],
        })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'method-param-type-changed',
        name: 'setLabel',
        details: { param: 'label', before: 'string', after: 'number' },
      });
    });

    it('classifies method return type changed as breaking', () => {
      const base = makeComponent({
        methods: [makeMethod({ name: 'getValue', returnType: 'string' })],
      });
      const head = makeComponent({
        methods: [makeMethod({ name: 'getValue', returnType: 'number' })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'method-return-type-changed',
        name: 'getValue',
        details: { before: 'string', after: 'number' },
      });
    });

    it('classifies required method param added as breaking', () => {
      const base = makeComponent({
        methods: [makeMethod({ name: 'doSomething', params: [] })],
      });
      const head = makeComponent({
        methods: [makeMethod({
          name: 'doSomething',
          params: [makeMethodParam({ name: 'value', type: 'string', optional: false })],
        })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0].change).toBe('method-param-added-required');
    });

    it('classifies optional method param added as non-breaking', () => {
      const base = makeComponent({
        methods: [makeMethod({ name: 'doSomething', params: [] })],
      });
      const head = makeComponent({
        methods: [makeMethod({
          name: 'doSomething',
          params: [makeMethodParam({ name: 'value', type: 'string', optional: true })],
        })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0].change).toBe('method-param-added');
    });
  });

  describe('pipes', () => {
    it('classifies pipe added as non-breaking', () => {
      const pipe = makePipe({ name: 'NewPipe', pipeName: 'newPipe' });
      const result = diff([], [pipe]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'NewPipe',
        change: 'pipe-added',
        name: 'NewPipe',
        details: { pipeName: 'newPipe' },
      });
    });

    it('classifies pipe removed as breaking', () => {
      const pipe = makePipe({ name: 'OldPipe', pipeName: 'oldPipe' });
      const result = diff([pipe], []);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'OldPipe',
        change: 'pipe-removed',
        name: 'OldPipe',
        details: { pipeName: 'oldPipe' },
      });
    });

    it('classifies pipe transform signature changed as breaking', () => {
      const basePipe = makePipe({
        name: 'FormatPipe',
        transform: {
          params: [{ name: 'value', type: 'string', optional: false, defaultValue: undefined, description: '' }],
          returnType: 'string',
        },
      });
      const headPipe = makePipe({
        name: 'FormatPipe',
        transform: {
          params: [{ name: 'value', type: 'number', optional: false, defaultValue: undefined, description: '' }],
          returnType: 'string',
        },
      });
      const result = diff([basePipe], [headPipe]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0].change).toBe('pipe-transform-changed');
    });
  });

  describe('input defaults', () => {
    it('classifies default removed as breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: "'md'" })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: undefined })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0].change).toBe('input-default-removed');
      expect(result.breaking[0].details).toEqual({ before: "'md'", after: undefined });
    });

    it('classifies default added as non-breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: undefined })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: "'md'" })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0].change).toBe('input-default-added');
      expect(result.nonBreaking[0].details).toEqual({ before: undefined, after: "'md'" });
    });

    it('classifies default value changed as non-breaking', () => {
      const base = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: "'sm'" })],
      });
      const head = makeComponent({
        inputs: [makeInput({ name: 'size', defaultValue: "'lg'" })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0].change).toBe('default-changed');
      expect(result.nonBreaking[0].details).toEqual({ before: "'sm'", after: "'lg'" });
    });
  });

  describe('required input added', () => {
    it('classifies required input added as breaking', () => {
      const base = makeComponent({ inputs: [] });
      const head = makeComponent({
        inputs: [makeInput({ name: 'title', type: 'string', required: true })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0]).toEqual({
        component: 'TestComponent',
        change: 'input-added-required',
        name: 'title',
        details: { type: 'string', required: true },
      });
    });
  });

  describe('properties', () => {
    it('classifies property added as non-breaking', () => {
      const base = makeComponent({ properties: [] });
      const head = makeComponent({
        properties: [makeProperty({ name: 'isOpen', type: 'boolean' })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'property-added',
        name: 'isOpen',
        details: { type: 'boolean' },
      });
    });

    it('classifies property removed as non-breaking', () => {
      const base = makeComponent({
        properties: [makeProperty({ name: 'isOpen', type: 'boolean' })],
      });
      const head = makeComponent({ properties: [] });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'property-removed',
        name: 'isOpen',
        details: { type: 'boolean' },
      });
    });

    it('classifies property type changed as non-breaking', () => {
      const base = makeComponent({
        properties: [makeProperty({ name: 'count', type: 'number' })],
      });
      const head = makeComponent({
        properties: [makeProperty({ name: 'count', type: 'string' })],
      });
      const result = diff([base], [head]);

      expect(result.nonBreaking).toHaveLength(1);
      expect(result.nonBreaking[0]).toEqual({
        component: 'TestComponent',
        change: 'property-changed',
        name: 'count',
        details: { before: 'number', after: 'string' },
      });
    });
  });

  describe('model deep diffing', () => {
    it('classifies model type changed as breaking', () => {
      const base = makeComponent({
        models: [makeModel({ name: 'value', type: 'string' })],
      });
      const head = makeComponent({
        models: [makeModel({ name: 'value', type: 'number' })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0].change).toBe('model-type-changed');
    });

    it('classifies model became required as breaking', () => {
      const base = makeComponent({
        models: [makeModel({ name: 'value', required: false })],
      });
      const head = makeComponent({
        models: [makeModel({ name: 'value', required: true })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0].change).toBe('model-became-required');
    });

    it('classifies model default removed as breaking', () => {
      const base = makeComponent({
        models: [makeModel({ name: 'value', defaultValue: "'hello'" })],
      });
      const head = makeComponent({
        models: [makeModel({ name: 'value', defaultValue: undefined })],
      });
      const result = diff([base], [head]);

      expect(result.breaking).toHaveLength(1);
      expect(result.breaking[0].change).toBe('model-default-removed');
    });
  });

  describe('multiple changes', () => {
    it('detects multiple breaking and non-breaking changes', () => {
      const base = makeComponent({
        name: 'ButtonComponent',
        inputs: [
          makeInput({ name: 'variant', type: "'primary' | 'secondary'" }),
          makeInput({ name: 'disabled', type: 'boolean' }),
        ],
        outputs: [],
      });
      const head = makeComponent({
        name: 'ButtonComponent',
        inputs: [
          makeInput({ name: 'disabled', type: 'string' }),
          makeInput({ name: 'size', type: 'string', required: false }),
        ],
        outputs: [makeOutput({ name: 'clicked', type: 'void' })],
      });
      const result = diff([base], [head]);

      expect(result.breaking.length).toBeGreaterThanOrEqual(2);
      expect(result.nonBreaking.length).toBeGreaterThanOrEqual(2);

      const removedInput = result.breaking.find(c => c.change === 'input-removed');
      expect(removedInput).toBeDefined();
      expect(removedInput!.name).toBe('variant');

      const typeChanged = result.breaking.find(c => c.change === 'input-type-changed');
      expect(typeChanged).toBeDefined();
      expect(typeChanged!.name).toBe('disabled');

      const addedInput = result.nonBreaking.find(c => c.change === 'input-added');
      expect(addedInput).toBeDefined();
      expect(addedInput!.name).toBe('size');

      const addedOutput = result.nonBreaking.find(c => c.change === 'output-added');
      expect(addedOutput).toBeDefined();
      expect(addedOutput!.name).toBe('clicked');
    });
  });
});

describe('formatters', () => {
  const testDiff = diff(
    [
      makeComponent({
        name: 'ButtonComponent',
        inputs: [makeInput({ name: 'variant', type: "'primary' | 'secondary'" })],
      }),
    ],
    [
      makeComponent({
        name: 'ButtonComponent',
        inputs: [makeInput({ name: 'size', type: 'string', required: false })],
      }),
    ],
  );

  describe('formatDiffText', () => {
    it('produces a human-readable text summary', () => {
      const text = formatDiffText(testDiff);
      expect(text).toContain('ngx-component-meta API diff:');
      expect(text).toContain('BREAKING:');
      expect(text).toContain('ButtonComponent');
      expect(text).toContain('\u2717');
      expect(text).toContain('Input removed');
      expect(text).toContain('variant');
      expect(text).toContain('NON-BREAKING:');
      expect(text).toContain('Input added');
      expect(text).toContain('size');
    });

    it('handles empty diff', () => {
      const empty = diff([], []);
      const text = formatDiffText(empty);
      expect(text).toContain('0 breaking, 0 non-breaking');
      expect(text).not.toContain('BREAKING:');
      expect(text).not.toContain('NON-BREAKING:');
    });
  });

  describe('formatDiffJson', () => {
    it('produces valid JSON matching the ApiDiff structure', () => {
      const json = formatDiffJson(testDiff);
      const parsed = JSON.parse(json);
      expect(parsed.breaking).toBeDefined();
      expect(parsed.nonBreaking).toBeDefined();
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.breaking).toBe(testDiff.summary.breaking);
      expect(parsed.summary.nonBreaking).toBe(testDiff.summary.nonBreaking);
    });
  });

  describe('formatDiffMarkdown', () => {
    it('produces a markdown table format', () => {
      const md = formatDiffMarkdown(testDiff);
      expect(md).toContain('## API Diff:');
      expect(md).toContain('### Breaking Changes');
      expect(md).toContain('| Component | Change | Name | Details |');
      expect(md).toContain('`ButtonComponent`');
      expect(md).toContain('`variant`');
      expect(md).toContain('### Non-Breaking Changes');
      expect(md).toContain('`size`');
    });

    it('handles empty diff', () => {
      const empty = diff([], []);
      const md = formatDiffMarkdown(empty);
      expect(md).toContain('0 breaking, 0 non-breaking');
      expect(md).not.toContain('### Breaking');
      expect(md).not.toContain('### Non-Breaking');
    });
  });
});
