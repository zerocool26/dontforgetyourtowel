import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigLoader } from '../config/config-loader';
import { AnalyzerConfigSchema } from '../config/schema';
import { ConfigurationError } from '../errors';
import type { AnalyzerConfig } from '../config/schema';

const createFsError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

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

describe('Configuration System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AnalyzerConfigSchema', () => {
    it('should validate complete valid configuration', () => {
      const validConfig = {
        projectRoot: '/test/project',
        ignore: ['node_modules', 'dist'],
        include: ['**/*.{ts,tsx,js,jsx}'],
        frameworks: ['react', 'vue'],
        enabledAnalyzers: ['syntax', 'types', 'security'],
        severityThreshold: 'medium' as const,
        outputFormat: 'json' as const,
        githubIntegration: true,
        deploymentChecks: false,
        autoFix: true,
        watchMode: false,
        enableCache: true,
        concurrencyLimit: 4,
      };

      const result = AnalyzerConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values for missing fields', () => {
      const minimalConfig = {};
      const result = AnalyzerConfigSchema.parse(minimalConfig);

      expect(result.projectRoot).toBe(process.cwd());
      expect(result.ignore).toEqual([
        'node_modules',
        '.git',
        'dist',
        'build',
        '.astro',
        'src/utils',
      ]);
      expect(result.include).toEqual([
        '**/*.{ts,tsx,js,jsx,astro,vue,svelte,md,mdx}',
      ]);
      expect(result.frameworks).toEqual([
        'astro',
        'react',
        'vue',
        'svelte',
        'solid',
        'preact',
      ]);
      expect(result.enabledAnalyzers).toEqual([
        'syntax',
        'types',
        'security',
        'performance',
        'accessibility',
        'git',
        'deployment',
      ]);
      expect(result.severityThreshold).toBe('low');
      expect(result.outputFormat).toBe('terminal');
      expect(result.githubIntegration).toBe(true);
      expect(result.deploymentChecks).toBe(true);
      expect(result.autoFix).toBe(false);
      expect(result.watchMode).toBe(false);
    });

    it('should reject invalid severity threshold', () => {
      const invalidConfig = {
        severityThreshold:
          'invalid' as unknown as AnalyzerConfig['severityThreshold'],
      };

      expect(() => AnalyzerConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid output format', () => {
      const invalidConfig = {
        outputFormat: 'invalid' as unknown as AnalyzerConfig['outputFormat'],
      };

      expect(() => AnalyzerConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should validate array fields correctly', () => {
      const configWithArrays = {
        ignore: ['node_modules', 'dist'],
        include: ['src/**/*.ts'],
        frameworks: ['react'],
        enabledAnalyzers: ['syntax', 'types'],
      };

      const result = AnalyzerConfigSchema.parse(configWithArrays);
      expect(result.ignore).toEqual(['node_modules', 'dist']);
      expect(result.include).toEqual(['src/**/*.ts']);
      expect(result.frameworks).toEqual(['react']);
      expect(result.enabledAnalyzers).toEqual(['syntax', 'types']);
    });
  });

  describe('ConfigLoader', () => {
    it('should load configuration with CLI options only', async () => {
      const cliOptions: Partial<AnalyzerConfig> = {
        projectRoot: '/custom/path',
        severityThreshold: 'critical',
        outputFormat: 'json',
      };

      const missingFileReader = async () => {
        throw createFsError('ENOENT', 'not found');
      };

      const result = await ConfigLoader.loadConfig(
        cliOptions,
        missingFileReader
      );

      expect(result.projectRoot).toBe('/custom/path');
      expect(result.severityThreshold).toBe('critical');
      expect(result.outputFormat).toBe('json');
      // Should still have defaults for other values
      expect(result.githubIntegration).toBe(true);
    });

    it('should merge file configuration with CLI options', async () => {
      const fileConfig = {
        severityThreshold: 'high',
        githubIntegration: false,
        ignore: ['custom-ignore'],
      };

      const cliOptions: Partial<AnalyzerConfig> = {
        severityThreshold: 'critical', // Should override file config
        outputFormat: 'html',
      };

      const readFile = async () => JSON.stringify(fileConfig);

      const result = await ConfigLoader.loadConfig(cliOptions, readFile);

      expect(result.severityThreshold).toBe('critical'); // CLI wins
      expect(result.outputFormat).toBe('html'); // From CLI
      expect(result.githubIntegration).toBe(false); // From file
      expect(result.ignore).toEqual(['custom-ignore']); // From file
    });

    it('should handle invalid JSON in config file', async () => {
      const invalidReader = async () => '{ invalid json }';

      await expect(ConfigLoader.loadConfig({}, invalidReader)).rejects.toThrow(
        ConfigurationError
      );
    });

    it('should handle file read errors gracefully', async () => {
      const permissionDenied = async () => {
        throw createFsError('EACCES', 'Permission denied');
      };

      await expect(
        ConfigLoader.loadConfig({}, permissionDenied)
      ).rejects.toThrow(ConfigurationError);
    });

    it('should validate merged configuration', async () => {
      const invalidOptions = {
        severityThreshold:
          'invalid' as unknown as AnalyzerConfig['severityThreshold'],
      };

      await expect(
        ConfigLoader.loadConfig(invalidOptions, async () => {
          throw createFsError('ENOENT', 'not found');
        })
      ).rejects.toThrow(ConfigurationError);
    });
  });

  describe('Configuration Validation Edge Cases', () => {
    it('should handle empty arrays in configuration', () => {
      const configWithEmptyArrays = {
        ignore: [],
        include: [],
        frameworks: [],
        enabledAnalyzers: [],
      };

      const result = AnalyzerConfigSchema.parse(configWithEmptyArrays);
      expect(result.ignore).toEqual([]);
      expect(result.include).toEqual([]);
      expect(result.frameworks).toEqual([]);
      expect(result.enabledAnalyzers).toEqual([]);
    });

    it('should handle boolean edge cases', () => {
      const booleanConfig = {
        githubIntegration: false,
        deploymentChecks: false,
        autoFix: false,
        watchMode: false,
        enableCache: false,
      };

      const result = AnalyzerConfigSchema.parse(booleanConfig);
      expect(result.githubIntegration).toBe(false);
      expect(result.deploymentChecks).toBe(false);
      expect(result.autoFix).toBe(false);
      expect(result.watchMode).toBe(false);
    });

    it('should reject non-string array elements', () => {
      const invalidConfig = {
        ignore: ['valid', 123 as unknown as string, 'also-valid'],
      };

      expect(() => AnalyzerConfigSchema.parse(invalidConfig)).toThrow();
    });
  });
});
