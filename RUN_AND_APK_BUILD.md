# HP — Health Portal: Run and Android APK Guide

This package contains the React/Vite + Express/tRPC server application and a Capacitor Android scaffold. It does **not** contain `.env` files, `node_modules`, or generated build output. It has no external accounts to configure — everything runs locally out of the box.

## Prerequisites

Install Node.js 22 or newer. Only for Android APK/AAB generation, also install Android Studio with the Android SDK and a **Java 21 JDK**. The bundled Capacitor Android libraries compile with Java 21. In Android Studio, install an Android SDK platform plus Build Tools, then set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) to your SDK directory if Gradle cannot find it.

| Tool | Verify with |
|---|---|
| Node.js | `node --version` |
| npm | `npm --version` |
| Java (Android builds only) | `java -version` |
| Android SDK (PowerShell, Android builds only) | `echo $env:ANDROID_HOME` |

## Run locally

From the unzipped project directory:

```bash
npm install
npm run dev
```

There is nothing else to configure. HP has no sign-in and no external database — the first run creates a local SQLite file at `data/hp.db` and an uploads folder at `data/uploads/` automatically. Open the local URL the server prints (usually `http://localhost:3000`).

The included `.npmrc` handles a legacy peer-dependency constraint, so run `npm install` exactly as shown without appending compatibility flags. The `npm run dev` script uses `cross-env`, so it works the same way on Windows PowerShell, macOS, and Linux.

## Optional: Gemini assistant

Create a `.env` file (see `.env.example`) and add a Gemini key if you want the AI assistant and automatic PDF report analysis:

```bash
GEMINI_API_KEY=your_google_gemini_api_key
```

Restart `npm run dev` after changing `.env`. Without a key, the assistant clearly says it isn't configured yet and everything else keeps working normally.

## Build the web bundle

```bash
npm run build
```

This creates the production web assets in `dist/public/` and the bundled server at `dist/index.js`. Run it with `npm start`.

## Getting the app onto your phone

HP's private data (routines, workouts, food logs, lab reports) lives on the server, in the local SQLite file — not inside the phone app itself. That means the Android app is a shell that talks to a **running copy of this server** over the network, the same way the web version does. There are two ways to give it a server to talk to:

### Option A — Test on your home Wi-Fi (fastest, no deployment)

1. On your computer, run `npm run dev` and note the local network address it's reachable at (e.g. `http://192.168.1.23:3000` — find your computer's LAN IP with `ipconfig` on Windows or `ifconfig`/`ip addr` on macOS/Linux).
2. Set `HP_PORTAL_URL` to that address and allow plain HTTP for this local-only case by setting `cleartext: true` in `capacitor.config.ts`.
3. Build and install the APK (see below) on a phone connected to the **same Wi-Fi network**.

This only works while your computer is on, running the dev server, and on the same network as the phone.

### Option B — Deploy the server so the app works anywhere (recommended)

Deploy this project's server somewhere with a public HTTPS address, then point the app at it permanently.

**Important:** HP stores its data in a local SQLite file (`data/hp.db`) and local files (`data/uploads/`) on whatever disk the server process runs on. Pick a host with a **persistent disk/volume** that survives restarts and redeploys — a small VPS (e.g. a $5/mo droplet/instance), a home server, or a platform-as-a-service plan that includes a persistent volume all work well. A platform that gives the app only an ephemeral filesystem (many "serverless"/free-tier container platforms) will silently lose your data on every restart or redeploy — avoid those unless you first move `DATABASE_URL`/`UPLOADS_DIR` to that platform's persistent volume path.

A typical deployment:

1. Push this project to the host of your choice (or copy the files over).
2. On the host: `npm install && npm run build && npm start` (or `npm run build` once, then run `node dist/index.js` under a process manager like `pm2` or a systemd service so it restarts automatically).
3. Put the server behind HTTPS — either the platform provides it automatically, or use a reverse proxy (e.g. Caddy or nginx with Let's Encrypt) in front of `PORT` (default `3000`).
4. Optionally set `GEMINI_API_KEY` as an environment variable on the host for the assistant.
5. Note the final HTTPS URL — you'll use it as `HP_PORTAL_URL` below.

Once the server is deployed and reachable at a stable HTTPS URL, continue with the Capacitor steps below.

## Sync Android assets

After you have a server URL (from Option A or B above):

```bash
export HP_PORTAL_URL="https://your-final-hp-domain.example"   # or your LAN address for Option A
npx cap sync android
```

Alternatively, build and sync in one command:

```bash
npm run android:prepare
```

## Generate a debug APK

> Before running a native Android build, `java -version` must report version 21. If it reports version 17 or lower in Windows PowerShell, install JDK 21 and point the active shell to it, for example:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

Replace the folder with your installed JDK 21 directory. Set `JAVA_HOME` permanently in Windows Environment Variables once the build succeeds.

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

On macOS/Linux, use `./gradlew assembleDebug` instead.

The debug APK is created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a connected Android device with USB debugging enabled:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Generate a signed release Android App Bundle (AAB)

Build the release app bundle:

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

On Windows PowerShell, use `.\gradlew.bat bundleRelease` instead.

The unsigned release bundle is generated under:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

To publish or install a release build, it must be signed. Generate or select a private keystore, then configure signing through Android Studio or Gradle before creating the final release artifact.

## Sign a release APK or AAB

Create a keystore once and keep it private:

```bash
keytool -genkeypair -v -keystore hp-release.keystore -alias hp -keyalg RSA -keysize 2048 -validity 10000
```

Open `android/` in Android Studio, use **Build → Generate Signed Bundle / APK**, select **APK** or **Android App Bundle**, then choose `hp-release.keystore` and the `hp` alias. Android Studio produces the signed artifact under its indicated release-output directory.

> Do not commit `hp-release.keystore`, `.env`, or any generated signed APK to a public repository.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run check` | Type-check the project. |
| `npm test` | Run the Vitest suite. |
| `npm run build` | Produce the production web build. |
| `npx cap sync android` | Synchronize the existing Android scaffold. |
| `npm run android:open` | Open the native project in Android Studio. |
| `npm run android:debug` | Build a debug APK through Gradle on macOS/Linux. On Windows, use the documented `gradlew.bat` command. |
| `npm run android:bundle` | Build an Android App Bundle through Gradle on macOS/Linux. On Windows, use the documented `gradlew.bat` command. |
