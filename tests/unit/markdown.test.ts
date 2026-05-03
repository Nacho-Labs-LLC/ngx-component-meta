import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '../../src/cli/formatters.js';
import { parseFirstComponent, parseComponents, parsePipes } from '../helpers.js';

describe('formatMarkdown', () => {
  describe('component formatting', () => {
    const doc = parseFirstComponent('decorator-basic.component.ts');
    const md = formatMarkdown([doc]);

    it('renders the component heading', () => {
      expect(md).toContain('## ButtonComponent');
    });

    it('renders the description', () => {
      expect(md).toContain('A basic button component using decorator-based inputs.');
    });

    it('renders selector and standalone metadata', () => {
      expect(md).toContain('**Selector:** `app-button`');
      expect(md).toContain('**Standalone:** yes');
    });

    it('renders Inputs section with table', () => {
      expect(md).toContain('### Inputs');
      expect(md).toContain('| Name | Binding | Type | Required | Default | Description |');
    });

    it('renders input names in backticks', () => {
      expect(md).toContain('`label`');
      expect(md).toContain('`disabled`');
    });

    it('renders input types in backticks', () => {
      expect(md).toContain('`string`');
      expect(md).toContain('`boolean`');
    });

    it('renders default values in backticks', () => {
      expect(md).toContain("`'Click me'`");
    });

    it('renders Outputs section', () => {
      expect(md).toContain('### Outputs');
      expect(md).toContain('`clicked`');
      expect(md).toContain('`MouseEvent`');
    });

    it('renders Methods section', () => {
      expect(md).toContain('### Methods');
      expect(md).toContain('`reset`');
    });
  });

  describe('pipe character escaping in union types', () => {
    const doc = parseFirstComponent('decorator-basic.component.ts');
    const md = formatMarkdown([doc]);

    it('escapes pipe characters in type strings inside table cells', () => {
      // The type "primary" | "secondary" | "danger" should have escaped pipes
      expect(md).toContain('\\|');
      // Should NOT contain an unescaped pipe within the type backticks
      // Find the variant row and check it has escaped pipes in the type
      const lines = md.split('\n');
      const variantRow = lines.find(l => l.includes('`variant`') || l.includes('btnVariant'));
      expect(variantRow).toBeDefined();
      expect(variantRow).toContain('"primary" \\| "secondary" \\| "danger"');
    });
  });

  describe('empty sections are omitted', () => {
    const doc = parseFirstComponent('decorator-basic.component.ts', {
      shouldIncludeMethods: false,
    });
    const md = formatMarkdown([doc]);

    it('does not render Methods heading when there are no methods', () => {
      expect(md).not.toContain('### Methods');
    });

    it('does not render Two-Way Bindings heading when there are no models', () => {
      expect(md).not.toContain('### Two-Way Bindings');
    });
  });

  describe('models section', () => {
    const doc = parseFirstComponent('signal-basic.component.ts');
    const md = formatMarkdown([doc]);

    it('renders Two-Way Bindings section when models exist', () => {
      expect(md).toContain('### Two-Way Bindings');
      expect(md).toContain('`expanded`');
      expect(md).toContain('`boolean`');
    });
  });

  describe('pipe formatting', () => {
    const pipes = parsePipes('pipe-basic.ts');
    const md = formatMarkdown(pipes);

    it('renders the pipe heading', () => {
      expect(md).toContain('## TruncatePipe');
    });

    it('renders pipe metadata', () => {
      expect(md).toContain('**Pipe name:** `truncate`');
      expect(md).toContain('**Pure:** yes');
      expect(md).toContain('**Standalone:** yes');
    });

    it('renders the transform signature in a code block', () => {
      expect(md).toContain('### Transform');
      expect(md).toContain('transform(value: string, maxLength?: number = 100, suffix?: string = \'...\')');
      expect(md).toContain(': string');
    });
  });

  describe('multiple docs separated by horizontal rule', () => {
    const docs = parseComponents('inheritance.component.ts');
    const md = formatMarkdown(docs);

    it('separates multiple components with ---', () => {
      expect(md).toContain('---');
    });

    it('contains both component headings', () => {
      expect(md).toContain('## BaseComponent');
      expect(md).toContain('## ChildComponent');
    });
  });
});
