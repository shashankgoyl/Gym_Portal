import { randomUUID } from "node:crypto";
import { getDb } from "./db";

export type HpDailyLog = {
  owner_open_id: string;
  log_date: string;
  water_ml: number;
  bedtime: string | null;
  wake_time: string | null;
  sleep_minutes: number | null;
  health_score: number | null;
  score_breakdown: Record<string, number>;
};

export type HpMeasurement = {
  id: string;
  measured_on: string;
  weight_kg: number | string | null;
  waist_cm: number | string | null;
  resting_pulse: number | null;
  notes: string | null;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type DailyLogRow = {
  id: string;
  owner_open_id: string;
  log_date: string;
  water_ml: number;
  bedtime: string | null;
  wake_time: string | null;
  sleep_minutes: number | null;
  health_score: number | null;
  score_breakdown: string;
};

function mapDailyLog(row: DailyLogRow | undefined): HpDailyLog | null {
  if (!row) return null;
  return {
    owner_open_id: row.owner_open_id,
    log_date: row.log_date,
    water_ml: row.water_ml,
    bedtime: row.bedtime,
    wake_time: row.wake_time,
    sleep_minutes: row.sleep_minutes,
    health_score: row.health_score,
    score_breakdown: parseJson(row.score_breakdown, {}),
  };
}

export function ensureHpProfile(ownerOpenId: string, displayName?: string | null) {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO hp_profiles (owner_open_id, display_name, created_at, updated_at)
     VALUES (@owner_open_id, @display_name, @now, @now)
     ON CONFLICT(owner_open_id) DO UPDATE SET
       display_name = excluded.display_name,
       updated_at = @now`
  ).run({ owner_open_id: ownerOpenId, display_name: displayName || "Shashank", now });
  return db.prepare(`SELECT * FROM hp_profiles WHERE owner_open_id = ?`).get(ownerOpenId);
}

export function updateHpPreferences(ownerOpenId: string, foodPreferences: string[], healthGoals: string[]) {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `UPDATE hp_profiles SET food_preferences = ?, health_goals = ?, updated_at = ? WHERE owner_open_id = ?`
  ).run(JSON.stringify(foodPreferences), JSON.stringify(healthGoals), now, ownerOpenId);
  return { owner_open_id: ownerOpenId, food_preferences: foodPreferences, health_goals: healthGoals };
}

export function getHpProfile(ownerOpenId: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT display_name, food_preferences, health_goals, reminder_preferences FROM hp_profiles WHERE owner_open_id = ?`)
    .get(ownerOpenId) as
    | { display_name: string; food_preferences: string; health_goals: string; reminder_preferences: string }
    | undefined;
  if (!row) return null;
  return {
    food_preferences: parseJson<string[]>(row.food_preferences, []),
    health_goals: parseJson<string[]>(row.health_goals, []),
    reminder_preferences: parseJson<Record<string, boolean>>(row.reminder_preferences, {}),
  };
}

export function updateHpReminderPreferences(ownerOpenId: string, reminderPreferences: Record<string, boolean>) {
  const db = getDb();
  const now = nowIso();
  db.prepare(`UPDATE hp_profiles SET reminder_preferences = ?, updated_at = ? WHERE owner_open_id = ?`).run(
    JSON.stringify(reminderPreferences),
    now,
    ownerOpenId
  );
  return { reminder_preferences: reminderPreferences };
}

export function getHpDailyLog(ownerOpenId: string, logDate: string): HpDailyLog | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM hp_daily_logs WHERE owner_open_id = ? AND log_date = ? LIMIT 1`)
    .get(ownerOpenId, logDate) as DailyLogRow | undefined;
  return mapDailyLog(row);
}

export function upsertHpDailyLog(
  input: Partial<HpDailyLog> & Pick<HpDailyLog, "owner_open_id" | "log_date">
): HpDailyLog {
  const db = getDb();
  const now = nowIso();
  const existing = db
    .prepare(`SELECT * FROM hp_daily_logs WHERE owner_open_id = ? AND log_date = ? LIMIT 1`)
    .get(input.owner_open_id, input.log_date) as DailyLogRow | undefined;

  if (existing) {
    const next: DailyLogRow = {
      ...existing,
      water_ml: input.water_ml ?? existing.water_ml,
      bedtime: input.bedtime !== undefined ? input.bedtime : existing.bedtime,
      wake_time: input.wake_time !== undefined ? input.wake_time : existing.wake_time,
      sleep_minutes: input.sleep_minutes !== undefined ? input.sleep_minutes : existing.sleep_minutes,
      health_score: input.health_score !== undefined ? input.health_score : existing.health_score,
      score_breakdown: input.score_breakdown ? JSON.stringify(input.score_breakdown) : existing.score_breakdown,
    };
    db.prepare(
      `UPDATE hp_daily_logs SET water_ml=@water_ml, bedtime=@bedtime, wake_time=@wake_time, sleep_minutes=@sleep_minutes, health_score=@health_score, score_breakdown=@score_breakdown, updated_at=@now WHERE id=@id`
    ).run({ ...next, now, id: existing.id });
  } else {
    db.prepare(
      `INSERT INTO hp_daily_logs (id, owner_open_id, log_date, water_ml, bedtime, wake_time, sleep_minutes, health_score, score_breakdown, created_at, updated_at)
       VALUES (@id, @owner_open_id, @log_date, @water_ml, @bedtime, @wake_time, @sleep_minutes, @health_score, @score_breakdown, @now, @now)`
    ).run({
      id: randomUUID(),
      owner_open_id: input.owner_open_id,
      log_date: input.log_date,
      water_ml: input.water_ml ?? 0,
      bedtime: input.bedtime ?? null,
      wake_time: input.wake_time ?? null,
      sleep_minutes: input.sleep_minutes ?? null,
      health_score: input.health_score ?? null,
      score_breakdown: JSON.stringify(input.score_breakdown ?? {}),
      now,
    });
  }

  return getHpDailyLog(input.owner_open_id, input.log_date)!;
}

export function upsertHpRoutineEvent(input: {
  owner_open_id: string;
  log_date: string;
  routine_key: string;
  title: string;
  scheduled_time: string;
  moved_to?: string | null;
  status: "pending" | "completed" | "skipped" | "replaced";
}) {
  const db = getDb();
  const now = nowIso();
  const completedAt = input.status === "completed" ? now : null;
  db.prepare(
    `INSERT INTO hp_routine_events (id, owner_open_id, log_date, routine_key, title, scheduled_time, moved_to, status, completed_at, created_at, updated_at)
     VALUES (@id, @owner_open_id, @log_date, @routine_key, @title, @scheduled_time, @moved_to, @status, @completed_at, @now, @now)
     ON CONFLICT(owner_open_id, log_date, routine_key) DO UPDATE SET
       title = excluded.title,
       scheduled_time = excluded.scheduled_time,
       moved_to = excluded.moved_to,
       status = excluded.status,
       completed_at = excluded.completed_at,
       updated_at = @now`
  ).run({
    id: randomUUID(),
    owner_open_id: input.owner_open_id,
    log_date: input.log_date,
    routine_key: input.routine_key,
    title: input.title,
    scheduled_time: input.scheduled_time,
    moved_to: input.moved_to ?? null,
    status: input.status,
    completed_at: completedAt,
    now,
  });
  return db
    .prepare(`SELECT * FROM hp_routine_events WHERE owner_open_id = ? AND log_date = ? AND routine_key = ?`)
    .get(input.owner_open_id, input.log_date, input.routine_key);
}

export function createHpReplacement(input: {
  owner_open_id: string;
  log_date: string;
  source_kind: "exercise" | "food";
  original_item: string;
  replacement_item: string;
  replacement_reason: string;
  target_group?: string;
}) {
  const db = getDb();
  const id = randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO hp_replacements (id, owner_open_id, log_date, source_kind, original_item, replacement_item, replacement_reason, target_group, created_at)
     VALUES (@id, @owner_open_id, @log_date, @source_kind, @original_item, @replacement_item, @replacement_reason, @target_group, @now)`
  ).run({ id, target_group: input.target_group ?? null, now, ...input });
  return db.prepare(`SELECT * FROM hp_replacements WHERE id = ?`).get(id);
}

export function listHpMeasurements(ownerOpenId: string): HpMeasurement[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, measured_on, weight_kg, waist_cm, resting_pulse, notes, created_at FROM hp_measurements
       WHERE owner_open_id = ? ORDER BY measured_on DESC, created_at DESC LIMIT 12`
    )
    .all(ownerOpenId) as HpMeasurement[];
}

export function createHpMeasurement(input: {
  owner_open_id: string;
  measured_on: string;
  weight_kg: number | null;
  waist_cm: number | null;
  resting_pulse: number | null;
  notes: string | null;
}) {
  const db = getDb();
  const id = randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO hp_measurements (id, owner_open_id, measured_on, weight_kg, waist_cm, resting_pulse, notes, created_at)
     VALUES (@id, @owner_open_id, @measured_on, @weight_kg, @waist_cm, @resting_pulse, @notes, @now)`
  ).run({ id, now, ...input });
  return db
    .prepare(`SELECT id, measured_on, weight_kg, waist_cm, resting_pulse, notes, created_at FROM hp_measurements WHERE id = ?`)
    .get(id) as HpMeasurement;
}

export async function getHpAssistantContext(ownerOpenId: string, logDate: string) {
  const db = getDb();
  const profile = db
    .prepare(`SELECT display_name, food_preferences, health_goals FROM hp_profiles WHERE owner_open_id = ?`)
    .get(ownerOpenId) as { display_name: string; food_preferences: string; health_goals: string } | undefined;
  const dailyLog = getHpDailyLog(ownerOpenId, logDate);
  const routines = db
    .prepare(
      `SELECT title, status, scheduled_time FROM hp_routine_events WHERE owner_open_id = ? AND log_date = ? ORDER BY scheduled_time ASC LIMIT 20`
    )
    .all(ownerOpenId, logDate) as Array<{ title: string; status: string; scheduled_time: string }>;
  const replacements = db
    .prepare(
      `SELECT source_kind, original_item, replacement_item, replacement_reason FROM hp_replacements WHERE owner_open_id = ? ORDER BY created_at DESC LIMIT 8`
    )
    .all(ownerOpenId) as Array<{ source_kind: string; original_item: string; replacement_item: string; replacement_reason: string }>;
  const latestReport = db
    .prepare(`SELECT findings FROM hp_health_reports WHERE owner_open_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(ownerOpenId) as { findings: string } | undefined;

  return {
    displayName: profile?.display_name ?? "Shashank",
    foodPreferences: parseJson<string[]>(profile?.food_preferences, []),
    healthGoals: parseJson<string[]>(profile?.health_goals, []),
    dailyLog: dailyLog ? { waterMl: dailyLog.water_ml, sleepMinutes: dailyLog.sleep_minutes, healthScore: dailyLog.health_score } : null,
    routines: routines.map(item => ({ title: item.title, status: item.status, scheduledTime: item.scheduled_time })),
    recentReplacements: replacements.map(item => ({
      sourceKind: item.source_kind,
      originalItem: item.original_item,
      replacementItem: item.replacement_item,
      reason: item.replacement_reason,
    })),
    reportFindings: latestReport
      ? parseJson<Array<{ name: string; value: string; status: string }>>(latestReport.findings, [])
      : [
          { name: "Vitamin D", value: "7.9", status: "deficient" },
          { name: "HDL", value: "38.5", status: "low" },
          { name: "hs-CRP", value: "1.2", status: "borderline" },
          { name: "IgE", value: "109", status: "high" },
          { name: "HbA1c", value: "5.6", status: "near-threshold" },
        ],
  };
}

export async function createHpHealthReport(input: {
  owner_open_id: string;
  original_filename: string;
  storage_key: string;
  extracted_text: string | null;
  findings: Array<{ name: string; value: string; status: string; note: string }>;
}) {
  const db = getDb();
  const id = randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO hp_health_reports (id, owner_open_id, original_filename, storage_key, extracted_text, findings, created_at)
     VALUES (@id, @owner_open_id, @original_filename, @storage_key, @extracted_text, @findings, @now)`
  ).run({
    id,
    owner_open_id: input.owner_open_id,
    original_filename: input.original_filename,
    storage_key: input.storage_key,
    extracted_text: input.extracted_text,
    findings: JSON.stringify(input.findings ?? []),
    now,
  });
  return db
    .prepare(`SELECT id, original_filename, created_at FROM hp_health_reports WHERE id = ?`)
    .get(id) as { id: string; original_filename: string; created_at: string };
}

export async function listHpHealthReports(ownerOpenId: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, original_filename, report_date, created_at, findings FROM hp_health_reports
       WHERE owner_open_id = ? ORDER BY created_at DESC LIMIT 12`
    )
    .all(ownerOpenId) as Array<{
    id: string;
    original_filename: string;
    report_date: string | null;
    created_at: string;
    findings: string;
  }>;
  return rows.map(row => ({
    ...row,
    findings: parseJson<Array<{ name: string; value: string; status: string }>>(row.findings, []),
  }));
}
