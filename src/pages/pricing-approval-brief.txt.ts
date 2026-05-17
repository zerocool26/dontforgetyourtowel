import type { APIRoute } from 'astro';

const brief = `Olive Chicago pricing approval brief

Use this short brief when leadership needs a plain-language reason to approve managed IT or security coverage.

What the budget covers
- Named ownership for support, security, Microsoft 365, backup, vendors, and escalation
- Monthly reporting and roadmap review instead of reactive ticket churn
- Clear package boundaries with project work scoped separately when needed

What changes the number
- User and device count
- Response targets and coverage expectations
- Security depth, backup requirements, and compliance pressure
- Internal IT involvement and co-managed boundaries
- Known projects, migrations, or office changes

What to ask during review
- Which operational risks are already costing time or trust?
- Which systems need clearer ownership this quarter?
- What response or reporting standard does leadership expect?
- Which items belong in recurring coverage versus project scope?

Next step
Start intake at /contact-hq/ with user count, device count, current provider context, and the main pressure point.`;

export const GET: APIRoute = () =>
  new Response(brief, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
