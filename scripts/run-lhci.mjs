import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const cliPath = fileURLToPath(
  new URL('../node_modules/@lhci/cli/src/cli.js', import.meta.url)
);
const env = {
  ...process.env,
  CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath(),
};

const child = spawn(process.execPath, [cliPath, 'autorun'], {
  env,
  shell: false,
  stdio: 'inherit',
});

child.on('exit', code => {
  process.exit(code ?? 1);
});

child.on('error', error => {
  console.error(error);
  process.exit(1);
});
