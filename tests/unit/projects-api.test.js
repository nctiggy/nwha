// NWHA-012: Create project endpoint
// NWHA-013: List and get projects
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Projects API (NWHA-012, NWHA-013)', () => {
  let server;
  let sessionCookie;
  const testDataDir = join(process.cwd(), 'test-data-projects-api');

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
  });

  afterAll(async () => {
    if (server) await server.close();
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  describe('Create Project (NWHA-012)', () => {
    it('should create project with name', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/projects',
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({ name: 'My Test Project' })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.project).toBeDefined();
      expect(body.project.name).toBe('My Test Project');
    });

    it('should auto-generate slug from name', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/projects',
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({ name: 'Another Project Name' })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.project.slug).toBe('another-project-name');
    });

    it('should return created project with id and slug', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/projects',
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({ name: 'Third Project' })
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.project.id).toBeDefined();
      expect(body.project.slug).toBeDefined();
    });

    it('should require name', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/projects',
        headers: {
          cookie: sessionCookie,
          'content-type': 'application/json'
        },
        payload: JSON.stringify({})
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('List and Get Projects (NWHA-013)', () => {
    it('should list user projects', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/projects',
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.projects).toBeDefined();
      expect(Array.isArray(body.projects)).toBe(true);
      expect(body.projects.length).toBeGreaterThan(0);
    });

    it('should get single project by slug', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/projects/my-test-project',
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.project).toBeDefined();
      expect(body.project.slug).toBe('my-test-project');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/projects/non-existent-project',
        headers: {
          cookie: sessionCookie
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
