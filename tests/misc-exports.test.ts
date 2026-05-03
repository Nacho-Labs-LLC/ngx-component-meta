import { describe, it, expect } from 'vitest';
import { parseAllFixture } from './helpers.js';
import { toCompodocJson } from '../src/storybook/compodoc-mapper.js';

describe('plain exported classes', () => {
  const result = parseAllFixture('misc-exports.ts');

  it('extracts exported class (excluding @internal)', () => {
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('Formatter');
  });

  it('extracts class description', () => {
    const cls = result.classes[0];
    expect(cls.description).toContain('helper class for formatting');
  });

  it('extracts class methods', () => {
    const cls = result.classes[0];
    expect(cls.methods).toHaveLength(1);
    const method = cls.methods[0];
    expect(method.name).toBe('format');
    expect(method.description).toContain('Format a date');
    expect(method.params).toHaveLength(2);
    expect(method.params[0].name).toBe('value');
    expect(method.params[0].type).toBe('Date');
    expect(method.params[1].name).toBe('pattern');
    expect(method.params[1].type).toBe('string');
    expect(method.returnType).toBe('string');
  });

  it('extracts class properties', () => {
    const cls = result.classes[0];
    expect(cls.properties).toHaveLength(1);
    const prop = cls.properties[0];
    expect(prop.name).toBe('defaultPattern');
    expect(prop.type).toBe('string');
    expect(prop.description).toContain('default pattern');
  });

  it('does not include @internal class', () => {
    const internal = result.classes.find(c => c.name === 'InternalHelper');
    expect(internal).toBeUndefined();
  });
});

describe('exported functions', () => {
  const result = parseAllFixture('misc-exports.ts');

  it('extracts exported function (excluding @internal)', () => {
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('sum');
  });

  it('extracts function description', () => {
    const fn = result.functions[0];
    expect(fn.description).toContain('sum of numbers');
  });

  it('extracts function params and return type', () => {
    const fn = result.functions[0];
    expect(fn.params).toHaveLength(1);
    expect(fn.params[0].name).toBe('numbers');
    expect(fn.params[0].type).toBe('number[]');
    expect(fn.returnType).toBe('number');
  });

  it('does not include @internal function', () => {
    const internal = result.functions.find(f => f.name === 'internalFn');
    expect(internal).toBeUndefined();
  });
});

describe('exported variables', () => {
  const result = parseAllFixture('misc-exports.ts');

  it('extracts exported variables', () => {
    expect(result.variables).toHaveLength(2);
    const names = result.variables.map(v => v.name);
    expect(names).toContain('MAX_PAGE_SIZE');
    expect(names).toContain('DEFAULT_CONFIG');
  });

  it('extracts variable type and isConst', () => {
    const maxPage = result.variables.find(v => v.name === 'MAX_PAGE_SIZE')!;
    expect(maxPage.isConst).toBe(true);
    expect(maxPage.type).toBe('100');

    const config = result.variables.find(v => v.name === 'DEFAULT_CONFIG')!;
    expect(config.isConst).toBe(true);
  });

  it('extracts variable default value', () => {
    const maxPage = result.variables.find(v => v.name === 'MAX_PAGE_SIZE')!;
    expect(maxPage.defaultValue).toBe('100');
  });

  it('extracts variable description', () => {
    const maxPage = result.variables.find(v => v.name === 'MAX_PAGE_SIZE')!;
    expect(maxPage.description).toContain('maximum page size');
  });
});

describe('Storybook compodoc-mapper with classes/functions/variables', () => {
  const result = parseAllFixture('misc-exports.ts');
  const json = toCompodocJson(result);

  it('maps classes to compodoc classes array', () => {
    expect(json.classes).toHaveLength(1);
    expect(json.classes[0].name).toBe('Formatter');
  });

  it('maps functions to miscellaneous.functions', () => {
    expect(json.miscellaneous?.functions).toHaveLength(1);
    expect(json.miscellaneous!.functions![0].name).toBe('sum');
    expect(json.miscellaneous!.functions![0].type).toBe('function');
  });

  it('maps variables to miscellaneous.variables', () => {
    expect(json.miscellaneous?.variables).toHaveLength(2);
    const names = json.miscellaneous!.variables!.map(v => v.name);
    expect(names).toContain('MAX_PAGE_SIZE');
    expect(names).toContain('DEFAULT_CONFIG');
  });
});
