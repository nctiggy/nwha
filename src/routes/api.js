// API routes for NWHA
import { getDb, initSchema } from '../db/index.js';
import { getAIResponse } from '../services/cli.js';
import { PTYManager } from '../services/pty.js';

// Global PTY manager for Ralph sessions
const ptyManager = new PTYManager();

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

  // NWHA-014: Update project
  fastify.put('/api/projects/:slug', async (request, reply) => {
    const { slug } = request.params;
    const { name, status } = request.body || {};
    const db = getDb();

    const project = db.prepare('SELECT * FROM projects WHERE slug = ? AND user_id = ?')
      .get(slug, request.user.id);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(project.id);
      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
    return { project: updated };
  });

  // NWHA-014: Delete project (soft delete - set status to 'deleted')
  fastify.delete('/api/projects/:slug', async (request, reply) => {
    const { slug } = request.params;
    const db = getDb();

    const project = db.prepare('SELECT * FROM projects WHERE slug = ? AND user_id = ?')
      .get(slug, request.user.id);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    db.prepare(`
      UPDATE projects SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(project.id);

    return { deleted: true };
  });

  // NWHA-015: Store conversation message
  // NWHA-017: AI response via Claude CLI
  fastify.post('/api/projects/:slug/chat', async (request, reply) => {
    const { slug } = request.params;
    const { role, content, ai } = request.body || {};
    const db = getDb();

    // Verify project exists and belongs to user
    const project = db.prepare('SELECT * FROM projects WHERE slug = ? AND user_id = ?')
      .get(slug, request.user.id);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Validate required fields
    if (!role || !content) {
      return reply.status(400).send({ error: 'Role and content are required' });
    }

    // Validate role
    if (!['user', 'assistant'].includes(role)) {
      return reply.status(400).send({ error: 'Role must be user or assistant' });
    }

    // Insert user message into conversations table
    const userResult = db.prepare(`
      INSERT INTO conversations (project_id, role, content)
      VALUES (?, ?, ?)
    `).run(project.id, role, content);

    const userMessage = db.prepare('SELECT * FROM conversations WHERE id = ?')
      .get(userResult.lastInsertRowid);

    // If ai flag is set, get AI response
    if (ai && role === 'user') {
      try {
        const { response, engine } = await getAIResponse(content);

        // Store AI response
        const aiResult = db.prepare(`
          INSERT INTO conversations (project_id, role, content)
          VALUES (?, ?, ?)
        `).run(project.id, 'assistant', response);

        const aiResponse = db.prepare('SELECT * FROM conversations WHERE id = ?')
          .get(aiResult.lastInsertRowid);

        return reply.status(201).send({
          userMessage,
          aiResponse,
          engine
        });
      } catch (error) {
        // Return user message but with AI error
        return reply.status(201).send({
          userMessage,
          aiError: error.message
        });
      }
    }

    // No AI requested, just return the message
    return reply.status(201).send({ message: userMessage });
  });

  // NWHA-016: Retrieve conversation history
  fastify.get('/api/projects/:slug/chat', async (request, reply) => {
    const { slug } = request.params;
    const db = getDb();

    // Verify project exists and belongs to user
    const project = db.prepare('SELECT * FROM projects WHERE slug = ? AND user_id = ?')
      .get(slug, request.user.id);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Get messages ordered by created_at
    const messages = db.prepare(`
      SELECT * FROM conversations
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).all(project.id);

    return { messages };
  });

  // NWHA-023: Start Ralph session
  // NWHA-025: Ralph iteration limit
  fastify.post('/api/projects/:slug/sessions', async (request, reply) => {
    const { slug } = request.params;
    const db = getDb();
    const maxIterations = parseInt(process.env.RALPH_MAX_ITERATIONS, 10) || 20;

    // Verify project exists and belongs to user
    const project = db.prepare('SELECT * FROM projects WHERE slug = ? AND user_id = ?')
      .get(slug, request.user.id);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Create session record in database with max_iterations
    const result = db.prepare(`
      INSERT INTO sessions (project_id, engine, status, iterations, max_iterations, started_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(project.id, 'claude', 'running', 0, maxIterations);

    const sessionId = result.lastInsertRowid;

    // Create PTY for the session
    ptyManager.create(`session-${sessionId}`, {
      cwd: process.env.PROJECTS_DIR || '/app/projects'
    });

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);

    return reply.status(201).send({ session });
  });

  // NWHA-024: Pause session
  fastify.post('/api/sessions/:id/pause', async (request, reply) => {
    const { id } = request.params;
    const db = getDb();

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Update session status
    db.prepare(`
      UPDATE sessions SET status = 'paused'
      WHERE id = ?
    `).run(id);

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    return reply.status(200).send({ session: updated });
  });

  // NWHA-024: Resume session
  fastify.post('/api/sessions/:id/resume', async (request, reply) => {
    const { id } = request.params;
    const db = getDb();

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Update session status
    db.prepare(`
      UPDATE sessions SET status = 'running'
      WHERE id = ?
    `).run(id);

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    return reply.status(200).send({ session: updated });
  });

  // NWHA-024: Stop session
  fastify.post('/api/sessions/:id/stop', async (request, reply) => {
    const { id } = request.params;
    const db = getDb();

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Destroy PTY
    ptyManager.destroy(`session-${id}`);

    // Update session status and set ended_at
    db.prepare(`
      UPDATE sessions SET status = 'stopped', ended_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    return reply.status(200).send({ session: updated });
  });
}
