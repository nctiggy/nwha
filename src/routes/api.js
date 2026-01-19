// API routes for NWHA
import { getDb, initSchema } from '../db/index.js';

/**
 * Auth middleware - ensures user is authenticated
 */
function requireAuth(request, reply, done) {
  const user = request.session.get('user');
  if (!user) {
    reply.status(401).send({ error: 'Authentication required' });
    return;
  }
  // Attach user to request for convenience
  request.user = user;
  done();
}

/**
 * Generate slug from name
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function registerApiRoutes(fastify) {
  initSchema();

  // Add auth middleware to all /api/* routes
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      const user = request.session.get('user');
      if (!user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      request.user = user;
    }
  });

  // NWHA-012: Create project
  fastify.post('/api/projects', async (request, reply) => {
    const { name } = request.body || {};

    if (!name) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    const db = getDb();
    const slug = slugify(name);

    // Check if slug already exists for this user
    const existing = db.prepare('SELECT id FROM projects WHERE slug = ? AND user_id = ?')
      .get(slug, request.user.id);

    if (existing) {
      return reply.status(409).send({ error: 'Project with this name already exists' });
    }

    const result = db.prepare(`
      INSERT INTO projects (user_id, name, slug)
      VALUES (?, ?, ?)
    `).run(request.user.id, name, slug);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?')
      .get(result.lastInsertRowid);

    return reply.status(201).send({ project });
  });

  // NWHA-013: List projects
  fastify.get('/api/projects', async (request, reply) => {
    const db = getDb();
    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC')
      .all(request.user.id);

    return { projects };
  });

  // NWHA-013: Get single project
  fastify.get('/api/projects/:slug', async (request, reply) => {
    const { slug } = request.params;
    const db = getDb();

    const project = db.prepare('SELECT * FROM projects WHERE slug = ? AND user_id = ?')
      .get(slug, request.user.id);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return { project };
  });
}
