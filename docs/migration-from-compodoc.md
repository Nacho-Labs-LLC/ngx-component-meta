# Migration from Compodoc

This guide covers how to replace Compodoc with `ngx-component-meta` in common scenarios. All examples are copy-paste ready.

## Scenario A: Storybook (manual wiring)

### Before

```bash
npx compodoc -p tsconfig.json -e json -d .
```

```ts
// .storybook/preview.ts
import docJson from '../documentation.json';
import { setCompodocJson } from '@storybook/addon-docs/angular';

setCompodocJson(docJson);
```

### After (Mode A -- drop-in replacement)

Remove the Compodoc build step. Replace `preview.ts`:

```ts
// .storybook/preview.ts
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { parse } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';

setCompodocJson(toCompodocJson(parse(['src/**/*.component.ts'])));
```

`toCompodocJson()` produces the same structure Storybook expects from `documentation.json`. Signal inputs, outputs, and models are mapped to `inputsClass`/`outputsClass` with synthetic `@Input`/`@Output` decorators. Models generate both an input entry and an output entry with a `Change` suffix (e.g., `expanded` + `expandedChange`).

### After (Mode B -- direct extraction, no Compodoc layer)

```ts
// .storybook/preview.ts
import { createArgTypesExtractor } from 'ngx-component-meta/storybook';

export default {
  parameters: {
    docs: {
      extractArgTypes: createArgTypesExtractor('./tsconfig.json'),
    },
  },
};
```

Mode B bypasses `setCompodocJson` entirely. The extractor parses components on demand and caches results by name. Inputs, outputs, models, properties, and methods each get their own Storybook category.

## Scenario B: Storybook (angular.json builder)

### Before

```json
{
  "storybook": {
    "builder": "@storybook/angular:start-storybook",
    "options": {
      "compodoc": true,
      "compodocArgs": ["-p", "tsconfig.json", "-e", "json", "-d", "."]
    }
  }
}
```

### After

Disable the built-in Compodoc integration:

```json
{
  "storybook": {
    "builder": "@storybook/angular:start-storybook",
    "options": {
      "compodoc": false
    }
  }
}
```

Then add either Mode A or Mode B wiring in your `.storybook/preview.ts` (see Scenario A above).

## Scenario C: CI/CD pipeline generating documentation.json

### Before

```bash
npx compodoc -p tsconfig.json -e json -d docs/
```

### After

```bash
npx ngx-component-meta -p tsconfig.json -f compodoc -o docs/documentation.json "src/**/*.ts"
```

The `-f compodoc` flag outputs the same JSON structure Compodoc produces. Downstream tools that read `documentation.json` continue working without changes.

## Scenario D: Custom doc site reading documentation.json

### Before

```ts
import docs from './documentation.json';
const comp = docs.components.find(c => c.name === 'MyComponent');
comp.inputsClass.forEach(input => { /* render */ });
```

### After (compat mode -- zero code changes)

Generate Compodoc-compatible JSON:

```bash
npx ngx-component-meta -f compodoc -o documentation.json "src/**/*.ts"
```

Your existing code continues to work as-is. The `components`, `directives`, and `pipes` arrays have the same shape.

### After (native format -- for new code)

For new code, use the native format directly for richer metadata (signal source, model bindings, query details):

```ts
import { parse } from 'ngx-component-meta';

const docs = parse(['src/my.component.ts']);
docs.forEach(doc => {
  if ('kind' in doc) {
    // ComponentDoc -- has inputs, outputs, models, methods, properties, queries
    doc.inputs.forEach(input => {
      console.log(input.name, input.type, input.source); // 'decorator' | 'signal'
    });
    doc.models.forEach(model => {
      console.log(model.name, model.type, model.required);
    });
  } else {
    // PipeDoc -- has pipeName, transform signature
    console.log(doc.pipeName, doc.transform.returnType);
  }
});
```

## Scenario E: IDE/language server consuming metadata

```ts
import { createParser } from 'ngx-component-meta';

const parser = createParser('./tsconfig.json');

// Parser reuses ts.Program across calls -- fast for repeated lookups
const docs = parser.parse(['src/button/button.component.ts']);

// Or use an externally managed program for tighter IDE integration
const program = parser.getProgram();
const docs2 = parser.parseWithProgram(['src/card/card.component.ts'], program);
```

## Compodoc CLI Flag Mapping

| Compodoc flag | ngx-component-meta equivalent |
|---|---|
| `-p tsconfig.json` | `-p tsconfig.json` |
| `-e json` | `-f json` (default) |
| `-d outputDir` | `-o outputDir/documentation.json` |
| `--disablePrivate` | Default behavior (private members always excluded) |
| `--disableInternal` | Default behavior (`@internal` always excluded) |
| `--disableLifeCycleHooks` | Default behavior (lifecycle hooks always excluded) |
| `--disableProtected` | Use `propFilter` to exclude protected members |
| `--disableRoutesGraph` | N/A (no route analysis -- focused metadata tool) |
| `-s` / `--serve` | N/A (no built-in server -- use any static server) |
| `-w` / `--watch` | `-w` / `--watch` (watches for file changes and rebuilds automatically) |
| (no equivalent) | `--split` (write one file per component, with `markdown` format + `--output`) |
| (no equivalent) | `-f markdown` (output as markdown tables instead of JSON) |

### Excluding protected members (replaces `--disableProtected`)

```ts
import { parse } from 'ngx-component-meta';

const docs = parse(['src/**/*.component.ts'], {
  propFilter: (prop) => {
    if ('modifier' in prop && prop.modifier === 'protected') return false;
    return true;
  },
});
```

## What Changes in the Output

If you switch from Compodoc's native JSON to `ngx-component-meta`'s native format (`-f json`), the structure is different:

| Compodoc field | ngx-component-meta field |
|---|---|
| `components[].inputsClass` | `ComponentDoc.inputs` |
| `components[].outputsClass` | `ComponentDoc.outputs` |
| (no equivalent) | `ComponentDoc.models` |
| `components[].propertiesClass` | `ComponentDoc.properties` |
| `components[].methodsClass` | `ComponentDoc.methods` |
| (no equivalent) | `ComponentDoc.queries` |
| `components[].selector` | `ComponentDoc.selector` |
| `pipes[].name` (pipe name) | `PipeDoc.pipeName` |

The native format also adds:
- `source: 'decorator' | 'signal'` on inputs, outputs, and queries
- `models` array for `model()` two-way bindings (separate from inputs/outputs)
- `queries` array for `viewChild()`, `contentChild()`, etc.
- `transform` field on inputs when a transform function is specified
- `kind: 'component' | 'directive'` to distinguish entity types
- `extends` and `implements` for inheritance info
