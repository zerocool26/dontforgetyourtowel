import type { CollectionEntry } from 'astro:content';

/**
 * Get related case studies based on shared tags.
 */
export function getRelatedCaseStudies(
  currentEntry: CollectionEntry<'caseStudies'>,
  allEntries: CollectionEntry<'caseStudies'>[],
  limit = 3
): CollectionEntry<'caseStudies'>[] {
  const currentTags = new Set(currentEntry.data.tags || []);

  const byMostRecent = (
    a: CollectionEntry<'caseStudies'>,
    b: CollectionEntry<'caseStudies'>
  ) => {
    const aDate = a.data.published?.valueOf?.() ?? 0;
    const bDate = b.data.published?.valueOf?.() ?? 0;
    return bDate - aDate;
  };

  if (currentTags.size === 0) {
    return allEntries
      .filter(entry => entry.id !== currentEntry.id)
      .sort(byMostRecent)
      .slice(0, limit);
  }

  const scored = allEntries
    .filter(entry => entry.id !== currentEntry.id)
    .map(entry => {
      const tags = entry.data.tags || [];
      const shared = tags.filter(tag => currentTags.has(tag));
      return { entry, score: shared.length };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return byMostRecent(a.entry, b.entry);
    });

  const related = scored.map(item => item.entry);

  if (related.length < limit) {
    const existingIds = new Set([currentEntry.id, ...related.map(e => e.id)]);
    const remainingNeeded = limit - related.length;

    const fill = allEntries
      .filter(entry => !existingIds.has(entry.id))
      .sort(byMostRecent)
      .slice(0, remainingNeeded);

    return [...related, ...fill];
  }

  return related.slice(0, limit);
}

/**
 * Get related blog posts based on shared tags.
 *
 * Scoring rules:
 * - Prefer posts with more shared tags.
 * - Tie-break by most recent (updatedDate, then pubDate).
 * - If there aren't enough tag matches, fill with most recent posts.
 */
export function getRelatedBlogPosts(
  currentEntry: CollectionEntry<'blog'>,
  allEntries: CollectionEntry<'blog'>[],
  limit = 3
): CollectionEntry<'blog'>[] {
  const currentTags = new Set(currentEntry.data.tags || []);

  const byMostRecent = (
    a: CollectionEntry<'blog'>,
    b: CollectionEntry<'blog'>
  ) => {
    const aDate = (a.data.updatedDate ?? a.data.pubDate)?.valueOf?.() ?? 0;
    const bDate = (b.data.updatedDate ?? b.data.pubDate)?.valueOf?.() ?? 0;
    return bDate - aDate;
  };

  if (currentTags.size === 0) {
    return allEntries
      .filter(entry => entry.id !== currentEntry.id)
      .sort(byMostRecent)
      .slice(0, limit);
  }

  const scored = allEntries
    .filter(entry => entry.id !== currentEntry.id)
    .map(entry => {
      const tags = entry.data.tags || [];
      const shared = tags.filter(tag => currentTags.has(tag));
      return { entry, score: shared.length };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return byMostRecent(a.entry, b.entry);
    });

  const related = scored.map(item => item.entry);

  if (related.length < limit) {
    const existingIds = new Set([currentEntry.id, ...related.map(e => e.id)]);
    const remainingNeeded = limit - related.length;

    const fill = allEntries
      .filter(entry => !existingIds.has(entry.id))
      .sort(byMostRecent)
      .slice(0, remainingNeeded);

    return [...related, ...fill];
  }

  return related.slice(0, limit);
}
