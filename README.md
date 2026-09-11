# HP — Health Portal

HP is a private, mobile-first health and fitness companion for **Shashank Goyal**. It brings an adaptable 6–7 AM routine, guided strength work, food and replacement logging, hydration, sleep, a six-signal daily score, lab-report tracking, and an optional Gemini assistant into one personal workspace.

> **Health-information notice:** HP provides general wellness information and habit tracking. It is not a diagnostic, emergency, or treatment tool. Discuss concerning results, symptoms, treatments, and supplements with a qualified clinician.

## What is included

| Area | Included behavior |
|---|---|
| Today | Time-aware greeting, next action, workout/nutrition/water/sleep state, six-part score, and a daily improvement prompt. |
| Routine | A flexible day beginning with a 6–7 AM wake-up window. Each item supports complete, skip, replace, and move-later actions. |
| Training | A weekly split for Chest, Back, Shoulders, Biceps, Triceps, Legs, Core, conditioning, and recovery. Today's guided Chest cards include sets, reps, rest, form, safety, and a demo reference. |
| Food | Vegetarian-first meal cards, servings, meal logging, food replacements with a saved reason, and exact 250 ml / 500 ml / custom water controls. |
| Sleep | Bedtime and wake-time logging, calculated duration, weekly-average, and consistency feedback. |
| Health | Report upload, private report metadata, supplied lab flags, personal food preferences, and the Gemini-ready assistant panel. |

The supplied October 2025 report values are retained exactly: **Vitamin D 7.9 (deficient)**, **HDL 38.5 (low)**, **hs-CRP 1.2 (borderline)**, **IgE 109 (high)**, and **HbA1c 5.6 (near-threshold)**.

## Architecture

HP is a self-contained full-stack app: React + TypeScript + Tailwind on the front end, an Express + tRPC server on the back end. It has **no external accounts to set up**:

- **No sign-in.** This is a private, single-owner app — there is nothing to log into. Every request is served as the one configured owner.
- **No cloud database.** All health data (routine logs, workouts, food replacements, measurements, report metadata) lives in a single local SQLite file at `data/hp.db`, created automatically on first run.
- **No cloud storage.** Uploaded lab-report PDFs are saved to `data/uploads/` on disk and served back from the same server.
- **Gemini is optional.** Add a `GEMINI_API_KEY` to unlock the assistant and automatic PDF report analysis; without it, the app works normally and the assistant just says it isn't configured yet.

Because HP's data lives on its own server rather than inside the phone app, the Android build (see below) points at a running copy of this server rather than bundling everything statically.

## Local development

```bash
npm install
npm run dev
```

That's it — no environment variables, no database setup, no sign-in. Open the printed local URL (usually `http://localhost:3000`) and the full app is available, persisting to `data/hp.db` on your machine.

```bash
npm run check   # type-check the client and server
npm test        # run the Vitest suite
```

See `RUN_AND_APK_BUILD.md` for a fuller walkthrough (including Windows-specific notes) and for building the Android APK.

## Configuration (all optional)

Copy `.env.example` to `.env` if you want to change any of these — HP runs with none of them set:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables the Gemini-powered health assistant and PDF report explanations. Get a key from Google AI Studio. |
| `PORT` | Port to listen on (default `3000`, auto-increments if busy). |
| `DATABASE_URL` | Path to the local SQLite file (default `./data/hp.db`). |
| `UPLOADS_DIR` | Where uploaded PDFs are stored (default `./data/uploads`). |

Restart `npm run dev` after changing `.env`.

## Android APK build

HP's data lives on its server, not in the phone app, so the Android shell needs a URL to a **running copy of this server** — either your computer's address on the same Wi-Fi (for quick testing) or a public HTTPS deployment (so the app works away from home too). Full instructions, including how to deploy the server and generate a signed release build, are in `RUN_AND_APK_BUILD.md`.

Quick version, once you have a server URL:

```bash
export HP_PORTAL_URL="https://your-server-url"   # or http://<your-computer-LAN-IP>:3000 for local testing
npm run cap:sync      # builds the web assets and syncs the Android project
npm run cap:android   # opens the project in Android Studio
```

Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Key scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run the full HP development server. |
| `npm run check` | Type-check the client and server. |
| `npm test` | Run the Vitest suite. |
| `npm run build` | Build client assets and the Node server for production. |
| `npm start` | Run the production build (after `npm run build`). |
| `npm run cap:sync` | Build and sync the Android project after setting `HP_PORTAL_URL`. |
| `npm run cap:android` | Open the generated Android project in Android Studio. |
| `npm run android:debug` | Build a debug APK via Gradle (macOS/Linux). |
| `npm run android:bundle` | Build a release App Bundle via Gradle (macOS/Linux). |
