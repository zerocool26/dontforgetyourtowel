import type {
  AnalysisModule,
  CodeIssue,
  AnalyzerConfig,
} from '../types/analysis';
import { executeCommand } from '../utils/command-executor';
import { AnalysisError, CommandExecutionError } from '../errors';
import { logger } from '../utils/logger';
import path from 'path';

export class SyntaxAnalyzer implements AnalysisModule {
  name = 'SyntaxAnalyzer';

  canAnalyze(config: AnalyzerConfig): boolean {
    return config.enabledAnalyzers.includes('syntax');
  }

  async analyze(config: AnalyzerConfig): Promise<CodeIssue[]> {
    logger.info('Checking syntax errors...');
    const issues: CodeIssue[] = [];

    try {
      const { stdout, stderr } = await executeCommand(
        'bunx tsc --noEmit --listFiles',
        {
          cwd: config.projectRoot,
          ignoreExitCode: true,
        }
      );

      if (stderr || stdout.includes('error TS')) {
        const tsErrors = this.parseTSErrors(
          stdout + stderr,
          config.projectRoot
        );
        issues.push(...tsErrors);
      }
    } catch (error: unknown) {
      const analysisError =
        error instanceof CommandExecutionError
          ? new AnalysisError(
              this.name,
              error,
              `Failed to run TypeScript syntax check: ${error.message}`
            )
          : new AnalysisError(
              this.name,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.error(
        `Syntax analysis failed: ${analysisError.message}`,
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
          id: `ts-syntax-${code}-${Date.now()}`,
          type: 'syntax',
          severity: this.getTypescriptSeverity(code),
          title: `TypeScript Syntax Error TS${code}`,
          description: message,
          file: path.relative(projectRoot, file),
          line: parseInt(lineNum),
          column: parseInt(colNum),
          rule: `TS${code}`,
          category: 'TypeScript',
          source: 'typescript',
          autoFixable: false,
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
}
