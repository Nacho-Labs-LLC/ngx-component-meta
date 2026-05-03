# Contributing to ngx-component-meta

Thanks for your interest in contributing! This guide covers what you need to get started.

## Getting Started

```bash
git clone https://github.com/Nacho-Labs-LLC/ngx-component-meta.git
cd ngx-component-meta
npm install
npm run build
npm test
```

## Development Workflow

1. Fork the repo and create a feature branch from `main`
2. Make your changes
3. Add or update tests for any new behavior
4. Run `npm test` and `npm run typecheck` to verify
5. Open a pull request against `main`

## Project Structure

```
src/
  cli/            # CLI entry point and argument parsing
  extractors/     # Per-member-type extraction (input, output, method, etc.)
  storybook/      # Storybook integration (Compodoc mapper, arg types)
  utils/          # Shared utilities (AST helpers, JSDoc, type resolution)
  parser.ts       # Core parser — creates ts.Program, walks AST
  types.ts        # All public TypeScript interfaces
  diff.ts         # API diffing engine
  lint.ts         # Linting engine
  stats.ts        # Signal migration stats
tests/
  fixtures/       # Angular component fixtures used by tests
  unit/           # Unit tests
  integration/    # CLI and Storybook integration tests
```

## Code Style

- TypeScript strict mode — no `any` unless unavoidable
- Prefer early returns over deep nesting
- No comments explaining *what* — only *why* when non-obvious
- Keep functions small and focused
- Zero runtime dependencies — only `typescript` as a peer dep

## Tests

Every new feature or bug fix should include tests. We use [Vitest](https://vitest.dev/).

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
```

Test fixtures live in `tests/fixtures/`. If you're adding support for a new Angular pattern, add a fixture component that exercises it.

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Link to a related issue if one exists
- All tests must pass and the build must succeed

## Reporting Issues

Use [GitHub Issues](https://github.com/Nacho-Labs-LLC/ngx-component-meta/issues) for bugs and feature requests. Include:

- What you expected vs. what happened
- A minimal reproduction (a small `.component.ts` file is ideal)
- Your TypeScript and Node.js versions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
