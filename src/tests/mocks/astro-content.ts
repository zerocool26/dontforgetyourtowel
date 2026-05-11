import { z } from 'zod';

const blogEntries = [
  {
    id: 'provider-transition-checklist',
    slug: 'provider-transition-checklist',
    collection: 'blog',
    data: {
      title: 'Provider transition checklist',
      description:
        'A practical checklist for changing managed IT providers without losing ownership of access, backup, or support history.',
      pubDate: new Date('2026-02-12T12:00:00.000Z'),
      draft: false,
      tags: ['managed-it', 'provider-transition'],
    },
  },
  {
    id: 'draft-security-note',
    slug: 'draft-security-note',
    collection: 'blog',
    data: {
      title: 'Draft security note',
      description: 'Draft content should not appear in generated feeds.',
      pubDate: new Date('2026-01-10T12:00:00.000Z'),
      draft: true,
      tags: ['security'],
    },
  },
];

export const getCollection = async (collection: string) => {
  if (collection === 'blog') return blogEntries;
  return [];
};

export const render = async () => ({
  Content: () => null,
  headings: [],
  remarkPluginFrontmatter: {},
});

export const defineCollection = (config: unknown) => config;

export { z };
