# Component Quality Gates with Lint

The `lint` command enforces documentation and API quality standards across your component library. It catches missing descriptions, untyped inputs, and contradictory configurations before they reach code review.

## Why Lint Components

Code linters like ESLint check JavaScript/TypeScript syntax and patterns. They do not understand Angular component metadata. Questions like "does every input have a JSDoc description?" or "are there any inputs typed as `any`?" require parsing the component decorator and class structure. The `lint` command does exactly this.

## CLI Usage

```bash
ngx-component-meta lint "src/**/*.ts"
```

With a specific tsconfig:

```bash
ngx-component-meta lint -p tsconfig.lib.json "src/**/*.ts"
```

The exit code reflects the result:

- **Exit 0** -- no errors (warnings may be present).
- **Exit 1** -- one or more errors found.

## Output Formats

### Stylish (default)

Grouped by file, similar to ESLint's stylish formatter:

```
src/lib/button/button.component.ts
  ✗ ButtonComponent.variant  Input is missing a description  require-input-description
  ✗ ButtonComponent.size  Input is missing a description  require-input-description
  ⚠ ButtonComponent  Component is missing a description  require-component-description

src/lib/dialog/dialog.component.ts
  ✗ DialogComponent.onClose  Output is missing a description  require-output-description
  ⚠ DialogComponent.data  Input should not use type 'any'  no-any-inputs

✗ 3 errors, 2 warnings in 12 components
```

### Text

One line per violation, easy to grep:

```bash
ngx-component-meta lint -f text "src/**/*.ts"
```

```
ERROR require-input-description: ButtonComponent.variant — Input is missing a description (src/lib/button/button.component.ts)
ERROR require-input-description: ButtonComponent.size — Input is missing a description (src/lib/button/button.component.ts)
WARN require-component-description: ButtonComponent — Component is missing a description (src/lib/button/button.component.ts)
ERROR require-output-description: DialogComponent.onClose — Output is missing a description (src/lib/dialog/dialog.component.ts)
WARN no-any-inputs: DialogComponent.data — Input should not use type 'any' (src/lib/dialog/dialog.component.ts)

3 error(s), 2 warning(s) in 12 components
```

### JSON

Structured output for programmatic consumption:

```bash
ngx-component-meta lint -f json -o lint-report.json "src/**/*.ts"
```

```json
{
  "violations": [
    {
      "rule": "require-input-description",
      "severity": "error",
      "component": "ButtonComponent",
      "member": "variant",
      "message": "Input is missing a description",
      "filePath": "src/lib/button/button.component.ts"
    }
  ],
  "summary": {
    "errors": 3,
    "warnings": 2,
    "components": 12,
    "passed": 10
  }
}
```

## Built-In Rules

There are 7 rules. Each has a default severity that you can override.

### `require-input-description` (default: error)

Every `@Input()` or `input()` must have a JSDoc description.

Triggers when:
```typescript
@Component({ selector: 'app-button', template: '' })
export class ButtonComponent {
  // No JSDoc -- this triggers the rule
  @Input() variant: string = 'primary';
}
```

Fix:
```typescript
@Component({ selector: 'app-button', template: '' })
export class ButtonComponent {
  /** The visual style variant of the button. */
  @Input() variant: string = 'primary';
}
```

### `require-output-description` (default: error)

Every `@Output()` or `output()` must have a JSDoc description.

Triggers when:
```typescript
@Output() clicked = new EventEmitter<void>();
```

Fix:
```typescript
/** Emitted when the user clicks the button. */
@Output() clicked = new EventEmitter<void>();
```

### `require-component-description` (default: warn)

Every component, directive, and pipe class must have a JSDoc description.

Triggers when:
```typescript
@Component({ selector: 'app-card', template: '' })
export class CardComponent { }
```

Fix:
```typescript
/** A content container with optional header, body, and footer sections. */
@Component({ selector: 'app-card', template: '' })
export class CardComponent { }
```

### `no-any-inputs` (default: warn)

Inputs should not use type `any`. Untyped inputs make templates unsafe and documentation useless.

Triggers when:
```typescript
@Input() data: any;
// or
data = input<any>();
```

Fix:
```typescript
@Input() data: Record<string, unknown>;
// or define a proper interface
@Input() data: TableRow[];
```

### `no-any-outputs` (default: warn)

Outputs should not emit type `any`.

Triggers when:
```typescript
@Output() selected = new EventEmitter<any>();
```

Fix:
```typescript
@Output() selected = new EventEmitter<SelectionEvent>();
```

### `no-required-with-default` (default: warn)

A required input should not have a default value. This is contradictory -- if it has a sensible default, it should not be required. If it must be provided by the consumer, it should not have a default.

Triggers when:
```typescript
name = input.required<string>({ initialValue: 'default' });
// or any required input with a default value detected
```

Fix: either remove `required` or remove the default.

### `require-selector` (default: error)

Every component and directive must have a selector defined. Components without selectors can only be used via `ViewContainerRef` and are almost always a mistake.

Triggers when:
```typescript
@Component({ template: '<p>oops</p>' })
export class OrphanComponent { }
```

Fix:
```typescript
@Component({ selector: 'app-orphan', template: '<p>fixed</p>' })
export class OrphanComponent { }
```

## Configuring Severity Programmatically

When using the API directly, you can override the severity of any rule:

```typescript
import { createParser, lint, formatLintStylish } from 'ngx-component-meta';

const parser = createParser('./tsconfig.lib.json');
const result = parser.parseAll(['src/**/*.ts']);

const lintResult = lint(result, {
  rules: {
    'require-input-description': 'error',
    'require-output-description': 'error',
    'require-component-description': 'error',  // promote to error
    'no-any-inputs': 'error',                   // promote to error
    'no-any-outputs': 'off',                    // disable entirely
    'no-required-with-default': 'warn',
    'require-selector': 'error',
  },
});

console.log(formatLintStylish(lintResult));

if (lintResult.summary.errors > 0) {
  process.exit(1);
}
```

Valid severity values:
- `'error'` -- counted as an error, fails CI.
- `'warn'` -- reported but does not fail CI.
- `'off'` -- rule is skipped entirely.

## CI Integration

### Basic: Fail on Lint Errors

```yaml
name: Component Lint
on:
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx ngx-component-meta lint "src/**/*.ts"
```

The `lint` command exits with code 1 when any `error`-severity rule fires. Warnings alone do not fail the build.

### With Reporting

```yaml
      - name: Lint components
        run: |
          npx ngx-component-meta lint -f json -o lint-report.json "src/**/*.ts" || true
          npx ngx-component-meta lint -f stylish "src/**/*.ts"
```

The first invocation saves structured JSON for further processing. The second prints human-readable output to the CI log.

### As a Pre-Commit Hook

```json
{
  "scripts": {
    "lint:components": "ngx-component-meta lint \"src/**/*.ts\""
  }
}
```

Wire it into your pre-commit tool (husky, lint-staged, lefthook). The lint is fast enough (sub-second for most projects) to run on every commit.

## Combining with Other Quality Checks

Lint works well alongside the `diff` and `stats` commands in a single CI job:

```yaml
jobs:
  component-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: Lint components
        run: npx ngx-component-meta lint "src/**/*.ts"

      - name: Check for breaking changes
        run: npx ngx-component-meta diff --base baseline.json -p tsconfig.lib.json

      - name: Report migration stats
        run: npx ngx-component-meta stats "src/**/*.ts"
```

Each step has its own exit code, so a lint failure does not mask a breaking change, and vice versa.
