import { defineCollection, z } from 'astro:content';
import type { ImageFunction } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudies = defineCollection({
  loader: glob({
    base: './src/content/case-studies',
    pattern: '**/*.{md,mdx}',
  }),
  schema: ({ image }: { image: ImageFunction }) =>
    z.object({
      title: z.string(),
      industry: z.enum([
        'Healthcare',
        'Financial Services',
        'Manufacturing',
        'Professional Services',
        'Technology',
        'Other',
      ]),
      summary: z.string(),
      // Optional featured image for cards / OG
      heroImage: image().optional(),
      // Challenge / solution / results
      challenge: z.string(),
      solution: z.string(),
      results: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        })
      ),
      // SEO helpers
      tags: z.array(z.string()).default([]),
      published: z.coerce.date().optional(),
    }),
});

const testimonials = defineCollection({
  loader: glob({
    base: './src/content/testimonials',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    company: z.string().optional(),
    quote: z.string(),
    rating: z.number().min(1).max(5).default(5),
    featured: z.boolean().default(false),
  }),
});

export const collections = { caseStudies, testimonials };
