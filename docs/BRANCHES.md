# Branch policy (v1 / v2)

- **`main`** — TrainTrack **v1** (stable product line). Tag **`v1.0.0`** marks the freeze snapshot before the v2 redesign.
- **`v2`** — redesign and different functionality. Prefer Netlify (or other) previews from this branch; keep production on `main` until cutover.
- Share fixes: land on `main`, then cherry-pick or merge `main` into `v2`. Do not merge whole `v2` into `main` until ready to ship v2.
- Restore exact v1 anytime: `git checkout v1.0.0` (or `main` after that tag).

## V2 build standards

See **[DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)**, **[V2-STANDARDS.md](./V2-STANDARDS.md)**, and Cursor rules:

- `.cursor/rules/v2-design-system.mdc` — tokens + reusable `ui/v2` primitives; global look changes in one place
- `.cursor/rules/v2-data-efficiency.mdc` — minimize network/DB round-trips; single server loads; client derives from props
