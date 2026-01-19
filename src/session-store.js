// SQLite Session Store for @fastify/session
import { getDb, initSchema } from './db/index.js';

/**
 * SQLite-backed session store compatible with @fastify/session
 */
export class SQLiteStore {
  constructor() {
    // Ensure schema is initialized
    initSchema();
    this.db = getDb();
    this.createSessionTable();
  }

  createSessionTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS http_sessions (
        sid TEXT PRIMARY KEY,
        session TEXT NOT NULL,
        expires INTEGER
      )
    `);
    // Index for cleanup queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_http_sessions_expires ON http_sessions(expires)
    `);
  }

  set(sessionId, session, callback) {
    try {
      const expires = session.cookie?.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + 86400000; // 24 hours default

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO http_sessions (sid, session, expires)
        VALUES (?, ?, ?)
      `);
      stmt.run(sessionId, JSON.stringify(session), expires);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  get(sessionId, callback) {
    try {
      const stmt = this.db.prepare(`
        SELECT session FROM http_sessions
        WHERE sid = ? AND (expires IS NULL OR expires > ?)
      `);
      const row = stmt.get(sessionId, Date.now());
      if (row) {
        callback(null, JSON.parse(row.session));
      } else {
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  destroy(sessionId, callback) {
    try {
      const stmt = this.db.prepare('DELETE FROM http_sessions WHERE sid = ?');
      stmt.run(sessionId);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}
