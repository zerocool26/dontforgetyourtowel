import type {
  AnalysisModule,
  CodeIssue,
  AnalyzerConfig,
  GitAnalysis,
} from '../types/analysis';
import { executeCommand } from '../utils/command-executor';
import { AnalysisError, CommandExecutionError } from '../errors';
import { logger } from '../utils/logger';

export class GitAnalyzer implements AnalysisModule {
  name = 'GitAnalyzer';
  private lastAnalysis: GitAnalysis | null = null;

  canAnalyze(config: AnalyzerConfig): boolean {
    return config.enabledAnalyzers.includes('git');
  }

  async analyze(config: AnalyzerConfig): Promise<CodeIssue[]> {
    logger.info('Analyzing Git status...');
    const issues: CodeIssue[] = [];

    try {
      const [branchInfo, statusInfo, logInfo] = await Promise.all([
        this.executeCommand('git branch --show-current', config),
        this.executeCommand('git status --porcelain', config),
        this.executeCommand('git log --oneline -1', config),
      ]);

      const branch = branchInfo.stdout.trim();
      const commit = logInfo.stdout.trim().split(' ')[0];
      const statusLines = statusInfo.stdout
        .split(/\r?\n/)
        .filter(line => line.length > 0);
      const getStatusCode = (line: string) => line.slice(0, 2);
      const getStatusPath = (line: string) => line.substring(3);
      const hasStatus = (line: string, status: string) => {
        const code = getStatusCode(line);
        return code[0] === status || code[1] === status;
      };
      const untracked = statusLines
        .filter(line => line.startsWith('??'))
        .map(getStatusPath);
      const conflicts = statusLines.some(
        line =>
          line.startsWith('UU') ||
          line.startsWith('AA') ||
          line.startsWith('DD')
      );
      const aheadBehind = await this.getAheadBehind(config);
      const aheadBy = aheadBehind?.ahead ?? 0;
      const behindBy = aheadBehind?.behind ?? 0;
      const branchStatus: GitAnalysis['branchStatus'] = !branch
        ? 'detached'
        : aheadBy > 0 && behindBy > 0
          ? 'diverged'
          : behindBy > 0
            ? 'behind'
            : aheadBy > 0
              ? 'ahead'
              : 'up-to-date';

      const gitAnalysis: GitAnalysis = {
        branch,
        commit,
        uncommittedChanges: statusLines.length > 0,
        branchStatus,
        conflicts,
        aheadBy,
        behindBy,
        fileChanges: {
          added: statusLines
            .filter(line => !line.startsWith('??') && hasStatus(line, 'A'))
            .map(getStatusPath),
          modified: statusLines
            .filter(line => !line.startsWith('??') && hasStatus(line, 'M'))
            .map(getStatusPath),
          deleted: statusLines
            .filter(line => !line.startsWith('??') && hasStatus(line, 'D'))
            .map(getStatusPath),
        },
        untracked,
      };
      this.lastAnalysis = gitAnalysis;

      // Check for common Git issues
      if (gitAnalysis.uncommittedChanges) {
        issues.push({
          id: `git-uncommitted-${Date.now()}`,
          type: 'git',
          severity: {
            level: 'low',
            impact: 'minor',
            urgency: 'low',
          },
          title: 'Uncommitted Changes',
          description: 'There are uncommitted changes in the repository',
          file: '.git',
          rule: 'git-status',
          category: 'Git',
          source: 'git-analyzer',
          suggestion: 'Commit or stash changes before deployment',
          autoFixable: false,
          context: {
            current: `${statusLines.length} uncommitted changes (added: ${gitAnalysis.fileChanges.added.length}, modified: ${gitAnalysis.fileChanges.modified.length}, deleted: ${gitAnalysis.fileChanges.deleted.length}, untracked: ${gitAnalysis.untracked?.length ?? 0})`,
          },
        });
      }

      if (gitAnalysis.branchStatus !== 'up-to-date') {
        const severityLevel =
          gitAnalysis.branchStatus === 'detached' ||
          gitAnalysis.branchStatus === 'diverged'
            ? 'high'
            : gitAnalysis.branchStatus === 'behind'
              ? 'medium'
              : 'low';

        issues.push({
          id: `git-branch-${Date.now()}`,
          type: 'git',
          severity: {
            level: severityLevel,
            impact: severityLevel === 'high' ? 'major' : 'minor',
            urgency: severityLevel === 'high' ? 'high' : 'medium',
          },
          title:
            gitAnalysis.branchStatus === 'detached'
              ? 'Detached HEAD State'
              : gitAnalysis.branchStatus === 'diverged'
                ? 'Branch Has Diverged From Upstream'
                : gitAnalysis.branchStatus === 'behind'
                  ? 'Branch Is Behind Upstream'
                  : 'Branch Ahead Of Upstream',
          description:
            gitAnalysis.branchStatus === 'detached'
              ? 'Repository is in a detached HEAD state; create or switch to a branch to avoid losing work.'
              : gitAnalysis.branchStatus === 'ahead'
                ? 'Local branch has commits not pushed to upstream.'
                : gitAnalysis.branchStatus === 'behind'
                  ? 'Local branch is behind upstream; pull latest changes to avoid conflicts.'
                  : 'Local branch has diverged; manual merge or rebase is required.',
          file: '.git',
          rule: 'git-branch-alignment',
          category: 'Git',
          source: 'git-analyzer',
          suggestion:
            gitAnalysis.branchStatus === 'ahead'
              ? 'Push your local commits to the remote repository.'
              : gitAnalysis.branchStatus === 'behind'
                ? 'Run `git pull --rebase` to update your branch.'
                : gitAnalysis.branchStatus === 'diverged'
                  ? 'Resolve divergence with `git pull --rebase` or a manual merge.'
                  : 'Create or checkout a branch before committing further changes.',
          autoFixable: false,
          context: {
            current: `ahead: ${gitAnalysis.aheadBy ?? 0}, behind: ${gitAnalysis.behindBy ?? 0}, status: ${gitAnalysis.branchStatus}`,
          },
        });
      }

      if (gitAnalysis.conflicts) {
        issues.push({
          id: `git-conflicts-${Date.now()}`,
          type: 'git',
          severity: {
            level: 'high',
            impact: 'major',
            urgency: 'high',
          },
          title: 'Merge Conflicts Present',
          description:
            'Merge conflicts detected in the working tree. Resolve them before continuing.',
          file: '.git',
          rule: 'git-conflicts',
          category: 'Git',
          source: 'git-analyzer',
          suggestion:
            'Run `git status` and resolve conflicts marked as UU/AA/DD files.',
          autoFixable: false,
          context: {
            current: `Conflicted files: ${statusLines
              .filter(
                line =>
                  line.startsWith('UU') ||
                  line.startsWith('AA') ||
                  line.startsWith('DD')
              )
              .map(line => line.substring(3))
              .join(', ')}`,
          },
        });
      }
    } catch (error: unknown) {
      const analysisError =
        error instanceof CommandExecutionError
          ? new AnalysisError(
              this.name,
              error,
              `Failed to run Git command: ${error.message}`
            )
          : new AnalysisError(
              this.name,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.warn(`Git analysis failed: ${analysisError.message}`, {
        error: analysisError,
      });
    }
    return issues;
  }

  private async executeCommand(
    command: string,
    config: AnalyzerConfig
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
  }> {
    return executeCommand(command, {
      cwd: config.projectRoot,
      ignoreExitCode: true,
    });
  }

  private async getAheadBehind(
    config: AnalyzerConfig
  ): Promise<{ ahead: number; behind: number } | null> {
    try {
      const result = await this.executeCommand(
        'git rev-list --left-right --count HEAD...@{u}',
        config
      );

      const counts = result.stdout.trim().split(/\s+/);
      const ahead = Number.parseInt(counts[0] ?? '0', 10);
      const behind = Number.parseInt(counts[1] ?? '0', 10);

      if (Number.isNaN(ahead) || Number.isNaN(behind)) {
        return null;
      }

      return { ahead, behind };
    } catch (error) {
      logger.debug('Unable to determine upstream status', { error });
      return null;
    }
  }

  getLastAnalysis(): GitAnalysis | null {
    return this.lastAnalysis;
  }
}
