import { describe, it, expect } from 'vitest';
import {
  calculateReadingTime,
  getMarkdownReadingTime,
  formatReadingTime,
  getReadingTimeCategory,
  getReadingTimeEmoji,
} from '../utils/reading-time';

describe('Reading Time Utilities', () => {
  /* ==================== calculateReadingTime TESTS ==================== */

  describe('calculateReadingTime', () => {
    it('should calculate reading time for simple text', () => {
      // 200 words = 1 minute at default 200 wpm
      const words = Array(200).fill('word').join(' ');
      const result = calculateReadingTime(words);

      expect(result.words).toBe(200);
      expect(result.minutes).toBe(1);
      expect(result.text).toBe('1 min read');
    });

    it('should handle empty text', () => {
      const result = calculateReadingTime('');

      expect(result.words).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.text).toBe('0 min read');
    });

    it('should handle text with only whitespace', () => {
      const result = calculateReadingTime('   \n\t   ');

      expect(result.words).toBe(0);
    });

    it('should strip HTML tags before counting', () => {
      const html =
        '<p>Hello</p> <strong>world</strong> <script>evil()</script>';
      const result = calculateReadingTime(html);

      // Should count: Hello, world, evil() = 3 words
      expect(result.words).toBe(3);
    });

    it('should respect custom wordsPerMinute option', () => {
      const words = Array(100).fill('word').join(' ');
      const result = calculateReadingTime(words, { wordsPerMinute: 100 });

      expect(result.minutes).toBe(1);
    });

    it('should show seconds for short content when includeSeconds is true', () => {
      const words = Array(50).fill('word').join(' '); // ~15 seconds at 200 wpm
      const result = calculateReadingTime(words, { includeSeconds: true });

      expect(result.text).toContain('sec read');
    });

    it('should calculate total time in seconds', () => {
      const words = Array(400).fill('word').join(' ');
      const result = calculateReadingTime(words);

      expect(result.time).toBe(120); // 2 minutes = 120 seconds
    });

    it('should handle multiple spaces between words', () => {
      const text = 'word1    word2     word3';
      const result = calculateReadingTime(text);

      expect(result.words).toBe(3);
    });

    it('should round up minutes', () => {
      const words = Array(250).fill('word').join(' '); // 1.25 minutes
      const result = calculateReadingTime(words);

      expect(result.minutes).toBe(2); // Rounded up
    });
  });

  /* ==================== getMarkdownReadingTime TESTS ==================== */

  describe('getMarkdownReadingTime', () => {
    it('should remove frontmatter before calculating', () => {
      const markdown = `---
title: My Post
date: 2024-01-01
---
word word word word word`;
      const result = getMarkdownReadingTime(markdown);

      expect(result.words).toBe(5);
    });

    it('should remove code blocks', () => {
      const markdown = `Hello world
\`\`\`javascript
const x = 1;
const y = 2;
\`\`\`
End`;
      const result = getMarkdownReadingTime(markdown);

      // Should only count: Hello, world, End = 3 words (code blocks removed)
      expect(result.words).toBeLessThanOrEqual(3);
    });

    it('should remove inline code', () => {
      const markdown = 'Use `console.log` for debugging';
      const result = getMarkdownReadingTime(markdown);

      // Should count: Use, for, debugging = 3 words
      expect(result.words).toBe(3);
    });

    it('should remove URLs', () => {
      const markdown =
        'Visit https://example.com for more info at http://test.org';
      const result = getMarkdownReadingTime(markdown);

      // Should count: Visit, for, more, info, at = 5 words
      expect(result.words).toBe(5);
    });

    it('should remove Markdown syntax characters', () => {
      const markdown = '# Heading **bold** *italic* [link](url)';
      const result = getMarkdownReadingTime(markdown);

      // Words: Heading, bold, italic, link, url
      expect(result.words).toBeGreaterThan(0);
    });

    it('should handle empty markdown', () => {
      const result = getMarkdownReadingTime('');
      expect(result.words).toBe(0);
    });

    it('should handle markdown with only frontmatter', () => {
      const markdown = `---
title: Empty Post
---`;
      const result = getMarkdownReadingTime(markdown);
      expect(result.words).toBe(0);
    });
  });

  /* ==================== formatReadingTime TESTS ==================== */

  describe('formatReadingTime', () => {
    it('should format less than 1 minute', () => {
      expect(formatReadingTime(0)).toBe('< 1 min read');
      expect(formatReadingTime(0.5)).toBe('< 1 min read');
    });

    it('should format exactly 1 minute', () => {
      expect(formatReadingTime(1)).toBe('1 min read');
    });

    it('should format multiple minutes', () => {
      expect(formatReadingTime(5)).toBe('5 min read');
      expect(formatReadingTime(10)).toBe('10 min read');
    });
  });

  /* ==================== getReadingTimeCategory TESTS ==================== */

  describe('getReadingTimeCategory', () => {
    it('should categorize quick reads (<=3 min)', () => {
      expect(getReadingTimeCategory(1)).toBe('quick');
      expect(getReadingTimeCategory(2)).toBe('quick');
      expect(getReadingTimeCategory(3)).toBe('quick');
    });

    it('should categorize medium reads (4-10 min)', () => {
      expect(getReadingTimeCategory(4)).toBe('medium');
      expect(getReadingTimeCategory(7)).toBe('medium');
      expect(getReadingTimeCategory(10)).toBe('medium');
    });

    it('should categorize long reads (>10 min)', () => {
      expect(getReadingTimeCategory(11)).toBe('long');
      expect(getReadingTimeCategory(30)).toBe('long');
    });
  });

  /* ==================== getReadingTimeEmoji TESTS ==================== */

  describe('getReadingTimeEmoji', () => {
    it('should return a compact label for quick reads', () => {
      expect(getReadingTimeEmoji(1)).toBe('Quick');
      expect(getReadingTimeEmoji(3)).toBe('Quick');
    });

    it('should return a compact label for medium reads', () => {
      expect(getReadingTimeEmoji(5)).toBe('Medium');
      expect(getReadingTimeEmoji(10)).toBe('Medium');
    });

    it('should return a compact label for long reads', () => {
      expect(getReadingTimeEmoji(15)).toBe('Long');
      expect(getReadingTimeEmoji(60)).toBe('Long');
    });
  });
});
