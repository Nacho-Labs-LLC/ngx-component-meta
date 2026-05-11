import { describe, it, expect } from 'vitest';
import { formatJson, formatCompodoc } from '../../src/cli/formatters.js';
import { ComponentDoc } from '../../src/types.js';

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
});
