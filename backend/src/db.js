import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../data')

mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(join(DATA_DIR, 'helena.db'))

// Performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS feedings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    breast    TEXT NOT NULL CHECK(breast IN ('E','D','A')),
    startTime INTEGER NOT NULL,
    endTime   INTEGER,
    duration  INTEGER
  );

  CREATE TABLE IF NOT EXISTS diapers (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    contents TEXT NOT NULL CHECK(contents IN ('xixi','coco','ambos')),
    time     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sleeps (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    startTime INTEGER NOT NULL,
    endTime   INTEGER,
    duration  INTEGER
  );

  CREATE TABLE IF NOT EXISTS active_timers (
    id        INTEGER PRIMARY KEY CHECK(id = 1),
    type      TEXT CHECK(type IN ('feeding','sleep')),
    breast    TEXT,
    startTime INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS active_breast_log (
    id  INTEGER PRIMARY KEY CHECK(id = 1),
    log TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    date   INTEGER NOT NULL,
    weight REAL,
    height REAL
  );

  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    user_agent   TEXT,
    last_success INTEGER,
    fail_count   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notification_settings (
    id                   INTEGER PRIMARY KEY CHECK(id = 1),
    enabled              INTEGER NOT NULL DEFAULT 1,
    feeding_interval_min INTEGER NOT NULL DEFAULT 180,
    long_sleep_min       INTEGER NOT NULL DEFAULT 240,
    daily_summary        INTEGER NOT NULL DEFAULT 1,
    quiet_hours          INTEGER NOT NULL DEFAULT 1,
    quiet_start          INTEGER NOT NULL DEFAULT 23,
    quiet_end            INTEGER NOT NULL DEFAULT 7
  );

  INSERT OR IGNORE INTO notification_settings (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS notification_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    type    TEXT NOT NULL,
    sent_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       INTEGER NOT NULL,
    note       TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feeding_notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    feeding_id  INTEGER NOT NULL UNIQUE REFERENCES feedings(id) ON DELETE CASCADE,
    burp        INTEGER NOT NULL DEFAULT 0,
    hiccup      INTEGER NOT NULL DEFAULT 0,
    spit_up     TEXT NOT NULL DEFAULT 'nao',
    behavior    TEXT,
    note        TEXT,
    created_at  INTEGER NOT NULL
  );
`)

// ─── Migrations ───────────────────────────────────────────────────────────────
const feedingCols = db.pragma('table_info(feedings)').map(c => c.name)
if (!feedingCols.includes('breast_log')) {
  db.exec(`ALTER TABLE feedings ADD COLUMN breast_log TEXT`)
}

const diaperCols = db.pragma('table_info(diapers)').map(c => c.name)
if (!diaperCols.includes('note'))       db.exec(`ALTER TABLE diapers ADD COLUMN note TEXT`)
if (!diaperCols.includes('photo_path')) db.exec(`ALTER TABLE diapers ADD COLUMN photo_path TEXT`)

const feedingColsAll = db.pragma('table_info(feedings)').map(c => c.name)
if (!feedingColsAll.includes('feedback_pending_at')) db.exec(`ALTER TABLE feedings ADD COLUMN feedback_pending_at INTEGER`)
if (!feedingColsAll.includes('feedback_notified'))   db.exec(`ALTER TABLE feedings ADD COLUMN feedback_notified INTEGER NOT NULL DEFAULT 0`)

const pushCols = db.pragma('table_info(push_subscriptions)').map(c => c.name)
if (!pushCols.includes('user_agent'))   db.exec(`ALTER TABLE push_subscriptions ADD COLUMN user_agent TEXT`)
if (!pushCols.includes('last_success')) db.exec(`ALTER TABLE push_subscriptions ADD COLUMN last_success INTEGER`)
if (!pushCols.includes('fail_count'))   db.exec(`ALTER TABLE push_subscriptions ADD COLUMN fail_count INTEGER NOT NULL DEFAULT 0`)

// ─── Indexes ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_feedings_startTime ON feedings(startTime DESC);
  CREATE INDEX IF NOT EXISTS idx_diapers_time       ON diapers(time DESC);
  CREATE INDEX IF NOT EXISTS idx_sleeps_startTime   ON sleeps(startTime DESC);
  CREATE INDEX IF NOT EXISTS idx_feeding_notes_id   ON feeding_notes(feeding_id);
  CREATE INDEX IF NOT EXISTS idx_feedings_feedback  ON feedings(feedback_pending_at) WHERE feedback_notified = 0;
`)

// ─── Feedings ─────────────────────────────────────────────────────────────────
export const feedingQueries = {
  insert: db.prepare(`
    INSERT INTO feedings (breast, startTime, endTime, duration, breast_log)
    VALUES (@breast, @startTime, @endTime, @duration, @breast_log)
  `),
  all: db.prepare(`SELECT * FROM feedings ORDER BY startTime DESC`),
  lastFive: db.prepare(`SELECT * FROM feedings WHERE endTime IS NOT NULL ORDER BY startTime DESC LIMIT 5`),
  today: db.prepare(`
    SELECT f.*, fn.burp, fn.hiccup, fn.spit_up, fn.behavior, fn.note AS obs_note
    FROM feedings f LEFT JOIN feeding_notes fn ON fn.feeding_id = f.id
    WHERE f.startTime >= @start ORDER BY f.startTime DESC
  `),
  last7days: db.prepare(`
    SELECT * FROM feedings WHERE startTime >= @start ORDER BY startTime ASC
  `),
  byId:   db.prepare(`SELECT * FROM feedings WHERE id = @id`),
  update: db.prepare(`
    UPDATE feedings SET breast=@breast, startTime=@startTime, endTime=@endTime, duration=@duration WHERE id=@id
  `),
  delete: db.prepare(`DELETE FROM feedings WHERE id = @id`),
}

// ─── Diapers ─────────────────────────────────────────────────────────────────
export const diaperQueries = {
  insert: db.prepare(`INSERT INTO diapers (contents, time) VALUES (@contents, @time)`),
  all: db.prepare(`SELECT * FROM diapers ORDER BY time DESC`),
  today: db.prepare(`SELECT * FROM diapers WHERE time >= @start ORDER BY time DESC`),
  byId:   db.prepare(`SELECT * FROM diapers WHERE id = @id`),
  update: db.prepare(`UPDATE diapers SET contents=@contents, time=@time WHERE id=@id`),
  updateNote: db.prepare(`UPDATE diapers SET note=@note, photo_path=@photo_path WHERE id=@id`),
  delete: db.prepare(`DELETE FROM diapers WHERE id = @id`),
}

// ─── Sleeps ───────────────────────────────────────────────────────────────────
export const sleepQueries = {
  insert: db.prepare(`
    INSERT INTO sleeps (startTime, endTime, duration)
    VALUES (@startTime, @endTime, @duration)
  `),
  all: db.prepare(`SELECT * FROM sleeps ORDER BY startTime DESC`),
  today: db.prepare(`
    SELECT * FROM sleeps WHERE startTime >= @start ORDER BY startTime DESC
  `),
  last7days: db.prepare(`
    SELECT * FROM sleeps WHERE startTime >= @start ORDER BY startTime ASC
  `),
  byId:   db.prepare(`SELECT * FROM sleeps WHERE id = @id`),
  update: db.prepare(`
    UPDATE sleeps SET startTime=@startTime, endTime=@endTime, duration=@duration WHERE id=@id
  `),
  delete: db.prepare(`DELETE FROM sleeps WHERE id = @id`),
}

// ─── Measurements ─────────────────────────────────────────────────────────────
export const measurementQueries = {
  all:    db.prepare(`SELECT * FROM measurements ORDER BY date DESC`),
  insert: db.prepare(`INSERT INTO measurements (date, weight, height) VALUES (@date, @weight, @height)`),
  byId:   db.prepare(`SELECT * FROM measurements WHERE id = @id`),
  update: db.prepare(`UPDATE measurements SET date=@date, weight=@weight, height=@height WHERE id=@id`),
  delete: db.prepare(`DELETE FROM measurements WHERE id = @id`),
}

// ─── History (UNION ALL) ──────────────────────────────────────────────────────
export const historyQueries = {
  page: db.prepare(`
    SELECT f.id, 'feeding' AS type, f.startTime AS sortTime,
           f.breast, f.startTime, f.endTime, f.duration, NULL AS contents, NULL AS time, f.breast_log,
           fn.burp, fn.hiccup, fn.spit_up, fn.behavior, fn.note AS note, NULL AS photo_path
    FROM feedings f
    LEFT JOIN feeding_notes fn ON fn.feeding_id = f.id
    UNION ALL
    SELECT id, 'diaper' AS type, time AS sortTime,
           NULL, NULL, NULL, NULL, contents, time, NULL, NULL, NULL, NULL, NULL, note, photo_path
    FROM diapers
    UNION ALL
    SELECT id, 'sleep' AS type, startTime AS sortTime,
           NULL, startTime, endTime, duration, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    FROM sleeps
    ORDER BY sortTime DESC
    LIMIT @limit OFFSET @offset
  `),
  count: db.prepare(`
    SELECT (SELECT COUNT(*) FROM feedings) +
           (SELECT COUNT(*) FROM diapers)  +
           (SELECT COUNT(*) FROM sleeps)   AS total
  `),
}

// ─── Active timers ────────────────────────────────────────────────────────────
export const activeTimerQueries = {
  get: db.prepare(`SELECT * FROM active_timers WHERE id = 1`),
  set: db.prepare(`
    INSERT INTO active_timers (id, type, breast, startTime)
    VALUES (1, @type, @breast, @startTime)
    ON CONFLICT(id) DO UPDATE SET type=@type, breast=@breast, startTime=@startTime
  `),
  clear:       db.prepare(`DELETE FROM active_timers WHERE id = 1`),
  updateBreast: db.prepare(`UPDATE active_timers SET breast = @breast WHERE id = 1`),
}

// ─── Active breast log (tracking per-session switches) ───────────────────────
export const activeBreastLogQueries = {
  get:   db.prepare(`SELECT log FROM active_breast_log WHERE id = 1`),
  set:   db.prepare(`INSERT OR REPLACE INTO active_breast_log (id, log) VALUES (1, @log)`),
  clear: db.prepare(`DELETE FROM active_breast_log WHERE id = 1`),
}

// ─── Push / Notifications ─────────────────────────────────────────────────────
export const configQueries = {
  get: db.prepare(`SELECT value FROM config WHERE key = @key`),
  set: db.prepare(`INSERT INTO config (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value=@value`),
}

export const pushQueries = {
  all:    db.prepare(`SELECT * FROM push_subscriptions ORDER BY created_at DESC`),
  insert: db.prepare(`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at, user_agent)
    VALUES (@endpoint, @p256dh, @auth, @created_at, @user_agent)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh=@p256dh, auth=@auth, user_agent=@user_agent
  `),
  delete:         db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = @endpoint`),
  markSuccess:    db.prepare(`UPDATE push_subscriptions SET last_success=@now, fail_count=0 WHERE endpoint=@endpoint`),
  incrementFail:  db.prepare(`UPDATE push_subscriptions SET fail_count=fail_count+1 WHERE endpoint=@endpoint`),
}

export const notifSettingsQueries = {
  get:    db.prepare(`SELECT * FROM notification_settings WHERE id = 1`),
  update: db.prepare(`
    UPDATE notification_settings SET
      enabled=@enabled, feeding_interval_min=@feeding_interval_min,
      long_sleep_min=@long_sleep_min, daily_summary=@daily_summary,
      quiet_hours=@quiet_hours, quiet_start=@quiet_start, quiet_end=@quiet_end
    WHERE id=1
  `),
}

export const notifLogQueries = {
  lastByType: db.prepare(`SELECT * FROM notification_log WHERE type=@type ORDER BY sent_at DESC LIMIT 1`),
  insert:     db.prepare(`INSERT INTO notification_log (type, sent_at) VALUES (@type, @sent_at)`),
}

// ─── Feeding Notes ────────────────────────────────────────────────────────────
export const feedingNotesQueries = {
  byFeedingId: db.prepare(`SELECT * FROM feeding_notes WHERE feeding_id = @feeding_id`),
  upsert: db.prepare(`
    INSERT INTO feeding_notes (feeding_id, burp, hiccup, spit_up, behavior, note, created_at)
    VALUES (@feeding_id, @burp, @hiccup, @spit_up, @behavior, @note, @created_at)
    ON CONFLICT(feeding_id) DO UPDATE SET
      burp=@burp, hiccup=@hiccup, spit_up=@spit_up, behavior=@behavior, note=@note
  `),
}

export const feedingFeedbackQueries = {
  setPending:    db.prepare(`UPDATE feedings SET feedback_pending_at=@at WHERE id=@id`),
  pendingDue:    db.prepare(`SELECT id FROM feedings WHERE feedback_pending_at <= @now AND feedback_notified = 0`),
  markNotified:  db.prepare(`UPDATE feedings SET feedback_notified=1 WHERE id=@id`),
}

// ─── Photos ───────────────────────────────────────────────────────────────────
export const photoQueries = {
  all:    db.prepare(`SELECT id, date, note, created_at FROM photos ORDER BY date DESC, created_at DESC`),
  insert: db.prepare(`INSERT INTO photos (date, note, created_at) VALUES (@date, @note, @created_at)`),
  byId:   db.prepare(`SELECT id, date, note, created_at FROM photos WHERE id = @id`),
  update: db.prepare(`UPDATE photos SET note=@note WHERE id=@id`),
  delete: db.prepare(`DELETE FROM photos WHERE id = @id`),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
