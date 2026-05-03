import type { ApiDiff, ApiChange } from './diff.js';

function humanizeChange(change: string): string {
  return change
    .split('-')
    .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function formatDetails(change: ApiChange): string {
  const d = change.details;

  switch (change.change) {
    case 'input-removed':
    case 'output-removed':
    case 'model-removed':
      return `type: ${d.type}`;
    case 'input-added':
    case 'output-added':
    case 'model-added':
      return `type: ${d.type}`;
    case 'input-type-changed':
    case 'output-type-changed':
    case 'model-type-changed':
      return `${d.before} → ${d.after}`;
    case 'input-became-required':
    case 'model-became-required':
      return 'was optional';
    case 'input-became-optional':
    case 'model-became-optional':
      return 'was required';
    case 'selector-changed':
      return `${d.before} → ${d.after}`;
    case 'default-changed':
    case 'input-default-added':
    case 'input-default-changed':
    case 'input-default-removed':
    case 'model-default-added':
    case 'model-default-changed':
    case 'model-default-removed':
      return `${d.before} → ${d.after}`;
    case 'description-changed':
      return 'description updated';
    case 'input-added-required':
      return `type: ${d.type}, required`;
    case 'method-added':
    case 'method-removed':
      return `returnType: ${d.returnType}`;
    case 'method-return-type-changed':
      return `${d.before} → ${d.after}`;
    case 'method-param-type-changed':
      return `param ${d.param}: ${d.before} → ${d.after}`;
    case 'method-param-added-required':
      return `param ${d.param}: ${d.type}`;
    case 'method-param-added':
      return `param ${d.param}: ${d.type} (optional)`;
    case 'pipe-removed':
    case 'pipe-added':
      return `pipeName: ${d.pipeName}`;
    case 'pipe-transform-changed':
      return 'transform signature changed';
    case 'property-added':
    case 'property-removed':
      return `type: ${d.type}`;
    case 'property-changed':
      return `${d.before} → ${d.after}`;
    default:
      return JSON.stringify(d);
  }
}

function groupByComponent(changes: ApiChange[]): Map<string, ApiChange[]> {
  const groups = new Map<string, ApiChange[]>();
  for (const change of changes) {
    const list = groups.get(change.component) ?? [];
    list.push(change);
    groups.set(change.component, list);
  }
  return groups;
}

export function formatDiffText(result: ApiDiff): string {
  const lines: string[] = [];
  const { breaking, nonBreaking, summary } = result;

  lines.push(
    `ngx-component-meta API diff: ${summary.breaking} breaking, ${summary.nonBreaking} non-breaking changes`,
  );

  if (breaking.length > 0) {
    lines.push('');
    lines.push('BREAKING:');
    const groups = groupByComponent(breaking);
    for (const [component, changes] of groups) {
      lines.push(`  ${component}`);
      for (const change of changes) {
        lines.push(`    \u2717 ${humanizeChange(change.change)}: ${change.name} (${formatDetails(change)})`);
      }
      lines.push('');
    }
  }

  if (nonBreaking.length > 0) {
    if (breaking.length === 0) lines.push('');
    lines.push('NON-BREAKING:');
    const groups = groupByComponent(nonBreaking);
    for (const [component, changes] of groups) {
      lines.push(`  ${component}`);
      for (const change of changes) {
        lines.push(`    + ${humanizeChange(change.change)}: ${change.name} (${formatDetails(change)})`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function formatDiffJson(result: ApiDiff): string {
  return JSON.stringify(result, null, 2);
}

export function formatDiffMarkdown(result: ApiDiff): string {
  const lines: string[] = [];
  const { breaking, nonBreaking, summary } = result;

  lines.push(`## API Diff: ${summary.breaking} breaking, ${summary.nonBreaking} non-breaking changes`);
  lines.push('');

  if (breaking.length > 0) {
    lines.push('### Breaking Changes');
    lines.push('');
    lines.push('| Component | Change | Name | Details |');
    lines.push('|-----------|--------|------|---------|');
    for (const change of breaking) {
      lines.push(
        `| \`${change.component}\` | ${humanizeChange(change.change)} | \`${change.name}\` | ${formatDetails(change)} |`,
      );
    }
    lines.push('');
  }

  if (nonBreaking.length > 0) {
    lines.push('### Non-Breaking Changes');
    lines.push('');
    lines.push('| Component | Change | Name | Details |');
    lines.push('|-----------|--------|------|---------|');
    for (const change of nonBreaking) {
      lines.push(
        `| \`${change.component}\` | ${humanizeChange(change.change)} | \`${change.name}\` | ${formatDetails(change)} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
