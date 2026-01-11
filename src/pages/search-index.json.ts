import { getCollection } from 'astro:content';
import { withBasePath } from '../utils/helpers';

export async function GET() {
  const caseStudies = await getCollection('caseStudies');

  const caseStudyItems = caseStudies.map(entry => ({
    id: `case-${entry.id}`,
    title: entry.data.title,
    description: entry.data.summary,
    category: 'Case Study',
    url: withBasePath('services/#case-studies'),
    date: (entry.data.published ?? new Date()).toISOString(),
    tags: ['case-study', entry.data.industry, ...entry.data.tags],
  }));

  const staticPages = [
    {
      id: 'page-home',
      title: 'Home',
      description: 'Enterprise IT solutions that scale with your business',
      category: 'Page',
      url: withBasePath('/'),
      tags: ['home', 'landing'],
    },
    {
      id: 'page-about',
      title: 'About Us',
      description: 'Company story, leadership, and certifications',
      category: 'Page',
      url: withBasePath('about/'),
      tags: ['about', 'team'],
    },
    {
      id: 'page-services',
      title: 'Services',
      description: 'Managed IT, cybersecurity, cloud, and AI consulting',
      category: 'Page',
      url: withBasePath('services/'),
      tags: ['services', 'msp', 'security', 'cloud', 'ai'],
    },
    {
      id: 'page-pricing',
      title: 'Pricing',
      description: 'Transparent tiers and calculators for planning',
      category: 'Page',
      url: withBasePath('pricing/'),
      tags: ['pricing', 'tiers', 'calculator'],
    },
  ].map(page => ({
    ...page,
    date: new Date().toISOString(),
  }));

  const searchItems = [...caseStudyItems, ...staticPages];

  return new Response(JSON.stringify(searchItems), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
