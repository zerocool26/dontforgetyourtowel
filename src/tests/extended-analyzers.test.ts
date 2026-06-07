import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceAnalyzer } from '../analysis/performance';
import { AccessibilityAnalyzer } from '../analysis/accessibility';
import { DeploymentAnalyzer } from '../analysis/deployment';
import { SecurityAnalyzer } from '../analysis/security';
import { GitAnalyzer } from '../analysis/git';
import type { AnalyzerConfig } from '../config/schema';

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn().mockResolvedValue(''),
  access: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1000 }),
  readdir: vi.fn().mockResolvedValue([]),
}));

// Mock file system with proper default export
vi.mock('fs', () => ({
  promises: fsMocks,
  default: { promises: fsMocks },
}));

vi.mock('node:fs', () => ({
  promises: fsMocks,
  default: { promises: fsMocks },
}));

vi.mock('fs/promises', () => ({
  ...fsMocks,
  default: fsMocks,
}));

vi.mock('node:fs/promises', () => ({
  ...fsMocks,
  default: fsMocks,
}));

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

// Mock command executor
vi.mock('../utils/command-executor', () => ({
  executeCommand: vi.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
    exitCode: 0,
    signal: null,
    duration: 0,
  }),
}));

// Mock logger
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

describe('Performance Analyzer', () => {
  let analyzer: PerformanceAnalyzer;
  let mockConfig: AnalyzerConfig;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { glob } = await import('glob');
    vi.mocked(glob).mockResolvedValue([]);
    analyzer = new PerformanceAnalyzer();
    mockConfig = {
      projectRoot: '/test/project',
      ignore: ['node_modules'],
      include: ['**/*.{ts,tsx,js,jsx}'],
      frameworks: ['react'],
      enabledAnalyzers: ['performance'],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: true,
      deploymentChecks: true,
      autoFix: false,
      watchMode: false,
      enableCache: true,
    };
  });

  it('should have correct analyzer name', () => {
    expect(analyzer.name).toBe('PerformanceAnalyzer');
  });

  it('should be enabled when performance is in enabledAnalyzers', () => {
    expect(analyzer.canAnalyze(mockConfig)).toBe(true);
  });

  it('should be disabled when performance is not in enabledAnalyzers', () => {
    const config = { ...mockConfig, enabledAnalyzers: ['syntax'] };
    expect(analyzer.canAnalyze(config)).toBe(false);
  });

  it('should return an array of issues', async () => {
    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('should handle analysis gracefully on error', async () => {
    const { glob } = await import('glob');
    vi.mocked(glob).mockRejectedValueOnce(new Error('Glob error'));

    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);
  });
});

describe('Accessibility Analyzer', () => {
  let analyzer: AccessibilityAnalyzer;
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new AccessibilityAnalyzer();
    mockConfig = {
      projectRoot: '/test/project',
      ignore: ['node_modules'],
      include: ['**/*.{astro,tsx,jsx}'],
      frameworks: ['astro'],
      enabledAnalyzers: ['accessibility'],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: true,
      deploymentChecks: true,
      autoFix: false,
      watchMode: false,
      enableCache: true,
    };
  });

  it('should have correct analyzer name', () => {
    expect(analyzer.name).toBe('AccessibilityAnalyzer');
  });

  it('should be enabled when accessibility is in enabledAnalyzers', () => {
    expect(analyzer.canAnalyze(mockConfig)).toBe(true);
  });

  it('should be disabled when accessibility is not in enabledAnalyzers', () => {
    const config = { ...mockConfig, enabledAnalyzers: ['syntax'] };
    expect(analyzer.canAnalyze(config)).toBe(false);
  });

  it('should return an array of issues', async () => {
    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('should detect missing alt text on images', async () => {
    const filePath = '/fake/path/page.astro';
    const fileContent = '<img src="image.jpg">';

    // Mock glob to find our fake file
    const { glob } = await import('glob');
    vi.mocked(glob).mockResolvedValue([filePath]);

    // Mock readFile to return our fake content
    fsMocks.readFile.mockImplementation(async (path: string) => {
      if (path === filePath) return fileContent;
      return '';
    });

    const config = {
      ...mockConfig,
      projectRoot: '/fake/path',
      ignore: [],
      include: ['**/*.astro'],
    };

    const issues = await analyzer.analyze(config);
    expect(Array.isArray(issues)).toBe(true);
    expect(
      issues.some(
        issue =>
          issue.rule === 'accessibility-pattern' &&
          issue.description.includes('alt attributes')
      )
    ).toBe(true);
  });

  it('should handle pattern scanning errors gracefully', async () => {
    const { promises: fs } = await import('fs');
    vi.mocked(fs.readFile).mockRejectedValue(new Error('read failure'));

    const results = await (
      analyzer as unknown as {
        _checkFileForPatterns: (
          filePath: string,
          patterns: Array<{
            pattern: RegExp;
            message: string;
            severity: 'critical' | 'high' | 'medium' | 'low';
            type: string;
            category: string;
            source: string;
            rule: string;
            suggestion?: string;
            autoFixable: boolean;
          }>,
          projectRoot: string
        ) => Promise<
          Array<{
            rule: string;
            description: string;
          }>
        >;
      }
    )._checkFileForPatterns(
      '/test/project/page.astro',
      [
        {
          pattern: /token/,
          message: 'Found token',
          severity: 'medium',
          type: 'accessibility',
          category: 'Accessibility',
          source: 'a11y-scanner',
          rule: 'accessibility-pattern',
          suggestion: 'Handle token',
          autoFixable: false,
        },
      ],
      mockConfig.projectRoot
    );

    expect(results).toEqual([]);
  });
});

describe('Deployment Analyzer', () => {
  let analyzer: DeploymentAnalyzer;
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new DeploymentAnalyzer();
    mockConfig = {
      projectRoot: '/test/project',
      ignore: ['node_modules'],
      include: ['**/*.{ts,tsx}'],
      frameworks: [],
      enabledAnalyzers: ['deployment'],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: true,
      deploymentChecks: true,
      autoFix: false,
      watchMode: false,
      enableCache: true,
    };
  });

  it('should have correct analyzer name', () => {
    expect(analyzer.name).toBe('DeploymentAnalyzer');
  });

  it('should be enabled when deployment is in enabledAnalyzers', () => {
    expect(analyzer.canAnalyze(mockConfig)).toBe(true);
  });

  it('should be disabled when deployment is not in enabledAnalyzers', () => {
    const config = { ...mockConfig, enabledAnalyzers: ['syntax'] };
    expect(analyzer.canAnalyze(config)).toBe(false);
  });

  it('should return an array of issues', async () => {
    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('should handle build during Bun lifecycle', async () => {
    // Simulate being in build lifecycle
    const originalEnv = process.env.BUN_LIFECYCLE_EVENT;
    process.env.BUN_LIFECYCLE_EVENT = 'build';

    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);

    // Restore
    process.env.BUN_LIFECYCLE_EVENT = originalEnv;
  });

  it('should skip when deployment checks are disabled', async () => {
    const disabledConfig = { ...mockConfig, deploymentChecks: false };
    expect(analyzer.canAnalyze(disabledConfig)).toBe(false);
    const issues = await analyzer.analyze(disabledConfig);
    expect(issues).toEqual([]);
  });

  it('should expose last checklist metadata', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      signal: null,
      duration: 10,
    });

    await analyzer.analyze(mockConfig);
    const meta = analyzer.getLastChecklist();
    expect(meta).toBeDefined();
    expect(meta?.buildStatus).toBeDefined();
  });
});

describe('Git Analyzer', () => {
  let analyzer: GitAnalyzer;
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new GitAnalyzer();
    mockConfig = {
      projectRoot: '/test/project',
      ignore: [],
      include: [],
      frameworks: [],
      enabledAnalyzers: ['git'],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: true,
      deploymentChecks: true,
      autoFix: false,
      watchMode: false,
      enableCache: true,
    };
  });

  it('should have correct analyzer name', () => {
    expect(analyzer.name).toBe('GitAnalyzer');
  });

  it('should be enabled when git is in enabledAnalyzers', () => {
    expect(analyzer.canAnalyze(mockConfig)).toBe(true);
  });

  it('should be disabled when git is not in enabledAnalyzers', () => {
    const config = { ...mockConfig, enabledAnalyzers: ['syntax'] };
    expect(analyzer.canAnalyze(config)).toBe(false);
  });

  it('should return an array of issues', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand)
      .mockResolvedValueOnce({
        stdout: 'main',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: 'abc123 Latest commit',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '0\t0',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      });

    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('should detect uncommitted changes', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand)
      .mockResolvedValueOnce({
        stdout: 'main',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: 'M src/file.ts\nA src/new.ts',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: 'abc123 Latest commit',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '1\t0',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      });

    const issues = await analyzer.analyze(mockConfig);
    const uncommittedIssue = issues.find(i => i.title.includes('Uncommitted'));
    expect(uncommittedIssue).toBeDefined();
  });

  it('should classify staged and unstaged porcelain status entries', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand)
      .mockResolvedValueOnce({
        stdout: 'main',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout:
          ' M src/unstaged.ts\nM  src/staged.ts\nA  src/new.ts\n D src/removed.ts\n?? docs/new-guide.md',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: 'abc123 Latest commit',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '0\t0',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      });

    await analyzer.analyze(mockConfig);
    const meta = analyzer.getLastAnalysis();

    expect(meta?.fileChanges.modified).toEqual([
      'src/unstaged.ts',
      'src/staged.ts',
    ]);
    expect(meta?.fileChanges.added).toEqual(['src/new.ts']);
    expect(meta?.fileChanges.deleted).toEqual(['src/removed.ts']);
    expect(meta?.untracked).toEqual(['docs/new-guide.md']);
  });

  it('should capture upstream branch misalignment', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand)
      .mockResolvedValueOnce({
        stdout: 'main',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: 'abc123 Latest commit',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '0\t2',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      });

    const issues = await analyzer.analyze(mockConfig);
    expect(issues.some(issue => issue.rule === 'git-branch-alignment')).toBe(
      true
    );
    expect(analyzer.getLastAnalysis()?.branchStatus).toBe('behind');
    expect(analyzer.getLastAnalysis()?.behindBy).toBe(2);
  });

  it('should handle git command errors gracefully', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand).mockRejectedValueOnce(
      new Error('Not a git repository')
    );

    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('should expose last analysis metadata', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand)
      .mockResolvedValueOnce({
        stdout: 'main',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: 'abc123 Latest commit',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      })
      .mockResolvedValueOnce({
        stdout: '0\t0',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 10,
      });

    await analyzer.analyze(mockConfig);
    const meta = analyzer.getLastAnalysis();
    expect(meta).toBeDefined();
    expect(meta?.branch).toBe('main');
    expect(meta?.commit).toBe('abc123');
  });
});

describe('Performance Analyzer (environment gating)', () => {
  let analyzer: PerformanceAnalyzer;
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new PerformanceAnalyzer();
    mockConfig = {
      projectRoot: '/test/project',
      ignore: ['node_modules'],
      include: ['**/*.{ts,tsx,js,jsx}'],
      frameworks: ['react'],
      enabledAnalyzers: ['performance'],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: true,
      deploymentChecks: true,
      autoFix: false,
      watchMode: false,
      enableCache: true,
    };
  });

  it('should skip heavy bundle check in CI', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    const originalCI = process.env.CI;
    process.env.CI = 'true';

    await analyzer.analyze(mockConfig);
    expect(vi.mocked(executeCommand)).not.toHaveBeenCalled();

    process.env.CI = originalCI;
  });

  it('should avoid bundle analysis when watch mode is enabled', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    const watchConfig = { ...mockConfig, watchMode: true };

    await analyzer.analyze(watchConfig);
    expect(vi.mocked(executeCommand)).not.toHaveBeenCalled();
  });
});

describe('Security Analyzer', () => {
  let analyzer: SecurityAnalyzer;
  let mockConfig: AnalyzerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new SecurityAnalyzer();
    mockConfig = {
      projectRoot: '/test/project',
      ignore: ['node_modules'],
      include: ['**/*.{ts,tsx,js,jsx}'],
      frameworks: ['react'],
      enabledAnalyzers: ['security'],
      severityThreshold: 'low',
      outputFormat: 'terminal',
      githubIntegration: true,
      deploymentChecks: true,
      autoFix: false,
      watchMode: false,
      enableCache: true,
    };
  });

  it('handles Bun audit errors gracefully', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand).mockRejectedValueOnce(
      new Error('network offline')
    );

    const issues = await analyzer.analyze(mockConfig);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('parses Bun audit output respecting severity threshold', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand).mockResolvedValueOnce({
      stdout: JSON.stringify({
        packageA: [{ severity: 'critical' }],
        packageB: [{ severity: 'high' }],
        packageC: [{ severity: 'moderate' }, { severity: 'moderate' }],
      }),
      stderr: '',
      exitCode: 0,
      signal: null,
      duration: 0,
    });

    const strictConfig = { ...mockConfig, severityThreshold: 'high' as const };
    const issues = await analyzer.analyze(strictConfig);
    // Debug output to verify parsed issues
    expect(issues.some(i => i.severity.level === 'high')).toBe(true);
    expect(issues.some(i => i.severity.level === 'critical')).toBe(true);
    expect(issues.some(i => i.severity.level === 'medium')).toBe(false);
  });

  it('honors medium threshold for Bun audit output with low severity vulns', async () => {
    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand).mockResolvedValueOnce({
      stdout: JSON.stringify({
        packageA: [{ severity: 'moderate' }],
        packageB: [{ severity: 'low' }, { severity: 'low' }],
      }),
      stderr: '',
      exitCode: 0,
      signal: null,
      duration: 0,
    });

    const issues = await analyzer.analyze({
      ...mockConfig,
      severityThreshold: 'medium',
    });

    expect(issues.some(i => i.severity.level === 'medium')).toBe(true);
    expect(issues.some(i => i.severity.level === 'low')).toBe(false);
  });

  it('flags committed environment files', async () => {
    const envPath = '/fake/path/.env.local';
    const fileContent = 'SECRET_KEY=should-not-commit';

    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 0,
      })
      .mockResolvedValueOnce({
        stdout: '.env.local\n',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 0,
      });

    const { glob } = await import('glob');
    vi.mocked(glob)
      .mockResolvedValueOnce([]) // security patterns
      .mockResolvedValueOnce([]) // environment content scanning
      .mockResolvedValueOnce([envPath]); // env file detection

    // Mock readFile for content scanning if needed (though env file detection might just check existence/name)
    // But if it reads content, we provide it.
    fsMocks.readFile.mockImplementation(async (path: string) => {
      if (path === envPath) return fileContent;
      return '';
    });

    const issues = await analyzer.analyze({
      ...mockConfig,
      projectRoot: '/fake/path',
      ignore: [],
      include: ['**/*'],
    });

    expect(issues.some(issue => issue.rule === 'env-files-in-repo')).toBe(true);
  });

  it('does not flag ignored local environment files that are not tracked', async () => {
    const envPath = '/fake/path/.env.local';

    const { executeCommand } = await import('../utils/command-executor');
    vi.mocked(executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 0,
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 0,
      });

    const { glob } = await import('glob');
    vi.mocked(glob)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([envPath]);

    const issues = await analyzer.analyze({
      ...mockConfig,
      projectRoot: '/fake/path',
      ignore: [],
      include: ['**/*'],
    });

    expect(issues.some(issue => issue.rule === 'env-files-in-repo')).toBe(
      false
    );
  });
});
