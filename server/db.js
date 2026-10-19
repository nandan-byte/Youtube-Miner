const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'youtube_qa.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high reliability and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 4. Test Runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      video_url TEXT NOT NULL,
      video_id TEXT NOT NULL,
      video_title TEXT,
      browser_type TEXT DEFAULT 'chromium',
      headless INTEGER DEFAULT 0,
      target_repetitions INTEGER NOT NULL,
      target_duration_seconds INTEGER NOT NULL,
      completed_repetitions INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 5. Test Items (Individual Repetitions) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      repetition_index INTEGER NOT NULL,
      status TEXT NOT NULL,
      playback_duration_achieved REAL DEFAULT 0,
      error_message TEXT,
      logs_json TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin user if no users exist
  seedAdminUser();
}

function seedAdminUser() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count === 0) {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPassword, salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(adminUsername, hash, now, now);

    console.log(`[DB] Initial admin account initialized: username="${adminUsername}"`);
  }
}

// Helper methods for settings
function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

// Helper to clean up expired sessions
function cleanExpiredSessions() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
}

// Initialize tables immediately upon module load
initDatabase();

// Clean expired sessions once at startup
cleanExpiredSessions();

module.exports = {
  db,
  initDatabase,
  getSetting,
  setSetting,
  cleanExpiredSessions
};
