import type { MigrationStats, ComponentMigrationStats } from './stats.js';

function decoratorSummary(comp: ComponentMigrationStats): string {
  const parts: string[] = [];
  if (comp.inputs.decorator > 0) {
    parts.push(`${comp.inputs.decorator} decorator input${comp.inputs.decorator === 1 ? '' : 's'}`);
  }
  if (comp.outputs.decorator > 0) {
    parts.push(`${comp.outputs.decorator} decorator output${comp.outputs.decorator === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

function statusLabel(status: ComponentMigrationStats['status']): string {
  switch (status) {
    case 'fully-migrated': return 'Fully migrated';
    case 'partially-migrated': return 'Partially migrated';
    case 'legacy': return 'Legacy';
    case 'no-bindings': return 'No bindings';
  }
}

function totalBindings(stats: MigrationStats): number {
  return stats.inputs.total + stats.outputs.total + stats.models.total;
}

function totalSignalBindings(stats: MigrationStats): number {
  return stats.inputs.signal + stats.outputs.signal + stats.models.total;
}

export function formatStatsText(stats: MigrationStats): string {
  const lines: string[] = [];

  const total = totalBindings(stats);
  const signal = totalSignalBindings(stats);

  lines.push(`Signal Migration: ${stats.signalAdoption}% (${signal}/${total} bindings)`);
  lines.push('');
  lines.push(`Inputs:   ${stats.inputs.percentage}% signal (${stats.inputs.signal}/${stats.inputs.total})`);
  lines.push(`Outputs:  ${stats.outputs.percentage}% signal (${stats.outputs.signal}/${stats.outputs.total})`);
  lines.push(`Models:   ${stats.models.total}`);
  lines.push('');
  lines.push(`Components: ${stats.componentSummary.total} total`);
  lines.push(`  Fully migrated:     ${stats.componentSummary.fullyMigrated}`);
  lines.push(`  Partially migrated: ${stats.componentSummary.partiallyMigrated}`);
  lines.push(`  Legacy:             ${stats.componentSummary.legacy}`);
  lines.push(`  No bindings:        ${stats.componentSummary.noBindings}`);

  const legacyComponents = stats.components.filter(c => c.status === 'legacy');
  const partialComponents = stats.components.filter(c => c.status === 'partially-migrated');

  if (legacyComponents.length > 0) {
    lines.push('');
    lines.push('Legacy components (migrate these next):');
    for (const comp of legacyComponents) {
      lines.push(`  - ${comp.name} (${comp.filePath}) — ${decoratorSummary(comp)}`);
    }
  }

  if (partialComponents.length > 0) {
    lines.push('');
    lines.push('Partially migrated components:');
    for (const comp of partialComponents) {
      lines.push(`  - ${comp.name} (${comp.filePath}) — ${decoratorSummary(comp)}`);
    }
  }

  return lines.join('\n');
}

export function formatStatsJson(stats: MigrationStats): string {
  return JSON.stringify(stats, null, 2);
}

export function formatStatsMarkdown(stats: MigrationStats): string {
  const lines: string[] = [];

  const total = totalBindings(stats);
  const signal = totalSignalBindings(stats);

  lines.push(`## Signal Migration: ${stats.signalAdoption}% (${signal}/${total} bindings)`);
  lines.push('');

  lines.push('### Summary');
  lines.push('');
  lines.push('| Metric | Signal | Total | Percentage |');
  lines.push('|--------|--------|-------|------------|');
  lines.push(`| Inputs | ${stats.inputs.signal} | ${stats.inputs.total} | ${stats.inputs.percentage}% |`);
  lines.push(`| Outputs | ${stats.outputs.signal} | ${stats.outputs.total} | ${stats.outputs.percentage}% |`);
  lines.push(`| Models | ${stats.models.total} | ${stats.models.total} | 100% |`);
  lines.push('');

  lines.push('### Component Summary');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Fully migrated | ${stats.componentSummary.fullyMigrated} |`);
  lines.push(`| Partially migrated | ${stats.componentSummary.partiallyMigrated} |`);
  lines.push(`| Legacy | ${stats.componentSummary.legacy} |`);
  lines.push(`| No bindings | ${stats.componentSummary.noBindings} |`);
  lines.push(`| **Total** | **${stats.componentSummary.total}** |`);
  lines.push('');

  if (stats.components.length > 0) {
    lines.push('### All Components');
    lines.push('');
    lines.push('| Component | File | Status | Decorator Inputs | Signal Inputs | Decorator Outputs | Signal Outputs | Models |');
    lines.push('|-----------|------|--------|-----------------|---------------|-------------------|----------------|--------|');
    for (const comp of stats.components) {
      lines.push(
        `| \`${comp.name}\` | \`${comp.filePath}\` | ${statusLabel(comp.status)} | ${comp.inputs.decorator} | ${comp.inputs.signal} | ${comp.outputs.decorator} | ${comp.outputs.signal} | ${comp.models} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
