// NWHA Server - Fastify setup
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { Server as SocketIO } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SQLiteStore } from './session-store.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerApiRoutes } from './routes/api.js';
import { getDb, initSchema } from './db/index.js';

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
      // Ensure mock user exists in database
      initSchema();
      const db = getDb();
      let user = db.prepare('SELECT * FROM users WHERE github_id = ?').get(MOCK_USER.github_id);
      if (!user) {
        const result = db.prepare(`
          INSERT INTO users (github_id, username, email, role)
          VALUES (?, ?, ?, ?)
        `).run(MOCK_USER.github_id, MOCK_USER.username, MOCK_USER.email, MOCK_USER.role);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      }
      // Use actual database user (with correct id)
      request.session.set('user', user);
      return { user };
    });
  }

  // Register auth routes (NWHA-008, NWHA-009, NWHA-010)
  await registerAuthRoutes(fastify);

  // Register API routes (NWHA-011, NWHA-012, NWHA-013)
  await registerApiRoutes(fastify);

  // Socket.io setup (NWHA-019)
  fastify.addHook('onReady', async () => {
    const io = new SocketIO(fastify.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Socket authentication middleware (NWHA-020)
    io.use((socket, next) => {
      // Parse session cookie from handshake headers
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication required - no session cookie'));
      }

      // Parse the session cookie
      const cookies = {};
      cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        cookies[name] = value;
      });

      const sessionId = cookies['sessionId'];
      if (!sessionId) {
        return next(new Error('Authentication required - no session'));
      }

      // Verify session in store
      const sessionStore = new SQLiteStore();
      sessionStore.get(sessionId, (err, session) => {
        if (err || !session || !session.user) {
          return next(new Error('Authentication required - invalid session'));
        }

        // Attach user to socket
        socket.user = session.user;
        next();
      });
    });

    // Handle socket connections
    io.on('connection', (socket) => {
      fastify.log.info(`Socket connected: ${socket.id} (user: ${socket.user?.username})`);

      socket.on('disconnect', (reason) => {
        fastify.log.info(`Socket disconnected: ${socket.id} (${reason})`);
      });
    });

    // Attach io to fastify for access in routes
    fastify.io = io;
  });

  // Also expose io via decorate for immediate access after ready
  fastify.decorate('io', null);

  return fastify;
}
