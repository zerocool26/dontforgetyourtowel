import { describe, it, expect } from 'vitest';
import { ReportGenerator } from '../utils/report-generator';
import type { AnalysisResult, CodeIssue } from '../types/analysis';

// Helper to create mock analysis result
function createMockAnalysis(
  overrides: Partial<AnalysisResult> = {}
): AnalysisResult {
  return {
    issues: [],
    health: {
      score: 85,
      criticalIssues: 0,
      highIssues: 1,
      mediumIssues: 3,
      lowIssues: 5,
      totalIssues: 9,
      categories: { Security: 2, Performance: 3, Accessibility: 4 },
      trends: {
        improving: true,
        velocity: 0.5,
        lastCheck: new Date(),
      },
    },
    git: null,
    deployment: null,
    ...overrides,
  };
}

// Helper to create mock issues
function createMockIssue(overrides: Partial<CodeIssue> = {}): CodeIssue {
  return {
    id: 'test-issue-1',
    type: 'security',
    severity: {
      level: 'high',
      impact: 'major',
      urgency: 'high',
    },
    title: 'Test Issue',
    description: 'This is a test issue description',
    file: 'src/test.ts',
    line: 10,
    column: 5,
    rule: 'test-rule',
    category: 'Security',
    source: 'test-analyzer',
    autoFixable: false,
    ...overrides,
  };
}

describe('ReportGenerator', () => {
  /* ==================== HTML REPORT TESTS ==================== */

  describe('generateHTMLReport', () => {
    it('should generate valid HTML with DOCTYPE', () => {
      const analysis = createMockAnalysis();
      const html = ReportGenerator.generateHTMLReport(analysis);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
    });

    it('should include health score', () => {
      const analysis = createMockAnalysis({
        health: { ...createMockAnalysis().health, score: 75 },
      });
      const html = ReportGenerator.generateHTMLReport(analysis);

      expect(html).toContain('75');
      expect(html).toContain('Health Score');
    });

    it('should include issue counts', () => {
      const analysis = createMockAnalysis();
      const html = ReportGenerator.generateHTMLReport(analysis);

      expect(html).toContain('Critical');
      expect(html).toContain('High');
      expect(html).toContain('Medium');
      expect(html).toContain('Low');
    });

    it('should render issues when present', () => {
      const issue = createMockIssue({ title: 'SQL Injection Risk' });
      const analysis = createMockAnalysis({ issues: [issue] });
      const html = ReportGenerator.generateHTMLReport(analysis);

      expect(html).toContain('SQL Injection Risk');
      expect(html).toContain('src/test.ts');
    });

    it('should show empty state when no issues', () => {
      const analysis = createMockAnalysis({ issues: [] });
      const html = ReportGenerator.generateHTMLReport(analysis);

      expect(html).toContain('No issues found');
    });

    it('should escape HTML in issue content', () => {
      const issue = createMockIssue({
        title: '<script>alert("xss")</script>',
        description: '<img onerror="hack">',
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const html = ReportGenerator.generateHTMLReport(analysis);

      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  /* ==================== MARKDOWN REPORT TESTS ==================== */

  describe('generateMarkdownReport', () => {
    it('should generate valid markdown with title', () => {
      const analysis = createMockAnalysis();
      const md = ReportGenerator.generateMarkdownReport(analysis);

      expect(md).toContain('# ');
      expect(md).toContain('Project Health Report');
    });

    it('should include summary table', () => {
      const analysis = createMockAnalysis();
      const md = ReportGenerator.generateMarkdownReport(analysis);

      expect(md).toContain('| Metric | Value |');
      expect(md).toContain('Health Score');
      expect(md).toContain('/100');
    });

    it('should group issues by category', () => {
      const issues = [
        createMockIssue({ category: 'Security', title: 'Security Issue 1' }),
        createMockIssue({ category: 'Security', title: 'Security Issue 2' }),
        createMockIssue({ category: 'Performance', title: 'Perf Issue' }),
      ];
      const analysis = createMockAnalysis({ issues });
      const md = ReportGenerator.generateMarkdownReport(analysis);

      expect(md).toContain('### Security');
      expect(md).toContain('### Performance');
    });

    it('should include git status when available', () => {
      const analysis = createMockAnalysis({
        git: {
          branch: 'main',
          commit: 'abc123',
          uncommittedChanges: false,
          branchStatus: 'up-to-date',
          conflicts: false,
          fileChanges: { added: [], modified: [], deleted: [] },
        },
      });
      const md = ReportGenerator.generateMarkdownReport(analysis);

      expect(md).toContain('Git Status');
      expect(md).toContain('main');
      expect(md).toContain('abc123');
    });

    it('should include deployment checklist when available', () => {
      const analysis = createMockAnalysis({
        deployment: {
          buildStatus: 'pass',
          typeChecking: 'pass',
          linting: 'pass',
          testing: 'fail',
          dependencies: 'pass',
          security: 'warning',
          performance: 'pass',
          accessibility: 'pass',
          seo: 'pass',
          assets: 'pass',
        },
      });
      const md = ReportGenerator.generateMarkdownReport(analysis);

      expect(md).toContain('Deployment Readiness');
      expect(md).toContain('Pass');
      expect(md).toContain('Fail');
    });

    it('should include timestamp', () => {
      const analysis = createMockAnalysis();
      const md = ReportGenerator.generateMarkdownReport(analysis);

      expect(md).toContain('Generated on');
    });
  });

  /* ==================== JSON REPORT TESTS ==================== */

  describe('generateJsonReport', () => {
    it('should generate valid JSON', () => {
      const analysis = createMockAnalysis();
      const json = ReportGenerator.generateJsonReport(analysis);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all analysis data', () => {
      const analysis = createMockAnalysis();
      const json = ReportGenerator.generateJsonReport(analysis);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('health');
      expect(parsed).toHaveProperty('issues');
      expect(parsed.health.score).toBe(85);
    });

    it('should be properly formatted with indentation', () => {
      const analysis = createMockAnalysis();
      const json = ReportGenerator.generateJsonReport(analysis);

      // Check for indentation (2 spaces)
      expect(json).toContain('\n  ');
    });
  });

  /* ==================== TERMINAL REPORT TESTS ==================== */

  describe('generateTerminalReport', () => {
    it('should include ASCII border box', () => {
      const analysis = createMockAnalysis();
      const terminal = ReportGenerator.generateTerminalReport(analysis);

      expect(terminal).toContain('╔');
      expect(terminal).toContain('╚');
      expect(terminal).toContain('║');
    });

    it('should include health score', () => {
      const analysis = createMockAnalysis();
      const terminal = ReportGenerator.generateTerminalReport(analysis);

      expect(terminal).toContain('Health Score');
      expect(terminal).toContain('85');
    });

    it('should include severity labels', () => {
      const analysis = createMockAnalysis();
      const terminal = ReportGenerator.generateTerminalReport(analysis);

      expect(terminal).toContain('Critical');
      expect(terminal).toContain('High');
      expect(terminal).toContain('Medium');
      expect(terminal).toContain('Low');
    });

    it('should truncate long issue lists', () => {
      const issues = Array.from({ length: 25 }, (_, i) =>
        createMockIssue({ id: `issue-${i}`, title: `Issue ${i}` })
      );
      const analysis = createMockAnalysis({ issues });
      const terminal = ReportGenerator.generateTerminalReport(analysis);

      expect(terminal).toContain('... and 5 more issues');
    });

    it('should show success message when no issues', () => {
      const analysis = createMockAnalysis({ issues: [] });
      const terminal = ReportGenerator.generateTerminalReport(analysis);

      expect(terminal).toContain('No issues found');
    });
  });

  /* ==================== SARIF REPORT TESTS ==================== */

  describe('generateSarifReport', () => {
    it('should generate valid SARIF JSON', () => {
      const analysis = createMockAnalysis();
      const sarif = ReportGenerator.generateSarifReport(analysis);

      expect(() => JSON.parse(sarif)).not.toThrow();
    });

    it('should include SARIF schema and version', () => {
      const analysis = createMockAnalysis();
      const sarif = JSON.parse(ReportGenerator.generateSarifReport(analysis));

      expect(sarif.$schema).toContain('sarif');
      expect(sarif.version).toBe('2.1.0');
    });

    it('should include tool information', () => {
      const analysis = createMockAnalysis();
      const sarif = JSON.parse(
        ReportGenerator.generateSarifReport(
          analysis,
          'Custom Analyzer',
          '2.0.0'
        )
      );

      expect(sarif.runs[0].tool.driver.name).toBe('Custom Analyzer');
      expect(sarif.runs[0].tool.driver.version).toBe('2.0.0');
    });

    it('should convert issues to SARIF results', () => {
      const issue = createMockIssue({
        severity: {
          level: 'critical',
          impact: 'blocking',
          urgency: 'immediate',
        },
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const sarif = JSON.parse(ReportGenerator.generateSarifReport(analysis));

      expect(sarif.runs[0].results).toHaveLength(1);
      expect(sarif.runs[0].results[0].level).toBe('error');
      expect(sarif.runs[0].results[0].ruleId).toBe('test-rule');
    });

    it('should map severity levels to SARIF levels', () => {
      const issues = [
        createMockIssue({
          id: '1',
          rule: 'r1',
          severity: {
            level: 'critical',
            impact: 'blocking',
            urgency: 'immediate',
          },
        }),
        createMockIssue({
          id: '2',
          rule: 'r2',
          severity: { level: 'high', impact: 'major', urgency: 'high' },
        }),
        createMockIssue({
          id: '3',
          rule: 'r3',
          severity: { level: 'medium', impact: 'minor', urgency: 'medium' },
        }),
        createMockIssue({
          id: '4',
          rule: 'r4',
          severity: { level: 'low', impact: 'cosmetic', urgency: 'low' },
        }),
        createMockIssue({
          id: '5',
          rule: 'r5',
          severity: { level: 'info', impact: 'cosmetic', urgency: 'low' },
        }),
      ];
      const analysis = createMockAnalysis({ issues });
      const sarif = JSON.parse(ReportGenerator.generateSarifReport(analysis));

      const levels = sarif.runs[0].results.map(
        (r: { level: string }) => r.level
      );
      expect(levels).toContain('error'); // critical, high
      expect(levels).toContain('warning'); // medium
      expect(levels).toContain('note'); // low, info
    });

    it('should include file locations', () => {
      const issue = createMockIssue({
        file: 'src/app.ts',
        line: 42,
        column: 10,
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const sarif = JSON.parse(ReportGenerator.generateSarifReport(analysis));

      const location = sarif.runs[0].results[0].locations[0];
      expect(location.physicalLocation.artifactLocation.uri).toBe('src/app.ts');
      expect(location.physicalLocation.region.startLine).toBe(42);
      expect(location.physicalLocation.region.startColumn).toBe(10);
    });

    it('should generate unique rules', () => {
      const issues = [
        createMockIssue({ id: '1', rule: 'no-console' }),
        createMockIssue({ id: '2', rule: 'no-console' }),
        createMockIssue({ id: '3', rule: 'no-unused-vars' }),
      ];
      const analysis = createMockAnalysis({ issues });
      const sarif = JSON.parse(ReportGenerator.generateSarifReport(analysis));

      const rules = sarif.runs[0].tool.driver.rules;
      expect(rules).toHaveLength(2);
    });
  });

  /* ==================== CSV REPORT TESTS ==================== */

  describe('generateCsvReport', () => {
    it('should include header row', () => {
      const analysis = createMockAnalysis();
      const csv = ReportGenerator.generateCsvReport(analysis);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Severity');
      expect(lines[0]).toContain('Title');
      expect(lines[0]).toContain('File');
    });

    it('should include issue data rows', () => {
      const issue = createMockIssue({
        id: 'csv-test',
        title: 'CSV Test Issue',
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const csv = ReportGenerator.generateCsvReport(analysis);

      expect(csv).toContain('csv-test');
      expect(csv).toContain('CSV Test Issue');
    });

    it('should escape fields with commas', () => {
      const issue = createMockIssue({
        description: 'This, has, commas',
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const csv = ReportGenerator.generateCsvReport(analysis);

      expect(csv).toContain('"This, has, commas"');
    });

    it('should escape fields with quotes', () => {
      const issue = createMockIssue({
        description: 'Has "quotes" inside',
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const csv = ReportGenerator.generateCsvReport(analysis);

      expect(csv).toContain('""quotes""');
    });

    it('should include summary section', () => {
      const analysis = createMockAnalysis();
      const csv = ReportGenerator.generateCsvReport(analysis);

      expect(csv).toContain('Summary');
      expect(csv).toContain('Health Score');
      expect(csv).toContain('Total Issues');
    });
  });

  /* ==================== JUNIT REPORT TESTS ==================== */

  describe('generateJunitReport', () => {
    it('should generate valid XML', () => {
      const analysis = createMockAnalysis();
      const xml = ReportGenerator.generateJunitReport(analysis);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<testsuites');
      expect(xml).toContain('</testsuites>');
    });

    it('should include suite name', () => {
      const analysis = createMockAnalysis();
      const xml = ReportGenerator.generateJunitReport(
        analysis,
        'My Test Suite'
      );

      expect(xml).toContain('name="My Test Suite"');
    });

    it('should count failures correctly', () => {
      const issues = [
        createMockIssue({
          severity: {
            level: 'critical',
            impact: 'blocking',
            urgency: 'immediate',
          },
        }),
        createMockIssue({
          severity: { level: 'high', impact: 'major', urgency: 'high' },
        }),
        createMockIssue({
          severity: { level: 'medium', impact: 'minor', urgency: 'medium' },
        }),
      ];
      const analysis = createMockAnalysis({
        issues,
        health: {
          ...createMockAnalysis().health,
          criticalIssues: 1,
          highIssues: 1,
        },
      });
      const xml = ReportGenerator.generateJunitReport(analysis);

      expect(xml).toContain('failures="2"');
    });

    it('should create test cases for each issue', () => {
      const issues = [
        createMockIssue({ title: 'Issue One' }),
        createMockIssue({ title: 'Issue Two' }),
      ];
      const analysis = createMockAnalysis({ issues });
      const xml = ReportGenerator.generateJunitReport(analysis);

      expect(xml).toContain('<testcase');
      expect(xml).toContain('name="Issue One"');
      expect(xml).toContain('name="Issue Two"');
    });

    it('should include failure elements for critical/high issues', () => {
      const issue = createMockIssue({
        severity: {
          level: 'critical',
          impact: 'blocking',
          urgency: 'immediate',
        },
        description: 'Critical failure description',
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const xml = ReportGenerator.generateJunitReport(analysis);

      expect(xml).toContain('<failure');
      expect(xml).toContain('Critical failure description');
    });

    it('should escape XML special characters', () => {
      const issue = createMockIssue({
        title: 'Issue with <special> & "chars"',
      });
      const analysis = createMockAnalysis({ issues: [issue] });
      const xml = ReportGenerator.generateJunitReport(analysis);

      expect(xml).toContain('&lt;special&gt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
    });

    it('should include timestamp', () => {
      const analysis = createMockAnalysis();
      const xml = ReportGenerator.generateJunitReport(analysis);

      expect(xml).toMatch(/timestamp="\d{4}-\d{2}-\d{2}/);
    });
  });

  /* ==================== HELPER METHOD TESTS ==================== */

  describe('Helper Methods', () => {
    it('should color code health scores appropriately', () => {
      // Test through HTML output
      const goodHealth = createMockAnalysis({
        health: { ...createMockAnalysis().health, score: 90 },
      });
      const badHealth = createMockAnalysis({
        health: { ...createMockAnalysis().health, score: 30 },
      });

      const goodHtml = ReportGenerator.generateHTMLReport(goodHealth);
      const badHtml = ReportGenerator.generateHTMLReport(badHealth);

      // Good score should have green color
      expect(goodHtml).toContain('#16a34a');
      // Bad score should have red color
      expect(badHtml).toContain('#dc2626');
    });

    it('should use correct labels for health scores', () => {
      const excellent = createMockAnalysis({
        health: { ...createMockAnalysis().health, score: 90 },
      });
      const poor = createMockAnalysis({
        health: { ...createMockAnalysis().health, score: 30 },
      });

      const excellentMd = ReportGenerator.generateMarkdownReport(excellent);
      const poorMd = ReportGenerator.generateMarkdownReport(poor);

      expect(excellentMd).toContain('PASS');
      expect(poorMd).toContain('FAIL');
    });
  });
});
