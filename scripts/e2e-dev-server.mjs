import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const astroBin = fileURLToPath(
  new URL('../node_modules/astro/bin/astro.mjs', import.meta.url)
);

const child = spawn(
  process.execPath,
  [astroBin, 'dev', ...process.argv.slice(2)],
  {
    env: { ...process.env, ASTRO_DEV_BACKGROUND: '0' },
    stdio: 'inherit',
  }
);

const stop = signal => {
  if (!child.killed) child.kill(signal);
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

child.on('error', error => {
  console.error(error);
  process.exitCode = 1;
});

child.on('exit', code => {
  process.exit(code ?? 0);
});
