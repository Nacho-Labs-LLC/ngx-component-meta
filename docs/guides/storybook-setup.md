# Setting Up Storybook Integration

Storybook for Angular uses Compodoc to extract component metadata for its docs addon. Compodoc works, but it has real problems: it is slow on large projects, it does not understand signal-based APIs (`input()`, `output()`, `model()`), and it requires a separate build step that runs an entirely separate TypeScript compiler pass.

`ngx-component-meta` replaces Compodoc for Storybook with faster extraction, full signal support, and proper type unwrapping (you see `string`, not `InputSignal<string>`).

There are three integration modes. Pick the one that fits your setup.

## Mode A: Drop-In Replacement (Manual)

This is the simplest path. You generate Compodoc-compatible JSON and feed it to Storybook's existing `setCompodocJson()` API.

### 1. Install

```bash
npm install -D ngx-component-meta
```

### 2. Remove Compodoc

Delete `@compodoc/compodoc` from your `devDependencies` and remove any `compodoc` script from `package.json`:

```diff
  "scripts": {
-   "compodoc": "compodoc -p tsconfig.doc.json -e json -d .",
-   "storybook": "npm run compodoc && storybook dev -p 6006",
+   "storybook": "storybook dev -p 6006",
  }
```

### 3. Generate Metadata at Storybook Startup

In `.storybook/preview.ts`, replace the Compodoc import with a call to `ngx-component-meta`:

```typescript
// .storybook/preview.ts
import { setCompodocJson } from '@storybook/angular';
import { createParser } from 'ngx-component-meta';
import { toCompodocJson } from 'ngx-component-meta/storybook';

const parser = createParser('./tsconfig.json');
const docs = parser.parseAll([
  'src/**/*.component.ts',
  'src/**/*.directive.ts',
  'src/**/*.pipe.ts',
]);
const compodocJson = toCompodocJson(docs);
setCompodocJson(compodocJson);

const preview = {
  // your existing preview config
};

export default preview;
```

`toCompodocJson()` maps the `ngx-component-meta` output to the exact shape Storybook expects. Signal inputs, outputs, and models are mapped to their Compodoc equivalents -- Storybook sees them as normal `@Input()` / `@Output()` decorators with correct types.

### 4. What Changes

- The `documentation.json` file is no longer needed.
- Storybook docs tables now show unwrapped types: `string` instead of `InputSignal<string>`.
- Signal `model()` bindings appear as both an input and an output (the `nameChange` pattern).
- Build time drops because there is no separate Compodoc compilation pass.

## Mode B: Direct ArgTypes Bypass

Instead of going through Compodoc's format, you can skip it entirely and provide arg types directly to Storybook's docs addon. This gives you the most control and avoids any Compodoc compatibility layer.

### 1. Install

```bash
npm install -D ngx-component-meta
```

### 2. Configure `extractArgTypes`

In `.storybook/preview.ts`:

```typescript
// .storybook/preview.ts
import { createArgTypesExtractor } from 'ngx-component-meta/storybook';

const preview = {
  parameters: {
    docs: {
      extractArgTypes: createArgTypesExtractor('./tsconfig.json'),
    },
  },
};

export default preview;
```

`createArgTypesExtractor()` returns a function that Storybook calls for each component. It parses the component on demand, caches the result, and returns arg types in Storybook's native format. Inputs get `text`, `number`, `boolean`, or `select` controls inferred from their TypeScript types. Outputs are wired as actions. Models appear in a "two-way bindings" category with both the input control and the change event.

### 3. Per-Component Overrides

You can still override arg types at the story level as usual:

```typescript
// button.stories.ts
export default {
  component: ButtonComponent,
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['primary', 'secondary', 'ghost'],
    },
  },
};
```

Your overrides merge on top of the extracted types.

## Mode C: Storybook Preset (Zero Config)

The `ngx-component-meta-storybook` package provides a Storybook preset that handles everything automatically. It extracts metadata at build time and injects it via Vite's `define` -- no manual `setCompodocJson()` call needed.

### 1. Install

```bash
npm install -D ngx-component-meta ngx-component-meta-storybook
```

### 2. Register the Preset

In `.storybook/main.ts`:

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|mdx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  // Add the preset here:
  presets: ['ngx-component-meta-storybook/preset'],
};

export default config;
```

The preset does two things:
1. At build time (`viteFinal`), it parses your components and injects the Compodoc-compatible JSON as a Vite `define` constant.
2. At runtime (`previewAnnotations`), it calls `setCompodocJson()` with the injected data.

### 3. Custom Options

Pass options through Storybook's framework options:

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  framework: {
    name: '@storybook/angular',
    options: {
      ngxComponentMeta: {
        tsconfig: './tsconfig.lib.json',
        include: ['src/lib/**/*.ts'],
        disableMethods: false,
      },
    },
  },
  presets: ['ngx-component-meta-storybook/preset'],
};
```

## Mode D: Vite Plugin (Custom Vite Setups)

If you use Vite directly (not through Storybook), the `ngx-component-meta-vite` package provides a Vite plugin with virtual module support:

### 1. Install

```bash
npm install -D ngx-component-meta ngx-component-meta-vite
```

### 2. Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { ngxComponentMeta } from 'ngx-component-meta-vite';

export default defineConfig({
  plugins: [
    ngxComponentMeta({
      tsconfig: './tsconfig.json',
      include: ['src/**/*.component.ts'],
    }),
  ],
});
```

### 3. Import from Virtual Modules

```typescript
// Use in your app code or Storybook config
import { components, pipes } from 'virtual:ngx-component-meta';
import compodocJson from 'virtual:ngx-component-meta/compodoc';
```

Add the client types to your `tsconfig.json` for type checking:

```json
{
  "compilerOptions": {
    "types": ["ngx-component-meta-vite/client"]
  }
}
```

The plugin watches for changes to `.component.ts`, `.directive.ts`, and `.pipe.ts` files and triggers HMR reloads automatically.

## What Works Better Than Compodoc

| Feature | Compodoc | ngx-component-meta |
|---------|----------|--------------------|
| `input()` signals | Not recognized | Full support, type unwrapped |
| `output()` signals | Not recognized | Full support |
| `model()` two-way bindings | Not recognized | Mapped to input + output pair |
| `input.required<T>()` | Not recognized | Shown as required with correct type |
| Union type inputs | Shows raw type string | Generates `select` control automatically |
| Boolean inputs | Sometimes misdetected | Correct `boolean` control |
| Build speed (100 components) | ~8-15 seconds | ~1-2 seconds |
| Incremental rebuilds | Full reparse | Cached, sub-second |
| Inherited members | Inconsistent | Included by default, configurable |
| `@HostBinding` / `@HostListener` | In separate section | Extracted with full types |

## Troubleshooting

**Storybook shows no props for a component.**
Check that your tsconfig path is correct and that the component files match your `include` patterns. Run the CLI directly to verify:

```bash
npx ngx-component-meta -f json "src/lib/button/button.component.ts"
```

**Types show as `any` or `object`.**
This usually means the tsconfig does not include the type's declaration file. Make sure your library's `tsconfig.json` has the right `paths` and `include` settings.

**Models do not appear.**
Verify you are using Angular 17.1+ where `model()` is available. The `model()` call must be in the class body, not in a constructor or method.
