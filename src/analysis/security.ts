import type {
  AnalysisModule,
  CodeIssue,
  AnalyzerConfig,
} from '../types/analysis';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { FileSystemError, AnalysisError } from '../errors';
import { logger } from '../utils/logger';
import { generateChecksum } from '../utils/common';
import { executeCommand } from '../utils/command-executor';

export class SecurityAnalyzer implements AnalysisModule {
  name = 'SecurityAnalyzer';

  canAnalyze(config: AnalyzerConfig): boolean {
    return config.enabledAnalyzers.includes('security');
  }

  async analyze(config: AnalyzerConfig): Promise<CodeIssue[]> {
    logger.info('Checking security vulnerabilities...');
    const issues: CodeIssue[] = [];

    try {
      // Check for known vulnerabilities via npm audit
      await this.checkDependencyVulnerabilities(config, issues);

      // Check for security anti-patterns
      await this.checkSecurityPatterns(config, issues);

      // Check environment variables exposure
      await this.checkEnvironmentSecurity(config, issues);

      // Check for committed environment files
      await this.checkEnvFiles(config, issues);
    } catch (error: unknown) {
      const analysisError =
        error instanceof AnalysisError
          ? error
          : new AnalysisError(
              this.name,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.warn(`Security analysis failed: ${analysisError.message}`, {
        error: analysisError,
      });
    }
    return issues;
  }

  /**
   * Check for dependency vulnerabilities using npm audit
   */
  private async checkDependencyVulnerabilities(
    config: AnalyzerConfig,
    issues: CodeIssue[]
  ): Promise<void> {
    try {
      const lockfilePath = path.join(config.projectRoot, 'package-lock.json');
      try {
        await fs.access(lockfilePath);
      } catch {
        logger.debug('No package-lock.json found; skipping npm audit check');
        return;
      }

      const { stdout } = await executeCommand('npm audit --json', {
        cwd: config.projectRoot,
        ignoreExitCode: true,
        timeout: 15000,
        retries: 1,
        retryDelay: 500,
      });

      if (!stdout) {
        logger.debug(
          'npm audit did not return data; skipping dependency vulnerability check'
        );
        return;
      }

      let audit: {
        metadata?: { vulnerabilities?: Record<string, number> };
      };

      try {
        audit = JSON.parse(stdout);
      } catch (parseError) {
        logger.debug('Unable to parse npm audit output', { parseError });
        return;
      }

      if (audit.metadata?.vulnerabilities) {
        const {
          critical = 0,
          high = 0,
          moderate = 0,
          low = 0,
        } = audit.metadata.vulnerabilities;

        const severityBuckets: Array<{
          count: number;
          label: 'critical' | 'high' | 'medium' | 'low';
          rule: string;
          suggestion: string;
          description: string;
          autoFixable: boolean;
        }> = [
          {
            count: critical,
            label: 'critical',
            rule: 'dependency-vulnerability',
            suggestion:
              'Run `npm audit fix --force` or update vulnerable packages manually',
            description: `Found ${critical} critical security vulnerabilities in dependencies. Run \`npm audit fix\` to resolve.`,
            autoFixable: true,
          },
          {
            count: high,
            label: 'high',
            rule: 'dependency-vulnerability',
            suggestion:
              'Run `npm audit` to see details and `npm audit fix` to resolve',
            description: `Found ${high} high severity security vulnerabilities in dependencies.`,
            autoFixable: true,
          },
          {
            count: moderate,
            label: 'medium',
            rule: 'dependency-vulnerability',
            suggestion:
              'Review vulnerabilities with `npm audit` and update when possible',
            description: `Found ${moderate} moderate security vulnerabilities in dependencies.`,
            autoFixable: false,
          },
          {
            count: low,
            label: 'low',
            rule: 'dependency-vulnerability',
            suggestion:
              'Document low severity issues and plan upgrades during maintenance windows',
            description: `Found ${low} low severity security vulnerabilities in dependencies.`,
            autoFixable: false,
          },
        ];

        for (const bucket of severityBuckets) {
          if (
            bucket.count > 0 &&
            this.shouldReport(bucket.label, config.severityThreshold)
          ) {
            issues.push({
              id: `security-vuln-${bucket.label}-${Date.now()}`,
              type: 'security',
              severity: {
                level: bucket.label,
                impact:
                  bucket.label === 'critical'
                    ? 'blocking'
                    : bucket.label === 'high'
                      ? 'major'
                      : 'minor',
                urgency:
                  bucket.label === 'critical'
                    ? 'immediate'
                    : bucket.label === 'high'
                      ? 'high'
                      : 'medium',
              },
              title: `${bucket.count} ${bucket.label === 'medium' ? 'Moderate' : bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1)} Dependency Vulnerabilities`,
              description: bucket.description,
              file: 'package.json',
              rule: bucket.rule,
              category: 'Security',
              source: 'npm-audit',
              suggestion: bucket.suggestion,
              autoFixable: bucket.autoFixable,
            });
          }
        }
      }
    } catch (error) {
      // npm audit may fail or return non-zero on vulnerabilities, which is expected
      logger.debug('npm audit check skipped or failed', { error });
    }
  }

  /**
   * Check for exposed environment variables or secrets
   */
  private async checkEnvironmentSecurity(
    config: AnalyzerConfig,
    issues: CodeIssue[]
  ): Promise<void> {
    const secretPatterns = [
      {
        pattern:
          /(['"]?)(?:api[_-]?key|apikey)(['"]?)\s*[:=]\s*(['"])[^'"]+\3/gi,
        name: 'API Key',
      },
      {
        pattern:
          /(['"]?)(?:secret|password|passwd|pwd)(['"]?)\s*[:=]\s*(['"])[^'"]+\3/gi,
        name: 'Secret/Password',
      },
      {
        pattern: /(['"]?)(?:private[_-]?key)(['"]?)\s*[:=]\s*(['"])[^'"]+\3/gi,
        name: 'Private Key',
      },
      {
        pattern:
          /(['"]?)(?:auth[_-]?token|access[_-]?token|bearer)(['"]?)\s*[:=]\s*(['"])[^'"]+\3/gi,
        name: 'Auth Token',
      },
      {
        pattern: /-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----/g,
        name: 'Private Key Block',
      },
    ];

    const files = await this.getProjectFiles(config);

    for (const file of files) {
      // Skip common false positive files
      if (
        file.includes('node_modules') ||
        file.includes('.env.example') ||
        file.endsWith('.md')
      ) {
        continue;
      }

      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (const { pattern, name } of secretPatterns) {
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
              issues.push({
                id: `security-secret-${Date.now()}-${Math.random()}`,
                type: 'security',
                severity: {
                  level: 'critical',
                  impact: 'blocking',
                  urgency: 'immediate',
                },
                title: `Potential ${name} Exposure`,
                description: `Possible hardcoded ${name} detected. Never commit secrets to version control.`,
                file: path.relative(config.projectRoot, file),
                line: i + 1,
                rule: 'no-hardcoded-secrets',
                category: 'Security',
                source: 'secret-scanner',
                suggestion:
                  'Move secrets to environment variables and add to .gitignore',
                autoFixable: false,
                context: {
                  before: lines.slice(Math.max(0, i - 1), i),
                  current: lines[i].replace(
                    /(['"])[^'"]{8,}(['"])/g,
                    '$1[REDACTED]$2'
                  ),
                  after: lines.slice(i + 1, i + 2),
                },
              });
            }
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  private async checkEnvFiles(
    config: AnalyzerConfig,
    issues: CodeIssue[]
  ): Promise<void> {
    try {
      const trackedEnvFiles = await this.getTrackedEnvFiles(config);

      const envFiles = await glob('**/.env*', {
        cwd: config.projectRoot,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.env.example',
          '**/.env*.example',
          ...config.ignore,
        ],
        absolute: true,
        nodir: true,
      });

      envFiles
        .filter(file => {
          if (file.endsWith('.example')) return false;
          const relativePath = path
            .relative(config.projectRoot, file)
            .replaceAll(path.sep, '/');
          return trackedEnvFiles.has(relativePath);
        })
        .forEach(file => {
          const relativePath = path.relative(config.projectRoot, file);
          issues.push({
            id: `security-env-${Date.now()}-${Math.random()}`,
            type: 'security',
            severity: {
              level: 'high',
              impact: 'major',
              urgency: 'high',
            },
            title: 'Environment File Committed',
            description:
              'Environment files should not be committed to version control; they may contain secrets.',
            file: relativePath,
            rule: 'env-files-in-repo',
            category: 'Security',
            source: 'secret-scanner',
            suggestion:
              'Remove committed .env files, rotate any exposed secrets, and keep only a sanitized .env.example in the repo.',
            autoFixable: false,
            context: {
              current: `Found environment file: ${relativePath}`,
            },
          });
        });
    } catch (error) {
      logger.debug('Environment file scan failed', { error });
    }
  }

  private async getTrackedEnvFiles(
    config: AnalyzerConfig
  ): Promise<Set<string>> {
    try {
      const { stdout } = await executeCommand(
        'git ls-files -- "**/.env*" ".env*"',
        {
          cwd: config.projectRoot,
          ignoreExitCode: true,
          timeout: 5000,
        }
      );

      return new Set(
        stdout
          .split(/\r?\n/)
          .map(file => file.trim().replaceAll('\\', '/'))
          .filter(file => file && !file.endsWith('.example'))
      );
    } catch (error) {
      logger.debug('Tracked environment file scan skipped', { error });
      return new Set();
    }
  }

  private async checkSecurityPatterns(
    config: AnalyzerConfig,
    issues: CodeIssue[]
  ): Promise<void> {
    const securityPatterns = [
      {
        pattern: /eval\s*\(/g,
        message: 'Avoid using eval() as it can execute arbitrary code',
        severity: 'critical' as const,
        suggestion: this.getSecuritySuggestion(/eval\s*\(/g),
      },
      {
        pattern: /innerHTML\s*=/g,
        message:
          'innerHTML can lead to XSS vulnerabilities. Use textContent or sanitize input.',
        severity: 'high' as const,
        suggestion: this.getSecuritySuggestion(/innerHTML\s*=/g),
      },
      {
        pattern: /document\.write\s*\(/g,
        message: 'document.write can be dangerous and is deprecated',
        severity: 'medium' as const,
        suggestion: this.getSecuritySuggestion(/document\.write\s*\(/g),
      },
      {
        pattern: /window\.location\.href\s*=\s*[^"'`\s]+/g,
        message: 'Direct location assignment can be vulnerable to injection',
        severity: 'high' as const,
        suggestion: this.getSecuritySuggestion(
          /window\.location\.href\s*=\s*[^"'`\s]+/g
        ),
      },
    ];

    const files = await this.getProjectFiles(config);

    for (const file of files) {
      const issuesInFile = await this._checkFileForPatterns(
        file,
        securityPatterns.map(p => ({
          ...p,
          type: 'security',
          category: 'Security',
          source: 'security-scanner',
          rule: 'security-pattern',
          autoFixable: false,
        })),
        config.projectRoot
      );
      issues.push(...issuesInFile);
    }
  }

  private async _checkFileForPatterns(
    filePath: string,
    patterns: Array<{
      pattern: RegExp;
      message: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      type: CodeIssue['type'];
      category: string;
      source: string;
      rule: string;
      suggestion?: string;
      autoFixable: boolean;
      documentation?: string;
    }>,
    projectRoot: string
  ): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const {
        pattern,
        message,
        severity,
        type,
        category,
        source,
        rule,
        suggestion,
        autoFixable,
        documentation,
      } of patterns) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const matches = line.match(pattern);

          if (matches) {
            issues.push({
              id: `${type}-${Date.now()}-${Math.random()}`,
              type,
              severity: {
                level: severity,
                impact: severity === 'critical' ? 'blocking' : 'major',
                urgency: severity === 'critical' ? 'immediate' : 'high',
              },
              title: `${category} Issue Detected`,
              description: message,
              file: path.relative(projectRoot, filePath),
              line: i + 1,
              rule,
              category,
              source,
              suggestion,
              autoFixable,
              documentation,
              context: {
                before: lines.slice(Math.max(0, i - 2), i),
                current: line,
                after: lines.slice(i + 1, i + 3),
              },
              metadata: {
                checksum: generateChecksum(line),
                timestamp: new Date(),
              },
            });
          }
        }
      }
    } catch (error: unknown) {
      const fsError =
        error instanceof FileSystemError
          ? error
          : new FileSystemError(
              'read',
              filePath,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.warn(`Could not analyze ${filePath}: ${fsError.message}`, {
        error: fsError,
        filePath,
      });
    }
    return issues;
  }

  private async getProjectFiles(config: AnalyzerConfig): Promise<string[]> {
    const projectRoot = config.projectRoot;

    const files = await glob(config.include, {
      cwd: projectRoot,
      ignore: config.ignore,
      nodir: true,
      absolute: true,
    });

    return files;
  }

  private getSecuritySuggestion(pattern: RegExp): string {
    const suggestions: Record<string, string> = {
      eval: 'Use JSON.parse() for data parsing or Function constructor for safer code execution',
      innerHTML: 'Use textContent, createElement, or sanitize with DOMPurify',
      'document.write': 'Use modern DOM manipulation methods',
      'window.location': 'Validate and sanitize URLs before navigation',
    };

    const patternStr = pattern.toString();
    for (const [key, suggestion] of Object.entries(suggestions)) {
      if (patternStr.includes(key)) {
        return suggestion;
      }
    }
    return 'Review security implications of this code pattern';
  }

  private getSeverityRank(value: string): number {
    const normalized = value.toLowerCase();
    const ranks: Record<string, number> = {
      info: 0,
      low: 1,
      medium: 2,
      moderate: 2,
      high: 3,
      critical: 4,
    };

    return ranks[normalized] ?? 0;
  }

  private shouldReport(
    severity: CodeIssue['severity']['level'],
    threshold: AnalyzerConfig['severityThreshold']
  ): boolean {
    return this.getSeverityRank(severity) >= this.getSeverityRank(threshold);
  }
}
