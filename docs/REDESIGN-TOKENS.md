# TrainTrack Redesign Tokens

Source: design mockups under `/design-mockups` · aesthetic from Athlete Home comps + typography guide.

## Color

| Token | Value | Use |
|-------|-------|-----|
| `--tt-bg` | `#ffffff` | Main workspace |
| `--tt-sidebar` | `#f5f5f5` | Left navigation rail |
| `--tt-surface` | `#ffffff` | Cards on main |
| `--tt-ink` | `#111111` | Primary text |
| `--tt-ink-soft` | `#6b6b6b` | Secondary |
| `--tt-ink-faint` | `#9a9a9a` | Quiet meta |
| `--tt-line` | `#ebebeb` | Borders |
| `--tt-red` | `#da2f36` | CTA, active nav, unread badge |
| `--tt-good` | `#1a9f5c` | Positive status |

### Sport accents

| Sport | Token |
|-------|-------|
| Run | `--tt-sport-run` `#f4511e` |
| Bike | `--tt-sport-bike` `#16b8a6` |
| Swim | `--tt-sport-swim` `#1e9bde` |
| Strength | `--tt-sport-strength` `#8b5cf6` |
| Recovery / Mobility | `--tt-sport-recovery` `#8b5cf6` |

## Typography

Two families only (loaded in `design-mockups/layout.tsx`):

| Role | Face | Use |
|------|------|-----|
| Primary | **Inter** | Body, UI, nav, H2/H3, overlines, captions |
| Display | **Bebas Neue** | Page H1, workout titles, key numbers |

### Scale

| Token / class | Spec | Example |
|---------------|------|---------|
| `.tt-mock-h1` / `PageHeaderTitle` | Bebas · **48**/54 · −1% · caps | Week plan / Stats. / Library. |
| `.tt-mock-h1` hero (rare) | Bebas · 64/72 | Full-bleed marketing only |
| `.tt-mock-h2` | Inter SemiBold · 24/32 | Easy Aerobic |
| `.tt-mock-h3` | Inter Medium · 16/24 | Strength |
| `.tt-mock-body` | Inter Regular · 14/20 | Upper body |
| `.tt-mock-caption` | Inter Regular · 12/16 · 0.4% | Rest & mobility |
| `.tt-mock-overline` / `.tt-mock-section-title` | Inter Medium · 11 · caps · 0.8% | TODAY / UPCOMING |
| `.tt-mock-workout-title` | Bebas · XL/L only | Large Today / gallery cards |
| `.tt-mock-stat` | Bebas · key numbers | 23 days |

**Workout surfaces (consistency rule)**

| Surface | Workout name |
|---------|----------------|
| Page H1 | `.tt-mock-h1` (Bebas) |
| Card XL / L | `.tt-mock-workout-title` (Bebas) |
| Card M / S / XS, list, upcoming | `.tt-mock-h3` Inter semibold |
| Modals | `.tt-mock-h2` Inter |
| Prescription line | `.tt-mock-body` or `.tt-mock-caption` |
| Status / labels | `.tt-mock-overline` |

Do not use Bebas in dense rows or small cards — hard to read at small size.

## Radius & elevation

- Radius: `8–10px` cards, `6px` controls
- Shadow: soft single-layer lift on cards (`--tt-shadow`) — keep borders; avoid heavy multi-layer glow

## Accent rules

1. Red = action / today / unread only
2. Sport color = identity (icon, rail, chip) — not status
3. Status (done/skip/unread) must remain distinct from sport

## Expandable (disclosure)

One pattern everywhere (attention stack, roster cards, athlete table rows, future screens):

1. **White** summary / trigger row
2. **Continuous 3px red rail** on the full open block (trigger + panel)
3. **Grey** (`--tt-sidebar`) expanded panel
4. **~420ms** grid `0fr` → `1fr` slide + fade (`.tt-mock-expand-shell`)
5. Icon / avatar turns red when open; chevron down in red

| Use | Component |
|-----|-----------|
| Card / list rows | `MockExpandable` |
| Table expand cell | `MockExpandShell` + `useMockExpandScroll` |

CSS: `.tt-mock-expand-shell` in `mockup-tokens.css` · code: `_components/mock-expandable.tsx`

## Files

- CSS: `src/app/design-mockups/mockup-tokens.css`
- Fonts: production `src/app/layout.tsx` (Inter + Bebas Neue); mock studio mirrors the same faces
- Shared chrome: `src/app/design-mockups/_components/mock-ui.tsx`
- Expandables: `src/app/design-mockups/_components/mock-expandable.tsx`
- Studio index: `/design-mockups`
