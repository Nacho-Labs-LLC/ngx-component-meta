import { describe, it, expect } from 'vitest';
import { parseAllFixture } from './helpers.js';
import { toCompodocJson } from '../src/storybook/compodoc-mapper.js';

describe('injectables', () => {
  const result = parseAllFixture('injectable-basic.ts');

  it('extracts @Injectable class', () => {
    expect(result.injectables).toHaveLength(2);
    const svc = result.injectables[0];
    expect(svc.name).toBe('UserService');
    expect(svc.providedIn).toBe('root');
    expect(svc.description).toContain('User management service');
  });

  it('extracts injectable methods', () => {
    const svc = result.injectables[0];
    expect(svc.methods).toHaveLength(1);
    const method = svc.methods[0];
    expect(method.name).toBe('getUser');
    expect(method.description).toContain('Get user by ID');
    expect(method.params).toHaveLength(1);
    expect(method.params[0].name).toBe('id');
    expect(method.params[0].type).toBe('string');
    expect(method.returnType).toBe('Promise<User>');
  });

  it('extracts injectable properties', () => {
    const svc = result.injectables[0];
    expect(svc.properties).toHaveLength(1);
    const prop = svc.properties[0];
    expect(prop.name).toBe('count');
    expect(prop.type).toBe('number');
    expect(prop.description).toContain('Current user count');
  });

  it('does not include injectables in components or pipes', () => {
    expect(result.components).toHaveLength(0);
    expect(result.pipes).toHaveLength(0);
  });

  it('extracts @Injectable without providedIn as providedIn: null', () => {
    const logSvc = result.injectables.find(i => i.name === 'LogService');
    expect(logSvc).toBeDefined();
    expect(logSvc!.providedIn).toBeNull();
    expect(logSvc!.description).toContain('Basic logging service');
  });

  it('extracts methods on injectable without providedIn', () => {
    const logSvc = result.injectables.find(i => i.name === 'LogService')!;
    expect(logSvc.methods).toHaveLength(1);
    expect(logSvc.methods[0].name).toBe('log');
    expect(logSvc.methods[0].params).toHaveLength(1);
    expect(logSvc.methods[0].params[0].name).toBe('message');
    expect(logSvc.methods[0].params[0].type).toBe('string');
  });
});

describe('interfaces', () => {
  const result = parseAllFixture('types-basic.ts');

  it('extracts exported interfaces (excluding @internal and non-exported)', () => {
    expect(result.interfaces).toHaveLength(3);
    const names = result.interfaces.map(i => i.name);
    expect(names).toContain('UserConfig');
    expect(names).toContain('Shape');
    expect(names).toContain('NamedShape');
    expect(names).not.toContain('InternalConfig');
    expect(names).not.toContain('PrivateHelper');
  });

  it('extracts interface properties', () => {
    const iface = result.interfaces.find(i => i.name === 'UserConfig')!;
    expect(iface.properties).toHaveLength(3);

    const name = iface.properties.find(p => p.name === 'name');
    expect(name).toBeDefined();
    expect(name!.type).toBe('string');
    expect(name!.optional).toBe(false);

    const age = iface.properties.find(p => p.name === 'age');
    expect(age).toBeDefined();
    expect(age!.type).toBe('number');
    expect(age!.optional).toBe(true);

    const role = iface.properties.find(p => p.name === 'role');
    expect(role).toBeDefined();
    expect(role!.description).toContain('User role');
  });

  it('extracts interface methods', () => {
    const shape = result.interfaces.find(i => i.name === 'Shape')!;
    expect(shape.methods).toHaveLength(1);

    const area = shape.methods[0];
    expect(area.name).toBe('area');
    expect(area.returnType).toBe('number');
    expect(area.description).toContain('Calculate the area');
    expect(area.params).toHaveLength(1);
    expect(area.params[0].name).toBe('precision');
    expect(area.params[0].type).toBe('number');
    expect(area.params[0].optional).toBe(true);
  });

  it('extracts interface extends clause', () => {
    const namedShape = result.interfaces.find(i => i.name === 'NamedShape')!;
    expect(namedShape.extends).toHaveLength(1);
    expect(namedShape.extends[0]).toBe('Shape');
  });

  it('extracts properties on interface with extends', () => {
    const namedShape = result.interfaces.find(i => i.name === 'NamedShape')!;
    expect(namedShape.properties).toHaveLength(1);
    expect(namedShape.properties[0].name).toBe('label');
  });

  it('interface without extends has empty extends array', () => {
    const userConfig = result.interfaces.find(i => i.name === 'UserConfig')!;
    expect(userConfig.extends).toEqual([]);
  });

  it('excludes @internal interfaces', () => {
    const internal = result.interfaces.find(i => i.name === 'InternalConfig');
    expect(internal).toBeUndefined();
  });

  it('excludes non-exported interfaces from parseAll results', () => {
    const helper = result.interfaces.find(i => i.name === 'PrivateHelper');
    expect(helper).toBeUndefined();
  });
});

describe('type aliases', () => {
  const result = parseAllFixture('types-basic.ts');

  it('extracts exported type alias', () => {
    expect(result.typeAliases).toHaveLength(1);
    const alias = result.typeAliases[0];
    expect(alias.name).toBe('ButtonSize');
    expect(alias.description).toContain('Button size options');
    expect(alias.type).toContain('sm');
    expect(alias.type).toContain('md');
    expect(alias.type).toContain('lg');
  });
});

describe('enums', () => {
  const result = parseAllFixture('types-basic.ts');

  it('extracts exported enum', () => {
    expect(result.enums).toHaveLength(1);
    const enumDoc = result.enums[0];
    expect(enumDoc.name).toBe('Status');
    expect(enumDoc.description).toContain('Status codes');
  });

  it('extracts enum members with values', () => {
    const enumDoc = result.enums[0];
    expect(enumDoc.members).toHaveLength(3);

    const active = enumDoc.members.find(m => m.name === 'Active');
    expect(active).toBeDefined();
    expect(active!.value).toBe('ACTIVE');

    const inactive = enumDoc.members.find(m => m.name === 'Inactive');
    expect(inactive).toBeDefined();
    expect(inactive!.value).toBe('INACTIVE');

    const pending = enumDoc.members.find(m => m.name === 'Pending');
    expect(pending).toBeDefined();
    expect(pending!.value).toBe('PENDING');
  });
});

describe('parseAll returns structured result', () => {
  it('returns ParseResult with all categories', () => {
    const result = parseAllFixture('types-basic.ts');
    expect(result).toHaveProperty('components');
    expect(result).toHaveProperty('pipes');
    expect(result).toHaveProperty('injectables');
    expect(result).toHaveProperty('interfaces');
    expect(result).toHaveProperty('typeAliases');
    expect(result).toHaveProperty('enums');
    expect(Array.isArray(result.components)).toBe(true);
    expect(Array.isArray(result.pipes)).toBe(true);
    expect(Array.isArray(result.injectables)).toBe(true);
    expect(Array.isArray(result.interfaces)).toBe(true);
    expect(Array.isArray(result.typeAliases)).toBe(true);
    expect(Array.isArray(result.enums)).toBe(true);
  });

  it('parseAll with component fixture still finds components', () => {
    const result = parseAllFixture('decorator-basic.component.ts');
    expect(result.components.length).toBeGreaterThan(0);
    expect(result.components[0].name).toBe('ButtonComponent');
  });
});

describe('Storybook compodoc-mapper with ParseResult', () => {
  it('maps enums to miscellaneous.enumerations', () => {
    const result = parseAllFixture('types-basic.ts');
    const json = toCompodocJson(result);

    expect(json.miscellaneous?.enumerations).toHaveLength(1);
    const enumEntry = json.miscellaneous!.enumerations![0];
    expect(enumEntry.name).toBe('Status');
    expect(enumEntry.childs).toHaveLength(3);
    expect(enumEntry.childs[0].name).toBe('Active');
    expect(enumEntry.childs[0].value).toBe('ACTIVE');
  });

  it('maps type aliases to miscellaneous.typealiases', () => {
    const result = parseAllFixture('types-basic.ts');
    const json = toCompodocJson(result);

    expect(json.miscellaneous?.typealiases).toHaveLength(1);
    const alias = json.miscellaneous!.typealiases![0];
    expect(alias.name).toBe('ButtonSize');
    expect(alias.rawtype).toContain('sm');
  });

  it('maps injectables', () => {
    const result = parseAllFixture('injectable-basic.ts');
    const json = toCompodocJson(result);

    expect(json.injectables).toHaveLength(2);
    expect(json.injectables[0].name).toBe('UserService');
    expect(json.injectables[0].type).toBe('injectable');
    expect(json.injectables[1].name).toBe('LogService');
    expect(json.injectables[1].type).toBe('injectable');
  });

  it('legacy array input still works', () => {
    // Verify backward compat: passing an array still works as before
    const result = parseAllFixture('decorator-basic.component.ts');
    const legacyArray = [...result.components];
    const json = toCompodocJson(legacyArray);
    expect(json.components).toHaveLength(1);
    expect(json.components[0].name).toBe('ButtonComponent');
  });
});
