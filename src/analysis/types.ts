import type {
  AnalysisModule,
  CodeIssue,
  AnalyzerConfig,
} from '../types/analysis';
import { executeCommand } from '../utils/command-executor';
import { AnalysisError, CommandExecutionError } from '../errors';
import { logger } from '../utils/logger';
import path from 'path';

export class TypesAnalyzer implements AnalysisModule {
  name = 'TypesAnalyzer';

  canAnalyze(config: AnalyzerConfig): boolean {
    return config.enabledAnalyzers.includes('types');
  }

  async analyze(config: AnalyzerConfig): Promise<CodeIssue[]> {
    logger.info('Checking type errors...');
    const issues: CodeIssue[] = [];

    try {
      const { stdout, stderr } = await executeCommand(
        'bunx tsc --noEmit --skipLibCheck',
        {
          cwd: config.projectRoot,
          ignoreExitCode: true,
        }
      );

      if (stderr || stdout.includes('error TS')) {
        const typeErrors = this.parseTSErrors(
          stdout + stderr,
          config.projectRoot
        );
        issues.push(...typeErrors);
      }
    } catch (error: unknown) {
      const analysisError =
        error instanceof CommandExecutionError
          ? new AnalysisError(
              this.name,
              error,
              `Failed to run TypeScript type check: ${error.message}`
            )
          : new AnalysisError(
              this.name,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.error(
        `Type analysis failed: ${analysisError.message}`,
        analysisError
      );
      throw analysisError;
    }
    return issues;
  }

  private parseTSErrors(output: string, projectRoot: string): CodeIssue[] {
    const lines = output.split('\n');
    const errors: CodeIssue[] = [];

    for (const line of lines) {
      const match = line.match(/^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
      if (match) {
        const [, file, lineNum, colNum, code, message] = match;

        errors.push({
          id: `ts-type-${code}-${Date.now()}`,
          type: 'type',
          severity: this.getTypescriptSeverity(code),
          title: `TypeScript Error TS${code}`,
          description: message,
          file: path.relative(projectRoot, file),
          line: parseInt(lineNum),
          column: parseInt(colNum),
          rule: `TS${code}`,
          category: 'TypeScript',
          source: 'typescript',
          autoFixable: this.isAutoFixableTS(code),
          context: {
            current: line,
          },
        });
      }
    }

    return errors;
  }

  private getTypescriptSeverity(code: string): CodeIssue['severity'] {
    const criticalCodes = ['2304', '2322', '2339', '2345']; // Cannot find name, type issues
    const highCodes = ['2531', '2532', '2533']; // Object possibly null/undefined

    if (criticalCodes.includes(code)) {
      return { level: 'critical', impact: 'blocking', urgency: 'immediate' };
    } else if (highCodes.includes(code)) {
      return { level: 'high', impact: 'major', urgency: 'high' };
    } else {
      return { level: 'medium', impact: 'minor', urgency: 'medium' };
    }
  }

  private isAutoFixableTS(code: string): boolean {
    const autoFixableCodes = ['2531', '2532']; // Missing optional chaining
    return autoFixableCodes.includes(code);
  }
}
