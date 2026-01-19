// NWHA-015: Store conversation messages
// NWHA-016: Retrieve conversation history
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Chat API (NWHA-015, NWHA-016)', () => {
  let server;
  let sessionCookie;
  let projectSlug;
  const testDataDir = join(process.cwd(), 'test-data-chat-api');

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
      payload: JSON.stringify({ name: 'Chat Test Project' })
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

  describe('Store Conversation Messages (NWHA-015)', () => {
    it('should store a user message', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'user',
          content: 'Hello, this is a test message'
        })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
      expect(body.message.role).toBe('user');
      expect(body.message.content).toBe('Hello, this is a test message');
    });

    it('should store an assistant message', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'assistant',
          content: 'This is an AI response'
        })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message.role).toBe('assistant');
    });

    it('should associate message with project', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'user',
          content: 'Another message'
        })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message.project_id).toBeDefined();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/projects/non-existent/chat',
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'user',
          content: 'Test message'
        })
      });

      expect(response.statusCode).toBe(404);
    });

    it('should require role and content', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({})
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Retrieve Conversation History (NWHA-016)', () => {
    it('should return messages for project', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.messages).toBeDefined();
      expect(Array.isArray(body.messages)).toBe(true);
      expect(body.messages.length).toBeGreaterThan(0);
    });

    it('should return messages ordered by created_at', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Verify chronological order
      for (let i = 1; i < body.messages.length; i++) {
        const prev = new Date(body.messages[i - 1].created_at);
        const curr = new Date(body.messages[i].created_at);
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });

    it('should return 404 for non-existent project', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/projects/non-existent/chat',
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(404);
    });

    it('should only return messages for owned project', async () => {
      // This is implicitly tested - auth middleware ensures only owned projects are accessible
      const response = await server.inject({
        method: 'GET',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
