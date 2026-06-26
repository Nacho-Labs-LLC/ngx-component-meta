const { execSync } = require('child_process');

try {
  execSync('npx vitest run tests/unit/ast-helpers.test.ts', { stdio: 'inherit' });
} catch (e) {
  console.error('Vitest failed', e);
}
