# TrainTrack Design System

Source of truth for visual language on branch **`v2`**. Visual reference: TrainTrack Design System & Style Guide.

Feel: **minimal, focused, athletic, modern, technical** — geometric / pixel-inspired (blocks, stepped bars, rectangular charts), not retro pixel art.

## Tokens

| Layer | Location |
|-------|----------|
| CSS | `src/app/globals.css` (`@theme`, `html { --tt-* / --tt-v2-* }`) |
| TS | `src/lib/design-tokens.ts` (`colors`, `v2`, `radius`, `typography`) |
| Primitives | `src/components/ui/v2/*` |
| Live | `/style-guide#v2` |

### Color

| Token | Hex | Use |
|-------|-----|-----|
| Brand orange | `#F0440A` | CTA, progress, run, active nav |
| Charcoal | `#111315` | Top nav, dark metric panels |
| Primary text | `#15192B` | Headings, body |
| Secondary text | `#6B7280` | Labels, meta |
| Background | `#F5F6F7` | App / page bottom |
| Surface | `#FFFFFF` | Cards, week board |
| Borders | `#E3E6E9` | 1px hairlines |
| Bike | `#3B82F6` | Cycling |
| Swim / strength | `#8B5CF6` | Swim, strength |
| Success | `#16A34A` | Completed / positive |
| Warning | `#EF4444` | Destructive / alert |

### Typography

**Inter only** (weights 400–800). No Bebas Neue.

| Role | Size | Weight |
|------|------|--------|
| Page title | 32–56px (clamp) | 800 |
| Section | 24–32px | 700 |
| Card title | 16–20px | 600 |
| Body | 14–16px | 400 |
| Labels | 12–14px | 400–500 |
| Primary metrics | 28–36px | 700 |
| Tabular | metrics, times, distances | `tabular-nums` |

**Trailing period:** page titles that end with `.` use brand orange for that period only (`tt-title-dot` / `PageHeaderTitle`). Example: **Your Week.** (period = `#F0440A`).

### Radius & spacing

- Cards: **14px** (`--radius-xl`)
- Large panels: **16px** (`--radius-2xl`)
- Progress / intensity bars: **rectangular** (`--radius-xs`), not pills
- Raw spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 (8px base) — `--tt-space-*`

**Semantic gaps** (prefer over ad-hoc `mt-2` / `gap-3`):

| Role | Token | Use |
|------|-------|-----|
| Micro | `--tt-space-micro` (4) | Icon ↔ label |
| Tight | `--tt-space-tight` (8) | Widget title → body (`.tt-space-after-title`) |
| Snug | `--tt-space-snug` (12) | Related blocks in a card |
| Stack | `--tt-space-stack` (16) | Default vertical stack |
| Section | `--tt-space-section` (24) | Major page sections |
| Block | `--tt-space-block` (32) | Page block breaks |
| Grid gutter | `--tt-v2-grid-gutter` (12→16) | Day columns, widget row gaps |
| Shell pad-x | `--tt-v2-shell-pad-x` | **16** phone · **24** tablet · **40** desktop |

TS: `space` / `v2.space` in `design-tokens.ts`. Live: `/style-guide#spacing`.

### Geometric identity

- Ascending intensity bars (`V2IntensityBars`)
- Rectangular progress and chart bars
- Soft layered shadows on cards/panels; lift slightly on hover
- Occasional stepped / block accents — never clutter content

### Modular page grid (athlete home)

**7 day columns + gutters** (Mon→Sun), matching the week board — locked to the drawn background:

| Token | Role |
|-------|------|
| `--tt-v2-grid-cols: 7` | One track per weekday |
| `--tt-v2-grid-gutter` | Narrow space between days (12px → 16px lg) |
| `--tt-v2-grid-size` | Horizontal module (32px → 40px lg) |
| `--tt-v2-shell-pad-*` | = 1 module (content origin = first grid line) |

- Tokens on `[data-v2-shell]` — **nav + home** share one grid
- **Outer rails** (red): at `--tt-v2-shell-pad-x` from the shell edge
- **Side gap**: `--tt-v2-side-gap` (= day gutter) between rails and day columns
- **Day columns**: `V2GridOverlay` — 7 tracks + gutter pairs (same as content)
- Top nav: brand **2** · links **3** · actions **2**
- Hero: title **2** · open **2** · metrics **3**
- Bottom widgets: **2 · 3 · 2**
- Rule: content uses `tt-v2-mod-columns` + gutter, inset by pad + side-gap

## Apply incrementally

1. Tokens first (done in globals + `design-tokens`).
2. Shared primitives in `ui/v2`.
3. Screens: athlete home → training → rest of app.

Preserve functionality; do not invent conflicting one-off styles.
