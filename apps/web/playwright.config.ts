import { defineConfig } from '@playwright/test';
import path from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve(
  __dirname,
  '../../node_modules/.cache/ms-playwright',
);
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 900, height: 1100 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: [
    {
      command: 'node ../../backend/scripts/serve-qa.cjs',
      url: 'http://127.0.0.1:3081/health',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'npm run dev -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      env: { ERP_API_TARGET: 'http://127.0.0.1:3081' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -w ../mobile -- --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      env: { ERP_API_TARGET: 'http://127.0.0.1:3081' },
      reuseExistingServer: false,
    },
  ],
});
