import { exec } from 'child_process';
import type { ExecException } from 'child_process';
import { promisify } from 'util';
import { CommandExecutionError, TimeoutError } from '../errors';
import { logger } from './logger';

const execPromise = promisify(exec);

/**
 * Some commands (notably `astro build`) are not safe to run concurrently against
 * the same project output directories on all platforms.
 *
 * The analyzer runs multiple modules in parallel; several of those modules can
 * trigger builds (e.g. deployment readiness + bundle dry-run). On Windows this
 * can intermittently fail with missing build artifacts like `dist/renderers.mjs`.
 *
 * To keep analysis deterministic, we serialize Astro builds within this process.
 */
const ASTRO_BUILD_LOCK_RE = /\bastro\s+build\b/i;

function isAstroBuildCommand(command: string): boolean {
  const trimmed = command.trim();
  return trimmed === 'bun run build' || ASTRO_BUILD_LOCK_RE.test(trimmed);
}

let astroBuildQueue: Promise<void> = Promise.resolve();

async function withAstroBuildLock<T>(
  command: string,
  fn: () => Promise<T>
): Promise<T> {
  const previous = astroBuildQueue;
  let release: () => void;
  astroBuildQueue = new Promise<void>(resolve => {
    release = resolve;
  });

  await previous;
  logger.debug('Acquired Astro build lock', { command });
  try {
    return await fn();
  } finally {
    release!();
    logger.debug('Released Astro build lock', { command });
  }
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  duration: number;
}

interface CommandOptions {
  cwd?: string;
  timeout?: number; // in milliseconds
  maxBuffer?: number; // in bytes, default 1024 * 1024 (1MB)
  ignoreExitCode?: boolean; // if true, won't throw error on non-zero exit code
  retries?: number; // number of retries on failure
  retryDelay?: number; // delay between retries in ms
  env?: NodeJS.ProcessEnv; // custom environment variables
  shell?: string; // custom shell to use
  onRetry?: (attempt: number, error: Error) => void;
}

interface CommandStreamOptions extends CommandOptions {
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute a command with retry support and enhanced error handling
 */
export async function executeCommand(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  if (isAstroBuildCommand(command)) {
    return withAstroBuildLock(command, () =>
      executeCommandInternal(command, options)
    );
  }

  return executeCommandInternal(command, options);
}

/**
 * Internal implementation of executeCommand.
 * Exported wrapper may apply process-local locks for certain commands.
 */
async function executeCommandInternal(
  command: string,
  options: CommandOptions = {}
): Promise<CommandResult> {
  const {
    cwd,
    timeout = 60000,
    maxBuffer = 10 * 1024 * 1024,
    ignoreExitCode = false,
    retries = 0,
    retryDelay = 1000,
    env,
    shell,
    onRetry,
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    const startTime = Date.now();

    try {
      if (attempt > 0) {
        logger.debug(
          `Retrying command (attempt ${attempt + 1}/${retries + 1})`,
          {
            command,
          }
        );
        if (onRetry) {
          onRetry(attempt, lastError!);
        }
        await sleep(retryDelay * attempt); // Exponential backoff
      }

      const { stdout, stderr } = await execPromise(command, {
        cwd,
        timeout,
        maxBuffer,
        killSignal: 'SIGTERM',
        env: env ? { ...process.env, ...env } : undefined,
        shell,
      });

      const duration = Date.now() - startTime;
      logger.debug(`Command completed in ${duration}ms`, { command });

      return {
        stdout,
        stderr,
        exitCode: 0,
        signal: null,
        duration,
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const err = error as ExecException & {
        stdout: string;
        stderr: string;
        code: number | null;
        signal: NodeJS.Signals | null;
        killed?: boolean;
      };

      // Check if this was a timeout
      if (err.killed && err.signal === 'SIGTERM') {
        lastError = new TimeoutError(
          command, // operation
          timeout // timeoutMs
        );
      } else {
        lastError = new CommandExecutionError(
          command,
          err.code,
          err.signal,
          err.stdout || '',
          err.stderr || '',
          `Command execution failed: ${command}`
        );
      }

      // If we should ignore exit codes and this is just a non-zero exit
      if (ignoreExitCode && err.code !== null) {
        return {
          stdout: err.stdout || '',
          stderr: err.stderr || '',
          exitCode: err.code,
          signal: err.signal,
          duration,
        };
      }

      attempt++;

      // If we've exhausted retries, throw the error
      if (attempt > retries) {
        logger.error(`Command failed after ${attempt} attempt(s)`, lastError);
        throw lastError;
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unknown error in command execution');
}

/**
 * Execute a command with streaming output
 */
export function executeCommandStream(
  command: string,
  options: CommandStreamOptions = {}
): Promise<CommandResult> {
  const {
    cwd,
    timeout = 60000,
    maxBuffer = 10 * 1024 * 1024,
    ignoreExitCode = false,
    env,
    shell,
    onStdout,
    onStderr,
  } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;

    const child = exec(command, {
      cwd,
      maxBuffer,
      env: env ? { ...process.env, ...env } : undefined,
      shell,
    });

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(
          new TimeoutError(
            command, // operation
            timeout // timeoutMs
          )
        );
      }, timeout);
    }

    // Handle stdout
    child.stdout?.on('data', (data: string) => {
      stdout += data;
      if (onStdout) {
        onStdout(data);
      }
    });

    // Handle stderr
    child.stderr?.on('data', (data: string) => {
      stderr += data;
      if (onStderr) {
        onStderr(data);
      }
    });

    // Handle completion
    child.on('close', (code, signal) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const duration = Date.now() - startTime;

      if (code !== 0 && !ignoreExitCode) {
        reject(
          new CommandExecutionError(
            command,
            code,
            signal,
            stdout,
            stderr,
            `Command exited with code ${code}`
          )
        );
        return;
      }

      resolve({
        stdout,
        stderr,
        exitCode: code,
        signal,
        duration,
      });
    });

    // Handle errors
    child.on('error', error => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(error);
    });
  });
}

/**
 * Execute multiple commands in sequence
 */
export async function executeCommandsSequence(
  commands: string[],
  options: CommandOptions = {}
): Promise<CommandResult[]> {
  const results: CommandResult[] = [];

  for (const command of commands) {
    const result = await executeCommand(command, options);
    results.push(result);
  }

  return results;
}

/**
 * Execute multiple commands in parallel with concurrency limit
 */
export async function executeCommandsParallel(
  commands: string[],
  options: CommandOptions & { concurrency?: number } = {}
): Promise<CommandResult[]> {
  const { concurrency = 5, ...commandOptions } = options;
  const results: CommandResult[] = new Array(commands.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < commands.length) {
      const index = currentIndex++;
      results[index] = await executeCommand(commands[index], commandOptions);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, commands.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

/**
 * Check if a command exists in the system
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const checkCommand =
      process.platform === 'win32' ? `where ${command}` : `which ${command}`;

    await executeCommand(checkCommand, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the version of a command if it supports --version
 */
export async function getCommandVersion(
  command: string
): Promise<string | null> {
  try {
    const result = await executeCommand(`${command} --version`, {
      timeout: 5000,
      ignoreExitCode: true,
    });
    // Extract version number from output
    const versionMatch = result.stdout.match(/\d+\.\d+(\.\d+)?/);
    return versionMatch ? versionMatch[0] : null;
  } catch {
    return null;
  }
}
