# Spec 07: Injectables & Interfaces

## Problem

Compodoc's `documentation.json` includes `injectables`, `interfaces`, and `miscellaneous` (type aliases, enums, variables) sections. Some consumers read these:
- Storybook reads `miscellaneous.enumerations` to generate enum controls
- Storybook reads `miscellaneous.typealiases` for type resolution
- Custom doc sites display service APIs alongside component APIs
- Design system docs show shared interfaces and types

## Solution

Extend `ngx-component-meta` to extract:
1. `@Injectable()` classes → `InjectableDoc`
2. Exported interfaces → `InterfaceDoc`
3. Exported type aliases → `TypeAliasDoc`
4. Exported enums → `EnumDoc`

## Output types

```typescript
export interface InjectableDoc {
  name: string;
  filePath: string;
  providedIn: 'root' | 'platform' | 'any' | null;
  description: string;
  rawDescription: string;
  tags: Record<string, string>;
  methods: MethodDoc[];
  properties: PropertyDoc[];
}

export interface InterfaceDoc {
  name: string;
  filePath: string;
  description: string;
  rawDescription: string;
  tags: Record<string, string>;
  properties: InterfacePropertyDoc[];
  methods: InterfaceMethodDoc[];
  extends: string[];
}

export interface InterfacePropertyDoc {
  name: string;
  type: string;
  optional: boolean;
  description: string;
  rawDescription: string;
  tags: Record<string, string>;
}

export interface InterfaceMethodDoc {
  name: string;
  params: MethodParamDoc[];
  returnType: string;
  description: string;
  rawDescription: string;
  tags: Record<string, string>;
}

export interface TypeAliasDoc {
  name: string;
  filePath: string;
  type: string;             // The resolved type as a string
  description: string;
  rawDescription: string;
  tags: Record<string, string>;
}

export interface EnumDoc {
  name: string;
  filePath: string;
  description: string;
  rawDescription: string;
  tags: Record<string, string>;
  members: EnumMemberDoc[];
}

export interface EnumMemberDoc {
  name: string;
  value: string;
  description: string;
}
```

## Implementation

### New extractors

- `src/extractors/injectable.ts` — Extract `@Injectable()` classes
- `src/extractors/interface.ts` — Extract exported interfaces
- `src/extractors/type-alias.ts` — Extract exported type aliases
- `src/extractors/enum.ts` — Extract exported enums

### Parser changes

`src/parser.ts` needs to iterate more than just class declarations:

```typescript
ts.forEachChild(sourceFile, node => {
  // Existing: class declarations (@Component, @Directive, @Pipe)
  if (ts.isClassDeclaration(node)) { /* ... */ }
  
  // New: @Injectable classes
  if (ts.isClassDeclaration(node) && findDecorator(node, 'Injectable')) { /* ... */ }
  
  // New: exported interfaces
  if (ts.isInterfaceDeclaration(node) && isExported(node)) { /* ... */ }
  
  // New: exported type aliases
  if (ts.isTypeAliasDeclaration(node) && isExported(node)) { /* ... */ }
  
  // New: exported enums
  if (ts.isEnumDeclaration(node) && isExported(node)) { /* ... */ }
});
```

### Return type change

The `parse()` function currently returns `(ComponentDoc | PipeDoc)[]`. This would expand to:

```typescript
export interface ParseResult {
  components: ComponentDoc[];
  pipes: PipeDoc[];
  injectables: InjectableDoc[];
  interfaces: InterfaceDoc[];
  typeAliases: TypeAliasDoc[];
  enums: EnumDoc[];
}
```

**Breaking change consideration:** We could either:
- A) Change the return type (breaking) — cleaner API
- B) Add a separate `parseAll()` function — backwards compatible
- C) Return a union type with a discriminator

**Recommendation:** Option B for v1.x — add `parseAll()` that returns `ParseResult`. Deprecate the array return in v2.

### Storybook compat updates

The `toCompodocJson()` mapper needs to include:
- `injectables` array from `InjectableDoc[]`
- `miscellaneous.typealiases` from `TypeAliasDoc[]`
- `miscellaneous.enumerations` from `EnumDoc[]`

This is important because Storybook reads enumerations and type aliases to resolve union types into select controls.

### New parser option

```typescript
interface ParserOptions {
  // ... existing options
  
  /** Extract injectables, interfaces, type aliases, and enums. Default: false */
  shouldIncludeTypes?: boolean;
}
```

Default false so existing consumers aren't affected.

## Testing

- Fixture with an `@Injectable()` service
- Fixture with exported interfaces
- Fixture with exported type aliases (including union types)
- Fixture with exported enums
- Storybook compat test: verify enums appear in `miscellaneous.enumerations`
- Test that `parseAll()` returns the structured result while `parse()` still returns the array

## Dependencies on other specs

- **Spec 02 (Migration Guide)** should be updated to document these new types
- **Spec 06 (API Diff)** should support diffing injectables and interfaces

## Priority

P3 — most consumers only need components and directives. Injectables and interfaces are additive and can be shipped without breaking existing users.
