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

## Quick start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
```

Default `DATABASE_URL`:

```
postgresql://traintrack:traintrack@localhost:5433/traintrack?schema=public
```

### 3. Install & migrate

```bash
npm install
npm run db:push
npm run db:seed
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in as **Coach Alex** or **Jordan Lee** (demo users from seed).

## Demo login

MVP uses cookie-based demo sessions (no real auth yet). Pick a user on the home screen, or use the role switcher in the header.

After seeding, the console prints user IDs you can set in `.env` if needed.

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

- Real authentication (NextAuth / Clerk)
- Drag-and-drop calendar
- Duplicate entire weeks
- Advanced metrics (CTL / ATL / TSB)
- Mobile native app

## License

Private — MVP scaffold.
