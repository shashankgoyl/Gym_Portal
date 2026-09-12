import type { CapacitorConfig } from "@capacitor/cli";

/**
 * HP's data (routines, workouts, food logs, lab reports) lives on its own
 * Node/Express server, not inside the phone app. So the Android shell loads
 * the app from a real HTTPS server rather than bundling a static copy.
 *
 * Before running `npm run cap:sync`, set HP_PORTAL_URL to wherever that
 * server is reachable, e.g.:
 *   - a public HTTPS deployment (recommended for a phone that isn't always
 *     on your home Wi-Fi): HP_PORTAL_URL="https://your-domain.example"
 *   - your computer's LAN address while testing (`npm run dev` there first):
 *     HP_PORTAL_URL="http://192.168.1.23:3000" and set `cleartext: true`
 *     below for plain http:// testing only.
 *
 * See RUN_AND_APK_BUILD.md for the full walkthrough.
 */
const config: CapacitorConfig = {
  appId: "com.shashank.hphealthportal",
  appName: "HP — Health Portal",
  webDir: "dist/public",
  server: {
    url: process.env.HP_PORTAL_URL ?? "https://your-hp-portal.example.com",
    // Set to true only while testing over plain http:// on your home Wi-Fi.
    // Switch back to false once HP_PORTAL_URL is a real https:// deployment.
    cleartext: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
