export const slugifyTag = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const matchesTagSlug = (value: string, slug: string) =>
  slugifyTag(value) === slugifyTag(slug);
