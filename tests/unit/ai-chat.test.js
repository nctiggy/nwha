// NWHA-017: AI response via Claude CLI
// NWHA-018: Codex CLI fallback
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

// Mock the CLI service
vi.mock('../../src/services/cli.js', () => ({
  getAIResponse: vi.fn().mockResolvedValue({
    response: 'This is a mock Claude response',
    engine: 'claude'
  }),
  runClaude: vi.fn().mockResolvedValue('This is a mock Claude response'),
  runCodex: vi.fn().mockResolvedValue('This is a mock Codex response')
}));

describe('AI Chat (NWHA-017, NWHA-018)', () => {
  let server;
  let sessionCookie;
  let projectSlug;
  const testDataDir = join(process.cwd(), 'test-data-ai-chat');

  beforeAll(async () => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    mkdirSync(testDataDir, { recursive: true });
    process.env.DATA_DIR = testDataDir;
    process.env.SESSION_SECRET = 'test-secret-key-must-be-at-least-32-chars';
    process.env.AUTH_BYPASS = 'true';
    process.env.CLI_FALLBACK_ENABLED = 'true';

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
      payload: JSON.stringify({ name: 'AI Chat Test Project' })
    });
    const projectBody = JSON.parse(projectRes.body);
    projectSlug = projectBody.project.slug;
  });

  afterAll(async () => {
    if (server) await server.close();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
    vi.restoreAllMocks();
  });

  describe('AI Response via Claude CLI (NWHA-017)', () => {
    it('should trigger Claude CLI when posting user message with ai:true', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'user',
          content: 'Hello, please help me with a task',
          ai: true
        })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.userMessage).toBeDefined();
      expect(body.aiResponse).toBeDefined();
    });

    it('should store AI response as assistant message', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'user',
          content: 'What is 2+2?',
          ai: true
        })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.aiResponse.role).toBe('assistant');
      expect(body.aiResponse.content).toBeDefined();
    });

    it('should return both user message and AI response', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'user',
          content: 'Test message',
          ai: true
        })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.userMessage).toBeDefined();
      expect(body.userMessage.role).toBe('user');
      expect(body.userMessage.content).toBe('Test message');
      expect(body.aiResponse).toBeDefined();
      expect(body.aiResponse.role).toBe('assistant');
    });

    it('should work without ai flag (stores message only)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/projects/${projectSlug}/chat`,
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({
          role: 'user',
          content: 'Just a regular message'
        })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
      expect(body.aiResponse).toBeUndefined();
    });
  });
});
