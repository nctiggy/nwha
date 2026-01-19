// NWHA-008: GitHub OAuth - redirect to GitHub
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('GitHub OAuth Redirect (NWHA-008)', () => {
  let server;
  const testDataDir = join(process.cwd(), 'test-data-oauth');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;
    process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-chars';
    process.env.GITHUB_CLIENT_ID = 'test-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
    process.env.GITHUB_CALLBACK_URL = 'http://localhost:3000/auth/github/callback';

    const { createServer } = await import('../../src/server.js');
    server = await createServer();
  });

  afterAll(async () => {
    if (server) await server.close();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  it('should redirect GET /auth/github to GitHub OAuth', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/auth/github'
    });

    // Should redirect (302)
    expect(response.statusCode).toBe(302);

    // Should redirect to GitHub
    const location = response.headers.location;
    expect(location).toContain('github.com');
  });

  it('should include client_id in redirect URL', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/auth/github'
    });

    const location = response.headers.location;
    expect(location).toContain('client_id=test-client-id');
  });

  it('should include callback_url in redirect URL', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/auth/github'
    });

    const location = response.headers.location;
    // URL-encoded callback URL
    expect(location).toContain('redirect_uri=');
  });
});
