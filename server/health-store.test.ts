import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  // Use an isolated in-memory SQLite database for this test file instead of
  // the real local data/hp.db.
  process.env.DATABASE_URL = ":memory:";
});

describe("health-store (local SQLite)", () => {
  it("round-trips a profile, a merged daily log, and a routine event", async () => {
    const { ensureHpProfile, upsertHpDailyLog, getHpDailyLog, upsertHpRoutineEvent, getHpProfile, updateHpPreferences } =
      await import("./health-store");

    ensureHpProfile("test-owner", "Test Owner");
    expect(getHpProfile("test-owner")).toMatchObject({ food_preferences: [], health_goals: [] });

    updateHpPreferences("test-owner", ["Vegetarian"], ["Stronger routine"]);
    expect(getHpProfile("test-owner")).toMatchObject({ food_preferences: ["Vegetarian"], health_goals: ["Stronger routine"] });

    // Two partial writes to the same day should merge rather than overwrite
    // each other, matching the previous Supabase upsert behavior.
    upsertHpDailyLog({ owner_open_id: "test-owner", log_date: "2026-01-01", water_ml: 500 });
    upsertHpDailyLog({ owner_open_id: "test-owner", log_date: "2026-01-01", sleep_minutes: 420 });
    const log = getHpDailyLog("test-owner", "2026-01-01");
    expect(log?.water_ml).toBe(500);
    expect(log?.sleep_minutes).toBe(420);

    const event = upsertHpRoutineEvent({
      owner_open_id: "test-owner",
      log_date: "2026-01-01",
      routine_key: "wake",
      title: "Wake up",
      scheduled_time: "06:30",
      status: "completed",
    }) as { status: string; title: string };
    expect(event.status).toBe("completed");
    expect(event.title).toBe("Wake up");
  });
});
