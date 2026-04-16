import type { ComponentDoc, PipeDoc } from '../types.js';
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
