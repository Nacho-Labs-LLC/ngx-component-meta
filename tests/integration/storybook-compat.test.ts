import { describe, it, expect } from 'vitest';
import { parseFixture } from '../helpers.js';
import { toCompodocJson } from '../../src/storybook/compodoc-mapper.js';

describe('Storybook Compodoc compatibility', () => {
  it('produces valid CompodocJson structure', () => {
    const docs = parseFixture('decorator-basic.component.ts');
    const json = toCompodocJson(docs);

    expect(json.components).toHaveLength(1);
    expect(json.directives).toHaveLength(0);
    expect(json.pipes).toHaveLength(0);
    expect(json.injectables).toHaveLength(0);
    expect(json.classes).toHaveLength(0);
  });

  it('maps component inputs to inputsClass', () => {
    const docs = parseFixture('decorator-basic.component.ts');
    const json = toCompodocJson(docs);
    const comp = json.components[0];

    expect(comp.inputsClass.length).toBeGreaterThan(0);
    const labelInput = comp.inputsClass.find(i => i.name === 'label');
    expect(labelInput).toBeDefined();
    expect(labelInput!.type).toBe('string');
    expect(labelInput!.optional).toBe(true);
    expect(labelInput!.defaultValue).toBe("'Click me'");
    expect(labelInput!.decorators).toEqual([{ name: 'Input' }]);
  });

  it('maps aliased inputs using bindingName', () => {
    const docs = parseFixture('decorator-basic.component.ts');
    const json = toCompodocJson(docs);
    const comp = json.components[0];

    const variant = comp.inputsClass.find(i => i.name === 'btnVariant');
    expect(variant).toBeDefined();
    expect(variant!.type).toBe('"primary" | "secondary" | "danger"');
  });

  it('maps outputs to outputsClass', () => {
    const docs = parseFixture('decorator-basic.component.ts');
    const json = toCompodocJson(docs);
    const comp = json.components[0];

    expect(comp.outputsClass.length).toBeGreaterThan(0);
    const clicked = comp.outputsClass.find(o => o.name === 'clicked');
    expect(clicked).toBeDefined();
    expect(clicked!.decorators).toEqual([{ name: 'Output' }]);
  });

  it('maps signal inputs to inputsClass', () => {
    const docs = parseFixture('signal-basic.component.ts');
    const json = toCompodocJson(docs);
    const comp = json.components[0];

    // Signal inputs should appear in inputsClass with synthetic decorator
    const title = comp.inputsClass.find(i => i.name === 'title');
    expect(title).toBeDefined();
    expect(title!.decorators).toEqual([{ name: 'Input' }]);
    expect(title!.optional).toBe(false); // required

    const size = comp.inputsClass.find(i => i.name === 'cardSize');
    expect(size).toBeDefined();
    expect(size!.optional).toBe(true);
  });

  it('maps models to both inputsClass and outputsClass', () => {
    const docs = parseFixture('signal-basic.component.ts');
    const json = toCompodocJson(docs);
    const comp = json.components[0];

    // Model as input
    const expandedInput = comp.inputsClass.find(i => i.name === 'expanded');
    expect(expandedInput).toBeDefined();

    // Model as output (with Change suffix)
    const expandedOutput = comp.outputsClass.find(o => o.name === 'expandedChange');
    expect(expandedOutput).toBeDefined();
    expect(expandedOutput!.decorators).toEqual([{ name: 'Output' }]);
  });

  it('maps directives correctly', () => {
    const docs = parseFixture('directive-basic.ts');
    const json = toCompodocJson(docs);

    expect(json.components).toHaveLength(0);
    expect(json.directives).toHaveLength(1);
    expect(json.directives[0].type).toBe('directive');
    expect(json.directives[0].selector).toBe('[appTooltip]');
  });

  it('maps pipes correctly', () => {
    const docs = parseFixture('pipe-basic.ts');
    const json = toCompodocJson(docs);

    expect(json.pipes).toHaveLength(1);
    expect(json.pipes[0].name).toBe('TruncatePipe');
    expect(json.pipes[0].type).toBe('pipe');
  });

  it('maps methods to methodsClass', () => {
    const docs = parseFixture('decorator-basic.component.ts');
    const json = toCompodocJson(docs);
    const comp = json.components[0];

    const reset = comp.methodsClass.find(m => m.name === 'reset');
    expect(reset).toBeDefined();
    expect(reset!.returnType).toBe('void');
  });
});
