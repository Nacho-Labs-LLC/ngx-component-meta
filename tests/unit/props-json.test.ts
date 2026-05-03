import { describe, it, expect } from 'vitest';
import { parseAllFixture } from '../helpers.js';
import { toPropsJson, toPropsJsonString } from '../../src/props-json.js';
import type { PropsJsonComponent, PropsJsonOutput } from '../../src/props-json.js';

function findComponent(output: PropsJsonOutput, name: string): PropsJsonComponent {
  const comp = output.components.find((c) => c.name === name);
  if (!comp) throw new Error(`Component "${name}" not found in output`);
  return comp;
}

describe('toPropsJson', () => {
  describe('signal-basic.component.ts', () => {
    const result = parseAllFixture('signal-basic.component.ts');
    const output = toPropsJson(result);
    const card = findComponent(output, 'CardComponent');

    it('maps signal inputs with signal: true', () => {
      expect(card.props).toBeDefined();
      const title = card.props!.find((p) => p.name === 'title');
      expect(title).toBeDefined();
      expect(title!.signal).toBe(true);
      expect(title!.type).toBe('string');
      expect(title!.required).toBe(true);
    });

    it('includes binding name when alias differs', () => {
      const size = card.props!.find((p) => p.name === 'size');
      expect(size).toBeDefined();
      expect(size!.bindingName).toBe('cardSize');
      expect(size!.signal).toBe(true);
    });

    it('omits bindingName when it matches name', () => {
      const title = card.props!.find((p) => p.name === 'title');
      expect(title!.bindingName).toBeUndefined();
    });

    it('maps signal outputs', () => {
      expect(card.events).toBeDefined();
      const selected = card.events!.find((e) => e.name === 'selected');
      expect(selected).toBeDefined();
      expect(selected!.signal).toBe(true);
      expect(selected!.type).toBe('string');
    });

    it('includes output binding name when alias differs', () => {
      const dismissed = card.events!.find((e) => e.name === 'dismissed');
      expect(dismissed).toBeDefined();
      expect(dismissed!.bindingName).toBe('cardDismissed');
    });

    it('maps models', () => {
      expect(card.models).toBeDefined();
      const expanded = card.models!.find((m) => m.name === 'expanded');
      expect(expanded).toBeDefined();
      expect(expanded!.required).toBe(false);

      const activeTab = card.models!.find((m) => m.name === 'activeTab');
      expect(activeTab).toBeDefined();
      expect(activeTab!.required).toBe(true);
      expect(activeTab!.type).toBe('string');
    });

    it('maps methods', () => {
      expect(card.methods).toBeDefined();
      const refresh = card.methods!.find((m) => m.name === 'refresh');
      expect(refresh).toBeDefined();
      expect(refresh!.signature).toBe('() => void');
    });
  });

  describe('decorator-basic.component.ts', () => {
    const result = parseAllFixture('decorator-basic.component.ts');
    const output = toPropsJson(result);
    const button = findComponent(output, 'ButtonComponent');

    it('maps decorator inputs with signal: false', () => {
      expect(button.props).toBeDefined();
      const label = button.props!.find((p) => p.name === 'label');
      expect(label).toBeDefined();
      expect(label!.signal).toBe(false);
      expect(label!.type).toBe('string');
    });

    it('maps aliases as bindingName', () => {
      const variant = button.props!.find((p) => p.name === 'variant');
      expect(variant).toBeDefined();
      expect(variant!.bindingName).toBe('btnVariant');
    });

    it('maps decorator outputs with signal: false', () => {
      expect(button.events).toBeDefined();
      const clicked = button.events!.find((e) => e.name === 'clicked');
      expect(clicked).toBeDefined();
      expect(clicked!.signal).toBe(false);
    });

    it('maps output alias as bindingName', () => {
      const focused = button.events!.find((e) => e.name === 'focused');
      expect(focused).toBeDefined();
      expect(focused!.bindingName).toBe('btnFocus');
    });

    it('maps required decorator inputs', () => {
      const disabled = button.props!.find((p) => p.name === 'disabled');
      expect(disabled).toBeDefined();
      expect(disabled!.required).toBe(true);
    });
  });

  describe('pipe-basic.ts', () => {
    const result = parseAllFixture('pipe-basic.ts');
    const output = toPropsJson(result);
    const pipe = findComponent(output, 'TruncatePipe');

    it('maps pipe with kind: pipe', () => {
      expect(pipe.kind).toBe('pipe');
    });

    it('has null selector', () => {
      expect(pipe.selector).toBeNull();
    });

    it('has transform with correct signature', () => {
      expect(pipe.transform).toBeDefined();
      expect(pipe.transform!.returnType).toBe('string');
      expect(pipe.transform!.params).toHaveLength(3);
      expect(pipe.transform!.params[0].name).toBe('value');
      expect(pipe.transform!.params[0].type).toBe('string');
      expect(pipe.transform!.params[0].optional).toBe(false);
    });

    it('has correct transform signature string', () => {
      expect(pipe.transform!.signature).toContain('value: string');
      expect(pipe.transform!.signature).toContain('=> string');
    });

    it('does not have props/events/models/methods', () => {
      expect(pipe.props).toBeUndefined();
      expect(pipe.events).toBeUndefined();
      expect(pipe.models).toBeUndefined();
      expect(pipe.methods).toBeUndefined();
    });
  });

  describe('mixed.component.ts', () => {
    const result = parseAllFixture('mixed.component.ts');
    const output = toPropsJson(result);
    const mixed = findComponent(output, 'MixedComponent');

    it('mixes signal and decorator inputs', () => {
      expect(mixed.props).toBeDefined();

      const name = mixed.props!.find((p) => p.name === 'name');
      expect(name!.signal).toBe(false);

      const age = mixed.props!.find((p) => p.name === 'age');
      expect(age!.signal).toBe(true);
    });

    it('mixes signal and decorator outputs', () => {
      expect(mixed.events).toBeDefined();

      const saved = mixed.events!.find((e) => e.name === 'saved');
      expect(saved!.signal).toBe(false);

      const deleted = mixed.events!.find((e) => e.name === 'deleted');
      expect(deleted!.signal).toBe(true);
    });

    it('includes model', () => {
      expect(mixed.models).toBeDefined();
      const selected = mixed.models!.find((m) => m.name === 'selected');
      expect(selected).toBeDefined();
      expect(selected!.required).toBe(false);
    });

    it('includes method with signature', () => {
      expect(mixed.methods).toBeDefined();
      const submit = mixed.methods!.find((m) => m.name === 'submit');
      expect(submit).toBeDefined();
      expect(submit!.signature).toBe('() => boolean');
    });
  });

  describe('empty arrays omission', () => {
    it('omits events key when component has no outputs', () => {
      const result = parseAllFixture('mixed.component.ts');
      const output = toPropsJson(result);
      const mixed = findComponent(output, 'MixedComponent');

      // MixedComponent has outputs, so events should exist
      expect(mixed.events).toBeDefined();

      // Create a parse result with no outputs to test omission
      const stripped = {
        ...result,
        components: result.components.map((c) => ({ ...c, outputs: [], models: [] })),
      };
      const strippedOutput = toPropsJson(stripped);
      const strippedMixed = findComponent(strippedOutput, 'MixedComponent');
      expect(strippedMixed.events).toBeUndefined();
      expect(strippedMixed.models).toBeUndefined();
      expect(Object.keys(strippedMixed)).not.toContain('events');
      expect(Object.keys(strippedMixed)).not.toContain('models');
    });
  });

  describe('method signature formatting', () => {
    it('formats method params correctly', () => {
      const result = parseAllFixture('decorator-basic.component.ts');
      const output = toPropsJson(result);
      const button = findComponent(output, 'ButtonComponent');
      const reset = button.methods?.find((m) => m.name === 'reset');
      expect(reset).toBeDefined();
      expect(reset!.signature).toBe('() => void');
    });
  });

  describe('sorting', () => {
    it('sorts components alphabetically by name', () => {
      // Parse multiple fixtures to get multiple components
      const result1 = parseAllFixture('signal-basic.component.ts');
      const result2 = parseAllFixture('decorator-basic.component.ts');
      const combined: typeof result1 = {
        ...result1,
        components: [...result1.components, ...result2.components],
        pipes: [...result1.pipes, ...result2.pipes],
        injectables: [],
        interfaces: [],
        typeAliases: [],
        enums: [],
        classes: [],
        functions: [],
        variables: [],
      };
      const output = toPropsJson(combined);
      const names = output.components.map((c) => c.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });

  describe('metadata', () => {
    it('generatedAt is a valid ISO string', () => {
      const result = parseAllFixture('signal-basic.component.ts');
      const output = toPropsJson(result);
      const date = new Date(output.generatedAt);
      expect(date.toISOString()).toBe(output.generatedAt);
    });

    it('uses provided version', () => {
      const result = parseAllFixture('signal-basic.component.ts');
      const output = toPropsJson(result, { version: '1.2.3' });
      expect(output.version).toBe('1.2.3');
    });

    it('defaults version to 0.0.0', () => {
      const result = parseAllFixture('signal-basic.component.ts');
      const output = toPropsJson(result);
      expect(output.version).toBe('0.0.0');
    });
  });

  describe('toPropsJsonString', () => {
    it('produces valid JSON', () => {
      const result = parseAllFixture('signal-basic.component.ts');
      const json = toPropsJsonString(result);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('with pretty: true produces indented JSON', () => {
      const result = parseAllFixture('signal-basic.component.ts');
      const pretty = toPropsJsonString(result, { pretty: true });
      const compact = toPropsJsonString(result, { pretty: false });

      expect(pretty).toContain('\n');
      expect(pretty.length).toBeGreaterThan(compact.length);

      // Verify indentation
      expect(pretty).toContain('  ');

      // Both should parse to equivalent objects (minus generatedAt timestamps)
      const prettyObj = JSON.parse(pretty);
      const compactObj = JSON.parse(compact);
      expect(prettyObj.components).toEqual(compactObj.components);
      expect(prettyObj.version).toEqual(compactObj.version);
    });

    it('passes version through to output', () => {
      const result = parseAllFixture('signal-basic.component.ts');
      const json = toPropsJsonString(result, { version: '3.0.0' });
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('3.0.0');
    });
  });
});
