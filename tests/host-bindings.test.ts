import { describe, it, expect } from 'vitest';
import { parseFirstComponent } from './helpers.js';

describe('host bindings and listeners', () => {
  const doc = parseFirstComponent('host-bindings.directive.ts');

  it('extracts the directive metadata', () => {
    expect(doc.name).toBe('HighlightDirective');
    expect(doc.kind).toBe('directive');
    expect(doc.selector).toBe('[appHighlight]');
    expect(doc.standalone).toBe(true);
  });

  it('keeps @Input in inputs (not misclassified)', () => {
    const colorInput = doc.inputs.find(i => i.name === 'color');
    expect(colorInput).toBeDefined();
    expect(colorInput!.type).toBe('string');
    expect(colorInput!.defaultValue).toBe("'yellow'");
    expect(colorInput!.source).toBe('decorator');
  });

  describe('hostBindings', () => {
    it('extracts 3 host bindings', () => {
      expect(doc.hostBindings).toHaveLength(3);
    });

    it('extracts class.highlighted binding from property', () => {
      const binding = doc.hostBindings.find(b => b.name === 'isHighlighted');
      expect(binding).toBeDefined();
      expect(binding!.hostPropertyName).toBe('class.highlighted');
      expect(binding!.type).toBe('boolean');
      expect(binding!.defaultValue).toBe('false');
      expect(binding!.description).toContain('currently highlighted');
    });

    it('extracts style.backgroundColor binding from getter', () => {
      const binding = doc.hostBindings.find(b => b.name === 'backgroundColor');
      expect(binding).toBeDefined();
      expect(binding!.hostPropertyName).toBe('style.backgroundColor');
      expect(binding!.type).toBe('string');
      expect(binding!.defaultValue).toBeUndefined();
      expect(binding!.description).toContain('background color');
    });

    it('extracts attr.role binding from property', () => {
      const binding = doc.hostBindings.find(b => b.name === 'role');
      expect(binding).toBeDefined();
      expect(binding!.hostPropertyName).toBe('attr.role');
      expect(binding!.type).toBe('string');
      expect(binding!.defaultValue).toBe("'button'");
      expect(binding!.description).toContain('role for accessibility');
    });
  });

  describe('hostListeners', () => {
    it('extracts 3 host listeners', () => {
      expect(doc.hostListeners).toHaveLength(3);
    });

    it('extracts mouseenter listener', () => {
      const listener = doc.hostListeners.find(l => l.name === 'onMouseEnter');
      expect(listener).toBeDefined();
      expect(listener!.eventName).toBe('mouseenter');
      expect(listener!.args).toEqual([]);
      expect(listener!.params).toEqual([]);
      expect(listener!.returnType).toBe('void');
      expect(listener!.description).toContain('mouse enter');
    });

    it('extracts mouseleave listener', () => {
      const listener = doc.hostListeners.find(l => l.name === 'onMouseLeave');
      expect(listener).toBeDefined();
      expect(listener!.eventName).toBe('mouseleave');
      expect(listener!.args).toEqual([]);
      expect(listener!.returnType).toBe('void');
    });

    it('extracts click listener with $event arg and MouseEvent param', () => {
      const listener = doc.hostListeners.find(l => l.name === 'onClick');
      expect(listener).toBeDefined();
      expect(listener!.eventName).toBe('click');
      expect(listener!.args).toEqual(['$event']);
      expect(listener!.params).toHaveLength(1);
      expect(listener!.params[0].name).toBe('event');
      expect(listener!.params[0].type).toBe('MouseEvent');
      expect(listener!.description).toContain('click with event');
    });
  });

  it('does not include host bindings in properties', () => {
    expect(doc.properties.find(p => p.name === 'isHighlighted')).toBeUndefined();
    expect(doc.properties.find(p => p.name === 'role')).toBeUndefined();
    expect(doc.properties.find(p => p.name === 'backgroundColor')).toBeUndefined();
  });

  it('does not include host listeners in methods', () => {
    expect(doc.methods.find(m => m.name === 'onMouseEnter')).toBeUndefined();
    expect(doc.methods.find(m => m.name === 'onMouseLeave')).toBeUndefined();
    expect(doc.methods.find(m => m.name === 'onClick')).toBeUndefined();
  });
});
