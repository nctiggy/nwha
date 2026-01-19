// NWHA-001: Fastify server starts and listens
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../src/server.js';

describe('Server Startup (NWHA-001)', () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should start without errors', async () => {
    // Server created successfully in beforeAll
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });

  it('should listen on configured port', async () => {
    const port = 3001; // Use different port for test
    await server.listen({ port, host: '127.0.0.1' });

    const address = server.server.address();
    expect(address.port).toBe(port);

    await server.close();
    // Recreate server for other tests
    server = await createServer();
  });

  it('should have logger configured', () => {
    expect(server.log).toBeDefined();
    expect(typeof server.log.info).toBe('function');
    expect(typeof server.log.error).toBe('function');
  });
});
