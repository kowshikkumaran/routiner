use std::fs;
use tauri::AppHandle;
use tauri::Manager;
use rusqlite::{Connection, Result};

pub struct DbState(pub std::sync::Mutex<Connection>);

pub fn init_db(app_handle: &AppHandle) -> Result<Connection, String> {
    // Get application data directory
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    // Create app data directory if it doesn't exist
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let db_path = app_dir.join("routiner.db");
    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open SQLite database: {}", e))?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // Run migrations
    run_migrations(&mut conn)?;

    Ok(conn)
}

fn run_migrations(conn: &mut Connection) -> Result<(), String> {
    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    tx.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            theme TEXT DEFAULT 'dark',
            journal_path TEXT,
            notification_preferences TEXT,
            launch_preferences TEXT,
            default_routine_id TEXT,
            updated_at TEXT
        );",
        [],
    ).map_err(|e| format!("Failed to create settings table: {}", e))?;

    // Insert default settings if empty
    let count: i64 = tx
        .query_row("SELECT COUNT(*) FROM settings", [], |r| r.get(0))
        .map_err(|e| format!("Failed to query settings count: {}", e))?;

    if count == 0 {
        tx.execute(
            "INSERT INTO settings (id, theme, journal_path, notification_preferences, launch_preferences, default_routine_id, updated_at)
             VALUES ('default', 'dark', '', '{}', '{}', '', datetime('now'));",
            [],
        ).map_err(|e| format!("Failed to insert default settings: {}", e))?;
    }

    tx.execute(
        "CREATE TABLE IF NOT EXISTS routines (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            schedule_days TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT
        );",
        [],
    ).map_err(|e| format!("Failed to create routines table: {}", e))?;

    tx.execute(
        "CREATE TABLE IF NOT EXISTS steps (
            id TEXT PRIMARY KEY,
            routine_id TEXT NOT NULL,
            name TEXT NOT NULL,
            duration_minutes INTEGER,
            url TEXT,
            sort_order INTEGER NOT NULL,
            created_at TEXT,
            FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE
        );",
        [],
    ).map_err(|e| format!("Failed to create steps table: {}", e))?;

    tx.execute(
        "CREATE TABLE IF NOT EXISTS daily_plans (
            id TEXT PRIMARY KEY,
            date TEXT UNIQUE,
            priority TEXT,
            energy_level TEXT,
            created_at TEXT
        );",
        [],
    ).map_err(|e| format!("Failed to create daily_plans table: {}", e))?;

    tx.execute(
        "CREATE TABLE IF NOT EXISTS daily_steps (
            id TEXT PRIMARY KEY,
            daily_plan_id TEXT NOT NULL,
            step_id TEXT,
            routine_id TEXT NOT NULL,
            name TEXT NOT NULL,
            duration_minutes INTEGER,
            url TEXT,
            status TEXT DEFAULT 'pending',
            started_at TEXT,
            completed_at TEXT,
            sort_order INTEGER NOT NULL,
            FOREIGN KEY(daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE
        );",
        [],
    ).map_err(|e| format!("Failed to create daily_steps table: {}", e))?;

    tx.execute(
        "CREATE TABLE IF NOT EXISTS journal_entries (
            id TEXT PRIMARY KEY,
            daily_plan_id TEXT UNIQUE NOT NULL,
            date TEXT NOT NULL,
            went_well TEXT,
            went_poorly TEXT,
            tomorrow_focus TEXT,
            created_at TEXT,
            FOREIGN KEY(daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE
        );",
        [],
    ).map_err(|e| format!("Failed to create journal_entries table: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Failed to commit migrations: {}", e))?;

    Ok(())
}
