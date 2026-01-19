// NWHA-005: Sessions and tasks tables
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

let getDb, closeDb, initSchema;

describe('Sessions and Tasks Tables (NWHA-005)', () => {
  const testDataDir = join(process.cwd(), 'test-data-ralph');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;

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

  it('should create sessions table with required columns', () => {
    const db = getDb();
    initSchema();

    const tableInfo = db.prepare("PRAGMA table_info(sessions)").all();
    const columns = tableInfo.map(col => col.name);

    expect(columns).toContain('id');
    expect(columns).toContain('project_id');
    expect(columns).toContain('engine');
    expect(columns).toContain('status');
    expect(columns).toContain('pid');
    expect(columns).toContain('iterations');
  });

  it('should create tasks table with required columns', () => {
    const db = getDb();
    initSchema();

    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const columns = tableInfo.map(col => col.name);

    expect(columns).toContain('id');
    expect(columns).toContain('project_id');
    expect(columns).toContain('title');
    expect(columns).toContain('status');
    expect(columns).toContain('phase');
    expect(columns).toContain('order_num');
  });

  it('should create knowledge table with required columns', () => {
    const db = getDb();
    initSchema();

    const tableInfo = db.prepare("PRAGMA table_info(knowledge)").all();
    const columns = tableInfo.map(col => col.name);

    expect(columns).toContain('id');
    expect(columns).toContain('category');
    expect(columns).toContain('problem');
    expect(columns).toContain('solution');
    expect(columns).toContain('context');
    expect(columns).toContain('tags');
  });

  it('should create FTS virtual table for knowledge search', () => {
    const db = getDb();
    initSchema();

    // FTS tables are listed in sqlite_master with type='table'
    const ftsTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_fts'"
    ).get();

    expect(ftsTable).toBeDefined();

    // Test that FTS search works
    db.prepare("INSERT INTO knowledge (category, problem, solution, context, tags) VALUES (?, ?, ?, ?, ?)")
      .run('test', 'test problem', 'test solution', 'test context', 'tag1,tag2');

    const results = db.prepare(
      "SELECT * FROM knowledge_fts WHERE knowledge_fts MATCH 'test'"
    ).all();

    expect(results.length).toBeGreaterThan(0);
  });
});
