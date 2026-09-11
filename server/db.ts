import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

let _db: Database.Database | null = null;

/**
 * HP stores all of its data in a single local SQLite file. There is no
 * external database to configure — the file (and its parent folder) is
 * created automatically on first run.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  // ":memory:" is SQLite's special in-memory-database filename (used by
  // tests) and must be passed through untouched rather than resolved as a
  // path on disk.
  const isInMemory = ENV.databasePath === ":memory:";
  const dbPath = isInMemory ? ENV.databasePath : path.resolve(process.cwd(), ENV.databasePath);
  if (!isInMemory) fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  bootstrapSchema(db);

  _db = db;
  return db;
}

function bootstrapSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hp_profiles (
      owner_open_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT 'Shashank',
      wake_window_start TEXT NOT NULL DEFAULT '06:00',
      wake_window_end TEXT NOT NULL DEFAULT '07:00',
      water_target_ml INTEGER NOT NULL DEFAULT 2500,
      food_preferences TEXT NOT NULL DEFAULT '[]',
      health_goals TEXT NOT NULL DEFAULT '[]',
      reminder_preferences TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS hp_daily_logs (
      id TEXT PRIMARY KEY,
      owner_open_id TEXT NOT NULL REFERENCES hp_profiles(owner_open_id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      water_ml INTEGER NOT NULL DEFAULT 0,
      bedtime TEXT,
      wake_time TEXT,
      sleep_minutes INTEGER,
      health_score INTEGER,
      score_breakdown TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(owner_open_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS hp_routine_events (
      id TEXT PRIMARY KEY,
      owner_open_id TEXT NOT NULL REFERENCES hp_profiles(owner_open_id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      routine_key TEXT NOT NULL,
      title TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      moved_to TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(owner_open_id, log_date, routine_key)
    );

    CREATE TABLE IF NOT EXISTS hp_replacements (
      id TEXT PRIMARY KEY,
      owner_open_id TEXT NOT NULL REFERENCES hp_profiles(owner_open_id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      original_item TEXT NOT NULL,
      replacement_item TEXT NOT NULL,
      replacement_reason TEXT NOT NULL,
      target_group TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS hp_measurements (
      id TEXT PRIMARY KEY,
      owner_open_id TEXT NOT NULL REFERENCES hp_profiles(owner_open_id) ON DELETE CASCADE,
      measured_on TEXT NOT NULL,
      weight_kg REAL,
      waist_cm REAL,
      resting_pulse INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS hp_health_reports (
      id TEXT PRIMARY KEY,
      owner_open_id TEXT NOT NULL REFERENCES hp_profiles(owner_open_id) ON DELETE CASCADE,
      report_date TEXT,
      original_filename TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      extracted_text TEXT,
      findings TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS hp_daily_logs_owner_date_idx ON hp_daily_logs(owner_open_id, log_date DESC);
    CREATE INDEX IF NOT EXISTS hp_routine_events_owner_date_idx ON hp_routine_events(owner_open_id, log_date DESC);
    CREATE INDEX IF NOT EXISTS hp_replacements_owner_date_idx ON hp_replacements(owner_open_id, log_date DESC);
    CREATE INDEX IF NOT EXISTS hp_measurements_owner_date_idx ON hp_measurements(owner_open_id, measured_on DESC);
    CREATE INDEX IF NOT EXISTS hp_health_reports_owner_created_idx ON hp_health_reports(owner_open_id, created_at DESC);
  `);
}
