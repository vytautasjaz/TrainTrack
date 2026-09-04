# Admin panel backlog

## Bootstrap (v1)

1. Apply migrations (`npx prisma migrate deploy`).
2. Grant admin to an existing account:
   `npm run admin:grant -- you@example.com`
3. Optional: set `ADMIN_EMAILS=you@example.com` (comma-separated) so new signups with those emails get `ADMIN` on create.

Admin-only users (ADMIN role, no athlete/coach profile) land on `/admin` and skip product onboarding.

---

Features intentionally **out of scope for Minimal Admin v1**. Do not implement unless explicitly requested.

## Phase 2 — Operational Admin

1. **User detail page** `/admin/users/[id]` — account, profiles, actions
2. **Last login / activity** — consider `lastLoginAt`; relative timestamps
3. **Persistent `AdminAuditLog`** — admin, action, target, timestamp, metadata; UI on list + user detail
4. **Advanced filters & sorting** — status, role, profile, activity, date range
5. **Safer password reset** — `passwordResetRequired`; force change after login; later email link

## Phase 3 — Support

6. Internal account notes
7. Account health / issue indicators
8. Read-only impersonation (confirm, audit, banner, exit)
9. User CSV export

## Phase 4 — Platform Management

10. Admin metrics dashboard (users, roles breakdown, recent signups — not training analytics)
11. Subscription / billing visibility and careful mutations
12. Athlete / Coach troubleshooting views (not a second app UI)
13. Bulk disable / enable / delete / export (no bulk password reset unless required)

## Phase 5 — Scale

14. Granular admin roles & permissions
15. Security hardening (rate limits, session invalidation reviews, CSRF, privilege escalation)
16. Advanced analytics / reporting

**v1 already includes:** last-admin / self / other-admin delete safeguards, soft disable, temp password shown once, `requireAdmin` on actions.
