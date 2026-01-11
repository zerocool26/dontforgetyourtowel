import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { withBasePath } from '../utils/helpers';

export const prerender = true;

export async function GET(context) {
  const caseStudies = await getCollection('caseStudies');

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: caseStudies.map(entry => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.published ?? new Date(),
      // Case studies are presented on the Services page in this site.
      link: new URL(withBasePath('services/#case-studies'), context.site).href,
    })),
  });
}
