// NWHA-004: Database schema initialization
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

let getDb, closeDb, initSchema;

describe('Database Schema Initialization (NWHA-004)', () => {
  const testDataDir = join(process.cwd(), 'test-data-schema');
  const testDbPath = join(testDataDir, 'nwha.db');

  beforeAll(async () => {
    // Clean up any existing test data
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;

    // Dynamic import
    const dbModule = await import('../../src/db/index.js');
    getDb = dbModule.getDb;
    closeDb = dbModule.closeDb;
    initSchema = dbModule.initSchema;
  });

  afterAll(() => {
    if (closeDb) closeDb();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  it('should create users table with correct columns', () => {
    const db = getDb();
    initSchema();

    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columns = tableInfo.map(col => col.name);

    expect(columns).toContain('id');
    expect(columns).toContain('github_id');
    expect(columns).toContain('username');
    expect(columns).toContain('email');
    expect(columns).toContain('role');
  });

  it('should create projects table with foreign key to users', () => {
    const db = getDb();
    initSchema();

    const tableInfo = db.prepare("PRAGMA table_info(projects)").all();
    const columns = tableInfo.map(col => col.name);

    expect(columns).toContain('id');
    expect(columns).toContain('user_id');
    expect(columns).toContain('name');
    expect(columns).toContain('slug');

    // Check foreign key
    const fkInfo = db.prepare("PRAGMA foreign_key_list(projects)").all();
    const userFk = fkInfo.find(fk => fk.table === 'users');
    expect(userFk).toBeDefined();
  });

  it('should create conversations table with foreign key to projects', () => {
    const db = getDb();
    initSchema();

    const tableInfo = db.prepare("PRAGMA table_info(conversations)").all();
    const columns = tableInfo.map(col => col.name);

    expect(columns).toContain('id');
    expect(columns).toContain('project_id');
    expect(columns).toContain('role');
    expect(columns).toContain('content');

    // Check foreign key
    const fkInfo = db.prepare("PRAGMA foreign_key_list(conversations)").all();
    const projectFk = fkInfo.find(fk => fk.table === 'projects');
    expect(projectFk).toBeDefined();
  });

  it('should be idempotent (safe to run multiple times)', () => {
    const db = getDb();

    // Run schema init multiple times - should not throw
    expect(() => {
      initSchema();
      initSchema();
      initSchema();
    }).not.toThrow();

    // Tables should still exist and be functional
    const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    expect(result).toBeDefined();
  });
});
