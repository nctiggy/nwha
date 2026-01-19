// NWHA Server - Fastify setup
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SQLiteStore } from './session-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SESSION_SECRET = process.env.SESSION_SECRET || 'default-dev-secret-change-in-production';

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

  return fastify;
}
