/**
 * Search Utilities Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  fuzzyMatch,
  fuzzySearch,
  fuzzySearchObjects,
  fuzzySearchMultiKey,
  SearchIndex,
  createSearchIndex,
  highlightTerms,
  extractSnippet,
  calculateRelevance,
  suggestQueries,
} from './search';

describe('Search Utilities', () => {
  describe('fuzzyMatch', () => {
    it('should match exact strings', () => {
      const result = fuzzyMatch('hello', 'hello');
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThan(0);
    });

    it('should match with case insensitivity by default', () => {
      const result = fuzzyMatch('HELLO', 'hello');
      expect(result).not.toBeNull();
    });

    it('should match with case sensitivity when specified', () => {
      const result = fuzzyMatch('HELLO', 'hello', { caseSensitive: true });
      expect(result).toBeNull();
    });

    it('should match partial strings', () => {
      const result = fuzzyMatch('hlo', 'hello');
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThan(0);
      expect(result!.score).toBeLessThan(1);
    });

    it('should return matched indices', () => {
      const result = fuzzyMatch('hlo', 'hello');
      expect(result).not.toBeNull();
      expect(result!.matches).toContain(0);
      expect(result!.matches).toContain(2);
      expect(result!.matches).toContain(4);
    });

    it('should not match when pattern is longer than text', () => {
      const result = fuzzyMatch('hello world', 'hello');
      expect(result).toBeNull();
    });

    it('should handle empty query', () => {
      const result = fuzzyMatch('', 'hello');
      expect(result).not.toBeNull();
      expect(result!.score).toBe(1);
    });

    it('should not match empty target', () => {
      const result = fuzzyMatch('hello', '');
      expect(result).toBeNull();
    });

    it('should prefer consecutive matches', () => {
      const result1 = fuzzyMatch('hel', 'hello');
      const result2 = fuzzyMatch('hlo', 'hello');
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1!.score).toBeGreaterThan(result2!.score);
    });

    it('should respect minimum score threshold', () => {
      const result = fuzzyMatch('xyz', 'hello', { threshold: 0.5 });
      expect(result).toBeNull();
    });

    it('should provide highlighted result', () => {
      const result = fuzzyMatch('hel', 'hello');
      expect(result).not.toBeNull();
      expect(result!.highlighted).toContain('<mark>');
    });

    it('should use custom highlight markers', () => {
      const result = fuzzyMatch('hel', 'hello', {
        highlightMarkers: ['[', ']'],
      });
      expect(result).not.toBeNull();
      expect(result!.highlighted).toContain('[');
      expect(result!.highlighted).toContain(']');
    });
  });

  describe('fuzzySearch', () => {
    const items = ['apple', 'banana', 'apricot', 'cherry', 'grape'];

    it('should search and return sorted results', () => {
      const results = fuzzySearch('ap', items);
      // 'ap' matches: apple (strong), apricot (strong), grape (weak - contains 'ap')
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].item).toBe('apple'); // Highest score for starting match
    });

    it('should return all matches when no query filter', () => {
      const results = fuzzySearch('', items);
      expect(results.length).toBe(5);
    });

    it('should limit results', () => {
      const results = fuzzySearch('a', items, { limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should sort by score by default', () => {
      const results = fuzzySearch('ban', items);
      expect(results[0].item).toBe('banana');
    });

    it('should not sort when disabled', () => {
      const results = fuzzySearch('a', items, { sort: false });
      // First result should be 'apple' (first item starting with 'a')
      expect(results[0].item).toBe('apple');
    });
  });

  describe('fuzzySearchObjects', () => {
    const items = [
      { id: 1, name: 'John Smith' },
      { id: 2, name: 'Jane Doe' },
      { id: 3, name: 'Bob Johnson' },
    ];

    it('should search objects by specified key', () => {
      const results = fuzzySearchObjects('john', items, 'name');
      expect(results.length).toBe(2);
    });

    it('should return full objects', () => {
      const results = fuzzySearchObjects('john', items, 'name');
      expect(results.length).toBeGreaterThanOrEqual(1);
      // original property contains the full object
      expect(results[0].original).toHaveProperty('id');
      expect(results[0].original).toHaveProperty('name');
    });

    it('should respect threshold', () => {
      const results = fuzzySearchObjects('xyz', items, 'name', {
        threshold: 0.5,
      });
      expect(results.length).toBe(0);
    });
  });

  describe('fuzzySearchMultiKey', () => {
    const items = [
      {
        title: 'JavaScript Guide',
        author: 'John',
        tags: ['js', 'programming'],
      },
      { title: 'Python Basics', author: 'Jane', tags: ['python', 'beginner'] },
      {
        title: 'TypeScript Deep Dive',
        author: 'Bob',
        tags: ['ts', 'advanced'],
      },
    ];

    it('should search across multiple keys', () => {
      const results = fuzzySearchMultiKey('java', items, ['title', 'author']);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find matches in any specified key', () => {
      const results = fuzzySearchMultiKey('john', items, ['title', 'author']);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('SearchIndex', () => {
    let index: SearchIndex<Record<string, unknown>>;

    beforeEach(() => {
      index = new SearchIndex<Record<string, unknown>>({
        fields: ['title', 'content'],
      });

      index.add(1, {
        id: 1,
        title: 'Hello World',
        content: 'This is a test document',
      });
      index.add(2, {
        id: 2,
        title: 'JavaScript Guide',
        content: 'Learn JavaScript programming',
      });
      index.add(3, {
        id: 3,
        title: 'TypeScript Tutorial',
        content: 'TypeScript is typed JavaScript',
      });
    });

    it('should search indexed documents', () => {
      const results = index.search('javascript');
      expect(results.length).toBe(2);
    });

    it('should return results with scores', () => {
      const results = index.search('hello');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('doc');
    });

    it('should limit results', () => {
      const results = index.search('javascript', { limit: 1 });
      expect(results.length).toBe(1);
    });

    it('should handle empty query', () => {
      const results = index.search('');
      expect(results.length).toBe(0);
    });

    it('should remove documents', () => {
      index.remove(1);
      const results = index.search('hello');
      expect(results.length).toBe(0);
    });

    it('should clear index', () => {
      index.clear();
      const results = index.search('javascript');
      expect(results.length).toBe(0);
    });

    it('should report document count', () => {
      expect(index.size).toBe(3);
    });

    it('should get document by id', () => {
      const doc = index.get(1);
      expect(doc).toBeDefined();
      expect(doc!.title).toBe('Hello World');
    });

    it('should get all documents', () => {
      const docs = index.getAll();
      expect(docs.length).toBe(3);
    });
  });

  describe('createSearchIndex', () => {
    it('should create index with options', () => {
      const index = createSearchIndex<Record<string, unknown>>({
        fields: ['name'],
      });
      expect(index).toBeInstanceOf(SearchIndex);
    });

    it('should allow adding documents', () => {
      const index = createSearchIndex<Record<string, unknown>>({
        fields: ['name'],
      });
      index.add(1, { id: 1, name: 'Test' });
      expect(index.size).toBe(1);
    });
  });

  describe('highlightTerms', () => {
    it('should highlight matching terms', () => {
      const result = highlightTerms('Hello World', 'world');
      expect(result).toContain('<mark>');
      expect(result).toContain('World');
    });

    it('should use custom markers', () => {
      const result = highlightTerms('Hello World', 'world', ['<b>', '</b>']);
      expect(result).toContain('<b>');
      expect(result).toContain('</b>');
    });

    it('should highlight multiple occurrences', () => {
      const result = highlightTerms('hello hello hello', 'hello');
      const matches = result.match(/<mark>/g);
      expect(matches).toHaveLength(3);
    });

    it('should be case insensitive', () => {
      const result = highlightTerms('Hello HELLO hello', 'hello');
      const matches = result.match(/<mark>/g);
      expect(matches).toHaveLength(3);
    });
  });

  describe('extractSnippet', () => {
    const longText =
      'Managed IT support, cybersecurity readiness, Microsoft 365 governance, and backup testing help teams reduce recurring operational drag.';

    it('should extract snippet around match', () => {
      const snippet = extractSnippet(longText, 'support', {
        maxLength: 50,
      });
      expect(snippet).toContain('support');
      expect(snippet.length).toBeLessThanOrEqual(80); // Including ellipsis and highlight tags
    });

    it('should add ellipsis when truncated', () => {
      const snippet = extractSnippet(longText, 'Microsoft', {
        maxLength: 30,
      });
      expect(snippet).toContain('...');
    });

    it('should return beginning if no match', () => {
      const snippet = extractSnippet(longText, 'xyz', { maxLength: 20 });
      expect(snippet).toContain('Managed');
      expect(snippet).toContain('...');
    });

    it('should handle short text', () => {
      const snippet = extractSnippet('short', 'short', { maxLength: 100 });
      // Should contain 'short' with highlighting
      expect(snippet).toContain('short');
    });
  });

  describe('calculateRelevance', () => {
    it('should return high score for exact match', () => {
      const score = calculateRelevance('hello', 'hello');
      expect(score).toBeGreaterThan(0.8);
    });

    it('should return lower score for partial match', () => {
      // Query has multiple words, only some match
      const score = calculateRelevance(
        'hello world xyz',
        'hello world how are you'
      );
      expect(score).toBeLessThan(1);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for no match', () => {
      const score = calculateRelevance('xyz', 'hello');
      expect(score).toBe(0);
    });

    it('should be case insensitive', () => {
      const score1 = calculateRelevance('HELLO', 'hello');
      const score2 = calculateRelevance('hello', 'hello');
      expect(score1).toBe(score2);
    });
  });

  describe('suggestQueries', () => {
    let index: SearchIndex<Record<string, unknown>>;

    beforeEach(() => {
      index = new SearchIndex<Record<string, unknown>>({ fields: ['title'] });
      index.add(1, { id: 1, title: 'JavaScript' });
      index.add(2, { id: 2, title: 'TypeScript' });
      index.add(3, { id: 3, title: 'Python' });
    });

    it('should suggest completions', () => {
      const suggestions = suggestQueries('Java', index);
      expect(suggestions).toContain('JavaScript');
    });

    it('should limit suggestions', () => {
      const suggestions = suggestQueries('t', index, 1);
      expect(suggestions.length).toBeLessThanOrEqual(1);
    });

    it('should return empty for no matches', () => {
      const suggestions = suggestQueries('xyz', index);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('fuzzyMatch should handle special characters', () => {
      const result = fuzzyMatch('c++', 'C++ Programming');
      expect(result).not.toBeNull();
    });

    it('fuzzyMatch should handle unicode', () => {
      const result = fuzzyMatch('日本', '日本語');
      expect(result).not.toBeNull();
    });

    it('fuzzySearch should handle empty array', () => {
      const results = fuzzySearch('test', []);
      expect(results).toEqual([]);
    });

    it('SearchIndex should handle documents with missing fields', () => {
      const index = new SearchIndex<Record<string, unknown>>({
        fields: ['title'],
      });
      index.add(1, { id: 1 });
      index.add(2, { id: 2, title: 'Test' });
      const results = index.search('test');
      expect(results.length).toBe(1);
    });
  });
});
