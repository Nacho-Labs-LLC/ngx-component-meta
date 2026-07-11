import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const actionEntry = path.join(repoRoot, 'action', 'src', 'index.ts');

function getOutdir(argv) {
  const outdirFlagIndex = argv.indexOf('--outdir');
  if (outdirFlagIndex === -1) {
    return path.join(repoRoot, 'action', 'dist');
  }

  const outdir = argv[outdirFlagIndex + 1];
  if (!outdir) {
    throw new Error('Expected a path after --outdir.');
  }

  return path.resolve(repoRoot, outdir);
}

const outdir = getOutdir(process.argv.slice(2));

await build({
  entryPoints: [actionEntry],
  outfile: path.join(outdir, 'index.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: ['node20'],
  logLevel: 'info',
});

// The dependency bundle can contain whitespace-only lines. Normalize them so
// the tracked action artifact is deterministic and passes repository diff checks.
const bundlePath = path.join(outdir, 'index.cjs');
const bundle = fs.readFileSync(bundlePath, 'utf8');
fs.writeFileSync(
  bundlePath,
  bundle.split('\n').map((line) => line.replace(/[ \t]+$/, '')).join('\n'),
);
