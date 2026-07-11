import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, '../..');
const actionDir = path.join(repoRoot, 'action');
const actionManifestPath = path.join(actionDir, 'action.yml');

function getActionMainPath() {
  const actionManifest = readFileSync(actionManifestPath, 'utf8');
  const match = actionManifest.match(/main:\s*['"]([^'"]+)['"]/);

  if (!match) {
    throw new Error('Could not find runs.main in action/action.yml.');
  }

  return match[1];
}

describe('GitHub Action launch surface', () => {
  it('ships the compiled entrypoint referenced by action.yml', () => {
    const actionMainPath = getActionMainPath();
    const committedBundlePath = path.join(actionDir, actionMainPath);
    expect(actionMainPath).toBe('dist/index.cjs');
    expect(existsSync(committedBundlePath)).toBe(true);

    const tempOutdir = mkdtempSync(path.join(os.tmpdir(), 'ngx-component-meta-action-'));

    try {
      execFileSync('node', ['scripts/build-action.mjs', '--outdir', tempOutdir], {
        cwd: repoRoot,
        stdio: 'pipe',
      });

      const rebuiltBundlePath = path.join(tempOutdir, path.basename(committedBundlePath));
      expect(existsSync(rebuiltBundlePath)).toBe(true);
      expect(readFileSync(rebuiltBundlePath, 'utf8')).toBe(
        readFileSync(committedBundlePath, 'utf8'),
      );
    } finally {
      rmSync(tempOutdir, { recursive: true, force: true });
    }
  });
});
