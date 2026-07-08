# Releasing ngx-component-meta

This repository ships two public release surfaces that need to stay aligned:

- the npm package: `@nacho-labs/ngx-component-meta`
- the GitHub Action implementation under `action/`

The main rule is simple: do not document a public install path until the corresponding artifact actually exists.

## Release rules

- Keep `package.json`, the npm registry, and `CHANGELOG.md` on the same version before updating public docs.
- Do not document remote action refs such as `Nacho-Labs-LLC/ngx-component-meta/action@v1` until both a semver tag like `v1.0.0` and the moving major tag `v1` exist on GitHub.
- If the action is not tagged yet, public docs should point external users to the CLI path and only describe the action as a local or vendored workflow helper.

## Prerequisites

- npm publish access for `@nacho-labs/ngx-component-meta`
- `NPM_TOKEN` configured as a GitHub Actions secret
- permission to push Git tags and publish GitHub releases

## Cut a release

1. Update `package.json` and `CHANGELOG.md` for the target version.
2. Run:

```bash
npm ci
npm run build
npm run typecheck
npm test
npm pack --dry-run
```

3. Commit the release prep.
4. Create and push the semver tag:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

5. The `Release` workflow publishes the npm package and creates the GitHub release from that tag.
6. Verify the published state before updating any install docs:

```bash
npm view @nacho-labs/ngx-component-meta version
```

## Enable the remote GitHub Action ref

The repository tag (for example `v1.0.0`) is enough for immutable refs like `Nacho-Labs-LLC/ngx-component-meta/action@v1.0.0`.

The release workflow also force-updates the matching moving major tag after a successful publish/release run, so `Nacho-Labs-LLC/ngx-component-meta/action@v1` stays aligned automatically.

Only advertise `Nacho-Labs-LLC/ngx-component-meta/action@v1` after the first successful semver release has completed and the `v1` tag exists on GitHub.

## After release

- confirm the npm version and GitHub release are visible publicly
- update external-facing docs only if the referenced package version or action tag now exists
- if the first release has not happened yet, keep examples pinned to local-path or explicit semver refs until the moving major tag exists
