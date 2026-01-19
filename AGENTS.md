# NWHA Codebase Patterns

This file captures reusable patterns, conventions, and gotchas discovered during development.
Update this file when you discover genuinely reusable knowledge.

---

## Project Structure

```
nwha/
├── src/
│   ├── index.js          # Entry point
│   ├── server.js         # Fastify server setup
│   ├── config.js         # Environment configuration
│   ├── db/
│   │   ├── index.js      # Database connection
│   │   └── schema.sql    # SQLite schema
│   ├── routes/
│   │   ├── auth.js       # Authentication routes
│   │   ├── projects.js   # Project CRUD
│   │   ├── conversation.js
│   │   ├── sessions.js   # Ralph session control
│   │   └── knowledge.js
│   ├── services/
│   │   ├── auth.js       # Passport setup
│   │   ├── projects.js
│   │   ├── conversation.js
│   │   ├── terminal.js   # PTY management
│   │   ├── ralph.js      # Ralph loop orchestration
│   │   └── knowledge.js
│   ├── socket/
│   │   ├── index.js      # Socket.io setup
│   │   └── handlers.js   # Event handlers
│   └── utils/
│       ├── logger.js     # Pino logger
│       └── validators.js
├── public/
│   ├── index.html
│   ├── css/
│   └── js/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── scripts/
    └── preflight.sh
```

---

## Commands Reference

```bash
# Preflight (run before first start)
npm run preflight

# Development
npm run dev              # Watch mode

# Testing (TDD workflow)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm test                 # Unit + Integration
npm run test:e2e         # E2E (requires running container)
npm run test:all         # Everything

# Docker
npm run docker:build     # Build image
npm run docker:up        # Start container
npm run docker:logs      # View logs
npm run docker:health    # Health check
npm run docker:down      # Stop container
```

---

## Conventions

### File Naming
- Routes: `src/routes/<resource>.js`
- Services: `src/services/<resource>.js`
- Tests: `tests/unit/<resource>.test.js`

### API Patterns
- All API routes under `/api/`
- Auth routes under `/auth/`
- Use slug for project identification (not ID)
- Return 401 for unauthenticated, 403 for unauthorized

### Error Handling
```javascript
// Standard error response
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.message,
    statusCode: error.statusCode || 500
  });
});
```

### Database
- SQLite with better-sqlite3 (synchronous API)
- Connection singleton in `src/db/index.js`
- Schema applied on startup via `schema.sql`

### Authentication
- GitHub OAuth via passport-github2
- Session stored in SQLite (fastify-session)
- AUTH_BYPASS=true enables `/auth/dev-login` for testing

---

## Gotchas

### Docker
- Use named volumes, not bind mounts for large directories
- Mount only specific credential files, not entire ~/.claude directory
- Wait 15+ seconds after `docker compose up` before health check

### Testing
- Tests MUST fail first (TDD red-green-refactor)
- E2E tests require running Docker container
- Use `AUTH_BYPASS=true` in test environment

### Socket.io
- Same port as HTTP server (3000)
- Authenticate socket connection via session cookie

### node-pty
- Requires build tools in Docker (python3, make, g++)
- PTY processes must be cleaned up on disconnect

---

## Commit Message Format

```
feat: [NWHA-XXX] - Short description
fix: [NWHA-XXX] - What was fixed
test: Add tests for <feature>
docs: Update <section>
chore: Mark [NWHA-XXX] complete
```
