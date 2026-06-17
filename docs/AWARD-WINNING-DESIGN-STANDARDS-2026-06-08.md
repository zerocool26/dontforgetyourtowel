# Award-Winning Website Design Standards - 2026-06-08

Last updated: 2026-06-17

Status: finished research synthesis and redesign standard for CHICAGOS #1 MSP. Code implementation remains a separate pass.

This document is the finished creative brief for refreshing the project across the board. "Finished" here means the research direction, creative rules, page mechanics, development features, anti-patterns, and implementation roadmap are now decided enough for designers, humans, and future agents to build from without re-opening the same strategic debate.

The core correction is simple: the site should stop feeling like a service catalog wearing an AI/cyber costume. It should feel like a calm, useful, high-trust operating room for Chicago businesses that need support ownership, cybersecurity proof, Microsoft 365 cleanup, backup confidence, vendor coordination, and cleaner next steps.

The goal is not to make the website louder. The goal is to make it more designed, more human, more inspectable, and more useful before a sales conversation.

## Finished Decisions

- The site is not an AI-first brand. AI may appear only as governed workflow support, never as generic sparkle copy, mascot language, or futuristic decoration.
- The site is not a maximal service brochure. Services must be revealed through buyer pressure, first checks, output artifacts, and proof.
- The site should feel like a real corporation, but not a stiff enterprise template. The mood is organized, local, confident, and quietly creative.
- The primary design metaphor is an IT operating proof system: ledgers, receipts, maps, routing briefs, evidence vaults, timelines, and decision tools.
- Each major route needs one signature mechanic instead of repeating hero, cards, grid, FAQ, CTA.
- Visible copy should shrink. Information value should increase.
- The best conversion path is useful before it is salesy: choose pressure, inspect proof, understand scope, send a routed brief.
- The homepage, services, pricing, trust center, contact, local pages, and resources should all feel like parts of one operating system.
- Accessibility, performance, reduced motion, and content hierarchy are premium design requirements, not cleanup tasks.

## Research Base

### Award And Craft Sources

- Webby Judging Criteria: https://www.webbyawards.com/judging-criteria/
  - Useful takeaway: award-grade digital work is judged across content, structure, visual design, functionality, interactivity, overall experience, innovation, craft, and brand fit. Webby also states that AI should solve real problems and be applied with integrity.
- Webby Websites and Mobile Sites 2026: https://winners.webbyawards.com/winners/websites-and-mobile-sites
  - Useful takeaway: modern winning sites span accessibility, usability, culture, commerce, visual design, and functionality. The category is not only about spectacle.
- Awwwards Evaluation System: https://www.awwwards.com/about-evaluation/
  - Useful takeaway: Awwwards weights design, usability, creativity, and content. This project should not chase animation at the expense of comprehension.
- CSS Design Awards: https://www.cssdesignawards.com/about
  - Useful takeaway: UI, UX, and innovation are evaluated together. Originality in both design and code matters.
- D&AD Digital Experience Design: https://www.dandad.org/awards/d-ad-awards/categories/digital-experience-design
  - Useful takeaway: D&AD prioritizes execution over idea and looks at end-to-end service journey, ease of use, visual design, accessibility, service design, digital products, data visualization, motion, and AI/technology.
- Cannes Lions Digital Craft: https://www.canneslions.com/awards/lions/digital-craft
  - Useful takeaway: craft is execution and experience. The technical surface should make the brand feel more useful, not heavier.
- Apple Writing for Interfaces: https://developer.apple.com/videos/play/wwdc2022/10037/
  - Useful takeaway: words are part of design. Every screen should have a purpose, anticipate the next question, respect context, and use simple inclusive language.
- Google Making Motion Meaningful: https://design.google/library/making-motion-meaningful
  - Useful takeaway: motion should guide users, communicate outcomes, and reduce complexity rather than decorate every moment.

### B2B Buyer And UX Sources

- Gartner 2026 B2B buyer survey: https://www.gartner.com/en/newsroom/press-releases/2026-03-09-gartner-sales-survey-finds-67-percent-of-b2b-buyers-prefer-a-rep-free-experience
  - Useful takeaway: 67% of B2B buyers prefer a rep-free experience, so the site must help buyers self-educate without feeling abandoned.
- NN/g B2B Website Usability: https://www.nngroup.com/reports/b2b-websites-usability/
  - Useful takeaway: B2B sites need to support long, complex buying processes, comparisons, shortlists, pricing scenarios, proof, service pages, and contact paths.
- Baymard B2B UX Research: https://baymard.com/research/business-to-business
  - Useful takeaway: B2B UX benefits from evidence-based navigation, comparison, product/service detail, and decision support.
- Baymard Homepage and Category Navigation UX 2025: https://baymard.com/blog/ecommerce-navigation-best-practice
  - Useful takeaway: many large sites still perform poorly on navigation. A clear route by buyer pressure can be a competitive advantage.
- Baymard Search UX 2026: https://baymard.com/blog/ecommerce-search-query-types
  - Useful takeaway: users split between search and navigation. Resource and service discovery should support both exact intent and guided browsing.
- NN/g AI Trust: https://www.nngroup.com/articles/smarts-emotion-trust-ai/
  - Useful takeaway: people trust AI more when it appears capable, factual, and useful rather than emotional or sentient. This directly supports removing vague AI personality from the site.

### Quality And Accessibility Sources

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
  - Useful takeaway: focus visibility, target sizing, drag alternatives, consistent help, redundant entry, accessible authentication, labels, and status updates all affect perceived polish.
- Google Web Vitals: https://web.dev/articles/vitals
  - Useful takeaway: good Core Web Vitals targets remain LCP at or under 2.5s, INP at or under 200ms, and CLS at or under 0.1.

### Project Research Already Incorporated

- `docs/PROJECT-DESIGN-AUDIT-2026-06-07.md`
- `docs/MSP-COMPETITIVE-DESIGN-AUDIT-2026-06-07.md`
- `docs/ELITE-DESIGN-RESEARCH-2026-06-08.md`
- `docs/PROJECT-SPECIFIC-EXPERT-DESIGN-PLAYBOOK-2026-06-08.md`
- `docs/CONVERSION-REDESIGN-RESEARCH-2026-06-07.md`
- `docs/AI-DEVELOPMENT-GUIDE.md`

## Current Diagnosis

The site has the right strategic raw material, but the presentation still risks three problems:

1. Too much AI smell.
   Abstract glow, futuristic language, "intelligence" framing, and generic generated-interface patterns can make the company feel like it is chasing a trend instead of owning the buyer's problem.

2. Too much service pressure.
   MSP buyers already assume the provider has managed IT, cybersecurity, cloud, backup, and Microsoft 365. Repeating services too early feels like pushing inventory. The site should first prove how the company thinks and what changes for the buyer.

3. Too much information at once.
   Dense cards, long grids, and repeated CTAs make the site feel busy. Better design means fewer visible objects, stronger hierarchy, and more useful progressive disclosure.

The upgraded experience should create this feeling:

- "They understand my operational mess."
- "They are serious without trying too hard."
- "I can see how they would organize this."
- "I know what I can do next without being trapped in a sales funnel."

## Creative Thesis

### From Service Catalog To Decision Room

The refreshed site should behave like a premium decision room for Chicago business IT. A visitor should enter with pressure and leave with clarity:

- What is likely wrong.
- What gets checked first.
- What proof should exist.
- What the scope probably looks like.
- What happens after they reach out.

The site can still sell managed IT, cybersecurity, Microsoft 365, backup, cloud, networking, and digital workflow work. It should sell them through buyer situations and proof artifacts, not through a wall of service tiles.

### Three Design Words

- Calm: enough space, limited competing actions, clear hierarchy, no panic-cyber tone.
- Exact: specific artifacts, named outputs, crisp labels, practical proof.
- Alive: subtle interaction, human language, local texture, motion that explains state.

### What "Creative" Means Here

Creative does not mean random layouts, AI gradients, or decorative complexity. Creative means inventing a better buying experience for an MSP:

- A pricing page that explains scope instead of hiding behind "contact sales."
- A trust page that acts like an evidence vault instead of a compliance essay.
- A contact page that builds a routing brief instead of asking for a generic message.
- A services page that starts with symptoms, not categories.
- A homepage that shows operational ownership, not a generic technology promise.

## Brand Experience Standard

### The Mood

Use "Chicago operations studio" as the art direction:

- Professional enough for owners, CFOs, internal IT, and compliance-minded buyers.
- Human enough to avoid enterprise coldness.
- Local enough to feel grounded, without skyline cliches.
- Technical enough to prove competence, without hacker visuals.
- Warm enough to make outreach feel safe.

### The Visual World

Use real operational surfaces as the recurring design language:

- Receipts.
- Ledgers.
- Evidence folders.
- Routing cards.
- Review stamps.
- Local readiness maps.
- Vendor owner maps.
- First-response briefs.
- Restore order lists.
- Scope drivers.
- Timelines.
- Comparison slips.

Avoid generic technology decoration:

- No glowing networks.
- No abstract shield/lock wallpaper.
- No dark purple AI gradients.
- No random bento widgets.
- No fake chatbots above the fold.
- No dashboard chrome that does not help the buyer decide.

### The Palette

Recommended semantic roles:

- Civic ink: near-black graphite for authority and contrast.
- Cloud paper: warm off-white for receipts, ledgers, briefs, and evidence objects.
- Steel: blue-gray for structure, dividers, and local infrastructure cues.
- Verified green: used sparingly for confirmed/protected/complete states.
- Review amber: used for needs-review states, not decoration.
- Risk red: only for actual risk, exception, or missing proof.
- Lake blue: restrained accent for maps, links, and secondary information.
- Human warmth: small use of warm neutral for testimonial, quote, and handoff moments.

Rules:

- Do not make the site one-note dark.
- Do not make every panel glassy.
- Do not use color alone to indicate status.
- Use warm paper surfaces to interrupt dark operational sections.
- Let white or near-white space exist. Premium design needs breathing room.

### Typography

Use typography like a serious product and editorial brand:

- Display type only for heroes and route-level moments.
- Smaller, tighter headings inside panels, ledgers, cards, and tools.
- Body copy should be readable, calm, and short.
- Metadata can use mono sparingly for receipts, timestamps, review cadence, IDs, and scope labels.
- Letter spacing should be 0 for normal headings.
- Avoid all-caps blocks except tiny operational labels.
- No giant headline inside dense panels.

### Imagery

The site needs better visual assets, but not stock filler.

Use:

- Real team/process photography where possible.
- Cropped local texture: office doors, rack labels, conference-room notes, service-area fragments, fiber/ISP handoff context, street-level details, receipts, workbench objects.
- Public-safe screenshots or redacted artifacts.
- Custom generated bitmap assets only when they depict project-specific artifacts clearly.
- Human proof: client quote context, industry situation, before/after operational state.

Avoid:

- Stock people pointing at laptops.
- Abstract cybersecurity icons as the main visual.
- Skylines as the only Chicago signal.
- AI robot imagery.
- Dark blurred hero photos that hide the subject.
- Decorative SVG scenes where a real or generated artifact would be stronger.

## Content And Copy Rules

### The Main Rule

Every visible block must answer one buyer question:

- Is this for me?
- What pressure does this solve?
- What happens first?
- What proof should I expect?
- What changes cost?
- What should I send?
- What happens after I reach out?

If a block does not answer one of those questions, shorten it, collapse it, or remove it.

### Density Rules

- Hero: one headline, one buyer-fit sentence, one primary CTA, one secondary CTA.
- First viewport: show proof, not a checklist wall.
- Section intro: one idea, 1-2 short sentences.
- Card: one useful claim plus one proof/state/detail.
- Bullet lists: maximum 3 visible bullets unless inside an expandable tool.
- Long service detail: progressive disclosure, tabs, accordions, or route-specific pages.
- FAQs: only objections and buying questions, not SEO padding.

### Voice

The voice should be calm, specific, slightly executive, and helpful.

Use:

- "If backups look green but nobody can name the restore order, start here."
- "Bring rough counts. Leave with the lane, evidence, and first decision."
- "Support is not finished until someone owns the recurrence."
- "We help clean up the messy middle between help desk, vendors, access, backup, and projects."

Avoid:

- "Transform your business with technology."
- "Harness the power of AI."
- "Future-proof your IT."
- "Cutting-edge solutions."
- "Comprehensive services tailored to your unique needs."
- "Cybersecurity peace of mind" unless proof follows immediately.

### CTA Language

Prefer:

- Start fit check.
- Send pressure point.
- See pricing logic.
- Open scope.
- View proof.
- Build routing brief.
- Check backup confidence.
- Compare provider switch risk.
- Pressure-test this range.

Avoid:

- Contact us.
- Learn more.
- Get started everywhere.
- Free consultation everywhere.
- Talk to sales.
- Discover our solutions.

## Route-Level Standards

### Homepage: Operating Proof Room

Purpose:
Show the buyer that CHICAGOS #1 MSP organizes messy IT pressure into owners, evidence, and next steps.

First viewport:

- Headline about support ownership, proof, and Chicago fit.
- One short sentence naming the target buyer.
- Primary CTA: `Start fit check`.
- Secondary CTA: `See pricing logic` or `View proof`.
- Signature visual: Operating Proof Board.

Operating Proof Board lanes:

- Support ownership: ticket, owner, vendor, recurrence check.
- Access risk: MFA, admin count, guests, forwarding, exceptions.
- Recovery confidence: protected systems, last restore check, recovery order.
- Microsoft 365 cleanup: Teams, SharePoint, guests, licenses, backup assumptions.
- Scope clarity: recurring support, project work, discovery items, approvals.

Homepage should not:

- Lead with a full service catalog.
- Show more than two CTAs above the fold on mobile.
- Use fake live metrics unless clearly framed as example states.
- Force 3D/WebGL into the default hero.

Development feature:
Build `OperatingProofBoard.tsx` as a Preact component with stable dimensions, keyboard-safe lane controls, reduced-motion state transitions, and content driven from `src/data/**`.

### Services: Symptom-First Diagnostic Board

Purpose:
Help buyers find themselves by pressure before they browse service categories.

Primary mechanic:
Service Diagnostic Board.

Buyer pressure options:

- Recurring support pain.
- Provider switch.
- Cybersecurity proof.
- Microsoft 365 sprawl.
- Backup doubt.
- Vendor confusion.
- Network or office move.
- Internal IT capacity gap.
- Workflow or portal handoff.

For each pressure, show:

- What the buyer is feeling.
- First 3 checks.
- Output artifact.
- Service lane.
- Risk if ignored.
- Next action.

Services should not:

- Start with 20 service cards.
- Repeat "managed IT, cybersecurity, cloud" without buyer context.
- Use icons as decoration for generic categories.

Development feature:
Build `ServiceDiagnosticBoard.tsx` with tabs or segmented controls, ARIA tab semantics, mobile snap controls or one-at-a-time panels, and shared data in `src/data/serviceDiagnostics.ts`.

### Pricing: Scope Ledger

Purpose:
Make pricing feel explainable without pretending every environment can be quoted instantly.

Primary mechanic:
Scope Ledger.

Scope drivers:

- Users and devices.
- Sites and onsite needs.
- Response hours.
- Security depth.
- Microsoft 365 governance.
- Backup and recovery expectations.
- Servers and line-of-business apps.
- Provider transition.
- Compliance or cyber-insurance pressure.
- Projects in the next 6 months.
- Co-managed boundaries.
- Vendor ownership.

Ledger columns:

- Scope driver.
- Usually recurring.
- Usually project.
- Needs discovery.
- Why it changes cost.
- Evidence to bring.

Pricing should not:

- Hide everything behind a form.
- Lead with a rigid plan-card grid.
- Overpromise exact pricing.
- Use "custom" as a black box.

Development feature:
Build `ScopeLedger.tsx` with toggles that update a "budget shape" summary, copyable intake brief, keyboard operation, status messages, and no layout shift.

### Trust Center: Evidence Vault

Purpose:
Make trust feel organized, public-safe, and mature.

Primary mechanic:
Trust Evidence Vault.

Vault categories:

- Backup and recovery.
- Identity and access.
- Endpoint and email.
- Incident coordination.
- Vendor coordination.
- Data handling.
- Review cadence.
- Security boundaries.
- Cyber-insurance evidence.
- Public/private proof boundaries.

Each vault item shows:

- Buyer question answered.
- Public-safe signal.
- Private boundary.
- Review rhythm.
- Related artifact.
- What happens during a scoped review.

Trust Center should not:

- Become a compliance essay.
- Use giant lock/shield imagery.
- Publish sensitive implementation detail.
- Overstate security guarantees.

Development feature:
Build `TrustEvidenceVault.astro` and `EvidenceReceipt.astro`. Public proof should be data-driven and explicitly label what is public-safe versus withheld.

### Contact HQ: Routing Brief

Purpose:
Make outreach feel like the beginning of useful triage, not a sales trap.

Primary mechanic:
Pressure selector plus first-response preview.

First step:
Ask what pressure the buyer is under.

Then show:

- Best fields to fill in.
- What not to worry about yet.
- What the first response should include.
- Expected next artifact.
- Missing context, if any.

Contact should not:

- Show a long form first.
- Ask for every detail before the buyer trusts the company.
- End with only "Thanks."

Development feature:
Build `RoutingBriefBuilder.tsx` with preserved state, adaptive validation, accessible status messages, and a useful success state.

### Company/About: People Behind The Operating Model

Purpose:
Make the business feel credible, reachable, and human without becoming a corporate history wall.

Primary mechanic:
Operating model with human ownership.

Sections:

- How support ownership works.
- How reviews and proof are handled.
- How vendors are coordinated.
- How the company communicates under pressure.
- Team or founder/operator signal.
- Values expressed as operating behaviors, not slogans.

Company should not:

- Lead with vague mission language.
- Overuse founder lore.
- Hide contact paths.

Development feature:
Add an `OperatingModelTimeline.astro` and a concise `OwnershipPrinciples.astro` module.

### Blog And Resources: Decision Tool Library

Purpose:
Turn resources into useful buyer tools rather than generic SEO articles.

Primary mechanic:
Decision Tool Library.

Priority tools:

- Provider Switch Checklist.
- Backup Confidence Worksheet.
- Microsoft 365 Sprawl Score.
- Cyber Insurance Evidence Prep.
- First 30 Days MSP Transition.
- MSP Pricing Scope Worksheet.
- Co-Managed IT Boundary Planner.
- Vendor Ownership Mapper.
- Access Exception Review.

Each resource card shows:

- Buyer question.
- Time to use.
- Output.
- Best next route.
- Whether it is a checklist, worksheet, explainer, or calculator.

Resources should not:

- Feel like filler content.
- Repeat service keywords without a decision tool.
- Hide practical downloads or summaries below long intros.

Development feature:
Create `src/data/decisionTools.ts` and `DecisionToolCard.astro`; add filters by buyer pressure, artifact, and time to use.

### Chicago And Local Pages: Local Readiness Map

Purpose:
Make local presence practical instead of SEO-ish.

Primary mechanic:
Local Readiness Map.

Map signals:

- Remote, onsite, or hybrid coverage.
- Common local scenarios.
- Vendor/ISP handoff risk.
- Service-area confidence.
- First review artifact.
- Industry fit where real.

Local pages should not:

- Center suburb lists as the main value.
- Use tourist Chicago imagery as proof.
- Repeat the same service paragraph with city names swapped.

Development feature:
Build `LocalReadinessMap.astro` with service-specific variants and public-safe local proof signals.

### Photos/Gallery: Proof Library

Purpose:
Use visuals to make the company more real, not just decorative.

Primary mechanic:
Field Notes and Proof Library.

Useful image categories:

- Workspace and team.
- Public-safe process artifacts.
- Local business context.
- Equipment details without sensitive info.
- Before/after organization shots where allowed.
- Event/community proof.

Gallery should not:

- Be a random photo dump.
- Show sensitive screens.
- Use stock-looking filler.

Development feature:
Create image metadata for purpose, route usage, privacy status, caption, and related buyer pressure.

## Fresh Creative Development Features

These are the best new productized ideas to make the site feel refreshed, useful, and less sales-heavy.

### 1. Pressure-To-Proof Navigator

A small persistent route-aware module that lets buyers choose their pressure and see the matching proof artifact.

- Inputs: support pain, pricing clarity, security proof, backup doubt, M365 cleanup, provider switch, co-managed support.
- Output: matching route, proof artifact, first check, and CTA.
- Use on homepage, services, pricing, and contact.
- Store only local UI state unless analytics is explicitly wired.

### 2. Operating Proof Board

The homepage signature surface.

- Five lanes.
- One example state per lane.
- Calm status language.
- No fake real-time claims.
- Mobile version should become a single-lane carousel or stacked proof receipts.

### 3. Scope Ledger

The pricing signature surface.

- Let buyers inspect what changes monthly cost.
- Show "usually recurring," "usually project," and "needs discovery."
- Generate a short copyable scope brief.
- Add "what to send" next steps.

### 4. Evidence Vault

The trust signature surface.

- Public-safe proof categories.
- Private boundary language.
- Review cadence.
- Related artifact.
- Security-sensitive details withheld by design.

### 5. First Response Preview

The contact signature surface.

- As buyers choose a pressure type, show what a good reply should include.
- This reduces anxiety and proves operational maturity.
- Success state should include routed lane, expected response content, and missing context.

### 6. Provider Switch Timeline

A visual flow for buyers leaving another MSP.

- Access inventory.
- Backup context.
- Vendor handoff.
- Admin transfer.
- User communication.
- Stabilization.
- First roadmap.

Use on homepage, services, resources, and contact.

### 7. Recovery Receipt

A proof object for backup and continuity.

- Protected systems.
- Restore access.
- Last review or sample cadence.
- Recovery order.
- Owner.
- Gaps to discuss.

Use as a repeated artifact across trust, services, resources, and local pages.

### 8. Access Ledger

A proof object for identity and Microsoft 365 governance.

- MFA status.
- Admin count.
- Guest access.
- Risky forwarding.
- Shared mailbox assumptions.
- Exception owner.

### 9. Vendor Owner Map

A proof object for messy business systems.

- Vendor.
- System.
- Business owner.
- Technical owner.
- Escalation path.
- Contract or renewal signal.

### 10. Microsoft 365 Governance Map

A visual map for Teams, SharePoint, guest access, licenses, backup assumptions, retention, and ownership.

This should feel like a cleanup map, not a Microsoft sales page.

### 11. Cyber Insurance Evidence Pack

A public-safe interactive checklist for buyers preparing for insurance or renewal.

- MFA.
- EDR.
- Backup.
- Logging.
- Incident contacts.
- Awareness training.
- Review cadence.
- Exceptions.

Label it as guidance, not legal or insurance advice.

### 12. Case Study Slips

Replace long case-study pages with short proof slips:

- Buyer pressure.
- Starting mess.
- What got checked first.
- Artifact produced.
- Outcome.
- What stayed private.

### 13. What Good Looks Like Comparisons

Use small comparison panels:

- Generic MSP says: "24/7 monitoring."
- Better buyer question: "Who reviews alerts and what changes after repeated noise?"
- CHICAGOS #1 MSP artifact: "Alert review owner and recurrence note."

This is more persuasive than another service paragraph.

### 14. Buyer Brief Builder

A lightweight intake builder that produces a copyable brief:

- Pressure type.
- User/site rough counts.
- Known vendors.
- Biggest risk.
- Timing.
- What they want clarified.

This can power contact, pricing, and resources.

### 15. Public-Safe Proof Gallery

A gallery of redacted or simulated evidence artifacts:

- Restore receipt.
- Access review.
- Vendor map.
- First 30 days plan.
- Scope ledger.
- Routing brief.

The gallery should show how proof looks, not reveal client data.

### 16. Governed AI Notes

If AI is mentioned, tie it to governance:

- Drafting ticket summaries for human review.
- Grouping repeated issues.
- Searching internal runbook references.
- Summarizing intake into a routing brief.
- Flagging missing context.

Never imply autonomous security decisions, magic prediction, or unchecked remediation.

### 17. Design QA Gallery

Add an internal or docs-only visual QA gallery for route screenshots:

- Home.
- Services.
- Pricing.
- Trust Center.
- Contact HQ.
- Mobile first viewport.
- Common interactive states.

This helps future agents avoid reintroducing clutter.

### 18. Analytics Event Map

Track proof-oriented behavior instead of only CTA clicks:

- Pressure selected.
- Scope driver toggled.
- Evidence vault category opened.
- Routing brief copied.
- Provider switch checklist opened.
- Backup worksheet opened.
- Pricing brief started.
- Contact submitted.

### 19. Content Reuse System

Create structured data for:

- Buyer pressures.
- Proof artifacts.
- Scope drivers.
- Trust evidence.
- Decision tools.
- Local readiness scenarios.

Repeated content should live in `src/data/**`, not be scattered across routes.

### 20. Microinteraction System

Use interaction for state clarity:

- Evidence card opens.
- Scope driver changes budget shape.
- Ticket moves from intake to owner.
- Risk moves from open to reviewed.
- Backup chain steps through restore order.

All motion must respect `prefers-reduced-motion`.

## Research Ideas For The Next Creative Pass

These are the best research tasks to keep the refresh grounded instead of taste-only.

### Buyer Research

- Run 5-second tests on the homepage hero: ask "What does this company do?", "Who is it for?", and "What would you click next?"
- Interview 3-5 ideal buyers: owner/operator, CFO, internal IT lead, compliance-minded manager, and office manager.
- Ask buyers what they fear when switching MSPs: access loss, backup gaps, vendor confusion, surprise pricing, response quality, downtime.
- Ask buyers what proof would make them trust a provider before a call.
- Test whether "Start fit check" feels useful or too salesy.

### Competitive Research

- Build a screenshot scorecard for Chicago MSP competitors and national MSP references.
- Score first viewport clarity, pricing transparency, proof quality, CTA pressure, mobile density, and local credibility.
- Identify which competitors publish pricing, reviews, response claims, guarantees, partner badges, or process proof.
- Find where competitors are still generic, then make those gaps visible in CHICAGOS #1 MSP artifacts.

### Content Research

- Run a service-copy audit: mark every sentence as buyer problem, proof, first step, service claim, or filler.
- Cut or collapse filler.
- Build a glossary of approved plain-language service terms.
- Create a "bad AI smell" word list: intelligent, futuristic, autonomous, transform, unlock, leverage, seamless, next-gen, cutting-edge.
- Create a "proof phrase" list: owner, review, receipt, ledger, restore order, exception, cadence, handoff, first check.

### Visual Research

- Create three design concept directions before implementation:
  - Civic Operations: bright paper, graphite, steel, local maps, receipts.
  - Executive Proof Room: deep ink, warm surfaces, evidence vault, refined motion.
  - Human Help Desk Studio: lighter, more personable, team/process photography, fewer dark panels.
- Screenshot test each direction on desktop and mobile.
- Compare against the standard: calm, exact, alive.
- Reject any concept that reads like AI SaaS, cyber stock, or service brochure.

### Proof Asset Research

- Inventory real proof that can safely appear publicly:
  - Public reviews.
  - Partner badges.
  - Certification badges.
  - Response/process claims that can be substantiated.
  - Sample redacted restore proof.
  - Sample onboarding checklist.
  - Sample access review.
  - Industry-specific outcomes.
- Define what must stay private.
- Create redaction rules for screenshots and artifacts.

### UX Research

- Test pricing comprehension with the Scope Ledger.
- Test contact form completion with the Routing Brief.
- Test service discovery by pressure versus service category.
- Test resource discovery with search plus filters.
- Confirm mobile users can complete a pressure selection and send a brief with one hand.

### Performance And Accessibility Research

- Set route budgets for JS, images, and LCP asset weight.
- Audit focus order for sticky header and interactive panels.
- Test reduced motion.
- Test keyboard operation for ledgers, tabs, accordions, and form selectors.
- Run mobile viewport checks at 390x844 and 768x1024.

## Implementation Roadmap

### Phase 0: Foundation Cleanup

- Audit `src/styles/global.css` for old glow, neon, generic dark SaaS utilities, and duplicate panel styles.
- Consolidate semantic tokens for paper, ink, steel, verified, review, risk, and local accent.
- Create reusable artifact surface classes.
- Keep internal links base-path safe with `withBasePath()` from `src/utils/helpers.ts`.
- Keep route content in `src/data/**` when it appears in more than one place.

### Phase 1: Signature Components

Build the core component families:

- `OperatingProofBoard.tsx`
- `PressureSelector.tsx`
- `ScopeLedger.tsx`
- `EvidenceReceipt.astro`
- `TrustEvidenceVault.astro`
- `RoutingBriefBuilder.tsx`
- `ProviderSwitchTimeline.astro`
- `LocalReadinessMap.astro`
- `DecisionToolCard.astro`
- `FirstResponsePreview.astro`

### Phase 2: Primary Route Refresh

Order:

1. Homepage.
2. Pricing.
3. Trust Center.
4. Services.
5. Contact HQ.

Reason:
Homepage sets the visual system, pricing proves transparency, trust proves maturity, services stop feeling like a catalog, and contact completes the buyer path.

### Phase 3: Supporting Route Refresh

- Company/About operating model.
- Blog/resources decision library.
- Chicago/local readiness pages.
- Photos/gallery proof library.
- Footer and navigation copy.

### Phase 4: Proof And Measurement

- Add real public proof assets.
- Add analytics events for proof interactions.
- Add route-level screenshot checks.
- Add Web Vitals budget review.
- Add accessibility smoke checks.
- Add visual QA gallery for future agents.

## Component And Data Architecture

Use Astro for public routes and shared static marketing surfaces. Use Preact for interactive public UI in `src/components/**/*.tsx`. Keep React-only code in `src/components/react/**` and Solid-only code in `src/components/solid/**`.

Recommended data files:

- `src/data/buyerPressures.ts`
- `src/data/proofArtifacts.ts`
- `src/data/serviceDiagnostics.ts`
- `src/data/scopeDrivers.ts`
- `src/data/trustEvidence.ts`
- `src/data/decisionTools.ts`
- `src/data/localReadiness.ts`
- `src/data/visualProofAssets.ts`

Recommended component rules:

- Cards stay at 8px radius or less unless the existing design system requires otherwise.
- Do not put cards inside cards.
- Use bands, rails, ledgers, lists, tables, drawers, and proof objects as the main layout grammar.
- Fixed-format tools need stable dimensions and mobile alternatives.
- Buttons need at least 44px tap targets, with 48px preferred for major actions.
- Interactive controls need visible focus, keyboard support, semantic states, reduced-motion behavior, and no color-only status.
- Any tool that filters, toggles, copies, or generates a brief needs a screen-reader status message.

## Navigation Standard

Navigation should be buyer-intent based without becoming clever.

Recommended top-level labels:

- Services or What We Own.
- Pricing Logic.
- Proof.
- Resources.
- Company.
- Start Fit Check.

Recommended menu groupings:

- By pressure: support pain, provider switch, pricing clarity, security proof, backup doubt, M365 cleanup, co-managed support.
- By artifact: owner map, recovery receipt, access ledger, scope ledger, evidence vault, routing brief.
- By buyer: owner/operator, internal IT, CFO/finance, compliance/security, office manager.

Rules:

- Every nav label should answer "what will I get if I click?"
- Keep mobile nav simple.
- Do not make artifact names the only way to navigate; pair them with plain-language buyer pressure.
- Primary CTA should stay singular.

## AI Positioning Rules

The project should stop looking like it is trying to prove it knows AI. It should prove it knows operations.

AI may appear when:

- It supports human-reviewed summaries.
- It helps organize buyer intake.
- It helps detect repeated issue patterns.
- It helps retrieve internal workflow references.
- It is tied to governance, security, auditability, or measurable operating clarity.

AI should not appear as:

- A hero theme.
- A generic capability claim.
- A chatbot gimmick.
- A magic prediction claim.
- An autonomous security promise.
- A design style based on sparkles, purple gradients, or sci-fi language.

Better language:

- "AI-assisted notes, reviewed by a human owner."
- "Pattern grouping for repeated issues."
- "Governed workflow support."
- "Draft summaries for faster handoff."

Bad language:

- "AI-powered transformation."
- "Autonomous IT."
- "Intelligent solutions for the future."
- "Unlock next-gen productivity."

## Accessibility And Performance Standards

Accessibility:

- Follow WCAG 2.2 priorities.
- Ensure focus is not hidden by sticky headers.
- Keep target sizes at least 44px by project standard.
- Provide drag alternatives.
- Keep help placement consistent.
- Do not require redundant entry where avoidable.
- Use clear labels, instructions, and errors.
- Make status changes announced where needed.
- Avoid color-only proof states.

Performance:

- LCP target: 2.5s or less.
- INP target: 200ms or less.
- CLS target: 0.1 or less.
- Lazy-load heavy or secondary media.
- Keep 3D/WebGL out of default buyer routes unless route-contained and justified.
- Give images explicit dimensions or aspect ratios.
- Do not let interactive panels resize unpredictably.
- Keep homepage bundle focused.

Reduced motion:

- All state transitions must work without motion.
- Motion should clarify relationships and outcomes.
- Avoid scroll hijacking.
- Avoid constant ambient animation in content-heavy pages.

## Design QA Checklist

Use this before handing off route or component changes:

- First viewport shows buyer fit, proof, and next action.
- Mobile first viewport has one primary CTA and one secondary CTA at most.
- No dense hero checklist wall.
- No generic AI language above the fold.
- No service grid before buyer pressure or proof.
- Text does not overlap, clip, or crowd controls.
- Interactive surfaces have stable dimensions.
- Tap targets meet project standard.
- Focus states are visible.
- Reduced motion works.
- Status is not color-only.
- Cards are not nested.
- Proof artifacts feel like owned objects, not generic cards.
- Internal links are base-path safe with `withBasePath()` where applicable.
- Heavy media is lazy or route-contained.
- The route answers what happens next.

## Anti-Patterns To Retire

- Service walls.
- Generic MSP feature grids.
- Abstract AI/cyber gradients.
- Fake dashboards with meaningless numbers.
- Dark glass everywhere.
- Cards inside cards.
- More than two CTAs in the mobile hero.
- Stock office imagery without proof.
- Testimonials that do not connect to buyer risk.
- "Contact us" repeated as the only next step.
- Copy that says "comprehensive solutions" without a concrete artifact.
- Local SEO pages built around suburb repetition.
- Motion that delays reading.
- Tools that look interactive but do not change meaningful state.

## Success Bar

The refreshed site reaches this standard when a buyer can say:

- "I understand who this is for."
- "I can see how they operate."
- "I can see what they check first."
- "I can see what proof looks like."
- "I can understand what changes the price."
- "I know what to send them."
- "I know what happens after I reach out."
- "This feels serious, local, useful, and human."

The site should feel like CHICAGOS #1 MSP already started organizing the buyer's problem before asking for a meeting.

## Final Creative Standard

Build the website as a calm operating proof system, not a service vending machine.

Use fewer surfaces, better artifacts, stronger spacing, more specific language, and useful interaction. Make the design feel premium through clarity, restraint, proof, and craft. Be creative in the structure of the buying experience, not just in the decoration around it.
