// NWHA-003: SQLite database connection
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// Test will import db module once it exists
let getDb, closeDb;

describe('SQLite Database Connection (NWHA-003)', () => {
  const testDataDir = join(process.cwd(), 'test-data');
  const testDbPath = join(testDataDir, 'nwha.db');

  beforeAll(async () => {
    // Create test data directory
    if (!existsSync(testDataDir)) {
      mkdirSync(testDataDir, { recursive: true });
    }
    // Set DATA_DIR for tests
    process.env.DATA_DIR = testDataDir;

    // Dynamic import to allow test to fail first
    const dbModule = await import('../../src/db/index.js');
    getDb = dbModule.getDb;
    closeDb = dbModule.closeDb;
  });

  afterAll(() => {
    // Clean up
    if (closeDb) closeDb();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('should connect to SQLite database', () => {
    const db = getDb();
    expect(db).toBeDefined();
    expect(db.open).toBe(true);
  });

  it('should create database file if not exists', () => {
    getDb(); // Ensure connection
    expect(existsSync(testDbPath)).toBe(true);
  });

  it('should export singleton connection', () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('should be able to execute queries', () => {
    const db = getDb();
    const result = db.prepare('SELECT 1 as test').get();
    expect(result.test).toBe(1);
  });
});
