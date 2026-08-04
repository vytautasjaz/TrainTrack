# TrainTrack — aplikacijos aprašymas

**TrainTrack** — moderni ištvermės sporto treniruočių planavimo platforma treneriams ir atletams. Įkvėpta TrainingPeaks tipo workflow, bet paprastesnė naudoti (Strava-panašus paprastumas).

Versija: `0.1.0` (demo autentifikacija, be tikro login/registracijos).

---

## Kam skirta

| Rolė                  | Paskirtis                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **Treneris (Coach)**  | Valdo atletų sąrašą, planuoja savaites, kuria workout biblioteką, seka compliance ir atsiliepimus |
| **Atletas (Athlete)** | Mato savo planą, žymi atliktas treniruotes, seka lenktynes ir statistiką, jungia Strava           |

Sportai: **Run, Bike, Swim, Triathlon, Strength, HYROX, Recovery, Rest**.

---

## Kaip paleisti (santrauka)

- Next.js 15 + TypeScript + Tailwind + Prisma + PostgreSQL
- Demo vartotojai pasirenkami starto puslapyje (`/`)
- Sesija saugoma cookies (`tt_user`, `tt_athlete`)

---

## Navigacija pagal rolę

### Atletas

- **Home** — šiandienos / artimiausios treniruotės, savaitės progress, apimtis, kita lenktynė, trenerio atsakymai
- **Training** — pagrindinis kalendorius / planas
- **Season plan** (`/season`) — sezono planas: lenktynės, eventai, fazės
- **Stats** — apimtis, completion, tendencijos
- **Tools** — tempo / intervalų / triathlon / HYROX / splits skaičiuoklės
- **Preferences** — zonos, profilis, Strava

### Treneris

- **Athletes** — atletų rosters, compliance, planning warnings, feedback eilė
- **Training** — pasirinkto atleto planas
- **Season plan** — pasirinkto atleto sezono planas
- **Library** — workout šablonų biblioteka
- **Tools** — tos pačios skaičiuoklės
- **Preferences** — planavimo lead dienos, builder nustatymai; pasirinkto atleto zonos

Treneris perjungia atletą per athlete bar / role switcher — visas Training / Stats / Season plan kontekstas seka pasirinktą atletą.

---

## Pagrindinis funkcionalumas

### 1. Training (planas)

Vienas hub’as vietoj senų Plan / History:

| Vaizdas   | Kas rodoma                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| **List**  | Chronologinis treniruočių sąrašas (nuo vakar → šiandien → ateitis), infinite scroll; mobiliajame — default             |
| **Week**  | Savaitės lentelė pagal sportus; mobiliajame portrait — prašymas pasukti ekraną, landscape — lentelė; desktop — default |
| **Month** | Mėnesio kalendorius (1–3 mėn.)                                                                                         |

**Treneris gali:**

- Pridėti / redaguoti / kopijuoti / perkelti / ištrinti treniruotes
- Vilkti iš bibliotekos ant dienos
- DnD tarp dienų
- Dienos užrašus (day notes) ir recovery dienas
- Konfigūruoti sportų eilutes plane (`planSportRows`, per-week overrides)

**Atletas gali:**

- Peržiūrėti struktūruotą planą
- Pažymėti **completed / skipped**
- Koreguoti faktinius duomenis, reschedule
- Pats įrašyti treniruotę (self-log / Log workout)

### 2. Workout biblioteka (treneris)

- Šablonai pagal sportą (`/workouts`, `/workouts/library/[sport]`)
- Tipai:
  - **Block builder** — Run / Bike / Triathlon (warmup, intervals, cooldown, intensyvumo target’ai)
  - **Swim builder** — baseinas / open water, set’ai, metrai
  - **Text** — Strength / HYROX / Recovery
- Šablonus galima schedule’inti į kalendorių; planines treniruotes — išsaugoti kaip šablonus

### 3. Treniruotės detalės

- `/workouts/[id]` — peržiūra
- Builderiai: `/workouts/builder/...`, template builderiai: `/workouts/templates/builder/...`
- Struktūra, metrikos, statusas, Strava sync indikatorius, trenerio / atleto komentarai

### 4. Season plan (`/season`)

- Planuojamos / stebimos (watching) / praėjusios lenktynės
- Prioritetas **A / B / C**
- Sezono eventai ir fazės
- Rezultatas: finished / DNS / DNF / dismissed + laikas, pastabos
- Sezono overview, timeline
- Dashboard’e — post-race follow-up atletui
- Senas kelias `/races` nukreipia į `/season`

### 5. Stats (progress)

- Apimtis pagal sportą, completion rate, tendencijos (~8 sav. → mėnesio pabaiga)
- Atletas mato savo; treneris — pasirinkto atleto (arba per `/athletes/[id]`)

### 6. Tools

| Tab                  | Funkcija                                                      |
| -------------------- | ------------------------------------------------------------- |
| Running Calculator   | Laiko / tempo skaičiavimas                                    |
| Interval Calculator  | Intervalų laikai                                              |
| Triathlon Calculator | Multi-sport finish estimate                                   |
| HYROX Calculator     | Stočių planas + detailed race plan                            |
| Splits Calculator    | Nuotolio / tempo / greičio split’ai (run pace arba bike km/h) |

Dažnai prefill’ina iš atleto zonų; būsena saugoma localStorage.

### 7. Strava (atletas)

- OAuth prijungimas Preferences’uose
- Activity sync su planinėmis treniruotėmis
- Auto-sync (debounced) + rankinis
- Avatar sync; activity pavadinimai/aprašymai trenerio kontekstui

### 8. Preferences / zonos

**Atletas:** vardas, avataras, run pace zonos, bike speed + FTP, swim CSS, HR zonos, Strava.

**Treneris:** `planningLeadDays` (dashboard įspėjimai), workout builder „Add block“ preset’ai; gali redaguoti pasirinkto atleto zonas (intensyvumo skaičiavimui).

### 9. Dashboard

**Treneris:** atletų kortelės, statusai (ACTIVE / INACTIVE / ARCHIVED), compliance, planning-ahead warnings, athlete feedback eilė, add athlete.

**Atletas:** šiandienos planas, savaitės žiedas, mėnesio volume, kita lenktynė, neperskaityti trenerio atsakymai.

### 10. Day notes

Dienos komunikacija plane: pvz. reikia trenerio, available, self-planned, busy — treneris mato planavimo kontekste.

---

## Tipinis workflow

```
Treneris sukuria / parenka atletą
        ↓
Nustato zonas (Preferences)
        ↓
Planuoja Training (List / Week / Month) + Library šablonai / builderiai
        ↓
Atletas mato Home / Training → atlieka (rankiniu arba per Strava)
        ↓
Pažymi completed + pastabos / RPE (arba skip / reschedule)
        ↓
Treneris mato feedback / compliance Dashboard’e → atsako
        ↓
Lenktynės + Stats sezono kontekste
```

---

## Techninė santrauka

| Sritis       | Sprendimas                                      |
| ------------ | ----------------------------------------------- |
| Frontend     | Next.js 15 App Router, React 19, Tailwind v4    |
| Duomenys     | Prisma, PostgreSQL (Docker local arba Supabase) |
| Auth         | Auth.js: Google, Strava, email/password; multi-role |
| Integracijos | Strava OAuth + sync                             |
| PWA          | manifest, service worker, install prompt        |
| Tema         | Light / dark (`next-themes`)                    |
| Chart’ai     | Recharts                                        |

### Pagrindiniai duomenų objektai

- **User** — coach arba athlete paskyra
- **Athlete** — treniruojamas asmuo, zonos, statusas, plan sport rows
- **WorkoutTemplate** — bibliotekos šablonas (`structure` / `swimStructure`)
- **Workout** — planinė sesija (PLANNED / COMPLETED / SKIPPED)
- **WorkoutResult** — faktiniai duomenys, RPE, komentarai, Strava ID
- **Race** — sezono tikslai
- **DayNote** — dienos užrašai
- **StravaConnection** — token’ai, auto-sync

---

## Vaizdai pagal įrenginį (Training)

- **Mobile default:** List view
- **Desktop default:** Week view
- **Week mobile portrait:** pranešimas pasukti ekraną (+ animuotos rodyklės)
- **Week mobile landscape:** savaitės lentelė
- Viršutinis meniu (Training + List/Week/Month + Filters) bendras visiems vaizdams

---

## Kas dar nebaigta / ateityje

Pagal README ir kodą:

- Tikra autentifikacija (ne demo cookies)
- CTL / ATL / TSB tipo fitness modeliai
- Native mobilioji app
- Kai kurios swim builder / display detalės dar tobulinamos (`docs/TEMP-SWIM-BUILDER.md`)

Papildoma techninė specifikacija run/bike flow: `docs/RUN-BIKE-WORKOUT-FLOW.md`.

---

## Vienos eilutės santrauka

**TrainTrack** — demo web app, kur treneriai planuoja multi-sport savaites atletams (struktūruoti run/bike/swim builderiai + biblioteka), atletai logina treniruotes ir lenktynes (su Strava), o abu naudoja zonas, skaičiuokles ir bendrą Training kalendorių.
