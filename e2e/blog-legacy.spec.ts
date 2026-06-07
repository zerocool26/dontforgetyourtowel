import { test } from '@playwright/test';

const legacyBlogRedirects = [
  {
    from: './blog/first-post/',
    to: /\/blog\/managed-it-provider-first-30-days\/$/,
  },
  {
    from: './blog/second-post/',
    to: /\/blog\/chicago-smb-security-baseline\/$/,
  },
  {
    from: './blog/third-post/',
    to: /\/blog\/microsoft-365-cleanup-business-project\/$/,
  },
  {
    from: './blog/markdown-style-guide/',
    to: /\/blog\/competent-msp-website-signals\/$/,
  },
  {
    from: './blog/using-mdx/',
    to: /\/blog\/client-intake-workflow-review-before-build\/$/,
  },
  {
    from: './blog/ecommerce-demo-review-before-build/',
    to: /\/blog\/client-intake-workflow-review-before-build\/$/,
  },
];

test.describe('Blog legacy starter slugs', () => {
  for (const redirect of legacyBlogRedirects) {
    test(`redirects ${redirect.from} to the production slug`, async ({
      page,
    }) => {
      await page.goto(redirect.from);
      await page.waitForURL(redirect.to);
    });
  }
});
