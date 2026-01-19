# NWHA - Never Work Hard Again

AI-powered autonomous development orchestrator using the [Ralph pattern](https://github.com/snarktank/ralph).

## Quick Start

### Prerequisites

- Docker & Docker Compose
- GitHub OAuth App ([create one](https://github.com/settings/developers))
- **Claude CLI** credentials (`~/.claude/`) - subscription required
- **Codex CLI** credentials (`~/.codex/`) - optional fallback

### Setup

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/nwha.git
cd nwha

# 2. Authenticate CLI tools (subscription-based, NO API)
claude --dangerously-skip-permissions   # Creates ~/.claude credentials
codex                                    # Creates ~/.codex credentials (optional)

# 3. Configure
cp .env.example .env
# Edit .env - see Configuration section below

# 4. Run preflight check
npm run preflight

# 5. Start
docker compose up -d

# 6. Verify
curl http://localhost:3000/health

# 7. Open
open http://localhost:3000
```

## Configuration

Edit `.env` with your values:

```bash
# Required
SESSION_SECRET=<generate with: openssl rand -hex 32>
GITHUB_CLIENT_ID=<from GitHub OAuth app>
GITHUB_CLIENT_SECRET=<from GitHub OAuth app>

# Optional - for testing without GitHub OAuth
AUTH_BYPASS=true

# CLI settings
CLI_PRIMARY=claude              # or "codex"
CLI_FALLBACK_ENABLED=true       # Use Codex when Claude credits exhausted
```

### GitHub OAuth App Settings

When creating your GitHub OAuth app:
- **Homepage URL**: `http://localhost:3000`
- **Authorization callback URL**: `http://localhost:3000/auth/github/callback`

### CLI Tools Setup (Subscription-based, NO API)

NWHA uses subscription-based CLI tools, not API calls.

**Claude CLI (Primary)**
```bash
# Authenticate once - creates ~/.claude/.credentials.json
claude --dangerously-skip-permissions
```

**Codex CLI (Fallback)**
```bash
# Authenticate once - creates ~/.codex/
codex
```

The Docker container mounts both credential directories and includes the CLI tools.

## Features

- Chat-based requirements gathering
- Automatic spec generation (prd.json, AGENTS.md)
- Ralph autonomous development loops with iteration limits
- Real-time terminal in browser (xterm.js + node-pty)
- Knowledge capture from failures (progress.txt)
- Auth bypass mode for testing
- **Claude CLI primary** with **Codex CLI fallback**

## Tech Stack

- **Runtime**: Node.js 20 + Fastify
- **Database**: SQLite + better-sqlite3
- **Real-time**: Socket.io + xterm.js + node-pty
- **Auth**: Passport.js + GitHub OAuth
- **Frontend**: Vanilla JS + htmx + Tailwind
- **AI**: Claude CLI + Codex CLI (subscription-based, NO API)
- **Testing**: Vitest + Playwright

## Development

```bash
# Install dependencies
npm install

# Run locally (watch mode)
npm run dev

# Run tests
npm test                # Unit + Integration
npm run test:e2e       # E2E (requires running container)

# Docker commands
npm run docker:build   # Build image
npm run docker:up      # Start container
npm run docker:logs    # View logs
npm run docker:health  # Health check
npm run docker:down    # Stop container
```

## The Ralph Pattern

NWHA follows the Ralph development pattern:

1. **prd.json** - User stories with `passes: true/false` tracking
2. **progress.txt** - Append-only learnings log
3. **AGENTS.md** - Discovered patterns and conventions
4. **20 iteration limit** per task before human intervention

Each iteration:
1. Read state (prd.json, progress.txt, AGENTS.md)
2. Write failing test (TDD)
3. Implement
4. Verify all tests pass
5. Docker build & health check
6. Commit & update tracking
7. Check completion (`<promise>COMPLETE</promise>` when done)

See [PROMPT.md](./PROMPT.md) for full details.

## Docker Hub

```bash
docker pull YOUR_USERNAME/nwha:latest
docker pull YOUR_USERNAME/nwha:v1.0.0
```

## License

MIT
