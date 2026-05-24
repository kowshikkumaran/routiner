use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Settings {
    pub id: String,
    pub theme: String,
    pub journal_path: String,
    pub notification_preferences: String, // JSON string
    pub launch_preferences: String,       // JSON string
    pub default_routine_id: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Routine {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
    pub schedule_days: String, // JSON array string
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Step {
    pub id: String,
    pub routine_id: String,
    pub name: String,
    pub duration_minutes: Option<i32>,
    pub url: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyPlan {
    pub id: String,
    pub date: String,
    pub priority: String,
    pub energy_level: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyStep {
    pub id: String,
    pub daily_plan_id: String,
    pub step_id: Option<String>,
    pub routine_id: String,
    pub name: String,
    pub duration_minutes: Option<i32>,
    pub url: Option<String>,
    pub status: String, // pending | active | completed | skipped
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub sort_order: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyStepInput {
    pub id: String,
    pub step_id: Option<String>,
    pub routine_id: String,
    pub name: String,
    pub duration_minutes: Option<i32>,
    pub url: Option<String>,
    pub sort_order: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JournalEntry {
    pub id: String,
    pub daily_plan_id: String,
    pub date: String,
    pub went_well: String,
    pub went_poorly: String,
    pub tomorrow_focus: String,
    pub created_at: String,
}

// Command definitions

#[tauri::command]
pub fn get_settings(db_state: State<'_, DbState>) -> Result<Settings, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, theme, journal_path, notification_preferences, launch_preferences, default_routine_id, updated_at FROM settings LIMIT 1")
        .map_err(|e| e.to_string())?;
    
    let settings = stmt
        .query_row([], |row| {
            Ok(Settings {
                id: row.get(0)?,
                theme: row.get(1)?,
                journal_path: row.get(2)?,
                notification_preferences: row.get(3)?,
                launch_preferences: row.get(4)?,
                default_routine_id: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
pub fn update_settings(
    settings: Settings,
    db_state: State<'_, DbState>,
) -> Result<Settings, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE settings SET theme = ?2, journal_path = ?3, notification_preferences = ?4, launch_preferences = ?5, default_routine_id = ?6, updated_at = datetime('now') WHERE id = ?1",
        (
            &settings.id,
            &settings.theme,
            &settings.journal_path,
            &settings.notification_preferences,
            &settings.launch_preferences,
            &settings.default_routine_id,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
pub fn get_routines(db_state: State<'_, DbState>) -> Result<Vec<Routine>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, sort_order, schedule_days, created_at, updated_at FROM routines ORDER BY sort_order ASC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            Ok(Routine {
                id: row.get(0)?,
                name: row.get(1)?,
                sort_order: row.get(2)?,
                schedule_days: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut routines = Vec::new();
    for row in rows {
        routines.push(row.map_err(|e| e.to_string())?);
    }
    Ok(routines)
}

#[tauri::command]
pub fn create_routine(
    id: String,
    name: String,
    sort_order: i32,
    schedule_days: String,
    db_state: State<'_, DbState>,
) -> Result<Routine, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO routines (id, name, sort_order, schedule_days, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now'))",
        (&id, &name, &sort_order, &schedule_days),
    )
    .map_err(|e| e.to_string())?;

    Ok(Routine {
        id,
        name,
        sort_order,
        schedule_days,
        created_at: "".to_string(), // Frontend will update or refresh
        updated_at: "".to_string(),
    })
}

#[tauri::command]
pub fn update_routine(
    id: String,
    name: String,
    schedule_days: String,
    db_state: State<'_, DbState>,
) -> Result<Routine, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE routines SET name = ?2, schedule_days = ?3, updated_at = datetime('now') WHERE id = ?1",
        (&id, &name, &schedule_days),
    )
    .map_err(|e| e.to_string())?;

    // Fetch the updated routine
    let routine = conn
        .query_row(
            "SELECT id, name, sort_order, schedule_days, created_at, updated_at FROM routines WHERE id = ?1",
            [&id],
            |row| {
                Ok(Routine {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    sort_order: row.get(2)?,
                    schedule_days: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(routine)
}

#[tauri::command]
pub fn delete_routine(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM routines WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_routines(ids: Vec<String>, db_state: State<'_, DbState>) -> Result<(), String> {
    let mut conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE routines SET sort_order = ?2, updated_at = datetime('now') WHERE id = ?1",
            (id, index as i32),
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_steps(routine_id: String, db_state: State<'_, DbState>) -> Result<Vec<Step>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, routine_id, name, duration_minutes, url, sort_order, created_at FROM steps WHERE routine_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([&routine_id], |row| {
            Ok(Step {
                id: row.get(0)?,
                routine_id: row.get(1)?,
                name: row.get(2)?,
                duration_minutes: row.get(3)?,
                url: row.get(4)?,
                sort_order: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut steps = Vec::new();
    for row in rows {
        steps.push(row.map_err(|e| e.to_string())?);
    }
    Ok(steps)
}

#[tauri::command]
pub fn add_step(
    id: String,
    routine_id: String,
    name: String,
    duration_minutes: Option<i32>,
    url: Option<String>,
    sort_order: i32,
    db_state: State<'_, DbState>,
) -> Result<Step, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO steps (id, routine_id, name, duration_minutes, url, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
        (
            &id,
            &routine_id,
            &name,
            &duration_minutes,
            &url,
            &sort_order,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(Step {
        id,
        routine_id,
        name,
        duration_minutes,
        url,
        sort_order,
        created_at: "".to_string(),
    })
}

#[tauri::command]
pub fn update_step(
    id: String,
    name: String,
    duration_minutes: Option<i32>,
    url: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Step, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE steps SET name = ?2, duration_minutes = ?3, url = ?4 WHERE id = ?1",
        (&id, &name, &duration_minutes, &url),
    )
    .map_err(|e| e.to_string())?;

    let step = conn
        .query_row(
            "SELECT id, routine_id, name, duration_minutes, url, sort_order, created_at FROM steps WHERE id = ?1",
            [&id],
            |row| {
                Ok(Step {
                    id: row.get(0)?,
                    routine_id: row.get(1)?,
                    name: row.get(2)?,
                    duration_minutes: row.get(3)?,
                    url: row.get(4)?,
                    sort_order: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(step)
}

#[tauri::command]
pub fn delete_step(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM steps WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_steps(
    routine_id: String,
    step_ids: Vec<String>,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    let mut conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (index, id) in step_ids.iter().enumerate() {
        tx.execute(
            "UPDATE steps SET sort_order = ?3 WHERE id = ?1 AND routine_id = ?2",
            (id, &routine_id, index as i32),
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_daily_plan(date: String, db_state: State<'_, DbState>) -> Result<Option<DailyPlan>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, date, priority, energy_level, created_at FROM daily_plans WHERE date = ?1")
        .map_err(|e| e.to_string())?;
    
    let result = stmt.query_row([&date], |row| {
        Ok(DailyPlan {
            id: row.get(0)?,
            date: row.get(1)?,
            priority: row.get(2)?,
            energy_level: row.get(3)?,
            created_at: row.get(4)?,
        })
    });

    match result {
        Ok(plan) => Ok(Some(plan)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn start_day(
    id: String,
    date: String,
    priority: String,
    energy_level: String,
    daily_steps: Vec<DailyStepInput>,
    db_state: State<'_, DbState>,
) -> Result<DailyPlan, String> {
    let mut conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT OR REPLACE INTO daily_plans (id, date, priority, energy_level, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
        (&id, &date, &priority, &energy_level),
    )
    .map_err(|e| e.to_string())?;

    // Clear existing steps for this daily plan if any (in case of restart)
    tx.execute("DELETE FROM daily_steps WHERE daily_plan_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Insert steps
    for step in daily_steps {
        tx.execute(
            "INSERT INTO daily_steps (id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8)",
            (
                &step.id,
                &id,
                &step.step_id,
                &step.routine_id,
                &step.name,
                &step.duration_minutes,
                &step.url,
                &step.sort_order,
            ),
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(DailyPlan {
        id,
        date,
        priority,
        energy_level,
        created_at: "".to_string(),
    })
}

#[tauri::command]
pub fn get_daily_steps(
    daily_plan_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<DailyStep>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, started_at, completed_at, sort_order FROM daily_steps WHERE daily_plan_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([&daily_plan_id], |row| {
            Ok(DailyStep {
                id: row.get(0)?,
                daily_plan_id: row.get(1)?,
                step_id: row.get(2)?,
                routine_id: row.get(3)?,
                name: row.get(4)?,
                duration_minutes: row.get(5)?,
                url: row.get(6)?,
                status: row.get(7)?,
                started_at: row.get(8)?,
                completed_at: row.get(9)?,
                sort_order: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut steps = Vec::new();
    for row in rows {
        steps.push(row.map_err(|e| e.to_string())?);
    }
    Ok(steps)
}

#[tauri::command]
pub fn update_daily_step_status(
    id: String,
    status: String,
    started_at: Option<String>,
    completed_at: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<DailyStep, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE daily_steps SET status = ?2, started_at = ?3, completed_at = ?4 WHERE id = ?1",
        (&id, &status, &started_at, &completed_at),
    )
    .map_err(|e| e.to_string())?;

    let step = conn
        .query_row(
            "SELECT id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, started_at, completed_at, sort_order FROM daily_steps WHERE id = ?1",
            [&id],
            |row| {
                Ok(DailyStep {
                    id: row.get(0)?,
                    daily_plan_id: row.get(1)?,
                    step_id: row.get(2)?,
                    routine_id: row.get(3)?,
                    name: row.get(4)?,
                    duration_minutes: row.get(5)?,
                    url: row.get(6)?,
                    status: row.get(7)?,
                    started_at: row.get(8)?,
                    completed_at: row.get(9)?,
                    sort_order: row.get(10)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(step)
}

#[tauri::command]
pub fn get_journal_entry(
    daily_plan_id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<JournalEntry>, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, daily_plan_id, date, went_well, went_poorly, tomorrow_focus, created_at FROM journal_entries WHERE daily_plan_id = ?1")
        .map_err(|e| e.to_string())?;
    
    let result = stmt.query_row([&daily_plan_id], |row| {
        Ok(JournalEntry {
            id: row.get(0)?,
            daily_plan_id: row.get(1)?,
            date: row.get(2)?,
            went_well: row.get(3)?,
            went_poorly: row.get(4)?,
            tomorrow_focus: row.get(5)?,
            created_at: row.get(6)?,
        })
    });

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn save_journal(
    id: String,
    daily_plan_id: String,
    date: String,
    went_well: String,
    went_poorly: String,
    tomorrow_focus: String,
    db_state: State<'_, DbState>,
) -> Result<JournalEntry, String> {
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO journal_entries (id, daily_plan_id, date, went_well, went_poorly, tomorrow_focus, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
        (
            &id,
            &daily_plan_id,
            &date,
            &went_well,
            &went_poorly,
            &tomorrow_focus,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(JournalEntry {
        id,
        daily_plan_id,
        date,
        went_well,
        went_poorly,
        tomorrow_focus,
        created_at: "".to_string(),
    })
}

#[tauri::command]
pub fn export_journal(
    date: String,
    path: String,
    content: String,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;
    use std::path::Path;

    let dir = Path::new(&path);
    if !dir.exists() {
        return Err("The configured directory path does not exist. Please verify your Journal Path in Settings.".to_string());
    }

    let filename = format!("journal-{}.md", date);
    let file_path = dir.join(filename);
    let mut file = File::create(&file_path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}
