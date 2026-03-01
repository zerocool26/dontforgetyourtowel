import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs/promises';
import path from 'path';
import { slugify } from '../src/utils/string';

const CASE_STUDY_DIR = path.join(process.cwd(), 'src', 'data', 'case-studies');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');

const ensureDir = async (dir: string) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

interface CaseStudyArgs {
  title: string;
  industry?: string;
  summary?: string;
  challenge?: string;
  solution?: string;
  tags?: string;
}

interface ComponentArgs {
  name: string;
  type: 'astro' | 'react' | 'solid';
}

const createCaseStudy = async (argv: unknown) => {
  const { title, industry, summary, challenge, solution, tags } =
    argv as CaseStudyArgs;
  const slug = slugify(title);
  const date = new Date().toISOString();
  const fileName = `${slug}.md`;
  const filePath = path.join(CASE_STUDY_DIR, fileName);

  const content = `---
title: "${title}"
industry: "${industry || 'Other'}"
summary: "${summary || 'Outcome-focused transformation summary'}"
challenge: "${challenge || 'Document the core operational or technical challenge.'}"
solution: "${solution || 'Describe the implemented architecture and delivery approach.'}"
results:
  - label: "Lead metric"
    value: "TBD"
tags: ${JSON.stringify(tags ? tags.split(',') : [])}
published: ${date}
---

# ${title}

## Background

Add project background and business context.

## Implementation

Describe architecture, execution, and rollout details.

## Outcomes

Document measurable results and learnings.
`;

  await ensureDir(CASE_STUDY_DIR);
  await fs.writeFile(filePath, content);
  console.log(`✅ Created new case study: ${filePath}`);
};

const createComponent = async (argv: unknown) => {
  const { name, type } = argv as ComponentArgs;
  const fileName = `${name}.${type === 'react' ? 'tsx' : type === 'solid' ? 'tsx' : 'astro'}`;

  let dir = COMPONENTS_DIR;
  if (type === 'solid') {
    dir = path.join(COMPONENTS_DIR, 'solid');
  } else if (type === 'react') {
    // React components often go in components/ directly or a subfolder, let's put them in components/ for now or check if there is a react folder.
    // The file structure showed `src/components/CommandPalette.tsx` directly in components.
  }

  const filePath = path.join(dir, fileName);

  let content = '';
  if (type === 'astro') {
    content = `---
interface Props {
  title?: string;
}

const { title } = Astro.props;
---

<div class="${name.toLowerCase()}">
  <h2>{title}</h2>
  <slot />
</div>

<style>
  .${name.toLowerCase()} {
    /* styles */
  }
</style>
`;
  } else if (type === 'react') {
    content = `import React from 'react';

interface ${name}Props {
  children?: React.ReactNode;
}

export const ${name}: React.FC<${name}Props> = ({ children }) => {
  return (
    <div className="${name.toLowerCase()}">
      {children}
    </div>
  );
};
`;
  } else if (type === 'solid') {
    content = `import { Component, JSX } from 'solid-js';

interface ${name}Props {
  children?: JSX.Element;
}

const ${name}: Component<${name}Props> = (props) => {
  return (
    <div class="${name.toLowerCase()}">
      {props.children}
    </div>
  );
};

export default ${name};
`;
  }

  await ensureDir(dir);
  await fs.writeFile(filePath, content);
  console.log(`✅ Created new component: ${filePath}`);
};

yargs(hideBin(process.argv))
  .command(
    'post <title>',
    '[Deprecated] Blog is retired; use `case-study <title>` instead',
    yargs => {
      return yargs
        .positional('title', {
          describe: 'Post title',
          type: 'string',
        })
        .option('author', {
          alias: 'a',
          type: 'string',
          description: 'Author ID',
        })
        .option('description', {
          alias: 'd',
          type: 'string',
          description: 'Post description',
        })
        .option('tags', {
          alias: 't',
          type: 'string',
          description: 'Comma-separated tags',
        });
    },
    async argv => {
      console.warn(
        '⚠️ Blog scaffolding is deprecated. Creating a case study scaffold instead.'
      );
      await createCaseStudy(argv);
    }
  )
  .command(
    'case-study <title>',
    'Create a new case study',
    yargs => {
      return yargs
        .positional('title', {
          describe: 'Case study title',
          type: 'string',
        })
        .option('industry', {
          alias: 'i',
          type: 'string',
          description: 'Industry (e.g. Technology, Healthcare)',
        })
        .option('summary', {
          alias: 's',
          type: 'string',
          description: 'One-line case study summary',
        })
        .option('challenge', {
          alias: 'c',
          type: 'string',
          description: 'Primary challenge statement',
        })
        .option('solution', {
          type: 'string',
          description: 'Implemented solution statement',
        })
        .option('tags', {
          alias: 't',
          type: 'string',
          description: 'Comma-separated tags',
        });
    },
    createCaseStudy
  )
  .command(
    'component <name>',
    'Create a new component',
    yargs => {
      return yargs
        .positional('name', {
          describe: 'Component name',
          type: 'string',
        })
        .option('type', {
          alias: 't',
          type: 'string',
          choices: ['astro', 'react', 'solid'],
          default: 'astro',
          description: 'Component type',
        });
    },
    createComponent
  )
  .demandCommand(1)
  .parse();
