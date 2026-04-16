# Spec 04: Markdown Output Format

## Problem

Many teams want lightweight, readable API docs without a full HTML site. Compodoc generates a heavy HTML documentation site — overkill for a design system that just needs component API tables in its existing docs (Docusaurus, VitePress, Docsify, GitHub wiki, etc.).

## Solution

Add a `markdown` output format to the CLI and a `formatMarkdown()` function to the programmatic API.

## Output format

### Per-component output

```markdown
## ButtonComponent

A basic button component using decorator-based inputs.

**Selector:** `app-button` | **Standalone:** yes

### Inputs

| Name | Binding | Type | Required | Default | Description |
|------|---------|------|----------|---------|-------------|
| `label` | `label` | `string` | no | `'Click me'` | The button label text. |
| `disabled` | `disabled` | `boolean` | yes | — | Whether the button is disabled. |
| `variant` | `btnVariant` | `'primary' \| 'secondary' \| 'danger'` | no | `'primary'` | Visual variant of the button. |

### Outputs

| Name | Binding | Type | Description |
|------|---------|------|-------------|
| `clicked` | `clicked` | `MouseEvent` | Emits when the button is clicked. |
| `focused` | `btnFocus` | `FocusEvent` | Emits when the button is focused. |

### Methods

| Name | Signature | Description |
|------|-----------|-------------|
| `reset` | `() => void` | Reset the click counter. |
```

### Per-pipe output

```markdown
## TruncatePipe

Truncates a string to a maximum length.

**Pipe name:** `truncate` | **Pure:** yes | **Standalone:** yes

### Transform

```
transform(value: string, maxLength?: number = 100, suffix?: string = '...'): string
```
```

### Models section (when present)

```markdown
### Two-Way Bindings

| Name | Binding | Type | Required | Default | Description |
|------|---------|------|----------|---------|-------------|
| `expanded` | `expanded` | `boolean` | no | `false` | Whether expanded. |
```

## Implementation

### Files to create/modify

- `src/cli/formatters.ts` — Add `formatMarkdown()` function
- `src/cli/options.ts` — Add `markdown` to format type
- `src/cli/index.ts` — Wire up markdown formatter

### `formatMarkdown()` function

```typescript
export function formatMarkdown(docs: (ComponentDoc | PipeDoc)[]): string {
  return docs.map(doc => {
    if ('pipeName' in doc) return formatPipeMarkdown(doc);
    return formatComponentMarkdown(doc);
  }).join('\n\n---\n\n');
}
```

Keep it simple:
- One function per section (inputs table, outputs table, methods table, etc.)
- Escape pipe characters in type strings (`|` → `\|` inside table cells)
- Skip empty sections (no "### Methods" header if there are no methods)
- Use backtick-wrapped code for names, types, and defaults

### CLI usage

```bash
# Single component to stdout
ngx-component-meta -f markdown src/button/button.component.ts

# All components, one markdown file per component
ngx-component-meta -f markdown --split -o docs/api/ "src/**/*.component.ts"
# Creates: docs/api/ButtonComponent.md, docs/api/CardComponent.md, etc.

# All components in one file
ngx-component-meta -f markdown -o docs/api.md "src/**/*.component.ts"
```

The `--split` flag writes one file per component instead of concatenating. The filename is derived from `ComponentDoc.name`.

### Programmatic API

```typescript
// New export from 'ngx-component-meta'
export { formatMarkdown } from './cli/formatters.js';
```

This lets doc site generators call it directly without shelling out to the CLI.

## Testing

- Snapshot test: parse a fixture, format as markdown, assert matches expected output
- Test pipe characters in types are escaped
- Test that empty sections are omitted
- Test `--split` mode writes separate files
- Test models section appears only when models exist

## Dependencies on other specs

None.
