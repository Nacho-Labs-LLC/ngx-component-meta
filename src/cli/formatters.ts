import type {
  ComponentDoc,
  PipeDoc,
  InputDoc,
  OutputDoc,
  ModelDoc,
  MethodDoc,
  MethodParamDoc,
} from '../types.js';
import { toCompodocJson } from '../storybook/compodoc-mapper.js';

export function formatJson(
  docs: (ComponentDoc | PipeDoc)[],
  pretty: boolean,
): string {
  return JSON.stringify(docs, null, pretty ? 2 : undefined);
}

export function formatCompodoc(
  docs: (ComponentDoc | PipeDoc)[],
  pretty: boolean,
): string {
  const compodocJson = toCompodocJson(docs);
  return JSON.stringify(compodocJson, null, pretty ? 2 : undefined);
}

export function formatMarkdown(docs: (ComponentDoc | PipeDoc)[]): string {
  return docs.map(doc => {
    if ('pipeName' in doc) return formatPipeMarkdown(doc);
    return formatComponentMarkdown(doc);
  }).join('\n\n---\n\n');
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function code(value: string): string {
  return `\`${value}\``;
}

function codeCell(value: string): string {
  return code(escapeCell(value));
}

function formatComponentMarkdown(doc: ComponentDoc): string {
  const lines: string[] = [];

  lines.push(`## ${doc.name}`);
  lines.push('');

  if (doc.description) {
    lines.push(doc.description);
    lines.push('');
  }

  const metaParts: string[] = [];
  if (doc.selector) {
    metaParts.push(`**Selector:** ${code(doc.selector)}`);
  }
  metaParts.push(`**Standalone:** ${doc.standalone ? 'yes' : 'no'}`);
  lines.push(metaParts.join(' | '));

  if (doc.inputs.length > 0) {
    lines.push('');
    lines.push('### Inputs');
    lines.push('');
    lines.push(formatInputsTable(doc.inputs));
  }

  if (doc.outputs.length > 0) {
    lines.push('');
    lines.push('### Outputs');
    lines.push('');
    lines.push(formatOutputsTable(doc.outputs));
  }

  if (doc.models.length > 0) {
    lines.push('');
    lines.push('### Two-Way Bindings');
    lines.push('');
    lines.push(formatModelsTable(doc.models));
  }

  if (doc.methods.length > 0) {
    lines.push('');
    lines.push('### Methods');
    lines.push('');
    lines.push(formatMethodsTable(doc.methods));
  }

  return lines.join('\n');
}

function formatPipeMarkdown(doc: PipeDoc): string {
  const lines: string[] = [];

  lines.push(`## ${doc.name}`);
  lines.push('');

  if (doc.description) {
    lines.push(doc.description);
    lines.push('');
  }

  const metaParts = [
    `**Pipe name:** ${code(doc.pipeName)}`,
    `**Pure:** ${doc.pure ? 'yes' : 'no'}`,
    `**Standalone:** ${doc.standalone ? 'yes' : 'no'}`,
  ];
  lines.push(metaParts.join(' | '));

  lines.push('');
  lines.push('### Transform');
  lines.push('');
  lines.push('```');
  lines.push(formatTransformSignature(doc));
  lines.push('```');

  return lines.join('\n');
}

function formatTransformSignature(doc: PipeDoc): string {
  const params = doc.transform.params.map(p => formatParam(p)).join(', ');
  return `transform(${params}): ${doc.transform.returnType}`;
}

function formatParam(p: MethodParamDoc): string {
  const opt = p.optional ? '?' : '';
  const def = p.defaultValue != null ? ` = ${p.defaultValue}` : '';
  return `${p.name}${opt}: ${p.type}${def}`;
}

function formatInputsTable(inputs: InputDoc[]): string {
  const header = '| Name | Binding | Type | Required | Default | Description |';
  const sep    = '|------|---------|------|----------|---------|-------------|';
  const rows = inputs.map(i => {
    const def = i.defaultValue != null ? codeCell(i.defaultValue) : '—';
    return `| ${codeCell(i.name)} | ${codeCell(i.bindingName)} | ${codeCell(i.type)} | ${i.required ? 'yes' : 'no'} | ${def} | ${escapeCell(i.description)} |`;
  });
  return [header, sep, ...rows].join('\n');
}

function formatOutputsTable(outputs: OutputDoc[]): string {
  const header = '| Name | Binding | Type | Description |';
  const sep    = '|------|---------|------|-------------|';
  const rows = outputs.map(o =>
    `| ${codeCell(o.name)} | ${codeCell(o.bindingName)} | ${codeCell(o.type)} | ${escapeCell(o.description)} |`,
  );
  return [header, sep, ...rows].join('\n');
}

function formatModelsTable(models: ModelDoc[]): string {
  const header = '| Name | Binding | Type | Required | Default | Description |';
  const sep    = '|------|---------|------|----------|---------|-------------|';
  const rows = models.map(m => {
    const def = m.defaultValue != null ? codeCell(m.defaultValue) : '—';
    return `| ${codeCell(m.name)} | ${codeCell(m.bindingName)} | ${codeCell(m.type)} | ${m.required ? 'yes' : 'no'} | ${def} | ${escapeCell(m.description)} |`;
  });
  return [header, sep, ...rows].join('\n');
}

function formatMethodsTable(methods: MethodDoc[]): string {
  const header = '| Name | Signature | Description |';
  const sep    = '|------|-----------|-------------|';
  const rows = methods.map(m => {
    const params = m.params.map(p => formatParam(p)).join(', ');
    const sig = `(${params}) => ${m.returnType}`;
    return `| ${codeCell(m.name)} | ${codeCell(sig)} | ${escapeCell(m.description)} |`;
  });
  return [header, sep, ...rows].join('\n');
}
