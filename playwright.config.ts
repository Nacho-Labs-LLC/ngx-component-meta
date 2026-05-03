import { defineConfig } from '@playwright/test';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'node demo/server.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    cwd: __dirname,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
