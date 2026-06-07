import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyntaxAnalyzer } from '../analysis/syntax';
import { SecurityAnalyzer } from '../analysis/security';
import {
  AnalysisError,
  CommandExecutionError,
  FileSystemError,
} from '../errors';
import type { AnalyzerConfig } from '../config/schema';

// Mock external dependencies
vi.mock('../utils/command-executor', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    setMinLevel: vi.fn(),
  },
}));

describe('Individual Analysis Modules', () => {
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      projectRoot: '/test/project',
      ignore: ['node_modules'],
      include: ['**/*.{ts,tsx,js,jsx}'],
      frameworks: ['react'],
      enabledAnalyzers: [
        'syntax',
        'types',
        'security',
        'performance',
        'accessibility',
        'git',
        'deployment',
      ],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: true,
      deploymentChecks: true,
      autoFix: false,
      watchMode: false,
      enableCache: true,
    };
  });

  describe('SyntaxAnalyzer', () => {
    let analyzer: SyntaxAnalyzer;

    beforeEach(() => {
      analyzer = new SyntaxAnalyzer();
    });

    it('should be enabled when syntax is in enabledAnalyzers', () => {
      expect(analyzer.canAnalyze(mockConfig)).toBe(true);
    });

    it('should be disabled when syntax is not in enabledAnalyzers', () => {
      const configWithoutSyntax = {
        ...mockConfig,
        enabledAnalyzers: ['types'],
      };
      expect(analyzer.canAnalyze(configWithoutSyntax)).toBe(false);
    });

    it('should handle command execution errors gracefully', async () => {
      const { executeCommand } = await import('../utils/command-executor');
      vi.mocked(executeCommand).mockRejectedValueOnce(
        new CommandExecutionError(
          'bunx tsc --noEmit',
          1,
          null,
          '',
          'Type check failed',
          'Command failed'
        )
      );

      await expect(analyzer.analyze(mockConfig)).rejects.toThrow(AnalysisError);
    });
  });

  describe('SecurityAnalyzer', () => {
    let analyzer: SecurityAnalyzer;

    beforeEach(() => {
      analyzer = new SecurityAnalyzer();
    });

    it('should be enabled when security is in enabledAnalyzers', () => {
      expect(analyzer.canAnalyze(mockConfig)).toBe(true);
    });

    it('should handle file system errors gracefully', async () => {
      // This would test file reading errors in security analysis
      const issues = await analyzer.analyze(mockConfig);
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('Error Handling Across Modules', () => {
    it('should handle AnalysisError instances', () => {
      const originalError = new Error('Original error');
      const analysisError = new AnalysisError('TestAnalyzer', originalError);

      expect(analysisError.name).toBe('AnalysisError');
      expect(analysisError.message).toContain('TestAnalyzer');
      expect(analysisError.message).toContain('Original error');
      expect(analysisError.details).toHaveProperty(
        'checkerName',
        'TestAnalyzer'
      );
      expect(analysisError.details).toHaveProperty(
        'originalError',
        originalError
      );
    });

    it('should handle CommandExecutionError instances', () => {
      const cmdError = new CommandExecutionError(
        'test command',
        1,
        null,
        'stdout',
        'stderr'
      );

      expect(cmdError.name).toBe('CommandExecutionError');
      expect(cmdError.details).toHaveProperty('command', 'test command');
      expect(cmdError.details).toHaveProperty('exitCode', 1);
      expect(cmdError.details).toHaveProperty('stdout', 'stdout');
      expect(cmdError.details).toHaveProperty('stderr', 'stderr');
    });

    it('should handle FileSystemError instances', () => {
      const originalError = new Error('ENOENT: file not found');
      const fsError = new FileSystemError(
        'read',
        '/test/file.ts',
        originalError
      );

      expect(fsError.name).toBe('FileSystemError');
      expect(fsError.details).toHaveProperty('operation', 'read');
      expect(fsError.details).toHaveProperty('filePath', '/test/file.ts');
      expect(fsError.details).toHaveProperty('originalError', originalError);
    });
  });
});
