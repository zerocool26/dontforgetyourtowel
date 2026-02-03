# Accessibility Audit (WCAG 2.1 AA – Practical)

## Strengths (current)

- Clear visual grouping via sections and chips
- Command palette pattern supports keyboard users
- Status region exists (loading/error)

## Gaps & recommendations

### Keyboard navigation

- Ensure all interactive elements are reachable in a predictable order
- Add keyboard shortcuts to:
  - Jump to sections
  - Toggle panel (already has `p`)
  - Toggle hotspots/interior/cinematic

### Screen reader support

- Ensure key toggles use `aria-pressed` (Quick menu chips now do)
- Ensure live region messages are concise and not spammy
- For canvas:
  - Provide a short `aria-label` on viewer container (“3D car viewer”) and include instructions in adjacent text

### Reduced motion

- **Implemented**: autorotate + animation playback disabled under `prefers-reduced-motion`, and cinematic micro-shake removed.

### Touch targets

- Maintain >= 44px target size on mobile for primary actions
- Avoid drag gesture conflicts: allow dragging the panel by header, not by content

### Contrast

- Validate contrast for muted labels (`sr-pill__muted`, form labels) on the darkest backgrounds

## Suggested acceptance checks

- Tab through the entire UI without getting trapped
- Screen reader quick pass: VoiceOver/NVDA reads section headers and toggles meaningfully
- Reduced motion: toggling system setting updates behavior without refresh
