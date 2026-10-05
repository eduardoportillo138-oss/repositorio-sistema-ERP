const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const repo = path.resolve(__dirname, '..');
const android = path.join(repo, 'apps', 'mobile', 'android');
const env = { ...process.env };
let mappedDrive;

try {
  if (process.platform === 'win32') {
    const jdk17 = path.join(process.env.USERPROFILE || '', '.jdks', 'jbr-17.0.14');
    if (!env.JAVA_HOME && fs.existsSync(path.join(jdk17, 'bin', 'java.exe'))) {
      env.JAVA_HOME = jdk17;
    }
    for (const letter of ['R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']) {
      const drive = `${letter}:`;
      if (fs.existsSync(`${drive}\\`)) continue;
      execFileSync('subst.exe', [drive, repo]);
      mappedDrive = drive;
      env.ERP_ANDROID_CXX_STAGE = `${drive}\\tmp\\android-cxx`;
      break;
    }
    if (!mappedDrive) throw new Error('No hay letra de unidad libre para la compilación C++ de Android.');
  }

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
} finally {
  if (mappedDrive) execFileSync('subst.exe', [mappedDrive, '/D']);
}
