// NWHA-009: GitHub OAuth callback handler
// NWHA-010: Auth status endpoint
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Auth Endpoints (NWHA-009, NWHA-010)', () => {
  let server;
  const testDataDir = join(process.cwd(), 'test-data-auth-endpoints');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;
    process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-chars';
    process.env.GITHUB_CLIENT_ID = 'test-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
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

  describe('OAuth Callback (NWHA-009)', () => {
    it('should have GET /auth/github/callback route', async () => {
      // Without a valid code, it will fail, but route should exist
      const response = await server.inject({
        method: 'GET',
        url: '/auth/github/callback?code=invalid&state=invalid'
      });

      // Should return 403 (invalid state) not 404 (route not found)
      expect(response.statusCode).not.toBe(404);
    });
  });

  describe('Auth Status (NWHA-010)', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me'
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not authenticated');
    });

    it('should return user when authenticated', async () => {
      // First, login via dev-login
      const loginRes = await server.inject({
        method: 'POST',
        url: '/auth/dev-login'
      });

      const cookies = loginRes.headers['set-cookie'];
      const sessionCookie = (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];

      // Then check /auth/me
      const response = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.username).toBe('test-user');
    });

    it('should logout and redirect', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/logout'
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('/');
    });
  });
});
