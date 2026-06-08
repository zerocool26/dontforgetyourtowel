# Elite Implementation Spec - 2026-06-08

Goal: turn the existing CHICAGOS #1 MSP website from a well-written marketing site into a proprietary-feeling buyer system. This document is the implementation-level detail pass: exact mechanics, data shapes, UI states, motion rules, conversion events, and route-by-route decisions.

This is not a generic redesign brief. It is a build spec for this Astro 6 codebase.

## Expert Sources Applied

- GOV.UK Design System patterns: https://design-system.service.gov.uk/patterns/
- GOV.UK error message guidance: https://design-system.service.gov.uk/components/error-message/
- CMS Design System error validation: https://design.cms.gov/patterns/Forms/error-validation/
- WCAG 2.2 update summary: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- WCAG 2.2 full standard: https://www.w3.org/TR/WCAG22/
- Web.dev Core Web Vitals: https://web.dev/articles/vitals
- Web.dev Interaction to Next Paint: https://web.dev/articles/inp
- Webby Awards judging criteria: https://www.webbyawards.com/judging-criteria/
- Awwwards evaluation criteria: https://www.awwwards.com/about-evaluation/
- NN/g heuristic evaluation workbook: https://media.nngroup.com/media/articles/attachments/Heuristic_Evaluation_Workbook_-_Nielsen_Norman_Group.pdf

## Build Thesis

The site should feel like the MSP has already started organizing the buyer's messy IT problem before asking for a meeting.

Competitors sell:

- Managed IT.
- Cybersecurity.
- Microsoft 365.
- Backup.
- Cloud.
- Support.

This project should show:

- Who owns the issue.
- What evidence exists.
- What is risky.
- What gets reviewed.
- What changes the monthly scope.
- What the first response should contain.
- What happens in the first 30 days.

That shift is the whole design upgrade.

## Experience Name

Use a consistent internal design idea:

`Chicago Operating Proof System`

Do not necessarily put that phrase everywhere in visible copy. Use it to guide naming, routes, components, visual surfaces, and content decisions.

## Sitewide Mechanics

Every important page needs a primary mechanic:

| Route | Primary Mechanic | User Job |
| --- | --- | --- |
| `/` | Operating Proof Board | Understand the MSP's operating difference in one screen |
| `/services/` | Service Diagnostic Board | Pick the right service by symptom |
| `/pricing/` | Scope Ledger | Understand why price changes |
| `/trust-center/` | Trust Evidence Vault | Inspect public-safe proof and security boundaries |
| `/contact-hq/` | Routing Brief | Send useful context without overthinking |
| `/chicago/` | Local Readiness Map | See local operating fit, not SEO filler |
| `/blog/` | Decision Tool Library | Use content as tools, not articles |

Rule: if a route does not have its mechanic visible before the second section, the page still feels generic.

## Data Model Strategy

Add or extend shared data so the same buyer logic appears consistently across pages.

Recommended new data file:

`src/data/operating-proof.ts`

Suggested types:

```ts
export type ProofStatus = 'verified' | 'review' | 'risk' | 'planned';

export type ProofArtifact = {
  id: string;
  label: string;
  title: string;
  buyerQuestion: string;
  publicSignal: string;
  evidence: string[];
  owner: string;
  reviewCadence: string;
  status: ProofStatus;
  route: string;
};

export type ScopeDriver = {
  id: string;
  label: string;
  buyerQuestion: string;
  whyItMovesCost: string;
  recurringImpact: string;
  projectImpact: string;
  discoveryTrigger: string;
  evidenceToBring: string[];
  likelyPlanIds: string[];
};

export type ServiceSymptom = {
  id: string;
  label: string;
  trigger: string;
  firstInspection: string[];
  outputArtifactId: string;
  route: string;
  riskIfIgnored: string;
  bestFirstAction: string;
};
```

Why this matters:

- Homepage, pricing, services, trust, and contact can reference the same artifacts.
- Copy stays consistent.
- The site stops feeling like separate pages and starts feeling like one operating system.

## Visual Language System

Use three surface families:

1. `Command`
   Dark, dense, structured. Used for boards, diagnostics, and routing.

2. `Paper`
   Warm off-white, receipt-like, executive-readable. Used for proof artifacts, summaries, handoff briefs, and downloadable-looking cards.

3. `Vault`
   Calm, restrained, security-aware. Used for trust, evidence, access, and recovery.

Add global utility classes rather than one-off route styles:

```css
.tone-artifact-paper {}
.tone-command-board {}
.tone-vault-surface {}
.tone-status-verified {}
.tone-status-review {}
.tone-status-risk {}
.tone-status-planned {}
.tone-ledger-row {}
.tone-proof-stamp {}
```

Status color rules:

- Verified: teal plus check label.
- Review: amber plus "needs review" label.
- Risk: muted red plus "risk" label.
- Planned: steel/blue-gray plus "planned" label.

Never use color alone. Every status needs visible text.

## Homepage: Operating Proof Board

Replace the current abstract hero board/canvas feeling with a readable board.

### Layout

Desktop:

- Left: H1, one buyer-fit sentence, two CTAs.
- Right: Operating Proof Board.
- Below hero but still near first viewport: one "First review output" paper artifact.

Mobile:

- H1.
- One sentence.
- Primary CTA.
- Secondary CTA.
- Compact proof board with 3 rows visible, not a hidden decorative panel.

### Board Rows

1. Support ownership
   - Signal: "Ticket has owner"
   - Status: verified
   - Evidence: owner map

2. Security baseline
   - Signal: "Admin and MFA review"
   - Status: review
   - Evidence: access ledger

3. Recovery confidence
   - Signal: "Restore proof needed"
   - Status: review
   - Evidence: recovery receipt

4. Microsoft 365 governance
   - Signal: "Guest and sharing check"
   - Status: planned
   - Evidence: governance map

5. Pricing scope
   - Signal: "Recurring vs project split"
   - Status: verified
   - Evidence: scope ledger

### Microcopy

Board header:

- "Operating proof"
- "Example first-review states"

Footer:

- "Output: owners, risks, scope, next decision"

Avoid:

- "Live dashboard"
- "Real-time threat intelligence"
- Any fake metric that implies actual client data.

### Implementation Notes

Prefer DOM/CSS over canvas for the primary proof board so the content is readable, accessible, and indexable. Canvas can remain as a subtle background layer only if it does not carry meaning.

Component:

`src/components/business/OperatingProofBoard.astro`

Props:

- `compact?: boolean`
- `artifacts: ProofArtifact[]`
- `ctaHref?: string`
- `showFirstReview?: boolean`

Accessibility:

- Use real headings and text.
- If a row is interactive, use a link or button with an accessible name.
- Board should make sense with CSS disabled.

## Services: Service Diagnostic Board

The services page should start with symptoms, not service inventory.

### Symptoms

- Recurring tickets.
- Provider switch.
- Security proof.
- Microsoft 365 sprawl.
- Backup doubt.
- Vendor confusion.
- Office move or network drag.
- Internal IT capacity gap.

### Interaction

Tabs or segmented controls:

- Buyer selects a symptom.
- Panel updates with first inspection, output artifact, service route, and risk if ignored.
- CTA changes based on selection.

### Panel Template

```txt
Symptom: Recurring tickets
What it usually means: support is closing issues without reducing recurrence.
First inspection:
- recurring ticket clusters
- affected users and devices
- vendor dependencies
Output artifact: Owner Map
First move: map support lanes and escalation rules
Risk if ignored: the same support drag keeps eating leadership attention.
```

### Implementation Notes

Component:

`src/components/business/ServiceDiagnosticBoard.tsx`

Data:

`serviceSymptoms` in `src/data/operating-proof.ts`

Accessibility:

- `role="tablist"` and `role="tabpanel"` for tabs.
- Arrow-key support if implementing roving tab index.
- Horizontal scroll tabs need visible overflow affordance on mobile.

Performance:

- Do not animate full layout height on every tab change.
- Use fixed/min panel dimensions to protect CLS.

## Pricing: Scope Ledger

Pricing should stop leading like a plan grid and start leading like a scope explanation system.

### Ledger Structure

Rows:

- Users and devices.
- Sites and onsite needs.
- Response hours.
- Security depth.
- Microsoft 365 governance.
- Backup and recovery.
- Servers and line-of-business apps.
- Provider transition.
- Compliance and cyber insurance.
- Projects in next 6 months.

Columns:

- Driver.
- Why it changes cost.
- Usually recurring.
- Usually project.
- Needs discovery.
- Evidence to bring.

### Interaction

Buyer can toggle rows as "applies to us."

Output panel updates:

- Likely plan shape.
- Scope complexity.
- Evidence checklist.
- Recommended next action.

Output language:

- "Likely budget shape"
- "Not a quote"
- "Use this to make discovery sharper"

### Component Details

Component:

`src/components/business/ScopeLedger.tsx`

UI controls:

- Checkbox row toggles.
- Optional segment: "support only", "secure ops", "co-managed", "project-heavy".
- Sticky output panel on desktop.
- Summary panel after ledger on mobile.

Accessibility:

- Each checkbox label includes driver name.
- Summary updates inside `aria-live="polite"`.
- Table needs a mobile card alternative or readable horizontal scroll wrapper with caption.

Telemetry:

- `data-event="scope-driver-toggle"`
- `data-driver-id`
- `data-plan-shape`

## Trust Center: Trust Evidence Vault

The Trust Center should feel like organized proof, not a compliance essay.

### Vault Cards

Categories:

- Backup and recovery.
- Identity and access.
- Endpoint and email.
- Incident coordination.
- Vendor coordination.
- Data handling.
- Review cadence.
- Security boundaries.

Each card:

- Title.
- Buyer question.
- Public-safe signal.
- Evidence discussed in review.
- What stays private.
- Review cadence.
- Status.

Example:

```txt
Backup and recovery
Buyer question: If something fails tomorrow, what can be restored first?
Public-safe signal: backup scope and restore expectations are reviewed during onboarding.
Evidence discussed in review: protected systems, restore access, recovery order, vendor dependencies.
Private boundary: implementation details and sensitive infrastructure paths are not published publicly.
Cadence: onboarding, then recurring review.
```

### Visual Details

- Use folder, receipt, stamp, and ledger metaphors.
- Avoid lock icons as the main visual language.
- Add small "public-safe" tags.
- Add one "private boundary" strip to build trust through restraint.

### Implementation Notes

Component:

`src/components/business/TrustEvidenceVault.astro`

Data:

Extend `src/data/authority-pages.ts` with `trustEvidenceVault`.

## Contact HQ: Routing Brief

The contact form should behave like a guided brief.

### Step 1: Pressure Type

Options:

- Support pain.
- Provider switch.
- Pricing clarity.
- Security proof.
- Microsoft 365 cleanup.
- Backup/recovery confidence.
- Co-managed support.
- Workflow or portal path.

### Step 2: Dynamic Field Set

Show only the most useful fields for that pressure type.

Support pain:

- User count.
- Current provider situation.
- Top recurring issue.
- Urgency.

Provider switch:

- Current contract timing.
- Admin access known/unknown.
- Backup ownership known/unknown.
- Reason for switch.

Security proof:

- Cyber-insurance or compliance pressure.
- MFA status.
- Endpoint/email tools known/unknown.
- Incident concern.

Pricing clarity:

- User/device count.
- Locations.
- Needed coverage hours.
- Known projects.

### Step 3: First Response Preview

Before submit, show:

- Routed lane.
- What the first response should include.
- Missing context that would help.
- Expected artifact.

This is the "not done before" conversion moment. It makes the buyer feel like the MSP is organized before the relationship starts.

### Error Handling

Use adaptive error messages:

- "Enter your work email, like name@company.com."
- "Add the rough number of users. An estimate is fine."
- "Choose the pressure type so the request can be routed."

Do not clear fields after errors.

Success state:

- Show the submitted pressure type.
- Show the likely lane.
- Show what happens next.
- Offer pricing/trust/service links based on the selection.

## Chicago Pages: Local Readiness Map

Local pages need a Chicago-specific operating reason, not just local keywords.

### Local Readiness Map Elements

- Coverage mode: remote, onsite, hybrid.
- Common local pressure: office move, ISP issue, multi-site coordination, regulated office, manufacturing floor, professional office.
- Vendor handoff risk.
- First proof artifact.
- Best first move.

### Service Page Template

1. Hero: service plus symptom.
2. Local Readiness Map.
3. First Inspection.
4. Output Artifact.
5. What generic local MSPs miss.
6. FAQ.
7. Contact CTA.

### Visual Direction

- Use route lines, service zones, and operational map fragments.
- Avoid skyline hero as the main proof.
- Use concrete Chicago business scenarios.

## Blog: Decision Tool Library

The blog should be reshaped around tools.

### Resource Card Fields

- Buyer question.
- Time to use.
- Output.
- Best for.
- Next route.

### Priority Tools

1. Provider Switch Checklist.
2. Backup Confidence Worksheet.
3. Microsoft 365 Sprawl Score.
4. Cyber Insurance Evidence Prep.
5. First 30 Days MSP Transition.
6. MSP Pricing Scope Worksheet.
7. Co-Managed IT Boundary Planner.

### Content Rule

Every resource must answer:

- What decision does this help with?
- What output does the buyer leave with?
- Where should the buyer go next?

If it does not answer those, it is a weak article for this site.

## Navigation Upgrade

Keep navigation simple, but make labels buyer-intent aware.

Recommended primary nav:

- What We Own
- Pricing Logic
- Proof
- Resources
- Start Fit Check

Optional secondary menu:

- By pressure.
- By artifact.
- By buyer role.

Buyer pressure links:

- Recurring support pain.
- Provider switch.
- Security proof.
- Backup doubt.
- Microsoft 365 sprawl.
- Pricing clarity.

Artifact links:

- Owner Map.
- Recovery Receipt.
- Access Ledger.
- Scope Ledger.
- Evidence Vault.
- Routing Brief.

## Copy Density Rules

Use these hard caps during implementation.

Homepage:

- Hero subcopy: 28 words max.
- Board row: 6 words max for signal.
- First review artifact: 5 fields max.
- No homepage section body over 70 words.

Services:

- Symptom panel summary: 35 words max.
- First inspection: 3 bullets.
- Risk if ignored: 18 words max.
- Service detail hidden behind disclosure when longer than 90 words.

Pricing:

- Plan card description: 28 words max.
- Driver explanation: 22 words max.
- FAQ answer: 70 words max.

Trust Center:

- Vault card body: 40 visible words max.
- Private boundary: 1 sentence.
- Practices can expand behind disclosure.

Contact:

- Above-form intro: 25 words max.
- Field helper text: 14 words max.
- Error messages: one plain sentence.

## Button And CTA Language

Primary CTA by page:

- Home: Start fit check.
- Services: Find first lane.
- Pricing: Send scope context.
- Trust: Review proof posture.
- Contact: Send intake.
- Chicago pages: Start local fit check.
- Resources: Use checklist.

Secondary CTA by page:

- Home: See pricing logic.
- Services: Compare pricing.
- Pricing: View proof.
- Trust: Start fit check.
- Contact: See pricing logic.

Avoid:

- Learn more.
- Get started.
- Contact us.
- Book now.
- Request consultation.

Use only when context makes it specific:

- Open scope.
- View proof.
- Compare plans.
- Send pressure point.
- Copy brief.
- Download approval brief.

## Microinteraction Rules

Use microinteractions to confirm action, not entertain.

Examples:

- Scope driver toggle updates plan shape.
- Evidence checklist increases readiness meter.
- Trust vault card opens with public/private split.
- Contact pressure selector updates field set.
- Copy brief button changes to "Brief copied."

Rules:

- State changes under 250ms.
- No bouncing.
- No spinning loaders for instant UI changes.
- Use skeletons only for async data, not static components.
- Respect `prefers-reduced-motion`.

## Accessibility Checklist For New Components

For every new interactive component:

- Can it be used by keyboard only?
- Is focus visible and not covered by sticky header?
- Does the active state have text, not just color?
- Are controls at least 44px tall?
- Are form fields labeled outside placeholders?
- Are errors tied to inputs with `aria-describedby`?
- Does dynamic output use `aria-live` where helpful?
- Does the component make sense at 390px width?
- Does reduced motion remove nonessential animation?
- Does the component avoid layout shift after interaction?

## Performance Budget

Do:

- Prefer Astro static components for artifact sections.
- Use Preact only for actual stateful tools.
- Use `client:visible` for below-fold interactive tools.
- Keep homepage hero meaningful without JS.
- Reserve canvas/WebGL for nonessential background only.

Targets:

- LCP: under 2.5s.
- INP: under 200ms.
- CLS: under 0.1.
- Hero JS: not required for primary content.
- No heavy 3D on default homepage.

Implementation risk:

- Current global CSS includes legacy glow, gradient, and animated utilities. Future visual cleanup should remove or quarantine unused decorative classes so the system feels intentional.

## Analytics Events

Add consistent `data-*` hooks:

```txt
data-event="hero-primary-cta"
data-event="proof-artifact-open"
data-event="service-symptom-select"
data-event="scope-driver-toggle"
data-event="scope-summary-copy"
data-event="trust-vault-open"
data-event="pressure-type-select"
data-event="routing-brief-copy"
data-event="contact-intake-submit"
data-event="decision-tool-open"
```

Why:

- The site should know which buyer pressures are driving interest.
- The design can improve based on behavior, not opinions.

## SEO And Structured Data

Keep SEO practical:

- Service pages should keep `Service` structured data.
- Pricing should keep FAQ schema.
- Trust Center should include organization/service context without overclaiming certifications.
- Resource tools can use Article/FAQ where appropriate, but avoid bloated schema.

Search intent emphasis:

- "managed IT services Chicago"
- "Chicago MSP pricing"
- "switch MSP checklist"
- "Microsoft 365 cleanup Chicago"
- "cyber insurance evidence MSP"
- "backup recovery proof MSP"
- "co-managed IT Chicago"

But the page content should still read like buyer help, not keyword stuffing.

## Route Cut List

Homepage:

- Cut hidden service walls.
- Cut extra CTA links above fold.
- Replace abstract board with readable proof board.
- Keep only one strong final CTA band.

Services:

- Cut duplicate "what we do" card grids.
- Move catalog lower.
- Put diagnostic board first.
- Keep workbench only if it complements the diagnostic board.

Pricing:

- Move plan cards after scope ledger.
- Reduce plan card copy.
- Make quote prep contextual to selected drivers.

Trust Center:

- Add vault before practice cards.
- Reduce practice card bullet density.
- Add public/private proof boundary.

Contact HQ:

- Make pressure selector first.
- Collapse advanced context.
- Add first response preview.

Chicago pages:

- Replace generic local intro with local operating scenario.
- Add readiness map.
- Reduce repeated suburb/service boilerplate.

Blog:

- Move from chronological feel to tool library feel.
- Pin decision tools before posts.

## Component Build Order

1. `OperatingProofBoard.astro`
   - Fastest visible improvement to homepage.
   - Static, accessible, high brand impact.

2. `ScopeLedger.tsx`
   - Highest buyer trust impact.
   - Differentiates from competitors immediately.

3. `TrustEvidenceVault.astro`
   - Makes proof concrete.
   - Fixes thinnest major route.

4. `ServiceDiagnosticBoard.tsx`
   - Reduces services-page overwhelm.
   - Gives services a signature mechanic.

5. `ContactRoutingBrief.tsx`
   - Turns conversion into a premium service experience.

6. `LocalReadinessMap.astro`
   - Turns SEO pages into local proof pages.

7. `DecisionToolCard.astro`
   - Makes resources feel useful and intentional.

## Acceptance Criteria

The redesign is successful when:

- A buyer understands the MSP's difference in 10 seconds.
- The homepage shows proof without requiring a scroll.
- Pricing explains scope before asking for discovery.
- Services starts with buyer symptoms, not service categories.
- Trust Center shows public-safe evidence and private boundaries.
- Contact feels like a routed brief, not a generic form.
- Chicago pages feel local through operating scenarios, not tourist imagery.
- Every major page has one unmistakable mechanic.
- Visible copy is shorter, but the site is more useful.

## Expert-Level Differentiators To Build

These are the ideas competitors are unlikely to have:

1. First Response Preview
   Before submit, the contact page shows what the first qualified reply should include.

2. Public/Private Trust Boundary
   Trust Center explicitly states what can be shared publicly and what should stay private.

3. Scope Ledger
   Pricing explains cost drivers with recurring/project/discovery boundaries.

4. Provider Switch Risk Timeline
   Shows access, backups, vendors, users, devices, contracts, and cutover risk.

5. Operating Proof Board
   Homepage shows support, security, recovery, M365, and pricing as connected operating lanes.

6. Local Readiness Map
   Chicago pages show coverage mode and operational scenarios instead of local SEO filler.

7. Decision Tool Library
   Blog/resources become worksheets and checklists tied to next actions.

8. Evidence Receipt Pattern
   Every claim gets an artifact: owner map, access ledger, recovery receipt, scope ledger, or vault card.

## Final Design Principle

The site should not ask the visitor to believe the MSP is better.

It should let the visitor inspect why.
