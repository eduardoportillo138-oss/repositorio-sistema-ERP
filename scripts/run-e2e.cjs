const path = require('node:path');
const { spawnSync } = require('node:child_process');
const result = spawnSync(
  process.execPath,
  [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)],
  {
    cwd: path.resolve(__dirname, '../apps/web'),
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: path.resolve(__dirname, '../node_modules/.cache/ms-playwright'),
    },
    stdio: 'inherit',
  },
);
if (result.error) console.error('No se pudo iniciar Playwright:', result.error.name);
process.exit(result.status ?? 1);
