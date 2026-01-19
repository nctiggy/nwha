// NWHA-011: Auth middleware for protected routes
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Auth Middleware (NWHA-011)', () => {
  let server;
  const testDataDir = join(process.cwd(), 'test-data-auth-middleware');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;
    process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-chars';
    process.env.AUTH_BYPASS = 'true';

    const { createServer } = await import('../../src/server.js');
    server = await createServer();
  });

  afterAll(async () => {
    if (server) await server.close();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  it('should return 401 for protected routes without session', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/projects'
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow access to protected routes with valid session', async () => {
    // First login
    const loginRes = await server.inject({
      method: 'POST',
      url: '/auth/dev-login'
    });
    const cookies = loginRes.headers['set-cookie'];
    const sessionCookie = (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];

    // Then access protected route
    const response = await server.inject({
      method: 'GET',
      url: '/api/projects',
      headers: {
        cookie: sessionCookie
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it('should pass user to request when authenticated', async () => {
    // Login
    const loginRes = await server.inject({
      method: 'POST',
      url: '/auth/dev-login'
    });
    const cookies = loginRes.headers['set-cookie'];
    const sessionCookie = (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];

    // Access a route that returns user info
    const response = await server.inject({
      method: 'GET',
      url: '/api/projects',
      headers: {
        cookie: sessionCookie
      }
    });

    // The projects endpoint should be accessible and return array
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.projects).toBeDefined();
  });
});
