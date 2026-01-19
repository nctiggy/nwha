// NWHA Server - Fastify setup
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SQLiteStore } from './session-store.js';
import { registerAuthRoutes } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SESSION_SECRET = process.env.SESSION_SECRET || 'default-dev-secret-change-in-production';
const AUTH_BYPASS = process.env.AUTH_BYPASS === 'true';

// Mock user for testing when AUTH_BYPASS=true
const MOCK_USER = {
  id: 1,
  username: 'test-user',
  github_id: 'test-123',
  email: 'test@example.com',
  role: 'user'
};

export async function createServer() {
  const fastify = Fastify({
    logger: true
  });

  // Cookie plugin (required before session)
  await fastify.register(fastifyCookie);

  // Session middleware with SQLite store
  await fastify.register(fastifySession, {
    secret: SESSION_SECRET,
    store: new SQLiteStore(),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 86400000 // 24 hours
    },
    saveUninitialized: false
  });

  // Static files
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/'
  });

  // Health check endpoint (NWHA-002)
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });

  // Session test endpoint (for testing session middleware)
  fastify.get('/session-test', async (request, reply) => {
    // Set session data to trigger session save
    request.session.set('visited', true);
    request.session.set('timestamp', new Date().toISOString());
    return { sessionSet: true };
  });

  // Get session data endpoint
  fastify.get('/session-data', async (request, reply) => {
    const visited = request.session.get('visited');
    const timestamp = request.session.get('timestamp');
    return { visited, timestamp };
  });

  // Auth bypass for testing (NWHA-007)
  if (AUTH_BYPASS) {
    fastify.post('/auth/dev-login', async (request, reply) => {
      // Set user in session
      request.session.set('user', MOCK_USER);
      return { user: MOCK_USER };
    });
  }

  // Register auth routes (NWHA-008, NWHA-009, NWHA-010)
  await registerAuthRoutes(fastify);

  return fastify;
}
