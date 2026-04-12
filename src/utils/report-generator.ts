import type { AnalysisResult, CodeIssue } from '../types/analysis';

/**
 * Generates analysis reports in various formats
 */
export class ReportGenerator {
  private static readonly SEVERITY_COLORS = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a',
    info: '#2563eb',
  } as const;

  private static readonly SEVERITY_ICONS = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
    info: 'INFO',
  } as const;

  /**
   * Generate an HTML report with proper styling
   */
  static generateHTMLReport(analysis: AnalysisResult): string {
    const { health, issues } = analysis;
    const severityColor = this.getHealthColor(health.score);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Health Report</title>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --border-color: #334155;
      --accent: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: var(--text-secondary); }
    .score-card {
      display: inline-flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem 2rem;
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 2rem;
    }
    .score-value {
      font-size: 3rem;
      font-weight: 700;
      color: ${severityColor};
    }
    .score-label { color: var(--text-secondary); font-size: 0.875rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      text-align: center;
    }
    .stat-value { font-size: 1.5rem; font-weight: 600; }
    .stat-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }
    .issue-list { list-style: none; }
    .issue-item {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
    }
    .issue-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .issue-severity {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .issue-title { font-weight: 600; }
    .issue-desc { color: var(--text-secondary); font-size: 0.875rem; }
    .issue-meta { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; }
    .critical { background: rgba(220, 38, 38, 0.2); color: #fca5a5; }
    .high { background: rgba(234, 88, 12, 0.2); color: #fdba74; }
    .medium { background: rgba(202, 138, 4, 0.2); color: #fde047; }
    .low { background: rgba(22, 163, 74, 0.2); color: #86efac; }
    .info { background: rgba(37, 99, 235, 0.2); color: #93c5fd; }
    .empty-state { text-align: center; padding: 3rem; color: var(--text-secondary); }
  </style>
</head>
<body>
  <div class="container">
    <h1>Project Health Report</h1>

    <div class="score-card">
      <div>
        <div class="score-value">${health.score}</div>
        <div class="score-label">Health Score</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="color: ${this.SEVERITY_COLORS.critical}">${health.criticalIssues}</div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${this.SEVERITY_COLORS.high}">${health.highIssues}</div>
        <div class="stat-label">High</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${this.SEVERITY_COLORS.medium}">${health.mediumIssues}</div>
        <div class="stat-label">Medium</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${this.SEVERITY_COLORS.low}">${health.lowIssues}</div>
        <div class="stat-label">Low</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${health.totalIssues}</div>
        <div class="stat-label">Total Issues</div>
      </div>
    </div>

    <h2>Issues (${issues.length})</h2>
    ${
      issues.length > 0
        ? `<ul class="issue-list">
        ${issues
          .map(
            (issue: CodeIssue) => `
          <li class="issue-item">
            <div class="issue-header">
              <span class="issue-severity ${issue.severity.level}">${issue.severity.level}</span>
              <span class="issue-title">${this.escapeHtml(issue.title)}</span>
            </div>
            <div class="issue-desc">${this.escapeHtml(issue.description)}</div>
            <div class="issue-meta">
              ${this.escapeHtml(issue.file)} ${issue.line ? `- Line ${issue.line}` : ''} ${issue.column ? `:${issue.column}` : ''}
            </div>
          </li>
        `
          )
          .join('')}
      </ul>`
        : '<div class="empty-state">No issues found.</div>'
    }
  </div>
</body>
</html>`;
  }

  /**
   * Generate a Markdown report
   */
  static generateMarkdownReport(analysis: AnalysisResult): string {
    const { health, issues, git, deployment } = analysis;
    const severityIcon = this.getHealthIcon(health.score);

    let report = `# ${severityIcon} Project Health Report

## Summary

| Metric | Value |
|--------|-------|
| **Health Score** | ${health.score}/100 |
| **Total Issues** | ${health.totalIssues} |
| **Critical** | ${health.criticalIssues} |
| **High** | ${health.highIssues} |
| **Medium** | ${health.mediumIssues} |
| **Low** | ${health.lowIssues} |

---

## Issues by Category

`;

    // Group issues by category
    const byCategory = this.groupIssuesByCategory(issues);
    for (const [category, categoryIssues] of Object.entries(byCategory)) {
      report += `### ${category} (${categoryIssues.length})\n\n`;
      for (const issue of categoryIssues) {
        const icon = this.SEVERITY_ICONS[issue.severity.level];
        report += `- ${icon} **${issue.title}** - ${issue.description}\n`;
        report += `  - File: \`${issue.file}\`${issue.line ? ` (line ${issue.line})` : ''}\n`;
        if (issue.suggestion) {
          report += `  - Suggestion: ${issue.suggestion}\n`;
        }
        report += '\n';
      }
    }

    // Git status
    if (git) {
      report += `---

## Git Status

- **Branch:** ${git.branch}
- **Commit:** \`${git.commit}\`
- **Status:** ${git.branchStatus}
- **Uncommitted Changes:** ${git.uncommittedChanges ? 'Yes' : 'No'}

`;
    }

    // Deployment checklist
    if (deployment) {
      report += `---

## Deployment Readiness

| Check | Status |
|-------|--------|
| Build | ${this.getStatusEmoji(deployment.buildStatus)} |
| Type Checking | ${this.getStatusEmoji(deployment.typeChecking)} |
| Linting | ${this.getStatusEmoji(deployment.linting)} |
| Testing | ${this.getStatusEmoji(deployment.testing)} |
| Dependencies | ${this.getStatusEmoji(deployment.dependencies)} |
| Security | ${this.getStatusEmoji(deployment.security)} |
| Performance | ${this.getStatusEmoji(deployment.performance)} |
| Accessibility | ${this.getStatusEmoji(deployment.accessibility)} |

`;
    }

    report += `---

*Generated on ${new Date().toISOString()}*
`;

    return report;
  }

  /**
   * Generate a JSON report
   */
  static generateJsonReport(analysis: AnalysisResult): string {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Generate a terminal-friendly report
   */
  static generateTerminalReport(analysis: AnalysisResult): string {
    const { health, issues } = analysis;
    const lines: string[] = [];

    lines.push('');
    lines.push(
      '╔══════════════════════════════════════════════════════════════╗'
    );
    lines.push(
      '║                   PROJECT HEALTH REPORT                      ║'
    );
    lines.push(
      '╠══════════════════════════════════════════════════════════════╣'
    );
    lines.push(
      `║  Health Score: ${health.score.toString().padEnd(3)} / 100                                  ║`
    );
    lines.push(`║  Total Issues: ${health.totalIssues.toString().padEnd(48)}║`);
    lines.push(
      '╠══════════════════════════════════════════════════════════════╣'
    );
    lines.push(
      `║  Critical: ${health.criticalIssues.toString().padEnd(5)} High: ${health.highIssues.toString().padEnd(5)} Medium: ${health.mediumIssues.toString().padEnd(5)}        ║`
    );
    lines.push(`║  Low: ${health.lowIssues.toString().padEnd(59)}║`);
    lines.push(
      '╚══════════════════════════════════════════════════════════════╝'
    );
    lines.push('');

    if (issues.length > 0) {
      lines.push('Issues:');
      lines.push('');
      for (const issue of issues.slice(0, 20)) {
        const icon = this.SEVERITY_ICONS[issue.severity.level];
        lines.push(
          `  ${icon} [${issue.severity.level.toUpperCase()}] ${issue.title}`
        );
        lines.push(`     ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        lines.push('');
      }
      if (issues.length > 20) {
        lines.push(`  ... and ${issues.length - 20} more issues`);
      }
    } else {
      lines.push('  No issues found.');
    }

    lines.push('');
    return lines.join('\n');
  }

  // Helper methods
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private static getHealthColor(score: number): string {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ca8a04';
    if (score >= 40) return '#ea580c';
    return '#dc2626';
  }

  private static getHealthIcon(score: number): string {
    if (score >= 80) return 'PASS';
    if (score >= 60) return 'WARN';
    if (score >= 40) return 'RISK';
    return 'FAIL';
  }

  private static getStatusEmoji(status: string): string {
    switch (status) {
      case 'pass':
        return 'Pass';
      case 'fail':
        return 'Fail';
      case 'warning':
        return 'Warning';
      default:
        return 'Unknown';
    }
  }

  private static groupIssuesByCategory(
    issues: CodeIssue[]
  ): Record<string, CodeIssue[]> {
    return issues.reduce(
      (acc, issue) => {
        const category = issue.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(issue);
        return acc;
      },
      {} as Record<string, CodeIssue[]>
    );
  }

  /**
   * Generate a SARIF (Static Analysis Results Interchange Format) report
   * This format is compatible with GitHub Code Scanning and other CI/CD tools
   * @see https://sarifweb.azurewebsites.net/
   */
  static generateSarifReport(
    analysis: AnalysisResult,
    toolName = 'Code Health Analyzer',
    toolVersion = '1.0.0'
  ): string {
    const { issues } = analysis;

    const sarifReport = {
      $schema:
        'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: toolName,
              version: toolVersion,
              informationUri: 'https://github.com/your-repo/code-analyzer',
              rules: this.generateSarifRules(issues),
            },
          },
          results: issues.map((issue, index) =>
            this.issueToSarifResult(issue, index)
          ),
          invocations: [
            {
              executionSuccessful: true,
              endTimeUtc: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    return JSON.stringify(sarifReport, null, 2);
  }

  /**
   * Generate SARIF rule definitions from issues
   */
  private static generateSarifRules(issues: CodeIssue[]): Array<{
    id: string;
    name: string;
    shortDescription: { text: string };
    fullDescription: { text: string };
    defaultConfiguration: { level: string };
    helpUri?: string;
  }> {
    const uniqueRules = new Map<
      string,
      {
        id: string;
        name: string;
        description: string;
        severity: string;
        documentation?: string;
      }
    >();

    for (const issue of issues) {
      if (!uniqueRules.has(issue.rule)) {
        uniqueRules.set(issue.rule, {
          id: issue.rule,
          name: issue.title,
          description: issue.description,
          severity: issue.severity.level,
          documentation: issue.documentation,
        });
      }
    }

    return Array.from(uniqueRules.values()).map(rule => ({
      id: rule.id,
      name: rule.name,
      shortDescription: { text: rule.name },
      fullDescription: { text: rule.description },
      defaultConfiguration: {
        level: this.severityToSarifLevel(rule.severity),
      },
      ...(rule.documentation && { helpUri: rule.documentation }),
    }));
  }

  /**
   * Convert an issue to SARIF result format
   */
  private static issueToSarifResult(
    issue: CodeIssue,
    index: number
  ): {
    ruleId: string;
    ruleIndex: number;
    level: string;
    message: { text: string };
    locations: Array<{
      physicalLocation: {
        artifactLocation: { uri: string };
        region?: {
          startLine: number;
          startColumn?: number;
          endLine?: number;
          endColumn?: number;
        };
      };
    }>;
    fixes?: Array<{
      description: { text: string };
      artifactChanges: Array<{
        artifactLocation: { uri: string };
        replacements: Array<{
          deletedRegion: {
            startLine: number;
            startColumn?: number;
          };
          insertedContent?: { text: string };
        }>;
      }>;
    }>;
  } {
    const result: ReturnType<typeof this.issueToSarifResult> = {
      ruleId: issue.rule,
      ruleIndex: index,
      level: this.severityToSarifLevel(issue.severity.level),
      message: {
        text: `${issue.title}: ${issue.description}`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: issue.file,
            },
            ...(issue.line && {
              region: {
                startLine: issue.line,
                ...(issue.column && { startColumn: issue.column }),
              },
            }),
          },
        },
      ],
    };

    // Add fix suggestion if available and autoFixable
    if (issue.suggestion && issue.autoFixable && issue.line) {
      result.fixes = [
        {
          description: { text: issue.suggestion },
          artifactChanges: [
            {
              artifactLocation: { uri: issue.file },
              replacements: [
                {
                  deletedRegion: {
                    startLine: issue.line,
                    ...(issue.column && { startColumn: issue.column }),
                  },
                },
              ],
            },
          ],
        },
      ];
    }

    return result;
  }

  /**
   * Map severity levels to SARIF levels
   */
  private static severityToSarifLevel(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'note';
      default:
        return 'none';
    }
  }

  /**
   * Generate a CSV report for spreadsheet analysis
   */
  static generateCsvReport(analysis: AnalysisResult): string {
    const { issues, health } = analysis;
    const headers = [
      'ID',
      'Severity',
      'Impact',
      'Urgency',
      'Title',
      'Description',
      'File',
      'Line',
      'Column',
      'Category',
      'Rule',
      'AutoFixable',
      'Suggestion',
    ];

    const rows = issues.map(issue => [
      this.escapeCsvField(issue.id),
      this.escapeCsvField(issue.severity.level),
      this.escapeCsvField(issue.severity.impact),
      this.escapeCsvField(issue.severity.urgency),
      this.escapeCsvField(issue.title),
      this.escapeCsvField(issue.description),
      this.escapeCsvField(issue.file),
      issue.line?.toString() || '',
      issue.column?.toString() || '',
      this.escapeCsvField(issue.category),
      this.escapeCsvField(issue.rule),
      issue.autoFixable ? 'Yes' : 'No',
      this.escapeCsvField(issue.suggestion || ''),
    ]);

    // Add summary row
    const summaryRows = [
      [],
      ['Summary'],
      ['Health Score', health.score.toString()],
      ['Total Issues', health.totalIssues.toString()],
      ['Critical', health.criticalIssues.toString()],
      ['High', health.highIssues.toString()],
      ['Medium', health.mediumIssues.toString()],
      ['Low', health.lowIssues.toString()],
    ];

    const allRows = [headers, ...rows, ...summaryRows];
    return allRows.map(row => row.join(',')).join('\n');
  }

  /**
   * Escape a field for CSV format
   */
  private static escapeCsvField(field: string): string {
    if (!field) return '';
    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Generate a JUnit XML report for CI/CD integration
   */
  static generateJunitReport(
    analysis: AnalysisResult,
    suiteName = 'Code Health Analysis'
  ): string {
    const { issues, health } = analysis;
    const timestamp = new Date().toISOString();
    const failureCount = health.criticalIssues + health.highIssues;
    const warningCount = health.mediumIssues;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${this.escapeXml(suiteName)}" tests="${issues.length}" failures="${failureCount}" warnings="${warningCount}" timestamp="${timestamp}">
  <testsuite name="Code Analysis" tests="${issues.length}" failures="${failureCount}" timestamp="${timestamp}">`;

    // Group by category for test cases
    const byCategory = this.groupIssuesByCategory(issues);

    for (const [category, categoryIssues] of Object.entries(byCategory)) {
      for (const issue of categoryIssues) {
        const isFailure =
          issue.severity.level === 'critical' ||
          issue.severity.level === 'high';
        xml += `
    <testcase name="${this.escapeXml(issue.title)}" classname="${this.escapeXml(category)}" file="${this.escapeXml(issue.file)}"${issue.line ? ` line="${issue.line}"` : ''}>`;

        if (isFailure) {
          xml += `
      <failure message="${this.escapeXml(issue.description)}" type="${issue.severity.level}">
${this.escapeXml(issue.description)}
File: ${this.escapeXml(issue.file)}${issue.line ? `:${issue.line}` : ''}${issue.suggestion ? `\nSuggestion: ${this.escapeXml(issue.suggestion)}` : ''}
      </failure>`;
        } else if (issue.severity.level === 'medium') {
          xml += `
      <warning message="${this.escapeXml(issue.description)}" type="${issue.severity.level}" />`;
        }

        xml += `
    </testcase>`;
      }
    }

    xml += `
  </testsuite>
</testsuites>`;

    return xml;
  }

  /**
   * Escape a string for XML
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
