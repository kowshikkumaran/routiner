mod db;
mod commands;

use db::{DbState, init_db};
use tauri::Manager;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize the database on startup
            let conn = init_db(app.handle())
                .map_err(|e| format!("Failed to initialize database: {}", e))?;
            
            // Store the database state in Tauri managed state
            app.manage(DbState(std::sync::Mutex::new(conn)));
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            update_settings,
            get_routines,
            create_routine,
            update_routine,
            delete_routine,
            reorder_routines,
            get_steps,
            add_step,
            update_step,
            delete_step,
            reorder_steps,
            get_daily_plan,
            start_day,
            get_daily_steps,
            update_daily_step_status,
            get_journal_entry,
            save_journal,
            export_journal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
