# Signal Support

`ngx-component-meta` fully supports Angular's signal-based APIs. This document shows every supported signal pattern with source code and expected JSON output.

All examples below are taken from the project's test fixtures and verified by the test suite.

## Signal Inputs

### `input.required<T>()` -- required, no default

```ts
/** The card title. */
title = input.required<string>();
```

```json
{
  "name": "title",
  "bindingName": "title",
  "type": "string",
  "required": true,
  "description": "The card title.",
  "source": "signal",
  "transform": null
}
```

Note: `defaultValue` is omitted when there is no default (its runtime value is `undefined`, which is not valid JSON).

### `input<T>(defaultValue)` -- optional with default

```ts
/** Whether the card is elevated. */
elevated = input(false);
```

```json
{
  "name": "elevated",
  "bindingName": "elevated",
  "type": "boolean",
  "required": false,
  "defaultValue": "false",
  "description": "Whether the card is elevated.",
  "source": "signal",
  "transform": null
}
```

The type is inferred from the default value. The `defaultValue` is the source text representation.

### `input<T>(defaultValue, { alias })` -- with alias

```ts
/** Card size variant. */
size = input<'sm' | 'md' | 'lg'>('md', { alias: 'cardSize' });
```

```json
{
  "name": "size",
  "bindingName": "cardSize",
  "type": "'sm' | 'md' | 'lg'",
  "required": false,
  "defaultValue": "'md'",
  "description": "Card size variant.",
  "source": "signal",
  "transform": null
}
```

`name` is the class property name. `bindingName` is the template binding name (the alias). When no alias is specified, `bindingName` equals `name`.

### `input<T>()` -- optional, no default

```ts
/** Optional tooltip text. */
tooltip = input<string>();
```

```json
{
  "name": "tooltip",
  "bindingName": "tooltip",
  "type": "string",
  "required": false,
  "description": "Optional tooltip text.",
  "source": "signal",
  "transform": null
}
```

When `input<T>()` is called with no arguments, the input is optional with no default value. The `defaultValue` field is omitted.

### `input<T>(defaultValue, { transform })` -- with transform function

```ts
/** Number of columns, accepts string or number. */
columns = input(1, { transform: numberAttribute });
```

```json
{
  "name": "columns",
  "bindingName": "columns",
  "type": "number",
  "required": false,
  "defaultValue": "1",
  "description": "Number of columns, accepts string or number.",
  "source": "signal",
  "transform": "numberAttribute"
}
```

When a `transform` option is provided, the `transform` field contains the function name as a string.

## Signal Outputs

### `output<T>()` -- basic output

```ts
/** Emits when the card is selected. */
selected = output<string>();
```

```json
{
  "name": "selected",
  "bindingName": "selected",
  "type": "string",
  "description": "Emits when the card is selected.",
  "source": "signal"
}
```

### `output<T>({ alias })` -- aliased output

```ts
/** Emits when the card is dismissed. */
dismissed = output<void>({ alias: 'cardDismissed' });
```

```json
{
  "name": "dismissed",
  "bindingName": "cardDismissed",
  "type": "void",
  "description": "Emits when the card is dismissed.",
  "source": "signal"
}
```

## Model Signals (Two-Way Bindings)

### `model(defaultValue)` -- optional with default

```ts
/** Whether the card is expanded (two-way binding). */
expanded = model(false);
```

```json
{
  "name": "expanded",
  "bindingName": "expanded",
  "type": "boolean",
  "required": false,
  "defaultValue": "false",
  "description": "Whether the card is expanded (two-way binding)."
}
```

In templates, this supports `[(expanded)]="value"` two-way binding syntax.

### `model.required<T>()` -- required model

```ts
/** The active tab (two-way, required). */
activeTab = model.required<string>();
```

```json
{
  "name": "activeTab",
  "bindingName": "activeTab",
  "type": "string",
  "required": true,
  "description": "The active tab (two-way, required)."
}
```

### Models in Compodoc-compatible output

When using `toCompodocJson()`, each model generates two entries:
- An input in `inputsClass` (e.g., `expanded`)
- An output in `outputsClass` with a `Change` suffix (e.g., `expandedChange`)

This matches Angular's two-way binding convention where `[(expanded)]` desugars to `[expanded]` + `(expandedChange)`.

## Signal Queries

Signal queries are extracted when `shouldIncludeQueries: true` is set in parser options.

Supported query functions:
- `viewChild()`
- `viewChild.required()`
- `viewChildren()`
- `contentChild()`
- `contentChild.required()`
- `contentChildren()`

Each produces a `QueryDoc`:

```ts
interface QueryDoc {
  name: string;
  kind: 'viewChild' | 'viewChildren' | 'contentChild' | 'contentChildren';
  selector: string;
  type: string;
  required: boolean;
  source: 'decorator' | 'signal';
  description: string;
}
```

## Mixed Decorator + Signal in the Same Class

Both APIs can coexist. Each member's `source` field indicates how it was declared.

```ts
@Component({
  selector: 'app-mixed',
  standalone: true,
  template: '',
})
export class MixedComponent {
  /** Decorator input. */
  @Input() name: string = '';

  /** Signal input. */
  age = input(0);

  /** Decorator output. */
  @Output() saved = new EventEmitter<void>();

  /** Signal output. */
  deleted = output<string>();

  /** Model signal. */
  selected = model(false);
}
```

Extracted metadata:

```json
{
  "name": "MixedComponent",
  "kind": "component",
  "selector": "app-mixed",
  "inputs": [
    {
      "name": "name",
      "type": "string",
      "source": "decorator",
      "required": false,
      "defaultValue": "''"
    },
    {
      "name": "age",
      "type": "number",
      "source": "signal",
      "required": false,
      "defaultValue": "0"
    }
  ],
  "outputs": [
    {
      "name": "saved",
      "type": "void",
      "source": "decorator"
    },
    {
      "name": "deleted",
      "type": "string",
      "source": "signal"
    }
  ],
  "models": [
    {
      "name": "selected",
      "type": "boolean",
      "required": false,
      "defaultValue": "false"
    }
  ]
}
```

## Signal Inputs with Inheritance

Signal inputs are inherited from base classes just like decorator inputs.

```ts
@Component({ selector: 'app-base', standalone: true, template: '' })
export class BaseComponent {
  /** Whether the component is visible. */
  visible = input(true);

  /** Base reset method. */
  reset(): void {}
}

@Component({ selector: 'app-child', standalone: true, template: '' })
export class ChildComponent extends BaseComponent {
  /** The child label. */
  label = input.required<string>();
}
```

`ChildComponent` will include:
- `visible` (inherited signal input from `BaseComponent`, `source: 'signal'`)
- `label` (own signal input)
- `reset` (inherited method)

Child class overrides take precedence. Set `shouldIncludeInherited: false` in parser options to exclude inherited members.

## How This Differs from Compodoc

Compodoc has known issues with signal APIs:
- `input()` calls are often not recognized or produce incorrect types
- `input.required()` is not detected as required
- `model()` signals are not supported at all
- Signal query functions are not extracted

`ngx-component-meta` handles all signal patterns natively through the TypeScript compiler API, producing accurate types, defaults, and required/optional status.
