import { describe, it, expect } from 'vitest';
import { parseFirstComponent, parseComponents, parsePipes } from './helpers.js';

describe('decorator-based components', () => {
  const doc = parseFirstComponent('decorator-basic.component.ts');

  it('extracts component metadata', () => {
    expect(doc.name).toBe('ButtonComponent');
    expect(doc.kind).toBe('component');
    expect(doc.selector).toBe('app-button');
    expect(doc.standalone).toBe(true);
    expect(doc.description).toContain('basic button component');
  });

  it('extracts JSDoc tags', () => {
    expect(doc.tags['since']).toBe('1.0.0');
  });

  it('extracts implements', () => {
    expect(doc.implements).toContain('OnInit');
  });

  describe('inputs', () => {
    it('extracts simple @Input with default', () => {
      const input = doc.inputs.find(i => i.name === 'label');
      expect(input).toBeDefined();
      expect(input!.type).toBe('string');
      expect(input!.required).toBe(false);
      expect(input!.defaultValue).toBe("'Click me'");
      expect(input!.bindingName).toBe('label');
      expect(input!.source).toBe('decorator');
      expect(input!.description).toContain('button label');
    });

    it('extracts required @Input', () => {
      const input = doc.inputs.find(i => i.name === 'disabled');
      expect(input).toBeDefined();
      expect(input!.required).toBe(true);
      expect(input!.type).toBe('boolean');
    });

    it('extracts @Input with alias (string arg form)', () => {
      const input = doc.inputs.find(i => i.name === 'variant');
      expect(input).toBeDefined();
      expect(input!.bindingName).toBe('btnVariant');
      expect(input!.type).toBe('"primary" | "secondary" | "danger"');
      expect(input!.defaultValue).toBe("'primary'");
    });
  });

  describe('outputs', () => {
    it('extracts simple @Output with EventEmitter', () => {
      const output = doc.outputs.find(o => o.name === 'clicked');
      expect(output).toBeDefined();
      expect(output!.type).toBe('MouseEvent');
      expect(output!.bindingName).toBe('clicked');
      expect(output!.source).toBe('decorator');
    });

    it('extracts @Output with alias', () => {
      const output = doc.outputs.find(o => o.name === 'focused');
      expect(output).toBeDefined();
      expect(output!.bindingName).toBe('btnFocus');
      expect(output!.type).toBe('FocusEvent');
    });
  });

  describe('properties', () => {
    it('includes public properties', () => {
      const prop = doc.properties.find(p => p.name === 'clickCount');
      expect(prop).toBeDefined();
      expect(prop!.type).toBe('number');
      expect(prop!.defaultValue).toBe('0');
    });

    it('excludes private properties', () => {
      expect(doc.properties.find(p => p.name === '_internalState')).toBeUndefined();
    });
  });

  describe('methods', () => {
    it('includes public methods', () => {
      const method = doc.methods.find(m => m.name === 'reset');
      expect(method).toBeDefined();
      expect(method!.returnType).toBe('void');
      expect(method!.description).toContain('Reset');
    });

    it('excludes lifecycle hooks', () => {
      expect(doc.methods.find(m => m.name === 'ngOnInit')).toBeUndefined();
    });

    it('excludes @internal methods', () => {
      expect(doc.methods.find(m => m.name === '_handleClick')).toBeUndefined();
    });
  });
});

describe('signal-based components', () => {
  const doc = parseFirstComponent('signal-basic.component.ts');

  it('extracts component metadata', () => {
    expect(doc.name).toBe('CardComponent');
    expect(doc.selector).toBe('app-card');
  });

  describe('signal inputs', () => {
    it('extracts required signal input', () => {
      const input = doc.inputs.find(i => i.name === 'title');
      expect(input).toBeDefined();
      expect(input!.type).toBe('string');
      expect(input!.required).toBe(true);
      expect(input!.source).toBe('signal');
      expect(input!.defaultValue).toBeUndefined();
    });

    it('extracts signal input with default and alias', () => {
      const input = doc.inputs.find(i => i.name === 'size');
      expect(input).toBeDefined();
      expect(input!.bindingName).toBe('cardSize');
      expect(input!.required).toBe(false);
      expect(input!.defaultValue).toBe("'md'");
      expect(input!.source).toBe('signal');
    });

    it('extracts signal input with boolean default', () => {
      const input = doc.inputs.find(i => i.name === 'elevated');
      expect(input).toBeDefined();
      expect(input!.defaultValue).toBe('false');
      expect(input!.required).toBe(false);
    });
  });

  describe('signal outputs', () => {
    it('extracts typed signal output', () => {
      const output = doc.outputs.find(o => o.name === 'selected');
      expect(output).toBeDefined();
      expect(output!.type).toBe('string');
      expect(output!.source).toBe('signal');
      expect(output!.bindingName).toBe('selected');
    });

    it('extracts signal output with alias', () => {
      const output = doc.outputs.find(o => o.name === 'dismissed');
      expect(output).toBeDefined();
      expect(output!.bindingName).toBe('cardDismissed');
      expect(output!.type).toBe('void');
    });
  });

  describe('models', () => {
    it('extracts model with default', () => {
      const m = doc.models.find(m => m.name === 'expanded');
      expect(m).toBeDefined();
      expect(m!.type).toBe('boolean');
      expect(m!.required).toBe(false);
      expect(m!.defaultValue).toBe('false');
    });

    it('extracts required model', () => {
      const m = doc.models.find(m => m.name === 'activeTab');
      expect(m).toBeDefined();
      expect(m!.type).toBe('string');
      expect(m!.required).toBe(true);
      expect(m!.defaultValue).toBeUndefined();
    });
  });
});

describe('pipes', () => {
  const pipes = parsePipes('pipe-basic.ts');

  it('extracts pipe metadata', () => {
    expect(pipes).toHaveLength(1);
    const pipe = pipes[0];
    expect(pipe.name).toBe('TruncatePipe');
    expect(pipe.pipeName).toBe('truncate');
    expect(pipe.standalone).toBe(true);
    expect(pipe.pure).toBe(true);
    expect(pipe.description).toContain('Truncates a string');
    expect(pipe.tags['since']).toBe('2.0.0');
  });

  it('extracts transform signature', () => {
    const pipe = pipes[0];
    expect(pipe.transform.params).toHaveLength(3);
    expect(pipe.transform.params[0].name).toBe('value');
    expect(pipe.transform.params[0].type).toBe('string');
    expect(pipe.transform.params[0].optional).toBe(false);

    expect(pipe.transform.params[1].name).toBe('maxLength');
    expect(pipe.transform.params[1].type).toBe('number');
    expect(pipe.transform.params[1].optional).toBe(true);
    expect(pipe.transform.params[1].defaultValue).toBe('100');

    expect(pipe.transform.params[2].name).toBe('suffix');
    expect(pipe.transform.params[2].type).toBe('string');
    expect(pipe.transform.params[2].optional).toBe(true);
    expect(pipe.transform.params[2].defaultValue).toBe("'...'");

    expect(pipe.transform.returnType).toBe('string');
  });
});

describe('directives', () => {
  const doc = parseFirstComponent('directive-basic.ts');

  it('extracts directive metadata', () => {
    expect(doc.name).toBe('TooltipDirective');
    expect(doc.kind).toBe('directive');
    expect(doc.selector).toBe('[appTooltip]');
    expect(doc.exportAs).toBe('tooltip');
    expect(doc.standalone).toBe(true);
  });

  it('extracts directive inputs with alias', () => {
    const input = doc.inputs.find(i => i.name === 'text');
    expect(input).toBeDefined();
    expect(input!.bindingName).toBe('appTooltip');
    expect(input!.required).toBe(true);
  });

  it('extracts directive methods', () => {
    expect(doc.methods.find(m => m.name === 'show')).toBeDefined();
    expect(doc.methods.find(m => m.name === 'hide')).toBeDefined();
  });
});

describe('inheritance', () => {
  const docs = parseComponents('inheritance.component.ts');
  const child = docs.find(d => d.name === 'ChildComponent')!;

  it('finds both components', () => {
    expect(docs).toHaveLength(2);
  });

  it('inherits inputs from base', () => {
    // 'visible' comes from BaseComponent via signal input
    const visible = child.inputs.find(i => i.name === 'visible');
    expect(visible).toBeDefined();
    expect(visible!.source).toBe('signal');
  });

  it('child overrides are preserved', () => {
    // 'id' is overridden in child
    const id = child.inputs.find(i => i.name === 'id');
    expect(id).toBeDefined();
    expect(id!.defaultValue).toBe("'child-default'");
  });

  it('inherits methods from base', () => {
    const reset = child.methods.find(m => m.name === 'reset');
    expect(reset).toBeDefined();
  });

  it('reports extends', () => {
    expect(child.extends).toBe('BaseComponent');
  });
});

describe('mixed decorator + signal', () => {
  const doc = parseFirstComponent('mixed.component.ts');

  it('collects both decorator and signal inputs', () => {
    expect(doc.inputs).toHaveLength(2);
    const decoratorInput = doc.inputs.find(i => i.source === 'decorator');
    const signalInput = doc.inputs.find(i => i.source === 'signal');
    expect(decoratorInput!.name).toBe('name');
    expect(signalInput!.name).toBe('age');
  });

  it('collects both decorator and signal outputs', () => {
    expect(doc.outputs).toHaveLength(2);
    const decoratorOutput = doc.outputs.find(o => o.source === 'decorator');
    const signalOutput = doc.outputs.find(o => o.source === 'signal');
    expect(decoratorOutput!.name).toBe('saved');
    expect(signalOutput!.name).toBe('deleted');
  });

  it('collects models separately', () => {
    expect(doc.models).toHaveLength(1);
    expect(doc.models[0].name).toBe('selected');
  });

  it('collects plain properties', () => {
    const loading = doc.properties.find(p => p.name === 'loading');
    expect(loading).toBeDefined();
    expect(loading!.type).toBe('boolean');
  });

  it('collects methods with modifiers', () => {
    const submit = doc.methods.find(m => m.name === 'submit');
    expect(submit).toBeDefined();
    expect(submit!.returnType).toBe('boolean');
    expect(submit!.modifier).toBe('public');

    const internal = doc.methods.find(m => m.name === 'internalMethod');
    expect(internal).toBeDefined();
    expect(internal!.modifier).toBe('protected');
  });
});

describe('parser options', () => {
  it('respects shouldIncludeMethods: false', () => {
    const doc = parseFirstComponent('decorator-basic.component.ts', {
      shouldIncludeMethods: false,
    });
    expect(doc.methods).toHaveLength(0);
  });

  it('respects propFilter', () => {
    const doc = parseFirstComponent('decorator-basic.component.ts', {
      propFilter: (prop) => 'required' in prop ? prop.required : true,
    });
    // Only required inputs should remain
    expect(doc.inputs.every(i => i.required)).toBe(true);
  });
});
