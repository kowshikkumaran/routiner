import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let db: Database.Database;

function initDb() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const dbPath = path.join(userDataPath, 'routiner.db');
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Run migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        journal_path TEXT,
        notification_preferences TEXT,
        launch_preferences TEXT,
        default_routine_id TEXT,
        updated_at TEXT
    );
  `);

  const countRow = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
  if (countRow.count === 0) {
    db.prepare(`
      INSERT INTO settings (id, theme, journal_path, notification_preferences, launch_preferences, default_routine_id, updated_at)
      VALUES ('default', 'dark', '', '{}', '{}', '', datetime('now'))
    `).run();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        schedule_days TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY,
        routine_id TEXT NOT NULL,
        name TEXT NOT NULL,
        duration_minutes INTEGER,
        url TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT,
        FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_plans (
        id TEXT PRIMARY KEY,
        date TEXT UNIQUE,
        priority TEXT,
        energy_level TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_steps (
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
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        daily_plan_id TEXT UNIQUE NOT NULL,
        date TEXT NOT NULL,
        went_well TEXT,
        went_poorly TEXT,
        tomorrow_focus TEXT,
        created_at TEXT,
        FOREIGN KEY(daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE
    );
  `);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get_settings', () => {
  return db.prepare("SELECT id, theme, journal_path, notification_preferences, launch_preferences, default_routine_id, updated_at FROM settings LIMIT 1").get();
});

ipcMain.handle('update_settings', (_, { settings }) => {
  db.prepare(`
    UPDATE settings 
    SET theme = ?, journal_path = ?, notification_preferences = ?, launch_preferences = ?, default_routine_id = ?, updated_at = datetime('now') 
    WHERE id = ?
  `).run(
    settings.theme,
    settings.journal_path,
    settings.notification_preferences,
    settings.launch_preferences,
    settings.default_routine_id,
    settings.id
  );
  return settings;
});

ipcMain.handle('get_routines', () => {
  return db.prepare("SELECT id, name, sort_order, schedule_days, created_at, updated_at FROM routines ORDER BY sort_order ASC").all();
});

ipcMain.handle('create_routine', (_, { id, name, sortOrder, scheduleDays }) => {
  db.prepare(`
    INSERT INTO routines (id, name, sort_order, schedule_days, created_at, updated_at) 
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, name, sortOrder, scheduleDays);
  return {
    id,
    name,
    sort_order: sortOrder,
    schedule_days: scheduleDays,
    created_at: "",
    updated_at: ""
  };
});

ipcMain.handle('update_routine', (_, { id, name, scheduleDays }) => {
  db.prepare(`
    UPDATE routines 
    SET name = ?, schedule_days = ?, updated_at = datetime('now') 
    WHERE id = ?
  `).run(name, scheduleDays, id);
  return db.prepare("SELECT id, name, sort_order, schedule_days, created_at, updated_at FROM routines WHERE id = ?").get(id);
});

ipcMain.handle('delete_routine', (_, { id }) => {
  db.prepare("DELETE FROM routines WHERE id = ?").run(id);
  return null;
});

ipcMain.handle('reorder_routines', (_, { ids }) => {
  const updateStmt = db.prepare("UPDATE routines SET sort_order = ?, updated_at = datetime('now') WHERE id = ?");
  const reorder = db.transaction((routineIds: string[]) => {
    for (let index = 0; index < routineIds.length; index++) {
      updateStmt.run(index, routineIds[index]);
    }
  });
  reorder(ids);
  return null;
});

ipcMain.handle('get_steps', (_, { routineId }) => {
  return db.prepare("SELECT id, routine_id, name, duration_minutes, url, sort_order, created_at FROM steps WHERE routine_id = ? ORDER BY sort_order ASC").all(routineId);
});

ipcMain.handle('add_step', (_, { id, routineId, name, durationMinutes, url, sortOrder }) => {
  db.prepare(`
    INSERT INTO steps (id, routine_id, name, duration_minutes, url, sort_order, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, routineId, name, durationMinutes, url, sortOrder);
  return {
    id,
    routine_id: routineId,
    name,
    duration_minutes: durationMinutes,
    url,
    sort_order: sortOrder,
    created_at: ""
  };
});

ipcMain.handle('update_step', (_, { id, name, durationMinutes, url }) => {
  db.prepare(`
    UPDATE steps 
    SET name = ?, duration_minutes = ?, url = ? 
    WHERE id = ?
  `).run(name, durationMinutes, url, id);
  return db.prepare("SELECT id, routine_id, name, duration_minutes, url, sort_order, created_at FROM steps WHERE id = ?").get(id);
});

ipcMain.handle('delete_step', (_, { id }) => {
  db.prepare("DELETE FROM steps WHERE id = ?").run(id);
  return null;
});

ipcMain.handle('reorder_steps', (_, { routineId, stepIds }) => {
  const updateStmt = db.prepare("UPDATE steps SET sort_order = ? WHERE id = ? AND routine_id = ?");
  const reorder = db.transaction((sIds: string[], rId: string) => {
    for (let index = 0; index < sIds.length; index++) {
      updateStmt.run(index, sIds[index], rId);
    }
  });
  reorder(stepIds, routineId);
  return null;
});

ipcMain.handle('get_daily_plan', (_, { date }) => {
  const row = db.prepare("SELECT id, date, priority, energy_level, created_at FROM daily_plans WHERE date = ?").get(date);
  return row || null;
});

ipcMain.handle('start_day', (_, { id, date, priority, energyLevel, dailySteps }) => {
  const startTransaction = db.transaction(() => {
    db.prepare(`
      INSERT OR REPLACE INTO daily_plans (id, date, priority, energy_level, created_at) 
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(id, date, priority, energyLevel);

    db.prepare("DELETE FROM daily_steps WHERE daily_plan_id = ?").run(id);

    const insertStepStmt = db.prepare(`
      INSERT INTO daily_steps (id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);

    for (const step of dailySteps) {
      insertStepStmt.run(
        step.id,
        id,
        step.step_id,
        step.routine_id,
        step.name,
        step.duration_minutes,
        step.url,
        step.sort_order
      );
    }
  });

  startTransaction();
  return {
    id,
    date,
    priority,
    energy_level: energyLevel,
    created_at: ""
  };
});

ipcMain.handle('get_daily_steps', (_, { dailyPlanId }) => {
  return db.prepare("SELECT id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, started_at, completed_at, sort_order FROM daily_steps WHERE daily_plan_id = ? ORDER BY sort_order ASC").all(dailyPlanId);
});

ipcMain.handle('update_daily_step_status', (_, { id, status, startedAt, completedAt }) => {
  db.prepare(`
    UPDATE daily_steps 
    SET status = ?, started_at = ?, completed_at = ? 
    WHERE id = ?
  `).run(status, startedAt, completedAt, id);
  return db.prepare("SELECT id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, started_at, completed_at, sort_order FROM daily_steps WHERE id = ?").get(id);
});

ipcMain.handle('get_journal_entry', (_, { dailyPlanId }) => {
  const row = db.prepare("SELECT id, daily_plan_id, date, went_well, went_poorly, tomorrow_focus, created_at FROM journal_entries WHERE daily_plan_id = ?").get(dailyPlanId);
  return row || null;
});

ipcMain.handle('save_journal', (_, { id, dailyPlanId, date, wentWell, wentPoorly, tomorrowFocus }) => {
  db.prepare(`
    INSERT OR REPLACE INTO journal_entries (id, daily_plan_id, date, went_well, went_poorly, tomorrow_focus, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, dailyPlanId, date, wentWell, wentPoorly, tomorrowFocus);
  return {
    id,
    daily_plan_id: dailyPlanId,
    date,
    went_well: wentWell,
    went_poorly: wentPoorly,
    tomorrow_focus: tomorrowFocus,
    created_at: ""
  };
});

ipcMain.handle('export_journal', (_, { date, path: journalPath, content }) => {
  if (!fs.existsSync(journalPath)) {
    throw new Error("The configured directory path does not exist. Please verify your Journal Path in Settings.");
  }
  const filename = `journal-${date}.md`;
  const filePath = path.join(journalPath, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return null;
});

ipcMain.handle('open_external_url', async (_, { url }) => {
  await shell.openExternal(url);
  return null;
});

app.whenReady().then(() => {
  initDb();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});
