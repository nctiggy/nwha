// NWHA Database - SQLite connection with better-sqlite3
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = join(DATA_DIR, 'nwha.db');

let db = null;

/**
 * Get the database connection (singleton)
 * Creates database file and directory if they don't exist
 */
export function getDb() {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  // Create database connection
  db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null
  });

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  return db;
}

/**
 * Close the database connection
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get the database file path
 */
export function getDbPath() {
  return DB_PATH;
}
