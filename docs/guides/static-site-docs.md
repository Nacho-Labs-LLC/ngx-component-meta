# Generating Prop Tables for Documentation Sites

Design system documentation sites (Docusaurus, Astro, VitePress, Nextra) need prop tables showing each component's inputs, outputs, types, defaults, and descriptions. Most Angular teams either write these tables by hand (they drift) or generate Compodoc HTML (it does not integrate with non-Angular doc sites).

The `props-json` format generates a clean, framework-agnostic JSON file optimized for rendering prop tables in any static site generator.

## Generating the JSON

```bash
ngx-component-meta -f props-json -o docs/api.json "src/**/*.ts"
```

Or with a library tsconfig:

```bash
ngx-component-meta -f props-json -p tsconfig.lib.json -o docs/api.json "src/**/*.ts"
```

## Output Structure

The output is a single JSON file with this shape:

```json
{
  "components": [
    {
      "name": "ButtonComponent",
      "kind": "component",
      "description": "A clickable button with multiple visual variants.",
      "selector": "app-button",
      "props": [
        {
          "name": "variant",
          "type": "\"primary\" | \"secondary\" | \"ghost\"",
          "required": false,
          "defaultValue": "'primary'",
          "description": "The visual style variant.",
          "signal": true
        },
        {
          "name": "disabled",
          "type": "boolean",
          "required": false,
          "defaultValue": "false",
          "description": "Whether the button is disabled.",
          "signal": true
        },
        {
          "name": "size",
          "type": "\"sm\" | \"md\" | \"lg\"",
          "required": false,
          "defaultValue": "'md'",
          "description": "The size of the button.",
          "signal": false
        }
      ],
      "events": [
        {
          "name": "clicked",
          "type": "MouseEvent",
          "description": "Emitted when the button is clicked.",
          "signal": false
        }
      ],
      "methods": [
        {
          "name": "focus",
          "signature": "() => void",
          "description": "Programmatically focus the button."
        }
      ]
    },
    {
      "name": "TruncatePipe",
      "kind": "pipe",
      "description": "Truncates a string to a maximum length.",
      "selector": null,
      "transform": {
        "signature": "(value: string, maxLength: number, ellipsis?: string) => string",
        "params": [
          { "name": "value", "type": "string", "optional": false, "description": "The string to truncate." },
          { "name": "maxLength", "type": "number", "optional": false, "description": "Maximum character length." },
          { "name": "ellipsis", "type": "string", "optional": true, "description": "String to append when truncated." }
        ],
        "returnType": "string"
      }
    }
  ],
  "generatedAt": "2026-04-20T12:00:00.000Z",
  "version": "0.1.0"
}
```

Key design decisions:
- **Types are unwrapped.** Signal inputs show `string`, not `InputSignal<string>`.
- **`signal: boolean`** tells you how the input/output was declared, so your docs can show a badge or note.
- **`bindingName`** is only present when the template binding name differs from the property name (i.e., when an alias is used).
- **Models** have their own section with `required` and `defaultValue`.
- **Pipes** include the full transform signature.
- Components are sorted alphabetically by name.

## Rendering in React (Docusaurus / Astro)

Create a reusable `PropsTable` component:

```tsx
// src/components/PropsTable.tsx
import apiData from '../../docs/api.json';

interface PropsTableProps {
  name: string;
}

export function PropsTable({ name }: PropsTableProps) {
  const component = apiData.components.find((c) => c.name === name);

  if (!component) {
    return <p>Component "{name}" not found in API data.</p>;
  }

  return (
    <div>
      {component.description && <p>{component.description}</p>}
      {component.selector && (
        <p>
          <strong>Selector:</strong> <code>{component.selector}</code>
        </p>
      )}

      {component.props && component.props.length > 0 && (
        <>
          <h3>Inputs</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Default</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {component.props.map((prop) => (
                <tr key={prop.name}>
                  <td>
                    <code>{prop.bindingName ?? prop.name}</code>
                  </td>
                  <td>
                    <code>{prop.type}</code>
                  </td>
                  <td>{prop.defaultValue ? <code>{prop.defaultValue}</code> : '—'}</td>
                  <td>{prop.required ? 'Yes' : 'No'}</td>
                  <td>{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {component.events && component.events.length > 0 && (
        <>
          <h3>Outputs</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {component.events.map((event) => (
                <tr key={event.name}>
                  <td>
                    <code>{event.bindingName ?? event.name}</code>
                  </td>
                  <td>
                    <code>{event.type}</code>
                  </td>
                  <td>{event.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {component.methods && component.methods.length > 0 && (
        <>
          <h3>Methods</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Signature</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {component.methods.map((method) => (
                <tr key={method.name}>
                  <td>
                    <code>{method.name}</code>
                  </td>
                  <td>
                    <code>{method.signature}</code>
                  </td>
                  <td>{method.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
```

## Using in MDX

In Docusaurus, Astro, or any MDX-based site:

```mdx
---
title: Button
---

import { PropsTable } from '@site/src/components/PropsTable';

# Button

A clickable button with multiple visual variants.

## Usage

```html
<app-button variant="primary" (clicked)="handleClick()">
  Click me
</app-button>
```

## API

<PropsTable name="ButtonComponent" />
```

Each component page imports the same `PropsTable` and passes its class name. The prop table renders from the generated JSON, always in sync with the source code.

## Programmatic Usage

If you need to customize the output or integrate with a build pipeline:

```typescript
import { createParser, toPropsJson, toPropsJsonString } from 'ngx-component-meta';
import { writeFileSync } from 'fs';

const parser = createParser('./tsconfig.lib.json');
const result = parser.parseAll(['src/lib/**/*.ts']);

// Get the structured object
const propsJson = toPropsJson(result, { version: '1.2.0' });

// Or get a formatted JSON string directly
const jsonString = toPropsJsonString(result, {
  version: '1.2.0',
  pretty: true,
});

writeFileSync('docs/api.json', jsonString);
```

## Keeping Docs in Sync

Add JSON generation to your build script so documentation is never stale:

```json
{
  "scripts": {
    "build:docs": "ngx-component-meta -f props-json -p tsconfig.lib.json -o docs/api.json \"src/**/*.ts\"",
    "build": "ng build my-lib && npm run build:docs",
    "docs:dev": "npm run build:docs && docusaurus start"
  }
}
```

### CI Integration

Regenerate on every push and fail if the committed JSON is outdated:

```yaml
name: Docs
on:
  pull_request:
    branches: [main]

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: Generate API docs
        run: npx ngx-component-meta -f props-json -p tsconfig.lib.json -o docs/api.json "src/**/*.ts"

      - name: Check for uncommitted changes
        run: |
          if ! git diff --quiet docs/api.json; then
            echo "::error::docs/api.json is out of date. Run 'npm run build:docs' and commit the result."
            git diff docs/api.json
            exit 1
          fi
```

This ensures that every PR either includes updated docs or gets a clear error message explaining what to do.

The same pattern works for VitePress (Vue), Astro, or any static site generator. The JSON file is the contract -- your rendering component is the only framework-specific part. Import `api.json`, find the component by name, and render a table from `props`, `events`, and `methods`. When the Angular library changes, regenerating the JSON updates every prop table across the site.
