# TrainTrack v2 standards

Branch: **`v2`**. Stable product remains on **`main`** / tag **`v1.0.0`**.

Design system: **`docs/DESIGN-SYSTEM.md`** (palette, Inter, geometry).

## 1. Design system (global changes)

| Layer | Location | Role |
|-------|----------|------|
| Tokens (CSS) | `src/app/globals.css` → `--tt-v2-*`, `@theme` | Color, type, radius, spacing |
| Tokens (TS) | `src/lib/design-tokens.ts` → `v2` | Typed aliases |
| Primitives | `src/components/ui/v2/*` | Metric, tag, progress, panel, intensity bars, … |
| Page fade | charcoal `#111315` → `#F5F6F7` | Dark hero / light content |
| Radius | cards 14px · panels 16px · bars rectangular | Soft card/panel shadows + hover lift |
| Spacing | micro 4 · tight 8 (title→body) · snug 12 · stack 16 · section 24 | Prefer `--tt-space-*` roles over ad-hoc `mt-*` |
| Sport | run orange · bike blue · swim/strength purple | Washes via `--tt-v2-wash-*` |
| Live | `/style-guide#v2` | Visual contract |

**Rule:** if the same chrome appears twice, extract a primitive. Tune look in tokens/primitives so one edit updates the app.

Cursor: `.cursor/rules/v2-design-system.mdc`

## 2. Data efficiency (fewest round-trips)

- One **server** query (or batched helper) per screen when possible.
- Prefetch a **window** (e.g. ±N weeks); navigate inside it on the client.
- No client `fetch` for data the page RSC already loaded.
- Prefer extending `getAthleteDashboard` / DTOs over new endpoints per widget.

Cursor: `.cursor/rules/v2-data-efficiency.mdc`

## 3. Shell

- Desktop: top nav (`AppTopNav`) — charcoal, orange active indicator.
- Mobile: keep bottom tabs until a dedicated mobile redesign pass.
