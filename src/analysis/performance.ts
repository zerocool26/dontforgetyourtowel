import type {
  AnalysisModule,
  CodeIssue,
  AnalyzerConfig,
} from '../types/analysis';
import { executeCommand } from '../utils/command-executor';
import { AnalysisError, CommandExecutionError } from '../errors';
import { logger } from '../utils/logger';
import { isPackageLifecycleEvent } from '../utils/lifecycle';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

export class PerformanceAnalyzer implements AnalysisModule {
  name = 'PerformanceAnalyzer';

  private static stripAnsi(text: string): string {
    // Basic ANSI escape sequence stripping (colors, cursor moves, etc.).
    // Note: avoid regex literals with control escapes to satisfy ESLint no-control-regex.
    const ansiRe = new RegExp(
      '[\\u001B\\u009B][[\\]\\()#;?]*(?:' +
        '(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?' +
        '[0-9A-ORZcf-nqry=><~])',
      'g'
    );
    return text.replace(ansiRe, '');
  }

  private static parseViteAssetSizes(output: string): Array<{
    file: string;
    bytes: number;
    gzipBytes?: number;
  }> {
    const entries: Array<{ file: string; bytes: number; gzipBytes?: number }> =
      [];

    // Vite typically prints lines like:
    // dist/_astro/app.BLAH.js                41.12 kB │ gzip: 13.30 kB
    // Some terminals may alter spacing; keep matching loose.
    const re =
      /(^|\n)\s*(?:\d{2}:\d{2}:\d{2}\s+\[vite\]\s+)?(?<file>dist[\\/][^\s]+)\s+(?<size>\d+(?:\.\d+)?)\s*(?<unit>kB|MB)\b(?:\s*\|\s*gzip:\s*(?<gzip>\d+(?:\.\d+)?)\s*(?<gzipUnit>kB|MB))?/gm;

    const toBytes = (value: number, unit: string): number =>
      unit === 'MB' ? value * 1024 * 1024 : value * 1024;

    let match: RegExpExecArray | null;
    while ((match = re.exec(output))) {
      const groups = match.groups as
        | {
            file?: string;
            size?: string;
            unit?: string;
            gzip?: string;
            gzipUnit?: string;
          }
        | undefined;

      const file = groups?.file;
      const size = groups?.size;
      const unit = groups?.unit;
      if (!file || !size || !unit) continue;

      const value = Number(size);
      if (!Number.isFinite(value)) continue;

      const entry: { file: string; bytes: number; gzipBytes?: number } = {
        file,
        bytes: toBytes(value, unit),
      };

      const gzip = groups?.gzip;
      const gzipUnit = groups?.gzipUnit;
      if (gzip && gzipUnit) {
        const gzipValue = Number(gzip);
        if (Number.isFinite(gzipValue)) {
          entry.gzipBytes = toBytes(gzipValue, gzipUnit);
        }
      }

      entries.push(entry);
    }

    return entries;
  }

  canAnalyze(config: AnalyzerConfig): boolean {
    return config.enabledAnalyzers.includes('performance');
  }

  async analyze(config: AnalyzerConfig): Promise<CodeIssue[]> {
    logger.info('Checking performance issues...');
    const issues: CodeIssue[] = [];

    try {
      if (isPackageLifecycleEvent('build')) {
        logger.info('Skipping performance checks during build lifecycle');
        return issues;
      }

      const skipBundleCheck = this.shouldSkipBundleCheck(config);
      const tasks: Array<Promise<void>> = [
        this.checkImageOptimization(config, issues),
        this.checkLazyLoading(config, issues),
      ];

      if (!skipBundleCheck) {
        tasks.push(this.checkBundleSize(config, issues));
      } else {
        logger.debug('Skipping bundle size check due to environment/config');
      }

      await Promise.allSettled(tasks);
    } catch (error: unknown) {
      const analysisError =
        error instanceof AnalysisError
          ? error
          : new AnalysisError(
              this.name,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.warn(`Performance analysis failed: ${analysisError.message}`, {
        error: analysisError,
      });
    }
    return issues;
  }

  /**
   * Check for unoptimized images
   */
  private async checkImageOptimization(
    config: AnalyzerConfig,
    issues: CodeIssue[]
  ): Promise<void> {
    try {
      // Find all image files
      const imageFiles = await glob('**/*.{png,jpg,jpeg,gif,bmp}', {
        cwd: config.projectRoot,
        ignore: ['node_modules/**', 'dist/**', '.astro/**', ...config.ignore],
        absolute: true,
      });

      for (const imagePath of imageFiles) {
        try {
          const stats = await fs.stat(imagePath);
          const sizeInKB = stats.size / 1024;

          // Flag images larger than 200KB
          if (sizeInKB > 200) {
            issues.push({
              id: `perf-image-${Date.now()}-${Math.random()}`,
              type: 'performance',
              severity: {
                level: sizeInKB > 500 ? 'high' : 'medium',
                impact: 'minor',
                urgency: 'medium',
              },
              title: 'Large Image File',
              description: `Image is ${Math.round(sizeInKB)}KB. Consider compressing or converting to WebP/AVIF.`,
              file: path.relative(config.projectRoot, imagePath),
              rule: 'image-optimization',
              category: 'Performance',
              source: 'image-analyzer',
              suggestion:
                'Use WebP/AVIF format, compress with tools like squoosh.app, or use Astro Image component',
              autoFixable: false,
            });
          }
        } catch {
          // Skip files that can't be stat'd
        }
      }
    } catch (error) {
      logger.debug('Image optimization check encountered an error', { error });
    }
  }

  /**
   * Check for missing lazy loading on images
   */
  private async checkLazyLoading(
    config: AnalyzerConfig,
    issues: CodeIssue[]
  ): Promise<void> {
    try {
      const htmlFiles = await glob('**/*.{astro,html,tsx,jsx}', {
        cwd: config.projectRoot,
        ignore: ['node_modules/**', 'dist/**', '.astro/**', ...config.ignore],
        absolute: true,
      });

      for (const filePath of htmlFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for img tags without loading="lazy" (exclude small icons and above-the-fold images)
            if (
              /<img[^>]+src=/i.test(line) &&
              !/loading=["']lazy["']/i.test(line)
            ) {
              // Skip if it's clearly an icon or small image
              if (/icon|logo|avatar|favicon/i.test(line)) continue;
              // Skip if it already has loading attribute
              if (/loading=["']/i.test(line)) continue;

              issues.push({
                id: `perf-lazy-${Date.now()}-${Math.random()}`,
                type: 'performance',
                severity: { level: 'low', impact: 'minor', urgency: 'low' },
                title: 'Image Missing Lazy Loading',
                description:
                  'Consider adding loading="lazy" to defer off-screen images.',
                file: path.relative(config.projectRoot, filePath),
                line: i + 1,
                rule: 'lazy-loading',
                category: 'Performance',
                source: 'performance-analyzer',
                suggestion:
                  'Add loading="lazy" attribute to images below the fold',
                autoFixable: true,
                context: {
                  current: line,
                },
              });
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch (error) {
      logger.debug('Lazy loading check encountered an error', { error });
    }
  }

  private async checkBundleSize(
    config: AnalyzerConfig,
    issues: CodeIssue[]
  ): Promise<void> {
    try {
      if (this.shouldSkipBundleCheck(config)) {
        logger.debug('Skipping bundle size check in CI/test/watch context');
        return;
      }

      const { stdout, stderr } = await executeCommand(
        'bunx astro build --dry-run',
        {
          cwd: config.projectRoot,
          ignoreExitCode: true,
          retries: 1,
          retryDelay: 500,
        }
      );

      const output = PerformanceAnalyzer.stripAnsi(`${stdout}\n${stderr}`);

      // If Astro/Vite provides an explicit warning, respect it.
      if (output.includes('Large bundle detected')) {
        issues.push({
          id: `bundle-size-${Date.now()}`,
          type: 'performance',
          severity: {
            level: 'medium',
            impact: 'minor',
            urgency: 'medium',
          },
          title: 'Large Bundle Size Detected',
          description:
            'The application bundle size may impact loading performance',
          file: 'build-output',
          rule: 'bundle-size',
          category: 'Performance',
          source: 'bundle-analyzer',
          suggestion:
            'Consider code splitting, tree shaking, or removing unused dependencies',
          autoFixable: false,
          context: {
            current: 'Build analysis suggests large bundle size',
          },
        });

        return;
      }

      // Prefer parsing the Vite asset table rather than relying on output length.
      const assets = PerformanceAnalyzer.parseViteAssetSizes(output);
      if (assets.length === 0) {
        logger.debug(
          'Bundle size check found no Vite asset size entries; skipping warning'
        );
        return;
      }

      const jsAssets = assets.filter(entry =>
        /\.(mjs|js|cjs)$/i.test(entry.file)
      );
      const cssAssets = assets.filter(entry => /\.css$/i.test(entry.file));

      // Thresholds (raw sizes) – conservative defaults to avoid false positives.
      const MAX_SINGLE_JS_KB = 350;
      const MAX_TOTAL_JS_KB = 2000;
      const MAX_SINGLE_CSS_KB = 250;

      const maxBy = <T>(items: T[], get: (item: T) => number): T | null => {
        let best: T | null = null;
        let bestValue = -Infinity;
        for (const item of items) {
          const value = get(item);
          if (value > bestValue) {
            bestValue = value;
            best = item;
          }
        }
        return best;
      };

      const jsTotalBytes = jsAssets.reduce(
        (sum, entry) => sum + entry.bytes,
        0
      );
      const largestJs = maxBy(jsAssets, entry => entry.bytes);
      const largestCss = maxBy(cssAssets, entry => entry.bytes);

      const largestJsKb = largestJs ? largestJs.bytes / 1024 : 0;
      const jsTotalKb = jsTotalBytes / 1024;
      const largestCssKb = largestCss ? largestCss.bytes / 1024 : 0;

      const isLarge =
        (largestJs && largestJsKb > MAX_SINGLE_JS_KB) ||
        jsTotalKb > MAX_TOTAL_JS_KB ||
        (largestCss && largestCssKb > MAX_SINGLE_CSS_KB);

      if (isLarge) {
        issues.push({
          id: `bundle-size-${Date.now()}`,
          type: 'performance',
          severity: {
            level: 'medium',
            impact: 'minor',
            urgency: 'medium',
          },
          title: 'Large Bundle Size Detected',
          description:
            'The application bundle size may impact loading performance',
          file: 'build-output',
          rule: 'bundle-size',
          category: 'Performance',
          source: 'bundle-analyzer',
          suggestion:
            'Consider code splitting, tree shaking, or removing unused dependencies',
          autoFixable: false,
          context: {
            current: `largestJs=${largestJs ? `${largestJs.file} (${largestJsKb.toFixed(1)} kB)` : 'n/a'}, jsTotal=${jsTotalKb.toFixed(1)} kB, largestCss=${largestCss ? `${largestCss.file} (${largestCssKb.toFixed(1)} kB)` : 'n/a'}`,
          },
        });
      }
    } catch (error: unknown) {
      const analysisError =
        error instanceof CommandExecutionError
          ? new AnalysisError(
              this.name,
              error,
              `Failed to run bundle size check: ${error.message}`
            )
          : new AnalysisError(
              this.name,
              error instanceof Error ? error : new Error(String(error))
            );
      logger.warn(`Bundle size check failed: ${analysisError.message}`, {
        error: analysisError,
      });
    }
  }

  private shouldSkipBundleCheck(config: AnalyzerConfig): boolean {
    if (process.env.CI === 'true') {
      return true;
    }

    if (isPackageLifecycleEvent('test')) {
      return true;
    }

    if (config.watchMode) {
      return true;
    }

    if (
      process.env.PERF_LIGHT === 'true' ||
      process.env.PERFORMANCE_LIGHT === 'true'
    ) {
      return true;
    }

    return false;
  }
}
