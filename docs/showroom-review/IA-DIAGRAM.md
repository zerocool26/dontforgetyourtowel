# Information Architecture (IA) Proposal

## Goals

- Reduce cognitive load on first use
- Put high-frequency actions within one thumb reach on mobile
- Keep power-user controls discoverable via Search/Command Palette

## Proposed Section Order (Priority-based)

1. Model
2. Look / Paint
3. Camera
4. Environment
5. Post
6. Animation
7. Floor + Shadows
8. Motion
9. Performance
10. Inspector
11. Presets
12. Tools

## Progressive Disclosure

- **Mobile default collapsed**: Environment, Scene, Inspector, Animation, Post, Performance
- **Desktop default expanded**: Model, Look, Camera
- Hide or gate “debug” controls behind a “Developer mode” toggle

## Mermaid diagram

```mermaid
flowchart TD
  A[Start: Viewer loads] --> B{First time user?}
  B -- Yes --> C[Quick Start: Model + Look + Camera]
  B -- No --> D[Restore state: URL + local presets]

  C --> E[Primary tasks]
  D --> E

  E --> M[Model]
  E --> L[Look/Paint]
  E --> K[Camera]
  E --> N[Environment]
  E --> P[Post]

  M --> S[Presets (save/load)]
  L --> S
  K --> X[Share/Export]
  P --> X

  subgraph Advanced
    I[Inspector]
    R[Performance]
    T[Tools]
  end

  E --> Advanced
```

## Mobile UX notes

- Keep “Quick actions” as the fastest path: Frame, Cine, Interior, Hotspots, Decals, Screenshot, Copy link
- Jump bar should remain visible and horizontally scrollable (already improved)
