import { describe, it, expect } from 'vitest';
import { getRelatedCaseStudies } from './related-content';
import type { CollectionEntry } from 'astro:content';

// Helper to create mock case studies
const createCaseStudy = (
  id: string,
  tags: string[],
  date: string
): CollectionEntry<'caseStudies'> => ({
  id,
  body: '',
  collection: 'caseStudies',
  data: {
    title: `Case ${id}`,
    industry: 'Technology',
    summary: 'Summary',
    challenge: 'Challenge',
    solution: 'Solution',
    results: [{ label: 'Metric', value: 'Value' }],
    tags,
    published: new Date(date),
  } as unknown as CollectionEntry<'caseStudies'>['data'],
});

describe('getRelatedCaseStudies', () => {
  const case1 = createCaseStudy('1', ['msp', 'hipaa'], '2023-01-01');
  const case2 = createCaseStudy('2', ['msp'], '2023-01-02');
  const case3 = createCaseStudy('3', ['hipaa'], '2023-01-03');
  const case4 = createCaseStudy('4', ['soc2'], '2023-01-04');
  const all = [case1, case2, case3, case4];

  it('finds related posts by tags', () => {
    const related = getRelatedCaseStudies(case1, all, 2);
    // Should match case2 (msp) and case3 (hipaa)
    const ids = related.map(e => e.id);
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(ids).not.toContain('4');
  });

  it('sorts by relevance (tag count)', () => {
    const main = createCaseStudy('main', ['a', 'b'], '2023-01-01');
    const match2 = createCaseStudy('match2', ['a', 'b'], '2023-01-02');
    const match1 = createCaseStudy('match1', ['a'], '2023-01-03');

    const related = getRelatedCaseStudies(main, [match1, match2]);
    expect(related[0].id).toBe('match2'); // 2 matches
    expect(related[1].id).toBe('match1'); // 1 match
  });

  it('fills with recent posts if not enough related', () => {
    const related = getRelatedCaseStudies(case4, all, 2);
    // case4 has 'soc2', no matches. Should return recent entries (case3, case2)
    expect(related).toHaveLength(2);
    expect(related[0].id).toBe('3'); // Most recent
    expect(related[1].id).toBe('2');
  });
});
