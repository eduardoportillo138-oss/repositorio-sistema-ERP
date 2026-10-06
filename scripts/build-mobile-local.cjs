const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repo = path.resolve(__dirname, '..');
const android = path.join(repo, 'apps', 'mobile', 'android');
const env = { ...process.env };
if (process.platform === 'win32') {
  const jdk17 = path.join(process.env.USERPROFILE || '', '.jdks', 'jbr-17.0.14');
  if (!env.JAVA_HOME && fs.existsSync(path.join(jdk17, 'bin', 'java.exe'))) {
    env.JAVA_HOME = jdk17;
  }
}

// app/build.gradle selects a short native staging directory on Windows.
const command = process.platform === 'win32' ? 'cmd.exe' : './gradlew';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'gradlew.bat assembleLocal --no-daemon']
  : ['assembleLocal', '--no-daemon'];
const result = spawnSync(command, args, {
  cwd: android,
  env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
