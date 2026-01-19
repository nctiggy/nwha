// NWHA-023: Start Ralph session
// NWHA-024: Ralph session control
// NWHA-025: Ralph iteration limit
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock node-pty since it requires native bindings
vi.mock('node-pty', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    on: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn()
  }))
}));

describe('Ralph Session API (NWHA-023, NWHA-024, NWHA-025)', () => {
  let server;
  let sessionCookie;
  let projectSlug;
  const testDataDir = join(process.cwd(), 'test-data-ralph-session');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;
    process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-chars';
    process.env.AUTH_BYPASS = 'true';
    process.env.RALPH_MAX_ITERATIONS = '20';

    const { createServer } = await import('../../src/server.js');
    server = await createServer();

    // Login to get session
    const loginRes = await server.inject({
      method: 'POST',
      url: '/auth/dev-login'
    });
    const cookies = loginRes.headers['set-cookie'];
    sessionCookie = (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];

    // Create a test project
    const projectRes = await server.inject({
      method: 'POST',
      url: '/api/projects',
      headers: {
        cookie: sessionCookie,
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ name: 'Ralph Session Test' })
    });
    const projectBody = JSON.parse(projectRes.body);
    projectSlug = projectBody.project.slug;
  });

  afterAll(async () => {
    if (server) await server.close();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  describe('Start Ralph Session (NWHA-023)', () => {
    it('should create session via POST /api/projects/:slug/sessions', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/sessions`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({})
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.session).toBeDefined();
      expect(body.session.id).toBeDefined();
    });

    it('should track session with status: running', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/sessions`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({})
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.session.status).toBe('running');
    });

    it('should return session ID', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/sessions`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({})
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(typeof body.session.id).toBe('number');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/projects/non-existent/sessions',
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({})
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Ralph Session Control (NWHA-024)', () => {
    let sessionId;

    beforeAll(async () => {
      // Create a session for control tests
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/sessions`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({})
      });
      const body = JSON.parse(response.body);
      sessionId = body.session.id;
    });

    it('should pause session via POST /api/sessions/:id/pause', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/pause`,
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.session.status).toBe('paused');
    });

    it('should resume session via POST /api/sessions/:id/resume', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/resume`,
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.session.status).toBe('running');
    });

    it('should stop session via POST /api/sessions/:id/stop', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/sessions/${sessionId}/stop`,
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.session.status).toBe('stopped');
    });
  });
});
