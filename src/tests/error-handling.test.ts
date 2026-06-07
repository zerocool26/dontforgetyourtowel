import { describe, it, expect, vi } from 'vitest';
import {
  AppError,
  AnalysisError,
  CommandExecutionError,
  FileSystemError,
  ConfigurationError,
  NetworkError,
  isAppError,
  isError,
  getErrorMessage,
  wrapError,
  formatErrorForLogging,
  retryWithBackoff,
} from '../errors';

const expectDetails = <T>(details: unknown): T => {
  expect(details).toBeDefined();
  return details as T;
};

describe('Error Handling System', () => {
  describe('AppError (Base Class)', () => {
    it('should create basic app error with message and code', () => {
      const error = new AppError('Test error message', 'TEST_ERROR');

      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should use default error code when not provided', () => {
      const error = new AppError('Test message');

      expect(error.code).toBe('APP_ERROR');
    });

    it('should store additional details', () => {
      const details = { extra: 'info', count: 42 };
      const error = new AppError('Test', 'TEST', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('AnalysisError', () => {
    it('should create analysis error with checker name and original error', () => {
      const originalError = new Error('Original problem');
      const analysisError = new AnalysisError('SyntaxChecker', originalError);

      expect(analysisError.name).toBe('AnalysisError');
      expect(analysisError.code).toBe('ANALYSIS_ERROR');
      expect(analysisError.message).toContain('SyntaxChecker');
      expect(analysisError.message).toContain('Original problem');
      const analysisDetails = expectDetails<{
        checkerName: string;
        originalError: Error;
      }>(analysisError.details);

      expect(analysisDetails.checkerName).toBe('SyntaxChecker');
      expect(analysisDetails.originalError).toBe(originalError);
    });

    it('should use custom message when provided', () => {
      const originalError = new Error('File not found');
      const analysisError = new AnalysisError(
        'FileChecker',
        originalError,
        'Custom analysis failed'
      );

      expect(analysisError.message).toContain('Custom analysis failed');
      expect(analysisError.message).toContain('FileChecker');
    });
  });

  describe('CommandExecutionError', () => {
    it('should store all command execution details', () => {
      const error = new CommandExecutionError(
        'bun run test',
        1,
        'SIGTERM' as NodeJS.Signals,
        'Test output',
        'Error output'
      );

      expect(error.name).toBe('CommandExecutionError');
      expect(error.code).toBe('COMMAND_EXECUTION_ERROR');
      const commandDetails = expectDetails<{
        command: string;
        exitCode: number | null;
        signal: NodeJS.Signals | null;
        stdout: string;
        stderr: string;
      }>(error.details);

      expect(commandDetails.command).toBe('bun run test');
      expect(commandDetails.exitCode).toBe(1);
      expect(commandDetails.signal).toBe('SIGTERM');
      expect(commandDetails.stdout).toBe('Test output');
      expect(commandDetails.stderr).toBe('Error output');
    });

    it('should handle null exit code and signal', () => {
      const error = new CommandExecutionError(
        'long-running-command',
        null,
        null,
        '',
        'Process killed'
      );

      const fallbackDetails = expectDetails<{
        exitCode: number | null;
        signal: NodeJS.Signals | null;
      }>(error.details);

      expect(fallbackDetails.exitCode).toBeNull();
      expect(fallbackDetails.signal).toBeNull();
    });
  });

  describe('FileSystemError', () => {
    it('should store file operation details', () => {
      const originalError = new Error('ENOENT: no such file or directory');
      const fsError = new FileSystemError(
        'read',
        '/path/to/file.ts',
        originalError
      );

      expect(fsError.name).toBe('FileSystemError');
      expect(fsError.code).toBe('FILE_SYSTEM_ERROR');
      expect(fsError.message).toContain('read on /path/to/file.ts');
      expect(fsError.message).toContain('ENOENT');
      const fsDetails = expectDetails<{
        operation: string;
        filePath: string;
        originalError: Error;
      }>(fsError.details);

      expect(fsDetails.operation).toBe('read');
      expect(fsDetails.filePath).toBe('/path/to/file.ts');
      expect(fsDetails.originalError).toBe(originalError);
    });

    it('should use custom message when provided', () => {
      const originalError = new Error('Permission denied');
      const fsError = new FileSystemError(
        'write',
        '/readonly/file.txt',
        originalError,
        'Custom file operation failed'
      );

      expect(fsError.message).toContain('Custom file operation failed');
    });
  });

  describe('ConfigurationError', () => {
    it('should store configuration key and message', () => {
      const error = new ConfigurationError(
        'projectRoot',
        'Invalid path specified'
      );

      expect(error.name).toBe('ConfigurationError');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.message).toContain('Invalid path specified');
      expect(error.message).toContain('projectRoot');
      const configDetails = expectDetails<{ configKey: string }>(error.details);

      expect(configDetails.configKey).toBe('projectRoot');
    });

    it('should use default message when not provided', () => {
      const error = new ConfigurationError('timeout');

      expect(error.message).toContain('Invalid configuration');
      expect(error.message).toContain('timeout');
    });
  });

  describe('NetworkError', () => {
    it('should store network request details', () => {
      const originalError = new Error('Connection timeout');
      const networkError = new NetworkError(
        'https://api.example.com',
        500,
        originalError
      );

      expect(networkError.name).toBe('NetworkError');
      expect(networkError.code).toBe('NETWORK_ERROR');
      expect(networkError.message).toContain('https://api.example.com');
      expect(networkError.message).toContain('500');
      expect(networkError.message).toContain('Connection timeout');
      const networkDetails = expectDetails<{
        url: string;
        status: number;
        originalError?: Error;
      }>(networkError.details);

      expect(networkDetails.url).toBe('https://api.example.com');
      expect(networkDetails.status).toBe(500);
      expect(networkDetails.originalError).toBe(originalError);
    });

    it('should work without original error', () => {
      const networkError = new NetworkError('https://api.test.com', 404);

      const minimalNetworkDetails = expectDetails<{
        originalError?: Error;
      }>(networkError.details);

      expect(minimalNetworkDetails.originalError).toBeUndefined();
      expect(networkError.message).toContain('https://api.test.com');
      expect(networkError.message).toContain('404');
    });

    it('should use custom message when provided', () => {
      const networkError = new NetworkError(
        'https://custom.api.com',
        503,
        undefined,
        'Custom network failure'
      );

      expect(networkError.message).toContain('Custom network failure');
    });
  });

  describe('Error Inheritance and Prototype Chain', () => {
    it('should maintain proper prototype chain for all error types', () => {
      const errors = [
        new AppError('test'),
        new AnalysisError('test', new Error('test')),
        new CommandExecutionError('test', 1, null, '', ''),
        new FileSystemError('test', 'test', new Error('test')),
        new ConfigurationError('test'),
        new NetworkError('test', 500),
      ];

      errors.forEach(error => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
        expect(Object.getPrototypeOf(error)).toBe(error.constructor.prototype);
      });
    });

    it('should be catchable as base Error type', () => {
      const errors = [
        new AnalysisError('test', new Error('test')),
        new CommandExecutionError('test', 1, null, '', ''),
        new NetworkError('test', 500),
      ];

      errors.forEach(error => {
        try {
          throw error;
        } catch (caught) {
          expect(caught instanceof Error).toBe(true);
          expect(caught instanceof AppError).toBe(true);
        }
      });
    });
  });

  describe('Error Serialization', () => {
    it('should serialize errors with all relevant properties', () => {
      const originalError = new Error('Original');
      const analysisError = new AnalysisError('TestAnalyzer', originalError);

      const serialized = JSON.parse(JSON.stringify(analysisError));

      expect(serialized.name).toBe('AnalysisError');
      expect(serialized.message).toBeDefined();
      expect(typeof serialized.message).toBe('string');
      expect(serialized.code).toBe('ANALYSIS_ERROR');
      expect(serialized.details).toBeDefined();
      const serializedDetails = expectDetails<{ checkerName: string }>(
        serialized.details
      );

      expect(serializedDetails.checkerName).toBe('TestAnalyzer');
    });
  });

  describe('Error Utility Functions', () => {
    describe('isAppError', () => {
      it('should return true for AppError instances', () => {
        const error = new AppError('Test');
        expect(isAppError(error)).toBe(true);
      });

      it('should return true for AppError subclasses', () => {
        const error = new AnalysisError('Checker', new Error('Test'));
        expect(isAppError(error)).toBe(true);
      });

      it('should return false for regular Error', () => {
        const error = new Error('Test');
        expect(isAppError(error)).toBe(false);
      });

      it('should return false for non-error values', () => {
        expect(isAppError('string')).toBe(false);
        expect(isAppError(null)).toBe(false);
        expect(isAppError(undefined)).toBe(false);
        expect(isAppError({})).toBe(false);
      });
    });

    describe('isError', () => {
      it('should return true for Error instances', () => {
        expect(isError(new Error('Test'))).toBe(true);
      });

      it('should return true for AppError instances', () => {
        expect(isError(new AppError('Test'))).toBe(true);
      });

      it('should return false for non-error values', () => {
        expect(isError('string')).toBe(false);
        expect(isError(null)).toBe(false);
        expect(isError({ message: 'Not an error' })).toBe(false);
      });
    });

    describe('getErrorMessage', () => {
      it('should extract message from Error', () => {
        const error = new Error('Error message');
        expect(getErrorMessage(error)).toBe('Error message');
      });

      it('should extract message from AppError', () => {
        const error = new AppError('App error message');
        expect(getErrorMessage(error)).toBe('App error message');
      });

      it('should return string as-is', () => {
        expect(getErrorMessage('string message')).toBe('string message');
      });

      it('should extract message from object with message property', () => {
        expect(getErrorMessage({ message: 'object message' })).toBe(
          'object message'
        );
      });

      it('should return default message for unknown values', () => {
        expect(getErrorMessage(null)).toBe('An unknown error occurred');
        expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
        expect(getErrorMessage(123)).toBe('An unknown error occurred');
      });
    });

    describe('wrapError', () => {
      it('should return AppError as-is', () => {
        const appError = new AppError('Test');
        const wrapped = wrapError(appError);
        expect(wrapped).toBe(appError);
      });

      it('should wrap regular Error in AppError', () => {
        const error = new Error('Original error');
        const wrapped = wrapError(error);

        expect(wrapped).toBeInstanceOf(AppError);
        expect(wrapped.message).toBe('Original error');
        expect(wrapped.code).toBe('WRAPPED_ERROR');
      });

      it('should add context to wrapped error', () => {
        const error = new Error('Original error');
        const wrapped = wrapError(error, 'During operation');

        expect(wrapped.message).toBe('During operation: Original error');
      });

      it('should wrap non-error values', () => {
        const wrapped = wrapError('string error');

        expect(wrapped).toBeInstanceOf(AppError);
        expect(wrapped.message).toBe('string error');
      });
    });

    describe('formatErrorForLogging', () => {
      it('should format AppError using toJSON', () => {
        const error = new AppError('Test', 'TEST_CODE');
        const formatted = formatErrorForLogging(error);

        expect(formatted.name).toBe('AppError');
        expect(formatted.message).toBe('Test');
        expect(formatted.code).toBe('TEST_CODE');
      });

      it('should format regular Error', () => {
        const error = new Error('Test error');
        const formatted = formatErrorForLogging(error);

        expect(formatted.name).toBe('Error');
        expect(formatted.message).toBe('Test error');
        expect(formatted.stack).toBeDefined();
      });

      it('should format non-error values', () => {
        const formatted = formatErrorForLogging('string value');

        expect(formatted.type).toBe('string');
        expect(formatted.value).toBe('string value');
      });
    });

    describe('retryWithBackoff', () => {
      it('should return result on success', async () => {
        const operation = vi.fn().mockResolvedValue('success');

        const result = await retryWithBackoff(operation, { maxRetries: 3 });

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should retry on failure', async () => {
        const operation = vi
          .fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValue('success');

        const result = await retryWithBackoff(operation, {
          maxRetries: 3,
          initialDelay: 10,
        });

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should throw after max retries', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

        await expect(
          retryWithBackoff(operation, { maxRetries: 2, initialDelay: 10 })
        ).rejects.toThrow('Always fails');

        expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
      });

      it('should respect shouldRetry option', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Non-retryable'));

        await expect(
          retryWithBackoff(operation, {
            maxRetries: 3,
            initialDelay: 10,
            shouldRetry: () => false,
          })
        ).rejects.toThrow('Non-retryable');

        expect(operation).toHaveBeenCalledTimes(1);
      });
    });
  });
});
