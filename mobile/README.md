# TrainTrack athlete app (Expo)

**Status:** Live home + workout detail against Next.js `/api/mobile/*` (same Neon DB). Sign in with an athlete account.

## What’s in this draft

- **Login** — email/password (same users as web); optional Google when client ids are configured
- **Home** — Today + Upcoming from the signed-in athlete’s plan
- **Workout modal** — detail from `/api/mobile/workouts/[id]` (Done / Skip / Ask coach still placeholders)
- **Settings** — account + sign out

## Prerequisites

1. Next.js app running with `DATABASE_URL` + `AUTH_SECRET` (e.g. `npm run dev` in repo root).
2. An **athlete** account (email/password) that has plan data.
3. Phone and Mac on the **same Wi‑Fi**.

## Configure API URL

Phone cannot reach `localhost`. Use your Mac’s LAN IP:

```bash
cd mobile
cp .env.example .env
# edit EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
```

Find the IP: System Settings → Network, or `ipconfig getifaddr en0`.

If the phone cannot reach the API, start Next bound to all interfaces:

```bash
npx next dev -H 0.0.0.0 -p 3000
```

## Run on your iPhone (Expo Go)

1. Install **Expo Go** from the App Store.
2. From this folder:

```bash
cd mobile
npm install
npm start
```

3. Scan the QR with Camera / Expo Go.
4. Sign in with your athlete email + password.

After env or UI changes:

```bash
npm start -- --clear
```

Simulator (Mac, needs Xcode):

```bash
npm run ios
```

For simulator you can use `EXPO_PUBLIC_API_URL=http://localhost:3000`.

## Google sign-in (phone)

Google **rejects LAN IPs** as redirect URIs. For a real phone, use a tunnel:

1. Next.js running on `:3000`
2. In another terminal:
   ```bash
   npm run mobile:tunnel
   ```
3. Copy the printed redirect URI into your **website** Google Web client (`AUTH_GOOGLE_ID`), e.g.
   ```text
   https://xxxx.trycloudflare.com/api/mobile/auth/google/callback
   ```
   Also keep:
   ```text
   http://localhost:3000/api/mobile/auth/google/callback
   ```
4. Restart Next.js (so it picks up `MOBILE_GOOGLE_OAUTH_ORIGIN`), then Expo:
   ```bash
   cd mobile && npm start -- --clear
   ```

Simulator / Mac can keep `localhost` only (no tunnel).

Email/password login still works over LAN without a tunnel.

## API surface

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/mobile/auth/login` | — |
| POST | `/api/mobile/auth/google` | — |
| GET | `/api/mobile/auth/me` | Bearer |
| GET | `/api/mobile/home?weekOffset=0` | Bearer |
| GET | `/api/mobile/workouts/[id]` | Bearer |

## Next (later)

1. Done / Skip / quick log mutations  
2. Ask coach thread  
3. Strava link  
4. Training / Inbox / Season tabs  
