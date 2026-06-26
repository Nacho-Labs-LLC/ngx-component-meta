import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseArgs, printHelp } from '../../src/cli/options.js';

describe('cli/options', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseArgs', () => {
    describe('extract (default command)', () => {
      it('should parse default options', () => {
        const result = parseArgs([]);
        expect(result.command).toBe('extract');
        expect(result.files).toEqual([]);
        expect(result.format).toBe('json');
        expect(result.help).toBe(false);
        expect(result.project).toBeUndefined();
        expect(result.output).toBeUndefined();
        expect(result.split).toBe(false);
        expect(result.watch).toBe(false);
        expect(result.noMethods).toBe(false);
        expect(result.noInherited).toBe(false);
        expect(result.version).toBe(false);
        // pretty depends on process.stdout.isTTY, so we just check it's a boolean
        expect(typeof (result as any).pretty).toBe('boolean');
      });

      it('should parse long flags', () => {
        const result = parseArgs([
          '--project', 'tsconfig.json',
          '--output', 'out.json',
          '--format', 'compodoc',
          '--pretty',
          '--split',
          '--watch',
          '--no-methods',
          '--no-inherited',
          '--version',
          '--help',
          'src/app.ts',
          'src/comp.ts'
        ]);

        expect(result).toEqual({
          command: 'extract',
          files: ['src/app.ts', 'src/comp.ts'],
          project: 'tsconfig.json',
          output: 'out.json',
          format: 'compodoc',
          pretty: true,
          split: true,
          watch: true,
          noMethods: true,
          noInherited: true,
          version: true,
          help: true
        });
      });

      it('should parse short flags', () => {
        const result = parseArgs([
          '-p', 'tsconfig.json',
          '-o', 'out.json',
          '-f', 'markdown',
          '-w',
          '-h',
          'src/app.ts'
        ]);

        expect(result.project).toBe('tsconfig.json');
        expect(result.output).toBe('out.json');
        expect(result.format).toBe('markdown');
        expect((result as any).watch).toBe(true);
        expect(result.help).toBe(true);
        expect((result as any).files).toEqual(['src/app.ts']);
      });
    });

    describe('diff command', () => {
      it('should parse diff defaults', () => {
        const result = parseArgs(['diff']);
        expect(result.command).toBe('diff');
        expect(result.format).toBe('text');
        expect((result as any).base).toBe('');
      });

      it('should parse diff options', () => {
        const result = parseArgs([
          'diff',
          '--base', 'base.json',
          '--head', 'head.json',
          '-p', 'tsconfig.json',
          '-o', 'out.json',
          '-f', 'json',
          '--no-methods',
          '--no-inherited',
          '-h',
          '--version'
        ]);

        expect(result).toEqual({
          command: 'diff',
          base: 'base.json',
          head: 'head.json',
          project: 'tsconfig.json',
          output: 'out.json',
          format: 'json',
          noMethods: true,
          noInherited: true,
          help: true,
          version: true
        });
      });
    });

    describe('lint command', () => {
      it('should parse lint defaults', () => {
        const result = parseArgs(['lint']);
        expect(result.command).toBe('lint');
        expect(result.format).toBe('stylish');
        expect((result as any).files).toEqual([]);
      });

      it('should parse lint options', () => {
        const result = parseArgs([
          'lint',
          '-p', 'tsconfig.json',
          '-o', 'out.txt',
          '-f', 'json',
          '--no-methods',
          '--no-inherited',
          '-h',
          '--version',
          'src/**/*.ts'
        ]);

        expect(result).toEqual({
          command: 'lint',
          files: ['src/**/*.ts'],
          project: 'tsconfig.json',
          output: 'out.txt',
          format: 'json',
          noMethods: true,
          noInherited: true,
          help: true,
          version: true
        });
      });
    });

    describe('stats command', () => {
      it('should parse stats defaults', () => {
        const result = parseArgs(['stats']);
        expect(result.command).toBe('stats');
        expect(result.format).toBe('text');
        expect((result as any).files).toEqual([]);
      });

      it('should parse stats options', () => {
        const result = parseArgs([
          'stats',
          '-p', 'tsconfig.json',
          '-o', 'out.md',
          '-f', 'markdown',
          '--no-methods',
          '--no-inherited',
          '-h',
          '--version',
          'src/**/*.ts'
        ]);

        expect(result).toEqual({
          command: 'stats',
          files: ['src/**/*.ts'],
          project: 'tsconfig.json',
          output: 'out.md',
          format: 'markdown',
          noMethods: true,
          noInherited: true,
          help: true,
          version: true
        });
      });
    });
  });

  describe('printHelp', () => {
    it('should log help text to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printHelp();
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('ngx-component-meta - Angular component API toolkit');
      expect(output).toContain('Usage:');
      expect(output).toContain('Options:'); // Wait, does it contain Options? Let's check in code
      // Actually, just check a few keywords
      expect(output).toContain('ngx-component-meta [options] <glob|files...>');
    });
  });
});
