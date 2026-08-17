# TrainTrack

A modern training planner for coaches and endurance athletes — inspired by TrainingPeaks workflow with Strava-like simplicity.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Prisma + PostgreSQL**
- **Dark mode** (system / toggle)

The previous local-first PWA (Vite + Dexie) lives in [`legacy/`](legacy/) for reference.

## Features (MVP)

| Area      | Coach                                       | Athlete                                       |
| --------- | ------------------------------------------- | --------------------------------------------- |
| Dashboard | Athletes overview, compliance, feedback     | Today’s workout, races, weekly/monthly volume |
| Plan      | Week calendar, schedule, move/copy workouts | View & complete workouts                      |
| Workouts  | Create & reuse templates                    | Log completion (planned vs actual)            |
| Races     | Add target races                            | Countdown & goals                             |
| Progress  | —                                           | Volume charts, completion %                   |

## Quick start (local testing)

Uses **Docker Postgres** on port `5433` — no Supabase required.

```bash
npm run db:setup-local   # start Docker DB, switch .env, push schema, seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with email, Google, Strava, or (in development) a seeded demo user.

### Auth (Google / Strava / email)

TrainTrack uses **Auth.js (NextAuth v5)**. Set these in `.env` / Netlify:

| Variable | Purpose |
| -------- | ------- |
| `AUTH_SECRET` | Session encryption (`openssl rand -base64 32`) |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Canonical app origin |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | Strava login + activity sync |

**Redirect URIs**

- Google: `{AUTH_URL}/api/auth/callback/google`
- Strava (Auth.js login): `{AUTH_URL}/api/auth/callback/strava`
- Strava (activity link from Preferences): `{NEXT_PUBLIC_APP_URL}/api/strava/callback` — set Strava “Authorization Callback Domain” to your host (e.g. `localhost` or your Netlify domain)

After first sign-in, users pick **Start Training**, **Become a Coach**, or skip. Coaches get an invite code (`TT-…`); athletes connect under **Settings → Account**.

### Switch database

| Command                  | What it does                                         |
| ------------------------ | ---------------------------------------------------- |
| `npm run env:local`      | Use local Docker Postgres (`env/local.env` → `.env`) |
| `npm run env:neon`       | Use the gitignored Neon branch file (`env/neon.env` → `.env`) |
| `npm run env:supabase`   | Use Supabase (`/.env.supabase` → `.env`)             |
| `npm run db:up`          | Start Docker Postgres                                |
| `npm run db:setup-local` | Full local setup (Docker + schema + seed)            |

Your Supabase settings are kept in **`.env.supabase`** (gitignored). Template: `env/supabase.env.example`.

### Production (Netlify + Neon)

Netlify does **not** read local `.env`. Set env vars in the Netlify UI (or import them):

```bash
npm run env:netlify-sync -- --site-url https://YOUR-SITE.netlify.app
npx netlify login
npx netlify init    # link this repo, Next.js defaults
npx netlify env:import env/netlify.env
```

Required vars: `DATABASE_URL` (pooled Neon **production** branch), `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `AUTH_URL` / `NEXT_PUBLIC_APP_URL`, plus Google/Strava keys. `netlify.toml` runs `prisma migrate deploy` on each production build.

### Manual setup

```bash
docker compose up -d
cp env/local.env .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Default local `DATABASE_URL`:

```
postgresql://traintrack:traintrack@localhost:5433/traintrack?schema=public
```

## Sign-in

Production: Google, Strava, or email/password via Auth.js. See `.env.example`.

Development: the home page also lists seeded demo users (`ALLOW_DEMO_LOGIN=1` outside `development`). After seeding, Coach Alex and Jordan Lee appear there.

## Scripts

| Command             | Description                               |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Next.js dev server                        |
| `npm run build`     | Production build                          |
| `npm run db:push`   | Push Prisma schema to DB                  |
| `npm run db:seed`   | Seed demo coach, athlete, workouts, races |
| `npm run db:studio` | Prisma Studio                             |

## Project structure

```
src/
  app/           # Routes & server actions
  components/    # UI & layout
  lib/           # Prisma, queries, session, utils
prisma/          # Schema & seed
legacy/          # Old Vite PWA
```

## Not yet implemented

- Email verification / magic links
- Drag-and-drop calendar
- Duplicate entire weeks
- Advanced metrics (CTL / ATL / TSB)
- Mobile native app

## License

Private — MVP scaffold.
