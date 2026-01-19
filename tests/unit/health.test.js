// NWHA-002: Health endpoint test
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../src/server.js';

describe('Health Endpoint', () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 200 with status ok', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('should respond within 100ms', async () => {
    const start = Date.now();
    await server.inject({
      method: 'GET',
      url: '/health'
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
