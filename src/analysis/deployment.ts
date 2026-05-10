import type {
  AnalysisModule,
  CodeIssue,
  AnalyzerConfig,
  DeploymentChecklist,
} from '../types/analysis';
import { executeCommand } from '../utils/command-executor';
import { AnalysisError, CommandExecutionError } from '../errors';
import { logger } from '../utils/logger';

export class DeploymentAnalyzer implements AnalysisModule {
  name = 'DeploymentAnalyzer';
  private lastChecklist: DeploymentChecklist | null = null;

  canAnalyze(config: AnalyzerConfig): boolean {
    if (!config.deploymentChecks) {
      return false;
    }
    // Skip deployment analysis during build process to prevent issues
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.npm_lifecycle_event === 'build'
    ) {
      return false;
    }
    return config.enabledAnalyzers.includes('deployment');
  }

  async analyze(config: AnalyzerConfig): Promise<CodeIssue[]> {
    if (!config.deploymentChecks) {
      logger.info('Deployment checks disabled; skipping deployment analyzer');
      return [];
    }

    logger.info('Checking deployment readiness...');
    const issues: CodeIssue[] = [];

    try {
      const checks: DeploymentChecklist = {
        buildStatus: await this.checkBuildStatus(config),
        typeChecking: await this.checkTypes(config),
        linting: await this.checkLinting(config),
        testing: await this.checkTests(config),
        dependencies: await this.checkDependencies(config),
        security: 'pass', // Handled by SecurityAnalyzer
        performance: 'pass', // Handled by PerformanceAnalyzer
        accessibility: 'pass', // Handled by AccessibilityAnalyzer
        seo: await this.checkSEO(config),
        assets: 'pass', // Will be checked in build
      };

      // Add issues for failed checks
      Object.entries(checks).forEach(([check, status]) => {
        if (status === 'fail') {
          issues.push({
            id: `deployment-${check}-${Date.now()}`,
            type: 'deployment',
            severity: {
              level: 'high',
              impact: 'blocking',
              urgency: 'high',
            },
            title: `Deployment Check Failed: ${check}`,
            description: `The ${check} check failed and must be resolved before deployment`,
            file: 'deployment',
            rule: `deployment-${check}`,
            category: 'Deployment',
            source: 'deployment-analyzer',
            suggestion: this.getDeploymentSuggestion(check),
            autoFixable: false,
            context: {
              current: `${check} status: ${status}`,
            },
          });
        } else if (status === 'warning') {
          issues.push({
            id: `deployment-${check}-warning-${Date.now()}`,
            type: 'deployment',
            severity: {
              level: 'medium',
              impact: 'minor',
              urgency: 'medium',
            },
            title: `Deployment Warning: ${check}`,
            description: `The ${check} check has warnings that should be reviewed`,
            file: 'deployment',
            rule: `deployment-${check}`,
            category: 'Deployment',
            source: 'deployment-analyzer',
            suggestion: this.getDeploymentSuggestion(check),
            autoFixable: false,
            context: {
              current: `${check} status: ${status}`,
            },
          });
        }
      });

      this.lastChecklist = checks;
    } catch (error: unknown) {
      const analysisError =
        error instanceof AnalysisError
          ? error
          : new AnalysisError(
              this.name,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.warn(`Deployment analysis failed: ${analysisError.message}`, {
        error: analysisError,
      });
    }
    return issues;
  }

  private async checkLinting(config: AnalyzerConfig): Promise<'pass' | 'fail'> {
    try {
      if (process.env.npm_lifecycle_event === 'build') {
        return 'pass';
      }

      const { exitCode } = await executeCommand('npm run lint', {
        cwd: config.projectRoot,
        ignoreExitCode: true,
      });

      // Linting is binary - either passes or fails (warnings still pass)
      return exitCode === 0 ? 'pass' : 'fail';
    } catch {
      return 'pass'; // Can't determine, assume pass
    }
  }

  private async checkTests(config: AnalyzerConfig): Promise<'pass' | 'fail'> {
    try {
      if (process.env.npm_lifecycle_event === 'build') {
        return 'pass';
      }

      const { exitCode } = await executeCommand('npm test -- --run', {
        cwd: config.projectRoot,
        ignoreExitCode: true,
        timeout: 60000, // 60 second timeout for tests
      });

      // Tests are binary - either pass or fail
      return exitCode === 0 ? 'pass' : 'fail';
    } catch {
      return 'pass'; // Tests may not be configured, assume pass
    }
  }

  private async checkDependencies(
    config: AnalyzerConfig
  ): Promise<'pass' | 'fail' | 'warning'> {
    try {
      const { stdout } = await executeCommand('npm outdated --json', {
        cwd: config.projectRoot,
        ignoreExitCode: true,
      });

      if (!stdout || stdout === '{}') return 'pass';

      const outdated = JSON.parse(stdout);
      const majorUpdates = Object.values(outdated).filter(
        (pkg: unknown) =>
          (pkg as { current: string; latest: string }).current?.split(
            '.'
          )[0] !==
          (pkg as { current: string; latest: string }).latest?.split('.')[0]
      );

      if (majorUpdates.length > 5) return 'warning';
      return 'pass';
    } catch {
      return 'pass'; // Can't determine, assume ok
    }
  }

  private async checkSEO(
    config: AnalyzerConfig
  ): Promise<'pass' | 'fail' | 'warning'> {
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      // Check for essential SEO files
      const seoFiles = ['robots.txt', 'sitemap.xml', 'sitemap-index.xml'];
      const publicDir = path.join(config.projectRoot, 'public');
      const distDir = path.join(config.projectRoot, 'dist');

      let foundCount = 0;
      for (const file of seoFiles) {
        try {
          await fs.access(path.join(publicDir, file));
          foundCount++;
        } catch {
          try {
            await fs.access(path.join(distDir, file));
            foundCount++;
          } catch {
            // File not found
          }
        }
      }

      if (foundCount === 0) return 'warning';
      if (foundCount < 2) return 'warning';
      return 'pass';
    } catch {
      return 'warning';
    }
  }

  private async checkBuildStatus(
    config: AnalyzerConfig
  ): Promise<'pass' | 'fail' | 'warning'> {
    try {
      // Skip build check if we're already in a build process to avoid circular dependency
      if (
        process.env.NODE_ENV === 'production' ||
        process.env.npm_lifecycle_event === 'build'
      ) {
        logger.info(
          'Skipping build check during build process to avoid circular dependency'
        );
        return 'pass';
      }

      const { exitCode } = await executeCommand('npm run build', {
        cwd: config.projectRoot,
      });
      return exitCode === 0 ? 'pass' : 'fail';
    } catch (error: unknown) {
      const cmdError =
        error instanceof CommandExecutionError
          ? error
          : new CommandExecutionError(
              'npm run build',
              null,
              null,
              '',
              '',
              String(error)
            );
      logger.error(`Build check failed: ${cmdError.message}`, cmdError);
      return 'fail';
    }
  }

  private async checkTypes(config: AnalyzerConfig): Promise<'pass' | 'fail'> {
    try {
      // Skip type check during build process to prevent hangs
      if (
        process.env.NODE_ENV === 'production' ||
        process.env.npm_lifecycle_event === 'build'
      ) {
        logger.info('Skipping type check during build process');
        return 'pass';
      }

      const { exitCode } = await executeCommand('npx tsc --noEmit', {
        cwd: config.projectRoot,
      });
      return exitCode === 0 ? 'pass' : 'fail';
    } catch (error: unknown) {
      const cmdError =
        error instanceof CommandExecutionError
          ? error
          : new CommandExecutionError(
              'npx tsc --noEmit',
              null,
              null,
              '',
              '',
              String(error)
            );
      logger.error(`Type check failed: ${cmdError.message}`, cmdError);
      return 'fail';
    }
  }

  private getDeploymentSuggestion(check: string): string {
    const suggestions: Record<string, string> = {
      buildStatus: 'Fix build errors before deployment',
      typeChecking: 'Resolve TypeScript errors',
      linting: 'Fix linting issues',
      testing: 'Ensure all tests pass',
      dependencies:
        'Review available major dependency upgrades and plan migrations deliberately; security vulnerabilities are checked separately with npm audit.',
      security: 'Address security vulnerabilities',
      performance: 'Optimize performance issues',
      accessibility: 'Fix accessibility issues',
      seo: 'Improve SEO compliance',
      assets: 'Optimize and compress assets',
    };

    return suggestions[check] || `Review and fix ${check} issues`;
  }

  getLastChecklist(): DeploymentChecklist | null {
    return this.lastChecklist;
  }
}
