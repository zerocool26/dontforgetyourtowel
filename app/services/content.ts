import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

interface CaseStudyResult {
  label: string;
  value: string;
}

export interface CaseStudy {
  title: string;
  industry?: string;
  summary?: string;
  results: CaseStudyResult[];
}

export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  company?: string;
  rating?: number;
  featured?: boolean;
}

function extractFrontmatter(content: string): string {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*/);
  return match?.[1] ?? '';
}

function extractField(frontmatter: string, key: string): string | undefined {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match?.[1]) {
    return undefined;
  }
  return match[1].trim().replace(/^"|"$/g, '');
}

function extractResults(frontmatter: string): CaseStudyResult[] {
  const lines = frontmatter.split('\n');
  const results: CaseStudyResult[] = [];
  let index = lines.findIndex(line => line.trim() === 'results:');

  if (index < 0) {
    return results;
  }

  index += 1;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.startsWith('  - ')) {
      break;
    }

    const labelMatch = line.match(/^\s*-\s*label:\s*(.+)$/);
    const valueLine = lines[index + 1] ?? '';
    const valueMatch = valueLine.match(/^\s*value:\s*(.+)$/);

    if (labelMatch?.[1]) {
      results.push({
        label: labelMatch[1].trim().replace(/^"|"$/g, ''),
        value: valueMatch?.[1]?.trim().replace(/^"|"$/g, '') ?? '',
      });
    }

    index += 2;
  }

  return results;
}

async function readCollectionFiles(
  folder: 'case-studies' | 'testimonials'
): Promise<string[]> {
  const directory = path.join(process.cwd(), 'src', 'content', folder);
  const files = await readdir(directory);
  return files.filter(file => file.endsWith('.md')).sort();
}

export async function getFeaturedCaseStudies(limit = 3): Promise<CaseStudy[]> {
  const files = await readCollectionFiles('case-studies');
  const studies = await Promise.all(
    files.map(async file => {
      const filePath = path.join(
        process.cwd(),
        'src',
        'content',
        'case-studies',
        file
      );
      const content = await readFile(filePath, 'utf8');
      const frontmatter = extractFrontmatter(content);

      return {
        title: extractField(frontmatter, 'title') ?? file.replace(/\.md$/, ''),
        industry: extractField(frontmatter, 'industry'),
        summary: extractField(frontmatter, 'summary'),
        results: extractResults(frontmatter),
      };
    })
  );

  return studies.slice(0, limit);
}

export async function getFeaturedTestimonials(
  limit = 6
): Promise<Testimonial[]> {
  const files = await readCollectionFiles('testimonials');
  const testimonials = await Promise.all(
    files.map(async file => {
      const filePath = path.join(
        process.cwd(),
        'src',
        'content',
        'testimonials',
        file
      );
      const content = await readFile(filePath, 'utf8');
      const frontmatter = extractFrontmatter(content);
      const rating = extractField(frontmatter, 'rating');

      return {
        quote: extractField(frontmatter, 'quote') ?? '',
        name: extractField(frontmatter, 'name') ?? file.replace(/\.md$/, ''),
        role: extractField(frontmatter, 'role'),
        company: extractField(frontmatter, 'company'),
        rating: rating ? Number(rating) : undefined,
        featured: extractField(frontmatter, 'featured') === 'true',
      };
    })
  );

  const featured = testimonials.filter(item => item.featured);
  const fallback = testimonials.filter(item => !item.featured);
  return [...featured, ...fallback].slice(0, limit);
}
