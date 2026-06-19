import { ipcMain as i, shell as N, app as u, BrowserWindow as m } from "electron";
import T from "path";
import p from "fs";
import h from "better-sqlite3";
import { fileURLToPath as L } from "url";
const S = L(import.meta.url), c = T.dirname(S);
let l = null, t;
function f() {
  const n = u.getPath("userData");
  p.existsSync(n) || p.mkdirSync(n, { recursive: !0 });
  const e = T.join(n, "routiner.db");
  t = new h(e), t.pragma("foreign_keys = ON"), t.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        journal_path TEXT,
        notification_preferences TEXT,
        launch_preferences TEXT,
        default_routine_id TEXT,
        updated_at TEXT
    );
  `), t.prepare("SELECT COUNT(*) as count FROM settings").get().count === 0 && t.prepare(`
      INSERT INTO settings (id, theme, journal_path, notification_preferences, launch_preferences, default_routine_id, updated_at)
      VALUES ('default', 'dark', '', '{}', '{}', '', datetime('now'))
    `).run(), t.exec(`
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
function R() {
  l = new m({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: T.join(c, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), process.env.VITE_DEV_SERVER_URL ? l.loadURL(process.env.VITE_DEV_SERVER_URL) : l.loadFile(T.join(c, "../dist/index.html")), l.on("closed", () => {
    l = null;
  });
}
i.handle("get_settings", () => t.prepare("SELECT id, theme, journal_path, notification_preferences, launch_preferences, default_routine_id, updated_at FROM settings LIMIT 1").get());
i.handle("update_settings", (n, { settings: e }) => (t.prepare(`
    UPDATE settings 
    SET theme = ?, journal_path = ?, notification_preferences = ?, launch_preferences = ?, default_routine_id = ?, updated_at = datetime('now') 
    WHERE id = ?
  `).run(
  e.theme,
  e.journal_path,
  e.notification_preferences,
  e.launch_preferences,
  e.default_routine_id,
  e.id
), e));
i.handle("get_routines", () => t.prepare("SELECT id, name, sort_order, schedule_days, created_at, updated_at FROM routines ORDER BY sort_order ASC").all());
i.handle("create_routine", (n, { id: e, name: r, sortOrder: a, scheduleDays: d }) => (t.prepare(`
    INSERT INTO routines (id, name, sort_order, schedule_days, created_at, updated_at) 
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(e, r, a, d), {
  id: e,
  name: r,
  sort_order: a,
  schedule_days: d,
  created_at: "",
  updated_at: ""
}));
i.handle("update_routine", (n, { id: e, name: r, scheduleDays: a }) => (t.prepare(`
    UPDATE routines 
    SET name = ?, schedule_days = ?, updated_at = datetime('now') 
    WHERE id = ?
  `).run(r, a, e), t.prepare("SELECT id, name, sort_order, schedule_days, created_at, updated_at FROM routines WHERE id = ?").get(e)));
i.handle("delete_routine", (n, { id: e }) => (t.prepare("DELETE FROM routines WHERE id = ?").run(e), null));
i.handle("reorder_routines", (n, { ids: e }) => {
  const r = t.prepare("UPDATE routines SET sort_order = ?, updated_at = datetime('now') WHERE id = ?");
  return t.transaction((d) => {
    for (let o = 0; o < d.length; o++)
      r.run(o, d[o]);
  })(e), null;
});
i.handle("get_steps", (n, { routineId: e }) => t.prepare("SELECT id, routine_id, name, duration_minutes, url, sort_order, created_at FROM steps WHERE routine_id = ? ORDER BY sort_order ASC").all(e));
i.handle("add_step", (n, { id: e, routineId: r, name: a, durationMinutes: d, url: o, sortOrder: _ }) => (t.prepare(`
    INSERT INTO steps (id, routine_id, name, duration_minutes, url, sort_order, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(e, r, a, d, o, _), {
  id: e,
  routine_id: r,
  name: a,
  duration_minutes: d,
  url: o,
  sort_order: _,
  created_at: ""
}));
i.handle("update_step", (n, { id: e, name: r, durationMinutes: a, url: d }) => (t.prepare(`
    UPDATE steps 
    SET name = ?, duration_minutes = ?, url = ? 
    WHERE id = ?
  `).run(r, a, d, e), t.prepare("SELECT id, routine_id, name, duration_minutes, url, sort_order, created_at FROM steps WHERE id = ?").get(e)));
i.handle("delete_step", (n, { id: e }) => (t.prepare("DELETE FROM steps WHERE id = ?").run(e), null));
i.handle("reorder_steps", (n, { routineId: e, stepIds: r }) => {
  const a = t.prepare("UPDATE steps SET sort_order = ? WHERE id = ? AND routine_id = ?");
  return t.transaction((o, _) => {
    for (let s = 0; s < o.length; s++)
      a.run(s, o[s], _);
  })(r, e), null;
});
i.handle("get_daily_plan", (n, { date: e }) => t.prepare("SELECT id, date, priority, energy_level, created_at FROM daily_plans WHERE date = ?").get(e) || null);
i.handle("start_day", (n, { id: e, date: r, priority: a, energyLevel: d, dailySteps: o }) => (t.transaction(() => {
  t.prepare(`
      INSERT OR REPLACE INTO daily_plans (id, date, priority, energy_level, created_at) 
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(e, r, a, d), t.prepare("DELETE FROM daily_steps WHERE daily_plan_id = ?").run(e);
  const s = t.prepare(`
      INSERT INTO daily_steps (id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
  for (const E of o)
    s.run(
      E.id,
      e,
      E.step_id,
      E.routine_id,
      E.name,
      E.duration_minutes,
      E.url,
      E.sort_order
    );
})(), {
  id: e,
  date: r,
  priority: a,
  energy_level: d,
  created_at: ""
}));
i.handle("get_daily_steps", (n, { dailyPlanId: e }) => t.prepare("SELECT id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, started_at, completed_at, sort_order FROM daily_steps WHERE daily_plan_id = ? ORDER BY sort_order ASC").all(e));
i.handle("update_daily_step_status", (n, { id: e, status: r, startedAt: a, completedAt: d }) => (t.prepare(`
    UPDATE daily_steps 
    SET status = ?, started_at = ?, completed_at = ? 
    WHERE id = ?
  `).run(r, a, d, e), t.prepare("SELECT id, daily_plan_id, step_id, routine_id, name, duration_minutes, url, status, started_at, completed_at, sort_order FROM daily_steps WHERE id = ?").get(e)));
i.handle("get_journal_entry", (n, { dailyPlanId: e }) => t.prepare("SELECT id, daily_plan_id, date, went_well, went_poorly, tomorrow_focus, created_at FROM journal_entries WHERE daily_plan_id = ?").get(e) || null);
i.handle("save_journal", (n, { id: e, dailyPlanId: r, date: a, wentWell: d, wentPoorly: o, tomorrowFocus: _ }) => (t.prepare(`
    INSERT OR REPLACE INTO journal_entries (id, daily_plan_id, date, went_well, went_poorly, tomorrow_focus, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(e, r, a, d, o, _), {
  id: e,
  daily_plan_id: r,
  date: a,
  went_well: d,
  went_poorly: o,
  tomorrow_focus: _,
  created_at: ""
}));
i.handle("export_journal", (n, { date: e, path: r, content: a }) => {
  if (!p.existsSync(r))
    throw new Error("The configured directory path does not exist. Please verify your Journal Path in Settings.");
  const d = `journal-${e}.md`, o = T.join(r, d);
  return p.writeFileSync(o, a, "utf8"), null;
});
i.handle("open_external_url", async (n, { url: e }) => (await N.openExternal(e), null));
u.whenReady().then(() => {
  f(), R(), u.on("activate", () => {
    m.getAllWindows().length === 0 && R();
  });
});
u.on("window-all-closed", () => {
  process.platform !== "darwin" && (t && t.close(), u.quit());
});
