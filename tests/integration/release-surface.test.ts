import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, '../..');

function readRepoFile(...segments: string[]) {
  return readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

describe('v1.0.0 release surface', () => {
  it('keeps package metadata aligned on 1.0.0', () => {
    const pkg = JSON.parse(readRepoFile('package.json'));
    const lock = JSON.parse(readRepoFile('package-lock.json'));

    expect(pkg.version).toBe('1.0.0');
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
  });

  it('ships the tag-triggered release workflow on the repo surface', () => {
    const workflowPath = path.join(repoRoot, '.github', 'workflows', 'release.yml');
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('name: Release');
    expect(workflow).toContain('tags:');
    expect(workflow).toContain("- 'v*.*.*'");
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm publish --access public --provenance');
    expect(workflow).toContain('Update moving major action tag');
    expect(workflow).toContain('refs/tags/$MAJOR_TAG');
  });

  it('documents both immutable and moving-tag GitHub Action refs', () => {
    const readme = readRepoFile('action', 'README.md');

    expect(readme).toContain('- uses: ./action');
    expect(readme).toContain('Nacho-Labs-LLC/ngx-component-meta/action@v1');
    expect(readme).toContain('Nacho-Labs-LLC/ngx-component-meta/action@v1.0.0');
    expect(readme).toContain('moving major tag');
  });
});
