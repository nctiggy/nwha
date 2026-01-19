// NWHA-007: Auth bypass for testing
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Auth Bypass (NWHA-007)', () => {
  const testDataDir = join(process.cwd(), 'test-data-auth-bypass');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;
    process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-chars';
  });

  afterAll(() => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  describe('when AUTH_BYPASS=true', () => {
    let server;

    beforeAll(async () => {
      process.env.AUTH_BYPASS = 'true';
      const { createServer } = await import('../../src/server.js');
      server = await createServer();
    });

    afterAll(async () => {
      if (server) await server.close();
    });

    it('should allow POST /auth/dev-login to create session', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/dev-login'
      });

      expect(response.statusCode).toBe(200);

      // Should set session cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Should return user data
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.username).toBe('test-user');
      expect(body.user.github_id).toBe('test-123');
    });

    it('should create mock user with correct properties', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/dev-login'
      });

      const body = JSON.parse(response.body);
      expect(body.user.id).toBe(1);
      expect(body.user.username).toBe('test-user');
      expect(body.user.github_id).toBe('test-123');
    });
  });
});

// Test AUTH_BYPASS=false in a separate file to avoid module caching issues
