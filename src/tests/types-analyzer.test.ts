import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TypesAnalyzer } from '../analysis/types';
import { AnalysisError, CommandExecutionError } from '../errors';
import type { AnalyzerConfig } from '../types/analysis';

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

import { executeCommand } from '../utils/command-executor';
import path from 'path';

describe('TypesAnalyzer', () => {
  let analyzer: TypesAnalyzer;
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new TypesAnalyzer();
    mockConfig = {
      projectRoot: path.resolve('/test/project'),
      enabledAnalyzers: ['types'],
      // Add other required config properties with default values
      ignore: [],
      include: [],
      frameworks: [],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: false,
      deploymentChecks: false,
      autoFix: false,
      watchMode: false,
      enableCache: false,
    };
  });

  describe('canAnalyze', () => {
    it('should return true when types analyzer is enabled', () => {
      expect(analyzer.canAnalyze(mockConfig)).toBe(true);
    });

    it('should return false when types analyzer is disabled', () => {
      const config = { ...mockConfig, enabledAnalyzers: ['syntax'] };
      expect(analyzer.canAnalyze(config)).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should return empty issues when no type errors found', async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 100,
      });

      const issues = await analyzer.analyze(mockConfig);
      expect(issues).toEqual([]);
      expect(executeCommand).toHaveBeenCalledWith(
        'bunx tsc --noEmit --skipLibCheck',
        expect.objectContaining({
          cwd: mockConfig.projectRoot,
          ignoreExitCode: true,
        })
      );
    });

    it('should parse type errors correctly', async () => {
      const file1 = path.join(mockConfig.projectRoot, 'src', 'index.ts');
      const file2 = path.join(mockConfig.projectRoot, 'src', 'utils.ts');

      const mockOutput = `${file1}(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
${file2}(20,15): error TS2531: Object is possibly 'null'.`;

      vi.mocked(executeCommand).mockResolvedValue({
        stdout: mockOutput,
        stderr: '',
        exitCode: 2,
        signal: null,
        duration: 100,
      });

      const issues = await analyzer.analyze(mockConfig);
      expect(issues).toHaveLength(2);

      expect(issues[0]).toMatchObject({
        type: 'type',
        severity: {
          level: 'critical',
          impact: 'blocking',
          urgency: 'immediate',
        },
        title: 'TypeScript Error TS2322',
        description: "Type 'string' is not assignable to type 'number'.",
        file: path.join('src', 'index.ts'),
        line: 10,
        column: 5,
        rule: 'TS2322',
      });

      expect(issues[1]).toMatchObject({
        type: 'type',
        severity: { level: 'high', impact: 'major', urgency: 'high' },
        title: 'TypeScript Error TS2531',
        description: "Object is possibly 'null'.",
        file: path.join('src', 'utils.ts'),
        line: 20,
        column: 15,
        rule: 'TS2531',
        autoFixable: true,
      });
    });

    it('should handle command execution errors', async () => {
      const error = new CommandExecutionError(
        'bunx tsc',
        1,
        null,
        '',
        'Error',
        'Command failed'
      );
      vi.mocked(executeCommand).mockRejectedValue(error);

      await expect(analyzer.analyze(mockConfig)).rejects.toThrow(AnalysisError);
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(executeCommand).mockRejectedValue(
        new Error('Unexpected error')
      );

      await expect(analyzer.analyze(mockConfig)).rejects.toThrow(AnalysisError);
    });
  });
});
