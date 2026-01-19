# Architecture

## Container Structure

```
Docker Container (Node Alpine)
├── Fastify Server (:3000)
│   ├── /auth/* - GitHub OAuth
│   ├── /api/projects/* - Project CRUD
│   ├── /api/projects/:slug/chat - Conversation
│   ├── /api/projects/:slug/sessions - Ralph control
│   └── /api/knowledge/* - Learnings
├── Socket.io (same port)
│   └── terminal:*, session:*, task:*
├── SQLite Database (/app/data/nwha.db)
└── node-pty processes (Claude, Codex, Ralph)

Volumes:
├── /app/data - Database, logs
├── /app/projects - User code
├── ~/.claude - Claude auth (ro)
└── ~/.codex - Codex auth (ro)
```

## Database Schema

- users (id, github_id, username, email, role)
- projects (id, user_id, name, slug, status, path)
- conversations (id, project_id, role, content, phase)
- sessions (id, project_id, engine, status, pid, iterations)
- tasks (id, project_id, title, status, phase, order_num)
- knowledge (id, category, problem, solution, context, tags)
