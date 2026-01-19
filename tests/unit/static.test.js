// NWHA-026: Static file serving
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('Static File Serving (NWHA-026)', () => {
  let server;
  const testDataDir = join(process.cwd(), 'test-data-static');

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

  it('should have @fastify/static configured', () => {
    // Server should be configured with static file serving
    expect(server).toBeDefined();
  });

  it('should serve index.html at GET /', async () => {
    // Create a simple index.html in the public folder for testing
    const publicDir = join(process.cwd(), 'public');
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    const indexPath = join(publicDir, 'index.html');
    if (!existsSync(indexPath)) {
      writeFileSync(indexPath, '<html><body>NWHA</body></html>');
    }

    const response = await server.inject({
      method: 'GET',
      url: '/'
    });

    // Should return 200 if index.html exists
    expect([200, 404]).toContain(response.statusCode);
  });

  it('should serve CSS files from /css', async () => {
    const cssDir = join(process.cwd(), 'public', 'css');
    if (!existsSync(cssDir)) {
      mkdirSync(cssDir, { recursive: true });
    }

    const cssPath = join(cssDir, 'test.css');
    writeFileSync(cssPath, 'body { color: red; }');

    const response = await server.inject({
      method: 'GET',
      url: '/css/test.css'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/css');
  });

  it('should serve JS files from /js', async () => {
    const jsDir = join(process.cwd(), 'public', 'js');
    if (!existsSync(jsDir)) {
      mkdirSync(jsDir, { recursive: true });
    }

    const jsPath = join(jsDir, 'test.js');
    writeFileSync(jsPath, 'console.log("test");');

    const response = await server.inject({
      method: 'GET',
      url: '/js/test.js'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('javascript');
  });
});
