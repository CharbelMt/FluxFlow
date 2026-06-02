import { spawn } from 'node:child_process';
import { watchFile, unwatchFile } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, '..');
const targetUrl = 'http://localhost:9500';

const configFiles = [
  join(projectRoot, 'src-capacitor', 'capacitor.config.json'),
  join(
    projectRoot,
    'src-capacitor',
    'android',
    'app',
    'src',
    'main',
    'assets',
    'capacitor.config.json',
  ),
];

const watchOptions = { interval: 500 };
const pendingWrites = new Map();
let childProcess;

async function rewriteConfig(filePath) {
  try {
    const current = await readFile(filePath, 'utf8');
    const config = JSON.parse(current);

    const nextConfig = {
      ...config,
      server: {
        ...(config.server ?? {}),
        androidScheme: 'http',
        url: targetUrl,
        cleartext: true,
      },
    };

    const serialized = JSON.stringify(nextConfig, null, 2) + '\n';

    if (serialized !== current) {
      await writeFile(filePath, serialized, 'utf8');
      console.log(`[cap-localhost] updated ${relative(projectRoot, filePath)}`);
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}

function scheduleRewrite(filePath) {
  const existing = pendingWrites.get(filePath);
  if (existing) {
    clearTimeout(existing);
  }

  const timeout = setTimeout(() => {
    pendingWrites.delete(filePath);
    rewriteConfig(filePath).catch((error) => {
      console.error(`[cap-localhost] failed to update ${filePath}`);
      console.error(error);
    });
  }, 200);

  pendingWrites.set(filePath, timeout);
}

function startWatchers() {
  for (const filePath of configFiles) {
    watchFile(filePath, watchOptions, () => scheduleRewrite(filePath));
  }
}

function stopWatchers() {
  for (const filePath of configFiles) {
    unwatchFile(filePath);
  }
}

function cleanup(exitCode = 0) {
  stopWatchers();

  if (childProcess && !childProcess.killed) {
    childProcess.kill();
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => cleanup(130));
process.on('SIGTERM', () => cleanup(143));

for (const filePath of configFiles) {
  await rewriteConfig(filePath);
}

startWatchers();

childProcess = spawn('quasar', ['dev', '-m', 'capacitor', '-T', 'android'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

childProcess.on('error', (error) => {
  console.error('[cap-localhost] failed to start quasar dev');
  console.error(error);
  cleanup(1);
});

childProcess.on('close', (code) => {
  cleanup(code ?? 0);
});
