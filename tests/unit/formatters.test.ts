import { describe, it, expect } from 'vitest';
import { formatJson, formatCompodoc, formatMarkdown } from '../../src/cli/formatters.js';
import { ComponentDoc, PipeDoc } from '../../src/types.js';

describe('cli/formatters', () => {
  const doc: ComponentDoc = {
    name: 'ButtonComponent',
    kind: 'component',
    selector: 'app-button',
    standalone: true,
    inputs: [],
    outputs: [],
    models: [],
    methods: [],
    properties: [],
    description: 'A button component',
    rawDescription: 'A button component',
    tags: {},
  };
  const pipeDoc: PipeDoc = {
    name: 'MyPipe',
    kind: 'pipe',
    pipeName: 'myPipe',
    pure: true,
    standalone: true,
    description: 'A test pipe',
    rawDescription: 'A test pipe',
    tags: {},
    transform: {
      name: 'transform',
      params: [{ name: 'value', type: 'string', optional: false, defaultValue: undefined, description: '' }],
      returnType: 'string',
      modifier: 'public',
      description: '',
      rawDescription: '',
      tags: {},
    }
  };
  const docs = [doc];

  describe('formatJson', () => {
    it('formats as compact JSON when pretty is false', () => {
      const result = formatJson(docs, false);
      expect(result).not.toContain('\n');
      expect(JSON.parse(result)).toEqual(docs);
    });

    it('formats as pretty JSON when pretty is true', () => {
      const result = formatJson(docs, true);
      expect(result).toContain('\n');
      expect(result).toContain('  '); // 2 space indent
      expect(JSON.parse(result)).toEqual(docs);
    });
  });

  describe('formatCompodoc', () => {
    it('formats as compact JSON when pretty is false', () => {
      const result = formatCompodoc(docs, false);
      expect(result).not.toContain('\n');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('components');
      expect(parsed.components).toHaveLength(1);
      expect(parsed.components[0].name).toBe('ButtonComponent');
    });

    it('formats as pretty JSON when pretty is true', () => {
      const result = formatCompodoc(docs, true);
      expect(result).toContain('\n');
      expect(result).toContain('  '); // 2 space indent
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('components');
      expect(parsed.components).toHaveLength(1);
      expect(parsed.components[0].name).toBe('ButtonComponent');
    });
  });

  describe('formatMarkdown', () => {
    it('formats a component correctly', () => {
      const result = formatMarkdown([doc]);
      expect(result).toContain('## ButtonComponent');
      expect(result).toContain('A button component');
      expect(result).toContain('**Selector:** `app-button`');
      expect(result).toContain('**Standalone:** yes');
    });

    it('formats a pipe correctly', () => {
      const result = formatMarkdown([pipeDoc]);
      expect(result).toContain('## MyPipe');
      expect(result).toContain('A test pipe');
      expect(result).toContain('**Pipe name:** `myPipe`');
      expect(result).toContain('**Pure:** yes');
      expect(result).toContain('**Standalone:** yes');
      expect(result).toContain('### Transform');
      expect(result).toContain('transform(value: string): string');
    });

    it('formats mixed docs joined by separator', () => {
      const result = formatMarkdown([doc, pipeDoc]);
      expect(result).toContain('## ButtonComponent');
      expect(result).toContain('\n\n---\n\n');
      expect(result).toContain('## MyPipe');
    });
  });
});
