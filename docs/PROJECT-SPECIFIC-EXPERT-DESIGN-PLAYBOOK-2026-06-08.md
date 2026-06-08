# Project-Specific Expert Design Playbook - 2026-06-08

Research target: define the fine details that will make this Astro MSP site feel expert, specific, and 2026+ instead of generic. This expands the competitive and award-design research into exact project moves.

This playbook is written for this codebase: Astro 6, public routes in `src/pages/**`, shared public UI in `src/components/**`, content in `src/data/**`, and internal links through `withBasePath()`.

## Sources Applied

- NN/g usability heuristics: https://media.nngroup.com/media/articles/attachments/Heuristic_Summary1_A4_compressed.pdf
- NN/g visual design principles: https://media.nngroup.com/media/articles/attachments/Principles_Visual_Design-Letter.pdf
- NN/g information foraging: https://media.nngroup.com/media/articles/attachments/InformationForaging_SizeA4.pdf
- Baymard adaptive validation errors: https://baymard.com/blog/adaptive-validation-error-messages
- Baymard input field guidance: https://baymard.com/learn/input-fields
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Google Web Vitals: https://web.dev/articles/vitals
- Webby judging criteria: https://www.webbyawards.com/judging-criteria/
- Awwwards evaluation system: https://www.awwwards.com/about-evaluation/

## Current Project Diagnosis

What is already strong:

- The site has a better strategic direction than a normal MSP site: owner maps, recovery receipts, access ledgers, scope ledgers, decision handoff, and operating intelligence already exist in data or components.
- `ProofOperatingSystem.astro`, `OperationalIntelligenceWorkbench.tsx`, `DecisionHandoffPanel.astro`, `ScopeReadinessPanel.astro`, and the pricing/service data provide real raw material.
- Pricing has directional ranges and scope boundaries, which many MSP competitors avoid.
- Contact HQ already treats intake like routing, not a plain contact form.

What still makes it feel generic:

- Many pages still repeat the same pattern: hero, proof block, heading, cards, card grid, FAQ, CTA.
- The artifacts are named but not yet memorable enough visually. They still feel like cards, not owned product-like objects.
- The homepage canvas is a mood board. It needs to become a readable operating proof board.
- Services is comprehensive but still long. It should feel like a diagnostic surface, not a service encyclopedia.
- Pricing is close, but the core mechanic should be a scope ledger first, plan cards second.
- Trust Center is the thinnest relative to opportunity. It should be a public evidence vault.
- Chicago pages are useful but can still read like local SEO pages. They need local operating proof.

The next upgrade is not "more design." It is sharper mechanics, less visible copy, and proof objects that feel proprietary.

## The New Standard

Every major route needs one signature mechanic:

- Home: Operating Proof Board.
- Services: Diagnostic Command Board.
- Pricing: Scope Ledger.
- Trust Center: Evidence Vault.
- Contact HQ: Routing Brief.
- Chicago pages: Local Readiness Map.
- Blog/resources: Decision Tool Library.

If a section does not support the route mechanic, shorten it, collapse it, or remove it.

## Homepage Fine Details

Current issue:
The hero says the right thing, but the board should prove the claim immediately.

Upgrade:
Create a first-viewport "Operating Proof Board" with five horizontal lanes:

- Support ownership: ticket -> owner -> vendor -> recurrence check.
- Security posture: MFA -> admins -> email risk -> exception owner.
- Recovery confidence: protected systems -> last restore -> recovery order.
- Microsoft 365: Teams/SharePoint -> guests -> licenses -> backup assumption.
- Budget scope: recurring -> project -> discovery -> approval.

Fine visual details:

- Each lane uses a short label, a status chip, and one evidence object.
- Use muted graphite and warm white as the base, teal for active/verified, amber for needs-review, red only for true risk.
- Make the board feel like an executive operating room, not a hacker dashboard.
- Avoid fake "live" metrics unless they are framed as example states.
- Keep visible hero proof to 5-7 short labels, not paragraphs.

Hero copy rule:

- H1: specific promise.
- Subcopy: one sentence explaining who it is for.
- CTA 1: "Start fit check".
- CTA 2: "See pricing logic" or "View proof".
- No third above-fold CTA on mobile.

Suggested H1 variants:

- "Chicago MSP support with owners, evidence, and cleaner next steps."
- "Managed IT for Chicago teams tired of loose ends."
- "IT support, security, and recovery proof you can actually inspect."

Do not use:

- "Transform your business with technology."
- "Future-proof your IT."
- "AI-powered IT solutions."

## Services Fine Details

Current issue:
Services has strong information, but too many sections compete for attention.

Upgrade:
Lead with a "Diagnostic Command Board" where buyers select the symptom first:

- Recurring tickets.
- Provider switch.
- Security proof.
- Microsoft 365 sprawl.
- Backup doubt.
- Vendor confusion.
- Office move or network drag.
- Internal IT capacity gap.

For each symptom, show:

- Trigger: what the buyer is feeling.
- First inspection: 3 checks.
- Output artifact: what they get.
- Service lane: where it routes.
- Risk if ignored: one sentence.

Component direction:

- Build `ServiceDiagnosticBoard.tsx`.
- Use segmented controls or tabs for symptoms.
- Keep all controls keyboard reachable.
- On mobile, show one symptom at a time with sticky previous/next buttons or a horizontal snap tab row.

Fine copy rule:

- Service names should be boring and clear.
- Artifact names can carry the distinctive brand.
- Example: "Managed IT support" is the lane. "Owner Map" is the proprietary-feeling output.

Section cuts:

- Convert long card grids into accordions, filters, or "open scope" panels.
- If a section repeats "what we do," replace it with "what changes after the work."

## Pricing Fine Details

Current issue:
Pricing is useful but still plan-card heavy. The breakthrough is making scope inspectable.

Upgrade:
Make "Scope Ledger" the dominant page mechanic above plan cards.

Ledger columns:

- Scope driver.
- Usually recurring.
- Usually project.
- Needs discovery.
- Buyer question.
- Evidence to bring.

Scope drivers:

- Users and devices.
- Sites and onsite needs.
- Response hours.
- Security depth.
- Microsoft 365 governance.
- Backup/recovery expectations.
- Servers and line-of-business apps.
- Provider transition.
- Compliance/cyber-insurance pressure.
- Projects in next 6 months.

Fine interaction details:

- Let buyers toggle drivers and see the likely plan shape change.
- Do not overpromise exact pricing. Label output as "budget shape."
- Show "why this changes cost" in one sentence per driver.
- Add "what to send us" after the ledger so the next action feels obvious.

Microcopy:

- Instead of "Request a quote": "Send scope context."
- Instead of "Custom": "Needs discovery."
- Instead of "Contact sales": "Pressure-test this range."

Implementation:

- Build `ScopeLedger.tsx` using data from `src/data/pricing.ts`.
- Reuse pricing ranges, but move cost drivers into structured data so pricing, contact, and services can share them.

## Trust Center Fine Details

Current issue:
Trust Center has the right topics, but it does not yet feel like a vault.

Upgrade:
Make a "Trust Evidence Vault" with public-safe proof cards.

Vault categories:

- Backup and recovery.
- Identity and access.
- Endpoint and email.
- Incident coordination.
- Vendor coordination.
- Data handling.
- Review cadence.
- Security boundaries.

Each vault card should show:

- Public signal: what can be shared.
- Private boundary: what will not be published.
- Review rhythm: when it gets checked.
- Buyer question answered.
- Next artifact: receipt, ledger, runbook, contact sheet, exception log.

Fine details:

- A trust vault should feel calm and restrained, not alarmist.
- Avoid giant lock/shield icons. Use ledgers, receipts, status lines, review stamps, and evidence folders.
- Add "What we will not publish publicly" to signal security maturity.
- Use small "public-safe" labels where appropriate.

Suggested card microcopy:

- "Public-safe summary available."
- "Sensitive implementation details withheld."
- "Reviewed during onboarding and cadence reviews."
- "Evidence discussed during scoped review."

Implementation:

- Extend `src/data/authority-pages.ts` with `trustEvidenceVault`.
- Build `TrustEvidenceVault.astro`.
- Add a vault-first section before current practice cards.

## Contact HQ Fine Details

Current issue:
Contact HQ is conceptually strong, but the interaction should feel like a routing brief, not a long form.

Upgrade:
Make the first visible form step a "pressure selector":

- Support pain.
- Provider switch.
- Pricing clarity.
- Security proof.
- Microsoft 365 cleanup.
- Backup/recovery confidence.
- Co-managed support.
- Workflow/portal path.

After selection, dynamically show:

- 3 best fields to fill in.
- What the first response should include.
- What not to worry about yet.
- Expected next artifact.

Form detail rules:

- Use top labels, not placeholder-only labels.
- Keep helper text short and specific.
- Show no more than 5-7 fields at once.
- Hide optional fields behind "Add more context."
- Use adaptive errors. Example: "Add an email address with @ and a domain" beats "Invalid email."
- Mark required fields directly in the label or helper text.
- Preserve entered context if the user changes pressure type.

Success state:

- Do not just say "Thanks."
- Show "What happens next" with:
  - Routed lane.
  - First response should include.
  - Missing context, if any.
  - Expected timeframe.

## Chicago Pages Fine Details

Current issue:
Local pages are credible but can still feel like SEO pages.

Upgrade:
Give every Chicago service page a "Local Readiness Map."

The map is not a literal Google map. It is an operational map:

- Coverage mode: remote, onsite, hybrid.
- Common local scenarios: office moves, ISP/vendor coordination, multi-site support, manufacturing floor, professional office, healthcare practice.
- First review artifact for that service.
- Chicago-area proof signal.
- Vendor handoff risk.

Page formula:

- Hero: local service plus buyer symptom.
- Local readiness map.
- What gets checked first.
- What output you get.
- FAQ.
- Routing CTA.

Avoid:

- Repeating suburb lists as the main content.
- Tourist Chicago visuals.
- "Serving Chicagoland" as the only local proof.

## Blog And Resources Fine Details

Current issue:
Resources should not feel like filler.

Upgrade:
Turn resources into a "Decision Tool Library."

Priority resources:

- Provider Switch Checklist.
- Backup Confidence Worksheet.
- Microsoft 365 Sprawl Score.
- Cyber Insurance Evidence Prep.
- First 30 Days MSP Transition.
- MSP Pricing Scope Worksheet.
- Co-Managed IT Boundary Planner.

Each resource card should show:

- Buyer question.
- Time to use.
- Output.
- Best route after using it.

Example:

- Buyer question: "Can we safely switch MSPs without losing access or backup context?"
- Time to use: "12 minutes."
- Output: "Transition risk list."
- Route: "Contact HQ - provider switch."

## Navigation Fine Details

Current issue:
Top navigation is functional, but the buyer paths can be more intent-based.

Upgrade navigation labels:

- Services -> "What We Own"
- Pricing -> "Pricing Logic"
- Trust Center -> "Proof"
- Contact -> "Start Fit Check"

Optional mega-menu logic:

- By pressure: support pain, security proof, M365 sprawl, backup doubt, provider switch.
- By artifact: owner map, recovery receipt, access ledger, scope ledger, evidence vault.
- By buyer: owner/operator, internal IT, CFO/finance, compliance/security.

Information scent rule:

- Every link should answer "what will I get if I click?"
- Avoid vague labels like "Learn More" unless the surrounding card title is highly specific.

## Visual System Fine Details

The current palette is close, but the site can feel one-note dark. Add more controlled contrast.

Recommended palette roles:

- Base: near-black graphite, deep charcoal.
- Paper: warm off-white for receipts, ledgers, and executive summaries.
- Verified: teal.
- Review needed: amber.
- Risk: restrained red.
- Local/structural: steel blue or concrete gray.

Do:

- Use warm paper surfaces for artifacts.
- Use dark background for page atmosphere.
- Use teal sparingly for confirmed/active states.
- Use amber for "needs review" rather than decoration.
- Use red only where a user should feel risk.

Do not:

- Add more purple gradients.
- Add generic cyber blue glow.
- Make every card dark glass.
- Use color as the only status signal.

Typography:

- Use no more than 3 major type sizes per section.
- Keep display type for page heroes and signature mechanics.
- Use tighter headings inside panels.
- Keep letter spacing at 0 for headings.
- Reserve mono text for labels, receipts, status stamps, and metadata.

Spacing:

- Signature mechanics get more breathing room.
- Supporting sections should be compact.
- Mobile should not show giant hero plus giant stat wall.
- Repeated cards should use consistent min-heights to avoid uneven rhythm.

## Component System Details

New shared components to build:

- `EvidenceReceipt.astro`: paper-like proof object with label, status, evidence, owner, review rhythm.
- `ScopeLedger.tsx`: interactive pricing/scope decision table.
- `ServiceDiagnosticBoard.tsx`: symptom-first service router.
- `TrustEvidenceVault.astro`: public-safe trust proof grid.
- `ProviderSwitchTimeline.astro`: access, backup, vendor, users, devices, go-live.
- `LocalReadinessMap.astro`: Chicago service-area operating map.
- `DecisionToolCard.astro`: resources as tools, not posts.
- `FirstResponsePreview.astro`: contact success and pre-submit preview.

Component behavior standards:

- Every interactive component needs visible focus, keyboard operation, reduced-motion behavior, and stable dimensions.
- Tabs need `role="tablist"`, `role="tab"`, `aria-selected`, and `role="tabpanel"` where appropriate.
- Progress meters need `aria-valuenow`, clear labels, and text fallback.
- Copy buttons need success state and screen-reader status.
- Tooltips must not hide essential information.
- Checkboxes/toggles should not be visually hidden without preserving an obvious focus path.

## Motion Details

Use motion to show operational change:

- Ticket gets assigned to owner.
- Risk moves from open to review to resolved.
- Backup chain steps through protected systems, restore access, and recovery order.
- Scope ledger updates budget shape.
- Trust vault opens evidence categories.

Motion rules:

- No scroll hijacking.
- No decorative constant motion in dense sections.
- No motion required to understand content.
- Use `prefers-reduced-motion`.
- Keep transitions under 250ms for interface state changes.
- Use 400-700ms only for hero/section reveals, and only when they do not delay reading.

## Accessibility And QA Details

WCAG 2.2 priorities for this project:

- Focus not obscured by sticky headers.
- Visible focus indicators on every button, link, tab, checkbox, and copy control.
- Target sizes at least 44px for project standard, even though WCAG minimum is lower.
- Drag alternatives if any slider or draggable UI appears.
- Consistent help placement across pricing/contact/trust.
- Labels and instructions for all form inputs.
- Status messages for generated briefs, copied states, validation, and submission results.
- No color-only risk states.

Performance targets:

- LCP at or under 2.5s.
- INP at or under 200ms.
- CLS at or under 0.1.
- No default-route heavy 3D/WebGL.
- Canvas and animation surfaces must have fixed dimensions before paint.
- Lazy-load decorative or secondary media.

Manual QA viewports:

- 390x844 mobile.
- 768x1024 tablet.
- 1440x900 desktop.
- 1920x1080 wide desktop.

Check:

- Hero first viewport shows the brand, buyer fit, proof, and CTA.
- Text never overlaps or gets clipped.
- CTA hierarchy remains one primary and one secondary on mobile.
- Cards do not nest inside cards.
- Tables have mobile alternatives or horizontal affordance.
- Canvas/interactive surfaces do not show blank states.

## Microcopy Rules

Replace generic MSP language:

- "IT solutions" -> "support ownership"
- "24/7 monitoring" -> "alerts reviewed with owner and next action"
- "cybersecurity services" -> "identity, endpoint, email, backup, and incident evidence"
- "cloud services" -> "Microsoft 365 governance and cloud handoff"
- "free consultation" -> "fit review"
- "contact us" -> "send pressure point"
- "learn more" -> "open scope", "view proof", "see pricing logic"

Tone:

- Calm.
- Practical.
- Specific.
- Slightly executive.
- Never hype-first.

Good sentence shape:

- "If backups look green but nobody can name the restore order, start here."
- "Flat-rate help desk is not enough when vendors, access, backup, and projects all drift."
- "Bring rough counts. Leave with the lane, evidence, and first decision."

Bad sentence shape:

- "We leverage cutting-edge technology to empower digital transformation."
- "Our team provides comprehensive solutions tailored to your unique business needs."
- "AI-driven innovation for modern organizations."

## Conversion Details

The best conversion path should feel useful before sales:

1. Visitor sees a proof board.
2. Visitor chooses a pressure point.
3. Site shows what gets checked first.
4. Site shows an expected output artifact.
5. Visitor sees pricing logic or trust proof.
6. Visitor sends a short routed brief.

Track these events:

- Hero CTA click.
- Pressure selector choice.
- Scope ledger driver toggled.
- Evidence checklist item checked.
- Generated brief copied.
- Pricing intake started.
- Contact form submitted.
- Trust vault category opened.
- Resource/tool opened.

## Implementation Priority

Phase 1:

- Build Scope Ledger on pricing.
- Build Trust Evidence Vault.
- Replace homepage canvas with readable Operating Proof Board.

Phase 2:

- Build Service Diagnostic Board.
- Rework Contact HQ first step into pressure selector plus first-response preview.
- Create provider switch timeline.

Phase 3:

- Rework Chicago pages with Local Readiness Map.
- Rework blog/resources into Decision Tool Library.
- Add route-aware navigation by buyer pressure and proof artifact.

Phase 4:

- Add full QA pass with screenshots, accessibility checks, and Web Vitals review.
- Tighten global CSS to reduce old glow/gradient utilities and standardize artifact surfaces.

## The "Not Done Before" Difference

Most MSP websites sell service categories. This project should sell operational confidence through inspectable artifacts.

Distinctive ideas:

- A public proof board that shows how support, security, recovery, M365, and pricing connect.
- A scope ledger that makes MSP pricing feel explainable before a call.
- A trust vault that explains what can be shared publicly and what stays private.
- A first-response preview that shows the buyer exactly what a good reply should include.
- A local readiness map that makes Chicago practical without SEO filler.
- A provider switch timeline that reduces fear around changing MSPs.
- A resource library where every article behaves like a decision tool.

The site should feel like the MSP already started organizing the buyer's IT problem before asking for a meeting.
