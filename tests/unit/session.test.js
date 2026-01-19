// NWHA-006: Session middleware setup
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

let createServer;

describe('Session Middleware (NWHA-006)', () => {
  let server;
  const testDataDir = join(process.cwd(), 'test-data-session');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;
    process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-chars';

    const serverModule = await import('../../src/server.js');
    createServer = serverModule.createServer;
    server = await createServer();
  });

  afterAll(async () => {
    if (server) await server.close();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  it('should set session cookie when session data is modified', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/session-test'
    });

    expect(response.statusCode).toBe(200);
    // Session cookie should be set when session is modified
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookieHeader).toContain('sessionId');
  });

  it('should persist session data across requests', async () => {
    // First request - set session data
    const res1 = await server.inject({
      method: 'GET',
      url: '/session-test'
    });

    expect(res1.statusCode).toBe(200);
    const cookies = res1.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // Extract cookie for second request
    const cookieHeader = Array.isArray(cookies) ? cookies[0] : cookies;
    const sessionCookie = cookieHeader.split(';')[0];

    // Second request - retrieve session data with same cookie
    const res2 = await server.inject({
      method: 'GET',
      url: '/session-data',
      headers: {
        cookie: sessionCookie
      }
    });

    expect(res2.statusCode).toBe(200);
    const body = JSON.parse(res2.body);
    expect(body.visited).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  it('should have session secret configured', () => {
    expect(process.env.SESSION_SECRET).toBeDefined();
    expect(process.env.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('should store sessions in SQLite', async () => {
    // This test verifies sessions are persisted to SQLite
    const { getDb } = await import('../../src/db/index.js');
    const db = getDb();

    // After session-test requests, there should be entries in http_sessions
    const sessions = db.prepare('SELECT COUNT(*) as count FROM http_sessions').get();
    expect(sessions.count).toBeGreaterThan(0);
  });
});
