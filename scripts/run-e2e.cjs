const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const browserPath = path.join(root, 'node_modules/.cache/ms-playwright');
const services = [];
fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });

function startService(name, args, cwd) {
  const logPath = path.join(root, 'tmp', `e2e-${name}.log`);
  const log = fs.openSync(logPath, 'w');
  const child = spawn(process.execPath, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  fs.closeSync(log);
  services.push({ child, name, logPath });
  return child;
}

async function waitFor(url, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Servidor E2E terminó antes de iniciar: ${url}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch (_) {
      /* still starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Servidor E2E no inició: ${url}`);
}

async function stopServices() {
  await Promise.all(
    services.map(async ({ child }) => {
      if (child.exitCode !== null) return;
      child.kill('SIGINT');
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }),
  );
}

(async () => {
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    env: { ...process.env, VITE_API_BASE_URL: 'http://127.0.0.1:3081/api/v1' },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  if (build.error || build.status !== 0) throw new Error('No se pudieron compilar los bundles E2E');

  const qa = startService('api', ['backend/scripts/serve-qa.cjs'], root);
  await waitFor('http://127.0.0.1:3081/health', qa);
  const web = startService(
    'web',
    [
      '../../node_modules/vite/bin/vite.js',
      'preview',
      '--configLoader',
      'runner',
      '--host',
      '127.0.0.1',
      '--port',
      '4173',
      '--strictPort',
    ],
    path.join(root, 'apps/web'),
  );
  const mobile = startService(
    'mobile',
    [
      '../../node_modules/vite/bin/vite.js',
      'preview',
      '--configLoader',
      'runner',
      '--host',
      '127.0.0.1',
      '--port',
      '4174',
      '--strictPort',
    ],
    path.join(root, 'apps/mobile'),
  );
  await Promise.all([
    waitFor('http://127.0.0.1:4173', web),
    waitFor('http://127.0.0.1:4174', mobile),
  ]);

  const result = spawnSync(
    process.execPath,
    [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)],
    {
      cwd: path.join(root, 'apps/web'),
      env: { ...process.env, ERP_E2E_EXTERNAL_SERVERS: '1', PLAYWRIGHT_BROWSERS_PATH: browserPath },
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
})()
  .catch((error) => {
    console.error('E2E falló:', error.message);
    for (const { name, logPath } of services) {
      if (fs.existsSync(logPath))
        console.error(name, fs.readFileSync(logPath, 'utf8').slice(-2000));
    }
    process.exitCode = 1;
  })
  .finally(stopServices);
