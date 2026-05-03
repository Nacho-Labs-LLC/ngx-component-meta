import type { LintResult, LintViolation } from './lint.js';

function severityLabel(severity: 'error' | 'warn'): string {
  return severity === 'error' ? 'ERROR' : 'WARN';
}

function memberSuffix(member?: string): string {
  return member ? `.${member}` : '';
}

/**
 * One line per violation, plain text.
 * Example: ERROR require-input-description: ButtonComponent.variant — Input is missing a description (src/button.component.ts)
 */
export function formatLintText(result: LintResult): string {
  const lines: string[] = [];

  for (const v of result.violations) {
    lines.push(
      `${severityLabel(v.severity)} ${v.rule}: ${v.component}${memberSuffix(v.member)} — ${v.message} (${v.filePath})`,
    );
  }

  if (result.violations.length === 0) {
    lines.push(`All ${result.summary.components} components passed lint checks.`);
  } else {
    lines.push('');
    lines.push(
      `${result.summary.errors} error(s), ${result.summary.warnings} warning(s) in ${result.summary.components} components`,
    );
  }

  return lines.join('\n');
}

/**
 * JSON.stringify the full LintResult.
 */
export function formatLintJson(result: LintResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Stylish output grouped by file, like ESLint.
 */
export function formatLintStylish(result: LintResult): string {
  if (result.violations.length === 0) {
    return `\u2713 ${result.summary.components} components passed all checks`;
  }

  const grouped = groupByFile(result.violations);
  const lines: string[] = [];

  for (const [filePath, violations] of grouped) {
    lines.push(filePath);
    for (const v of violations) {
      const sev = v.severity === 'error' ? '\u2717' : '\u26A0';
      lines.push(`  ${sev} ${v.component}${memberSuffix(v.member)}  ${v.message}  ${v.rule}`);
    }
    lines.push('');
  }

  lines.push(
    `\u2717 ${result.summary.errors} errors, ${result.summary.warnings} warnings in ${result.summary.components} components`,
  );

  return lines.join('\n');
}

function groupByFile(violations: LintViolation[]): Map<string, LintViolation[]> {
  const groups = new Map<string, LintViolation[]>();
  for (const v of violations) {
    const list = groups.get(v.filePath) ?? [];
    list.push(v);
    groups.set(v.filePath, list);
  }
  return groups;
}
